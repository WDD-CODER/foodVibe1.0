# Recipe Builder Page – Implementation Plan

## 0. Translation Workflow (i18n)

**Rule**: All user-facing text must use `translatePipe` with an English key. Add each key to `public/assets/data/dictionary.json` in the appropriate section (`general` for UI, `units` for units).

| Usage | Example |
|-------|---------|
| Template | `{{ 'cost' \| translatePipe }}` |
| Dynamic key | `{{ unit \| translatePipe }}` |
| Placeholder | `[placeholder]="'recipe_name_placeholder' \| translatePipe"` |
| Programmatic | `this.translationService.translate('cost')` |

**Per task**: When adding or changing UI text, add the key + Hebrew value to `dictionary.json` before or with the code change.

---

## 1. Current State vs. Plan

### What Exists (Implemented)

| Component | Status | Notes |
|-----------|--------|-------|
| **recipe-builder.page** | Partial | Form structure, add/remove ingredients & steps, `saveRecipe()` only `console.log`s |
| **recipe-header** | Partial | Type toggle, name, scaling, unit selector, secondary units. `currentCost` input never passed |
| **recipe-ingredients-table** | Partial | Ingredient search, unit select, amount, cost calc for **products only** |
| **recipe-workflow** | Partial | Prep steps + Dish mise-en-place. **Bug**: Add item to category broken |
| **ingredient-search** | OK | Search products + recipes by `name_hebrew` |

### Project Plan Requirements (project-plan.md)

- **Recipe builder**: Create/edit recipes with ingredients table, steps, header, and ingredient search.

### Technical Standards (copilot-instructions.md)

- **Ingredient Ledger**: IDs + Triple-Unit conversion, Recursive Compounding, Waste Factor.
- **Architecture**: Signals-only, `input()`/`output()`, path aliases, no `any`.
- **Testing**: TDD-first, `.spec.ts` for all public methods.

---

## 2. Gap Analysis

### Critical (Must Fix)

| # | Gap | Location | Impact |
|---|-----|----------|--------|
| 1 | **Save does not persist** | `recipe-builder.page.ts` | Recipes never saved; `saveRecipe()` only logs |
| 2 | **Edit flow not implemented** | Route `recipe-builder/:id` | No resolver, no load-by-id, no prefill |
| 3 | **`currentCost` not passed** | `recipe-builder.page.html` | Header cost always shows ₪0.00 |
| 4 | **Mise-en-place "Add item" broken** | `recipe-workflow.component.html` | `$any(categoryGroup.get('items')).push()` pushes nothing; FormArray needs proper FormGroup |
| 5 | **Recipe-as-ingredient cost** | `recipe-ingredients-table.component.ts` | Only products have cost calc; recipes as ingredients show 0 or wrong value (recursive compounding missing) |

### Important (Should Fix)

| # | Gap | Location | Impact |
|---|-----|----------|--------|
| 6 | **Form → Recipe model mapping** | `recipe-builder.page.ts` | Form structure differs from `Recipe` model; need explicit mapping on save |
| 7 | **`portions` not reactive** | `recipe-builder.page.html` | `[portions]="recipeForm_.get('serving_portions')?.value \|\| 1"` does not update when form changes |
| 8 | **`total_weight_g` never updated** | Form | Header shows 0g; no logic to sum ingredient weights |
| 9 | **`pendingChangesGuard` missing** | `app.routes.ts` | User can navigate away without warning |
| 10 | **Recipe resolver** | Routes | No `recipeResolver` for edit route (like `productResolver`) |

### Nice to Have (Align with Standards)

| # | Gap | Location | Impact |
|---|-----|----------|--------|
| 11 | **`yield_percentage` vs `yield_factor`** | `recipe-ingredients-table`, form | Inconsistent naming; products use `yield_factor_` |
| 12 | **Minimal specs** | All `.spec.ts` | todo.md: "Optionally expand minimal specs with behavior tests" |
| 13 | **Unit Creator modal** | `recipe-header` | `openUnitCreator` output emitted but no handler in parent |

