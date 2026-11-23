# Plan 676 — Things that happen by themselves: the scheduler, the reminder with Confirm and Cancel, automatic no-show, waiting-list expiry and the orphan-hold sweep

Status: draft
Depends-on: 675, 668, 673
Snapshot: 28359b6d54b0c77e288c52702a850daef92ccf07

## Problem Statement
Nothing in the server runs by itself: `server/index.js` starts no timer, and the two existing sweeps
(`server/jobs/purge-deleted.js`, `server/jobs/retention.js`) run lazily on a read. A restaurant needs four things
to happen without anyone pressing a button: a reminder to today's guests at the hour the owner chose, with
**Confirm** and **Cancel** buttons whose taps move the booking; an optional automatic no-show for a guest who
never arrived; yesterday's waiting list cleared; and a table freed when a crash left a hold with no booking. This
plan adds one small scheduler and those four jobs, each safe to run twice and safe to miss, plus the two things
that hang on the same code: the simulator's "jump the clock" route, and the "table is ready" message of the
waiting list, which plan 673 could only mark because no channel existed yet.

`agenda` is not used (map delta 6: it needs two more dependencies than were approved); the tick is one in-process
interval. The scheduler runs only while the server is awake (gate G-AWAKE): production needs the uptime ping of
`docs/security-go-live.md`; local development and every test need nothing.

Verified on `origin/main` (28359b6d, 2026-11-22):
- `server/index.js` (32 lines): `connectDb().then(...)` calls `app.listen` (line 15), registers `SIGTERM` /
  `SIGINT` handlers that call `server.close` (lines 18–24), then `seedMasterData()` (line 27). Nothing periodic.
  It does not import `mongoose`; the scheduler gets the database from `require('mongoose').connection.db`.
- `docs/security-go-live.md:100` "Keeping the server awake (D6)" describes the uptime ping.
- `server/jobs/` holds `purge-deleted.js` and `retention.js` only; there is no `scheduler.js`.
- `server/routes/bookings.js:62–101` `PUT /:id/status`: the move is validated against `MOVES` (line 22), written
  with a conditional update on the status that was read, and a `no_show` bumps `clients.counters.noShows`
  (lines 89–94). The whole move lives inside the route; no function can be called from a job.
- `shared/schemas/entities/booking.schema.ts`: `statusHistory[].via` is `member | guest | server`; a booking has a
  `publicToken` (≥ 16 characters, unique per booking — `bookings_token_unique` in `server/db.js:154`).
- `shared/schemas/front-desk/local-time.ts`: `jerusalemEpoch(date, time)`, `weekdayOf(date)`.
- `server/middleware/require-module.js:71` exports `businessModules(businessId)` (cached 30 s).
- Not on `main` yet, created by earlier plans of the program and treated as existing here:
  - 662: `tableServiceOf(profile)` (`shared/schemas/front-desk/table-service.ts`) with `reminderHour`,
    `holdMinutes`, `autoNoShow`, `cancellationCutoffHours`; the booking fields `remindedAt`, `guestConfirmedAt`,
    `tableKeys`, `test`; the collections `tableHolds`, `waitlistEntries`.
  - 663: `jerusalemDateTime(epoch) → { date, time }` in `local-time.ts`.
  - 668: `server/services/table-holds.js` (`release(db, businessId, bookingId, fromEpoch?)`),
    `server/services/table-bookings.js`; `PUT /:id/status` releases the hold on `finished`, `cancelled`, `no_show`.
  - 673: `server/routes/waitlist.js` with `PUT /:id/notify` (it only stamps `notifiedAt`) and
    `server/test/waitlist.test.js`.
  - 675: `server/services/inbound.js` (`handleInbound`, `registerButton(prefix, handler)`),
    `server/services/outbound.js` (`sendOut`), `server/services/conversations.js`, `templateMessage`
    (`booking_reminder` with buttons `CONFIRM:<token>` / `CANCEL:<token>`, `booking_cancelled`,
    `waitlist_table_ready`), `server/routes/sim.js` with `POST /inbound` and `DELETE /test-data`.

