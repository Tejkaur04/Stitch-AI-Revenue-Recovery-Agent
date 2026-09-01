import React from 'react';
import { runScenario } from '../services/engine';
import { Play, AlertTriangle, CreditCard, Shield, Clock, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './DemoMode.css';

const scenarios = [
  {
    key: 'TEMP_FAILURE',
    icon: AlertTriangle,
    iconClass: 'icon-warning',
    title: 'Temporary Payment Failure',
    desc: '₹2,999 at risk. Bank returned a temporary error. Stitch analyses context, waits, retries, and recovers.',
  },
  {
    key: 'CUSTOMER_PAID',
    icon: CreditCard,
    iconClass: 'icon-success',
    title: 'Customer Paid Manually',
    desc: '₹8,750 at risk. Stitch schedules a retry — but the customer pays first. Stitch verifies state and cancels the redundant action.',
  },
  {
    key: 'POLICY_BLOCKED',
    icon: Shield,
    iconClass: 'icon-danger',
    title: 'Policy-Blocked Retry',
    desc: '₹12,000 at risk. AI recommends a 4th retry. The Policy engine blocks it. Stitch escalates instead.',
  },
  {
    key: 'EXPIRED_CARD',
    icon: Clock,
    iconClass: 'icon-muted',
    title: 'Expired Card',
    desc: '₹4,999 at risk. Stitch identifies an expired card, sends an update link, and recovers after the payment method changes.',
  },
  {
    key: 'B2B_INVOICE',
    icon: Building2,
    iconClass: 'icon-muted',
    title: 'B2B Overdue Invoice',
    desc: '₹17,500 overdue. Stitch considers late-payment history and requests a promise-to-pay instead of escalating immediately.',
  },
];

const DemoMode = () => {
  const navigate = useNavigate();

  const handleRun = async (scenarioKey) => {
    if (!scenarioKey) return;
    await runScenario(scenarioKey, id => navigate(`/incidents/${id}`));
  };

  return (
    <div className="demo-mode">
      <header className="demo-header">
        <h1>Demo Mode</h1>
        <p className="text-secondary">
          Select a scenario to watch Stitch resolve a revenue risk in real-time.
        </p>
      </header>

      <div className="scenarios-grid">
        {scenarios.map(({ key, icon: Icon, iconClass, title, desc, disabled }) => (
          <div key={title} className={`scenario-card glass-panel ${disabled ? 'disabled' : ''}`}>
            <div className={`scenario-icon ${iconClass}`}>
              <Icon size={20} />
            </div>
            <div className="scenario-body">
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
            <button
              className={`btn ${disabled ? 'btn-secondary' : 'btn-primary'} scenario-btn`}
              onClick={() => handleRun(key)}
              disabled={disabled}
            >
              {disabled ? 'Coming Soon' : <><Play size={15} /> Run Scenario</>}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DemoMode;
