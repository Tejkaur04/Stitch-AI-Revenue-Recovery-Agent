# Stitch AI — Hackathon Progress Log

A running log of every change made to transform the project from a polished simulation into a fully working, AI-powered revenue recovery orchestrator.

---

## Session 1 — Initial Analysis (2026-09-04)

### Project Audit (Starting State)
- Frontend: React + Vite, glassmorphism UI, premium design
- Backend: Node.js, raw HTTP server, no npm router, HMAC webhook verification
- **Critical gaps found:**
  1. "AI" was entirely `if/else` hardcoded strings — no real LLM
  2. All state was in-memory (`let incidents = []`) — lost on server restart
  3. Recovery Lab showed static hardcoded math, not real DB data
  4. Policy guardrails were hardcoded constants, not merchant-configurable
  5. Frontend used local `engine.js` simulation — never touched the backend
  6. README was the default Vite template (never updated)

---

## Change 1 — Install Real Dependencies (backend)
- Installed `@google/generative-ai` (Gemini LLM SDK)
- Installed `better-sqlite3` (fast, file-based SQL database, zero config)

---

## Change 2 — Replace In-Memory Store with SQLite (`backend/src/store.js`)
- Replaced `new Map()` and `[]` arrays with a `stitch.db` SQLite file
- Created three tables: `incidents`, `audit_events`, `processed_events`
- All `addIncident`, `updateIncident`, `getIncident`, `addAuditEvent` now write to disk
- `claimEventId` uses SQLite UNIQUE constraint for idempotency (no more in-memory Set)
- **Impact:** Server restarts no longer wipe all data. Judges can see persistent state.

---

## Change 3 — Wire Real Gemini LLM into Decision Engine (`backend/src/stitchEngine.js`)
- `decide()` is now async and calls `gemini-1.5-flash` with a structured prompt
- Prompt includes: customer info, amount (paise), failure reason, incident type
- Response is enforced as JSON: `{ type, reasoning }`
- `decided_by` field is set to `"gemini_flash"` when real LLM is used vs `"ai_engine"` for fallback
- Graceful fallback: if `GEMINI_API_KEY` is missing, the old rule-based logic runs so the demo never breaks
- **Impact:** AI decisions are now real, dynamic, and customer-context-aware. No more hardcoded strings.

---

## Change 4 — Add `/demo/trigger-scenario` API Endpoint (`backend/src/server.js`)
- New `POST /demo/trigger-scenario` endpoint accepts a `scenario` key
- Translates 5 scenarios (TEMP_FAILURE, CUSTOMER_PAID, POLICY_BLOCKED, EXPIRED_CARD, B2B_INVOICE) into real payment event payloads
- Calls `normalizeRazorpayEvent` → `createIncidentFromEvent` → `processIncident` — the real backend pipeline
- CUSTOMER_PAID scenario uses `setTimeout(5s)` to inject a manual payment mid-execution
- **Impact:** Demo Mode now triggers real backend incidents, not frontend simulation.

---

## Change 5 — Connect Frontend Demo Mode to Backend (`frontend/src/pages/DemoMode.jsx`)
- Removed `import { runScenario } from '../services/engine'`
- Now calls `razorpayApi.triggerScenario(scenarioKey)` and navigates to the returned `incident_id`
- **Impact:** Every "Run Scenario" click now creates a real DB record and calls Gemini.

---

## Change 6 — Add `triggerScenario` to Frontend API Service (`frontend/src/services/api.js`)
- Added `triggerScenario: scenario => request('/demo/trigger-scenario', { method: 'POST', body: ... })`
- Added `getLabResults: () => request('/recovery/impact')` (GET, reads real DB)

---

## Change 7 — Default Mode to `razorpay` (`frontend/src/context/ModeContext.jsx`)
- Changed default from `'simulation'` to `'razorpay'`
- Frontend now boots connected to the real backend by default
- Users can still switch to simulation mode manually

---

## Change 8 — Fix Syntax Error in `store.js` (backtick escaping bug)
- Tool artifact introduced literal `\`` escaped backticks in a template literal
- Fixed to proper `` ` `` — server booted cleanly after this fix

---

## Change 9 — Recovery Lab reads real DB data (`frontend/src/pages/RecoveryLab.jsx`)
- Removed `import { calculateLabResults } from '../services/engine'`
- `runExperiment()` is now `async` and calls `razorpayApi.getLabResults()`
- Maps API response to match existing UI shape (baseline = control, stitch = treatment)
- Button label changed to "Analyze Historical Data" with Database icon
- Loading text updated to reflect real DB analysis

---

## Change 10 — Add `GET /recovery/impact` Endpoint (`backend/src/server.js`)
- Reads all incidents from SQLite
- Maps to `{ group, amount_paise, outcome, contacts, recovery_cost_paise, policy_violation }`
- Passes to `calculateImpact()` which computes control vs treatment A/B split
- **Impact:** Recovery Lab now shows numbers from ACTUAL incidents run, not hardcoded math.

---

## Change 11 — Randomize A/B Group Assignment (`backend/src/stitchEngine.js`)
- Changed `group: 'treatment'` to `group: Math.random() > 0.3 ? 'treatment' : 'control'`
- 70% treatment / 30% control split on every new incident
- **Impact:** Recovery Lab will show real control vs treatment comparison as incidents accumulate.

---

## Change 12 — Add `merchant_settings` Table to SQLite (`backend/src/store.js`)
- Added `CREATE TABLE IF NOT EXISTS merchant_settings (key TEXT PRIMARY KEY, value TEXT)`
- Exported `getMerchantSettings()` — reads DB, merges with hardcoded defaults
- Exported `saveMerchantSettings(settings)` — upserts key-value pairs atomically

---

## Change 13 — Policy Engine reads from DB (`backend/src/policy.js`)
- `evaluatePolicy()` now accepts a `policy` object from the DB instead of `DEFAULT_POLICY`
- Server passes `getMerchantSettings()` into `processIncident` → `evaluatePolicy`
- **Impact:** Guardrail changes made in the UI now actually affect recovery decisions.

---

## Change 14 — Guardrails UI reads/writes real settings (`frontend/src/pages/Guardrails.jsx`)
- `useEffect` on load fetches `/merchant/settings` from backend
- Each toggle and number input is wired to local state
- "Save Guardrails" button calls `POST /merchant/settings` to persist to SQLite
- Shows save confirmation toast on success

---

## Change 15 — Add `/merchant/settings` endpoints (`backend/src/server.js`)
- `GET /merchant/settings` returns current DB settings
- `POST /merchant/settings` saves new settings to DB
- Both endpoints added to api.js frontend service

---

## Remaining Known Gaps (Future Work)
- [ ] No real durable job queue (currently uses synchronous execution / setTimeout)
- [ ] No real Razorpay retry API call (backend schedules retry but doesn't execute it via Razorpay)
- [ ] No holdout attribution logic for statistically valid lift measurement
- [ ] No PostgreSQL / Redis for production scale (SQLite is dev-only)
- [ ] README needs full rewrite with setup instructions