---

## 3. Atomic Sub-tasks

### Phase A: Fix Critical Bugs

1. **A1** – Wire `currentCost` to recipe-header: pass `totalCost_()` from page to `[currentCost]`. *i18n*: Replace hardcoded "עלות / COST", "משקל / WEIGHT" with `translatePipe`; add `cost`, `weight` to `dictionary.json` if missing.
2. **A2** – Fix mise-en-place "Add item": add `addMiseItem(categoryGroup)` in `RecipeWorkflowComponent` (or page) that pushes a proper `FormGroup` via `FormBuilder`; replace broken button handler. *i18n*: Add any new UI labels to `dictionary.json`.
3. **A3** – Implement recipe persistence: map form to `Recipe` (or extended DTO), call `KitchenStateService.addRecipe()` (and future update/delete), show success/error via `UserMsgService`. *i18n*: Add success/error message keys to `dictionary.json`.
4. **A4** – Add recipe data layer: extend `KitchenStateService` or create `RecipeDataService` with `addRecipe`, `updateRecipe`, `getRecipeById`; persist to `AsyncStorageService` if available.
5. **A5** – Implement edit flow: add `recipeResolver` for `recipe-builder/:id`, inject `ActivatedRoute`, load recipe by id and patch form; differentiate create vs edit in `saveRecipe()`. *i18n*: Add any new labels (e.g. `save`, `edit`, `create`) to `dictionary.json`.

### Phase B: Recipe-as-Ingredient & Cost

6. **B1** – Recursive recipe cost: when `item_type === 'recipe'`, compute cost from recipe’s ingredients (recursive); add helper in service or component.
7. **B2** – Update `total_weight_g`: compute from ingredients (products: net × yield; recipes: from yield) and set on form.

### Phase C: UX & Guardrails

8. **C1** – Add `pendingChangesGuard` to recipe-builder routes (create + edit). *i18n*: Add guard dialog message keys (e.g. `unsaved_changes`, `discard`, `stay`) to `dictionary.json`.
9. **C2** – Make `portions` reactive: pass `portions` as computed/signal or ensure `recipe-ingredients-table` reacts to form value changes.
10. **C3** – Handle `openUnitCreator`: wire to shared unit-creator flow (or stub for now). *i18n*: Unit-creator UI strings must use `translatePipe`; add keys to `dictionary.json`.

### Phase D: Cleanup & Tests

11. **D1** – Align `yield_percentage` / `yield_factor` naming across form and product model.
12. **D2** – Expand specs: add behavior tests for save, edit load, cost calculation, workflow add/remove.
13. **D3** – **i18n audit**: Replace all hardcoded Hebrew in recipe-builder components with `translatePipe`; ensure `recipe-header` (e.g. "מנה", "הכנה", "הוסף יחידה חדשה", "עלות / COST", "משקל / WEIGHT") uses dictionary keys; add any missing keys to `dictionary.json`.

---

## 4. Form ↔ Recipe Model Mapping (Reference)

| Form Field | Recipe Model |
|------------|--------------|
| `name_hebrew` | `name_hebrew` |
| `recipe_type` | (derived: dish vs prep) |
| `serving_portions` | `yield_amount_` (when dish) |
| `yield_conversions[0]` | `yield_amount_`, `yield_unit_` (when prep) |
| `ingredients` | `ingredients_` (map to `Ingredient[]`) |
| `workflow_items` (prep) | `steps_` (map order, instruction, labor_time) |
| `workflow_items` (dish) | (mise-en-place: TBD – extend model or store separately) |
| `total_weight_g`, `total_cost` | Optional metadata |

---

## 5. Clarifications: Questions and Options

Below are key decisions for the recipe-builder page. Each question is followed by options and their pros/cons for your selection.

---

### 1. How should recipes be stored?

