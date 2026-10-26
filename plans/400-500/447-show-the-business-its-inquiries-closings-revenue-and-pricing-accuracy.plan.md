# Plan 447 — Show the business its inquiries, closings, revenue and pricing accuracy

Status: done
Track: code
Snapshot: 8ffda3d2c4d8f3ab5137bfee30e9d80026d28110

## Problem Statement
Spec 07.2. The dashboard (`src/app/pages/dashboard/components/dashboard-overview/`) shows four catalogue counts
(products, recipes + dishes, low stock, unapproved) with three hard-coded SVG "sparklines" that mean nothing
(`.kpi-sparkline` paths). An owner cannot see how many inquiries came in, how many closed, how much revenue the
closed events bring, how accurate the pricing was, or how often the team uses the app — and cannot compare any of
it with the opening baseline captured in plan 431.

This plan adds a "ביצועים" area at the top of the dashboard: a period picker (30 days default / 90 days / from the
start), five cards with a baseline comparison, a stage funnel that links to the filtered menu library, and the
next 14 days of events. **Every number is computed on the server** with MongoDB aggregation scoped to the caller's
business (`server/routes/stats.js`); the browser never loads all events. Staff see the funnel and the upcoming list
only. Legacy ("ישן") and deleted events never count. The fake sparklines go.

Per the project memory (plan 310), aggregation performance is checked against a restored copy of the Atlas data,
not only the local DB.

## Goals & Success Criteria
**Primary:** the owner opens the dashboard and sees, for the chosen period, inquiries, closings, revenue, pricing
accuracy and usage — each against their opening baseline — computed on the server in well under a second.

Done when:
- [x] [auto] `npx ng build` passes.
- [x] [auto] `npm --prefix server test -- business-stats` passes. Fixture (spec 07.2 acceptance; one business, "now"
  fixed, all in the last 30 days): 10 events created; 4 with `closedAt` in the period (each planned revenue 12,000
  in `pricing.revenue`); 3 with `stage: 'not_closed'`; 2 of the closed ones finished (`closing.finishedAt` set,
  `actualRevenue` 12,000) whose actual − planned profit % are +2 and −4 points; baseline `{ inquiriesPerMonth: 6,
  eventsClosedPerMonth: 3, avgRevenuePerEvent: 12000, estProfitPct: 50 }`; plus one `legacy: true` closed event,
  one deleted closed event and one closed event of another business (none may count). Owner token,
  `GET /api/v1/stats/business?period=30` returns:
  - `cards.inquiries.value 10`, `changePct` 66.67 (shown "+67%");
  - `cards.closed.value 4`, `notClosed 3`, `closeRatePct` 57.14 (shown 57%), `changePct` 33.33;
  - `cards.revenue.value 48000`, `baseline 36000`, `changePct` 33.33;
  - `cards.accuracy.avgAccuracyPts -1`, `finishedCount 2`, `avgActualProfitPct` and `vsBaselinePts` matching the
    fixture;
  - `cards.usage.activeDays` = distinct fixture `usageDays.date` values for the business in the period;
  - `funnel` has one entry per stage `inquiry` … `post_production` with the fixture counts (legacy excluded);
  - `upcoming` lists only events dated today … today + 14 (Asia/Jerusalem), sorted by date.
  - staff token → 200 with `funnel` and `upcoming`, and no `cards` key;
  - business without baseline → `hasBaseline: false`, every `changePct` `null`;
  - business without events → all card values 0, `accuracy.avgAccuracyPts null`;
  - `period=all` uses the business `createdAt` as the start; `period=7` → 400.
- [x] [auto] `npm --prefix server test -- business-stats` also asserts the accuracy formula on spec 08.1's numbers
  (revenue 10,000; A 1,000 → 1,150; B 2,000 → 1,950; extra 1,000) → actual profit % 59, accuracy −1 — the same
  numbers plan 446's `event-closing.spec.ts` locks on the client.
- [x] [auto] `npx ng test --watch=false --include='src/app/pages/dashboard/components/business-performance/**/*.spec.ts' --include='src/app/core/services/business-stats.service.spec.ts' --include='src/app/core/engine/rounding.spec.ts'`
  passes: "+67% מול לפני" / "−33% מול לפני" labels from `changePct`; "אין נתוני פתיחה" when `hasBaseline` is false;
  accuracy "−1 נקודה בממוצע"; "—" with "יופיע אחרי סגירת אירוע ראשון" when `avgAccuracyPts` is null; no money cards
  when the response has no `cards`; funnel click navigates to `/menu-library?stage=<key>`; `formatDecimal1(2.345)`
  → "2.3".
