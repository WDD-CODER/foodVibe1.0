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
- [x] Cost tooltip: show below cell, Hebrew label (price_for), fixed position so last row is visible (feat/recipe-book-cost-tooltip).
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
- [x] Suppliers tab in dashboard (suppliers + add-supplier); unified list layout and table (venue, equipment, supplier): fixed layout, col-actions-inner flex, empty states (feat/dashboard-suppliers-unified-lists)

### feat/unify-table-and-design-engine (merged to main)

- [x] refactor(styles): table justify and venue/supplier header layout (styles.scss, venue-list, supplier-list, angular.json)
- [x] refactor(inventory): product list to HTML table and toolbar (inventory-product-list html, scss, ts)

### Plan 038 — Inverted-L List Layout (`plans/038-inverted-l-list-layout.plan.md`)

- [x] Restructure recipe-book-list and inventory-product-list to inverted-L (header / table-area / filter-panel)
- [x] Rewrite both SCSS: grid, fixed header, scrollable table body, retractable panel (cssLayer)
- [x] Replace sidebar signals with isPanelOpen_ / togglePanel(); remove swipe and media-query logic
- [x] Build and linter verified

### Plan 039 — List UX Panel and Scroll (`plans/039-list-ux-panel-scroll.plan.md`)

- [x] Move filter panel to visual right (grid swap in both list SCSS)
- [x] Replace panel toggle with hover-reveal arrow icon; hide scrollbars; remove Cook/History buttons from recipe book
- [x] Move open-panel (hamburger) into list header when panel closed (recipe-book + inventory); merge to main (feat/list-ux-panel-and-header)

### Recipe Builder — Scaling, Bruto, Weight/Volume Toggle (`docs/recipe_metrics_scaling_plan.md`)

- [x] RecipeCostService: fix product weight formula (`net / conversion_rate_`), registry fallback for volume→grams, VOLUME_OR_WEIGHT_KEYS.
- [x] RecipeCostService: computeTotalBrutoWeightG, getUnconvertibleNamesForWeight, computeTotalVolumeL (with unconvertible names); IngredientWeightRow.name_hebrew.
- [x] recipe-builder.page: totalBrutoWeightG_, totalVolumeL_/totalVolumeMl_, unconvertibleForWeight_/unconvertibleForVolume_; pass to header; ingredientsFormVersion_ so totalCost_/totalWeightG_ recompute when ingredients change.
- [x] recipe-header: inputs (totalBrutoWeightG, totalVolumeL, totalVolumeMl, unconvertible lists); metricsDisplayMode_ (weight | volume); toggle on metric-group click; bruto or volume display; red notice icon + floating list (names only), hover/click, ClickOutSideDirective.
- [x] recipe-header styles: metric-group-weight-volume, metrics-notice-wrap, metrics-notice-icon, metrics-notice-floating, metrics-notice-item.
- [x] Fix cost not updating when adding ingredients (computed depended on no signal; now depends on ingredientsFormVersion_ bumped in valueChanges).

### Plan 048 — Menu Intelligence UX Polish (`plans/048-menu-intelligence-ux-polish.plan.md`)

- [x] Auto-focus dish search input when a recipe is selected (addItem + selectRecipe)
- [x] Replace X icons with trash-2; remove hover background; keep delete on left
- [x] Change .meta-column to width: fit-content
- [x] Glass style all dropdowns + add clickOutside to event-type and dish-search
- [x] Remove borders from all meta rows for consistent borderless look
- [x] Extend keyboard navigation for sections, dish rows, and dish field editing
- [x] Replace chevron toggle with info icon (collapsed) / chevron-up (expanded); add spacing
- [x] Center dish-data fields horizontally with justify-content: center

### Plan 049 — Menu Intelligence Layout and UX Fixes (`plans/049-menu-intelligence-layout-ux-fixes.plan.md`)

