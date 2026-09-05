# Stitch — AI Revenue Recovery Agent

**Find revenue that is slipping away and win it back — safely.**

Stitch is a constrained, auditable revenue-recovery agent for payment failures, checkout abandonment, failed subscription renewals, and overdue B2B receivables. It selects a bounded next action, applies merchant policy, re-verifies payment state, executes an approved recovery path, and measures provider-confirmed recovered revenue.

> Built for Razorpay Test Mode. This repository is a hackathon prototype, not production financial infrastructure.

## The recovery loop

```text
Detected → Understanding → Deciding → Policy Check → Verifying → Executing → Outcome
```

1. **Detect** signed Razorpay webhooks, invoice polling, or a safe demo scenario.
2. **Understand** the amount, reason, customer context, payment context, and experiment cohort.
3. **Decide** using Gemini (with a safe rule fallback): wait, retry review, payment link, promise-to-pay, or escalation.
4. **Guardrail** with retry caps, contact caps, quiet hours, opt-outs, consent, and high-value approval.
5. **Verify** current provider payment state before a consequential action.
6. **Execute** a bounded action or create a real Razorpay Test Mode Payment Link.
7. **Prove** `payment_link.paid` reconciles to the originating incident and the audit trail records it.

## Why it is an agent, not a dashboard

- Bounded autonomy: actions come from an allowlist.
- Stop rules: paid, opted-out, quiet-hours, contact-limit, retry-limit, and high-value cases halt or escalate.
- Pre-execution verification kills redundant recovery work.
- SQLite persists delayed re-evaluation, retry review, and promise-due jobs.
- Every decision, policy result, job, and outcome is auditable.
- Customer cohorts are persistent; unresolved incidents are excluded from attributed lift.

## Supported recovery cases

| Risk | Bounded action | Evidence |
|---|---|---|
| Temporary payment failure | Wait or provider retry review | Provider status check |
| Expired card / failed renewal | Secure payment link | Paid-link webhook |
| Checkout abandonment | One compliant payment link | Link lifecycle |
| Overdue invoice | Promise-to-pay | Commitment and due date |
| High value / blocked | Human escalation | Policy audit record |

## Run locally

Node.js 18+ is required. Razorpay Test Mode credentials are needed for live provider actions.

```powershell
# Terminal 1
cd backend
Copy-Item .env.example .env
npm.cmd install
npm.cmd start

# Terminal 2
cd frontend
npm.cmd install
npm.cmd run dev
```

Open `http://localhost:5173/dashboard`. The API runs at `http://localhost:8000`.

Configure `backend/.env`:

```env
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
POLLER_ENABLED=false
```

## Judge demo script

1. Open **Demo** and run **Checkout Drop-off** or **Failed Subscription Renewal**.
2. Open the incident and walk the seven-stage pipeline.
3. Show the decision, policy result, pre-execution check, and audit trail.
4. Open the provider-hosted Test Mode payment link.
5. Complete payment and show `payment_link.paid` change the incident to **Recovered**.
6. Run the Dashboard batch and inspect Recovery Lab metrics.
7. Run **B2B Overdue Invoice** and record a promise-to-pay with its due date.

## API highlights

| Endpoint | Purpose |
|---|---|
| `GET /dashboard/summary` | Risk, recovery, contacts, rates |
| `GET /incidents` | Incident list |
| `GET /incidents/:id` | Case and audit trace |
| `POST /incidents/:id/promise-to-pay` | Record promise or decline |
| `POST /webhooks/razorpay` | Signed provider-event ingestion |
| `POST /demo/trigger-scenario` | Safe demo case |
| `GET /recovery/impact` | Control/treatment impact |

## Verify

```powershell
cd backend; npm.cmd test
cd ../frontend; npm.cmd run build
```

## Honest boundaries

- Razorpay does not offer a generic API to re-charge any failed card. Stitch uses Payment Links as its real provider collection action; retry remains a provider-review job.
- SQLite jobs are durable for the prototype but should become a managed queue in production.
- Production messaging, authentication, tenancy, secret management, and compliance certification require external providers and deployment controls.

## Architecture

```text
React/Vite workspace → Node.js recovery API → policy + decision engine + SQLite audit/job store → Razorpay Test Mode
```
