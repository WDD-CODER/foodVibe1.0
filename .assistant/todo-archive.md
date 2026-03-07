# Archived Done Tasks

Moved from todo.md to reduce token load.

---

## Done

### Recipe Builder (recipe-builder-page.md â€” excluded from plan audit per request)

- [x] Recipe-builder plan executed: `plans/recipe-builder-page.md` â€” A1â€“A5, C1â€“C2 (currentCost, mise-en-place fix, persistence, RecipeDataService, edit flow, pendingChangesGuard, reactive portions).
- [x] fix(recipe-builder): confirm when leaving with unsaved edits â€” markAsDirty in ingredients/workflow/logistics + hasUnsavedEdits(); fix/recipe-unsaved-changes-confirm merged to main.
- [x] Recipe header labels: dense grid + Label dropdown, colored chips, clear all; Lucide icons (log-out, shopping-cart, grip-vertical, archive, download, upload) â€” `feat/recipe-builder-labels-and-icons` merged to main.
- [x] Recipe header label chips: fit width to text (flex + max-content) â€” `fix/recipe-header-label-chips-fit-text` merged to main.
- [x] feat/recipe-cook-quantity-and-ux merged to main: format-quantity pipe, unit registry, recipe-builder/workflow/ingredients/cook-view/metadata-manager/modals and styles, deps and demo data (3 commits).
- [x] feat/quantity-controls-unified merged to main: shared quantity-step util (value-based step 1 / 0.001), cook-view, recipe-ingredients-table, recipe-workflow, menu-intelligence guest count, recipe-builder logistics +/-.
- [x] feat/recipe-builder-ingredients-ux merged to main: no duplicate ingredients in ingredient search dropdown; add preparation adds empty row without category picker.
- [x] feat/add-recipe-dictionary-mise-category merged to main: preparation_categories in dictionary + TranslationService; add-recipe skill (dictionary sync, mise per-preparation semantics, Step 2/5b/6/8); plan 084.

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

### Plan 002 â€” Recipe Header Scaling (`plans/002-recipe-header-scaling.plan.md`)

- [x] Register `dish` as a real unit in UnitRegistryService.
- [x] Primary unit label for dishes shows `dish` via translatePipe.
- [x] Upgrade secondary chips to same UX as primary (counter-grid, SelectOnFocus, +/- buttons, minus disabled at zero).
- [x] Unit filtering: bidirectional exclusivity (availablePrimaryUnits_, availableSecondaryUnits_).
- [x] Header specs: dish unit, secondary chip UX, unit filtering.

### Plan 003 â€” Recipe Ingredients Table Enhancement (`plans/003-recipe-ingredients-table-enhancement.plan.md`)

- [x] Add plus/minus quantity controls (incrementAmount, decrementAmount).
- [x] Add percentage column (getPercentageDisplay, getRowWeightG in RecipeCostService).
- [x] Update grid layout for quantity+controls and percentage.
- [x] Minor fixes: remove duplicate import, unused totalMass_.

### Plan 004 â€” Recipe Workflow Enhancement (`plans/004-recipe-workflow-enhancement.plan.md`)

- [x] Create PreparationRegistryService + spec.
- [x] Create PreparationSearchComponent (ts, html, scss, spec).
- [x] Update Recipe model (FlatPrepItem, prep_items_, prep_categories_).
- [x] Update recipe-builder.page.ts (flat form, createPrepItemRow, patch, build).
- [x] Update recipe-workflow component for dish flat grid (prep list with search, category, quantity, unit).
- [x] Add dictionary entries and verify icons.
- [x] Migration: load old mise_categories_ into flat form; save as prep_items_ and prep_categories_.

### Plan 005 â€” Inventory Page Enhancement (`plans/005-inventory-page-enhancement.plan.md`)

- [x] Action sidebar: search by name, filters (category, allergens, supplier), collapsible from right.
- [x] Product list: sharp table grid with edit/delete per row.
- [x] Styling: slate palette, allergen pills, sharp borders.
- [x] Hover animation on products for edit and delete icons.

