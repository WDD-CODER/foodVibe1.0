# Plan 559 — Front desk numbers for the owner and the platform admin

Status: draft
Depends-on: 550, 556, 568
Snapshot: 05741afd08ec936d1aec6f8d9a53631141905f93

## Problem Statement
The Front Desk is what FoodVibe pitches; its evidence is the numbers it measures (FD-09, map row 17). Once plans
549–550 store requests, bookings and the decision log, and plan 556 marks test requests, nobody yet sees what the
front desk did: how many requests came in and through which channel, how many arrived after opening hours, how fast
the owner decided, how many bookings were no-shows, and how many events came from requests. This plan computes those
numbers on the server (Wave 1a: form and manual channels; conversation and assistant numbers are plan 565), shows a
weekly card on the dashboard, adds a front desk block to the business report (plan 568), and gives the platform admin
the same numbers per business with a CSV. Measured first (D15): the owner's estimates from plan 567 appear only as a
labelled extra column. Test requests (`test: true`) never count.

Verified on `origin/main` (5702f6d1, 2026-11-10):
- `server/routes/stats.js` holds `GET /stats/business`; owner check `can(req.user, 'editMoney', { type: 'menuEvents' }).ok`; `jerusalemDate` from `server/middleware/usage.js`.
- `server/routes/admin.js` routes use `verifyToken, requirePlatformAdmin` (`server/middleware/auth.js:102`); `GET /admin/businesses` returns one row per business, read by `src/app/pages/platform-dashboard/` through `src/app/core/services/platform-admin.service.ts`.
- Dashboard: `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html` mounts `app-business-performance` and `app-setup-checklist-card`.
- Plan 566 sets the CSV pattern on admin routes (`format=csv`, `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment`).

From earlier plans in this program (contracts frozen in `docs/frontdesk/frontdesk-map.md`; verify the merged code in Step 0):
- **C-REQUEST** (549, 550): `requests` with `kind` (`REQUEST_KINDS = ['table','event','tasting','consultation']`), `status` (`REQUEST_STATUSES = ['new','qualified','needs_info','approved','declined','cancelled','expired']`), `channel` (`REQUEST_CHANNELS = ['manual','public_form','whatsapp']`), `statusHistory`, `outcome { type: 'booking'|'menuEvent', id }`, `test?: boolean` (excluded from stats); `DECLINE_REASONS = ['full','out_of_area','below_minimum','date_taken','other']`; `bookings` with `BOOKING_STATUSES = ['confirmed','seated','finished','no_show','cancelled']`, `startAt`; `decisionLog { requestId, decidedAction: 'approve'|'decline'|'ask', secondsToDecision, at }` — no names or phones.
- **C-PROFILE** (548): `frontDeskProfiles.hours` — same row shape as `venue.operatingHours` (`dayIndexes[0-6]`, `open`, `close` `HH:MM`).
- Plan 567: baseline fields `phoneInquiriesPerDay`, `messagesPerDay`, `avgResponseMinutes`, `hostHoursPerWeek`, `noShowsPerWeek`, `missedInquiriesPerWeek` and `BASELINE_FRONTDESK_FIELDS`.
- Plan 568: `/report` page (`src/app/pages/report/`), `GET /stats/report`, the 3-event rule `REPORT_MIN_EVENTS` in `server/constants/report.js`.

## Goals & Success Criteria
**Primary:** the owner sees this week's front desk numbers on the dashboard and in the report; the platform admin
sees them per business and can download them; test requests are never counted.

