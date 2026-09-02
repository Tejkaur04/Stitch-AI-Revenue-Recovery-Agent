export const INCIDENT_STATES = {
  DETECTED: 'DETECTED',
  UNDERSTANDING: 'UNDERSTANDING',
  DECIDING: 'DECIDING',
  POLICY_CHECK: 'POLICY_CHECK',
  VERIFYING: 'VERIFYING',
  EXECUTING: 'EXECUTING',
  RECOVERED: 'RECOVERED',
  STOPPED: 'STOPPED',
  ESCALATED: 'ESCALATED'
};

export const EVENT_ACTORS = {
  SYSTEM: 'SYSTEM',
  AI: 'AI',
  POLICY: 'POLICY',
  MERCHANT: 'MERCHANT',
  RAZORPAY: 'RAZORPAY'
};

const VALID_TRANSITIONS = {
  [INCIDENT_STATES.DETECTED]: [INCIDENT_STATES.UNDERSTANDING],
  [INCIDENT_STATES.UNDERSTANDING]: [INCIDENT_STATES.DECIDING],
  [INCIDENT_STATES.DECIDING]: [INCIDENT_STATES.POLICY_CHECK],
  [INCIDENT_STATES.POLICY_CHECK]: [INCIDENT_STATES.VERIFYING, INCIDENT_STATES.ESCALATED],
  [INCIDENT_STATES.VERIFYING]: [INCIDENT_STATES.EXECUTING, INCIDENT_STATES.STOPPED],
  [INCIDENT_STATES.EXECUTING]: [INCIDENT_STATES.VERIFYING, INCIDENT_STATES.RECOVERED],
  [INCIDENT_STATES.RECOVERED]: [],
  [INCIDENT_STATES.STOPPED]: [],
  [INCIDENT_STATES.ESCALATED]: []
};

// In-memory store for simulation
let incidents = [];
let events = [];
let listeners = [];

export const subscribe = (listener) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
};

const notify = () => {
  listeners.forEach(l => l([...incidents], [...events]));
};

export const logEvent = (incidentId, eventName, actor, result = null, details = {}) => {
  const event = {
    id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
    incidentId,
    event: eventName,
    actor,
    result,
    ...details
  };
  events.push(event);
  notify();
  return event;
};

export const getIncidents = () => [...incidents];
export const getIncident = (id) => incidents.find(i => i.id === id);
export const getEvents = (incidentId) => events.filter(e => e.incidentId === incidentId).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

const LAB_CASES = [
  { amount: 299900, baselineRecovered: false, stitchRecovered: true, baselineContacts: 3, stitchContacts: 0 },
  { amount: 875000, baselineRecovered: false, stitchRecovered: false, baselineContacts: 2, stitchContacts: 0 },
  { amount: 499900, baselineRecovered: true, stitchRecovered: true, baselineContacts: 2, stitchContacts: 1 },
  { amount: 1200000, baselineRecovered: false, stitchRecovered: false, baselineContacts: 4, stitchContacts: 0 },
  { amount: 1750000, baselineRecovered: false, stitchRecovered: true, baselineContacts: 3, stitchContacts: 1 },
  { amount: 649900, baselineRecovered: true, stitchRecovered: true, baselineContacts: 2, stitchContacts: 1 },
  { amount: 249900, baselineRecovered: false, stitchRecovered: true, baselineContacts: 3, stitchContacts: 0 },
  { amount: 999900, baselineRecovered: true, stitchRecovered: true, baselineContacts: 2, stitchContacts: 1 }
];

export const calculateLabResults = () => {
  const summarize = strategy => LAB_CASES.reduce((summary, item) => {
    const recovered = item[`${strategy}Recovered`];
    summary.recovered += recovered ? item.amount : 0;
    summary.contacts += item[`${strategy}Contacts`];
    summary.recoveredCases += recovered ? 1 : 0;
    return summary;
  }, { recovered: 0, contacts: 0, recoveredCases: 0 });

  const baseline = summarize('baseline');
  const stitch = summarize('stitch');
  const baselineRate = baseline.recovered / LAB_CASES.reduce((total, item) => total + item.amount, 0);
  const stitchRate = stitch.recovered / LAB_CASES.reduce((total, item) => total + item.amount, 0);
  const treatmentAtRisk = LAB_CASES.filter(item => item.stitchRecovered !== undefined)
    .reduce((total, item) => total + item.amount, 0);
  return {
    cases: LAB_CASES.length,
    revenueAtRisk: LAB_CASES.reduce((total, item) => total + item.amount, 0),
    baseline: { ...baseline, rate: baselineRate },
    stitch: { ...stitch, rate: stitchRate },
    incrementalLift: treatmentAtRisk * (stitchRate - baselineRate),
    policyViolations: 1
  };
};

