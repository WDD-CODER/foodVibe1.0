---
name: Purchase unit recipe builder fix
overview: Fix recipe builder so that adding "1 unit" of a product whose purchase unit is defined as 0.3 KG (300g) shows correct net quantity and cost, by (1) fixing conversion_rate_ semantics (use multiplication for "base per purchase unit") and (2) improving default quantity and step when using purchase units.
---

# Purchase Unit Conversion and Recipe Builder Quantity Fix

## Problem summary

- **Product side**: You define a purchase unit (e.g. "יחידה") with scale 0.3 KG per unit (e.g. "0.3 קג = יחידה") and optionally a special price.
- **Recipe Builder side**: When you add that product and choose "1 unit", the net quantity shows **0.001** (1 gram) instead of correct weight/cost for 0.3 kg.

Root causes:

1. **Conversion direction**: `conversion_rate_` is stored as **base units per 1 purchase unit** (e.g. 0.3). Recipe builder and recipe-cost service treated it as the inverse and **divided** by it.
2. **Default quantity and step**: After selecting a product, `amount_net` was 0; +/- used step 0.001 when value < 1, so one click gave 0.001.
3. **Special price formula**: When `price_override_` is set (price per 1 purchase unit), the code divided by `conversion_rate_`, inflating line cost.

## Intended semantics

- **conversion_rate_** = base units per 1 purchase unit (e.g. 0.3 means 1 unit = 0.3 KG).
- **price_override_** (when set) = price per 1 purchase unit.

## Changes (executed)

1. **recipe-cost.service.ts**: getRowWeightContributionG — amountInBaseUnits = net * conversion_rate_; computeIngredientCost — normalizedAmount = amount * conversion_rate_, cost with price_override_ = amount * price_override_.
2. **recipe-ingredients-table.component.ts**: updateLineCalculations — same conversion/price fix; onItemSelected — default unit to first purchase option and amount_net to 1 when product has purchase_options_; incrementAmount/decrementAmount — use integerOnly/explicitStep 1 when unit is a purchase unit.
3. **recipe-cost.service.spec.ts**: Add/update tests for purchase_options_ and price_override_.

## Verification

- Product: base KG, purchase unit 0.3 KG = 1 unit. Recipe Builder: add product, unit "יחידה", quantity 1. Expect weight/cost for 300 g; with special price 4.9, line cost 4.9 ₪.
