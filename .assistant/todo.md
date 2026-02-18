# Active Tasks

Update status after each sub-task. Link plan files here when applicable.

---

## Done

### Recipe Builder (recipe-builder-page.md — excluded from plan audit per request)

- [x] Recipe-builder plan executed: `plans/recipe-builder-page.md` — A1–A5, C1–C2 (currentCost, mise-en-place fix, persistence, RecipeDataService, edit flow, pendingChangesGuard, reactive portions).

### Unit Tests & Specs

- [x] Unit test suite in place: 27 `.spec.ts` files (Karma/Jasmine).
- [x] Core services with substantive tests: `product-data.service`, `async-storage.service`, `unit-registry.service`, `metadata-registry.service`, `conversion.service`, `kitchen-state.service`, `translation.service`.
- [x] Core guards, resolvers, pipes, directives covered: `pending-changes.guard`, `product.resolver`, `translation-pipe.pipe`, `select-on-focus.directive`, `click-out-side.directive`, `item.validators`.
- [x] Core UI components: `header`, `footer`, `user-msg`.
- [x] Inventory page and components: `inventory.page`, `inventory-product-list`, `product-form`.
- [x] Recipe-builder page and components: page + `recipe-workflow`, `recipe-ingredients-table`, `recipe-header`, `ingredient-search` (minimal "should create" specs).
- [x] Metadata-manager page: `metadata-manager.page.component`.
- [x] Fix spec compile errors: `pending-changes.guard.spec`, `translation-pipe.pipe.spec`, `metadata-manager.page.component.spec` (suite builds and runs).
- [x] Fix remaining 21 failing unit tests: provide `HttpClient` / `TranslationService` where needed; satisfy required inputs; align specs with async API; add Lucide icons; fix header route assertion.
- [x] Run full unit test suite (`npm test -- --no-watch --browsers=ChromeHeadless`) and confirm all tests pass (89/89).
- [x] Shared: `unit-creator.component`.
- [x] App root: `app.component.spec.ts`.

### Plan 002 — Recipe Header Scaling (`plans/002-recipe-header-scaling.plan.md`)

- [x] Register `dish` as a real unit in UnitRegistryService.
- [x] Primary unit label for dishes shows `dish` via translatePipe.
- [x] Upgrade secondary chips to same UX as primary (counter-grid, SelectOnFocus, +/- buttons, minus disabled at zero).
- [x] Unit filtering: bidirectional exclusivity (availablePrimaryUnits_, availableSecondaryUnits_).
- [x] Header specs: dish unit, secondary chip UX, unit filtering.

### Plan 003 — Recipe Ingredients Table Enhancement (`plans/003-recipe-ingredients-table-enhancement.plan.md`)

- [x] Add plus/minus quantity controls (incrementAmount, decrementAmount).
- [x] Add percentage column (getPercentageDisplay, getRowWeightG in RecipeCostService).
- [x] Update grid layout for quantity+controls and percentage.
- [x] Minor fixes: remove duplicate import, unused totalMass_.

### Plan 004 — Recipe Workflow Enhancement (`plans/004-recipe-workflow-enhancement.plan.md`)

- [x] Create PreparationRegistryService + spec.
- [x] Create PreparationSearchComponent (ts, html, scss, spec).
- [x] Update Recipe model (FlatPrepItem, prep_items_, prep_categories_).
- [x] Update recipe-builder.page.ts (flat form, createPrepItemRow, patch, build).
- [x] Update recipe-workflow component for dish flat grid (prep list with search, category, quantity, unit).
- [x] Add dictionary entries and verify icons.
- [x] Migration: load old mise_categories_ into flat form; save as prep_items_ and prep_categories_.

### Plan 005 — Inventory Page Enhancement (`plans/005-inventory-page-enhancement.plan.md`)

- [x] Action sidebar: search by name, filters (category, allergens, supplier), collapsible from right.
- [x] Product list: sharp table grid with edit/delete per row.
- [x] Styling: slate palette, allergen pills, sharp borders.
- [x] Hover animation on products for edit and delete icons.

### Plan 005-1 — Inventory List Refactor (`plans/005-1-inventory-list-refactor.plan.md`)

