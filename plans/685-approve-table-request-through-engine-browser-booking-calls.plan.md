# Plan 685 — Approving a table request goes through the engine, and the browser learns the table booking calls

Status: draft
Depends-on: 668
Snapshot: 28359b6d54b0c77e288c52702a850daef92ccf07

## Problem Statement
After plan 668 a member can book a table that is really held, but the oldest path to a booking still holds
nothing: approving a table request (`POST /api/v1/requests/:id/approve`) writes a booking without a table, so an
owner can approve two requests for the same table and hour. And the browser cannot call any of the new booking
routes yet, so no screen can be built on them.

This plan is the second half of map row R6 (`docs/restaurant/restaurant-map.md`; R6 was an `L` and was split into
668 and 685). It sends the approve of a table request through the booking service of plan 668, and gives the
browser's data layer one method per table route.

Verified on `origin/main` (28359b6d, 2026-11-22):
- `server/routes/requests.js` (411 lines): `POST /:id/approve` (line 198). A test request is only marked approved
  (lines 214–224). `bookingOutcome(request, wanted, profile, ctx)` (line 140) builds the booking with
  `durationMinutes` from `profile.requestKinds[kind].defaultDurationMinutes ?? 60` and answers `{ missing }` when
  the date, time or party size is not there. The outcome is checked with `checkStoredDoc` before the claim
  (line 244); the request is claimed with a conditional `findOneAndUpdate` on the status that was read
  (lines 253–258, 409 `ALREADY_DECIDED`); the outcome is inserted (line 261) and a failed insert undoes the claim
  (lines 264–267); then the client update (lines 271–279) and `writeDecision` (line 280). The answer is
  `{ request, outcome }`.
- `loadProfile` (line 85) reads the live profile of a business; `wantedSchema` has `date`, `time`, `partySize`,
  `eventTypeKey`, `budgetPerGuest`, `location` and is strict (`shared/schemas/entities/request.schema.ts:34–47`).
- `server/middleware/require-module.js` exports `businessModules(businessId)` (cached 30 s) and
  `clearModuleCache`.
- `server/test/requests-approve.test.js` (the existing approve tests) seeds no `businesses` document with
  `tables`, so every case in it runs with the module off.
- `src/app/core/services/booking-data.service.ts` (78 lines): `DayLoad = { bookings, coversByHour }` (line 12),
  `BookingResult` (line 15), `day(date)` (line 34), `addServerCreated` (line 49), `setStatus` (line 53), the
  private `run(name, call)` (line 59) that puts the saved booking into the store and returns the server's code on
  a refusal. Its spec is beside it (`booking-data.service.spec.ts`).
- `src/app/core/services/request-data.service.ts`: `ApproveResult` (lines 19–20) and
  `approve(id, wanted?, note?)` (line 62), which posts `{ wanted?, note? }` and puts the outcome into its store;
  the private `refused(name, err)` (line 103) returns `{ ok: false, code }`. Its spec is beside it.
- `src/app/core/models/booking.model.ts` re-exports the booking types of `@schemas/entities`.
- `src/app/core/services/http-storage.adapter.ts:25` `API.bookings`.

Exists after plan 668 (treat as given): `server/services/table-bookings.js` with `loadTableContext`,
`checkTables`, `reserveTable`, `bookTable`, `countBooking`; `server/services/table-holds.js` with `release`; the
routes `GET /availability`, `POST /`, `POST /walk-in`, `PUT /:id/tables`, `PUT /:id/when` of
`/api/v1/bookings`, and `GET /day` answering `holds`, `unassigned` and `now` for a business with `tables`.

## Contracts (copied verbatim from the frozen map)

**C-BOOK2 — the approve bullet**
- `POST /api/v1/requests/:id/approve` for kind `table` with `tables` on: assign (or the sent `tableKeys`), claim,
  then the existing claim-and-insert of the request; any failure releases the hold. 409 `NO_TABLE` with
  alternatives.

**C-TABLES — the line that binds this plan**
- With `tables` off, `POST /requests/:id/approve` and the public request post behave exactly as today.

**C-HOLD — the rule that binds this plan**
- A booking of kind `table` in a business with `tables` on is written **only after** `claim` returned ok, and a
  failed booking write releases the claim.

