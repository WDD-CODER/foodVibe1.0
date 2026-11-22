# Plan 665 — The shared floor map and the floor plan editor: draw the room, add tables, drag them, save

Status: draft
Depends-on: 664
Snapshot: 28359b6d54b0c77e288c52702a850daef92ccf07

## Problem Statement
After 664 the server keeps one floor plan per business, but nobody can draw one. A restaurant owner needs a screen
where he sees his room as a sketch, adds tables from a few presets, drags each to where it stands and saves. The same
drawing is needed later by the service screen (671) and the phone booking dialog (672), so the drawing itself is one
shared read-only piece, `app-floor-map`, and the editor is the first screen that uses it (brief RS-02, D2, D9; map row
R3).

Map row R3 is an `L` and does not fit one Worker session, so it is split in two: **this plan** builds the shared map,
the route, the chip, load, the empty start, add from presets, select, drag and save; **plan 684** adds the edit panel
(number, seats, shape, turn, area, active, online, duplicate, delete), the areas, the room size and the overlap warning.
Joins and the phone arrows are plan 666.

Verified on `origin/main` (28359b6d, 2026-11-22):
- Front desk routes are flat lazy routes in `src/app/app.routes.ts:181-209` (`requests`, `frontdesk/settings`,
  `frontdesk/onboarding`, `frontdesk/knowledge`, `bookings`), each with `canActivate: [authGuard, moduleGuard([...])]`;
  the three that edit carry `canDeactivate: [pendingChangesGuard]`. There is no `frontdesk/floor-plan` route.
- `moduleGuard(keys)` (`src/app/core/guards/module.guard.ts:8-17`) sends a business without the module to `/dashboard`.
  `ModuleKey` comes from `@schemas/modules-pure`; plan 662 adds `tables` to it.
- `pendingChangesGuard` (`src/app/core/guards/pending-changes.guard.ts:38`) reads the page's `hasRealChanges()` and,
  when the page has `saveAndWait()`, opens the three-button question (`ConfirmModalService.openTernary` with the keys
  `unsaved_changes_confirm`, `leave_without_saving`, `save_and_leave`, all in the dictionary).
- A page with no Angular form tracks changes the way `/frontdesk/settings` does
  (`src/app/pages/frontdesk/frontdesk-settings/frontdesk-settings.page.ts:132-136`): an empty `FormGroup` as
  `guardForm_` and `useUnsavedChanges({ form: () => this.guardForm_, snapshot: () => JSON.stringify(this.draft_()) })`
  (`src/app/core/utils/unsaved-changes.ts:31`), which also registers the reload / tab-close warning. The same page reads
  `canEdit_ = computed(() => this.permission.can('editFrontDesk'))` (line 115): staff see the screen read-only.
- Chips: `CHIPS_BY_GROUP.frontdesk` (`src/app/core/components/tab-chips/tab-chips.component.ts:86-111`) has five chips,
  each with `modules: [...]`; every URL under `/frontdesk` already maps to the group (line 49). The spec
  (`src/app/core/components/tab-chips/tab-chips.component.spec.ts:181`) asserts the exact list of five for a business with the four default modules.
- Shared pieces that exist: `app-page-header` (`src/app/shared/page-header/`, slots `header-title`, `header-actions`),
  `app-empty-state` (`src/app/shared/empty-state/`: `messageKey` required, `icon`, `ctaLabelKey`, `ctaDisabled`, output
  `ctaClick`), `app-loader` (`src/app/shared/loader/`), `UserMsgService` (`onSetSuccessMsg`, `onSetErrorMsg`),
  `LoggingService`, the chip engine `.c-chip` with `--tap` / `--tab` variants and the buttons `.c-btn-primary`,
  `.c-btn-ghost` in `src/styles.scss`. Shared components are imported by path (`src/app/shared/...`).
- `@angular/cdk` `^19.2.19` is installed; `cdkDrag` is used in four components (for example
  `src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.ts`), always for list sorting — a
  free drag on a grid is new. `@angular/cdk/bidi` is not used anywhere yet. `src/index.html:2` is `<html lang="he" dir="rtl">`.
