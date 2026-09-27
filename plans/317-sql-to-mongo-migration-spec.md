# Plan 317 — SQL→Mongo migration specification (source of truth)

## Purpose

The definitive statement of what the legacy FoodComposer database contains and where each piece belongs in Mongo. Every migration bug found so far came from an assumption baked into `lib/transform.js` with nothing independent to check it against — `verify-against-source.js` re-derives its expectations from that same function, so it reported "0 mismatches" while three real bugs were live.

**This document is that independent check.** The audit compares Mongo against *this spec*, not against `buildImport()`. When the two disagree, this document wins or gets corrected deliberately — the transform never gets to be its own authority again.

Source: `server/scripts/legacy-import/source-data/fullDATA_utf8.sql`. Column profiles measured 2026-09-27 against the full dump, independent of the existing transform.

## Scope decision (Human, 2026-09-27)

Migrate everything of real value. **Store-only — no UI work.** The data must land in Mongo correct and complete; surfacing it in the app is a separate, later decision.

Added to scope: **product cholesterol** and **global config** (`tblControl`). Both delivered 2026-09-27.

**Category images — dropped from scope** after building it revealed the premise was wrong. The 32 `imageURL` values all map cleanly to a label key, but *none of those keys exist in `KITCHEN_LABELS`*: the old system's 38 recipe categories came across as bare strings on `labels_`, never registered. There was nothing to attach an image to. Registering 38 category keys alongside the 11 dietary tags would have changed the product's label list from tags into a mixed taxonomy, which the Human did not want. Decision: **legacy categories stay as plain strings, images are discarded.**

Removed from scope after seeing what the data actually is:

- **Order history** — discarded. Every one of the 288 orders is undated, `supplier` and `isManual` are constant 0, and all remarks are empty. What remained was item + quantity with no date, supplier or note. Not worth a collection.
- **Cost snapshots** — not stored. The app computes cost live from current prices, so a historical figure in a neighbouring field is a trap waiting to be mistaken for the real one. **But `recipePrice` is used in the audit as an independent cross-check** (§7a): where our computed cost diverges wildly from what FoodComposer recorded, that flags a migration error. Read at audit time, never written.

---

## 1. Source inventory — what actually exists

26 tables. Only 13 carry real data.

| Table | Rows | Status |
|---|---|---|
| tblRecipeProducts | 13,424 | **core** — ingredient lines |
| tblOrderDetails | 14,176 | order history (degraded, see §6) |
| tblInstructions | 5,390 | **core** — steps + dish mise-en-place |
| tblOrderRecipes | 2,676 | order history |
| tblRecipies | 2,093 | **core** — recipes + dishes |
| tblProducts | 1,248 | **core** — products |
| tblOrders | 288 | order history (no dates, see §6) |
| tblCategoryMaster | 65 | categories + images |
| tblSuppliers | 34 | suppliers |
| tblProductGroups | 25 | product groups |
| tblMeasures | 6 | unit reference |
| tblDishTypes | 2 | real reference data (starters / mains) |
| tblControl | 1 | **global config — laborCost 30, vatPercent 16** |

**Empty (0 rows) — nothing to migrate, ever:** `tblCheckLists`, `tblEventType`, `tblMenues`, `tblMenuRecipies`, `tblMenuType`, `tblPackages`, `tblSuppliersProducts`, `tblTestProducts`, `tblTests`, `tempMass`.

**Scaffolding / scratch — deliberately not migrated:** `tblDishDetails` (3 rows, "Dish 1/2/3", placeholder text, 1 of 3 categoryIds doesn't resolve), `tblDishRecipie` (5 rows, 1 recipeNo doesn't resolve), `tmpOrders` (1 trivial row, scratch by name and content).

`tblCheckLists` being empty is load-bearing: it is *not* the source of the dish mise-en-place. `tblInstructions` is (plan 314).

---

## 2. Suppliers — `tblSuppliers` (34) → `KITCHEN_SUPPLIERS`

| Column | Nulls | → Mongo | Notes |
|---|---|---|---|
| supplierCode | 0 | `_legacySupplierCode` | PK 1–34 |
| SupplierName | 0 | `name_hebrew` | all unique |
| contactPerson | 10 | `contact_person_` | |
| phone1 | 9 | `phone_` | one value `"5566"` is a 4-char stub, not a phone |
| phone2 | 30 | `phone2_` | |
| fax | **34 (all)** | — | **drop: no data exists** |
| email | **34 (all)** | — | **drop: no data exists** |

---

## 3. Products — `tblProducts` (1,248) → `PRODUCT_LIST`

