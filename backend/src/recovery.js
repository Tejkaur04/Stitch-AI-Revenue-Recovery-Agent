import { addAuditEvent, enqueueRecoveryJob, updateIncident } from './store.js';
import { transition } from './stitchEngine.js';

const RECOVERY_ACTIONS = new Set(['retry', 'send_link', 'reminder', 'promise_to_pay', 'wait', 'escalate', 'stop']);

export const executeBoundedAction = async (incident, adapter) => {
  const action = incident.action;
  if (!action || !RECOVERY_ACTIONS.has(action.type)) throw new Error('No approved recovery action is available.');
  if (action.status === 'blocked_by_policy' || ['recovered', 'stopped', 'escalated'].includes(incident.status)) {
    return incident;
  }

  addAuditEvent({ incidentId: incident.id, event: 'PRE_EXECUTION_CHECK', actor: 'SYSTEM', result: 'Required before action' });
  const currentState = incident.payment_id ? await adapter.getPaymentStatus(incident.payment_id) : { status: incident.payment_state || 'unpaid' };
  if (['captured', 'authorized', 'paid'].includes(currentState.status)) {
    action.status = 'killed';
    action.kill_reason = 'customer_paid_manually';
    updateIncident(incident.id, { action, payment_state: 'paid' });
    addAuditEvent({ incidentId: incident.id, event: 'SCHEDULED_ACTION_CANCELLED', actor: 'SYSTEM', result: 'Payment already received' });
    if (incident.state === 'executing' || incident.state === 'verifying') transition(incident, 'stopped', 'SYSTEM', 'Unnecessary recovery prevented');
    return incident;
  }

  if (incident.state !== 'executing') transition(incident, 'executing', 'SYSTEM', 'Approved action entering executor');
  if (action.type === 'wait') {
    action.status = 'scheduled';
    action.outcome = null;
    const job = enqueueRecoveryJob({ incidentId: incident.id, type: 're_evaluate', runAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() });
    updateIncident(incident.id, { action, scheduled_job_id: job.id });
    addAuditEvent({ incidentId: incident.id, event: 'RECOVERY_ACTION_SCHEDULED', actor: 'SYSTEM', result: 'Wait and re-evaluate', metadata: { job_id: job.id } });
    return incident;
  }

  if (action.type === 'send_link') {
    if (!Number.isInteger(incident.amount_paise) || incident.amount_paise < 100) {
      throw new Error('A payment link requires an amount of at least 100 paise.');
    }
    const link = await adapter.createPaymentLink({
      amount: incident.amount_paise,
      currency: 'INR',
      reference_id: incident.id.slice(0, 40),
      description: `Stitch recovery for ${incident.id}`,
      expire_by: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60),
      reminder_enable: false,
      notes: { stitch_incident_id: incident.id, source_context: incident.order_id || incident.invoice_id || incident.subscription_id || incident.payment_id || 'payment_failure' }
    });
    action.status = 'executed';
    updateIncident(incident.id, { action, payment_link: link, payment_link_id: link.id });
    addAuditEvent({ incidentId: incident.id, event: 'PAYMENT_LINK_CREATED', actor: 'SYSTEM', result: 'Provider-hosted recovery link created', metadata: { payment_link_id: link.id, expires_at: link.expire_by, short_url: link.short_url } });
    return incident;
  }

  if (action.type === 'reminder') {
    action.status = 'executed';
    updateIncident(incident.id, { action, contact_count: (incident.contact_count || 0) + 1 });
    addAuditEvent({ incidentId: incident.id, event: 'RECOVERY_REMINDER_SCHEDULED', actor: 'SYSTEM', result: 'Bounded outreach action' });
    return incident;
  }

  if (action.type === 'promise_to_pay') {
    action.status = 'executed';
    action.promise_due_at = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    const job = enqueueRecoveryJob({ incidentId: incident.id, type: 'promise_due', runAt: action.promise_due_at });
    updateIncident(incident.id, { action, scheduled_job_id: job.id, contact_count: (incident.contact_count || 0) + 1 });
    addAuditEvent({ incidentId: incident.id, event: 'PROMISE_TO_PAY_REQUESTED', actor: 'SYSTEM', result: 'One compliant receivables outreach scheduled', metadata: { due_at: action.promise_due_at } });
    return incident;
  }

  if (action.type === 'retry') {
    action.status = 'scheduled';
    const job = enqueueRecoveryJob({ incidentId: incident.id, type: 'provider_retry_review', runAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() });
    updateIncident(incident.id, { action, scheduled_job_id: job.id, retry_count: (incident.retry_count || 0) + 1 });
    addAuditEvent({ incidentId: incident.id, event: 'PAYMENT_RETRY_SCHEDULED', actor: 'SYSTEM', result: 'Requires provider-approved retry window', metadata: { job_id: job.id } });
    return incident;
  }

  action.status = 'executed';
  updateIncident(incident.id, { action });
  addAuditEvent({ incidentId: incident.id, event: 'RECOVERY_ACTION_EXECUTED', actor: 'SYSTEM', result: action.type });
  return incident;
};

export const calculateImpact = cases => {
  const summarize = group => {
    const selected = cases.filter(item => item.group === group && item.settled !== false);
    const recovered = selected.filter(item => item.outcome === 'recovered').reduce((sum, item) => sum + item.amount_paise, 0);
    return {
      cases: selected.length,
      at_risk_paise: selected.reduce((sum, item) => sum + item.amount_paise, 0),
      recovered_paise: recovered,
      recovery_rate: selected.length ? recovered / selected.reduce((sum, item) => sum + item.amount_paise, 0) : 0,
      customer_contacts: selected.reduce((sum, item) => sum + (item.contacts || 0), 0),
      recovery_cost_paise: selected.reduce((sum, item) => sum + (item.recovery_cost_paise || 0), 0)
    };
  };
  const control = summarize('control');
  const treatment = summarize('treatment');
  return {
    control,
    treatment,
    incremental_recovery_paise: treatment.at_risk_paise * (treatment.recovery_rate - control.recovery_rate),
    formula: 'treatment.at_risk_paise * (treatment.recovery_rate - control.recovery_rate)',
    policy_violations: cases.filter(item => item.policy_violation).length,
    unsettled_cases: cases.filter(item => item.settled === false).length,
    attribution_note: 'Only terminal incidents inside the configured attribution window are included in lift.'
  };
};
