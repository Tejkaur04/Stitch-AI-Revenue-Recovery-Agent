import { addAuditEvent, addIncident, getIncident, getOrAssignCohort, updateIncident } from './store.js';
import { evaluatePolicy } from './policy.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'fallback');

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
  const invoice = body.payload?.invoice?.entity || {};
  const subscription = body.payload?.subscription?.entity || {};
  const paymentLink = body.payload?.payment_link?.entity || {};
  const customer = body.payload?.customer?.entity || {};
  if (!event) throw new Error('Razorpay event is missing body.event');

  return {
    sourceEvent: event,
    razorpayEventId: body.id || body.event_id || null,
    customerId: customer.id || payment.customer_id || invoice.customer_id || subscription.customer_id || paymentLink.customer_id || 'unknown_customer',
    customer: { id: customer.id || payment.customer_id || invoice.customer_id || subscription.customer_id || paymentLink.customer_id || 'unknown_customer', name: customer.name || paymentLink.customer?.name || 'Razorpay customer' },
    paymentId: payment.id || null,
    orderId: order.id || payment.order_id || null,
    invoiceId: invoice.id || payment.invoice_id || null,
    subscriptionId: subscription.id || invoice.subscription_id || payment.subscription_id || null,
    paymentLinkId: paymentLink.id || null,
    amount_paise: payment.amount || order.amount || invoice.amount_due || invoice.amount || subscription.plan?.item?.amount || paymentLink.amount || 0,
    reason: payment.error_description || payment.error_reason || invoice.error_description || invoice.error_reason || subscription.error_description || (event.includes('abandoned') ? 'Checkout abandoned' : 'Payment failed'),
    type: event.includes('abandoned') || event.includes('checkout') ? 'checkout_abandonment'
      : event.includes('subscription') ? 'subscription_failure'
        : event.includes('invoice') ? 'invoice_overdue'
          : 'payment_failure'
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
    group: getOrAssignCohort(normalized.customerId),
    payment_id: normalized.paymentId,
    order_id: normalized.orderId,
    invoice_id: normalized.invoiceId,
    subscription_id: normalized.subscriptionId,
    payment_link_id: normalized.paymentLinkId,
    reason: normalized.reason,
    source_event: normalized.sourceEvent,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    action: null,
    policy: null
  };
  addIncident(incident);
  addAuditEvent({ incidentId: incident.id, event: 'REVENUE_RISK_DETECTED', actor: 'RAZORPAY', result: normalized.type, metadata: normalized });
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
  if (['recovered', 'stopped', 'escalated'].includes(nextState)) incident.outcome_at = new Date().toISOString();
  updateIncident(incident.id, incident);
  addAuditEvent({ incidentId: incident.id, event: 'STATE_CHANGED', actor, result, metadata: { oldState, newState: nextState, ...metadata } });
  return incident;
};

export const decide = async (incident) => {
  // If no API key is set, fallback to the hardcoded simulation so the app doesn't break
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'fallback') {
    const expired = /expired/i.test(incident.reason);
    const riskyRetry = /insufficient funds/i.test(incident.reason);
    const type = incident.type === 'invoice_overdue' ? 'promise_to_pay' : ['cart_abandonment', 'checkout_abandonment', 'subscription_failure'].includes(incident.type) ? 'send_link' : expired ? 'send_link' : riskyRetry ? 'retry' : 'wait';
    const reasoning = incident.type === 'invoice_overdue' ? 'The invoice is overdue; request a dated promise to pay before escalating.' : ['cart_abandonment', 'checkout_abandonment'].includes(incident.type) ? 'The checkout was abandoned; send one compliant recovery link.' : incident.type === 'subscription_failure' ? 'The subscription payment failed; send a secure payment-method update link.' : expired ? 'The payment method appears expired; request an update instead.' : riskyRetry ? 'The failure has a low recovery signal; retry requires policy review.' : 'The failure appears temporary; wait and verify current payment state before retrying.';
    return { type, candidate_actions: ['wait', 'retry', 'send_link', 'promise_to_pay', 'escalate'], confidence: 'rule_based', decided_by: 'ai_engine', status: 'pending', reasoning, outcome: null };
  }

  // Real LLM Integration
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
    
    const prompt = `
      You are an AI Revenue Recovery Orchestrator. A payment has failed.
      Analyze the incident and choose the best next action.
      
      Customer Info: ${JSON.stringify(incident.customer)}
      Amount: ${incident.amount_paise} paise
      Failure Reason: ${incident.reason}
      Incident Type: ${incident.type}

      Choose ONE of these actions: "wait", "retry", "send_link", "promise_to_pay", or "escalate".
      Return a JSON response strictly in this format:
      {
        "type": "<action_chosen>",
        "reasoning": "<1 sentence explaining why based on the customer context and failure reason>"
      }
    `;

    const result = await model.generateContent(prompt);
    const response = JSON.parse(result.response.text());
    
    const allowedActions = new Set(['wait', 'retry', 'send_link', 'promise_to_pay', 'escalate']);
    const type = allowedActions.has(response.type) ? response.type : 'wait';
    return { 
      type,
      candidate_actions: ['wait', 'retry', 'send_link', 'promise_to_pay', 'escalate'],
      confidence: 'model_generated',
      decided_by: 'gemini_flash', 
      status: 'pending', 
      reasoning: typeof response.reasoning === 'string' ? response.reasoning : 'Wait and re-evaluate before taking action.', 
      outcome: null 
    };
  } catch (error) {
    console.error("LLM Error:", error);
    return { type: 'wait', decided_by: 'fallback_due_to_error', status: 'pending', reasoning: 'Fell back to wait due to API error.', outcome: null };
  }
};

export const processIncident = async (incident, adapter) => {
  transition(incident, 'understanding', 'SYSTEM', 'Customer context loaded');
  incident.action = await decide(incident);
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
