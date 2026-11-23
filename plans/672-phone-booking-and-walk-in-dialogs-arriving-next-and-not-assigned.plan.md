# Plan 672 — Phone booking and walk-in dialogs, and the "arriving next" and "not assigned" lists on the service screen

Status: draft
Depends-on: 671, 686
Snapshot: 28359b6d54b0c77e288c52702a850daef92ccf07

## Problem Statement
After plans 671 and 686 the host sees the room and acts on a booking from its table, but cannot create one: a guest
who phones, or a couple who walks in, still has no way onto a table. Bookings made before table service was switched
on have no table and are invisible on the room. This plan adds the new-booking dialog (phone), the walk-in dialog,
and the two lists beside the room: "arriving next" and "not assigned". It is map row R10 of the Restaurant program
(`docs/restaurant/restaurant-map.md`).

Verified on `origin/main` (28359b6d, 2026-11-22):
- `src/app/shared/client-picker/client-picker.component.ts`: inputs `selected`, `inputId`, `variant`, `allowAdd`
  (line 59), `exclude`; outputs `picked`, `cleared`, `escaped` (lines 53–71). The picked client shows as a name inside
  the field with an X. Its add view saves through `ClientDataService.addClient()`, which only an owner may do
  (`clients` is in `OWNER_ONLY_TYPES`, `server/utils/permissions.js:25`).
