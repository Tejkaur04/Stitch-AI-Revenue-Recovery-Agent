import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { subscribe, getIncident, getEvents, INCIDENT_STATES } from '../services/engine';
import { ArrowLeft, User, AlertCircle, CheckCircle, Clock, ShieldX, BrainCircuit } from 'lucide-react';
import './IncidentDetail.css';

const STATE_ORDER = [
  INCIDENT_STATES.DETECTED,
  INCIDENT_STATES.UNDERSTANDING,
  INCIDENT_STATES.DECIDING,
  INCIDENT_STATES.POLICY_CHECK,
  INCIDENT_STATES.VERIFYING,
  INCIDENT_STATES.EXECUTING,
  INCIDENT_STATES.RECOVERED
]; // Simplified for linear view, STOPPED/ESCALATED branch off

const IncidentDetail = () => {
  const { id } = useParams();
  const [incident, setIncident] = useState(() => getIncident(id));
  const [events, setEvents] = useState(() => getEvents(id));

  useEffect(() => {
    const unsubscribe = subscribe((incidents, allEvents) => {
      setIncident(incidents.find(i => i.id === id));
      setEvents(allEvents.filter(e => e.incidentId === id).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
    });
    return unsubscribe;
  }, [id]);

  if (!incident) return <div className="loading-state">Locating Case File...</div>;

  const currentIdx = STATE_ORDER.indexOf(incident.state);
  const isTerminal = incident.state === INCIDENT_STATES.RECOVERED || 
                     incident.state === INCIDENT_STATES.STOPPED || 
                     incident.state === INCIDENT_STATES.ESCALATED;

  return (
    <div className="incident-detail">
      <header className="incident-header">
        <div className="header-left">
          <Link to="/incidents" className="back-link"><ArrowLeft size={16} /> Back to Incidents</Link>
          <h1 className="case-title">Case File {incident.id.toUpperCase()}</h1>
        </div>
        <div className={`status-badge status-${incident.state.toLowerCase()}`}>
          {incident.state}
        </div>
      </header>

      <div className="risk-banner glass-panel">
        <div className="risk-amount">
          <span className="label">Revenue at Risk</span>
          <span className={`value ${incident.state === INCIDENT_STATES.RECOVERED ? 'text-success' : 'text-danger'}`}>
            ₹{(incident.amount_paise / 100).toLocaleString('en-IN')}
          </span>
        </div>
        <div className="customer-info">
          <User size={18} className="text-secondary" />
          <span className="cust-name">{incident.customer.name}</span>
          <span className="cust-ltv">LTV: ₹{(incident.customer.ltv / 100).toLocaleString('en-IN')}</span>
        </div>
        <div className="problem-info">
          <AlertCircle size={18} className="text-warning" />
          <span>{incident.reason}</span>
        </div>
      </div>

      <div className="pipeline-container">
        <h2 className="section-title">Live Recovery Pipeline</h2>
        <div className="pipeline">
          {STATE_ORDER.map((state, idx) => {
            const isCompleted = currentIdx >= idx || isTerminal;
            const isCurrent = incident.state === state;
            const isFailedEnd = isTerminal && incident.state !== INCIDENT_STATES.RECOVERED && idx === STATE_ORDER.length - 1;
            
            return (
              <div key={state} className={`pipeline-node ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''}`}>
                <div className="node-icon">
                  {isCompleted && !isCurrent ? <CheckCircle size={16} /> : 
                   isCurrent ? <Clock size={16} className={!isTerminal ? 'pulse-icon' : ''} /> : 
                   isFailedEnd ? <ShieldX size={16} /> :
                   <div className="empty-circle"></div>}
                </div>
                <div className="node-label">{state}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="investigation-grid">
        <div className="grid-col glass-panel">
          <h3 className="panel-title"><BrainCircuit size={18} className="text-accent-purple" /> AI Decision</h3>
          {incident.aiDecision ? (
            <div className="decision-content animate-slide-up">
              <div className="decision-action">Recommended: <strong>{incident.aiDecision.action}</strong></div>
              <div className="decision-basis">
                <span className="label">Decision Basis:</span>
                <p>{incident.aiDecision.basis}</p>
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
              <strong>{incident.policyResult.status.toUpperCase()}</strong>
              {incident.policyResult.reason && <p>{incident.policyResult.reason}</p>}
            </div>
          ) : (
            <div className="waiting-state text-muted">Awaiting policy check...</div>
          )}
        </div>
      </div>

      <div className="audit-log glass-panel">
        <h3 className="panel-title">Audit Trail</h3>
        <div className="log-entries">
          {events.map(event => (
            <div key={event.id} className="log-entry">
              <div className="log-time">{new Date(event.timestamp).toLocaleTimeString()}</div>
              <div className={`log-actor actor-${event.actor.toLowerCase()}`}>{event.actor}</div>
              <div className="log-event">{event.event}</div>
              <div className="log-result">{event.result}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IncidentDetail;
