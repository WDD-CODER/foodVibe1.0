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

### Plan 009 — Cohesive Add Item Modal (`plans/009-cohesive-add-item-modal.plan.md`)

- [x] Create AddItemModalService and AddItemModal component (refactor from add-supplier-modal).
- [x] Create AddSupplierFlowService for add-supplier orchestration.
- [x] Update TranslationKeyModal for 'unit' context (metadata manager).
- [x] Update Product Form to use AddSupplierFlowService.
- [x] Update Metadata Manager to use TranslationKeyModal instead of prompt().
- [x] Update App Root and delete deprecated add-supplier-modal service.
- [x] Add add_supplier_translation_key and ensure dictionary keys.

### Plan 008 — Recipe Book Page (`plans/008-recipe-book-page.plan.md`)

- [x] Route `/recipe-book` + page shell + header link (replace `/dishes`).
- [x] Recipe-book-list component: grid with sortable columns (name, type, cost, approved, station, main-category, allergens, actions).
- [x] Sidebar: search, filters (type, allergens, main-category placeholder).
- [x] Allergens column: button opens floating container with dense allergen chips (aggregated from ingredients).
- [x] Actions: Add, Edit, Delete; KitchenStateService.deleteRecipe (routes to DishDataService/RecipeDataService by recipe_type_).
- [x] Main-category column placeholder (no_category).
- [x] Add recipe-book-list.spec.ts and run tests.

### Plan 017 — Recipe Book List UX Overhaul (`plans/017-recipe-book-list-ux-overhaul.plan.md`)

- [x] Sidebar open by default (desktop), closed on mobile; sticky right; mobile off-canvas with close button.
- [x] Remove approved/station table columns; keep Approved & Station as sidebar filters.
- [x] Remove sort arrow icons; keep click-to-sort on column titles.
- [x] Allergens column: narrow by default; header click = expand all rows, row icon = expand that row; dense grid.
- [x] Cost column before actions; yield tooltip on hover/tap (getRecipeYieldDescription).
- [x] Top search = recipe/dish name (action bar + mobile fixed with toggle); sidebar search = by produce (ingredients) with dropdown, chips, clear, filter by all selected.
- [x] Ingredient search: product dropdown, chips (click to remove), clear, recipeContainsAllProducts filter.
- [x] Dictionary keys: Approved, Station, approved_yes, approved_no, no_station, search_by_ingredients, clear.

### Plan 007 — Product Form Enhancement (`plans/007-product-form-enhancement.plan.md`)

- [x] Add SupplierDataService and persist suppliers to KITCHEN_SUPPLIERS.
- [x] Create TranslationKeyModal component and service (replace prompt).
- [x] Add supplier, is_dairy, min_stock_level, expiry_days_default to form.
- [x] Ensure NEW_CATEGORY and NEW_ALLERGEN flows persist via MetadataRegistry.
- [x] Apply translatePipe to all labels and add dictionary keys.
- [x] Style new fields and modal per application design system.
- [x] Update inventory list to resolve supplierId_ to supplier name for display.

### Recipe Builder — Ingredients keyboard-first UX (ad-hoc)

- [x] Open recipe-builder with one empty row and auto-focus its search (afterNextRender).
- [x] Add-row button: focus moves to new row’s search so user can type immediately.
- [x] Ingredient search: arrow keys + Enter in dropdown; Enter with no selection adds new row.
- [x] After selecting item: focus moves to quantity (no new row); Tab goes to unit select (not +/-).
- [x] Enter in quantity or unit: add new row and focus new row’s search (keyboard-only flow).
- [x] FocusByRowDirective + wiring for focus-by-row (qty/unit).

### Plan 032 — Custom Cooking Loader (`plans/032-custom-cooking-loader.plan.md`)

- [x] Create loader component (simmering pot + steam, sizes large/medium/small, overlay, inline).
- [x] Add dictionary keys (loader_loading, loader_saving, loader_please_wait, loader_cooking_up).
- [x] Route-level loader in app.component; trash + version-history panel medium loaders.
- [x] Save-button loaders: recipe-builder, menu-intelligence, cook-view, product/equipment/venue forms.
- [x] Delete/clone loaders: recipe-book, inventory, equipment, venue, menu-library; inventory price-save loader.
- [x] Demo data import large overlay on metadata manager.