- [x] Meta-column to opposite side (margin-inline swap)
- [x] Remove focus border from all inputs/selects on page
- [x] Delete icons (section + dish) to opposite side
- [x] Verify info/chevron-up toggle (no code change)
- [x] Hide number input spinners on dish-field inputs
- [x] Food cost (food_cost_money) read-only: no edit mode, span only

### Plan 037 — Recipe Labels Refactor (`plans/037-recipe-labels-refactor.plan.md`)

- [x] Create LabelDefinition interface + labels_/autoLabels_ on Recipe model
- [x] Extend MetadataRegistryService: allLabels_ signal, registerLabel, deleteLabel, getLabelColor (KITCHEN_LABELS)
- [x] Create label-creation-modal component + service (name, key, color swatches, auto-trigger picker)
- [x] Extend metadata-manager: add 'label' type, labels card, delete guard, custom add via label modal
- [x] Recipe builder: labels FormControl, patchFormFromRecipe, buildRecipeFromForm, computeAutoLabels on save, liveAutoLabels_
- [x] Recipe header: custom searchable label dropdown, colored chips (manual removable, auto locked)
- [x] Recipe-book: replace main_category with labels column (colored chips), filter, sort
- [x] Add translation keys (labels, choose_label, create_new_label, no_label, label_name, label_color, auto_trigger_sources, save_label, add_new_label)
- [x] Register label-creation-modal in app root

### Plan 051 — Recipe builder UX fixes (`plans/051-recipe-builder-ux-fixes.plan.md`)

- [x] Remove border of unit select; same height for value containers; center header cells (except col-name)
- [x] Reduce logistics search width by 20%
- [x] Move "add new tool" to bottom of dropdown
- [x] Collapsible section cards: state, markup, styling (table-logic, workflow-logic, logistics-logic)

### Plan 012-2 — Kitchen demo data full values (`plans/012-2-kitchen-demo-data-full-values.plan.md`)

- [x] demo-suppliers.json: 10 suppliers (add 2)
- [x] demo-products.json: subset with purchase_options_ and variety
- [x] demo-recipes.json: optional ingredient note_ on some
- [x] demo-dishes.json: all 10 dishes have logistics_.baseline_, prep_items_ or mise_categories_
- [x] demo-equipment.json: verify categories and scaling mix
- [x] demo-venues.json: 10 venues (add 7)

---

## Ahead (Pending)

### Plan 070 — Recipe carousel header label sync (`plans/070-recipe-carousel-header-label-sync.plan.md`)

- [ ] CellCarouselComponent: add activeIndexChange output; emit new index in next() and prev()
- [ ] RecipeBookListComponent: add carouselHeaderIndex_ signal and getCarouselHeaderLabel_()
- [ ] Recipe-book-list HTML: dynamic header label; [activeIndex] and (activeIndexChange) on app-cell-carousel

### Plan 069 — Unused and redundant code cleanup (`plans/069-unused-redundant-code-cleanup.plan.md`)

- [ ] Remove `@components/*` from tsconfig.json
- [ ] Delete recipe.module.ts, system-health.ts, ingredient.service.ts
- [ ] Update core/breadcrumbs.md and core/services/breadcrumbs.md
- [ ] Remove commented block in metadata-manager.page.component.ts (lines ~219–263)
- [ ] Unit-creator spec: minimal placeholder or delete file
- [ ] Run build and tests to verify

### Plan 063 — Recipe book carousel media query, behavior, design (`plans/063-recipe-book-carousel-media-query-behavior-design.plan.md`)

- [x] Desktop: show 3 header columns, hide arrows, no sliding; mobile: carousel header with sliding strip and arrows
- [x] Remove (indexChange) binding from app-cell-carousel; keep [activeIndex]
- [x] Add small label above header carousel (getCarouselHeaderLabel_ or computed) for mobile
- [x] Mobile SCSS: style small label like cell; header arrows opacity 0, on hover opacity 1; match cell arrow size/position

### Plan 066 — Quick-add product modal (`plans/066-quick-add-product-modal.plan.md`)

