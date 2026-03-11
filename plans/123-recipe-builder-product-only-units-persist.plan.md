# Plan: Recipe builder — product-only units + persist new unit to product

## Overview

(1) Recipe builder unit dropdown shows only units for that product (base + purchase options). (2) When user adds a unit from recipe builder via "+ יחידה חדשה", persist it as a purchase option on the product and save so it appears in Edit Product.

## Desired behavior

**1. Unit dropdown = product-specific only**

- In the recipe builder, the unit dropdown for an ingredient shows only the units that belong to that specific product (or recipe): base unit + any purchase units. If the product has only one unit, that is the only option.
- No global list of all app units in the dropdown.

**2. New unit from recipe builder is saved on the product**

- When the user adds a measurement unit from the recipe builder (chooses "+ יחידה חדשה", completes the unit creator), that new unit is saved on the product as a purchase option so it appears in Edit Product under purchase units.

**Behavior to keep**

- "+ יחידה חדשה" stays in the dropdown; after adding, the unit is set on the ingredient row and cost uses registry conversion.
- If the row already has a unit not in the product list, that value stays in the dropdown (existing currentUnit logic in getUnitOptions).

---

## Part A: Dropdown shows only product units

**File**: `src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts`

In `getAvailableUnits`: Remove the block that merges global registry units for products and the unused `itemType` variable. Result: only base_unit_ + purchase_options_[].unit_symbol_ + unit_options_[].unit_symbol_ (and yield_unit_ for recipes).

---

## Part B: Persist new unit to product when added from recipe builder

**File**: same recipe-ingredients-table.component.ts.

In `onUnitChange` when `val === '__add_unit__'`, inside `unitAdded$.pipe(take(1)).subscribe(newUnit => { ... })`:

1. If the row is a **product**: get product via getItemMetadata(group). If product already has purchase option with unit_symbol_ === newUnit, skip. Otherwise build new purchase option (unit_symbol_: newUnit, conversion_rate_: from registry, uom: product.base_unit_, price_override_: 0), build updated product with purchase_options_ including the new option, call kitchenStateService.saveProduct(updatedProduct).subscribe(...). On error, still set the unit on the row.
2. For **recipe** rows: do not add a purchase option; only set the unit on the group.
3. In all cases: set the new unit on the ingredient group and run updateLineCalculations(index).

---

## Summary

| Item | Change |
|------|--------|
| Dropdown | Remove merge of allUnitKeys_() in getAvailableUnits so only product (or recipe) units are shown. |
| "+ יחידה חדשה" on product row | On unitAdded$: add the new unit as a purchase option to the product and call saveProduct so it appears in Edit Product and in the dropdown next time. |
| "+ יחידה חדשה" on recipe row | No change: only set unit on the ingredient and update line calculations. |