- `src/app/shared/modal-shell/` · `app-modal-shell`: `[sheet]`, `[hasChanges]` (Escape and a tap outside ask before
  typed edits are dropped; the popup's own Cancel and X never ask), `dismissible` while busy
  (`docs/brain/component-families.md` "modal-shell"). `src/app/pages/requests/components/new-request-dialog/` is a
  dialog of this shape built on the shell (its template opens with `<app-modal-shell`).
- Shared fields that exist: `app-date-field` (`value` model, `committed` output), `app-counter`, `app-custom-select`,
  `app-form-field`, `app-empty-state`.
- `server/utils/client-upsert.js`: `upsertClientByPhone` — the server finds or creates a client from a name and a
  phone.
- Dictionary keys that exist: `name`, `phone`, `notes`, `cancel`, `save`, `saving`, `fd_q_party_size` "מספר סועדים",
  `bk_seated`. No key starts with `nb_` or `wlk_`.
- Lucide icons registered in `src/app/app.config.ts`: `phone`, `user-plus`, `user-check`, `clock`, `users`, `plus`,
  `alert-triangle`.
- Not on `main` yet (use the merged names if they differ; the behaviour is the Contract): the engine
  `shared/schemas/front-desk/table-engine.ts` (`assign`, `candidates`; 663), `tableServiceOf` (662),
  `FloorPlanDataService` (664), `app-floor-map` (665), the routes of C-BOOK2 and their calls on `BookingDataService`
  (668), `FloorViewComponent` with its side column, `dayBoard`, `tableStatesAt` (671), `TableSheetComponent` and the
  floor view's pick-a-table mode used for "move" (686).

Contracts this plan uses (copied from the map, frozen 2026-11-22):

**C-BOOK2** (the parts used here) — A walk-in sent without `guest` is stored with `clientId: '__walk_in__'`,
`guestName: ''`, `guestPhone: ''`; no client is created and no counter moves. Routes in `server/routes/bookings.js`,
all `requireModule('frontdesk')` and `requireModule('tables')`, action `manageRequests`:
`GET /availability?date=&partySize=&area=` → `dayAvailability` for members (not `onlineOnly`);
`POST /` `{ clientId | guest: { name, phone }, date, time, partySize, areaKey?, tableKeys?, notes? }` → source
`phone`; without `tableKeys` the engine assigns, with them the claim decides (owner only → `override`);
409 `NO_TABLE` with `alternatives`;
`POST /walk-in` `{ partySize, tableKeys, guest? }` → a `seated` booking from now, source `walk_in`;
`PUT /:id/tables` `{ tableKeys }`; … `GET /day` also returns `holds` and the bookings with no `tableKeys` (A7).
A client is found or created through the existing `upsertClientByPhone`; counters as today.

**C-ENGINE** (the parts used here) — `shared/schemas/front-desk/table-engine.ts`, pure, imported by the browser
through `@schemas`. `candidates(plan, partySize, areaKey?, onlineOnly) → Array<{ tableKeys, seats }>`,
`assign(plan, profile, holds, ask) → { ok: true, tableKeys, startAt, endAt } | { ok: false, reason }`,
`dayAvailability(...) → Array<{ time, available }>`. Order of candidates: fewest wasted seats, then the asked area,
then single tables before joins, then the table `number` — so the same question always gets the same answer.

## Goals & Success Criteria
**Primary:** a host takes a phone booking and seats a walk-in from the service screen, each landing on a table the
screen showed, and sees who arrives in the next 90 minutes and which bookings still have no table.

- [auto] `pnpm run test:ci` → exit 0, including
  `src/app/pages/bookings/components/new-booking-dialog/new-booking-dialog.component.spec.ts`: Save is disabled until
  a client or a guest name and phone, a date, a party size and a time are set; the time chips come from the
  availability call and a taken time is disabled; choosing a time shows the engine's table as the selected keys of
  the small map; a save without a tapped table sends no `tableKeys`; an owner's tap on another table sends that key as
  `tableKeys`; for staff a tap on the small map changes nothing; a 409 `NO_TABLE` shows the alternatives as chips and
  a tap on one sets the date and the time; any other failure shows `nb_save_failed` and keeps the dialog open.
- [auto] `src/app/pages/bookings/components/walk-in-dialog/walk-in-dialog.component.spec.ts`: opened from a free
  table it has that table selected and sends `{ partySize, tableKeys }` without `guest` when no name is typed; with a
  name and a phone it sends `guest`; opened from the button it has no table and Save is disabled until one free table
  is tapped; a 409 shows `wlk_table_taken` and keeps the dialog open.
- [auto] `src/app/core/utils/table-state.util.spec.ts`: `arrivingNext(bookings, moment, 90)` returns the `confirmed`
  bookings of kind `table` with `startAt ≤ moment + 90 min` (a booking whose time has passed stays on the list until
  it is seated, cancelled or marked no-show) in `startAt` order, each with a `late` flag by the rule of C-BOOK2
  (`moment > startAt + holdMinutes`), and none that is `seated`, `finished`, `cancelled` or `no_show`.
- [auto] `src/app/pages/bookings/components/floor-view/floor-view.component.spec.ts`: the two lists show their rows
  and each shows its empty message when it has none; "שיבוץ" on a not-assigned row starts the pick-a-table mode and a
  tap on a table sends the tables write with that key.
- [auto] `pnpm run build` → exit 0. `pnpm run lint` → exit 0. `pnpm run lint:icons` → exit 0. `pnpm run lint:reuse`
  → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] `/requests` (stubbed business with `tables`, one open table request, the approve call answering 409
  `NO_TABLE` with one alternative at 21:00 and then 200) · press the request's approve button, then the chip
  "21:00" · the dialog shows "אין שולחן פנוי בשעה שביקשו" before the tap and is closed after it —
  `e2e/ui/672-4.spec.ts`, screenshot `screens/672-4.png`.
- [ui] `/bookings?view=floor` (stubbed business with `tables`, tables 11 and 12, an empty day; the stub's
  `POST /bookings` stores what it is sent on the table the engine names) · tap "הזמנה חדשה", type a guest name and
  phone, pick the time chip "20:00", read the table number the dialog shows, tap "שמירה", tap the strip chip "20:00"
  · the table with that number shows the guest's name — `e2e/ui/672-1.spec.ts`.