## Contracts (copied verbatim from `docs/restaurant/restaurant-map.md`, frozen 2026-11-22)

**C-JOBS (R14; used by R21)**
- `server/jobs/scheduler.js`: `startScheduler(db, { now, every })` called from `server/index.js` after the
  listen; `runDue(db, now)` is exported and is what tests call. The tick is one `setInterval` of 60 s with
  `.unref()`, cleared on shutdown — `agenda` does not fit the code (delta 6: it needs two more dependencies).
  Not started when `process.env.VITEST`.
- Each job claims its work with a conditional update so two runs cannot both do it:
  `reminders` — bookings of today (Jerusalem), `status: 'confirmed'`, no `remindedAt`, business `reminderHour`
  passed, `tables` on → `sendOut` the reminder template through the client's conversation, stamp `remindedAt`;
  `no-show` — only where `autoNoShow` is on: `confirmed` and `now > startAt + holdMinutes` → `no_show`
  (`via: 'server'`), release the hold, bump the counter;
  `waitlist-expire` — `waiting | notified` entries of an earlier date → `expired`.
- A job never sends to a do-not-contact client, never for a `draft` / `suspended` profile (R-19), and logs counts
  only.
- (Step 2 extension) 676 · C-JOBS · gains a fourth job, `orphan-holds`: `tableHolds` rows older than 10 minutes
  whose `bookingId` has no booking are removed (a crash between the claim and the booking write; Dandan,
  2026-11-22).

**C-CHANNEL (the clock route)** — `POST /api/v1/sim/clock { conversationId, job: 'reminder' | 'late' }` runs that
job for the test booking now.

**C-WAIT (the message)** — `notify` sends the template `waitlist_table_ready` through the client's open
conversation when there is one and the client is not do-not-contact; otherwise it only stamps `notifiedAt`.

**C-CONV (buttons)** — a button id of a template (`CONFIRM:<token>`, `CANCEL:<token>`) is handled by the server
with no model call.

