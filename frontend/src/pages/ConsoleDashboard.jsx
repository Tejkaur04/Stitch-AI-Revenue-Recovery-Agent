import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, BadgeAlert, Bot, FlaskConical, ShieldAlert, TerminalSquare } from 'lucide-react';

const ConsoleDashboard = () => {
  const widgets = [
    { title: 'Pre-execution demo', description: 'Trigger a retry and then verify that the customer has already paid manually.', route: '/console/pre-execution-demo', icon: Activity },
    { title: 'Policy test', description: 'Run explicit guardrail scenarios for retries, opt-outs, quiet-hours, and invoice thresholds.', route: '/console/policy-test', icon: ShieldAlert },
    { title: 'Decision trace', description: 'Inspect the structured decision output and confirm the recovery path remains auditable.', route: '/console/decision-inspector', icon: Bot },
    { title: 'Legacy demo runner', description: 'Create recovery scenarios and inspect the event stream in the old test harness.', route: '/console/demo', icon: FlaskConical }
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
        <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 2, color: '#7dd3fc', fontWeight: 700 }}>Developer console</div>
        <h1 style={{ fontSize: 42, lineHeight: 1.1, margin: 0 }}>Proof engine</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
        {widgets.map(({ title, description, route, icon: Icon }) => (
          <Link key={title} to={route} style={{ textDecoration: 'none', color: '#e2e8f0', background: '#0f172a', border: '1px solid #334155', borderRadius: 12, padding: 18, display: 'grid', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 10, background: '#172554', border: '1px solid #334155' }}>
                <Icon size={18} color="#7dd3fc" />
              </div>
              <TerminalSquare size={18} color="#94a3b8" />
            </div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{title}</div>
            <div style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.6 }}>{description}</div>
          </Link>
        ))}
      </div>

      <div style={{ marginTop: 28, background: '#0f172a', border: '1px solid #334155', borderRadius: 12, padding: 20, color: '#e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <BadgeAlert size={18} color="#fbbf24" />
          <strong>Live system feed</strong>
        </div>
        <div style={{ fontFamily: 'ui-monospace, SFMono-Regular, monospace', color: '#cbd5e1', lineHeight: 1.8 }}>
          <div>STATE_CHANGED — PAYMENT_FAILED detected</div>
          <div>POLICY_CHECK — BLOCKED: maximum retry limit reached</div>
          <div>PRE_EXECUTION_CHECK — current payment state verified</div>
          <div>TRIGGER — scheduled retry cancelled before execution</div>
        </div>
      </div>
    </div>
  );
};

export default ConsoleDashboard;
