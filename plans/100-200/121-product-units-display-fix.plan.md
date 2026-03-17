# Plan: Show product measurement units in Edit form and ingredient unit select

## Overview

Measurement units saved on a product (purchase options) should appear both in the Edit Product form and in the ingredient unit dropdown in the recipe builder. This plan identifies why they might not show and documents fixes for persistence, form hydration, and the ingredient unit list.

## Current behavior (data flow)

- **Edit Product**: When you open a product for edit, the resolver returns the product from KitchenStateService (ProductDataService). `hydrateForm` clears the purchase-options array and repopulates it from `data.purchase_options_`. If the product has `purchase_options_` in memory, they appear in the form.
- **Ingredient unit select**: For a selected ingredient, `getAvailableUnits` in recipe-ingredients-table builds the list from the **product** only: `base_unit_`, `purchase_options_[].unit_symbol_`, and `unit_options_[].unit_symbol_`. It does **not** include the global unit registry (e.g. units added via "+ יחידה חדשה"). So units added only in the global registry do not appear in the ingredient unit dropdown unless added as a purchase option on the product, or selected via "+ יחידה חדשה".

Two sources of "saved" units:

1. **Purchase units** (הוסף יחידת רכש) — stored on the product as `purchase_options_`. Should show in both Edit form and ingredient unit select.
2. **Global units** (יחידה חדשה from unit creator) — stored in the unit registry only. Show in the product form's unit dropdowns but are not automatically in the ingredient unit list.

## Why product purchase units might not show

1. **Not persisted**: If "Update Product" is not clicked after adding purchase units, or the form is invalid (e.g. required `uom` empty), `purchase_options_` is never saved.
2. **Form hydration / legacy data**: When loading a product, `hydrateForm` calls `addPurchaseOption(opt)` for each entry. Each row requires `unit_symbol_`, `conversion_rate_`, and `uom`. If an option was saved without `uom` (older data), the row gets `uom: ''` and is invalid; the form may block save.
3. **Ingredient list uses only product fields**: If the product has no `purchase_options_` in memory, the ingredient unit dropdown only shows the base unit (and current unit, plus "+ יחידה חדשה").

## Implemented changes

### 1. Ensure purchase options load and display in Edit Product (product-form)

- **File**: `src/app/pages/inventory/components/product-form/product-form.component.ts`
- In `hydrateForm`, when repopulating purchase options from `data.purchase_options_`, when calling `addPurchaseOption(opt)` pass an option with `uom` derived if missing: `opt.uom ?? data.base_unit_ ?? 'gram'` so legacy rows are valid and visible.

### 2. Ensure ingredient unit dropdown shows product units and registry units

- **File**: `src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts`
- In `getAvailableUnits`, for products, merge in the global unit registry keys (e.g. from `UnitRegistryService.allUnitKeys_()`) so that any unit saved on the product (base + purchase options) still appears, and any unit added globally (e.g. כפית from unit creator) also appears in the ingredient unit list. Order: product units first, then registry units.

### 3. Persistence (verification)

- ProductDataService.updateProduct replaces the document in storage with the full `toSave` (including `purchase_options_`) and updates the in-memory store. No code change; verification only.

## Summary

| Where units show            | Source of units                    | Change                                                                 |
|----------------------------|------------------------------------|------------------------------------------------------------------------|
| Edit Product (purchase)    | `data.purchase_options_`           | Harden `hydrateForm`: default missing `uom` from `base_unit_`.        |
| Ingredient unit select     | Product + global registry           | Merge global registry units into `getAvailableUnits` for products.     |
| Persistence                | Save path and storage              | Verify only; full product (with `purchase_options_`) saved and loaded. |