- [ ] Create QuickAddProductModalService (signal-based, Promise<Product|null>)
- [ ] Create QuickAddProductModalComponent (compact + expandable, keyboard, OnPush, a11y)
- [ ] Style modal SCSS (engine classes + cssLayer)
- [ ] Update ingredient-search: dropdown condition, add-item row, keyboard fix, auto-select
- [ ] Register modal in app.component; add dictionary keys

### Plan 065 — Carousel title and inventory carousel (`plans/065-carousel-title-and-inventory-carousel.plan.md`)

- [ ] Recipe-book: remove small label; add one main title (getCarouselHeaderLabel_)
- [ ] Inventory: add carousel (TS: signals + methods; HTML: carousel header + app-cell-carousel in rows; SCSS: desktop 7-col, mobile 5-col + carousel styles)
- [ ] Build and verify

### Plan 064 — Inventory list grid layout refactor (`plans/064-inventory-list-grid-layout-refactor.plan.md`)

- [x] Refactor inventory HTML: replace table/thead/tbody with grid+divs (recipe-book pattern)
- [x] Refactor inventory SCSS: grid template, table-area, table-header, table-body, product-grid-row
- [x] Build and verify

### Plan 062 — Auth single source and sign-in/up (`plans/062-auth-single-source-sign-in-up.plan.md`)

- [x] Extend User model with imgUrl? field
- [x] Refactor UserService: StorageService as single source, unique-name rejection, persistent session via localStorage, auto-login on load
- [x] Remove dead code from UtilService (LoadFromStorage, saveToStorage, SIGNED_USERS, session methods)
- [x] Create authGuard (canActivate) and apply to all add/edit/builder/trash routes
- [x] Create AuthModalService (open/close/mode signals)
- [x] Create auth-modal component (sign-in / sign-up form with image upload, unique-name validation)
- [x] Add avatar section to header: guest state (icon + sign-in) vs signed-in state (image + name + log out)
- [x] Hide edit/delete/add buttons and FAB for guest users across all list components
- [x] Add auth-related keys to dictionary.json
- [x] Wire auth modal into app root, register Lucide icons, APP_INITIALIZER for auto-login, authGuard on routes
- [x] Fix auth build errors: add UserService.isLoggedIn, inline session storage (replace removed UtilService methods), wire HeaderComponent auth (isLoggedIn, user_, userInitial, openAuth, logout), User.imgUrl (`fix/auth-isloggedin-storage-header` merged to main)

### Plan 062-1 — Fix FAB and cook-view guest access (`plans/062-1-fix-fab-cookview-guest.plan.md`)

- [x] FAB always visible, gate only the recipe-builder action
- [x] Remove authGuard from cook/:id route
- [x] Gate edit actions inside cook-view for guests

### Plan 061 — Header carousel shift controls (`plans/061-header-carousel-shift-controls.plan.md`)

- [x] Add carouselHeaderIndex_ and carouselHeaderPrev/Next in recipe-book-list.component.ts
- [x] Add activeIndex input and indexChange output to CellCarouselComponent; sync and emit
- [x] Header: sliding strip structure and prev/next buttons in recipe-book-list HTML
- [x] Bind [activeIndex] and (indexChange) on each app-cell-carousel in template
- [x] SCSS: carousel header as one grid cell, overflow hidden, inner strip and transform

### Plan 060 — Data persistence and backup (`plans/060-data-persistence-and-backup.plan.md`)

- [x] StorageService: wrap `_save()` in try/catch; re-throw with clear message. Harden UtilService and TranslationService direct localStorage writes.
- [x] Demo loader: add confirmation step (modal or confirm) before `loadDemoData()` with copy that demo replaces recipes, dishes, products, suppliers, equipment, venues.
- [x] Backup mirror: define backup entity list; in StorageService after successful save, write to `backup_<entityType>` for listed types.
- [x] Export / Restore: implement `exportAllToFiles()` (download JSON per category) and “Restore from backup” / “Import from file(s)” with validation and reload.
- [ ] Optional: debounced auto-download per category for physical JSON on every change.

