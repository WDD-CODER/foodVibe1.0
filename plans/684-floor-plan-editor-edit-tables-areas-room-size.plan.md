# Plan 684 — Floor plan editor: edit a table, duplicate and remove it, manage areas and the room size

Status: draft
Depends-on: 665
Snapshot: 28359b6d54b0c77e288c52702a850daef92ccf07

## Problem Statement
After 665 an owner can add preset tables, drag them and save, but every table keeps the number and the seats it was
born with, nothing can be removed, and the three starting areas cannot be changed. This plan is the second half of
map row R3 (brief RS-02, D2): a panel beside the room where the owner changes the selected table — its number as the
staff call it, shape, seats, turn, area, whether it takes bookings and whether guests may book it themselves —
duplicates or removes it, and, when no table is selected, manages the areas and the size of the room. It also shows
what the server refuses: a table that still has bookings cannot be removed (default A5).

Verified on `origin/main` (28359b6d, 2026-11-22):
- Field pieces that exist: `app-form-field` (`src/app/shared/form-field/form-field.component.ts`: `label` required,
  `forId`, `error`, `hint`, `layout`; the control is projected) on the `.c-input` engine; `app-counter`
  (`src/app/shared/counter/counter.component.ts:35-42`: `value` required, `min`, `max`, `disabled`, output
  `valueChange`); `app-custom-select` (`src/app/shared/custom-select/custom-select.component.ts:51-72`: `options`
  `{ value, label }[]`, `translateLabels`, `triggerId`, output `valueChange`); chips `.c-chip--toggle`
  (label > input + span) and `.c-chip--tab` in `src/styles.scss`; icon buttons `.c-icon-btn` (`src/styles.scss:944`).
- `UserMsgService.onSetSuccessMsgWithUndo(txt, undo)` (`src/app/core/services/user-msg.service.ts:97`) shows a
  message with an undo action; `onSetErrorMsg` shows an error.
- `/frontdesk/settings` is the pattern of a signal draft edited in place with no per-field save
  (`src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.ts`).
- Icons registered in `src/app/app.config.ts` and used here: `copy`, `trash-2`, `plus`, `x`, `chevron-up`,
  `chevron-down`, `rotate-ccw`, `alert-triangle`. No new icon is needed, so this plan does not write `app.config.ts`.
- Dictionary: the `fp_` keys of 665 are the only ones with that prefix; every key below is free. Reused: `close`
  "סגור".
- From 665 (merged first): `app-floor-map` (`src/app/shared/floor-map/`: inputs `plan`, `states`, `selectedKeys`,
  `draggable`, `dimOtherThanArea`; outputs `tableTapped`, `tableMoved`), the pure helpers of
  `src/app/shared/floor-map/floor-geometry.util.ts` (`footprintFor`, `firstFreeCell`, `nextTableNumber`, `newKey`),
  and `FloorPlanPage` (`src/app/pages/frontdesk/floor-plan/`) with its signal draft, selection, save, the leave
  question, the area row and the read-only view for staff. From 664: the save answers 409 with
  `{ error: 'TABLE_IN_USE', bookings: [...] }`, each booking carrying its `tableKeys`; where 664's merged answer names
  the fields differently, use 664's names.

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
**Primary:** an owner selects a table and changes everything about it in a panel, duplicates or removes it, renames,
adds, orders and removes areas, resizes the room, and can never save a plan the server will refuse for a reason the
screen could have shown.

- [auto] `pnpm run test:ci` passes, including the new
  `src/app/pages/frontdesk/floor-plan/floor-plan-edit.util.spec.ts`,
  `src/app/pages/frontdesk/floor-plan/components/table-panel/table-panel.component.spec.ts`,
  `src/app/pages/frontdesk/floor-plan/components/room-panel/room-panel.component.spec.ts` and the new cases in
  `src/app/pages/frontdesk/floor-plan/floor-plan.page.spec.ts` and
  `src/app/shared/floor-map/floor-map.component.spec.ts`.
