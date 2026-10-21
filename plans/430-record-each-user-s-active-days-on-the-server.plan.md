# Plan 430 — Record each user's active days on the server

Status: active
Track: code
Snapshot: 8ffda3d2c4d8f3ab5137bfee30e9d80026d28110

## Problem Statement
Spec 07.1. FoodVibe cannot tell whether a business actually uses the app. The dashboard's "recent activity" is
browser `localStorage` only (`activity-log.service.ts`), and `server/services/log-sink.js` keeps only warnings in
`app_logs` with a 90-day TTL (`LOG_PERSIST_INFO` is not set in `render.yaml`) — neither can answer "how many days
this week did this kitchen work in FoodVibe". Three consumers need that answer: the Team list's "last login"
(plan 428 shows «—» until this plan), the business performance dashboard's "ימי שימוש בשבוע" (plan 447) and the
platform admin table (plan 448).

This plan adds one small server-side record per user per Israel day, written after every authenticated request,
no client code, no content stored — and wires the Team list's last-login value.

User stories:
- As a chef who owns the business, I want to see when each cook last used FoodVibe so that I know who is really
  working with it.
- As a chef, I want this measured without slowing my saves so that the app stays as fast as today.

## Goals & Success Criteria
**Primary:** every authenticated request leaves at most one `usageDays` document per user per Israel date with
first/last time and a write count; the Team list shows each member's last activity.

Done when:
- [x] [auto] `npm --prefix server test -- test/usage-days.test.js` passes, covering:
  - a user (token with `businessId`) `POST /api/v1/data/recipes` and `POST /api/v1/data/products` → exactly one
    `usageDays` doc `_id: '<userId>:<today Asia/Jerusalem>'` with `writeCount: 2`, `businessId` from the token,
    `firstAt ≤ lastAt`;
  - a `POST /api/v1/data/VERSION_HISTORY` and a failed write (400) do not add to `writeCount`;
  - two `GET /api/v1/data/products` within a minute → `lastAt` updated once (throttle), `writeCount` unchanged;
    after `_resetUsageThrottle()` the next GET updates `lastAt` again;
  - anonymous `GET /api/v1/data/products` → no `usageDays` doc;
  - a token without `businessId` → no doc, request still 200;
  - `POST /api/v1/auth/login` / `/refresh` / `/logout` and `POST /api/v1/ai/*` never count as writes;
  - `jerusalemDate(Date.UTC(2026, 9, 20, 21, 30))` → `'2026-10-21'` (00:30 in Israel), and
    `jerusalemDate(Date.UTC(2026, 9, 20, 20, 59))` → `'2026-10-20'`;
  - the request still answers 200 when the `usageDays` write throws (error swallowed, logged `warn`);
  - `activeDays(db, { businessId, from: '2026-10-18', to: '2026-10-24' })` with records Sunday 18 + Tuesday 20
    → 2; owner and staff both active on the 20th → still counted once for the business;
  - `lastActiveByUser(db, businessId)` → `Map(userId → max lastAt)`.
- [x] [auto] `npm --prefix server test -- test/business-team.test.js` passes with the updated expectation: a member with
  usage records gets `lastActiveAt` = their latest `lastAt`; a member with none gets `null`.
- [x] [auto] `npm --prefix server test` passes (whole server suite).
- [x] [auto] `npm --prefix server run lint` passes (no `console.*` in middleware).
- [x] [auto] `npx ng build` passes (no client change expected; guards against an accidental one).
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Desktop: as owner, open and save any recipe, then as staff open the app. Owner → «הגדרות» → «צוות» →
  both rows show today's date and time under «כניסה אחרונה» instead of «—».
- [human] Mobile (≤ 620 px): same Team tab shows the last-login line under each name, readable, no sideways scroll.

## Execution Mode
- Parallel: yes against lane 1 and lane 3 except plans editing `server/routes/business.js` or `server/middleware/auth.js`
  at the same time (429, 431 — check `node scripts/scope-check.mjs --overlap --plan=<this>`). 448 depends on this
  plan, so it never overlaps.
- Concurrent plans: whatever runs in lanes 1 and 3 at take time, minus the above.
- Isolated DB: no — adds a new collection and one index; never reshapes existing data.

## Execution Notes
- Depends on: plan 425 merged (JWT carries `businessId`, business scoping), plan 428 merged (team route
  `GET /api/v1/business/team` returning `lastActiveAt: null`, and the Team tab that renders it).
- Must not run at the same time as: 429, 431 (both edit `server/routes/business.js`). 448 reads `usageDays` and
  `usage-stats.js` but depends on this plan, so it always runs after it.