### Plan 059 — Unify design engine (`plans/059-unify-design-engine.plan.md`)

Execution plan: `plans/059-1-unify-design-engine-refactor.plan.md`

- [x] Phase 1: Add missing engine classes to styles.scss (.visually-hidden, .placeholder-dash, .c-table-wrap, .c-data-table, .c-sortable-header, .c-col-actions, .c-empty-state, .c-btn-ghost--sm, .c-chip variants, .c-grid-input/.c-grid-select)
- [x] Phase 2: Migrate .action-btn to .c-icon-btn in recipe-book-list, inventory-product-list, menu-library-list
- [x] Phase 3: Migrate .add-btn to .c-btn-primary in recipe-book-list, inventory-product-list, menu-library-list
- [x] Phase 4: Migrate .input-wrapper to .c-input-wrapper in 5 components
- [x] Phase 5: Remove local .visually-hidden and .placeholder-dash from component SCSS files
- [x] Phase 6: Migrate .table-wrap and th/td to .c-table-wrap/.c-data-table in equipment, venue, supplier
- [x] Phase 7: Migrate sortable-header, col-actions, clear-filters-btn to engine classes in recipe-book + inventory
- [x] Phase 8: Fixed .chipe typo, migrated ingredient chips to .c-chip--success
- [ ] Phase 9: Deferred — grid header/cell too coupled to display:contents layout
- [ ] Phase 10: Deferred — breakpoint/transition standardization for follow-up

### Plan 058 — Sidebar collapse and floating (`plans/058-sidebar-collapse-floating.plan.md`)

- [x] Inventory: full collapse to width 0 (SCSS + HTML toggle wrap)
- [x] Switch border-radius to right side in both SCSS files
- [x] Add floating overlay behavior at 768px breakpoint in both SCSS files
- [x] Change close icon to chevron-left in both HTML files

### Plan 057 — Plans folder full audit (`plans/057-plans-folder-full-audit.plan.md`)

- [x] Execute Plan 055 Group E (Five-Group rhythm: confirm-modal, translation-key-modal, restore-choice-modal, label-creation-modal, global-specific-modal, unit-creator, version-history-panel, custom-select, loader)
- [x] Execute Plan 047 S1: Unify ingredient row style with workflow
- [x] Execute Plan 047 S4: Workflow prep rows match ingredient rows
- [x] Execute Plan 047 L3: Responsive tablet/mobile for recipe builder

### Plan 056 — Table carousel columns (`plans/056-table-carousel-columns.plan.md`)

- [x] Create shared CellCarouselComponent and CellCarouselSlideDirective in src/app/shared/cell-carousel/
- [x] Wrap Type/Labels/Allergens columns in recipe-book-list with carousel; adjust header and grid template at 768px
- [x] Wrap Category/Allergens/Supplier columns in inventory-product-list with carousel; adjust header and grid template at 768px
- [x] Check lints on all modified files and fix any issues

### Plan 055 — SCSS cssLayer audit fix (`plans/055-scss-csslayer-audit-fix.plan.md`)

- [x] Group A: product-form, recipe-header, preparation-search, menu-intelligence, recipe-ingredients-table, ingredient-search (tokens, logical, rhythm)
- [x] Group B: cook-view (media query, !important, missing --cv-* tokens); other B files left for follow-up
- [x] Group C: equipment/venues border-block-end; menu-library --bg-warm → --bg-body
- [x] Group E: shared modals, unit-creator, version-history-panel, custom-select, loader (Five-Group rhythm, logical props)
- [x] Run ng build to verify

### Plan 054 — Unify modal styles (`plans/054-unify-modal-styles.plan.md`)

