# Plan 699 — Zones on the room map: every area has a colour and a shape, tables wear their area's colour, joined tables stand out

Status: draft
Depends-on: 684, 666
Track: code
Snapshot: d06302a34cca8c8fc09125c3a7737c34b4ed2ab3

## Problem Statement
The floor plan editor (`/frontdesk/floor-plan`, plans 665, 684, 666, 667) treats an area ("בפנים", "בחוץ", "בר") as a
tag on a table and nothing else. The map cannot show where an area is: choosing an area chip only fades every other
table to 35 % (`dimOtherThanArea`), which the Human rejected — "the room needs a proper way to show where the different
zones are … zones must be shown on the map and the user must be able to edit them". Two validation cards of the same
screen also failed: ④ the explanation on an area's remove button cannot be seen (a native `title` on an
`aria-disabled` `.c-icon-btn`: it shows after ~1 s of a still mouse, never on touch or keyboard focus, and the button
keeps its hover spin, so it does not even look blocked), and ⑥ joined tables look like any other table.

This plan is the foundation half of the redesign (research: `floor-research.md`, decisions A1–A4, A7, A10). It adds a
colour and an optional rectangle to every area in the stored plan, teaches the shared map to draw zones and let a page
draw, move and resize them, gives every table in the editor its area's colour, gives joined tables their own border
colour, and replaces the invisible native tooltip with a visible one. Plan 700 builds the editor screen on top of it
(toolbar, legend, zone inspector, styled panels).

Verified on `chore/restaurant-staging` (d06302a3, 2026-11-23), read-only checkout `foodVibe1.0-wt-2`:
- `shared/schemas/entities/floor-plan.schema.ts`: `floorAreaSchema = z.strictObject({ key, name, order })`; tables carry
  `areaKey`, `x`, `y`, `w`, `h`, `turned`; `grid` 10–80 × 10–80; `areas` 1–10.
- `shared/schemas/front-desk/floor-plan-check.ts`: `FLOOR_PLAN_ISSUE_CODES` (9 codes), `checkFloorPlan`,
  `emptyFloorPlan` (areas `{ key, name, order }`); used by `server/routes/floor-plan.js:18,82` through
  `server/generated/` (built by `pnpm run build:schemas`, git-ignored) and tested in `server/test/floor-plan-check.test.js`.
- `server/routes/public.js:146` copies only `key` and `name` of an area to guests — the new fields never leave the business.
- `src/app/shared/floor-map/floor-map.component.ts`: inputs `plan` (`Pick<FloorPlan, 'grid' | 'areas' | 'tables'>`),
  `states`, `details`, `selectedKeys`, `draggable`, `dimOtherThanArea`, `warnKeys`; outputs `tableTapped`, `tableMoved`,
  `gridTapped`; the grid is a CSS grid (`grid-column: x+1 / span w`), tables are `cdkDrag` buttons; selected = 4 px
  `--color-primary` border. Used by the editor and by `floor-view`, `new-booking-dialog`, `walk-in-dialog`,
  `approve-table-dialog` (none of those pass `dimOtherThanArea`).
- `src/app/shared/floor-map/floor-geometry.util.ts`: `coveredBy`, `footprintFor`, `movedCell`, `isTinyDrag`, `newKey`.
- `src/app/pages/frontdesk/floor-plan/floor-plan-edit.util.ts`: `withTable` (drops a join on an area change and returns
  `droppedJoins`), `withArea` (`AreaOp` add / rename / move / remove), `minGrid` (tables only), `MIN_GRID`.
- `src/app/pages/frontdesk/floor-plan/floor-plan.page.html:111-121` passes `[dimOtherThanArea]="areaKey_()"`.
- `src/app/pages/frontdesk/floor-plan/components/room-panel/room-panel.component.html:60-73`: the remove button with
  `[attr.title]`, `aria-disabled`, `aria-describedby`.
- `.c-icon-btn` (`src/styles.scss:944`) styles `:disabled` only, not `[aria-disabled='true']`; no tooltip piece exists in
  `src/styles.scss` or `src/app/shared/` (registry `docs/brain/component-families.md` has no tooltip family).
