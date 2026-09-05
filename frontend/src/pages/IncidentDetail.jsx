import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { subscribe, getIncident, getEvents, INCIDENT_STATES } from '../services/engine';
import { razorpayApi } from '../services/api';
import { useMode } from '../context/ModeContext';
import { ArrowLeft, User, AlertCircle, Check, ShieldX, BrainCircuit } from 'lucide-react';
import { ErrorBanner, PageSkeleton } from '../components/UI/PageStates';
import './IncidentDetail.css';

const STATE_ORDER = [
  INCIDENT_STATES.DETECTED,
  INCIDENT_STATES.UNDERSTANDING,
  INCIDENT_STATES.DECIDING,
  INCIDENT_STATES.POLICY_CHECK,
  INCIDENT_STATES.VERIFYING,
  INCIDENT_STATES.EXECUTING,
  INCIDENT_STATES.RECOVERED,
  INCIDENT_STATES.STOPPED,
  INCIDENT_STATES.ESCALATED
];

const stageTimestamp = (events, state) => {
  const match = [...events].reverse().find(e => {
    const ns = e.metadata?.newState || e.newState;
    return e.event === 'STATE_CHANGED' && String(ns || '').toUpperCase() === state;
  });
  return match?.timestamp;
};

const IncidentDetail = () => {
  const { id } = useParams();
  const { mode } = useMode();
  const [incident, setIncident] = useState(() => getIncident(id));
  const [events, setEvents] = useState(() => getEvents(id));
  const [loading, setLoading] = useState(mode === 'razorpay');
  const [error, setError] = useState(null);
  const [promiseState, setPromiseState] = useState('');
  const [promiseDue, setPromiseDue] = useState('');
  const [promiseSaving, setPromiseSaving] = useState(false);

  const load = async () => {
    try {
      const result = await razorpayApi.getIncident(id);
      setIncident(result.incident);
      setEvents(result.events || []);
      setError(null);
    } catch {
      setIncident(undefined);
      setError('Could not connect to backend. Start the server and refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'razorpay') {
      let active = true;
      setLoading(true);
      const tick = async () => {
        try {
          const result = await razorpayApi.getIncident(id);
          if (!active) return;
          setIncident(result.incident);
          setEvents(result.events || []);
          setError(null);
        } catch {
          if (active) {
            setIncident(undefined);
            setError('Could not connect to backend. Start the server and refresh.');
          }
        } finally {
          if (active) setLoading(false);
        }
      };
      tick();
      const interval = setInterval(tick, 2000);
      return () => { active = false; clearInterval(interval); };
    }
    const unsubscribe = subscribe((incidents, allEvents) => {
      setIncident(incidents.find(i => i.id === id));
      setEvents(allEvents.filter(e => e.incidentId === id).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
    });
    return unsubscribe;
  }, [id, mode]);

  const recommended = incident?.action?.type || incident?.aiDecision?.action;
  const reasoning = incident?.action?.reasoning || incident?.aiDecision?.basis;
  const decidedBy = incident?.action?.decided_by;
  const gemini = decidedBy === 'gemini_flash';
  const ruleEngine = decidedBy === 'ai_engine' || decidedBy === 'fallback_due_to_error';

  const pipelineStates = useMemo(() => {
    if (!incident) return [];
    const isStopped = incident.state === INCIDENT_STATES.STOPPED;
    const isEscalated = incident.state === INCIDENT_STATES.ESCALATED;
    if (isStopped) {
      return [
        INCIDENT_STATES.DETECTED,
        INCIDENT_STATES.UNDERSTANDING,
        INCIDENT_STATES.DECIDING,
        INCIDENT_STATES.POLICY_CHECK,
        INCIDENT_STATES.VERIFYING,
        INCIDENT_STATES.EXECUTING,
        INCIDENT_STATES.STOPPED
      ];
    }
    if (isEscalated) {
      return [
        INCIDENT_STATES.DETECTED,
        INCIDENT_STATES.UNDERSTANDING,
        INCIDENT_STATES.DECIDING,
        INCIDENT_STATES.POLICY_CHECK,
        INCIDENT_STATES.ESCALATED
      ];
    }
    return STATE_ORDER.filter(s => s !== INCIDENT_STATES.STOPPED && s !== INCIDENT_STATES.ESCALATED);
  }, [incident]);

  if (loading) {
    return (
      <div className="incident-detail page-max">
        <PageSkeleton rows={4} />
      </div>
    );
  }

  if (error && !incident) {
    return (
      <div className="incident-detail page-max">
        <ErrorBanner onRetry={() => { setLoading(true); load(); }} />
      </div>
    );
  }

  if (!incident) return <div className="loading-state">Locating Case File...</div>;

  const currentIdx = pipelineStates.indexOf(incident.state);
  const isStopped = incident.state === INCIDENT_STATES.STOPPED;
  const isEscalated = incident.state === INCIDENT_STATES.ESCALATED;
  const isRecovered = incident.state === INCIDENT_STATES.RECOVERED;
  const savePromise = async status => {
    setPromiseSaving(true);
    try {
      const result = await razorpayApi.recordPromiseToPay(incident.id, { status, ...(status === 'promised' ? { promise_due_at: new Date(promiseDue).toISOString() } : {}) });
      setIncident(result.incident); setPromiseState(status);
    } catch (e) { setError(e.message || 'Could not record promise status.'); }
    setPromiseSaving(false);
  };

  return (
    <div className="incident-detail page-max">
      <div className="incident-layout">
        <aside className="pipeline-rail">
          <div className="page-eyebrow" style={{ marginBottom: '1rem' }}>Pipeline</div>
          {pipelineStates.map((state, idx) => {
            const isCurrent = incident.state === state;
            const isCompleted = isCurrent
              ? false
              : isRecovered
                ? idx < pipelineStates.indexOf(INCIDENT_STATES.RECOVERED)
                : currentIdx > idx;
            const isFailedEnd = (isStopped || isEscalated) && state === incident.state;
            const ts = stageTimestamp(events, state);
            return (
              <div
                key={state}
                className={`tl-node ${isCompleted || isFailedEnd ? 'done' : ''} ${isCurrent ? 'current' : ''} ${isFailedEnd ? 'failed' : ''}`}
              >
                <div className="tl-marker">
                  {isCompleted || (isFailedEnd && isStopped) ? <Check size={12} /> : null}
                </div>
                <div className="tl-copy">
                  <strong>{state.replaceAll('_', ' ')}</strong>
                  <span>{ts ? new Date(ts).toLocaleTimeString() : isCurrent ? 'In progress' : isCompleted ? '' : 'Pending'}</span>
                </div>
              </div>
            );
          })}
        </aside>

        <div className="incident-main">
          <header className="incident-header">
            <div className="header-left">
              <Link to="/incidents" className="back-link"><ArrowLeft size={16} /> Back to Incidents</Link>
              <div className="page-header" style={{ marginBottom: 0 }}>
                <span className="page-eyebrow">Incident</span>
                <h1 className="page-title">Case {String(incident.id).toUpperCase()}</h1>
              </div>
            </div>
            <div className={`status-badge status-${String(incident.state).toLowerCase()}`}>
              {incident.state}
            </div>
          </header>

          <div className="risk-banner glass-panel">
            <div className="risk-amount">
              <span className="label">Revenue at Risk</span>
              <span className={`value ${isRecovered ? 'text-success' : 'text-danger'}`}>
                ₹{(Number(incident.amount_paise || 0) / 100).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="customer-info">
              <User size={18} className="text-secondary" />
              <span className="cust-name">{incident.customer?.name || 'Unknown customer'}</span>
              <span className="cust-ltv">LTV: ₹{(Number(incident.customer?.ltv || 0) / 100).toLocaleString('en-IN')}</span>
            </div>
            <div className="problem-info">
              <AlertCircle size={18} className="text-warning" />
              <span>{incident.reason}</span>
            </div>
          </div>

          <div className="investigation-grid">
            <div className="grid-col glass-panel">
              <h3 className="panel-title"><BrainCircuit size={18} className="text-magenta" /> AI Decision</h3>
              {recommended ? (
                <div className="decision-content animate-slide-up">
                  <div className="decision-action">Recommended: <strong>{recommended}</strong></div>
                  {gemini && <span className="decided-badge gemini">Gemini AI</span>}
                  {ruleEngine && <span className="decided-badge rule">Rule Engine</span>}
                  <div className="decision-basis">
                    <span className="label">Decision Basis:</span>
                    <p>{reasoning || 'No reasoning recorded.'}</p>
                  </div>
                </div>
              ) : (
                <div className="waiting-state text-muted">Awaiting analysis...</div>
              )}
            </div>

            <div className="grid-col glass-panel">
              <h3 className="panel-title"><ShieldX size={18} className="text-warning" /> Policy Guardrail</h3>
              {incident.policyResult ? (
                <div className={`policy-result animate-slide-up ${incident.policyResult.status === 'blocked' ? 'text-danger' : 'text-success'}`}>
                  <strong>{String(incident.policyResult.status || '').toUpperCase()}</strong>
                  {incident.policyResult.reason && <p>{incident.policyResult.reason}</p>}
                </div>
              ) : (
                <div className="waiting-state text-muted">Awaiting policy check...</div>
              )}
            </div>
          </div>

          {incident.payment_link?.short_url && (
            <div className="recovery-link glass-panel">
              <div><span className="page-eyebrow">Live recovery action</span><strong>Provider-hosted payment link created</strong></div>
              <a href={incident.payment_link.short_url} target="_blank" rel="noreferrer" className="btn btn-secondary">Open payment link</a>
            </div>
          )}

          {recommended === 'promise_to_pay' && (
            <div className="promise-panel glass-panel">
              <div><span className="page-eyebrow">Receivables workflow</span><h3>Promise to pay</h3><p>{incident.action?.promise_status === 'promised' ? `Customer committed to pay by ${new Date(incident.action.promise_due_at).toLocaleDateString()}.` : 'Record the customer response; Stitch keeps the commitment and due-date trail.'}</p></div>
              {!incident.action?.promise_status && <div className="promise-controls"><input type="datetime-local" value={promiseDue} onChange={e => setPromiseDue(e.target.value)} /><button className="btn btn-primary" disabled={!promiseDue || promiseSaving} onClick={() => savePromise('promised')}>Record promise</button><button className="btn btn-secondary" disabled={promiseSaving} onClick={() => savePromise('declined')}>Declined</button></div>}
            </div>
          )}

          {isStopped && (
            <div className="risk-banner glass-panel incident-outcome outcome-stopped">
              <strong>Payment already received.</strong>
              <span>Unnecessary retry prevented.</span>
            </div>
          )}
          {isEscalated && (
            <div className="risk-banner glass-panel incident-outcome outcome-escalated">
              <strong>BLOCKED BY POLICY</strong>
              <span>Recovery was escalated to a human.</span>
            </div>
          )}

          <div className="audit-log glass-panel">
            <h3 className="panel-title">Audit Trail</h3>
            <div className="log-entries">
              {events.length === 0 && (
                <div className="empty-state" style={{ padding: '2rem' }}>
                  <div className="empty-state-title">No audit events yet</div>
                </div>
              )}
              {events.map(event => (
                <div key={event.id} className="log-entry">
                  <div className="log-time">{event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : '—'}</div>
                  <div className={`actor-badge actor-${String(event.actor || 'SYSTEM').toLowerCase()}`}>{event.actor}</div>
                  <div className="log-event">{event.event}</div>
                  <div className="log-result">{event.result}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IncidentDetail;
