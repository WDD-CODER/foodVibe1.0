# Plan 669 — Guests see free times and get a table at once when the owner allows it

Status: draft
Depends-on: 668, 685
Snapshot: 28359b6d54b0c77e288c52702a850daef92ccf07

## Problem Statement
A guest who opens a restaurant's booking page today types any date and hour and sends a request; a person at the
restaurant answers later. The guest cannot see which hours are free, and even when the room is empty nobody
confirms until the owner opens the app. After plans 663–668 the server knows the room, the engine and the holds.
This plan opens that knowledge to the public door: a read of the day's free times that shows no table, name or
count, a request that is confirmed in the same call when the owner chose automatic confirmation, and a guest who
can cancel before the cutoff and confirm that they are coming.

Map row R7 of `docs/restaurant/restaurant-map.md` (Contract C-PUBAVAIL). Server only; the page is plan 670.

Verified on `origin/main` (28359b6d, 2026-11-22):
- `server/routes/public.js` (198 lines): the header (lines 2–16) lists the rules of every public route — no member
  token, the business from the slug, `guestActor('form')`, `publicLimiter` and `honeypot` on writes, `guestScope`
  on every query, logs with the slug only. Routes: `GET /health` (36), `GET /:slug` (111, answers
  `publicView(profile)`), `POST /:slug/requests` (123: `publicRequestSchema`, `loadPublicProfile`, `isPublic`,
  `KIND_DISABLED`, `checkAnswers`, `createRequest`, answer 201 `{ reference, token }`),
  `GET /:slug/requests/:token` (159), `POST /:slug/requests/:token/cancel` (173: only a request in
  `CANCELLABLE = new | qualified | needs_info`, else 409 `ALREADY_DECIDED`), and a JSON 404 for anything else
  (196). `guestView` (77–97) already shows `booking: { date, time, partySize, status }` of an approved request.
  `referenceOf` (49), `findByToken` (100).
- `server/utils/public-profile.js`: `loadPublicProfile(db, slug)` answers `null` when the business has no
  `frontdesk` module (through `businessModules`); `isPublic`; `publicView` (sync, from the profile only).
- `server/utils/request-create.js`: `runQualify(profile, kind, wanted, answers, now)` (line 21) returns
  `{ status, qualification }` where `qualification.verdict` is `fit | borderline | unfit`;
  `createRequest(db, businessId, profile, input, { channel, actor, via, source, consentTerms })` (line 37) finds
  or creates the client first, then qualifies, inserts the request and bumps `counters.requests`. Both are
  exported.
- `server/middleware/rate-limit.js`: `createRateLimiter`, `ipAndSlugKey`, and `publicLimiter` (20 / 15 min per
  IP + slug, `skip` for `GET` and `HEAD`, so no read is counted today).
- `shared/schemas/public/public-request.schema.ts`: `publicRequestSchema` is strict — `kind`, `guestName`,
  `guestPhone`, `wanted`, `answers`, `consentTerms`, `website`. It has no area.
- `shared/schemas/entities/request.schema.ts`: `REQUEST_VIA = member | guest | ai | server`; `outcome` is
  `{ type: 'booking' | 'menuEvent', id }`; `requestAnswersSchema` rows are `{ questionKey, label, value }`.
- `server/test/public-requests.test.js` covers the four existing routes (its profiles have `hours: []` and no
  business has `tables`); `server/test/helpers/log-capture.js` `captureLogs` is how a test reads the log lines.
- The restaurant template's area question is `seating` with label key `fd_q_seating`
  (`shared/schemas/front-desk-templates.ts:53`).

Exists after the plans this one depends on (treat as given, never edit): `tableServiceOf`
(`shared/schemas/front-desk/table-service.ts`, 662); the engine (`assign`, `alternatives`, `dayAvailability`,
663); `floorPlans` (664); `server/services/table-holds.js` (`holdsOf`, `release`) and
`server/services/table-bookings.js` (`loadTableContext`, `reserveTable`, `countBooking`) (668).

## Contracts (copied verbatim from the frozen map)

**C-PUBAVAIL (R7; used by R8, R18)**
- `GET /api/v1/public/:slug/availability?date=&partySize=&area=` — no token; its own limiter (reads: 60 / 15 min
  per IP + slug); answers `{ slots: [{ time, available }], next?: { date, time } }` with `onlineOnly: true`; 404
  when the profile is not public or `tables` is off. It never returns a table, a name or a count.