### Plan 005-1 â€” Inventory List Refactor (`plans/005-1-inventory-list-refactor.plan.md`)

- [x] Column-header sort (replace sidebar sort).
- [x] Hamburger fade when sidebar open.
- [x] Remove Add product button.
- [x] Center-align grid row text.

### Plan 006 â€” Recipe Workflow Refactor (`plans/006-recipe-workflow-refactor.plan.md`)

- [x] (a) Preparation category: always a select (main grid + add-form); choose category placeholder; add-option; per-recipe override.
- [x] (b) Quantity input: remove browser default spinners.
- [x] (c) Instruction textarea: SelectOnFocus, Enter-to-save-and-new-row, center text.
- [x] (d) Dish mode: sort/group button beside preparation category.
- [x] (e) Dual workflow persistence: keep both prep list and steps when switching recipe type.
- [x] (f) Apply translatePipe to all user-facing strings.
- [x] (g) New category: prompt for English value, add to dictionary.

### Plan 006-1 â€” Preparation Global vs Specific (`plans/006-1-preparation-global-vs-specific.plan.md`)

- [x] Add dictionary keys (change_global, add_as_specific, category_change_prompt).
- [x] Add getPreparationByName and updatePreparationCategory to PreparationRegistryService.
- [x] Create GlobalSpecificModal component and service.
- [x] Add main_category_name to recipe-builder form and recipe-workflow.
- [x] Extend onCategoryChange with modal logic.
- [x] Register modal in app root.

### Plan 006-2 â€” Preparation Category Change Modal (`plans/006-2-preparation-category-change-modal.plan.md`)

- [x] Category change modal (Change global / Add as specific).
- [x] Undo/revert for change main.

### Plan 009 â€” Cohesive Add Item Modal (`plans/009-cohesive-add-item-modal.plan.md`)

- [x] Create AddItemModalService and AddItemModal component (refactor from add-supplier-modal).
- [x] Create AddSupplierFlowService for add-supplier orchestration.
- [x] Update TranslationKeyModal for 'unit' context (metadata manager).
- [x] Update Product Form to use AddSupplierFlowService.
- [x] Update Metadata Manager to use TranslationKeyModal instead of prompt().
- [x] Update App Root and delete deprecated add-supplier-modal service.
- [x] Add add_supplier_translation_key and ensure dictionary keys.

### Plan 008 â€” Recipe Book Page (`plans/008-recipe-book-page.plan.md`)

- [x] Route `/recipe-book` + page shell + header link (replace `/dishes`).
- [x] Recipe-book-list component: grid with sortable columns (name, type, cost, approved, station, main-category, allergens, actions).
- [x] Sidebar: search, filters (type, allergens, main-category placeholder).
- [x] Allergens column: button opens floating container with dense allergen chips (aggregated from ingredients).
- [x] Actions: Add, Edit, Delete; KitchenStateService.deleteRecipe (routes to DishDataService/RecipeDataService by recipe_type_).
- [x] Main-category column placeholder (no_category).
- [x] Add recipe-book-list.spec.ts and run tests.

### Plan 017 â€” Recipe Book List UX Overhaul (`plans/017-recipe-book-list-ux-overhaul.plan.md`)

- [x] Sidebar open by default (desktop), closed on mobile; sticky right; mobile off-canvas with close button.
- [x] Remove approved/station table columns; keep Approved & Station as sidebar filters.
- [x] Remove sort arrow icons; keep click-to-sort on column titles.
- [x] Allergens column: narrow by default; header click = expand all rows, row icon = expand that row; dense grid.
- [x] Cost column before actions; yield tooltip on hover/tap (getRecipeYieldDescription).
- [x] Cost tooltip: show below cell, Hebrew label (price_for), fixed position so last row is visible (feat/recipe-book-cost-tooltip).
- [x] Top search = recipe/dish name (action bar + mobile fixed with toggle); sidebar search = by produce (ingredients) with dropdown, chips, clear, filter by all selected.
- [x] Ingredient search: product dropdown, chips (click to remove), clear, recipeContainsAllProducts filter.
- [x] Dictionary keys: Approved, Station, approved_yes, approved_no, no_station, search_by_ingredients, clear.

