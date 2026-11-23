# Plan 673 — The waiting list: its routes on the server and its drawer on the service screen

Status: draft
Depends-on: 671, 672, 686
Snapshot: 28359b6d54b0c77e288c52702a850daef92ccf07

## Problem Statement
When the room is full a host writes the waiting parties on paper: who came first, how many they are, whom he already
told that a table is ready. Nothing on the service screen knows them, so when a table frees the host has to match it
to the paper by eye. This plan builds the waiting list of table service: the routes behind the collection that plan
662 registered, and a drawer on the service screen to add a party, tell it the table is ready, seat it and mark it as
left. It is map row R11 of the Restaurant program (`docs/restaurant/restaurant-map.md`).

Verified on `origin/main` (28359b6d, 2026-11-22):
- `server/routes/bookings.js` is the pattern for a router of this program: `verifyToken`, `requireModule(...)`
  (`server/middleware/require-module.js`), `assertCan(req, res, 'manageRequests', { type })` (lines 40–44),
  `scopeFilter(req)` from `server/utils/business-scope.js` (line 12), `actorOf(req)` (14), and a status move done as
  one conditional `findOneAndUpdate` whose filter holds the status that was read, answering 409 `STATUS_CHANGED` when
  another request moved it first (lines 80–88).
- `server/utils/permissions.js:58`: `manageRequests` is allowed to any member (owner and staff).
- `shared/schemas/front-desk/local-time.ts:24`: `jerusalemEpoch(date, time)`; `server/utils/id.js:13`: `newId()`.
- There is no waiting-list code: no `server/routes/waitlist.js`, no `waitlistEntries` row in
  `server/constants/collections.js`, no `WaitlistDataService`, no `API.waitlist` entry in
  `src/app/core/services/http-storage.adapter.ts` (the map of backend paths; lines 24–25 hold `requests`, `bookings`).
- There is no conversation channel: no `server/services/outbound.js`, no `conversations` collection (plan 675 builds
  them).
- `docs/brain/invariants.md`: INV-6 `Touches` has the glob `src/app/**/*ai*`, which matches every file with
  "waitlist" in its name (map delta 9); INV-1 `Touches` has `src/app/core/services/*-data.service.ts` and
  `server/routes/bookings.js`; INV-2 `Touches` has `server/services/**`.
- `app-modal-shell` with `[sheet]="true"`, `app-counter`, `app-custom-select`, `app-form-field`, `app-empty-state`,
  `app-loader` exist (`src/app/shared/`). Lucide icons registered in `src/app/app.config.ts`: `users`, `bell`,
  `user-check`, `log-out`, `plus`, `clock`. No dictionary key starts with `wl_`.
- Not on `main` yet (use the merged names if they differ; the behaviour is the Contract): the collection
  `waitlistEntries` with its flags, its index `{ businessId, date, status }`, `waitlistEntrySchema` in
  `shared/schemas/entities/waitlist-entry.schema.ts`, the staff read list, the empty router `server/routes/waitlist.js`
  and its mount at `/api/v1/waitlist`, the delete-business cascade (662); `POST /api/v1/bookings/walk-in` (668);
  `FloorViewComponent`, its pills, `tableStatesAt` (671); `TableSheetComponent` and the pick-a-table mode (686);
  `freeTablesFor` and the walk-in dialog (672).

Contracts this plan uses (copied from the map, frozen 2026-11-22):

**C-WAIT (R11)**
- Collection `waitlistEntries`: `{ ...baseDocShape, date, guestName, guestPhone, clientId?, partySize: int 1–30,
  areaKey?, quotedMinutes?: int, status: 'waiting' | 'notified' | 'seated' | 'left' | 'expired', joinedAt,
  notifiedAt?, bookingId?, test?: true }`. Index `{ businessId, date, status }`.
- `server/routes/waitlist.js` (`manageRequests`): `GET /?date=`, `POST /`, `PUT /:id/notify`, `PUT /:id/seat
  { tableKeys }` (creates the walk-in booking through C-BOOK2 and links it), `PUT /:id/left`.
