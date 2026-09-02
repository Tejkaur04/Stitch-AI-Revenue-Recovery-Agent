import React from 'react';
import { Link } from 'react-router-dom';
import GradientCarousel from '../components/UI/GradientCarousel';
import {
  Zap, Shield, BrainCircuit, Eye, CircleDollarSign, Play, Target,
  ArrowRight, CheckCircle2, Webhook, Cpu, ShieldCheck, Activity
} from 'lucide-react';
import './Landing.css';

/* ── Feature Carousel Data ─────────────────────────────────────── */
const features = [
  {
    gradient: 'linear-gradient(135deg, rgba(168,85,247,0.25) 0%, rgba(59,130,246,0.15) 100%)',
    icon: Zap,
    label: 'Detection',
    title: 'Immediate failure detection',
    desc: 'Each Razorpay payment failure is normalized, deduplicated, and turned into a recoverable case with context attached.',
  },
  {
    gradient: 'linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(16,185,129,0.15) 100%)',
    icon: BrainCircuit,
    label: 'Context',
    title: 'Customer and payment context',
    desc: 'Stitch looks at account value, payment history, retry count, and recent customer interactions before it chooses a path.',
  },
  {
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.25) 0%, rgba(59,130,246,0.15) 100%)',
    icon: Target,
    label: 'Decision',
    title: 'Best next action',
    desc: 'The engine chooses between a wait, retry, payment link, or escalation based on the case and the policy bounds.',
  },
  {
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(168,85,247,0.15) 100%)',
    icon: Shield,
    label: 'Guardrails',
    title: 'Policy-bound execution',
    desc: 'Recovery only runs when retry limits, quiet hours, opt-outs, and approval thresholds still allow it.',
  },
  {
    gradient: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(59,130,246,0.2) 100%)',
    icon: CheckCircle2,
    label: 'Verification',
    title: 'Final payment-state check',
    desc: 'The system confirms the payment state before acting so it never retries after the customer has already paid.',
  },
];

/* ── Pipeline Steps ─────────────────────────────────────────────── */
const pipeline = [
  { icon: Activity,        label: 'Detected',      desc: 'Webhook or poller identifies revenue at risk.' },
  { icon: Eye,             label: 'Understood',     desc: 'Customer context, history and risk are analysed.' },
  { icon: BrainCircuit,    label: 'Decided',        desc: 'The engine selects the best recovery path for the specific case.' },
  { icon: Shield,          label: 'Policy Checked', desc: 'Rules are validated before the action is allowed through.' },
  { icon: CheckCircle2,    label: 'Verified',       desc: 'Live payment state is confirmed before execution.' },
  { icon: Zap,             label: 'Executed',       desc: 'Retry, link, reminder, or escalation is sent.' },
  { icon: CircleDollarSign,label: 'Recovered',      desc: 'Revenue moves from at-risk to recovered.' },
];

/* ── Razorpay Integration Steps ─────────────────────────────────── */
const integrationSteps = [
  { icon: Webhook,    title: 'Razorpay Webhooks',  desc: 'payment.failed events land at /webhooks/razorpay, are signature-checked, and deduplicated by event ID.' },
  { icon: Cpu,        title: 'Recovery Engine',    desc: 'The event is normalized, the case is created, and the customer context is loaded before the decision step.' },
  { icon: ShieldCheck,title: 'Policy Guardrails',  desc: 'Each action is checked against the configured rules before it is allowed through.' },
  { icon: Activity,   title: 'Razorpay Actions',   desc: 'The engine triggers retries, payment links, or status checks only when the guardrails allow it.' },
];