### Plan 007 â€” Product Form Enhancement (`plans/007-product-form-enhancement.plan.md`)

- [x] Add SupplierDataService and persist suppliers to KITCHEN_SUPPLIERS.
- [x] Create TranslationKeyModal component and service (replace prompt).
- [x] Add supplier, is_dairy, min_stock_level, expiry_days_default to form.
- [x] Ensure NEW_CATEGORY and NEW_ALLERGEN flows persist via MetadataRegistry.
- [x] Apply translatePipe to all labels and add dictionary keys.
- [x] Style new fields and modal per application design system.
- [x] Update inventory list to resolve supplierId_ to supplier name for display.

### Recipe Builder â€” Ingredients keyboard-first UX (ad-hoc)

- [x] Open recipe-builder with one empty row and auto-focus its search (afterNextRender).
- [x] Add-row button: focus moves to new rowâ€™s search so user can type immediately.
- [x] Ingredient search: arrow keys + Enter in dropdown; Enter with no selection adds new row.
- [x] After selecting item: focus moves to quantity (no new row); Tab goes to unit select (not +/-).
- [x] Enter in quantity or unit: add new row and focus new rowâ€™s search (keyboard-only flow).
- [x] FocusByRowDirective + wiring for focus-by-row (qty/unit).

### Plan 032 â€” Custom Cooking Loader (`plans/032-custom-cooking-loader.plan.md`)

- [x] Create loader component (simmering pot + steam, sizes large/medium/small, overlay, inline).
- [x] Add dictionary keys (loader_loading, loader_saving, loader_please_wait, loader_cooking_up).
- [x] Route-level loader in app.component; trash + version-history panel medium loaders.
- [x] Save-button loaders: recipe-builder, menu-intelligence, cook-view, product/equipment/venue forms.
- [x] Delete/clone loaders: recipe-book, inventory, equipment, venue, menu-library; inventory price-save loader.
- [x] Demo data import large overlay on metadata manager.

### Plan 035 â€” Header and Navigation Refactor (`plans/035-header-navigation-refactor.plan.md`)

- [x] A. Hide mobile-close-btn in desktop mode via SCSS rule
- [x] B+E. Remove 5 nav items from header HTML, increase gap for padding
- [x] C. Add equipment child route under inventory + nav buttons in inventory page
- [x] D. Create AddEquipmentModal component + service (name + category fields)
- [x] F+H. Location/Trash buttons in dashboard tab bar
- [x] G. Create HeroFab (expand on main-button hover only); remove footer

### Plan 036 â€” Dashboard Control Panel Fixed Tabs (`plans/036-dashboard-control-panel-fixed-tabs.plan.md`)

- [x] Extend DashboardTab to five tabs; query param; five tab buttons; sticky header
- [x] Render five views (overview, metadata, venues, add-venue, trash); VenueForm embedded mode
- [x] Suppliers tab in dashboard (suppliers + add-supplier); unified list layout and table (venue, equipment, supplier): fixed layout, col-actions-inner flex, empty states (feat/dashboard-suppliers-unified-lists)

### feat/suppliers-nav-and-auth-buttons (merged to main)

- [x] refactor(suppliers): remove redundant page nav, list-header only
- [x] feat(auth): show add/edit disabled with tooltip when not signed in

### feat/list-shell-unified-styling (merged to main)

- [x] style(global): add list header alignment and shared body cell classes (.c-grid-header-cell flex/center, .c-list-row, .c-list-body-cell in styles.scss)
- [x] refactor(lists): use global list classes in all list-shell pages (recipe-book, suppliers, equipment, venues, inventory)

### feat/unify-table-and-design-engine (merged to main)

- [x] refactor(styles): table justify and venue/supplier header layout (styles.scss, venue-list, supplier-list, angular.json)
- [x] refactor(inventory): product list to HTML table and toolbar (inventory-product-list html, scss, ts)

### feat/filter-sidebar-and-ingredient-search (merged to main)

