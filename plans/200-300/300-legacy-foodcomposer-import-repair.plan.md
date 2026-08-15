# Plan 300 — Repair legacy FoodComposer import: dangling sub-recipe refs, missing dish mise-en-place, nutrition backfill, client-side load race, and a re-runnable source-vs-Mongo audit

overview: Fix two confirmed bugs from the FoodComposer→Mongo migration (commit 9a8aca4) — sync-master.js never remaps sub-recipe ingredient references on clone, and the import never populated dishes' prep_items_/prep_categories_ (the "mise en place" list) — repair the already-corrupted local Mongo data, and backfill the ~34 products with real (non-junk) nutrition values that were wrongly excluded. A full completeness audit against the original SQL dump confirmed no other data (products, recipes, ingredient lines, categories, units) was silently dropped. A follow-up investigation, prompted by the user still seeing blank ingredient rows after both bugs were fixed and verified, found a third, separate, purely client-side bug (a load-order race in recipe-builder, confirmed via direct DB re-check to cause zero actual data loss) — this plan now also covers gating recipe-builder/recipe-book/cook navigation on the data being loaded, and building the user-requested re-runnable `verify-against-source.js` audit script.

# Context

User reported two symptoms after the legacy FoodComposer→Mongo import (`9a8aca4`, branch `feat/legacy-foodcomposer-import`): (1) dishes are missing their "mise en place" (prep list) items, and (2) several recipes have ingredient rows with an amount but a blank product/name (confirmed via screenshot: qty `10 גרם`, ₪0.00, empty product-search box, alongside otherwise-normal-looking ingredient rows). The import commit's own message claimed "0 unresolved ingredient refs" — that check was against the raw import output before any user ever synced/cloned the master data, so it never exercised the clone path where the real breakage happens.

The user then asked for a deeper completeness audit — are there other products/ingredients/definitions from the old app that silently never made it into the new database at all? This plan covers both: the two confirmed clone-time bugs, **and** a full accounting of every other row in the source SQL dump against what the import kept vs. dropped, so nothing is left unaccounted for.

## Bug 1 — `server/services/sync-master.js`: sub-recipe ingredient refs are never remapped on clone

`remapIngredients()` is only ever called with `productMap` (master-product-id → user-product-id). An ingredient of `type: 'recipe'` (a preparation used as a component of another recipe/dish — e.g. "פיצה" using "רוטב לפיצה" as an ingredient) stores a master `RECIPE_LIST`/`DISH_LIST` `_id` as `referenceId`. `remapIngredients` looks that id up in `productMap`, never finds it (wrong collection), and silently keeps the **original master-scoped id** on the clone. After cloning, that id doesn't exist anywhere in the user's own `RECIPE_LIST`/`DISH_LIST` (clones get fresh ids), so the frontend can't resolve the sub-recipe's name → the ingredient row renders with a blank name and ₪0.00 cost. This is exactly the same shape of bug `server/scripts/fix-supplier-refs.js` was written to repair for supplier ids — sync-master's remap coverage was incomplete then too, and has the same gap now for recipe/dish self-references.

Confirmed at scale for `dev-guest` (the only account with legacy-imported data synced in so far): **2,120 of 13,376 imported ingredient lines (~16%)** are dangling `type: 'recipe'` refs. Verified all 2,120 resolve cleanly (0 remaining) once matched against `dev-guest`'s own `RECIPE_LIST`/`DISH_LIST` `_masterId` linkage (1,809 via `RECIPE_LIST`, 311 via `DISH_LIST`) — i.e. the fix is a correct, complete match for the corruption, not a partial one. `type: 'product'` refs were separately checked and are **100% clean** (0 broken) — this bug only hits sub-recipe/preparation ingredient lines. (The specific screenshot ingredient turned out to belong to `dev-guest`'s data by name-match, though its exact row wasn't pinned down — the DB-side scan is what confirms the bug class and its full scope regardless.)

## Bug 2 — legacy import never wrote `prep_items_`/`prep_categories_` for dishes

