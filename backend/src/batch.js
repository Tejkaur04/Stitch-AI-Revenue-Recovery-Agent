import { addAuditEvent, addIncident } from './store.js';
import { createIncidentFromEvent, processIncident } from './stitchEngine.js';
import { calculateImpact, executeBoundedAction } from './recovery.js';

const BATCH_CASES = [
  { amount_paise: 249900, reason: 'Temporary bank/network issue', customer: { id: 'batch_01', name: 'Aarav Mehta', ltv: 3500000, successful_payments: 11, total_payments: 12 }, actionOutcome: 'recovered' },
  { amount_paise: 499900, reason: 'Expired card', customer: { id: 'batch_02', name: 'Maya Retail', ltv: 640000, successful_payments: 8, total_payments: 9 }, actionOutcome: 'recovered' },
  { amount_paise: 875000, reason: 'Insufficient funds', customer: { id: 'batch_03', name: 'Northstar Labs', ltv: 900000, successful_payments: 2, total_payments: 5 }, actionOutcome: 'escalated' },
  { amount_paise: 199900, reason: 'Authentication failure', customer: { id: 'batch_04', name: 'Priya Shah', ltv: 1200000, successful_payments: 6, total_payments: 7 }, actionOutcome: 'stopped' },
  { amount_paise: 1200000, reason: 'Temporary bank/network issue', customer: { id: 'batch_05', name: 'Kite Education', ltv: 5200000, successful_payments: 18, total_payments: 19 }, actionOutcome: 'recovered' },
  { amount_paise: 350000, reason: 'UPI payment issue', customer: { id: 'batch_06', name: 'Devika Rao', ltv: 450000, successful_payments: 3, total_payments: 4 }, actionOutcome: 'recovered' },
  { amount_paise: 725000, reason: 'Repeated insufficient funds', customer: { id: 'batch_07', name: 'Orchid Memberships', ltv: 800000, successful_payments: 4, total_payments: 8 }, actionOutcome: 'escalated' },
  { amount_paise: 599900, reason: 'Temporary bank/network issue', customer: { id: 'batch_08', name: 'Sana Digital', ltv: 2100000, successful_payments: 10, total_payments: 11 }, actionOutcome: 'recovered' },
  { amount_paise: 1500000, reason: 'Invoice overdue', customer: { id: 'batch_09', name: 'Vertex Systems', ltv: 7200000, successful_payments: 9, total_payments: 10 }, actionOutcome: 'stopped' },
  { amount_paise: 275000, reason: 'Checkout payment failed', customer: { id: 'batch_10', name: 'Rhea Kapoor', ltv: 300000, successful_payments: 1, total_payments: 2 }, actionOutcome: 'recovered' }
];

const batchAdapter = {
  getPaymentStatus: async () => ({ status: 'created' }),
  createPaymentLink: async payload => ({ id: `plink_batch_${payload.reference_id || Date.now()}`, short_url: 'https://rzp.io/i/stitch-test' })
};

export const runRecoveryBatch = async () => {
  const results = [];
  for (const [index, item] of BATCH_CASES.entries()) {
    const incident = createIncidentFromEvent({
      sourceEvent: item.reason === 'Invoice overdue' ? 'invoice.overdue' : 'payment.failed',
      customerId: item.customer.id,
      customer: item.customer,
      paymentId: null,
      orderId: item.reason.includes('Checkout') ? `order_batch_${index + 1}` : null,
      amount_paise: item.amount_paise,
      reason: item.reason,
      type: item.reason === 'Invoice overdue' ? 'invoice_overdue' : item.reason.includes('Checkout') ? 'cart_abandonment' : 'payment_failure'
    });
    incident.group = index % 5 === 0 ? 'control' : 'treatment';
    await processIncident(incident, batchAdapter);
    if (item.actionOutcome === 'recovered') {
      incident.outcome = 'recovered';
      incident.recovered_amount_paise = incident.amount_paise;
      incident.status = 'recovered';
      incident.state = 'recovered';
      incident.action.status = 'executed';
      incident.action.outcome = 'recovered';
      incident.contact_count = (incident.contact_count || 0) + (incident.action?.type === 'reminder' || incident.action?.type === 'send_link' ? 1 : 0);
      addAuditEvent({ incidentId: incident.id, event: 'PAYMENT_RECOVERED', actor: 'SYSTEM', result: `₹${incident.amount_paise / 100} recovered` });
    } else if (item.actionOutcome === 'stopped') {
      incident.outcome = 'stopped';
      incident.status = 'stopped';
      incident.state = 'stopped';
      incident.action.status = 'killed';
      incident.action.kill_reason = 'recovery_not_appropriate';
      incident.contact_count = (incident.contact_count || 0) + (incident.action?.type === 'reminder' || incident.action?.type === 'send_link' ? 1 : 0);
      addAuditEvent({ incidentId: incident.id, event: 'RECOVERY_STOPPED', actor: 'SYSTEM', result: 'Stopping rule applied' });
    } else {
      incident.outcome = 'escalated';
      incident.status = 'escalated';
      incident.state = 'escalated';
      incident.action.status = 'blocked_by_policy';
      incident.contact_count = (incident.contact_count || 0) + (incident.action?.type === 'reminder' || incident.action?.type === 'send_link' ? 1 : 0);
      addAuditEvent({ incidentId: incident.id, event: 'ESCALATED', actor: 'SYSTEM', result: 'Human review required' });
    }
    results.push(incident);
  }

  const cases = results.map((incident, index) => ({
    group: incident.group,
    amount_paise: incident.amount_paise,
    outcome: incident.outcome === 'recovered' ? 'recovered' : null,
    contacts: Number(incident.contact_count || 0),
    recovery_cost_paise: incident.action?.type === 'send_link' ? 25 : 0,
    policy_violation: incident.outcome === 'escalated' && index % 5 !== 0
  }));
  return { ...calculateImpact(cases), incidents: results };
};
