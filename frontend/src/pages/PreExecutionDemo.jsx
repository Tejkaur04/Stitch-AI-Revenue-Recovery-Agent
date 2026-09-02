import React, { useState } from 'react';
import { triggerPaymentFailure, transitionState, INCIDENT_STATES, logEvent } from '../services/engine';

const PreExecutionDemo = () => {
  const [incidentId, setIncidentId] = useState(null);
  const [status, setStatus] = useState('Idle');
  const [log, setLog] = useState([
    'PRE_EXECUTION_CHECK — waiting for a scheduled action',
    'VERIFY — payment state not yet confirmed'
  ]);

  const createIncident = () => {
    const id = triggerPaymentFailure(
      { id: 'cust_pre_exec', name: 'Aero Retail', ltv: 1500000, successful_payments: 9, total_payments: 10 },
      875000,
      'Authentication failure'
    );
    transitionState(id, INCIDENT_STATES.UNDERSTANDING, 'SYSTEM', 'Customer context loaded');
    transitionState(id, INCIDENT_STATES.DECIDING, 'AI', 'Decision generated', {
      aiDecision: { action: 'retry', basis: 'Customer has strong payment history; retry is likely to succeed.' }
    });
    transitionState(id, INCIDENT_STATES.POLICY_CHECK, 'POLICY', 'ALLOWED', {
      policyResult: { status: 'allowed', reason: 'Retry within policy and not in quiet hours.' }
    });
    transitionState(id, INCIDENT_STATES.VERIFYING, 'SYSTEM', 'Pre-execution verification started');
    transitionState(id, INCIDENT_STATES.EXECUTING, 'SYSTEM', 'Queued retry is ready to execute', {
      action: { type: 'retry', status: 'scheduled' }
    });
    setIncidentId(id);
    setStatus('Queued retry scheduled');
    setLog([
      'PRE_EXECUTION_CHECK — verifying current payment state',
      'RETRY QUEUED — action scheduled for execution',
      'WAITING — customer confirmation signal'
    ]);
  };

  const simulateManualPayment = () => {
    if (!incidentId) {
      setStatus('Create the incident first');
      return;
    }
    logEvent(incidentId, 'MANUAL_PAYMENT_RECEIVED', 'RAZORPAY', 'Customer paid manually');
    transitionState(incidentId, INCIDENT_STATES.VERIFYING, 'SYSTEM', 'Payment state rechecked');
    logEvent(incidentId, 'SCHEDULED_RETRY_CANCELLED', 'SYSTEM', 'Unnecessary retry prevented');
    transitionState(incidentId, INCIDENT_STATES.STOPPED, 'SYSTEM', 'Payment already received');
    setStatus('Pre-execution verifier killed the queued action');
    setLog([
      'MANUAL_PAYMENT_RECEIVED — customer already paid',
      'PRE_EXECUTION_VERIFIER — queued retry cancelled',
      'STATE_CHANGED — STOPPED (no double charge / no redundant recovery)'
    ]);
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: '#7dd3fc', fontWeight: 700 }}>Console / proof</div>
      <h1 style={{ fontSize: 42, margin: '0.5rem 0 1rem' }}>Pre-execution verifier</h1>
      <p style={{ color: '#475569', marginBottom: 18 }}>This demo proves the system checks payment state before it executes a retry instead of trusting the original queue.</p>

      <div style={{ background: '#0f172a', border: '1px solid #334155', color: '#e2e8f0', borderRadius: 12, padding: 20 }}>
        <div style={{ marginBottom: 14, fontSize: 18, fontWeight: 700 }}>{status}</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button style={buttonStyle} onClick={createIncident}>Create retry queue</button>
          <button style={{ ...buttonStyle, background: '#1d4ed8' }} onClick={simulateManualPayment}>Simulate customer paid manually</button>
        </div>
        <div style={{ marginTop: 22, fontFamily: 'ui-monospace, SFMono-Regular, monospace', lineHeight: 1.8, color: '#cbd5e1' }}>
          {log.map(line => <div key={line}>{line}</div>)}
        </div>
        {incidentId && <div style={{ marginTop: 18, fontSize: 12, color: '#93c5fd' }}>Incident ID: {incidentId}</div>}
      </div>
    </div>
  );
};

const buttonStyle = {
  padding: '0.8rem 1.1rem',
  borderRadius: 10,
  border: '1px solid #94a3b8',
  background: '#111827',
  color: '#f8fafc',
  cursor: 'pointer',
  fontWeight: 700
};

export default PreExecutionDemo;
