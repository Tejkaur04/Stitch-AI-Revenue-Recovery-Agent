# Stitch AI — UX Master Redesign Prompt

## Context
Stitch is an AI revenue recovery orchestrator for Razorpay merchants.
Tech stack: React + Vite, vanilla CSS, dark glassmorphism theme.
All pages live under a permanent left sidebar (220px wide).
Design tokens are in `frontend/src/index.css`.

---

## Core Problem Statement
The app looks like a generic AI SaaS template. Every page is a collection of
glass-bordered boxes containing text. There are no charts, no data visualizations,
no visual hierarchy, no brand identity, and no sense of spatial flow between pages.
A user opening the app for the first time does not know what to do or where to go.

---

## Page-By-Page Issues & Required Fixes

### 1. Sidebar (`frontend/src/components/Layout/Sidebar.jsx`)

**Current state:**
- Plain text links with icons. No context about where the user is in the product journey.
- No badge counts (e.g., "3 active incidents").
- No visual separation between navigation zones.

**Required fixes:**
- Add a live badge on the "Incidents" link showing the count of active (non-terminal) incidents, polled from the backend.
- Add a thin animated purple/blue gradient "active bar" on the left edge of the active link.
- Add a subtle separator line and a second nav section labelled "Tools" for Demo and Recovery Lab.
- The brand logo (currently a conic-gradient circle with a hollow inner circle) should be replaced with a stylized "S" lettermark in white on a purple-to-blue gradient background.

---

### 2. Dashboard (`frontend/src/pages/MissionControl.jsx`)

**Current state:**
- 4–6 metric numbers inside glass boxes. No charts. No trend data. No time axis.
- Below the metrics, there are two side-by-side panels ("Stitch Coverage" and "Policy Summary") that contain more plain numbers.
- The page looks identical to a skeleton loading state even when it has data.

**Required fixes:**

**A. Top metrics row — make numbers feel alive:**
- Each metric card must have a subtle sparkline (a tiny 7-point SVG line chart drawn from historical data) underneath the number.
- If no historical data exists, show a flat line rather than hiding the chart.
- Add a trend indicator (↑ green or ↓ red) next to each value compared to the previous period.