- `POST /api/v1/public/:slug/requests`, kind `table`, `tables` on: the server runs `assign` (`onlineOnly`). When
  `confirmMode === 'auto'`, `partySize ≤ autoMaxParty`, `qualify` says `fit` and the claim succeeds → the request
  is created with status `approved` (history entry `via: 'server'`), the booking with source `request`, and the
  answer is `{ reference, token, confirmed: true, booking: { date, time, partySize } }`. In every other case the
  request is created as today and the answer has `confirmed: false`; when the time is taken the answer is 409
  `NO_TABLE` with `alternatives` and nothing is written.
- Guest page of an approved table request (`GET /:slug/requests/:token`) shows the booking; `POST …/cancel`
  cancels the booking too when `now < startAt − cancellationCutoffHours` (else 409 `TOO_LATE`);
  `POST …/confirm` stamps `guestConfirmedAt`.

**C-TABLES — the lines that bind this plan**
- `GET /api/v1/public/:slug/availability` answers 404 `NOT_FOUND` when the business has `tables` off. With
  `tables` off, `POST /requests/:id/approve` and the public request post behave exactly as today.

### Contract details this plan fixes (to be written into the map's "Contract extensions")
1. `GET /api/v1/public/:slug` gains `tableBooking: { areas: [{ key, name }] }` when the business has `tables` and
   its floor plan has at least one table that is `active` and `online`. `areas` are the plan's areas that have such
   a table, in the plan's `order`. Nothing else of the plan or of the settings is shown. Its presence is how the
   guest page knows to show time chips.
2. `publicRequestSchema` gains an optional `areaKey` (`^[a-z0-9]{6,12}$`): the guest's area preference. It is
   used for `assign`; when the request waits for the owner it is stored as one more answer
   `{ questionKey: 'seating', label: 'fd_q_seating', value: <the area's name> }` (replacing a sent `seating`
   answer), so the owner sees it on the request card with no schema change.
3. "The time is taken" means the engine answered `full`. Any other `ok: false` reason (`closed`, `too_soon`,
   `too_far`, `too_late`, `too_big`, `too_small`, `no_plan`) creates the request as today with `confirmed: false`:
   the rules check of the request already records why, and the owner decides.
4. The guest's cancel of a confirmed booking moves the booking **and** the request to `cancelled`.
5. Guest answers gain two booleans on `booking`: `guestConfirmed` and `canCancel`.

## Goals & Success Criteria
**Primary:** for a restaurant with `tables`, a guest can read the free times of a day and, when the owner chose
automatic confirmation, leaves the form with a confirmed table; no public answer ever shows a table. For every
other business the public door answers exactly as today.

- [auto] `pnpm run test:server` → exit 0, including the new `server/test/public-availability.test.js`, with the
  existing public request tests green and not edited.
- [auto] `server/test/public-availability.test.js` (availability): for a business with `['frontdesk', 'tables']`
  the read answers 200 `{ slots }` with one entry per slot of the day; a time whose only fitting online table is
  held is `available: false`; a table with `online: false` is never offered; on a day with no free slot the answer
  has `next` with the first free `{ date, time }` of the following days; a business with `['frontdesk']` only, a
  `draft` profile and an unknown slug each answer 404 `NOT_FOUND`; a bad `date` or `partySize` answers 400
  `BAD_REQUEST_INPUT`.
- [auto] same file ("61 reads"): the 61st `GET …/availability` in 15 minutes from one IP to one slug answers 429,
  and a read of another slug from the same IP still answers 200.
- [auto] same file (auto mode): with `confirmMode: 'auto'` and a party within `autoMaxParty`, the POST answers 201
  `{ reference, token, confirmed: true, booking: { date, time, partySize } }`; the request is stored `approved`
  with a last history entry `via: 'server'` and an `outcome` of the booking; the booking is `confirmed`, source
  `request`, has `tableKeys` and `requestId`; `tableHolds` has its rows; the client's `counters.bookings` is 1; no
  `decisionLog` row was written.
- [auto] same file (manual mode and over the limit): with `confirmMode: 'manual'`, and with `auto` and a party of
  `autoMaxParty + 1`, the POST answers 201 with `confirmed: false`, the request is `qualified`, and no booking and
  no hold exist; the sent `areaKey` is stored as a `seating` answer with the area's name.
- [auto] same file (taken time): when the engine answers `full`, the POST answers 409
  `{ error: 'NO_TABLE', alternatives }` in both modes and `requests`, `clients`, `bookings` and `tableHolds` are
  unchanged.
- [auto] same file ("two guests at once"): two POSTs for the last free table at the same time, in auto mode,
  answer one 201 `confirmed: true` and one 409 `NO_TABLE`; exactly one booking exists.
