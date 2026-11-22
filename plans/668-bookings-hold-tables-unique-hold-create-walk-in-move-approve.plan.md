# Plan 668 — Bookings hold tables: the unique hold, booking by a member, walk-in, move and change through the engine

Status: draft
Depends-on: 663, 664
Snapshot: 28359b6d54b0c77e288c52702a850daef92ccf07

## Problem Statement
A restaurant with the `tables` module has a drawn room (plan 664) and an engine that says which table fits a party
(plan 663), but a booking still holds nothing: `bookings` has no create route and two parties can be given the same
table at the same time. This plan makes a table booking real on the server: a booking of kind `table` carries its
tables, and one unique index makes it impossible for two bookings to hold the same table at the same moment. It adds
the routes the host needs: book by phone, seat a walk-in, move a party, change the time or the party, read the
day's free times.

Map row R6 of `docs/restaurant/restaurant-map.md`, first half. R6 was an `L` and is split: this plan is the holds
service, the one booking service and `server/routes/bookings.js`; plan 685 is the approve path of
`server/routes/requests.js` and the browser's data layer.

Verified on `origin/main` (28359b6d, 2026-11-22):
- `server/routes/bookings.js` (102 lines): `router.use(dataWriteLimiter)` (line 27); `db()` is
  `mongoose.connection.db` (line 29); `scopeOf` (line 30); `MOVES` (lines 22–25); `COVERING` (line 37);
  `GET /day` (line 40) answers `{ bookings, coversByHour }`; `PUT /:id/status` (line 62) writes with a conditional
  `findOneAndUpdate` on the status that was read (lines 80–84) and bumps `counters.noShows` (lines 89–94). Both
  routes carry `verifyToken, requireModule('frontdesk')`. There is no create route.
- `server/middleware/require-module.js` exports `businessModules, clearModuleCache, requireModule,
  requireHomeModule, requireModuleForType` (line 71); `requireModule(key)` answers 403 `MODULE_OFF`.
- `shared/schemas/entities/booking.schema.ts`: `bookingSchema` is a `z.strictObject` with the refine
  `endAt === startAt + durationMinutes * 60000`; `clientId` is `z.string().min(1)`; `guestName` is `nameField`
  (may be empty); `statusHistory[].via` is `member | guest | server`; `BOOKING_SOURCES` has `phone` and `walk_in`.
- `server/routes/requests.js:271–279` is the client update of an approved booking: `kinds` loses `lead` and gains
  `diner`, `lastContactAt`, `counters.bookings` + 1. `TEST_CLIENT_ID = '__test__'` (line 179) is the precedent of a
  placeholder client id.
- `server/utils/client-upsert.js:51` `upsertClientByPhone(db, businessId, { name, phone, source, actor })` returns
  `{ client, created }` and throws `BAD_CLIENT` with `issues`.
- `server/middleware/validate.js` `checkStoredDoc(type, doc)` is how a router-written document is checked
  (`bookings.js:77`). `server/utils/id.js` `newId`, `server/utils/public-token.js` `newPublicToken`,
  `server/utils/actor.js` `actorOf`, `server/jobs/purge-deleted.js` `LIVE`.
- `shared/schemas/front-desk/local-time.ts` exports `jerusalemEpoch(date, time)` and `weekdayOf(date)` only; there
  is no function from an epoch to a Jerusalem date and time.
- Server tests run on an in-memory database through `server/test/helpers/app.js` (`buildTestApp`,
  `teardownTestApp`, `signTestToken`, `testDb`); `server/test/modules-gate.test.js:21–23` shows how a test gives a
  business its modules (`businesses` document + `clearModuleCache()`).
- The two existing routes are covered by the router test and the day test of bookings under `server/test/`.
- None of these exists: `server/services/table-holds.js`, `server/services/table-bookings.js`,
  `server/test/table-holds.test.js`, `server/test/bookings-tables.test.js`.