- [x] feat(list-shell): sidebar styling and shared c-filter-* utilities (list-shell, styles.scss, supplier/equipment/inventory/venue list SCSS)
- [x] fix(recipe-book): ingredient search - no duplicate add, no redundant heading, no-match message (recipe-book-list html/scss/ts, dictionary no_ingredients_found)

### Plan 038 â€” Inverted-L List Layout (`plans/038-inverted-l-list-layout.plan.md`)

- [x] Restructure recipe-book-list and inventory-product-list to inverted-L (header / table-area / filter-panel)
- [x] Rewrite both SCSS: grid, fixed header, scrollable table body, retractable panel (cssLayer)
- [x] Replace sidebar signals with isPanelOpen_ / togglePanel(); remove swipe and media-query logic
- [x] Build and linter verified

### Plan 039 â€” List UX Panel and Scroll (`plans/039-list-ux-panel-scroll.plan.md`)

- [x] Move filter panel to visual right (grid swap in both list SCSS)
- [x] Replace panel toggle with hover-reveal arrow icon; hide scrollbars; remove Cook/History buttons from recipe book
- [x] Move open-panel (hamburger) into list header when panel closed (recipe-book + inventory); merge to main (feat/list-ux-panel-and-header)

### Recipe Builder â€” Scaling, Bruto, Weight/Volume Toggle (`docs/recipe_metrics_scaling_plan.md`)

- [x] RecipeCostService: fix product weight formula (`net / conversion_rate_`), registry fallback for volumeâ†’grams, VOLUME_OR_WEIGHT_KEYS.
- [x] RecipeCostService: computeTotalBrutoWeightG, getUnconvertibleNamesForWeight, computeTotalVolumeL (with unconvertible names); IngredientWeightRow.name_hebrew.
- [x] recipe-builder.page: totalBrutoWeightG_, totalVolumeL_/totalVolumeMl_, unconvertibleForWeight_/unconvertibleForVolume_; pass to header; ingredientsFormVersion_ so totalCost_/totalWeightG_ recompute when ingredients change.
- [x] recipe-header: inputs (totalBrutoWeightG, totalVolumeL, totalVolumeMl, unconvertible lists); metricsDisplayMode_ (weight | volume); toggle on metric-group click; bruto or volume display; red notice icon + floating list (names only), hover/click, ClickOutSideDirective.
- [x] recipe-header styles: metric-group-weight-volume, metrics-notice-wrap, metrics-notice-icon, metrics-notice-floating, metrics-notice-item.
- [x] Fix cost not updating when adding ingredients (computed depended on no signal; now depends on ingredientsFormVersion_ bumped in valueChanges).

### Plan 048 â€” Menu Intelligence UX Polish (`plans/048-menu-intelligence-ux-polish.plan.md`)

- [x] Auto-focus dish search input when a recipe is selected (addItem + selectRecipe)
- [x] Replace X icons with trash-2; remove hover background; keep delete on left
- [x] Change .meta-column to width: fit-content
- [x] Glass style all dropdowns + add clickOutside to event-type and dish-search
- [x] Remove borders from all meta rows for consistent borderless look
- [x] Extend keyboard navigation for sections, dish rows, and dish field editing
- [x] Replace chevron toggle with info icon (collapsed) / chevron-up (expanded); add spacing
- [x] Center dish-data fields horizontally with justify-content: center

### Plan 049 â€” Menu Intelligence Layout and UX Fixes (`plans/049-menu-intelligence-layout-ux-fixes.plan.md`)

- [x] Meta-column to opposite side (margin-inline swap)
- [x] Remove focus border from all inputs/selects on page
- [x] Delete icons (section + dish) to opposite side
- [x] Verify info/chevron-up toggle (no code change)
- [x] Hide number input spinners on dish-field inputs
- [x] Food cost (food_cost_money) read-only: no edit mode, span only

### Plan 037 â€” Recipe Labels Refactor (`plans/037-recipe-labels-refactor.plan.md`)

