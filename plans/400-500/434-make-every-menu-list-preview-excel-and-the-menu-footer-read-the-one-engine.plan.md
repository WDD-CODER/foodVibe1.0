# Plan 434 — Make every menu list, preview, Excel and the menu footer read the one engine

Status: done
Snapshot: 8ffda3d2c4d8f3ab5137bfee30e9d80026d28110
Track: code

## Problem Statement
Plan 433 builds the quantity and cost engine, but no screen reads it yet. The menu's shopping list is still built
three times in `menu-export.service.ts` — `exportMenuShoppingList`, `getMenuShoppingListPreviewPayload`,
`addMenuShoppingListSheetToWorkbook` — each with flat `ScalingService.getScaledIngredients`, name+unit merging and
`RecipeCostService.getCostForIngredient`. The menu footer total (`eventCost_` → `MenuIntelligenceService.computeEventIngredientCost`),
each dish row's cost (`getAutoFoodCost` in the page and in `menu-dish-row`), the cost on recipe pick
(`selectRecipe`), the "All" view (`getMenuAllViewPreviewPayload`, which re-derives portions with
`piecesPerPerson ?? 1`) and the menu library's food-cost % each compute on their own, so the chef sees different
numbers on screen, in the preview and in Excel. A prep inside a dish shows as "הכנות" instead of its oil and lemon.

## Goals & Success Criteria
- Primary: every menu number — footer, dish rows, "All" view, shopping list preview, shopping-list Excel, the
  all-together Excel and the library food-cost % — comes from `EventPlanService` (plan 433), and the 3 shopping-list
  copies are replaced by one table builder.

Done when:
- [x] [auto] `npx ng build` exits 0.
- [x] [auto] `npx ng test --watch=false --include='src/app/core/utils/shopping-list-table.util.spec.ts' --include='src/app/core/services/export.service.spec.ts' --include='src/app/core/services/menu-intelligence.service.spec.ts' --include='src/app/core/engine/**/*.spec.ts'`
  passes (0 failures), including:
  - `buildShoppingListTable` on the 04.1 fixture plan (`buildFixtureInput()` from plan 433): exactly one tomato row
    (qty to buy 18.75, unit `ק"ג`, purchase units `2 ארגז`, line total 93.75), olive oil 1.6 `ק"ג` 64.00, lemon
    0.4 `ק"ג` with an empty line total, no row named "רוטב", total row 157.75 with the `partial_total` label.
  - A plan with an unlinked row → its row sits under the `line_status_unlinked` group, never merged with the linked
    product of the same name; a `no_conversion` row carries the `line_status_no_conversion` note; a cycle error →
    the table's `notes` contains the `engine_error_cycle` text with the prep name.
  - `ExportService.getMenuShoppingListPreviewPayload` (with a stub `EventPlanService` returning the fixture plan)
    returns exactly the table's rows plus the total row — same values the Excel path writes.
  - `MenuIntelligenceService.computeEventIngredientCost(event)` returns the stub plan's `eventFoodCost` (157.75).
- [x] [auto] `git diff --numstat origin/mvp...HEAD -- src/app/pages/menu-intelligence/menu-intelligence.page.ts src/app/core/services/menu-export.service.ts`
  shows added ≤ deleted for both files (growth-frozen, `_shared/tech-stack.md`).
- [x] [auto] `git grep -n "getScaledIngredients\|getCostForIngredient" -- src/app/core/services/menu-export.service.ts` → no output.
- [x] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Desktop, menu with a dish that uses a prep: the shopping list shows the prep's own products, not the
  prep, and the footer total equals the shopping list's total row and the Excel total (card ①–③ below).
- [human] Mobile (phone width): the same menu's shopping list preview is readable and its total equals the footer.

Human checks (written for the hand-off cards):
1. **Prep ingredients reach the list** — `/menu-intelligence/<id of a menu with a dish that contains a prep>` →
   FAB "צ׳קליסט והדפסות" → רשימת קניות → תצוגה. SEE ✓ the prep's products (e.g. שמן זית, לימון) appear as rows; no
   row named after the prep. FAIL ✗ a row named after the prep, or its products missing.
2. **One line per product** — same preview. SEE ✓ a product used by two dishes appears once, with the summed amount.
3. **Same total everywhere** — note the footer "עלות כוללת"; in the preview read the last row "סה״כ"; then ייצוא and
   open the Excel. SEE ✓ the three numbers are equal (₪, 2 decimals).
