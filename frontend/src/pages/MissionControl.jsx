import React, { useEffect, useState } from 'react';
import { subscribe } from '../services/engine';
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
  const [events, setEvents] = useState([]);
  const [latestRecovered, setLatestRecovered] = useState(null);
  
  useEffect(() => {
    const unsubscribe = subscribe((newIncidents, newEvents) => {
      const recentEvents = [...newEvents].reverse();
      setEvents(recentEvents.slice(0, 5));
      
      const recoveredEvent = recentEvents.find(e => e.event === 'STATE_CHANGED' && e.newState === 'RECOVERED');
      if (recoveredEvent) {
        setLatestRecovered(recoveredEvent.incidentId);
        setTimeout(() => setLatestRecovered(null), 3000);
      }
    });
    return unsubscribe;
  }, []);

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
          AI orchestrator resolving payment failures in real-time.
        </p>
        
        <div className="mc-ai-entity">
          <div className="mc-ai-orb animate-pulse-soft"></div>
          <span>Stitch AI is active</span>
        </div>
      </header>

      <div className="mc-dashboard-grid">
        <div className="mc-main-panel glass-panel">
          <div className="mc-balance-header">
            <span className="text-secondary">Revenue at Risk</span>
          </div>
          <div className="mc-balance-amount">
            ₹12,70,000 <span className="mc-currency-indicator">INR</span>
          </div>
          <div className="mc-balance-footer">
            <div className="mc-footer-stat">
              <span className="text-secondary">Recovered</span>
              <span className={`font-semibold ${latestRecovered ? 'text-success animate-pulse-soft' : 'text-primary'}`}>₹5,43,000</span>
            </div>
            <div className="mc-footer-stat">
              <span className="text-secondary">Cases</span>
              <span className="font-semibold text-primary">2,340</span>
            </div>
          </div>
        </div>
        
        <div className="mc-side-metrics">
          <MetricCard title="Recovery Rate" value="42.7%" subtext="+12% vs Baseline" highlight={true} />
          <MetricCard title="Customer Contacts" value="8.3K" subtext="-2.1K Annoyance Reduction" />
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
                <div key={event.id} className={`mc-feed-item animate-slide-up ${isRecovered ? 'is-recovered' : ''}`}>
                  <div className="mc-feed-time">{new Date(event.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'})}</div>
                  <div className="mc-feed-content">
                    <span className={`mc-feed-actor actor-${event.actor?.toLowerCase() || 'system'}`}>{event.actor}</span>
                    <span className="mc-feed-text">
                      <strong>{event.event}</strong> 
                      <span className="text-secondary"> {event.result ? `— ${event.result}` : ''}</span>
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default MissionControl;