- [x] Expand engine classes in styles.scss: .c-modal-card modifiers (--md, --fluid), .c-modal-actions, .c-modal-body, .c-input-stack, .c-btn-primary--danger/--warning, modal responsive rules
- [x] Update add-item-modal and add-equipment-modal HTML/SCSS
- [x] Update confirm-modal, restore-choice-modal, global-specific-modal HTML/SCSS
- [x] Update translation-key-modal, label-creation-modal, unit-creator HTML/SCSS
- [x] Run ng build and verify all 8 modals render correctly

### Plan 052 — Plan 047 audit report (`plans/052-plan-047-audit-report.plan.md`)

- [x] Update Plan 047 todo items in todo.md per audit findings (split L4, mark items per report)
- [x] Optional: implement quick wins (L1 column reorder, S2 timer fixed width, L4 sort by relevance)
- [x] Clarify B3 (volume conversion fix) and B4 (header unit dropdown polish) with spec or acceptance criteria

### Plan 050 — Recipe list labels, panel, header, menu UX (`plans/050-recipe-list-labels-panel-header-menu-ux.plan.md`)

- [x] 1. Labels column: compact/expand like allergens; header toggle expand-all; clickOutside close
- [x] 2. Row height: col-labels/col-allergens grow to fit expanded content (recipe-book + inventory)
- [x] 3. Panel: chevron-right icon, remove border; sharper animation (both list components)
- [x] 4. Header layout: title right, search center, same design (recipe-book + inventory)
- [x] 5. Menu Intelligence date: clickable label, open picker + focus; keyboard DD/MM/YYYY
- [x] 6. Guest number: remove default spinner (SCSS)
- [x] 7. Guest number: +/- buttons, disable minus at 0

### Plan 047 — Recipe Builder Polish (`plans/047-recipe-builder-polish.plan.md`)

- [x] L4: Reduce logistics search width by 20% (done in Plan 051)
- [x] L4: Sort logistics dropdown by relevance (closest match first)
- [x] S1: Ingredient row style (border, arrows, delete, add-btn match workflow)
- [x] S2: Timer value fixed-width container
- [x] S3: Textarea align + auto-grow
- [x] S4: Workflow prep rows match ingredient rows
- [x] L1: Unit before amount in ingredient grid
- [x] L2: Smart shrinking grid + delete on hover
- [x] L3: Responsive tablet/mobile (768px unified breakpoint, workflow prep-flat-grid mobile pass)
- [x] B1: Labels add/remove (header + form + modal); demo labels + translations unclear
- [x] B2: Duplicate recipe/dish name validation
- [ ] B3: Volume conversion fix (unverifiable without spec; needs acceptance criteria)
- [x] B4: Unit selectors in recipe-header (overflow visible + z-index 100)

### Plan 040 — Menu Intelligence Layout and Design (`plans/040-menu-intelligence-layout-design.plan.md`)

- [x] d: Replace var(--bg-paper-light) with var(--bg-pure) in menu-intelligence.page.scss
- [x] a+b+c: Menu name as h1, meta right-aligned and denser, paper border-radius
- [x] f: Add persistent "Add category" in section dropdown via add-item-modal
- [x] g1: MenuTypeDefinition model + MenuItemSelection extend
- [x] g2: MetadataRegistryService MENU_TYPES storage
- [x] g3: Metadata manager "Menu Types" card with field checkboxes
- [x] g4–g6: Dynamic serving-type dropdown + dish-row field container in menu-intelligence

### Plan 041 — Menu Intelligence UX Fixes (`plans/041-menu-intelligence-ux-fixes.plan.md`)

- [x] a: Add dictionary entries for default section categories
- [x] b: Close category dropdown on click outside (ClickOutSideDirective)
- [x] c: Hide scrollbar in dropdown containers
- [x] d: Remove dish-qty (derived portions) from dish row
- [x] e: Section grid layout (30% data column, centered names, responsive + mobile)

### Plan 042 — Menu Intelligence Metadata Redesign (`plans/042-menu-intelligence-metadata-redesign.plan.md`)