4. **Phone** — repeat 1 and 3 at phone width. SEE ✓ same rows and total, nothing cut off.
SETUP when no such menu exists: create prep "רוטב" (yield 1 ק"ג: 800 גרם שמן זית, 0.2 ק"ג לימון), dish "סלט" (10 מנות:
500 גרם עגבנייה, 200 גרם רוטב), a menu with סלט for 100 guests × 1 portion → expected עגבנייה 6.25 ק"ג to buy when
tomato's waste factor is 0.8, שמן זית 1.6 ק"ג, לימון 0.4 ק"ג.

## Execution Mode
- Parallel: no — `menu-intelligence.page.ts` is shared with 435, 437 and 441–446, and `menu-export.service.ts` with
  435, 436 and 437. Never run alongside 435, 436, 437, 441, 442, 443, 444, 445, 446.
- Concurrent plans: lane 1 (424–432, 448) may run alongside; run `node scripts/scope-check.mjs --overlap --plan=<this>`
  at take time.
- Isolated DB: no — no data is reshaped. The library's stored `performanceTags.foodCostPct` refreshes on each
  menu's next save (computed values, not a migration).

## Execution Notes
- Depends on: plan 433 merged (engine, `EventPlanService.planFor` / `costFor`, `roundMoney`, `formatQty`,
  `testing/event-plan.fixture.ts`).
