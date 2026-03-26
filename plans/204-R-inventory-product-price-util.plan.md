---
name: Inventory product-price util extraction
overview: Extract pure price/unit helper functions from InventoryProductListComponent into product-price.util.ts, reducing the component by ~25 LOC.
todos: []
isProject: false
---

# Goal
Extract inline price-editing logic from InventoryProductListComponent into src/app/core/utils/product-price.util.ts.

# Atomic Sub-tasks
- [ ] Create `src/app/core/utils/product-price.util.ts` — export `getProductUnits(product)`, `getPricePerUnit(product, unit, unitRegistry)`, `calcBuyPriceGlobal(product, displayUnit, pricePerUnit, unitRegistry)`
- [ ] Delete dead `getProductUnits` method from component (zero call sites in TS and HTML)
- [ ] Replace `getPricePerUnit` method body with 3-line thin wrapper delegating to util; keep 2-arg signature for template compatibility
- [ ] In `onPriceChange`: replace conversion block with `calcBuyPriceGlobal(product, displayUnit, pricePerUnit, this.unitRegistry)`; add util import
- [ ] Leave `onUnitChange` conversion block unchanged — math is inverse of `calcBuyPriceGlobal` (multiply vs divide)
- [ ] Verify `ng build` passes with no errors

# Constraints
- unitRegistry must be passed as a parameter — no inject() inside a util file
- Keep `getPricePerUnit` as a thin wrapper in the component (template calls it with 2 args)
- Do not touch filter methods, allergen popover methods, or onUnitChange conversion block
- No any, single quotes in TS, no semicolons

# Verification
- ng build passes with no errors
- product-price.util.ts exists with three exported functions
- Inventory list renders with correct prices and unit display unchanged
- Note: LOC will reach ~480 (not 390) — brief's baseline of 455 was wrong; actual is 505