// Core State Transition Logic
export const transitionState = (incidentId, newState, actor, result = null, details = {}) => {
  const incident = getIncident(incidentId);
  if (!incident) return;
  
  const oldState = incident.state;
  if (!VALID_TRANSITIONS[oldState]?.includes(newState)) {
    logEvent(incidentId, 'INVALID_TRANSITION_REJECTED', EVENT_ACTORS.SYSTEM, `Cannot move from ${oldState} to ${newState}`, {
      oldState,
      newState
    });
    return false;
  }
  incident.state = newState;
  incident.updatedAt = new Date().toISOString();
  
  if (details.aiDecision) incident.aiDecision = details.aiDecision;
  if (details.policyResult) incident.policyResult = details.policyResult;
  if (details.action) incident.action = details.action;
  
  logEvent(incidentId, `STATE_CHANGED`, actor, result, { oldState, newState, ...details });
  notify();
  return true;
};

// Razorpay / Simulation Triggers
export const triggerPaymentFailure = (customerInfo, amount, reason) => {
  const id = `inc_${Date.now()}`;
  const incident = {
    id,
    type: 'payment_failure',
    state: INCIDENT_STATES.DETECTED,
    customer: customerInfo,
    amount_paise: amount,
    reason,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    aiDecision: null,
    policyResult: null,
    action: null
  };
  incidents.unshift(incident);
  logEvent(id, 'PAYMENT_FAILED', EVENT_ACTORS.RAZORPAY, 'Detected', { reason, amount });
  notify();
  return id;
};

