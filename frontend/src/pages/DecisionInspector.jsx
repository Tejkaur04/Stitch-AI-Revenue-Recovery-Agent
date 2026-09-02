import React from 'react';

const json = {
  recommended_action: 'wait_and_retry',
  reason: 'The customer has a strong recent payment history, and the payment is likely transient.',
  risk_level: 'medium',
  confidence: 0.87,
  expected_recovery_paise: 875000,
  policy_checks: [
    'retry_count_within_limit',
    'quiet_hours_clear',
    'no_customer_opt_out'
  ]
};

const DecisionInspector = () => (
  <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1rem 4rem' }}>
    <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: '#7dd3fc', fontWeight: 700 }}>Console / audit</div>
    <h1 style={{ fontSize: 42, margin: '0.5rem 0 1rem' }}>Decision trace</h1>
    <div style={{ display: 'grid', gap: 20, gridTemplateColumns: '1fr 1fr' }}>
      <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 12, padding: 20, color: '#e2e8f0' }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Structured JSON</div>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'ui-monospace, SFMono-Regular, monospace', lineHeight: 1.8, color: '#cbd5e1' }}>
{JSON.stringify(json, null, 2)}
        </pre>
      </div>
      <div style={{ background: '#F3F1EB', border: '1px solid #0f172a', borderRadius: 12, padding: 20, color: '#0f172a' }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Plain-language explanation</div>
        <p style={{ lineHeight: 1.8, color: '#334155' }}>
          The engine recommends a short wait-and-retry because the customer has a strong payment history and the failure appears transient. It checks retry limits, quiet hours, and opt-out status before confirming any action.
        </p>
        <div style={{ marginTop: 18, fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: '#2F5FF0', fontWeight: 700 }}>Decision confidence</div>
        <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8 }}>87%</div>
      </div>
    </div>
  </div>
);

export default DecisionInspector;
