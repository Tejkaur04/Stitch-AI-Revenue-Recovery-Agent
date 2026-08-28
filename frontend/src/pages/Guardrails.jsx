import React, { useState } from 'react';
import { Shield, ShieldAlert, Lock, ToggleLeft, ToggleRight } from 'lucide-react';
import './Guardrails.css';

const PolicySetting = ({ title, description, value, type = 'toggle' }) => {
  const [enabled, setEnabled] = useState(value);

  return (
    <div className="policy-setting">
      <div className="policy-info">
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
      <div className="policy-control">
        {type === 'toggle' ? (
          <button className="toggle-btn" onClick={() => setEnabled(v => !v)}>
            {enabled
              ? <ToggleRight size={34} className="text-success" />
              : <ToggleLeft  size={34} className="text-muted"   />}
          </button>
        ) : (
          <div className="value-display">{value}</div>
        )}
      </div>
    </div>
  );
};

const Guardrails = () => (
  <div className="guardrails-page">
    <header>
      <h1>Guardrails</h1>
      <p className="text-secondary" style={{ marginTop: '0.5rem' }}>
        AI has power. You control the rules.
      </p>
    </header>

    <div className="policy-grid">
      <div className="policy-card glass-panel">
        <div className="card-header">
          <ShieldAlert size={18} className="text-warning" />
          <h3>Payment Protection</h3>
        </div>
        <div className="settings-list">
          <PolicySetting
            title="Maximum Retries"
            description="Maximum automated retries before Stitch escalates to a human."
            value="3"
            type="value"
          />
          <PolicySetting
            title="Minimum Delay Between Retries"
            description="Prevents rapid-fire retries that could further frustrate the customer."
            value="12 Hours"
            type="value"
          />
        </div>
      </div>

      <div className="policy-card glass-panel">
        <div className="card-header">
          <Shield size={18} className="text-blue" />
          <h3>Customer Communication</h3>
        </div>
        <div className="settings-list">
          <PolicySetting
            title="Maximum Outreach per Incident"
            description="Hard cap on automated messages sent per recovery case."
            value="2"
            type="value"
          />
          <PolicySetting
            title="Silent Hours (DND)"
            description="Block outreach between 10 PM and 8 AM local time."
            value={true}
          />
          <PolicySetting
            title="Deduplicate Existing CRM Contacts"
            description="If CRM has already contacted the customer, Stitch stays silent."
            value={true}
          />
          <PolicySetting
            title="Customer Opt-Out Handling"
            description="Automatically stop all recovery actions if customer sends STOP."
            value={true}
          />
        </div>
      </div>

      <div className="policy-card glass-panel">
        <div className="card-header">
          <Lock size={18} className="text-danger" />
          <h3>AI Boundaries</h3>
        </div>
        <div className="settings-list">
          <PolicySetting
            title="High-Value Approval Threshold"
            description="Require explicit merchant approval for actions on incidents above ₹50,000."
            value={true}
          />
          <PolicySetting
            title="AI Override"
            description="Allow Stitch to override policy guardrails in extreme edge cases."
            value={false}
          />
        </div>
      </div>
    </div>
  </div>
);

export default Guardrails;