- [auto] same file (guest manages the booking): `GET /:slug/requests/:token` of a confirmed booking shows
  `booking` with `canCancel: true` and `guestConfirmed: false`; `POST …/confirm` stamps `guestConfirmedAt` once
  (a second call keeps the first time) and the view shows `guestConfirmed: true`; `POST …/cancel` before the
  cutoff moves the booking and the request to `cancelled`, writes a history entry `via: 'guest'` on both and
  deletes the holds; after the cutoff it answers 409 `TOO_LATE` and changes nothing.
- [auto] same file ("no table leaks"): the JSON text of every answer of the test — profile, availability, POST,
  status, confirm, cancel — contains neither `tableKeys`, nor `areaKey`, nor any table key of the fixture, nor a
  table `number`.
- [auto] same file (unchanged door): for a business with `['frontdesk']` only, the POST answer has exactly the
  keys `reference` and `token`, `GET /:slug` has no `tableBooking`, and `POST …/confirm` answers 404.
- [auto] same file ("logs"): after an auto-confirmed POST, a confirm and a cancel, the captured log lines contain
  neither the phone digits, nor the guest's name, nor the token.
- [auto] `pnpm run test:ci` → exit 0 (the browser compiles the changed public schema; no spec is edited).
- [auto] `pnpm --dir server run lint` → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.

## Execution Mode
- Parallel: no — third and last plan of run `rs-book-srv` (668, 685, 669, in that order); it calls the services
  of 668. The run may go beside `rs-floor-ui`: this plan appends to no hotspot file.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/public.js
server/utils/request-create.js
server/middleware/rate-limit.js
shared/schemas/public/public-request.schema.ts
server/test/public-availability.test.js
server/breadcrumbs.md
docs/restaurant/restaurant-map.md
server/test/public-guard.test.js
server/test/rate-limit-key.test.js
server/test/shared-request-helpers.test.js
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

- INV-1: preserves — the new routes live in `server/routes/public.js` under its rules: no member token is read,
  the business comes from the slug, every query uses `guestScope`, a guest reads and changes only what its own
  token names, and writes are stamped `guestActor('form')` (ADR 0030). The new limiter is added to
  `server/middleware/rate-limit.js` beside `publicLimiter` and changes no existing one.
- INV-4: preserves — the one schema change is an optional field on `publicRequestSchema`; the request and the
  booking are still checked with `checkStoredDoc` before they are written.
- INV-7: preserves — a guest gets a table only when `assign` of the engine returned it in the same request and the
  unique hold was claimed through `reserveTable`; the availability read only reports what `dayAvailability` says.

## Reuse Check

- `publicReadLimiter` — family: none — rung: 4 — why: no registry family covers rate limiters; it is built with the existing `createRateLimiter` and `ipAndSlugKey` of `server/middleware/rate-limit.js`, and only the budget (60) and counting reads are new. Automatic confirmation creates no piece: it calls `reserveTable` and `countBooking` of plan 668 and `createRequest` with one new option.

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
- As a guest, I want to see which hours are free before I ask, so that I do not wait for an answer about an hour
  that was never possible.
- As a guest, I want my table confirmed the moment I send the form, so that I can stop looking for another place.
- As a restaurant owner, I want small parties confirmed by themselves while I cook, and to keep approving the
  rest myself, so that I lose no guest and no control.
- As a guest, I want to cancel or to say "we are coming" from my link, so that I do not have to call.

## Functional Requirements

### Must Have (P0)

**`server/middleware/rate-limit.js`**
- [ ] `publicReadLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 60, message: 'Too many requests',
  keyGenerator: ipAndSlugKey })` — it counts reads (no `skip`). Exported beside `publicLimiter`, which is not
  changed.

**`shared/schemas/public/public-request.schema.ts`**
- [ ] `areaKey: z.string().regex(/^[a-z0-9]{6,12}$/).optional()` on `publicRequestSchema`.

**`server/utils/request-create.js`**
- [ ] `createRequest` accepts one more option, `approvedBooking?: { id, at }`. When given, the stored request has
  `status: 'approved'`, `outcome: { type: 'booking', id }` and a second history entry
  `{ status: 'approved', at, by: 'server', byName: '', via: 'server' }` after the entry of the guest. Everything
  else of the function — the client, `runQualify`, the stamps, the counters — is the one path of today. Without
  the option the function is unchanged.

**`server/routes/public.js`** — one helper, `tablesOn(profile)` = `(await businessModules(profile.businessId))
.includes('tables')`.
- [ ] `GET /:slug`: when `tablesOn` and the profile is public, the answer of `publicView` gains `tableBooking` as
  in Contract detail 1 (one read of `floorPlans`). Otherwise the answer is byte for byte today's.