**B. Add a real Recovery Timeline chart:**
- Below the metric cards, add a full-width area chart showing "Revenue At Risk" vs "Revenue Recovered" over the last 10 incidents (x-axis = incident index, y-axis = paise converted to INR).
- Use Recharts (`npm install recharts` is already available or must be installed).
- Chart colors: at-risk = red (#EF4444 at 30% opacity fill, solid line), recovered = green (#10B981 at 30% opacity fill, solid line).
- The chart must have axis labels and a simple tooltip.

**C. Bottom section — replace plain panels with a live feed:**
- Replace the "Coverage" and "Policy" panels with a "Live Activity Feed" — a vertical scrollable list of the 8 most recent audit events from `GET /events`, showing: timestamp, actor badge (colored pill), event name, and incident ID as a clickable link.
- Auto-refreshes every 5 seconds.

---

### 3. Demo Mode (`frontend/src/pages/DemoMode.jsx`)

**Current state:**
- A grid of 5 scenario cards with a title, description, and "Run Scenario" button.
- Cards are glass panels with colored icons. Generic. No visual flow.
- After clicking "Run Scenario", nothing visible happens for 1–2 seconds while the API call completes. No loading state.

**Required fixes:**

**A. Add a numbered visual flow diagram above the cards:**
- A horizontal strip showing the 7-stage pipeline: Detected → Understanding → Deciding → Policy Check → Verifying → Executing → Recovered/Stopped/Escalated.
- Each stage is a small circle with a number and label, connected by thin lines.
- This sets context: the user understands they are about to watch this pipeline run live.

**B. Button states:**
- When "Run Scenario" is clicked: immediately disable all cards, show a spinner on the clicked card, and display the text "Creating incident…" instead of "Run Scenario".
- On error: show a red error message inside the card.

**C. Add scenario outcome tags:**
- Each card should have a small outcome tag in the top-right corner:
  - "Temp Failure" → tag: `RECOVERED`
  - "Customer Paid" → tag: `STOPPED`
  - "Policy Blocked" → tag: `ESCALATED`
  - "Expired Card" → tag: `RECOVERED`
  - "B2B Invoice" → tag: `EXECUTING`
- These are colored like the status badges used elsewhere in the app.

---

### 4. Incident Detail (`frontend/src/pages/IncidentDetail.jsx`)

**Current state:**
- The pipeline visualization is a horizontal row of text pill badges.
- The "AI Decision" panel says "Awaiting analysis…" for resolved incidents because it reads `incident.aiDecision.basis` but the backend stores the reasoning in `incident.action.reasoning`.
- The audit trail at the bottom is a plain table with no visual differentiation between actors.

**Required fixes:**

**A. Fix the AI Decision data mapping:**
- In `IncidentDetail.jsx`, the AI decision section reads `incident.aiDecision?.action` and `incident.aiDecision?.basis`.
- The backend stores this as `incident.action?.type` and `incident.action?.reasoning`.
- Fix the display to: `Recommended: {incident.action?.type}` and show `{incident.action?.reasoning}` as the basis.
- Also show a `decided_by` badge: if `incident.action?.decided_by === 'gemini_flash'`, show a purple "Gemini AI" badge; if it is `'ai_engine'` or `'fallback_due_to_error'`, show a grey "Rule Engine" badge.

**B. Make the pipeline visual dramatic:**
- Replace the current pill badges with a proper vertical timeline on the left side of the page.
- Each stage is a circle node connected by a vertical line.
- Completed stages: filled circle with a checkmark, green.
- Current stage: pulsing animated ring (CSS animation), white/purple.
- Future stages: hollow grey circle.
- Each node has the stage name and a timestamp from the audit trail if available.

**C. Audit trail styling:**
- Give each actor a distinct color:
  - SYSTEM → grey badge
  - AI → purple badge
  - POLICY → amber/yellow badge
  - RAZORPAY → blue badge
  - MERCHANT → green badge
- Show the event name in monospace font.
- Add a thin left border line connecting all entries vertically.

---

### 5. Incidents List (`frontend/src/pages/IncidentsList.jsx`)

**Current state:**
- A plain HTML table with no visual hierarchy.
- The search bar input does nothing — it is purely decorative.
- The "Filter" button does nothing.
- Status badges exist but are small and hard to read.

**Required fixes:**

**A. Wire up search:**
- Filter the local incidents array by `incident.customer?.name` or `incident.reason` or `incident.id` using a `useMemo` on the search string. No backend call needed.

**B. Status badge colors:**
- Add status badge colors if not already present:
  - `recovered` / `RECOVERED` → green
  - `escalated` / `ESCALATED` → red
  - `stopped` / `STOPPED` → amber
  - `detected`, `understanding`, `deciding`, etc. → blue/purple pulsing dot

**C. Row hover:**
- Row `cursor: pointer` and a subtle background highlight on hover (already may exist — verify it works).
- Clicking a row navigates to `/incidents/:id`.

---

### 6. Recovery Lab (`frontend/src/pages/RecoveryLab.jsx`)

**Current state:**
- Two side-by-side cards ("Baseline Strategy" vs "Stitch Strategy") with 3 plain metric numbers each.
- A single "STITCH WINS" badge that is hardcoded regardless of actual results.
- No chart of any kind.
- The "Analyze Historical Data" button fetches from the DB but shows nothing meaningful if there is only 1–2 incidents.

**Required fixes:**

**A. Fix the "STITCH WINS" badge:**
- Only show the "STITCH WINS" badge if `results.stitch.rate > results.baseline.rate`.
- If baseline wins, show "BASELINE LEADS" in amber.
- If equal, show "TIE" in grey.

**B. Add a comparison bar chart:**
- Below the two strategy cards, add a grouped bar chart (Recharts `BarChart`) with 3 groups:
  - Recovery Rate (%) — baseline bar vs stitch bar
  - Customer Contacts — baseline bar vs stitch bar
- Colors: baseline = grey (`#64748B`), stitch = purple (`#A855F7`).

**C. Empty state:**
- If `results.cases === 0`, show a clear empty state:
  - Icon: FlaskConical (lucide)
  - Message: "No historical incidents to analyze yet."
  - CTA button: "Run a Demo Scenario →" linking to `/demo`.
- Do not show the comparison cards or chart when there is no data.

---

### 7. Guardrails (`frontend/src/pages/Guardrails.jsx`)

**Current state:**
- Three glass-panel cards with policy settings.
- The "Save Guardrails" button works correctly (posts to backend).
- Layout is functional but visually plain.

**Required fixes:**

**A. Visual save confirmation:**
- When saved, the button should briefly animate: show a green checkmark icon instead of the save icon for 2 seconds, then revert.
- Already partially implemented — verify the `saved` state shows `<CheckCircle size={16} /> Saved to database`.

**B. Add inline validation:**
- If `maxRetries` is set to 0 or greater than 10, show an inline red error message below the input: "Must be between 1 and 10."
- If `maxContacts` is 0 or greater than 5, show: "Must be between 1 and 5."
- Disable the Save button while validation errors are present.

---

## Global / Cross-Cutting Issues

### Typography
- Page titles (`h1`) on inner pages are too large (2.75rem+). 
- Inner page `h1` should be 1.75rem, font-weight 700, with a small colored eyebrow label above it (e.g., "RECOVERY LAB" in 0.65rem uppercase tracking-widest, purple color) to create visual hierarchy.

### Empty states
- Every page must have a proper empty state when there is no data.
- Empty state structure: centered icon (64px, dim opacity), heading (1rem, text-secondary), subtext (0.875rem, text-muted), and a CTA button where applicable.
- Never show an empty table with no rows and no explanation.

### Loading states
- Every page that fetches from the backend must show a skeleton/shimmer loading state while the first fetch completes.
- A simple approach: `if (loading) return <div className="loading-state">Loading…</div>` is insufficient.
- Minimum: a pulsing grey placeholder card in the shape of the content.

### Error states
- If a fetch fails (backend offline), pages must show: a red-tinted alert box with the message "Could not connect to backend. Start the server and refresh." with a Retry button that re-runs the fetch.

### Page max-width
- All inner pages should have `max-width: 1100px; margin: 0 auto;` to prevent content from stretching across ultrawide screens.

### Consistent spacing
- All inner page headers should have the same structure:
  ```jsx
  <div className="page-header">
    <span className="page-eyebrow">SECTION NAME</span>
    <h1 className="page-title">Title of Page</h1>
    <p className="page-subtitle">One sentence describing what this page does.</p>
  </div>
  ```
- Define `.page-header`, `.page-eyebrow`, `.page-title`, `.page-subtitle` in `index.css`.

---

## Design Tokens to Add to `index.css`
```css
/* Page layout */
.page-header { margin-bottom: 2rem; display: flex; flex-direction: column; gap: 0.4rem; }
.page-eyebrow { font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: var(--accent-magenta); }
.page-title { font-size: 1.75rem; font-weight: 700; }
.page-subtitle { font-size: 0.9rem; color: var(--text-secondary); max-width: 600px; }

/* Empty state */
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 4rem 2rem; text-align: center; }
.empty-state-icon { opacity: 0.25; }
.empty-state-title { font-size: 1rem; font-weight: 600; color: var(--text-secondary); }
.empty-state-sub { font-size: 0.875rem; color: var(--text-muted); }

/* Status badges */
.status-badge { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.25rem 0.65rem; border-radius: 100px; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
.status-recovered, .status-RECOVERED { background: rgba(16,185,129,0.12); color: #10B981; border: 1px solid rgba(16,185,129,0.25); }
.status-escalated, .status-ESCALATED { background: rgba(239,68,68,0.12); color: #EF4444; border: 1px solid rgba(239,68,68,0.25); }
.status-stopped, .status-STOPPED { background: rgba(245,158,11,0.12); color: #F59E0B; border: 1px solid rgba(245,158,11,0.25); }
.status-executing, .status-EXECUTING { background: rgba(59,130,246,0.12); color: #3B82F6; border: 1px solid rgba(59,130,246,0.25); }
.status-detecting, .status-DETECTED,
.status-understanding, .status-deciding,
.status-policy_check, .status-verifying { background: rgba(168,85,247,0.1); color: #c084fc; border: 1px solid rgba(168,85,247,0.2); }
```

---

## Priority Order
1. Fix `IncidentDetail` AI decision data mapping (5 min, highest visibility)
2. Add page-header eyebrow structure to all pages (15 min, makes everything feel consistent)
3. Add empty states to Recovery Lab and Incidents List (15 min)
4. Add Recharts area chart to Dashboard (30 min, biggest wow factor)
5. Add pipeline vertical timeline to IncidentDetail (30 min)
6. Wire search in IncidentsList (10 min)
7. Fix "STITCH WINS" badge logic in Recovery Lab (5 min)
8. Add incident count badge to Sidebar (10 min)
