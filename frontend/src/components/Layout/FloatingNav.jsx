import React from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useMode } from '../../context/ModeContext';
import { FlaskConical } from 'lucide-react';
import './FloatingNav.css';

const FloatingNav = () => {
  const { mode, setMode } = useMode();
  const location = useLocation();
  const isLanding = location.pathname === '/';

  const landingLinks = [
    { to: '/#features',    label: 'Features'     },
    { to: '/#integration', label: 'Integration'  },
    { to: '/#guardrails',  label: 'Guardrails'   },
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
      {isLanding && <div className="nav-links">
        {landingLinks.map(({ to, label }) => (
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
      </div>}

      {/* Right side actions */}
      <div className="nav-right">
        {/* Mode Toggle */}
        <div className="mode-toggle">
          <button
            className={`mode-btn ${mode === 'simulation' ? 'active' : ''}`}
            onClick={() => setMode('simulation')}
          >
            <span className="mode-dot sim" />
            Simulation
          </button>
          <button
            className={`mode-btn ${mode === 'razorpay' ? 'active' : ''}`}
            onClick={() => setMode('razorpay')}
            title="Razorpay Test Mode — backend integration coming soon"
          >
            <span className="mode-dot rzp" />
            Razorpay API
          </button>
        </div>

        {isLanding ? (
          <Link to="/demo" className="btn btn-primary nav-cta">
            <FlaskConical size={15} /> Try Demo
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