Exists after the plans this one depends on (treat as given, never edit):
- Plan 662: the collection `tableHolds` with the unique index `{ businessId: 1, tableKey: 1, cell: 1 }` and the
  index `{ businessId, bookingId }` (`server/db.js`); the optional booking fields of C-BOOK2 in `bookingSchema`;
  `shared/schemas/front-desk/table-service.ts` (`tableServiceOf`, `TABLE_SERVICE_DEFAULTS`); the module key
  `tables`; INV-7 in `docs/brain/invariants.md`.
- Plan 663: `shared/schemas/front-desk/table-engine.ts` (C-ENGINE), built into
  `server/generated/schemas/front-desk/table-engine`.
- Plan 664: the collection `floorPlans` filled through `server/routes/floor-plan.js` (C-FLOOR).

## Contracts (copied verbatim from the frozen map)

**C-HOLD (R6; used by R7, R9, R10, R11, R14, R18)**
- Collection `tableHolds` (server-only): one row per table per time cell —
  `{ _id, businessId, tableKey, cell: number, bookingId, test?: true }` where `cell` is the epoch of a
  `slotMinutes`-long step. Unique index `{ businessId: 1, tableKey: 1, cell: 1 }`; index `{ businessId, bookingId }`.
- `server/services/table-holds.js`: `claim(db, booking, tableKeys, startAt, endAtWithBuffer)` — one ordered
  `insertMany` of every cell of every table; a duplicate-key error deletes the rows this call inserted and returns
  `{ ok: false }`; `release(db, bookingId, fromEpoch?)` deletes the booking's rows (from a moment on, when a party
  leaves early); `holdsOf(db, businessId, fromEpoch, toEpoch) → Hold[]` for the engine.
- A booking of kind `table` in a business with `tables` on is written **only after** `claim` returned ok, and a
  failed booking write releases the claim. Moving a booking = claim the new cells, then release the old ones.
- This index is the only guard against a double booking (INV-7). No route checks by reading first and trusting it.

**C-BOOK2 (R0 fields, R6 routes; used by R7, R9, R10, R11, R14, R18)**
- `bookings` gains, all optional and server-written: `tableKeys: string[] (1–4)`, `areaKey`, `seatedAt`,
  `finishedAt`, `remindedAt`, `guestConfirmedAt`, `override: true` (a member chose the table against the engine),
  `test: true`. Statuses stay the five that exist. "Late" is computed (`status === 'confirmed' && now > startAt +
  holdMinutes`), never stored.
- A walk-in sent without `guest` is stored with `clientId: '__walk_in__'`, `guestName: ''`, `guestPhone: ''`; no
  client is created and no counter moves (delta 3).
- Routes in `server/routes/bookings.js`, all `requireModule('frontdesk')` and `requireModule('tables')` (delta 2;
  `GET /day` and `PUT /:id/status` keep the `frontdesk` gate only), action `manageRequests`:
  `GET /availability?date=&partySize=&area=` → `dayAvailability` for members (not `onlineOnly`);
  `POST /` `{ clientId | guest: { name, phone }, date, time, partySize, areaKey?, tableKeys?, notes? }` → source
  `phone`; without `tableKeys` the engine assigns, with them the claim decides (owner only → `override`);
  409 `NO_TABLE` with `alternatives`;
  `POST /walk-in` `{ partySize, tableKeys, guest? }` → a `seated` booking from now, source `walk_in`;
  `PUT /:id/tables` `{ tableKeys }`; `PUT /:id/when` `{ date?, time?, partySize? }` (re-assign through the engine
  unless `tableKeys` is sent); the existing `PUT /:id/status` also stamps `seatedAt` / `finishedAt` and releases the
  hold from now on `finished`, `cancelled`, `no_show`.
  `GET /day` also returns `holds` and the bookings with no `tableKeys` (A7).
- `POST /api/v1/requests/:id/approve` for kind `table` with `tables` on: assign (or the sent `tableKeys`), claim,
  then the existing claim-and-insert of the request; any failure releases the hold. 409 `NO_TABLE` with
  alternatives.
- A client is found or created through the existing `upsertClientByPhone`; counters as today.

(The approve bullet of C-BOOK2 is built by plan 685 on the service of this plan.)

