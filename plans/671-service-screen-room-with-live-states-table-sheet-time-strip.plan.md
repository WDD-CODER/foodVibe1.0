# Plan 671 — The service screen: the room with live table states, the time strip, the summary and the mode switch

Status: draft
Depends-on: 665, 667, 668, 685
Snapshot: 28359b6d54b0c77e288c52702a850daef92ccf07

## Problem Statement
A host runs the evening from a list of bookings (`/bookings`, views day and week). The list cannot show which table is
free, which is about to be needed and who is late. After plans 662–668 the server knows which booking holds which
table, and the owner has drawn the room. This plan adds the third view of `/bookings`, **floor**: the room drawn by
`app-floor-map` with one live state per table, a strip to look at the room at another hour, summary numbers, and the
one-tap confirm-mode switch for the owner. It is the first half of map row R9 (Restaurant program,
`docs/restaurant/restaurant-map.md`); the table sheet with its actions is plan 686, the dialogs and lists are 672,
the waiting list is 673.

Verified on `origin/main` (28359b6d, 2026-11-22):
- `src/app/pages/bookings/bookings.page.ts` (143 lines): `BookingsView = 'day' | 'week'` (line 15), `VIEWS` (16), the
  view and the date come from the query string (`view_`, `date_`, lines 59–66), `go()` (112) writes them back. The
  page has no `components/` folder. `bookings.page.html` draws the view tabs as `c-chip c-chip--tab` buttons with the
  label key `'bk_view_' + v` (lines 37–49). Route: `src/app/app.routes.ts:206` (`authGuard`, `moduleGuard(['frontdesk'])`).
- `src/app/core/services/booking-data.service.ts` (72 lines): `day(date)` calls `GET /api/v1/bookings/day` and returns
  `DayLoad = { bookings, coversByHour }` (lines 12, 35); `setStatus` (53); the private `run()` (59) stores the saved
  booking and returns `{ ok, booking } | { ok: false, code }`.
