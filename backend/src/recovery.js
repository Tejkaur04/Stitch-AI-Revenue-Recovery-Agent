import { addAuditEvent, updateIncident } from './store.js';
import { transition } from './stitchEngine.js';

const RECOVERY_ACTIONS = new Set(['retry', 'send_link', 'reminder', 'wait', 'escalate', 'stop']);

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
    updateIncident(incident.id, { action });
    addAuditEvent({ incidentId: incident.id, event: 'RECOVERY_ACTION_SCHEDULED', actor: 'SYSTEM', result: 'Wait and re-evaluate' });
    return incident;
  }

  if (action.type === 'send_link' && (incident.order_id || incident.invoice_id)) {
    const link = await adapter.createPaymentLink({
      amount: incident.amount_paise,
      currency: 'INR',
      reference_id: incident.order_id || incident.invoice_id,
      description: `Stitch recovery for ${incident.id}`,
      callback_method: 'get'
    });
    action.status = 'executed';
    updateIncident(incident.id, { action, payment_link: link });
    addAuditEvent({ incidentId: incident.id, event: 'PAYMENT_LINK_SENT', actor: 'SYSTEM', result: 'Bound to original payment context' });
    return incident;
  }

  if (action.type === 'reminder') {
    action.status = 'executed';
    updateIncident(incident.id, { action, contact_count: (incident.contact_count || 0) + 1 });
    addAuditEvent({ incidentId: incident.id, event: 'RECOVERY_REMINDER_SCHEDULED', actor: 'SYSTEM', result: 'Bounded outreach action' });
    return incident;
  }

  if (action.type === 'retry') {
    action.status = 'scheduled';
    updateIncident(incident.id, { action, retry_count: (incident.retry_count || 0) + 1 });
    addAuditEvent({ incidentId: incident.id, event: 'PAYMENT_RETRY_SCHEDULED', actor: 'SYSTEM', result: 'Requires provider-approved retry window' });
    return incident;
  }

  action.status = 'executed';
  updateIncident(incident.id, { action });
  addAuditEvent({ incidentId: incident.id, event: 'RECOVERY_ACTION_EXECUTED', actor: 'SYSTEM', result: action.type });
  return incident;
};

export const calculateImpact = cases => {
  const summarize = group => {
    const selected = cases.filter(item => item.group === group);
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
    policy_violations: cases.filter(item => item.policy_violation).length
  };
};
