import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Lock, ToggleLeft, ToggleRight, Save, CheckCircle } from 'lucide-react';
import { razorpayApi } from '../services/api';
import { ErrorBanner, PageSkeleton } from '../components/UI/PageStates';
import './Guardrails.css';

const Guardrails = () => {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await razorpayApi.getMerchantSettings();
      setSettings(data);
      setError(null);
    } catch {
      setError('Could not connect to backend. Start the server and refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = key => setSettings(s => ({ ...s, [key]: !s[key] }));
  const setNum = (key, val) => setSettings(s => ({ ...s, [key]: Number(val) }));

  const retriesError = settings && (settings.maxRetries < 1 || settings.maxRetries > 10);
  const contactsError = settings && (settings.maxContacts < 1 || settings.maxContacts > 5);
  const invalid = Boolean(retriesError || contactsError);

  const save = async () => {
    if (!settings || invalid) return;
    setSaving(true);
    try {
      await razorpayApi.saveMerchantSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setError(null);
    } catch {
      setError('Could not connect to backend. Start the server and refresh.');
    }
    setSaving(false);
  };

  return (
    <div className="guardrails-page page-max">
      <div className="page-header">
        <span className="page-eyebrow">Guardrails</span>
        <h1 className="page-title">Guardrails</h1>
        <p className="page-subtitle">Recovery is only allowed when these merchant-defined rules allow it. Changes take effect immediately.</p>
      </div>

      {error && <ErrorBanner onRetry={load} />}

      {loading ? (
        <PageSkeleton rows={3} />
      ) : settings ? (
        <>
          <div className="policy-grid">
            <div className="policy-card glass-panel">
              <div className="card-header">
                <ShieldAlert size={18} className="text-warning" />
                <h3>Payment Protection</h3>
              </div>
              <div className="settings-list">
                <div className="policy-setting">
                  <div className="policy-info">
                    <h4>Maximum Retries</h4>
                    <p>Max automated retries before Stitch escalates to a human.</p>
                    {retriesError && <p className="field-error">Must be between 1 and 10.</p>}
                  </div>
                  <div className="policy-control">
                    <input
                      type="number" min={1} max={10}
                      className={`policy-number-input ${retriesError ? 'invalid' : ''}`}
                      value={settings.maxRetries}
                      onChange={e => setNum('maxRetries', e.target.value)}
                    />
                  </div>
                </div>
                <div className="policy-setting">
                  <div className="policy-info">
                    <h4>Consent Required</h4>
                    <p>Block automated recovery outreach when the customer has not given contact consent.</p>
                  </div>
                  <div className="policy-control"><button className="toggle-btn" type="button" onClick={() => toggle('requireConsentForOutreach')}>{settings.requireConsentForOutreach ? <ToggleRight size={34} className="text-success" /> : <ToggleLeft size={34} className="text-muted" />}</button></div>
                </div>
              </div>
            </div>

            <div className="policy-card glass-panel">
              <div className="card-header">
                <Shield size={18} className="text-blue" />
                <h3>Customer Communication</h3>
              </div>
              <div className="settings-list">
                <div className="policy-setting">
                  <div className="policy-info"><h4>Attribution Window</h4><p>Only settled results in this window are used for experiment lift.</p></div>
                  <div className="policy-control"><input type="number" min={1} max={60} className="policy-number-input" value={settings.attributionWindowDays} onChange={e => setNum('attributionWindowDays', e.target.value)} /></div>
                </div>
                <div className="policy-setting">
                  <div className="policy-info">
                    <h4>Max Outreach per Incident</h4>
                    <p>Hard cap on automated messages sent per recovery case.</p>
                    {contactsError && <p className="field-error">Must be between 1 and 5.</p>}
                  </div>
                  <div className="policy-control">
                    <input
                      type="number" min={1} max={5}
                      className={`policy-number-input ${contactsError ? 'invalid' : ''}`}
                      value={settings.maxContacts}
                      onChange={e => setNum('maxContacts', e.target.value)}
                    />
                  </div>
                </div>
                <div className="policy-setting">
                  <div className="policy-info">
                    <h4>Silent Hours (DND)</h4>
                    <p>Block all outreach between {settings.quietStartHour}:00 and {settings.quietEndHour}:00 local time.</p>
                  </div>
                  <div className="policy-control">
                    <button className="toggle-btn" type="button" onClick={() => toggle('quietHoursEnabled')}>
                      {settings.quietHoursEnabled
                        ? <ToggleRight size={34} className="text-success" />
                        : <ToggleLeft size={34} className="text-muted" />}
                    </button>
                  </div>
                </div>
                <div className="policy-setting">
                  <div className="policy-info">
                    <h4>Customer Opt-Out Handling</h4>
                    <p>Automatically stop all recovery actions if customer opts out.</p>
                  </div>
                  <div className="policy-control">
                    <div className="value-display text-success">Always On</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="policy-card glass-panel">
              <div className="card-header">
                <Lock size={18} className="text-danger" />
                <h3>Execution Boundaries</h3>
              </div>
              <div className="settings-list">
                <div className="policy-setting">
                  <div className="policy-info">
                    <h4>High-Value Approval</h4>
                    <p>Require explicit approval for incidents above ₹{(settings.highValueThresholdPaise / 100).toLocaleString('en-IN')}.</p>
                  </div>
                  <div className="policy-control">
                    <button className="toggle-btn" type="button" onClick={() => toggle('highValueRequiresApproval')}>
                      {settings.highValueRequiresApproval
                        ? <ToggleRight size={34} className="text-success" />
                        : <ToggleLeft size={34} className="text-muted" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="guardrails-actions">
            <button className={`btn btn-primary ${saved ? 'saved' : ''}`} onClick={save} disabled={saving || invalid}>
              {saved ? <><CheckCircle size={16} /> Saved to database</> : <><Save size={16} /> {saving ? 'Saving…' : 'Save Guardrails'}</>}
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default Guardrails;
