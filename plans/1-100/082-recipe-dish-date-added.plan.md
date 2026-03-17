# Recipe/Dish "Date Added" Across the App

## Goal

From now on, every recipe and dish that is **added** should store the date it was added. That date must be set in one place, preserved on update, and shown where it makes sense (and optionally sortable).

## Is This Approach Proper?

**Yes.** Reasons:

- **Single source of truth**: The timestamp is set only when creating an entity (in `RecipeDataService.addRecipe` and `DishDataService.addDish`). Every path that creates a recipe or dish (recipe-builder, version-history "add as copy", future add-from-image) gets the same behavior without duplicating logic.
- **Immutable semantic**: "Date added" is the creation time; it should not change when the user edits and saves. So we set it only on **add** and **preserve** it on **update** (merge existing `addedAt_` when updating).
- **Backward compatibility**: The field is **optional** on the model (`addedAt_?: number`). Existing data and demo JSON without the field remain valid; the UI can show a placeholder (e.g. "—") when missing.
- **Consistent with existing patterns**: The codebase already uses optional metadata (e.g. `labels_`, `autoLabels_`) and server-side semantics (e.g. `_id` set in storage on post). Adding a creation timestamp in the data layer fits that pattern.

---

## 1. Model

**File**: `src/app/core/models/recipe.model.ts`

- Add to the `Recipe` interface one optional property:
  - `addedAt_?: number` — epoch milliseconds (UTC) when the recipe/dish was first added. Optional so existing and demo data without it still parse and display.

---

## 2. Set timestamp on create (data layer only)

**Files**: `src/app/core/services/recipe-data.service.ts`, `src/app/core/services/dish-data.service.ts`

- **addRecipe** / **addDish**: Before calling `storage.post`, set `addedAt_: Date.now()` on the payload. Do not allow callers to override it (always set in the service).

---

## 3. Preserve timestamp on update

**Files**: Same two services.

- **updateRecipe** / **updateDish**: Before calling `storage.put`, read the existing entity from storage and merge its `addedAt_` into the incoming recipe so it is never overwritten or dropped.

---

## 4. Display

- **Recipe book list**: Show "Date added" column/cell; format with date pipe or helper; handle missing as "—". Extend `SortField` with `'dateAdded'`, add sortable header, and in `compareRecipes` compare `(a.addedAt_ ?? 0) - (b.addedAt_ ?? 0)`.
- **Recipe builder (edit view)** (optional): When editing an existing recipe, show read-only "נוסף בתאריך: …" when `addedAt_` present.

---

## 5. i18n and tests

- Add translation key for "date_added" / "added_on" if needed.
- RecipeDataService / DishDataService specs: assert `addedAt_` on create and preserved on update.

---

## Files to touch

| Area    | File                                          | Change                                               |
|---------|-----------------------------------------------|------------------------------------------------------|
| Model   | `src/app/core/models/recipe.model.ts`         | Add `addedAt_?: number` to `Recipe`                  |
| Create  | `src/app/core/services/recipe-data.service.ts`| In addRecipe, set addedAt_ before post; merge on update |
| Create  | `src/app/core/services/dish-data.service.ts`  | In addDish, set addedAt_ before post; merge on update |
| Display | recipe-book-list (template + component)       | Show date added column; sort by dateAdded            |
| i18n    | Translation assets                            | Add date_added key                                   |
| Tests   | Data service specs                            | Assert addedAt_ on create and preserved on update    |
