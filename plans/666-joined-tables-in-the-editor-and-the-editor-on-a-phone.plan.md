# Plan 666 — Joined tables in the floor plan editor, and the editor on a phone

Status: draft
Depends-on: 665, 684
Snapshot: 28359b6d54b0c77e288c52702a850daef92ccf07

## Problem Statement
Two things are still missing from the floor plan editor after 665 and 684 (map row R4, brief RS-02). First, a party
of seven fits no single table, but tables 7 and 8 can be pushed together: the owner must be able to declare that
join, with its own seat range, because the table engine never invents one (C-ENGINE). Second, an owner who fixes the
room on his phone cannot drag a 14-pixel table with a finger precisely, and the edit panel sits under the map where
he cannot see what he is changing: on a phone the selected table needs arrow buttons that move it one cell, and the
panel must be a sheet at the bottom of the screen with the room still visible above it.

Verified on `origin/main` (28359b6d, 2026-11-22):
- Breakpoints: `$break-phone-max: 767px`, `$break-tablet-max: 1023px` (`src/styles.scss:5,7`). The phone bottom bar's
  height is the CSS variable `--bottom-bar-h` (`src/styles.scss:2831`, set on phone widths only); the layer tokens are
  `--z-header: 100`, `--z-floating: 200`, `--z-modal: 1000` (`src/styles.scss:2706-2708`).
- `app-modal-shell` with `[sheet]="true"` (`docs/brain/component-families.md`, family `modal-shell`) is a modal
  bottom sheet: it covers the page, traps the focus and closes on a tap outside — so it cannot be used for a panel
  that must leave the room visible and tappable.
- `app-counter` (`src/app/shared/counter/counter.component.ts:35-42`), chips `.c-chip--toggle` / `.c-chip--tap`,
  buttons `.c-btn-primary`, `.c-btn-ghost`, `.c-icon-btn` (`src/styles.scss`).
- Icons registered in `src/app/app.config.ts`: `arrow-left`, `arrow-right`, `link`, `x`, `trash-2`. Not registered:
  `arrow-up`, `arrow-down` (this plan adds the two).
- `src/index.html:2` is `dir="rtl"`: the inline start is the right-hand side, so the arrow that points left moves a
  table toward the inline end (`x + 1`).
- Dictionary: the `fp_` keys of 665 and 684 are the only ones with that prefix; every key below is free. Reused from
  684: `fp_field_seats_min`, `fp_field_seats_max`; from the app: `close` "סגור".
- From 665 and 684 (merged first): `app-floor-map` (inputs `plan`, `states`, `selectedKeys`, `draggable`,
  `dimOtherThanArea`, `warnKeys`; outputs `tableTapped`, `tableMoved`), `floor-geometry.util.ts`, `FloorPlanPage`
  with one selected table, the table panel and the room panel
  (`src/app/pages/frontdesk/floor-plan/components/table-panel/`, `room-panel/`), `floor-plan-edit.util.ts`
  (`withTable`, `withoutTable` — which already removes the joins of a removed table — `restoreDropped`), the undo
  messages and the 409 `TABLE_IN_USE` notice.

Contract used, copied from `docs/restaurant/restaurant-map.md` (frozen 2026-11-22):