### Contract details this plan fixes (each is also one line in the map's "Contract extensions (run)")
1. **One function moves a booking's status.** `moveBookingStatus(db, { businessId, id, status, by, byName, via,
   note?, now })` in `server/services/table-bookings.js` holds what the route does today: the `MOVES` check, the
   "no `no_show` before `startAt`" rule, the conditional write, `seatedAt` / `finishedAt`, the hold release and the
   no-show counter. It answers `{ ok: true, booking }` or `{ ok: false, code: 'NOT_FOUND' | 'BAD_STATUS' |
   'STATUS_CHANGED' | 'INVALID', issues? }`. `PUT /:id/status` calls it and answers exactly as before; the jobs
   and the button handlers call it too, so a booking still has one writer (brief Part 2 rule 4).
2. **A hold row has no time of its own**, so "older than 10 minutes" cannot be read from it. The sweep removes a
   booking's holds when two ticks in a row (at least 60 s apart) both find no booking for that `bookingId`. The
   list of the previous tick's candidates is kept in memory; a restart only delays the sweep by one tick.
3. **The token of the reminder's buttons is the booking's `publicToken`.** A tap is accepted only when the booking
   belongs to the conversation's business and client.
4. **Confirm** stamps `guestConfirmedAt` once (a conditional update) and, on that first tap only, answers with the
   existing template `booking_confirmed(name, date, time, partySize)` — a tap that gets no answer looks broken
   (Dandan, 2026-11-22); a second tap sends nothing. **Cancel** inside the
   cutoff (`now < startAt − cancellationCutoffHours`) moves the booking to `cancelled` with `via: 'guest'` and sends
   the template `booking_cancelled`; after the cutoff, or when the booking is no longer `confirmed`, nothing
   changes and the conversation moves to `human` so a person answers.
5. **A reminder needs a conversation.** A booking whose client has no open conversation is stamped `remindedAt`
   and counted as `noConversation`: there is no address to send to before plan 683 gives a business a real
   number. A refused send (`DO_NOT_CONTACT`, `NOT_LIVE`, `TEST_ONLY`) is also stamped and counted, never retried.
6. **Test bookings are left out of every job** (`test: { $ne: true }`); only `POST /sim/clock` runs a job for one.
7. `POST /sim/clock` answers `{ job, done: boolean, reason? }`: `reminder` sends the reminder for the next
   `confirmed` test booking of the conversation's client whatever the hour (`done: false, reason: 'NO_BOOKING'`
   when there is none, `'ALREADY'` when it was reminded); `late` applies the no-show rule to that booking as if
   `holdMinutes` had passed — `no_show` when the business has `autoNoShow` on, else `done: false,
   reason: 'AUTO_NO_SHOW_OFF'` (the screen's late flag needs no job).
8. `PUT /waitlist/:id/notify` answers the entry plus `sent: boolean`.

## Goals & Success Criteria
**Primary:** with the server awake, today's guests get one reminder at the business's hour, their taps move the
booking, a late guest becomes a no-show only where the owner switched that on, old waiting-list entries expire,
and a hold with no booking frees its table — each exactly once, however many times the tick runs.

- [auto] `pnpm run test:server` → exit 0, including the new `server/test/scheduler.test.js` and
  `server/test/booking-buttons.test.js`, the extended `server/test/sim-router.test.js` and
  `server/test/waitlist.test.js`, and `server/test/bookings-router.test.js` and `server/test/bookings-tables.test.js`
  passing with no edit (`git diff --stat` of the run lists neither).
- [auto] `server/test/scheduler.test.js` (reminders): for a business with `tables`, `reminderHour: '10:00'`, a
  `pilot` profile and two `confirmed` bookings of today whose clients have an open conversation, `runDue` at 09:59
  Jerusalem sends nothing; at 10:00 it stores one `booking_reminder` template message per booking with the buttons
  `CONFIRM:<publicToken>` and `CANCEL:<publicToken>` and stamps `remindedAt`; a second `runDue` at 10:01 sends
  nothing more; two `runDue` calls started together send one reminder per booking.
- [auto] `server/test/scheduler.test.js` (who gets none): a booking of tomorrow, a `seated` one, a `test: true`
  one, one of a business without `tables`, and one with no `tableKeys` get no message and no `remindedAt`; a
  booking of a do-not-contact client, one of a `draft` profile (on a fake real transport) and one whose client has
  no conversation get no message, are stamped, and are counted under their reason.
- [auto] `server/test/scheduler.test.js` (no-show): with `autoNoShow: true` and `holdMinutes: 15`, a `confirmed`
  booking 14 minutes after `startAt` is unchanged; at 16 minutes it is `no_show` with a history entry
  `via: 'server'`, its `tableHolds` rows from that moment are gone and the client's `counters.noShows` grew by one;
  a second run changes nothing. With `autoNoShow: false` the booking stays `confirmed` at 60 minutes.
- [auto] `server/test/scheduler.test.js` (waiting list): entries of yesterday in `waiting` and `notified` become
  `expired`; one of today and a `seated` one of yesterday are unchanged.
- [auto] `server/test/scheduler.test.js` (orphan holds): hold rows whose `bookingId` has no booking survive the
  first `runDue` and are gone after the second; rows of an existing booking survive both; rows that got their
  booking between the two runs survive.
- [auto] `server/test/scheduler.test.js` (timer): under vitest `startScheduler` returns without creating an
  interval; with `{ force: true, every: 20 }` and a fake `now` it calls `runDue` at least twice in 100 ms and
  `stopScheduler()` leaves no active timer (`process.getActiveResourcesInfo()` has no `Timeout` of it); a job that
  throws is logged as `jobs.failed` and the other three still run.
- [auto] `server/test/scheduler.test.js` ("logs"): after a full `runDue` no captured log line contains a guest's
  name or phone digits; the `jobs.ran` line carries counts only.
- [auto] `server/test/booking-buttons.test.js`: through `handleInbound` on the simulator transport, a
  `CONFIRM:<token>` tap stamps `guestConfirmedAt` and stores one `booking_confirmed` template message, a second tap
  leaves the first stamp and stores no further message; a `CANCEL:<token>` tap five hours before `startAt` (cutoff 3) moves the booking to `cancelled`
  with `via: 'guest'`, removes its holds and stores one `booking_cancelled` template message; the same tap two
  hours before `startAt` changes nothing and the conversation is `human`; a token of another client's booking
  changes nothing and the conversation is `human`; no tap calls the turn handler.
- [auto] `server/test/sim-router.test.js` (clock): `POST /api/v1/sim/clock` with `job: 'reminder'` stores the
  reminder message for the test booking and answers `{ done: true }`, a second call answers `reason: 'ALREADY'`;
  `job: 'late'` with `autoNoShow` on moves the test booking to `no_show`, and with it off answers
  `reason: 'AUTO_NO_SHOW_OFF'`; a conversation without `test: true` answers 409 `NOT_TEST`; staff get 403.
- [auto] `server/test/waitlist.test.js` (notify): with an open conversation of the entry's client the route stores
  one `waitlist_table_ready` template message and answers `sent: true`; with no conversation, and with a
  do-not-contact client, it answers `sent: false`, stores no message and still stamps `notifiedAt`.
- [auto] `grep -n "setInterval" server/jobs/scheduler.js` prints one line and that line or the next has `.unref()`.
- [auto] `pnpm run build` → exit 0. `pnpm --dir server run lint` → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Dandan reads the note this plan adds to `docs/security-go-live.md`: reminders go out only while the
  server is awake, so a real restaurant needs the uptime ping (or a paid instance) before it relies on them.

## Execution Mode
- Parallel: no — it edits `server/services/inbound.js`, `server/routes/sim.js` (plans 675, 679, 683),
  `server/routes/bookings.js` and `server/services/table-bookings.js` (plans 668, 685, 669, 673, 680) and
  `server/routes/waitlist.js` (plan 673). It runs after `rs-book-ui` has merged (it needs 673), as the last plan
  of the conversation server work.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/jobs/scheduler.js
server/jobs/reminders.js
server/jobs/no-show.js
server/jobs/waitlist-expire.js
server/jobs/orphan-holds.js
server/services/booking-buttons.js
server/services/table-bookings.js
server/services/inbound.js
server/routes/bookings.js
server/routes/sim.js
server/routes/waitlist.js
server/index.js
server/test/scheduler.test.js
server/test/booking-buttons.test.js
server/test/sim-router.test.js
server/test/waitlist.test.js
server/test/bookings-router.test.js
server/test/bookings-tables.test.js
server/test/helpers/**
server/breadcrumbs.md
docs/security-go-live.md
docs/brain/inventory.md
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

- INV-1: preserves — `server/routes/bookings.js` keeps its gates and its `assertCan(…, 'manageRequests', …)`; only the body of the status move goes into a service function it calls. `server/routes/sim.js` stays owner or platform admin, `server/routes/waitlist.js` keeps `manageRequests`. A guest's tap reaches a booking only through `handleInbound` and only for a booking of the conversation's own business and client, found by a token nobody can guess.
- INV-2: preserves — a job reads across businesses to find its work, then every write names the row's own `businessId`; a job reads a business's profile and modules by that id and never copies anything between businesses. Nothing is cloned or synced.
- INV-7: preserves — no job offers or assigns a table. A no-show and a guest's cancel free a table through `release` of plan 668, after the status write succeeded; the orphan sweep removes only holds whose booking does not exist, so it can never free a table a booking holds.

## Reuse Check

- server/jobs/scheduler.js (`startScheduler`, `stopScheduler`, `runDue`) — family: none — rung: 4 — why: the server has no scheduler; the two lazy sweeps run on a read and cannot send a reminder at an hour
- moveBookingStatus in server/services/table-bookings.js — family: none — rung: 4 — why: the status move lives inside one route today; a job and a guest's tap must make the same move with the same checks, so it becomes one function the route calls too
- server/services/booking-buttons.js (`registerBookingButtons`) — family: none — rung: 4 — why: the Confirm and Cancel taps of the reminder; registered through the button registry of plan 675 so the inbound handler stays free of booking code

## Defaults

- empty-state-on-list — exception — why: server only; the plan builds no list on a screen
- loading-and-error-states — exception — why: server only; the plan builds no screen
- app-list-container — exception — why: server only; the plan builds no list on a screen
- one-breakpoint-set — exception — why: server only; the plan writes no SCSS

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the owner of a restaurant, I want today's guests reminded at the hour I chose, once, so that fewer tables
  stay empty.
- As a guest, I want to tap Confirm or Cancel on the reminder and have the restaurant know at once.
- As a host, I want a guest who is late to stay on my screen unless the owner asked for automatic no-shows, so
  that I never lose a table because I forgot to tap "seated".
- As a host, I want a table to come back by itself when something went wrong while a booking was being saved.
- As the owner, I want to try the reminder in the simulator without waiting for ten o'clock.

## Functional Requirements

### Must Have (P0)

**One function moves a booking — `server/services/table-bookings.js`, `server/routes/bookings.js`**
- [ ] `moveBookingStatus` per detail 1, moved out of `PUT /:id/status` with no change of behaviour: the same
  `MOVES` table (exported), the same conditional update, the same `checkStoredDoc`, the stamps and the release
  plan 668 added, the same counter. The route keeps its input check, its `assertCan` and its log line, and maps
  `NOT_FOUND` → 404, `BAD_STATUS` / `STATUS_CHANGED` → 409, `INVALID` → 400 exactly as today. The existing route
  tests are the proof and are not edited.

**The scheduler — `server/jobs/scheduler.js`** (new)
- [ ] `runDue(db, now, { log } = {})` runs the four jobs one after the other, each in its own `try` (a throw is
  logged as `jobs.failed` with the job's name), and returns `{ reminders, noShow, waitlist, orphanHolds }` — each
  the job's counts. It logs one `jobs.ran` line with those counts when any count is above zero.
- [ ] `startScheduler(db, { now = Date.now, every = 60000, force = false } = {})`: returns at once when
  `process.env.VITEST` is set and `force` is not; otherwise one `setInterval(() => runDue(db, now()), every)` with
  `.unref()`, never two (a second call is a no-op), and a tick that is still running is not started again
  (a `running` flag). `stopScheduler()` clears it.
- [ ] `server/index.js`: `startScheduler(mongoose.connection.db)` after `seedMasterData()` is kicked off, and
  `stopScheduler()` inside the existing `SIGTERM` / `SIGINT` handler before `server.close`. Nothing else in the
  file changes.

**The four jobs — `server/jobs/`** (new files; each exports `run(db, now, deps)` and returns its counts)
- [ ] `reminders.js`: today = `jerusalemDateTime(now).date`. Candidates: `bookings` with `kind: 'table'`,
  `date: today`, `status: 'confirmed'`, `tableKeys` existing, no `remindedAt`, `test: { $ne: true }`, at most 200
  a tick, oldest `startAt` first. Per business (profiles and modules read once per business per tick): skipped
  when the business has no `tables`, or `now < jerusalemEpoch(today, tableServiceOf(profile).reminderHour)`.
  Per booking: claim with `updateOne({ _id, businessId, remindedAt: { $exists: false }, status: 'confirmed' },
  { $set: { remindedAt: now } })` — not modified → skip; then the client's open conversation
  (`conversations.findOne({ businessId, clientId, liveKey: { $exists: true } })`) — none → `noConversation`; else
  `sendOut(db, conversation, { kind: 'template', ...templateMessage('booking_reminder', { name: guestName,
  time, partySize }, publicToken) }, 'server')` → `sent` or the refusal's reason. Counts: `{ sent,
  noConversation, refused }`.
- [ ] `no-show.js`: candidates: `kind: 'table'`, `status: 'confirmed'`, `tableKeys` existing,
  `test: { $ne: true }`, `startAt` between `now − 12 h` and `now − 5 min`, at most 200. Per business: skipped
  unless it has `tables` and `tableServiceOf(profile).autoNoShow`. Per booking with
  `now > startAt + holdMinutes * 60000`: `moveBookingStatus({ status: 'no_show', by: 'server', byName: '',
  via: 'server', now })`. Counts: `{ marked }`.
- [ ] `waitlist-expire.js`: `waitlistEntries.updateMany({ status: { $in: ['waiting', 'notified'] },
  date: { $lt: today } }, { $set: { status: 'expired', updatedAt: now } })`. Counts: `{ expired }`.
- [ ] `orphan-holds.js` per detail 2: the distinct `bookingId`s of `tableHolds` (at most 2,000 a tick) minus the
  ids that exist in `bookings` are this tick's candidates; those that were also candidates in the previous tick
  are removed (`deleteMany({ bookingId: { $in } })`, re-checked against `bookings` right before the delete); the
  module keeps this tick's candidates for the next. `resetOrphanHoldsForTest()`. Counts: `{ removed }`.

**The reminder's buttons — `server/services/booking-buttons.js`** (new), `server/services/inbound.js`
- [ ] `registerBookingButtons(registerButton)` registers `CONFIRM` and `CANCEL` per details 3 and 4. Both find the
  booking with `{ businessId: conversation.businessId, clientId: conversation.clientId, publicToken: token }`.
  Cancel uses `moveBookingStatus` (`by: 'guest'`, `byName: ''`, `via: 'guest'`) and then `sendOut` of
  `booking_cancelled` (`name`, `date`, `time`). "Move the conversation to `human`" is one conditional update of
  `status` from `bot`.
- [ ] `server/services/inbound.js` gains one line at the end of the module:
  `require('./booking-buttons').registerBookingButtons(registerButton)`, and `resetInboundForTest()` registers them
  again. Nothing else in the handler changes.

**The simulator's clock — `server/routes/sim.js`**
- [ ] `POST /clock` `{ conversationId, job }` (the router's existing gates: owner or platform admin, module
  `frontdesk`): 400 `BAD_INPUT` for a missing id or a job outside `reminder | late`; 404 for a conversation of
  another business; 409 `NOT_TEST` unless the conversation has `test: true`. The booking is the next `confirmed`
  one with `test: true` of the conversation's client, by `startAt`. Behaviour per detail 7, through the exported
  single-booking functions of `reminders.js` (`remindOne`) and `no-show.js` (`markOne`), so the route and the job
  share one body.

**The waiting list's message — `server/routes/waitlist.js`**
- [ ] `PUT /:id/notify`, after its existing status write succeeded: the client is the entry's `clientId`, else the
  live client whose `phoneKey` matches `guestPhone` (`findLiveClientByPhoneKey`); with a client that has an open
  conversation, `sendOut(db, conversation, { kind: 'template', ...templateMessage('waitlist_table_ready',
  { name: entry.guestName }) }, 'server')`. The answer is the entry plus `sent` (true only when `sendOut` answered
  ok). A failed or refused send never fails the route.

**Docs**
- [ ] `docs/security-go-live.md`: under the uptime-ping item, three lines — what the scheduler does, that it runs
  only while the server is awake, and that a missed tick is caught by the next one (a reminder is late, never
  double). `server/breadcrumbs.md`: the `jobs/` files and `booking-buttons.js`. `docs/brain/inventory.md` and
  `docs/brain/component-families.md` (family `helpers`): rows for `runDue` and `moveBookingStatus`.
  `docs/restaurant/restaurant-map.md` "Contract extensions (run)": the eight details, one line.

### Should Have (P1)
- none

### Nice to Have (P2)
- none

## UI/UX Notes
- No screen is built. The "late" flag on the service screen is computed by the browser (plan 671) and needs no
  job. The simulator's "jump the clock" buttons are plan 678; they call `POST /sim/clock`.
- No dictionary key is added. The waiting-list drawer's hint that "no message is sent" (`wl_notify_hint`, plan
  673) is no longer true once this plan merges; plan 677, the first screen plan after it, changes that text and
  shows `sent`.

## Atomic Sub-tasks

- [ ] A1: Make the status move of a booking one function so a job and a guest's tap make the same move — the move out of the route with no change of behaviour, the exported moves table; the untouched route tests as proof — server/services/table-bookings.js, server/routes/bookings.js
- [ ] A2: Add the scheduler that runs the jobs once a minute while the server is awake — runDue with one try per job, start and stop, no timer under tests, the start after listen and the stop on shutdown — server/jobs/scheduler.js, server/index.js
- [ ] A3: Remind today's guests once at the business's hour — the candidates, the per-business skip, the claim, the send through the one sender, the single-booking function the simulator reuses — server/jobs/reminders.js
- [ ] A4: Mark a no-show by itself only where the owner asked for it — the candidates, the hold-minutes rule, the shared status move — server/jobs/no-show.js
- [ ] A5: Clear yesterday's waiting list and free tables a crash left held — the expiry update, the two-tick orphan sweep with its in-memory candidates — server/jobs/waitlist-expire.js, server/jobs/orphan-holds.js
- [ ] A6: Let the guest's Confirm and Cancel taps move the booking — the two handlers with the token check and the cutoff, their registration in the inbound handler — server/services/booking-buttons.js, server/services/inbound.js
- [ ] A7: Let the owner jump the clock in the simulator — the clock route with its refusals, sharing the jobs' single-booking functions — server/routes/sim.js
- [ ] A8: Send the table-is-ready message of the waiting list when the guest has a conversation — the send after the stamp, the sent flag in the answer — server/routes/waitlist.js
- [ ] A9: Prove every job runs its work exactly once — the scheduler and buttons test files, the clock and notify cases, the log check — server/test/scheduler.test.js, server/test/booking-buttons.test.js, server/test/sim-router.test.js, server/test/waitlist.test.js
- [ ] A10: Write down what the scheduler needs in production and record the new pieces — the go-live note, the folder map, the registry rows, the map's extension lines — docs/security-go-live.md, server/breadcrumbs.md, docs/brain/inventory.md, docs/brain/component-families.md, docs/restaurant/restaurant-map.md
- [ ] A11: Run every check of this plan — test:server, build, lint, the grep, log-query; evidence into Execution Notes

## Technical Considerations
- Dependencies: `sendOut`, `templateMessage`, `registerButton` (675); `release`, `table-bookings.js` (668);
  `tableServiceOf` (662); `jerusalemDateTime` (663); `businessModules`; `findLiveClientByPhoneKey`.
- New files needed: `server/jobs/scheduler.js`, `reminders.js`, `no-show.js`, `waitlist-expire.js`,
  `orphan-holds.js`, `server/services/booking-buttons.js`, two test files.
- Model changes: none.
- Backend / API: `POST /api/v1/sim/clock`; `PUT /api/v1/waitlist/:id/notify` gains `sent`; `PUT
  /api/v1/bookings/:id/status` is unchanged for its callers.
- Auth and validation: the clock route is owner or platform admin and works on test conversations only; a guest's
  tap is bound to the conversation's business and client.
- Security surface: a job sends messages by itself — every send goes through `sendOut`, so do-not-contact, a
  profile that is not live and test data are refused in one place; logs carry counts only. No secret and no outside
  service: the tick, the clock and the transport are injected in tests.
- Data / migration: none. Free-tier reality: the tick does at most five small indexed reads a minute when nothing
  is due.
- Project checks: the `log-query` Done-when item; no dictionary key, icon or route of the browser;
  `server/breadcrumbs.md` and the registry files in scope.

## Out of Scope
- The assistant, the inbox, the simulator screen, real WhatsApp and the owner alert (plans 677–683).
- A reminder to a guest who never wrote to the business (needs a real number, plan 683).
- A new template for the reply after Confirm (the existing "booking confirmed" one is used), reminders the day
  before, and a second reminder.
- Moving the two lazy sweeps (`purge-deleted`, `retention`) onto the scheduler: they stay as they are.
- The text of the waiting-list hint in the browser (plan 677).

## Critical Questions
- none

## Execution Notes
- decision (Dandan, 2026-11-22): a guest's first Confirm tap is answered with the "booking confirmed" template; a Cancel inside the cutoff gets the "booking cancelled" template.
- behaviour: a Cancel after the cutoff changes nothing and hands the conversation to a person.
- behaviour: a booking whose client has no conversation is marked reminded and not retried.
- behaviour: the orphan sweep waits for two ticks in a row instead of ten minutes, because a hold row carries no time.
- behaviour: test bookings are reminded only through the simulator's clock.