## Goals & Success Criteria
**Primary:** in a business with `tables`, approving a table request gives the booking a held table or answers that
there is none, and the browser can call every table route of the bookings router. With `tables` off, approve is
unchanged.

- [auto] `pnpm run test:server` → exit 0, including the new `server/test/requests-approve-tables.test.js`, with
  the existing approve tests green and not edited.
- [auto] `server/test/requests-approve-tables.test.js`: approving a table request stores a `confirmed` booking
  with source `request`, `tableKeys` from the engine, `durationMinutes` equal to `turnFor`, and `tableHolds` rows
  of that booking; the request is `approved` and linked both ways; the client's `counters.bookings` is 1; one
  `decisionLog` row is written.
- [auto] same file: a second request for the same single free table and time answers 409
  `{ error: 'NO_TABLE', reason: 'full', alternatives }`; the request keeps its status, has no `outcome`, and no
  booking, hold or decision row was written.
- [auto] same file: the owner approving the refused request with `tableKeys` of another free table gets 200 and a
  booking on that table; the same body from a staff token answers 403; an unknown table key answers 400
  `BAD_TABLES` and leaves the request untouched.
- [auto] same file ("two approves at once"): two approves of two different requests for the same single table and
  time sent together answer one 200 and one 409 `NO_TABLE`; exactly one booking and its holds exist.
- [auto] same file ("no orphan hold"): when the booking insert is made to throw, the request is back in the status
  it had, and `tableHolds` and `bookings` are empty.
- [auto] same file: a `tasting` request in the same business, a table request in a business with `['frontdesk']`
  only, and a `test: true` table request are approved exactly as today (no `tableKeys`, no hold).
- [auto] `pnpm run test:ci` → exit 0, including the new cases of `src/app/core/services/booking-data.service.spec.ts` (each of
  `availability`, `create`, `walkIn`, `setTables`, `setWhen` calls its route with the body of C-BOOK2; a 409
  `NO_TABLE` returns `{ ok: false, code: 'NO_TABLE', reason, alternatives }` and leaves the store alone; a created
  booking is in the store) and of `src/app/core/services/request-data.service.spec.ts` (`approve` with `tableKeys` posts them; a 409
  `NO_TABLE` returns the alternatives).
- [auto] `pnpm run build` → exit 0. `pnpm run lint` → exit 0. `pnpm --dir server run lint` → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.

## Execution Mode
- Parallel: no — second plan of run `rs-book-srv` (668, 685, 669, in that order). It edits
  `server/routes/requests.js`; no other plan of the run edits it. The run may go beside `rs-floor-ui`: this plan
  appends to no hotspot file (no dictionary key, no route, no icon).
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/requests.js
server/test/requests-approve-tables.test.js
server/breadcrumbs.md
src/app/core/services/booking-data.service.ts
src/app/core/services/booking-data.service.spec.ts
src/app/core/services/request-data.service.ts
src/app/core/services/request-data.service.spec.ts
src/app/core/services/breadcrumbs.md
src/app/core/models/booking.model.ts
src/app/core/models/breadcrumbs.md
src/app/core/services/client-data.service.spec.ts
src/app/core/services/front-desk-badge.service.spec.ts
docs/workflow-kit/manifest.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — approve keeps `verifyToken`, the `frontdesk` gate and `assertCan(…, 'manageRequests', …)`;
  choosing the table needs `editFrontDesk` (owner); the browser services only call the routers, which decide.