- Breakpoints: `$break-phone-max: 767px` and `$break-tablet-max: 1023px` at the top of `src/styles.scss` (lines 5, 7).
- Icons are registered twice in `src/app/app.config.ts` (the import list and `LucideAngularModule.pick`, line 167).
  Registered and used here: `save`, `plus`, `alert-triangle`. Not registered: `layout-grid` (this plan adds it).
- Dictionary: no key starts with `fp_` (checked). Reused keys that exist: `save` "שמור", `saving` "שומר...", `retry`
  "נסה שוב", `fd_opt_inside` "בפנים", `fd_opt_outside` "בחוץ", `fd_opt_bar` "בר".
- `[ui]` specs sign in with `signInQa` (`e2e/helpers/qa-session.ts:23`). The QA business has the four default modules;
  a spec that needs another module answers `GET **/api/v1/business` itself with the module added and answers the
  module's own API calls itself (`e2e/ui/634-1.spec.ts:38-45` is the shape).
- From 662 and 664 (merged first): the schema `shared/schemas/entities/floor-plan.schema.ts`, the types in
  `src/app/core/models/floor-plan.model.ts`, and `FloorPlanDataService`
  (`src/app/core/services/floor-plan-data.service.ts`) with a read of `GET /api/v1/floor-plan` (answers
  `{ plan: null }` for a business that never saved one) and a save through `PUT /api/v1/floor-plan`. The names of the
  types and methods are the ones 664 merged; where this plan writes `load()` / `save(body)` use 664's names.

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

**C-TABLES (R0; used by R2, R5, R6, R7, R9, R11, R18)** — the browser part this plan implements:
- Browser: route guard `moduleGuard(['tables'])` on `/frontdesk/floor-plan`; the floor view, the table settings
  card and the waiting list are hidden without the module.

## Goals & Success Criteria
**Primary:** an owner whose business has `tables` opens "מפת המקום" from the front desk chips, adds tables from the
presets, drags each to its place, saves, and finds the same room after a reload; a staff member sees the room and
cannot change it.

- [auto] `pnpm run test:ci` passes, including the new `src/app/shared/floor-map/floor-geometry.util.spec.ts`,
  `src/app/shared/floor-map/floor-map.component.spec.ts`,
  `src/app/pages/frontdesk/floor-plan/floor-plan.page.spec.ts` and the new case in
  `src/app/core/components/tab-chips/tab-chips.component.spec.ts`.
- [auto] `src/app/shared/floor-map/floor-geometry.util.spec.ts`: `footprintFor` returns 1×1 for one seat, 2×2 for a round table of 2, 3×3 for a
  square of 4, 4×2 for a rect of 6, 5×2 for a rect of 8 and swaps the two numbers when `turned`; `movedCell` with a
  drag of +50 px on a 25 px cell moves x by −2 in RTL and +2 in LTR, and never leaves the grid; `firstFreeCell`
  returns `{ x: 0, y: 0 }` on an empty plan and the first cell that overlaps nothing on a plan with tables;
  `nextTableNumber` returns `'1'` on an empty plan and `'8'` when the highest number is `'7'`; `newKey()` matches
  `^[a-z0-9]{6,12}$`.
- [auto] `src/app/shared/floor-map/floor-map.component.spec.ts`: a plan of three tables renders three elements with
  `data-testid="floor-table-<number>"`, each with `data-x` / `data-y` equal to the stored cells and an `aria-label`
  that holds the number and the seat range; a key in `selectedKeys` gets `aria-pressed="true"`; a table whose state
  is `not_active` shows the text "לא פעיל"; a tap emits `tableTapped` with the key; with `draggable` false the drag is
  disabled; with `dimOtherThanArea` set, tables of another area carry the class `is-dimmed`.