- [x] 1. menu-intelligence.page.ts: expandedMetaKeys_, isDishMetaExpanded, toggleDishMeta; editingDishField_, startEditDishField, commitEditDishField, isEditingDishField, getInputWidth
- [x] 2. menu-intelligence.page.html: dish row block; name cell + toggle button; conditional .dish-data; click-to-edit fields (display/edit branches)
- [x] 3. menu-intelligence.page.scss: single-column list; .dish-row block; toggle + click-to-edit styles; carousel at narrow (cssLayer)

### Plan 043 — Reusable dropdown with scroll arrows (`plans/043-reusable-dropdown-scroll-arrows.plan.md`)

- [x] Add .c-dropdown engine in src/styles.scss (wrapper, list with hidden scrollbar, scroll-top/scroll-bottom arrows)
- [x] Create scrollIndicators directive (core/directives)
- [x] Create ScrollableDropdownComponent (shared/scrollable-dropdown)
- [x] Migrate preparation-search and ingredient-search (HTML, SCSS)
- [x] Migrate menu-intelligence (event-type, section-dropdown, dish-dropdown)
- [x] Migrate recipe-header (unit x2, label dropdown)
- [x] Migrate product-form (category, supplier, allergen dropdowns)
- [x] Migrate recipe-book-list (ingredient-dropdown)
- [x] Add agent guidance (HOW-WE-WORK and/or copilot-instructions)

### Plan 044 — Custom dropdown for all selects (`plans/044-custom-dropdown-for-all-selects.plan.md`)

- [x] Create CustomSelectComponent (CVA, scrollable dropdown, host focus forwarding)
- [x] Replace native selects app-wide: unit-creator, add-equipment-modal, equipment-form, equipment-list, recipe-workflow, recipe-ingredients-table, inventory-product-list, cook-view, menu-library-list, venue-form, recipe-builder
- [x] Save plan 044 to plans/

### Plan 045 — Logistics tools and menu type edit (`plans/045-logistics-tools-and-menu-type-edit.plan.md`)

- [x] Show logistics section for both recipe and dish (recipe-builder.page.html)
- [x] Tool search + "Add new tool" opening add-equipment modal in recipe builder
- [x] Logistics grid: search + quantity one side, dense chip grid other side; distinct styling from ingredients
- [x] Metadata manager: menu type row grid 1fr auto 30px 30px; inline name edit; removable field chips; confirm on rename
- [x] MetadataRegistryService.renameMenuType; MenuEventDataService.updateServingTypeForAll; confirm modal + translation key

### Plan 046 — Cook-view scale by ingredient (`plans/046-cook-view-scale-by-ingredient.plan.md`)

- [x] cook-view.page.ts: Add scale-by state signals and methods (startSetByIngredient, applyScaleByIngredient, resetToFullRecipe); hide main quantity in special view
- [x] cook-view.page.html: Per-row hover/tap highlight, "Set recipe by this item", inline amount + Convert; special scaled view banner + "Back to full recipe"
- [x] cook-view.page.scss: Row highlight, set-by row controls, special scaled view styles (cssLayer)
- [x] dictionary.json: set_recipe_by_this_item, convert, scale_recipe_confirm, scaled_to, back_to_full_recipe
- [x] Reuse ConfirmModalService for scale confirmation

### Plan 046-1 — Cook-view scale-by UX fixes (`plans/046-1-cook-view-scale-by-ux-fixes.plan.md`)

- [x] HTML: Move "Set recipe by this item" into col-name (left of name); empty col-scale-action for normal rows
- [x] SCSS: Button visible only on row hover; full-row border/box-shadow on hover; yellow box-shadow for setting state; scaled-view shell + banner (edit-mode-like, different colors); spacing between containers

### Plan 034 — Recipe Builder UI Fixes (`plans/034-recipe-builder-ui-fixes.plan.md`)

