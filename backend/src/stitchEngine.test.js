import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluatePolicy } from './policy.js';
import { normalizeRazorpayEvent } from './stitchEngine.js';
import { summarizeRevenueSnapshot } from './store.js';

const baseIncident = overrides => ({
  action: { type: 'retry' },
  amount_paise: 500000,
  retry_count: 0,
  contact_count: 0,
  customer: { opted_out: false },
  ...overrides
});

test('normalizes a Razorpay payment failure', () => {
  const result = normalizeRazorpayEvent({
    id: 'evt_123',
    event: 'payment.failed',
    payload: { payment: { entity: { id: 'pay_123', order_id: 'order_123', amount: 875000, error_reason: 'insufficient_funds' } } }
  });
  assert.equal(result.sourceEvent, 'payment.failed');
  assert.equal(result.paymentId, 'pay_123');
  assert.equal(result.orderId, 'order_123');
  assert.equal(result.amount_paise, 875000);
  assert.equal(result.type, 'payment_failure');
});

test('blocks retries over the configured retry limit', () => {
  const result = evaluatePolicy(baseIncident({ retry_count: 3 }));
  assert.equal(result.status, 'blocked');
  assert.match(result.reason, /retry limit/i);
});

test('blocks outreach for opted-out customers', () => {
  const result = evaluatePolicy(baseIncident({ action: { type: 'reminder' }, customer: { opted_out: true } }));
  assert.equal(result.status, 'blocked');
  assert.match(result.reason, /opted out/i);
});

test('requires approval for high-value recovery', () => {
  const result = evaluatePolicy(baseIncident({ amount_paise: 10000000 }));
  assert.equal(result.status, 'approval_required');
});

test('uses one shared revenue cohort and counts customer contacts consistently', () => {
  const result = summarizeRevenueSnapshot([
    { status: 'recovered', amount_paise: 16000, group: 'treatment', contact_count: 1 },
    { status: 'pending', amount_paise: 12000, group: 'treatment', contact_count: 1 },
    { status: 'recovered', amount_paise: 8000, group: 'control', contact_count: 2 },
    { status: 'stopped', amount_paise: 4000, group: 'control', contact_count: 0 }
  ]);

  assert.equal(result.total_recovered_paise, 24000);
  assert.equal(result.total_at_risk_paise, 40000);
  assert.equal(result.customer_contacts, 4);
  assert.equal(result.recovery_rate, 24000 / 40000);
});