- [auto] `src/app/pages/frontdesk/floor-plan/floor-plan.page.spec.ts`: a read of `{ plan: null }` gives three areas named "בפנים", "בחוץ", "בר" and no
  table; a profile whose `requestKinds.table.rules.areas` is `['מרפסת', 'אולם']` gives those two areas; pressing the
  preset for 4 adds a square table numbered `'1'` with seats 2–4 and selects it; `hasRealChanges()` is false after
  load, true after an add and false again after a successful save; a failed save keeps the draft and shows
  `fp_save_failed`; with `can('editFrontDesk')` false there is no preset row and no save button.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/requests` (business answered with `tables` on), press the chip "מפת המקום" → the page shows the title
  "מפת המקום" (`e2e/ui/665-1.spec.ts`).
- [ui] On `/frontdesk/floor-plan` with no saved plan, press "ל-4" → an element `[data-testid="floor-table-1"]` is
  visible (`e2e/ui/665-2.spec.ts`).
- [ui] On `/frontdesk/floor-plan` with a saved plan of one table at x 0, drag `[data-testid="floor-table-1"]` four
  cells toward the inline end → its `data-x` is `4` (`e2e/ui/665-3.spec.ts`).
- [ui] On `/frontdesk/floor-plan`, press "ל-2" twice and then "שמור" → the message "המפה נשמרה" appears, and after a
  reload both `floor-table-1` and `floor-table-2` are visible (the spec keeps the `PUT` body and answers the next
  `GET` with it) (`e2e/ui/665-4.spec.ts`).
- [human] the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page
  (`/frontdesk/floor-plan` with the server stopped; default `loading-and-error-states`).
- [human] the list's page with no items · open the page · a message says the list is empty
  (`/frontdesk/floor-plan` before any table is added: "עדיין אין שולחנות…"; default `empty-state-on-list`).
- [human] Dandan adds six tables and drags them into the shape of a real room on a laptop: a table follows the pointer,
  lands on the grid cell under it, and the sketch reads as a room.

## Execution Mode
- Parallel: no — first plan of run `rs-floor-ui` (665, 684, 666, 667). It appends to
  `public/assets/data/dictionary.json`, `src/app/app.routes.ts`, `src/app/app.config.ts` and
  `src/app/core/components/tab-chips/tab-chips.component.ts`, which every screen plan of the Restaurant program appends
  to: one screen run at a time. Never live together with open plan 581 (same dictionary, registry and folder maps).
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/floor-map/**
src/app/shared/floor-map/floor-geometry.util.spec.ts
src/app/shared/floor-map/floor-map.component.spec.ts
src/app/pages/frontdesk/floor-plan/**
src/app/pages/frontdesk/floor-plan/floor-plan.page.spec.ts
src/app/app.routes.ts
src/app/app.config.ts
src/app/core/components/tab-chips/tab-chips.component.ts
src/app/core/components/tab-chips/tab-chips.component.spec.ts
public/assets/data/dictionary.json
src/app/shared/breadcrumbs.md
src/app/pages/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
e2e/ui/665-1.spec.ts
e2e/ui/665-2.spec.ts
e2e/ui/665-3.spec.ts
e2e/ui/665-4.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — a new shared drawing piece and a new lazy screen; the plan is read and saved only through `FloorPlanDataService` (664), where the server scopes, authorises (`editFrontDesk`) and validates the whole plan in one request; no data service, registry, permission file or schema is edited and the browser never loops one write per table.

## Reuse Check

- `FloorMapComponent` (`app-floor-map`, `src/app/shared/floor-map/`) — family: none — rung: 4 — why: no family draws things at grid positions; the editor (665, 684, 666), the service screen (671) and the phone booking dialog (672) must show the same room, so it is one shared piece with a new registry entry `floor-map`.
- `floor-geometry.util.ts` (`footprintFor`, `movedCell`, `firstFreeCell`, `nextTableNumber`, `newKey`, `chairsFor`, `TABLE_PRESETS`) — family: none — rung: 4 — why: pure grid arithmetic of the new `floor-map` family, kept in its folder with a spec; nothing in `helpers` works in cells.
- Scoped classes of the map (`.floor-map`, `.floor-map__grid`, `.floor-map__table`, `.floor-map__number`, `.floor-map__chair`, `.floor-map__state`, modifiers `--round`, `--square`, `--rect`, `.is-selected`, `.is-dimmed`) — family: none — rung: 4 — why: the look of the new family, in its own component stylesheet; no `.c-*` engine is defined or restyled.
- `FloorPlanPage` (`src/app/pages/frontdesk/floor-plan/`) with its scoped classes (`.floor-plan`, `.floor-plan__presets`, `.floor-plan__areas`, `.floor-plan__note`, `.floor-plan__state`) — family: entity-form — rung: 1 — why: a page that edits one stored thing with `useUnsavedChanges`, `pendingChangesGuard` (`hasRealChanges()` / `saveAndWait()`), as `/frontdesk/settings` does.
- Page header with the save button — family: list-page — rung: 1 — why: `app-page-header` as it is; the save button is `.c-btn-primary` with `[disabled]`, `[attr.aria-busy]` and the `saving` label (engine-classes saving rule).
- Preset buttons ("ל-2", "ל-4", "ל-6", "ל-8", "מקום בבר") and the area row ("הכול" + one per area) — family: chip — rung: 1 — why: `c-chip c-chip--tap` buttons for the presets and `c-chip c-chip--tab` buttons for the areas, from `src/styles.scss`.
- Empty and failed-load states — family: empty-state — rung: 1 — why: `app-empty-state` with a message key and, on a failed load, `ctaLabelKey="retry"`.
- Waiting and messages — family: feedback — rung: 1 — why: `app-loader`, `UserMsgService`, `LoggingService`.
- Chip "מפת המקום" in the front desk group — family: chip — rung: 1 — why: one more entry in `CHIPS_BY_GROUP.frontdesk`.
- Dragging a table — family: none — rung: 4 — why: `cdkDrag` from the installed `@angular/cdk/drag-drop` (decision D9) used as a free drag inside the map; the four existing uses sort lists and share no helper. `Directionality` from `@angular/cdk/bidi` tells the map the reading direction.

## Defaults

- loading-and-error-states — applies — how: `app-loader` while the plan loads and `app-empty-state` with the `retry` action when the read fails
- one-breakpoint-set — applies — how: every `@media` of the two new stylesheets uses `$break-phone-max` / `$break-tablet-max` from `src/styles.scss`
- empty-state-on-list — applies — how: `app-empty-state` under the map when the plan has no table
- app-list-container — exception — why: the screen is a drawing of a room, not a list of rows; it has no `c-list-row`

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a restaurant owner, I want to see my room as a sketch so that the screen looks like the place I work in.
- As a restaurant owner, I want to add a table with one press and drag it to where it stands so that drawing the room takes minutes.
- As a restaurant owner, I want to be asked before I leave with changes I did not save so that I do not lose the drawing.
- As a host, I want to see the room the owner drew, without being able to change it by mistake.

## Functional Requirements

### Must Have (P0)

**The shared map `app-floor-map`**
- [ ] Inputs: `plan` (required, the floor plan), `states` (a map from table key to one of `free | reserved_soon |
  seated | over_time | late | not_active` — the names plan 671 computes — default empty), `selectedKeys` (default empty), `draggable` (default false),
  `dimOtherThanArea` (an area key or null, default null). Outputs: `tableTapped` (the table key), `tableMoved`
  (`{ key, x, y }` in cells). It never changes the plan itself: the page owns the data.
- [ ] The room is one CSS grid: `grid-template-columns: repeat(cols, 1fr)`, the grid's `aspect-ratio` is
  `cols / rows`, its width is the width it is given, and it never scrolls sideways. A table is placed with
  `grid-column: x + 1 / span W` and `grid-row: y + 1 / span H`, where `W × H` is `footprintFor(table)`. Because the
  grid follows the page direction, **`x` is counted from the inline start** (in Hebrew: from the right). Only cells
  are stored and rendered; no pixel is ever written to the plan.
- [ ] Every table is a `<button type="button">` with `data-testid="floor-table-<number>"`, `data-key`, `data-x`,
  `data-y`, `data-state` (the state, or `none`), `aria-pressed` (selected or not) and an `aria-label` from
  `fp_table_label` ("שולחן {number}, {min}–{max} מקומות"). It shows its number in the middle. Its shape is a class:
  round = a circle (an ellipse when not square), square and rect = rounded corners. Chairs are small marks outside
  the table's edges, `aria-hidden`: `chairsFor(table)` gives how many sit on each of the four sides (round and
  square: spread over four sides starting at the top; rect: split between the two long sides, the two short sides
  get one each from 6 seats up), as many as `maxSeats`, at most 12 drawn.
- [ ] A table that is not `active`, or whose state is `not_active`, has a dashed outline and the visible text "לא פעיל"
  (`fp_state_inactive`) under its number: a state is never shown by colour alone. The five other states only set
  `data-state` here; their look is plan 671's.
- [ ] A selected table has a thick outline in the brand colour and `aria-pressed="true"`.
- [ ] With `draggable` true every table carries `cdkDrag` with the grid as its boundary. When a drag ends the map
  reads the distance in pixels, turns it into whole cells with `movedCell` (cell size = grid width ÷ `cols`; a move
  to the right is `−x` in RTL and `+x` in LTR; the result is kept inside the grid for the table's footprint), resets
  the drag transform and emits `tableMoved`. A drag shorter than half a cell emits nothing. A press without a drag
  emits `tableTapped`. With `draggable` false the tables do not move.
- [ ] `dimOtherThanArea`: tables of every other area get the class `is-dimmed` (lower opacity); they stay tappable.

**The editor page `/frontdesk/floor-plan`**
- [ ] Route `frontdesk/floor-plan`, lazy, `canActivate: [authGuard, moduleGuard(['tables'])]`,
  `canDeactivate: [pendingChangesGuard]`. Chip `{ id: 'floor-plan', labelKey: 'fp_chip', icon: 'layout-grid', path:
  '/frontdesk/floor-plan', modules: ['tables'] }` appended to the end of `CHIPS_BY_GROUP.frontdesk`.
- [ ] On entry the page shows `app-loader` and reads the plan. A failed read shows `app-empty-state` with
  `fp_load_failed` and the `retry` button, which reads again; nothing else is shown.
- [ ] A read of `{ plan: null }` starts a draft from `emptyFloorPlan(names)` of plan 664
  (`shared/schemas/front-desk/floor-plan-check.ts`): `grid: { cols: 24, rows: 16 }`, no tables, no joins, and one
  area per entry of the profile's `requestKinds.table.rules.areas` (read through `FrontDeskProfileDataService`,
  `ensureLoaded()` first); when that list is missing or empty, three areas named with the dictionary values of
  `fd_opt_inside`, `fd_opt_outside`, `fd_opt_bar`. Each area gets a `newKey()` and `order` 0, 1, 2…. This start is
  not a change: `hasRealChanges()` is false until the owner does something.
- [ ] Layout, top to bottom: `app-page-header` (title `fp_title`, the save button in `header-actions`); the preset
  row; the area row; the map; under the map `app-empty-state` with `fp_empty` while the plan has no table.
- [ ] Preset row (owner only), label `fp_add_label` "הוספת שולחן" and five buttons from `TABLE_PRESETS`: "ל-2" (round,
  seats 1–2), "ל-4" (square, 2–4), "ל-6" (rect, 4–6), "ל-8" (rect, 6–8), "מקום בבר" (round, 1–1). A press adds a
  table with a `newKey()`, the number `nextTableNumber(plan)` (highest whole number in use + 1, as text), `w` / `h`
  from `footprintFor`, `turned: false`, `active: true`, `online: true`, the area chosen in the area row (the first
  area when "הכול" is chosen), at `firstFreeCell` (scanning rows from the top, each row from the inline start; when
  no free place is left, at 0, 0 — overlap is allowed), and selects it. At 200 tables the buttons are disabled.
- [ ] Area row: "הכול" and one `c-chip--tab` per area in `order`; the chosen one is `active`. Choosing an area dims
  the tables of the others on the map (`dimOtherThanArea`) and makes it the area of the next added table. It
  changes nothing in the plan.
- [ ] A tap on a table selects it (one at a time); a tap on the selected table, or on an empty part of the grid,
  clears the selection. In this plan a selected table only looks selected (684 opens its panel).
- [ ] A drag (owner only) moves the table to the cell it was dropped on and selects it.
- [ ] Save (owner only): the button is disabled while nothing changed or while saving; while saving it shows `saving`
  and `aria-busy`. Success → the draft becomes the saved plan, `fp_saved` "המפה נשמרה" is shown, the selection stays.
  Failure (any status) → the draft stays as it is, `fp_save_failed` is shown, the error is logged with
  `LoggingService` (status and error code only).
- [ ] Leaving with unsaved changes (a link, the browser's back, a chip): the page implements `hasRealChanges()` and
  `saveAndWait()`, so `pendingChangesGuard` asks its three-button question — stay, save and leave (leaves only when
  the save succeeded), leave without saving. A reload or tab close asks the browser's own question
  (`useUnsavedChanges`). There is no separate cancel or reset button.
- [ ] A member without `editFrontDesk` (staff): the map is shown with `draggable` false; no preset row, no save
  button; under the header one line `fp_read_only_note` "רק בעל העסק יכול לשנות את המפה"; with no saved plan the empty
  state says `fp_empty_readonly` "בעל העסק עדיין לא שרטט את המקום".
- [ ] `docs/brain/component-families.md` gains `### floor-map — the drawing of the room` (Status, Use, When,
  Inputs / variants, Known copies: none) and `docs/brain/inventory.md` its row; both `breadcrumbs.md` files gain the
  new folders.

