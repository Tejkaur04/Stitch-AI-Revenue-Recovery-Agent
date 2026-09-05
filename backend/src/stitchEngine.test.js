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

test('normalizes overdue invoices, checkout abandonment, and failed subscriptions', () => {
  const invoice = normalizeRazorpayEvent({ event: 'invoice.failed', payload: { invoice: { entity: { id: 'inv_1', amount: 1750000, customer_id: 'cust_1' } } } });
  const checkout = normalizeRazorpayEvent({ event: 'checkout.abandoned', payload: { order: { entity: { id: 'order_1', amount: 349900 } } } });
  const subscription = normalizeRazorpayEvent({ event: 'subscription.failed', payload: { subscription: { entity: { id: 'sub_1', plan: { item: { amount: 79900 } } } } } });

  assert.deepEqual({ type: invoice.type, amount: invoice.amount_paise, invoice: invoice.invoiceId }, { type: 'invoice_overdue', amount: 1750000, invoice: 'inv_1' });
  assert.deepEqual({ type: checkout.type, amount: checkout.amount_paise }, { type: 'checkout_abandonment', amount: 349900 });
  assert.deepEqual({ type: subscription.type, amount: subscription.amount_paise, subscription: subscription.subscriptionId }, { type: 'subscription_failure', amount: 79900, subscription: 'sub_1' });
});

test('normalizes a paid payment link for incident reconciliation', () => {
  const result = normalizeRazorpayEvent({ event: 'payment_link.paid', payload: { payment_link: { entity: { id: 'plink_1', amount: 499900, customer_id: 'cust_1' } } } });
  assert.equal(result.paymentLinkId, 'plink_1');
  assert.equal(result.amount_paise, 499900);
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
