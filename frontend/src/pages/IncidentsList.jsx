import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getIncidents, subscribe } from '../services/engine';
import { Search, Filter } from 'lucide-react';
import './IncidentsList.css';

const IncidentsList = () => {
  const [incidents, setIncidents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    setIncidents(getIncidents());
    const unsubscribe = subscribe((newIncidents) => {
      setIncidents([...newIncidents]);
    });
    return unsubscribe;
  }, []);

  return (
    <div className="incidents-list-page">
      <header>
        <h1>Incidents</h1>
        <p className="text-secondary" style={{ marginTop: '0.5rem' }}>
          Track all revenue at risk and monitor Stitch's live operations.
        </p>
      </header>

      <div className="table-controls">
        <div className="search-bar glass-panel">
          <Search size={16} className="text-muted" />
          <input type="text" placeholder="Search by customer, ID, or amount…" />
        </div>
        <button className="btn btn-secondary">
          <Filter size={16} /> Filter
        </button>
      </div>

      <div className="incidents-table-container glass-panel">
        <table className="incidents-table">
          <thead>
            <tr>
              <th>Case ID</th>
              <th>Customer</th>
              <th>Amount</th>
              <th>Reason</th>
              <th>State</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {incidents.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-table text-muted">
                  No incidents yet. Go to <Link to="/demo" style={{color: 'var(--accent-blue)'}}>Demo Mode</Link> and run a scenario.
                </td>
              </tr>
            ) : (
              incidents.map(incident => (
                <tr key={incident.id} onClick={() => navigate(`/incidents/${incident.id}`)}>
                  <td>
                    <span className="incident-link">
                      {incident.id.substring(4, 13).toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{incident.customer.name}</td>
                  <td>
                    <span className={`amount-cell ${incident.state === 'RECOVERED' ? 'text-success' : ''}`}>
                      ₹{(incident.amount_paise / 100).toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="text-secondary">{incident.reason}</td>
                  <td>
                    <span className={`status-badge status-${incident.state.toLowerCase()}`}>
                      {incident.state}
                    </span>
                  </td>
                  <td>
                    <Link
                      to={`/incidents/${incident.id}`}
                      className="btn btn-secondary btn-sm"
                      onClick={e => e.stopPropagation()}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IncidentsList;