- [ui] same stub, with the signed-in user's answer changed to `businessRole: 'staff'` · open "הזמנה חדשה" and pick
  "20:00" · the element `[data-testid="nb-pick-other"]` (the owner's "pick another table" hint) is not on the page
  while `[data-testid="nb-offered"]` is — `e2e/ui/672-2.spec.ts`.
- [ui] same stub · tap free table 11, tap "הושבת מזדמנים", tap "הושבה" · the state label of table 11 is "יושבים" —
  `e2e/ui/672-3.spec.ts`.
- [human] Dandan takes two phone bookings and seats one walk-in on a tablet during a mock evening: the dialog asks
  only what a host knows on the phone, and the table it offers is the one he would have picked.
- [human] the list's page with no items · open the page · a message says the list is empty (here: "מגיעים בקרוב" on a day with no booking).
- [human] a dialog with an explained control · hover the control · its explanation shows as a tooltip and no explanation text sits on the modal (here: the info icon beside the small map in "הזמנה חדשה", as the owner).

## Execution Mode
- Parallel: no — third plan of run `rs-book-ui` (671, 686, 672, 673, in that order). It edits
  `src/app/pages/bookings/**` and appends to `public/assets/data/dictionary.json`, as the other three do.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/bookings/**
src/app/pages/requests/**
e2e/ui/672-4.spec.ts
src/app/pages/bookings/components/new-booking-dialog/new-booking-dialog.component.spec.ts
src/app/pages/bookings/components/walk-in-dialog/walk-in-dialog.component.spec.ts
src/app/pages/bookings/components/floor-view/floor-view.component.spec.ts
src/app/pages/bookings/components/table-sheet/table-sheet.component.spec.ts
src/app/core/utils/table-state.util.ts
src/app/core/utils/table-state.util.spec.ts
public/assets/data/dictionary.json
src/app/pages/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
e2e/ui/672-1.spec.ts
e2e/ui/672-2.spec.ts
e2e/ui/672-3.spec.ts
screens/672-*.png
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

- INV-none: preserves — page-local dialogs and lists that call the booking routes of plan 668 through `BookingDataService`; no data service, route, permission file or schema is edited. The dialog previews a table with the shared engine (the one implementation, INV-7 of plan 662) and the server assigns again on save: what is stored is the server's answer, never the browser's preview. A client is created only by the server (`upsertClientByPhone`), so the owner-only rule of `clients` in the generic API is not bypassed by the browser.

## Reuse Check

- `NewBookingDialogComponent` (`app-new-booking-dialog`, `src/app/pages/bookings/components/new-booking-dialog/`) — family: modal-shell — rung: 1 — why: its frame is `app-modal-shell` (`[sheet]="true"`, `[hasChanges]`); page-local content.
- `ApproveTableDialogComponent` (`app-approve-table-dialog`, `src/app/pages/requests/components/approve-table-dialog/`) — family: modal-shell — rung: 1 — why: the same frame; page-local content.
- `WalkInDialogComponent` (`app-walk-in-dialog`, `src/app/pages/bookings/components/walk-in-dialog/`) — family: modal-shell — rung: 1 — why: the same frame; page-local content.
- Client field — family: client-picker — rung: 2 — why: `app-client-picker` with `allowAdd` false; a new guest is two plain fields, because the server creates the client and staff may not use the picker's add view.
- Guest name and phone fields, notes — family: form-field — rung: 1 — why: `app-form-field` rows with the app's input engine.
- Date — family: form-field — rung: 1 — why: `app-date-field` as it is.
- Party size — family: stepper — rung: 1 — why: `app-counter` as it is (min 1).
- Area preference — family: search-combobox — rung: 1 — why: `app-custom-select`, the family's piece for one value of a short fixed list; no add option.
- Time chips and alternative chips — family: chip — rung: 1 — why: `c-chip c-chip--tab` buttons (a taken time is `disabled`).
- "Guest details" opener in the walk-in dialog — family: chip — rung: 1 — why: a `c-chip c-chip--tap` button with `aria-expanded`.
- Small map in both dialogs — family: floor-map — rung: 1 — why: `app-floor-map` of plan 665 used as it is, with the selected keys.
- `ArrivingListComponent` (file stem `arriving-list`, selector `app-arriving-list`, `src/app/pages/bookings/components/service-lists/`) — family: list-page — rung: 2 — why: a short read-only side panel drawn with the existing `.c-list-row` engine, one line per row; no search, selection or filter, so no second `app-list-shell`.
- `UnassignedListComponent` (file stem `unassigned-list`, selector `app-unassigned-list`, `src/app/pages/bookings/components/service-lists/`) — family: list-page — rung: 2 — why: the same kind of side panel; it shares the stylesheet of the arriving list.
- `.sl__title`, `.sl__rows`, `.sl__row`, `.sl__name`, `.sl__party`, `.sl__act` — family: none — rung: 4 — why: layout of the two one-line lists only, scoped in one stylesheet; the stack is the engine `.c-input-stack` and the action is a `c-chip c-chip--tap`.
- `.fv__actions`, `.nb-row`, `.nb-chips`, `.nb-label`, `.nb-line`, `.nb-map`, `.nb-info`, `.wlk-row`, `.wlk-pick`, `.wlk-label`, `.wlk-line`, `.att-chips`, `.att-label`, `.att-line`, `.att-map` — family: none — rung: 4 — why: layout of the bar buttons and of the three dialogs only, scoped in their own stylesheets; every control inside is an existing piece (chip, form field, counter, floor map) and the stacks use the engine `.c-input-stack`.
- Empty lists — family: empty-state — rung: 1 — why: `app-empty-state` with a message key.
- `arrivingNext`, `freeTablesFor` in `table-state.util.ts` — family: helpers — rung: 2 — why: two more pure functions in the helper file of 671, with spec cases.
- Messages — family: feedback — rung: 1 — why: `UserMsgService` + `LoggingService`.

## Defaults

- empty-state-on-list — applies — how: the shared empty-state piece
- app-list-container — exception — why: the two lists are side panels of the service screen under its one `app-page-header`, not list pages; their rows are single-line `c-list-row`s
- loading-and-error-states — exception — why: the lists show the board plan 671 already loads (671 carries the card); a failed availability read shows a message with a retry inside the dialog
- one-breakpoint-set — applies — how: the shared breakpoint names at the top of src/styles.scss ($break-phone-max, $break-tablet-max), used in every @media; plan 656 makes them the only set
- hints-in-tooltips — applies — how: native [attr.title] plus [attr.aria-label] or aria-describedby on the control, as the history button of platform-business-dialog does (plan 638); no new tooltip piece
- anchored-popup — exception — why: both pieces are dialogs (`app-modal-shell`), not small floating boxes
- leave-and-return — exception — why: no dialog sends the user to another page; a new guest is typed in the dialog itself

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a host, I want to take a booking while I am on the phone — name, when, how many — and be told at once which
  table it gets, so that I can say "yes, 21:00, see you" before I hang up.
- As a host, I want to seat a couple who walks in on a free table with two taps, so that the room on the screen is
  true.
- As a host, I want to see who arrives in the next hour and a half and who is late, so that I hold the right tables.
- As the owner, I want old bookings that have no table listed with an "assign" action, so that nothing sits outside
  the room after I switch table service on.

## Functional Requirements

### Must Have (P0)
- [ ] **A refused approve on the requests page** (Dandan, 2026-11-22: handled here, not in a plan of its own).
  When `RequestDataService.approve` (plan 685) answers `code: 'NO_TABLE'` for a table request, `/requests` opens a
  new dialog `app-approve-table-dialog` (`src/app/pages/requests/components/approve-table-dialog/`, `app-modal-shell`)
  instead of the general "not saved" message. It shows the line `rq_no_table` with the asked date, time and party;
  the `alternatives` as chips (date and time) — a tap approves again with that date and time in `wanted` and closes
  on success; for the owner only, a small `app-floor-map` of the plan with the tables that are free at the asked
  time marked (`freeTablesFor` of this plan, `dayBoard(date)` for holds and `now`) — a tap on a free table approves
  again with `tableKeys` of that table; "ביטול" closes and the request stays as it was. Staff see the chips and no
  map. A second `NO_TABLE` keeps the dialog open with the new alternatives; any other failure shows the page's
  existing message. With no alternative and no free table the dialog says `rq_no_table_none`. New keys:
  `rq_no_table` "אין שולחן פנוי בשעה שביקשו", `rq_no_table_pick_time` "אפשר לאשר לשעה אחרת", `rq_no_table_pick_table`
  "או לבחור שולחן", `rq_no_table_none` "אין שעה קרובה פנויה ואין שולחן פנוי". A business without `tables` never sees
  the dialog (the server never answers `NO_TABLE` for it).
- [ ] **Entry points.** Two buttons in the floor view's bar (members of a business with `tables`, live or not):
  "הזמנה חדשה" (`c-btn-primary`, icon `phone`) and "מזדמנים" (`c-btn-ghost`, icon `user-plus`). The table sheet of a
  free table (686) gains the button "הושבת מזדמנים", which opens the walk-in dialog with that table.
- [ ] **New-booking dialog — fields, in this order:** client (`app-client-picker`, `allowAdd` false); when no client
  is picked, "אורח חדש": name and phone (both needed; the phone accepts digits, spaces, `+` and `-`); date
  (`app-date-field`, starts on the view's date); party size (`app-counter`, starts at 2, min 1); area
  (`app-custom-select`: "לא משנה" first, then the plan's areas by `order`); time chips; notes (optional, ≤ 1000).
- [ ] **Time chips.** After a date and a party size are set, and again when the date, the party or the area changes:
  `GET /bookings/availability?date=&partySize=&area=`. Each slot is a chip; `available: false` is disabled and
  dimmed. While loading the chips area shows `app-loader`; a failed read shows `nb_times_failed` with a "נסה שוב"
  button; no slot on that date shows `nb_no_times`. Changing the date, party or area clears a chosen time that is no
  longer available.
- [ ] **The offered table.** When a time is chosen the dialog runs the engine's `assign(plan, profile, holds, ask)`
  in the browser — `holds` and `now` from `dayBoard(date)`, `onlineOnly: false` — and shows the result on a small
  `app-floor-map`: the offered tables as the selected keys and the line `nb_offered` with their numbers. When the
  preview answers `ok: false` the line reads `nb_no_table` and Save stays enabled (the server decides and answers
  with alternatives).
- [ ] **Owner override.** For an owner the small map is tappable and an `info` icon button beside it (`data-testid="nb-pick-other"`) carries the hint
  `nb_pick_other` as its `title` and `aria-label` (a tooltip, never text on the dialog): a tap on a table selects it instead of the offer and the
  save sends `tableKeys: [thatKey]`; a tap on the selected table goes back to the engine's offer. For staff the map
  is not tappable and there is no hint.
- [ ] **Save.** `POST /bookings` with `clientId` or `guest`, `date`, `time`, `partySize`, `areaKey` (absent for "לא
  משנה"), `notes`, and `tableKeys` only for an override. Success: the booking goes into the store, the dialog closes,
  the message `nb_saved` shows with the table numbers of the server's answer, and the board reloads. 409 `NO_TABLE`:
  the dialog stays, the line `nb_no_table` shows with the answer's `alternatives` as chips ("21:15", or "מחר 20:00"
  with the date for another day); a tap on one sets the date and the time and reloads the chips. Any other failure:
  `nb_save_failed`, the dialog stays with everything typed. While the save runs the buttons are disabled and the
  dialog cannot be dismissed.
- [ ] **Leaving the dialog.** "ביטול" and the X close at once. Escape and a tap outside ask the shell's
  discard question when anything was typed (`[hasChanges]`), and close at once when nothing was.
- [ ] **Walk-in dialog.** Party size (`app-counter`, starts at 2); the table: opened from a free table's sheet it is
  set and shown by number; opened from the "מזדמנים" button a small `app-floor-map` shows `freeTablesFor(states,
  plan, partySize)` (tables whose state is `free` and whose seat range fits the party) as tappable and the rest
  dimmed, and one tap selects one table; "פרטי אורח" (`c-chip c-chip--tap`, `aria-expanded`) opens optional name and
  phone (both or neither). "הושבה" sends `POST /bookings/walk-in { partySize, tableKeys, guest? }`. Success: the
  dialog (and the sheet under it) closes, message `wlk_seated`, the board reloads. 409: `wlk_table_taken`, the dialog
  stays. Any other failure: `nb_save_failed`. No free table fits: the map area shows `wlk_no_free_table` and "הושבה"
  is disabled. A walk-in is always for now: the dialog is offered only at the live moment (the buttons are disabled
  with the title `tsh_not_live` when the strip shows another hour).
- [ ] **"מגיעים בקרוב" (arriving next).** `arrivingNext(bookings, moment, 90)`: the day's `confirmed` table bookings
  that start within the next 90 minutes or have already started and are not seated, earliest first. One line per
  row: time, name, party size, table numbers (or `nb_no_table_short`), a "מאחרים" tag when late, and the "הגיעו"
  action (`setStatus` `seated`, the result paths of 686). Shown for the live moment only; at another hour the panel
  shows the bookings that start in the 90 minutes after the chosen time, without the action.
- [ ] **"ללא שולחן" (not assigned).** The `unassigned` bookings of the day answer (kind `table`, no `tableKeys`, A7)
  that are `confirmed`: time, name, party size and the action "שיבוץ", which starts the pick-a-table mode of 686
  with the banner `nb_assign_banner`; a tap on a table sends `PUT /:id/tables`, with the results of 686's move.
- [ ] **Empty lists.** Each list shows `app-empty-state` with its message (`nb_arriving_empty`, `nb_unassigned_empty`)
  when it has no row. The "not assigned" panel is hidden altogether when the business has no such booking today.
- [ ] **Layout.** Desktop (≥ 1024): the two lists fill the 320 px side column 671 reserved, "arriving next" above
  "not assigned". Tablet and phone: the lists come under the room, in the same order, full width. Rows stay on one
  line (the name is cut with an ellipsis). Dialogs: bottom sheet on a phone, centred popup (≤ 520 px) above.

### Should Have (P1)
- [ ] After a successful phone booking for another date than the one on screen, the message carries the date
  (`nb_saved_on`), and the view does not jump to that date.

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; logical CSS properties only; times, dates and phone numbers left-to-right; no new `.c-*` class.
- Signals only; `input()` / `output()` on the dialogs (`date`, `tableKey`, `closed`, `saved`); `inject()`.
- The preview table and the stored table may differ when another host books the same table in between: the stored
  one (the server's answer) is the one the success message names.
- New keys in `public/assets/data/dictionary.json` (appended; all checked free):
  - `nb_open` "הזמנה חדשה" · `nb_title` "הזמנה חדשה בטלפון" · `nb_new_guest` "אורח חדש" · `nb_area` "אזור" ·
    `nb_area_any` "לא משנה" · `nb_time` "שעה" · `nb_times_failed` "השעות לא נטענו" · `nb_no_times` "אין שעות פנויות
    ביום הזה" · `nb_offered` "שולחן {n}" · `nb_no_table` "אין שולחן פנוי בשעה הזאת" · `nb_pick_other` "אפשר לבחור
    שולחן אחר במפה" · `nb_alternatives` "אפשר במקום" · `nb_tomorrow` "מחר"
  - `nb_saved` "ההזמנה נשמרה – שולחן {n}" · `nb_saved_on` "ההזמנה נשמרה ל-{date} – שולחן {n}" · `nb_save_failed`
    "השמירה נכשלה. נסו שוב"
  - `nb_arriving_title` "מגיעים בקרוב" · `nb_arriving_empty` "אין הגעות ב-90 הדקות הקרובות" · `nb_unassigned_title`
    "ללא שולחן" · `nb_unassigned_empty` "לכל ההזמנות יש שולחן" · `nb_assign` "שיבוץ" · `nb_assign_banner` "בחרו
    שולחן עבור {name}" · `nb_no_table_short` "ללא שולחן" · `nb_late` "מאחרים"
  - `wlk_open` "מזדמנים" · `wlk_title` "הושבת מזדמנים" · `wlk_from_table` "הושבת מזדמנים" · `wlk_guest_details`
    "פרטי אורח" · `wlk_seat` "הושבה" · `wlk_seated` "הושבו בשולחן {n}" · `wlk_table_taken` "השולחן נתפס בינתיים" ·
    `wlk_no_free_table` "אין שולחן פנוי שמתאים" · `wlk_pick_table` "בחרו שולחן פנוי"
- Reused keys (exist): `name`, `phone`, `notes`, `cancel`, `save`, `saving`, `retry`, `client`, `fd_q_party_size`,
  `bk_seated`, and `tsh_not_live`, `tsh_move_refused`, `fv_walk_in` of 671 and 686.
- Lucide icons: `phone`, `user-plus`, `user-check`, `clock`, `alert-triangle`, `info` — all registered in
  `src/app/app.config.ts`; no icon is added.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Add the pure rules of the two lists and of the free-table choice — arrivingNext with the late flag, freeTablesFor; every spec case of the Done-when — src/app/core/utils/table-state.util.ts, src/app/core/utils/table-state.util.spec.ts
- [x] A2: Build the phone-booking dialog a host fills while on the phone — the shell, client picker without its add row, new-guest fields, date, party, area, notes, the leave rules; all dictionary keys of this plan — src/app/pages/bookings/components/new-booking-dialog/new-booking-dialog.component.ts, .html, .scss, public/assets/data/dictionary.json
- [x] A3: Show the free times and the table the engine offers before saving — availability chips with their three states, the engine preview on the small map, the owner's tap on another table, staff read-only — src/app/pages/bookings/components/new-booking-dialog/new-booking-dialog.component.ts, .html
- [x] A4: Save the phone booking and handle a full time with alternatives — the create call, the success message with the stored table, the no-table answer with alternative chips, the failure path; the dialog spec — src/app/pages/bookings/components/new-booking-dialog/new-booking-dialog.component.ts, src/app/pages/bookings/components/new-booking-dialog/new-booking-dialog.component.spec.ts
- [x] A5: Build the walk-in dialog that seats a party at once — party size, table from the sheet or picked on the small map, optional guest details, the walk-in call and its results; spec — src/app/pages/bookings/components/walk-in-dialog/walk-in-dialog.component.ts, .html, .scss, .spec.ts
- [x] A6: Put the two buttons on the service screen and the walk-in button on a free table's sheet — the bar buttons, live-only rule for walk-in, the sheet button, reload after each success — src/app/pages/bookings/components/floor-view/floor-view.component.ts, .html, src/app/pages/bookings/components/table-sheet/table-sheet.component.ts, .html, src/app/pages/bookings/components/table-sheet/table-sheet.component.spec.ts
- [x] A7: Show who arrives next and which bookings have no table, beside the room — the two list components with single-line rows, the arrived action, the assign action through the pick-a-table mode, empty states, the side column on desktop and under the room below it; spec cases — src/app/pages/bookings/components/service-lists/arriving-list.component.ts, .html, .scss, src/app/pages/bookings/components/service-lists/unassigned-list.component.ts, .html, .scss, src/app/pages/bookings/components/floor-view/floor-view.component.ts, .html, .scss, src/app/pages/bookings/components/floor-view/floor-view.component.spec.ts
- [x] A8: Record the new pieces where the next plan looks for them — the folder map and the registry rows — src/app/pages/breadcrumbs.md, docs/brain/component-families.md, docs/brain/inventory.md
- [x] A9: Write the three screen checks that run in the real app — signInQa, the tables module added to the business answer (and the staff role for the second), stateful stubs of the floor-plan, profile, day, availability, create and walk-in calls; screenshots — e2e/ui/672-1.spec.ts, e2e/ui/672-2.spec.ts, e2e/ui/672-3.spec.ts
- [x] A11: Let the owner rescue a table request that could not be approved because the hour is full — the approve-table dialog with alternative chips and the owner's table choice, opened by the requests page on the no-table answer; its spec and one screen check — src/app/pages/requests/components/approve-table-dialog/approve-table-dialog.component.ts, .html, .scss, .spec.ts, src/app/pages/requests/requests.page.ts, e2e/ui/672-4.spec.ts
- [x] A10: Run every check of this plan and hand Dandan the hand checks — test:ci, build, lint, lint:icons, lint:reuse, log-query; evidence into Execution Notes; then the human cards

## Technical Considerations
- Dependencies: `BookingDataService` calls of 668 (create, walk-in, tables, availability), `dayBoard` and
  `tableStatesAt` (671), the pick-a-table mode and `TableSheetComponent` (686), the engine (663), `tableServiceOf`
  (662), `FloorPlanDataService` (664), `app-floor-map` (665), `ClientDataService` (read by the picker),
  `PermissionService.isOwner_`.
- New files needed: `src/app/pages/bookings/components/new-booking-dialog/new-booking-dialog.component.{ts,html,scss,spec.ts}`,
  `…/walk-in-dialog/walk-in-dialog.component.{ts,html,scss,spec.ts}`,
  `…/service-lists/arriving-list.component.{ts,html,scss}`, `…/service-lists/unassigned-list.component.{ts,html,scss}`,
  `e2e/ui/672-{1,2,3}.spec.ts`.
- Model changes: none.
- Backend / API: none — it calls the routes of 668.
- Auth and validation: any member creates a booking and a walk-in (`manageRequests`); only an owner's `tableKeys` on
  a create is accepted as an override — the server refuses it from staff, the browser does not offer it. Input is
  bounded in the browser and validated again by the server.
- Security surface: a guest's name and phone are typed here and sent only in the request body; log events carry an
  event name, a status and a code — never the name, the phone or the notes.
- Data / migration: none.
- Project checks: `[auto] log-query` present; `pnpm run test:ci`; three `[ui]` specs with `signInQa`; every dictionary
  key named with its Hebrew value; icons named; Reuse Check lists every control; hotspots appended only; folder map
  in scope.

Every Atomic Sub-task names its files and is concrete enough for a Worker to run without asking (no "TBD",
"handle errors appropriately", "same as the other screen"). `/plan`'s Architect + PM review checks this.

## Out of Scope
- Changing an existing booking's date, time or party size from the room (`PUT /:id/when` has no screen in this plan).
- Choosing a join by hand, a booking for a kind other than `table`, recurring bookings.
- The waiting list (plan 673); messages to the guest (plans 675, 676).
- Any server change.

## Critical Questions
- none

## Execution Notes
- behaviour: a new guest is typed as name and phone inside the dialog for owner and staff alike; the server finds or
  creates the client by phone. The picker's own add view is switched off here (staff may not create a client, and
  two ways to add one in one dialog would confuse).
- behaviour: "arriving next" is 90 minutes, the same window as the "reserved soon" state of 671.
- seen: src/testing/test-lucide-icons.ts has no Phone icon, so floor-view specs add Phone to their own pick (that file is outside this plan scope).
- behaviour: the walk-in dialog from the bar dims tables that do not fit the party (shown as not active on the map) and ignores a tap on them — reverse: show all tables as tappable and let the server refuse.
- behaviour: the phone-booking dialog shows the area select only when the plan has at least two areas — reverse: always show it.
- behaviour: the "arrived" and "assign" actions of the two lists are offered at the live moment only (the walk-in rule); at another hour the lists show without actions — reverse: always show the actions.
- behaviour: a walk-in 409 is read as code NO_TABLE (the server answers that for a taken table) — reverse: map another code in walk-in-dialog onSeat.
- behaviour: with a client picked in the phone-booking dialog the new-guest fields are hidden — reverse: always show them.
- Evidence: pnpm run test:ci -> exit 0, 2945 SUCCESS; pnpm run build -> exit 0; pnpm run lint -> exit 0 (0 errors); lint:icons -> 0; lint:no-native-select -> 0; lint:reuse -> REUSE: ok; breadcrumbs-check -> clean; override-check -> ok; plan-ledger-check -> OK; kit-manifest-check -> ok, 0 unclassified; log-query -> SKIP: no database configured.
- [ui] items: e2e/ui/672-1..4.spec.ts written, not run (no running app, no QA login in this folder).
