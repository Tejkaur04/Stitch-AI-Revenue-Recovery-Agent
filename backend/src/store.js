const incidents = new Map();
const auditEvents = [];
const processedEventIds = new Set();

export const addIncident = incident => {
  incidents.set(incident.id, incident);
  return incident;
};

export const getIncident = id => incidents.get(id);
export const listIncidents = () => [...incidents.values()];
export const findIncidentByExternalId = ({ paymentId, orderId, invoiceId }) => listIncidents().find(incident =>
  (paymentId && incident.payment_id === paymentId) ||
  (orderId && incident.order_id === orderId) ||
  (invoiceId && incident.invoice_id === invoiceId)
);
export const getIncidentEvents = id => auditEvents.filter(event => event.incidentId === id);
export const getAllAuditEvents = () => [...auditEvents];

export const updateIncident = (id, changes) => {
  const incident = incidents.get(id);
  if (!incident) return null;
  Object.assign(incident, changes, { updatedAt: new Date().toISOString() });
  return incident;
};

export const addAuditEvent = event => {
  const record = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    ...event
  };
  auditEvents.push(record);
  return record;
};

export const getRecoveryMetrics = (scope = [], dateRange = null) => {
  const all = Array.isArray(scope) && scope.length > 0 ? scope : listIncidents();
  const activeScope = dateRange
    ? all.filter(incident => new Date(incident.createdAt || incident.updatedAt || Date.now()) >= new Date(dateRange.start) && new Date(incident.createdAt || incident.updatedAt || Date.now()) <= new Date(dateRange.end))
    : all;

  const recovered = activeScope.filter(incident => String(incident.status || incident.state || '').toLowerCase() === 'recovered');
  const totalRecoveredPaise = recovered.reduce((sum, incident) => sum + Number(incident.amount_paise || incident.recovered_amount_paise || 0), 0);
  const totalAtRiskPaise = activeScope.reduce((sum, incident) => sum + Number(incident.amount_paise || 0), 0);
  const customerContacts = activeScope.reduce((sum, incident) => sum + Number(incident.contact_count || 0), 0);
  const recoveryRate = totalAtRiskPaise > 0 ? totalRecoveredPaise / totalAtRiskPaise : 0;

  return {
    total_at_risk_paise: totalAtRiskPaise,
    total_recovered_paise: totalRecoveredPaise,
    recovered_cases: recovered.length,
    total_cases: activeScope.length,
    recovery_attempts: activeScope.reduce((sum, incident) => sum + (incident.retry_count || 0), 0),
    customer_contacts: customerContacts,
    revenue_still_at_risk_paise: Math.max(totalAtRiskPaise - totalRecoveredPaise, 0),
    active_case_count: activeScope.filter(incident => !['recovered', 'stopped', 'escalated'].includes(String(incident.status || incident.state || '').toLowerCase())).length,
    recovery_rate: recoveryRate,
    control_recovery_rate: activeScope.filter(incident => incident.group === 'control').length
      ? activeScope.filter(incident => incident.group === 'control' && String(incident.status || incident.state || '').toLowerCase() === 'recovered').length / activeScope.filter(incident => incident.group === 'control').length
      : 0,
    treatment_recovery_rate: activeScope.filter(incident => incident.group === 'treatment').length
      ? activeScope.filter(incident => incident.group === 'treatment' && String(incident.status || incident.state || '').toLowerCase() === 'recovered').length / activeScope.filter(incident => incident.group === 'treatment').length
      : 0,
    net_lift_paise: 0,
    policy_violations_blocked: activeScope.filter(incident => String(incident.status || incident.state || '').toLowerCase() === 'blocked').length
  };
};

export const summarizeRevenueSnapshot = (all = []) => getRecoveryMetrics(all);

export const claimEventId = eventId => {
  if (!eventId || processedEventIds.has(eventId)) return false;
  processedEventIds.add(eventId);
  return true;
};

export const dashboardSummary = () => {
  const all = listIncidents();
  return summarizeRevenueSnapshot(all);
};
