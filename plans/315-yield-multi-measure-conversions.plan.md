# Plan 315 — Carry every legacy yield measure into `yield_conversions_`

## Goal

A migrated recipe or dish offers **every** measure the old FoodComposer recorded — grams, millilitres, unit count, portions — as selectable units, so a parent recipe can pull a sub-recipe in by weight, volume or count and get the correct price for each.

## Context

Reported case: `ןיערגו הפילק אלל ודקובא` (recipeNo 1620) takes 1000g of whole avocado costing ₪30 and yields **850g net**, which the old app also recorded as **1 portion**. The new app showed `הנמ 1` and hid the 850 entirely, yet a parent recipe priced 300g of it correctly at ₪10.59.

Both facts trace to the same place. `recipe-cost.service.ts:48-52` computes `totalCost / yield_amount_`, and `yield_amount_` is 850 (recovered by plan 314's sibling fix earlier in the session) — hence the correct ₪10.59. But `patchFormFromRecipe` (`recipe-form.service.ts:292-300`) treats **`yield_conversions_[0]` as the primary yield**, and the importer filled row 0 with the dish count `{1, dish}`. So the form renders the dish count and the real yield is invisible.

**This is a live data-loss path, not a display bug.** `toRecipe` (`recipe-form.service.ts:234-237`) writes form row 0 back into `yield_amount_`/`yield_unit_`. Opening one of these preparations and saving rewrites it to `yield_amount_: 1, yield_unit_: 'dish'`. The parent's line then costs `300 × 30 = ₪9,000` instead of ₪10.59, because `gram` and `dish` both carry conversion factor 1 in `SYSTEM_UNITS`, so `normalizeToRecipeYieldUnit` passes the amount through instead of erroring. **789 preparations are one save away from an 850× silent cost error.**

## Findings from the source dump

- **`measureUnit` is `2` ('gram') on all 2,093 rows.** A default nobody ever changed. Deriving `yield_unit_` from it is meaningless — it is why 394 preparations are labelled grams when `finalQuantity` actually matches their unit count.
- **`dbTotalLiter` holds millilitres, not litres**, despite the column name. The old app's header labelled it `ל״מב כ״הס`. Confirmed by magnitude: `רקב ריצ` (beef stock) reads 4000 against 12000 grams — 4 litres, not 4000. Median 900.
- **Measure coverage:** 1,483 of 2,093 rows carry two or more measures (1,353 have two, 107 have three, 23 have four). 316 rows have none.
  - Dishes (986): 844 portions, 506 unit, 224 gram, 57 ml.
  - Preparations (1,107): 824 portions, 818 gram, 95 unit, 45 ml.
- **134 dishes are themselves used as sub-recipes**, so dishes are in the costing chain and need the same treatment as preparations.
- `amountInRecipeYieldUnit` (`recipe-cost.service.ts:68-80`) resolves a requested unit via `convs.find(...)` — **first match wins**, so a duplicate unit in the list is silently dead. The derivation below can never emit a duplicate unit.

## Decisions (confirmed with the Human)

1. **Relabel `yield_unit_` from the column `finalQuantity` actually matches**, not from `measureUnit`. Affects ~394 preparations labelled gram that are really unit counts. `yield_amount_` is unchanged, so costs do not shift — only the label, and the other measures remain available as conversions.
2. **For the 28 rows where `finalQuantity` and `dbTotalGram` are different gram figures — trust `dbTotalGram`.** The orphan `finalQuantity` is reported as a warning for manual review, not stored.
3. **Keep every measure**, not a chosen one. A batch can legitimately be 2000g *and* 2300ml *and* 1 unit; all become selectable.

## Derivation

Build the measure list, never consulting `measureUnit`:

```js
const nzv = v => v != null && v !== 0
const measures = []
if (nzv(row.dbTotalGram))  measures.push({ amount: row.dbTotalGram,  unit: 'gram' })
if (nzv(row.dbTotalLiter)) measures.push({ amount: row.dbTotalLiter, unit: 'ml' })
if (nzv(row.dbTotalUnit))  measures.push({ amount: row.dbTotalUnit,  unit: 'unit' })
if (nzv(row.noOfDishes))   measures.push({ amount: row.noOfDishes,   unit: 'dish' })
```

Pick the primary:

- **Dish** (`RecipeOrDish === 2`) with a portion count → the `dish` entry. The app already treats a dish's `yield_amount_` as `serving_portions` (`recipe-form.service.ts:286`) and forces row 0 to `'dish'` on load, so this aligns the data with the app's own contract.
- **Preparation** → the measure whose `amount === finalQuantity`; else the `gram` measure (decision 2), warning about the orphan; else, when there is no gram measure, `{ finalQuantity, 'gram' }` takes the free gram slot; else the first measure by priority `gram > ml > unit > dish`.
- No measures and no `finalQuantity` → `yield_amount_: 0`, `yield_unit_: 'gram'`, no conversions, warning.

Then:

```js
yield_amount_ = primary.amount
yield_unit_   = primary.unit
yield_conversions_ = [primary, ...measures.filter(m => m !== primary)]
```

Row 0 is the primary — the convention both `toRecipe` and `patchFormFromRecipe` already assume. Satisfying it is what fixes the display and closes the save-corruption path; no app-side change is required.

## Found during verification: `neto_confirmed_`

After the yield data was correct in Mongo (`850 gram`), the builder still displayed **1000**. Cause: `recipe-header.component.ts:140-146` runs an effect that auto-syncs the yield to `computedYieldAmount_` — the **gross sum of the ingredient weights** (`recipe-yield-manager.util.ts:98-123`) — and persists it on the next save. It opts out only when `neto_confirmed_` is set.

For a legacy preparation the recorded yield is precisely a *net* figure (1000g of whole avocado → 850g peeled and stoned), so the auto-sync was overwriting real data with the gross input. The importer now sets `neto_confirmed_: true` whenever a real yield was recovered from the source. Dishes are unaffected either way — `computedYieldAmount_` returns `null` for them.

## Files

- `server/scripts/legacy-import/lib/transform.js` — replace the yield block (the Finding-B fallback chain and the `noOfDishes`-only `yield_conversions_`).
- `server/scripts/legacy-import/repair-recipe-yields.js` (new) — re-parse the dump, run the real `buildImport()`, `$set` `yield_amount_`/`yield_unit_`/`yield_conversions_` on `RECIPE_LIST` + `DISH_LIST` for `__master__` then per-user clones, skipping `_userModified: true`. Mirrors `repair-dish-prep-items.js`.
- `server/scripts/legacy-import/verify-against-source.js` — already diffs all three yield fields; no change needed.

## Verification

| Check | Expected after |
|---|---|
| recipeNo 1620 `yield_conversions_` | `[{850, gram}, {1, dish}]`, row 0 primary |
| recipeNo 1620 in recipe-builder | shows `םרג 850`, not `הנמ 1` |
| Parent `הנבל היוסו םושמוש ןמשב ודקובא תויבוק`, 300g line | stays **₪10.59** |
| Same parent, line switched to portions | 1 portion prices at ₪30 |
| Rows gaining ≥1 selectable unit | ~1,483 |
| Preparations with a non-conforming row 0 | 789 → 0 |
| Duplicate unit within any `yield_conversions_` | 0 |
| Orphan `finalQuantity` warnings | 28 |
| `verify-against-source.js` (`__master__`, `dev-guest`, `yYYGl`) | 0 yield mismatches |
| `ng build` | passes |

## Risk to flag

Decision 1 plus the dish rule changes `yield_amount_` for dishes from a gram figure to the portion count. That is what the app expects for a dish, but it moves per-portion menu maths (`menu-intelligence.service.ts:65`, `menu-dish-row.component.ts:105`, `menu-export.service.ts`). Measure the affected dish count in the dry run and report it before writing.

## Out of scope

- Recipe-level shrinkage/yield-loss modelling. `getYieldFactorForRow` hardcodes `1` for recipe rows; only products have `yield_factor_`. Nothing compares a recipe's input weight to its yield — the 1000g→850g loss is recorded by the human, not derived.
- `toRecipe` writing the Hebrew literal `'מנה'` as a dish's `yield_unit_` while the importer writes `'dish'` — a pre-existing inconsistency, untouched here.
- Hardening `patchFormFromRecipe` against a non-conforming row 0. Fixing the data removes the live symptom; making the loader defensive is a separate change.
