# Plan 314 — Dish mise-en-place (מיזאנפלאס) import: use the legacy checklist, not a copy of the ingredient list

**Supersedes `plans/200-300/300-legacy-foodcomposer-import-repair.plan.md` Finding 5.** That finding's conclusion — that a dish's מיזאנפלאס list is every ingredient line — is retracted here on direct evidence from the source dump and the old app's own UI.

## Goal

A legacy dish's "רשימת הכנות (מיזאנפלאס)" section shows the chef's actual checklist text from the old FoodComposer database, and nothing is fabricated from the ingredient list.

## Context

User-reported: dish `קרפציו דג ים עם יוגורט עמבה צ׳יפס במיה עגבניות שרי בשמן מתובל ומיקרו כוסברה` (**recipeNo 1317**) shows a מיזאנפלאס section that is a verbatim copy of the ingredient index directly above it. The old app shows a **"צ׳ק ליסט"** panel for the same dish with six hand-written preparation lines bearing no resemblance to the ingredient names.

The old app's "צ׳ק ליסט" panel renders `tblInstructions` rows. The data **was** migrated — into the wrong field. `transform.js` maps `tblInstructions` → `steps_`, then fabricates `prep_items_` by copying every ingredient line of the dish.

Source rows for recipeNo 1317, matching the old-app screenshot line for line:

| stepNo | stepDescription |
|---|---|
| 4805 | קרפציו דג דפוק בין ניירות פרגפלסט |
| 4878 | סקוויזר יוגורט מנגו עמבה |
| 4879 | ציפס במיה |
| 4880 | עגבניות שרי קלופות מסוננות היטב משמן זית |
| 4881 | מיקרו כוסברה |
| 4882 | שמן מתובל מעגבניות השרי בסקוויזר |

The ingredient-copy behaviour is deliberate and documented at `server/scripts/legacy-import/lib/transform.js:228-247`, citing plan 300 Finding 5 and rejecting `tblInstructions` as "inconsistent free text … unsafe to parse structurally". That premise is wrong for dishes, and it has been applied three times: the original import wrote no prep list, `backfill-dish-prep-items.js` derived one from sub-recipe ingredient lines, `repair-dish-prep-items.js` widened it to all ingredient lines. Each iteration refined the wrong source.

## Evidence

Measured against `server/scripts/legacy-import/source-data/fullDATA_utf8.sql`, splitting dishes (`RecipeOrDish === 2`) from preparations:

- **986 dishes**; **857** have ≥1 `tblInstructions` row, **129** have none.
- **3,198** dish instruction rows; median **4** per dish, max 11.
- **Median description length 21 characters**, p90 59, p99 138 — short component names ("מיקרו כוסברה", "ציפס במיה"), not narrative prose. Only **55 lines (1.4%)** exceed 120 chars.
- **214 rows (6.7%)** contain embedded newlines — the "several crammed into one row" case the old comment cited. Splitting yields **762 extra rows**.
- After splitting and dropping blank lines: **3,952 prep rows across 849 dishes**, replacing today's **5,754 ingredient-copy rows** in Mongo (5,783 raw ingredient lines in the dump, less the ones whose product never resolved at import time and were dropped). **137 dishes** end up empty (129 with no rows, plus 8 whitespace-only).
- `tblCheckLists(ID, DishID, Description)` exists in the schema with **zero INSERT rows** — a dead end, not the source.

**The app already agrees with this mapping.** `recipe-builder.page.ts:325-331` converts step instruction text into prep-item names when a recipe becomes a dish (`createPrepItemRow({ preparation_name: step.instruction })`); `recipe-ai-flow.service.ts:99-105` does the same for AI-generated dishes. Step text → prep-item name, no quantity, is the app's own semantics. The importer is the only place that differs.

**`steps_` is dead weight on a dish.** `cook-view.page.ts:1068-1159` and `recipe-builder.page.html:155-165` branch strictly on `isDish_()`; the dish branch builds the workflow form only from `getPrepRowsFromRecipe()` and saves back to `prep_items_`/`prep_categories_`. `steps_` is never rendered, edited, or written for a dish — so this change leaves no section empty, it fills one that is currently wrong.

## Decisions (confirmed with the Human)

1. **Quantity/unit:** `quantity: 0`, `unit: 'gram'`. The old checklist had no quantity column (only prep-time minutes) — no value is invented. The ingredient index still carries real quantities.
2. **Dishes with no checklist rows (137):** leave the prep list **empty**. No fallback to the ingredient copy.
3. **Multi-line rows (214):** **split on newlines**, one prep row per non-empty line.

## Atomic Sub-tasks

- [ ] 1. `lib/transform.js`: remove the ingredient-derived `prepItemRows` block from the ingredient loop; rebuild `prep_items_`/`prep_categories_` for dishes from the `stepNo`-sorted `tblInstructions` rows, splitting on newlines, `quantity: 0`, `unit: 'gram'`, `category_name: ''`; warn per dish with no rows. Replace the retracted comment at 228-247.
- [ ] 2. `repair-dish-prep-items.js`: add `_userModified: { $ne: true }` to the Pass 2 per-user filter; update docstring to the corrected source.
- [ ] 3. `backfill-dish-prep-items.js`: docstring note marking it superseded, do not re-run.
- [ ] 4. Dry-run `repair-dish-prep-items.js`; confirm counts against the Verification table.
- [ ] 5. Run `repair-dish-prep-items.js --write=local`.
- [ ] 6. Re-run `verify-against-source.js` against `__master__` and each user with dish clones.
- [ ] 7. UI spot-check recipeNo 1317.
- [ ] 8. `ng build`.