- Lane wt-2: 423 → 433 → **434** → 435 → 436 → 437 → 430.
- Must not run at the same time as (map hotspot list): 435, 436, 437 (`menu-export.service.ts` group — 436 edits it
  too, an addition to the map's list); 441–446 (`menu-intelligence.page.ts`).
- MVP run mode: executed unattended into branch `mvp` per `docs/mvp/run-mode.md` — Atlas steps are rehearsed on a
  scratch copy and deferred to the final gate; [human] items become validation cards in `docs/mvp/runs/<NNN>.md`.
  Under run mode every `origin/main` in a Done-when command reads `origin/mvp`.
- Unblocks 435, 436 and (cross-lane) 444.

## Contracts (verbatim from the approved MVP map)

**C-ENGINE (433; consumers 434, 435, 437, 441, 444, 445, 446)**
- Folder `src/app/core/engine/` (pure TS, no Angular DI in the core): `event-plan.types.ts`, `event-plan.engine.ts` (`computeEventPlan(input: EventPlanInput): EventPlan`), `rounding.ts`, `supplier-choice.ts` (`chooseSupplier(product): { supplierId: string | null, pricePerBaseUnit: number | null }`), plus `event-plan.service.ts` (Angular wrapper `EventPlanService.planFor(event)` building the input from KitchenState + registries).
- `EventPlanInput = { event: MenuEvent, portionsByItem: Map<string, number>, products: Product[], recipes: Recipe[] /* recipes + dishes */, units: UnitConversion }` — item key `${section._id}|${itemIndex}`.
- `EventPlan = { rawLines: RawLine[], prepLines: PrepLine[], dishCosts: DishCost[], eventFoodCost: number, partial: boolean, missing: MissingItem[], errors: EngineError[] }`.
  - `RawLine = { productId: string | null, name: string, unit: string /* base unit */, netQty: number, buyQty: number, purchase?: { unit: string, count: number }, supplierId: string | null, lineCost: number | null, dishIds: string[], status: 'ok' | 'unlinked' | 'deleted' | 'no_conversion' }`
  - `PrepLine = { prepId: string, name: string, qty: number, unit: string, dishId: string, station: string }`
  - `DishCost = { itemKey: string, recipeId: string, cost: number, partial: boolean }`
  - `MissingItem = { kind: 'unpriced' | 'unlinked' | 'deleted', productId?: string, name: string, recipeIds: string[] }`
  - `EngineError = { kind: 'cycle' | 'no_yield', name: string }`
- `rounding.ts`: `roundPortions(x)` (round to 6 decimals, then ceil — only for portion-unit items), `formatQty(qty, unit)` (kg/liter ≤ 2 decimals, g/ml integer, units ceil; >1000 g → kg, >1000 ml → liter), `formatMoney(n)` (₪, 2 decimals), `formatPct1(n)` (1 decimal), `formatPctInt(n)`.
- Until 440 merges, `portionsByItem` comes from `portionsFromDerived(event)` (reads stored `derivedPortions`).

Uses plan 433's extensions: `EngineError` kinds `no_conversion` / `no_ingredients`, `formatQty` →
`{ qty, unit }`, `roundMoney`, `EventPlanService.costFor`.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/utils/shopping-list-table.util.ts
src/app/core/utils/shopping-list-table.util.spec.ts
src/app/core/utils/export.util.ts
src/app/core/services/menu-export.service.ts
src/app/core/services/export.service.spec.ts
src/app/core/services/menu-intelligence.service.ts
src/app/core/services/menu-intelligence.service.spec.ts
src/app/pages/menu-intelligence/menu-intelligence.page.ts
src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.ts
public/assets/data/dictionary.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — client read-only computation; no route, schema, taxonomy, data-service write or AI file
  changes. Menu saves keep going through `MenuEventDataService` unchanged.

## Step 0 — Reality Check
Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check by symbol in `menu-export.service.ts`:
`exportMenuShoppingList`, `getMenuShoppingListPreviewPayload`, `addMenuShoppingListSheetToWorkbook`,
`exportAllTogetherMenu`, `getMenuAllViewPreviewPayload`; in `menu-intelligence.page.ts`: `eventCost_`,
`getAutoFoodCost`, `selectRecipe`, `buildEventFromForm`, `getCurrentMenuForExport`, the `recipeCostService`
inject; in `menu-dish-row.component.ts`: `getAutoFoodCost`, `getFoodCostPerPortion`; in
`menu-intelligence.service.ts`: `computeEventIngredientCost`, `computeFoodCostPctFromActualRevenue`; in plan 433's
engine: `EventPlanService.planFor`, `costFor`, `buildFixtureInput`. If 441 already changed portions on the page
(it is sequenced after this plan — it should not have), STOP: conflict. Print `ok` / `conflict: <what>` per symbol.

## User Stories
- As a chef, I want my shopping list to list the products inside my preps so that I buy everything a sauce needs.
- As a chef, I want the total on the menu, in the preview and in Excel to be the same number so that I can trust it.
- As a chef, I want a line I couldn't merge or link marked clearly so that I fix it before ordering.

## Functional Requirements

### Must Have (P0)
- [x] One shopping-list table builder from the engine plan, used by the preview, the shopping-list Excel and the
      all-together Excel; the three copies are deleted.
- [x] Rows: grouped by the product's first category (translated) or "כללי"; unlinked rows in the "לא מקושר" group,
      deleted rows in the "נמחק" group; columns category · product · qty to buy · unit · purchase units · line total ·
      note; quantities through `formatQty`, money through `roundMoney` (Excel numeric) / `formatMoney` (preview);
      a last "סה״כ" row = `eventFoodCost`, labelled "חלקי" when `plan.partial`.
- [x] Engine errors (cycle, no yield, no conversion, no ingredients) listed under the table (preview `summary`,
      Excel rows after the total), never a hang.
- [x] Footer total, dish-row cost, cost on recipe pick, "All" view per-dish cost and the library food-cost % come
      from `EventPlanService`.

### Should Have (P1)
- [x] The "All" view uses each item's own `derivedPortions` (no re-derivation with `piecesPerPerson ?? 1`).

## UI/UX Notes
- RTL; preview reuses `app-export-preview` (`ExportPayload`); no new component, no new CSS.
- New dictionary keys (append, `general` group): `general_group` "כללי", `line_status_unlinked` "לא מקושר",
  `line_status_deleted` "נמחק", `line_status_no_conversion` "לא ניתן לאחד – חסרה המרה", `no_supplier` "ללא ספק",
  `partial_total` "חלקי", `shopping_total` "סה״כ", `engine_error_cycle` "הכנה מעגלית: {name}",
  `engine_error_no_yield` "חסרה תפוקה במתכון: {name}", `engine_error_no_conversion` "לא ניתן להמיר כמות להכנה: {name}",
  `engine_error_no_ingredients` "אין מצרכים: {name}". (`no_supplier` and `partial_total` are reused by 435/444.)
- New export headers in `EXPORT_HEADER_HE` (`export.util.ts`): `buy_qty` "כמות לקנייה", `purchase_units` "יחידות רכש",
  `note` "הערה" (`category`, `ingredient`, `unit`, `line_total` exist).

## Atomic Sub-tasks
- [x] W1: Build one shopping-list table from the engine plan so preview and Excel can't disagree — buildShoppingListTable(plan, products, t) → { headerRow, groups/rows, totalRow, notes }; formatQty/roundMoney/formatMoney only; spec on the 04.1 fixture, unlinked, no_conversion, cycle — src/app/core/utils/shopping-list-table.util.ts, shopping-list-table.util.spec.ts, src/app/core/utils/export.util.ts
- [x] W2: Replace the three shopping-list copies with the one table — inject EventPlanService; exportMenuShoppingList, getMenuShoppingListPreviewPayload, addMenuShoppingListSheetToWorkbook call buildShoppingListTable(this.eventPlan_.planFor(menu), products, t); line total written as a value, not a C×E formula; drop getCostForIngredient/getScaledIngredients use and the RecipeCostService inject if unused; net lines ≤ 0 — src/app/core/services/menu-export.service.ts
- [x] W3: Show each dish's cost in the All view from the engine instead of re-deriving portions — getMenuAllViewPreviewPayload reads plan.dishCosts by item key and item.derivedPortions — src/app/core/services/menu-export.service.ts
- [x] W4: Make the event cost and library food-cost percent come from the engine — computeEventIngredientCost returns eventPlan.planFor(event).eventFoodCost; remove the RecipeCostService inject; rewrite its two spec cases with a stub EventPlanService — src/app/core/services/menu-intelligence.service.ts, menu-intelligence.service.spec.ts
- [x] W5: Point the menu footer and dish costs at the engine without growing the frozen page — eventCost_ uses eventPlan.planFor(buildEventFromForm()).eventFoodCost; getAutoFoodCost and selectRecipe use roundMoney(eventPlan.costFor(recipeId, derivedPortions).cost); remove RecipeCostService import/inject; net lines ≤ 0 — src/app/pages/menu-intelligence/menu-intelligence.page.ts
- [x] W6: Make each dish row's cost and cost per portion come from the engine — getAutoFoodCost via EventPlanService.costFor + roundMoney; drop RecipeCostService — src/app/pages/menu-intelligence/components/menu-dish-row/menu-dish-row.component.ts
- [x] W7: Update the export spec to the engine-based shopping list — replace the getScaledIngredients-per-dish cases with a stub EventPlanService returning the fixture plan; assert preview rows equal buildShoppingListTable rows — src/app/core/services/export.service.spec.ts
- [x] W8: Add the Hebrew labels for line statuses, totals and engine errors — keys listed in UI/UX Notes — public/assets/data/dictionary.json
- [x] W9: Build, test, check frozen-file line counts and the log, then hand over the screen checks — ng build, ng test include list, git diff --numstat, log-query; cards ①–④ — this plan file

## Technical Considerations
- Dependencies: `EventPlanService` (433); `ExportService` facade signatures stay the same (`menu`, `recipes`,
  `products` params kept; `recipes` becomes unused by the shopping list and stays for API stability).
- DI: `MenuIntelligenceService` → `EventPlanService` → `KitchenStateService` + `UnitRegistryService`; no cycle.
- New files needed: `shopping-list-table.util.ts` + spec.
- Model changes: none.
- Backend / API: none.
- Auth and validation: none.
- Security surface: none.
- Data / migration: none. The library card's stored `performanceTags.foodCostPct` updates on the next save of each
  menu; sorting by food cost already recomputes live through `computeFoodCostPctFromActualRevenue`.
- Frozen files: `menu-intelligence.page.ts` (1313) and `menu-export.service.ts` (897) — net ≤ 0 each; the page
  loses the two 9-line `computeRecipeCost` blocks (−16) and gains one inject line; the service loses ~200 lines of
  copies.
- Number changes the chef will see: costs now include product waste (`yieldFactor`) and prep ingredients, so some
  totals rise — expected (spec 04.1).
- Project checks: log-query Done-when present; chef-side stories; new dictionary keys listed; no new icons or CSS.

## Backend Impact
None — client-only. No route, schema or stored-data shape changes.

## Out of Scope
- Prep checklists (by dish / category / station) — still on `getScaledPrepItems`; plan 437 rebuilds them on the
  engine's prep lines.
- Recipe-builder exports and the single-recipe shopping list (`recipe-export.service.ts`) — follow-up, not in 04.1's
  menu lists.
- "חלקי" badges and the missing-prices popover on screen (444); this plan only labels the shopping-list total.
- Coefficients, take rate and pieces per person (440/441); the cocktail-0 portions bug stays until 441.
- Supplier orders (435), stations (436).

## Critical Questions
None.