- [auto] `src/app/pages/frontdesk/floor-plan/floor-plan-edit.util.spec.ts`: `withTable` changing `maxSeats` from 4 to
  8 on a square table changes its footprint to 4×4 and pulls it back inside the grid when it would stick out;
  `maxSeats` below `minSeats` lowers `minSeats` to it; `numberError` returns `fp_err_number_required` for an empty
  text, `fp_err_number_taken` for a number another table has, and null for the table's own number; `duplicateTable`
  returns a table with a new key, the next number and a free cell; `withoutTable` removes the table and every join
  that lists it; `withTable` changing the area of a table that is in a join removes that join; `overlapping` returns
  the keys of two tables whose footprints share a cell and nothing for tables that only touch; `minGrid` returns the
  smallest `cols` / `rows` that still hold every table; `withArea` refuses to remove an area that has tables and the
  last area.
- [auto] `src/app/pages/frontdesk/floor-plan/components/table-panel/table-panel.component.spec.ts`: typing a number
  that another table has shows "המספר כבר בשימוש" and emits no change; typing a free number emits it; the max counter
  never goes under the min counter's value or above 30; pressing "שכפול" and "הסרת השולחן" emit their events.
- [auto] `src/app/pages/frontdesk/floor-plan/floor-plan.page.spec.ts` (new cases): removing a table and pressing the
  message's undo brings back the table and its joins; a save answered 409 `TABLE_IN_USE` keeps the draft, shows the
  notice with the numbers of the dropped tables, and "החזרת השולחנות למפה" puts them back with their saved values;
  Escape clears the selection; staff get no panel.