- [x] Column-header sort (replace sidebar sort).
- [x] Hamburger fade when sidebar open.
- [x] Remove Add product button.
- [x] Center-align grid row text.

### Plan 006 — Recipe Workflow Refactor (`plans/006-recipe-workflow-refactor.plan.md`)

- [x] (a) Preparation category: always a select (main grid + add-form); choose category placeholder; add-option; per-recipe override.
- [x] (b) Quantity input: remove browser default spinners.
- [x] (c) Instruction textarea: SelectOnFocus, Enter-to-save-and-new-row, center text.
- [x] (d) Dish mode: sort/group button beside preparation category.
- [x] (e) Dual workflow persistence: keep both prep list and steps when switching recipe type.
- [x] (f) Apply translatePipe to all user-facing strings.
- [x] (g) New category: prompt for English value, add to dictionary.

### Plan 006-1 — Preparation Global vs Specific (`plans/006-1-preparation-global-vs-specific.plan.md`)

- [x] Add dictionary keys (change_global, add_as_specific, category_change_prompt).
- [x] Add getPreparationByName and updatePreparationCategory to PreparationRegistryService.
- [x] Create GlobalSpecificModal component and service.
- [x] Add main_category_name to recipe-builder form and recipe-workflow.
- [x] Extend onCategoryChange with modal logic.
- [x] Register modal in app root.

### Plan 006-2 — Preparation Category Change Modal (`plans/006-2-preparation-category-change-modal.plan.md`)

- [x] Category change modal (Change global / Add as specific).
- [x] Undo/revert for change main.

### Plan 008 — Recipe Book Page (`plans/008-recipe-book-page.plan.md`)

- [x] Route `/recipe-book` + page shell + header link (replace `/dishes`).
- [x] Recipe-book-list component: grid with sortable columns (name, type, cost, approved, station, main-category, allergens, actions).
- [x] Sidebar: search, filters (type, allergens, main-category placeholder).
- [x] Allergens column: button opens floating container with dense allergen chips (aggregated from ingredients).
- [x] Actions: Add, Edit, Delete; KitchenStateService.deleteRecipe (routes to DishDataService/RecipeDataService by recipe_type_).
- [x] Main-category column placeholder (no_category).
- [ ] Add recipe-book-list.spec.ts and run tests.

### Plan 007 — Product Form Enhancement (`plans/007-product-form-enhancement.plan.md`)

- [x] Add SupplierDataService and persist suppliers to KITCHEN_SUPPLIERS.
- [x] Create TranslationKeyModal component and service (replace prompt).
- [x] Add supplier, is_dairy, min_stock_level, expiry_days_default to form.
- [x] Ensure NEW_CATEGORY and NEW_ALLERGEN flows persist via MetadataRegistry.
- [x] Apply translatePipe to all labels and add dictionary keys.
- [x] Style new fields and modal per application design system.
- [x] Update inventory list to resolve supplierId_ to supplier name for display.

---

## Ahead (Pending)

### E2E & Testing

- [ ] Add or extend e2e tests (Playwright per `.assistant/copilot-instructions.md`) if not yet present.
- [ ] Optionally expand minimal specs (e.g. recipe-builder page and subcomponents) with behavior tests when touching those areas.
- [ ] When adding new features: add/update `.spec.ts` and mark related sub-tasks here; run tests before considering the task done.

---

## Plan Index (for reference)

| Plan | Name | Status |
|------|------|--------|
| 002 | Recipe Header Scaling & Dish Mode | Done |
| 003 | Recipe Ingredients Table Enhancement | Done |
| 004 | Recipe Workflow Enhancement | Done |
| 005 | Inventory Page Enhancement | Done |
| 005-1 | Inventory List Refactor | Done |
| 006 | Recipe Workflow Refactor | Done |
| 006-1 | Preparation Global vs Specific | Done |
| 006-2 | Preparation Category Change Modal | Done |
| 007 | Product Form Enhancement | Done |
| 008 | Recipe Book Page | Done |

*Excluded from audit: `plans/recipe-builder-page.md` (recipe book plan).*
