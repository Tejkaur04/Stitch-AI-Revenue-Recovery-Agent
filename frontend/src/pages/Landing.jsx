import React from 'react';
import { Link } from 'react-router-dom';
import FallingRays from '../components/UI/FallingRays';
import GradientCarousel from '../components/UI/GradientCarousel';
import {
  Zap, Shield, BrainCircuit, Eye, CircleDollarSign, Play,
  ArrowRight, CheckCircle2, Webhook, Cpu, ShieldCheck, Activity
} from 'lucide-react';
import './Landing.css';

/* ── Feature Carousel Data ─────────────────────────────────────── */
const features = [
  {
    gradient: 'linear-gradient(135deg, rgba(168,85,247,0.25) 0%, rgba(59,130,246,0.15) 100%)',
    icon: '⚡',
    label: 'Detection',
    title: 'Instant Failure Detection',
    desc: 'Every payment.failed webhook from Razorpay is ingested, deduplicated, and converted into a structured Incident within milliseconds.',
  },
  {
    gradient: 'linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(16,185,129,0.15) 100%)',
    icon: '🧠',
    label: 'Understanding',
    title: 'AI Context Analysis',
    desc: 'Stitch reads customer LTV, payment history, failure type, retry count, and communication history to understand the true risk of every incident.',
  },
  {
    gradient: 'linear-gradient(135deg, rgba(16,185,129,0.25) 0%, rgba(59,130,246,0.15) 100%)',
    icon: '🎯',
    label: 'Decision',
    title: 'Next-Best Action',
    desc: 'AI selects the optimal recovery action — silent retry, payment-method update link, reminder, wait, or escalate — calibrated to the specific context.',
  },
  {
    gradient: 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(168,85,247,0.15) 100%)',
    icon: '🛡️',
    label: 'Guardrails',
    title: 'Policy-Bounded Execution',
    desc: 'Before acting, Stitch checks every merchant-defined guardrail. Max retries, DND hours, contact limits, high-value approval thresholds — all enforced automatically.',
  },
  {
    gradient: 'linear-gradient(135deg, rgba(239,68,68,0.15) 0%, rgba(59,130,246,0.2) 100%)',
    icon: '✅',
    label: 'Verification',
    title: 'State Verification Before Action',
    desc: 'Stitch re-checks the live Razorpay payment status before executing any action — preventing duplicate contact when a customer has already paid.',
  },
];

/* ── Pipeline Steps ─────────────────────────────────────────────── */
const pipeline = [
  { icon: Activity,        label: 'Detected',      desc: 'Webhook or poller identifies revenue at risk.' },
  { icon: Eye,             label: 'Understood',     desc: 'Customer context, history and risk are analysed.' },
  { icon: BrainCircuit,    label: 'Decided',        desc: 'AI selects the highest-probability recovery action.' },
  { icon: Shield,          label: 'Policy Checked', desc: 'Guardrails validate the action is permitted.' },
  { icon: CheckCircle2,    label: 'Verified',       desc: 'Live payment state confirmed before execution.' },
  { icon: Zap,             label: 'Executed',       desc: 'Retry, link, reminder, or escalation is sent.' },
  { icon: CircleDollarSign,label: 'Recovered',      desc: 'Revenue moves from At Risk → Recovered.' },
];

/* ── Razorpay Integration Steps ─────────────────────────────────── */
const integrationSteps = [
  { icon: Webhook,    title: 'Razorpay Webhooks',  desc: 'payment.failed events land at /webhooks/razorpay. Signature verified. Deduplicated by event ID.' },
  { icon: Cpu,        title: 'Stitch Engine',       desc: 'Event is parsed, an Incident is created, customer context is loaded, and the AI decision loop starts.' },
  { icon: ShieldCheck,title: 'Policy Guardrails',  desc: 'Every AI recommendation is validated against your configured merchant policies before any action is taken.' },
  { icon: Activity,   title: 'Razorpay Actions',   desc: 'Stitch calls Razorpay APIs to retry charges, create payment links, or fetch latest subscription status.' },
];

/* ── Component ──────────────────────────────────────────────────── */
const Landing = () => (
  <div className="landing">
    {/* Falling Rays — landing gets full intensity */}
    <FallingRays intensity="high" />

    {/* Atmospheric Glows */}
    {/* <div className="lp-glow lp-glow-tl" />
    <div className="lp-glow lp-glow-br" /> */}

    {/* ── HERO ─────────────────────────────────────────────────── */}
    <section className="lp-hero">
      <div className="lp-tag animate-slide-up">
        <span className="tag-dot" /> AI Revenue Orchestrator · Built for Razorpay
      </div>
      <h1 className="lp-headline animate-slide-up">
        Recover More.<br />
        <span className="text-accent-gradient">Annoy Less.</span><br />
        Stay in Control.
      </h1>
      <p className="lp-subhead animate-slide-up">
        Stitch is an AI decision layer that detects revenue at risk, chooses the
        right recovery action, verifies guardrails, and executes — in real time.
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
        { value: '58.4%',   label: 'AI recovery rate' },
        { value: '–71%',    label: 'Customer messages' },
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
          Stitch does not replace Razorpay's retry system — it adds an intelligent layer
          on top of it. We intercept events, add context-aware decisions, and call
          Razorpay APIs to execute approved actions.
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
        <h2 className="lp-section-title">The AI operates inside your rules.</h2>
        <p className="lp-section-sub">
          Every action is validated against merchant-defined guardrails before execution.
          Stitch cannot override policy — and it never will.
        </p>
        <div className="lp-guardrail-pills">
          {['Max 3 Retries', 'DND 10PM–8AM', 'Dedup CRM Contacts', 'High-value Approval', 'Opt-out Respected', 'AI Override: OFF'].map(p => (
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
          <p>AI recommended: Retry #4</p>
          <p className="text-muted" style={{ fontSize: '0.85rem' }}>Maximum retries (3) exceeded.</p>
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
      <span className="text-muted">Stitch · AI Revenue Recovery Orchestrator · Razorpay Hackathon 2026</span>
    </footer>
  </div>
);

export default Landing;
