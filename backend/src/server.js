import { createHmac, timingSafeEqual } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { URL } from 'node:url';
import { RazorpayAdapter } from './razorpayAdapter.js';
import {
  addAuditEvent,
  claimEventId,
  dashboardSummary,
  getIncidentEvents,
  listIncidents,
  getIncident,
  getAllAuditEvents,
  findIncidentByExternalId,
  updateIncident
} from './store.js';
import { createIncidentFromEvent, normalizeRazorpayEvent, processIncident, requireIncident, transition } from './stitchEngine.js';
import { startRazorpayPoller } from './poller.js';
import { calculateImpact, executeBoundedAction } from './recovery.js';
import { runRecoveryBatch } from './batch.js';

const loadLocalEnv = () => {
  const path = new URL('../.env', import.meta.url);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
};
loadLocalEnv();

const adapter = new RazorpayAdapter();
const port = Number(process.env.PORT || 8000);
const defaultAllowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173'];
const allowedOrigins = new Set((process.env.CORS_ORIGIN || defaultAllowedOrigins.join(',')).split(',').map(value => value.trim()).filter(Boolean));

const resolveAllowedOrigin = origin => {
  if (!origin) return [...allowedOrigins][0] || '*';
  const normalized = origin.replace(/\/$/, '');
  if (allowedOrigins.has(normalized)) return normalized;
  for (const candidate of allowedOrigins) {
    if (candidate === normalized) return normalized;
    try {
      if (new URL(candidate).origin === new URL(normalized).origin) return normalized;
    } catch {
      // ignore malformed origin values
    }
  }
  return [...allowedOrigins][0] || '*';
};

const send = (response, status, body, origin) => {
  const allowedOrigin = resolveAllowedOrigin(origin);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'Content-Type, x-razorpay-signature, x-razorpay-event-id',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin'
  });
  response.end(JSON.stringify(body));
};

const readBody = request => new Promise((resolve, reject) => {
  let body = '';
  request.setEncoding('utf8');
  request.on('data', chunk => { body += chunk; });
  request.on('end', () => resolve(body));
  request.on('error', reject);
});

const verifySignature = (rawBody, signature) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const suppliedBuffer = Buffer.from(signature, 'utf8');
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer);
};

const handleWebhook = async (request, response, origin) => {
  const rawBody = await readBody(request);
  if (!verifySignature(rawBody, request.headers['x-razorpay-signature'])) {
    return send(response, 401, { error: 'Invalid Razorpay webhook signature' }, origin);
  }

  const eventId = request.headers['x-razorpay-event-id'] || (() => {
    try { return JSON.parse(rawBody).id; } catch { return null; }
  })();
  if (!eventId) return send(response, 400, { error: 'Missing Razorpay event ID' }, origin);
  if (!claimEventId(eventId)) return send(response, 200, { accepted: true, duplicate: true }, origin);

  let normalized;
  try {
    normalized = normalizeRazorpayEvent(JSON.parse(rawBody));
  } catch (error) {
    return send(response, 400, { error: error.message }, origin);
  }

  if (normalized.sourceEvent === 'payment.failed') {
    const incident = createIncidentFromEvent(normalized);
    processIncident(incident, adapter).then(() => executeBoundedAction(incident, adapter)).catch(error => {
      addAuditEvent({ incidentId: incident.id, event: 'PROCESSING_FAILED', actor: 'SYSTEM', result: error.message });
    });
    return send(response, 202, { accepted: true, incident_id: incident.id }, origin);
  }

  if (['payment.captured', 'payment.authorized', 'order.paid', 'invoice.paid', 'payment_link.paid'].includes(normalized.sourceEvent)) {
    const incident = findIncidentByExternalId(normalized);
    if (incident && !['recovered', 'stopped', 'escalated'].includes(incident.status)) {
      updateIncident(incident.id, { status: 'recovered', state: 'recovered', payment_state: 'paid' });
      addAuditEvent({ incidentId: incident.id, event: 'PAYMENT_RECEIVED', actor: 'RAZORPAY', result: 'Current payment state is paid' });
    }
  }

  addAuditEvent({ incidentId: null, event: normalized.sourceEvent, actor: 'RAZORPAY', result: 'Received', metadata: normalized });
  return send(response, 202, { accepted: true }, origin);
};

const stageFor = state => ({
  detected: 'received',
  understanding: 'understanding',
  deciding: 'decision',
  policy_check: 'policy_check',
  verifying: 'verification',
  executing: 'execution',
  recovered: 'outcome',
  stopped: 'outcome',
  escalated: 'outcome'
}[state] || 'received');

const traceFor = incident => {
  const stages = ['received', 'understanding', 'decision', 'policy_check', 'verification', 'execution', 'outcome'];
  const currentIndex = stages.indexOf(stageFor(incident.state));
  return {
    current_stage: stageFor(incident.state),
    stages: stages.map((stage, index) => ({
      stage,
      status: index < currentIndex ? 'complete' : index === currentIndex ? 'in_progress' : 'pending'
    }))
  };
};

