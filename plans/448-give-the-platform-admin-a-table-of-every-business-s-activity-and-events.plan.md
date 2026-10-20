# Plan 448 — Give the platform admin a table of every business's activity and events

Status: draft
Track: code
Snapshot: 8ffda3d2c4d8f3ab5137bfee30e9d80026d28110

## Problem Statement
Spec 07.3. During the pilot Dandan needs to see, without opening anyone's data, which businesses actually work
with FoodVibe: who logs in, how many events they run through the pipeline, how many close. Today the platform
admin has only a user list and delete (`server/routes/admin.js`: `GET /users`, `DELETE /users/:userId`) and every
data route is scoped to one business. This plan adds a platform-admin-only «דאשבורד מערכת»: one row per business
with membership, activity (from plan 430's `usageDays`) and event-pipeline numbers (from plan 442's stages), all
computed on the server, sortable, inactive businesses coloured, Dandan's own business markable «פנימי» and left
out of the totals. Clicking a business opens its performance cards (plan 447) read-only — **only if plan 447 is
merged when this plan starts**; otherwise this plan ships the table only (Step 0 decides).

User stories:
- As the platform admin, I want one table of all businesses with last activity and event counts so that I can see
  in a minute who is using FoodVibe and who stopped.
- As the platform admin, I want my own test business marked internal and left out of the totals so that it does
  not inflate the pilot numbers.
- As the platform admin, I want to open one business's performance cards without seeing its recipes or prices so
  that I respect the chef's data.

## Goals & Success Criteria
**Primary:** a server-computed, platform-admin-only table of businesses with the spec's columns, default sort by
last activity, 7/14-day inactivity colours, an internal toggle excluded from totals, and (if 447 merged) a
read-only drill-down to the performance cards.

