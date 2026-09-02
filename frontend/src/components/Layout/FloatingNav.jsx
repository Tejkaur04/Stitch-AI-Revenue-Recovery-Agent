import React, { useEffect, useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { useMode } from '../../context/ModeContext';
import { FlaskConical, LayoutDashboard } from 'lucide-react';
import { razorpayApi } from '../../services/api';
import './FloatingNav.css';

const FloatingNav = () => {
  const { mode, setMode } = useMode();
  const location = useLocation();
  const navigate = useNavigate();
  const [apiStatus, setApiStatus] = useState(null);
  const isLanding = location.pathname === '/';

  useEffect(() => {
    let active = true;
    const checkStatus = async () => {
      try {
        const status = await razorpayApi.getStatus();
        if (active) setApiStatus(status);
      } catch {
        if (active) setApiStatus({ configured: false, webhookConfigured: false });
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  const handleModeChange = nextMode => {
    setMode(nextMode);
    navigate(nextMode === 'simulation' ? '/console' : '/app');
  };

  const landingLinks = [
    { to: '/#features', label: 'Features' },
    { to: '/#integration', label: 'Integration' },
    { to: '/#guardrails', label: 'Guardrails' },
  ];

  const workspaceLinks = [
    { to: '/app', label: 'Merchant App' },
    { to: '/console', label: 'Console' },
    { to: '/app/recovery-lab', label: 'Recovery Lab' },
  ];

  return (
    <nav className="floating-nav">
      {/* Brand */}
      <Link to="/" className="nav-brand">
        <div className="brand-logo">
          <div className="brand-logo-inner" />
        </div>
        <span className="brand-text">Stitch</span>
      </Link>

      {/* Links */}
      <div className="nav-links">
        {(isLanding ? landingLinks : workspaceLinks).map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={(event) => {
              if (to.startsWith('/#')) {
                const targetId = to.replace('/#', '');
                const element = document.getElementById(targetId);
                if (element) {
                  event.preventDefault();
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }
            }}
          >
            {label}
          </NavLink>
        ))}
      </div>

      {/* Right side actions */}
      <div className="nav-right">
        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button
            className={`mode-btn ${mode === 'simulation' ? 'active' : ''}`}
            type="button"
            onClick={() => handleModeChange('simulation')}
          >
            <span className="mode-dot sim" />
            Simulation
          </button>
          <button
            className={`mode-btn ${mode === 'razorpay' ? 'active' : ''}`}
            type="button"
            onClick={() => handleModeChange('razorpay')}
            title="Open the Razorpay Test Mode workspace"
          >
            <span className={`mode-dot rzp ${apiStatus?.configured ? 'connected' : ''}`} />
            Razorpay API
          </button>
        </div>

        {isLanding ? (
          <Link to={mode === 'simulation' ? '/console' : '/app'} className="btn btn-primary nav-cta">
            {mode === 'simulation' ? <FlaskConical size={15} /> : <LayoutDashboard size={15} />}
            {mode === 'simulation' ? 'Open Console' : 'Open Merchant App'}
          </Link>
        ) : (
          <Link to="/" className="btn btn-secondary nav-cta-sm">
            ← Home
          </Link>
        )}
      </div>
    </nav>
  );
};

export default FloatingNav;
