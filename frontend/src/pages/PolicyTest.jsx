import React, { useState } from 'react';
import { triggerPaymentFailure, transitionState, INCIDENT_STATES, logEvent } from '../services/engine';

const scenarios = [
  {
    key: 'max-retries',
    title: 'Max retries exceeded',
    description: 'The customer already hit their retry limit and the policy must stop the action.',
    build: () => buildScenario({ amount: 1200000, reason: 'Insufficient funds', customer: { id: 'cust_retry', name: 'Northstar Labs', ltv: 900000, successful_payments: 2, total_payments: 5 }, policy: 'Maximum retry limit reached.' })
  },
  {
    key: 'opt-out',
    title: 'Opted-out customer',
    description: 'The customer previously opted out and the outreach action should be blocked immediately.',
    build: () => buildScenario({ amount: 220000, reason: 'Authentication failure', customer: { id: 'cust_optout', name: 'Cinder Works', ltv: 500000, successful_payments: 4, total_payments: 7, opted_out: true }, policy: 'Customer opted out of communication.' })
  },
  {
    key: 'quiet-hours',
    title: 'Quiet-hours violation',
    description: 'The action happens during quiet hours and the policy must reject it.',
    build: () => buildScenario({ amount: 440000, reason: 'Temporary bank failure', customer: { id: 'cust_quiet', name: 'Harbor Foods', ltv: 700000, successful_payments: 8, total_payments: 9 }, policy: 'Quiet hours are active (21:00-09:00 local time).' })
  },
  {
    key: 'high-value',
    title: 'Over-threshold invoice',
    description: 'The amount exceeds the approved threshold and needs escalation or explicit approval.',
    build: () => buildScenario({ amount: 25000000, reason: 'Invoice overdue', customer: { id: 'cust_high', name: 'Northern Ventures', ltv: 20000000, successful_payments: 12, total_payments: 13 }, policy: 'High-value recovery requires human approval.' })
  }
];

const buildScenario = ({ amount, reason, customer, policy }) => {
  const id = triggerPaymentFailure(customer, amount, reason);
  transitionState(id, INCIDENT_STATES.UNDERSTANDING, 'SYSTEM', 'Customer context loaded');
  transitionState(id, INCIDENT_STATES.DECIDING, 'AI', 'Decision generated', {
    aiDecision: { action: 'retry', basis: 'The system sees a likely recoverable payment issue.' }
  });
  transitionState(id, INCIDENT_STATES.POLICY_CHECK, 'POLICY', 'BLOCKED', {
    policyResult: { status: 'blocked', reason: policy }
  });
  logEvent(id, 'POLICY_CHECK', 'POLICY', 'BLOCKED', { reason: policy });
  return { id, policy, reason };
};

const PolicyTest = () => {
  const [results, setResults] = useState([]);

  const runScenario = key => {
    const scenario = scenarios.find(item => item.key === key);
    if (!scenario) return;
    const record = scenario.build();
    setResults(prev => [record, ...prev].slice(0, 5));
  };

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: '#7dd3fc', fontWeight: 700 }}>Console / guardrails</div>
      <h1 style={{ fontSize: 42, margin: '0.5rem 0 1rem' }}>Policy test harness</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {scenarios.map(s => (
          <button key={s.key} onClick={() => runScenario(s.key)} style={{ background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', borderRadius: 12, padding: 18, cursor: 'pointer', textAlign: 'left' }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{s.title}</div>
            <div style={{ marginTop: 8, color: '#cbd5e1', lineHeight: 1.6 }}>{s.description}</div>
          </button>
        ))}
      </div>

      <div style={{ marginTop: 28, background: '#0f172a', border: '1px solid #334155', borderRadius: 12, padding: 20, color: '#e2e8f0' }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Latest verdicts</div>
        {results.length === 0 ? (
          <div style={{ color: '#cbd5e1' }}>Run a scenario to watch a policy verdict appear live.</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {results.map(result => (
              <div key={result.id} style={{ border: '1px solid #334155', borderRadius: 10, padding: 12, background: '#111827' }}>
                <div style={{ color: '#fca5a5', fontWeight: 700 }}>BLOCKED</div>
                <div style={{ marginTop: 6, fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>{result.policy}</div>
                <div style={{ marginTop: 4, color: '#cbd5e1' }}>Incident: {result.id}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PolicyTest;