**C-ENGINE — the part this plan calls** (`server/generated/schemas/front-desk/table-engine`):
`Hold = { tableKey, startAt, endAt }` (epoch ms, `endAt` already includes the buffer);
`turnFor(service, partySize) → minutes`; `candidates(plan, partySize, areaKey?, onlineOnly) → Array<{ tableKeys,
seats }>`; `assign(plan, profile, holds, ask) → { ok: true, tableKeys, startAt, endAt } | { ok: false, reason }`;
`alternatives(plan, profile, holdsByDate, ask) → Array<{ date, time }>` (≤ 3); `dayAvailability(plan, profile, holds,
{ date, partySize, areaKey?, onlineOnly, now }) → Array<{ time, available }>`. The settings come from
`tableServiceOf(profile)` (C-TSERVICE), never from `profile.tableService` directly.

### Contract details this plan fixes (to be written into the map's "Contract extensions")
1. **Cells are always 15 minutes long**, whatever `slotMinutes` is (15 is the smallest value it may have). A
   business that changes `slotMinutes` from 30 to 15 would otherwise have old holds that a new booking cannot see.
   `CELL_MS = 15 * 60000`; a hold from `startAt` to `endAtWithBuffer` takes every cell that overlaps
   `[startAt, endAtWithBuffer)`: from `floor(startAt / CELL_MS) * CELL_MS` while `cell < endAtWithBuffer`.
2. **`holdsOf` returns one `Hold` per row**: `{ tableKey, startAt: cell, endAt: cell + CELL_MS }` (the engine only
   asks whether a range overlaps). `holdsOf` also takes an optional `exceptBookingId` so a booking being moved does
   not block itself.
3. **`move(db, booking, tableKeys, startAt, endAtWithBuffer)`** is added beside `claim`: a booking that moves to an
   overlapping time or keeps a table would collide with its own rows, so `move` inserts only the cells the booking
   does not hold yet, and only after that succeeded deletes the rows it no longer needs.
4. **One booking service.** `server/services/table-bookings.js` is the only code that turns an ask into a held
   table: `reserveTable` (assign → claim) and `bookTable` (reserve → write → release on failure). Plans 685, 669,
   673 and 680 call it; none of them calls `claim` itself.
