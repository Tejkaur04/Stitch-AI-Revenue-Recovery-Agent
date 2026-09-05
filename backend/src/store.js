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
  CREATE TABLE IF NOT EXISTS customer_cohorts (customer_id TEXT PRIMARY KEY, cohort TEXT NOT NULL, assigned_at TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS recovery_jobs (id TEXT PRIMARY KEY, incident_id TEXT NOT NULL, run_at TEXT NOT NULL, type TEXT NOT NULL, status TEXT NOT NULL, data TEXT NOT NULL, created_at TEXT NOT NULL, completed_at TEXT);
  CREATE INDEX IF NOT EXISTS recovery_jobs_due ON recovery_jobs(status, run_at);
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

export const findIncidentByExternalId = ({ paymentId, orderId, invoiceId, paymentLinkId }) => listIncidents().find(incident =>
  (paymentId && incident.payment_id === paymentId) ||
  (orderId && incident.order_id === orderId) ||
  (invoiceId && incident.invoice_id === invoiceId) ||
  (paymentLinkId && incident.payment_link_id === paymentLinkId)
);

export const getIncidentEvents = id => db.prepare('SELECT data FROM audit_events WHERE incidentId = ? ORDER BY timestamp ASC').all(id).map(r => JSON.parse(r.data));
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

export const getOrAssignCohort = customerId => {
  const existing = db.prepare('SELECT cohort FROM customer_cohorts WHERE customer_id = ?').get(customerId);
  if (existing) return existing.cohort;
  let hash = 0;
  for (const char of String(customerId)) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
  const cohort = Math.abs(hash) % 5 === 0 ? 'control' : 'treatment';
  db.prepare('INSERT INTO customer_cohorts (customer_id, cohort, assigned_at) VALUES (?, ?, ?)').run(customerId, cohort, new Date().toISOString());
  return cohort;
};

export const enqueueRecoveryJob = ({ incidentId, type, runAt, data = {} }) => {
  const job = { id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, incidentId, type, runAt, data, status: 'scheduled', createdAt: new Date().toISOString() };
  db.prepare('INSERT INTO recovery_jobs (id, incident_id, run_at, type, status, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(job.id, job.incidentId, job.runAt, job.type, job.status, JSON.stringify(job.data), job.createdAt);
  return job;
};

export const claimDueRecoveryJobs = (now = new Date().toISOString()) => {
  const due = db.prepare("SELECT * FROM recovery_jobs WHERE status = 'scheduled' AND run_at <= ? ORDER BY run_at LIMIT 50").all(now);
  const mark = db.prepare("UPDATE recovery_jobs SET status = 'completed', completed_at = ? WHERE id = ? AND status = 'scheduled'");
  return due.filter(job => mark.run(new Date().toISOString(), job.id).changes).map(job => ({ ...job, data: JSON.parse(job.data) }));
};

export const getMerchantSettings = () => {
  const rows = db.prepare('SELECT key, value FROM merchant_settings').all();
  const defaults = { maxRetries: 3, maxContacts: 1, quietStartHour: 21, quietEndHour: 9, highValueThresholdPaise: 10000000, highValueRequiresApproval: true, quietHoursEnabled: true, attributionWindowDays: 14, requireConsentForOutreach: true };
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
