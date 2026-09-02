# Stitch Backend

This folder contains the server-side Razorpay Test Mode integration. It is intentionally separate from `frontend/` so Razorpay secrets never enter the browser bundle.

## Setup

1. Copy `.env.example` to `.env`.
2. Put Razorpay **Test Mode** credentials in `.env`.
3. Configure a Razorpay webhook to point to `POST /webhooks/razorpay`.
4. Use the webhook secret configured in Razorpay for `RAZORPAY_WEBHOOK_SECRET`.
5. Start the API:

```powershell
cd backend
npm start
```

The API listens on `http://localhost:8000`.

## Implemented endpoints

- `GET /health`
- `GET /razorpay/status`
- `GET /razorpay/test-connection`
- `POST /razorpay/test-order`
- `GET /dashboard/summary`
- `GET /events`
- `POST /recovery/impact`
- `POST /demo/run-batch`
- `GET /incidents`
- `GET /incidents/:id`
- `GET /incidents/:id/trace`
- `POST /demo/simulate-manual-payment`
- `POST /webhooks/razorpay`

Set `POLLER_ENABLED=true` to poll Razorpay invoices for overdue records. The poller uses the same incident processor as webhook events and defaults to a five-minute interval.

From the Razorpay workspace, `Create ₹8,750 test payment` calls `POST /razorpay/test-order` and opens Razorpay Checkout with the public Test Mode key. Complete or fail the payment using Razorpay's test instruments; webhook events then enter Stitch through `/webhooks/razorpay`.

## Security behavior

- Webhooks are verified with HMAC-SHA256 against the raw request body.
- Duplicate `x-razorpay-event-id` values are ignored.
- Razorpay credentials are read only by the server.
- Pre-execution payment status is checked through Razorpay before a consequential action proceeds.
- The policy layer can block a proposed action and escalate it.

## Current limitation

The store is in memory for this first integration slice. Incidents and idempotency keys are lost when the process restarts. Replace `src/store.js` with PostgreSQL/Redis persistence before production use.