5. `GET /day` gains `now` (the server's clock) beside `holds` and `unassigned`, so screens never use the device
   clock.

## Goals & Success Criteria
**Primary:** in a business with `tables`, a member can book a table by phone, seat a walk-in, move a party and
change a booking, every table booking holds its tables, and no two bookings can hold the same table at the same
time. A business without `tables` behaves exactly as before.

- [auto] `pnpm run test:server` → exit 0, including the new `server/test/table-holds.test.js` and
  `server/test/bookings-tables.test.js`, with the existing tests of the two booking routes and of approve green and
  not edited.
- [auto] `server/test/table-holds.test.js`: `claim` of two tables from 20:00 to 21:30 inserts 12 rows (6 cells × 2
  tables); a second `claim` of one of them from 21:15 returns `{ ok: false }` and the collection still has exactly
  the first 12 rows; a `claim` from 21:30 succeeds; `release(db, businessId, id)` removes all rows of the booking;
  `release(db, businessId, id, 20:45)` leaves the cells before 20:45; `holdsOf` returns one hold per row inside the range and
  none of another business; `move` to the same table one cell later succeeds and leaves exactly the new cells;
  `move` onto a table another booking holds returns `{ ok: false }` and leaves the booking's old rows untouched.
- [auto] `server/test/bookings-tables.test.js` ("twenty at once"): twenty `POST /api/v1/bookings` sent together for
  the same `tableKeys`, date and time answer exactly one 201 and nineteen 409 `NO_TABLE`; `bookings` has one
  document and every `tableHolds` row carries its `_id`.
- [auto] `server/test/bookings-tables.test.js` ("no orphan hold"): `bookTable` called with an injected `insert`
  that throws leaves `tableHolds` empty and `bookings` empty.
- [auto] `server/test/bookings-tables.test.js`: `POST /` without `tableKeys` stores a `confirmed` booking with
  source `phone`, the engine's `tableKeys`, `durationMinutes` equal to `turnFor`, and bumps the client's
  `counters.bookings` by 1; a full time answers 409 `{ error: 'NO_TABLE', reason: 'full', alternatives }` with at
  most three alternatives and writes nothing; `tableKeys` from a staff token answers 403 and from the owner stores
  `override: true` when the set is not an engine candidate; an unknown or not active table answers 400
  `BAD_TABLES`.
- [auto] `server/test/bookings-tables.test.js`: `POST /walk-in` with `guest` stores a `seated` booking with source
  `walk_in`, `seatedAt` and a client; without `guest` it stores `clientId: '__walk_in__'`, `guestName: ''`, and the
  `clients` collection is unchanged; on a table that is held now it answers 409 `NO_TABLE`.
- [auto] `server/test/bookings-tables.test.js`: `PUT /:id/tables` moves the holds to the new table and frees the
  old one (a new booking on the old table at the same time succeeds); `PUT /:id/when` with a new time re-assigns
  through the engine and with a full time answers 409 `NO_TABLE` and leaves the booking and its holds as they
  were; `PUT /:id/status` to `seated` stamps `seatedAt`, to `finished` stamps `finishedAt` and deletes the holds
  from that moment, to `cancelled` and `no_show` deletes them.
- [auto] `server/test/bookings-tables.test.js`: `GET /availability` returns `{ slots: [{ time, available }] }`
  with the booked time not available; `GET /day` returns `holds`, `unassigned` (the id of a seeded table booking
  with no `tableKeys`) and `now`; each of the five new routes answers 403 `MODULE_OFF` for a business with
  `['frontdesk']` only, and `GET /day` and `PUT /:id/status` answer for it exactly as before (no `holds` key).
- [auto] `server/test/invariants.test.js`: the two tests named `INV-7 …` pass — twenty concurrent creates give one
  booking, and a direct second `claim` over an overlapping time returns `{ ok: false }`.
- [auto] `server/test/bookings-tables.test.js` ("logs"): after a phone booking and a walk-in with a guest, the
  captured log lines contain neither the guest's name nor the phone digits.
- [auto] `pnpm --dir server run lint` → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.

## Execution Mode
- Parallel: no — first plan of run `rs-book-srv` (668, 685, 669, in that order). It edits
  `server/routes/bookings.js`, which plan 669's cancel path reads; `rs-book-srv` may run beside `rs-floor-ui`
  (665, 666, 667), which touches no file of this scope.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/services/table-holds.js
server/services/table-bookings.js
server/routes/bookings.js
server/test/table-holds.test.js
server/test/bookings-tables.test.js
server/test/invariants.test.js
server/breadcrumbs.md
docs/brain/component-families.md
docs/restaurant/restaurant-map.md
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

- INV-1: preserves — every new route of `server/routes/bookings.js` runs after `verifyToken`, scopes by
  `scopeFilter(req)` and is authorised with `assertCan(req, res, 'manageRequests', …)`; choosing a table against the
  engine on a phone booking also needs `editFrontDesk` (owner). The generic API stays read-only for `bookings`.
- INV-2: preserves — both new services take `businessId` from the caller's scope and put it in every query and every
  `tableHolds` row; no query runs without it.
- INV-7: preserves — a table is given only by `assign` of the engine or by a member's explicit choice, and in both
  cases only the unique index of `tableHolds` decides; no route reads the holds and then trusts what it read.

## Reuse Check

- `server/services/table-holds.js` (`claim`, `move`, `release`, `holdsOf`) — family: none — rung: 4 — why: no code holds a resource by a unique index today; the request claim of `requests.js` is a status update on one document, not rows per time cell.
- `server/services/table-bookings.js` (`reserveTable`, `bookTable`, `countBooking`) — family: none — rung: 4 — why: one place for assign → claim → write → release, called by four routers; without it each caller would repeat the order and one would get it wrong.

## Defaults

- empty-state-on-list — exception — why: server only; the plan builds no list
- loading-and-error-states — exception — why: server only; the plan builds no screen
- app-list-container — exception — why: server only; the plan builds no list
- one-breakpoint-set — exception — why: server only; the plan writes no SCSS

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a host, I want to write down a booking while the guest is on the phone and have the screen give it a table, so
  that I never promise a table that is already taken.
- As a host, I want to seat a couple who walked in on a free table with one action, so that the room on the screen
  matches the room in front of me.
- As a restaurant owner, I want the system to make it impossible for two parties to get the same table at the same
  time, so that a busy evening does not end with guests waiting at the door.
- As a host, I want to move a party to another table or another hour, so that I can fix the evening as it changes.

## Functional Requirements

### Must Have (P0)

**`server/services/table-holds.js`** (new, CommonJS, `'use strict'`)
- [ ] `CELL_MS = 15 * 60000` exported. `cellsOf(startAt, endAtWithBuffer)` returns the cell epochs of Contract
  detail 1.
- [ ] `claim(db, booking, tableKeys, startAt, endAtWithBuffer)` where `booking` is `{ _id, businessId, test? }`:
  one `insertMany(rows, { ordered: true })` of `{ _id: newId(), businessId, tableKey, cell, bookingId: booking._id,
  ...(booking.test && { test: true }) }` for every cell of every table. On an error whose `code` is 11000 (or whose
  `writeErrors[0].code` is 11000) it deletes the rows this call inserted — `deleteMany({ businessId, bookingId, _id:
  { $in: <the ids of this call> } })` — and returns `{ ok: false }`. Any other error: the same clean-up, then
  rethrow. Success: `{ ok: true }`.
- [ ] `move(db, booking, tableKeys, startAt, endAtWithBuffer)`: reads the booking's rows, inserts the wanted
  `(tableKey, cell)` pairs it does not hold yet (same duplicate handling as `claim`), and only on success deletes
  its rows that are not wanted. A failure leaves the old rows exactly as they were.
- [ ] `release(db, businessId, bookingId, fromEpoch?)`: `deleteMany({ businessId, bookingId, ...(fromEpoch !==
  undefined && { cell: { $gte: floor(fromEpoch / CELL_MS) * CELL_MS } }) })`. (The Contract's signature has no
  `businessId`; it is added so every query is scoped — write it into the map's extensions.)
- [ ] `holdsOf(db, businessId, fromEpoch, toEpoch, exceptBookingId?)` → `Hold[]` as in Contract detail 2, for rows
  with `cell >= fromEpoch − CELL_MS` and `cell < toEpoch`.
- [ ] `rangesOf(rows)` → `[{ tableKey, bookingId, startAt, endAt }]`: touching cells of one booking on one table
  merged into one range (used by `GET /day`).

**`server/services/table-bookings.js`** (new)
- [ ] `loadTableContext(db, businessId)` → `{ profile, plan, service }`: the live `frontDeskProfiles` document, the
  live `floorPlans` document (or `null`) and `tableServiceOf(profile)`.
- [ ] `wallOf(epoch)` → `{ date, time }` in Asia/Jerusalem (`Intl.DateTimeFormat` with `timeZone:
  'Asia/Jerusalem'`, `hourCycle: 'h23'`), so that `jerusalemEpoch(date, time)` gives back the same minute.
- [ ] `checkTables(plan, tableKeys)` → `true` when every key is a table of the plan with `active: true` and no key
  repeats; otherwise `false` (callers answer 400 `BAD_TABLES`). A plan of `null` → `false`.
- [ ] `reserveTable(db, { booking, ctx, date, time, partySize, areaKey, onlineOnly, tableKeys, now })` (`booking`
  is `{ _id, businessId, test? }`)
  → `{ ok: true, tableKeys, areaKey, startAt, endAt, durationMinutes, override }` or
  `{ ok: false, code: 'NO_TABLE', reason, alternatives }`:
  - `durationMinutes = turnFor(ctx.service, partySize)`, `startAt = jerusalemEpoch(date, time)`,
    `endAt = startAt + durationMinutes * 60000`, hold end `= endAt + ctx.service.bufferMinutes * 60000`.
  - Without `tableKeys`: read `holdsOf` for the day, call `assign(plan, profile, holds, { date, time, partySize,
    areaKey, onlineOnly, now })`. `ok: false` → `NO_TABLE` with the engine's `reason` and, when the reason is
    `full`, `alternatives(...)` (else `[]`). `ok: true` → `claim`; when the claim loses the race, read the holds
    again and repeat, at most three times in all, then `NO_TABLE` with reason `full` and fresh alternatives.
  - With `tableKeys` (a member's choice): no `assign`; `claim` decides; a lost claim is `NO_TABLE` with reason
    `full` and `alternatives`. `override` is `true` when the sorted set is not the `tableKeys` of one of
    `candidates(plan, partySize, undefined, false)`.
  - `areaKey` in the answer is the `areaKey` of the first table of the set.
- [ ] `bookTable(db, { doc, ctx, date, time, partySize, areaKey, onlineOnly, tableKeys, now, insert })`: `doc` is
  the booking the caller built without the table fields. It calls `reserveTable`, completes the document
  (`date`, `time`, `startAt`, `endAt`, `durationMinutes`, `partySize`, `tableKeys`, `areaKey`, `override` when
  true), checks it with `checkStoredDoc('bookings', …)` **before** the claim is kept (an invalid document releases
  and throws `INVALID_DOC` with `issues`), writes it with `insert` (default
  `d => db.collection('bookings').insertOne(d)`), and on any write error calls `release` and rethrows. Returns
  `{ ok: true, booking }` or the `NO_TABLE` answer.
- [ ] `countBooking(db, businessId, clientId, now)`: the client update of `requests.js:271–279` for a booking
  (`kinds` without `lead` plus `diner`, at most three; `lastContactAt`; `counters.bookings` + 1). It does nothing
  for `'__walk_in__'` and `'__test__'`.
- [ ] `WALK_IN_CLIENT_ID = '__walk_in__'` exported.

**`server/routes/bookings.js`** — five new routes, each `verifyToken, requireModule('frontdesk'),
requireModule('tables')`, each `assertCan(req, res, 'manageRequests', { type: 'bookings' })`. Input is checked by
hand in the style of the file (400 `BAD_REQUEST_INPUT`): `date` `YYYY-MM-DD`, `time` `HH:mm`, `partySize` an
integer 1–30, `areaKey` and every table key `^[a-z0-9]{6,12}$`, `tableKeys` an array of 1–4, `notes` a string of
at most 1000, `guest.name` 1–`NAME_MAX_LENGTH` characters, `guest.phone` 7–30 characters.
- [ ] `GET /availability?date=&partySize=&area=` → `{ slots }` from `dayAvailability` with `onlineOnly: false` and
  the day's `holdsOf`. No plan → `{ slots: [] }`.
- [ ] `POST /` — exactly one of `clientId` and `guest`. `clientId`: the live, unmerged client of the business, else
  404 `CLIENT_NOT_FOUND`. `guest`: `upsertClientByPhone(db, businessId, { name, phone, source: 'manual', actor })`;
  `BAD_CLIENT` → 400 with its `issues`. `tableKeys` present → `assertCan(req, res, 'editFrontDesk', { type:
  'bookings' })` and `checkTables` (400 `BAD_TABLES`). Then `bookTable` with `onlineOnly: false` and a document of
  kind `table`, status `confirmed`, source `phone`, `guestName` / `guestPhone` from the client, a new
  `publicToken`, `statusHistory: [{ status: 'confirmed', at, by, byName, via: 'member' }]`. `NO_TABLE` → 409 with
  `reason` and `alternatives`. Success → `countBooking`, log `bookings.created` with `source`, `partySize`,
  `tables` (a count) and `override`, answer 201 with the booking.
- [ ] The walk-in body lives in `server/services/table-bookings.js` as the exported
  `createWalkIn(db, ctx, { partySize, tableKeys, guest?, name? })` (`name` sets `guestName` on a placeholder-client
  walk-in); the route below only validates and calls it, so the waiting list of plan 673 seats a party through the
  same function.
- [ ] `POST /walk-in` `{ partySize, tableKeys, guest? }` — `checkTables` (400 `BAD_TABLES`); `now = Date.now()`;
  `{ date, time } = wallOf(now)`; `bookTable` with those and the sent `tableKeys`; status `seated`, source
  `walk_in`, `seatedAt: now`, history `[{ status: 'seated', … }]`. With `guest`: the client as in `POST /` and
  `countBooking`. Without: `clientId: WALK_IN_CLIENT_ID`, `guestName: ''`, `guestPhone: ''`, no client write. Any
  member may choose the table of a walk-in (the host sees who is standing there); the opening hours are not
  checked.
- [ ] `PUT /:id/tables` `{ tableKeys }` — the booking must be of kind `table` and `confirmed` or `seated` (else 409
  `BAD_STATUS`); `checkTables`; `move` over `[startAt, endAt + buffer)` (for a `seated` booking from
  `max(startAt, now)`); lost → 409 `NO_TABLE` with `alternatives: []`; success → `$set` `tableKeys`, `areaKey`,
  `override` (as in `reserveTable`), `updatedAt`. This is also how a booking with no table (A7) gets one.
- [ ] `PUT /:id/when` `{ date?, time?, partySize?, tableKeys? }` — only a `confirmed` table booking (else 409
  `BAD_STATUS`); at least one field. The new values are merged over the stored ones; without `tableKeys` the
  engine assigns with the booking's own holds left out (`exceptBookingId`), and the new cells are taken with
  `move`; `tableKeys` follows the rule of `POST /` (owner only). Failure → 409 `NO_TABLE` with `reason` and
  `alternatives`, booking and holds unchanged. Success → one `$set` of `date`, `time`, `startAt`, `endAt`,
  `durationMinutes`, `partySize`, `tableKeys`, `areaKey`, `override`, `updatedAt`, checked with `checkStoredDoc`
  before the move is made.
- [ ] `PUT /:id/status` (existing): when the booking has `tableKeys`, `seated` also sets `seatedAt: now`,
  `finished` sets `finishedAt: now`, and `finished`, `cancelled` and `no_show` call `release(db, businessId, id,
  now)` after the status write succeeded. `no_show` does not bump the counter of `'__walk_in__'` (it cannot be
  reached: a walk-in is never `confirmed`). A booking without `tableKeys` behaves exactly as today.
- [ ] `GET /day` (existing): when `businessModules(businessId)` includes `tables`, the answer gains
  `holds` (`rangesOf` of the rows from the day's first minute to the next day's 06:00, Jerusalem), `unassigned`
  (the `_id`s of `confirmed` or `seated` table bookings of the day with no `tableKeys`) and `now`. Without the
  module the answer is exactly `{ bookings, coversByHour }`.
- [ ] Logs: events `bookings.created`, `bookings.walk_in`, `bookings.moved`, `bookings.changed`,
  `bookings.no_table` with ids, counts, `reason` and `source` only — never a name, a phone or a note.

**Tests**
- [ ] `server/test/table-holds.test.js` and `server/test/bookings-tables.test.js` as listed in Goals. The fixture
  is a business with `['frontdesk', 'tables']`, a profile open every day 08:00–23:00, and a plan of four tables in
  two areas (2, 2, 4 and 6 seats) with one join. Dates are computed from the test's own clock (two days ahead) so
  no rule of lead time fails; service functions get `now` as an argument.
- [ ] `server/test/invariants.test.js`: a `describe('INV-7 The engine and the hold decide a table', …)` block with
  the two tests of Goals.

**Registries and docs**
- [ ] `server/breadcrumbs.md`: rows for the two services; the `routes/bookings.js` row says it creates table
  bookings. `docs/brain/component-families.md`: two entries, `table-holds` and `table-bookings`, in the shape of
  `business-delete`. `docs/restaurant/restaurant-map.md` "Contract extensions (run)": the five details above and
  the `businessId` argument of `release`.

### Should Have (P1)
- [ ] `GET /availability` reads the plan and the holds once per call (two queries), never once per slot.

### Nice to Have (P2)
- none

## UI/UX Notes
- No screen changes. Plan 685 adds the browser calls; plans 671 and 672 build the screens.
- No keys are added to `public/assets/data/dictionary.json`.

## Atomic Sub-tasks

- [ ] A1: Build the hold service so one unique index decides who has a table — cells of 15 minutes, claim with clean-up on a duplicate, move, release, holdsOf, rangesOf — server/services/table-holds.js
- [ ] A2: Prove the hold service with tests before any route uses it — the claim, overlap, release-from, move and other-business cases of Goals — server/test/table-holds.test.js
- [ ] A3: Add the one service that turns an ask into a held, written booking — loadTableContext, wallOf, checkTables, reserveTable with three tries, bookTable with release on a failed write, countBooking — server/services/table-bookings.js
- [ ] A4: Let a member book a table by phone and seat a walk-in — POST / and POST /walk-in with both gates, input checks, client handling and the placeholder walk-in client — server/routes/bookings.js
- [ ] A5: Let a member move a party and change a booking — PUT /:id/tables and PUT /:id/when through move, booking and holds unchanged on failure — server/routes/bookings.js
- [ ] A6: Make the existing routes table-aware without changing them for other businesses — availability read, day read with holds, unassigned and now, status stamps and release — server/routes/bookings.js
- [ ] A7: Test every route, the twenty-at-once race, the failed write and the logs — the route cases of Goals — server/test/bookings-tables.test.js
- [ ] A8: Add the invariant tests that fail by name if a double booking becomes possible — the INV-7 describe block — server/test/invariants.test.js
- [ ] A9: Record the new pieces where the next plan looks for them — folder map rows, two registry entries, the Contract extensions — server/breadcrumbs.md, docs/brain/component-families.md, docs/restaurant/restaurant-map.md

## Technical Considerations
- Dependencies: `server/routes/bookings.js` (two routes changed in behaviour only for bookings with `tableKeys` or
  businesses with `tables`); plans 685, 669, 671–674, 676 and 680 call the two services.
- New files needed: `server/services/table-holds.js`, `server/services/table-bookings.js`,
  `server/test/table-holds.test.js`, `server/test/bookings-tables.test.js`.
- Model changes: none (the booking fields are in the schema since plan 662).
- Backend / API: five new routes and two extended ones under `/api/v1/bookings`, as listed. Dedicated routes, not
  the generic API: `bookings` is `routerWrites` (plan 549).
- Auth and validation: `verifyToken`, both module gates, `manageRequests` (any member); a chosen table on a phone
  booking or a changed booking needs `editFrontDesk` (owner). Every stored document passes `checkStoredDoc`.
- Security surface: member-only routes; no new secret; the write limiter of the router (`dataWriteLimiter`) covers
  the new routes. Logs carry no name, phone or note.
- Data / migration: none. Existing bookings have no `tableKeys` and hold nothing (A7); `GET /day` lists them as
  `unassigned`.
- No transaction is used: the order is claim, write, release on failure. A crash between the claim and the write
  leaves rows with a `bookingId` that has no booking; they block that table for that time only. Plan 676's
  scheduler is the place for a sweep; this plan does not add one.
- Project checks: the `log-query` Done-when item is in Goals; no Hebrew string, icon or dictionary key; folder maps
  are in the scope (`server/breadcrumbs.md`); dedicated endpoints are justified above.

## Out of Scope
- Approving a table request through the engine and the browser's data layer (plan 685).
- The public availability read and automatic confirmation for guests (plan 669).
- Any screen (plans 671, 672), the waiting list (673), reminders and the automatic no-show (676).
- Editing `server/db.js`, `server/constants/collections.js`, any schema file or `docs/brain/invariants.md`
  (plan 662 owns them).
- A sweep of holds whose booking was never written.

## Critical Questions
- none

## Execution Notes
