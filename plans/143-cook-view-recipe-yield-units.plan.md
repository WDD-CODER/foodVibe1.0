# Cook-view recipe-specific yield units and conversion

## Current behavior (problems)

- **Unit options in cook-view** come from the **global** unit registry: `yieldUnitOptions_` uses `unitRegistry.allUnitKeys_()` in cook-view.page.ts. So every recipe shows the same full list of units.
- **Conversion** uses the global registry: `convertedYieldAmount_` uses `unitRegistry.getConversion(baseUnit)` and `getConversion(selUnit)` to convert between units via a common base (e.g. grams). So "1 unit" is treated as the global definition, not the recipe-specific one (e.g. 0.25 kg per unit).
- **Recipe model** only had a single yield: `yield_amount_` and `yield_unit_`. Recipe-builder's form has a **yield_conversions** array (primary + secondary rows), but on save only the first row was persisted. Secondary rows were discarded.

## Target behavior

- **Unit options** in cook-view are **only** the units defined for that recipe (e.g. kg and unit), not the full global list.
- **Conversion** when switching units uses the **recipe's** equivalent amounts (e.g. 1 kg = 4 unit) so scale factor and ingredient quantities stay correct.
- When the user changes the selected unit, the quantity input updates to the equivalent amount in the new unit (e.g. 1 kg → 4 when switching to "unit").

## Implementation (done)

### 1. Recipe model
- Added optional `yield_conversions_?: { amount: number; unit: string }[]` in recipe.model.ts.

### 2. Recipe-builder
- **Save**: Full `yield_conversions` form array persisted as `yield_conversions_` on the recipe; first row still sets `yield_amount_` and `yield_unit_`.
- **Load**: When `recipe.yield_conversions_` exists, build the form array from it (including secondary rows); otherwise patch first row from `yield_amount_` / `yield_unit_`.

### 3. Cook-view
- **yieldUnitOptions_**: From recipe's `yield_conversions_` when present (one option per distinct unit); else single option from `yield_unit_`.
- **convertedYieldAmount_**: When recipe has `yield_conversions_`, use the entry for the selected unit; else fallback to unit registry conversion.
- **onYieldUnitChange(newUnit)**: On unit change, compute current batches, set new unit, then set `targetQuantity_` to equivalent amount in new unit (preserves scale).

## Files touched

- src/app/core/models/recipe.model.ts — added `yield_conversions_`
- src/app/pages/recipe-builder/recipe-builder.page.ts — persist/load full yield_conversions
- src/app/pages/cook-view/cook-view.page.ts — recipe-based options, conversion, onYieldUnitChange
- src/app/pages/cook-view/cook-view.page.html — (ngModelChange) → onYieldUnitChange($event)