| Column | Nulls/zeros | → Mongo | Notes |
|---|---|---|---|
| product | 0 | `_legacyProductId` | |
| productName | 0 | `name_hebrew` | 4 duplicate names |
| measureUnit | 6 zero | `unit` via `tblMeasures` | 1,242 resolve; the 6 zeros have no unit → default + warn |
| quantityBruto / quantityNeto | 387 zero each | `yield_factor_` = neto/bruto | see §7 Finding D |
| price | 454 zero | unit price = price/bruto | |
| productGroup | 178 zero | product category | 1,070 resolve against 25 groups |
| supplierCode | 288 zero | supplier reference | **23% of products have no supplier** |
| calories, protein, carbohydrate, fat | ~1,220 zero each | `nutrition_per_100g` | only ~35 products carry any nutrition |
| Sodium | 1,224 zero | `nutrition_per_100g.sodium_g` | **max 158,000 — see §7** |
| colesterol | 1,243 zero (99.6%) | **NEW field** | 4 real rows; needs a model field |
| includesVat | const 0 | — | **drop: constant** |
| grams, liter, punit | mostly null | — | **unresolved, see §7 Finding D** |

---

## 4. Recipes & dishes — `tblRecipies` (2,093) → `RECIPE_LIST` / `DISH_LIST`

Split by `RecipeOrDish`: `2` → dish (986), otherwise preparation (1,107). One row has it NULL → defaults to preparation.

| Column | Nulls/zeros | → Mongo | Notes |
|---|---|---|---|
| recipeNo | 0 | `_legacyRecipeNo` | |
| recipeName | 0 | `name_hebrew` | 10 duplicate names → collision suffix |
| RecipeOrDish | 1 null | `recipe_type_` | |
| categoryId | 0 | `labels_` | 2,092/2,093 resolve; **recipe with categoryId=1 has no category** (min real id is 2) |
| noOfDishes | 425 zero | yield measure `dish` | |
| dbTotalGram | 777 zero | yield measure `gram` | |
| dbTotalLiter | 1,617 zero | yield measure **`ml`** | name lies — holds millilitres (plan 315) |
| dbTotalUnit | 1,209 zero | yield measure `unit` | |
| finalQuantity | 503 null / 579 zero | primary yield selector | see §7 |
| measureUnit | **const 2** | — | **drop: carries no information** (plan 315) |
| isChecked | **const 0** | `is_approved_` | always false — nothing was ever approved in the old system |
| recipePrice | 684 null / 552 zero | **NEW cost-snapshot field** | historical, not live cost |

Yield derivation (all measures, primary first) is specified in plan 315 and is not restated here.

---

## 5. Ingredient lines — `tblRecipeProducts` (13,424) → `ingredients_`

| Column | Nulls/zeros | → Mongo | Notes |
|---|---|---|---|
| recipeNo | 0 | parent | **13,424/13,424 resolve (100%)** |
| recipeLine | 0 | ordering | |
| productType + product | 19 zero | `referenceId` + `type` | polymorphic: type 0 → product (11,256/11,275 resolve), type 1 → recipe (**2,120/2,149**, 29 unresolvable) |
| measureUnit | 4 null | `unit_` | 13,420/13,420 resolve |
| quantity | 305 null / 5,445 zero (41%) | `amount_` | zero means absent — mirror fallback (plan 313) |
| Gram / Liter / Unit | mixed | `amount_` fallback | `Liter` is millilitres; **only 1 line in 13,424 ever draws its amount from it, and that line is labelled ml — no unit conflict in practice** |
| price, quantityPerPrice | ~44% zero | **NEW cost-snapshot fields** | historical line cost |

`Unit` here is a quantity column, not a `measureUnit` foreign key, despite the name — its values reach 1,500 while `tblMeasures` PKs run 1–7.

---

## 6. Order history — NOT MIGRATED (Human decision, 2026-09-27)

`tblOrders` (288), `tblOrderDetails` (14,176) and `tblOrderRecipes` (2,676) are deliberately excluded. The row counts look substantial, but the content is degraded past usefulness:

- **`orderDate` is NULL on all 288 orders** — the history has no dates at all.
- `supplier` and `isManual` are constant 0 across all 14,176 detail rows; `orderRemarks` is empty on all 288.
- 111 `recipeNo` + 191 `productID` values in details, and 16 in `tblOrderRecipes`, resolve to nothing.
- Magnitudes are implausible: `tblOrderRecipes.Gram` reaches 3,880,000 (~30× the largest recipe batch), `tblOrderDetails.quantity` reaches 1,400,000 (~15× any ingredient quantity).

What would survive is "some item, some quantity, no date, no supplier" — not an order history. Recorded here so nobody re-discovers these three tables later and assumes they were missed.

---

## 7. Data-quality flags — warn, never guess

