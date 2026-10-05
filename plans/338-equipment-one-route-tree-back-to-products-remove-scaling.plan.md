# Plan 338 — Equipment ("ציוד"): one route tree, back-to-products navigation, remove scaling rule from UI

Status: draft
Snapshot: acab8cff39fd0240f67af00439a8bd044c23889e

## Problem Statement

Equipment has three problems: two names, two routes, and no way back to products.

Two route trees for the same screens.
`/equipment/{list,add,edit/:id}` is wrapped by EquipmentPage (`src/app/app.routes.ts:16-38`) with its own `.equipment-nav`.
`/inventory/equipment{,/add,/edit/:id}` (`app.routes.ts:~95-112`) shows the same components.
The tab chip (`tab-chips.component.ts:48`) points to `/equipment`.
Two names. The same screen is called "לוגיסטיקה" (logistics) or "רשימת ציוד" (equipment_list) depending on the URL (`equipment-list.component.html:10`). Dandan chose "ציוד".
No way back to products. The `.control-nav` with `product_list` / `logistics` (`equipment-list.component.html:~286`) only renders under `/inventory/equipment` (`isUnderInventory`). The inventory group in `CHIPS_BY_GROUP` has only the equipment chip.
Scaling rule ("כלל סקלה") is meaningless. It appears in equipment-form (`.form-section.scaling-section`, ~L57-89) and in equipment-list (`.col-scaling` column, `scalingSummary()`, inline edit). Remove it from the UI only. `scalingRule` stays optional in `shared/schemas/entities/equipment.schema.ts` and the field map, because the strict schema would otherwise reject stored docs.

## Goals & Success Criteria

Primary: one URL tree (`/inventory/equipment…`), one name ("ציוד"), and product↔equipment navigation from both screens.
Success: no scaling UI anywhere. Existing equipment with `scalingRule` still saves (no 400).

## Execution Mode

Parallel: yes
Concurrent plans: run after the Header plan (shared tab-chips file). No other plan may touch `src/app/pages/equipment/**` at the same time.
Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

scope
`src/app/pages/equipment/**`
`src/app/core/components/tab-chips/**`
`src/app/core/resolvers/equipment.resolver.ts`
`src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html`
`src/app/core/models/equipment.model.ts`
`e2e/**`

`src/app/app.routes.ts`: this plan replaces the `/equipment` route entry (L16-38) with redirects. That's an approved exception to append-only for that entry.

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

As a chef, I want "ציוד" to mean one screen, and to jump between products and equipment in one tap.
As a chef, I don't want to fill in a scaling rule that does nothing.

## Functional Requirements

### Must Have (P0)

- [ ] Routes: replace the `/equipment` tree with redirects:
  - `equipment` → `inventory/equipment`
  - `equipment/list` → `inventory/equipment`
  - `equipment/add` → `inventory/equipment/add`
  - `equipment/edit/:id` → `inventory/equipment/edit/:id`
  - Old links and bookmarks keep working.
- [ ] Delete `src/app/pages/equipment/equipment.page.{ts,html,scss,spec.ts}` (EquipmentPage, `navRoutes_`, `.equipment-nav`).
- [ ] Remove `isUnderInventory` / `equipmentBasePath` branching in `equipment-list.component.ts` (~L94-99) and `equipment-form.component.ts` (~L180, L194). Always use `['/inventory/equipment']`. Update `equipment.resolver.ts:22` to navigate to `/inventory/equipment`.
- [ ] Tab chips, `CHIPS_BY_GROUP.inventory = [{ id:'products', labelKey:'product_list', icon:'package', path:'/inventory/list' }, { id:'equipment', labelKey:'equipment', icon:'wrench', path:'/inventory/equipment' }]`. Remove the `['/equipment','inventory']` prefix entry (or keep it harmlessly; it now only matches the redirect).
- [ ] Naming: the equipment list title and every nav label use the equipment key ("ציוד"). Replace the `logistics` key usages in `equipment-list.component.html` (L10, ~L291) and `inventory-product-list.component.html:265` with `equipment`. Leave the `logistics` dictionary entry: recipe-builder uses `logistics` as a form group name, not a label.
- [ ] Remove the `.control-nav` product/equipment links from both filter panels (the tab chips replace them).
- [ ] Scaling, UI only:
  - Remove `.scaling-section` and its controls (`scaling_enabled_`, `perGuests`, `minQuantity`, `maxQuantity`), `patchScalingDefaults()`, and the `scalingRule` build in `onSubmit()` from equipment-form.
  - Remove `.col-scaling` (header and body cells), `scalingSummary()`, the inline-edit scaling fields, and the column from the grid template in equipment-list.
  - Edits must preserve an existing `scalingRule` via the spread of the original doc.
- [ ] Mark `Equipment.scalingRule` / `ScalingRule` `@deprecated` in `equipment.model.ts`. Leave `shared/schemas/**` untouched.

### Should Have (P1)

- [ ] Update e2e selectors or URLs that reference `/equipment`.

### Nice to Have (P2)

- None.

## UI/UX Notes

Chip order in RTL: "מוצרים" then "ציוד".
Dictionary: `product_list` and `equipment` already exist; verify `product_list` reads "מוצרים" or "רשימת מוצרים". No new keys expected.

## Atomic Sub-tasks

- [ ] A1: Replace the `/equipment` routes with redirects and delete EquipmentPage.
- [ ] A2: Remove the URL branching in list, form and resolver.
- [ ] A3: Add the two inventory tab chips, and remove the `.control-nav` from the equipment and inventory filter panels.
- [ ] A4: Swap the `logistics` labels for `equipment`.
- [ ] A5: Remove the scaling UI from form and list; deprecate the model fields.
- [ ] A6: Run `rg -n "scaling|isUnderInventory|EquipmentPage|'/equipment" src/app` and clean the leftovers. Build, specs, e2e grep. Update the session-state file.

## Technical Considerations

Dependencies: `EquipmentListComponent`, `EquipmentFormComponent`, `equipmentResolver`, `equipmentEnsureLoadedResolver`, `TabChipsComponent`, `InventoryPage` (parent of `/inventory/equipment`).
New files: none.
Model changes: `@deprecated` JSDoc only.
Schema safety: `equipment.schema.ts` `scalingRule` is `.optional()` inside a `strictObject`. Do not remove it (stored docs would fail `server/utils/schema-check.js` with a 400). Same for `field-map.v1-to-v2.ts:185-188` (migration 0001 would throw).

## Out of Scope

Stripping `scalingRule` from stored data or the schema.
Filter-panel restyle (separate plan).
Any `logistics` usage inside recipe-builder.

## Critical Questions

The second chip is labeled "ציוד". The first chip:
a) "מוצרים" (default)
b) "רשימת מוצרים"

## Success Criteria

- [auto] `rg -n "isUnderInventory|EquipmentPage|scalingSummary|scaling-section" src/app` → no matches.
- [auto] `npx ng test --watch=false --include=src/app/pages/equipment/**/*.spec.ts --include=src/app/core/components/tab-chips/**/*.spec.ts` → 0 failures.
- [auto] `npm run build` → exit 0.
- [human] Header → מלאי: chips "מוצרים" and "ציוד". Tap ציוד → the list titled "ציוד" → tap מוצרים → back to products.
- [human] Visit `/equipment/add` → lands on `/inventory/equipment/add`.
- [human] Add and edit equipment: no "כלל סקלה" section or column. Editing an old item that had a scaling rule saves without error.
