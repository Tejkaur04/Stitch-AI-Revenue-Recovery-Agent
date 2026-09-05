const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `API request failed (${response.status})`);
  return body;
};

export const normalizeRemoteIncident = incident => ({
  ...incident,
  state: (incident.state || incident.status || 'DETECTED').toUpperCase(),
  customer: {
    ...(incident.customer || {}),
    ltv: incident.customer?.ltv ?? incident.customer?.ltv_paise ?? 0,
    name: incident.customer?.name || incident.customer_id || 'Razorpay customer'
  },
  aiDecision: incident.aiDecision || (incident.action ? {
    action: incident.action.type,
    basis: incident.action.reasoning
  } : null),
  policyResult: incident.policyResult || incident.policy || null
});

export const razorpayApi = {
  getStatus: () => request('/razorpay/status'),
  testConnection: () => request('/razorpay/test-connection'),
  createTestOrder: amountPaise => request('/razorpay/test-order', {
    method: 'POST',
    body: JSON.stringify({ amount_paise: amountPaise })
  }),
  getSummary: () => request('/dashboard/summary'),
  getEvents: () => request('/events'),
  getMerchantSettings: () => request('/merchant/settings'),
  saveMerchantSettings: settings => request('/merchant/settings', { method: 'POST', body: JSON.stringify(settings) }),
  getLabResults: () => request('/recovery/impact'),
  calculateImpact: cases => request('/recovery/impact', {
    method: 'POST',
    body: JSON.stringify({ cases })
  }),
  runBatch: () => request('/demo/run-batch', { method: 'POST' }),
  getIncidents: async () => {
    const result = await request('/incidents');
    return { ...result, items: (result.items || []).map(normalizeRemoteIncident) };
  },
  getIncident: async id => {
    const result = await request(`/incidents/${encodeURIComponent(id)}`);
    return { ...result, incident: normalizeRemoteIncident(result.incident) };
  },
  getTrace: id => request(`/incidents/${encodeURIComponent(id)}/trace`),
  triggerScenario: scenario => request('/demo/trigger-scenario', {
    method: 'POST',
    body: JSON.stringify({ scenario })
  }),
  simulateManualPayment: incidentId => request('/demo/simulate-manual-payment', {
    method: 'POST',
    body: JSON.stringify({ incident_id: incidentId })
  }),
  recordPromiseToPay: (incidentId, payload) => request(`/incidents/${encodeURIComponent(incidentId)}/promise-to-pay`, {
    method: 'POST', body: JSON.stringify(payload)
  })
};

export default razorpayApi;