### Should Have (P1)
- [ ] While a table is being dragged it is drawn above the others and slightly transparent, so the cell under it can
  be seen.

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL, logical CSS properties only; the page is one column at every width. The map takes the full content
  width; at 24 columns a cell is about 14 px on a 375 px phone and about 40 px on a laptop. The number's font size
  follows the cell (`clamp`), never under 10 px. Phone ergonomics (arrows, bottom sheet) are plan 666.
- Colours come from the theme tokens of `src/styles.scss`; the map defines no colour of its own and no `.c-*` class.
- No confirmation dialog is added anywhere in this plan. No hover text is added.
- Focus: tables are buttons in DOM order (by `y`, then `x`), so Tab walks the room row by row; Enter or Space selects.
- New keys in `public/assets/data/dictionary.json` (append): `fp_chip` "מפת המקום", `fp_title` "מפת המקום",
  `fp_add_label` "הוספת שולחן", `fp_preset_2` "ל-2", `fp_preset_4` "ל-4", `fp_preset_6` "ל-6", `fp_preset_8` "ל-8",
  `fp_preset_bar` "מקום בבר", `fp_area_all` "הכול", `fp_table_label` "שולחן {number}, {min}–{max} מקומות",
  `fp_state_inactive` "לא פעיל", `fp_empty` "עדיין אין שולחנות. הוסיפו שולחן ראשון מהכפתורים למעלה",
  `fp_empty_readonly` "בעל העסק עדיין לא שרטט את המקום", `fp_read_only_note` "רק בעל העסק יכול לשנות את המפה",
  `fp_saved` "המפה נשמרה", `fp_save_failed` "לא הצלחנו לשמור את המפה", `fp_load_failed` "לא הצלחנו לטעון את המפה".