- [auto] `pnpm run test:server` passes, including `server/test/frontdesk-stats.test.js`:
  - seeded requests over two businesses → `GET /api/v1/stats/frontdesk?from&to` returns the expected `requests.total`, `byChannel`, `byKind`, `outcomes` and `declinesByReason` for the caller's business only;
  - a request with `test: true` changes no number;
  - with profile hours Sun–Thu 09:00–18:00, a `public_form` request created Friday 10:00 Israel time counts after hours and one on Monday 10:00 does not; `manual` requests are not in the after-hours share; a business with no profile hours → `afterHoursPct: null`;
  - `medianMinutesToDecision` equals the median of `decisionLog.secondsToDecision ÷ 60` for approve/decline rows of non-test requests; `ask` rows are left out;
  - `noShowRatePct` = no_show ÷ (seated + finished + no_show) over bookings that started in the range; fewer than 3 such bookings → `null` with `enough: false`;
  - `eventsFromRequests.count` counts approved requests with `outcome.type: 'menuEvent'`; `eventsFromRequests.revenue` sums the revenue of those events that are closed (the dashboard's revenue rule);
  - staff → 403; owner with another business's `businessId` → 403; platform admin with `businessId` → 200; `from` after `to` → 400.
- [auto] `server/test/admin-frontdesk-stats.test.js`: `GET /api/v1/admin/frontdesk-stats` returns one row per business with the same numbers; a business owner gets 403; `format=csv` returns `text/csv` with a header row and no client name or phone.
- [auto] `pnpm run test:ci` passes, including `frontdesk-week-card.component.spec.ts` (renders the sentence from stubbed numbers; hidden when the business has no requests at all) and the report page spec cases for the front desk block.
- [ui] After one manual request is created for the QA business, the dashboard shows the card titled "השבוע בקבלה" with "1" requests (`e2e/ui/559-1.spec.ts`).
- [auto] `pnpm run build`, `pnpm run lint`, `pnpm --dir server run lint`, `pnpm run lint:icons` pass.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Dandan checks the platform table and the CSV for the pilot business against what he saw on `/requests` that week.

## Execution Mode
- Parallel: no — 567 and 568 edit the stats code; 556 edits `server/routes/business.js`; 566 and 557 edit `server/routes/admin.js` and `/platform` (map "must not run at the same time"). Last in wt-3.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/breadcrumbs.md
src/app/pages/breadcrumbs.md
src/app/shared/breadcrumbs.md
src/app/core/models/breadcrumbs.md
src/app/core/services/breadcrumbs.md
frontdesk-week-card.component.spec.ts
server/services/frontdesk-stats.js
server/services/business-stats.js
server/routes/stats.js
server/routes/admin.js
server/test/frontdesk-stats.test.js
server/test/admin-frontdesk-stats.test.js
src/app/core/models/frontdesk-stats.model.ts
src/app/core/services/business-stats.service.ts
src/app/core/services/business-stats.service.spec.ts
src/app/core/services/platform-admin.service.ts
src/app/pages/dashboard/components/frontdesk-week-card/**
src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html
src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.ts
src/app/pages/report/**
src/app/pages/platform-dashboard/platform-dashboard.page.html
src/app/pages/platform-dashboard/platform-dashboard.page.ts
src/app/pages/platform-dashboard/platform-dashboard.page.spec.ts
public/assets/data/dictionary.json
e2e/ui/559-1.spec.ts
docs/agent/standards-backend.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — the owner reads only their business (`scopeFilter`); the platform admin reads per-business aggregates as `/admin/businesses` already does; staff get 403; no item, name or phone is returned.
- INV-2: preserves — `frontdesk-stats.js` is read-only and scopes every query to one `businessId` with the `LIVE` filter.

## Reuse Check

- `server/services/frontdesk-stats.js` `frontDeskStats` — family: none — rung: 4 — why: server service; kept beside `business-stats.js` so that file stays small; reuses `jerusalemDate`, the revenue rule (imported from `business-stats.js`) and `REPORT_MIN_EVENTS` (plan 568).
- `isOutsideHours(hours, epochMs)` pure helper inside `frontdesk-stats.js` — family: none — rung: 4 — why: server-only; Israel local day and time from `Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem' })`; no client copy is needed. If plan 548's `shared/front-desk/qualify.ts` exports its opening-hours check (R-10 outside-hours reason), import that instead of writing a second one.
- `app-frontdesk-week-card` — family: none — rung: 4 — why: a dashboard card like `setup-checklist-card`; `.c-glass-panel` and the existing dashboard card layout, no new `.c-*` class.
- `BusinessStatsService.getFrontDesk` — family: entity-data-service — rung: 3 — why: one more read method on the existing stats service.
- `PlatformAdminService.getFrontDeskStats` — family: http — rung: 3 — why: one more read method on the existing platform service.
- CSV on the admin route — family: none — rung: 4 — why: server output, not a UI family; it follows the `format=csv` pattern of plan 566's `/admin/ai-usage`, same headers.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).
Also confirm, in the merged code of 549/550, where the decline reason is stored on a request (the field the
`POST /:id/decline { reason }` handler writes) and use that field for `declinesByReason`; a missing field is a `conflict`.

## User Stories
- As an owner, I want to see on Sunday morning how many requests came in last week, how many after hours, and how fast I answered so that I know what the front desk is worth to me.
- As a host, I want the no-show rate of our bookings so that we can decide whether to call guests the day before.
- As the platform admin, I want the same numbers for every pilot business in one table and one file so that I can show new businesses what the front desk does.

## Functional Requirements

### Must Have (P0)
- [ ] **Service** `server/services/frontdesk-stats.js` → `frontDeskStats(db, businessId, { fromMs, toMs, nowMs })`; every query: `{ businessId, ...LIVE, test: { $ne: true } }` (requests) and `requestId ∉ test requests` (decisionLog). Returns:
  - `requests: { total, perDay, byChannel: { manual, public_form, whatsapp }, byKind: { table, event, tasting, consultation } }` — requests created in range; `perDay = total ÷ days in range`.
  - `afterHoursPct` — share of non-`manual` requests created in range whose Israel local time is outside the profile's `hours` (a day with no row = closed); `null` when the profile has no hours or there are no non-manual requests.
  - `outcomes: { approved, declined, expired, cancelled, waiting }` — current status of requests created in range (`waiting` = `new | qualified | needs_info`).
  - `declinesByReason: { full, out_of_area, below_minimum, date_taken, other }`.
  - `medianMinutesToDecision` — median of `secondsToDecision ÷ 60` over `decisionLog` rows in range with `decidedAction` approve or decline; `null` with fewer than `REPORT_MIN_EVENTS`.
  - `bookings: { total, noShowRatePct, enough }` — bookings with `startAt` in range and before `nowMs`; rate = `no_show ÷ (seated + finished + no_show)`; `enough` = that denominator ≥ `REPORT_MIN_EVENTS`.
  - `eventsFromRequests: { count, revenue }` — approved requests in range with `outcome.type: 'menuEvent'`; revenue of those events that have `closedAt`, by the dashboard's revenue rule (export it from `business-stats.js` if 568 did not already).
  - `baseline` — from `business.baseline`, only filled front desk fields, each with its measured twin key: `phoneInquiriesPerDay → requests.perDay`, `avgResponseMinutes → medianMinutesToDecision`, `noShowsPerWeek → bookings no_show per week`; the others (`messagesPerDay`, `hostHoursPerWeek`, `missedInquiriesPerWeek`) as estimates only; `null` when none is filled.
- [ ] **Owner route** `GET /api/v1/stats/frontdesk?from=YYYY-MM-DD&to=YYYY-MM-DD` in `server/routes/stats.js` (default the last 7 Israel days, today included; range ≤ 366 days else 400; `from > to` → 400): owner only (same check as `/stats/business`; staff 403); `?businessId=` only for `isPlatformAdmin(req)` (else 403; unknown → 404).
- [ ] **Admin route** `GET /api/v1/admin/frontdesk-stats?from&to[&format=csv]` in `server/routes/admin.js` (`verifyToken, requirePlatformAdmin`; default the last 30 days): `{ from, to, rows: [{ businessId, name, requests, afterHoursPct, approved, declined, medianMinutesToDecision, noShowRatePct, eventsFromRequests }] }` for every business except `__master__`; CSV with the header `businessId,name,requests,afterHoursPct,approved,declined,medianMinutesToDecision,noShowRatePct,eventsFromRequests` and `Content-Disposition: attachment; filename="frontdesk-<from>-<to>.csv"`. Business names and numbers only.
- [ ] **Dashboard card** `src/app/pages/dashboard/components/frontdesk-week-card/` (`app-frontdesk-week-card`), mounted in `dashboard-overview` after `app-business-performance`, owner only; loads `/stats/frontdesk` for the last 7 days. Title "השבוע בקבלה"; one sentence: "השבוע התקבלו {{m}} בקשות ({{k}} מחוץ לשעות הפתיחה). אישרת {{x}} בחציון של {{y}} דקות." — parts with no value are left out (no after-hours part when `afterHoursPct` is null; no median part when null). A link "לכל הבקשות" → `/requests`. Hidden when `requests.total` is 0 over the last 90 days (the business does not use the front desk yet) — one extra call with the 90-day range.
- [ ] **Report block**: `/report` (plan 568) gets a section "קבלה ופניות" under the trend: requests in the report's range by channel, after-hours share, median minutes to decision, no-show rate, events from requests; beside each, the owner's estimate when filled, labelled "הערכת בעל העסק" in the same lighter style 568 uses. Loaded with `/stats/frontdesk?from=<report range start>&to=<today>` (and `businessId` when the page has one). Not shown when the range has no requests.
- [ ] **Platform**: `/platform` loads `/admin/frontdesk-stats` once and adds three columns to the business table — requests (30 days), median minutes to decision, no-show % — matched by `_id`; an "ייצוא CSV" button (`download` icon) opens the CSV URL.
- [ ] `docs/agent/standards-backend.md` §5 rows for both routes.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL, logical properties; numbers `dir="ltr"`.
- New dictionary keys (Hebrew values):
  - `frontdesk_week_title`: "השבוע בקבלה"
  - `frontdesk_week_requests`: "השבוע התקבלו {{m}} בקשות"
  - `frontdesk_week_after_hours`: "({{k}} מחוץ לשעות הפתיחה)"
  - `frontdesk_week_decided`: "אישרת {{x}} בחציון של {{y}} דקות."
  - `frontdesk_week_all_requests`: "לכל הבקשות"
  - `report_frontdesk_title`: "קבלה ופניות"
  - `frontdesk_stat_requests`: "בקשות"
  - `frontdesk_stat_after_hours_pct`: "מחוץ לשעות הפתיחה (%)"
  - `frontdesk_stat_median_decision`: "זמן החלטה חציוני (דקות)"
  - `frontdesk_stat_no_show_pct`: "לא הגיעו (%)"
  - `frontdesk_stat_events_from_requests`: "אירועים שנולדו מבקשות"
  - `frontdesk_channel_manual`: "ידני", `frontdesk_channel_public_form`: "טופס", `frontdesk_channel_whatsapp`: "וואטסאפ"
  - `platform_col_fd_requests`: "בקשות (30 יום)", `platform_col_fd_median`: "זמן החלטה (דק׳)", `platform_col_fd_no_show`: "לא הגיעו (%)"
  - `platform_fd_export_csv`: "ייצוא קבלה CSV"
  - Before adding, the Worker checks whether plan 566 already added a generic `platform_export_csv`-style key or 547/552 added channel labels, and reuses them instead of adding twins.
- Icons: `download` (registered by plan 566 — check `app.config.ts`; register it if missing).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Pin the front desk numbers with seeded requests before writing the code — two businesses, test requests, after-hours cases, decision log, bookings, events from requests, access cases — server/test/frontdesk-stats.test.js
- [x] A2: Compute the front desk numbers on the server, never counting test requests — the service with its after-hours helper and baseline twins — server/services/frontdesk-stats.js, server/services/business-stats.js
- [x] A3: Serve the numbers to the owner and to the platform admin, also as a file — owner route with range and businessId; admin route with rows and CSV; admin tests — server/routes/stats.js, server/routes/admin.js, server/test/admin-frontdesk-stats.test.js
- [x] A4: Show this week's front desk numbers as a card on the dashboard — model, service method, card, mount, dictionary keys, spec — src/app/core/models/frontdesk-stats.model.ts, src/app/core/services/business-stats.service.ts, src/app/pages/dashboard/components/frontdesk-week-card/**, src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html, public/assets/data/dictionary.json
- [x] A5: Add the front desk block to the business report — section, estimates beside measured numbers, spec cases — src/app/pages/report/**
- [x] A6: Give the platform admin the numbers per business and the download — three columns, CSV button, service method — src/app/pages/platform-dashboard/platform-dashboard.page.html, src/app/pages/platform-dashboard/platform-dashboard.page.ts, src/app/core/services/platform-admin.service.ts
- [x] A7: Test the dashboard card end to end, update the docs, run every check — one e2e card, standards-backend rows; test:server, test:ci, build, lint, lint:icons, log-query — e2e/ui/559-1.spec.ts, docs/agent/standards-backend.md

## Technical Considerations
- Dependencies: plans 549/550 (requests, bookings, decisionLog), 548 (profile hours), 556 (`test: true` requests), 567 (front desk baseline fields), 568 (report page, `REPORT_MIN_EVENTS`).
- New files needed: `server/services/frontdesk-stats.js`, `server/test/frontdesk-stats.test.js`, `server/test/admin-frontdesk-stats.test.js`, `src/app/core/models/frontdesk-stats.model.ts`, `src/app/pages/dashboard/components/frontdesk-week-card/*`, `e2e/ui/559-1.spec.ts`.
- Model changes: new `FrontDeskStats` client type.
- Backend / API: `GET /api/v1/stats/frontdesk`, `GET /api/v1/admin/frontdesk-stats`.
- Auth and validation: owner of the business, or platform admin; dates `YYYY-MM-DD`, range ≤ 366 days.
- Security surface: two read routes returning aggregates only; the CSV has business names and numbers, no client name or phone (tested).
- Data / migration: none. If `requests` has no index on `{ businessId, createdAt }` after 549, the queries still run (small volumes); adding an index is out of scope.
- e2e: `559-1` signs in with `signInQa`, creates one manual request with `POST /api/v1/requests` (plan 549) and removes it after; it asserts the card title and the number `1`.
- Project checks: log-query item; dictionary keys named; icon named; Reuse Check filled.

## Out of Scope
- Conversation, assistant and suggestion-agreement numbers (plan 565, Wave 1b).
- Median time from first message to request (needs conversations, plan 565).
- A `/frontdesk` home page (C-NAV has no home chip; the dashboard card is the owner's view).
- Changing the dashboard's existing cards or the report's kitchen numbers.

## Critical Questions
- none

## Execution Notes
- Evidence: pnpm run build -> exit 0; pnpm run lint -> 0 errors; pnpm --dir server run lint -> 0 errors; lint:icons -> 0 violations; test:ci -> 2173 SUCCESS; test:server -> 104 files, 1346 passed (incl. frontdesk-stats 11, admin-frontdesk-stats 3); breadcrumbs-check clean; log-query -> SKIP no database.
- e2e/ui/559-1.spec.ts written but NOT run: the servers on 4200/3000 are not this worktree's build.
- behaviour: the report's requests row shows the owner's phoneInquiriesPerDay estimate multiplied by the range days (same unit as the measured total); noShowsPerWeek and the other estimates are not shown in the report — reverse: drop the multiplication or add rows.
- Reused existing keys: rq_channel_* for channel labels, report_owner_estimate for the estimate label (no twins added). CSV on the platform page downloads with the session (blob), as plan 566 does, not by opening a URL.
- Map row 17 (renumbered +2: old 557 → 559). Decisions made while drafting (Planner): after-hours share counts only guest channels (a manual request is typed by a member at any hour); the median comes from `decisionLog.secondsToDecision` (one definition with plan 550); the owner's weekly card replaces the brief's "/frontdesk home" because C-NAV has no home chip; the platform CSV follows plan 566's `format=csv` pattern instead of a client-side CSV helper.
