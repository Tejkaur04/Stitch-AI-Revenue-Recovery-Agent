import React, { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { TrendingUp, TrendingDown, Database, FlaskConical } from 'lucide-react';
import { razorpayApi } from '../services/api';
import { EmptyState, ErrorBanner } from '../components/UI/PageStates';
import './RecoveryLab.css';

const RecoveryLab = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const runExperiment = async () => {
    setIsRunning(true);
    setError(null);
    try {
      const apiResults = await razorpayApi.getLabResults();
      setResults({
        cases: apiResults.control.cases + apiResults.treatment.cases,
        revenueAtRisk: apiResults.control.at_risk_paise + apiResults.treatment.at_risk_paise,
        incrementalLift: apiResults.incremental_recovery_paise,
        policyViolations: apiResults.policy_violations,
        unsettledCases: apiResults.unsettled_cases || 0,
        baseline: {
          recovered: apiResults.control.recovered_paise,
          rate: apiResults.control.recovery_rate,
          contacts: apiResults.control.customer_contacts,
        },
        stitch: {
          recovered: apiResults.treatment.recovered_paise,
          rate: apiResults.treatment.recovery_rate,
          contacts: apiResults.treatment.customer_contacts,
        }
      });
    } catch (e) {
      setError('Could not connect to backend. Start the server and refresh.');
      setResults(null);
    }
    setIsRunning(false);
  };

  const incremental = results ? results.incrementalLift / 100 : 0;
  const winner = results
    ? results.stitch.rate > results.baseline.rate
      ? 'stitch'
      : results.baseline.rate > results.stitch.rate
        ? 'baseline'
        : 'tie'
    : null;

  const chartData = results ? [
    {
      name: 'Recovery Rate (%)',
      Baseline: Number((results.baseline.rate * 100).toFixed(1)),
      Stitch: Number((results.stitch.rate * 100).toFixed(1))
    },
    {
      name: 'Customer Contacts',
      Baseline: results.baseline.contacts,
      Stitch: results.stitch.contacts
    },
    {
      name: 'Recovered (₹k)',
      Baseline: Number((results.baseline.recovered / 100000).toFixed(2)),
      Stitch: Number((results.stitch.recovered / 100000).toFixed(2))
    }
  ] : [];

  return (
    <div className="recovery-lab page-max">
      <div className="page-header">
        <span className="page-eyebrow">Recovery Lab</span>
        <h1 className="page-title">Recovery Lab</h1>
        <p className="page-subtitle">Compare the existing retry strategy against Stitch using incidents already in the database.</p>
      </div>

      {error && <ErrorBanner onRetry={runExperiment} />}

      <div className="experiment-controls glass-panel">
        <div className="batch-info">
          <div className="batch-stat">
            <span className="label">Test Batch</span>
            <span className="value">{results ? `${results.cases} cases` : '—'}</span>
          </div>
          <div className="batch-stat">
            <span className="label">Revenue at Risk</span>
            <span className="value">{results ? `₹${(results.revenueAtRisk / 100).toLocaleString('en-IN')}` : '—'}</span>
          </div>
        </div>
        <button
          className="btn btn-primary run-btn"
          onClick={runExperiment}
          disabled={isRunning}
        >
          {isRunning ? 'Analyzing...' : <><Database size={16} /> Analyze Historical Data</>}
        </button>
      </div>

      {isRunning && (
        <div className="skeleton-stack">
          <div className="skeleton-card tall" />
          <div className="skeleton-card" />
        </div>
      )}

      {!isRunning && results && results.cases === 0 && (
        <div className="glass-panel">
          <EmptyState
            icon={FlaskConical}
            title="No historical incidents to analyze yet."
            sub="Run a few demo scenarios first, then come back to measure lift."
            ctaTo="/demo"
            ctaLabel="Run a Demo Scenario →"
          />
        </div>
      )}

      {!isRunning && results && results.cases > 0 && (
        <>
          <div className="experiment-explanation glass-panel animate-slide-up">
            <strong>Why this measures Stitch impact</strong>
            <p>
              Both strategies receive the same revenue-at-risk batch. Cohorts are assigned once per customer and only terminal outcomes within the attribution window are included. The control group follows the existing strategy;
              the treatment group follows Stitch. A higher treatment recovery rate is the measurable lift attributable
              to the different recovery strategy, while contacts and policy violations show the cost of that lift.
            </p>
            <code>
              Incremental lift = Treatment at-risk revenue × (Treatment recovery rate − Control recovery rate)
            </code>
          </div>
          <div className="results-container animate-slide-up">
            <div className="strategy-card glass-panel">
              {winner === 'baseline' && <div className="winner-badge baseline">BASELINE LEADS</div>}
              {winner === 'tie' && <div className="winner-badge tie">TIE</div>}
              <h3>Baseline Strategy</h3>
              <p className="strategy-desc">Retry → Reminder → Retry → Stop</p>
              <div className="result-metric">
                <span className="label">Recovered Revenue</span>
                <span className="value">₹{(results.baseline.recovered / 100).toLocaleString('en-IN')}</span>
              </div>
              <div className="result-metric">
                <span className="label">Recovery Rate</span>
                <span className="value">{(results.baseline.rate * 100).toFixed(1)}%</span>
              </div>
              <div className="result-metric">
                <span className="label">Customer Messages</span>
                <span className="value">
                  {results.baseline.contacts.toLocaleString()} <TrendingUp size={14} />
                </span>
              </div>
            </div>

            <div className="strategy-card stitch-card glass-panel">
              {winner === 'stitch' && <div className="winner-badge">STITCH WINS</div>}
              {winner === 'tie' && <div className="winner-badge tie">TIE</div>}
              <h3>Stitch Strategy</h3>
              <p className="strategy-desc">Context → Next-Best Action → Verify → Execute</p>
              <div className="result-metric">
                <span className="label">Recovered Revenue</span>
                <span className="value text-success">₹{(results.stitch.recovered / 100).toLocaleString('en-IN')}</span>
              </div>
              <div className="result-metric">
                <span className="label">Recovery Rate</span>
                <span className="value text-success">{(results.stitch.rate * 100).toFixed(1)}%</span>
              </div>
              <div className="result-metric">
                <span className="label">Customer Messages</span>
                <span className="value text-success">
                  {results.stitch.contacts.toLocaleString()} <TrendingDown size={14} />
                </span>
              </div>
            </div>
          </div>

          <div className="lab-chart glass-panel animate-slide-up">
            <h3>Strategy comparison</h3>
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#94A3B8', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#0b0b14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Legend />
                  <Bar dataKey="Baseline" fill="#64748B" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Stitch" fill="#A855F7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="incremental-banner glass-panel animate-slide-up">
            <div className="inc-content">
              <span className="inc-label">Net Incremental Lift</span>
              <span className="inc-value text-success">+₹{incremental.toLocaleString('en-IN')}</span>
            </div>
            <div className="inc-content">
              <span className="inc-label">Policy Violations</span>
              <span className="inc-value">{results.policyViolations}</span>
            </div>
            <div className="inc-content">
              <span className="inc-label">Messages Avoided</span>
              <span className="inc-value text-blue">
                -{(results.baseline.contacts - results.stitch.contacts).toLocaleString()}
              </span>
            </div>
            <div className="inc-content">
              <span className="inc-label">Awaiting Attribution</span>
              <span className="inc-value">{results.unsettledCases}</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RecoveryLab;
