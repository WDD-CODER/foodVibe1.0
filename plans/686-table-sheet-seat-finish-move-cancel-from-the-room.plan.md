# Plan 686 — The table sheet: seat, finish, move and cancel a booking from its table on the room

Status: draft
Depends-on: 671
Snapshot: 28359b6d54b0c77e288c52702a850daef92ccf07

## Problem Statement
Plan 671 draws the room with a live state per table, but a tap on a table does nothing: the host still has to go to
the day list to mark a party as seated or finished. This plan adds the sheet that opens from a table — what is on it
now, what comes next, and the actions that fit — and the "move to another table" mode. It is the second half of map
row R9 (Restaurant program, `docs/restaurant/restaurant-map.md`), split from 671 because the row is an L. Seating a
walk-in and the dialogs are plan 672.

Verified on `origin/main` (28359b6d, 2026-11-22):
- `src/app/pages/bookings/bookings.page.ts:124–142`: `setStatus(b, status)` asks `ConfirmModalService.open('bk_cancel_confirm')`
  before a cancel, then calls `BookingDataService.setStatus`; `BAD_STATUS` shows `bk_bad_status` and reloads; any other
  failure shows `rq_decision_failed`. `canNoShow` (104) is `status === 'confirmed' && Date.now() >= b.startAt`;
  `canCancel` (108) is `confirmed | seated`.
- `server/routes/bookings.js:22`: `MOVES = { confirmed: [seated, no_show, cancelled], seated: [finished, cancelled] }`;
  `no_show` is refused before `startAt` (line 72).
- `src/app/shared/modal-shell/` · `app-modal-shell`: role dialog, Escape for the top-most popup, focus trap and
  restore, `[sheet]="true"` = a bottom sheet on a phone and the centred popup on wider screens, `titleKey`
  (`docs/brain/component-families.md` "modal-shell").
- Dictionary keys that exist: `bk_seated` "הגיעו", `bk_finished` "סיימו", `bk_no_show` "לא הגיעו", `bk_cancel`
  "ביטול", `bk_cancel_confirm`, `bk_bad_status`, `bk_status_*`, `rq_decision_failed`, `client`, `close`.
- Lucide icons registered in `src/app/app.config.ts`: `user-check`, `circle-check`, `circle-slash`, `circle-x`,
  `arrow-left-right`, `users`, `clock`, `x`.
- The client page route is `clients/:id` (`src/app/app.routes.ts:175`); the day list links a booking's name to it
  (`bookings.page.html:68`).
- No dictionary key starts with `tsh_`.
- Not on `main` yet (use the merged names if they differ; the behaviour is the Contract): `FloorViewComponent` with
  its `tableTapped` output, `tableStatesAt` and `dayBoard` (671); `app-floor-map` with its selected-keys input (665);
  `PUT /api/v1/bookings/:id/tables` and its call on `BookingDataService` (668).

Contract this plan uses (copied from the map, frozen 2026-11-22):

**C-BOOK2** (the parts used here) — Routes in `server/routes/bookings.js`, all `requireModule('frontdesk')` and
`requireModule('tables')` (`GET /day` and `PUT /:id/status` keep the `frontdesk` gate only), action
`manageRequests`: … `PUT /:id/tables` `{ tableKeys }`; … the existing `PUT /:id/status` also stamps `seatedAt` /
`finishedAt` and releases the hold from now on `finished`, `cancelled`, `no_show`. A walk-in sent without `guest` is
stored with `clientId: '__walk_in__'`, `guestName: ''`, `guestPhone: ''`.

## Goals & Success Criteria
**Primary:** a host taps a table on the room, sees who is on it and who comes next, and seats, finishes, moves or
cancels the booking there; after "finished" the table shows as free.

- [auto] `pnpm run test:ci` → exit 0, including
  `src/app/pages/bookings/components/table-sheet/table-sheet.component.spec.ts`: a table with a `confirmed` booking
  shows seat, cancel and move, and shows no-show only when the server moment is at or past `startAt`; a `seated`
  booking shows finish, cancel and move; a free table shows no booking action and the text of the next booking when
  there is one; a `not_active` table shows only its label; the client link is absent for the client ids
  `__walk_in__` and `__test__`.
- [auto] same spec: seat calls `setStatus(id, 'seated')` once and closes the sheet on success; `BAD_STATUS` shows
  `bk_bad_status`, reloads the board and keeps the sheet open; cancel asks `bk_cancel_confirm` first and does nothing
  on "no".
- [auto] `src/app/pages/bookings/components/floor-view/floor-view.component.spec.ts`: "move" closes the sheet and
  shows the move banner with the party's name; a tap on another table calls the tables write with that one key and,
  on success, leaves move mode and reloads; a refused write (409) shows `tsh_move_refused` and stays in move mode;
  Escape or the banner's cancel leaves move mode and writes nothing; a tap on the booking's own table writes nothing.
