---
name: Cook-view scale by ingredient
overview: In view mode, let the user scale the recipe by one ingredient via a per-row action ("Set recipe by this item" on hover/tap), confirm with a dialog, then show a distinct "special scaled view" with a "Back to full recipe" button.
todos: []
isProject: true
---

# Cook-view: scale recipe by one ingredient (view mode)

## Goal

In **view mode only**, let the user say "I have X of [this ingredient]" and see the **entire recipe** scaled so that ingredient becomes X and all other amounts scale in the same ratio. Entry is **per row**: hover or tap an ingredient row → action appears → set amount → confirm → enter a **special scaled view** with a clear way back.

## How it fits the current architecture

Scaling stays as-is; we only set `targetQuantity_` from the chosen ingredient and amount:

- [cook-view.page.ts](src/app/pages/cook-view/cook-view.page.ts): `targetQuantity_` drives scale; `scaleFactor_` and `scaledIngredients_()` react automatically.
- [scaling.service.ts](src/app/core/services/scaling.service.ts): no changes.

**Math**: For ingredient index `i`, `baseAmount = recipe.ingredients_[i].amount_`. If `baseAmount <= 0`, abort. `factor = userAmount / baseAmount`. Set `targetQuantity_ = (recipe.yield_amount_ ?? 1) * factor`. Existing pipeline does the rest.

---

## UX flow (per-row + special view)

### 1. Normal view mode

- Ingredient rows render as today (read-only amount + unit).
- **Hover** (pointer): row gets a highlighted border and an action button: **"Set recipe by this item"**.
- **Touch**: Always show a small control on each row (icon or "Set by this") so tap works without hover.

### 2. After user clicks "Set recipe by this item"

- That row shows an **amount input** (prefilled with current scaled amount) and the ingredient's **unit** (read-only), plus a **"Convert"** button.
- User changes the amount and clicks **"Convert"** to open the confirmation dialog.

### 3. Confirmation

- Dialog: "Scale recipe to use this amount of the selected ingredient?" (OK / Cancel). OK applies scaling and enters **special scaled view**.

### 4. Special scaled view

- **Distinct style** (e.g. subtle border/background or thin banner).
- **Banner**: "Scaled to [X] [unit] of [ingredient name]" and **"Back to full recipe"** button.
- Main quantity control hidden; only "Back to full recipe" exits.

### 5. Touch-friendly

- Always-visible row control; tap → amount + Convert; tap Convert → confirm → special view; tap "Back to full recipe" to exit.

---

## State (component)

- `scaleByIngredientIndex_`: `number | null` — ingredient index we scaled by; `null` = normal view.
- `scaleByIngredientAmount_`: `number | null` — amount used for scaling (for banner text).
- `settingByIngredientIndex_`: `number | null` — row currently showing amount input + Convert.
- `settingByIngredientAmount_`: `number` — current value in the inline amount input.

Apply scaling: set `targetQuantity_`, `scaleByIngredientIndex_`, `scaleByIngredientAmount_`, clear `settingByIngredientIndex_`. Back to full recipe: reset `targetQuantity_` to `recipe.yield_amount_ ?? 1`, clear scale-by state. In special view, hide main quantity control.

---

## Edge cases

- **baseAmount <= 0**: Do not apply; show short message.
- **No ingredients**: No per-row control.
- **User taps another row** while in setting state: switch to that row and prefilled amount.
- **Edit mode**: No scale-by UI.

---

## Files to touch

| File | Changes |
|------|--------|
| [cook-view.page.ts](src/app/pages/cook-view/cook-view.page.ts) | Signals and methods: startSetByIngredient, applyScaleByIngredient, resetToFullRecipe; hide quantity in special view. |
| [cook-view.page.html](src/app/pages/cook-view/cook-view.page.html) | Per-row highlight, "Set recipe by this item", inline amount + Convert; special view banner + "Back to full recipe". |
| [cook-view.page.scss](src/app/pages/cook-view/cook-view.page.scss) | Row highlight, set-by row controls, special scaled view (cssLayer). |
| [dictionary.json](public/assets/data/dictionary.json) | set_recipe_by_this_item, convert, scale_recipe_confirm, scaled_to, back_to_full_recipe. |

---

## Summary

- **Entry**: View mode, per row — hover or always-visible control → "Set recipe by this item".
- **Setting amount**: Inline amount input + "Convert" → confirmation → special scaled view.
- **Special view**: Banner + "Back to full recipe". Scaling via existing `targetQuantity_`.