### Plan 035 — Header and Navigation Refactor (`plans/035-header-navigation-refactor.plan.md`)

- [x] A. Hide mobile-close-btn in desktop mode via SCSS rule
- [x] B+E. Remove 5 nav items from header HTML, increase gap for padding
- [x] C. Add equipment child route under inventory + nav buttons in inventory page
- [x] D. Create AddEquipmentModal component + service (name + category fields)
- [x] F+H. Location/Trash buttons in dashboard tab bar
- [x] G. Create HeroFab (expand on main-button hover only); remove footer

### Plan 036 — Dashboard Control Panel Fixed Tabs (`plans/036-dashboard-control-panel-fixed-tabs.plan.md`)

- [x] Extend DashboardTab to five tabs; query param; five tab buttons; sticky header
- [x] Render five views (overview, metadata, venues, add-venue, trash); VenueForm embedded mode

### Plan 038 — Inverted-L List Layout (`plans/038-inverted-l-list-layout.plan.md`)

- [x] Restructure recipe-book-list and inventory-product-list to inverted-L (header / table-area / filter-panel)
- [x] Rewrite both SCSS: grid, fixed header, scrollable table body, retractable panel (cssLayer)
- [x] Replace sidebar signals with isPanelOpen_ / togglePanel(); remove swipe and media-query logic
- [x] Build and linter verified

### Plan 039 — List UX Panel and Scroll (`plans/039-list-ux-panel-scroll.plan.md`)

- [x] Move filter panel to visual right (grid swap in both list SCSS)
- [x] Replace panel toggle with hover-reveal arrow icon; hide scrollbars; remove Cook/History buttons from recipe book

### Recipe Builder — Scaling, Bruto, Weight/Volume Toggle (`docs/recipe_metrics_scaling_plan.md`)

- [x] RecipeCostService: fix product weight formula (`net / conversion_rate_`), registry fallback for volume→grams, VOLUME_OR_WEIGHT_KEYS.
- [x] RecipeCostService: computeTotalBrutoWeightG, getUnconvertibleNamesForWeight, computeTotalVolumeL (with unconvertible names); IngredientWeightRow.name_hebrew.
- [x] recipe-builder.page: totalBrutoWeightG_, totalVolumeL_/totalVolumeMl_, unconvertibleForWeight_/unconvertibleForVolume_; pass to header; ingredientsFormVersion_ so totalCost_/totalWeightG_ recompute when ingredients change.
- [x] recipe-header: inputs (totalBrutoWeightG, totalVolumeL, totalVolumeMl, unconvertible lists); metricsDisplayMode_ (weight | volume); toggle on metric-group click; bruto or volume display; red notice icon + floating list (names only), hover/click, ClickOutSideDirective.
- [x] recipe-header styles: metric-group-weight-volume, metrics-notice-wrap, metrics-notice-icon, metrics-notice-floating, metrics-notice-item.
- [x] Fix cost not updating when adding ingredients (computed depended on no signal; now depends on ingredientsFormVersion_ bumped in valueChanges).

---

## Ahead (Pending)

### Plan 037 — Recipe Labels Refactor (`plans/037-recipe-labels-refactor.plan.md`)

- [ ] Create LabelDefinition interface + labels_/autoLabels_ on Recipe model
- [ ] Extend MetadataRegistryService: allLabels_ signal, registerLabel, deleteLabel, getLabelColor (KITCHEN_LABELS)
- [ ] Create label-creation-modal component + service (name, key, color swatches, auto-trigger picker)
- [ ] Extend metadata-manager: add 'label' type, labels card, delete guard, custom add via label modal
- [ ] Recipe builder: labels FormControl, patchFormFromRecipe, buildRecipeFromForm, computeAutoLabels on save, liveAutoLabels_
- [ ] Recipe header: custom searchable label dropdown, colored chips (manual removable, auto locked)
- [ ] Recipe-book: replace main_category with labels column (colored chips), filter, sort
- [ ] Add translation keys (labels, choose_label, create_new_label, no_label, label_name, label_color, auto_trigger_sources, save_label, add_new_label)
- [ ] Register label-creation-modal in app root

### Plan 034 — Recipe Builder UI Fixes (`plans/034-recipe-builder-ui-fixes.plan.md`)