`Recipe.prep_items_`/`prep_categories_` (`src/app/core/models/recipe.model.ts:49-52`) are the actual "mise en place" fields — the dish-workflow UI in `recipe-builder` reads them exclusively via `RecipeFormService.getPrepRowsFromRecipe()` (`src/app/pages/recipe-builder/services/recipe-form.service.ts:116`), **not** `ingredients_`. `server/scripts/legacy-import/lib/transform.js`'s dish doc builder (lines 252-271) only ever sets `ingredients_`/`steps_`/yield/labels — it never derives `prep_items_`/`prep_categories_`. Confirmed: **0 of 986 imported dishes** have either field populated, even though 724 of them do have sub-recipe (`type: 'recipe'`) ingredient lines under the hood. Every imported dish's mise-en-place section renders empty in the UI.

## Completeness audit — everything else checked against the raw SQL dump

Re-ran the import in dry-run mode (read-only, no DB writes) plus direct inspection of `c:\coding projects\foodcostdatabase\fullDATA_utf8.sql` to account for every table and every warning class:

| Area | Finding | Verdict |
| --- | --- | --- |
| Products (1,248 raw rows) | All migrated; 1,230 vs. 1,248 gap is legitimate name-collision reuse against pre-existing master products (not loss) | ✅ no action |
| Duplicate product names in source (3 groups, 4 rows: קולורבי, נייר כסף, מחית כמהין חבשוש) | Collapsed into 1 product each, later rows' price/supplier silently dropped | **User decision: keep as-is** (same low-severity pattern already accepted for recipe/dish name collisions) |
| Dropped ingredient lines (48 of 13,424) | 32 are sub-recipes referencing a `recipeNo` that **never existed** in the source `tblRecipies` table at all (confirmed via direct grep — e.g. recipeNo 1, 400, 544, 1623, 1781 appear nowhere as rows) — these are dangling FKs **already broken in the old FoodComposer database**, not new loss. 16 are `product 0` sentinel rows (quantity 0, price 0 — empty placeholder ingredient lines in the source, not real content) | ✅ inherited/non-issue, no action — informational only |
| Category mapping (`tblCategoryMaster`, 65 ids used by recipes) | 100% mapped; the only 2 "no label" cases (ids 1, 67) are deliberately-blank "Uncategorized" buckets by design | ✅ no action |
| Product-group mapping (`tblProductGroups`) | 100% mapped | ✅ no action |
| Unit mapping (`tblMeasures`) | 6 of 6 real units mapped; 10 rows (6 products + 4 ingredient lines) use unit `0`/`null` (not a real unit in the source either) and default to `gram` | ✅ acceptable fallback, no action |
| Missing price (386 of 1,248 products, 31%) | Confirmed against raw SQL: these products genuinely have `price = 0`/`quantityBruto = 0` in the source (e.g. "מיקס גבינות") — inherited incompleteness, not a parsing/migration bug | ✅ inherited, no action — informational only (these will show ₪0 cost until manually priced, same as they did in FoodComposer) |
| Nutrition data (35 of 1,248 products have any nonzero value; excluded from import entirely) | Sampled: cucumber's 1/2/3/4/5/6 is obviously fake test data, but ~34 others look like genuinely entered real values (e.g. egg yolk: 322 kcal / 1085mg cholesterol; sugar: 396 kcal / 99g carb) | **User decision: backfill the ~34 real-looking ones** into `Product.nutrition_per_100g_` (skip the 1 fake test row) |
| `tblOrders`/`tblOrderRecipes`/`tblOrderDetails` (290 past production/event runs, ~14k line items) | Historical operational data (batch-produce N dishes for an event → shopping/prep list), not master-data definitions | **User decision: out of scope**, not migrated |
| `tblControl` (1 row: labor cost 30, VAT 16%) | Old single config snapshot | **User decision: out of scope**, not migrated |
| `tblDishRecipie`/`tblDishDetails`/`tblDishTypes` (5/5/4 rows) | Inspected fully — contents are early scaffolding/test data ("Dish 1", "No Description", etc.), superseded by the `categoryId`/`RecipeOrDish` mechanism already in use | ✅ correctly ignored, no action |

## Finding 4 — silent 500-doc cap on every full-collection load (the actual cause of "still missing" after Finding 3's fix)

