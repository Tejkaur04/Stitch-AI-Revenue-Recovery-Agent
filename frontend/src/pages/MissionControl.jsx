import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { getIncidents, subscribe, INCIDENT_STATES } from '../services/engine';
import { razorpayApi } from '../services/api';
import { useMode } from '../context/ModeContext';
import { ErrorBanner, PageSkeleton, Sparkline } from '../components/UI/PageStates';
import './MissionControl.css';
import PipelineSignature from '../components/UI/PipelineSignature';

const pad7 = values => {
  if (!values.length) return [0, 0, 0, 0, 0, 0, 0];
  if (values.length >= 7) return values.slice(-7);
  const last = values[values.length - 1];
  return [...Array(7 - values.length).fill(last), ...values];
};

const trendFrom = series => {
  if (!series || series.every(v => v === 0)) return 0;
  const first = series.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  const last = series.slice(-3).reduce((a, b) => a + b, 0) / 3;
  return last - first;
};

const MetricCard = ({ title, value, spark, color, trend, invertTrend }) => {
  const delta = invertTrend ? -trend : trend;
  const up = delta > 0;
  const down = delta < 0;
  return (
    <div className="mc-metric-card glass-panel">
      <div className="mc-metric-header">
        <span className="mc-metric-title">{title}</span>
        {up && <span className="mc-trend up"><TrendingUp size={13} /> ↑</span>}
        {down && <span className="mc-trend down"><TrendingDown size={13} /> ↓</span>}
      </div>
      <div className="mc-metric-value">{value}</div>
      <Sparkline data={spark} color={color} />
    </div>
  );
};

