import React, { useState } from 'react';
import { razorpayApi } from '../services/api';
import { Play, AlertTriangle, CreditCard, Shield, Clock, Building2, Loader2, ShoppingCart, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './DemoMode.css';
import PipelineSignature from '../components/UI/PipelineSignature';

const scenarios = [
  {
    key: 'TEMP_FAILURE',
    icon: AlertTriangle,
    iconClass: 'icon-warning',
    title: 'Temporary Payment Failure',
    desc: '₹2,999 at risk. The bank returned a temporary error. Stitch evaluates context, waits, retries, and recovers.',
    outcome: 'RECOVERED'
  },
  {
    key: 'CUSTOMER_PAID',
    icon: CreditCard,
    iconClass: 'icon-success',
    title: 'Customer Paid Manually',
    desc: '₹8,750 at risk. Stitch schedules a retry, but the customer pays first. The system verifies the live state and cancels the redundant action.',
    outcome: 'STOPPED'
  },
  {
    key: 'POLICY_BLOCKED',
    icon: Shield,
    iconClass: 'icon-danger',
    title: 'Policy-Blocked Retry',
    desc: '₹12,000 at risk. The recommended path is a 4th retry, but the policy engine blocks it and forces an escalation instead.',
    outcome: 'ESCALATED'
  },
  {
    key: 'EXPIRED_CARD',
    icon: Clock,
    iconClass: 'icon-muted',
    title: 'Expired Card',
    desc: '₹4,999 at risk. Stitch identifies an expired card, sends an update link, and recovers once the payment method is refreshed.',
    outcome: 'RECOVERED'
  },
  {
    key: 'B2B_INVOICE',
    icon: Building2,
    iconClass: 'icon-muted',
    title: 'B2B Overdue Invoice',
    desc: '₹17,500 overdue. Stitch considers late-payment history and requests a promise-to-pay instead of escalating immediately.',
    outcome: 'EXECUTING'
  },
  {
    key: 'CHECKOUT_ABANDONED',
    icon: ShoppingCart,
    iconClass: 'icon-warning',
    title: 'Checkout Drop-off',
    desc: 'â‚¹3,499 left at checkout. Stitch creates one compliant recovery link and stops if the customer pays.',
    outcome: 'EXECUTING'
  },
  {
    key: 'SUBSCRIPTION_FAILED',
    icon: RefreshCw,
    iconClass: 'icon-muted',
    title: 'Failed Subscription Renewal',
    desc: 'â‚¹799 renewal at risk. Stitch asks for a payment-method update instead of repeatedly retrying.',
    outcome: 'EXECUTING'
  },
];

const DemoMode = () => {
  const navigate = useNavigate();
  const [runningKey, setRunningKey] = useState(null);
  const [cardError, setCardError] = useState({});

  const handleRun = async (scenarioKey) => {
    if (!scenarioKey || runningKey) return;
    setCardError(e => ({ ...e, [scenarioKey]: null }));
    setRunningKey(scenarioKey);
    try {
      const res = await razorpayApi.triggerScenario(scenarioKey);
      navigate(`/incidents/${res.incident_id}`);
    } catch (err) {
      setCardError(e => ({ ...e, [scenarioKey]: err.message || 'Failed to create incident.' }));
      setRunningKey(null);
    }
  };

  return (
    <div className="demo-mode page-max">
      <div className="page-header">
        <span className="page-eyebrow">Demo</span>
        <h1 className="page-title">Demo Mode</h1>
        <p className="page-subtitle">Select a scenario to watch Stitch resolve a revenue risk through the live recovery pipeline.</p>
      </div>

      <div className="demo-pipeline glass-panel"><PipelineSignature activeStage={0} /></div>

      <div className="scenarios-grid">
        {scenarios.map(({ key, icon: Icon, iconClass, title, desc, outcome }) => {
          const busy = runningKey === key;
          const locked = Boolean(runningKey);
          return (
            <div key={key} className={`scenario-card glass-panel ${locked && !busy ? 'locked' : ''}`}>
              <span className={`status-badge status-${outcome}`}>{outcome}</span>
              <div className={`scenario-icon ${iconClass}`}>
                <Icon size={20} />
              </div>
              <div className="scenario-body">
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
              {cardError[key] && <div className="scenario-error">{cardError[key]}</div>}
              <button
                className="btn btn-primary scenario-btn"
                onClick={() => handleRun(key)}
                disabled={locked}
              >
                {busy ? <><Loader2 size={15} className="spin" /> Creating incident…</> : <><Play size={15} /> Run Scenario</>}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DemoMode;