- [ ] a. Type toggle: pass recipeType from parent, add input in header, use in template
- [ ] b. Header unit dropdowns: overflow visible + z-index for primary/secondary
- [ ] c. Add row button: justify-content center in recipe-builder.page.scss
- [ ] d. Ingredient search dropdown: z-index 100, ensure no overflow clip
- [ ] e. Ingredients table: container-aware grid + small-screen stacked cards
- [ ] f. Workflow section: space-evenly + define prep-flat-grid styles
- [ ] g. Add step button: width 100%, align with grid in recipe-workflow

### Phase 1 — Stabilize & Complete (`plans/010-product-roadmap.plan.md`)

- [x] Add `recipe-book-list.spec.ts` and run tests (Plan 008 closure).
- [x] Set up Playwright E2E tests: config + 3 critical flow tests (product CRUD, recipe creation with cost, recipe edit persistence).
- [ ] Optionally expand minimal specs (e.g. recipe-builder page and subcomponents) with behavior tests when touching those areas.
- [x] Sync documentation: update `project-plan.md` checkboxes, update breadcrumbs.
- [ ] When adding new features: add/update `.spec.ts` and mark related sub-tasks here; run tests before considering the task done.

### Plan 011 — Dashboard & Command Center Unification (done)

- [x] Dashboard default route, Overview + Core settings tabs; `/command-center` → `/dashboard?tab=metadata`; single Dashboard nav link; unit tests + recipe-builder spec fix (queryParams).

### Phase 2 — Product Enhancement

- [ ] **Plan 011 (KPI expansion, optional)**: Further dashboard enhancements per roadmap if desired.
- [ ] **Plan 012 — Supplier Management Page**: Dedicated CRUD page at `/suppliers` with list, edit, delete, linked products view.
- [ ] **Plan 013 — Recipe Quick Actions**: Duplicate recipe, approval toggle in recipe book list, batch select/actions.
- [ ] **Plan 014 — Low Stock Alerts**: Visual indicators in inventory list, filter toggle, dashboard card.

### Phase 3 — Polish & Production Readiness

- [ ] **Plan 015 — Empty States & Onboarding**: Empty-state UX for all list views, first-use guidance, Hebrew copy.
- [ ] **Plan 016 — Print-Friendly Recipe View**: Print stylesheet, hide navigation in print, RTL-aware layout, print button.
- [ ] **Plan 018 — Backend API Preparation**: Formalize `IStorageAdapter`, document REST API contract, audit adapter compliance.
- [ ] **Deployment Pipeline**: Validate and activate GitHub Actions workflow for GitHub Pages.

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
| 009 | Cohesive Add Item Modal | Done |
| 010 | Product Roadmap: V1 Completion & Beyond | Active |
| 011 | Unify Dashboard & Command Center | Done |
| — | Recipe Builder: scaling, bruto, weight/volume toggle, unconvertible notice | Done |
| 012 | Supplier Management Page | Planned |
| 013 | Recipe Quick Actions | Planned |
| 014 | Low Stock Alerts | Planned |
| 015 | Empty States & Onboarding | Planned |
| 016 | Print-Friendly Recipe View | Planned |
| 017 | Recipe Book List UX Overhaul | Done |
| 018 | Backend API Preparation | Planned |
| 019 | Recipe Cook View Page | Done |
| 020 | Cook View UX Overhaul | Done |
| 021 | Cook View Workflow Fix Redesign | Done |
| 022 | Recipe Builder Focus and Save | Done |
| 023 | Cook View Workflow Fix Redesign (dup) | Done |
| 024 | Full Project QA Audit | Done |
| 025 | Menu Intelligence Module | Done |
| 026 | Menu Builder UX Styling | Done |
| 027 | Sidebar Filter UX | Done |
| 028 | CSS Layer Token Hierarchy Skill Update | Done |
| 029 | SCSS Global Tokens Audit Refactor | Done |
| 030 | Contextual Logistics Layer | Done |
| 031 | Menu Library Style UX | Done |
| 032 | Custom Cooking Loader | Done |
| 033 | Liquid Glass Design System | Done |
| 034 | Recipe Builder UI Fixes | Active |
| 035 | Header and Navigation Refactor | Done |
| 036 | Dashboard Control Panel Fixed Tabs | Done |
| 037 | Recipe Labels Refactor | Active |
| 038 | Inverted-L List Layout | Done |
| 039 | List UX Panel and Scroll | Done |

*Excluded from audit: `plans/recipe-builder-page.md` (recipe book plan).*