- New Lucide icon registered in `src/app/app.config.ts`: `layout-grid` (the chip).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Write the grid arithmetic of the room as pure tested functions — footprintFor, movedCell (RTL and LTR, kept inside the grid), firstFreeCell, nextTableNumber, newKey, chairsFor, TABLE_PRESETS, the six-state type — src/app/shared/floor-map/floor-geometry.util.ts, src/app/shared/floor-map/floor-geometry.util.spec.ts
- [ ] A2: Draw the room as one shared read-only map every later screen can reuse — CSS grid placement from cells, table buttons with test ids and labels, shapes, chairs, the inactive look, selection, dimming by area, tap output — src/app/shared/floor-map/floor-map.component.ts, .html, .scss, .spec.ts
- [ ] A3: Let a table be dragged to another cell when the screen allows it — cdkDrag with the grid as boundary, distance to cells through movedCell with Directionality, transform reset, tableMoved output, no move when draggable is off — src/app/shared/floor-map/floor-map.component.ts, .html, .spec.ts
- [ ] A4: Open the editor screen from the front desk chips for a business that has table service — lazy route with the module guard and the leave guard, the chip, the layout-grid icon, a chip spec case with tables on — src/app/app.routes.ts, src/app/app.config.ts, src/app/core/components/tab-chips/tab-chips.component.ts, src/app/core/components/tab-chips/tab-chips.component.spec.ts
- [ ] A5: Load the saved room or start an empty one with the business's areas — loader, failed-load state with retry, the null-plan start from the profile's areas or the three defaults, the empty state, the read-only view for staff — src/app/pages/frontdesk/floor-plan/floor-plan.page.ts, .html, .scss, .spec.ts
- [ ] A6: Let the owner add tables from presets, pick an area, select and drag — preset row, area row, add at the first free cell with the next number, selection rules, the move from tableMoved — src/app/pages/frontdesk/floor-plan/floor-plan.page.ts, .html, .scss, .spec.ts
- [ ] A7: Save the whole room in one request and never lose unsaved work — save button states, success and failure messages, hasRealChanges and saveAndWait for the leave question, the reload warning — src/app/pages/frontdesk/floor-plan/floor-plan.page.ts, .spec.ts
- [ ] A8: Add the screen's Hebrew texts — the seventeen fp_ keys of the UI notes — public/assets/data/dictionary.json
- [ ] A9: Register the new family and the new folders so the next plans find them — the floor-map entry, the inventory row, the two folder maps — docs/brain/component-families.md, docs/brain/inventory.md, src/app/shared/breadcrumbs.md, src/app/pages/breadcrumbs.md
- [ ] A10: Prove the four screen checks with short scripts — each spec signs in, answers the business read with tables on and the floor-plan calls itself, saves a screenshot — e2e/ui/665-1.spec.ts, e2e/ui/665-2.spec.ts, e2e/ui/665-3.spec.ts, e2e/ui/665-4.spec.ts