After the Finding 3 client-race fix was deployed, the user still saw the same symptom live (`סשימי דג ים...`, 2 of 8 ingredients blank). Direct browser network inspection (via `gstack browse`, cookie-authenticated as `dev-guest`) showed `PRODUCT_LIST`/`RECIPE_LIST` both returning `200` successfully with real data — ruling out a load-timing race entirely. The actual cause: `server/routes/generic.js`'s `GET /:type` handler has capped results at `Math.min(parseInt(req.query.limit) || 500, 1000)` since March 2026 (commit `0ea0c53`, long before this branch) — harmless until now because no account's collection ever exceeded 500 docs. `HttpStorageAdapter.query()` (`src/app/core/services/http-storage.adapter.ts`) never sends `?limit=`, so every full-collection load across the **entire app** (not just recipe-builder) silently returns only the first 500 docs, in whatever order Mongo returns them.

The legacy import pushed `dev-guest` well past that ceiling: `PRODUCT_LIST` 1,478 docs, `RECIPE_LIST` 1,112, `DISH_LIST` 1,001. Whether a given ingredient's product/sub-recipe happened to land in the first-500 subset was luck — explaining every symptom reported this session, including why navigating away and back sometimes "fixed" a row (a different random subset reloaded).

**Fix applied (verified live via `gstack browse` — all 8 ingredients + all 3 mise-en-place items resolve correctly for `סשימי דג ים...` after this):**
- `server/routes/generic.js`: raised the cap from `500`/max `1000` to `20000`/max `20000` — well above current real-world collection sizes, still bounded.
- `server/index.js`: added the `compression` npm package + `app.use(compression())` (no gzip existed before) so the now-larger full-collection responses (`DISH_LIST` measured 1.85MB uncompressed) stay cheap over the wire — confirmed via `curl -H "Accept-Encoding: gzip"` that `Content-Encoding: gzip` is now returned.

