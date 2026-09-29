# Plan 322 — Metadata Rename-in-Place with Cascade Update (Goal)

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
- [ ] M1.1: `metadata-registry.service.ts` — add `renameLabel(oldKey, newKey)`, `renameCourse(oldKey, newKey)`, `renameCategory(oldKey, newKey)`, `renameAllergen(oldKey, newKey)`, each mirroring `renameMenuType`'s shape (trim + no-op check, collision check against existing keys with an error toast, persist, update the relevant signal).
- [ ] M1.2: `kitchen-state.service.ts` — generalize `cascadeClearLabelFromAll`/`cascadeClearCourseFromAll` into rename-capable variants (or add sibling `cascadeRenameLabelForAll(oldKey, newKey)` / `cascadeRenameCourseForAll(oldKey, newKey)` methods reusing `applyCascadeUpdate`) that replace the old key with the new one in `labels_`/`autoLabels_` (label) or set `course_` to the new key (course), instead of clearing to empty.
- [ ] M1.3: `kitchen-state.service.ts` — add `cascadeRenameCategoryForAll(oldKey, newKey)` / `cascadeRenameAllergenForAll(oldKey, newKey)`, product-side equivalents using `productDataService.updateProduct` directly + activity/version-history logging (new small private helper, don't force-fit the recipe-shaped `applyCascadeUpdate`).
- [ ] M1.4: `TranslationKeyModalService.open()` — add an optional prefill param for `englishKey_` (backward compatible: existing callers passing none keep today's empty-key-field behavior).
- [ ] M1.5: `LabelCreationModalService` — check current `.open()` signature; add an edit-mode prefill (key/hebrew/color/autoTriggers) if not already supported.

## Milestone 2 — Wire up the UI

### Atomic Sub-tasks
- [ ] M2.1: Metadata Manager cards (label, course, category, allergen) — add an edit/pencil action per pill, alongside the existing delete button, in the shared `managerCard` template (`metadata-manager.page.component.html`).
- [ ] M2.2: `metadata-manager.page.component.ts` — new `onRenameMetadata(item, type)` handler: open the appropriate modal per type (per the "Rename UI, per type" section above) prefilled with the current value, on submit confirm via `ConfirmModalService` (mirroring `onMenuTypeNameBlur`'s confirm-before-cascade shape) showing the affected count (reuse the same affected-list computation pattern from Plan 320's `onRemoveMetadata`), then call the registry rename + the cascade method, then a success toast with the count.
- [ ] M2.3: Reject rename-to-existing-key with a clear error before even opening the confirm dialog (check the target registry for the new key first — same collision check `renameMenuType` already does).

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
