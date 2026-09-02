import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getIncidents, subscribe, INCIDENT_STATES } from '../services/engine';
import { razorpayApi } from '../services/api';
import { useMode } from '../context/ModeContext';
import './MissionControl.css';

const MetricCard = ({ title, value, subtext, highlight }) => (
  <div className="mc-metric-card glass-panel">
    <div className="mc-metric-header">
      <span className="mc-metric-title">{title}</span>
    </div>
    <div className={`mc-metric-value ${highlight ? 'text-accent-gradient' : ''}`}>{value}</div>
    {subtext && <div className="mc-metric-subtext">{subtext}</div>}
  </div>
);

const MissionControl = () => {
  const { mode } = useMode();
  const [events, setEvents] = useState([]);
  const [latestRecovered, setLatestRecovered] = useState(null);
  const [summary, setSummary] = useState(emptySummary);
  const [razorpayStatus, setRazorpayStatus] = useState(null);
  const [checkoutState, setCheckoutState] = useState('idle');
  const [latestIncident, setLatestIncident] = useState(null);
  const [batchState, setBatchState] = useState('idle');

  const updateSimulationView = (newIncidents, newEvents) => {
    const recentEvents = [...newEvents].reverse();
    const activeIncidentId = recentEvents[0]?.incidentId;
    setLatestIncident(newIncidents.find(incident => incident.id === activeIncidentId) || newIncidents[0] || null);
    setSummary(getSummary(newIncidents));
    setEvents(recentEvents.slice(0, 5));
  };

  const openTestCheckout = async () => {
    setCheckoutState('creating');
    try {
      const status = razorpayStatus || await razorpayApi.getStatus();
      if (!status.configured || !status.publicKeyId) throw new Error('Razorpay Test Mode credentials are not configured.');
      const { order, key_id: keyId } = await razorpayApi.createTestOrder(875000);
      if (!window.Razorpay) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.onload = resolve;
          script.onerror = () => reject(new Error('Razorpay Checkout could not load.'));
          document.body.appendChild(script);
        });
      }
      setCheckoutState('open');
      const checkout = new window.Razorpay({
        key: keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Stitch Test Workspace',
        description: 'Razorpay Test Mode recovery event',
        order_id: order.id,
        handler: () => setCheckoutState('Payment received by Razorpay; waiting for the signed webhook.'),
        modal: { ondismiss: () => setCheckoutState('idle') }
      });
      checkout.on('payment.failed', () => setCheckoutState('Payment failed in Razorpay; waiting for Stitch to receive the webhook.'));
      checkout.open();
    } catch (error) {
      setCheckoutState(error.message);
    }
  };

  const runBackendBatch = async () => {
    setBatchState('running');
    try {
      const result = await razorpayApi.runBatch();
      setBatchState(`Recovered ₹${(result.treatment.recovered_paise / 100).toLocaleString('en-IN')} in ${result.treatment.cases} treatment cases`);
    } catch (error) {
      setBatchState(error.message);
    }
  };

  useEffect(() => {
    if (mode !== 'razorpay') return undefined;
    let active = true;
    const load = async () => {
      try {
        const status = await razorpayApi.getStatus();
        if (active) setRazorpayStatus(status);
        const [remoteSummary, remoteIncidents, remoteEvents] = await Promise.all([
          razorpayApi.getSummary(),
          razorpayApi.getIncidents(),
          razorpayApi.getEvents()
        ]);
        if (!active) return;
        setSummary({
          atRisk: remoteSummary.total_at_risk_paise,
          recovered: remoteSummary.total_recovered_paise,
          cases: remoteIncidents.items.length,
          contacts: remoteSummary.customer_contacts || 0,
          rate: (remoteSummary.recovery_rate || 0) * 100
        });
        setLatestIncident(remoteIncidents.items[0] || null);
        setEvents(remoteEvents.slice(-5).reverse());
      } catch (error) {
        if (active) setEvents([{ id: 'api-error', event: 'RAZORPAY_API_UNAVAILABLE', actor: 'SYSTEM', result: error.message }]);
      }
    };
    load();
    const interval = setInterval(load, 5000);
    return () => { active = false; clearInterval(interval); };
  }, [mode]);

  useEffect(() => {
    if (mode === 'razorpay') return undefined;
    const unsubscribe = subscribe((newIncidents, newEvents) => {
      updateSimulationView(newIncidents, newEvents);
      const recentEvents = [...newEvents].reverse();
      
      const recoveredEvent = recentEvents.find(e => e.event === 'STATE_CHANGED' && e.newState === 'RECOVERED');
      if (recoveredEvent) {
        setLatestRecovered(recoveredEvent.incidentId);
        setTimeout(() => setLatestRecovered(null), 3000);
      }
    });
    return unsubscribe;
  }, [mode]);

  const workflowSteps = ['DETECTED', 'UNDERSTANDING', 'DECIDING', 'POLICY_CHECK', 'VERIFYING', 'EXECUTING', 'RECOVERED'];
  const currentStepIndex = latestIncident ? workflowSteps.indexOf(latestIncident.state) : -1;

  return (
    <div className="mission-control-page">
      {/* Cinematic Background Glows */}
      <div className="glow-container absolute-bg">
        <div className="glow-magenta mc-glow-left"></div>
        <div className="glow-blue mc-glow-right"></div>
        <div className={`glow-success mc-glow-center ${latestRecovered ? 'active' : ''}`}></div>
      </div>

      <header className="mc-hero text-center">
        <h1 className="mc-hero-title">
          Recover Revenue <br />
          <span className="text-accent-gradient">without the friction.</span>
        </h1>
        <p className="mc-hero-subtitle">
          Recovery engine resolving payment failures in real time.
        </p>
        
        <div className="mc-ai-entity">
          <div className="mc-ai-orb animate-pulse-soft"></div>
          <span>Recovery workflow active</span>
        </div>
        {mode === 'razorpay' && (
          <div className="mc-razorpay-control glass-panel">
            <div>
              <strong>Razorpay Test Mode</strong>
              <span className={`mc-connection-state ${razorpayStatus?.configured ? 'connected' : ''}`}>
                {razorpayStatus?.configured ? 'Backend configured' : 'Backend not configured'}
              </span>
            </div>
            <button className="btn btn-primary" type="button" onClick={openTestCheckout} disabled={checkoutState === 'creating'}>
              {checkoutState === 'creating' ? 'Creating order…' : 'Create ₹8,750 test payment'}
            </button>
            {checkoutState !== 'idle' && checkoutState !== 'creating' && <small>{checkoutState}</small>}
            <button className="btn btn-secondary" type="button" onClick={runBackendBatch} disabled={batchState === 'running'}>
              {batchState === 'running' ? 'Running batch…' : 'Run 10-case recovery batch'}
            </button>
            {batchState !== 'idle' && batchState !== 'running' && <small>{batchState}</small>}
          </div>
        )}
        {mode === 'razorpay' && (
          <div className="mc-stitch-trace glass-panel">
            <div className="mc-trace-heading">
              <span>Stitch workflow</span>
              <strong>{latestIncident ? latestIncident.state : 'WAITING FOR WEBHOOK'}</strong>
            </div>
            <div className="mc-trace-steps">
              {['DETECTED', 'UNDERSTANDING', 'DECIDING', 'POLICY_CHECK', 'VERIFYING', 'EXECUTING', 'RECOVERED'].map((step, index) => {
                const currentIndex = latestIncident ? ['DETECTED', 'UNDERSTANDING', 'DECIDING', 'POLICY_CHECK', 'VERIFYING', 'EXECUTING', 'RECOVERED'].indexOf(latestIncident.state) : -1;
                const completed = currentIndex >= index;
                return <span key={step} className={completed ? 'complete' : ''}>{step}</span>;
              })}
            </div>
            <p>
              The mock bank only returns the payment result. Stitch begins when the signed Razorpay webhook arrives,
              then this trace updates every five seconds.
            </p>
          </div>
        )}
      </header>

      <div className="mc-dashboard-grid">
        <div className="mc-main-panel glass-panel">
          <div className="mc-balance-header">
            <span className="text-secondary">Revenue at Risk</span>
          </div>
          <div className="mc-balance-amount">
            {summary.cases === 0 ? 'Waiting for a live incident' : `₹${(summary.atRisk / 100).toLocaleString('en-IN')}`} <span className="mc-currency-indicator">{summary.cases === 0 ? '' : 'INR'}</span>
          </div>
          <div className="mc-balance-footer">
            <div className="mc-footer-stat">
              <span className="text-secondary">Recovered</span>
              <span className={`font-semibold ${latestRecovered ? 'text-success animate-pulse-soft' : 'text-primary'}`}>{summary.cases === 0 ? '—' : `₹${(summary.recovered / 100).toLocaleString('en-IN')}`}</span>
            </div>
            <div className="mc-footer-stat">
              <span className="text-secondary">Cases</span>
              <span className="font-semibold text-primary">{summary.cases.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
        
        <div className="mc-side-metrics">
          <MetricCard title="Recovery Rate" value={`${summary.rate.toFixed(1)}%`} subtext="Calculated from current incidents" highlight={true} />
          <MetricCard title="Customer Contacts" value={summary.contacts.toLocaleString('en-IN')} subtext="Recorded engine actions" />
        </div>
      </div>

      <div className="mc-live-feed">
        <h3 className="mc-feed-title">Live Recovery Activity</h3>
        <div className="mc-feed-list glass-panel">
          {events.length === 0 ? (
            <div className="empty-feed text-muted">Awaiting system events...</div>
          ) : (
            events.map(event => {
              const isRecovered = event.newState === 'RECOVERED' || event.event === 'PAYMENT_RECEIVED';
              return (
                <Link to={event.incidentId ? `/incidents/${event.incidentId}` : '#'} key={event.id} className={`mc-feed-item animate-slide-up ${isRecovered ? 'is-recovered' : ''}`}>
                  <div className="mc-feed-time">{new Date(event.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</div>
                  <div className="mc-feed-content">
                    <span className={`mc-feed-actor actor-${event.actor?.toLowerCase() || 'system'}`}>{event.actor}</span>
                    <span className="mc-feed-text">
                      <strong>{event.event}</strong> 
                      <span className="text-secondary"> {event.result ? `— ${event.result}` : ''}</span>
                    </span>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </div>

      <div className="mc-operation-panel glass-panel">
        <div className="mc-operation-header">
          <div>
            <span className="mc-operation-kicker">Current recovery operation</span>
            <h3>{latestIncident ? `Case ${latestIncident.id.toUpperCase()}` : 'Waiting for a recovery event'}</h3>
          </div>
          <span className="mc-operation-state">{latestIncident?.state || 'IDLE'}</span>
        </div>
        <div className="mc-operation-steps">
          {workflowSteps.map((step, index) => (
            <div key={step} className={`mc-operation-step ${index <= currentStepIndex ? 'complete' : ''} ${index === currentStepIndex ? 'current' : ''}`}>
              <span>{index + 1}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
        <div className="mc-decision-summary">
          <div>
            <span className="mc-operation-kicker">Decision</span>
            <strong>{latestIncident?.aiDecision?.action || 'Not generated yet'}</strong>
          </div>
          <div>
            <span className="mc-operation-kicker">Why</span>
            <p>{latestIncident?.aiDecision?.basis || 'The engine will explain the recommendation once customer context has been reviewed.'}</p>
          </div>
          {latestIncident && <Link to={`/incidents/${latestIncident.id}`} className="btn btn-secondary">Open case details</Link>}
        </div>
      </div>
    </div>
  );
};

const getSummary = incidents => {
  const recovered = incidents
    .filter(incident => String(incident.state || incident.status || '').toUpperCase() === INCIDENT_STATES.RECOVERED)
    .reduce((total, incident) => total + Number(incident.amount_paise || 0), 0);
  const totalAtRisk = incidents.reduce((total, incident) => total + Number(incident.amount_paise || 0), 0);
  const contacts = incidents.reduce((total, incident) => total + Number(incident.contact_count || 0), 0);
  const rate = totalAtRisk > 0 ? (recovered / totalAtRisk) * 100 : 0;

  return {
    atRisk: totalAtRisk,
    recovered,
    cases: incidents.length,
    contacts,
    rate
  };
};

const emptySummary = { atRisk: 0, recovered: 0, cases: 0, contacts: 0, rate: 0 };

export default MissionControl;