- [auto] `src/app/shared/floor-map/floor-map.component.spec.ts` (new case): a key in `warnKeys` gets the class
  `is-overlap` and a visible warning mark.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/frontdesk/floor-plan` with a saved plan of one table, press `[data-testid="floor-table-1"]` and type
  "12" in the field "מספר שולחן" → `[data-testid="floor-table-12"]` is visible (`e2e/ui/684-1.spec.ts`).
- [ui] With table 1 selected, press "שכפול" → `[data-testid="floor-table-2"]` is visible (`e2e/ui/684-2.spec.ts`).
- [ui] With table 1 selected, press "הסרת השולחן" → the message "השולחן הוסר" appears and `floor-table-1` is gone
  (`e2e/ui/684-3.spec.ts`).
- [ui] With no table selected, press "הוספת אזור" and type "גינה" in the new row → the area row above the map shows
  a chip "גינה" (`e2e/ui/684-4.spec.ts`).
- [ui] Remove table 1 and press "שמור" while the spec answers the save with 409 `TABLE_IN_USE` → the text
  "אי אפשר להסיר שולחנות שיש להם הזמנות" appears (`e2e/ui/684-5.spec.ts`).
- [human] a dialog with an explained control · hover the control · its explanation shows as a tooltip and no explanation text sits on the modal
  (`/frontdesk/floor-plan`, room panel: hover the remove button of an area that has tables → "יש שולחנות באזור הזה";
  default `hints-in-tooltips`).
- [human] Dandan draws a real 15-table room on a laptop in under ten minutes: numbers as his staff say them, the
  right seats per table, three areas, two tables turned.

## Execution Mode
- Parallel: no — second plan of run `rs-floor-ui` (665, 684, 666, 667), after 665. It appends to
  `public/assets/data/dictionary.json` and edits the editor page 665 created; one screen run at a time.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/frontdesk/floor-plan/**
src/app/pages/frontdesk/floor-plan/floor-plan.page.spec.ts
src/app/pages/frontdesk/floor-plan/floor-plan-edit.util.spec.ts
src/app/pages/frontdesk/floor-plan/components/table-panel/table-panel.component.spec.ts
src/app/pages/frontdesk/floor-plan/components/room-panel/room-panel.component.spec.ts
src/app/shared/floor-map/**
src/app/shared/floor-map/floor-map.component.spec.ts
public/assets/data/dictionary.json
src/app/pages/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
e2e/ui/684-1.spec.ts
e2e/ui/684-2.spec.ts
e2e/ui/684-3.spec.ts
e2e/ui/684-4.spec.ts
e2e/ui/684-5.spec.ts
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

- INV-none: preserves — page-local panels and pure helpers that change the editor's draft in memory; the plan is still saved whole in one `PUT /api/v1/floor-plan` through 664's service, where the server authorises and validates it and refuses a table in use; removing a table also removes its joins in the same draft, so the browser never leaves a reference for the server to clean (INV-3 is not touched: no cross-document write happens in the browser).

## Reuse Check

- `TablePanelComponent` (`app-floor-table-panel`, `src/app/pages/frontdesk/floor-plan/components/table-panel/`) — family: form-field — rung: 1 — why: a page-local group of `app-form-field` rows; it owns no field look of its own.
- `RoomPanelComponent` (`app-floor-room-panel`, `src/app/pages/frontdesk/floor-plan/components/room-panel/`) — family: form-field — rung: 1 — why: the same, for the areas and the room size.
- `floor-plan-edit.util.ts` (`withTable`, `numberError`, `duplicateTable`, `withoutTable`, `overlapping`, `minGrid`, `withArea`, `restoreDropped`) — family: none — rung: 4 — why: pure draft rules of this one screen, kept beside the page with a spec; they build on the `floor-map` family's geometry helpers and are not needed by another screen.
- Number field and area name fields — family: form-field — rung: 1 — why: `app-form-field` with a `.c-input` text input and its `error` key.
- Seat counters and the two room-size counters — family: stepper — rung: 1 — why: `app-counter` as it is (`min`, `max`).
- Area picker of a table — family: search-combobox — rung: 1 — why: `app-custom-select` with `translateLabels` false (area names are the owner's text); no add-new option — areas are added in the room panel.
- Shape choice (three), and the switches turned / active / online — family: chip — rung: 1 — why: `c-chip c-chip--toggle` radios and checkboxes in a `c-chip-group`.
- Duplicate, remove, close, area up / down / remove buttons — family: engine-classes — rung: 1 — why: `.c-btn-ghost` and `.c-icon-btn` from `src/styles.scss`, each with an `aria-label`.
- Removed-table message with undo, and error messages — family: feedback — rung: 1 — why: `UserMsgService.onSetSuccessMsgWithUndo` / `onSetErrorMsg`.
- Overlap mark on the map (`warnKeys` input, `.is-overlap`, `.floor-map__warn`) — family: none — rung: 4 — why: one more input of the `floor-map` family 665 registers (not on `main` yet, so it cannot be named as a family here); its registry entry is updated in this branch.
- Scoped classes of the page and panels (`.floor-plan__body`, `.floor-plan__panel`, `.floor-plan__notice`, `.floor-plan__overlap`, `.table-panel`, `.table-panel__row`, `.table-panel__actions`, `.room-panel`, `.room-panel__area`, `.room-panel__size`) — family: none — rung: 4 — why: layout of this one screen in the components' own stylesheets; no `.c-*` engine is defined or restyled.

## Defaults

- one-breakpoint-set — applies — how: every `@media` of the new stylesheets uses `$break-phone-max` / `$break-tablet-max` from `src/styles.scss`
- hints-in-tooltips — applies — how: a disabled area-remove button says why through `[attr.title]` plus `aria-describedby`, as the history button of `platform-business-dialog` does; no reason text sits beside the button
- app-list-container — exception — why: the areas are at most ten rows inside a side panel of an editor, not a list page
- empty-state-on-list — exception — why: the areas list is never empty (the last area cannot be removed)
- loading-and-error-states — exception — why: this plan adds no data read; the screen's loading and error states are plan 665's

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a restaurant owner, I want to give each table the number my staff call it and the seats it really has, so that bookings land on the right table.
- As a restaurant owner, I want to turn off a table without removing it, so that a broken table takes no bookings and its history stays.
- As a restaurant owner, I want to name my areas my way and add a terrace next month, so that the screen matches my place.
- As a restaurant owner, I want to be told which tables still have bookings when I try to remove them, so that no guest is left without a table.

## Functional Requirements

### Must Have (P0)

**Layout**
- [ ] From 768 px up the page body is two columns: the map and, at the inline end, one panel 20rem wide. Under
  768 px the panel sits under the map, full width (plan 666 turns it into a bottom sheet). The panel shows the
  **table panel** while a table is selected and the **room panel** otherwise. Staff (no `editFrontDesk`) get no
  panel at all.
- [ ] Every change in a panel is applied to the page's draft at once; there is no panel-level save or cancel. The
  page's "שמור" saves everything; leaving with unsaved changes asks the question of 665. The table panel's X button
  (`close`), Escape, a tap on the selected table or on an empty part of the room only clear the selection — nothing
  is discarded.

**Table panel** (title `fp_panel_title` "שולחן {number}")
- [ ] Number: a text field, 1–6 characters, trimmed. An empty value shows `fp_err_number_required`; a number another
  table has shows `fp_err_number_taken`. While the field shows an error the draft keeps the last valid number, so
  the draft can always be saved. A valid value is applied on every keystroke (the table on the map changes with it).
- [ ] Shape: three radio chips — "עגול", "מרובע", "מלבני".
- [ ] Seats: two counters, smallest party (1 – largest) and largest party (smallest – 30). Lowering the largest under
  the smallest lowers the smallest with it.
- [ ] The table's size on the map is never typed: after a change of shape or largest party, `w` / `h` are
  `footprintFor(shape, maxSeats)` and, when the new size would stick out of the room, `x` / `y` move back inside.
- [ ] Turned: one switch chip "מסובב" (0° / 90°, D9); it swaps the drawn width and depth, with the same pull-back.
- [ ] Area: `app-custom-select` of the areas by name, in `order`. Moving a table that is part of a join to another
  area removes that join (the server refuses a join across areas) and shows `fp_join_dropped` with an undo.
- [ ] Active: switch "פעיל (מקבל הזמנות)". Online: switch "אורחים יכולים להזמין אותו באתר"; it is disabled and off
  while the table is not active.
- [ ] Duplicate: adds a copy with a new key, the next number, the same shape, seats, area, turn and switches, at the
  first free cell, and selects the copy. Disabled at 200 tables.
- [ ] Remove: removes the table and every join that lists it from the draft, clears the selection, and shows
  `fp_table_removed` "השולחן הוסר" with an undo that puts back the table and those joins. No confirmation dialog.

**Room panel** (title `fp_room_title` "המקום")
- [ ] Areas, in `order`: each row has a name field (required, at most the shared name length, unique in the plan —
  otherwise `fp_err_area_name`, and the draft keeps the last valid name), an up and a down button (disabled at the
  ends) that swap `order`, and a remove button. Remove is disabled while tables are in the area (reason
  `fp_area_has_tables`) and for the last area (reason `fp_area_last`). "הוספת אזור" adds a row with an empty name
  and focus in it — the new area joins the draft, and the area row above the map, once its name is valid; disabled
  at 10 areas.
- [ ] Room size: two counters, `fp_room_cols` (10–80) and `fp_room_rows` (10–80); the smallest value each allows is
  the larger of 10 and the edge of the furthest table (`minGrid`), so no table can fall outside the room.

**Refusals and warnings**
- [ ] Overlap: tables whose drawn cells share a cell are passed to the map as `warnKeys`; each gets a small
  `alert-triangle` mark and one line above the map says `fp_overlap_warning` "שולחנות חופפים: {numbers}". It is a
  warning only: saving stays possible.
- [ ] A save answered 409 `TABLE_IN_USE`: the draft stays; a notice block above the map (role `alert`) shows
  `fp_in_use_title`, one line per dropped table that has bookings (`fp_in_use_row` "שולחן {number} — {count} הזמנות",
  numbers from the last saved plan, counts from the answer's bookings), the line `fp_in_use_tip`, and the button
  "החזרת השולחנות למפה", which puts those tables (and the joins that listed them) back into the draft with their
  saved values and closes the notice. The notice also closes on the next successful save. No guest name is shown.
- [ ] Any other failed save behaves as in 665 (`fp_save_failed`).

### Should Have (P1)
- [ ] After "שכפול" the copy's number field has the focus, so the owner can type the real number at once.

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL, logical CSS only. The panel is a plain column of `app-form-field` rows; the action buttons sit at its
  end. No new dialog and no confirmation question is added.
- Keyboard: Escape clears the selection (one step back; a second Escape does nothing here). Tab order: map, then
  panel.
- New keys in `public/assets/data/dictionary.json` (append): `fp_panel_title` "שולחן {number}", `fp_field_number`
  "מספר שולחן", `fp_err_number_required` "חובה לתת מספר", `fp_err_number_taken` "המספר כבר בשימוש", `fp_field_shape`
  "צורה", `fp_shape_round` "עגול", `fp_shape_square` "מרובע", `fp_shape_rect` "מלבני", `fp_field_seats_min`
  "הכי מעט סועדים", `fp_field_seats_max` "הכי הרבה סועדים", `fp_field_area` "אזור", `fp_turned` "מסובב", `fp_active`
  "פעיל (מקבל הזמנות)", `fp_online` "אורחים יכולים להזמין אותו באתר", `fp_duplicate` "שכפול", `fp_delete`
  "הסרת השולחן", `fp_table_removed` "השולחן הוסר", `fp_join_dropped` "החיבור של השולחן בוטל", `fp_room_title` "המקום",
  `fp_areas_title` "אזורים", `fp_area_add` "הוספת אזור", `fp_area_name` "שם האזור", `fp_err_area_name`
  "חובה לתת שם שעוד לא קיים", `fp_area_up` "הזזה למעלה", `fp_area_down` "הזזה למטה", `fp_area_delete` "הסרת האזור",
  `fp_area_has_tables` "יש שולחנות באזור הזה", `fp_area_last` "חייב להישאר אזור אחד", `fp_room_cols`
  "רוחב החדר (משבצות)", `fp_room_rows` "עומק החדר (משבצות)", `fp_overlap_warning` "שולחנות חופפים: {numbers}",
  `fp_in_use_title` "אי אפשר להסיר שולחנות שיש להם הזמנות", `fp_in_use_row` "שולחן {number} — {count} הזמנות",
  `fp_in_use_tip` "אפשר לסמן שולחן כלא פעיל במקום להסיר אותו", `fp_in_use_restore` "החזרת השולחנות למפה".
- Icons (all registered): `copy`, `trash-2`, `plus`, `x`, `chevron-up`, `chevron-down`, `rotate-ccw`,
  `alert-triangle`.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Write the editing rules of the room as pure tested functions — withTable (size follows seats, pull back inside, seats order, join dropped on area change), numberError, duplicateTable, withoutTable, overlapping, minGrid, withArea, restoreDropped — src/app/pages/frontdesk/floor-plan/floor-plan-edit.util.ts, src/app/pages/frontdesk/floor-plan/floor-plan-edit.util.spec.ts
- [ ] A2: Build the panel where the owner changes the selected table — number with its two errors, shape chips, seat counters, turn, area picker, active and online switches, duplicate, remove and close buttons, events out only — src/app/pages/frontdesk/floor-plan/components/table-panel/table-panel.component.ts, .html, .scss, .spec.ts
- [ ] A3: Build the panel for the areas and the room size — area rows with name, order and remove rules, add area, the two size counters bounded by the furthest table — src/app/pages/frontdesk/floor-plan/components/room-panel/room-panel.component.ts, .html, .scss, .spec.ts
- [ ] A4: Put the panels beside the room and wire every change into the draft — two-column body, table or room panel by selection, Escape, undo messages for a removed table and a dropped join, no panel for staff — src/app/pages/frontdesk/floor-plan/floor-plan.page.ts, .html, .scss, .spec.ts
- [ ] A5: Warn about overlapping tables without blocking the save — the warnKeys input and its mark on the shared map, the line above the map, the registry entry of the family updated — src/app/shared/floor-map/floor-map.component.ts, .html, .scss, .spec.ts, docs/brain/component-families.md
- [ ] A6: Show which tables cannot be removed when the server refuses the save — the notice from the 409 answer, the restore button, closing on the next good save — src/app/pages/frontdesk/floor-plan/floor-plan.page.ts, .html, .scss, .spec.ts
- [ ] A7: Add the panels' Hebrew texts — the thirty-five fp_ keys of the UI notes — public/assets/data/dictionary.json
- [ ] A8: Record the new folders and pieces so later plans find them — the components folder in the pages map, the inventory row — src/app/pages/breadcrumbs.md, docs/brain/inventory.md
- [ ] A9: Prove the five screen checks with short scripts — each spec signs in, answers the business read with tables on and the floor-plan calls itself, saves a screenshot — e2e/ui/684-1.spec.ts, e2e/ui/684-2.spec.ts, e2e/ui/684-3.spec.ts, e2e/ui/684-4.spec.ts, e2e/ui/684-5.spec.ts

## Technical Considerations
- Dependencies: `FloorPlanPage`, `app-floor-map` and its geometry helpers (665); `FloorPlanDataService` and the
  floor plan types (664); `app-form-field`, `app-counter`, `app-custom-select`, `UserMsgService`.
- New files needed: `src/app/pages/frontdesk/floor-plan/floor-plan-edit.util.{ts,spec.ts}`,
  `src/app/pages/frontdesk/floor-plan/components/table-panel/table-panel.component.{ts,html,scss,spec.ts}`,
  `src/app/pages/frontdesk/floor-plan/components/room-panel/room-panel.component.{ts,html,scss,spec.ts}`,
  `e2e/ui/684-1…5.spec.ts`.
- Model changes: none.
- Backend / API: none — the same `PUT /api/v1/floor-plan`; this plan only reads its 409 answer.
- Auth and validation: the server validates the whole plan (C-FLOOR). The browser's rules (unique number, seats
  order, a table inside the room, no join across areas, no reference to a removed table) exist so that a draft is
  always a plan the server accepts, except for a table in use, which only the server knows.
- Security surface: none new. The 409 notice shows table numbers and counts only — never a guest's name or phone.
- Data / migration: none.
- Project checks: the `log-query` Done-when item; Hebrew RTL and logical CSS; every new key named above; no new
  icon; `src/styles.scss` is not edited; the pages folder map is in scope; `[ui]` specs sign in with `signInQa` and
  answer the module and floor-plan calls themselves (`e2e/ui/634-1.spec.ts` is the shape). Components follow
  `.claude/skills/angularComponentStructure/SKILL.md`; stylesheets `.claude/skills/cssLayer/SKILL.md`.
- Traps: keep the panels dumb (inputs in, events out) so every rule is in the tested util; the undo of a removed
  table must restore its joins too; a number is text ("12A" is valid) — `nextTableNumber` only looks at whole
  numbers.

## Out of Scope
- Creating a join, the joins list, the arrow buttons, the bottom sheet under 768 px — plan 666.
- Typing a table's width and depth, free rotation, walls and decoration (D2, D9; brief Part 6).
- A confirmation dialog before removing a table or an area. Bulk edits of several tables.
- Any server, schema or registry change; the table settings card (667).

## Critical Questions
- none

## Execution Notes
- behaviour: a removed table is brought back with an undo on the message instead of a confirmation question (brief rule 15: no extra confirmation dialogs).
- behaviour: an area that still has tables cannot be removed; the owner moves or removes its tables first.
- behaviour: moving a joined table to another area drops the join, with an undo — the server refuses a join across areas.
- behaviour: a field with an error keeps the last valid value in the draft, so "שמור" never sends a plan the screen knows is wrong.
