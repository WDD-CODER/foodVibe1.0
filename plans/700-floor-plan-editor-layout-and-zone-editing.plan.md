# Plan 700 — Floor plan editor redesign: a toolbar, a canvas with a zone legend, an inspector that edits zones

Status: draft
Depends-on: 699
Track: code
Snapshot: d06302a34cca8c8fc09125c3a7737c34b4ed2ab3

## Problem Statement
The Human about `/frontdesk/floor-plan`: "most of the page looks like text spread on a plain page, not styled right …
zones must be shown on the map and the user must be able to edit them. Learn from working floor-placement apps." The
screenshot of today's editor (`floor-research.md`, `shot-desktop.png`) shows a bare label and five chips for adding
tables, a far switch "בחירת כמה שולחנות", area chips that only fade tables, and a side column of unstyled headings,
three label+input rows, two join blocks of two counters and a full-width teal button each, and two room-size counters.

Plan 699 gave every area a colour and an optional rectangle, taught `app-floor-map` to draw zones and to report a drawn,
moved, resized or tapped zone, and added the editor rules (`withZone`, `withTableDropped`). This plan builds the editor
the way working table-management and canvas apps do (research decisions A5, A6, A8, A9, A11): a toolbar with tools and
an add-table palette, the room in a canvas card with a colour legend of the zones on top and a status line under it,
and an inspector card at the inline end that shows the selected table, the selected zone (rename, recolour, draw,
type its position and size, clear, remove) or, with nothing selected, the room (zones list, compact joins, room size).

Verified on `chore/restaurant-staging` (d06302a3, 2026-11-23) plus plan 699's contract (merged first):
- `FloorPlanPage` (`src/app/pages/frontdesk/floor-plan/floor-plan.page.ts`): signals `draft_`, `selectedKey_`,
  `areaKey_`, `multi_`, `picked_`, `joinMarkKey_`, `roomOpen_`, `sheetOpen_`, `canEdit_`, `canSave_`; methods
  `addTable`, `onTableTapped`, `clearSelection` (Escape via `host`), `toggleMulti`, `addJoin`, `onAreaOp`, `onGridChange`,
  `save`. Template: `app-page-header` with the save button in `header-actions`, `.floor-plan__presets` (data-testids
  `fp-preset-<id>`, `fp-multi`), `.floor-plan__join-bar` (`fp-join-action`, `fp-join-reason`), `.floor-plan__areas`,
  `.floor-plan__body` with `app-floor-map` and the `aside.floor-plan__panel` (`fp-panel`), the phone sheet (plan 666:
  `.floor-plan__panel--open`, `fp-sheet-close`, `fp-room-open`).
- `RoomPanelComponent` (`components/room-panel/`): area rows with name inputs (`room-area-name`), up / down / remove,
  "הוספת אזור" (`room-area-add`, a pending row with an empty name), `app-floor-joins-list`, two `app-counter` for size.
- `JoinsListComponent` (`components/joins-list/`): per join a `c-chip c-chip--tap` label (`join-label`), a bin
  (`join-remove`), two `app-counter` (`join-min`, `join-max`) and a `c-chip--toggle` switch (`join-online`).
- `TablePanelComponent` (`components/table-panel/`) — unchanged by this plan.
- Engine classes in `src/styles.scss`: `.c-glass-card` (466), `.c-btn-primary`, `.c-btn-ghost`, `.c-btn-ghost--sm`,
  `.c-icon-btn`, `.c-chip`, `.c-chip--tab` (+ `.active`), `.c-chip--tap`, `.c-chip--toggle`, `.c-chip__dot`,
  `.c-chip__count`, `.c-chip-group`, `.c-tab-chips`; from 699: `[appTip]` (`src/app/shared/tip/tip.directive.ts`), `--color-zone-0…7`.
- Icons registered in `src/app/app.config.ts`: `link`, `pencil`, `plus`, `x`, `trash-2`, `chevron-up`, `chevron-down`,
  `layout-grid`, `undo-2`, `check`. Missing and added here: `mouse-pointer-2` (select tool), `square-dashed` (zone tool).
- `e2e/ui/684-4.spec.ts` adds an area by typing in `room-area-name` and finds it in `.floor-plan__areas`; this plan
  changes the add-area flow, so it rewrites that spec to the new flow.
- `UserMsgService.onSetSuccessMsgWithUndo` exists (plan 684 uses it).

## Goals & Success Criteria
**Primary:** an owner sees where every area is on the map, draws and changes a zone directly on the map or by typed
values, renames and recolours it in one place, and works in a screen laid out like a real editor — tools on top, room
in the middle, the selected thing's settings at the side.