// Demo Runner (Phase 1) - Orchestrates the async flow
export const runScenario = async (scenarioType, onIncidentCreated = null) => {
  if (scenarioType === 'TEMP_FAILURE') {
    const id = triggerPaymentFailure(
      { id: 'cust_01', name: 'Rohit Sharma', ltv: 3500000, successful_payments: 11, total_payments: 12 },
      299900,
      'Temporary bank failure'
    );
    onIncidentCreated?.(id);
    await delay(1000);
    transitionState(id, INCIDENT_STATES.UNDERSTANDING, EVENT_ACTORS.SYSTEM);
    await delay(1500);
    transitionState(id, INCIDENT_STATES.DECIDING, EVENT_ACTORS.AI, 'Evaluated context', {
       aiDecision: { action: 'wait_and_retry', basis: 'Customer has strong payment history (11/12). Failure appears temporary.' }
    });
    await delay(1500);
    transitionState(id, INCIDENT_STATES.POLICY_CHECK, EVENT_ACTORS.POLICY, 'Allowed', {
       policyResult: { status: 'allowed', reason: 'Retry count within limits. No recent contact.' }
    });
    await delay(1000);
    transitionState(id, INCIDENT_STATES.VERIFYING, EVENT_ACTORS.SYSTEM, 'Verified unpaid');
    await delay(1000);
    transitionState(id, INCIDENT_STATES.EXECUTING, EVENT_ACTORS.SYSTEM, 'Scheduled retry', {
       action: { type: 'retry', status: 'scheduled' }
    });
    await delay(2000);
    logEvent(id, 'PAYMENT_RECEIVED', EVENT_ACTORS.RAZORPAY, 'Success via retry');
    transitionState(id, INCIDENT_STATES.RECOVERED, EVENT_ACTORS.SYSTEM, 'Recovered');
    return id;
  }
  else if (scenarioType === 'CUSTOMER_PAID') {
    const id = triggerPaymentFailure(
      { id: 'cust_02', name: 'Acme Corp', ltv: 15000000, successful_payments: 24, total_payments: 24 },
      875000,
      'Authentication failure'
    );
    onIncidentCreated?.(id);
    await delay(800);
    transitionState(id, INCIDENT_STATES.UNDERSTANDING, EVENT_ACTORS.SYSTEM);
    await delay(1000);
    transitionState(id, INCIDENT_STATES.DECIDING, EVENT_ACTORS.AI, null, {
       aiDecision: { action: 'wait_and_retry', basis: 'Authentication failure usually resolves shortly. Strong LTV.' }
    });
    await delay(1000);
    transitionState(id, INCIDENT_STATES.POLICY_CHECK, EVENT_ACTORS.POLICY, 'Allowed', {
       policyResult: { status: 'allowed' }
    });
    await delay(800);
    transitionState(id, INCIDENT_STATES.EXECUTING, EVENT_ACTORS.SYSTEM, 'Scheduled retry', {
       action: { type: 'retry', status: 'scheduled' }
    });
    
    // Simulate async payment from user before retry executes
    await delay(1500);
    logEvent(id, 'MANUAL_PAYMENT_RECEIVED', EVENT_ACTORS.RAZORPAY, 'Success');
    
    // System verifies state before executing action
    transitionState(id, INCIDENT_STATES.VERIFYING, EVENT_ACTORS.SYSTEM, 'Verified payment received');
    await delay(1000);
    
    logEvent(id, 'SCHEDULED_RETRY_CANCELLED', EVENT_ACTORS.SYSTEM, 'Unnecessary retry prevented');
    transitionState(id, INCIDENT_STATES.STOPPED, EVENT_ACTORS.SYSTEM, 'Payment already received', {
      outcome: 'Payment already received. Unnecessary retry prevented.'
    });
    return id;
  }
  else if (scenarioType === 'POLICY_BLOCKED') {
    const id = triggerPaymentFailure(
      { id: 'cust_03', name: 'Startup Inc', ltv: 50000, successful_payments: 2, total_payments: 5 },
      1200000,
      'Insufficient funds'
    );
    onIncidentCreated?.(id);
    await delay(800);
    transitionState(id, INCIDENT_STATES.UNDERSTANDING, EVENT_ACTORS.SYSTEM);
    await delay(1000);
    transitionState(id, INCIDENT_STATES.DECIDING, EVENT_ACTORS.AI, null, {
       aiDecision: { action: 'retry_immediate', basis: 'Attempt recovery before funds deplete further.' }
    });
    await delay(1000);
    transitionState(id, INCIDENT_STATES.POLICY_CHECK, EVENT_ACTORS.POLICY, 'Blocked', {
       policyResult: { status: 'blocked', reason: 'Maximum retries (3) already exceeded for this subscription.' }
    });
    await delay(1000);
    transitionState(id, INCIDENT_STATES.ESCALATED, EVENT_ACTORS.SYSTEM, 'Escalated to human', {
       action: { type: 'escalate', status: 'executed' }
    });
    return id;
  }
  else if (scenarioType === 'EXPIRED_CARD') {
    const id = triggerPaymentFailure(
      { id: 'cust_04', name: 'Maya Retail', ltv: 640000, successful_payments: 8, total_payments: 9 },
      499900,
      'Expired card'
    );
    onIncidentCreated?.(id);
    await delay(800);
    transitionState(id, INCIDENT_STATES.UNDERSTANDING, EVENT_ACTORS.SYSTEM);
    await delay(1000);
    transitionState(id, INCIDENT_STATES.DECIDING, EVENT_ACTORS.AI, 'Evaluated payment method', {
      aiDecision: { action: 'send_payment_method_update', basis: 'Failure indicates an expired card and the customer has a reliable payment history.' }
    });
    await delay(1000);
    transitionState(id, INCIDENT_STATES.POLICY_CHECK, EVENT_ACTORS.POLICY, 'Allowed', {
      policyResult: { status: 'allowed', reason: 'Payment-method update is permitted and communication limits are clear.' }
    });
    await delay(800);
    transitionState(id, INCIDENT_STATES.VERIFYING, EVENT_ACTORS.SYSTEM, 'Verified unpaid');
    await delay(800);
    transitionState(id, INCIDENT_STATES.EXECUTING, EVENT_ACTORS.SYSTEM, 'Payment-method update link sent', {
      action: { type: 'send_link', status: 'executed' }
    });
    await delay(1500);
    logEvent(id, 'PAYMENT_METHOD_UPDATED', EVENT_ACTORS.RAZORPAY, 'Customer updated payment method');
    logEvent(id, 'PAYMENT_RECEIVED', EVENT_ACTORS.RAZORPAY, 'Recovered after payment-method update');
    transitionState(id, INCIDENT_STATES.RECOVERED, EVENT_ACTORS.SYSTEM, 'Recovered');
    return id;
  }
  else if (scenarioType === 'B2B_INVOICE') {
    const id = triggerPaymentFailure(
      { id: 'cust_05', name: 'Northstar Systems', ltv: 4800000, successful_payments: 9, total_payments: 12 },
      1750000,
      'Invoice overdue'
    );
    onIncidentCreated?.(id);
    await delay(800);
    transitionState(id, INCIDENT_STATES.UNDERSTANDING, EVENT_ACTORS.SYSTEM);
    await delay(1000);
    transitionState(id, INCIDENT_STATES.DECIDING, EVENT_ACTORS.AI, 'Evaluated invoice history', {
      aiDecision: { action: 'wait_and_request_promise_to_pay', basis: 'Customer pays late consistently; immediate escalation is less likely to recover the invoice.' }
    });
    await delay(1000);
    transitionState(id, INCIDENT_STATES.POLICY_CHECK, EVENT_ACTORS.POLICY, 'Allowed', {
      policyResult: { status: 'allowed', reason: 'Promise-to-pay request is within communication limits.' }
    });
    await delay(800);
    transitionState(id, INCIDENT_STATES.VERIFYING, EVENT_ACTORS.SYSTEM, 'Verified invoice outstanding');
    await delay(800);
    transitionState(id, INCIDENT_STATES.EXECUTING, EVENT_ACTORS.SYSTEM, 'Promise-to-pay request sent', {
      action: { type: 'reminder', status: 'executed' }
    });
    await delay(1200);
    transitionState(id, INCIDENT_STATES.STOPPED, EVENT_ACTORS.SYSTEM, 'Waiting on customer promise-to-pay', {
      outcome: 'No payment yet; follow-up is scheduled after the customer response window.'
    });
    return id;
  }
};

const delay = (ms) => new Promise(res => setTimeout(res, ms));

// Pre-seed some initial data
export const seedInitialData = () => {
    // Initial mock data if needed
};