Done when:
- [auto] `npx ng build` passes.
- [auto] `npm --prefix server test -- test/admin-businesses.test.js` passes, with a fixture of two businesses
  (A: owner + 2 staff, one removed; B: owner only) and events / usage days seeded directly:
  - `GET /api/v1/admin/businesses` as platform admin → 2 rows; A: `ownerName`, `staffCount: 1`, `createdAt`,
    `lastActivityAt` = latest `usageDays.lastAt` of any A member, `activeDays7` = distinct Israel dates in the last 7
    days (owner + staff on the same day count once), `events: { total, active, closed, finished }`,
    `closeRate` = closed ÷ (closed + not closed) (`null` when both are 0), `lastEventDate` = latest `eventDate`;
  - events with `legacy: true` or `deletedAt` never count; B with no events → zeros, `closeRate: null`,
    `lastEventDate: null`; B with no usage → `lastActivityAt: null`, `activeDays7: 0`;
  - every row's keys are exactly `_id, name, ownerName, staffCount, createdAt, internal, lastActivityAt,
    activeDays7, events, closeRate, lastEventDate` (no products, recipes, prices or event names);
  - owner token (not platform admin) → 403 on `GET /businesses` and on `PUT /businesses/:id/internal`;
    no token → 401;
  - `PUT /api/v1/admin/businesses/<A>/internal` `{ internal: true }` → 200 and the next `GET` shows
    `internal: true`; `{ internal: 'yes' }` → 400; unknown id → 404;
  - (only when 447 is merged) `GET /api/v1/admin/businesses/<A>/performance?period=30` → the same payload 447's
    own endpoint returns for A's owner; owner token → 403.
- [auto] `npm --prefix server test` passes (whole server suite).
- [auto] `npx ng test --watch=false --include='src/app/pages/platform-dashboard/**/*.spec.ts'` passes, covering:
  default sort = last activity, newest first, never-active last; clicking a header sorts by it and a second click
  reverses; `lastActivityAt` 8 days ago → row class `is-idle-7`, 15 days → `is-idle-14`, `null` → `is-idle-14`;
  the totals line sums only rows with `internal: false`; close rate shown through `formatPctInt` (57.14 → «57%»),
  `null` → «—».
- [auto] (only when 447 is merged) `npx ng test --watch=false --include='src/app/pages/dashboard/components/business-performance/**/*.spec.ts'`
  passes, plus a new case: with `readonly` true and a `statsSource` fixture the cards render the fixture numbers and
  no funnel link / «צור פנייה ראשונה» button is rendered; with the defaults the owner dashboard behaves as before.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Desktop, platform admin (Dandan's account): header link «דאשבורד מערכת» → table with one row per test
  business; numbers match what you know of them (events, last activity); the table is sorted by «פעילות אחרונה».
- [human] Desktop, platform admin: click «מספר אירועים» header → sorted by it; click again → reversed. A business
  idle more than 7 days is yellow, more than 14 days red.
- [human] Desktop, platform admin: tick «פנימי» on your own business → the totals line under the table drops its
  numbers; reload → still ticked.
- [human] Desktop, a business owner (not platform admin): no «דאשבורד מערכת» link; typing `/platform` sends you to
  the dashboard.
- [human] (only if 447 merged) Desktop, platform admin: click a business name → its «ביצועים» cards open with no
  edit buttons and no links into its recipes, products or events; back returns to the table.
- [human] Mobile (≤ 620 px), platform admin: the table scrolls sideways inside its own box with the business name
  column fixed; the page itself does not scroll sideways.

## Execution Mode
- Parallel: yes against lanes 2 and 3 (check `node scripts/scope-check.mjs --overlap --plan=<this>`); no against
  447 (this plan's drill-down reuses its component and service) and any open plan editing `server/routes/admin.js`
  or `src/app/core/components/header/**`.
- Concurrent plans: 446 may still run — this plan only reads its fields. Never at the same time as 447: if 447 is
  not merged into `mvp` when this plan starts, the drill-down is off (Step 0).
- Isolated DB: no — only the `internal` flag of businesses is written, through the API.

## Execution Notes
- Depends on: plan 430 merged (`usageDays`, `server/utils/usage-stats.js`), plan 442 merged (event `stage`,
  `closedAt`, `legacy`). Drill-down depends on plan 447 merged — **checked at Step 0**, not a blocker.
- Through them: 424–427 (business, scoping, `requirePlatformAdmin`), 433 (`rounding.ts` `formatPctInt`).
- Must not run at the same time as: 447 (drill-down reuses its files); any plan editing `server/routes/admin.js` or
  the header component (none open in the map after 428).
- Lane wt-1, last (after 432).
- MVP run mode: executed unattended into branch `mvp` per `docs/mvp/run-mode.md` — Atlas steps are rehearsed on a scratch copy and deferred to the final gate; [human] items become validation cards in `docs/mvp/runs/<NNN>.md`.
- Decision (Planner review): drill-down reuse is concrete — server: call 447's builders in
  `server/services/business-stats.js` (`periodBounds`, `eventsPipeline`, `usagePipeline`, `shapeStats`) with
  `{ businessId: <id> }` as scope and `isOwner = true`; if 447 left that orchestration inside `server/routes/stats.js`,
  move it into an exported `computeBusinessStats(db, business, period, isOwner)` in `business-stats.js` and make
  447's route call it (behaviour unchanged, 447's tests still pass). Client: `BusinessPerformanceComponent` gains
  `readonly = input(false)` and `statsSource = input<((period: string) => Observable<BusinessStats>) | null>(null)`
  (null → its own `BusinessStatsService.get`) — why: keeps every client edit inside 447's component folder, no
  second copy of the cards.
- Decision (Planner review): live events use `LIVE` from `server/jobs/purge-deleted.js` (same soft-delete filter as
  447), and close rate = closed ÷ (closed + current `not_closed`), all-time — 447's formula without the period.
- The platform-admin gate: plan 426 adds `UserService.isPlatformAdmin_` but no route guard, so this plan creates
  `platform-admin.guard.ts` on `isPlatformAdmin_()`.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/admin.js
server/test/admin-businesses.test.js
src/app/core/services/platform-admin.service.ts
src/app/core/guards/platform-admin.guard.ts
src/app/core/components/header/**
src/app/pages/platform-dashboard/**
src/app/pages/breadcrumbs.md
src/app/pages/dashboard/components/business-performance/**
server/services/business-stats.js
src/app/app.config.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

INV-1/INV-2 wording comes from ADR `docs/brain/decisions/0023-business-is-the-tenant.md` (plan 424): only platform
admin screens may read across businesses. Re-run `node scripts/scope-check.mjs --arch --plan=<this>` at Step 0 and
add a line for any newly reached invariant.

- INV-1: preserves — the new cross-business reads are behind `requirePlatformAdmin` and return counts and dates
  only, never business content; no business write except the admin-only `internal` flag.
- INV-2: preserves — `server/services/business-stats.js` (447's read-only aggregation builder) may only gain an
  exported wrapper for the drill-down; no master data, clone, sync or override behaviour changes.
- INV-6: preserves — no AI call.

## Step 0 — Reality Check

Runs always. Check by symbol, one line each, `ok` or `conflict: <what>`:
- `server/middleware/auth.js` exports `requirePlatformAdmin` (C-USER); `server/routes/admin.js` uses it.
- `businesses` docs carry `name`, `ownerId`, `createdAt`, `internal` (C-BUSINESS); users carry `businessId`,
  `businessRole`, `removedAt` (C-USER).
- `server/utils/usage-stats.js` exports `activeDaysByBusiness`, and `server/middleware/usage.js` exports
  `jerusalemDate` (plan 430).
- `shared/schemas/entities/event-stage.ts` `EVENT_STAGES`; menu events carry `stage`, `closedAt`, `legacy`,
  `eventDate` (C-STAGES, plan 442).
- `src/app/core/engine/rounding.ts` `formatPctInt` (C-ENGINE, plan 433).
- `UserService.isPlatformAdmin_` (plan 426). If a platform-admin guard already exists, use it and do not create
  `platform-admin.guard.ts`.
- **Drill-down switch:** is plan 447 merged into `origin/mvp` (run mode)? Look for `server/services/business-stats.js`
  (`periodBounds`, `eventsPipeline`, `usagePipeline`, `shapeStats`), `server/routes/stats.js` `GET /business`,
  `BusinessStatsService` and `src/app/pages/dashboard/components/business-performance/`. Print
  `drill-down: on (<function>, <component path>)` or `drill-down: off (447 not merged)`. Off → skip sub-tasks P6
  and P7, mark them `[-] skipped: 447 not merged`, and the drill-down Done-when items do not apply. If 447's
  component folder differs from `src/app/pages/dashboard/components/business-performance/`, add its folder to the
  scope block and log the decision (run mode).
All `ok` → continue. A `conflict` → STOP for a go.

## Contracts used (verbatim from the approved map)

**C-USAGE (430; consumed by 428 last-login, 447, 448)**
- Collection `usageDays`: `{ _id: `${userId}:${date}`, userId, businessId, date: 'YYYY-MM-DD' /* Asia/Jerusalem */, firstAt, lastAt, writeCount }`. Written by `server/middleware/usage.js` `recordUsage` after auth; writes = POST/PUT/PATCH/DELETE on business data excluding /auth/*; reads update at most once per minute per user (in-memory throttle). No TTL. Index `{ businessId: 1, date: 1 }`.
- "Last login" = latest `lastAt` for the user.

**C-STAGES (442; consumed by 443, 446, 447, 448)**
- Stage keys: `inquiry`, `quote_sent`, `deposit_paid`, `ordering`, `execution`, `post_production`, `finished`, `not_closed`. Order array `EVENT_STAGES` in `shared/schemas/entities/event-stage.ts`.
- Event fields: `stage`, `stageHistory: { stage, at, by, byName, reason?, reasonText? }[]`, `closedAt?` (first transition to deposit_paid or later; never changes), `notClosedAt?`, `notClosedReason?: 'price' | 'date_taken' | 'no_reply' | 'other'`, `notClosedText?`, `legacy?: boolean` ("ישן"), `notes: { _id, text /* ≤ 2000 */, at, by, byName, editedAt? }[]`, `clientName?`, `clientPhone?`, `deposit?: { amount?, date? }`.
- "Closed" = `closedAt` set. Active = stage not in {finished, not_closed}.
- Dedicated router `server/routes/events.js` at `/api/v1/events`: `PUT /:id/stage` `{ stage, reason?, reasonText? }`, `POST /:id/notes`, `PUT /:id/notes/:noteId`, `DELETE /:id/notes/:noteId`, (446) `PUT /:id/closing`, `POST /:id/finish`, `POST /:id/reopen`, `POST /:id/refresh-plan`. Stage history/notes are written only by the server (generic PUT strips them).

**C-USER (424/425/426)**
- User fields added: `businessId: string`, `businessRole: 'owner' | 'staff'`, `isPlatformAdmin: boolean` (migration: `true` where `role === 'admin'`), `removedAt?: number` (staff removed → login blocked), `createdAt: number`. `role` stays read-only legacy until 426 removes client use.
- JWT access payload: `{ userId, name, businessId, businessRole, isPlatformAdmin }` (15m). Refresh unchanged `{ userId }`.
- Middleware: `requirePlatformAdmin` (new name) in `server/middleware/auth.js`; `requireAdmin` kept as an alias until 425 replaces all uses.
- Login with no businessId → 403 `{ error: 'NO_BUSINESS' }`, client key `no_business` → "החשבון לא משויך לעסק – פנה לתמיכה". Removed staff → 403 `{ error: 'USER_REMOVED' }`.

**C-BUSINESS (424 creates the collection; 429/431 add fields)**
- Collection `businesses`, one doc per business: `{ _id, name, ownerId, createdAt, internal: false, lastSyncedMasterVersion, settings, baseline? }`. Duplicate names allowed. Migration names existing ones "העסק של [username]".
- `settings` defaults `{ profitTargetPct: 25, safetyMarginPct: 10, overrunThresholdPct: 10 }` (429).
- `baseline` `{ inquiriesPerMonth?, eventsClosedPerMonth?, avgRevenuePerEvent?, estProfitPct?, filledAt }` (431).
- Zod schema `shared/schemas/entities/business.schema.ts`.
- Dedicated router `server/routes/business.js` mounted at `/api/v1/business`: `GET /` (my business + settings, any member), `PUT /settings` (owner, 429), `PUT /baseline` (owner, 431), `GET/POST/DELETE /team…` (owner, 428). Client `BusinessService` `src/app/core/services/business.service.ts` with `business_` signal.

## Design

### 1. Server (`server/routes/admin.js`, all `verifyToken, requirePlatformAdmin`)
`GET /businesses` → `{ rows: BusinessRow[] }`, built with a fixed number of queries (no per-business loop):
1. `businesses.find({ _id: { $ne: '__master__' } }, { projection: { name: 1, ownerId: 1, createdAt: 1, internal: 1 } })`.
2. `users.aggregate` grouped by `businessId`: owner name (`businessRole: 'owner'`), `staffCount` (`businessRole:
   'staff'`, no `removedAt`).
3. `usageDays.aggregate` `$group { _id: '$businessId', lastActivityAt: { $max: '$lastAt' } }`.
4. `activeDaysByBusiness(db, { from: jerusalemDate(now − 6 days), to: jerusalemDate(now) })` (plan 430) — last 7
   Israel days including today.
5. `menuEvents.aggregate` `$match { ...LIVE, legacy: { $ne: true } }` (`LIVE` from `server/jobs/purge-deleted.js`) → `$group` by
   `businessId`: `total`, `active` (stage not in `finished`/`not_closed`), `closed` (`closedAt` set), `finished`
   (`stage: 'finished'`), `notClosed` (`stage: 'not_closed'`), `lastEventDate: { $max: '$eventDate' }`.
Row = `{ _id, name, ownerName, staffCount, createdAt, internal: !!internal, lastActivityAt | null, activeDays7,
events: { total, active, closed, finished }, closeRate: closed + notClosed > 0 ? closed / (closed + notClosed) :
null, lastEventDate | null }`. All-time event numbers (spec); active days last 7. Legacy («ישן») and deleted events
never count, as in 07.2 / 09.1.
`PUT /businesses/:id/internal` body `{ internal: boolean }` (else 400) → `updateOne`; no match → 404. Log
`admin.business.internal_set`.
(Drill-down on) `GET /businesses/:id/performance?period=30|90|all` → 404 for an unknown id; otherwise runs plan
447's builders from `server/services/business-stats.js` for that business doc (scope `{ businessId: id }`,
`isOwner = true`, same period whitelist → 400 otherwise) and returns 447's response shape unchanged (see Execution
Notes decision).

### 2. Client
- Gate: plan 426's platform-admin guard if it exists; otherwise new `src/app/core/guards/platform-admin.guard.ts`
  (`CanActivateFn`: `inject(UserService).isPlatformAdmin_()` → true, else `router.createUrlTree(['/dashboard'])`).
- Route appended to `src/app/app.routes.ts`: `{ path: 'platform', loadComponent: () =>
  import('./pages/platform-dashboard/platform-dashboard.page').then(m => m.PlatformDashboardPage), canActivate:
  [authGuard, platformAdminGuard] }`; with drill-down on also `{ path: 'platform/business/:id', loadComponent: () =>
  import('./pages/platform-dashboard/components/business-performance-view/business-performance-view.component')
  .then(m => m.BusinessPerformanceViewComponent), canActivate: [authGuard, platformAdminGuard] }`.
- `src/app/core/services/platform-admin.service.ts`: `rows_` signal, `load()`, `setInternal(id, internal)`
  (optimistic update, revert + toast on error), `loadPerformance(id, period)` (drill-down on).
- `PlatformDashboardPage` (`src/app/pages/platform-dashboard/platform-dashboard.page.*`): `app-page-header`
  `titleKey="platform_dashboard"`; table columns in this order: name · owner · staff · joined · last activity ·
  active days (7) · events total · active · closed · finished · close rate · last event date · «פנימי» checkbox.
  `sortKey_` / `sortDir_` signals, `sortedRows_` computed (default `lastActivityAt` desc, `null` last); header
  buttons with `aria-sort`. Row class `is-idle-7` (last activity > 7 days ago) / `is-idle-14` (> 14 days or never).
  Under the table a totals line over rows with `internal: false`: businesses, staff, events total / active /
  closed / finished, overall close rate. Dates `dd/MM/yyyy`; close rate via `formatPctInt` from
  `src/app/core/engine/rounding.ts`, `null` → «—». Business name is a link to `/platform/business/:id` only when
  drill-down is on, else plain text.
- (Drill-down on) `components/business-performance-view/`: reads `:id`, period picker identical to 447's, renders
  447's `BusinessPerformanceComponent` with `[readonly]="true"` (hides edit buttons, turns funnel /
  «צור פנייה ראשונה» links off) and `[statsSource]` = `PlatformAdminService.loadPerformance(id, period)`. Add both
  inputs in `src/app/pages/dashboard/components/business-performance/`, defaults `false` / `null` so the owner
  dashboard is unchanged.
- Header: link «דאשבורד מערכת» (`activity` icon) in the side menu and the mobile profile menu, only for the
  platform admin.

### 3. Dictionary (append, group `general`)
| key | Hebrew |
|---|---|
| `platform_dashboard` | דאשבורד מערכת |
| `platform_col_business` | עסק |
| `platform_col_owner` | בעלים |
| `platform_col_staff` | צוות |
| `platform_col_joined` | הצטרף |
| `platform_col_last_activity` | פעילות אחרונה |
| `platform_col_active_days_7` | ימי שימוש (7 ימים) |
| `platform_col_events_total` | מספר אירועים |
| `platform_col_events_active` | פעילים |
| `platform_col_events_closed` | נסגרו |
| `platform_col_events_finished` | הסתיימו |
| `platform_col_close_rate` | אחוז סגירה |
| `platform_col_last_event` | אירוע אחרון |
| `platform_col_internal` | פנימי |
| `platform_totals` | סה"כ (ללא עסקים פנימיים) |
| `platform_no_businesses` | אין עסקים עדיין |
| `platform_back_to_table` | חזרה לטבלה |
| `never` | אף פעם |

### 4. Icons
Add `ArrowUpDown` (sort headers) to `src/app/app.config.ts`. `Activity`, `ChevronLeft` already registered.

## Functional Requirements

### Must Have (P0)
- [ ] Platform-admin-only server endpoint with all spec columns, computed on the server, no business content.
- [ ] Owner (non-admin) → 403 on the API and no access to the screen.
- [ ] Sort by any column; default last activity.
- [ ] Idle 7 days → yellow, 14 → red.
- [ ] «פנימי» toggle stored on the business and excluded from the totals.
- [ ] Business with no events → zeros; legacy and deleted events never count.

### Should Have (P1)
- [ ] (Only if 447 merged) click a business → its performance cards, read-only.

## UI/UX Notes
- New lazy page, desktop-first table; on mobile the table scrolls inside its container (`overflow-x: auto`) with
  the name column `position: sticky; inset-inline-start: 0`.
- Idle colours from existing warning / danger tokens in `src/styles.scss` (background tint on the row, plus a small
  text label for colour-blind users: «לא פעיל 7+» / «לא פעיל 14+»).
- RTL, logical properties only; run `cssLayer` before `.scss`.

## Atomic Sub-tasks
- [ ] P1: Compute one row per business from members, activity and events, never their content — GET /businesses with five grouped queries, PUT /businesses/:id/internal — server/routes/admin.js
- [ ] P2: Prove the numbers, the internal flag and the admin-only lock with server tests — two-business fixture, every Done-when case — server/test/admin-businesses.test.js
- [ ] P3: Keep the screen to the platform admin and load its data — platform-admin guard (or 426's), PlatformAdminService — src/app/core/guards/platform-admin.guard.ts, src/app/core/services/platform-admin.service.ts
- [ ] P4: Show the sortable business table with idle colours, internal toggle and totals — PlatformDashboardPage, lazy /platform route, spec — src/app/pages/platform-dashboard/**, src/app/app.routes.ts
- [ ] P5: Link the screen from the header for the platform admin only — side menu + mobile profile menu — src/app/core/components/header/**
- [ ] P6: (Only if 447 merged) Serve one business's performance numbers to the platform admin — GET /businesses/:id/performance running 447's builders (computeBusinessStats wrapper if needed), test case — server/routes/admin.js, server/services/business-stats.js, server/test/admin-businesses.test.js
- [ ] P7: (Only if 447 merged) Open a business's performance cards read-only from the table — BusinessPerformanceViewComponent, platform/business/:id route, readonly + statsSource inputs on 447's cards — src/app/pages/platform-dashboard/components/business-performance-view/**, src/app/pages/dashboard/components/business-performance/**
- [ ] P8: Add the Hebrew texts, the sort icon and the folder map entry — 18 dictionary keys, ArrowUpDown, pages breadcrumbs — public/assets/data/dictionary.json, src/app/app.config.ts, src/app/pages/breadcrumbs.md
- [ ] P9: Build, test and hand over the admin dashboard checks — ng build, server suite, listed specs, log-query; Human runs the [human] items — this plan file

## Technical Considerations
- Dependencies: `requirePlatformAdmin` (424/425), `usageDays` + `activeDaysByBusiness` + `jerusalemDate` (430),
  event stage fields (442), `formatPctInt` (433), 447's performance computation and cards (optional).
- New files: `server/test/admin-businesses.test.js`, `platform-admin.service.ts`, `platform-admin.guard.ts` (if
  426 has none), `pages/platform-dashboard/**`.
- Model changes: client `BusinessRow` interface in `platform-admin.service.ts`; no schema change (`internal`
  already in C-BUSINESS).
- Backend / API: `GET /api/v1/admin/businesses`, `PUT /api/v1/admin/businesses/:id/internal`, (drill-down)
  `GET /api/v1/admin/businesses/:id/performance`.
- Auth and validation: platform admin only; `internal` must be boolean; ids looked up, unknown → 404.
- Security surface: first cross-business read endpoint — returns only names (business, owner), counts and dates;
  test asserts the exact key set so content never leaks in later.
- Data / migration: none.
- Project checks: log-query Done-when; chef-side stories (platform admin is the user here); 18 dictionary keys;
  RTL logical CSS; `ArrowUpDown` registered; new screen is a lazy route.

## Backend Impact
- Collections affected: `businesses` (`internal` written by the platform admin); reads `users`, `usageDays`,
  `menuEvents`.
- New collections: no.
- Server changes needed: yes — two (three with drill-down) routes in `server/routes/admin.js`.

## Out of Scope
- Impersonation, billing, cross-business money totals.
- Deleting a whole business from this screen (01.1 edge case; not in this plan).
- Charts over time, export.
- The drill-down when plan 447 is not merged (follow-up plan then).

## Critical Questions
None — spec 07.3 fixes the columns and rules. Interpretation used (flag if wrong): "events" columns and close rate
exclude «ישן» (legacy) and deleted events, as 09.1 says legacy events never count in dashboard metrics; «אירוע
אחרון» = the latest event date of a live event, past or future.