- [x] [auto] `grep -c "kpi-sparkline" src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html`
  prints `0`.
- [auto] Timing, only when a restored Atlas copy is already available locally (a `foodvibe_scratch_*` database
  restored from an Atlas snapshot): `node server/scripts/time-business-stats.js --target=local --db=<that scratch db>`
  prints one line per business and period with milliseconds, a first-stage plan of `IXSCAN` on `businessId` for
  `menuEvents` and `usageDays`, and exits 0 (every run < 500 ms). When no restored copy exists, run the script once
  against the slot's local DB (exit 0, proves it works) and defer the Atlas-copy timing to the final gate below.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Final gate (only if the timing above was deferred): Dandan runs `node server/scripts/db-backup.js
  --target=atlas` (confirm the masked host), `node server/scripts/db-restore.js --target=local --dir="<that
  snapshot>" --db=foodvibe_scratch_447`, then `node server/scripts/time-business-stats.js --target=local
  --db=foodvibe_scratch_447` → exit 0, every run < 500 ms, `IXSCAN` first stage (agents never read production).
  Written under `## Final gate — Atlas` in `docs/mvp/runs/447.md`.
- [human] Desktop, `/dashboard` as the owner: the "ביצועים" area is on top with «30 יום» selected; five cards show
  numbers; with a baseline filled in `/settings`, cards 1–3 show a green or red "% מול לפני". Switch to «90 יום»
  and «מההתחלה» → the numbers change.
- [human] Click the funnel's "פנייה" bar → `/menu-library` opens filtered to "פנייה".
- [human] The "אירועים קרובים" list shows the events of the next 14 days with name, date, guests and stage.
- [human] The old cards (products, recipes, low stock, unapproved) are still below, without the little zig-zag
  lines.
- [human] Sign in as staff: only the funnel and the upcoming list show — no revenue, profit or accuracy anywhere.
- [human] A new business with no events: zeros and the link «צור פנייה ראשונה», which opens the new-inquiry form
  in the library.
- [human] Phone width: cards stack two per row, the funnel bars and the period picker fit without sideways
  scrolling.

## Execution Mode
- Parallel: yes with plans that write none of this scope. No against 431 (writes
  `dashboard-overview.component.*` — it is a dependency anyway) and 448 (its drill-down reuses this component).
  Confirm with `node scripts/scope-check.mjs --overlap --plan=<this file>` at take time.
- Concurrent plans: none required.
- Isolated DB: yes — the timing check runs against a scratch restore of Atlas (`foodvibe_scratch_447`) when one
  exists; no app data is written.

## Execution Notes
- Depends on: plan 431 merged (business `baseline`, dashboard setup card).
- Depends on: plan 430 merged (`usageDays` collection and its `{ businessId, date }` index).
- Depends on: plan 446 merged (`closing`, `planSnapshot`, finish/reopen semantics).
- Depends on: plan 443 merged (library `?stage=` filter and `?new=inquiry` form used by the funnel and the empty
  state).
- Transitively merged: 425 (business scope helper), 427 (permission checker), 442 (stages, `closedAt`,
  `legacy`), 445 (`pricing`).
- Must not run at the same time as: 431, 448; 432 (`server/app.js` router mounts).
- Human gate: the Atlas backup + scratch restore + timing run happen at the final gate unless a restored copy is
  already available locally (see Done-when).
- Decision (Planner review): legacy ("ישן") events are left out of the cards and the funnel (spec 07.2) but are
  shown in "אירועים קרובים" tagged "ישן" — a future legacy event is a real upcoming event the team must prepare.
- Decision (Planner review): the owner/staff money split on the dashboard reuses `editMoney` (`can(req.user,
  'editMoney', { type: 'menuEvents' })`) — no new C-PERM action; the approved map already records this.
- MVP run mode: executed unattended into branch `mvp` per `docs/mvp/run-mode.md` — Atlas steps are rehearsed on a
  scratch copy and deferred to the final gate; [human] items become validation cards in `docs/mvp/runs/<NNN>.md`.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/stats.js