- `server/routes/bookings.js:40–55`: `GET /day` answers `{ bookings, coversByHour }`; it does not send the server's time.
- `src/app/core/services/front-desk-profile-data.service.ts:19`: `profile_` (the business's one profile);
  `src/app/core/services/module.service.ts:16`: `has(keys)`; `src/app/core/services/permission.service.ts:50`:
  `isOwner_`.
- Reusable pieces that exist: `app-page-header`, `app-empty-state` (`src/app/shared/empty-state/`), `app-loader`
  (`src/app/shared/loader/`), `app-scroll-rail` (`src/app/shared/scroll-rail/`, a horizontal strip with guide arrows),
  `UserMsgService`, `TranslationService`, the chip engine (`c-chip c-chip--tab`, `c-chip--tag`, `c-chip--toggle`) in
  `src/styles.scss`, the breakpoint names `$break-phone-max` / `$break-tablet-max` (plan 656) and
  `src/app/core/utils/breakpoints.ts`.
- Lucide icons already registered in `src/app/app.config.ts`: `check`, `clock`, `users`, `timer`, `alert-triangle`,
  `ban`, `chevron-right`, `chevron-left`.
- No dictionary key starts with `fv_`; `bk_view_floor` does not exist.
- A `[ui]` spec for a module the QA business does not have stubs the calls itself (`e2e/ui/634-1.spec.ts`: it adds the
  module to the answer of `GET /api/v1/business` with `page.route` and fulfils the module's routes).
- Not on `main` yet, built by earlier plans of the program (use the merged names if they differ; the behaviour is the
  Contract): the module key `tables` and `tableServiceOf(profile)` in `shared/schemas/front-desk/table-service.ts`
  (662); `openRangesOf(hours, date)` in `shared/schemas/front-desk/qualify.ts` (663); `FloorPlanDataService` in
  `src/app/core/services/floor-plan-data.service.ts` (664); `app-floor-map` in `src/app/shared/floor-map/` — inputs:
  the plan, a state per table, the selected keys; output: table tapped; every table has a `data-testid` with its
  number (665); `PUT /api/v1/floor-plan/confirm-mode` and its browser call (667); `tableKeys` on a booking and
  `holds` plus the not-assigned bookings in the answer of `GET /day` (668).

Contracts this plan uses (copied from the map, frozen 2026-11-22):

**C-TABLES** — Browser: route guard `moduleGuard(['tables'])` on `/frontdesk/floor-plan`; the floor view, the table
settings card and the waiting list are hidden without the module.

**C-TSERVICE** — `frontDeskProfile.tableService?: { confirmMode: 'auto' | 'manual' (default 'manual'), autoMaxParty,
slotMinutes: 15 | 30 (default 15), turnMinutes, lastSeatingBeforeCloseMinutes, bufferMinutes, holdMinutes: int 5–60
(default 15), autoNoShow, reminderHour, cancellationCutoffHours }`. Nothing fills defaults on read:
`tableServiceOf(profile)` returns the stored value over `TABLE_SERVICE_DEFAULTS`, and the server and the browser read
the settings only through it. `PUT /api/v1/floor-plan/confirm-mode { confirmMode }` (owner) changes only that one
field — the one-button switch of D3, used by the settings card and the service screen.

**C-BOOK2** (the parts used here) — `bookings` gains, all optional and server-written: `tableKeys: string[] (1–4)`,
`areaKey`, `seatedAt`, `finishedAt`, … Statuses stay the five that exist. "Late" is computed (`status === 'confirmed'
&& now > startAt + holdMinutes`), never stored. `GET /day` also returns `holds` and the bookings with no `tableKeys`
(A7).

## Goals & Success Criteria
**Primary:** a member of a business with `tables` opens `/bookings?view=floor` and sees every table of the room in
its right state for the chosen moment, refreshed without a reload; the owner flips the confirm mode with one tap.

- [auto] `pnpm run test:ci` → exit 0, including `src/app/core/utils/table-state.util.spec.ts`: for one fixture room
  and day, `tableStatesAt` returns `not_active` for a table with `active: false`; `seated` for a table held by a
  `seated` booking; `over_time` for the same booking once the moment is past its `endAt`; `late` for a `confirmed`
  booking 16 minutes after its `startAt` with `holdMinutes` 15 when the moment is live, and `reserved_soon` for the
  same booking 14 minutes after; `reserved_soon` for a `confirmed` booking that starts 90 minutes after the moment and
  `free` for one that starts 91 minutes after; `free` for a table whose only booking is `finished`, `cancelled` or
  `no_show`; a join's booking marks every table of its `tableKeys`; a non-live moment never returns `late` or
  `over_time`.
- [auto] `src/app/pages/bookings/components/floor-view/floor-view.component.spec.ts`: with the module off the page
  offers no `floor` tab and `?view=floor` shows the day view; with the module on and a plan of three tables the view
  passes three states to the map; a failed day read shows the error state with a retry button and a retry loads; a
  plan with no table shows the "draw your room" message, with the link for an owner and without it for staff.
- [auto] same spec: the poll timer asks the day again after 45 s (fake timers), does not ask while the document is
  hidden, asks once when the window gets focus, and is cleared when the view is left (no timer alive after destroy).
- [auto] same spec: an owner sees the mode switch as a button and a tap calls the confirm-mode write once with the
  other mode; staff see the mode as text and no button; a failed write puts the old mode back and shows the error
  message.
- [auto] `pnpm run test:server` → exit 0, including `server/test/bookings-day.test.js`: the answer of `GET /day`
  carries `now` as a number within one second of the test's clock.
- [auto] `pnpm run build` → exit 0. `pnpm run lint` → exit 0. `pnpm run lint:icons` → exit 0. `pnpm run lint:reuse`
  → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] `/bookings?view=floor` (stubbed business with `tables`, a plan with tables 11 and 12, one `confirmed` booking
  of "כהן" on table 12 starting 30 minutes after the stubbed `now`) · open the page · the element of table 12 shows
  "כהן" and its state label is "מוזמן בקרוב" — `e2e/ui/671-1.spec.ts`.
- [ui] same stub · tap the strip chip two hours later than the booking's end · the state label of table 12 is "פנוי"
  — `e2e/ui/671-2.spec.ts`.
- [ui] same stub, signed in as the owner, stored mode `manual` · tap the button "אישור ידני" · the button reads
  "אישור אוטומטי" — `e2e/ui/671-3.spec.ts`.
- [human] Dandan opens the floor view of a business with a drawn room on a tablet and on his phone: the room is
  readable, each state is told apart without relying on colour, and the strip moves the room to another hour.
- [human] the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page (here: `/bookings?view=floor` with the day request failing).

## Execution Mode
- Parallel: no — first plan of run `rs-book-ui` (671, 686, 672, 673, in that order). It appends to
  `public/assets/data/dictionary.json` and edits `src/app/pages/bookings/**`, which 686, 672 and 673 also edit, and
  the dictionary is shared with every screen plan of the program (665, 666, 667, 670, 674, 677, 678, 682): one
  screen run at a time.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/bookings/**
src/app/pages/bookings/bookings.page.spec.ts
src/app/pages/bookings/components/floor-view/floor-view.component.spec.ts
src/app/shared/floor-map/**
src/app/core/utils/table-state.util.ts
src/app/core/utils/table-state.util.spec.ts
src/app/core/services/booking-data.service.ts
src/app/core/services/booking-data.service.spec.ts
server/routes/bookings.js
server/test/bookings-day.test.js
public/assets/data/dictionary.json
src/app/pages/breadcrumbs.md
src/app/core/breadcrumbs.md
src/app/shared/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
e2e/ui/671-1.spec.ts
e2e/ui/671-2.spec.ts
e2e/ui/671-3.spec.ts
screens/671-*.png
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — `server/routes/bookings.js` gains one read-only field (`now`) in an answer that is already scoped to the caller's business and gated by `verifyToken` and the module check; `booking-data.service.ts` only reads that field. No write path, permission or scope rule changes; the mode switch calls the owner-only route of 667 and the server decides. The rule "only the engine decides availability" (INV-7, written by plan 662) is not touched: the view only shows states computed from the server's bookings; it assigns, moves and confirms nothing.

## Reuse Check

- `FloorViewComponent` (`app-floor-view`, `src/app/pages/bookings/components/floor-view/`) — family: none — rung: 4 — why: a page-local view of one screen (the room, the strip, the pills); it composes shared pieces and is not a shared component.
- The room drawing — family: none — rung: 4 — why: no new piece: `app-floor-map` of plan 665 is used as it is (its family `floor-map` is registered by 665 and is not on `main` yet, so it cannot be named here); if its state type lacks one of the six states or the two text lines of a table, that family is extended in place, never copied.
- `table-state.util.ts` (`tableStatesAt`, `TableState`, `stripTimes`) — family: helpers — rung: 3 — why: pure functions in `src/app/core/utils/` with a spec; 686, 672 and 673 read the same states.
- The third view tab — family: chip — rung: 1 — why: one more `c-chip c-chip--tab` in the existing tab row.
- Time strip — family: chip — rung: 1 — why: `c-chip c-chip--tab` buttons inside `app-scroll-rail` as it is (guide arrows, no scroll bar).
- Summary pills — family: chip — rung: 1 — why: `c-chip--tag` labels.
- Mode switch — family: chip — rung: 1 — why: one `c-chip c-chip--toggle` button with `aria-pressed`.
- State legend — family: chip — rung: 1 — why: `c-chip--tag c-chip--sm` with an icon and a label per state.
- Empty, loading and failed-load states — family: empty-state — rung: 1 — why: `app-empty-state` (message key, and `retry` on a failed load) and `app-loader`.
- Messages — family: feedback — rung: 1 — why: `UserMsgService` + `LoggingService`.
- `dayBoard(date)` on `BookingDataService` — family: entity-data-service — rung: 2 — why: the existing `day()` call with the wider answer type of 668 plus `now`; no second client for the route.

## Defaults

- loading-and-error-states — applies — how: the shared loading and error pieces (`app-loader`, `app-empty-state` with a retry)
- one-breakpoint-set — applies — how: the shared breakpoint names at the top of src/styles.scss ($break-phone-max, $break-tablet-max), used in every @media; plan 656 makes them the only set
- empty-state-on-list — exception — why: the view draws a room, not a list; a room with no table shows `app-empty-state`
- app-list-container — exception — why: the view is a drawing of the room with pills, not a list page; the page keeps its `app-page-header`
- anchored-popup — exception — why: this plan adds no floating box (the table sheet is plan 686)

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a host, I want to see the room with who sits where, which table is needed soon and who is late, so that I run
  the evening from one screen.
- As a host, I want to look at the room at 21:00 while it is 19:40, so that I can answer "do you have a table later?".
- As the owner, I want to switch between "a free table is confirmed at once" and "I approve every booking" with one
  tap on the service screen, so that a busy evening does not fill up by itself.

## Functional Requirements

### Must Have (P0)
- [ ] **The view.** `BookingsView` gains `'floor'`. The tab is offered only when `ModuleService.has('tables')`; without
  the module `?view=floor` falls back to `day` (the page behaves exactly as today). The default view without a `view`
  parameter is `floor` for a business with `tables` and stays `day` for every other business (Dandan, 2026-11-22);
  one spec case for each. In the floor view the existing date bar (previous, date, next, today) stays and steps one
  day; the week view is unchanged.
- [ ] **Data.** `BookingDataService.dayBoard(date)` reads `GET /api/v1/bookings/day` and returns
  `{ bookings, holds, unassigned, now } | null` (the field names of 668's answer; `now` is added by this plan when 668
  did not send it: `now: Date.now()` in the route's answer). The view also needs the floor plan
  (`FloorPlanDataService`) and the profile (`FrontDeskProfileDataService.profile_`, read through `tableServiceOf`).
- [ ] **The clock.** The live moment is `serverNow + (performance.now() − receivedAt)`; the device's wall clock
  (`Date.now()`, `new Date()`) is never used for a state. It is recomputed every 30 s by a timer and on every load.
- [ ] **Refresh.** While the floor view is open and the document is visible: reload the day every 45 s; reload at
  once when the window gets focus or the document becomes visible; no request while hidden; timers and listeners are
  removed when the view is left. A reload never shows the loader again (the room stays drawn); a failed background
  reload keeps the last room and shows the warning message `fv_refresh_failed` once per failure streak.
- [ ] **The six states** — pure `tableStatesAt(plan, bookings, moment, { live, holdMinutes }) → Record<tableKey,
  { state, name?, time?, bookingId? }>`. Only bookings of kind `table` with `tableKeys` count; `finished`, `cancelled`
  and `no_show` never hold a table. First match wins, per table:
  1. `not_active` — the table has `active: false`.
  2. `over_time` — live only: a `seated` booking on the table and `moment > endAt`.
  3. `seated` — a `seated` booking on the table (live), or, for a non-live moment, a `seated` booking whose
     `[startAt, endAt)` holds the moment.
  4. `late` — live only: a `confirmed` booking on the table and `moment > startAt + holdMinutes`.
  5. `reserved_soon` — a `confirmed` booking on the table with `startAt − 90 min ≤ moment < endAt`.
  6. `free` — otherwise.
  When two bookings match the same rule, the one with the earlier `startAt` gives the name and the time. `name` is
  `guestName` (the dictionary text `fv_walk_in` when it is empty — a walk-in without details, map delta 3); `time` is
  the booking's `time`.
- [ ] **Never colour only.** Each state has an icon and a Hebrew label, shown in the legend under the room and as the
  table's accessible name (`<number> · <label> · <name> <time>`): free `check` "פנוי", reserved soon `clock` "מוזמן
  בקרוב", seated `users` "יושבים", over time `timer` "חריגה בזמן", late guest `alert-triangle` "מאחרים", not active
  `ban` "לא פעיל". The table shows the name and the time on it (the two text lines of the map's state).
- [ ] **The time strip.** `stripTimes(openRanges, 30)` lists the day's opening ranges in 30-minute steps
  (`openRangesOf(profile.hours, date)`; a range that runs past midnight is listed to its end). The strip is one
  `app-scroll-rail` of tab chips: first chip "עכשיו" (only when the date is today; selected by default), then the
  times. Choosing a time shows the room at that moment of the chosen date (`jerusalemEpoch(date, time)`), non-live;
  choosing "עכשיו" returns to the live moment. On a date that is not today the first time of the strip is selected.
  A day with no opening range shows no strip and the room at 12:00 of that date.
- [ ] **Summary pills** above the room, from the day's bookings of kind `table`: "מוזמנים" = the sum of `partySize` of
  bookings that are `confirmed`, `seated` or `finished`; "יושבים" = the sum of `partySize` of `seated` bookings;
  "לא הגיעו" = the number of `no_show` bookings. (The "waiting" pill comes with plan 673.)
- [ ] **The mode switch.** The current mode is always visible in the pills row: for the owner
  (`PermissionService.isOwner_()`) a `c-chip c-chip--toggle` button that reads "אישור אוטומטי" (pressed) or "אישור
  ידני"; for staff the same text as a `c-chip--tag`, not a button. One tap sends the other mode through the
  confirm-mode call of 667 — no confirmation question. The button is disabled while the call runs. Success: the
  profile is reloaded and the message `fv_mode_auto_on` / `fv_mode_manual_on` shows. Failure (any status): the old
  mode stays and `fv_mode_failed` shows.
- [ ] **States of the view.** First load: `app-loader`. Failed first load: `app-empty-state` with `fv_load_failed` and
  a retry that loads again. No plan, or a plan with no table: `app-empty-state` with `fv_no_room`; an owner also gets
  the link "ציור החדר" to `/frontdesk/floor-plan`, staff do not. A tap on a table does nothing in this plan (686 opens
  the sheet); the view only re-emits the map's `tableTapped` output so 686 can listen.
- [ ] **Layout.** Phone (≤ 767): pills row (wraps to two lines), strip, then the room at full width with the map's own
  fit; legend under the room. Tablet (≤ 1023): the same, with the pills on one line. Desktop (≥ 1024): the room takes
  the main column and an empty side column of 320 px is reserved at the inline end (672 fills it with the two lists).

### Should Have (P1)
- [ ] The chosen strip time is kept in the query string (`at=HH:mm`; absent = now), so a reload and the back button
  keep it; an `at` value that is not on the strip is ignored.

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; logical CSS properties only; times are shown left-to-right (`dir="ltr"`); no new `.c-*` class — the
  component uses the engines of `src/styles.scss` and its own scoped SCSS with the shared breakpoint names.
- State is signals: `board_` (the last day answer), `serverClock_`, `at_` (from the query string), `moment_`,
  `states_`, `pills_` as `computed()`; `inject()` for dependencies; `input()` / `output()` on the component
  (`date`, `tableTapped`).
- Nothing is edited on this screen, so there is no unsaved-changes question; leaving the view only stops the timers.
- New keys in `public/assets/data/dictionary.json` (appended; all checked free):
  - `bk_view_floor` "חדר" · `fv_now` "עכשיו" · `fv_walk_in` "מזדמנים"
  - `fv_state_free` "פנוי" · `fv_state_reserved_soon` "מוזמן בקרוב" · `fv_state_seated` "יושבים" ·
    `fv_state_over_time` "חריגה בזמן" · `fv_state_late` "מאחרים" · `fv_state_not_active` "לא פעיל"
  - `fv_pill_booked` "מוזמנים" · `fv_pill_seated` "יושבים" · `fv_pill_no_show` "לא הגיעו"
  - `fv_mode_auto` "אישור אוטומטי" · `fv_mode_manual` "אישור ידני" · `fv_mode_auto_on` "שולחן פנוי יאושר מעכשיו
    אוטומטית" · `fv_mode_manual_on` "מעכשיו כל הזמנה מחכה לאישור שלכם" · `fv_mode_failed` "שינוי מצב האישור נכשל"
  - `fv_load_failed` "טעינת החדר נכשלה" · `fv_refresh_failed` "החדר לא התעדכן. מנסים שוב" · `fv_no_room` "עוד לא
    ציירתם את החדר" · `fv_draw_room` "ציור החדר" · `fv_strip_label` "שעה להצגה" · `fv_legend_label` "מקרא"
- Reused keys (exist): `retry`, `bk_today`, `bk_prev`, `bk_next`.
- Lucide icons: `check`, `clock`, `users`, `timer`, `alert-triangle`, `ban` — all registered; no icon is added.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Let the day read tell the screen the server's time and the tables each booking holds — add the now field to the day answer when 668 did not send it, with its server test; dayBoard on the data service with the wider answer type and its spec — server/routes/bookings.js, server/test/bookings-day.test.js, src/app/core/services/booking-data.service.ts, src/app/core/services/booking-data.service.spec.ts
- [ ] A2: Write the pure rule that turns a day of bookings into one state per table — tableStatesAt with the six states in their order, stripTimes; every spec case of the Done-when — src/app/core/utils/table-state.util.ts, src/app/core/utils/table-state.util.spec.ts
- [ ] A3: Add the floor view to the bookings page for businesses that have table service — the third view value and tab behind the module check, the fallback to day, the date bar kept; the page spec — src/app/pages/bookings/bookings.page.ts, src/app/pages/bookings/bookings.page.html, src/app/pages/bookings/bookings.page.scss, src/app/pages/bookings/bookings.page.spec.ts
- [ ] A4: Draw the room with its live states, legend and summary numbers — the floor view component, the map with a state per table, name and time on a table, accessible names, the pills, loader, failed-load and no-room states; all dictionary keys of this plan; extend the map family only if a state or text line is missing — src/app/pages/bookings/components/floor-view/floor-view.component.ts, .html, .scss, src/app/shared/floor-map/**, public/assets/data/dictionary.json
- [ ] A5: Keep the room fresh without a reload and on the server's clock — the server-based clock, the 45-second reload, focus and visibility reloads, no request while hidden, cleanup on leave; the timer cases of the spec — src/app/pages/bookings/components/floor-view/floor-view.component.ts, src/app/pages/bookings/components/floor-view/floor-view.component.spec.ts
- [ ] A6: Let the host look at the room at another hour — the strip of times in a scroll rail, the now chip, the query-string value, the non-live moment — src/app/pages/bookings/components/floor-view/floor-view.component.ts, .html, .scss
- [ ] A7: Give the owner the one-tap confirm-mode switch and show staff the mode — the toggle chip, the call of plan 667, reload of the profile, the three messages, staff as text; spec cases — src/app/pages/bookings/components/floor-view/floor-view.component.ts, .html, src/app/pages/bookings/components/floor-view/floor-view.component.spec.ts
- [ ] A8: Record the new pieces where the next plan looks for them — the folder maps and the registry rows for the floor view and the table-state helper — src/app/pages/breadcrumbs.md, src/app/core/breadcrumbs.md, src/app/shared/breadcrumbs.md, docs/brain/component-families.md, docs/brain/inventory.md
- [ ] A9: Write the three screen checks that run in the real app — each spec signs in with signInQa, adds the tables module to the business answer and fulfils the floor-plan, profile and day calls itself; screenshots — e2e/ui/671-1.spec.ts, e2e/ui/671-2.spec.ts, e2e/ui/671-3.spec.ts
- [ ] A10: Run every check of this plan and hand Dandan the two hand checks — test:ci, test:server, build, lint, lint:icons, lint:reuse, log-query; evidence into Execution Notes; then the human cards

## Technical Considerations
- Dependencies: `BookingDataService`, `FloorPlanDataService` (664), `FrontDeskProfileDataService`, `ModuleService`,
  `PermissionService`, `app-floor-map` (665), the confirm-mode call (667), `tableServiceOf` (662), `openRangesOf`
  (663), `jerusalemEpoch` (`shared/schemas/front-desk/local-time.ts`).
- New files needed: `src/app/pages/bookings/components/floor-view/floor-view.component.{ts,html,scss,spec.ts}`,
  `src/app/core/utils/table-state.util.ts` (+ spec), `e2e/ui/671-{1,2,3}.spec.ts`.
- Model changes: none in `src/app/core/models`; `DayBoard` is a type beside `DayLoad` in the data service.
- Backend / API: `GET /api/v1/bookings/day` answers one more field, `now` (server epoch in ms). Nothing else.
- Auth and validation: unchanged — a signed-in member of a business with `frontdesk`; the mode write is owner-only on
  the server (667); the browser only hides the button from staff.
- Security surface: none new. Log events carry an event name and a status only — never a guest's name or phone.
- Data / migration: none.
- Project checks: `[auto] log-query` present; `pnpm run test:ci` and `pnpm run test:server`; three `[ui]` specs with
  `signInQa`; every dictionary key named with its Hebrew value; icons named (all registered); Reuse Check lists every
  control; hotspots appended only; folder maps in scope.

Every Atomic Sub-task names its files and is concrete enough for a Worker to run without asking (no "TBD",
"handle errors appropriately", "same as the other screen"). `/plan`'s Architect + PM review checks this.

## Out of Scope
- The table sheet and every action on a booking from the room: seat, finish, move, cancel, no-show (plan 686).
- The new-booking and walk-in dialogs, "arriving next" and "not assigned" (plan 672); the waiting list and its pill
  (plan 673).
- Any change to the day and week views, to the floor plan editor or to the table settings card.
- A websocket or server push; drag and drop of bookings between tables.
- Remembering the last view a member used (the default is fixed: the room with `tables`, `day` without).

## Critical Questions
- none

## Execution Notes
- decision (Dandan, 2026-11-22): `/bookings` opens on the room for a business with `tables`; `?view=day` and
  `?view=week` still open those views.
- behaviour: "reserved soon" means a confirmed booking that starts within 90 minutes (the same window as 672's
  "arriving next").