- The default `anchored-popup` (`_shared/product-defaults.md`) asks every tooltip to be as wide as its text, beside its
  control, flipping above / below, never cut by the screen: `placeInViewport` in
  `src/app/core/utils/viewport-placement.util.ts` (`anchor`, `panel`, `viewport`, `prefer` → `top`, `left`, `below`),
  measured in a `popover="manual"` box as `src/app/shared/nutrition-badge/nutrition-badge.component.ts` does. A
  CSS-only `::after` tooltip cannot flip and would be clipped by the panel's scroll box on a phone, so the tooltip is a
  small shared directive.
- Icons registered in `src/app/app.config.ts` and used here: `link`. No new icon.
- Tokens: `--color-primary`, `--color-text-on-primary`, `--color-text-main`, `--bg-pure`, `--radius-sm`, `--radius-md`,
  `--fs-xs`, `--z-floating` exist in `src/styles.scss`. Component stylesheets may not hold raw colours
  (`style-raw-color`), so every new colour is a token appended to `src/styles.scss`.

## Goals & Success Criteria
**Primary:** a saved area can carry a colour and a rectangle; the map shows each zone as a coloured, labelled shape
under its tables; a page can draw, move and resize a zone on the map; in the editor each table's outline has its area's
colour; joined tables have a violet border with a link mark; the reason a button is blocked shows at once as a tooltip.

- [auto] `pnpm run test:ci` passes, including the new `src/app/shared/floor-map/floor-zones.util.spec.ts` and the new
  cases in `src/app/shared/floor-map/floor-map.component.spec.ts`,
  `src/app/pages/frontdesk/floor-plan/floor-plan-edit.util.spec.ts`,
  `src/app/pages/frontdesk/floor-plan/floor-plan.page.spec.ts` and
  `src/app/pages/frontdesk/floor-plan/components/room-panel/room-panel.component.spec.ts`.