server/services/business-stats.js
server/app.js
server/test/business-stats.test.js
server/scripts/time-business-stats.js
src/app/core/services/business-stats.service.ts
src/app/core/services/business-stats.service.spec.ts
src/app/core/models/business-stats.model.ts
src/app/core/engine/rounding.ts
src/app/core/engine/rounding.spec.ts
src/app/pages/dashboard/components/business-performance/**
src/app/pages/dashboard/components/dashboard-overview/**
src/app/app.config.ts
public/assets/data/dictionary.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — the new route only reads; every query starts from `scopeFilter(req)`
  (`server/utils/business-scope.js`, ADR 0023 rule as rewritten by plan 424), and the owner-only money cards are
  decided by `can(req.user, 'editMoney', { type: 'menuEvents' })` from `server/utils/permissions.js`.
- INV-2: preserves — `server/services/business-stats.js` is a read-only aggregation builder; no master data, clone,
  sync or override behaviour changes.
- INV-none for the rest: no schema (the response is a read model, `business-stats.model.ts` on the client), no
  taxonomy, no AI, no cascade.

## Step 0 — Reality Check

Runs when `scope-check.mjs --drift` reports drift (it will). Check by symbol, print `ok` or `conflict: <what>`:
- Plan 424/425: `scopeFilter(req)`, `MASTER_BUSINESS_ID` in `server/utils/business-scope.js`; the `businesses`
  collection name; `LIVE` (soft-delete filter) location; menuEvents indexes led by `businessId` in `server/db.js`;
  test helpers for business users/tokens.
- Plan 427: `can(user, action, ctx)` in `server/utils/permissions.js`.
- Plan 430: `usageDays` fields `{ businessId, date: 'YYYY-MM-DD' }` and index `{ businessId: 1, date: 1 }`.
- Plan 431: `businesses.baseline` fields; what it added to `dashboard-overview.component.*` (setup card) — place the
  new area above it.
- Plan 442: type of `createdAt`, `closedAt`, `notClosedAt` (epoch ms expected), `stage`, `legacy`.
- Plan 445: `pricing.revenue`. Plan 446: `closing.finishedAt` cleared on reopen, `closing.suppliers[].planned` /
  `actualPaid`, `planSnapshot.plannedRevenue` / `extraCosts` / `plannedProfitPct`.
- Plan 443: `/menu-library?stage=<key>` and `?new=inquiry`.
- Plan 433: `rounding.ts` exports (`formatMoney`, `formatPctInt`, `formatPct1`); append `formatDecimal1`.
- Repo: `.kpi-sparkline` blocks and `.kpi-grid` in `dashboard-overview.component.html`; `app.use('/api/v1/...')`
  block in `server/app.js`; `server/scripts/db-backup.js` / `db-restore.js` flags.

## User Stories
- As a chef-owner, I want to see how many inquiries came in and how many closed this month so that I know if the
  business is growing.
- As a chef-owner, I want to see my revenue and how accurate my pricing was against my opening numbers so that I
  know whether FoodVibe is helping.
- As a chef, I want to see the events of the next two weeks and where each one stands so that nothing is forgotten.
- As a staff cook, I want the funnel and upcoming events without the money so that I can plan my work.

## Functional Requirements

### Must Have (P0)
- [ ] Period picker: 30 days (default), 90 days, from the start (= business `createdAt`).
- [ ] Card 1 פניות: events created in the period.
- [ ] Card 2 אירועים שנסגרו: events with `closedAt` in the period; close rate = closed ÷ (closed + not closed),
  where not closed = current stage `not_closed` with `notClosedAt` in the period.
- [ ] Card 3 הכנסות: Σ over closed events (by `closedAt`) of actual revenue if finished (`closing.actualRevenue ??
  planSnapshot.plannedRevenue`), else `pricing.revenue`. A reopened event counts by planned revenue until finished
  again.
- [ ] Card 4 דיוק תמחור: average (actual profit % − planned profit %) over events finished in the period, plus the
  average actual profit %; actual profit % per spec 08.1 (empty supplier amount counts as planned).
- [ ] Card 5 ימי שימוש בשבוע: distinct active dates of the business in the period ÷ (period days ÷ 7).
- [ ] Baseline: cards 1–3 normalised to a month (value ÷ period days × 30) vs baseline; revenue baseline = closed
  events/month × average revenue/event; green "+X% מול לפני" / red "−X%"; card 4 = average actual profit % −
  estimated profit %, in points. No baseline → "אין נתוני פתיחה".
- [ ] Funnel: count of active events per stage now, "פנייה" … "פוסט-פרודקשן"; click → `/menu-library?stage=<key>`.
- [ ] Upcoming: events dated today … today + 14 (Asia/Jerusalem): name, date, guests, stage.
- [ ] Legacy and deleted events never count in cards or funnel; another business's events never appear.
- [ ] Staff: funnel + upcoming only; the server omits `cards`.
- [ ] Remove the three fake sparklines; the existing four cards stay below the new area.
- [ ] Empty states: no events → zeros + «צור פנייה ראשונה» (`/menu-library?new=inquiry`); no finished events →
  accuracy "—" + "יופיע אחרי סגירת אירוע ראשון".

### Should Have (P1)
- [ ] none.

### Nice to Have (P2)
- [ ] none.

## Design

Server:
- `server/services/business-stats.js` (pure builders, unit-tested through the route test):
  `periodBounds(period, nowMs, businessCreatedAt)` → `{ startMs, periodDays, startDateIL }` (period ∈ `'30' | '90' |
  'all'`; days = max(1, ceil((now − createdAt) / 1 day)) for `all`); `eventsPipeline(scope, bounds, todayIL,
  plus14IL)` → `[ { $match: { ...scope, ...LIVE } }, { $facet: { inquiries, closed, notClosed, revenue, accuracy,
  funnel, upcoming } } ]` (each metric facet first matches `legacy: { $ne: true }`; accuracy uses `$reduce` over
  `closing.suppliers` with `$ifNull: ['$$s.actualPaid', '$$s.planned']`; `upcoming` limited to 50, projected to
  `_id, name, eventDate, guestCount, stage, legacy`); `usagePipeline(scope, bounds)` → distinct `date` count in
  `usageDays`; `shapeStats(facet, usage, business, isOwner)` → response below. All arithmetic unrounded.
- `server/routes/stats.js`: `GET /business` (`verifyToken`), validates `period`, loads the caller's business doc,
  runs the two aggregations, `isOwner = can(req.user, 'editMoney', { type: 'menuEvents' }).ok`. Mounted in
  `server/app.js` at `/api/v1/stats` next to the other routers. Logs via `req.log` (`stats.business.failed`).
- Response: `{ period, periodDays, hasBaseline, cards?: { inquiries: { value, monthly, baseline, changePct },
  closed: { value, notClosed, closeRatePct, monthly, baseline, changePct }, revenue: { value, monthly, baseline,
  changePct }, accuracy: { finishedCount, avgAccuracyPts, avgActualProfitPct, baselineEstProfitPct, vsBaselinePts },
  usage: { activeDays, perWeek } }, funnel: { stage, count }[], upcoming: { _id, name, eventDate, guestCount, stage,
  legacy }[] }` (`null` where a value cannot be computed).
- `server/scripts/time-business-stats.js` (CommonJS, same env/target/`--db` handling and "never print a URI" rule as
  `server/scripts/check-name-lengths.js`): for every business, runs both pipelines for each period, prints
  `<businessId> <period> <ms>` and the first-stage `explain` plan; exit 1 when any run ≥ 500 ms.

Client:
- `BusinessStatsService.get(period)` → `GET ${environment.apiUrl}/api/v1/stats/business?period=…`.
- `business-performance` component: `period_` signal ('30' default), `stats_` from the service, cards rendered only
  when `stats.cards` exists; formatting only through `rounding.ts` (`formatPctInt` for %, `formatMoney` for ₪,
  `formatDecimal1` for days per week, integer points with a sign).
- `rounding.ts`: append `formatDecimal1(n)` (1 decimal, trailing ".0" dropped) — contract extension.

## UI/UX Notes
- New area "ביצועים" built in the dashboard's existing design language (`kpi-card` look, page tokens); period
  picker as a segmented control (`c-toggle-chip` group); funnel as horizontal bars with stage name and count, each a
  button; upcoming as a compact list (date · name · guests · stage chip). RTL; logical properties only;
  `cssLayer` skill first.
- Card change label: green for ≥ 0, red for < 0, Unicode minus "−".
- Icons: register `TrendingUp`, `TrendingDown` in `src/app/app.config.ts`; reuse `calendar-clock`, `users`,
  `activity`, `coins`, `chevron-left`.
- New `dictionary.json` keys (append to `general`):

| key | Hebrew |
|---|---|
| `performance_title` | ביצועים |
| `period_30` | 30 יום |
| `period_90` | 90 יום |
| `period_all` | מההתחלה |
| `stat_inquiries` | פניות |
| `stat_closed` | אירועים שנסגרו |
| `stat_close_rate` | אחוז סגירה |
| `stat_revenue` | הכנסות |
| `stat_accuracy` | דיוק תמחור |
| `stat_accuracy_value` | {{pts}} נקודה בממוצע |
| `stat_avg_actual_profit` | רווח בפועל ממוצע |
| `stat_accuracy_empty` | יופיע אחרי סגירת אירוע ראשון |
| `stat_usage_per_week` | ימי שימוש בשבוע |
| `stat_vs_before` | {{pct}} מול לפני |
| `stat_no_baseline` | אין נתוני פתיחה |
| `funnel_title` | אירועים לפי שלב |
| `upcoming_title` | אירועים קרובים |
| `upcoming_empty` | אין אירועים ב-14 הימים הקרובים |
| `create_first_inquiry` | צור פנייה ראשונה |

Reused, not added: `event_stage_<key>` stage names and `event_legacy` "ישן" (plan 443) for the funnel, the upcoming
list's stage chip and its legacy tag.

## Atomic Sub-tasks
- [x] D1: Compute every dashboard number on the server with two scoped aggregations — business-stats.js: periodBounds, eventsPipeline ($facet: inquiries, closed, notClosed, revenue, accuracy, funnel, upcoming), usagePipeline, shapeStats per Design — server/services/business-stats.js
- [x] D2: Serve the numbers to owners in full and to staff without money — GET /api/v1/stats/business in stats.js (verifyToken, period validation, business doc, can(..., 'editMoney') decides cards), mounted in app.js — server/routes/stats.js, server/app.js
- [x] D3: Prove the numbers with the spec's acceptance fixture and the isolation rules — business-stats.test.js: the 07.2 fixture, legacy/deleted/other-business exclusions, staff response, no-baseline, no-events, period=all, bad period, the 08.1 accuracy numbers — server/test/business-stats.test.js
- [x] D4: Add a timing check to run against a restored copy of the live data — time-business-stats.js per Design — server/scripts/time-business-stats.js
- [x] D5: Fetch the stats in the app and format them with the shared rounding helpers — BusinessStatsService + model types; formatDecimal1 appended to rounding.ts + specs — src/app/core/services/business-stats.service.ts, src/app/core/services/business-stats.service.spec.ts, src/app/core/models/business-stats.model.ts, src/app/core/engine/rounding.ts, src/app/core/engine/rounding.spec.ts
- [x] D6: Build the performance area with period picker, five cards, funnel and upcoming events — BusinessPerformanceComponent per Design and UI/UX Notes; funnel → router.navigate(['/menu-library'], { queryParams: { stage } }); empty states + spec — src/app/pages/dashboard/components/business-performance/**
- [x] D7: Put the area on top of the dashboard and remove the fake sparklines — mount <business-performance /> first inside .dashboard-main (above plan 431's setup card), delete the three .kpi-sparkline SVG blocks and their unused styles — src/app/pages/dashboard/components/dashboard-overview/**
- [x] D8: Add the Hebrew labels and the two trend icons — keys from UI/UX Notes, TrendingUp/TrendingDown in LucideAngularModule.pick — public/assets/data/dictionary.json, src/app/app.config.ts
- [x] D9: Build, test server and client, time the queries if a restore exists, then hand over — ng build, the Done-when test commands, the sparkline grep, the timing script (restored copy if present, else local + final-gate entry), log-query; slot servers up; [human] cards — this plan file

## Technical Considerations
- Dependencies: plans 424/425 (scope helper, `businesses`), 427 (`can`), 430 (`usageDays`), 431 (`baseline`, dashboard
  card), 442 (stage fields), 443 (library URL params), 445 (`pricing`), 446 (`closing`, `planSnapshot`), 433
  (`rounding.ts`).
- New files needed: `server/routes/stats.js`, `server/services/business-stats.js`,
  `server/test/business-stats.test.js`, `server/scripts/time-business-stats.js`, `business-stats.service.ts`
  (+spec), `business-stats.model.ts`, `components/business-performance/`.
- Model changes: client read model `BusinessStats` only; no stored data changes.
- Backend / API: new `GET /api/v1/stats/business?period=30|90|all` on a dedicated router — justified because the
  numbers are aggregations across many documents that the generic CRUD route cannot express and the browser must not
  compute (spec: "the dashboard never loads all events into the browser").
- Auth and validation: `verifyToken`; scope from `scopeFilter(req)`; `period` whitelist (400 otherwise); money
  cards only when `can(user, 'editMoney')`. Anonymous → 401.
- Security surface: read-only route; no new inputs beyond `period`; never returns another business's data (test).
- Performance: one `$match` on `{ businessId, deletedAt }` then `$facet` over that business's events only, plus one
  `usageDays` aggregation on its `{ businessId, date }` index; timed on the restored Atlas copy (< 500 ms each).
  Events saved before plan 445 have no `pricing` and count 0 revenue until saved again.
- Data / migration: none.
- Lazy loading: the area is part of the lazy dashboard route.
- Project checks: log-query Done-when; chef-side stories; dictionary keys listed; RTL logical CSS; two Lucide icons
  registered; `[human]` checks on phone and desktop.

## Backend Impact
- Collections affected: `menuEvents`, `usageDays`, `businesses` (read only).
- New collections: no.
- Server changes needed: yes — new router `server/routes/stats.js` mounted in `server/app.js`, aggregation builder
  `server/services/business-stats.js`, a timing script, a test file.

## Contracts (verbatim from the approved map)

**C-SCOPE (424/425)**
- Every business doc gets `businessId: string` and `createdBy: string` in `baseDocShape`. Master docs: `businessId: '__master__'`. Migration 0006 sets `createdBy = userId` and `businessId` = the user's business (master: `'__master__'`). Plan 425 stops using `userId` for scoping; the stored `userId` stays (optional in schema, never read for scope).
- `server/utils/business-scope.js` exports `MASTER_BUSINESS_ID = '__master__'`, `scopeFilter(req)` → `{ businessId: req.user.businessId }`, `readScope(req, type)` → taxonomy: `{ businessId: { $in: [bid, '__master__'] } }`, others `scopeFilter(req)`; anonymous → `{ businessId: '__master__' }`; `stampNew(req, doc)` → sets `businessId`, `createdBy = req.user.userId`, `createdAt`.
- Indexes re-led by `businessId` (taxonomy unique `{kind, key, businessId}`).

**C-BUSINESS (424 creates the collection; 429/431 add fields)**
- Collection `businesses`, one doc per business: `{ _id, name, ownerId, createdAt, internal: false, lastSyncedMasterVersion, settings, baseline? }`. Duplicate names allowed. Migration names existing ones "העסק של [username]".
- `settings` defaults `{ profitTargetPct: 25, safetyMarginPct: 10, overrunThresholdPct: 10 }` (429).
- `baseline` `{ inquiriesPerMonth?, eventsClosedPerMonth?, avgRevenuePerEvent?, estProfitPct?, filledAt }` (431).
- Zod schema `shared/schemas/entities/business.schema.ts`.
- Dedicated router `server/routes/business.js` mounted at `/api/v1/business`: `GET /` (my business + settings, any member), `PUT /settings` (owner, 429), `PUT /baseline` (owner, 431), `GET/POST/DELETE /team…` (owner, 428). Client `BusinessService` `src/app/core/services/business.service.ts` with `business_` signal.

**C-STAGES (442; consumed by 443, 446, 447, 448)**
- Stage keys: `inquiry`, `quote_sent`, `deposit_paid`, `ordering`, `execution`, `post_production`, `finished`, `not_closed`. Order array `EVENT_STAGES` in `shared/schemas/entities/event-stage.ts`.
- Event fields: `stage`, `stageHistory: { stage, at, by, byName, reason?, reasonText? }[]`, `closedAt?` (first transition to deposit_paid or later; never changes), `notClosedAt?`, `notClosedReason?: 'price' | 'date_taken' | 'no_reply' | 'other'`, `notClosedText?`, `legacy?: boolean` ("ישן"), `notes: { _id, text /* ≤ 2000 */, at, by, byName, editedAt? }[]`, `clientName?`, `clientPhone?`, `deposit?: { amount?, date? }`.
- "Closed" = `closedAt` set. Active = stage not in {finished, not_closed}.
- Dedicated router `server/routes/events.js` at `/api/v1/events`: `PUT /:id/stage` `{ stage, reason?, reasonText? }`, `POST /:id/notes`, `PUT /:id/notes/:noteId`, `DELETE /:id/notes/:noteId`, (446) `PUT /:id/closing`, `POST /:id/finish`, `POST /:id/reopen`, `POST /:id/refresh-plan`. Stage history/notes are written only by the server (generic PUT strips them).

**C-PRICING (445; consumed by 446, 447)**
- Event fields: `pricePerGuest?: number`, `extraCosts?: { amount: number, note?: string }`, `targetsOverride?: { profitTargetPct?: number, safetyMarginPct?: number }`.
- `src/app/core/engine/event-pricing.ts` `computeEventPricing(plan: EventPlan, event, settings) → { foodCost, extraCost, totalCost, revenue, revenueIsComputed, profit, profitPct | null, profitPerGuest, minPricePerGuest, safetyMarginAmount, meetsTarget, shortfallPerGuest, partial }`.
- On every save the client stores `pricing: { foodCost, revenue, profit, profitPct, partial, computedAt }` on the event (server dashboards read this, never run the engine).

**C-SNAPSHOT (446; consumed by 447)**
- `planSnapshot?: { at, frozenAt?, suppliers: { supplierId: string | null, name, plannedCost }[], extraCosts, plannedRevenue, plannedProfit, plannedProfitPct }`
- `closing?: { suppliers: { supplierId: string | null, name, planned, actualPaid?, arrived: boolean, hasInvoice: boolean, photos: string[] }[], actualExtraCosts?, actualRevenue?, finishedAt?, finishedBy? }`
- Pricing accuracy per finished event = actual profit % − planned profit % (points).

**C-USAGE (430; consumed by 428 last-login, 447, 448)**
- Collection `usageDays`: `{ _id: `${userId}:${date}`, userId, businessId, date: 'YYYY-MM-DD' /* Asia/Jerusalem */, firstAt, lastAt, writeCount }`. Written by `server/middleware/usage.js` `recordUsage` after auth; writes = POST/PUT/PATCH/DELETE on business data excluding /auth/*; reads update at most once per minute per user (in-memory throttle). No TTL. Index `{ businessId: 1, date: 1 }`.
- "Last login" = latest `lastAt` for the user.

**C-PERM (427; client mirror 428)**
- `server/utils/permissions.js`: `can(user, action, { type, doc?, patch? }) → { ok: true } | { ok: false, reason }` and `assertCan(req, res, action, ctx)` → sends 403 `{ error: 'FORBIDDEN', messageKey: 'no_permission' }` (Hebrew "אין לך הרשאה לפעולה הזו").
- Actions: `create`, `edit`, `delete`, `editMoney`, `changeStage`, `addNote`, `markArrival`, `manageTeam`, `editSettings`, `editTaxonomy`.
- Rules: owner → all in own business. Staff → create all entity types; edit/delete only `doc.createdBy === user.userId`; `editMoney`, `manageTeam`, `editSettings`, `editTaxonomy` (eventType, menuType, station) never; `changeStage` only on events they created; `addNote`, `markArrival` on any event. A staff-created product is saved with money fields stripped.
- Money fields: `shared/schemas/money-fields.ts` exports `MONEY_FIELDS: Record<type, string[]>` — products: `sources[].price`, `purchaseOptions[].priceOverride`; menuEvents: `pricePerGuest`, `extraCosts`, `targetsOverride`, `deposit`, `closing.suppliers[].actualPaid`, `closing.actualExtraCosts`, `closing.actualRevenue`; businesses: `settings`, `baseline`. Later plans that add a money field append it here.
- Client: `src/app/core/services/permission.service.ts` `can(action, ctx): boolean` (computed from user signal); UI hides/locks by the same rules; server decides.
- Before 427 merges: every signed-in user counts as owner.

Contract extension (this plan): `rounding.ts` gains `formatDecimal1(n)` (1 decimal, for "days per week"). The
`GET /api/v1/stats/business` response shape in Design is the read contract plan 448's drill-down reuses.

## Out of Scope
- Charts over time, report export, cross-business comparison (plan 448 is the platform-admin table).
- Recording usage (plan 430) and the baseline form (plan 431).
- Back-filling `pricing` on events saved before plan 445.
- The browser activity log (stays as is).

## Critical Questions
None. The two defaults (legacy events in "אירועים קרובים", `editMoney` for the money split) are recorded as Planner
decisions in Execution Notes.