**C-FLOOR (R2; used by R1's fixtures, R3, R4, R6, R9)**
- Collection `floorPlans`, at most one live document per business (unique index `{ businessId }`):
  `{ ...baseDocShape, grid: { cols: int 10–80, rows: int 10–80 }, areas: [{ key, name (nameField), order: int }]
  (1–10), tables: [{ key, number: string 1–6, areaKey, shape: 'round' | 'square' | 'rect', minSeats: int ≥ 1,
  maxSeats: int ≥ minSeats ≤ 30, x: int, y: int, w: int 1–8, h: int 1–8, turned: boolean, active: boolean,
  online: boolean }] (0–200), joins: [{ key, tableKeys: string[] 2–4, minSeats, maxSeats, online: boolean }] (0–60) }`.
  `key` is made by the browser once (`^[a-z0-9]{6,12}$`) and never changes; `number` is what people see.
- `PUT /api/v1/floor-plan` (owner, `editFrontDesk`) replaces the whole plan; `GET /api/v1/floor-plan` (any member).
  The server refuses: a repeated `key` or `number`, an `areaKey` or a join's table that does not exist, a table
  outside the grid, a join whose tables are in different areas, and — 409 `TABLE_IN_USE` with the bookings — a plan
  that drops a table or a join that a booking with `endAt > now` and status `confirmed | seated` holds (A5).
  Overlapping tables are allowed.
- A new plan is not created by a migration: the first `GET` of a business without one answers
  `{ plan: null }` and the editor starts from one area per entry of `requestKinds.table.rules.areas` (or the three
  defaults inside / outside / bar) and no tables.

## Goals & Success Criteria
**Primary:** an owner selects two to four tables of one area and joins them, sets the join's seats and whether guests
may book it, and removes a join; on a phone he adds a table, moves it cell by cell with arrows, edits it in a sheet
at the bottom of the screen with the room in view, and saves.

- [auto] `pnpm run test:ci` passes, including the new
  `src/app/pages/frontdesk/floor-plan/floor-plan-joins.util.spec.ts`,
  `src/app/pages/frontdesk/floor-plan/components/joins-list/joins-list.component.spec.ts` and the new cases in
  `src/app/shared/floor-map/floor-geometry.util.spec.ts`,
  `src/app/pages/frontdesk/floor-plan/components/table-panel/table-panel.component.spec.ts` and
  `src/app/pages/frontdesk/floor-plan/floor-plan.page.spec.ts`.
- [auto] `src/app/pages/frontdesk/floor-plan/floor-plan-joins.util.spec.ts`: `joinProblem` returns
  `fp_join_err_count` for one table and for five, `fp_join_err_area` for two tables of different areas,
  `fp_join_err_exists` for a set that is already a join (in any order) and null for two free tables of one area;
  `newJoin` of tables seating 2–4 and 2–4 gives seats 5–8, of three tables with largest parties 4, 6 and 8 gives
  9–18, never more than 30, and is `online` only when every table is; `joinLabel` lists the numbers in the order
  "7 + 8".
- [auto] `src/app/shared/floor-map/floor-geometry.util.spec.ts` (new cases): `stepCell` with the arrow that points
  left moves `x` by +1 in RTL and −1 in LTR, up moves `y` by −1, and a step that would leave the room returns the
  same cell; `canStep` is false at the edge.
- [auto] `src/app/pages/frontdesk/floor-plan/floor-plan.page.spec.ts` (new cases): in multi-select mode a tap adds a
  table to the selection and a second tap removes it, and no table panel opens; "חיבור השולחנות" adds one join and
  leaves multi-select mode; removing a join and pressing undo brings it back; pressing the arrow that points down
  moves the selected table one cell and makes `hasRealChanges()` true.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/frontdesk/floor-plan` with a saved plan of tables 7 and 8 in one area, press "בחירת כמה שולחנות", press
  both tables and press "חיבור השולחנות" → the room panel shows a row with the text "7 + 8"
  (`e2e/ui/666-1.spec.ts`).
- [ui] With that join in the plan, press its "ביטול החיבור" button → the message "החיבור בוטל" appears
  (`e2e/ui/666-2.spec.ts`).
- [ui] At 375 px wide, on `/frontdesk/floor-plan` with a saved plan of one table at x 0, y 0, press the table and
  then the button "הזזה למטה" → the table's `data-y` is `1` (`e2e/ui/666-3.spec.ts`).
- [ui] At 375 px wide, press "ל-2", press the button "הזזה שמאלה" and press "שמור" → the message "המפה נשמרה"
  appears (`e2e/ui/666-4.spec.ts`).
- [human] Dandan edits the room on his phone: he selects a table, the sheet comes up from the bottom and the table
  stays in view above it, the arrows move it where he means, and closing the sheet gives the room back.
- [human] the list's page with no items · open the page · a message says the list is empty
  (`/frontdesk/floor-plan`, room panel, a plan with no join: "אין חיבורים. בחרו כמה שולחנות וחברו אותם"; default
  `empty-state-on-list`).
- [human] Dandan joins two tables on a laptop, sets the join to 5–8 seats, saves, reloads and finds the join.

## Execution Mode
- Parallel: no — third plan of run `rs-floor-ui` (665, 684, 666, 667), after 684. It appends to
  `public/assets/data/dictionary.json` and `src/app/app.config.ts` and edits the editor page; one screen run at a
  time.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/frontdesk/floor-plan/**
src/app/pages/frontdesk/floor-plan/floor-plan.page.spec.ts
src/app/pages/frontdesk/floor-plan/floor-plan-joins.util.spec.ts
src/app/pages/frontdesk/floor-plan/components/joins-list/joins-list.component.spec.ts
src/app/pages/frontdesk/floor-plan/components/table-panel/table-panel.component.spec.ts
src/app/shared/floor-map/**
src/app/shared/floor-map/floor-geometry.util.spec.ts
src/app/app.config.ts
public/assets/data/dictionary.json
src/app/pages/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
e2e/ui/666-1.spec.ts
e2e/ui/666-2.spec.ts
e2e/ui/666-3.spec.ts
e2e/ui/666-4.spec.ts
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

- INV-none: preserves — joins and cell moves change the editor's draft in memory only; the plan is still saved whole in one `PUT /api/v1/floor-plan` through 664's service, where the server authorises and validates it (a join's tables exist and share an area, a join in use cannot be dropped); no data service, registry, permission file or schema is edited.

## Reuse Check

- `floor-plan-joins.util.ts` (`joinProblem`, `newJoin`, `joinLabel`, `withJoin`, `withoutJoin`) — family: none — rung: 4 — why: pure draft rules for joins of this one screen, kept beside the page with a spec, next to 684's edit rules.
- `stepCell`, `canStep` added to `src/app/shared/floor-map/floor-geometry.util.ts` — family: none — rung: 4 — why: one more pair of pure cell functions of the `floor-map` family 665 registers (not on `main` yet, so it cannot be named as a family here); the service screen's "move to another table" does not need them, the registry entry is updated in this branch.
- `JoinsListComponent` (`app-floor-joins-list`, `src/app/pages/frontdesk/floor-plan/components/joins-list/`) — family: form-field — rung: 1 — why: a page-local group of rows inside the room panel; counters and a switch per row, no look of its own.
- Join seat counters — family: stepper — rung: 1 — why: `app-counter` as it is.
- "בחירת כמה שולחנות" switch and a join's online switch — family: chip — rung: 1 — why: `c-chip c-chip--toggle`.
- "חיבור השולחנות" button, the remove-join button, the four arrow buttons, the sheet's close button and the "אזורים וחיבורים" button — family: engine-classes — rung: 1 — why: `.c-btn-primary`, `.c-btn-ghost` and `.c-icon-btn` from `src/styles.scss`, each with an `aria-label`.
- Removed-join message with undo — family: feedback — rung: 1 — why: `UserMsgService.onSetSuccessMsgWithUndo`.
- The bottom sheet under 768 px (`.floor-plan__panel.is-sheet`, `.floor-plan__sheet-head`) — family: none — rung: 4 — why: a non-modal panel fixed to the bottom of the screen; the room above it must stay visible and tappable while a table is moved, and `app-modal-shell [sheet]` covers the page and traps the focus. It is this page's own panel restyled at phone width, not a new shared piece.
- Other scoped classes (`.floor-plan__multi`, `.floor-plan__join-bar`, `.table-panel__arrows`, `.joins-list`, `.joins-list__row`) — family: none — rung: 4 — why: layout of this one screen in the components' own stylesheets; no `.c-*` engine is defined or restyled.

## Defaults

- one-breakpoint-set — applies — how: the sheet's `@media` uses `$break-phone-max` from `src/styles.scss`; no other width is introduced
- empty-state-on-list — applies — how: the joins list shows one line of text (`fp_joins_empty`) when the plan has no join; it is a section of a panel, so the line is plain text in the list's place, not a page-size `app-empty-state`
- app-list-container — exception — why: the joins are a short section inside the room panel of an editor, not a list page
- loading-and-error-states — exception — why: this plan adds no data read; the screen's loading and error states are plan 665's

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a restaurant owner, I want to say which tables can be pushed together and how many people the pair seats, so that a party of seven gets a table instead of a "full" answer.
- As a restaurant owner, I want to decide whether guests may book a joined table by themselves, so that big parties still go through me when I prefer.
- As a restaurant owner, I want to fix the room from my phone, moving a table one step at a time, so that I do not need a laptop to move table 7.

## Functional Requirements

### Must Have (P0)

**Joins**
- [ ] A switch chip `fp_multi_select` "בחירת כמה שולחנות" sits in the row of the preset buttons (owner only). While it
  is on: a tap on a table adds it to the selection and a second tap removes it; no table panel opens (the room
  panel stays); tables cannot be dragged; the preset buttons are disabled. Turning it off, or Escape, clears the
  selection.
- [ ] While it is on, a bar under that row shows the button "חיבור השולחנות" (`fp_join_action`) and, when the
  selection cannot be joined, one line with the reason: fewer than 2 or more than 4 tables → `fp_join_err_count`;
  tables of different areas → `fp_join_err_area`; the same set is already a join → `fp_join_err_exists`; 60 joins
  exist → `fp_join_err_limit`. The button is disabled while there is a reason. With nothing selected the line is
  `fp_join_pick` "בחרו 2 עד 4 שולחנות מאותו אזור".
- [ ] Pressing the button adds a join with a `newKey()`, the selected keys in the order of their numbers,
  `minSeats` = the largest single table's largest party + 1 (at most the sum), `maxSeats` = the sum of the tables'
  largest parties (at most 30), `online` true only when every table is online; then it turns multi-select off and
  clears the selection.
- [ ] The room panel gains a section `fp_joins_title` "חיבורי שולחנות" under the areas: one row per join with its
  label ("7 + 8"), two counters (smallest party 1 – largest; largest party smallest – 30), a switch
  `fp_join_online` "אורחים יכולים להזמין את החיבור באתר", and a remove button (`fp_join_remove` "ביטול החיבור").
  Pressing a row's label selects the join's tables on the map (they look selected; no table panel opens) and
  pressing it again clears that. With no join the section shows the text `fp_joins_empty`.
- [ ] Remove takes the join out of the draft and shows `fp_join_removed` "החיבור בוטל" with an undo. No confirmation
  dialog. A save the server refuses with 409 `TABLE_IN_USE` because a dropped join still has bookings shows 684's
  notice with one more line, `fp_in_use_join` "חיבור {numbers} — {count} הזמנות", and 684's restore button also
  puts back the dropped joins.
- [ ] Every change of a join is a change of the draft: "שמור" saves it and the leave question of 665 covers it.

**Arrow buttons**
- [ ] The table panel gains a row `fp_move_label` "הזזת השולחן" with four `.c-icon-btn` buttons — `arrow-up`
  "הזזה למעלה", `arrow-down` "הזזה למטה", `arrow-right` "הזזה ימינה", `arrow-left` "הזזה שמאלה" — each moving the
  selected table one cell in the direction the arrow points on the screen (`stepCell`: in RTL the left arrow is
  `x + 1`). A button is disabled when the step would leave the room (`canStep`). Holding a button does not repeat.
- [ ] The row is shown at every width: it is also the only way to move a table with the keyboard.

**The panel as a bottom sheet under 768 px**
- [ ] Under 768 px the page's panel is fixed to the bottom of the screen, full width, above the phone bottom bar
  (`inset-block-end: var(--bottom-bar-h, 0px)`), on the layer `--z-floating`, at most 45% of the screen's height
  with its own scroll, with rounded top corners. It is not a dialog: no backdrop, no focus trap, the room above it
  stays tappable and draggable.
- [ ] The sheet is open while a table is selected (the table panel, arrows first) and closed otherwise. Its head
  has the panel title and an X button (`close`) that clears the selection. While it is open the page's content
  gets bottom padding of the sheet's height, and the selected table is scrolled into view
  (`scrollIntoView({ block: 'nearest' })`) so the sheet never covers it.
- [ ] Under 768 px the room panel (areas, room size, joins) is not shown under the map any more: a button
  `fp_room_open` "אזורים וחיבורים" under the map opens it in the same sheet, and the X closes it. Selecting a table
  while it is open swaps the sheet to the table panel.
- [ ] From 768 px up nothing changes: the panel stays the side column of 684.

### Should Have (P1)
- [ ] When the sheet opens, the focus moves to its first arrow button, and when it closes the focus returns to the
  table that was selected.

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL, logical CSS only. The join bar and the multi-select switch wrap to a second line on a phone.
- A join is not drawn on the map (no line between tables): the owner sees it by pressing its row, which marks its
  tables as selected.
- No confirmation dialog, no hover text and no new dialog are added.
- New keys in `public/assets/data/dictionary.json` (append): `fp_multi_select` "בחירת כמה שולחנות", `fp_join_action`
  "חיבור השולחנות", `fp_join_pick` "בחרו 2 עד 4 שולחנות מאותו אזור", `fp_join_err_count` "אפשר לחבר 2 עד 4 שולחנות",
  `fp_join_err_area` "אפשר לחבר רק שולחנות מאותו אזור", `fp_join_err_exists` "החיבור הזה כבר קיים",
  `fp_join_err_limit` "הגעתם למספר החיבורים הגבוה ביותר", `fp_joins_title` "חיבורי שולחנות", `fp_joins_empty`
  "אין חיבורים. בחרו כמה שולחנות וחברו אותם", `fp_join_online` "אורחים יכולים להזמין את החיבור באתר",
  `fp_join_remove` "ביטול החיבור", `fp_join_removed` "החיבור בוטל", `fp_in_use_join` "חיבור {numbers} — {count} הזמנות",
  `fp_move_label` "הזזת השולחן", `fp_move_up` "הזזה למעלה", `fp_move_down` "הזזה למטה", `fp_move_right`
  "הזזה ימינה", `fp_move_left` "הזזה שמאלה", `fp_room_open` "אזורים וחיבורים".
- New Lucide icons registered in `src/app/app.config.ts`: `arrow-up`, `arrow-down`. Used and already registered:
  `arrow-left`, `arrow-right`, `link`, `x`, `trash-2`.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Write the rules of a join as pure tested functions — joinProblem with its four reasons, newJoin with the seat defaults, joinLabel, withJoin, withoutJoin — src/app/pages/frontdesk/floor-plan/floor-plan-joins.util.ts, src/app/pages/frontdesk/floor-plan/floor-plan-joins.util.spec.ts
- [ ] A2: Let the owner pick several tables and join them — the multi-select switch, tap rules while it is on, the join bar with its reason line, the join added and the mode left — src/app/pages/frontdesk/floor-plan/floor-plan.page.ts, .html, .scss, .spec.ts
- [ ] A3: List the joins in the room panel with their seats, online switch and remove — the joins list component, row press that marks the tables, counters, the empty line, remove with undo — src/app/pages/frontdesk/floor-plan/components/joins-list/joins-list.component.ts, .html, .scss, .spec.ts, src/app/pages/frontdesk/floor-plan/components/room-panel/room-panel.component.html
- [ ] A4: Name a refused join in the table-in-use notice and bring it back with the restore button — the extra line and the joins in the restore — src/app/pages/frontdesk/floor-plan/floor-plan.page.ts, .html, src/app/pages/frontdesk/floor-plan/floor-plan-edit.util.ts, .spec.ts
- [ ] A5: Move a table one cell with arrow buttons in the direction the arrow points — stepCell and canStep with RTL and LTR cases, the arrows row in the table panel, the two new icons — src/app/shared/floor-map/floor-geometry.util.ts, .spec.ts, src/app/pages/frontdesk/floor-plan/components/table-panel/table-panel.component.ts, .html, .scss, .spec.ts, src/app/app.config.ts
- [ ] A6: Turn the panel into a bottom sheet on phones with the room still in view — fixed non-modal sheet above the bottom bar, head with close, page padding, the selected table scrolled into view, the button that opens the room panel — src/app/pages/frontdesk/floor-plan/floor-plan.page.ts, .html, .scss, .spec.ts
- [ ] A7: Add the Hebrew texts of joins, arrows and the sheet — the nineteen fp_ keys of the UI notes — public/assets/data/dictionary.json
- [ ] A8: Record the new pieces so later plans find them — the joins-list folder in the pages map, the two new helpers in the floor-map entry, the inventory row — src/app/pages/breadcrumbs.md, docs/brain/component-families.md, docs/brain/inventory.md
- [ ] A9: Prove the four screen checks with short scripts — each spec signs in, answers the business read with tables on and the floor-plan calls itself, the two phone specs set a 375 px viewport, each saves a screenshot — e2e/ui/666-1.spec.ts, e2e/ui/666-2.spec.ts, e2e/ui/666-3.spec.ts, e2e/ui/666-4.spec.ts

## Technical Considerations
- Dependencies: `FloorPlanPage`, the table and room panels, `floor-plan-edit.util.ts` (684); `app-floor-map` and
  `floor-geometry.util.ts` (665); `Directionality` from `@angular/cdk/bidi` (as the map uses it); `app-counter`,
  `UserMsgService`.
- New files needed: `src/app/pages/frontdesk/floor-plan/floor-plan-joins.util.{ts,spec.ts}`,
  `src/app/pages/frontdesk/floor-plan/components/joins-list/joins-list.component.{ts,html,scss,spec.ts}`,
  `e2e/ui/666-1…4.spec.ts`.
- Model changes: none.
- Backend / API: none — the same `PUT /api/v1/floor-plan`.
- Auth and validation: the server validates joins (C-FLOOR). The browser's rules (2–4 tables, one area, no repeated
  set, seats order) keep the draft a plan the server accepts.
- Security surface: none new.
- Data / migration: none.
- Project checks: the `log-query` Done-when item; Hebrew RTL and logical CSS; every new key named above; the two new
  icons registered; `src/styles.scss` is not edited (the sheet's rules live in the page's stylesheet and use the
  existing variables); the pages folder map is in scope; `[ui]` specs sign in with `signInQa` and answer the module
  and floor-plan calls themselves (`e2e/ui/634-1.spec.ts` is the shape). Components follow
  `.claude/skills/angularComponentStructure/SKILL.md`; stylesheets `.claude/skills/cssLayer/SKILL.md`.
- Traps: the sheet must not sit under the phone bottom bar or over the toast; measure the sheet's height for the
  page padding after it renders (a `ResizeObserver`, cleaned up on destroy), never a fixed number; the arrows are
  physical directions, the stored `x` is logical — test both reading directions.

## Out of Scope
- Drawing a join on the map (lines, a shared outline). A join made by the engine on its own (never: C-ENGINE).
- Guests or the engine using joins — plans 663, 668, 669. Joins on the service screen — plan 671.
- Pinch-zoom or panning of the room on a phone; holding an arrow to repeat; a different layout from 768 px up.
- Any server, schema or registry change.

## Critical Questions
- none

## Execution Notes
- behaviour: several tables are picked through a switch ("בחירת כמה שולחנות") instead of a modifier key or a long press, so it works the same with a mouse and a finger.
- behaviour: a new join seats from one more than its largest single table up to the sum of its tables; the owner changes both numbers in the list.
- behaviour: the arrow buttons are shown at every width, not only on a phone, because they are the only keyboard way to move a table.
- behaviour: on a phone the room panel opens from a button under the map instead of sitting under it.