- Lane wt-2, after 437. Unblocks: 431, 447, 448.
- MVP run mode: executed unattended into branch `mvp` per `docs/mvp/run-mode.md` — Atlas steps are rehearsed on a scratch copy and deferred to the final gate; [human] items become validation cards in `docs/mvp/runs/<NNN>.md`.
- Decision (Planner review): besides `/api/v1/auth/*` (the contract's named exclusion) the recorder also does not
  count `/api/v1/log`, `/api/v1/ai`, `/api/v1/admin`, `VERSION_HISTORY` and `activity_log` writes — why: C-USAGE
  counts writes "on business data"; these are bookkeeping, AI quota or platform calls, not kitchen data. Log it in
  `docs/mvp/runs/430.md` `## Decisions`; no contract change.
- Contract extension (run): `server/utils/usage-stats.js` exports `lastActiveByUser`, `activeDays`,
  `activeDaysByBusiness`, `weekBounds`, and `server/middleware/usage.js` exports `jerusalemDate` — plans 447/448
  import them. Append these exports to `docs/mvp/mvp-map.md` `## Contract extensions (run)` under C-USAGE.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
server/middleware/usage.js
server/middleware/auth.js
server/utils/usage-stats.js
server/db.js
server/routes/business.js
server/test/usage-days.test.js
server/test/business-team.test.js
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

INV-1/INV-2 wording comes from ADR `docs/brain/decisions/0023-business-is-the-tenant.md` (plan 424). Re-run
`node scripts/scope-check.mjs --arch --plan=<this>` at Step 0 and add a line for any newly reached invariant.

- INV-1: preserves — `server/middleware/auth.js` only gains a non-blocking call after the token is verified; who
  may read or write what is unchanged. `usageDays` is not a user entity type and is not reachable through
  `/api/v1/data/:type` (not added to `ALL_USER_ENTITY_TYPES`).

## Step 0 — Reality Check

Runs always. Check by symbol, one line each, `ok` or `conflict: <what>`:
- `server/middleware/auth.js` `attachUser`, `verifyToken`, `optionalToken`; `req.user` carries `businessId` (C-USER).
- `server/routes/business.js` `GET /team` returns rows with `lastActiveAt: null` (plan 428).
- `server/db.js` index-creation function (the one with `kind_key_user_unique` / its 425 successor).
- `server/test/helpers/app.js` `signTestToken`, `testDb`.
- No `usageDays` collection or `server/middleware/usage.js` exists yet.
All `ok` → continue. A `conflict` → STOP for a go.

## Contracts used (verbatim from the approved map)

**C-USAGE (430; consumed by 428 last-login, 447, 448)**
- Collection `usageDays`: `{ _id: `${userId}:${date}`, userId, businessId, date: 'YYYY-MM-DD' /* Asia/Jerusalem */, firstAt, lastAt, writeCount }`. Written by `server/middleware/usage.js` `recordUsage` after auth; writes = POST/PUT/PATCH/DELETE on business data excluding /auth/*; reads update at most once per minute per user (in-memory throttle). No TTL. Index `{ businessId: 1, date: 1 }`.
- "Last login" = latest `lastAt` for the user.

**C-USER (424/425/426)** — only the JWT line is used here:
- JWT access payload: `{ userId, name, businessId, businessRole, isPlatformAdmin }` (15m). Refresh unchanged `{ userId }`.

## Design

### 1. `server/middleware/usage.js` (new)
- `jerusalemDate(ms: number): string` — `new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year:
  'numeric', month: '2-digit', day: '2-digit' }).format(ms)` → `YYYY-MM-DD`.
- `isCountedWrite(req)` — method ∈ {POST, PUT, PATCH, DELETE} **and** `req.originalUrl` does not start with
  `/api/v1/auth`, `/api/v1/log`, `/api/v1/ai`, `/api/v1/admin`, `/api/v1/data/VERSION_HISTORY`,
  `/api/v1/data/activity_log` (bookkeeping, not business data). Exported as `NOT_BUSINESS_WRITE_PREFIXES` for
  later routers to check.
- `recordUsage(req, res)` — called from `attachUser` right after `req.user` is set. Returns nothing (never a
  promise the caller awaits). Skips when `!req.user?.userId || !req.user?.businessId`. Registers
  `res.once('finish', …)`: on finish, `write = isCountedWrite(req) && res.statusCode < 400`; if not a write and the
  in-memory `lastReadUpdate_` map says this user was updated < 60 000 ms ago → return. Otherwise:
  ```js
  db.collection('usageDays').updateOne(
    { _id: `${userId}:${date}` },
    { $setOnInsert: { userId, businessId, date, firstAt: now },
      $set: { lastAt: now },
      $inc: { writeCount: write ? 1 : 0 } },
    { upsert: true })
  ```
  then sets `lastReadUpdate_.set(userId, now)`. Errors → `logger.warn({ err, event: 'usage.record.failed' })`,
  never thrown. Because it runs on `finish`, the response is already sent: zero added latency on saves (spec:
  "+< 20 ms").
- `_resetUsageThrottle()` exported for tests only.
- The throttle map is per process; on Render's single instance that is the whole app. Multiple instances would just
  update reads a little more often — harmless.

### 2. `server/middleware/auth.js`
`attachUser(req, token)` gains a `res` parameter; `verifyToken` and `optionalToken` pass `res`; after
`req.user = jwt.verify(…)`, call `recordUsage(req, res)`. Nothing else changes.

### 3. `server/db.js`
Add `await db.collection('usageDays').createIndex({ businessId: 1, date: 1 }, { name: 'business_date' })` next to
the other index calls. No TTL index.

### 4. `server/utils/usage-stats.js` (new, read helpers for 428 now and 447/448 later)
- `lastActiveByUser(db, businessId)` → aggregate `$match { businessId }` → `$group { _id: '$userId', last: { $max:
  '$lastAt' } }` → `Map<userId, number>`.
- `activeDays(db, { businessId, from, to })` → `distinct('date', { businessId, date: { $gte: from, $lte: to } })`
  `.length` — days with ≥ 1 active user (owner + staff the same day count once).
- `activeDaysByBusiness(db, { from, to })` → aggregate grouped by `{ businessId, date }` then by `businessId` →
  `Map<businessId, number>` (for plan 448's one-query table).
- Pure date helpers: `weekBounds(date)` → `{ from, to }` Sunday–Saturday in Israel dates.

### 5. Team list wiring (`server/routes/business.js`, `GET /team`)
Replace the `lastActiveAt: null` placeholder with `lastActiveByUser(db, req.user.businessId).get(u._id) ?? null`.
The Team tab from plan 428 already renders a number as date + time and `null` as «—» — no client change.

## Functional Requirements

### Must Have (P0)
- [ ] One `usageDays` doc per user per Israel date: first time, last time, write count, business.
- [ ] Writes = successful POST/PUT/PATCH/DELETE on business data; login/refresh/logout, AI, admin, log and
      version-history calls never count.
- [ ] Reads update at most once per minute per user; anonymous requests never recorded.
- [ ] No added latency (written after the response); failures never break a request.
- [ ] Team list shows each member's last activity.

### Should Have (P1)
- [ ] `activeDays` / `activeDaysByBusiness` / `weekBounds` helpers ready for plans 447 and 448.

## UI/UX Notes
- No new UI. The Team tab's «כניסה אחרונה» column (plan 428) switches from «—» to a date for members with records.
- No new dictionary keys, no icons.

## Atomic Sub-tasks
- [x] U1: Record one active-day entry per user per Israel day after each signed-in request — usage.js with jerusalemDate, isCountedWrite, recordUsage on finish, throttle — server/middleware/usage.js
- [x] U2: Call the recorder from token checking so every signed-in request is seen — attachUser(req, res, token) → recordUsage — server/middleware/auth.js
- [x] U3: Index the new collection by business and date for the dashboards — business_date index — server/db.js
- [x] U4: Add read helpers for last activity and active days per business — lastActiveByUser, activeDays, activeDaysByBusiness, weekBounds — server/utils/usage-stats.js
- [x] U5: Show each team member's real last activity instead of a dash — GET /team fills lastActiveAt — server/routes/business.js
- [x] U6: Prove counting, throttling, Israel midnight and the helpers with server tests — every Done-when case; update the team test's lastActiveAt expectation — server/test/usage-days.test.js, server/test/business-team.test.js
- [x] U7: Build, test, lint and hand over the Team-tab check — server suite, lint, ng build, log-query; Human runs the two [human] items — this plan file

## Technical Considerations
- Dependencies: `jsonwebtoken` verify in `attachUser`; `mongoose.connection.db`; `logger` from `server/logger.js`.
- New files: `server/middleware/usage.js`, `server/utils/usage-stats.js`, `server/test/usage-days.test.js`.
- Model changes: none in `shared/schemas` — `usageDays` is a server-only bookkeeping collection, never exposed
  through the generic API and never written by the client (INV-4 covers client-writable entities).
- Backend / API: no new endpoint; `GET /api/v1/business/team` now fills `lastActiveAt`.
- Auth and validation: none new; only authenticated requests are recorded.
- Security surface: stores user id, business id, dates and a count — no content, no IP, no user agent.
- Data / migration: new collection, created on first write; one index created at startup (idempotent). No TTL.
  Removed users' records stay. Rollback: drop the `usageDays` collection — nothing else reads it before 447/448.
- Project checks: log-query Done-when; chef stories; no dictionary keys; no icons; no new screen.

## Backend Impact
- Collections affected: `usageDays` (new); `users` read for the team list.
- New collections: yes — `usageDays`, required by spec 07.1 ("dedicated collection, separate from logs"); the
  existing `app_logs` has a 90-day TTL and does not keep info lines, so it cannot hold this.
- Server changes needed: yes — new middleware, a call in `server/middleware/auth.js`, one index in `server/db.js`,
  read helpers, `lastActiveAt` in `GET /team`.

## Out of Scope
- Page views, external analytics, session recording.
- Any dashboard card using the numbers (plans 447, 448).
- Changing the browser activity log (`activity-log.service.ts`) — stays as is.
- Counting AI calls as usage writes.

## Critical Questions
None — spec 07.1 fixes every rule (Israel day, writes vs reads, no TTL, no content).