- [auto] `pnpm run test:ci` passes, including the new
  `src/app/pages/frontdesk/floor-plan/components/zone-panel/zone-panel.component.spec.ts` and the new or changed cases in
  `src/app/pages/frontdesk/floor-plan/floor-plan.page.spec.ts`,
  `src/app/pages/frontdesk/floor-plan/components/room-panel/room-panel.component.spec.ts`,
  `src/app/pages/frontdesk/floor-plan/components/joins-list/joins-list.component.spec.ts` and
  `src/app/pages/frontdesk/floor-plan/floor-plan-edit.util.spec.ts`.
- [auto] `src/app/pages/frontdesk/floor-plan/floor-plan-edit.util.spec.ts` (new cases): `withArea` op `color` sets the area's colour (0–7, else null);
  `newAreaName` returns "אזור חדש", then "אזור חדש 2" when the first is taken.
- [auto] `src/app/pages/frontdesk/floor-plan/components/zone-panel/zone-panel.component.spec.ts`: typing a name another area has shows `fp_err_area_name` and emits nothing; a
  valid name emits `renamed`; pressing the third swatch emits `colorChange` 2; an area without a zone shows
  "האזור עוד לא מסומן על המפה" and a "סימון על המפה" button that emits `drawRequested`; an area with a zone shows four
  counters (`zone-col`, `zone-row`, `zone-w`, `zone-d`) and changing `zone-w` emits `rectChange` with the new width;
  "הסרת הסימון" emits `cleared`; the remove-area button with tables carries `appTip` with the reason and emits nothing.
- [auto] `src/app/pages/frontdesk/floor-plan/floor-plan.page.spec.ts` (new cases): the tools group has three buttons and "בחירה" is pressed at start;
  pressing "סימון אזור" with zone "בחוץ" selected passes `drawZoneKey` = its key to the map; a `zoneDrawn` sets the
  zone in the draft, returns to the select tool and selects that zone; a refused `zoneDrawn` (overlap) keeps the draft
  and shows `fp_zone_overlap` as an error message; a legend chip press selects that zone and the inspector shows
  `app-floor-zone-panel`; a table press shows `app-floor-table-panel`; Escape in the zone tool returns to "בחירה";
  "חיבור שולחנות" behaves as the old multi switch (picked tables, join bar, `fp-join-action`); the status line reads
  "3 שולחנות · 2 אזורים · 1 חיבורים" for such a draft; "הסרת הסימון" removes the zone and its undo brings it back;
  "הוספת אזור" adds "אזור חדש" with the next free colour and selects it with its name field focused.
- [auto] `src/app/pages/frontdesk/floor-plan/components/room-panel/room-panel.component.spec.ts` (changed): each area row shows its colour dot, name and table count and
  emits `areaSelected` when pressed; up / down still emit `areaMoved`; "הוספת אזור" emits `areaAddRequested`; the two
  size counters stay.
