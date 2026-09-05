# Stitch Operator Runbook

This guide explains how to run and operate Stitch in its intended **Razorpay Test Mode / hackathon prototype** environment.

## 1. Start the application

Open two terminals from the repository root.

```powershell
# API terminal
cd backend
npm.cmd start
```

```powershell
# Web terminal
cd frontend
npm.cmd run dev
```

Open the workspace at `http://localhost:5173/dashboard`.

Do not open pages through port `8000`; that is the JSON API server. For example, an incident page is opened at:

```text
http://localhost:5173/incidents/<incident-id>
```

## 2. Configure Test Mode safely

In `backend/.env`, configure Razorpay **Test Mode** values only:

```env
PORT=8000
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
CORS_ORIGIN=http://localhost:5173
POLLER_ENABLED=false
```

Never add live Razorpay keys to this hackathon environment. The `.env` file must not be committed or shared.

To receive live Test Mode provider events, expose the local backend through a secure tunnel and configure the Razorpay webhook destination as:

```text
POST https://<your-tunnel-domain>/webhooks/razorpay
```

Stitch rejects webhooks that do not carry a valid Razorpay signature.

## 3. Daily operating workflow

### Review the Dashboard

The Dashboard shows:

- revenue at risk
- confirmed recovered revenue
- recovery rate
- customer contact count
- recent audit events

Use **Run 10-case recovery batch** only for a presentation or test dataset. It creates synthetic cases and must not be presented as live merchant data.

### Work the Incidents queue

Open **Incidents** and filter by state.

| State | Meaning | Operator action |
|---|---|---|
| Detected / Understanding / Deciding | Agent is processing context | Wait for pipeline progress |
| Policy Check | Guardrails are being evaluated | Review if the case is high value or restricted |
| Executing | A bounded action is scheduled or running | Check its audit trail |
| Recovered | Payment confirmed by provider | No action; retain evidence |
| Stopped | Recovery was intentionally cancelled | Confirm stop reason |
| Escalated | Automation cannot proceed safely | Human review required |

### Read a case before acting

Each Incident Detail page provides:

1. the current seven-stage pipeline position;
2. revenue amount and customer context;
3. the AI/recovery decision and its reasoning;
4. the guardrail result;
5. provider payment-link evidence when one was created; and
6. an ordered audit log.

Treat the audit log as the source of truth. Do not infer that an amount is recovered until the case state is **Recovered** and the log records provider payment confirmation.

## 4. Recovery action procedures

### Payment Link recovery

For link-eligible cases, Stitch creates a provider-hosted Razorpay Test Mode payment link. The Incident page exposes **Open payment link**.

1. Open the link only to validate the Test Mode flow.
2. Complete the payment using a Razorpay Test Mode instrument.
3. Wait for the signed `payment_link.paid` webhook.
4. Confirm that the original incident changes to **Recovered**.
5. Confirm the audit trail records `PAYMENT_LINK_CREATED` followed by `PAYMENT_RECEIVED`.

Do not manually mark the case recovered just because a link was created or opened.

### Promise-to-pay recovery

For overdue invoice cases, Stitch can recommend **promise_to_pay**.

1. Contact the customer only through an approved, consented channel outside this prototype.
2. If the customer commits to payment, choose the due date/time on the Incident page and select **Record promise**.
3. If the customer declines, choose **Declined**. This creates an auditable exception for human follow-up.
4. Check the audit trail for `PROMISE_TO_PAY_CAPTURED` or `PROMISE_TO_PAY_DECLINED`.

The prototype records the workflow and schedules a durable due-date job. It does not send SMS, WhatsApp, or email itself.

### Stopped recovery

A recovery can stop because payment was already received, customer communication is not allowed, or policy blocks the action. Do not re-run a stopped case without a new provider event and a clear business justification.

## 5. Guardrail administration

Open **Guardrails** to configure the merchant controls:

- Maximum retries
- Maximum outreach per incident
- Quiet hours
- Consent-required outreach
- High-value approval threshold
- Attribution window used by Recovery Lab

After changing a setting, select **Save Guardrails**. Settings are persisted in SQLite and affect new decisions immediately.

Recommended Test Mode defaults:

| Setting | Recommended value |
|---|---|
| Maximum retries | 3 |
| Max outreach | 1 |
| Quiet hours | Enabled |
| Consent required | Enabled |
| High-value approval | Enabled |
| Attribution window | 14 days |

## 6. Measuring recovery impact

Open **Recovery Lab** and choose **Analyze Historical Data**.

The lab compares persistent customer cohorts:

- **Control:** baseline recovery strategy
- **Treatment:** Stitch strategy

Only terminal, attributed outcomes belong in the lift calculation. The **Awaiting Attribution** count means cases are still open and should not be used as recovered revenue evidence.

When presenting results, report all of these together:

- at-risk revenue
- provider-confirmed recovered revenue
- recovery rate
- treatment/control difference
- customer contacts
- blocked policy actions
- awaiting-attribution count

## 7. Troubleshooting

| Symptom | Check |
|---|---|
| Browser shows JSON or `Not found` | Use `localhost:5173`, not `localhost:8000`, for the UI |
| Incident page returns a 500 | Restart the backend and verify `npm.cmd test` passes |
| Payment link is not created | Verify Test Mode keys, valid amount, policy status, and backend logs |
| Link is paid but case is not recovered | Verify webhook URL, webhook secret, and `payment_link.paid` delivery in Razorpay |
| API is offline in the sidebar | Start `backend` on port 8000 and check CORS origin |
| Recovery is escalated | Read the guardrail audit event; do not bypass the policy silently |

## 8. Safe operating boundaries

- This is not a production collections system.
- Do not use real customer data or production keys.
- Do not contact customers from an unapproved channel.
- Do not claim recovery until a provider-confirmed event is recorded.
- Do not use synthetic demo-batch outcomes in business reporting.
- Keep a human responsible for high-value, disputed, declined, or policy-blocked cases.

## 9. Pre-demo checklist

- [ ] Backend starts successfully
- [ ] Frontend opens at `http://localhost:5173`
- [ ] Test Mode credentials are configured
- [ ] Webhook secret is configured if using a real provider payment link
- [ ] Demo Mode can create an incident
- [ ] Incident Detail shows audit events
- [ ] Recovery Lab can analyze available cases
- [ ] No production credentials or customer data are visible on screen