V - **Option A:** Persist recipes to `AsyncStorageService` (like products).
  - *Pros*: Consistent with products; survives page reload; enables future sync/export.
  - *Cons*: Requires new CRUD (create/read/update/delete) logic for recipes.

**Option B:** Keep recipes in-memory via `KitchenStateService.recipes_` for now.
  - *Pros*: Faster to implement; simpler for short-term development.
  - *Cons*: Data lost on refresh; less robust.

*Which storage approach do you want? If Option A, should I create a dedicated recipe CRUD service, or is there already one available?* A

---

### 2. How should mise-en-place for dishes be modeled?

**Option A:** Extend the main `Recipe` model to support both `steps_` and dish-specific categories/items (e.g., add `mise_categories_`).
  - *Pros*: Everything in one model; easier for unified handling.
  - *Cons*: Model grows more complex.

v -**Option B:** Store mise-en-place as a separate structure, maybe just for dishes (e.g., separate `mise_categories_` property or sub-model).
  - *Pros*: Separation of concerns; more flexible for future changes.
  - *Cons*: Requires additional mapping/handling.

*Which approach do you prefer for mise-en-place in dishes?* b

---

### 3. How should recursive recipe costing work?

**Option A:** When a recipe is used as an ingredient, compute its cost recursively from its ingredients (unlimited depth).
  - *Pros*: Most accurate cost calculation; supports deep nesting.
  - *Cons*: Possible risk of infinite loops/circular refs if not controlled.

**Option B:** Limit recursive cost calculation to a set depth (e.g., 2 or 3 levels).
  - *Pros*: Safer; easier to test; still covers most real scenarios.
  - *Cons*: Might miss edge cases with deeply nested recipes.

**Option C:** Cache recipe costs after calculation to prevent infinite recursion or performance hits.
  - *Pros*: Improves efficiency; guards against infinite loops.
  - *Cons*: Added complexity to manage cache invalidation.

*Which costing strategy do you want? Specify a depth limit if relevant.* lets take option B and set it to max 5 dep

---

### 4. What should happen when the Unit Creator is triggered?

**Option A:** Link to an existing unit-creator modal/dialog (please specify the component/service if it exists).
  - *Pros*: Real workflow; no stubbing later.
  - *Cons*: Integration may take more time if wiring is complex.

**Option B:** Stub the unit-creator for now (placeholder, no-op, or simple alert).
  - *Pros*: Quick to wire; can be upgraded later.
  - *Cons*: Not functional for end-users yet.

*Should I wire to a real Unit Creator, or stub it for now?* I didn't understand the question fully, but as a general I believe we need to have some sort of a model that allows the user to add.Different.Unit.Of measurements.Because this can occur across multiple places on the application.As an example, at some point I want to allow the user.To edit.A product from everywhere in the application.So that even when it's reading the recipe.You could left click the mouse.Press add-unit And from.No matter where he's standing right now, you have a dollar. Open it up, allowing him to create another measurement unit. Therefore I'm not sure which answer is better.Your question..

---

### 5. What is your preferred task execution order?

**Option A:** Start with Phase A (critical bugs and persistence as planned).
  - *Pros*: Fixes immediate issues; keeps momentum toward data integrity.
  - *Cons*: Leaves enhancements and tests for later.

**Option B:** Adjust the order (please specify your preference).
  - *Pros*: Custom workflow to fit your priorities.
  - *Cons*: May impact the amount of refactoring needed later.

*Do you want to proceed with Phase A first, or would you like a different order?* as you think is best!

---

## 6. Suggested Execution Order

1. A1, A2 (quick UI fixes)
2. A4 (data layer for recipes)
3. A3 (wire save to data layer)
4. A5 (edit flow + resolver)
5. B1, B2 (cost & weight)
6. C1, C2, C3 (guards, reactivity, unit creator)
7. D1, D2 (naming, tests)

---

*Plan ready. Awaiting approval before modifying `src/`.*
