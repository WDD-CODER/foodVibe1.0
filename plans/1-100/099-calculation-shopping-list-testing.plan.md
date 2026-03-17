# Profound Testing for Calculation and Shopping List

## Current state

- **Calculation/shopping list flow** (no tests today):
  - [ScalingService](src/app/core/services/scaling.service.ts): `getScaleFactor`, `getScaledIngredients`, `getScaledPrepItems` (uses [KitchenStateService](src/app/core/services/kitchen-state.service.ts) for names/units).
  - [ExportService](src/app/core/services/export.service.ts): `exportShoppingList(recipe, quantity)` (single recipe), `exportMenuShoppingList(menu, recipes, products)` (menu: factor = `derived_portions_ / yield_amount_`, then aggregate by category; same name+unit summed).
  - [MenuIntelligenceService](src/app/core/services/menu-intelligence.service.ts): `derivePortions` (plated/buffet vs `cocktail_passed`), `hydrateDerivedPortions`, `computeEventIngredientCost`, `computeFoodCostPct`.
  - [RecipeCostService](src/app/core/services/recipe-cost.service.ts): recipe/ingredient cost (product yield, purchase_options, recursion for sub-recipes), weight/volume, unit normalization; depends on [UnitRegistryService](src/app/core/services/unit-registry.service.ts) and KitchenStateService.
  - [quantity-step.util](src/app/core/utils/quantity-step.util.ts): pure `getQuantityStep`, `quantityIncrement`, `quantityDecrement` (used in cook-view, menu-intelligence, recipe-workflow).
- **Reference pattern**: [conversion.service.spec.ts](src/app/core/services/conversion.service.spec.ts) (cost, waste, yield, suggested price).
- **Export call sites**: [cook-view](src/app/pages/cook-view/cook-view.page.ts) (`onExportShoppingList` / `onExportInfo` with `targetQuantity_`), [menu-intelligence](src/app/pages/menu-intelligence/menu-intelligence.page.ts) (`onExportMenuShoppingList` uses `getCurrentMenuForExport()` which runs `buildEventFromForm()` then `hydrateDerivedPortions()` so `derived_portions_` is correct for all serving types).

## Scope: what to test

1. **ScalingService** (new `scaling.service.spec.ts`)
   - `getScaleFactor`: zero/negative yield → 1; normal factor = targetQuantity / yield_amount_.
   - `getScaledIngredients`: amounts scaled by factor; names from KitchenState (mock); product vs recipe type; missing product/recipe → "(לא נמצא)".
   - `getScaledPrepItems`: prep_items_ and mise_categories_ scaled by factor; empty recipe → [].
   - Mock `KitchenStateService` (products_(), recipes_()) so tests are deterministic.

2. **ExportService** (new `export.service.spec.ts`)
   - **Single-recipe shopping list**: given recipe + quantity, assert built rows (category, name, amount, unit). Products → categories_[0] or "כללי"; sub-recipes → "הכנות". Categories sorted; XLSX write can be spied to avoid real file I/O.
   - **Menu shopping list**: given menu (sections/items with `derived_portions_`), recipes (with yield_amount_, ingredients_), products. Assert aggregated rows: same ingredient+unit in two dishes → summed amount; categories correct; factor = portions / yield_amount_ per dish.
   - Mock ScalingService, KitchenStateService, RecipeCostService so export logic is tested in isolation.

3. **MenuIntelligenceService** (new `menu-intelligence.service.spec.ts`)
   - `derivePortions`: plated_course / buffet_family → guestCount * servingPortions (with fractional sp); cocktail_passed → round(guestCount * piecesPerPerson * clamp(takeRate, 0, 1)); edge cases (zero guest, zero sp, take rate > 1).
   - `hydrateDerivedPortions`: output items have `derived_portions_` from derivePortions for each serving type.
   - `computeEventIngredientCost`: sum of scaled recipe costs (scale by derived_portions_ / yield); missing recipe → skip.
   - `computeFoodCostPct`: cost / (revenue_per_guest * guest_count) * 100; zero revenue/guests → 0.
   - Mock KitchenStateService.recipes_() and RecipeCostService.computeRecipeCost for cost tests.

4. **RecipeCostService** (new `recipe-cost.service.spec.ts`)
   - `computeRecipeCost` / `getCostForIngredient`: product (yield_factor_, buy_price_global_, purchase_options_ with unit_symbol_, conversion_rate_, price_override_); recipe (recursive cost per unit * amount in yield unit); missing product/recipe → 0; recursion depth cap (e.g. 5).
   - `getRecipeCostPerUnit`: totalCost / yield_amount_.
   - Weight/volume: `computeTotalWeightG`, `computeTotalVolumeL`, `getUnconvertibleNamesForWeight` with mass/volume units (mock UnitRegistry + KitchenState).
   - Mock KitchenStateService and UnitRegistryService.

5. **quantity-step.util** (new `quantity-step.util.spec.ts`)
   - `getQuantityStep`: value ≥ 1 → 1; value < 1 → 0.001; integerOnly → 1; explicitStep override; non-finite → 1.
   - `quantityIncrement` / `quantityDecrement`: step applied; min clamp; decimal rounding to 3 places for small steps; integerOnly.
   - Pure util; no TestBed.

## Order of implementation

1. quantity-step.util.spec.ts (no deps, fast).
2. ScalingService.spec.ts (only KitchenState mock).
3. MenuIntelligenceService.spec.ts (derivePortions; then hydrate + cost with mocks).
4. RecipeCostService.spec.ts (UnitRegistry + KitchenState mocks).
5. ExportService.spec.ts (mock Scaling + KitchenState + RecipeCost; single-recipe then menu aggregation).

## Files to add

| File | Purpose |
|------|----------|
| `src/app/core/utils/quantity-step.util.spec.ts` | Pure step/increment/decrement and options |
| `src/app/core/services/scaling.service.spec.ts` | Scale factor, scaled ingredients, scaled prep |
| `src/app/core/services/menu-intelligence.service.spec.ts` | derivePortions, hydrate, event cost, food cost % |
| `src/app/core/services/recipe-cost.service.spec.ts` | Recipe/ingredient cost, recursion, weight/volume |
| `src/app/core/services/export.service.spec.ts` | Single-recipe and menu shopping list |

All under existing `src` test setup (Jasmine/Karma); follow conversion.service.spec.ts style.