- INV-7: preserves — approve gives a table only through `reserveTable` of plan 668 (the engine's `assign`, or the
  owner's choice, and in both cases the unique hold decides).

## Reuse Check

- Five methods on `BookingDataService` — family: entity-data-service — rung: 2 — why: the existing service and its private `run` helper, one method per route; no new service.

## Defaults

- empty-state-on-list — exception — why: no screen is built; the plan adds server logic and data-service calls
- loading-and-error-states — exception — why: no screen is built; the plan adds server logic and data-service calls
- app-list-container — exception — why: no list is built
- one-breakpoint-set — exception — why: the plan writes no SCSS

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a restaurant owner, I want an approved request to take a real table, so that I cannot approve two parties
  onto the same table by mistake.
- As a restaurant owner, I want to be told at once when the hour is full and which hours are free, so that I can
  offer the guest another time instead of finding out at the door.
- As a host, I want the screens of the next plans to be able to book, seat and move, so that I run the evening
  from the app.

## Functional Requirements

### Must Have (P0)

**`server/routes/requests.js` — `POST /:id/approve`**
- [ ] The table path is taken only when all three hold: `current.kind === 'table'`, `current.test !== true`, and
  `(await businessModules(current.businessId)).includes('tables')`. In every other case the route runs exactly the
  code of today.
- [ ] Body: an optional `tableKeys` (an array of 1–4 strings matching `^[a-z0-9]{6,12}$`; anything else 400
  `BAD_REQUEST_INPUT`). When sent: `assertCan(req, res, 'editFrontDesk', { type: 'requests' })` (owner), then
  `checkTables(ctx.plan, tableKeys)` → false answers 400 `BAD_TABLES`. `tableKeys` sent for another kind or with
  the module off answers 400 `BAD_REQUEST_INPUT`.
- [ ] Order of the table path, after the existing checks up to `bookingOutcome` (a missing date, time or party
  size still answers 400 `MISSING_BOOKING_FIELDS`):
  1. `loadTableContext(db(), businessId)`;
  2. `reserveTable(db(), { booking: { _id: outcomeId, businessId }, ctx, date, time, partySize, onlineOnly: false,
     tableKeys, now })` — `NO_TABLE` answers 409 `{ error: 'NO_TABLE', reason, alternatives }`; nothing else was
     written;
  3. the outcome of `bookingOutcome` is completed with the reservation's `startAt`, `endAt`, `durationMinutes`,
     `tableKeys`, `areaKey` and, when true, `override`; it is checked with `checkStoredDoc('bookings', …)` and the
     merged request with `validMerged` — a failure of either releases the hold (`release(db(), businessId,
     outcomeId)`) and answers the 400 of today;
  4. the request claim of today — not claimed: release, 409 `ALREADY_DECIDED`;
  5. the booking insert of today — on an error: the undo of the claim of today **and** `release`, then `fail`;
  6. the client update, `writeDecision` and the answer of today.
- [ ] No area is asked of the engine at approve (the request does not store one); the engine's order decides.
- [ ] The log line `requests.approved` gains `tables` (a count) on the table path; a refusal logs
  `requests.approve.no_table` with `reason` only.

**`src/app/core/models/booking.model.ts`**
- [ ] Types, no runtime code: `BookingSlot = { time: string; available: boolean }`,
  `BookingAlternative = { date: string; time: string }`,
  `TableHoldRange = { tableKey: string; bookingId: string; startAt: number; endAt: number }`,
  `NewBookingInput = { clientId?: string; guest?: { name: string; phone: string }; date: string; time: string;
  partySize: number; areaKey?: string; tableKeys?: string[]; notes?: string }`,
  `WalkInInput = { partySize: number; tableKeys: string[]; guest?: { name: string; phone: string } }`,
  `BookingWhenChange = { date?: string; time?: string; partySize?: number; tableKeys?: string[] }`.

**`src/app/core/services/booking-data.service.ts`**
- [ ] `DayLoad` gains optional `holds?: TableHoldRange[]`, `unassigned?: string[]`, `now?: number`.
- [ ] `BookingResult`'s failure branch becomes `{ ok: false; code: string | null; reason?: string; alternatives?:
  BookingAlternative[] }`; the private `run` reads `reason` and `alternatives` from the error body when they are
  there. Existing callers compile unchanged.
- [ ] `availability(date, partySize, area?)` → `Promise<BookingSlot[] | null>` (`GET /availability`; `null` on a
  failure, logged like `day`; not kept in the store).
- [ ] `create(input: NewBookingInput)`, `walkIn(input: WalkInInput)`, `setTables(id, tableKeys)`,
  `setWhen(id, change: BookingWhenChange)` → `Promise<BookingResult>`, each through `run` (the saved booking goes
  into the store).

**`src/app/core/services/request-data.service.ts`**
- [ ] `approve(id, wanted?, note?, tableKeys?)` sends `tableKeys` when given. `ApproveResult`'s failure branch
  gains optional `reason` and `alternatives`, filled from the error body of a 409 `NO_TABLE`. The requests page is
  not changed: it shows its existing "not saved" message for the new code until plan 672 gives it the
  alternatives and the table choice.

**Tests and docs**
- [ ] `server/test/requests-approve-tables.test.js`: the cases of Goals, on the fixture of plan 668's route test
  (a business with `['frontdesk', 'tables']`, hours every day, a four-table plan) with one more business that has
  `['frontdesk']` only. The booking id is random, so the failed insert cannot be forced by a seeded duplicate: the
  test makes the `insertOne` of the `bookings` collection throw once, with `vi.spyOn` on the prototype of the
  driver's `Collection` filtered by collection name.
- [ ] The two browser specs gain the cases of Goals.
- [ ] `server/breadcrumbs.md`: the `routes/requests.js` row says a table request is approved through the table
  booking service. `src/app/core/services/breadcrumbs.md`: the `booking-data.service.ts` row lists the new calls.
  `src/app/core/models/breadcrumbs.md`: the `booking.model.ts` row lists the new types.

### Should Have (P1)
- none

### Nice to Have (P2)
- none

## UI/UX Notes
- No screen changes and no new string. No keys are added to `public/assets/data/dictionary.json`.
- Known gap until plan 672: on a full hour the requests page shows its general "not saved" message, not the
  alternatives.

## Atomic Sub-tasks

- [x] A1: Send the approve of a table request through the booking service so it holds a real table — the table path with its six ordered steps, the optional table choice for the owner, release on every failure — server/routes/requests.js
- [x] A2: Prove approve with tests, with and without the module — held table, full hour with alternatives, owner's choice, two at once, failed insert, unchanged cases — server/test/requests-approve-tables.test.js
- [x] A3: Give the browser the types the table calls speak in — slot, alternative, hold range and the three input shapes — src/app/core/models/booking.model.ts
- [x] A4: Give the browser one call per table route of bookings — availability, create, walk-in, set tables, set when; the wider day answer; reason and alternatives on a refusal — src/app/core/services/booking-data.service.ts, src/app/core/services/booking-data.service.spec.ts
- [x] A5: Let the browser's approve send a chosen table and read the alternatives of a refusal — the fourth argument and the wider failure branch — src/app/core/services/request-data.service.ts, src/app/core/services/request-data.service.spec.ts
- [x] A6: Update the three folder maps so the next plan finds the new calls — one row each — server/breadcrumbs.md, src/app/core/services/breadcrumbs.md, src/app/core/models/breadcrumbs.md

## Technical Considerations
- Dependencies: `server/routes/requests.js` approve; `BookingDataService`, `RequestDataService` (existing callers
  unchanged). Plans 669–674 use the result.
- New files needed: `server/test/requests-approve-tables.test.js`.
- Model changes: six browser types in `booking.model.ts`; no schema change.
- Backend / API: `POST /api/v1/requests/:id/approve` accepts `tableKeys` and may answer 409 `NO_TABLE` and 400
  `BAD_TABLES`, only for a table request of a business with `tables`.
- Auth and validation: as today, plus `editFrontDesk` (owner) for a chosen table; the booking passes
  `checkStoredDoc` before the request is claimed.
- Security surface: none new (member routes only). Logs carry counts and reasons, never a name or a phone.
- Data / migration: none.
- Project checks: the `log-query` Done-when item is in Goals; no Hebrew string, key or icon; folder maps are in
  the scope.

## Out of Scope
- The holds service, the booking service and `server/routes/bookings.js` (plan 668).
- The guest's availability read and automatic confirmation (plan 669).
- Any screen: the alternatives and the table choice on a refused approve are plan 672's; the service screen is
  plan 671's.
- An area preference at approve.

## Critical Questions
- none

## Execution Notes
- Step 0: drift commit c1f441a3 (export) touches no symbol of this plan: ok.
- build, lint, test:ci (2864 pass), test:server (2164 pass), requests-approve-tables 5 pass: exit 0.
