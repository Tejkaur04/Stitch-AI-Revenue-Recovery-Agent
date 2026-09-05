import Database from 'better-sqlite3';

const db = new Database('./stitch.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    data TEXT
  );
  CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    incidentId TEXT,
    timestamp TEXT,
    data TEXT
  );
  CREATE TABLE IF NOT EXISTS processed_events (
    id TEXT PRIMARY KEY
  );
  CREATE TABLE IF NOT EXISTS merchant_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

export const addIncident = incident => {
  db.prepare('INSERT INTO incidents (id, data) VALUES (?, ?)').run(incident.id, JSON.stringify(incident));
  return incident;
};

export const getIncident = id => {
  const row = db.prepare('SELECT data FROM incidents WHERE id = ?').get(id);
  return row ? JSON.parse(row.data) : undefined;
};

export const listIncidents = () => {
  return db.prepare('SELECT data FROM incidents').all().map(r => JSON.parse(r.data));
};

export const findIncidentByExternalId = ({ paymentId, orderId, invoiceId }) => listIncidents().find(incident =>
  (paymentId && incident.payment_id === paymentId) ||
  (orderId && incident.order_id === orderId) ||
  (invoiceId && incident.invoice_id === invoiceId)
);

export const getIncidentEvents = id => db.prepare('SELECT data FROM audit_events WHERE incidentId = ? ORDER BY timestamp ASC').all().map(r => JSON.parse(r.data));
export const getAllAuditEvents = () => db.prepare('SELECT data FROM audit_events ORDER BY timestamp DESC').all().map(r => JSON.parse(r.data));

export const updateIncident = (id, changes) => {
  const incident = getIncident(id);
  if (!incident) return null;
  Object.assign(incident, changes, { updatedAt: new Date().toISOString() });
  db.prepare('UPDATE incidents SET data = ? WHERE id = ?').run(JSON.stringify(incident), id);
  return incident;
};

export const addAuditEvent = event => {
  const record = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    ...event
  };
  db.prepare('INSERT INTO audit_events (id, incidentId, timestamp, data) VALUES (?, ?, ?, ?)').run(
    record.id, record.incidentId || null, record.timestamp, JSON.stringify(record)
  );
  return record;
};

export const getMerchantSettings = () => {
  const rows = db.prepare('SELECT key, value FROM merchant_settings').all();
  const defaults = { maxRetries: 3, maxContacts: 1, quietStartHour: 21, quietEndHour: 9, highValueThresholdPaise: 10000000, highValueRequiresApproval: true, quietHoursEnabled: true };
  const saved = Object.fromEntries(rows.map(r => [r.key, JSON.parse(r.value)]));
  return { ...defaults, ...saved };
};

export const saveMerchantSettings = (settings) => {
  const upsert = db.prepare('INSERT INTO merchant_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  const run = db.transaction(obj => { for (const [k, v] of Object.entries(obj)) upsert.run(k, JSON.stringify(v)); });
  run(settings);
  return getMerchantSettings();
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
  if (!eventId) return false;
  try {
    db.prepare('INSERT INTO processed_events (id) VALUES (?)').run(eventId);
    return true;
  } catch (e) {
    return false;
  }
};

export const dashboardSummary = () => {
  const all = listIncidents();
  return summarizeRevenueSnapshot(all);
};
