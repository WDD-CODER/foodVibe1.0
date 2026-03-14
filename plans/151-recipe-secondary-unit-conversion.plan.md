# Recipe secondary unit conversion fix

## What I understand from your request

You define a recipe with a **main** measurement (e.g. 446g) and **secondary** units that are **equivalent to that same batch**: e.g. "1 unit" and "1 spoon" both mean the same quantity as 446g. So:

- 446g = 1 unit = 1 spoon (for that recipe).

When you use this recipe **as an ingredient** in another recipe and choose:

- **Unit** and enter **1** → it must be treated as **446g** (cost and weight).
- **Spoon** and enter **1** → same: **446g**.

Right now the app uses the **global** unit registry to convert "unit" or "כפות" to grams, so the numbers are wrong. The fix is to use **recipe-scoped** conversion: when the selected unit is one of that recipe's secondary (or primary) units, use `yield_conversions_` so that 1 unit → 446g, 1 spoon → 446g, etc.

---

## Root cause

- Recipe cost/weight when used as ingredient uses `normalizeToRecipeYieldUnit(amount, fromUnit, toUnit)` (global registry only).
- Ingredients table uses `convertToBaseUnits(...)` for recipe line cost (global registry only).
- Cook-view already uses `yield_conversions_` correctly; we need the same for recipe-as-ingredient.

## Data shape (already correct)

- Recipe has `yield_amount_`, `yield_unit_`, and `yield_conversions_`: e.g. `[{ amount: 446, unit: 'gram' }, { amount: 1, unit: 'unit' }, { amount: 1, unit: 'כפות' }]`. Amount in yield_unit_ = `netAmount * (yield_amount_ / entry.amount)` when the selected unit is in `yield_conversions_`.

## Implementation

### 1. RecipeCostService: recipe-scoped conversion

- Add `amountInRecipeYieldUnit(amount: number, unit: string, recipe: Recipe): number`. If `recipe.yield_conversions_` has an entry with `entry.unit` matching unit, return `amount * (recipe.yield_amount_ / entry.amount)`. Otherwise call `normalizeToRecipeYieldUnit(amount, unit, recipe.yield_unit_)`.
- In **getRowWeightContributionG** (recipe branch): use `amountInRecipeYieldUnit(net, unit, subRecipe)` instead of `normalizeToRecipeYieldUnit(net, unit, subRecipe.yield_unit_)`.
- In **computeIngredientCost** (recipe branch): use `amountInRecipeYieldUnit(ing.amount_, ing.unit_, subRecipe)` instead of `normalizeToRecipeYieldUnit(...)`.

### 2. Recipe ingredients table

- In **updateLineCalculations** (recipe branch): call RecipeCostService `amountInRecipeYieldUnit(netAmount, selectedUnit, recipe)` for amountInYieldUnit when possible; else keep current convertToBaseUnits logic.

### 3. Tests

- recipe-cost.service.spec.ts: test recipe with yield_conversions_; assert 1 unit gives same cost/weight as 446 gram.

## Verification

- Use recipe with 446g = 1 unit = 1 spoon as ingredient: select unit 1 or spoon 1 → cost and weight match 446g.