/* ── Component ──────────────────────────────────────────────────── */
const Landing = () => (
  <div className="landing">

    {/* Atmospheric Glows */}
    {/* <div className="lp-glow lp-glow-tl" />
    <div className="lp-glow lp-glow-br" /> */}

    {/* ── HERO ─────────────────────────────────────────────────── */}
    <section className="lp-hero">
      <br></br>
      <br></br>
      <div className="lp-tag animate-slide-up">
        <span className="tag-dot" /> Revenue Recovery Engine · Built for Razorpay
      </div>
      <h1 className="lp-headline animate-slide-up">
        Recover missed revenue.<br />
        <span className="text-accent-gradient">Without adding noise.</span>
      </h1>
      <p className="lp-subhead animate-slide-up">
        Stitch detects failed payments, ranks the best recovery path, checks the rules,
        and only acts when the payment state is still unresolved.
      </p>
      <div className="lp-ctas animate-slide-up">
        <Link to="/demo" className="btn btn-primary lp-cta-primary">
          <Play size={16} /> Watch the Demo
        </Link>
        <Link to="/dashboard" className="btn btn-secondary lp-cta-secondary">
          Open Dashboard <ArrowRight size={16} />
        </Link>
      </div>
    </section>

    {/* ── STATS ────────────────────────────────────────────────── */}
    <section className="lp-stats glass-panel animate-slide-up">
      {[
        { value: '₹12.7L+', label: 'Recovered this month' },
        { value: '58.4%',   label: 'Recovery rate' },
        { value: '–71%',    label: 'Customer contacts' },
        { value: '<1s',     label: 'Detection latency' },
      ].map(s => (
        <div key={s.label} className="lp-stat">
          <span className="lp-stat-value text-accent-gradient">{s.value}</span>
          <span className="lp-stat-label">{s.label}</span>
        </div>
      ))}
    </section>

    {/* ── PIPELINE ─────────────────────────────────────────────── */}
    <section className="lp-section">
      <div className="lp-section-header">
        <span className="lp-eyebrow">How it works</span>
        <h2 className="lp-section-title">The recovery loop, made visible.</h2>
        <p className="lp-section-sub">
          Every rupee follows the same path. Stitch makes it auditable at every step.
        </p>
      </div>

      <div className="lp-pipeline">
        {pipeline.map(({ icon: Icon, label, desc }, i) => (
          <div key={label} className="lp-pipeline-step">
            <div className="lp-step-connector">
              <div className="lp-step-icon">
                <Icon size={20} />
              </div>
              {i < pipeline.length - 1 && <div className="lp-step-line" />}
            </div>
            <div className="lp-step-body">
              <h4 className="lp-step-label">{label}</h4>
              <p className="lp-step-desc">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>

    {/* ── FEATURE CAROUSEL ─────────────────────────────────────── */}
    <section id="features" className="lp-section">
      <div className="lp-section-header">
        <span className="lp-eyebrow">Core capabilities</span>
        <h2 className="lp-section-title">Built to understand, not just react.</h2>
      </div>
      <GradientCarousel slides={features} />
    </section>

    {/* ── RAZORPAY INTEGRATION ─────────────────────────────────── */}
    <section id="integration" className="lp-section">
      <div className="lp-section-header">
        <span className="lp-eyebrow">Integration</span>
        <h2 className="lp-section-title">Razorpay-native by design.</h2>
        <p className="lp-section-sub">
          Stitch sits on top of Razorpay's payments flow: it watches webhook events,
          evaluates the case, checks the guardrails, and only then triggers the next recovery step.
        </p>
      </div>

      <div className="lp-integration-grid">
        {integrationSteps.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="lp-int-card glass-panel">
            <div className="lp-int-icon">
              <Icon size={22} />
            </div>
            <h4>{title}</h4>
            <p>{desc}</p>
          </div>
        ))}
      </div>

      <div className="lp-arch glass-panel">
        <div className="lp-arch-flow">
          {['Razorpay Webhooks', 'Event Processor', 'Stitch AI Engine', 'Policy Guard', 'Action Executor', 'Razorpay APIs'].map((node, i, arr) => (
            <React.Fragment key={node}>
              <div className="lp-arch-node">
                <span>{node}</span>
              </div>
              {i < arr.length - 1 && <div className="lp-arch-arrow">→</div>}
            </React.Fragment>
          ))}
        </div>
        <p className="lp-arch-note">
          ◈ Real Razorpay webhook events · ◈ Test Mode supported · ◈ Idempotent processing
        </p>
      </div>
    </section>

    {/* ── GUARDRAILS ───────────────────────────────────────────── */}
    <section id="guardrails" className="lp-section lp-guardrails-section">
      <div className="lp-guardrails-content">
        <span className="lp-eyebrow">Safety</span>
        <h2 className="lp-section-title">Recovery only happens within the rules.</h2>
        <p className="lp-section-sub">
          Every action is validated against merchant-defined guardrails before execution.
          If the case falls outside the allowed path, the system waits, stops, or escalates.
        </p>
        <div className="lp-guardrail-pills">
          {['Max 3 Retries', 'DND 10PM–8AM', 'No Duplicate Outreach', 'High-value Approval', 'Opt-out Respect', 'Override Disabled'].map(p => (
            <div key={p} className="lp-guardrail-pill glass-panel">
              <CheckCircle2 size={14} className="text-success" /> {p}
            </div>
          ))}
        </div>
        <Link to="/guardrails" className="btn btn-secondary" style={{ marginTop: '2rem', alignSelf: 'flex-start' }}>
          Configure Guardrails <ArrowRight size={16} />
        </Link>
      </div>
      <div className="lp-guardrails-visual glass-panel">
        <div className="lgv-blocked">
          <span className="lgv-label text-danger">BLOCKED BY POLICY</span>
          <p>Recommended action: retry #4</p>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>Maximum retries reached; escalation required.</p>
        </div>
        <div className="lgv-arrow">↓</div>
        <div className="lgv-allowed">
          <span className="lgv-label text-success">NEXT SAFE ACTION</span>
          <p>Escalated to merchant team.</p>
        </div>
      </div>
    </section>

    {/* ── CTA ──────────────────────────────────────────────────── */}
    <section className="lp-cta-footer glass-panel">
      <h2>Ready to see Stitch in action?</h2>
      <p className="text-secondary">
        Run a recovery scenario end-to-end — from payment failure to resolved — in under a minute.
      </p>
      <Link to="/demo" className="btn btn-primary" style={{ fontSize: '1.05rem', padding: '0.9rem 2.5rem' }}>
        <Play size={18} /> Start the Demo
      </Link>
    </section>

    <footer className="lp-footer">
      <span className="text-muted">Stitch · Revenue Recovery Engine · Razorpay-ready workflow</span>
    </footer>
  </div>
);

export default Landing;
