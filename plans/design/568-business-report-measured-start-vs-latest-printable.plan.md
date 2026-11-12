# Plan 568 — Business report: where the business stands and how it moved since it started with FoodVibe

Status: draft
Track: design
Depends-on: 567
Snapshot: 05741afd08ec936d1aec6f8d9a53631141905f93

## Problem Statement
Dandan onboards a business and then needs to show the owner — and advise them on the culinary side (food cost,
pricing, what closes and what does not) — with numbers FoodVibe measured (FD-14, D15, D16, map row 15c). The dashboard
(plan 447) shows one period at a time against the owner's estimate; nothing shows the business's own first period
beside its latest one, the monthly trend, or what to look at next. This plan adds one report page, `/report`, that
works with no baseline at all, shows the owner's estimate only as a separate labelled column, refuses to show a number
built on fewer than 3 events, and prints on one A4 page. The platform admin opens the same page for any business (the
report holds no client names or phones).

Verified on `origin/main` (5702f6d1, 2026-11-10):
- `server/routes/stats.js` (45 lines): `GET /api/v1/stats/business?period=30|90|all` → `shapeStats` (`server/services/business-stats.js`, 160 lines; `eventsPipeline` holds the revenue rule `closing.actualRevenue` → `planSnapshot.plannedRevenue` → `pricing.revenue`, and the accuracy rule actual % − `planSnapshot.plannedProfitPct`). Owner check there: `can(req.user, 'editMoney', { type: 'menuEvents' }).ok`.
- `menuEvents` fields (`shared/schemas/entities/menu-event.schema.ts`): `createdAt`, `guestCount`, `pricing { foodCost, revenue, profit, profitPct|null, partial, computedAt }`, `planSnapshot { suppliers[{ supplierId, plannedCost }], extraCosts, plannedRevenue, plannedProfit, plannedProfitPct }`, `closing { suppliers[{ supplierId, name, planned, actualPaid? }], actualExtraCosts?, actualRevenue?, finishedAt? }`, `stage`, `closedAt`, `notClosedAt`, `notClosedReason` (`price | date_taken | no_reply | other`, `event-stage.ts:6`), `legacy`.
- `business.settings` (`business.schema.ts`): `profitTargetPct` (default 25), `overrunThresholdPct` (default 10) — `BUSINESS_SETTINGS_DEFAULTS`.
- Platform admin = `req.user.isPlatformAdmin === true` (`server/middleware/auth.js` `isPlatformAdmin`). `/platform` (`src/app/pages/platform-dashboard/`) has a business table with no per-row link today.
- Client: `BusinessStatsService` (`src/app/core/services/business-stats.service.ts`), dashboard card `src/app/pages/dashboard/components/business-performance/`. No chart library in `package.json`. Global print rules in `src/styles.scss` (from line 1845) hide `body *` and re-show printable containers — a report needs its own append there.
- Icons registered: `printer`, `trending-up`, `trending-down`, `minus`. `usageDays` holds active days (plan 430).
- Plan 567 adds the kitchen baseline fields and `BASELINE_CARD_FIELDS` / `BASELINE_KITCHEN_FIELDS` in `business.schema.ts`.

## Goals & Success Criteria
**Primary:** an owner opens `/report`, sees "מאז שהתחלנו" (first 30 days vs latest 30 days), a monthly trend and up to
three findings, all from measured data, and prints it on one A4 page.

- [auto] `pnpm run test:server` passes, including `server/test/business-report.test.js`:
  - a fixture of 8 events over 3 months returns the expected `series` (one point per month for every metric), `start` / `latest` values with `changePct` / `changePts`, and the expected `findings` keys in priority order;
  - a rate metric built on 2 events in a window returns `enough: false` and `value: null`;
  - no baseline → `baseline: null` and status 200; a baseline with `foodCostPct: 32` → `baseline.foodCostPct = 32`;
  - staff → 403; an owner passing another business's `businessId` → 403; platform admin with `businessId` → 200 with that business's numbers; `months=5` → 400;
  - legacy, soft-deleted and other-business events never count;
  - the response holds no client name or phone (no key `clientName`, `clientPhone`, `guestName`, `guestPhone` anywhere in the JSON).