- `notify` sends the template `waitlist_table_ready` through the client's open conversation when there is one and
  the client is not do-not-contact; otherwise it only stamps `notifiedAt`.

**C-TABLES** (the parts used here) — Server: `requireModule('tables')` on `/api/v1/floor-plan/**`,
`/api/v1/waitlist/**` and on the table routes of `/api/v1/bookings` named in C-BOOK2. Browser: the floor view, the
table settings card and the waiting list are hidden without the module.

**C-BOOK2** (the part used here) — `POST /walk-in` `{ partySize, tableKeys, guest? }` → a `seated` booking from now,
source `walk_in`. A client is found or created through the existing `upsertClientByPhone`; counters as today.

## Goals & Success Criteria
**Primary:** a host adds a waiting party on the service screen, sees how long each party waits and in what order,
marks "table is ready", and seats the party on a table — which creates the seated booking and closes the entry.

- [auto] `pnpm run test:server` → exit 0, including the new `server/test/waitlist.test.js`:
  - a member of a business with `['frontdesk', 'tables']` gets 201 on `POST /` and the entry is `waiting`, with
    `joinedAt`, the caller's `businessId` and `createdBy`; a staff token gets 201 too; a business with `['frontdesk']`
    only gets 403 `MODULE_OFF` on all five routes; no token gets 401;
  - `POST /` refuses (400) a party of 0 and of 31, a missing name, a date that is not today's date in Jerusalem (the
    rule in Must Have), and an unknown key;
  - `GET /?date=` returns the date's entries in `joinedAt` order with a numeric `now`, and never an entry of another
    business;
  - `PUT /:id/notify` moves `waiting` → `notified` and stamps `notifiedAt`; a second call answers 409 `BAD_STATUS`;
    no row is written to any collection other than `waitlistEntries`;
  - `PUT /:id/seat { tableKeys }` on a free table answers 200 with the entry `seated` and a `bookingId`, and the
    booking exists with status `seated`, source `walk_in`, the entry's party size, name and phone, and that table;
    on a taken table it answers 409 with the walk-in route's code, the entry is still `waiting` and no booking was
    created; two seat calls for one entry at the same time produce exactly one booking;
  - `PUT /:id/left` moves `waiting` or `notified` → `left`; on a `seated` entry it answers 409 `BAD_STATUS`;
  - every route answers 404 for an entry id of another business;
  - the log lines of the five routes hold no name and no phone (the test captures the logger and searches for the
    seeded name and phone).
- [auto] the walk-in tests plan 668 wrote still pass with no assertion changed (`pnpm run test:server` → exit 0, and
  `git diff --stat origin/main -- server/test` lists only `server/test/waitlist.test.js`).
- [auto] `pnpm run test:ci` → exit 0, including `src/app/core/services/waitlist-data.service.spec.ts` (the five
  calls, each error code returned as a code) and
  `src/app/pages/bookings/components/waitlist-drawer/waitlist-drawer.component.spec.ts`: rows in order with their
  position and waited minutes computed from the server's `now`; Add is disabled without a name and a party size; the
  empty message shows with no entry; "השולחן מוכן" turns the row's tag to "הודיעו להם"; "עזבו" removes the row;
  "הושבה" closes the drawer and starts the pick-a-table mode.
- [auto] `src/app/core/utils/table-state.util.spec.ts`: `firstWaitingFit(entries, table)` returns the earliest
  `waiting` or `notified` entry whose party fits the table's seat range and whose `areaKey` is unset or the table's
  area, and `null` when none fits.
