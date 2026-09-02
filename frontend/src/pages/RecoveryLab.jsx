import React, { useState } from 'react';
import { Play, TrendingUp, TrendingDown } from 'lucide-react';
import { calculateLabResults } from '../services/engine';
import './RecoveryLab.css';

const RecoveryLab = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState(null);

  const runExperiment = () => {
    setIsRunning(true);
    setResults(null);
    const nextResults = calculateLabResults();
    setResults(nextResults);
    setIsRunning(false);
  };

  const incremental = results
    ? results.incrementalLift / 100
    : 0;

  return (
    <div className="recovery-lab">
      <header className="lab-header">
        <h1>Recovery Lab</h1>
        <p className="text-secondary" style={{ marginTop: '0.5rem' }}>
          Run head-to-head experiments — Existing Strategy vs Stitch AI.
        </p>
      </header>

      <div className="experiment-controls glass-panel">
        <div className="batch-info">
          <div className="batch-stat">
            <span className="label">Test Batch</span>
            <span className="value">{results?.cases ?? 8} cases</span>
          </div>
          <div className="batch-stat">
            <span className="label">Revenue at Risk</span>
            <span className="value">₹{((results?.revenueAtRisk ?? 7950000) / 100).toLocaleString('en-IN')}</span>
          </div>
        </div>
        <button
          className="btn btn-primary run-btn"
          onClick={runExperiment}
          disabled={isRunning}
        >
          {isRunning ? 'Simulating...' : <><Play size={16} /> Run Experiment</>}
        </button>
      </div>

      {isRunning && (
        <div className="running-state animate-slide-up">
          <div className="ai-orb animate-pulse-soft"></div>
          <p>Simulating 5,000 recovery journeys through both strategies…</p>
        </div>
      )}

      {results && (
        <>
          <div className="experiment-explanation glass-panel animate-slide-up">
            <strong>Why this measures Stitch impact</strong>
            <p>
              Both strategies receive the same revenue-at-risk batch. The control group follows the existing strategy;
              the treatment group follows Stitch. A higher treatment recovery rate is the measurable lift attributable
              to the different recovery strategy, while contacts and policy violations show the cost of that lift.
            </p>
            <code>
              Incremental lift = Treatment at-risk revenue × (Treatment recovery rate − Control recovery rate)
            </code>
          </div>
          <div className="results-container animate-slide-up">
            {/* Baseline */}
            <div className="strategy-card glass-panel">
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
                <span className="value text-danger">
                  {results.baseline.contacts.toLocaleString()} <TrendingUp size={14} />
                </span>
              </div>
            </div>

            {/* Stitch */}
            <div className="strategy-card stitch-card glass-panel">
              <div className="winner-badge">STITCH WINS</div>
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
          </div>
        </>
      )}
    </div>
  );
};

export default RecoveryLab;