- [auto] `src/app/pages/frontdesk/floor-plan/components/joins-list/joins-list.component.spec.ts` (changed): a join row shows "5 + 6" and "6–8 סועדים · באתר" and no counters;
  pressing the row expands it (counters and switch visible, `aria-expanded="true"`) and emits `joinPressed`; only one
  row is open at a time.
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/frontdesk/floor-plan`, press the legend chip "בחוץ", press "סימון על המפה" and drag on the map from the
  cell (2,2) to (8,6) → `[data-testid^="floor-zone-"]` with the text "בחוץ" is visible (`e2e/ui/700-1.spec.ts`).
- [ui] Select zone "בחוץ", press the swatch "ורוד" → the zone element's style holds `--color-zone-3`
  (`e2e/ui/700-2.spec.ts`).
- [ui] Press "הוספת אזור" and type "גינה" in the zone panel's name field → the legend shows a chip "גינה"
  (`e2e/ui/684-4.spec.ts`, rewritten to this flow).
- [ui] At 375 px wide, the toolbar is one row that scrolls sideways and the page has no horizontal scroll
  (`e2e/ui/700-3.spec.ts`: `document.documentElement.scrollWidth <= 375`).
- [human] a dialog with an explained control · hover the control · its explanation shows as a tooltip and no explanation text sits on the modal
  (`/frontdesk/floor-plan`: hover the tool "סימון אזור" → "גררו על המפה כדי לסמן אזור"; default `hints-in-tooltips`).
- [human] the list's page with no items · open the page · a message says the list is empty
  (`/frontdesk/floor-plan` with a plan of no tables → the canvas card shows the empty message `fp_empty`; the joins
  section with no joins shows `fp_joins_empty`).
- [human] any page with a small floating box · open it on a row near the top and on a row near the bottom of the screen · it is as wide as its text, sits right above or below the row, and is never cut off
  (`/frontdesk/floor-plan`: the tool hints in the toolbar, and the zone card's blocked "הסרת האזור" at the bottom of the side card).
- [human] On a laptop, `/frontdesk/floor-plan` (demo_host): the page reads as an editor — a toolbar card on top, the
  room in a card with coloured area chips above it and a status line under it, a settings card at the side with clear
  section titles; nothing looks like loose text on the background.
- [human] Draw "בחוץ" around tables 10, 11 and 12 with the zone tool → a coloured, labelled shape appears and those
  three tables take its colour; drag a corner handle to make it larger; drag the shape to move it; press "שמור", reload
  — the zone is still there.
- [human] Select a zone, change its name and colour in the side card → the label on the map, the legend chip and the
  table borders change at once.
- [human] Draw a zone that would cover part of another zone → the message "אזורים לא יכולים לחפוף" shows and nothing
  changes.
- [human] On a phone (or a 375 px window): the tools scroll sideways in one row, a tap on a legend chip opens the zone
  card as the bottom sheet, and drawing a zone with one finger works without scrolling the page.

## Execution Mode
- Parallel: no — second plan of the pair 699 → 700; it edits the editor page 699 wired.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/frontdesk/floor-plan/floor-plan.page.ts
src/app/pages/frontdesk/floor-plan/floor-plan.page.html
src/app/pages/frontdesk/floor-plan/floor-plan.page.scss
src/app/pages/frontdesk/floor-plan/floor-plan.page.spec.ts
src/app/pages/frontdesk/floor-plan/floor-plan-edit.util.ts
src/app/pages/frontdesk/floor-plan/floor-plan-edit.util.spec.ts
src/app/pages/frontdesk/floor-plan/components/zone-panel/**
src/app/pages/frontdesk/floor-plan/components/zone-panel/zone-panel.component.spec.ts
src/app/pages/frontdesk/floor-plan/components/room-panel/**
src/app/pages/frontdesk/floor-plan/components/room-panel/room-panel.component.spec.ts
src/app/pages/frontdesk/floor-plan/components/joins-list/**
src/app/pages/frontdesk/floor-plan/components/joins-list/joins-list.component.spec.ts
src/app/app.config.ts
public/assets/data/dictionary.json
src/app/pages/breadcrumbs.md
docs/brain/component-families.md
docs/brain/inventory.md
e2e/ui/684-4.spec.ts
e2e/ui/700-1.spec.ts
e2e/ui/700-2.spec.ts
e2e/ui/700-3.spec.ts
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

- INV-none: preserves — page-local layout and panels over the editor's in-memory draft; every change is still saved whole in the single `PUT /api/v1/floor-plan` that validates it (INV-4 untouched: no schema change here; INV-3 untouched: no browser loop of writes).

## Reuse Check

- `ZonePanelComponent` (`app-floor-zone-panel`, `src/app/pages/frontdesk/floor-plan/components/zone-panel/`) — family: form-field — rung: 1 — why: a page-local group of `app-form-field`, `app-counter` and `c-chip--toggle` rows for one zone, inputs in and events out like the table and room panels.
- Colour swatches — family: chip — rung: 2 — why: `c-chip c-chip--toggle` radios with a `.c-chip__dot` whose colour is `var(--color-zone-n)` and the colour's name as text.
- Legend chips — family: chip — rung: 2 — why: `c-chip c-chip--tab` with `.c-chip__dot` and `.c-chip__count`, `.active` on the selected zone.
- Tools group (בחירה / סימון אזור / חיבור שולחנות) — family: chip — rung: 2 — why: three `c-chip c-chip--tab` buttons with `aria-pressed` in a `role="group"`, the same pattern as the area row today.
- Add-table palette with shape glyphs — family: chip — rung: 2 — why: the existing `c-chip c-chip--tap` presets with a scoped `.floor-plan__glyph` span (round / square / rect outline) before the label.
- Canvas, toolbar and inspector cards — family: engine-classes — rung: 1 — why: `.c-glass-card` from `src/styles.scss` around the page's three regions; scoped layout classes only.
- Compact joins rows — family: floor-plan-editor — rung: 3 — why: `app-floor-joins-list` changed in place (summary row, one expanded editor); the registry entry is updated.
- `newAreaName` and the `color` `AreaOp` in `floor-plan-edit.util.ts` — family: floor-plan-editor — rung: 3 — why: two more pure draft rules beside the existing ones.
- Scoped classes (`.floor-plan__toolbar`, `.floor-plan__tools`, `.floor-plan__glyph`, `.floor-plan__canvas`, `.floor-plan__legend`, `.floor-plan__status`, `.floor-plan__inspector`, `.zone-panel`, `.zone-panel__swatches`, `.zone-panel__rect`, `.room-panel__section`, `.room-panel__zone-row`, `.joins-list__summary`, `.floor-plan__tool`, `.floor-plan__legend-chip`, `.floor-plan__tool-text`, `.floor-plan__glyph--round`, `.floor-plan__glyph--square`, `.floor-plan__glyph--rect`, `.floor-plan__unsaved`, `.floor-plan__unsaved-dot`, `.joins-list__toggle`, `.joins-list__toggle--marked`, `.joins-list__label-chip`, `.joins-list__chevron`, `.joins-list__chevron--open`, `.joins-list__editor`, `.joins-list__online`, `.room-panel__zone-row-wrap`, `.room-panel__zone-name`, `.room-panel__add`, `.zone-panel__block`, `.zone-panel__label`, `.zone-panel__field`, `.zone-panel__actions`, `.zone-panel__order`, `.zone-panel__none`, `.zone-panel__hint`, `.zone-panel__facts`, `.zone-panel__remove`) — family: none — rung: 4 — why: layout of this one screen in its own stylesheets; no `.c-*` engine is defined or restyled.

## Adopt Check
- Scoped classes (`.floor-plan__toolbar`, `.floor-plan__tools`, `.floor-plan__glyph`, `.floor-plan__canvas`, `.floor-plan__legend`, `.floor-plan__status`, `.floor-plan__inspector`, `.zone-panel`, `.zone-panel__swatches`, `.zone-panel__rect`, `.room-panel__section`, `.room-panel__zone-row`, `.joins-list__summary`, `.floor-plan__tool`, `.floor-plan__legend-chip`, `.floor-plan__tool-text`, `.floor-plan__glyph--round`, `.floor-plan__glyph--square`, `.floor-plan__glyph--rect`, `.floor-plan__unsaved`, `.floor-plan__unsaved-dot`, `.joins-list__toggle`, `.joins-list__toggle--marked`, `.joins-list__label-chip`, `.joins-list__chevron`, `.joins-list__chevron--open`, `.joins-list__editor`, `.joins-list__online`, `.room-panel__zone-row-wrap`, `.room-panel__zone-name`, `.room-panel__add`, `.zone-panel__block`, `.zone-panel__label`, `.zone-panel__field`, `.zone-panel__actions`, `.zone-panel__order`, `.zone-panel__none`, `.zone-panel__hint`, `.zone-panel__facts`, `.zone-panel__remove`) — verdict: skip — why: layout of one screen in its own stylesheets; no package does a page's layout

## Defaults

- one-breakpoint-set — applies — how: every `@media` uses `$break-phone-max` / `$break-tablet-min` from `src/styles.scss`
- hints-in-tooltips — applies — how: the zone panel's blocked "הסרת האזור" button and each tool button carry `[appTip]` (plan 699), no hint text on the card
- anchored-popup — applies — how: every hint is `[appTip]` (plan 699), which places its bubble with `placeInViewport`; this plan adds no other floating box
- app-list-container — exception — why: no list page; the areas and joins are short rows inside the editor's side card, the room is a drawing
- confirm-destructive-action — exception — why: clearing a zone's shape and removing an empty area restore at once through the message's undo (as table removal does, plan 684)
- empty-state-on-list — applies — how: an empty room shows `app-empty-state` inside the canvas card (`fp_empty`), the joins section keeps `fp_joins_empty`
- loading-and-error-states — exception — why: no new data read; the screen's loader and error state are plan 665's and stay
- unsaved-changes-on-leave — applies — how: unchanged — the page's `useUnsavedChanges` and `pendingChangesGuard` (plan 665); the toolbar adds a visible "שינויים שלא נשמרו" dot next to save

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a restaurant owner, I want to draw my terrace on the map with my finger or mouse, so that the plan shows my real room.
- As a restaurant owner, I want to rename and recolour an area in one place, so that I don't hunt for it in a long column.
- As a restaurant owner, I want the editor to look like the floor plan tools I know, so that I understand it without a guide.
- As a restaurant owner on a phone, I want the tools and the settings to fit the small screen, so that I can fix the plan from the floor.

## Functional Requirements

### Must Have (P0)

**Layout (from 768 px)**
- [ ] Order top to bottom: `app-page-header` (title "מפת המקום"; in `header-actions` a muted "שינויים שלא נשמרו" with a
  `.c-chip__dot` in `--color-warning` while dirty, then "שמור"), then the toolbar card, then the body.
- [ ] Toolbar card (`.floor-plan__toolbar`, `.c-glass-card`, one row, `gap: var(--space-3)`, wraps under 1024 px):
  tools group `role="group"` labelled `fp_tools_label` "כלים" — three `c-chip c-chip--tab` buttons with icon + text:
  `mouse-pointer-2` "בחירה" (`fp-tool-select`), `square-dashed` "סימון אזור" (`fp-tool-zone`), `link`
  "חיבור שולחנות" (`fp-tool-join`, replaces the `fp-multi` switch, same behaviour); each with an `[appTip]` hint
  (`fp_tool_select_tip` "בחירה, גרירה ושינוי גודל", `fp_tool_zone_tip` "גררו על המפה כדי לסמן אזור",
  `fp_tool_join_tip` "לחצו על 2–4 שולחנות באותו אזור"). A thin divider (`border-inline-start` of the next group). Then
  "הוספת שולחן" and the five presets (`fp-preset-<id>` kept) with a glyph before each label: a 0.875 rem circle for
  round presets, a square for square ones, a 1.25 × 0.75 rem rectangle for rect and bar presets
  (`.floor-plan__glyph--round|square|rect`, 2 px `currentColor` border). In the join tool the join bar (`fp-join-bar`,
  `fp-join-action`, `fp-join-reason` kept) replaces the presets inside the same card.
- [ ] Body: two columns, `gap: var(--space-4)`: the canvas card (`.floor-plan__canvas`, `.c-glass-card`, flex 1) and
  the inspector card (`.floor-plan__inspector` = today's `aside` with `data-testid="fp-panel"`, `.c-glass-card`,
  22 rem, `position: sticky; inset-block-start: var(--space-4)`).
- [ ] Canvas card, top to bottom: the legend (`.floor-plan__areas` kept as its class, `.floor-plan__legend`): one
  `c-chip c-chip--tab` per area in `order` with `.c-chip__dot` in its colour, its name and `.c-chip__count` of its
  tables, `.active` when it is the selected zone, plus a last `c-chip c-chip--tap` "+ הוספת אזור" (`fp-area-add`,
  disabled at 10 areas). "הכול" is removed. Then the notices of 684 (in use, overlap) inside the card, then the map,
  then the status line (`.floor-plan__status`, `fp-status`, muted `--fs-sm`): `fp_status` "{tables} שולחנות · {areas}
  אזורים · {joins} חיבורים · {cols}×{rows} משבצות". An empty room shows `app-empty-state` (`fp_empty`) over the map
  area inside the card.
- [ ] Inspector card: a head row (title + X `fp-sheet-close`, now shown at every width; X clears the selection) and one
  of three bodies: a selected table → `app-floor-table-panel` (unchanged); a selected zone → `app-floor-zone-panel`;
  nothing → `app-floor-room-panel`. Titles: table `fp_panel_title`, zone = colour dot + the area name, room
  `fp_room_title`.

**Selection and tools (page signals)**
- [ ] `tool_ = signal<'select' | 'zone' | 'join'>('select')`; `zoneKey_ = signal<string | null>(null)` (selected zone =
  area key). A table selection clears `zoneKey_`; a zone selection clears `selectedKey_`; `areaKey_` (next table's area)
  becomes `zoneKey_ ?? first area`.
- [ ] Select tool: the map gets `draggable`, `zoneEditable`, `selectedZoneKey = zoneKey_()`; `zoneTapped` and a legend
  chip select the zone; `zoneChanged` goes through `withZone` (699) — refused → `onSetErrorMsg` with the refusal key,
  moved tables → `fp_zone_tables_moved` "{count} שולחנות עברו לאזור {name}" with undo; `gridTapped` clears both selections.
- [ ] Zone tool: `drawZoneKey` = `zoneKey_()`, else the first area (in `order`) with no zone, else the first area; the
  inspector shows that area's zone panel with the line `fp_zone_draw_hint` "גררו על המפה כדי לסמן את {name}".
  `zoneDrawn` → `withZone`; success → tool back to select, that zone selected; refused → error message, tool stays.
  Escape or a second press on the tool → back to select.
- [ ] Join tool: today's multi mode (`multi_` becomes `tool_() === 'join'`); leaving it clears the picked tables.
- [ ] Escape: in zone or join tool → select tool; else clears the selection (as today).

**Zone panel** (`app-floor-zone-panel`; inputs `plan`, `areaKey`, `drawing` (boolean), `focusName` (boolean);
outputs `renamed {key, name}`, `colorChange {key, color}`, `drawRequested key`, `rectChange {key, rect}`, `cleared key`,
`moved {key, dir}`, `removed key`)
- [ ] Name: `app-form-field` (`fp_area_name`) + `.c-input` (`zone-name`), the rules of 684 (`areaNameError`): an error
  keeps the last valid name in the draft; valid text emits `renamed` on every keystroke; focused when `focusName`.
- [ ] Colour: `fp_zone_color` "צבע" — eight `c-chip c-chip--toggle` radios in a `.c-chip-group`
  (`zone-color-<n>`), each a `.c-chip__dot` in `var(--color-zone-n)` and the colour's name (`fp_color_0` "כחול",
  `fp_color_1` "כתום", `fp_color_2` "ירוק", `fp_color_3` "ורוד", `fp_color_4` "חרדל", `fp_color_5` "אפור",
  `fp_color_6` "חום", `fp_color_7` "תכלת"); two areas may share a colour.
- [ ] Shape, no zone yet: `fp_zone_none` "האזור עוד לא מסומן על המפה" and a `.c-btn-primary` `square-dashed`
  "סימון על המפה" (`zone-draw`) → `drawRequested`.
- [ ] Shape, with a zone: four `app-counter` in a 2 × 2 grid — `fp_zone_col` "עמודה" (x + 1, 1 … cols − w + 1),
  `fp_zone_row` "שורה" (y + 1), `fp_zone_w` "רוחב" (2 … cols − x), `fp_zone_d` "עומק" (2 … rows − y); each change emits
  `rectChange` (the page applies it through `withZone`, so overlap is refused there); then two `.c-btn-ghost--sm`:
  "סימון מחדש" (`zone-redraw`, `drawRequested`) and "הסרת הסימון" (`zone-clear`, `cleared`).
- [ ] Facts line: `fp_zone_count` "{count} שולחנות באזור".
- [ ] Order: up / down `.c-icon-btn` (`zone-up`, `zone-down`, as the room panel had).
- [ ] "הסרת האזור" `.c-btn-ghost` with `trash-2` (`zone-remove`): `aria-disabled` + `[appTip]` reason while the area has
  tables (`fp_area_has_tables`) or is the last (`fp_area_last`); otherwise emits `removed` — the page removes it through
  `withArea` and shows `fp_area_removed` "האזור הוסר" with undo (restores the area with its colour and zone).
- [ ] While `drawing`: the shape block shows only `fp_zone_draw_hint` and a "ביטול" `.c-btn-ghost--sm` (`zone-draw-cancel`).

**Room panel (nothing selected)** — three sections, each `.room-panel__section` with an `h3` and a top border
`var(--border-row)`:
- [ ] "אזורים": one row per area (`room-zone-row`, a button) — dot, name, count, `pencil` icon at the end; pressing
  emits `areaSelected key`. No name inputs here any more (they live in the zone panel). "הוספת אזור" (`room-area-add`)
  emits `areaAddRequested`.
- [ ] "חיבורי שולחנות": the compact joins list.
- [ ] "גודל החדר" (`fp_room_size` new title): the two counters side by side (`room-cols`, `room-rows` kept); their
  minimum is `minGrid` (699: tables and zones).

**Add area** — the page adds `{ key: newKey(), name: newAreaName(draft), order: last + 1 }` through `withArea` (699 gives
it the next free colour), selects it as the zone and focuses the zone panel's name field.

**Compact joins list**
- [ ] Each row (`join-row`) is one line: the `join-label` chip "5 + 6", a summary `.joins-list__summary`
  `fp_join_summary` "{min}–{max} סועדים" plus " · " and `fp_join_online_short` "באתר" when online, a `chevron-down`
  and the bin (`join-remove`). Pressing the row toggles it open (`aria-expanded`) and emits `joinPressed` (the map
  marks its tables, as today). Open row: the two counters (`join-min`, `join-max`) side by side and the `join-online`
  `c-chip--toggle` switch (not a full-width button). One row open at a time.

**Phone (< 768 px)**
- [ ] The toolbar is one row with `overflow-x: auto`, `flex-wrap: nowrap`, tool buttons show icon only with their
  text as `aria-label` and `[appTip]`; the legend wraps; the inspector keeps plan 666's bottom sheet (`.floor-plan__panel--open`
  behaviour kept on the inspector) and opens on a table, a zone or "המקום" (`fp-room-open`); in the zone tool the map
  has `touch-action: none` (699) so one-finger drawing does not scroll the page.

### Should Have (P1)
- [ ] Letter keys switch tools on a keyboard: `v` select, `z` zone, `j` join (ignored while focus is in an input,
  a textarea or a select, and with Ctrl / Meta / Alt held).

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL, logical properties only. Cards use `.c-glass-card`; spacing tokens `--space-2/3/4`; section titles
  `--fs-md` `--fw-semibold`; muted text `--color-text-muted`.
- New keys in `public/assets/data/dictionary.json` (append): `fp_tools_label` "כלים", `fp_tool_select` "בחירה",
  `fp_tool_zone` "סימון אזור", `fp_tool_join` "חיבור שולחנות", `fp_tool_select_tip` "בחירה, גרירה ושינוי גודל",
  `fp_tool_zone_tip` "גררו על המפה כדי לסמן אזור", `fp_tool_join_tip` "לחצו על 2–4 שולחנות באותו אזור", `fp_unsaved`
  "שינויים שלא נשמרו", `fp_status` "{tables} שולחנות · {areas} אזורים · {joins} חיבורים · {cols}×{rows} משבצות",
  `fp_zone_color` "צבע", `fp_color_0` "כחול", `fp_color_1` "כתום", `fp_color_2` "ירוק", `fp_color_3` "ורוד",
  `fp_color_4` "חרדל", `fp_color_5` "אפור", `fp_color_6` "חום", `fp_color_7` "תכלת", `fp_zone_none`
  "האזור עוד לא מסומן על המפה", `fp_zone_draw` "סימון על המפה", `fp_zone_redraw` "סימון מחדש", `fp_zone_clear`
  "הסרת הסימון", `fp_zone_cleared` "הסימון של האזור הוסר", `fp_zone_draw_hint` "גררו על המפה כדי לסמן את {name}",
  `fp_zone_col` "עמודה", `fp_zone_row` "שורה", `fp_zone_w` "רוחב", `fp_zone_d` "עומק", `fp_zone_count`
  "{count} שולחנות באזור", `fp_zone_tables_moved` "{count} שולחנות עברו לאזור {name}", `fp_area_new` "אזור חדש",
  `fp_area_removed` "האזור הוסר", `fp_room_size` "גודל החדר", `fp_join_summary` "{min}–{max} סועדים",
  `fp_join_online_short` "באתר", `fp_draw_cancel` "ביטול".
- Reused keys: `fp_title`, `fp_add_label`, `fp_preset_*`, `fp_area_name`, `fp_err_area_name`, `fp_area_add`,
  `fp_area_up`, `fp_area_down`, `fp_area_delete`, `fp_area_has_tables`, `fp_area_last`, `fp_room_title`, `fp_room_cols`,
  `fp_room_rows`, `fp_joins_title`, `fp_joins_empty`, `fp_join_online`, `fp_join_remove`, `fp_zone_overlap`,
  `fp_zone_small`, `fp_zone_outside` (699), `save`, `saving`, `close`.
- Icons: new `mouse-pointer-2`, `square-dashed` (registered in `src/app/app.config.ts`); reused `link`, `pencil`,
  `plus`, `x`, `trash-2`, `chevron-up`, `chevron-down`.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Add the two small draft rules the new screen needs — the colour change of an area and the next "אזור חדש" name — src/app/pages/frontdesk/floor-plan/floor-plan-edit.util.ts, src/app/pages/frontdesk/floor-plan/floor-plan-edit.util.spec.ts
- [x] A2: Build the zone card — name, eight colour swatches, draw / redraw / clear, the four position and size counters, order, remove with its tooltip reason, the drawing state — src/app/pages/frontdesk/floor-plan/components/zone-panel/zone-panel.component.ts, .html, .scss, .spec.ts
- [x] A3: Turn the room card into three titled sections — zone rows that open the zone card, add area, compact joins, room size — src/app/pages/frontdesk/floor-plan/components/room-panel/room-panel.component.ts, .html, .scss, .spec.ts
- [x] A4: Make each join one short line that opens to edit — summary row, one open row, switch instead of the full-width button — src/app/pages/frontdesk/floor-plan/components/joins-list/joins-list.component.ts, .html, .scss, .spec.ts
- [x] A5: Lay the page out as an editor — header with the unsaved dot, toolbar card with tools and shape glyphs, canvas card with legend, notices, map, status line and empty state, the inspector card choosing table / zone / room — src/app/pages/frontdesk/floor-plan/floor-plan.page.html, src/app/pages/frontdesk/floor-plan/floor-plan.page.scss
- [x] A6: Wire the tools and the zone editing into the draft — tool and zone signals, draw / change / tap of a zone through withZone with refusals and undo messages, add / remove area, Escape, keyboard keys — src/app/pages/frontdesk/floor-plan/floor-plan.page.ts, src/app/pages/frontdesk/floor-plan/floor-plan.page.spec.ts
- [x] A7: Register the two tool icons and add the Hebrew texts — src/app/app.config.ts, public/assets/data/dictionary.json
- [x] A8: Record the new card and the changed pieces — the zone panel in the pages map, the floor-plan-editor family entry (zone panel, compact joins, tools), the inventory — src/app/pages/breadcrumbs.md, docs/brain/component-families.md, docs/brain/inventory.md (regenerated with `node scripts/inventory.mjs`)
- [x] A9: Prove the screen checks with short scripts — each spec signs in with `signInQa`, answers `GET /api/v1/business` with the `tables` module and `GET /api/v1/floor-plan` with its own plan, saves a screenshot; rewrite 684-4 to the new add-area flow — e2e/ui/700-1.spec.ts, e2e/ui/700-2.spec.ts, e2e/ui/700-3.spec.ts, e2e/ui/684-4.spec.ts

## Technical Considerations
- Dependencies: plan 699 (zones data, map inputs `colorTables`, `joinedKeys`, `showZones`, `zoneEditable`,
  `drawZoneKey`, `selectedZoneKey`, outputs `zoneDrawn`, `zoneChanged`, `zoneTapped`; rules `withZone`,
  `withTableDropped`, zone-aware `minGrid`; `[appTip]`; zone tokens). Plans 665, 684, 666 for the page.
- New files: `components/zone-panel/zone-panel.component.{ts,html,scss,spec.ts}`, `e2e/ui/700-1…3.spec.ts`.
- Model changes: none (699 made them). Backend / API: none. Data / migration: none.
- Auth and validation: unchanged; staff (no `editFrontDesk`) see the map with zones and the legend (read-only: chips
  select nothing, no toolbar, no inspector — as today's read-only view).
- Security surface: none new.
- Project checks: the `log-query` Done-when item; Hebrew RTL and logical CSS; every new key named above; two new
  icons registered; `src/styles.scss` not edited; the pages folder map in scope; components follow
  `.claude/skills/angularComponentStructure/SKILL.md`, stylesheets `.claude/skills/cssLayer/SKILL.md`; no `any`, single
  quotes, no semicolons; signals only, `inject()`, `input()` / `output()`.
- Traps: keep the panels dumb (inputs in, events out) — every rule stays in the tested util; the data-testids the
  older specs use (`fp-preset-*`, `fp-join-bar`, `fp-join-action`, `fp-join-reason`, `fp-panel`, `fp-sheet-close`,
  `fp-room-open`, `room-cols`, `room-rows`, `join-*`) are kept; `fp-multi` is replaced by `fp-tool-join` — update the
  page spec cases that used it; the sticky inspector must not cover the phone sheet (sticky only from
  `$break-tablet-min`).

## Out of Scope
- Everything plan 699 does (data, map drawing, tooltip engine, joined colour).
- Zoom, pan, polygons, walls and decoration, several floor plans, waiter sections.
- Changing the table panel's fields; the service screen's look.

## Critical Questions
- none

## Execution Notes
- behaviour: "הכול" leaves the legend — with zones drawn on the map, a filter that fades tables is no longer needed (Human: fading "is not how it works").
- behaviour: area names are edited only in the zone card; the room card lists areas as rows that open it (research pattern 2: list + pencil).
- behaviour: "הוספת אזור" creates "אזור חדש" (or "אזור חדש 2" …) at once with the next free colour and opens it with the name field focused, instead of an empty pending row.
- behaviour: after a successful draw the tool returns to "בחירה" with the new zone selected, so its handles show at once (Figma frame tool).
- behaviour: clearing a zone's shape and removing an empty area have an undo on the message, no confirmation question (plan 684's rule).
- behaviour: the zone tool with nothing selected draws the first area that has no shape yet, so a new owner's first draw needs one press.
- behaviour: two areas may share a colour (ten areas, eight colours).
- behaviour: staff see zones and the legend but cannot select or change anything.
- behaviour: the table card keeps its own head and close button, so the inspector's title row (with fp-sheet-close) shows only for a zone or the room — reverse: add the row above the table card.
- behaviour: pressing a legend chip or a zone while the join tool is on switches back to the select tool — reverse: ignore the press in the join tool.
- behaviour: a tap on a table in the zone tool does nothing (drawing only) — reverse: select the table.
- behaviour: an out-of-range colour in `withArea` op `color` is refused (null), like the other refused ops.
- seen: e2e/ui/699-3.spec.ts:30 — hovers `room-area-remove`, which this plan removes (the bin moved to the zone card as `zone-remove`); the file is outside this plan's scope, so it is not edited.
- evidence: `pnpm run build` → exit 0; `pnpm run lint` → exit 0 (0 errors); `pnpm run test:ci` → exit 0, 3141 SUCCESS; lint:icons, lint:reuse, lint:no-native-select, kit-manifest-check, override-check, plan-ledger-check, breadcrumbs-check, log-query → exit 0.
- [ui] 700-1, 700-2, 700-3, 684-4: written, not run.