- [ ] `GET /:slug/availability` with `publicReadLimiter`. Input: `date` `YYYY-MM-DD`, `partySize` an integer 1–30,
  optional `area` matching `^[a-z0-9]{6,12}$` — else 400 `BAD_REQUEST_INPUT`. Unknown slug, a profile that is not
  public, or `tables` off → 404 `NOT_FOUND` (the same body for all three). `slots = dayAvailability(plan, profile,
  holds, { date, partySize, areaKey: area, onlineOnly: true, now })`; no plan → `{ slots: [] }`. When no slot is
  available: the following days are checked in order, at most 14 and never past `requestKinds.table.rules
  .maxLeadDays`, with one `holdsOf` read for the whole range, and the first available slot becomes
  `next: { date, time }`; none found → no `next` key. The answer has only `slots` and `next`.
- [ ] `POST /:slug/requests`, only when `kind === 'table'`, `tablesOn`, and `wanted` has `date`, `time` and
  `partySize` (in every other case the route is today's and its answer has no `confirmed` key):
  1. `ctx = loadTableContext(db(), businessId)`; an `areaKey` that is not an area of the plan answers 400
     `BAD_REQUEST_INPUT`.
  2. A dry run: `assign(plan, profile, holdsOf(day), { date, time, partySize, areaKey, onlineOnly: true, now })`.
     `ok: false` with reason `full` → 409 `{ error: 'NO_TABLE', alternatives: alternatives(…) }`; nothing was
     written, no client was created.
  3. Automatic confirmation is tried only when the dry run was `ok`, `ctx.service.confirmMode === 'auto'`,
     `partySize <= ctx.service.autoMaxParty`, and `runQualify(…)` answers `status: 'qualified'` with
     `qualification.verdict === 'fit'`. Then: `bookingId = newId()`; `reserveTable(db(), { booking: { _id:
     bookingId, businessId }, ctx, date, time, partySize, areaKey, onlineOnly: true, now })` — `NO_TABLE` (a lost
     race) → 409 as in step 2; `createRequest(…, { …today's options, approvedBooking: { id: bookingId, at: now }
     })` — an error releases the hold and is answered as today; the booking is built (kind `table`, status
     `confirmed`, source `request`, the reservation's times and tables, the request's client and guest fields,
     `requestId`, `statusHistory: [{ status: 'confirmed', at: now, by: 'server', byName: '', via: 'server' }]`, a
     new `publicToken`), checked with `checkStoredDoc('bookings', …)` and inserted; then
     `countBooking(db(), businessId, clientId, now)`; answer 201 `{ reference, token, confirmed: true, booking:
     { date, time, partySize } }`.
  4. If the booking check or insert of step 3 fails: the hold is released, the request is put back to
     `qualified` (`$set` status, `$unset` outcome, `$pop` the last history entry), the error is logged as
     `public.request.autoconfirm_failed`, and the answer is the 201 of step 5 — the guest's request is not lost,
     it waits for the owner.
  5. Every other case: `createRequest` as today, with the area stored as a `seating` answer (Contract detail 2),
     and the answer is 201 `{ reference, token, confirmed: false }`.
  No decision-log row is written for an automatic confirmation: no person decided.
- [ ] `guestView`: for an approved request with a booking, `booking` gains `guestConfirmed`
  (`guestConfirmedAt` is set) and `canCancel` (`tablesOn`, the booking is `confirmed`, and `now < startAt −
  cancellationCutoffHours * 3600000`). The booking read lists its fields by name, so no table field can pass.
- [ ] `POST /:slug/requests/:token/cancel`: for an open request, today's behaviour. For an `approved` request
  whose outcome is a booking, in a business with `tables`: booking not `confirmed` → 409 `ALREADY_DECIDED`; past
  the cutoff → 409 `TOO_LATE`; otherwise the booking is moved to `cancelled` with a conditional update on its
  status and a history entry `{ status: 'cancelled', at, by: guestActor('form'), byName: '', via: 'guest' }`, its
  holds are released from now, the request is moved to `cancelled` with the same kind of entry, and the answer is
  `guestView`. An approved request in a business without `tables` answers 409 `ALREADY_DECIDED` as today.
- [ ] `POST /:slug/requests/:token/confirm` with `publicLimiter`: 404 `NOT_FOUND` for a malformed token, an
  unknown request, or a business without `tables`; 409 `ALREADY_DECIDED` unless the request is `approved` with a
  `confirmed` booking; otherwise `guestConfirmedAt` is set only when it is not set yet (a conditional update), and
  the answer is `guestView`.
- [ ] The public route never sets `test`: a request made here is never test data (C-TESTDATA belongs to the
  simulator, plan 675).
- [ ] Logs: `public.availability.read` is not logged per call (it would flood); `public.request.created` gains
  `confirmed`; `public.booking.cancelled`, `public.booking.confirmed`, `public.request.no_table` carry the slug
  only.

**Tests and docs**
- [ ] `server/test/public-availability.test.js`: the cases of Goals. Fixture: three businesses — `['frontdesk',
  'tables']` in auto mode with `autoMaxParty: 4`, the same in manual mode, and `['frontdesk']` only — each with a
  `pilot` profile open every day 08:00–23:00, and for the first two a plan with two areas, two online tables (2
  and 4 seats) and one table with `online: false`. Dates are two days ahead of the test's clock.
- [ ] `server/breadcrumbs.md`: the `routes/public.js` row names the availability read, the confirm route and
  automatic confirmation. `docs/restaurant/restaurant-map.md` "Contract extensions (run)": the five details above.

### Should Have (P1)
- [ ] The availability read makes at most three database reads on a day that has a free slot (profile, plan,
  holds) besides the module lookup, which is cached.

### Nice to Have (P2)
- none

## UI/UX Notes
- No screen changes; plan 670 builds the page on these answers.
- No keys are added to `public/assets/data/dictionary.json` (the stored area answer reuses the label key
  `fd_q_seating`).

## Atomic Sub-tasks

- [ ] A1: Add a read limiter for the public door so the free-times read cannot be scraped — 60 reads per 15 minutes per visitor and business, built with the existing helper — server/middleware/rate-limit.js
- [ ] A2: Let the guest's form carry an area preference — one optional field on the public input schema — shared/schemas/public/public-request.schema.ts
- [ ] A3: Let the one request-creation path store a request that was confirmed by the server — the approvedBooking option, second history entry, outcome link — server/utils/request-create.js
- [ ] A4: Show guests the free times of a day without showing a table — the availability route with its limiter, input checks, 404 rules, next free time, and the table-booking block on the profile read — server/routes/public.js
- [ ] A5: Confirm a guest's table in the same call when the owner allows it — the dry run, the 409 on a full time, reserve then request then booking, the fallback to a waiting request — server/routes/public.js
- [ ] A6: Let the guest cancel before the cutoff and confirm arrival from the link — the wider cancel, the confirm route, the two booleans on the guest view — server/routes/public.js
- [ ] A7: Test the whole public table flow, the limiter, the race, the leaks and the unchanged door — the cases of Goals — server/test/public-availability.test.js
- [ ] A8: Record the new routes and the Contract details where the next plans look — one folder-map row, five extension lines — server/breadcrumbs.md, docs/restaurant/restaurant-map.md

## Technical Considerations
- Dependencies: `server/routes/public.js`, `createRequest` (the manual route of `requests.js` calls it without
  the new option and is unchanged), the services of plan 668. Plans 670 and 680 use the result.
- New files needed: `server/test/public-availability.test.js`.
- Model changes: `publicRequestSchema` gains optional `areaKey`. No stored shape changes.
- Backend / API: new `GET /api/v1/public/:slug/availability` and `POST /api/v1/public/:slug/requests/:token/confirm`;
  wider answers of `GET /:slug`, `POST /:slug/requests`, the token read and cancel — only for a business with
  `tables`.
- Auth and validation: none of these routes reads a token; every input is checked (the strict schema on the POST,
  hand checks on the query); the business is always the slug's.
- Security surface: this is the public door. New read: rate-limited per IP + slug, answers booleans per time only
  — never a table, a name, a count or the settings — and the same 404 for "no such business", "not public" and
  "no table service", so it cannot be used to learn which businesses exist. New writes carry `publicLimiter`; the
  request POST keeps `honeypot`. A guest changes only the booking its own unguessable token names. The token and
  the phone never reach the logs.
- Data / migration: none.
- Project checks: the `log-query` Done-when item is in Goals; no Hebrew string, key or icon; the folder map is in
  the scope; dedicated endpoints because guests write only through `server/routes/public.js` (ADR 0030).

## Out of Scope
- The guest page (plan 670) and any member screen.
- Guests joining the waiting list (brief Part 6, later).
- Deposits, reminders (plan 676), messages to the guest (plan 675).
- Editing `server/utils/public-profile.js`, `request.schema.ts`, `booking.schema.ts` or any registry file.
- A decision-log row or a learning signal for an automatic confirmation.

## Critical Questions
- none

## Execution Notes
