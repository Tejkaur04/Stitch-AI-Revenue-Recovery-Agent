# API Contract — Razorpay AI Revenue Recovery

Base URL (local): `http://localhost:8000`
Money: always in paise (Razorpay's unit). Convert to ₹ only when displaying.
Time: ISO 8601, UTC.

---

## Important Razorpay Facts (verified from real docs)

- Real webhooks: `payment.failed`, `payment.authorized`, `payment.captured`, `order.paid`, `payment_link.paid`
- **No "invoice overdue" webhook exists.** You must poll `GET /v1/invoices` yourself and check `due_date`.
- **No "cart abandoned" webhook exists.** You must track Orders that never got paid within a timeout.
- Webhook signature: header `x-razorpay-signature` = HMAC-SHA256 of raw body, using your webhook secret.
- Event type is inside the body (`payload.event`), not in a header.

Because of this, you need **two ways in**, not one:
1. **Real webhooks** → for payment failures
2. **A scheduled poller (every few min)** → checks invoices and open orders, creates fake "events" for overdue invoices and abandoned carts

Both feed into the same `Incident` table below. Nothing downstream needs to know which one created it.

---

## Data Shapes

### Customer
```json
{
  "id": "cust_001",
  "name": "Rohit Sharma",
  "ltv_paise": 3500000,
  "successful_payments": 11,
  "total_payments": 12,
  "avg_delay_days": 1.2,
  "opted_out": false,
  "whatsapp_opt_in": true,
  "tier": "high"   // high | medium | low | new
}
```
`tier: "new"` = fewer than 2 past payments → skip AI, use safe default action.

### Incident
```json
{
  "id": "inc_0001",
  "type": "payment_failure",   // payment_failure | invoice_overdue | cart_abandonment
  "customer_id": "cust_001",
  "amount_paise": 499900,
  "status": "pending",         // pending | recovered | stopped | escalated | blocked
  "group": "treatment"         // control | treatment
}
```

### Action
```json
{
  "id": "act_0001",
  "incident_id": "inc_0001",
  "type": "retry",             // retry | send_link | reminder | escalate | stop | wait
  "decided_by": "ai_engine",   // rule_engine | ai_engine
  "status": "scheduled",       // scheduled | executed | killed | blocked_by_policy
  "kill_reason": null,         // e.g. "customer_paid_manually"
  "reasoning": "Temporary bank issue on a reliable payer — silent retry.",
  "outcome": null              // recovered | not_recovered | null
}
```

### Policy Violation (what got blocked)
```json
{
  "incident_id": "inc_0002",
  "attempted_action": "reminder",
  "blocked_reason": "quiet_hours"
}
```

---

## Endpoints

### Dashboard

**`GET /dashboard/summary`**
```json
{
  "total_at_risk_paise": 1800000000,
  "total_recovered_paise": 2300000000,
  "control_recovery_rate": 0.62,
  "treatment_recovery_rate": 0.78,
  "net_lift_paise": 500000000,
  "policy_violations_blocked": 37
}
```

### Incidents

**`GET /incidents?type=&status=&group=&page=1`**
→ paginated list for the table view

**`GET /incidents/{id}`**
→ everything for one incident in one call: incident + customer + what the baseline would've done + what AI actually did + why + outcome. Powers your "show one real decision" demo.

### Live Trace (your demo centerpiece)

**`GET /incidents/{id}/trace`**
```json
{
  "current_stage": "verification",
  "stages": [
    { "stage": "received", "status": "complete" },
    { "stage": "policy_check", "status": "complete" },
    { "stage": "verification", "status": "in_progress" },
    { "stage": "execution", "status": "pending" }
  ]
}
```

**`POST /demo/simulate-manual-payment`**
```json
{ "incident_id": "inc_0001" }
```
Fire this manually on stage to trigger "customer paid while retry was queued" — don't rely on a real webhook landing on cue.

### Ingestion (backend only, frontend never calls these)

**`POST /webhooks/razorpay`** — real Razorpay events land here. Verify signature → dedupe by `x-razorpay-event-id` → create/update Incident.

**Poller (scheduled job)** — checks overdue invoices and abandoned orders, creates Incidents the same way.

---

## 5 Decisions to Lock 

1. Empty dashboard (no data yet) → return all zeros, not nulls.
2. Pagination default: 50 per page, max 200.
3. All times in UTC in the API; convert to IST only in the UI.
4. `experiment_group` (control/treatment) is set once per customer, stored — never recalculated per incident.
5. `reasoning` for AI actions: plain sentence is fine — don't over-engineer structure.