## Implementation notes

`category_name` is left **empty**. The plan originally called for the existing `FALLBACK_PREP_CATEGORY` (`'הכנות'`) on the assumption it would render as a selected dropdown value; a live UI check disproved that. The prep-category dropdown is backed by `KITCHEN_PREPARATIONS.categories`, which holds `["קישוט","תוספות","נקניקיות","רטבים","קצבות","קונדיטוריה","הפשרות","בישולים","חיתוכים","רטבים_צירים","טיגון"]` — no `'הכנות'`. Writing it would store a value no option can match, so the row renders unselected while holding a phantom category. Empty keeps stored data and UI in agreement. `FALLBACK_PREP_CATEGORY` became unused and was deleted.

`prep_categories_` stays a single group. It is a pure fallback view: `RecipeFormService.getPrepRowsFromRecipe()` (`src/app/pages/recipe-builder/services/recipe-form.service.ts:116-142`) prefers `prep_items_` whenever non-empty.

`steps_` is left untouched for dishes — it duplicates the text but is invisible in the dish UI, and is the only place `prepareMinutes` survives (`labor_time_minutes_`).

**Preparations are untouched.** For a non-dish, `tblInstructions` → `steps_` is correct and is what the UI renders.

`repair-dish-prep-items.js` already re-parses the dump and calls the real `buildImport()`, so it is the repair path and needs no rewrite beyond the `_userModified` guard. Its Pass 2 currently overwrites every clone unconditionally (`find({ userId, _masterId: { $ne: null } })`, line 113) — survivable when the script only widened a prep list, destructive now that it replaces one wholesale.

`verify-against-source.js` needs no change: it already diffs `prep_items_` (lines 265-283) and `steps_` (287-300) via `buildImport()`. Standing caveat: it can only catch drift between `buildImport()` and Mongo, never a wrong assumption inside `buildImport()` — which is exactly how this bug survived a clean audit three times.

## Verification

| Check | Before | Expected after |
|---|---|---|
| Total dish prep rows across `__master__` | 5,754 (ingredient copies) | 3,952 (checklist lines) |
| `__master__` dishes with a non-empty prep list | 986 | 849 |
| `__master__` dishes with an empty prep list | 0 | 137 |
| recipeNo 1317 prep list | 6 rows duplicating its ingredients | the 6 checklist lines above, quantity 0, unit גרם, category unselected |
| A dish whose source row had newlines | 1 cramped row | one row per line (762 extra rows overall) |
| recipeNo 1317 ingredient index | 6 lines, real quantities | **unchanged** |
| Dish `steps_` | populated from `tblInstructions` | **unchanged** (invisible in dish UI) |
| Preparation (non-dish) docs | steps from `tblInstructions` | **unchanged** — no prep list written |
| A clone with `_userModified: true` | would be overwritten | skipped, user's edits preserved |
| `verify-against-source.js` (`__master__` + each user) | passed against the wrong expectation | 0 prep mismatches |
| `ng build` | — | passes |

## Blast-radius check (done, negative result)

Dish-type detection is duplicated across 6+ sites as `recipe.recipe_type_ === 'dish' || !!(recipe.prep_items_?.length || recipe.prep_categories_?.length)` — `kitchen-state.service.ts` (2x), `recipe-form.service.ts:281`, `cook-view.page.ts:257-258`, `recipe-book-list.component.ts:515`, `menu-intelligence.page.ts:668`, `excel-workbook.util.ts:176-179`. Emptying 137 prep lists could in principle have made those dishes fall through to the preparation branch.

Verified it cannot: the prep fallback is always an `||` *after* the `recipe_type_` check (and in `cook-view` an explicit early return when `recipe_type_ != null`), so it can only ever add dish-ness, never remove it. All 986 legacy dishes plus all 15 non-legacy ones carry `recipe_type_: 'dish'` explicitly. Confirmed live: recipeNo 173 (`סשימי דם`, now empty) still renders the מיזאנפלאס section with no steps section.

## Known quality caveats of the new source

- Of the 137 emptied dishes, **75 are empty shells anyway** (no ingredients either) and only **62** are real dishes with ingredients whose source has no usable checklist — mostly the `(יאמי)` batch (e.g. recipeNo 2167, 2087, 2048, 2175). Two source rows are literal whitespace junk (`"\n\n"` on recipeNo 2381, which has 16 ingredients).
- ~20% of dish instruction rows are prose-ish by a broad heuristic (>60 chars, or containing a period, or ≥2 commas) — including pure serving instructions (recipeNo 838: `"מגישים חם ישירות מהבישול."`) and one 975-char baking narrative (recipeNo 2086). These now render as long prep-row labels. Accepted: filtering them would mean inventing an editorial rule the source does not support.

## Rules

- Do **not** re-run the full import, and do **not** re-run `backfill-dish-prep-items.js`.
- Do **not** derive a dish's prep list from its ingredient lines again. If a future audit cites plan 300 Finding 5, it is reading a retracted conclusion — this plan is why.
- `prepareMinutes` has no home in `FlatPrepItem`; the old checklist's "זמן הכנה (בדקות)" column survives only in the invisible `steps_[].labor_time_minutes_`. Surfacing it is a feature decision, not a migration fix.
- 55 post-split lines exceed 120 chars (max 394) — genuine prose that renders as a long prep-row label. Left as-is; trimming would mean inventing an editorial rule the source does not support.
