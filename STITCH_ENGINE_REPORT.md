# STITCH AI Engine Model Report

**Project:** Stitch AI Revenue Recovery Agent  
**Report date:** 2026-09-01  
**Current implementation:** Frontend in-memory simulation engine

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

State is held in module-level memory. Refreshing the browser clears incidents and events.

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

The current repository implements the shared in-memory simulation portion. It does not yet contain:

- A backend service
- A database or durable event store
- A real `RazorpayAdapter`
- Webhook signature verification
- Webhook idempotency using Razorpay event IDs
- Invoice and open-order polling
- Real action execution against Razorpay Test Mode
- Persistent guardrail configuration
- A machine-learning inference service

## 10. Safety Properties Already Present

- Legal state transitions are enforced
- Policy-blocked actions escalate instead of executing
- Customer-paid verification prevents a queued retry
- Terminal incidents cannot be transitioned further
- Audit events are generated for state changes and important actions
- Money is represented internally in paise
- Mission Control metrics are derived from current engine incidents

## 11. Known Gaps And Next Implementation Steps

Recommended order for future development:

1. Add unit tests for valid and invalid state transitions.
2. Extract `MockRazorpayAdapter` behind the current scenario behavior.
3. Add a backend with durable incident and audit storage.
4. Implement the Razorpay adapter using Test Mode credentials only.
5. Verify webhook signatures from the raw request body.
6. Deduplicate webhook events by Razorpay event ID.
7. Add current payment-status verification before consequential actions.
8. Persist merchant guardrails and connect them to policy evaluation.
9. Complete the B2B promise-to-pay outcome flow.
10. Replace scenario decision rules with a versioned inference service only after observable signals and policy decisions are fully logged.

## 12. Important Interpretation

The current Stitch engine should be described as an **explainable deterministic AI decision simulation**, not as a trained AI model. This is intentional: it makes the demo behavior reproducible and keeps policy authority separate from AI recommendations.

The production model should preserve this contract:

```text
AI proposes.
Policy decides.
Verification checks reality.
Executor performs only allowed actions.
Audit records everything.
```