- [x] a. Type toggle: pass recipeType from parent, add input in header, use in template
- [x] b. Header unit dropdowns: overflow visible + z-index for primary/secondary
- [x] c. Add row button: justify-content center in recipe-builder.page.scss
- [x] d. Ingredient search dropdown: z-index 100, ensure no overflow clip
- [x] e. Ingredients table: container-aware grid + small-screen stacked cards
- [x] f. Workflow section: space-evenly + define prep-flat-grid styles
- [x] g. Add step button: width 100%, align with grid in recipe-workflow

### Phase 1 — Stabilize & Complete (`plans/010-product-roadmap.plan.md`)

- [x] Add `recipe-book-list.spec.ts` and run tests (Plan 008 closure).
- [x] Set up Playwright E2E tests: config + 3 critical flow tests (product CRUD, recipe creation with cost, recipe edit persistence).
- [x] Optionally expand minimal specs (e.g. recipe-builder page and subcomponents) with behavior tests when touching those areas.
- [x] Sync documentation: update `project-plan.md` checkboxes, update breadcrumbs.
- [ ] When adding new features: add/update `.spec.ts` and mark related sub-tasks here; run tests before considering the task done.

### Plan 011 — Dashboard & Command Center Unification (done)

- [x] Dashboard default route, Overview + Core settings tabs; `/command-center` → `/dashboard?tab=metadata`; single Dashboard nav link; unit tests + recipe-builder spec fix (queryParams).

### Phase 2 — Product Enhancement

- [ ] **Plan 011 (KPI expansion, optional)**: Further dashboard enhancements per roadmap if desired.
- [x] **Plan 012 — Supplier Management Page**: Dedicated CRUD page at `/suppliers` with list, edit, delete, linked products view.
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
| 012 | Kitchen Demo Data (original) | Done |
| 012-1 | Kitchen Demo Data and Recipes | Done |
| 012-2 | Kitchen Demo Data Full Values | Done |
| 012b | Supplier Management Page | Done |
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
| 034 | Recipe Builder UI Fixes | Done |
| 035 | Header and Navigation Refactor | Done |
| 036 | Dashboard Control Panel Fixed Tabs | Done |
| 037 | Recipe Labels Refactor | Done |
| 038 | Inverted-L List Layout | Done |
| 039 | List UX Panel and Scroll | Done |
| 040 | Menu Intelligence Layout and Design | Done |
| 041 | Menu Intelligence UX Fixes | Done |
| 042 | Menu Intelligence Metadata Redesign | Active |
| 043 | Reusable dropdown with scroll arrows | Done |
| 044 | Custom dropdown for all selects | Done |
| 045 | Logistics tools and menu type edit | Done |
| 046 | Cook-view scale by ingredient | Done |
| 046-1 | Cook-view scale-by UX fixes | Done |
| 047 | Recipe Builder Polish | Done (B3 deferred until spec) |
| 048 | Menu Intelligence UX Polish | Done |
| 049 | Menu Intelligence Layout and UX Fixes | Done |
| 050 | Recipe list labels, panel, header, menu UX | Active |
| 051 | Recipe builder UX fixes | Done |
| 052 | Plan 047 audit report | Planned |
| 053 | Todo audit and fixes | Active |
| 054 | Unify modal styles | Done |
| 055 | SCSS cssLayer audit fix | Done |
| 056 | Table carousel columns | Active |
| 057 | Plans folder full audit | Done |
| 058 | Sidebar collapse and floating | Active |
| 059 | Unify design engine | Active |
| 059-1 | Unify design engine refactor (execution) | Active |
| 060 | Data persistence and backup | Done |
| 061 | Header carousel shift controls | Active |
| 062 | Auth single source and sign-in/up | Done |
| 062-1 | Fix FAB and cook-view guest access | Done |
| 063 | Recipe book carousel media query, behavior, design | Active |
| 064 | Inventory list grid layout refactor | Active |
| 065 | Carousel title and inventory carousel | Active |
| 066 | Quick-add product modal | Active |
| 069 | Unused and redundant code cleanup | Planned |
| 070 | Recipe carousel header label sync | Active |

*Excluded from audit: `plans/recipe-builder-page.md` (recipe book plan).*
