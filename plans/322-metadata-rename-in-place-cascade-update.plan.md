# Plan 322 — Metadata Rename-in-Place with Cascade Update (Goal)

Status: draft

> **Reality check 2026-10-05 (Planner, on `main`).** M1–M12 are in the code (merged via PR #226; M1/M2 were never ticked — now ticked from code evidence). What is left: **M10.4** (Human live check of label/course/category/allergen delete-for-everyone) and **M13** (`purge-ingredient-everywhere` does not strip the ingredient from other users' recipes). Collection names are v2 now (`recipes`, `dishes`, `products` — Plan 321 P2b), so read `RECIPE_LIST`/`DISH_LIST`/`PRODUCT_LIST` below as those. The Read-Write Scope covers M13 only.

## Problem Statement
Follow-up to Plan 320's cascade-delete work. Today, fixing a typo in a label, course, category, or allergen name requires delete-and-recreate — even with the cascade-delete-on-confirm just built (Plan 320), that still means every recipe/product using it loses the tag entirely and has to be manually re-tagged with the corrected value. There's no "rename in place."

The fix already exists as a working pattern in this exact codebase for Menu Types: `renameMenuType(oldKey, newKey)` in `metadata-registry.service.ts`, wired from `onMenuTypeNameBlur` in `metadata-manager.page.component.ts`, which confirms via `ConfirmModalService` and cascades the update across every menu event via `MenuEventDataService.updateServingTypeForAll`. This plan extends that same shape to labels, courses, categories, and allergens.

## Goals & Success Criteria
- Each of the Labels, Courses, Categories, and Allergens cards in the Metadata Manager gets an "edit/rename" action (alongside the existing add/delete) that lets the user correct the stored key in place.
- On rename, every recipe/dish (labels, courses) or product (categories, allergens) currently referencing the old key is updated to the new key — no manual re-tagging needed.
- Renaming to a key that already exists in the registry is rejected with a clear error (matching `renameMenuType`'s existing collision check).
- Units are explicitly out of scope for this plan (see below).

## Confirmed mechanism (do not re-derive — from this session's exploration)
- **Precedent, read this first:** `metadata-registry.service.ts`'s `renameMenuType(oldKey, newKey)` + `metadata-manager.page.component.ts`'s `onMenuTypeNameBlur` + `menu-event-data.service.ts`'s `updateServingTypeForAll`. Every new rename method in this plan mirrors this exact shape: registry rename (with collision check) + confirm dialog + cascade loop calling the existing per-doc update method.
- **Plan 320 already built the closest sibling code**, `kitchen-state.service.ts`'s `cascadeClearLabelFromAll(labelKey)` / `cascadeClearCourseFromAll(courseKey)` and the shared private `applyCascadeUpdate(previous, updated)` helper (raw `recipeDataService.updateRecipe`/`dishDataService.updateDish` per doc — not `saveRecipe()`, to avoid firing one toast per affected doc — plus activity-log + version-history entries per doc for traceability). The new rename methods should generalize these into rename variants reusing `applyCascadeUpdate` as-is.
- **Categories/allergens live on `PRODUCT_LIST`, not recipes.** `kitchen-state.service.ts`'s `saveProduct`/`buildProductChanges` is the product-side equivalent of `saveRecipe`/`buildRecipeChanges` — new `cascadeRenameCategoryForAll`/`cascadeRenameAllergenForAll` methods belong here, calling `productDataService.updateProduct` directly (same "raw update, not the toast-firing saveProduct" rationale), and should record activity/version-history for products the same way `applyCascadeUpdate` does for recipes (a small parallel private helper, e.g. `applyProductCascadeUpdate`, is reasonable — don't force product updates through the recipe-shaped helper).
- **`metadataRegistry.deleteLabel`/`deleteCourse`/`deleteCategory`/`deleteAllergen`** already exist (Plan 320 + earlier); this plan adds sibling `renameLabel`/`renameCourse`/`renameCategory`/`renameAllergen` methods to `metadata-registry.service.ts`, mirroring `renameMenuType`'s collision-check + persist + signal-update shape exactly.
- **Rename UI, per type:**
  - **Category / Allergen** (plain `string[]` registries): reuse `TranslationKeyModalService.open(hebrewLabel, context)` — already the exact "Hebrew label + English key" input pair used when adding a new one (`onAddMetadata`'s Layer 2). It needs one addition: an optional prefill for `englishKey_` (currently only `hebrewLabel` prefills; `englishKey_` is a separately user-editable signal in `translation-key-modal.component.ts`, not auto-derived from the Hebrew text — confirmed by reading the component, so prefilling it is a small, safe addition, not a behavior change for the existing add-flow which passes no prefill).
  - **Label**: reuse `LabelCreationModalService` (already the label add-flow: key + Hebrew + color + autoTriggers) — check whether `.open()` supports a prefill object for edit mode; if not, add one (same shape as the `TranslationKeyModalService` prefill addition above). Renaming a label through this modal naturally allows correcting color/autoTriggers too in the same action — that's fine, not scope creep, since the modal already collects all of it for add.
  - **Course**: `CourseDefinition` is just `{ key, color }` with no dedicated creation modal (Plan 320 wired course add through the generic `onAddMetadata` flow, not a bespoke modal). Reuse `TranslationKeyModalService` the same way as category/allergen for the rename UI (context `'generic'`), then call the new `renameCourse` + `cascadeRenameCourseForAll`.
- **Out of scope: Units.** Unit renames are riskier (units affect cost/conversion calculations elsewhere, e.g. `UnitRegistryService`/`recipe-cost.service.ts` conversion tables) and the user's own ask flagged this as "maybe" — defer to a follow-up plan if wanted later.
- **Confirm dialog copy**: mirror the existing cascade-delete confirm string style from Plan 320 (`metadata-manager.page.component.ts`'s `onRemoveMetadata`) — direct Hebrew template strings built in the `.ts` file, `variant: 'danger'` is *not* necessarily right here (rename isn't destructive the way delete is) — check `renameMenuType`'s own confirm call (`menu_type_rename_confirm` dictionary key, no `variant` override) and match that instead for labels/courses/categories/allergens, adding parallel dictionary keys (e.g. `label_rename_confirm`, `course_rename_confirm`, `category_rename_confirm`, `allergen_rename_confirm`) — or a single shared key with the type name interpolated inline the same way the existing block-message does, whichever reads more naturally; don't over-engineer this into 4 near-identical dictionary entries if one parameterized string works.

## Milestone 1 — Registry rename methods + cascade methods (no UI yet)

### Atomic Sub-tasks
- [x] (in code, seen 2026-10-05) M1.1: `metadata-registry.service.ts` — add `renameLabel(oldKey, newKey)`, `renameCourse(oldKey, newKey)`, `renameCategory(oldKey, newKey)`, `renameAllergen(oldKey, newKey)`, each mirroring `renameMenuType`'s shape (trim + no-op check, collision check against existing keys with an error toast, persist, update the relevant signal).
- [x] (in code, seen 2026-10-05) M1.2: `kitchen-state.service.ts` — generalize `cascadeClearLabelFromAll`/`cascadeClearCourseFromAll` into rename-capable variants (or add sibling `cascadeRenameLabelForAll(oldKey, newKey)` / `cascadeRenameCourseForAll(oldKey, newKey)` methods reusing `applyCascadeUpdate`) that replace the old key with the new one in `labels_`/`autoLabels_` (label) or set `course_` to the new key (course), instead of clearing to empty.
- [x] (in code, seen 2026-10-05) M1.3: `kitchen-state.service.ts` — add `cascadeRenameCategoryForAll(oldKey, newKey)` / `cascadeRenameAllergenForAll(oldKey, newKey)`, product-side equivalents using `productDataService.updateProduct` directly + activity/version-history logging (new small private helper, don't force-fit the recipe-shaped `applyCascadeUpdate`).
- [x] (in code, seen 2026-10-05) M1.4: `TranslationKeyModalService.open()` — add an optional prefill param for `englishKey_` (backward compatible: existing callers passing none keep today's empty-key-field behavior).
- [x] (in code, seen 2026-10-05) M1.5: `LabelCreationModalService` — check current `.open()` signature; add an edit-mode prefill (key/hebrew/color/autoTriggers) if not already supported.

## Milestone 2 — Wire up the UI

### Atomic Sub-tasks
- [x] (in code, seen 2026-10-05) M2.1: Metadata Manager cards (label, course, category, allergen) — add an edit/pencil action per pill, alongside the existing delete button, in the shared `managerCard` template (`metadata-manager.page.component.html`).
- [x] (in code, seen 2026-10-05) M2.2: `metadata-manager.page.component.ts` — new `onRenameMetadata(item, type)` handler: open the appropriate modal per type (per the "Rename UI, per type" section above) prefilled with the current value, on submit confirm via `ConfirmModalService` (mirroring `onMenuTypeNameBlur`'s confirm-before-cascade shape) showing the affected count (reuse the same affected-list computation pattern from Plan 320's `onRemoveMetadata`), then call the registry rename + the cascade method, then a success toast with the count.
- [x] (in code, seen 2026-10-05) M2.3: Reject rename-to-existing-key with a clear error before even opening the confirm dialog (check the target registry for the new key first — same collision check `renameMenuType` already does).

## Milestone 3 — Admin master-push for registry renames (added mid-execution, 2026-09-30)

### Atomic Sub-tasks
- [x] M3.1: `server/routes/generic.js` — new `PUT /:type/registry-rename-master` route (placed before generic `/:type/:id`), renames a key in `__master__`'s own registry doc for KITCHEN_LABELS/COURSES/CATEGORIES/ALLERGENS.
- [x] M3.2: Client plumbing chain `MetadataRegistryService.pushRegistryRenameToMaster` → `StorageService` → `HttpStorageAdapter` → the new HTTP route.
- [x] M3.3: `metadata-manager.page.component.ts` — `confirmAndCascadeRename` gates an admin-only ternary (save only for me / for everyone / cancel) before executing a rename that changes the registry key.
- [x] M3.4: Fix false "key already in use" collision on rename — `TranslationService.validateKeyForHebrew`/`validateEnglishKey` gained an `excludeKey` param; threaded through `translation-key-modal` and `label-creation-modal` (the latter was missed in the first pass — its own `save()` path called `validateEnglishKey` directly with no excludeKey support at all, and its component held a local `englishKey_` signal that never read the service's prefilled value, so rename always opened as a blank "add" form).
- [x] M3.5: Fix unconditional success toast firing even when the master-push call failed underneath it.
- [x] M3.6: Remove the "continue without saving" button leaking into the course/category/allergen add+rename modal — it belongs only to the true on-leave-untranslated-value flow (`generic` context); course now uses `category` context like `KeyResolutionService` already does elsewhere.
**Human-validated 2026-09-30** (M3.2, M3.5, M3.6 confirmed; M3.4 confirmed but see M3.7 below for a gap it exposed).

- [x] M3.7 (added 2026-09-30, Human test round 3): Human validated M3.4's fix removes the false self-collision on rename — **but flagged a real gap it exposed**: the `excludeKey` change must only exclude the item's *own* previous key, not skip checking whether some *other* (different English key) entry already uses the same target Hebrew label. Today two different labels/courses/categories/allergens can end up with the same Hebrew display text with no warning. Fixed: `TranslationService.validateKeyForHebrew(key, hebrewLabel, excludeKey)` now also rejects when a different key (not `excludeKey`, not the sanitized key itself) already maps to the same Hebrew label, with error `השם "..." כבר בשימוש (מפתח "...")`; the item's own key/label combo is still fully excluded from both checks. `ng build` clean. Live UI verification not done in this pass (dev frontend wasn't running) — Human should confirm via the app: rename/add a label or course to a Hebrew name already used elsewhere → expect a "name already taken" error; renaming an item back to its own existing name should still work with no false error.

## Milestone 4 — Server-side Hebrew dictionary sync for master-push (added mid-execution, 2026-09-30)

**Problem:** `TranslationService.updateDictionary()` only ever wrote to an in-memory signal + `localStorage` (`DICTIONARY_CACHE`) — per-browser, never synced to the server. This meant Milestone 3's admin "push to everyone" choice only ever renamed the registry *key* in `__master__` — it never actually propagated a Hebrew-label-only edit to any other user, admin or not. Human explicitly rejected local-storage-only persistence for this: both "only me" and "everyone" must be DB-backed.

### Atomic Sub-tasks
- [x] M4.1: `server/constants/collections.js` — add `DICTIONARY_OVERRIDES` (per-user personal Hebrew-label overrides, userData/backup only, not cloneable).
- [x] M4.2: `server/routes/generic.js` — two routes for a reserved `__global__` pseudo-user doc (same idiom as `__master__`): `GET .../DICTIONARY_OVERRIDES/global` (any signed-in user, merge source) and `PUT .../DICTIONARY_OVERRIDES/global` (admin-only, upserts one key→label pair).
- [x] M4.3: `TranslationService` — on load, merge `dictionary.json` base → `__global__` override doc → the user's own personal `DICTIONARY_OVERRIDES` doc (in that precedence), keep `localStorage` only as a fast-boot cache of the merged result, not the source of truth.
- [x] M4.4: `TranslationService.updateDictionary(key, label, scope: 'me' | 'everyone')` — persists to the global route or the personal doc depending on scope, in addition to the existing optimistic in-memory update.
- [x] M4.5: Wire the admin ternary's existing me/everyone choice (already collected in `confirmAndCascadeRename` for the key-rename path) through to `updateDictionary`'s new scope param, for label/course/category/allergen.
- [x] M4.6: Extend the "key unchanged, Hebrew-only edit" fast path (label + course/category/allergen in `onRenameMetadata`) to also offer the admin ternary and call scope-aware `updateDictionary` — this path was previously skipped entirely, which is bug 4 from Human's 2026-09-30 test round, and was only a non-fix before M4 because there was nothing meaningful to push.

**Human-validated 2026-09-30** (M4.1–M4.6 confirmed end-to-end via the Hebrew-only-edit ternary + everyone-save round trip).

## Milestone 5 — "Save for everyone" upsert fixes + extend to ADD flows + recipe/dish create (added mid-execution, 2026-09-30, second test round)

**Problem found in testing:** choosing "everyone" mostly failed silently. Root cause in both `registry-rename-master` and the pre-existing `push-to-master` route: both did a bare `updateOne` against `__master__` with no `upsert` — for anything an admin created themselves (never previously in master, which is the common case, not an edge case), `matchedCount` was 0 and the write silently no-op'd (registry route returned 404 → visible error; push-to-master route returned `{ok:true}` anyway → invisible failure). Also: the admin ternary only ever fired on RENAME, never on ADD (new label/course/category/allergen) or on a brand-new recipe/dish's first save.

### Atomic Sub-tasks
- [x] M5.1: `server/routes/generic.js` `registry-rename-master` — upsert-add the item into master when `oldKey` isn't found, instead of 404ing. Client now also sends `itemData` (color/autoTriggers) so a first-time add to master isn't missing fields.
- [x] M5.2: `server/routes/generic.js` `push-to-master` (pre-existing recipe/dish/product route) — same upsert fix; this is what silently dropped a brand-new recipe's "push to everyone" with no error at all.
- [x] M5.3: No-op guard — `onRenameMetadata` now skips the whole flow (no prompt, no save) when nothing actually changed (key, Hebrew label, color, autoTriggers all identical to the existing item).
- [x] M5.4: Admin ternary extended to the ADD flows too (`onAddLabel`, `onAddMetadata` for course/category/allergen) — previously only RENAME asked.
- [x] M5.5: `MasterPushService.askScope` gained a `forcePrompt` param; `recipe-builder.page.ts`'s two save paths now also ask when an **admin** is saving a **brand-new** recipe (previously gated on already having a `_masterId`, which no new recipe has client-side before its first save).

- [x] M5.6: `push-to-master` route — the upsert fix in M5.2 was itself broken: it tried to insert the master copy under the SAME `_id` as the caller's self-referencing doc, which collides with MongoDB's collection-wide unique `_id` index (not scoped by `userId`) and threw `E11000 duplicate key error`, surfacing to the admin as "didn't save" even though their own copy was fine. Confirmed via direct API test (bypassing the UI, which hit an unrelated pre-existing "confirm net yield" dialog loop for the same test data — not investigated, out of scope here). Real fix: first push for a self-linked doc (`_masterId === _id`) now INSERTs the master copy under a **freshly generated** `_id`, then re-points the caller's own `_masterId` at it — the same shape a doc cloned at signup already has. Verified end-to-end via direct API calls against the local dev server; test data cleaned up after.

**Human-validated 2026-09-30** (M5.4, M5.5, M5.6 confirmed end-to-end — add-flow ternary, brand-new-recipe ternary, and everyone-save no longer erroring).

### Out of scope for M5 (explicitly, per Human's own scope split)
- `cook-view.page.ts` / `recipe-book-list.component.ts`'s own `MasterPushService` call sites — those are edit-existing-recipe surfaces, not create surfaces; not touched.
- Any change to who can call `push-to-master`/`registry-rename-master` server-side (still open-to-any-signed-in-user by design, per each route's own comment) — client-side admin gating is unchanged in spirit, just extended to more call sites.

## Milestone 6 — Admin "delete for everyone" on recipes/dishes (added 2026-09-30, Human test round 3)

**Problem:** deleting a recipe/dish never asks an admin "just me or everyone" — delete only ever moves the doc to the user's own `TRASH_RECIPES`/`TRASH_DISHES`, with zero effect on `__master__`. Confirmed there is no existing cascade-to-master code on the delete path at all (it's a completely separate mechanism from `push-to-master`).

**Design (per Human, 2026-09-30):** reuse the existing "just me / everyone" ternary popup used on save (`MasterPushService`/`ConfirmModalService.openTernary`). "Everyone" means the linked `__master__` copy (found via `_masterId`) is also moved to trash — mirroring the same trash mechanism already used for a personal delete, not a hard delete and not a new flag field. Other users who already cloned this recipe/dish into their own account keep their own copy; "everyone" only stops it from being handed to future/unsynced users, it does not reach into other users' existing data.

### Atomic Sub-tasks
- [x] M6.1: Found — client delete flow is `kitchen-state.service.ts`'s `deleteRecipe()` → `recipe-data.service.ts`/`dish-data.service.ts`'s `deleteRecipe`/`deleteDish` (copies the doc into the caller's own `TRASH_RECIPES`/`TRASH_DISHES` via `appendExisting`, then calls server `DELETE /:type/:id`, which itself already tombstones-vs-hard-deletes based on whether the item is a master clone — but never touches `__master__`). Three UI call sites, all in `recipe-book-list.component.ts`: `onDeleteRecipe`, `onRemoveRecipe`, `onBulkDeleteSelected`.
- [x] M6.2: Added `MasterPushService.askDeleteScope()` — same ternary popup as `askScope` (new dictionary keys `delete_from_master_*`), wired into all 3 call sites in `recipe-book-list.component.ts`, right after the existing "are you sure?" confirm. **Note:** matches `askScope`'s existing convention exactly — it prompts based on whether the item has a `_masterId` (has something to remove from master), not on admin role; the codebase's existing push-to-master/registry-rename-master routes are deliberately "open to any signed-in user for now" per their own comments, so this mirrors that rather than adding a new, inconsistent admin-only gate. Flag to Human if a stricter admin-only gate is actually wanted here.
- [x] M6.3: New server route `PUT /:type/:id/delete-from-master` (`server/routes/generic.js`, `RECIPE_LIST`/`DISH_LIST` only) — looks up the caller's own doc's `_masterId`, moves that master doc into `TRASH_RECIPES`/`TRASH_DISHES` under `userId: '__master__'` (reusing the existing trash-collection shape, no new flag field), then deletes it from the live collection and bumps the master version. Client plumbing added: `HttpStorageAdapter.deleteFromMaster` → `StorageService` → `RecipeDataService`/`DishDataService` → `MasterPushService.deleteFromMaster(recipe)`.
- [x] M6.4: Unchanged — "just me" (or no `_masterId`) skips all of the above, exactly like today.
- [x] M6.5: Verified via direct API calls (not the UI — same "confirm net yield" UI blocker noted in M5.6 wasn't hit this time since no recipe-builder save was involved, but used API directly for speed/certainty anyway): created a test recipe → pushed to master (got a real distinct `_masterId`) → called `delete-from-master` → confirmed via a direct read-only DB check that the master doc moved into `TRASH_RECIPES` under `__master__` and is gone from `RECIPE_LIST` (anonymous `GET` of that id now 404s) → confirmed the caller's own recipe doc was completely untouched (still exists, unaffected). Test data cleaned up after. `ng build` clean.

## Milestone 7 — Recipe-builder save robustness fixes found during Plan 322 testing (added 2026-09-30, Human test round 3)

**Problem:** while testing the above, found two unrelated issues in `recipe-builder.page.ts`'s save flow (not master/dictionary related, just found along the way):

### Atomic Sub-tasks
- [x] M7.1: Investigated, not a bug — `saveRecipe()` (~line 1085) already shows a red inline message (`blocking_ingredients_error`) + a global error toast + auto-scroll to the bad row when `hasBlockingRows()` is true; it is not actually silent. Could not reproduce a truly silent failure: both the standard product form and the recipe-builder's own quick-add-product modal require a base unit before saving, so an "invalid" product (the only way `isBlockingRow` fires for a product that's still found) is hard to create through normal use — it would need pre-existing legacy data, or a linked product that got deleted/trashed afterward (the "not found in pool" branch). No code change made. If seen again with genuinely no visible message, flag it with a screenshot to capture the exact state.
- [x] M7.2: Investigated, not a bug, no removal needed — the "green top-right button" is `בונה מתכונים` (Recipe Builder), the active tab of a 2-tab toggle with `מצב בישול` (Cook Mode) right next to it (confirmed live: clicking `מצב בישול` navigates to `/cook/:id` and swaps which of the two is styled green/active; clicking back returns). It only *looks* like a dead duplicate save button because the active-tab styling is a solid green pill similar to the real save button's color, and its Hebrew label is easy to misread at a glance as "שמור המתכונים" (save the recipes) when it actually reads "בונה מתכונים" (Recipe Builder). Nothing was removed.

## Milestone 8 — Product delete: in-use warning + count + admin everyone-cascade (added 2026-09-30, Human test round 4)

**Problem reported by Human:** deleting a product from Inventory that's used in recipes/dishes currently shows nothing — no confirm, no count, unclear what actually happens. Wanted: same "in use, N items affected, are you sure" pattern Plan 320 already built for labels/courses, but for products used as recipe/dish ingredients — plus the admin "just me / everyone" ternary already built for recipe delete (Milestone 6), extended to products.

**Human's explicit ask for "everyone" (flagged as higher-risk, Human acknowledged this and asked for it anyway, dev-only):** unlike Milestone 6 (where "everyone" only retires the shared master copy and leaves other users' own recipes/dishes untouched), for product delete the Human explicitly wants "everyone" to ALSO strip this product out of every OTHER user's own recipes/dishes that reference it — not just the master registry and not just the current user's own data. This is a genuinely new class of operation for this codebase (nothing today reaches into another user's own documents from one user's action) — treat it as local-dev-only, and the confirm copy must say plainly what will happen before it fires.

### Atomic Sub-tasks
- [x] M8.1: Investigated — today, deleting a product shows a generic "are you sure?" with no in-use awareness at all, then hard-succeeds (`kitchen-state.service.ts`'s `deleteProduct` never checks recipe/dish ingredient references), leaving behind dangling `ingredients_` rows whose `referenceId` points at a now-deleted product — itself an invalid/blocking row per `isBlockingRow`. `inventory-product-list.component.ts`'s `onDeleteProduct`/`onBulkDeleteSelected` were the two call sites; only the single-item `onDeleteProduct` was changed (bulk-delete's multi-item ternary-per-item UX wasn't in scope — flagged, not built).
- [x] M8.2: `onDeleteProduct` now computes the affected recipe/dish count up front and shows a count-aware confirm string (plain Hebrew template string, matching the existing `onRemoveMetadata` convention) instead of the old generic confirm when the product is in use.
- [x] M8.3: New `KitchenStateService.cascadeRemoveIngredientForAll(productId)` — pulls the ingredient line entirely out of every affected recipe/dish (not nulled), reusing the existing `applyCascadeUpdate` per-doc update + activity-log + version-history helper, same shape as the label/course cascades.
- [x] M8.4: `onDeleteProduct` now calls `MasterPushService.askDeleteScope(product)` before executing, same ternary already used for recipe/dish delete. `Product` model gained `_masterId?`/`_userModified?` fields (previously untyped even though the DB already stored them via `clone-master.js`/`push-to-master`, which already worked for PRODUCT_LIST).
- [x] M8.5: "Just me" (or no `_masterId`) — unchanged: only the current user's own product doc + their own recipes/dishes are touched, via the same cascade+delete path everyone gets.
- [x] M8.6: Extended `DELETABLE_FROM_MASTER_TYPES`/`MASTER_TRASH_KEY` in `server/routes/generic.js` to include `PRODUCT_LIST` → `TRASH_PRODUCTS`, so `delete-from-master` now retires a product's shared master copy too. Investigated `clone-master.js`: confirmed each user's cloned product gets a **freshly generated `_id`** at signup (not the master's own `_id`), linked back via `_masterId` — so cross-user matching needs the two-hop resolution, not a direct `_id` match. Implemented as a new route `PUT /:type/:id/purge-ingredient-everywhere` (`PRODUCT_LIST` only): finds every other user's own `PRODUCT_LIST` clone sharing this product's `_masterId`, then runs one `updateMany`/`$pull` per affected user against their own `RECIPE_LIST`/`DISH_LIST`, removing any ingredient line whose `referenceId` matches THAT user's own product `_id`. Client plumbing: `HttpStorageAdapter.purgeProductIngredientEverywhere` → `StorageService` → `ProductDataService.purgeIngredientEverywhere` → `MasterPushService.purgeProductIngredientEverywhere(product)`, called from `onDeleteProduct` right after `deleteProductFromMaster` when scope is `'everyone'`.
- [x] M8.7: Not run — per Human's explicit instruction mid-build, no live/API verification or test data was created for this milestone; `ng build` is clean and that's the confidence bar for hand-off. See report below for how the Human can test this themselves.

## Milestone 9 — Admin push-to-everyone on brand-new product creation + recipe push carries its own new products along (added 2026-09-30, Human test round 5)

**Problem reported by Human:** an admin creates a brand-new product in Inventory — no ternary, it just saves locally (unlike labels/courses/categories/allergens, which already got this in Milestone 5). The admin then uses that new product as an ingredient in a recipe. A separate, non-admin user who ends up with that recipe (via master sync/clone) can't find the product in their own inventory — the ingredient row shows up unlinked/broken until clicked, which then appears to "load it" from somewhere. Two things wanted: (a) admin product creation should offer the same "just me / everyone" push as other metadata types, and (b) when a recipe gets pushed to everyone and it references a brand-new product that isn't in the master product list yet, that product needs to go along with it — otherwise the recipe arrives for other users with a dangling ingredient no matter what (a) does, since (a) alone doesn't retroactively fix recipes saved before the admin remembered to push the product.

### Atomic Sub-tasks
- [x] M9.1: Found — `product-form.component.ts`'s `saveAndWait()` is the single product-save path (both create and edit go through it). The recipe-builder's quick-add-product modal (`quick-add-product-modal.component.ts`) creates via a different, faster path — decided in M9.2 not to add a prompt there.
- [x] M9.2: `product-form.component.ts` — injected `UserService`/`MasterPushService`, added `isAdmin_` computed, and the same `askScope(..., forcePrompt)` ternary `recipe-builder.page.ts` uses for brand-new recipes, gated on `(has _masterId && editing) || (brand-new && isAdmin_)`. On "everyone", calls new `MasterPushService.pushProductToMaster()` after save resolves. Quick-add-product modal deliberately left without its own prompt — it's a fast-entry flow, and M9.3 covers the case where its products end up in a pushed recipe regardless.
- [x] M9.3: `server/routes/generic.js`'s `push-to-master` route refactored into a recursive `pushDocToMasterRecursive(type, id, userId, visited)` helper: for every ingredient row referencing a product (or sub-recipe) that has never itself been pushed (self-linked `_masterId === _id`, i.e. brand-new), it now pushes that dependency to master first and uses the resulting master id as the ingredient's `referenceId` — instead of the old best-effort fallback that silently left the pusher's own local id in place (unresolvable for anyone else). A `visited` set guards against infinite recursion on a circular sub-recipe reference. `kitchen-state.service.ts`'s `saveProduct()` return type changed from `Observable<void>` to `Observable<Product>` (needed to get the newly-assigned `_id` after a create) — checked all 5 existing call sites, none destructure or type-depend on `void`, so this is backward compatible.
- [x] M9.4: Not run — per the Human's standing instruction this session, no live/API verification or test data created; `ng build` clean (`server/routes/generic.js` also syntax-checked via `node --check`) is the hand-off bar.

## Milestone 10 — Admin ternary + master push on label/course/category/allergen DELETE (added 2026-09-30, Human test round 5)

**Problem reported by Human:** deleting a label/course/category/allergen today only ever removes it from the current user's own registry and clears it from the current user's own recipes/dishes (Plan 320's cascade-delete-with-confirm). There is no admin ternary here at all, and nothing touches `__master__`'s registry — unlike RENAME and ADD for these same 4 types, which Milestones 3 and 5 already gave the ternary to. This is the missing 3rd action (delete) for the same 4 metadata types.

### Atomic Sub-tasks
- [x] M10.1: `onRemoveMetadata` now calls the existing `resolvePushScope(type)` (same admin-gated ternary M5's ADD-flow uses — admin + type in label/course/category/allergen) in both the in-use cascade-delete branch and the not-in-use plain-delete branch, right before executing the delete. A cancel now aborts the whole delete (matching rename/add's existing convention), where before there was no scope step at all.
- [x] M10.2: New `PUT /:type/registry-delete-master` server route (`server/routes/generic.js`, placed before the generic `/:type/:id` route, same ordering rule as `registry-rename-master`). On "everyone": (a) `$pull`s the key out of `__master__`'s registry doc; (b) bulk-strips it from every OTHER user's own data in one `updateMany` per collection — labels: `$pull` `labels_`/`autoLabels_` on `RECIPE_LIST`/`DISH_LIST`; courses: `$set course_: ''` where `course_` matches, same two collections; categories/allergens: `$pull` `categories_`/`allergens_` on `PRODUCT_LIST`. No per-user two-hop resolution needed here (unlike M8's products) — a label/course/category/allergen key is the same string across every user's own registry doc, so it's a single direct bulk update. New client plumbing: `HttpStorageAdapter.pushRegistryDeleteToMaster` → `StorageService` → `MetadataRegistryService.pushRegistryDeleteToMaster(type, key)`, wired into both `onRemoveMetadata` branches.
- [x] M10.3: **Decided by Human (2026-09-30): yes, aggressive.** "Everyone" must also strip the label/course/category/allergen from every OTHER user's own recipes/products, not just remove it from `__master__`'s registry — same class of cross-user operation Milestone 8 built for products, now confirmed wanted here too. For labels/courses this means pulling the key out of every user's own `RECIPE_LIST`/`DISH_LIST` `labels_`/`autoLabels_`/`course_` fields; for categories/allergens, out of every user's own `PRODUCT_LIST` `categories_`/`allergens_` fields. Dev-only, same caveat as Milestone 8.
- [ ] M10.4: Not run — per this session's standing instruction, no live/API verification or test data created; `ng build` and `node --check server/routes/generic.js` both clean. Human will verify: as admin, delete an in-use label/course/category/allergen → count-confirm fires first → then the ternary → "everyone" removes it from `__master__`'s registry AND from other users' own recipes/products → "just me" behaves exactly as it did before this milestone.

## Milestone 11 — Bulk multi-select product delete gets the same in-use warning + ternary as single delete (added 2026-09-30, Human test round 5)

**Problem:** Milestone 8 only updated `inventory-product-list.component.ts`'s single-item `onDeleteProduct`. The bulk "select several products, delete" action (`onBulkDeleteSelected`) has none of the in-use count, cascade, or admin ternary from Milestone 8.

### Atomic Sub-tasks
- [x] M11.1: `onBulkDeleteSelected` now computes an in-use count per selected product (same `referenceId` scan as the single-item path), cascades `cascadeRemoveIngredientForAll` for each in-use product, and asks ONE combined ternary for the whole batch (via `askDeleteScope`, passed the first selected product that has a `_masterId`, if any) — not one popup per product.
- [x] M11.2: Combined confirm copy: `"${inUseCount} מתוך ${ids.length} המוצרים שנבחרו בשימוש ב-${totalAffected} מתכונים/מנות בסך הכל..."` when any selected product is in use, falling back to the original plain `"למחוק ${ids.length} מוצרים?"` when none are. No existing batch-confirm precedent found in `onRemoveMetadata` (that flow is single-item only) — wrote new copy matching the existing Hebrew tone/structure of the single-item M8 confirm string.
- [x] M11.3: Not run — per Human's standing instruction from Milestone 8 (skip live/API verification and test-data creation, Human tests directly). `ng build` clean is the hand-off bar.

## Milestone 12 — `_masterId` never patched into local client state after push-to-master (found during Human test round 5)

**Problem:** `PUT /:type/:id/push-to-master` correctly persisted the caller's new `_masterId` server-side, but its HTTP response never returned it, and the client never wrote it into the local reactive store (`products_()`/`recipes_()`/`dishes_()` signals). Any later action in the SAME session that reads `_masterId` off the local signal — most importantly `MasterPushService.askDeleteScope()` — saw a stale/missing value and silently treated the delete as personal-only, skipping the "just me / everyone" ternary entirely. Confirmed via live `ng.getComponent()` inspection: `_masterId: undefined` client-side vs. a real value server-side for the same document. This is what the Human's test round 5 bug report ("it never asks me if to remove from all or only me") was actually caused by.

### Atomic Sub-tasks
- [x] M12.1: `server/routes/generic.js`'s `push-to-master` route — response changed from `res.json({ ok: true })` to `res.json({ ok: true, masterId: resolvedMasterId })`.
- [x] M12.2: `master-push.service.ts` — `pushToMaster` (recipe/dish) and `pushProductToMaster` now chain `.then(({ masterId }) => this.XData.patchMasterId(saved._id, masterId))` before their existing `.catch()`, instead of firing the request and ignoring the result.
- [x] M12.3: New `patchMasterId(id, masterId)` method added to `product-data.service.ts` (and the equivalent on `recipe-data.service.ts`/`dish-data.service.ts`) — updates the matching doc's `_masterId` (and clears `_userModified`) in place on the local signal store.
- [x] M12.4: `node --check server/routes/generic.js` and `ng build --configuration=local` both clean.
- [x] M12.5: Live end-to-end verification (self-run in browser, per Human's explicit request to self-validate): created a brand-new product → chose "everyone" on the create-time ternary → immediately (same session, no reload) deleted it via the inventory list → confirmed the "just me / everyone" delete ternary now correctly appears → confirmed "everyone" delete completes successfully. This is the exact scenario that was broken before the fix. **Caveat found afterward (see Milestone 13): this test used a product with no other user's clone, so it never exercised the cross-user purge path M13 is about.**

## Milestone 13 — `purge-ingredient-everywhere` doesn't actually strip the dangling ingredient from other users' recipes (found during Human test round 6)

**Problem reported by Human:** Deleted two products ("ניסיון 1" / "ניסיון 2") as admin with scope "everyone". Confirmed working: the admin's own copy, own recipe ingredient, and the shared `__master__` copy were all correctly removed/trashed. **Not working:** a separate signed-in, non-admin test account ("test1") that had its own clone of the same product still has that product in its own product list, AND the recipe that used it ("ממש חדש") still shows the dangling ingredient reference. Human's expectation now also includes the product disappearing from other users' own product lists, not just the ingredient reference — note this is **broader** than Milestone 8's original scope (M8's explicit ask was "strip the ingredient from other users' recipes/dishes," not "delete other users' own product clones"); confirm intent before implementing that part.

**Diagnosis so far (read-only investigation this session, not yet fixed):**
- `_masterId` chains are fully consistent end-to-end: the admin's tombstoned doc, the other user's still-live clone, and the trashed `__master__` doc all share the exact same `_masterId` — the two-hop resolution query in `purge-ingredient-everywhere` (`server/routes/generic.js`) should match on paper.
- `deleteProductFromMaster` and `purgeProductIngredientEverywhere` fire from the same guarded block in `onDeleteProduct`/`onBulkDeleteSelected` (`inventory-product-list.component.ts`) — since the master copy was correctly trashed, the purge call was necessarily sent too (ruled out a client-side skip).
- `http-storage.adapter.ts`'s URL construction for `purge-ingredient-everywhere` matches the server's route registration exactly (ruled out a routing/404 mismatch).
- **Not yet confirmed:** whether the server actually executes the `$pull`, or throws/returns early somewhere not yet found. Blocked on backend terminal log visibility for `[data/purge-ingredient-everywhere]` — the assistant had no access to that terminal's output this session, and calling the endpoint directly to observe its response was blocked by the auto-mode "Modify Shared Resources" write classifier.

### Atomic Sub-tasks
- [ ] M13.1: Get visibility into the actual server-side outcome of a repro call — either the Human pastes the backend terminal's `[data/purge-ingredient-everywhere]` log line (if any) from around the time of a repro, or a worker adds temporary logging of `otherClones.length` and each `updateMany`'s `matchedCount`/`modifiedCount` and reruns the repro.
- [ ] M13.2: Root-cause the actual failure once visible (candidates: silent server exception swallowed by the route's try/catch; the `otherClones` query returning 0 matches for a reason not yet found; the `updateMany` filter not matching despite the referenceId looking identical in a raw DB read).
- [ ] M13.3: Fix + verify live: after the fix, confirm a non-admin signed-in user's own `RECIPE_LIST`/`DISH_LIST` actually loses the dangling ingredient reference. Separately confirm with Human whether "everyone" should now ALSO delete the product from other users' own `PRODUCT_LIST` (currently it never has, by original M8 design) before building that as new scope.
- [ ] M13.4: Once the root cause is known, sanity-check whether the same class of bug could affect `registry-delete-master` (Milestone 10) — lower risk there since it's a direct string-key `updateMany` with no two-hop clone resolution, but worth a quick check once M13.2 is known.

## Technical Considerations
- Dependencies: `ConfirmModalService`, `TranslationKeyModalService`, `LabelCreationModalService`, `metadata-registry.service.ts`, `kitchen-state.service.ts`'s existing Plan 320 cascade infrastructure.
- No model changes needed — this only changes which key is stored, not the shape of `Recipe`/`Product`/`CourseDefinition`/`LabelDefinition`.
- Renaming a category/allergen only changes the stored English key — if the *Hebrew display text* has a typo but the key itself is fine, that's a `dictionary.json` edit, not a rename; don't conflate the two in the UI copy.

## Out of Scope
- Unit rename (deferred, see above).
- Bulk multi-select rename.
- Any change to how a *new* label/course/category/allergen is created (add-flow untouched beyond the small prefill-param additions needed for reuse in edit mode).

## Verify
- Rename a label used by several recipes → confirm shows affected count → confirm → every affected recipe's `labels_`/`autoLabels_` now has the new key, activity feed shows a "labels changed" entry per affected recipe (reusing Plan 320's `buildRecipeChanges` diff, which already tracks `labels_`/`course_`).
- Rename a course the same way → `course_` updated on every affected recipe/dish.
- Rename a category/allergen used by several products → every affected product's `categories_`/`allergens_` updated, activity feed shows a "category"/"allergens" changed entry (reusing the existing `buildProductChanges` diff, which already tracks these fields).
- Attempt to rename to an already-existing key in the same registry → rejected with an error, nothing changes.
- `ng build` clean.

## Read-Write Scope

Covers Milestone 13 (purge-ingredient-everywhere bug) only — M1–M12 are shipped.

Always allowed regardless of the list below: this plan file itself, its own
docs/session-state-<branch>.md, .claude/sessions/**, .worktree-*, and the append-only
hotspots (src/styles.scss, public/assets/data/dictionary.json, src/app/app.routes.ts
— add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/generic.js
server/test/**
src/app/core/services/kitchen-state.service.ts
src/app/core/services/kitchen-state.service.spec.ts
src/app/core/services/master-push.service.ts
src/app/core/services/master-push.service.spec.ts
src/app/core/services/http-storage.adapter.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for approved: <path>; then
append the path to the scope block above and retry.