- [auto] `pnpm run test:server` passes, including the new cases in `server/test/floor-plan-check.test.js`:
  `checkFloorPlan` reports `zone_outside_grid` for a zone `{ x: 20, y: 0, w: 6, h: 4 }` on a 24-column grid,
  `zone_overlap` (with the later area's key) for two zones that share a cell, and nothing for two zones that only
  touch; a plan whose areas have no `color` and no `zone` (a plan saved before this change) has no issue;
  `emptyFloorPlan(['a', 'b', 'c'])` gives the areas colours 0, 1, 2.
- [auto] `src/app/shared/floor-map/floor-zones.util.spec.ts`: `colorOf({ order: 9 })` is 1 when the area has no
  colour and the stored colour otherwise; `rectFromCells({x:5,y:2},{x:1,y:6})` is `{ x: 1, y: 2, w: 5, h: 5 }`;
  `cellAtPoint` mirrors the column in RTL (the point at the right edge of a 24-column grid is column 0) and clamps to
  the grid; `resizedRect` with corner `start-start` dragged +2,+1 cells shrinks w by 2 and h by 1 and moves x, y, and
  never goes under 2 × 2; `movedRect` keeps the rect inside the grid; `rectsOverlap` is true for a shared cell and
  false for touching edges; `tableCentreIn` uses the table's turned footprint.
- [auto] `src/app/pages/frontdesk/floor-plan/floor-plan-edit.util.spec.ts` (new cases): `withZone` sets an area's
  rect and moves into that area every table whose centre is inside it (returning their keys and any dropped joins);
  `withZone` returns `{ refused: 'fp_zone_overlap' }` and the plan unchanged when the rect shares a cell with another
  area's zone, and `{ refused: 'fp_zone_small' }` under 2 × 2; `withZone(plan, key, null)` clears the shape and moves no
  table; `withTableDropped` moves a dropped table into the area whose zone holds its centre (dropping a join across areas
  as `withTable` does) and keeps its area when its centre is in no zone; `minGrid` also holds every zone; `withArea`
  `add` gives the new area the first palette colour no other area has (or `order % 8` when all eight are taken).
- [auto] `src/app/shared/floor-map/floor-map.component.spec.ts` (new cases): an area with a zone renders one
  `[data-testid="floor-zone-<key>"]` element in its cells with the area's name and `--fm-zone` set to
  `var(--color-zone-<colour>)`; `showZones` false renders none; with `colorTables` true a table gets `--fm-zone` of
  its area; a key in `joinedKeys` gets the class `is-joined` and a `link` mark and its accessible name ends with
  "מחובר"; in draw mode (`drawZoneKey` set) a pointer down at cell (2,2) and up at (5,4) emits `zoneDrawn` with
  `{ areaKey, rect: { x: 2, y: 2, w: 4, h: 3 } }`; a tap on a zone emits `zoneTapped` with its key; a selected
  zone (`selectedZoneKey`) with `zoneEditable` shows four `.floor-map__handle` elements.
- [auto] `src/app/shared/tip/tip.directive.spec.ts`: on `mouseenter` and on `focusin` of the host a
  `.c-tip[popover]` element with the text appears (no delay) and the host gets `aria-describedby` = its id; on
  `mouseleave` / `focusout` it goes; a `click` opens it and it closes after 3000 ms (fake timers); an empty text
  shows nothing; placement uses `placeInViewport` (the box sits below an anchor at the top of a 600 px viewport and
  above an anchor at its bottom).
- [auto] `src/app/pages/frontdesk/floor-plan/components/room-panel/room-panel.component.spec.ts` (new case): the
  remove button of an area that has tables carries `appTip` "יש שולחנות באזור הזה", has no `title`, and pressing it
  shows the tip and emits nothing.
- [auto] `src/app/pages/frontdesk/floor-plan/floor-plan.page.spec.ts` (new cases): the map gets `joinedKeys` with every
  table key of the draft's joins; the map no longer gets `dimOtherThanArea`; a `tableMoved` into another area's zone
  changes that table's area in the draft.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/reuse-lint.mjs --check-registry` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/frontdesk/floor-plan` with a saved plan where tables 5 and 6 are joined → `[data-testid="floor-table-5"]`
  has the class `is-joined` and `[data-testid="floor-table-7"]` does not (`e2e/ui/699-1.spec.ts`).
- [ui] With a saved plan whose area "בחוץ" has the zone `{ x: 1, y: 1, w: 8, h: 6 }` and colour 1 →
  `[data-testid="floor-zone-<key>"]` is visible and contains "בחוץ" (`e2e/ui/699-2.spec.ts`).
- [ui] Hover the remove button of an area that has tables → the text "יש שולחנות באזור הזה" is visible within 300 ms
  (`e2e/ui/699-3.spec.ts`).
- [human] a dialog with an explained control · hover the control · its explanation shows as a tooltip and no explanation text sits on the modal
  (`/frontdesk/floor-plan`, room panel: hover the bin of an area that has tables; default `hints-in-tooltips`).
- [human] any page with a small floating box · open it on a row near the top and on a row near the bottom of the screen · it is as wide as its text, sits right above or below the row, and is never cut off
  (`/frontdesk/floor-plan`, room panel: the bins of the first and the last area; on a phone, inside the bottom sheet).
- [human] Card ④ replayed: `/frontdesk/floor-plan`, room panel, hover the bin of "בפנים" (it has tables) → a dark
  tooltip "יש שולחנות באזור הזה" appears at once under the button; the bin looks faded and does not spin; on a phone
  (or a narrow window) a tap on the bin shows the same tooltip for about 3 seconds.
- [human] Card ⑥ replayed: `/frontdesk/floor-plan` with the demo plan → tables 5 + 6 and 10 + 11 have a violet border
  and a small link mark; no other table has it.
- [human] On the same page every table's border has its area's colour (all "בפנים" tables one colour, "בחוץ" another,
  "בר" a third) and choosing an area chip no longer fades the other tables.

## Execution Mode
- Parallel: no — first plan of the pair 699 → 700; 700 builds the editor on this plan's map inputs and rules.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/entities/floor-plan.schema.ts
shared/schemas/front-desk/floor-plan-check.ts
server/test/floor-plan-check.test.js
src/app/shared/floor-map/**
src/app/shared/floor-map/floor-zones.util.spec.ts
src/app/shared/floor-map/floor-map.component.spec.ts
src/app/shared/tip/**
src/app/shared/tip/tip.directive.spec.ts
src/app/pages/frontdesk/floor-plan/floor-plan-edit.util.ts
src/app/pages/frontdesk/floor-plan/floor-plan-edit.util.spec.ts
src/app/pages/frontdesk/floor-plan/floor-plan.page.ts
src/app/pages/frontdesk/floor-plan/floor-plan.page.html
src/app/pages/frontdesk/floor-plan/floor-plan.page.spec.ts
src/app/pages/frontdesk/floor-plan/components/room-panel/room-panel.component.ts
src/app/pages/frontdesk/floor-plan/components/room-panel/room-panel.component.html
src/app/pages/frontdesk/floor-plan/components/room-panel/room-panel.component.spec.ts
src/styles.scss
public/assets/data/dictionary.json
src/app/shared/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
e2e/ui/699-1.spec.ts
e2e/ui/699-2.spec.ts
e2e/ui/699-3.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-4: preserves — the two new optional area fields are added to the one Zod schema in `shared/schemas/entities/floor-plan.schema.ts`, and the new cross-field checks to the shared `checkFloorPlan` the server route already runs on every `PUT /api/v1/floor-plan`; the server keeps validating every write.
- INV-3: preserves — moving tables into a zone's area happens inside one in-memory draft of one document and is saved in the same single `PUT`; no loop of writes from the browser.
- INV-1: preserves — no route, permission or scope change; `server/routes/public.js` still copies only an area's key and name to guests.

## Reuse Check

- `floor-zones.util.ts` (`ZONE_COLOR_COUNT`, `colorOf`, `rectFromCells`, `cellAtPoint`, `resizedRect`, `movedRect`, `rectsOverlap`, `rectInGrid`, `tableCentreIn`) — family: floor-map — rung: 3 — why: zone cell arithmetic of the map, beside `floor-geometry.util.ts` in the same family; the family's registry entry is updated.
- Zone layer, `colorTables`, `joinedKeys`, `showZones`, `zoneEditable`, `drawZoneKey`, `selectedZoneKey` inputs and `zoneDrawn`, `zoneChanged`, `zoneTapped` outputs of `app-floor-map` (`.floor-map__zone`, `.floor-map__zone-label`, `.floor-map__handle`, `.floor-map__link`, `.is-joined`) — family: floor-map — rung: 3 — why: extends the shared map; no page-local copy of the room drawing.
- `withZone`, `withTableDropped` and the zone-aware `minGrid` in `floor-plan-edit.util.ts` — family: floor-plan-editor — rung: 3 — why: more pure draft rules of the editor beside the existing ones.
- `TipDirective` (`[appTip]`, `src/app/shared/tip/tip.directive.ts`) with its bubble look `.c-tip` in `src/styles.scss` — family: none — rung: 4 — why: no tooltip piece exists (the registry has none and `hints-in-tooltips` used the native `title`, which card ④ proved invisible); one shared directive any control can wear, placed by the existing `placeInViewport`; new family `tooltip` added to the registry.
- `.c-icon-btn[aria-disabled='true']` in `src/styles.scss` — family: engine-classes — rung: 3 — why: the existing icon-button engine gains the disabled look for a button that must still take hover and tap.
- Zone and joined colour tokens `--color-zone-0` … `--color-zone-7`, `--color-floor-joined` — family: engine-classes — rung: 3 — why: design tokens appended to `src/styles.scss`, the only place a raw colour may live.

## Adopt Check
- `TipDirective` (`[appTip]`, `src/app/shared/tip/tip.directive.ts`) with its bubble look `.c-tip` in `src/styles.scss` — candidate: @angular/material (MatTooltip) — considered: @angular/cdk overlay — verdict: build — license: MIT — why: a ~60-line directive on the app's own `placeInViewport` and the popover top layer covers hover, focus and tap; Material would bring its theme and a new runtime dependency for one behaviour (facts not checked with `adopt-facts.mjs` in this draft — the Planner runs it at save).

## Defaults

- one-breakpoint-set — applies — how: every new `@media` uses `$break-phone-max` from `src/styles.scss`
- hints-in-tooltips — applies — how: `[appTip]` (`src/app/shared/tip/tip.directive.ts`) sets `aria-describedby` to its bubble; the native `title` is removed from the area remove button. The default's `how` line in `_shared/product-defaults.md` still names the native title — the Human updates it (see Execution Notes)
- anchored-popup — applies — how: `[appTip]` measures its `popover="manual"` bubble (`max-content`, capped at 16rem) and places it with `placeInViewport` (prefer below), re-placed on scroll and resize, as `nutrition-badge` does
- empty-state-on-list — exception — why: this plan adds no list; "list"/"table" here are restaurant tables on a map
- app-list-container — exception — why: no list page; the floor plan is a drawing, not rows
- confirm-destructive-action — exception — why: this plan adds no destructive action; clearing a zone's shape is plan 700's and comes with an undo
- loading-and-error-states — exception — why: no new data read; the screen's states are plan 665's
- unsaved-changes-on-leave — exception — why: no new form; the editor's leave question (plan 665) already covers the draft

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a restaurant owner, I want to see on the map where the terrace ends and the bar begins, so that the plan looks like my place.
- As a restaurant owner, I want each table to show the colour of its area, so that I see at a glance which table is booked under which area.
- As a host, I want joined tables to stand out, so that I never seat two parties on a pair the owner joined.
- As a restaurant owner, I want to see at once why a button does nothing, so that I am not left guessing.

## Functional Requirements

### Must Have (P0)

**Data (C-FLOOR, additive)**
- [ ] `floorAreaSchema` gains two optional fields: `color: z.number().int().min(0).max(7)` (an index into the zone
  palette) and `zone: z.strictObject({ x: int ≥ 0, y: int ≥ 0, w: int 2–80, h: int 2–80 })` (cells, same origin as
  tables: `x` counts from the inline start). Both stay optional so every saved plan stays valid — no migration.
- [ ] `checkFloorPlan` adds two codes to `FLOOR_PLAN_ISSUE_CODES` (appended at the end): `zone_outside_grid` (the zone
  sticks out of `grid`) and `zone_overlap` (the zone shares a cell with the zone of an area earlier in the array; the
  issue's key is the later area's). Touching edges are not an overlap. A table's area and its position are not
  cross-checked: a table may stand outside its area's zone.
- [ ] `emptyFloorPlan` gives each starting area `color: order` (0, 1, 2, …) and no zone.

**Pure zone arithmetic** (`src/app/shared/floor-map/floor-zones.util.ts`)
- [ ] `ZONE_COLOR_COUNT = 8`; `colorOf(area)` = `area.color ?? area.order % 8`.
- [ ] `rectFromCells(a, b)` — the rect that spans two cells (inclusive). `cellAtPoint(point, box, grid, dir)` — the cell
  under a client point in a grid's bounding box, mirrored for `rtl`, clamped to the grid. `resizedRect(rect, corner,
  dCells, grid)` — corners `start-start | start-end | end-start | end-end` (block-inline), min 2 × 2, inside the grid.
  `movedRect(rect, dCells, grid)`. `rectsOverlap(a, b)`. `rectInGrid(rect, grid)`. `tableCentreIn(table, rect)` — the
  centre of the table's covered cells (`coveredBy`) lies inside the rect.

**Shared map** (`app-floor-map`, all new inputs default to today's look so the four service screens do not change
except for the zone shapes)
- [ ] Zones layer: for each area with a `zone`, when `showZones` (default true), one `div.floor-map__zone`
  (`data-testid="floor-zone-<key>"`) placed by `grid-column` / `grid-row` like a table, under the tables
  (`z-index: 0`), with `--fm-zone: var(--color-zone-<colorOf>)`: fill `color-mix(in srgb, var(--fm-zone) 12%,
  transparent)`, a 2 px dashed border in `--fm-zone`, radius `--radius-md`, and a label chip `.floor-map__zone-label`
  in its block-start / inline-start corner: the area's name on `--fm-zone`, text `--color-text-on-primary`, `--fs-xs`.
  Zones are not focusable and have `aria-hidden="true"` in read-only screens (the tables carry the meaning).
- [ ] `colorTables` (default false): each table gets `--fm-zone` of its area and its border colour is `--fm-zone`.
  The editor sets it; service screens keep the neutral border.
- [ ] Selection no longer changes the border: a selected table gets `outline: 3px solid var(--color-primary)` with
  `outline-offset: 3px` (the area colour stays visible); `:focus-visible` keeps its own outline in `--border-focus`.
- [ ] `joinedKeys` (default `[]`): those tables get `.is-joined` — border colour `--color-floor-joined`, border width
  3 px — and a `link` icon (`.floor-map__link`, 12 px) in the block-start / inline-start corner; their accessible name
  gets `fp_joined_suffix` ("מחובר") at the end. Order of strength: overlap (danger) > joined > area colour.
- [ ] Zone editing, only when `zoneEditable` (default false):
  - `selectedZoneKey` input: that zone gets a solid border, 20 % fill and four 0.75 rem square handles
    (`.floor-map__handle--<corner>`, `cdkDrag`, `bg-pure` with a 2 px `--fm-zone` border). Dragging a handle emits
    `zoneChanged { areaKey, rect }` with `resizedRect` (pixel distance → cells as `movedCell` does, Directionality-aware);
    dragging the zone body emits `zoneChanged` with `movedRect`. A tap on a zone emits `zoneTapped(areaKey)`
    (zones are buttons with `aria-label` = the area's name while `zoneEditable`).
  - `drawZoneKey` input (area key or null): while set, tables and zones get `pointer-events: none`, the grid gets
    `cursor: crosshair` and `touch-action: none`; pointer down on the grid starts a rect, pointer move draws a preview
    (`.floor-map__zone--draft` in that area's colour), pointer up emits `zoneDrawn { areaKey, rect }`
    (`rectFromCells` of the down and up cells). Escape while drawing cancels the preview and emits nothing.
- [ ] `dimOtherThanArea` stays as an input (no other screen breaks) but the editor stops passing it.

**Editor rules** (`floor-plan-edit.util.ts`)
- [ ] `withZone(plan, areaKey, rect | null)` → `{ plan, movedKeys: string[], droppedJoins: FloorJoin[] } |
  { refused: 'fp_zone_overlap' | 'fp_zone_small' | 'fp_zone_outside' }`. A rect: refused when under 2 × 2, outside the
  grid or overlapping another area's zone; otherwise stored and every table whose centre is in it and whose area is
  another moves into this area through `withTable` (so joins across areas drop). `null`: removes the zone, moves no table.
- [ ] `withTableDropped(plan, key, x, y)` → `{ plan, droppedJoins }`: moves the table; when its centre is then inside
  another area's zone, its `areaKey` becomes that area (through `withTable`).
- [ ] `minGrid` takes `Pick<FloorPlanBody, 'tables' | 'areas'>` and also holds every zone.
- [ ] `withArea` `add` sets `color` to the lowest palette index no area uses (or `order % 8` when all eight are used).

**Editor page (small wiring only; the layout is plan 700)**
- [ ] The page passes `[colorTables]="true"`, `[joinedKeys]="joinedKeys_()"` (a computed of every key in
  `draft.joins[].tableKeys`), and stops passing `dimOtherThanArea`. The area chips keep only "next table's area".
- [ ] `onTableMoved` uses `withTableDropped`; when joins drop, the existing `fp_join_dropped` message with undo shows.

**Tooltip (card ④)**
- [ ] `TipDirective` (`src/app/shared/tip/tip.directive.ts`, standalone, selector `[appTip]`, `appTip = input<string
  | null>()`): on `mouseenter` / `focusin` of the host it creates (once) a `div.c-tip` with `popover="manual"`,
  `role="tooltip"` and a unique id, sets its text, calls `showPopover()`, measures it and places it with
  `placeInViewport({ anchor: host rect, panel: its size, viewport: window size, prefer: 'below' })` (`top` / `left`
  as inline styles in px — position values, not colours); hides on `mouseleave` / `focusout` / Escape / scroll; a
  `click` shows it and hides it after 3000 ms; re-places on `resize`. While shown, the host's `aria-describedby`
  includes the bubble's id. Empty or null text → nothing. The bubble is removed in `DestroyRef.onDestroy`. Signals
  and `inject()` only; no `any`.
- [ ] `.c-tip` bubble look (appended to `src/styles.scss`): `position: fixed; margin: 0`; `inline-size: max-content;
  max-inline-size: min(16rem, calc(100vw - 1rem))`; `padding: var(--space-1) var(--space-2)`; background
  `--color-text-main`, text `--bg-pure`, `--fs-xs`, `--lh-tight`, radius `--radius-sm`, `border: 0`,
  `pointer-events: none`, no animation. Inside the popover top layer it is never clipped by a scroll box.
- [ ] `.c-icon-btn[aria-disabled='true']` looks like `:disabled` (opacity 0.3, `cursor: not-allowed`, no hover
  transform or background) but still receives hover, focus and tap so its tip shows.
- [ ] Room panel: the area remove button drops `[attr.title]` and gets `[appTip]="reasonOf(row.blockedKey) || null"`;
  pressing a blocked button emits nothing (the directive's click shows the tip). The visually hidden reason span and
  its `aria-describedby` stay for screen readers that skip popovers.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL, logical properties only. Zone label at the block-start / inline-start corner = top-right in Hebrew.
- Palette (append to `:root` in `src/styles.scss`, one block): `--color-zone-0: #2563eb` (כחול), `--color-zone-1:
  #c2410c` (כתום), `--color-zone-2: #15803d` (ירוק), `--color-zone-3: #be185d` (ורוד), `--color-zone-4: #a16207`
  (חרדל), `--color-zone-5: #64748b` (אפור), `--color-zone-6: #92400e` (חום), `--color-zone-7: #0369a1` (תכלת);
  `--color-floor-joined: #7c3aed` (סגול, never in the palette). White label text on each measures 4.6:1 or more
  (WCAG AA for small text; checked while drafting: 5.17, 5.18, 5.02, 6.04, 4.92, 4.76, 7.09, 5.93; joined 5.70).
  Teal (`--color-primary`, the selection ring) and red (`--color-danger`, the overlap mark) are kept out of the palette.
- New keys in `public/assets/data/dictionary.json` (append): `fp_joined_suffix` "מחובר", `fp_zone_overlap`
  "אזורים לא יכולים לחפוף", `fp_zone_small` "אזור צריך להיות לפחות 2 על 2 משבצות", `fp_zone_outside`
  "האזור יוצא מגבולות החדר".
- Icons: `link` (registered). No new icon.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Let an area carry a colour and a rectangle in the stored plan, and have the server refuse a zone outside the room or on top of another — the two optional fields, the two issue codes, starting colours — shared/schemas/entities/floor-plan.schema.ts, shared/schemas/front-desk/floor-plan-check.ts, server/test/floor-plan-check.test.js
- [x] A2: Write the zone cell arithmetic as pure tested functions — colorOf, rectFromCells, cellAtPoint (RTL), resizedRect, movedRect, rectsOverlap, rectInGrid, tableCentreIn — src/app/shared/floor-map/floor-zones.util.ts, src/app/shared/floor-map/floor-zones.util.spec.ts
- [x] A3: Add the zone and joined colours and the tooltip look to the shared styles — eight zone tokens and the joined token, the `.c-tip` bubble, the aria-disabled look of `.c-icon-btn` — src/styles.scss
- [x] A3b: Build the shared tooltip that shows at once on hover, focus and tap and never leaves the screen — TipDirective on placeInViewport and the popover top layer — src/app/shared/tip/tip.directive.ts, src/app/shared/tip/tip.directive.spec.ts
- [x] A4: Draw the zones on the shared map and colour the tables — zones layer with labels, colorTables, outline selection, joinedKeys with the link mark — src/app/shared/floor-map/floor-map.component.ts, .html, .scss, .spec.ts
- [x] A5: Let a page draw, move and resize a zone on the map — zoneEditable, selectedZoneKey with four handles, drawZoneKey with the preview and Escape, zoneDrawn / zoneChanged / zoneTapped — src/app/shared/floor-map/floor-map.component.ts, .html, .scss, .spec.ts
- [x] A6: Write the editor rules for zones — withZone (refusals, tables inside join the area), withTableDropped, minGrid with zones, a free colour for a new area — src/app/pages/frontdesk/floor-plan/floor-plan-edit.util.ts, src/app/pages/frontdesk/floor-plan/floor-plan-edit.util.spec.ts
- [x] A7: Wire the editor to the new map — area colours on tables, joined tables marked, no more fading, a dropped table joins the zone it lands in — src/app/pages/frontdesk/floor-plan/floor-plan.page.ts, .html, .spec.ts
- [x] A8: Make the reason a blocked area cannot be removed visible at once — appTip on the bin, title removed — src/app/pages/frontdesk/floor-plan/components/room-panel/room-panel.component.ts, .html, .spec.ts
- [x] A9: Add the Hebrew texts — the four keys of the UI notes — public/assets/data/dictionary.json
- [x] A10: Record the new pieces so later plans find them — the floor-map family entry (new inputs, outputs, the zones util), the new `tooltip` family, the shared folder map, the inventory — docs/brain/component-families.md, src/app/shared/breadcrumbs.md, docs/brain/inventory.md (regenerated with `node scripts/inventory.mjs`)
- [x] A11: Prove the three screen checks with short scripts — each spec signs in with `signInQa`, answers `GET /api/v1/business` with the `tables` module and `GET /api/v1/floor-plan` with its own plan (same shape as plan 684's add-area screen spec), saves a screenshot — e2e/ui/699-1.spec.ts, e2e/ui/699-2.spec.ts, e2e/ui/699-3.spec.ts

## Technical Considerations
- Dependencies: plans 665, 684, 666 (merged on `chore/restaurant-staging`).
- New files: `src/app/shared/floor-map/floor-zones.util.ts`, `.spec.ts`; `src/app/shared/tip/tip.directive.ts`,
  `.spec.ts`; `e2e/ui/699-1…3.spec.ts`.
- Model changes: `floorAreaSchema` gains optional `color` and `zone` (additive; old documents stay valid).
- Backend / API: no route change. `PUT /api/v1/floor-plan` refuses the two new issue codes with the existing 400 shape
  (`checkFloorPlan` already runs there). Run `pnpm run build:schemas` before the server tests (the `test:server` script does).
- Auth and validation: unchanged permissions (`editFrontDesk` to save). The schema bounds the new numbers; the shared
  check bounds the zone to the grid.
- Security surface: none new; guests still get only area key and name (`server/routes/public.js:146`).
- Data / migration: none. A plan with no colours draws areas in `order % 8`.
- Pointer handling: use pointer events on the grid element (`pointerdown` with `setPointerCapture`, `pointermove`,
  `pointerup`, `pointercancel` = cancel) inside the component, no new library; convert with `cellAtPoint` and the
  grid's `getBoundingClientRect()`; RTL from `Directionality` as `onDragEnded` does.
- Project checks: the `log-query` Done-when item; Hebrew RTL and logical CSS; the four keys; `src/styles.scss` appended
  only; `src/app/shared/breadcrumbs.md` in scope; components follow `.claude/skills/angularComponentStructure/SKILL.md`,
  stylesheets `.claude/skills/cssLayer/SKILL.md`; no `any`, single quotes, no semicolons.
- Traps: zones must sit under the tables in the same CSS grid (a grid item with `z-index: 0`, tables `1`) — do not
  absolutely position them, the grid already places cells; `color-mix()` is allowed in a component stylesheet (it is not
  a raw colour) but the colour inside must be a token; the drag reset of `cdkDrag` must also run for handles; the
  service screens must look the same apart from the zone shapes (no table colour, no handles).

## Out of Scope
- The editor's new layout, toolbar, tools, legend, zone inspector (rename, colour picker, typed position), styled
  panels, compact joins list — plan 700.
- Polygons or more than one rectangle per area; walls and decoration; zoom and pan.
- Colouring tables by live state on the service screen.
- Editing `_shared/product-defaults.md` (the Human's file).

## Critical Questions
- none

## Execution Notes
- behaviour: an area's zone is one rectangle in whole cells, at least 2 × 2; an L-shaped room is drawn as two areas (research A1).
- behaviour: zones may not overlap; a draw, move or resize that would overlap is refused with `fp_zone_overlap` and the zone stays as it was (research A7).
- behaviour: a table whose centre lands in a zone — by a drop, or by a zone drawn, moved or resized over it — joins that zone's area; a table is never taken out of its area because it stands outside every zone (research A7).
- behaviour: service screens show the zone shapes (light fill and label) but not the area colour on table borders; the editor shows both (research pattern 3).
- behaviour: a selected table is marked by an outline ring outside it, so its area colour stays visible (research pattern 8).
- behaviour: joined tables have a violet border and a link mark in every screen that passes `joinedKeys`; only the editor passes it in this plan.
- behaviour: tooltips show at once on hover and keyboard focus and for 3 s after a tap, below the control unless there is no room; the native `title` is not used, so no second, late tooltip appears.
- behaviour: the default `hints-in-tooltips` keeps its rule; its `how` line (native title, "no new tooltip piece") is now out of date — the Human updates `_shared/product-defaults.md` to name `[appTip]` (`default` skill), the builder does not.