- [auto] `pnpm run build` → exit 0. `pnpm run lint` → exit 0. `pnpm --dir server run lint` → exit 0.
  `pnpm run lint:icons` → exit 0. `pnpm run lint:reuse` → exit 0.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/673-waiting-list-on-the-server-and-its-drawer.plan.md` →
  `ARCH: ok INV-1, INV-2, INV-6`.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] `/bookings?view=floor` (stubbed business with `tables`, free tables 11 and 12, stateful stubs of the waitlist
  and walk-in calls) · open "רשימת המתנה", add "לוי" with 2 guests, tap "הושבה" on the row, tap table 11 · table 11
  shows "לוי" and the waiting-list button reads "רשימת המתנה (0)" — `e2e/ui/673-1.spec.ts`.
- [human] Dandan runs a waiting list of four parties on a tablet during a mock evening: adding takes a few seconds,
  the order and the waiting time are clear, and after "finished" on a table the screen points at the party that fits.
- [human] the list's page with no items · open the page · a message says the list is empty (here: the drawer with no waiting party).
- [human] the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page (here: the drawer with the waiting-list request failing).

## Execution Mode
- Parallel: no — fourth plan of run `rs-book-ui` (671, 686, 672, 673, in that order). It edits
  `src/app/pages/bookings/**` and appends to `public/assets/data/dictionary.json`, as the other three do; it edits
  `server/routes/bookings.js`, which 668 and 671 edit (both merged before it) and 676 reads.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/waitlist.js
server/routes/bookings.js
server/services/table-bookings.js
server/test/waitlist.test.js
server/breadcrumbs.md
src/app/core/services/waitlist-data.service.ts
src/app/core/services/waitlist-data.service.spec.ts
src/app/core/services/http-storage.adapter.ts
src/app/core/models/waitlist-entry.model.ts
src/app/core/services/breadcrumbs.md
src/app/core/models/breadcrumbs.md
src/app/core/utils/table-state.util.ts
src/app/core/utils/table-state.util.spec.ts
src/app/pages/bookings/**
src/app/pages/bookings/components/waitlist-drawer/waitlist-drawer.component.spec.ts
src/app/pages/bookings/components/floor-view/floor-view.component.spec.ts
src/app/pages/bookings/components/table-sheet/table-sheet.component.spec.ts
src/app/pages/breadcrumbs.md
public/assets/data/dictionary.json
docs/brain/component-families.md
docs/brain/inventory.md
e2e/ui/673-1.spec.ts
screens/673-*.png
src/app/core/services/async-storage.service.spec.ts
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

- INV-1: preserves — every waiting-list route runs behind `verifyToken`, the two module checks and `assertCan(…, 'manageRequests')`, reads and writes only through `scopeFilter(req)` and stamps the business from the token; `waitlist-data.service.ts` is a plain client of those routes. `server/routes/bookings.js` changes only by moving the walk-in body into one exported function, with its checks unchanged. No guest writes here: an entry is written by a member.
- INV-2: preserves — `server/services/table-bookings.js` takes the business from the caller's scoped request and queries only with that business id; nothing reads across businesses and no master data is touched.
- INV-7: preserves — `waitlist.js` seats a party only through `createWalkIn` of `server/services/table-bookings.js` (engine check and hold claim inside it); it takes no hold itself and the unique index of `tableHolds` stays the only guard against a double booking.
- INV-6: preserves — the glob `src/app/**/*ai*` matches the word "waitlist" in the new file names only; this plan makes no model call and adds no AI key or AI route.

## Reuse Check

- `server/routes/waitlist.js` routes — family: server-auth — rung: 1 — why: `verifyToken`, `requireModule`, `assertCan`, `scopeFilter`, `actorOf` as the bookings router uses them.
- `createWalkIn` in `server/services/table-bookings.js` — family: table-bookings — rung: 1 — why: plan 668 already exports it; the waitlist seat route calls it as it is and no function is moved or copied.
- `WaitlistDataService` (`src/app/core/services/waitlist-data.service.ts`) — family: http — rung: 3 — why: a client of the five waitlist routes through `HttpClient` and the `API` map, returning error codes as codes like `BookingDataService.run`; the list is a per-day read with the server's time, not a stored collection, so it does not extend `BaseEntityDataService`.
- `WaitlistDrawerComponent` (`app-waitlist-drawer`, `src/app/pages/bookings/components/waitlist-drawer/`) — family: modal-shell — rung: 1 — why: its frame is `app-modal-shell` with `[sheet]="true"`; page-local content.
- Add-a-party fields — family: form-field — rung: 1 — why: `app-form-field` rows (name, phone, quoted minutes) with the app's input engine.
- Party size — family: stepper — rung: 1 — why: `app-counter` as it is (min 1, max 30).
- Area preference — family: search-combobox — rung: 1 — why: `app-custom-select`, one value of a short fixed list; no add option.
- Waiting rows — family: list-page — rung: 2 — why: single-line `.c-list-row`s inside the drawer; no search, selection or filter, so no second `app-list-shell`.
- Row actions and the "told" tag — family: chip — rung: 1 — why: `c-chip c-chip--tap` buttons and a `c-chip--tag c-chip--sm`.
- Waiting-list button with its number, and the "waiting" pill — family: chip — rung: 1 — why: a `c-btn-ghost` button with a `c-chip__count`, and one more `c-chip--tag` in the pills row of 671.
- Empty drawer — family: empty-state — rung: 1 — why: `app-empty-state` with a message key.
- `firstWaitingFit` in `table-state.util.ts` — family: helpers — rung: 2 — why: one more pure function in the helper file of 671, with spec cases.
- Drawer layout classes `.wl`, `.wl__head`, `.wl__title`, `.wl__form`, `.wl__add`, `.wl__list`, `.wl__ended`, `.wl-row`, `.wl-row__pos`, `.wl-row__who`, `.wl-row__name`, `.wl-row__meta`, `.wl-row__wait`, `.wl-row__wait--over`, `.wl-row__actions`, `.wl-row__text` — family: none — rung: 4 — why: layout of this one drawer only (a single-line row with an order number and actions); no `.c-*` class; the shared pieces carry every control.
- Messages — family: feedback — rung: 1 — why: `UserMsgService` + `LoggingService`.

## Defaults

- empty-state-on-list — applies — how: the shared empty-state piece
- app-list-container — exception — why: the list lives inside a drawer of the service screen, not on a list page; its rows are single-line `c-list-row`s
- loading-and-error-states — applies — how: the shared loading and error pieces (`app-loader`, `app-empty-state` with a retry) inside the drawer
- one-breakpoint-set — applies — how: the shared breakpoint names at the top of src/styles.scss ($break-phone-max, $break-tablet-max), used in every @media; plan 656 makes them the only set
- anchored-popup — exception — why: the drawer is a dialog (`app-modal-shell`), not a small floating box
- hints-in-tooltips — exception — why: the drawer has no explanation text; every control is a labelled field or button
- leave-and-return — exception — why: nothing sends the user to another page; seating picks a table on the same screen
- activity-log-on-write — exception — why: the default is proposed, not on; the routes log an event name and ids as the bookings router does

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a host, I want to add a party that waits for a table — name, phone, how many, where they would like to sit, how
  long I told them — so that the order is on the screen and not on paper.
- As a host, I want to see who waits longest and tap "table is ready", then "seated" on the table I give them, so
  that the list and the room stay true.
- As a host, I want the screen to point at the waiting party that fits a table that just freed, so that I do not
  match by eye in the rush.

## Functional Requirements

### Must Have (P0)
- [ ] **Routes** in `server/routes/waitlist.js`, each `verifyToken`, `requireModule('frontdesk')`,
  `requireModule('tables')`, then `assertCan(req, res, 'manageRequests', { type: 'waitlistEntries' })`; every read and
  write filtered by `scopeFilter(req)`; bodies validated with zod `strictObject`s built from the fields of
  `waitlistEntrySchema` (an unknown key → 400):
  - `GET /?date=YYYY-MM-DD` → `{ entries, now }`: the business's entries of that date, `joinedAt` ascending, every
    status; `now` is the server's epoch in ms. A missing or malformed date → 400 `BAD_DATE`.
  - `POST /` `{ date, guestName (1–80 after trim), guestPhone (≤ 30, may be ''), partySize (int 1–30), areaKey?,
    quotedMinutes? (int 0–240) }` → 201 with the entry: `status: 'waiting'`, `joinedAt: now`, `_id: newId()`,
    `schemaVersion: 2`, the base fields stamped from the token. The date must be today in Jerusalem:
    `jerusalemEpoch(date, '00:00') ≤ now < jerusalemEpoch(date, '00:00') + 30 h` (so a list that runs past midnight
    still takes a party), else 400 `BAD_DATE`. No client is created and `clientId` is not set.
  - `PUT /:id/notify` → `waiting` → `notified`, `notifiedAt: now`. It sends nothing: the template
    `waitlist_table_ready` goes out through the conversation channel, which plan 675 builds; until then the route
    only stamps (C-WAIT's "otherwise it only stamps `notifiedAt`"), and plan 675 or 676 adds the send inside this
    route.
  - `PUT /:id/seat { tableKeys: string[] (1–4) }` → from `waiting` or `notified`, in this order: (1) claim the
    entry with one conditional update whose filter holds the status that was read and which sets `status: 'seated'`
    — of two calls at the same time only one passes, the other gets 409 `STATUS_CHANGED`; (2) create the walk-in
    booking through `createWalkIn` with the entry's `partySize` and `tableKeys`, with `guest: { name, phone }` when
    the entry has a phone, and with `name` (the entry's `guestName`) when it has none — the booking then has the
    placeholder client `__walk_in__` and that name as its `guestName`; (3) set `bookingId` on the entry. When the
    walk-in is refused (the table is taken, or any other refusal) the entry is put back to the status it had, with
    no `bookingId`, and the route answers with the walk-in's own status and code.
  - `PUT /:id/left` → `waiting` or `notified` → `left`.
  - A move from any other status → 409 `BAD_STATUS`; an entry that another request moved in between → 409
    `STATUS_CHANGED`; an unknown id or another business's id → 404.
  - Log lines: an event name (`waitlist.added`, `.notified`, `.seated`, `.left`, `.refused`), the entry id, the party
    size and a code — never a name or a phone.
- [ ] **One walk-in function.** `createWalkIn(db, ctx, { partySize, tableKeys, guest?, name? })` in
  `server/services/table-bookings.js` is the body of 668's `POST /walk-in` (engine and hold claim included, INV-7);
  the route calls it. When 668 already exported such a function it is used as it is and nothing is moved. The
  walk-in tests of 668 stay green with no assertion changed.
- [ ] **Browser client.** `WaitlistDataService`: `list(date)`, `add(input)`, `notify(id)`, `seat(id, tableKeys)`,
  `left(id)` — each returns `{ ok: true, … } | { ok: false, code }`; a failure is logged with an event name, the
  status and the code. `API.waitlist` is added to the `API` map. `WaitlistEntry` is re-exported from the shared
  schema in `src/app/core/models/waitlist-entry.model.ts`.
- [ ] **The button and the pill.** In the floor view's bar (business with `tables`, date = today only): the button
  "רשימת המתנה" with the number of `waiting` + `notified` entries (`c-chip__count`; `c-chip__count--zero` at 0). The
  pills row of 671 gains "ממתינים" with the same number. The list is read with the board: on load, on every 45 s
  reload and on focus; a failed read keeps the last list.
- [ ] **The drawer** (`app-modal-shell`, `[sheet]="true"`, title `wl_title`): on top the add form — name (required),
  phone (optional; digits, spaces, `+`, `-`), party size (`app-counter`, starts at 2, 1–30), area
  (`app-custom-select`: "לא משנה", then the plan's areas), "אמרנו להם (דקות)" quoted minutes (optional number,
  0–240) — and the button "הוספה". Success: the row appears at the end, the form empties, focus returns to the name.
  Failure: message `wl_add_failed`, the typed values stay.
- [ ] **Rows** — the `waiting` and `notified` entries in `joinedAt` order, one line each: position (1, 2, 3…), name,
  party size, area name when set, minutes waited (`floor((serverNow − joinedAt) / 60000)`, shown as `wl_waited`; when
  `quotedMinutes` is set and passed, the minutes get the `alert-triangle` icon and the label `wl_over_quote`), the
  tag "הודיעו להם" on a `notified` entry, and the actions:
  - "השולחן מוכן" (only on `waiting`) → `notify`; the tag appears. No message is sent — the button's title says so
    (`wl_notify_hint`) until the channel exists.
  - "הושבה" → the drawer closes and the floor view enters the pick-a-table mode of 686 with the banner
    `wl_seat_banner` and the tables of `freeTablesFor(states, plan, partySize)` tappable; a tap sends
    `seat(id, [thatKey])`. Success: message `wl_seated` with the table number, board and list reload. 409: message
    `wlk_table_taken` (672), the mode stays. Any other failure: `wl_action_failed`, the mode ends. Escape or the
    banner's "ביטול" ends the mode with no write.
  - "עזבו" → `left`; the row goes away. No confirmation question (nothing is deleted; the entry stays stored).
  A 409 on notify or left: message `bk_bad_status` and the list reloads.
- [ ] **Leaving the drawer.** X, Escape and a tap outside close it at once; a half-typed add form is dropped without
  a question (it is three fields).
- [ ] **States of the drawer.** First read: `app-loader`. Failed first read: `app-empty-state` with `wl_load_failed`
  and a retry. No waiting party: `app-empty-state` with `wl_empty` under the add form.
- [ ] **"Fits this table."** `firstWaitingFit(entries, table)`. The sheet of a free table (686) shows, when it
  answers an entry, the line `wl_fits` with the name and the party size and the button "הושבה" that seats that entry
  on this table (the same `seat` call and results). After "סיימו" on a table (686), when the freed table has a fit,
  the message `wl_fits_toast` shows with the table number and the name.
- [ ] **Layout.** Phone (≤ 767): bottom sheet; the add form stacks one field per line; a row keeps position, name,
  party and minutes on its line and its three actions as icon buttons with `aria-label`s. Tablet and desktop: the
  centred popup (≤ 560 px); the add form in two columns; actions with text.

### Should Have (P1)
- [ ] The drawer shows the entries of today that ended (`seated`, `left`) in a closed "היום" section under the list
  (name, party, how it ended), opened by a `c-chip c-chip--tap` with `aria-expanded`.

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; logical CSS properties only; numbers and phone left-to-right; no new `.c-*` class.
- Signals only; `input()` / `output()` on the drawer (`date`, `plan`, `closed`, `seatRequested`); `inject()`.
- The waited minutes come from the server's `now` of the list answer plus the time since it arrived
  (`performance.now()`), never from the device clock.
- New keys in `public/assets/data/dictionary.json` (appended; all checked free):
  - `wl_title` "רשימת המתנה" · `wl_open` "רשימת המתנה" · `wl_pill` "ממתינים" · `wl_add` "הוספה" · `wl_area` "אזור" ·
    `wl_area_any` "לא משנה" · `wl_quoted` "אמרנו להם (דקות)" · `wl_waited` "{n} דק׳" · `wl_over_quote` "מעבר לזמן
    שנאמר" · `wl_notified` "הודיעו להם" · `wl_notify` "השולחן מוכן" · `wl_notify_hint` "מסמן שהודעתם להם. הודעה
    לא נשלחת" · `wl_seat` "הושבה" · `wl_left` "עזבו" · `wl_seat_banner` "בחרו שולחן עבור {name}"
  - `wl_seated` "{name} הושבו בשולחן {n}" · `wl_add_failed` "ההוספה נכשלה. נסו שוב" · `wl_action_failed` "הפעולה
    נכשלה. נסו שוב" · `wl_load_failed` "רשימת ההמתנה לא נטענה" · `wl_empty` "אף אחד לא מחכה כרגע" · `wl_fits`
    "מתאים ל{name} ({n})" · `wl_fits_toast` "שולחן {t} התפנה – מתאים ל{name}" · `wl_today_done` "היום"
- Reused keys (exist): `name`, `phone`, `cancel`, `retry`, `fd_q_party_size`, `bk_bad_status`, and `wlk_table_taken`
  of 672.
- Lucide icons: `users`, `bell` (table is ready), `user-check` (seat), `log-out` (left), `plus`, `clock`,
  `alert-triangle` — all registered; no icon is added.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Make the walk-in one function that two routers can call — move the body of the walk-in route into createWalkIn unchanged (or use the function plan 668 already exports), the route calls it; the walk-in tests untouched and green — server/services/table-bookings.js, server/routes/bookings.js
- [x] A2: Build the five waiting-list routes with their checks — list with the server time, add with the today rule, notify as a stamp only, left, the status moves and their refusals, scoped reads and writes, logs without names — server/routes/waitlist.js
- [x] A3: Seat a waiting party so that exactly one booking is created — the status claim, the walk-in call with guest or name, the link to the booking, the status put back when the table is refused — server/routes/waitlist.js
- [x] A4: Prove the routes with tests — every case of the Done-when: modules, roles, validation, moves, seat on a free and on a taken table, two seats at once, another business, the log capture — server/test/waitlist.test.js, server/breadcrumbs.md
- [x] A5: Give the browser one client for the waiting list — the API map entry, the five calls with codes, the model re-export; spec with the HTTP testing controller — src/app/core/services/http-storage.adapter.ts, src/app/core/services/waitlist-data.service.ts, src/app/core/services/waitlist-data.service.spec.ts, src/app/core/models/waitlist-entry.model.ts, src/app/core/services/breadcrumbs.md, src/app/core/models/breadcrumbs.md
- [x] A6: Build the drawer where a host adds a party and sees the order and the waiting time — the shell, the add form, the rows with position and minutes from the server time, loader, failed and empty states; all dictionary keys of this plan — src/app/pages/bookings/components/waitlist-drawer/waitlist-drawer.component.ts, .html, .scss, public/assets/data/dictionary.json
- [x] A7: Let the host mark ready, seat and left from a row — the three actions with their results, seating through the pick-a-table mode with the fitting free tables; the drawer spec — src/app/pages/bookings/components/waitlist-drawer/waitlist-drawer.component.ts, .html, src/app/pages/bookings/components/waitlist-drawer/waitlist-drawer.component.spec.ts, src/app/pages/bookings/components/floor-view/floor-view.component.ts, .html
- [x] A8: Put the waiting list on the service screen — the button with its number, the waiting pill, the list read with the board and on focus — src/app/pages/bookings/components/floor-view/floor-view.component.ts, .html, .scss, src/app/pages/bookings/components/floor-view/floor-view.component.spec.ts
- [x] A9: Point at the waiting party that fits a freed table — firstWaitingFit with spec cases, the line and button on a free table's sheet, the message after finished — src/app/core/utils/table-state.util.ts, src/app/core/utils/table-state.util.spec.ts, src/app/pages/bookings/components/table-sheet/table-sheet.component.ts, .html, src/app/pages/bookings/components/table-sheet/table-sheet.component.spec.ts
- [x] A10: Record the new pieces where the next plan looks for them — the folder map and the registry rows — src/app/pages/breadcrumbs.md, docs/brain/component-families.md, docs/brain/inventory.md
- [x] A11: Write the screen check that runs in the real app — signInQa, the tables module added to the business answer, stateful stubs of the floor-plan, profile, day, waitlist and seat calls; screenshot — e2e/ui/673-1.spec.ts
- [x] A12: Run every check of this plan and hand Dandan the hand checks — test:server, test:ci, build, both lints, lint:icons, lint:reuse, the arch gate, log-query; evidence into Execution Notes; then the human cards

## Technical Considerations
- Dependencies: the registries of 662 (collection, schema, index, router mount, staff read list); the walk-in route
  of 668; the floor view, pills and board reload of 671; the sheet and the pick-a-table mode of 686; `freeTablesFor`
  of 672; `FloorPlanDataService` (areas).
- New files needed: `server/test/waitlist.test.js`, `server/services/table-bookings.js` (only when 668 exports no
  walk-in function), `src/app/core/services/waitlist-data.service.ts` (+ spec),
  `src/app/core/models/waitlist-entry.model.ts`,
  `src/app/pages/bookings/components/waitlist-drawer/waitlist-drawer.component.{ts,html,scss,spec.ts}`,
  `e2e/ui/673-1.spec.ts`.
- Model changes: `WaitlistEntry` re-exported from the shared schema. No schema file is edited: the seat claim uses
  the `status` field itself, so the entry never carries a field `waitlistEntrySchema` does not know.
- Backend / API: five routes under `/api/v1/waitlist` (mounted by 662): `GET /`, `POST /`, `PUT /:id/notify`,
  `PUT /:id/seat`, `PUT /:id/left`. A dedicated router, not the generic API, because every write is a status move
  with rules and `seat` writes a booking and a hold in the same request (`routerWrites: true` in 662).
- Auth and validation: any member (`manageRequests`); both module checks on the server; zod on every body; ids and
  the business only from the token and the route.
- Security surface: a waiting guest's name and phone are stored (personal data, kept under the business like a
  booking's) and never logged; no new secret; nothing is sent outside.
- Data / migration: none — the collection and its index come from 662; old entries are expired by the job of 676.
- Project checks: `[auto] log-query` present; `pnpm run test:server` and `pnpm run test:ci`; one `[ui]` spec with
  `signInQa`; every dictionary key named with its Hebrew value; icons named (all registered); Reuse Check lists every
  control; hotspots appended only; the folder maps of `server/`, `core/services`, `core/models` and `pages` in
  scope; `standards-backend.md` §3 is covered by 662 (the collection is registered there).

Every Atomic Sub-task names its files and is concrete enough for a Worker to run without asking (no "TBD",
"handle errors appropriately", "same as the other screen"). `/plan`'s Architect + PM review checks this.

## Out of Scope
- Sending the "table is ready" message (plans 675 and 676 add the send to `notify`); the `expired` status and the job
  that sets it (676).
- Guests joining the list by themselves through a QR code, and a position page (brief Part 6, "Later").
- Creating a client from a waiting entry at add time; reordering the list by hand; a waiting list for another date
  than today.
- Any shared registry file (`collections.js`, `db.js`, `app.js`, `permissions.js`, the schema index): 662 owns them.

## Critical Questions
- none

## Execution Notes
- behaviour: an entry is always for today (with a 30-hour window for service past midnight); the browser sends the
  date, the server checks it.
- behaviour: "left" asks no confirmation — it is a status, nothing is deleted.
- behaviour: "table is ready" only marks the entry until the conversation channel exists; the button's tooltip says
  so.
- A1: 668 already exports `createWalkIn(db, ctx, { partySize, tableKeys, guest, name })` in `server/services/table-bookings.js` and the walk-in route calls it, so nothing was moved; `server/routes/bookings.js` and `server/test/bookings-tables.test.js` are untouched.
- behaviour: a phone typed in the add form needs at least 7 digits (digits, spaces, `+`, `-`), as the walk-in dialog does, so that "seated" cannot fail later on the client lookup — reverse: drop `MIN_PHONE_DIGITS` in the drawer.
- behaviour: the waiting rows are a local `.wl-row` list, not `.c-list-row` (that class is `display: contents` for grid tables and cannot lay out a single line); no new `.c-*` class.
- behaviour: quoted minutes is a numeric text field (digits only, 0–240) because a `type="number"` input needs the number box wrapper the reuse lint demands.
- behaviour: on a 409 `BAD_STATUS`/`STATUS_CHANGED` while seating from the pick-a-table mode, the mode ends, `bk_bad_status` shows and the board reloads; `NO_TABLE` keeps the mode (as the plan says).
- scope: `plans/673-…plan.md` Architecture Impact gained an INV-7 line (the arch gate listed INV-7 as overlapping).
- Evidence: `pnpm run test:server` → exit 0, 158 files / 2191 tests (incl. `server/test/waitlist.test.js`, `bookings-tables.test.js` unchanged); `pnpm run test:ci` → exit 0, 2974 SUCCESS; `pnpm run build` → exit 0; `pnpm run lint` → 0 errors; `pnpm run lint:icons`, `lint:no-native-select`, `lint:reuse` (`node scripts/reuse-lint.mjs --diff=origin/orch/rs-book-ui-2`) → ok; `node scripts/scope-check.mjs --arch --plan=…` → `ARCH: ok INV-1, INV-2, INV-7, INV-6`; `node scripts/log-query.mjs --since=plan-start --level=error` → SKIP: no database configured; `kit-manifest-check` → ok; `breadcrumbs-check` → clean.
- The `[ui]` item `e2e/ui/673-1.spec.ts` is written, not run (no app or QA login here).
