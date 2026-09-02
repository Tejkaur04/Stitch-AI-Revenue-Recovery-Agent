import { addAuditEvent, addIncident, getIncident, updateIncident } from './store.js';
import { evaluatePolicy } from './policy.js';

const validTransitions = {
  detected: ['understanding'],
  understanding: ['deciding'],
  deciding: ['policy_check'],
  policy_check: ['verifying', 'escalated'],
  verifying: ['executing', 'stopped'],
  executing: ['recovered', 'verifying'],
  recovered: [],
  stopped: [],
  escalated: []
};

const nextIncidentId = () => `inc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

export const normalizeRazorpayEvent = body => {
  const event = body.event || body.payload?.event;
  const payment = body.payload?.payment?.entity || {};
  const order = body.payload?.order?.entity || {};
  const customer = body.payload?.customer?.entity || {};
  if (!event) throw new Error('Razorpay event is missing body.event');

  return {
    sourceEvent: event,
    razorpayEventId: body.id || body.event_id || null,
    customerId: customer.id || payment.customer_id || 'unknown_customer',
    customer: { id: customer.id || payment.customer_id || 'unknown_customer', name: customer.name || 'Razorpay customer' },
    paymentId: payment.id || null,
    orderId: order.id || payment.order_id || null,
    invoiceId: body.payload?.invoice?.entity?.id || payment.invoice_id || null,
    amount_paise: payment.amount || order.amount || 0,
    reason: payment.error_description || payment.error_reason || 'Payment failed',
    type: event.includes('invoice') ? 'invoice_overdue' : event.includes('order') ? 'cart_abandonment' : 'payment_failure'
  };
};

export const createIncidentFromEvent = normalized => {
  const incident = {
    id: nextIncidentId(),
    type: normalized.type,
    customer_id: normalized.customerId,
    customer: normalized.customer,
    amount_paise: normalized.amount_paise,
    status: 'pending',
    state: 'detected',
    group: 'treatment',
    payment_id: normalized.paymentId,
    order_id: normalized.orderId,
    reason: normalized.reason,
    source_event: normalized.sourceEvent,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    action: null,
    policy: null
  };
  addIncident(incident);
  addAuditEvent({ incidentId: incident.id, event: 'PAYMENT_FAILED', actor: 'RAZORPAY', result: 'Detected', metadata: normalized });
  return incident;
};

export const transition = (incident, nextState, actor, result, metadata = {}) => {
  const oldState = incident.state;
  if (!validTransitions[oldState]?.includes(nextState)) {
    addAuditEvent({ incidentId: incident.id, event: 'INVALID_TRANSITION_REJECTED', actor: 'SYSTEM', result: `${oldState} -> ${nextState}` });
    throw new Error(`Invalid transition: ${oldState} -> ${nextState}`);
  }
  incident.state = nextState;
  if (nextState === 'recovered') incident.status = 'recovered';
  if (nextState === 'stopped') incident.status = 'stopped';
  if (nextState === 'escalated') incident.status = 'escalated';
  updateIncident(incident.id, incident);
  addAuditEvent({ incidentId: incident.id, event: 'STATE_CHANGED', actor, result, metadata: { oldState, newState: nextState, ...metadata } });
  return incident;
};

export const decide = incident => {
  const expired = /expired/i.test(incident.reason);
  const riskyRetry = /insufficient funds/i.test(incident.reason);
  const type = incident.type === 'invoice_overdue'
    ? 'wait'
    : incident.type === 'cart_abandonment'
      ? 'send_link'
      : expired ? 'send_link' : riskyRetry ? 'retry' : 'wait';
  const reasoning = expired
    ? 'The payment method appears expired; request an update instead of repeating a doomed retry.'
    : incident.type === 'invoice_overdue'
      ? 'The customer usually pays late; wait before escalating and re-evaluate the invoice.'
      : incident.type === 'cart_abandonment'
        ? 'Checkout intent is recent; send a continuation link tied to the original order.'
    : riskyRetry
      ? 'The failure has a low recovery signal; retry requires policy review before execution.'
      : 'The failure appears temporary; wait and verify current payment state before retrying.';
  return { type, decided_by: 'ai_engine', status: 'pending', reasoning, outcome: null };
};

export const processIncident = async (incident, adapter) => {
  transition(incident, 'understanding', 'SYSTEM', 'Customer context loaded');
  incident.action = decide(incident);
  transition(incident, 'deciding', 'AI', 'Decision generated', { action: incident.action });

  incident.retry_count ??= 0;
  incident.contact_count ??= 0;
  incident.policy = evaluatePolicy(incident);
  if (incident.policy.status !== 'allowed') {
    incident.status = 'blocked';
    updateIncident(incident.id, incident);
    addAuditEvent({ incidentId: incident.id, event: 'POLICY_CHECK', actor: 'POLICY', result: 'BLOCKED', metadata: incident.policy });
    transition(incident, 'escalated', 'SYSTEM', 'Escalated to human');
    return incident;
  }

  transition(incident, 'policy_check', 'POLICY', 'ALLOWED', { policy: incident.policy });
  transition(incident, 'verifying', 'SYSTEM', 'Pre-execution verification started');

  if (incident.payment_id) {
    const payment = await adapter.getPaymentStatus(incident.payment_id);
    if (['captured', 'authorized'].includes(payment.status)) {
      incident.action = { ...incident.action, status: 'killed', kill_reason: 'customer_paid_manually' };
      updateIncident(incident.id, incident);
      addAuditEvent({ incidentId: incident.id, event: 'SCHEDULED_RETRY_CANCELLED', actor: 'SYSTEM', result: 'Payment already received' });
      transition(incident, 'stopped', 'SYSTEM', 'Unnecessary recovery action prevented');
      return incident;
    }
  }

  if (incident.action.type === 'retry') incident.retry_count += 1;
  transition(incident, 'executing', 'SYSTEM', 'Approved action ready for executor');
  return incident;
};

export const requireIncident = id => {
  const incident = getIncident(id);
  if (!incident) throw new Error('Incident not found');
  return incident;
};
