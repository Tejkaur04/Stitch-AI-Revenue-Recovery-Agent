import React, { useEffect, useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, AlertTriangle, FlaskConical,
  Shield, Play, ChevronRight, Wifi, WifiOff
} from 'lucide-react';
import { razorpayApi } from '../../services/api';
import './Sidebar.css';

const WORKSPACE = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', desc: 'Live metrics' },
  { to: '/incidents', icon: AlertTriangle, label: 'Incidents', desc: 'Active cases' },
  { to: '/guardrails', icon: Shield, label: 'Guardrails', desc: 'Policy rules' },
];

const TOOLS = [
  { to: '/demo', icon: Play, label: 'Demo', desc: 'Run scenarios' },
  { to: '/lab', icon: FlaskConical, label: 'Recovery Lab', desc: 'A/B results' },
];

const TERMINAL = new Set(['RECOVERED', 'STOPPED', 'ESCALATED']);

const Sidebar = () => {
  const location = useLocation();
  const [apiOk, setApiOk] = useState(null);
  const [activeCount, setActiveCount] = useState(0);

  useEffect(() => {
    const check = async () => {
      try {
        await razorpayApi.getStatus();
        setApiOk(true);
      } catch {
        setApiOk(false);
      }
    };
    const loadCount = async () => {
      try {
        const result = await razorpayApi.getIncidents();
        const n = (result.items || []).filter(i => !TERMINAL.has(String(i.state || '').toUpperCase())).length;
        setActiveCount(n);
      } catch {
        /* keep last count */
      }
    };
    check();
    loadCount();
    const t = setInterval(() => { check(); loadCount(); }, 8000);
    return () => clearInterval(t);
  }, []);

  const renderLink = ({ to, icon: Icon, label, desc }) => (
    <NavLink
      key={to}
      to={to}
      className={({ isActive }) =>
        `sidebar-link ${isActive || location.pathname.startsWith(to + '/') ? 'active' : ''}`
      }
    >
      <div className="sidebar-link-icon"><Icon size={17} /></div>
      <div className="sidebar-link-body">
        <span className="sidebar-link-label">{label}</span>
        <span className="sidebar-link-desc">{desc}</span>
      </div>
      {label === 'Incidents' && activeCount > 0 && (
        <span className="sidebar-badge">{activeCount}</span>
      )}
      <ChevronRight size={13} className="sidebar-link-arrow" />
    </NavLink>
  );

  return (
    <aside className="sidebar">
      <Link to="/" className="sidebar-brand">
        <div className="sidebar-logo">S</div>
        <div className="sidebar-brand-text">
          <span className="sidebar-name">Stitch</span>
          <span className="sidebar-tagline">Revenue Recovery</span>
        </div>
      </Link>

      <nav className="sidebar-nav">
        <div className="sidebar-nav-label">Workspace</div>
        {WORKSPACE.map(renderLink)}
        <div className="sidebar-nav-sep" />
        <div className="sidebar-nav-label">Tools</div>
        {TOOLS.map(renderLink)}
      </nav>

      <div className="sidebar-status">
        {apiOk === null ? (
          <div className="status-row status-checking">
            <div className="status-dot" />
            <span>Connecting…</span>
          </div>
        ) : apiOk ? (
          <div className="status-row status-ok">
            <Wifi size={13} />
            <span>Backend connected</span>
          </div>
        ) : (
          <div className="status-row status-err">
            <WifiOff size={13} />
            <span>Backend offline — start server</span>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