- [auto] `pnpm run build` → exit 0. `pnpm run lint` → exit 0. `pnpm run lint:icons` → exit 0. `pnpm run lint:reuse`
  → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] `/bookings?view=floor` (stubbed business with `tables`, tables 11 and 12, a `confirmed` booking of "כהן" on
  table 12 that started five minutes before the stubbed `now`; the stub keeps the status it is sent) · tap table 12,
  tap "הגיעו", tap table 12 again, tap "סיימו" · the state label of table 12 is "פנוי" — `e2e/ui/686-1.spec.ts`.
- [ui] same stub · tap table 12, tap "העברה לשולחן אחר", tap table 11 · table 11 shows "כהן" — `e2e/ui/686-2.spec.ts`.
- [human] Dandan seats, moves and finishes three bookings from the room on a tablet: every action is where he
  expects it and the room follows without a reload.

## Execution Mode
- Parallel: no — second plan of run `rs-book-ui` (671, 686, 672, 673, in that order). It edits
  `src/app/pages/bookings/**` and appends to `public/assets/data/dictionary.json`, as 671, 672 and 673 do.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/bookings/**
src/app/pages/bookings/components/table-sheet/table-sheet.component.spec.ts
src/app/pages/bookings/components/floor-view/floor-view.component.spec.ts
src/app/core/utils/table-state.util.ts
src/app/core/utils/table-state.util.spec.ts
public/assets/data/dictionary.json
src/app/pages/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
e2e/ui/686-1.spec.ts
e2e/ui/686-2.spec.ts
screens/686-*.png
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

- INV-none: preserves — page-local components that call the booking routes of plan 668 through the existing `BookingDataService` calls; no data service, route, permission file or schema is edited. A move is decided by the server's hold claim (INV-7 of plan 662): the browser sends the tapped table and shows the answer, it never decides that a table is free.

## Reuse Check

- `TableSheetComponent` (`app-table-sheet`, `src/app/pages/bookings/components/table-sheet/`) — family: modal-shell — rung: 1 — why: its frame is `app-modal-shell` with `[sheet]="true"` (bottom sheet on a phone, centred popup above); the content is page-local.
- Action buttons in the sheet — family: chip — rung: 1 — why: `c-chip c-chip--tap` with an icon, as the day list's actions.
- Status label in the sheet — family: chip — rung: 1 — why: `c-chip--tag c-chip--sm`.
- Cancel question — family: modal-controller — rung: 1 — why: `ConfirmModalService.open('bk_cancel_confirm')`, the question the day list already asks.
- Move banner (text and a cancel button above the room) — family: chip — rung: 1 — why: a line of text with one `c-btn-ghost c-btn-ghost--sm` button, scoped SCSS only; no new shared piece.
- `nextOnTable` in `table-state.util.ts` — family: helpers — rung: 2 — why: one more pure function in the helper file of plan 671, with spec cases.
- `.tsh`, `.tsh__head`, `.tsh__headline`, `.tsh__title`, `.tsh__label`, `.tsh__line`, `.tsh__meta`, `.tsh__block`, `.tsh__notes`, `.tsh__actions`, `.fv__move` — family: none — rung: 4 — why: layout of the table sheet and the move banner only, scoped in their own stylesheets; every control inside is a chip, a ghost button or the modal shell.
- Messages — family: feedback — rung: 1 — why: `UserMsgService` + `LoggingService`.

## Defaults

- loading-and-error-states — exception — why: the sheet loads nothing of its own; it shows the board plan 671 already loaded (671 carries the card)
- one-breakpoint-set — applies — how: the shared breakpoint names at the top of src/styles.scss ($break-phone-max, $break-tablet-max), used in every @media; plan 656 makes them the only set
- anchored-popup — exception — why: the sheet is a dialog (`app-modal-shell`), not a small floating box
- hints-in-tooltips — exception — why: the sheet has no explanation text; every control is a labelled button
- empty-state-on-list — exception — why: the sheet shows one table, not a list; a free table reads "השולחן פנוי"
- app-list-container — exception — why: the sheet is a dialog with two blocks, not a list page
- leave-and-return — exception — why: the client link is plain navigation; nothing is being edited in the sheet, so there is no work to keep or restore

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a host, I want to tap a table and mark its party as arrived or finished, so that I never leave the room view
  during service.
- As a host, I want to move a party to another table with two taps, so that the room on the screen matches the room.
- As a host, I want to see who is next on a table before I seat someone there, so that I do not give away a table
  that is needed in twenty minutes.

## Functional Requirements

### Must Have (P0)
- [ ] **Opening.** A tap on a table in the floor view (the `tableTapped` output of 671) opens `app-table-sheet` for
  that table, with the board, the plan and the current moment of the view. Staff and owner get the same sheet. The
  sheet closes on its X, on Escape, on a tap outside, and after an action that succeeded. It never asks before
  closing (nothing is typed in it).
- [ ] **Header.** The table's number, its seat range ("2–4"), its area name and its state label (the label of 671).
- [ ] **"Now" block.** The booking that gives the table its state (the `bookingId` of `tableStatesAt`): name (or
  `fv_walk_in` when empty), party size, time, status chip (`bk_status_*`), notes when there are any, and — for a
  booking on a join — the numbers of all its tables. A free table shows `tsh_free_now`.
- [ ] **"Next" block.** `nextOnTable(bookings, tableKey, moment, excludeId)`: the `confirmed` booking of the day on
  this table with the earliest `startAt` after the moment, other than the "now" booking: time, name, party size; none
  → `tsh_no_next`.
- [ ] **Actions that fit** (the "now" booking; all work at the live moment only — when the strip shows another hour
  the sheet shows the two blocks and the line `tsh_not_live`, with no action):
  - `confirmed` → "הגיעו" (`setStatus` `seated`); "לא הגיעו" only when the server moment ≥ `startAt` (`no_show`);
    "ביטול" (after `bk_cancel_confirm`); "העברה לשולחן אחר".
  - `seated` → "סיימו" (`finished`); "ביטול" (after `bk_cancel_confirm`); "העברה לשולחן אחר".
  - Every booking with a real client (`clientId` not `__walk_in__` and not `__test__`): the link "לקוח" to
    `/clients/<clientId>`.
  - A free or not-active table: no action (the walk-in button of a free table is plan 672).
  One action at a time: while a call runs every button of the sheet is disabled.
- [ ] **Results.** Success: the sheet closes and the board reloads at once (the room follows; a finished, cancelled
  or no-show booking frees its table). `BAD_STATUS` or `STATUS_CHANGED`: message `bk_bad_status`, the board reloads,
  the sheet stays open on the fresh data. Any other failure: message `rq_decision_failed`, the sheet stays open.
- [ ] **Move mode.** "העברה לשולחן אחר" closes the sheet and puts the floor view in move mode: a banner above the
  room reads `tsh_move_banner` with the party's name and a "ביטול" button, and the booking's own tables are passed to
  the map as the selected keys. A tap on any other active table sends `PUT /:id/tables { tableKeys: [thatKey] }`
  (one table; a join is not chosen here). Success: move mode ends, message `tsh_moved`, the board reloads. A 409 (the
  table is taken for that time, whatever its code): message `tsh_move_refused`, move mode stays. A 403 or any other
  failure: message `rq_decision_failed`, move mode ends. A tap on one of the booking's own tables or on a not-active
  table does nothing. Escape, the banner's "ביטול", changing the date, the view or the strip time end move mode
  without a write. In move mode a tap never opens the sheet.
- [ ] **Layout.** Phone (≤ 767): a bottom sheet; the two blocks stack; the actions wrap in rows of two. Tablet and
  desktop: the centred popup of `app-modal-shell`, at most 420 px wide.

### Should Have (P1)
- [ ] The sheet's title (`titleKey` / `labelKey` of the shell) reads `tsh_title` with the table number, so a screen
  reader announces which table was opened.

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; logical CSS properties only; times left-to-right; no new `.c-*` class; scoped SCSS with the shared
  breakpoint names.
- Signals only: the sheet takes `table`, `board`, `plan`, `moment`, `live` through `input()` and reports
  `closed`, `changed` (reload) and `moveRequested` through `output()`; the floor view owns `sheetTableKey_` and
  `movingBookingId_`.
- New keys in `public/assets/data/dictionary.json` (appended; all checked free):
  - `tsh_title` "שולחן {n}" · `tsh_now` "עכשיו" · `tsh_next` "הבא בתור" · `tsh_free_now` "השולחן פנוי" ·
    `tsh_no_next` "אין הזמנה נוספת היום" · `tsh_not_live` "מוצגת שעה אחרת. חזרו ל״עכשיו״ כדי לפעול" ·
    `tsh_seats` "מקומות" · `tsh_tables` "שולחנות"
  - `tsh_move` "העברה לשולחן אחר" · `tsh_move_banner` "בחרו שולחן אחר עבור {name}" · `tsh_moved` "ההזמנה הועברה" ·
    `tsh_move_refused` "השולחן תפוס בשעה הזאת" · `tsh_open_client` "לקוח"
- Reused keys (exist): `bk_seated`, `bk_finished`, `bk_no_show`, `bk_cancel`, `bk_cancel_confirm`, `bk_bad_status`,
  `bk_status_*`, `rq_decision_failed`, `cancel`, `close`, `notes`, and 671's `fv_walk_in`, `fv_state_*`.
- Lucide icons: `user-check` (arrived), `circle-check` (finished), `circle-slash` (no-show), `circle-x` (cancel),
  `arrow-left-right` (move), `users` (client) — all registered; no icon is added.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Add the pure rule that finds the next booking of a table — nextOnTable with spec cases: none, one later, the now booking left out, cancelled ones ignored — src/app/core/utils/table-state.util.ts, src/app/core/utils/table-state.util.spec.ts
- [x] A2: Build the sheet that shows what is on a table now and what comes next — the shell as a bottom sheet, header, the two blocks, the not-live line; all dictionary keys of this plan — src/app/pages/bookings/components/table-sheet/table-sheet.component.ts, .html, .scss, public/assets/data/dictionary.json
- [x] A3: Let the host mark arrived, finished, no-show and cancel from the sheet — the actions per status, one call at a time, the cancel question, the three result paths; the sheet spec — src/app/pages/bookings/components/table-sheet/table-sheet.component.ts, .html, src/app/pages/bookings/components/table-sheet/table-sheet.component.spec.ts
- [x] A4: Open the sheet from a tap on the room and reload the room after an action — the floor view listens to the map's tap, owns the open table, reloads the board on changed — src/app/pages/bookings/components/floor-view/floor-view.component.ts, .html
- [x] A5: Let the host move a party to another table with two taps — move mode in the floor view, the banner, selected keys on the map, the tables write, the refused and failed paths, every way out; spec cases — src/app/pages/bookings/components/floor-view/floor-view.component.ts, .html, .scss, src/app/pages/bookings/components/floor-view/floor-view.component.spec.ts
- [x] A6: Record the sheet where the next plan looks for it — the folder map and the registry rows — src/app/pages/breadcrumbs.md, docs/brain/component-families.md, docs/brain/inventory.md
- [x] A7: Write the two screen checks that run in the real app — signInQa, the tables module added to the business answer, stateful stubs of the floor-plan, profile, day, status and tables calls; screenshots — e2e/ui/686-1.spec.ts, e2e/ui/686-2.spec.ts
- [x] A8: Run every check of this plan and hand Dandan the hand check — test:ci, build, lint, lint:icons, lint:reuse, log-query; evidence into Execution Notes; then the human card

## Technical Considerations
- Dependencies: `FloorViewComponent`, `tableStatesAt`, `dayBoard` (671); `BookingDataService.setStatus` and the
  tables call of 668; `ConfirmModalService`; `app-modal-shell`; `app-floor-map` selected keys (665).
- New files needed: `src/app/pages/bookings/components/table-sheet/table-sheet.component.{ts,html,scss,spec.ts}`,
  `e2e/ui/686-{1,2}.spec.ts`.
- Model changes: none.
- Backend / API: none — it calls `PUT /api/v1/bookings/:id/status` (exists) and `PUT /api/v1/bookings/:id/tables` (668).
- Auth and validation: any member may seat, finish, cancel and move (`manageRequests` on the server); the server
  refuses a status move that is not allowed and a table that is taken.
- Security surface: none new; log events carry an event name, a status and a code only — never a name or a phone.
- Data / migration: none.
- Project checks: `[auto] log-query` present; `pnpm run test:ci`; two `[ui]` specs with `signInQa`; every dictionary
  key named with its Hebrew value; icons named (all registered); Reuse Check lists every control; hotspots appended
  only; folder map in scope.

Every Atomic Sub-task names its files and is concrete enough for a Worker to run without asking (no "TBD",
"handle errors appropriately", "same as the other screen"). `/plan`'s Architect + PM review checks this.

## Out of Scope
- Seating a walk-in from a free table, the new-booking dialog, "arriving next" and "not assigned" (plan 672); the
  waiting list (plan 673).
- Moving a booking onto a join, changing its date, time or party size (the phone dialog of 672 covers a change).
- Any server change; any change to the day and week views.

## Critical Questions
- none

## Execution Notes
- evidence: pnpm run build -> 0; pnpm run lint -> 0 (0 errors); pnpm run test:ci -> 0, 2910 of 2910 SUCCESS; lint:icons, lint:reuse, kit-manifest-check, override-check, plan-ledger-check, breadcrumbs-check -> 0; log-query -> no entries.
- the [ui] specs e2e/ui/686-1.spec.ts and 686-2.spec.ts are written, not run.
- seen-free deviation: the sheet takes one more input, look (the table state of 671), so it need not recompute holdMinutes.
- a 409 is read from the codes the server sends with it (NO_TABLE, BAD_STATUS, STATUS_CHANGED) because BookingResult carries no HTTP status.
- behaviour: a move goes to one tapped table; when the party is larger than that table the server's answer decides
  (a refusal shows the "taken" message).
- behaviour: actions are offered only at the live moment; at another hour of the strip the sheet is read-only.
