---
name: Shopping List Calculation Fix
overview: Unify portion calculations so per-item food cost, event total cost, and shopping list export all use the same derived portions formula (guestCount × takeRate × servingPortions).
---

# Shopping List Calculation: Investigation and Fix Plan

## Investigation Summary

Traced the full calculation path from form input to shopping list export across:

- [menu-intelligence.page.ts](src/app/pages/menu-intelligence/menu-intelligence.page.ts) — form builder, export trigger, per-item food cost
- [menu-intelligence.service.ts](src/app/core/services/menu-intelligence.service.ts) — `derivePortions`, `hydrateDerivedPortions`, `computeEventIngredientCost`
- [export.service.ts](src/app/core/services/export.service.ts) — `exportMenuShoppingList`
- [scaling.service.ts](src/app/core/services/scaling.service.ts) — `getScaleFactor`, `getScaledIngredients`

## Root cause

Three different calculations used three different portion bases:

| Calculation | Formula | Result (hamburger) |
|-------------|---------|---------------------|
| Per-item food cost | `servingPortions * guestCount` | 40 portions |
| Event total + shopping list | `derived_portions_` (= guestCount × takeRate) | 34 portions |

**Fix**: Use the same derived portions everywhere, and include `serving_portions_` in the formula.

## Unified formula

- **plated_course**: `round(guestCount × takeRate × servingPortions)`
- **buffet_family**: `round(guestCount × takeRate × servingPortions × 1.15)`
- **cocktail_passed**: `round(guestCount × piecesPerPerson × takeRate)`

## Files changed

1. **menu-intelligence.service.ts**: `derivePortions` accepts `servingPortions`; include it in plated_course and buffet_family. `hydrateDerivedPortions` passes `item.serving_portions_`.
2. **menu-intelligence.page.ts**: `getAutoFoodCost` uses derived portions (same as event total). `getDerivedPortions` passes actual `piecesPerPerson` (from form or default 1) and `serving_portions` from item.

No changes in `export.service.ts` or `scaling.service.ts`.