## Technical Considerations
- Dependencies: `FloorPlanDataService` and the floor plan types (664); `FrontDeskProfileDataService` (read only);
  `PermissionService.can('editFrontDesk')`; `pendingChangesGuard`, `useUnsavedChanges`; `@angular/cdk/drag-drop`,
  `@angular/cdk/bidi` (installed, no new dependency).
- New files needed: `src/app/shared/floor-map/floor-map.component.{ts,html,scss,spec.ts}`,
  `src/app/shared/floor-map/floor-geometry.util.{ts,spec.ts}`,
  `src/app/pages/frontdesk/floor-plan/floor-plan.page.{ts,html,scss,spec.ts}`, `e2e/ui/665-1…4.spec.ts`.
- Model changes: none (the types are 664's). The six-state type lives in `floor-geometry.util.ts`.
- Backend / API: none — reads `GET /api/v1/floor-plan` and writes `PUT /api/v1/floor-plan` through 664's service.
- Auth and validation: the server is the gate (`requireModule('tables')`, `editFrontDesk` on the write, the whole
  plan validated by Zod and C-FLOOR's refusals). The browser only hides what a member may not do.
- Security surface: none new — no new input reaches the server outside the plan body 664 validates.
- Data / migration: none.
- Project checks: the `log-query` Done-when item; Hebrew RTL and logical CSS; every new key named above; the new
  icon registered; `src/styles.scss` is not edited; the folder maps are in scope; new scripts under `e2e/ui/` sign in
  with `signInQa`. Components follow `.claude/skills/angularComponentStructure/SKILL.md` (signals, `inject()`,
  `input()` / `output()`, OnPush) and stylesheets `.claude/skills/cssLayer/SKILL.md`.
- Traps: `cdkDrag` moves an element with a pixel transform — read the distance, convert, then reset the transform so
  the grid placement is the only position; test `movedCell` in both directions; a tap must not be read as a drag
  (the half-cell rule); the `[ui]` drag spec uses the mouse API in steps so the drag threshold is passed.

## Out of Scope
- Editing a table (number, seats, shape, turn, area, active, online), duplicate, delete, areas, room size, the
  overlap warning — plan 684.
- Joined tables, the arrow buttons, the bottom sheet under 768 px — plan 666.
- The look of the five live states and party names on tables — plan 671. The small map in the booking dialog — 672.
- Table settings and the confirm switch — plan 667. Any server, schema or registry change.
- Walls, decoration, free rotation, zoom, several layouts (brief Part 6). A section in `/dev/catalog`.

## Critical Questions
- none

## Execution Notes
- behaviour: staff see the room read-only instead of being sent away — the same rule as `/frontdesk/settings`, and a host needs to see the room.
- behaviour: a new room starts at 24 × 16 cells; the size is changed in plan 684.
- behaviour: areas are shown as a row of chips that dims the other areas' tables; an area is not a drawn region.
- behaviour: a table's size on the map follows its shape and largest party (`footprintFor`), never typed by hand (D9).