**Deliberately not fixed here — tracked as a separate follow-up plan (see below):** raising the cap is a correctness fix, not a performance one. The user flagged real perceived slowness (recipe-builder's first ingredient-search felt like a multi-second wait) once catalogs are this large, correctly diagnosing it as "we search the full catalog client-side, we should be searching server-side instead." That's a proper architecture change, scoped separately as **plan 301** (server-side search / lean list loading), not folded into this import-repair plan. Also noted for that follow-up: `UserService` (`src/app/core/services/user.service.ts:60-67`) intentionally calls `reloadFromStorage()` on these same services right after auth resolves (to replace the anonymous `__master__`-only view with the real user-scoped one) — this means every fresh page load currently does two full-collection fetches, not one; worth revisiting once server-side search reduces how much a "full load" even means.

## Finding 5 — dish mise-en-place derivation was too narrow (sub-recipes only, should be every ingredient)

After Finding 4's fix, the user reported the `סשימי דג ים...` dish's מיזאנפלס list was *still* missing a couple of items relative to their memory of the old FoodComposer app. Traced recipeNo 253 entirely by hand against the raw `tblRecipeProducts`/`tblInstructions` rows (bypassing all of our own import code) to check independently: the 8 ingredient lines and 3 sub-recipe-derived prep items were byte-for-byte correct per Finding 2's original rule — so nothing was silently dropped *by that rule*. The rule itself was the problem.

Investigated `tblInstructions` (mapped to `steps_`) as a candidate second signal — it turned out to be inconsistent free text across dishes (sometimes ~1 row per component, sometimes more rows than ingredients as genuine micro-steps, sometimes one row with several components crammed together via embedded newlines, sometimes full narrative prose unrelated to any single ingredient — only ~18% of dishes have instruction-count exactly equal to ingredient-count), so it's unsafe to parse structurally as a prep-list source.

**Domain clarification from the user:** a dish's מיזאנפלס can name a sub-recipe *or* a plain product — either represents something the cook needs staged to assemble the dish. There's no field in the source schema distinguishing "assembly component" from "generic ingredient." Given that, and given the failure mode we're trying to eliminate is *under*-reporting, the fix is: **every ingredient line of a legacy dish belongs in `prep_items_`, not just sub-recipe (`type: 'recipe'`) lines.** This only affects derivation of already-existing legacy data — dishes created going forward have their מיזאנפלס entered directly by the user in the UI, not derived.

**Fix applied and verified:**
- `server/scripts/legacy-import/lib/transform.js`: removed the `isSubRecipe &&` condition gating `prepItemRows` — every ingredient line of a dish (`row.RecipeOrDish === 2`) now becomes a prep item; plain-product lines resolve their name via a new `productNameBySqlId` map (mirrors the existing `finalNameByRecipeNo` pattern for sub-recipes), category falls back to the existing `FALLBACK_PREP_CATEGORY` since products have no recipe-category equivalent.
- New `server/scripts/legacy-import/repair-dish-prep-items.js` (dry-run default, `--write=local`) — re-parses SQL fresh, runs the real `buildImport()`, and **replaces** (not just fills blanks like `backfill-dish-prep-items.js` did) `prep_items_`/`prep_categories_` on every already-imported dish, master then per-user. Run and applied: 934 of 986 `__master__` dishes corrected, 934 of 1,001 `dev-guest` dishes corrected (the ~52 untouched already matched — dishes whose only ingredients were already all sub-recipes).
- Re-ran `verify-against-source.js` — still 0 mismatches against both `__master__` and `dev-guest` (it automatically reflects the corrected rule since it also calls `buildImport()`).
- Also added a `steps_`/instructions comparison to `verify-against-source.js` while investigating this (it previously only checked `ingredients_` and `prep_items_`) — also 0 mismatches; confirms `tblInstructions` → `steps_` was already migrated correctly, it's just never displayed in the dish-builder UI (only shown for `recipe_type_: 'preparation'`, never for a dish) — noted as a possible future UI addition, not pursued now.
- **Verified live** via `gstack browse`: `סשימי דג ים...`'s מיזאנפלס now shows all 8 items (previously 3), matching every ingredient line exactly.

**Source file now committed to the repo** — `server/scripts/legacy-import/source-data/fullDATA_utf8.sql` (~10MB, UTF-8 converted), with a `README.md` alongside it. Reasoning: the migration is still actively being validated (this finding is proof — new discrepancies are still surfacing well after the original import), so `verify-against-source.js` needs a stable, reproducible source rather than depending on an external machine-only path. **This is explicitly temporary** — once the import is fully validated and stable, delete it (Mongo is the permanent source of truth, not this file) — tracked as an open Atomic Sub-task below, not to be done casually since it disables all future re-auditing. All four `DEFAULT_SQL_PATH` script defaults now point here (`path.resolve(__dirname, 'source-data', 'fullDATA_utf8.sql')`); the `--sql-path=` override flag still works for a different location if ever needed.

## Final full-database sweep (post Finding 5) — nothing else missed

Per explicit request ("run over all of our database to make sure nothing else was
missed"), extended `verify-against-source.js` to also check **suppliers** (previously
only products/recipes/dishes were structurally verified — suppliers were only
count-checked in the original completeness audit table, never field-by-field). Also
confirmed, by direct query, that `dev-guest` is the **only** account with any
`_legacyImport: true`-flagged document in `PRODUCT_LIST`/`RECIPE_LIST`/`DISH_LIST` —
no other account silently still carries the pre-fix broken data. Re-ran all four
repair scripts fresh in dry-run mode (`repair-subrecipe-refs.js`,
`backfill-dish-prep-items.js`, `backfill-product-nutrition.js`,
`repair-dish-prep-items.js`) — **all report 0 remaining issues**. `verify-against-source.js`
(now covering suppliers + products + recipes + dishes + ingredients + prep_items_ +
steps_) reports **0 mismatches** against both `__master__` and `dev-guest`.

## Finding 3 — client-side load race in recipe-builder (separate from the migration; confirmed no data loss)

After bugs 1 and 2 above were fixed and verified in Mongo, the user still saw blank ingredient rows in the recipe-builder UI for a live example dish (`סשימי דג ים על יוגורט מצומצם, זרעי עגבניה ושמן שית`, `_legacyRecipeNo: 253`) — 2 of 8 ingredient rows blank, despite the DB being independently re-verified correct at that exact moment (all 8 `ingredients_` resolvable, `prep_items_` had all 3 real items). This pointed to the client, not the data.

**Root cause:** `src/app/app.routes.ts`'s `recipe-builder`/`recipe-builder/:id` routes gate navigation on `equipmentEnsureLoadedResolver` and `preparationsEnsureLoadedResolver` (both block via `ensureLoaded()` until their data is hydrated) — but there is **no equivalent resolver for products/recipes/dishes**. `ProductDataService`, `RecipeDataService`, `DishDataService` (all under `src/app/core/services/`) each just fire-and-forget `loadInitialData()` in their constructor — no `ensureLoaded()`, no gating. `RecipeFormService.patchFormFromRecipe()` (`src/app/pages/recipe-builder/services/recipe-form.service.ts:306-331`) resolves each ingredient's `referenceId` against `KitchenStateService.products_()`/`recipes_()` (which just proxy these three services) at whatever moment the form patches — if that happens before the lists finish loading, and there's no `nameSnapshot` to fall back to (legacy-imported ingredients never got one — `transform.js` doesn't set it), the row's `resolvedRefId`/`resolvedType` get **permanently cleared for that form session** (lines 326-331) with no retry once the data does arrive a moment later, because the reason for the null isn't "orphaned" (it's "not loaded yet") but the code can't tell the difference. This is a genuine, non-deterministic race — explains why refresh/sign-out-in/server-restart didn't reliably reproduce or fix it, and why different rows were affected on different attempts. User empirically confirmed the theory: navigating away from the recipe and back in-app (not a hard refresh, so the lists were already warm) resolved a previously-blank row.

**Confirmed NOT a data-loss bug:** direct Mongo re-check of the exact doc (`DISH_LIST`, `userId: 'dev-guest'`, that dish) after the user's navigate-away-and-back test that appeared to drop the mise-en-place list from 3 items to 2 in the UI: **`prep_items_` is still 3 in the database**, matches the `__master__` doc exactly, and `addedAt_ === updatedAt_` (both `2026-08-09T19:31:24.673Z`) — the document has never been written to since the original import, so no save ever reached Mongo with the truncated state. The "3→2" the user saw was purely this same client race re-rendering the mise-en-place tab from a still-settling `recipes_()` signal, not a persisted loss. **No repair script is needed for this finding** — it's a pure UI/UX correctness fix, not a data fix.

# Fix approach

## 1. Root-cause code fix — `server/services/sync-master.js`
Extend ingredient remapping so `type: 'recipe'` lines are covered, not just `type: 'product'`:
- Build a combined masterId→userId map spanning both `RECIPE_LIST` and `DISH_LIST` (a sub-recipe/prep can live in either), analogous to `getProductIdMap()`/`getEquipmentIdMap()`.
- Update `remapIngredients()` (or its call sites) to dispatch on `ing.type`: `product` → productMap, `recipe` → the new recipe/dish map.
- **Ordering hazard to handle:** `CLONEABLE_TYPES` processes `RECIPE_LIST` before `DISH_LIST`, but within a single entity type's own pass, `toInsert` isn't written to the DB until after the whole `masterDocs` loop completes — so a `RECIPE_LIST` doc whose ingredient references a *sibling* `RECIPE_LIST` doc being cloned in the same pass won't find it via a DB `find()` query built before the loop. Build the recipe/dish id map incrementally as `toInsert` clones are constructed (mirroring `transform.js`'s existing two-pass "allocate all ids first" pattern), not purely from a pre-loop DB read.
- Apply the fix in both Rule 1 (new clone) and Rule 2 (refresh unmodified clone) code paths — both currently only remap via `productMap`/`equipmentIdMap`.