const MissionControl = () => {
  const { mode } = useMode();
  const [events, setEvents] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [razorpayStatus, setRazorpayStatus] = useState(null);
  const [checkoutState, setCheckoutState] = useState('idle');
  const [batchState, setBatchState] = useState('idle');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRemote = async () => {
    try {
      const status = await razorpayApi.getStatus();
      setRazorpayStatus(status);
      const [remoteSummary, remoteIncidents, remoteEvents] = await Promise.all([
        razorpayApi.getSummary(),
        razorpayApi.getIncidents(),
        razorpayApi.getEvents()
      ]);
      const items = remoteIncidents.items || [];
      setIncidents(items);
      setSummary({
        atRisk: remoteSummary.total_at_risk_paise,
        recovered: remoteSummary.total_recovered_paise,
        cases: items.length,
        contacts: remoteSummary.customer_contacts || 0,
        rate: (remoteSummary.recovery_rate || 0) * 100
      });
      const list = Array.isArray(remoteEvents) ? remoteEvents : [];
      setEvents(list.slice(0, 8));
      setError(null);
    } catch (err) {
      setError(err.message || 'Could not connect to backend. Start the server and refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode !== 'razorpay') return undefined;
    setLoading(true);
    loadRemote();
    const interval = setInterval(loadRemote, 5000);
    return () => clearInterval(interval);
  }, [mode]);

  useEffect(() => {
    if (mode === 'razorpay') return undefined;
    setLoading(false);
    const unsubscribe = subscribe((newIncidents, newEvents) => {
      setIncidents([...newIncidents]);
      setSummary(getSummary(newIncidents));
      setEvents([...newEvents].reverse().slice(0, 8));
    });
    const seed = getIncidents();
    setIncidents(seed);
    setSummary(getSummary(seed));
    return unsubscribe;
  }, [mode]);

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
    } catch (err) {
      setCheckoutState(err.message);
    }
  };

  const runBackendBatch = async () => {
    setBatchState('running');
    try {
      const result = await razorpayApi.runBatch();
      setBatchState(`Recovered ₹${(result.treatment.recovered_paise / 100).toLocaleString('en-IN')} in ${result.treatment.cases} treatment cases`);
    } catch (err) {
      setBatchState(err.message);
    }
  };

  const chronological = useMemo(() => [...incidents].reverse(), [incidents]);
  const sparkAtRisk = pad7(chronological.map(i => Number(i.amount_paise || 0) / 100));
  const sparkRecovered = pad7(chronological.map(i =>
    String(i.state || '').toUpperCase() === INCIDENT_STATES.RECOVERED ? Number(i.amount_paise || 0) / 100 : 0
  ));
  const sparkRate = pad7(chronological.map((_, idx) => {
    const slice = chronological.slice(0, idx + 1);
    const tot = slice.reduce((s, i) => s + Number(i.amount_paise || 0), 0);
    const rec = slice
      .filter(i => String(i.state || '').toUpperCase() === INCIDENT_STATES.RECOVERED)
      .reduce((s, i) => s + Number(i.amount_paise || 0), 0);
    return tot ? (rec / tot) * 100 : 0;
  }));
  const sparkContacts = pad7(chronological.map(i => Number(i.contact_count || 0)));

  const chartData = chronological.slice(-10).map((inc, index) => {
    const recovered = String(inc.state || '').toUpperCase() === INCIDENT_STATES.RECOVERED;
    return {
      index: index + 1,
      atRisk: Number(inc.amount_paise || 0) / 100,
      recovered: recovered ? Number(inc.amount_paise || 0) / 100 : 0
    };
  });

  if (loading) {
    return (
      <div className="mission-control-page page-max">
        <PageSkeleton rows={4} />
      </div>
    );
  }

  return (
    <div className="mission-control-page page-max">
      <div className="page-header">
        <span className="page-eyebrow">Dashboard</span>
        <h1 className="page-title">Mission Control</h1>
        <p className="page-subtitle">Live recovery metrics, revenue at risk, and recent engine activity.</p>
        <div className="mc-pipeline-wrap"><PipelineSignature activeStage={incidents.length ? 5 : 0} /></div>
      </div>

      {error && <ErrorBanner onRetry={() => { setLoading(true); loadRemote(); }} />}

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

      <div className="mc-metrics-row">
        <MetricCard
          title="Revenue at Risk"
          value={summary.cases === 0 ? '—' : `₹${(summary.atRisk / 100).toLocaleString('en-IN')}`}
          spark={sparkAtRisk}
          color="#EF4444"
          trend={trendFrom(sparkAtRisk)}
          invertTrend
        />
        <MetricCard
          title="Recovered"
          value={summary.cases === 0 ? '—' : `₹${(summary.recovered / 100).toLocaleString('en-IN')}`}
          spark={sparkRecovered}
          color="#10B981"
          trend={trendFrom(sparkRecovered)}
        />
        <MetricCard
          title="Recovery Rate"
          value={`${summary.rate.toFixed(1)}%`}
          spark={sparkRate}
          color="#A855F7"
          trend={trendFrom(sparkRate)}
        />
        <MetricCard
          title="Customer Contacts"
          value={summary.contacts.toLocaleString('en-IN')}
          spark={sparkContacts}
          color="#3B82F6"
          trend={trendFrom(sparkContacts)}
          invertTrend
        />
      </div>

      <div className="mc-chart-panel glass-panel">
        <div className="mc-chart-header">
          <h3>Recovery Timeline</h3>
          <span className="text-secondary">Last {Math.max(chartData.length, 1)} incidents · INR</span>
        </div>
        <div className="mc-chart-body">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData.length ? chartData : [{ index: 1, atRisk: 0, recovered: 0 }]} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="atRiskFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="recoveredFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="index" tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} label={{ value: 'Incident', position: 'insideBottom', offset: -2, fill: '#64748B', fontSize: 11 }} />
              <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
              <Tooltip
                contentStyle={{ background: '#0b0b14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                formatter={(value, name) => [`₹${Number(value).toLocaleString('en-IN')}`, name === 'atRisk' ? 'At risk' : 'Recovered']}
                labelFormatter={i => `Incident ${i}`}
              />
              <Area type="monotone" dataKey="atRisk" stroke="#EF4444" fill="url(#atRiskFill)" strokeWidth={2} />
              <Area type="monotone" dataKey="recovered" stroke="#10B981" fill="url(#recoveredFill)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="mc-live-feed">
        <h3 className="mc-feed-title">Live Activity Feed</h3>
        <div className="mc-feed-list glass-panel">
          {events.length === 0 ? (
            <div className="empty-state" style={{ padding: '2.5rem 1rem' }}>
              <div className="empty-state-title">No activity yet</div>
              <div className="empty-state-sub">Run a demo scenario to see the engine in motion.</div>
              <Link to="/demo" className="btn btn-primary" style={{ marginTop: '0.5rem' }}>Run a Demo Scenario →</Link>
            </div>
          ) : (
            events.map(event => (
              <Link
                to={event.incidentId ? `/incidents/${event.incidentId}` : '#'}
                key={event.id}
                className="mc-feed-item"
              >
                <div className="mc-feed-time">
                  {event.timestamp ? new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
                </div>
                <span className={`actor-badge actor-${(event.actor || 'SYSTEM').toLowerCase()}`}>{event.actor || 'SYSTEM'}</span>
                <span className="mc-feed-event">{event.event}</span>
                {event.incidentId && (
                  <span className="mc-feed-id">{String(event.incidentId).toUpperCase()}</span>
                )}
              </Link>
            ))
          )}
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
  return { atRisk: totalAtRisk, recovered, cases: incidents.length, contacts, rate };
};

const emptySummary = { atRisk: 0, recovered: 0, cases: 0, contacts: 0, rate: 0 };

export default MissionControl;