- **Finding D (unchanged, still unresolved):** 89 products have `quantityBruto = quantityNeto = 0` while `grams`/`liter`/`punit` hold a value. The relationship is not inferable — the mirror matches bruto 83–93% of the time for gram/ml/unit products and **0/19** for kg products. `yield_factor_` stays 1 and the row is flagged. Guessing here would corrupt a live costing input.
- **`tblProducts.Sodium` — resolved 2026-09-27: the column is good, one row is not.** Only 23 products carry a value and they check out against real-world figures: egg yolk 48 mg (exact), wakame 872 (~870), anchovies 6,602 (real range 3,700–5,000). The column is milligrams per 100g and the existing `/1000` conversion to grams is correct. Exactly one value is impossible — `אבקת אפיה` (baking powder) at **158,000 mg/100g**, i.e. 158g of sodium inside 100g of product; real baking powder is ~11,000, so this looks like a 10× entry error. **Rule: reject any nutrition value above 100,000 mg/100g (>100% by mass) and flag the product; migrate the rest as-is.** Discarding the column would have thrown away 22 genuine entries.
- **Product `measureUnit = 0`** on 6 rows — no unit; default and warn.
- **`categoryId = 1`** on one recipe — no such category.
- **29 sub-recipe references** in `tblRecipeProducts` don't resolve.
- **`tblProductGroups.groupName = "ה"`** — 1-character stub among 24 real names.

---

## 8. Global config — `tblControl` (1 row)

`laborCost = 30`, `vatPercent = 16`, `name = "Dan"`. Real operating settings from the old system, previously written off as a dead table. Needs a destination; `MASTER_META` is the natural candidate. `tblProductGroups.vat` and `tblProducts.includesVat` are both constant 0 and carry nothing.

---

## 9. Reference data

- `tblMeasures` (6) → `KITCHEN_UNITS`. kg / gram / liter / ml / unit + 1 more.
- `tblProductGroups` (25) → product categories.
- `tblCategoryMaster` (65) → `KITCHEN_CATEGORIES`; `imageURL` populated on 32 rows but only **24 distinct URLs**, so several categories share an image. `IsActive` is constant 1 → drop.
- `tblDishTypes` (2) → starters / mains. Small but real; previously overlooked as scaffolding.

---

## 7a. `recipePrice` as an independent audit signal

`tblRecipies.recipePrice` holds the old system's own cost figure for ~857 recipes. It is **not stored** (see Scope decision), but the audit reads it and compares it against the cost our migrated data computes for the same recipe.

This is the one cross-check in the whole effort that does not come from our own code. A recipe whose computed cost diverges wildly from what FoodComposer recorded is a migration error announcing itself — exactly the class of bug that `verify-against-source.js` structurally cannot catch, because it re-derives its expectations from the same transform it audits. Prices will have drifted since the data was entered, so treat a large ratio, not a small difference, as the signal.

## 10. Open questions — all resolved

All three questions were answered by the Human on 2026-09-27 and folded into the sections above: Sodium (§7, keep with one rejection rule), order history (§6, discarded), cost snapshots (Scope decision + §7a, not stored but used as an audit signal).

## Outcome — 2026-09-27

**Complete on both databases.** `audit-against-spec.js` reports zero findings on Atlas, and on local only three master documents edited through the app (recipeNos 2067, 2165, 2442 — real content edits, deliberately preserved).

1. **Audit built** — `audit-against-spec.js` derives every expectation from this document and never imports `buildImport()`, closing the blind spot that hid three bugs behind a clean report.
2. **Full re-import was NOT needed.** The audit showed local master already faithful for everything in scope before today; a rebuild would have churned 2,093 recipes and 1,229 products to fix three additive gaps touching 36 documents. Targeted work won on evidence, not preference.
3. **Cost cross-check run** (§7a) — 854 comparable recipes, median ratio 1.64, no clustering at any power of ten. Rules out a systemic unit error. Weaker than hoped as positive proof, since `recipePrice` may include labour or VAT and its basis is unknown.
4. **Orphan sweep** — 2,855 local + 7,752 Atlas documents belonging to deleted accounts. These came from accounts removed out-of-band; the admin delete route's cascade is correct and was never at fault.
5. **Atlas rolled out** — see plan 316.

### Known ceiling — not defects, cannot be migrated

- **48 ingredient lines** reference nothing (`product = 0`) or a sub-recipe absent from `tblRecipies`, affecting 40 recipes.
- **454 products (36%)** have no price in the source, so recipes using them under-cost.
- **69 sub-recipe lines** request a unit the sub-recipe never recorded a measure for; they fall through to a 1:1 registry conversion. Plan 315 reduced this from the majority to 69 of 2,120 by migrating every measure.
- **1 sodium value** rejected as physically impossible (baking powder, 158,000 mg/100g).