## 2. Import-script fix — `server/scripts/legacy-import/lib/transform.js`
For dishes only (`row.RecipeOrDish === 2`), derive `prep_items_` (and grouped `prep_categories_`) from the ingredient rows already identified as sub-recipes (`isSubRecipe` block, ~line 202-220):
- `preparation_name`: the resolved sub-recipe's `finalName`.
- `quantity`/`unit`: from the ingredient row (`ing.quantity`, mapped unit) — same values already used for the `ingredients_` entry.
- `category_name`: the sub-recipe's own first label, translated to Hebrew via `dictionary.json`'s `general` map (same file `applyDictionary()` already reads/writes) — falls back to a single generic bucket (e.g. `"הכנות"`) when the sub-recipe has no label. This matches the existing free-text convention (`category_name` is raw Hebrew text, not a dictionary key — confirmed against `public/assets/data/demo-dishes.json`'s existing `prep_categories_` shape), so no `translatePipe` involvement needed at render time.
This only affects **future** re-imports (`--force` re-run) — it does not touch already-imported data, hence step 3 below.

## 3. One-off data repair scripts — `server/scripts/legacy-import/` (dry-run by default, `--write=local` to apply; local Mongo only for now — Atlas repair deferred to a later explicit step)
Follow the existing `fix-supplier-refs.js`/`migrate-supplier-ids.js` pattern (dry-run default, explicit write flag, per-user summary log).

**a. `repair-subrecipe-refs.js`** — for every non-`__master__` user with `_legacyImport`-flagged `RECIPE_LIST`/`DISH_LIST` clones: build that user's own master→user id map (from `_masterId` on their `RECIPE_LIST` + `DISH_LIST` docs), scan their `ingredients_` for `type: 'recipe'` entries whose `referenceId` doesn't match any of their own `RECIPE_LIST`/`DISH_LIST` `_id`s, and remap via the id map. Log per-user fixed count and any still-unresolved refs (should be 0, per the investigation above).

**b. `backfill-dish-prep-items.js`** — run in this order so preparation names resolve correctly at each scope:
   1. Backfill `prep_items_`/`prep_categories_` on **`__master__` `DISH_LIST`** docs missing them, deriving from their own `ingredients_` (`type: 'recipe'`) + the referenced **master** `RECIPE_LIST`/`DISH_LIST` doc's `name_hebrew`/label — this makes future syncs to *new* users correct without needing this script re-run (Rule 1 clone spreads whatever fields exist on the master doc).
   2. Backfill the same fields on already-cloned **user** `DISH_LIST` docs (run *after* 3a/repair-subrecipe-refs.js so each user's `ingredients_` refs are already valid), deriving from that user's own now-correct `ingredients_` + their own `RECIPE_LIST`/`DISH_LIST` docs. (`sync-master.js` Rule 2 only `$set`s fields present on the master doc, so it won't clobber this — but it also won't backfill it for you, since it was written before the master doc had the field.)

**c. `backfill-product-nutrition.js`** — one-off, source-driven: re-parse `tblProducts` from the SQL dump, take the ~34 rows with plausible nonzero nutrition values (exclude the one obvious test row — cucumber's sequential 1/2/3/4/5/6), map calories/protein/carbohydrate/fat/sodium/cholesterol → `Product.nutrition_per_100g_` shape (`src/app/core/models/product.model.ts`), and `$set` it on the matching `PRODUCT_LIST` docs by `_legacyProductId` — on **`__master__`** first (so future clones inherit it), then on already-cloned user products missing it (same "master first, then per-user" ordering as 3b, and same non-destructive reasoning: sync-master Rule 2 won't clobber a field absent on master).

Run order: sync-master.js code fix (1) → `repair-subrecipe-refs.js --write=local` (3a) → `backfill-dish-prep-items.js --write=local` (3b, master then per-user) → `backfill-product-nutrition.js --write=local` (3c, master then per-user) → transform.js fix (2, for future re-imports only, no rush).

## 4. Client-side fix — gate navigation on products/recipes/dishes being loaded (Finding 3)

**a. Give `ProductDataService`, `RecipeDataService`, `DishDataService` an `ensureLoaded()`.** Add the same manual `loaded_`/`loadPromise_`/`ensureLoaded()`/`hasLoaded()` pattern that `PreparationRegistryService` already uses (`src/app/core/services/preparation-registry.service.ts:39-71`) directly to each of the three services, wrapping their existing private `loadInitialData()` — not a refactor onto `BaseEntityDataService<T>`, since all three have bespoke per-row normalization (`normalizeProduct`, `DishDataService.normalizeDish` for legacy `mise_categories_`) that doesn't fit that base class's generic `query<T>()` flow. Keep each constructor's existing fire-and-forget call for other pages that don't need to block (dashboard, inventory, etc.) — `ensureLoaded()` just becomes a promise-deduped await for anyone who needs the guarantee.

**b. Add one combined resolver** — `src/app/core/resolvers/kitchen-data-ensure-loaded.resolver.ts`, mirroring `preparations-ensure-loaded.resolver.ts` — that awaits all three services' `ensureLoaded()` in parallel (`Promise.all`) and resolves `true`. One resolver, not three, since every consuming route needs all three together (an ingredient row can reference a product, a recipe, or a dish).

**c. Wire it into every route that resolves ingredient/prep names against the live catalog**, alongside the existing resolvers:
   - `recipe-builder` and `recipe-builder/:id` (`src/app/app.routes.ts:116-135`) — the routes that hit this bug directly, add next to `equipmentLoaded`/`preparationsLoaded`.
   - `recipe-book` (`app.routes.ts:136-139`) and `cook`/`cook/:id` (`app.routes.ts:165-174`) — same underlying `products_()`/`recipes_()` signals are used to resolve/display ingredient names on these pages too; currently ungated, same race is theoretically reachable there. Add the same resolver for consistency/safety even though it wasn't the reported symptom.

**d. No change to `patchFormFromRecipe()`'s "clear if unresolved" branch** (`recipe-form.service.ts:326-331`). Once (b)/(c) guarantee the lists are hydrated *before* the component (and thus this method) ever runs, "not found" genuinely means an orphaned reference (real data problem, correctly shown to the user as unlinked) rather than "not loaded yet" — so the existing behavior becomes correct instead of racy, with no further softening needed.

## 5. Read-only audit script — `server/scripts/legacy-import/verify-against-source.js`

Re-runnable, read-only (no writes, ever), user-requested tool to make future auditing precise instead of ad hoc. Pattern:
- Reuse `lib/sql-parser.js` (`readSqlDumpAsUtf8`, `extractInserts`) + `lib/transform.js`'s `buildImport()` — the exact same functions the real import and this session's verification both already use — to rebuild the "expected" set of products/recipes/dishes fresh from `fullDATA.sql` on every run (no drift from a stale snapshot).
- For every expected doc (keyed by `_legacyProductId` / `_legacyRecipeNo`), look up the actual `__master__` Mongo doc and diff:
  - Products: name, base unit, price/source presence, `nutrition_per_100g_` presence.
  - Recipes/dishes: `ingredients_` line-by-line (count, `type`, resolved product/recipe name, `amount_`, `unit_`), and for dishes, `prep_items_` count + each item's `preparation_name`/`quantity`/`unit`.
- Report mismatches grouped by category (missing doc / ingredient count mismatch / unresolved reference / missing prep items / etc.), counts first, details on request (`--verbose` or similar) — should read cleanly as "0 mismatches" once run against current `__master__` state, given this plan's fixes.
- Optional `--user=<userId>` flag to run the same diff against a given user's cloned copies instead of `__master__` (walks `_masterId` back to the legacy key), for spot-checking a specific account like `dev-guest`.
- Follows the same dry-run-safe, no-mutation style as the other scripts in this directory — this one never writes, so no `--write` flag at all.

# Verification

1. `ng build` passes (unaffected by server-only changes, but house rule).
2. Re-run the same read-only diagnostic queries used in this investigation against local Mongo after each repair script:
   - `type: 'recipe'` broken-ref count for `dev-guest` → must be 0 (was 2,120).
   - `DISH_LIST` docs (master + `dev-guest`) with `prep_items_.length > 0` → should jump from 0 to ~724 (dishes that actually have sub-recipe ingredients; the remaining ~262 legitimately have none).
   - `PRODUCT_LIST` docs (master + `dev-guest`) with `nutrition_per_100g_` set → should land at ~34.
3. Spot-check in the running app (local dev, `dev-guest`/guest login): open "פיצה" (or another previously-broken dish) in recipe-builder — ingredient list should show "רוטב לפיצה" resolved with a real name/cost instead of a blank row, and the mise-en-place/prep tab should show its prep items grouped by category.
4. Re-check the exact ingredient row from the user's screenshot (if reproducible) — should resolve now.
5. Confirm no regression: a normal, non-legacy user-created dish (with hand-typed `prep_items_`) still round-trips through recipe-builder unchanged.
6. **Finding 3 fix**: open the `סשימי דג ים...` dish (or another legacy-imported dish) in recipe-builder repeatedly — including via direct URL / hard refresh, not just in-app navigation — and confirm all ingredient rows and all mise-en-place items are always present, never intermittently blank. `ng build` passes.
7. **Audit script**: run `node server/scripts/legacy-import/verify-against-source.js` against `__master__` — expect 0 mismatches given this plan's fixes are all applied; run once more with `--user=dev-guest` — also expect 0 mismatches.

# Atomic Sub-tasks

- [x] Fix `server/services/sync-master.js`: add recipe/dish masterId→userId remap for `type: 'recipe'` ingredient lines (Rule 1 + Rule 2 paths), built incrementally to handle same-pass sibling references
- [x] Write `server/scripts/legacy-import/repair-subrecipe-refs.js` (dry-run default, `--write=local`) and run it against local Mongo
- [x] Write `server/scripts/legacy-import/backfill-dish-prep-items.js` (master pass then per-user pass, dry-run default, `--write=local`) and run it against local Mongo
- [x] Write `server/scripts/legacy-import/backfill-product-nutrition.js` (master pass then per-user pass, dry-run default, `--write=local`) and run it against local Mongo
- [x] Update `server/scripts/legacy-import/lib/transform.js` so future dish re-imports derive `prep_items_`/`prep_categories_` from sub-recipe ingredient rows
- [x] Run verification queries (broken-ref count, prep_items_ coverage, nutrition coverage) and spot-check "פיצה" in the running app
- [x] Add `ensureLoaded()`/`hasLoaded()` to `ProductDataService`, `RecipeDataService`, `DishDataService` (`src/app/core/services/`), mirroring `PreparationRegistryService`'s existing pattern
- [x] Add `kitchen-data-ensure-loaded.resolver.ts` (`src/app/core/resolvers/`) awaiting all three services' `ensureLoaded()` in parallel
- [x] Wire the new resolver into `recipe-builder`, `recipe-builder/:id`, `recipe-book`, `cook`, `cook/:id` routes in `src/app/app.routes.ts`
- [x] Verify Finding 3 is fixed: repeatedly open a legacy-imported dish (hard refresh + in-app nav) and confirm ingredients/mise-en-place never render blank; `ng build` passes
- [x] Write `server/scripts/legacy-import/verify-against-source.js` (read-only, re-parses SQL fresh, diffs against Mongo by `_legacyProductId`/`_legacyRecipeNo`, optional `--user=` flag) and run it against `__master__` and `dev-guest` — confirm 0 mismatches
- [x] Raise `server/routes/generic.js`'s `GET /:type` result cap (was 500/max 1000) to 20000/max 20000; add `compression` middleware to `server/index.js`; verify live via browser (all 8 ingredients + 3 mise-en-place items resolve for `סשימי דג ים...`) — Finding 4
- [x] Fix `transform.js`'s mise-en-place derivation to include every ingredient line (not just sub-recipes); write + run `repair-dish-prep-items.js --write=local` (master then per-user); re-verify via `verify-against-source.js` (now also checks `steps_`); verify live (8/8 items for `סשימי דג ים...`) — Finding 5
- [x] Commit `server/scripts/legacy-import/source-data/fullDATA_utf8.sql` + README; once the import is fully validated and stable, delete it deliberately (Mongo becomes the sole source of truth) — do not delete casually, it disables future re-auditing
- [x] Extend `verify-against-source.js` to also check suppliers; confirm `dev-guest` is the only account with legacy-imported data; re-run all repair scripts dry-run to confirm 0 remaining issues — final full-database sweep
