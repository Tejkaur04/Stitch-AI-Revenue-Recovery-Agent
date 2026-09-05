import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getIncidents, subscribe } from '../services/engine';
import { razorpayApi } from '../services/api';
import { useMode } from '../context/ModeContext';
import { AlertTriangle, Search } from 'lucide-react';
import { EmptyState, ErrorBanner, PageSkeleton } from '../components/UI/PageStates';
import './IncidentsList.css';

const IncidentsList = () => {
  const [incidents, setIncidents] = useState(() => getIncidents());
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { mode } = useMode();
  const navigate = useNavigate();

  const load = async () => {
    try {
      const result = await razorpayApi.getIncidents();
      setIncidents(result.items || []);
      setError(null);
    } catch {
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
          const result = await razorpayApi.getIncidents();
          if (active) {
            setIncidents(result.items || []);
            setError(null);
          }
        } catch {
          if (active) setError('Could not connect to backend. Start the server and refresh.');
        } finally {
          if (active) setLoading(false);
        }
      };
      tick();
      const interval = setInterval(tick, 5000);
      return () => { active = false; clearInterval(interval); };
    }
    setLoading(false);
    const unsubscribe = subscribe((newIncidents) => {
      setIncidents([...newIncidents]);
    });
    return unsubscribe;
  }, [mode]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return incidents.filter(incident => {
      const state = String(incident.state || '').toUpperCase();
      if (statusFilter !== 'ALL' && state !== statusFilter) return false;
      if (!q) return true;
      const name = String(incident.customer?.name || '').toLowerCase();
      const reason = String(incident.reason || '').toLowerCase();
      const id = String(incident.id || '').toLowerCase();
      return name.includes(q) || reason.includes(q) || id.includes(q);
    });
  }, [incidents, query, statusFilter]);

  return (
    <div className="incidents-list-page page-max">
      <div className="page-header">
        <span className="page-eyebrow">Incidents</span>
        <h1 className="page-title">Incidents</h1>
        <p className="page-subtitle">Track revenue at risk and monitor Stitch recovery operations in real time.</p>
      </div>

      {error && <ErrorBanner onRetry={() => { setLoading(true); load(); }} />}

      <div className="table-controls">
        <div className="search-bar glass-panel">
          <Search size={16} className="text-muted" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by customer, ID, or reason…"
          />
        </div>
        <select
          className="btn btn-secondary filter-select"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All statuses</option>
          <option value="DETECTED">Detected</option>
          <option value="EXECUTING">In progress</option>
          <option value="RECOVERED">Recovered</option>
          <option value="STOPPED">Stopped</option>
          <option value="ESCALATED">Escalated</option>
        </select>
      </div>

      {loading ? (
        <PageSkeleton rows={3} />
      ) : incidents.length === 0 ? (
        <div className="incidents-table-container glass-panel">
          <EmptyState
            icon={AlertTriangle}
            title="No incidents yet"
            sub="Run a demo scenario to create a live recovery case."
            ctaTo="/demo"
            ctaLabel="Run a Demo Scenario →"
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="incidents-table-container glass-panel">
          <EmptyState
            icon={Search}
            title="No matching incidents"
            sub="Try a different search or status filter."
          />
        </div>
      ) : (
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
              {filtered.map(incident => (
                <tr key={incident.id} onClick={() => navigate(`/incidents/${incident.id}`)}>
                  <td>
                    <span className="incident-link">{String(incident.id || 'UNKNOWN').toUpperCase()}</span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{incident.customer?.name || '—'}</td>
                  <td>
                    <span className={`amount-cell ${incident.state === 'RECOVERED' ? 'text-success' : ''}`}>
                      ₹{(Number(incident.amount_paise || 0) / 100).toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="text-secondary">{incident.reason}</td>
                  <td>
                    <span className={`status-badge status-${String(incident.state || '').toLowerCase()}`}>
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
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default IncidentsList;