const handleRequest = async (request, response) => {
  const origin = request.headers.origin || '';
  if (request.method === 'OPTIONS') return send(response, 204, {}, origin);
  const url = new URL(request.url, `http://${request.headers.host}`);
  const parts = url.pathname.split('/').filter(Boolean);

  if (request.method === 'POST' && url.pathname === '/webhooks/razorpay') return handleWebhook(request, response, origin);
  if (request.method === 'GET' && url.pathname === '/health') return send(response, 200, { ok: true, mode: 'razorpay_test' }, origin);
  if (request.method === 'GET' && url.pathname === '/razorpay/status') return send(response, 200, {
    configured: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
    webhookConfigured: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET),
    pollerEnabled: process.env.POLLER_ENABLED === 'true',
    publicKeyId: process.env.RAZORPAY_KEY_ID || null
  }, origin);
  if (request.method === 'GET' && url.pathname === '/razorpay/test-connection') {
    try {
      await adapter.testConnection();
      return send(response, 200, { connected: true, mode: 'test' }, origin);
    } catch (error) {
      return send(response, 503, { connected: false, error: error.message }, origin);
    }
  }
  if (request.method === 'POST' && url.pathname === '/razorpay/test-order') {
    let body;
    try { body = JSON.parse(await readBody(request)); } catch { return send(response, 400, { error: 'Invalid JSON body' }, origin); }
    const amount = Number(body.amount_paise);
    if (!Number.isInteger(amount) || amount < 100) return send(response, 400, { error: 'amount_paise must be an integer of at least 100' }, origin);
    try {
      const order = await adapter.createOrder({ amount, currency: 'INR', receipt: `stitch_${Date.now()}`, notes: { source: 'stitch_test_workspace' } });
      addAuditEvent({ incidentId: null, event: 'TEST_ORDER_CREATED', actor: 'SYSTEM', result: order.id, metadata: { amount_paise: amount } });
      return send(response, 201, { order, key_id: process.env.RAZORPAY_KEY_ID }, origin);
    } catch (error) {
      return send(response, 502, { error: error.message }, origin);
    }
  }
  if (request.method === 'GET' && url.pathname === '/dashboard/summary') return send(response, 200, dashboardSummary(), origin);
  if (request.method === 'GET' && url.pathname === '/app/summary') return send(response, 200, dashboardSummary(), origin);
  if (request.method === 'GET' && url.pathname === '/console/summary') return send(response, 200, dashboardSummary(), origin);
  if (request.method === 'GET' && url.pathname === '/events') return send(response, 200, getAllAuditEvents(), origin);
  if (request.method === 'POST' && url.pathname === '/recovery/impact') {
    let body;
    try { body = JSON.parse(await readBody(request)); } catch { return send(response, 400, { error: 'Invalid JSON body' }, origin); }
    if (!Array.isArray(body.cases) || body.cases.length === 0) return send(response, 400, { error: 'cases must be a non-empty array' }, origin);
    return send(response, 200, calculateImpact(body.cases), origin);
  }
  if (request.method === 'POST' && url.pathname === '/demo/run-batch') {
    try {
      return send(response, 200, await runRecoveryBatch(), origin);
    } catch (error) {
      return send(response, 500, { error: error.message }, origin);
    }
  }

  if (request.method === 'GET' && url.pathname === '/incidents') {
    const page = Math.max(1, Number(url.searchParams.get('page') || 1));
    const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get('page_size') || 50)));
    const filtered = listIncidents().filter(incident =>
      (!url.searchParams.get('type') || incident.type === url.searchParams.get('type')) &&
      (!url.searchParams.get('status') || incident.status === url.searchParams.get('status')) &&
      (!url.searchParams.get('group') || incident.group === url.searchParams.get('group'))
    );
    const start = (page - 1) * pageSize;
    return send(response, 200, { items: filtered.slice(start, start + pageSize), page, page_size: pageSize, total: filtered.length }, origin);
  }

  if (request.method === 'GET' && parts[0] === 'incidents' && parts[1]) {
    let incident;
    try { incident = requireIncident(parts[1]); } catch (error) { return send(response, 404, { error: error.message }, origin); }
    if (parts[2] === 'trace') return send(response, 200, traceFor(incident), origin);
    return send(response, 200, { incident, events: getIncidentEvents(incident.id), baseline: { action: 'retry_then_reminder' }, stitch: incident.action, outcome: incident.status }, origin);
  }

  if (request.method === 'POST' && url.pathname === '/demo/simulate-manual-payment') {
    let body;
    try { body = JSON.parse(await readBody(request)); } catch { return send(response, 400, { error: 'Invalid JSON body' }, origin); }
    let incident;
    try { incident = requireIncident(body.incident_id); } catch (error) { return send(response, 404, { error: error.message }, origin); }
    if (['recovered', 'stopped', 'escalated'].includes(incident.status)) return send(response, 409, { error: 'Incident is already terminal' }, origin);
    addAuditEvent({ incidentId: incident.id, event: 'MANUAL_PAYMENT_RECEIVED', actor: 'RAZORPAY', result: 'Success' });
    updateIncident(incident.id, { payment_state: 'paid' });
    if (incident.state === 'executing') transition(incident, 'verifying', 'SYSTEM', 'Payment state rechecked');
    if (incident.state === 'verifying') {
      incident.action = { ...(incident.action || {}), status: 'killed', kill_reason: 'customer_paid_manually' };
      updateIncident(incident.id, { action: incident.action });
      addAuditEvent({ incidentId: incident.id, event: 'SCHEDULED_RETRY_CANCELLED', actor: 'SYSTEM', result: 'Unnecessary retry prevented' });
      transition(incident, 'stopped', 'SYSTEM', 'Payment already received');
    }
    return send(response, 200, incident, origin);
  }

  return send(response, 404, { error: 'Not found' }, origin);
};

const server = createServer((request, response) => {
  handleRequest(request, response).catch(error => send(response, 500, { error: error.message }, request.headers.origin || ''));
}).listen(port, () => {
  console.log(`Stitch API listening on http://localhost:${port}`);
});

startRazorpayPoller(adapter, incident => processIncident(incident, adapter), Number(process.env.POLLER_INTERVAL_MS || 300000));