- [x] Create LabelDefinition interface + labels_/autoLabels_ on Recipe model
- [x] Extend MetadataRegistryService: allLabels_ signal, registerLabel, deleteLabel, getLabelColor (KITCHEN_LABELS)
- [x] Create label-creation-modal component + service (name, key, color swatches, auto-trigger picker)
- [x] Extend metadata-manager: add 'label' type, labels card, delete guard, custom add via label modal
- [x] Recipe builder: labels FormControl, patchFormFromRecipe, buildRecipeFromForm, computeAutoLabels on save, liveAutoLabels_
- [x] Recipe header: custom searchable label dropdown, colored chips (manual removable, auto locked)
- [x] Recipe-book: replace main_category with labels column (colored chips), filter, sort
- [x] Add translation keys (labels, choose_label, create_new_label, no_label, label_name, label_color, auto_trigger_sources, save_label, add_new_label)
- [x] Register label-creation-modal in app root

### Plan 051 â€” Recipe builder UX fixes (`plans/051-recipe-builder-ux-fixes.plan.md`)

- [x] Remove border of unit select; same height for value containers; center header cells (except col-name)
- [x] Reduce logistics search width by 20%
- [x] Move "add new tool" to bottom of dropdown
- [x] Collapsible section cards: state, markup, styling (table-logic, workflow-logic, logistics-logic)

### Plan 012-2 â€” Kitchen demo data full values (`plans/012-2-kitchen-demo-data-full-values.plan.md`)

- [x] demo-suppliers.json: 10 suppliers (add 2)
- [x] demo-products.json: subset with purchase_options_ and variety
- [x] demo-recipes.json: optional ingredient note_ on some
- [x] demo-dishes.json: all 10 dishes have logistics_.baseline_, prep_items_ or mise_categories_
- [x] demo-equipment.json: verify categories and scaling mix
- [x] demo-venues.json: 10 venues (add 7)

### Plan 075 â€” Cleanup demo products (`plans/075-cleanup-demo-products.plan.md`) â€” feat/cleanup-demo-products (not merged to main)

- [x] Cleanup demo JSON (products, recipes, venues) and add plan; align app (list-shell, recipe-book, inventory, venue-list, equipment-list) and assistant todo.
- [x] demo-products.json refactor (yield 1, min_stock/expiry 0, 2026 IL prices, allergens) â€” feat/demo-products-cleanup merged to main.

### feat/demo-products-from-list (merged to main)

- [x] feat(data): update demo-products from user produce list â€” prices for 21 existing products, 65 new products (demo_121â€“demo_185).

### Optimize add-recipe skill and data (feat/optimize-add-recipe-skill merged to main)

- [x] Merge SCHEMA.md into SKILL.md, consolidate 8 steps into 5, add lazy file reads
- [x] Remove dead service_overrides_ from all 18 dishes in demo-dishes.json
- [x] Slim command (7â†’3 lines) and rule (15â†’6 lines)
- [x] Save plan 085 â€” optimize-commit-github-skill

### Optimize commit-GitHub skill (plan 085 executed, on main)

- [x] Streamline SKILL.md to 5 phases (merge Decide+Build Plan, fold Confirm into Present)
- [x] Shorten Phase 1 commands; compress example and End State/Related
- [x] Slim command and rule files; session-scope remains in command only

### Plan 082 â€” Recipe/Dish date added (`plans/082-recipe-dish-date-added.plan.md`) â€” merged to main

- [x] Add `addedAt_?: number` to Recipe model
- [x] RecipeDataService: set `addedAt_: Date.now()` in addRecipe; merge existing addedAt_ in updateRecipe
- [x] DishDataService: set `addedAt_: Date.now()` in addDish; merge existing addedAt_ in updateDish
- [x] Recipe book list: show "Date added" column/cell; add sort by dateAdded (SortField + compareRecipes)
- [x] i18n: add date_added key (× ×•×¡×£ ×‘×ª××¨×™×š)
- [ ] Optional: recipe builder show "× ×•×¡×£ ×‘×ª××¨×™×š" when editing; dedicated data-service specs for addedAt_

---