- [auto] `pnpm run test:ci` passes, including `report.page.spec.ts` (an `enough: false` metric renders "אין מספיק נתונים"; no baseline → no "לפני FoodVibe" column; a metric with a baseline shows it with the label "הערכת בעל העסק").
- [ui] On `/report`, after seeding one event for the QA business, the strip titled "מאז שהתחלנו" is visible (`e2e/ui/568-1.spec.ts`).
- [ui] On the dashboard, the performance card's link "לדוח המלא" opens `/report` (`e2e/ui/568-2.spec.ts`).
- [auto] `pnpm run build` passes and the initial bundle does not grow (the page is a lazy route).
- [auto] `pnpm run lint`, `pnpm --dir server run lint`, `pnpm run lint:icons` exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Dandan prints `/report` for a seeded business: one A4 page, RTL, readable, measured numbers clearly apart from the owner's estimates.

## Execution Mode
- Parallel: no — 567, 568 and 559 all edit `server/services/business-stats.js` / stats code; the platform page is also edited by 532 (in run-522 now), 566 and 559 — merge 568 after 532, and not in the same window as 566.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/breadcrumbs.md
src/app/shared/breadcrumbs.md
src/app/core/models/breadcrumbs.md
src/app/core/services/breadcrumbs.md
report.page.spec.ts
server/services/business-report.js
server/constants/report.js
server/routes/stats.js
server/test/business-report.test.js
src/app/core/models/business-report.model.ts
src/app/core/services/business-stats.service.ts
src/app/core/services/business-stats.service.spec.ts
src/app/pages/report/**
src/app/pages/dashboard/components/business-performance/**
src/app/pages/platform-dashboard/platform-dashboard.page.html
src/app/pages/platform-dashboard/platform-dashboard.page.ts
src/app/pages/platform-dashboard/platform-dashboard.page.spec.ts
src/app/core/services/http-storage.adapter.ts
public/assets/data/dictionary.json
e2e/ui/568-1.spec.ts
e2e/ui/568-2.spec.ts
docs/agent/standards-backend.md
src/app/pages/breadcrumbs.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — the owner reads only their business (`scopeFilter`); the platform admin reads aggregate numbers of a named business, as `GET /api/v1/admin/businesses` already does; no item is returned, staff get 403.
- INV-2: preserves — `business-report.js` is a read-only service; every query is scoped to one `businessId` with the `LIVE` filter.

## Reuse Check

- `server/services/business-report.js` `buildReport` — family: none — rung: 4 — why: server service; a new file beside `business-stats.js` because the report (monthly series, windows, findings) would push that file past review size; it reuses `jerusalemDate` and the revenue / accuracy rules by importing them, not by copying.
- `server/constants/report.js` (metric list, thresholds, finding rules) — family: none — rung: 4 — why: one tested place for the numbers the brief asks to be constants.
- `/report` page — family: none — rung: 4 — why: a new screen; built from `.c-glass-panel`, `.c-chip-group` + `.c-chip--toggle` period radios (the same markup as the performance card), `app-empty-state` for "no events yet".
- Period picker — family: chip — rung: 1 — why: `c-chip-group` radiogroup, as in `business-performance.component.html`.
- Inline trend bars — family: engine-classes — rung: 4 — why: no chart family or library exists; a `div` whose `inline-size` is the value's share of the row maximum, in the page stylesheet only (no new `.c-*` class).
- "No events yet" state — family: empty-state — rung: 1 — why: `app-empty-state` as is.
- `BusinessStatsService.getReport` — family: entity-data-service — rung: 3 — why: one more read method on the existing stats service, no new service.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want to see my first month in FoodVibe beside my latest month so that I know, from numbers nobody dressed up, whether I improved.
- As a chef, I want to see my average food cost and profit per guest month by month so that I can price the next event better.
- As an owner, I want the report to point at the two or three things worth fixing so that I know where to start.
- As the platform admin, I want to open any business's report from `/platform` so that I can advise the owner at the onboarding sitting.

## Functional Requirements

### Must Have (P0)
- [ ] **Route** `GET /api/v1/stats/report?months=3|6|12` (default 6) in `server/routes/stats.js`, `verifyToken`:
  - owner (`can(req.user, 'editMoney', { type: 'menuEvents' }).ok`) → own business; staff → 403 `{ error: 'Owner only' }`;
  - `?businessId=<id>`: allowed only when `isPlatformAdmin(req)`; any other caller → 403; an unknown id → 404;
  - `months` not in the list → 400.
  - Queries scoped by `businessId` + `LIVE` + `legacy: { $ne: true }`; events fetched with a projection of only the fields listed in the Problem Statement, limited to those with `createdAt`, `closedAt`, `notClosedAt` or `closing.finishedAt` inside the window, plus one query for the business's first event `createdAt`.
- [ ] **Metrics** (closed list `REPORT_METRICS` in `server/constants/report.js`), each per calendar month (Asia/Jerusalem, `jerusalemDate`):
  - counts (always `enough: true`): `inquiries` (events created), `eventsClosed` (`closedAt` in month), `activeDays` (`usageDays` dates);
  - money: `revenue` (events closed in month, the existing revenue rule — imported from `business-stats.js`, exported there if needed);
  - rates (need `REPORT_MIN_EVENTS = 3` events in the window, else `value: null, enough: false`): `closeRatePct` (closed ÷ (closed + not closed)), `revenuePerEvent`, `foodCostPct` (mean of `pricing.foodCost ÷ pricing.revenue × 100` over events closed in the window with `pricing.partial !== true` and revenue > 0), `profitPct` (mean `pricing.profitPct`, same set, non-null), `profitPerGuest` (Σ `pricing.profit` ÷ Σ `guestCount`, same set), `pricingAccuracyPts` (finished events: actual profit % − `planSnapshot.plannedProfitPct`, the existing rule), `supplierOverrunPct` (finished events: (Σ `actualPaid` − Σ `planned`) ÷ Σ `planned` × 100 over `closing.suppliers` rows that have `actualPaid`), `partialPricesPct` (share of events closed in the window with `pricing.partial === true`).
- [ ] **Response**: `{ months, businessName, firstEventAt | null, series: { [metric]: [{ month: 'YYYY-MM', value, enough, n }] }, start: { from, to, metrics }, latest: { from, to, metrics }, comparable: boolean, change: { [metric]: { changePct?, changePts? } }, baseline: { [metric]: number } | null, estimatesOnly: { [field]: number } | null, findings: [{ key, value, evidenceCount }] }`.
  - `start` = the 30 days from `firstEventAt`; `latest` = the last 30 days to now. `comparable` = `firstEventAt` is at least 60 days ago; when false the UI shows start only. `changePct` for counts and money, `changePts` for `%` metrics; null when either side is not `enough`.
  - `baseline` maps the stored baseline to metric keys: `inquiriesPerMonth → inquiries`, `eventsClosedPerMonth → eventsClosed`, `avgRevenuePerEvent → revenuePerEvent`, `estProfitPct → profitPct`, `foodCostPct → foodCostPct`, `supplierOverrunPct → supplierOverrunPct`; only filled fields; `null` when none. `estimatesOnly` = the other filled kitchen fields (`hoursPerWeekOrdering`, `hoursPerWeekQuotes`, `wastePct`) that have no measured twin; front desk fields are left to plan 559.
  - Nothing in the response names a client.
- [ ] **Findings** (rule-based, no AI call; at most 3; evaluated over the selected `months`; priority order as listed; thresholds in `server/constants/report.js`):
  1. `below_profit_target` — events closed with `pricing.profitPct` below the business's `profitTargetPct`; shown when ≥ 2; `value` = count, `evidenceCount` = events with a profit %.
  2. `closed_with_partial_prices` — events closed with `pricing.partial === true`; shown when ≥ 1.
  3. `top_not_closed_reason` — the most common `notClosedReason`; shown when it has ≥ 2; `value` = the reason key.
  4. `top_supplier_overrun` — the supplier (by `supplierId`, `name` from `closing.suppliers`) with the largest overrun % above `overrunThresholdPct`, over ≥ 2 finished events; `value = { name, overrunPct }`.
- [ ] **Client**: `BusinessReport` type in `src/app/core/models/business-report.model.ts`; `BusinessStatsService.getReport(months, businessId?)`; `API.stats('report')` used through `http-storage.adapter.ts`.
- [ ] **Page** `src/app/pages/report/report.page.ts` (`app-report-page`), lazy route `{ path: 'report', loadComponent, canActivate: [authGuard] }` appended to `app.routes.ts`. Reads `?businessId=` and `?months=` from the query. Layout, top to bottom:
  1. Header: `report_title` + business name; period radios 3 / 6 / 12 months (`c-chip-group`); a print button (`printer` icon, `report_print`) that calls `window.print()`.
  2. "מאז שהתחלנו" strip: one tile per metric — start value, latest value, change with `trending-up` / `trending-down` / `minus`; not-`enough` → "אין מספיק נתונים". When `comparable` is false: start only, with `report_too_early`.
  3. "לפני FoodVibe" column per tile, only for metrics in `baseline`, label "הערכת בעל העסק", visually lighter than measured numbers (muted colour, smaller type). Estimates with no measured twin listed under the strip in one muted line.
  4. Monthly trend: one row per metric, a month per cell, an inline bar whose length is the value's share of the row's largest value, the number beside it; not-`enough` cells show "—".
  5. Findings: up to 3 `.c-glass-panel` cards with a Hebrew sentence per key and its evidence count.
  6. No events at all → `app-empty-state` with `report_empty`.
  - Server 403 → the page shows `report_owner_only`.
  - Print: `report.page.scss` `@media print` lays the page out for one A4 sheet (no period radios, no print button, trend limited to the selected months); `src/styles.scss` gets one appended print block that makes `app-report-page` and its subtree visible, like the existing recipe and menu blocks.
- [ ] Dashboard: `business-performance` card gets a link "לדוח המלא" → `/report` (owner only, the card is already owner-only).
- [ ] `/platform`: each business row gets a link "דוח" → `/report?businessId=<row._id>`.
- [ ] `docs/agent/standards-backend.md` §5 row for `GET /api/v1/stats/report`; `src/app/pages/breadcrumbs.md` row for `report/`.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL, logical properties only; numbers `dir="ltr"`; money through the existing rounding/format helpers (`src/app/core/engine/rounding.ts`).
- The report looks like a FoodVibe page (it is for the owner, not for customers). Measured numbers are the strong element; estimates are always lighter and labelled.
- New dictionary keys (Hebrew values):
  - `report_title`: "דוח העסק"
  - `report_since_start`: "מאז שהתחלנו"
  - `report_first_period`: "30 הימים הראשונים"
  - `report_latest_period`: "30 הימים האחרונים"
  - `report_before_foodvibe`: "לפני FoodVibe"
  - `report_owner_estimate`: "הערכת בעל העסק"
  - `report_not_enough_data`: "אין מספיק נתונים"
  - `report_too_early`: "עוד מוקדם להשוואה – נציג את התקופה הראשונה בינתיים"
  - `report_trend_title`: "מגמה חודשית"
  - `report_findings_title`: "כדאי לבדוק"
  - `report_print`: "הדפסה"
  - `report_empty`: "עוד אין אירועים – הדוח יתמלא מהאירוע הראשון"
  - `report_owner_only`: "הדוח זמין לבעל העסק בלבד"
  - `report_months_3`: "3 חודשים", `report_months_6`: "6 חודשים", `report_months_12`: "12 חודשים"
  - `report_open_full`: "לדוח המלא"
  - `platform_col_report`: "דוח"
  - metric labels: `report_metric_inquiries`: "פניות", `report_metric_events_closed`: "אירועים שנסגרו", `report_metric_close_rate_pct`: "אחוז סגירה", `report_metric_revenue`: "הכנסות", `report_metric_revenue_per_event`: "הכנסה לאירוע", `report_metric_food_cost_pct`: "עלות מזון (%)", `report_metric_profit_pct`: "רווח (%)", `report_metric_profit_per_guest`: "רווח לסועד", `report_metric_pricing_accuracy_pts`: "דיוק תמחור (נק׳)", `report_metric_supplier_overrun_pct`: "חריגת ספקים (%)", `report_metric_partial_prices_pct`: "אירועים עם מחירים חסרים (%)", `report_metric_active_days`: "ימי שימוש"
  - findings: `report_finding_below_profit_target`: "{{n}} אירועים נסגרו מתחת ליעד הרווח", `report_finding_closed_with_partial_prices`: "{{n}} אירועים נסגרו עם מחירים חסרים – העלות בהם לא מלאה", `report_finding_top_not_closed_reason`: "הסיבה הנפוצה לאירוע שלא נסגר: {{reason}}", `report_finding_top_supplier_overrun`: "הספק {{name}} חרג ב-{{pct}}% מהמתוכנן"
  - The worker checks the dictionary's interpolation form (`translatePipe` params) and follows it; the not-closed reason label uses the existing reason keys.
- Icons: `printer`, `trending-up`, `trending-down`, `minus` (registered).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Pin the report numbers with a fixture before writing the code — 8 events over 3 months, expected series, windows, findings, the 2-event case, no-baseline case, access cases — server/test/business-report.test.js
- [x] A2: Compute the report on the server from measured events only — metric list and thresholds, monthly series, start and latest windows, baseline mapping, rule findings — server/services/business-report.js, server/constants/report.js
- [x] A3: Serve the report to the owner and to the platform admin only — GET /stats/report with months, businessId and the 400/403/404 answers — server/routes/stats.js
- [x] A4: Let the app fetch the report — model type, getReport on the stats service, API path — src/app/core/models/business-report.model.ts, src/app/core/services/business-stats.service.ts, src/app/core/services/http-storage.adapter.ts
- [x] A5: Build the report page with the since-we-started strip, estimates column, trend and findings — lazy route, period radios, not-enough and too-early states, empty state, dictionary keys — src/app/pages/report/**, src/app/app.routes.ts, public/assets/data/dictionary.json
- [x] A6: Make the report print on one A4 page — component print layout and one appended global print block — src/app/pages/report/report.page.scss, src/styles.scss
- [x] A7: Link the report from the dashboard card and from each business on the platform page — business-performance link, platform row link — src/app/pages/dashboard/components/business-performance/**, src/app/pages/platform-dashboard/platform-dashboard.page.html
- [x] A8: Test the page and the two entry points, update the docs, run every check — report.page.spec.ts, two e2e cards, standards-backend row, breadcrumbs; test:server, test:ci, build, lint, lint:icons, log-query — e2e/ui/568-1.spec.ts, e2e/ui/568-2.spec.ts, docs/agent/standards-backend.md, src/app/pages/breadcrumbs.md

## Technical Considerations
- Dependencies: plan 567 (kitchen baseline fields and field-list constants). `business-stats.js` may need to export its revenue / accuracy expressions so the report reuses them — exporting is allowed; behaviour of `shapeStats` must not change (`server/test/business-stats.test.js` stays green).
- New files needed: `server/services/business-report.js`, `server/constants/report.js`, `server/test/business-report.test.js`, `src/app/core/models/business-report.model.ts`, `src/app/pages/report/report.page.{ts,html,scss,spec.ts}`, `e2e/ui/568-1.spec.ts`, `e2e/ui/568-2.spec.ts`.
- Model changes: new `BusinessReport` client type.
- Backend / API: new `GET /api/v1/stats/report`.
- Auth and validation: owner of the business, or platform admin with `businessId`; `months` from a closed list.
- Security surface: one new read route; returns only aggregates and supplier names (business data, not personal data); no client name or phone (tested).
- Data / migration: none. Volume: one business's events in at most 12 months, projected — fine on Atlas M0.
- e2e: specs sign in with `signInQa` (`e2e/helpers/qa-session.ts`) and seed events with `createQaEvent`; `568-1` seeds one event with `createQaEvent` (an inquiry — enough for `firstEventAt`, so the strip shows instead of the empty state) and deletes it with `deleteQaEvent` after; closed-event numbers are covered by the server fixture, not by e2e.
- Project checks: log-query item; dictionary keys named; icons named; Reuse Check filled; lazy route (bundle budget).

## Out of Scope
- Front desk numbers in the report (plan 559 adds that block to this page).
- Menu engineering per dish, waste capture at closing, labour cost, AI-written advice, cross-business benchmarks (FD-14 "not in this track").
- CSV or PDF export (print only).
- Any change to the dashboard cards' numbers.

## Critical Questions
- none

## Execution Notes
- Map row 15c (renumbered +2: old 566 → 568). Decisions made while drafting (Planner): counts are never hidden by the 3-event rule — only rates and averages are (principle 3 applies to numbers built from events); `comparable` needs 60 days since the first event so the two 30-day windows do not overlap; `/platform` had no business drill-down, so the report is opened from a per-row link.
- Evidence: `pnpm run build` -> exit 0 (initial total 561.73 kB; report is a lazy route); `pnpm run lint` -> 0 errors; `pnpm run lint:icons` -> exit 0; `pnpm run test:ci` -> TOTAL 1991 SUCCESS (incl. report.page.spec.ts); `pnpm run test:server` -> exit 0 (business-report.test.js 10 tests, business-stats.test.js unchanged and green); override-check, plan-ledger-check, breadcrumbs-check, kit-manifest-check -> exit 0; log-query -> SKIP (no database configured).
- e2e/ui/568-1 and 568-2 written but not run here (need the QA server and sign-in); the gate reruns them.
- The revenue rule is re-written in JS in `business-report.js` (`closedRevenue`), not imported: `business-stats.js` is outside the scope and holds it as a Mongo expression. Same rule: actual -> planned -> pricing. No `http-storage.adapter.ts` change was needed (`API.stats` already exists).
