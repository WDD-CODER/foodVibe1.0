# Session State

## Branch
feat/master-push-quantity-recovery

## Date
2026-09-26

## Session Summary
- Traced three silent data losses in the FoodComposer→Mongo migration, each found by comparing the old app's own screenshots against the source dump rather than trusting the schema. `verify-against-source.js` reported clean throughout, because it re-derives expectations from the same `buildImport()` it is auditing.
- **Plan 314** — a dish's mise-en-place was fabricated by copying its ingredient lines; the real source is `tblInstructions` (the old app's "check list" panel). Retracted plan 300 Finding 5. 3,952 real checklist rows replaced 5,754 fabricated ones across 849 dishes; 137 dishes intentionally left empty.
- **Plan 315** — yields kept only one measure and put the portion count in `yield_conversions_[0]`, which is the *primary* yield by the recipe-builder's contract. Opening + saving such a recipe overwrote the real yield, inflating parent cost lines silently (gram and dish share conversion factor 1). Yield now carries gram/ml/unit/dish with the primary first; 1,905 recipes gained a selectable unit. `measureUnit` is no longer consulted — it is `2` on all 2,093 rows.
- Added `neto_confirmed_` on import: without it the header effect replaces a recorded net yield with the gross ingredient sum on open and persists it on save. This was the actual cause of the avocado prep showing 1,000g instead of 850g.
- Earlier in the session: supplier phone numbers (never read from `tblSuppliers`), nutrition field-name typo, and the 0-vs-null quantity/yield recovery.

## Files Modified
19 files staged: `server/scripts/legacy-import/` (transform.js, repair-recipe-yields.js [new], repair-dish-prep-items.js, backfill-dish-prep-items.js, backfill-supplier-phones.js [new], backfill-product-nutrition.js, backfill-quantities.js, verify-against-source.js), `src/app/core/models/supplier.model.ts`, `src/app/pages/suppliers/**` (4), `public/assets/data/dictionary.json`, `plans/314-*.plan.md` [new], `plans/315-*.plan.md` [new], `docs/brain/gotchas/{backend,angular}.md`, `.claude/todo.md`.

Deliberately NOT staged (not from this session): `src/app/core/utils/list-state.util.ts`, `inventory-product-list.component.ts`, `recipe-book-list.component.ts`, `OVERNIGHT-REPORT-auto-solve-2026-09-16.md`.

## Commit
892b764b

## PR
see Next Steps

## Next Steps
- **Repairs were applied to local Mongo only — Atlas/production is untouched.** Re-running the three repair scripts against Atlas is a separate, deliberate decision.
- 23 recipes where `finalQuantity` disagreed with `dbTotalGram` resolved in favour of `dbTotalGram` (Human decision); the orphan values are logged by `repair-recipe-yields.js` for manual review.
- Dish yield semantics: `toRecipe()` writes the Hebrew literal `'מנה'` as a dish's `yield_unit_` while the importer writes `'dish'` — a pre-existing inconsistency, untouched.
- No recipe-level shrinkage modelling exists (`getYieldFactorForRow` hardcodes 1 for recipe rows); the 1000g→850g loss is recorded by the Human, not derived.
- `plans/310-faceted-search-pagination-inventory-recipe-book.plan.md` remains the oldest open item.
