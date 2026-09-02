# STITCH AI Engine Model Report

**Project:** Stitch AI Revenue Recovery Agent  
**Report date:** 2026-09-01  
**Current implementation:** Frontend in-memory simulation engine plus a separate Razorpay Test Mode backend slice

## 1. Executive Summary

Stitch is currently implemented as a deterministic, context-aware recovery decision engine for Demo Mode. It models the behavior of an AI revenue recovery orchestrator:

1. Detect a payment or invoice risk.
2. Load customer context.
3. Generate a concise next-best-action recommendation.
4. Check the recommendation against policy.
5. Verify the current payment state.
6. Execute or schedule a bounded recovery action.
7. Observe the result and record an audit event.

The engine is not yet a machine-learning model or an API-backed production service. Its decisions are explicit scenario rules designed to make the recovery behavior reliable, explainable, and testable before Razorpay Test Mode integration.

## 2. Source Of Truth

The implementation lives in:

- `frontend/src/services/engine.js` - incidents, state transitions, scenarios, audit events, lab calculations
- `frontend/src/pages/DemoMode.jsx` - scenario selection and live workflow entry
- `frontend/src/pages/IncidentDetail.jsx` - incident state, decision, policy, and audit visualization
- `frontend/src/pages/RecoveryLab.jsx` - baseline versus Stitch experiment results
- `frontend/src/pages/MissionControl.jsx` - metrics derived from engine incidents
- `backend/src/server.js` - HTTP API, webhook verification, and contract routes
- `backend/src/razorpayAdapter.js` - server-side Razorpay Test Mode API client
- `backend/src/stitchEngine.js` - normalized webhook handling and server-side decision boundary
- `backend/src/store.js` - backend incident, audit, and idempotency store

Frontend state is held in module-level memory. Backend state is currently held in process memory as well; restarting either process clears its local state.

## 3. Internal Domain Model

### Incident

Each incident currently contains:

```js
{
  id,
  type,
  state,
  customer: {
    id,
    name,
    ltv,
    successful_payments,
    total_payments
  },
  amount_paise,
  reason,
  createdAt,
  updatedAt,
  aiDecision,
  policyResult,
  action
}
```

Money is stored in paise and converted to INR only in the UI.

### Audit Event

Each event contains:

```js
{
  id,
  timestamp,
  incidentId,
  event,
  actor,
  result,
  ...details
}
```

Actors currently include `SYSTEM`, `AI`, `POLICY`, `RAZORPAY`, and `MERCHANT`.

## 4. State Machine

The engine uses these states:

```text
DETECTED
  -> UNDERSTANDING
  -> DECIDING
  -> POLICY_CHECK
  -> VERIFYING
  -> EXECUTING
  -> RECOVERED
```

Safe terminal branches are:

```text
POLICY_CHECK -> ESCALATED
VERIFYING    -> STOPPED
```

The allowed transitions are enforced by `transitionState()`. Invalid transitions are rejected and logged as `INVALID_TRANSITION_REJECTED`.

Terminal meanings:

- `RECOVERED`: payment or recovery action succeeded
- `STOPPED`: further recovery was safely cancelled, usually because payment already arrived
- `ESCALATED`: policy prevented automated recovery and human action is required

## 5. Decision Model

The current decision layer uses observable customer and failure signals rather than arbitrary confidence scores.

### Temporary payment failure

Signals:

- Failure appears temporary
- Customer has a strong payment history
- No policy conflict is present

Recommendation:

```text
wait_and_retry
```

Policy result:

```text
ALLOWED
```

Outcome:

```text
Scheduled retry -> payment received -> RECOVERED
```

### Expired card

Signals:

- Failure reason is an expired card
- Customer has an established payment history

Recommendation:

```text
send_payment_method_update
```

Policy result:

```text
ALLOWED
```

Outcome:

```text
Update link sent -> payment method updated -> payment received -> RECOVERED
```

### Policy-blocked retry

Signals:

- AI recommends another retry
- Maximum retry limit has already been reached

Recommendation:

```text
retry_immediate
```

Policy result:

```text
BLOCKED
```

Outcome:

```text
No retry executed -> ESCALATED
```

### Customer already paid

Signals:

- Retry is queued
- A manual payment arrives before execution

Recommendation:

```text
wait_and_retry
```

Policy result:

```text
ALLOWED
```

Verification result:

```text
Payment already received
```

Outcome:

```text
Scheduled retry cancelled -> STOPPED
```

This is intentionally not marked as `RECOVERED` by the retry action. The customer payment is recorded, but Stitch stopped its own unnecessary action.

### B2B overdue invoice

Signals:

- Invoice is overdue
- Customer has a history of paying late

Recommendation:

```text
wait_and_request_promise_to_pay
```

Policy result:

```text
ALLOWED
```

Current outcome:

```text
Promise-to-pay request sent -> EXECUTING
```

A later promise or payment outcome is not yet implemented in the simulation.

## 6. Audit Trail Examples

A normal recovery produces events similar to:

```text
PAYMENT_FAILED                 SYSTEM/RAZORPAY
STATE_CHANGED                 SYSTEM: DETECTED -> UNDERSTANDING
STATE_CHANGED                 AI: UNDERSTANDING -> DECIDING
STATE_CHANGED                 POLICY: DECIDING -> POLICY_CHECK
STATE_CHANGED                 SYSTEM: POLICY_CHECK -> VERIFYING
STATE_CHANGED                 SYSTEM: VERIFYING -> EXECUTING
PAYMENT_RECEIVED              RAZORPAY
STATE_CHANGED                 SYSTEM: EXECUTING -> RECOVERED
```

The customer-paid safety flow produces:

```text
PAYMENT_FAILED
STATE_CHANGED
STATE_CHANGED with AI decision
STATE_CHANGED with ALLOWED policy result
STATE_CHANGED to EXECUTING
MANUAL_PAYMENT_RECEIVED
STATE_CHANGED to VERIFYING
SCHEDULED_RETRY_CANCELLED
STATE_CHANGED to STOPPED
```

## 7. Demo Execution Behavior

`runScenario()` creates the incident immediately and accepts an `onIncidentCreated` callback. Demo Mode uses that callback to navigate to Incident Detail immediately, so the user sees the live engine progression while the scenario continues asynchronously.

Current demo delays are presentation-oriented simulation delays between engine transitions. In a real adapter, these delays would be replaced by actual webhook, payment-status, queue, or executor results.

## 8. Recovery Lab Model

The lab uses one shared deterministic batch of eight cases. Each case contains:

- Amount at risk
- Whether baseline recovered the case
- Whether Stitch recovered the case
- Baseline customer-contact count
- Stitch customer-contact count

The engine calculates:

- Total revenue at risk
- Recovered revenue for each strategy
- Recovery rate for each strategy
- Customer contacts
- Incremental revenue
- Messages avoided
- Policy violations

The UI does not contain the performance result object. It requests the calculated result from `calculateLabResults()`.

This is a simulation benchmark, not a claim about production performance.

## 9. Architecture Boundary

The intended production flow is:

```text
Demo Adapter or Razorpay Adapter
              |
       Internal Event Format
              |
        Stitch Event Processor
              |
       Shared Decision Engine
              |
        Policy Engine
              |
      Verify -> Execute -> Observe
              |
             Audit
              |
              UI
```

The repository now implements the shared in-memory simulation portion and a Razorpay Test Mode backend boundary. It does not yet contain:

- A database or durable event store
- Durable database or Redis storage
- Real provider-side retry execution against Razorpay Test Mode
- Persistent guardrail configuration
- A machine-learning inference service

## 10. Backend Integration Slice

The separate `backend/` folder provides:

- `POST /webhooks/razorpay` with raw-body HMAC-SHA256 verification
- Duplicate event protection using `x-razorpay-event-id`
- Event normalization into the internal incident format
- Shared state-machine transition validation
- Pre-execution `getPaymentStatus()` verification through Razorpay
- Merchant policy checks for quiet hours, contact caps, retry caps, opt-out, and high-value approval
- Bounded action execution for wait, retry scheduling, reminders, and payment links
- Paid/captured webhook updates that resolve matching incidents
- Optional invoice poller for overdue invoice discovery
- Control/treatment impact calculations for recovered money, contacts, recovery cost, incremental lift, and policy violations
- Frontend synchronization with Razorpay incidents and backend audit events
- `GET /dashboard/summary`, incident list/detail, and trace endpoints
- `GET /razorpay/status`, `GET /events`, and `POST /recovery/impact`
- `POST /demo/simulate-manual-payment` for the race-condition demonstration

Configure `backend/.env` from `backend/.env.example` and use only `rzp_test_` credentials during development.

## 11. Safety Properties Already Present

- Legal state transitions are enforced
- Policy-blocked actions escalate instead of executing
- Customer-paid verification prevents a queued retry
- Terminal incidents cannot be transitioned further
- Audit events are generated for state changes and important actions
- Money is represented internally in paise
- Mission Control metrics are derived from current engine incidents

## 12. Known Gaps And Next Implementation Steps

Recommended order for future development:

1. Add unit tests for valid and invalid state transitions and webhook signatures.
2. Replace in-memory state with PostgreSQL and Redis-backed idempotency/queues.
3. Implement provider-specific retry execution only where the Razorpay resource supports it.
4. Persist merchant guardrails and approval decisions.
5. Complete the B2B promise-to-pay outcome flow and abandoned-order poller.
6. Add attribution holdout logic for trustworthy incremental lift measurement.
7. Replace scenario decision rules with a versioned inference service only after observable signals and policy decisions are fully logged.

## 13. Important Interpretation

The current Stitch engine should be described as an **explainable deterministic AI decision simulation**, not as a trained AI model. This is intentional: it makes the demo behavior reproducible and keeps policy authority separate from AI recommendations.

The production model should preserve this contract:

```text
AI proposes.
Policy decides.
Verification checks reality.
Executor performs only allowed actions.
Audit records everything.
```
