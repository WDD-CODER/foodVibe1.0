# Active Tasks

Update status after each sub-task. Link plan files here when applicable.

---


## Done

Completed entries are in [todo-archive.md](todo-archive.md).

---

## Ahead (Pending)

### Plan 190 — Labels UI glass theme (`plans/190-labels-ui-glass-theme.plan.md`)
- [x] custom-multi-select: trigger glass (border, backdrop-filter, box-shadow); chip variant hover
- [x] custom-multi-select: colored chips glass alignment (light border, optional shadow); keep label colors
- [x] styles.scss: .c-dropdown use --shadow-glass

### Plan 189 — Custom multi-select component (`plans/189-custom-multi-select-component.plan.md`)
- [x] Create CustomMultiSelectComponent (TS, HTML, SCSS, spec) with ControlValueAccessor for string[], keyboard/click-outside/ARIA
- [x] Refactor recipe-header labels to use app-custom-multi-select; labelMultiSelectOptions_, readonlyChips, addNewChosen
- [x] Recipe-header SCSS: remove or reduce labels-specific styles; run tests

### Plan 188 — Units metadata and system defaults (`plans/188-units-metadata-system-defaults.plan.md`)
- [x] Unit registry: SYSTEM_UNITS (kg, liter, gram, ml, unit, dish); initUnits merge; deleteUnit block system; registerUnit no overwrite
- [x] Metadata manager: remove unit rate input and updateUnitRate; add isSystemUnit; hide delete for system units
- [x] Metadata manager SCSS: align units card layout with category (two-column list-item)
- [x] unit-registry.service.spec.ts and metadata-manager.page.component.spec.ts: update for system units and removed rate UI

### Plan 187 — Unit creator i18n and focus (`plans/187-unit-creator-i18n-and-focus.plan.md`)
- [x] Unit-creator template: TranslatePipe for all strings; id on name/amount; keydown.enter/tab on name; error | translatePipe
- [x] Unit-creator component: TranslatePipe, TranslationService, KeyResolutionService; effect focus name; onNameLeave, focusAmountInput; error keys
- [x] Dictionary: add unit_creator_title, unit_name, unit_name_placeholder, basis_unit_label, net_cost_calculated, approve_and_save_unit, unit_already_on_product, unit_save_error, cancelled_by_user, unit_name_empty
- [x] Unit-registry: return error keys in registerUnit result

### Plan 186 — Select-on-focus display click (`plans/186-select-on-focus-display-click.plan.md`)
- [x] Recipe ingredients table: whole-div click + keyboard, clear button stopPropagation
- [x] Ingredient search: SelectOnFocus on input; focus when initialQuery set
- [x] Recipe workflow: editingPreparationNameAtRow_ signal + show search in edit mode with initialQuery; div click + clear stopPropagation
- [x] Preparation search: initialQuery input, effect to set query + focus, SelectOnFocus on input

### Plan 185 — Hebrew-key rule for key-based fields (`plans/185-hebrew-key-rule-key-based-fields.plan.md`)
- [x] Add ensureKeyForContext helper (resolve → if Hebrew and no key, translation modal → return key)
- [x] Use helper in metadata-registry (registerCategory, registerAllergen) and unit-registry (registerUnit)
- [x] Use helper in preparation-registry and menu-section-categories
- [x] Ensure all key-based add-new callers set returned key in UI (quick-add already does)
- [ ] Do not apply rule to display-only fields (recipe name, venue name; ID-based) — document only

### Plan 184 — Recipe header SCSS dedupe (`plans/184-recipe-header-scss-dedupe.plan.md`)
- [x] Remove duplicate `.metrics-notice-heading` and `.metrics-notice-item` blocks from recipe-header.component.scss
- [x] Update comment for metrics-notice-floating content (optional)
- [ ] Verify metrics notice popover styling unchanged

### Plan 183 — Agent Intelligence Map and Optimization (`plans/183-agent-intelligence-map-optimization.plan.md`)
- [x] R1: Slim `.cursor/commands/` files to one-liner pointers (remove restated Phase 0 / Step 3 details)
- [x] R2: Remove Phase 0 restatements from `copilot-instructions.md` Section 0, `agent.md` step 7, and `.mdc` rules — keep only "read the SKILL"
- [x] R3: Extract tab-order sections from `commit-to-github/SKILL.md` to standalone reference file `.assistant/references/tab-orders.md`
- [x] R4: Slim agent files — replace repeated standards with cross-references to copilot-instructions.md sections
- [x] R5: Add CI flow disambiguation note (commit-to-github vs test-pr-review-merge) to `agent.md`
- [x] R6: Archive or verify staleness of `docs/tech-debt-2025-03-05.md`
- [ ] R7: Consider extracting add-recipe schema reference and action keyword table to data files (deferred)
- [x] N1: Create session-handoff skill (`.assistant/skills/session-handoff/SKILL.md`)
- [x] N2: Add "Recovery" sections to commit-to-github and add-recipe skills
- [x] N3: Add skill priority hierarchy to `copilot-instructions.md`
- [x] N4: Create cross-reference validation command (`.assistant/commands/validate-agent-refs.md`)
- [x] N5: Add preflight checklist to `agent.md`
- [x] N6: Add context-budget awareness note to `copilot-instructions.md`

### Plan 182 — toFix.md verification (undone) (`plans/182-tofix-verification-undone.plan.md`)
- [ ] Recipe builder: remove chevron up/down arrows in section titles
- [ ] Recipe builder: expandable containers — allow collapse by clicking anywhere on card
- [ ] Logistics: chips grid — chip width fit content so full label visible
- [ ] Activity: change-tag — show clear "what changed" (values, from → to)
- [ ] Add new category modal: two-case focus flow (Hebrew then English, or prefill Hebrew + focus English)
- [ ] Verify/clarify: recipe view alignment; Maison Plus; labels; menu builder keyboard; Plan 147; dashboard; activity scroll; lists sidebar; unit-creator focus; metrics-square gram→volume

### Plan 181 — Remove native select app-wide (`plans/181-remove-native-select-app-wide.plan.md`)
- [x] Replace auth-modal native `<select>` with app-custom-select
- [x] Remove `.c-grid-select` from styles.scss; remove `.auth-dev-select` from auth-modal SCSS
- [x] Add lint:no-native-select script and npm script for prevention

### Plan 181 — Scaling-chip placeholder and dedupe options (`plans/181-scaling-chip-placeholder-and-dedupe-options.plan.md`)
- [x] Scaling-chip placeholder "choose"; add "choose" to dictionary; custom-select dedupe by translated label

### Plan 180 — Secondary chips and grid layout (`plans/180-secondary-chips-and-grid-layout.plan.md`)
- [x] Recipe-header HTML: secondary chips as app-scaling-chip
- [x] Recipe-header TS: getSecondaryUnitOptions, onSecondaryScalingChipAmountChange; remove activeSecondaryEdit_ etc.
- [x] Recipe-header SCSS: two-part grid + secondary flex-wrap; remove obsolete styles
- [x] Recipe-header spec: update tests for secondary chips

### Plan 179 — Unified scaling chip component (`plans/179-unified-scaling-chip-component.plan.md`)
- [x] Custom-select: chip variant width max-content
- [x] Custom-select chip: width to placeholder and grow with text (fit-content + size attr) — feat/chip-select-content-width
- [x] Create shared scaling-chip component (TS, HTML, SCSS)
- [x] Recipe-header: use app-scaling-chip for primary chip
- [x] Recipe-header SCSS: trim primary chip styles
- [x] Recipe-header spec: primary chip still updates form

### Plan 178 — App-wide custom-select behavior (`plans/178-app-wide-custom-select-behavior.plan.md`)
- [x] Recipe workflow: typeToFilter + addNewValue (category __add_new__, unit __add_unit__)
- [x] Recipe ingredients table: variant=chip, typeToFilter, addNewValue __add_unit__
- [x] Product form: typeToFilter on base_unit_, unit_symbol_, uom; addNewValue NEW_UNIT on first two
- [x] Cook-view: typeToFilter on yield + 2 unit selects
- [x] Menu intelligence + menu library list: typeToFilter on all filter selects
- [x] Equipment list/form/add-equipment modal: typeToFilter; addNewValue __add_new__ where options have it
- [x] Venue form, unit creator, quick-add modal: typeToFilter; addNewValue on quick-add base unit + category

### Plan 177 — Workflow select behavior (`plans/177-workflow-select-behavior.plan.md`)
- [x] Merged into Plan 178
- [x] Enable type-to-filter and add-new on workflow category select (typeToFilter, addNewValue __add_new__)
- [x] Enable type-to-filter and add-new on workflow unit select (typeToFilter, addNewValue __add_unit__)

### Plan 176 — Hold-based tiered step logic (`plans/176-hold-based-tiered-step-logic.plan.md`)
- [x] quantity-step.util: add continuousPress to options; single-click step 1, hold = tiered increment/decrement
- [x] counter: restore hold-to-repeat; pass continuousPress true from repeat, false/omit from click
- [x] quantity-step.util.spec: tests for single-click (step 1) and hold (tiered)

### Plan 175 — Tiered quantity step behavior (`plans/175-tiered-quantity-step-behavior.plan.md`)
- [x] quantity-step.util: add getQuantityStepIncrement / getQuantityStepDecrement and wire into quantityIncrement / quantityDecrement for whole numbers
- [x] quantity-step.util.spec: update/add tests for tiered increment and decrement; keep integerOnly, decimal, explicitStep tests

### Plan 174 — Custom select chip and standalone state (`plans/174-custom-select-chip-and-standalone-state.plan.md`)
- [x] Save plan to plans/174; document current custom-select state (chip, standaloneValue, recipe header + ingredients table)
- [ ] Cook-view ingredients index: add variant="chip" and typeToFilter to unit selects for consistency with recipe builder
- [ ] Verify in app: recipe builder and cook-view ingredients index unit dropdowns

### Plan 173 — Selected-item-display whole clickable (`plans/173-selected-item-display-whole-clickable.plan.md`)
- [ ] recipe-ingredients-table: move click/keyboard from span to .selected-item-display div; stopPropagation on clear button
- [ ] recipe-ingredients-table.component.scss: add cursor: pointer to .selected-item-display (Effects group)
- [ ] Verify whole chip clickable, clear button does not open search

### Plan 171 — Custom select chip pilot (`plans/171-custom-select-chip-pilot.plan.md`)
- [x] CustomSelect: add variant and addNewValue inputs; template chip/add-new classes and chevron size 10 when chip
- [x] custom-select.component.scss: chip trigger, chip option, chip add-new (menu-item-create) styles per cssLayer
- [x] recipe-ingredients-table: variant="chip" on unit app-custom-select; remove ::ng-deep .col-unit .custom-select-trigger
- [x] Verify build and unit column behavior

### Plan 170 — Add-new option and styling (`plans/170-add-new-option-and-styling.plan.md`)
- [x] CustomSelect: isAddNewOption() + .custom-select-option--add-new class
- [x] custom-select.component.scss: style .custom-select-option--add-new with primary color
- [x] Equipment-list: add "add new category" (sentinel, customCategories_, handler, inline edit)

### Plan 169 — List quick-edit UX overlay (`plans/169-list-quick-edit-ux-overlay.plan.md`)
- [x] CustomSelect: add openOnShow input; effect to open dropdown when shown
- [x] CustomSelect: CDK Overlay for dropdown (attach to body, position from trigger)
- [x] Equipment list: [openOnShow]="true" on quick-edit CustomSelects
- [ ] Verify first-click open, carousel dropdown visible, row-blur confirm only

### Plan 168 — Menu-library full keyboard access (`plans/168-menu-library-full-keyboard-access.plan.md`)
- [x] custom-select: Arrow Down/Up open dropdown when closed (button trigger)
- [x] menu-library-list: Date-from wrap tabindex="0" + keydown.enter/space
- [x] menu-library-list: Event cards keydown.enter/space to open

### Plan 167 — Category/unit add-new audit (`plans/167-category-unit-add-new-audit.plan.md`)
- [x] Fix product-form base-unit "add new" flow (unitAdded$ patch base_unit_ when isBaseUnitMode_)
- [x] Add "add new category" to equipment-form (sentinel, handler, custom categories, set new value in dropdown)
- [x] Verify add-equipment sets new value in category dropdown
- [ ] Optional: Cook-view "add new unit" so user can add from there

### Plan 165 — Maison Plus row style (`plans/165-maison-plus-row-style.plan.md`)
- [x] Add --space-sm to src/styles.scss :root (optional; or use component token)
- [x] Update recipe-workflow .prep-grid-row: border var(--border-row), padding var(--space-sm), hover var(--bg-glass-hover)
- [x] Update mobile override: padding var(--space-sm); ensure border/hover (inherit or explicit)
- [x] Verify ng build and manual check desktop/mobile

### Plan 165 — Global-specific modal behavior and size (`plans/165-global-specific-modal-behavior-and-size.plan.md`)
- [x] Propagate category change to all dishes that reference the preparation with the old category; wire into recipe-workflow when user chooses "change globally"
- [x] Add optional main_category_name to FlatPrepItem; persist and restore in recipe-builder and cook-view so "only for this recipe" survives reload
- [x] Size global-specific modal to content (remove --fluid)

### Plan 166 — Preparation category chip translation (`plans/166-preparation-category-chip-translation.plan.md`)
- [x] preparation-search: add translatePipe to category header and category pill
- [x] export.service: inject TranslationService; heCategory(); use for all prep/checklist category columns
- [x] dictionary.json: add missing preparation_categories (e.g. knife_work)

### Plan 164 — Custom select preserve text on focus (`plans/164-custom-select-preserve-text-on-focus.plan.md`)
- [x] openDropdown(): set searchQuery_ to current selection label (translated if needed) instead of clearing; set highlightedIndex from current value in filtered list

### Plan 163-1 — Cook-view ingredient alignment (`plans/163-1-cook-view-ingredient-alignment.plan.md`)
- [x] Verify alignment in cook-view (view + edit mode); apply min-width to col-amount/col-unit if needed
- [x] Mark Plan 163 item 2.1 done

### Plan 163-2 — Unit-creator keyboard flow (`plans/163-2-unit-creator-keyboard-flow.plan.md`)
- [x] unit-creator: focus name on open (effect + setTimeout); id on name/quantity inputs
- [x] unit-creator: Enter on name → focus quantity; focusQuantityInput()
- [x] custom-select: open on trigger focus when not from mouse (mousedown flag + onTriggerFocus)

### Plan 163 — toFix audit PRD (`plans/163-tofix-audit-prd.plan.md`)
- [x] Recipe header: labels dropdown keyboard nav (focus to dropdown, Arrow Up/Down, Enter, Escape)
- [x] 2.1 Recipe view: verify align values in ingredient list (cook-view SCSS/html)
- [ ] 2.2 Recipe builder: verify remove up/down arrows in category title (recipe-workflow)
- [ ] 2.3 App-wide: audit category/unit dropdowns for "add new" where applicable
- [ ] 2.4 Labels: selectability in delete-label + recipe builder manual selector
- [ ] 2.5 Menu-library: keyboard (Arrow Up/Down, Enter) on custom-select options
- [ ] 2.6 unit-creator-modal: full keyboard flow (focus name → quantity → unit; prevent scroll) — Plan 163-2
- [ ] 2.7 Lists: sidebar aligned to list container at 768px (list-shell)

### Plan 162 — No-auto-test agent rule (`plans/162-no-auto-test-agent-rule.plan.md`)
- [x] AGENTS.md: Replace Step 5 Audit with build-only, no full test suite unless commit or user asks
- [x] copilot-instructions.md: Append no-auto-run sentence to Section 3 Services bullet
- [x] .assistant/todo.md: Update pending spec item to clarify full suite only at commit or on request

### Plan 161 — Copilot Q&A format refactor (`plans/161-copilot-qa-format-refactor.plan.md`)
- [x] Replace Section 1.1 with single tight "Q&A format" rule (chat, plans, recommendations)
- [x] Add minimal Bad vs Good example; require at least one question for new features
- [x] Align Section 1 Decision Logic to reference Q&A format only

### Plan 160 — Global user message queue (`plans/160-global-user-message-queue.plan.md`)
- [ ] Refactor UserMsgService to use explicit state (current message, timer, pending queue) instead of concatMap pipeline
- [ ] Success/warning: when current is success/warning, replace text and reset timer; do not enqueue
- [ ] Error: interrupt success/warning; when current is error, enqueue so each error shown in order
- [ ] Add user-msg.service.spec.ts with coalesce and error-priority tests

### Plan 159 — Type-to-filter all dropdowns (`plans/159-type-to-filter-all-dropdowns.plan.md`)
- [ ] Phase 1: Enhance CustomSelectComponent with typeToFilter (input trigger, filter by "starts with" + script)
- [ ] Phase 2: Replace native selects in quick-add-product-modal with app-custom-select
- [ ] Phase 3: Align recipe-builder logistics, ingredient-search, preparation-search, recipe-book-list, menu-intelligence to "starts with" + script

### Plan 158 — List shell multi-select (`plans/158-list-shell-multi-select.plan.md`)
- [x] Add ListSelectionState with selectAll, allSelected, toggleSelectAll
- [x] Add ListRowCheckboxComponent (shared)
- [x] Wire inventory-product-list, venue-list, equipment-list, supplier-list, recipe-book-list: checkbox column, header select-all, row click, bulk actions
- [x] Add translations clear_selection, remove_selected, select_all

### Plan 157 — Fix sidebar alignment and close on breakpoint (`plans/157-fix-sidebar-alignment-close-breakpoint.plan.md`)
- [ ] List-shell: remove margin-block and max-height from .filter-panel in 768px block
- [ ] Inventory list: add afterNextRender + matchMedia to close panel when viewport <= 768px

### Plan 156 — Category single-input type-in (`plans/156-category-single-input-type-in.plan.md`)
- [x] product-form: restructure category block to chips + single input; remove Filter block from dropdown
- [x] product-form: focus single input on open/after select; ArrowDown-from-input to list; use categoryInputRef
- [x] product-form SCSS: remove in-dropdown search styles; style single input in category box

### Plan 155 — List shell and cell expand (`plans/155-list-shell-and-cell-expand.plan.md`)
- [x] List-shell: add border-radius transition on .table-area to match panel (0.3s var(--ease-spring))
- [x] List-shell: align small-screen (768px) overlay panel to list container
- [x] Recipe-book-list: replace single-ID signals with Set-based allergen/labels expanded IDs
- [x] Recipe-book-list: cell click toggles one row; header click toggles all; outside click closes all
- [x] Recipe-book-list: reset expanded state when landing on recipe-book (Router.events NavigationEnd)

### Plan 154 — Floating container and change-popover refactor (`plans/154-floating-container-change-popover.plan.md`)
- [x] Create FloatingInfoContainer component (shared) with vertical scroll + arrows
- [x] Create ChangePopover component using FloatingInfoContainer
- [x] Integrate ChangePopover in dashboard-overview; remove inline popover
- [x] Refactor recipe-header metrics-notice to use FloatingInfoContainer
- [x] Remove old popover/metrics styles; verify and clean up

### Plan 153 — Recipe approve stamp button (`plans/153-recipe-approve-stamp-button.plan.md`)
- [x] Recipe builder: add isApproved_ signal, set from loaded recipe and in resetToNewForm_; use in buildRecipeFromForm(); add saveRecipe(options?) and onApproveStamp()
- [x] Recipe builder template: add ApproveStamp component when !historyViewMode_()
- [x] Cook view: add onApproveStamp() that saves with is_approved_: true and updates recipe_()
- [x] Cook view template: add ApproveStamp component when recipe_() is set
- [x] Create ApproveStampComponent (shared): wax-seal style, theme colors, fixed bottom-right, inputs approved/disabled, output approve
- [x] Add approve_recipe translation key; use for stamp aria-label

### Plan 152 — Recipe book date filter sidebar (`plans/152-recipe-book-date-filter-sidebar.plan.md`)
- [x] Add dateFrom_/dateTo_/dateField_ signals and useListState descriptors
- [x] Date-range filter in filteredRecipes_ + clear/hasActiveFilters
- [x] Add dateUpdated to SortField and compareRecipes; sidebar sort buttons
- [x] Date collapsible section in sidebar (From/To inputs, checkbox, sort)
- [x] Expand Date section when date range active; translations and SCSS

### Plan 151 — Recipe secondary unit conversion (`plans/151-recipe-secondary-unit-conversion.plan.md`)

- [x] Add amountInRecipeYieldUnit in RecipeCostService; use in getRowWeightContributionG and computeIngredientCost
- [x] Use recipe-scoped conversion in ingredients table updateLineCalculations
- [x] Add recipe-cost tests for yield_conversions_

### Plan 150 — Secondary units in ingredient dropdown (`plans/150-secondary-units-in-ingredient-dropdown.plan.md`)

- [x] Extend getAvailableUnits metadata type with yield_conversions_
- [x] Add recipe yield_conversions_ units to dropdown in recipe-ingredients-table

### Plan 149 — Recipe-builder and metrics notice fixes (`plans/149-recipe-builder-metrics-notice-fixes.plan.md`)

- [x] Preserve quantity when changing ingredient by name
- [x] Fix metrics-notice-floating position in recipe-header
- [x] Clarify category search (label/styling) in product-form

### Plan 148 — Dashboard toFix items (`plans/148-dashboard-tofix-items.plan.md`)

- [x] Align Add Product button (remove primary)
- [x] Unify dashboard section headers
- [x] Unapproved KPI link to recipe-book with filter
- [x] Low stock KPI link + inventory lowStock=1 URL
- [x] Update toFix.md (dashboard items unmarked)

### Plan 147 — Recipe-builder edit toFix items (`plans/147-recipe-builder-edit-tofix-items.plan.md`)

- [x] Ingredient index: click item name to change item (state + template + ingredient-search initialQuery)
- [x] Ingredient index: align values under titles (SCSS justify-content center)
- [x] metrics-square: fix grams-to-volume in recipe-cost.service
- [x] category-input-box: add search to product-form category multi-select
- [x] Update toFix.md (items remain unmarked)

### Plan 145 — Secondary unit dropdown fix (`plans/145-secondary-unit-dropdown-fix.plan.md`)

- [x] Wrap unit-switcher + dropdown in `.unit-switcher-cell` in recipe-header (secondary chip)
- [x] SCSS: `.unit-switcher-cell` + dropdown host position so dropdown does not take grid cell
- [x] Add "Create new unit" menu item to secondary unit dropdown

### Plan 144 — Precision-based counter step (`plans/144-precision-based-counter-step.plan.md`)

- [x] quantity-step.util: magnitude for integers (1–9→1, 10–99→10, 100→100), precision for decimals; keep integerOnly/explicitStep
- [x] quantity-step.util.spec: tests for magnitude and precision step + increment/decrement
- [x] Cook-view: keydown on main quantity and ingredient amount inputs; call increment/decrement
- [x] Recipe-ingredients-table: onQuantityKeydown ArrowUp/ArrowDown with util + stepOpts
- [x] Recipe-builder: logistics qty input keydown (integerOnly min 1) + step="1"
- [x] Recipe-header: updatePrimaryAmount/updateSecondaryAmount use util; keydown on primary/secondary inputs
- [x] Recipe-header.spec: update expectations for precision/magnitude (e.g. 1.2→1.3, 10→20)

### Plan 143 — Cook-view recipe yield units (`plans/143-cook-view-recipe-yield-units.plan.md`)

- [x] Recipe model: add optional yield_conversions_
- [x] Recipe-builder: persist full yield_conversions on save; load yield_conversions_ into form when editing
- [x] Cook-view: yieldUnitOptions_ from recipe; convertedYieldAmount_ from recipe when present
- [x] Cook-view: onYieldUnitChange — update quantity to equivalent in new unit

### Plan 142 — FAB Add-new for list pages (`plans/142-fab-add-new-list-pages.plan.md`)

- [x] Inventory list: FAB action Add product → /inventory/add
- [x] Equipment list: FAB action Add equipment (use equipmentBasePath)
- [x] Venue list: FAB action Add venue when not embeddedInDashboard
- [x] Supplier list: FAB action Add supplier (modal) when not embeddedInDashboard

### Plan 141 — Hero FAB refactor and page-specific actions (`plans/141-hero-fab-refactor-and-page-actions.plan.md`)

- [x] Hero FAB: effectiveActions_ empty when no state; template cleanup
- [x] Recipe-builder: setPageActions replace, add Cook-view when edit
- [x] Menu-intelligence: setPageActions replace
- [x] Cook-view: FAB action Edit recipe when /cook/:id
- [x] Menu-library: FAB action New menu
- [x] Recipe-book list: replace edit button with cook button in row
- [x] Add cook_view translation key

### Plan 140 — Recipe builder real-changes confirmation (`plans/140-recipe-builder-real-changes-confirmation.plan.md`)

- [x] Add initialRecipeSnapshot_ + getRecipeSnapshotForComparison() + hasRealChanges() in recipe-builder.page.ts
- [x] Set initialRecipeSnapshot_ in ngOnInit when editable; remove hasUnsavedEdits()
- [x] Remove markAsDirty in recipe-builder.page.ts
- [x] Remove markAsDirty in recipe-header, recipe-workflow, recipe-ingredients-table

### Plan 139 — Menu intelligence keyboard focus (`plans/139-menu-intelligence-keyboard-focus.plan.md`)

- [x] HTML: guest count tabindex="-1"; section title Space + id; sell price/add-dish/dish name ids
- [x] TS: event type Space to open and Space to select
- [x] TS: section search Tab/Shift+Tab
- [x] TS: dish search Tab/Shift+Tab
- [x] TS: sell price Tab/Shift+Tab
- [x] Optional: commit-to-github skill "Menu intelligence tab order" subsection

### Plan 137 — Techdebt and spec coverage agent adherence (`plans/137-techdebt-spec-coverage-agent-adherence.plan.md`)

- [x] commit-to-github SKILL.md: add Phase 0 mandate and checklist
- [x] .cursor/commands/commit-github.md: add explicit Phase 0 step
- [x] .assistant/copilot-instructions.md: tie commit trigger to Phase 0
- [x] AGENTS.md: step 7 Phase 0 mandatory; step 5.5 cross-ref
- [x] .cursor/rules/git-commit-must-use-skill.mdc: require Phase 0 before Phase 1

### Plan 138 — Product form header redesign (`plans/138-product-form-header-redesign.plan.md`)

- [x] Move header into form; remove edit-mode subtitle (product-form.component.html)
- [x] Move .form-header under .form-container; compact header; optional card border (product-form.component.scss)
- [x] Update spec if tests reference removed text/DOM (product-form.component.spec.ts)

### Plan 136 — Product form keyboard focus (`plans/136-product-form-keyboard-focus.plan.md`)

- [x] Product form: initial focus to name input (ViewChild + ngAfterViewInit); template ref on name input
- [x] Category: Space to select in onCategoryDropdownKeydown
- [x] Custom-select: Space to select when open
- [x] Supplier: tabindex="0", keyboard open/navigate/select/close (HTML + TS)
- [x] Allergen: highlight index + keydown Arrow/Enter/Space/Escape (HTML + TS)
- [x] Collapsible headers: (keydown.space) with preventDefault
- [x] Equipment form: initial focus to name input (ViewChild + template ref + ngAfterViewInit)

### Plan 135 — Translation modal cancel guard title fix (`plans/135-translation-modal-cancel-guard-title-fix.plan.md`)

- [x] Guard: `else { break }` → `else { return false }` (cancel = stay on page)
- [x] Guard: add `.toLowerCase()` to `getPending` filter
- [x] dictionary.json: add `translation_modal_title` key
- [x] translation-key-modal.component.ts: use `translation_modal_title` for generic
- [x] translation-key-modal.service.ts: remove `throw` in `save()`

### Plan 134 — Translation and confirmation modals unified (`plans/134-translation-confirmation-modals-unified.plan.md`)

- [x] Translation modal: Hebrew always editable (both add-time and generic); focus English key on open; template ref + ViewChild
- [x] Product form allergen: resolveAllergen first; open modal only when null; then "already on product" check
- [ ] Other entry points: align with resolve first → modal if needed → already in parameter (metadata-manager, preparation-*, menu-section-categories, add-equipment-modal, recipe-workflow, add-supplier-flow)
- [x] Agent guides: Section 7.2 + Section 0 trigger 7.1+7.2 in copilot-instructions; one-line pointer in AGENTS.md (one source of truth; no Cursor rule)
- [x] Guard/dictionary: confirm getValuesNeedingTranslation and guard unchanged

### Plan 133 — List quick-edit inline (`plans/unused-133-list-quick-edit-inline.plan.md`)

- [x] Row-blur detection and batch "Save these changes?" confirm; pending-edits store per row (equipment pilot)
- [ ] Inventory product list: editable cells (supplier, category, unit); value click → inline dropdown; row click → edit page
- [ ] Supplier list: keep panel on row click; add quick-edit for chosen cells (e.g. contact, delivery, min order)
- [x] Equipment list: keep panel on row click; add quick-edit for category, owned qty, is_consumable (pilot done)
- [x] Carousel: only cell value clickable for quick-edit (equipment); arrows unchanged
- [x] Validation: empty required field → error message + red border + aria-invalid (equipment pilot)
- [ ] Keyboard and a11y: focus model, focus trap in inline control, Esc/Enter, return focus, screen reader labels (partial: aria-label on buttons)
- [ ] Venue list / Recipe-book list: optional quick-edit columns as needed
- [x] i18n: save_these_changes, this_item_cannot_be_saved_like_this

### Plan 132 — Translation and add-value flow (`plans/132-translation-add-value-flow.plan.md`)

- [x] Step 0: Guard — save-confirmation last; product form hasRealChanges() + initial snapshot
- [x] Step 1: Translation modal — Hebrew editable for add flows (unit/category/allergen/supplier)
- [x] Step 2: Product form — "already on this product" message for category/allergen
- [x] Step 3: Translation modal — three outcomes + "Continue without saving" button for generic
- [x] Step 4: Guard + product form — removeValuesNeedingTranslation() and notification

### Plan 131 — Spec coverage in techdebt and commit (`plans/131-spec-coverage-techdebt-commit.plan.md`)

- [x] Techdebt: add Phase 7 (Spec coverage) and update report format
- [x] Commit-to-github: Phase 0 handle spec-coverage items from report
- [x] Copilot-instructions: Phase 5 remove spec ask; add Section 5.1; Section 3 qualifier
- [x] AGENTS.md: Audit step — no spec updates here, ref to Section 5.1

### Plan 130 — Numeric precision audit (`plans/130-numeric-precision-audit.plan.md`)

- [x] Add `step="0.001"` to recipe-ingredients `amount_net` input
- [x] Add `step="0.01"` to product-form `price_override_` input
- [x] Change `yield_factor_` to `step="0.001"` in product-form and quick-add-product-modal
- [x] Add `step="0.001"` to recipe-header primary and secondary amount inputs

### Plan 129 — Post-execute verification bullets (`plans/129-post-execute-verification-bullets.plan.md`)

- [x] Add Phase 5 "How to verify" requirement to Gatekeeper Protocol in copilot-instructions.md

### Plan 128 — Hebrew canonical value resolution (`plans/128-hebrew-canonical-value-resolution.plan.md`)

- [x] TranslationService: reverse maps (Hebrew→key) + resolveUnit/Category/Allergen/SectionCategory; add key+Hebrew when user supplies English key
- [x] UnitRegistryService: resolve unit name before register; no match → get English key and update dictionary; product-level check when adding purchase option
- [x] MetadataRegistryService: resolve in registerCategory and registerAllergen; no match → prompt for English key and update dictionary
- [x] MenuSectionCategoriesService, add-equipment-modal, preparation-registry: resolve from Hebrew; no match → modal for English key then register + dictionary
- [x] copilot-instructions: add Section 7.1 (Hebrew canonical values) and Section 0 trigger bullet

### Plan 127 — Recipe builder cost display fix (`plans/127-recipe-builder-cost-display-fix.plan.md`)

- [x] Show "ממתין" only when total_cost is null/undefined; show ₪0.00 or amount for any number
- [x] Enable total_cost control in recipe-form.service (was disabled)
- [x] Call cdr.markForCheck() at end of updateLineCalculations

### Plan 126 — Purchase unit recipe builder fix (`plans/126-purchase-unit-recipe-builder-fix.plan.md`)

- [x] Recipe cost service: getRowWeightContributionG use net * conversion_rate_; computeIngredientCost multiply and price_override_ per 1 unit
- [x] Recipe ingredients table: updateLineCalculations same conversion/price fix; onItemSelected default unit/amount for purchase unit; increment/decrement step 1 for purchase units
- [x] recipe-cost.service.spec.ts: add/update tests for purchase_options_ and price_override_

### Plan 125 — Restore collapse row equipment & suppliers (`plans/125-restore-collapse-row-equipment-suppliers.plan.md`)

- [x] Equipment list: row click toggles inline edit panel; add toggleRowEdit; remove navigateToEquipmentEdit
- [x] Supplier list: row click toggles inline edit panel; add toggleRowEdit; remove navigateToSupplierEdit

### Plan 086 â€” AI Tooling Optimization (`plans/086-ai-tooling-optimization.plan.md`)

- [x] F1: Merge entry points (delete HOW-WE-WORK, reduce AGENTS.md, slim AGENTS.md)
- [x] F3: Refactor copilot-instructions (portable triggers, dedup, fix Section 0)
- [x] F2: Trim .cursor/rules/*.mdc to 3-line pointers
- [x] F5: Inline util-standards + serviceLayer; delete skill files
- [x] F4: Remove Angular restatements from agent personas
- [x] F6+F7: Trim elegant-fix, github-sync, techdebt skills
- [x] F10: Archive old todo entries to todo-archive.md
- [x] F11: Deduplicate commit-to-github safety reminders
- [x] F8: Trim add-recipe schema reference

### Plan 087 — Timestamp All Added Items (`plans/087-timestamp-all-added-items.plan.md`)

- [x] Update /add-recipe SKILL.md: mandate addedAt_ and updatedAt_ on recipe/dish, addedAt_ on products/prep/labels; equipment real ISO timestamps; Schema Reference
- [x] Add addedAt_ to Product model; ProductDataService: normalizeProduct, stamp on add, preserve on update; set updatedAt on add and update
- [x] Add updatedAt_ to Recipe model; recipe-data and dish-data: set on add and update
- [x] Recipe-book-list: add formatUpdatedAt and "Updated at" column (date only); add date_updated to dictionary

### Plan 088 — Metadata Manager Expansion (`plans/088-metadata-manager-expansion.plan.md`)

- [x] Add deletePreparation, deleteCategory, renamePreparation, renameCategory to PreparationRegistryService
- [x] Add removeCategory, renameCategory to MenuSectionCategoriesService
- [x] Create PreparationManagerComponent (TS + HTML + SCSS) with full CRUD, confirmations, in-use notifications, usage checks
- [x] Create SectionCategoryManagerComponent (TS + HTML + SCSS) with add/delete/rename, confirmations, in-use notifications
- [x] Create LogisticsBaselineManagerComponent (TS + HTML + SCSS) with CRUD, equipment name resolution, confirmations, usage checks
- [x] Import and add all 3 components to metadata-manager template; register any new Lucide icons
- [x] Add all new translation keys to dictionary.json


### Plan 104 — Sell price on dish change (`plans/104-sell-price-on-dish-change.plan.md`)

- [x] Extend editingDishAt_ with previousSellPrice; store it in startEditDishName
- [x] In selectRecipe when replacing: set sell_price to 0 (different recipe) or previousSellPrice (same recipe)

### Plan 103 — Click dish name, food cost per portion, dividers (`plans/103-click-dish-name-food-cost-dividers.plan.md`)

- [x] Make dish name clickable (button calling startEditDishName); add .dish-name-btn styles
- [x] Add getFoodCostPerPortion + read-only field in dish-data
- [x] Divider: info-menu boundary uses section-ornament style; between sections use section-divider (distinct style)
- [x] Add i18n keys change_dish, dish_food_cost_per_portion

### Plan 102 — Unified export refactor (`plans/102-unified-export-refactor.plan.md`)

- [x] Unified export header: floating control + hidden bar on cook-view, recipe-builder; menu-intelligence toolbar with View+Export
- [x] Two icons per export type (View + Export); export-preview component (paper-style popup, click-outside close)
- [x] ExportService: view-model API (getRecipeInfoPreviewPayload, getShoppingListPreviewPayload, getMenuInfoPreviewPayload, getMenuShoppingListPreviewPayload); 2 decimals; file naming (recipe-info_, shopping-list_, check-list_, menu-info_)
- [x] Recipe → cooking steps export; dish → checklist export (by item type in recipe/dish context)
- [x] Menu checklist: by_station mode; two sheets (Accumulated + By dish) when not by_dish
- [x] Unit prices only in shopping list exports; formulas for reactivity in menu shopping list
- [x] Export all together: menu (sheet1 menu + sheets per type); recipe/dish (sheet1 info+ingredients+workflow, sheet2 shopping list)
- [x] Cook-view: replace inline export buttons with floating bar; pass current quantity/scaling
- [x] Recipe-builder: add floating export bar; form snapshot for export; cooking steps vs checklist by type
- [x] Menu-intelligence: add by_station to checklist dropdown; Export all together button; View+Export for menu info and menu shopping list

### Plan 105 — Persist sidebar state (`plans/105-persist-sidebar-state.plan.md`)

- [x] Add panel-preference.util.ts (getPanelOpen, setPanelOpen)
- [x] Wire inventory-product-list, supplier-list, recipe-book-list, equipment-list, venue-list to panel preference

### Plan 106 — Hero FAB export and page actions (`plans/106-hero-fab-export-page-actions.plan.md`)

- [x] Create HeroFabService (setPageActions, clearPageActions, pageActions signal)
- [x] Hero FAB: main button click → recipe-builder; inject service; show replace/append actions
- [x] Menu-intelligence: register Toolbar + Go back in hero FAB; remove menu FAB block and SCSS
- [x] Recipe-builder: register Export, Cook (contextual), Recipe creation; openExportFromHeroFab, goToCookFromHeroFab

### Plan 107 — Export localization and design (`plans/107-export-localization-design.plan.md`)

- [x] Add export_headers to dictionary.json; create heHeader()/heUnit() in export.util.ts
- [x] Update all get*PreviewPayload methods to use Hebrew headers and translated units
- [x] Update all export* methods to use Hebrew headers and translated units
- [x] Add Excel styling helpers and apply to checklist by_dish and all sheets
- [x] Refactor export-preview HTML to table; update SCSS for alignment and RTL

### Plan 108 — Recipe export and view spreadsheet layout (`plans/108-recipe-export-view-spreadsheet.plan.md`)

- [x] Payload and translations: extend export.util with recipe-sheet structure; add recipe_name, preparation_instructions, preparation_time to EXPORT_HEADER_HE and dictionary
- [x] Excel: single-sheet recipe layout in exportRecipeInfo (header, yield, ingredients, instructions, prep time); sheet 1 of exportAllTogetherRecipe same layout
- [x] Preview: getRecipeInfoPreviewPayload returns recipe-sheet shape; export-preview template and SCSS for recipe-sheet layout (header block, yield, table, instructions block, prep time)
- [x] Tests: update export.service.spec.ts for new recipe-info single-sheet structure

### Plan 109 — Translate section categories (`plans/109-translate-section-categories.plan.md`)

- [x] Add section_categories to dictionary.json (8 keys, Hebrew or same-as-key)
- [x] Merge section_categories in TranslationService loadGlobalDictionary
- [x] Menu Intelligence: translate section title with placeholder fallback
- [x] Section category manager: display list label with translatePipe

### Plan 111 — Unify metadata manager containers (`plans/111-unify-metadata-manager-containers.plan.md`)

- [x] HTML: demo + backup use card-desc, card-actions; remove demo-section/backup-section
- [x] SCSS: add .manager-card .card-desc and .card-actions; remove .menu-types-card .card-desc; replace .demo-section and .backup-section with .manager-card-scoped rules

### Plan 112 — Dish dropdown width and keyboard (`plans/112-dish-dropdown-width-keyboard.plan.md`)

- [x] Fix keyboard: wire (ngModelChange) to onDishSearchQueryChange so activeDishSearch_ is set when typing
- [x] Narrow dish-search dropdown to 80% width (and center) in menu-intelligence SCSS
- [x] Add [class.highlighted] and index to recipe @for; add .dropdown-item.highlighted style

### Plan 113 — Use only prep_categories; discard mise_categories (`plans/113-use-only-prep-categories-discard-mise.plan.md`)

- [x] Model: remove MiseCategory and mise_categories_ from Recipe
- [x] Read paths: getPrepRowsFromRecipe, getScaledPrepItems, isDish — use prep_categories_ only
- [x] Write paths: stop setting mise_categories_ in recipe-builder and cook-view
- [x] Demo data: rename mise_categories_ to prep_categories_ in demo-dishes.json
- [x] Tests: scaling.service.spec use prep_categories_; optional: dish-data normalizer for backward compat

### Plan 114 — Remove logistics templates library (`plans/114-remove-logistics-templates-library.plan.md`)

- [x] Recipe Builder: equipment-only logistics dropdown; remove library state/methods
- [x] Metadata Manager: remove LogisticsBaselineManagerComponent and template usage
- [x] Demo loader: remove logistics baseline fetch and reload
- [x] Async storage: remove LOGISTICS_BASELINE_ITEMS from BACKUP_ENTITY_TYPES
- [x] Delete logistics-baseline-manager component and logistics-baseline-data.service
- [x] logistics.model.ts: remove LogisticsBaselineItem; dictionary: remove metadata_logistics_* keys
- [x] Delete demo-logistics-baseline.json; remove dead .logistics-library-* SCSS

### Plan 115 — Dropdown scroll arrows fix (`plans/115-dropdown-scroll-arrows-fix.plan.md`)

- [x] Pin up arrow inside container: add top: 0; bottom: auto for .c-dropdown__scroll-top in src/styles.scss
- [x] Add zone divs in scrollable-dropdown.component.html (scroll-zone--top, scroll-zone--bottom)
- [x] Add zone styles and :has() hover visibility rules in src/styles.scss; remove global dropdown hover rules

### Plan 116 — Center main loader in viewport (`plans/116-center-main-loader-viewport.plan.md`)

- [x] In loader.component.scss: set overlay to position: fixed, z-index: 150, border-radius: 0
- [x] Verify route-loading and metadata-manager overlay loaders are centered in viewport

### Plan 117 — Dish row absolute actions (`plans/117-dish-row-absolute-actions.plan.md`)

- [x] .dish-name-cell: drop grid, add padding-inline-end for button reserve
- [x] .dish-name-meta: content center (remove 100vw trick, text-align center)
- [x] .dish-sell-price and .dish-remove: absolute positioning, vertically centered, inset-inline-end

### Plan 118 — Sidebar close on breakpoint (`plans/118-sidebar-close-on-breakpoint.plan.md`)

- [x] Add matchMedia('(max-width: 768px)').addEventListener('change', ...) in recipe-book-list, supplier-list, equipment-list
- [x] In list-shell.component.scss @media (max-width: 768px): add transition: none for .filter-panel and .panel-content

### Plan 119 — Content-driven list row heights (`plans/119-content-driven-list-row-heights.plan.md`)

- [x] list-shell: set grid-template-rows: none and grid-auto-rows: auto for content-sized rows
- [x] list-shell: .table-body .col-name — display: block, overflow-wrap: break-word, text-align: start (keep overflow: hidden)

### Plan 120 — Export "All" view option + cost fix (`plans/120-recipe-builder-all-view-option.plan.md`)

- [x] Part C: Fix getFoodCostPerPortion to divide by derived portions (menu-intelligence.page.ts)
- [x] Part A: Recipe-builder — wrap "All" in view-export-wrap; add view-export-modal (View/Export); onViewAll, exportPreviewType_ 'recipe-all', onExportFromPreview for 'recipe-all'
- [x] Part B: ExportService — add getMenuAllViewPreviewPayload(menu, recipes)
- [x] Part B: Menu-intelligence — replace "All" button with view-export-wrap + view-export-modal; onViewAll, exportPreviewType_ 'menu-all', onExportFromPreview for 'menu-all'

### Plan 121 — Product units display fix (`plans/121-product-units-display-fix.plan.md`)

- [x] Harden hydrateForm: default missing `uom` from `base_unit_` so legacy purchase-option rows are valid and visible
- [x] Merge global registry units into getAvailableUnits for products so custom units show in ingredient unit select

### Plan 123 — Recipe builder product-only units + persist (`plans/123-recipe-builder-product-only-units-persist.plan.md`)

- [x] Part A: Remove merge of allUnitKeys_() in getAvailableUnits so only product/recipe units shown
- [x] Part B: On "+ יחידה חדשה" for product row, add new unit as purchase option and saveProduct

### Plan 124 — Unified styling audit and theme (`plans/124-unified-styling-audit-theme.plan.md`)

- [x] Phase 1: Add --border-row, --shadow-nav to styles.scss; replace raw rgba in .c-list-body-cell, .c-grid-cell; add Liquid Glass comment block
- [x] Phase 2: Menu-intelligence, trash, dashboard — replace raw hex/rgba with tokens
- [x] Phase 3: export-preview, list-shell, recipe-book-list, header, footer, user-msg, recipe-header, unit-creator — use tokens
- [ ] Phase 4: menu-library-list — use c-input-wrapper and c-btn-primary in HTML; recipe-builder main submit use c-btn-primary
- [ ] Phase 5: Spot-check representative pages; search and replace remaining raw colors in src/**/*.scss

### Plan 122 — AI Chatbot Gemini scope (`plans/122-ai-chatbot-gemini-scope.plan.md`)

- [ ] Decide chat placement (sidebar / floating button / dedicated Assistant page)
- [ ] Decide first use case (dictation → recipe and/or create menu for N people)
- [ ] Decide backend approach for Gemini API key (proxy / serverless / existing API)
- [ ] Decide language (Hebrew / English / both) for prompts and bot replies
- [ ] Decide confirmation pattern (open edit screen with draft vs inline draft in chat vs both)
- [ ] Write designated implementation plan once clarifications are set

### Plan 089 — Menu Intelligence Upgrade (`plans/089-menu-intelligence-upgrade.plan.md`)

- [ ] A: Auto-name menu with formatted date when name is empty on save, with duplicate handling (1), (2)
- [ ] Timestamps: Add updated_at_ to MenuEvent model; set created_at_ on create and updated_at_ on every save
- [ ] B: Set event_date_ default to today's date for new menus
- [ ] C: Redesign guest counter as unified pill-shaped container with paper-blend styling
- [ ] D1: Tie food cost calculation to serving_portions * guest_count, update service and component
- [ ] D2: Show sell_price inline next to dish name for all menu types
- [x] D3: Enhance footer with 4 metrics: total cost, food cost %, total revenue, cost per guest (`fix/menu-intelligence-footer-totals` merged to main)
- [x] E1a: Toolbar close on click outside, remove close button (`feat/menu-toolbar-click-outside` merged to main)
- [ ] E1: Make toolbar collapsible with fixed overlay when opened
- [ ] E2: Create floating FAB on right side with pop-up buttons for toolbar and back navigation
- [ ] Dictionary: Add new Hebrew dictionary keys for new labels

### Plan 090 — Whole-project logging audit (`plans/090-whole-project-logging-audit.plan.md`)

- [x] Core services: metadata-registry (rename + allergen save/delete), preparation-registry (load), demo-loader, backup
- [x] Page/container: metadata-manager (delete + sync catches), trash
- [x] List components: equipment-list, supplier-list, venue-list
- [x] Form components: supplier-form, product-form, equipment-form, recipe-builder (catch blocks only)

### Plan 091 — Menu Intelligence Inputs and Layout (`plans/091-menu-intelligence-inputs-layout.plan.md`)

- [ ] Add SelectOnFocus to sell_price and dish-field inputs; import directive in component
- [ ] Add onSellPriceKeydown and onDishFieldKeydown with 0.25 step for portion fields
- [ ] Wrap dish name + meta toggle in .dish-name-meta; dish-name-cell as grid; .dish-remove out of absolute

### Plan 092 — Demo Data Trim (`plans/092-demo-data-trim.plan.md`)

- [x] Collect dependency IDs from 15 dishes + 3 preps (products, equipment, suppliers, prep categories)
- [x] Trim demo-dishes.json to 15 dishes; set dish_023 name_hebrew to "פונדו"
- [x] Trim demo-recipes.json to 3 preps + transitive
- [x] Trim demo-products, demo-equipment, demo-suppliers, demo-venues, demo-labels
- [x] Trim demo-kitchen-preparations.json to used categories and preparations only

### Plan 096 — Supplier Modal Styling Upgrade (`plans/096-supplier-modal-styling-upgrade.plan.md`)

- [x] Align supplier form with shared modal pattern when embedded (h3, c-modal-body, c-input-stack, c-modal-actions)
- [x] Delivery days via c-filter-options--inline + c-filter-option
- [x] Supplier form SCSS: rely on engines, minimal overrides only
- [x] Add reference comment to supplier-modal for reuse pattern

### Plan 095 — Menu Intelligence Gap Report (`plans/095-menu-intelligence-gap-report.plan.md`)

- [ ] Add `{ capture: true }` to @HostListener in menu-intelligence.page.ts
- [ ] Wire dish search ngModelChange to onDishSearchQueryChange; add [class.highlighted] and let ri to dish dropdown in HTML
- [ ] Replace dish name span with button + startEditDishName in menu-intelligence.page.html
- [ ] Add .dropdown-item.highlighted and .dish-name-clickable in menu-intelligence.page.scss
- [ ] Optional: section search ngModelChange to onSectionSearchQueryChange if NG5002 appears

### Plan 094 — Inline Edit & Supplier Modal (`plans/094-inline-edit-supplier-modal.plan.md`)

- [x] Add editingId_, editForm_, dirty guard and inline save/cancel to equipment-list.component.ts
- [x] Add @if inline-edit-panel block in equipment-list.component.html
- [x] Add .inline-edit-panel styles to equipment-list.component.scss (cssLayer)
- [x] Create supplier-modal.service.ts
- [x] Create supplier-modal component (ts + html + scss)
- [x] Add supplierToEdit input and effect to supplier-form.component.ts
- [x] Swap onAdd/onEdit in supplier-list to use SupplierModalService
- [x] Add app-supplier-modal to app.component.html
- [x] Add/verify unsaved_changes_confirm in dictionary

### Plan 098 — Remove Supplier Modal Edit Redundancy (`plans/098-remove-supplier-modal-edit-redundancy.plan.md`)

- [x] Simplify supplier-modal.service.ts (remove edit API and state)
- [x] Update supplier-modal.component.html to bind supplierToEdit to null

### Plan 099 — Calculation and Shopping List Testing (`plans/099-calculation-shopping-list-testing.plan.md`)

- [x] Add quantity-step.util.spec.ts (getQuantityStep, quantityIncrement, quantityDecrement)
- [x] Add scaling.service.spec.ts (getScaleFactor, getScaledIngredients, getScaledPrepItems)
- [x] Add menu-intelligence.service.spec.ts (derivePortions, hydrateDerivedPortions, computeEventIngredientCost, computeFoodCostPct)
- [x] Add recipe-cost.service.spec.ts (computeRecipeCost, getCostForIngredient, getRecipeCostPerUnit, weight/volume)
- [x] Add export.service.spec.ts (exportShoppingList, exportMenuShoppingList)

### Plan 097 — Portions Per Guest Formula Fix (`plans/097-portions-per-guest-formula-fix.plan.md`)

- [x] In derivePortions: plated_course and buffet_family use guest_count × serving_portions (no take rate, no rounding)
- [x] Keep cocktail_passed as round(guest_count × pieces_per_person × take_rate)
- [x] Verify 2 guests × 1 portion → 2 total; fractional 0.25/0.5 work

### Plan 093 — Shopping List Calculation Fix (`plans/093-shopping-list-calculation-fix.plan.md`)

- [x] Update `derivePortions` in menu-intelligence.service.ts to accept and apply `servingPortions` parameter
- [x] Update `hydrateDerivedPortions` to pass `item.serving_portions_` through to `derivePortions`
- [x] Fix `getAutoFoodCost` in menu-intelligence.page.ts to use derived portions instead of `servingPortions * guestCount`
- [x] Fix `getDerivedPortions` to pass actual `piecesPerPerson` and `servingPortions` instead of hardcoded 0
- [x] Verify per-item cost, event total, and shopping list produce consistent results

### Plan 081 â€” toFix Detailed Plans (`plans/081-tofix-detailed-plans.plan.md`)

- [ ] Section 1 â€” Sign-in / Sign-up: auto-focus, dev user dropdown, Enter-to-submit, field-level errors
- [ ] Section 2 â€” Quick-add default base unit: set signal to 'gram'
- [ ] Section 3 â€” Recipe view: number formatting pipe, unit-before-scale, ingredient alignment
- [ ] Section 4 â€” Recipe builder: persist container state, remove arrows, custom qty buttons, clickable headers, CDK drag-drop
- [ ] Section 5 â€” Maison Plus (dish prep list): row style, qty buttons, category-first add flow, auto-focus
- [ ] Section 6 â€” App-wide category/unit dropdowns: add 'add new' sentinel option to every dropdown
- [ ] Section 7 â€” Logistics: chip fit-content width, keyboard navigation with highlighted index
- [ ] Section 8 â€” Add-equipment modal: single-step category creation quick-save flow
- [ ] Section 9 â€” Labels: selectable existing labels in delete UI and recipe builder

### Plan 080 â€” Entity storage audit designated (`plans/080-entity-storage-audit-designated.plan.md`)

- [x] Add MENU_SECTION_CATEGORIES storage; load/save in menu-intelligence; add to BACKUP_ENTITY_TYPES
- [x] Add activity log key to BACKUP_ENTITY_TYPES; use constant in ActivityLogService

### Plan 079 â€” Unify logistics search, remove From library (`plans/079-unify-logistics-search-remove-from-library.plan.md`)

- [x] Remove "From library" button and library-only dropdown (recipe-builder.page.html)
- [x] Use all equipment (not only tools) for search; single dropdown with library + equipment matches (recipe-builder.page.ts)
- [x] Single select handler: library option â†’ add baseline entry; equipment option â†’ add baseline row (recipe-builder.page.ts)
- [x] Keep "Save as template" on chips and "Add new tool" in dropdown

### Plan 078 â€” Logistics designated storage (`plans/078-logistics-designated-storage.plan.md`)

- [x] Add `LogisticsBaselineItem` type and storage wiring (logistics.model.ts, async-storage.service.ts)
- [x] Create LogisticsBaselineDataService (query, getById, add, update, remove, allItems_ signal)
- [x] Recipe builder: inject service; "Add from library" (dropdown + copy into form); "Save as template" per baseline row
- [x] Add translation keys (from_library, save_as_template) and verify build

### Plan 077 â€” Excel export feature (`plans/077-excel-export-feature.plan.md`)

- [x] Install xlsx (SheetJS CE) via npm
- [x] Create ExportService with all four export methods
- [x] Add onExportInfo and onExportShoppingList to cook-view.page.ts
- [x] Add Export Info and Shopping List buttons to cook-view.page.html
- [x] Style export buttons (reuse .edit-btn / .toolbar-btn)
- [x] Add onExportMenuInfo and onExportMenuShoppingList to menu-intelligence.page.ts
- [x] Add two export buttons to menu-intelligence.page.html toolbar
- [x] Add translation keys for all four export actions

### Plan 076 â€” Unified add-recipe skill and create-if-missing (`plans/076-unified-add-recipe-skill-create-if-missing.plan.md`)

- [x] Unify image + text triggers and add "Text input" section in SKILL.md
- [x] Add gap-filling (ask for missing info) and single workflow in SKILL.md
- [x] Add "Create-if-missing before writing" (products, then equipment) in SKILL.md
- [x] Update SCHEMA.md with equipment schema and product-creation rules
- [x] Update HOW-WE-WORK.md "Add recipe from image" to image or text + create-if-missing
- [x] Add-recipe workflow: rename skill to add-recipe, add command + rule; full Step 5 (visual structure, summary, tables, confirm/deny); no write without confirmation; duplicate-name check; recipe-builder cost on load; dish_012 units fix, dish_013, equipment â€” `feat/add-recipe-workflow` merged to main
- [x] Add-recipe full data persistence: demo-kitchen-preparations.json, DemoLoaderService + PreparationRegistryService.reloadFromStorage, SKILL.md Steps 2/5b/6/8 and SCHEMA.md for preparations â€” `feat/add-recipe-full-data-persistence` merged to main
- [x] Add-recipe Step 5 visual tree format (SKILL.md) + dish_017 ××•× ×™×’×™×¨×™ ×ž×•×’×© ×¢× ×§×™×ž×¦×™ ×•×¡×•×™×” (demo data, eq_045â€“050, demo_188, pickling/patisserie) â€” `feat/add-recipe-onigiri-and-visual` merged to main

### Plan 074 â€” Tech debt remediation (`plans/074-tech-debt-remediation.plan.md`)

- [x] Migrate @Input/@Output to signals in recipe-ingredients-table and recipe-workflow
- [x] Migrate @Input/@Output to signals in supplier-form and venue-form
- [x] Migrate @Input/@Output to signals in cell-carousel and click-out-side
- [x] Fix 'any' types in conversion.service and ingredient-search
- [x] Extract RecipeFormService from recipe-builder.page.ts
- [ ] Refactor menu-intelligence.page.scss into partials (deferred)
- [x] Extract hardcoded Hebrew strings to dictionary (ingredient-search)

### Plan 073 â€” Log file in project (`plans/073-log-file-in-project.plan.md`)

- [x] Add Node log server script (scripts/log-server.js): POST /log, append to logs/app.log, CORS, GET /health
- [x] Add logServerUrl to environment.ts (dev) and environment.prod.ts (empty); extend LoggingService to POST when set
- [x] Add logs/ to .gitignore
- [x] Add "Development logging" to docs and npm run log-server script

### Plan 072 â€” Robust login, app-wide logging, security (`plans/072-robust-login-app-logging-security.plan.md`)

- [ ] Create `.assistant/skills/auth-and-logging/SKILL.md`; update HOW-WE-WORK.md and copilot-instructions.md
- [ ] Implement LoggingService; replace ad-hoc console.log in user.service and translation.service
- [ ] Wire logging: auth (login/logout/signup/guard/401), HTTP interceptor, global ErrorHandler, critical CRUD in data services
- [ ] Auth hardening: password in UI, credentials types, local hash-only storage, auth abstraction, guard/modal wiring
- [ ] Backend-ready: environment files, API contract, HTTP provider, interceptor, token lifecycle
- [ ] Add "Security & go-live" checklist to docs (HTTPS, headers, rate limiting, no secrets in repo, error exposure)

### Plan 071 â€” Unified list design system (`plans/071-unified-list-design-system.plan.md`) â€” merged to main (feat/unified-list-design-system)

- [x] Create `app-list-shell` shared component (TS, HTML, SCSS) with content projection slots and panel behavior
- [x] Create `app-carousel-header` shared component for unified carousel column header navigation
- [x] Migrate recipe-book-list to use list-shell + carousel-header (first/template migration)
- [x] Migrate equipment-list to use list-shell + carousel-header
- [x] Migrate supplier-list to use list-shell + carousel-header
- [x] Migrate inventory-product-list: convert table to grid, remove inline editing, add carousel, use list-shell
- [x] Migrate venue-list: convert table to grid, add carousel for Environment + Infrastructure, use list-shell

### Plan 070 â€” Recipe carousel header label sync (`plans/070-recipe-carousel-header-label-sync.plan.md`)

- [x] CellCarouselComponent: add activeIndexChange output; emit new index in next() and prev()
- [x] RecipeBookListComponent: add carouselHeaderIndex_ signal and getCarouselHeaderLabel_()
- [x] Recipe-book-list HTML: dynamic header label; header arrows for whole column, cell-only arrows; matching bg

### Plan 069 â€” Unused and redundant code cleanup (`plans/069-unused-redundant-code-cleanup.plan.md`)

- [ ] Remove `@components/*` from tsconfig.json
- [ ] Delete recipe.module.ts, system-health.ts, ingredient.service.ts
- [ ] Update core/breadcrumbs.md and core/services/breadcrumbs.md
- [ ] Remove commented block in metadata-manager.page.component.ts (lines ~219â€“263)
- [ ] Unit-creator spec: minimal placeholder or delete file
- [ ] Run build and tests to verify

### Plan 063 â€” Recipe book carousel media query, behavior, design (`plans/063-recipe-book-carousel-media-query-behavior-design.plan.md`)

- [x] Desktop: show 3 header columns, hide arrows, no sliding; mobile: carousel header with sliding strip and arrows
- [x] Remove (indexChange) binding from app-cell-carousel; keep [activeIndex]
- [x] Add small label above header carousel (getCarouselHeaderLabel_ or computed) for mobile
- [x] Mobile SCSS: style small label like cell; header arrows opacity 0, on hover opacity 1; match cell arrow size/position

### Plan 066 â€” Quick-add product modal (`plans/066-quick-add-product-modal.plan.md`)

- [ ] Create QuickAddProductModalService (signal-based, Promise<Product|null>)
- [ ] Create QuickAddProductModalComponent (compact + expandable, keyboard, OnPush, a11y)
- [ ] Style modal SCSS (engine classes + cssLayer)
- [ ] Update ingredient-search: dropdown condition, add-item row, keyboard fix, auto-select
- [ ] Register modal in app.component; add dictionary keys

### Plan 065 â€” Carousel title and inventory carousel (`plans/065-carousel-title-and-inventory-carousel.plan.md`)

- [ ] Recipe-book: remove small label; add one main title (getCarouselHeaderLabel_)
- [ ] Inventory: add carousel (TS: signals + methods; HTML: carousel header + app-cell-carousel in rows; SCSS: desktop 7-col, mobile 5-col + carousel styles)
- [ ] Build and verify

### Plan 064 â€” Inventory list grid layout refactor (`plans/064-inventory-list-grid-layout-refactor.plan.md`)

- [x] Refactor inventory HTML: replace table/thead/tbody with grid+divs (recipe-book pattern)
- [x] Refactor inventory SCSS: grid template, table-area, table-header, table-body, product-grid-row
- [x] Build and verify

### Plan 062 â€” Auth single source and sign-in/up (`plans/062-auth-single-source-sign-in-up.plan.md`)

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

### Plan 062-1 â€” Fix FAB and cook-view guest access (`plans/062-1-fix-fab-cookview-guest.plan.md`)

- [x] FAB always visible, gate only the recipe-builder action
- [x] Remove authGuard from cook/:id route
- [x] Gate edit actions inside cook-view for guests
- [x] Show add/edit buttons disabled with tooltip when not signed in (feat/suppliers-nav-and-auth-buttons merged to main)

### Plan 061 â€” Header carousel shift controls (`plans/061-header-carousel-shift-controls.plan.md`)

- [x] Add carouselHeaderIndex_ and carouselHeaderPrev/Next in recipe-book-list.component.ts
- [x] Add activeIndex input and indexChange output to CellCarouselComponent; sync and emit
- [x] Header: sliding strip structure and prev/next buttons in recipe-book-list HTML
- [x] Bind [activeIndex] and (indexChange) on each app-cell-carousel in template
- [x] SCSS: carousel header as one grid cell, overflow hidden, inner strip and transform

### Plan 060 â€” Data persistence and backup (`plans/060-data-persistence-and-backup.plan.md`)

- [x] StorageService: wrap `_save()` in try/catch; re-throw with clear message. Harden UtilService and TranslationService direct localStorage writes.
- [x] Demo loader: add confirmation step (modal or confirm) before `loadDemoData()` with copy that demo replaces recipes, dishes, products, suppliers, equipment, venues.
- [x] Backup mirror: define backup entity list; in StorageService after successful save, write to `backup_<entityType>` for listed types.
- [x] Export / Restore: implement `exportAllToFiles()` (download JSON per category) and â€œRestore from backupâ€ / â€œImport from file(s)â€ with validation and reload.
- [ ] Optional: debounced auto-download per category for physical JSON on every change.

### Plan 059 â€” Unify design engine (`plans/059-unify-design-engine.plan.md`)

Execution plan: `plans/059-1-unify-design-engine-refactor.plan.md`

- [x] Phase 1: Add missing engine classes to styles.scss (.visually-hidden, .placeholder-dash, .c-table-wrap, .c-data-table, .c-sortable-header, .c-col-actions, .c-empty-state, .c-btn-ghost--sm, .c-chip variants, .c-grid-input/.c-grid-select)
- [x] Phase 2: Migrate .action-btn to .c-icon-btn in recipe-book-list, inventory-product-list, menu-library-list
- [x] Phase 3: Migrate .add-btn to .c-btn-primary in recipe-book-list, inventory-product-list, menu-library-list
- [x] Phase 4: Migrate .input-wrapper to .c-input-wrapper in 5 components
- [x] Phase 5: Remove local .visually-hidden and .placeholder-dash from component SCSS files
- [x] Phase 6: Migrate .table-wrap and th/td to .c-table-wrap/.c-data-table in equipment, venue, supplier
- [x] Phase 7: Migrate sortable-header, col-actions, clear-filters-btn to engine classes in recipe-book + inventory
- [x] Phase 8: Fixed .chipe typo, migrated ingredient chips to .c-chip--success
- [ ] Phase 9: Deferred â€” grid header/cell too coupled to display:contents layout
- [ ] Phase 10: Deferred â€” breakpoint/transition standardization for follow-up

### Plan 058 â€” Sidebar collapse and floating (`plans/058-sidebar-collapse-floating.plan.md`)

- [x] Inventory: full collapse to width 0 (SCSS + HTML toggle wrap)
- [x] Switch border-radius to right side in both SCSS files
- [x] Add floating overlay behavior at 768px breakpoint in both SCSS files
- [x] Change close icon to chevron-left in both HTML files

### Plan 057 â€” Plans folder full audit (`plans/057-plans-folder-full-audit.plan.md`)

- [x] Execute Plan 055 Group E (Five-Group rhythm: confirm-modal, translation-key-modal, restore-choice-modal, label-creation-modal, global-specific-modal, unit-creator, version-history-panel, custom-select, loader)
- [x] Execute Plan 047 S1: Unify ingredient row style with workflow
- [x] Execute Plan 047 S4: Workflow prep rows match ingredient rows
- [x] Execute Plan 047 L3: Responsive tablet/mobile for recipe builder

### Plan 056 â€” Table carousel columns (`plans/056-table-carousel-columns.plan.md`)

- [x] Create shared CellCarouselComponent and CellCarouselSlideDirective in src/app/shared/cell-carousel/
- [x] Wrap Type/Labels/Allergens columns in recipe-book-list with carousel; adjust header and grid template at 768px
- [x] Wrap Category/Allergens/Supplier columns in inventory-product-list with carousel; adjust header and grid template at 768px
- [x] Check lints on all modified files and fix any issues

### Plan 055 â€” SCSS cssLayer audit fix (`plans/055-scss-csslayer-audit-fix.plan.md`)

- [x] Group A: product-form, recipe-header, preparation-search, menu-intelligence, recipe-ingredients-table, ingredient-search (tokens, logical, rhythm)
- [x] Group B: cook-view (media query, !important, missing --cv-* tokens); other B files left for follow-up
- [x] Group C: equipment/venues border-block-end; menu-library --bg-warm â†’ --bg-body
- [x] Group E: shared modals, unit-creator, version-history-panel, custom-select, loader (Five-Group rhythm, logical props)
- [x] Run ng build to verify

### Plan 054 â€” Unify modal styles (`plans/054-unify-modal-styles.plan.md`)

- [x] Expand engine classes in styles.scss: .c-modal-card modifiers (--md, --fluid), .c-modal-actions, .c-modal-body, .c-input-stack, .c-btn-primary--danger/--warning, modal responsive rules
- [x] Update add-item-modal and add-equipment-modal HTML/SCSS
- [x] Update confirm-modal, restore-choice-modal, global-specific-modal HTML/SCSS
- [x] Update translation-key-modal, label-creation-modal, unit-creator HTML/SCSS
- [x] Run ng build and verify all 8 modals render correctly

### Plan 052 â€” Plan 047 audit report (`plans/052-plan-047-audit-report.plan.md`)

- [x] Update Plan 047 todo items in todo.md per audit findings (split L4, mark items per report)
- [x] Optional: implement quick wins (L1 column reorder, S2 timer fixed width, L4 sort by relevance)
- [x] Clarify B3 (volume conversion fix) and B4 (header unit dropdown polish) with spec or acceptance criteria

### Plan 050 â€” Recipe list labels, panel, header, menu UX (`plans/050-recipe-list-labels-panel-header-menu-ux.plan.md`)

- [x] 1. Labels column: compact/expand like allergens; header toggle expand-all; clickOutside close
- [x] 2. Row height: col-labels/col-allergens grow to fit expanded content (recipe-book + inventory)
- [x] 3. Panel: chevron-right icon, remove border; sharper animation (both list components)
- [x] 4. Header layout: title right, search center, same design (recipe-book + inventory)
- [x] 5. Menu Intelligence date: clickable label, open picker + focus; keyboard DD/MM/YYYY
- [x] 6. Guest number: remove default spinner (SCSS)
- [x] 7. Guest number: +/- buttons, disable minus at 0

### Plan 047 â€” Recipe Builder Polish (`plans/047-recipe-builder-polish.plan.md`)

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

### Plan 040 â€” Menu Intelligence Layout and Design (`plans/040-menu-intelligence-layout-design.plan.md`)

- [x] d: Replace var(--bg-paper-light) with var(--bg-pure) in menu-intelligence.page.scss
- [x] a+b+c: Menu name as h1, meta right-aligned and denser, paper border-radius
- [x] f: Add persistent "Add category" in section dropdown via add-item-modal
- [x] g1: MenuTypeDefinition model + MenuItemSelection extend
- [x] g2: MetadataRegistryService MENU_TYPES storage
- [x] g3: Metadata manager "Menu Types" card with field checkboxes
- [x] g4â€“g6: Dynamic serving-type dropdown + dish-row field container in menu-intelligence

### Plan 041 â€” Menu Intelligence UX Fixes (`plans/041-menu-intelligence-ux-fixes.plan.md`)

- [x] a: Add dictionary entries for default section categories
- [x] b: Close category dropdown on click outside (ClickOutSideDirective)
- [x] c: Hide scrollbar in dropdown containers
- [x] d: Remove dish-qty (derived portions) from dish row
- [x] e: Section grid layout (30% data column, centered names, responsive + mobile)

### Plan 042 â€” Menu Intelligence Metadata Redesign (`plans/042-menu-intelligence-metadata-redesign.plan.md`)

- [x] 1. menu-intelligence.page.ts: expandedMetaKeys_, isDishMetaExpanded, toggleDishMeta; editingDishField_, startEditDishField, commitEditDishField, isEditingDishField, getInputWidth
- [x] 2. menu-intelligence.page.html: dish row block; name cell + toggle button; conditional .dish-data; click-to-edit fields (display/edit branches)
- [x] 3. menu-intelligence.page.scss: single-column list; .dish-row block; toggle + click-to-edit styles; carousel at narrow (cssLayer)

### Plan 043 â€” Reusable dropdown with scroll arrows (`plans/043-reusable-dropdown-scroll-arrows.plan.md`)

- [x] Add .c-dropdown engine in src/styles.scss (wrapper, list with hidden scrollbar, scroll-top/scroll-bottom arrows)
- [x] Create scrollIndicators directive (core/directives)
- [x] Create ScrollableDropdownComponent (shared/scrollable-dropdown)
- [x] Migrate preparation-search and ingredient-search (HTML, SCSS)
- [x] Migrate menu-intelligence (event-type, section-dropdown, dish-dropdown)
- [x] Migrate recipe-header (unit x2, label dropdown)
- [x] Migrate product-form (category, supplier, allergen dropdowns)
- [x] Migrate recipe-book-list (ingredient-dropdown)
- [x] Add agent guidance (HOW-WE-WORK and/or copilot-instructions)

### Plan 044 â€” Custom dropdown for all selects (`plans/044-custom-dropdown-for-all-selects.plan.md`)

- [x] Create CustomSelectComponent (CVA, scrollable dropdown, host focus forwarding)
- [x] Replace native selects app-wide: unit-creator, add-equipment-modal, equipment-form, equipment-list, recipe-workflow, recipe-ingredients-table, inventory-product-list, cook-view, menu-library-list, venue-form, recipe-builder
- [x] Save plan 044 to plans/

### Plan 045 â€” Logistics tools and menu type edit (`plans/045-logistics-tools-and-menu-type-edit.plan.md`)

- [x] Show logistics section for both recipe and dish (recipe-builder.page.html)
- [x] Tool search + "Add new tool" opening add-equipment modal in recipe builder
- [x] Logistics grid: search + quantity one side, dense chip grid other side; distinct styling from ingredients
- [x] Metadata manager: menu type row grid 1fr auto 30px 30px; inline name edit; removable field chips; confirm on rename
- [x] MetadataRegistryService.renameMenuType; MenuEventDataService.updateServingTypeForAll; confirm modal + translation key

### Plan 046 â€” Cook-view scale by ingredient (`plans/046-cook-view-scale-by-ingredient.plan.md`)

- [x] cook-view.page.ts: Add scale-by state signals and methods (startSetByIngredient, applyScaleByIngredient, resetToFullRecipe); hide main quantity in special view
- [x] cook-view.page.html: Per-row hover/tap highlight, "Set recipe by this item", inline amount + Convert; special scaled view banner + "Back to full recipe"
- [x] cook-view.page.scss: Row highlight, set-by row controls, special scaled view styles (cssLayer)
- [x] dictionary.json: set_recipe_by_this_item, convert, scale_recipe_confirm, scaled_to, back_to_full_recipe
- [x] Reuse ConfirmModalService for scale confirmation

### Plan 046-1 â€” Cook-view scale-by UX fixes (`plans/046-1-cook-view-scale-by-ux-fixes.plan.md`)

- [x] HTML: Move "Set recipe by this item" into col-name (left of name); empty col-scale-action for normal rows
- [x] SCSS: Button visible only on row hover; full-row border/box-shadow on hover; yellow box-shadow for setting state; scaled-view shell + banner (edit-mode-like, different colors); spacing between containers

### Plan 034 â€” Recipe Builder UI Fixes (`plans/034-recipe-builder-ui-fixes.plan.md`)

- [x] a. Type toggle: pass recipeType from parent, add input in header, use in template
- [x] b. Header unit dropdowns: overflow visible + z-index for primary/secondary
- [x] c. Add row button: justify-content center in recipe-builder.page.scss
- [x] d. Ingredient search dropdown: z-index 100, ensure no overflow clip
- [x] e. Ingredients table: container-aware grid + small-screen stacked cards
- [x] f. Workflow section: space-evenly + define prep-flat-grid styles
- [x] g. Add step button: width 100%, align with grid in recipe-workflow

### Phase 1 â€” Stabilize & Complete (`plans/010-product-roadmap.plan.md`)

- [x] Add `recipe-book-list.spec.ts` and run tests (Plan 008 closure).
- [x] Set up Playwright E2E tests: config + 3 critical flow tests (product CRUD, recipe creation with cost, recipe edit persistence).
- [x] Optionally expand minimal specs (e.g. recipe-builder page and subcomponents) with behavior tests when touching those areas.
- [x] Sync documentation: update `project-plan.md` checkboxes, update breadcrumbs.
- [ ] When adding new features: add/update `.spec.ts` and mark related sub-tasks here; run the full test suite only at commit time (Phase 0) or when the user explicitly asks — not after every iteration.

### Plan 011 â€” Dashboard & Command Center Unification (done)

- [x] Dashboard default route, Overview + Core settings tabs; `/command-center` â†’ `/dashboard?tab=metadata`; single Dashboard nav link; unit tests + recipe-builder spec fix (queryParams).

### Phase 2 â€” Product Enhancement

- [ ] **Plan 011 (KPI expansion, optional)**: Further dashboard enhancements per roadmap if desired.
- [x] **Plan 012 â€” Supplier Management Page**: Dedicated CRUD page at `/suppliers` with list, edit, delete, linked products view.
- [ ] **Plan 013 â€” Recipe Quick Actions**: Duplicate recipe, approval toggle in recipe book list, batch select/actions.
- [ ] **Plan 014 â€” Low Stock Alerts**: Visual indicators in inventory list, filter toggle, dashboard card.

### Phase 3 â€” Polish & Production Readiness

- [ ] **Plan 015 â€” Empty States & Onboarding**: Empty-state UX for all list views, first-use guidance, Hebrew copy.
- [ ] **Plan 016 â€” Print-Friendly Recipe View**: Print stylesheet, hide navigation in print, RTL-aware layout, print button.
- [ ] **Plan 018 â€” Backend API Preparation**: Formalize `IStorageAdapter`, document REST API contract, audit adapter compliance.
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
| â€” | Recipe Builder: scaling, bruto, weight/volume toggle, unconvertible notice | Done |
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
| 070 | Recipe carousel header label sync | Done |
| 071 | Unified list design system | Done |
| 072 | Robust login, app-wide logging, security | Planned |
| 073 | Log file in project (dev) | Active |
| 074 | Tech debt remediation | Active |
| 076 | Unified add-recipe skill and create-if-missing | Done |
| 077 | Excel export feature | Done |
| 078 | Logistics designated storage | Active |
| 079 | Unify logistics search, remove From library | Done |
| 080 | Entity storage audit designated | Active |
|| 081 | toFix Detailed Plans | Planned |
| 082 | Recipe/Dish date added | Done |
| 085 | Optimize commit-GitHub skill | Done |
| 086 | AI Tooling Optimization | Active |
| 087 | Timestamp All Added Items | Active |
| 088 | Metadata Manager Expansion | Active |
|| 089 | Menu Intelligence Upgrade | Active |
| 090 | Whole-project logging audit | Active |
| 091 | Menu intelligence inputs and layout | Active |
| 094 | Inline Edit & Supplier Modal | Done |
| 095 | Menu Intelligence Gap Report | Planned |
| 096 | Supplier Modal Styling Upgrade | Active |
| 098 | Remove Supplier Modal Edit Redundancy | Active |
| 099 | Calculation and Shopping List Testing | Active |
| 102 | Unified export refactor | Active |
| 105 | Persist sidebar open/close state | Active |
| 107 | Export localization and design | Done |
| 108 | Recipe export and view spreadsheet layout | Active |
| 109 | Translate section categories | Planned |
| 111 | Unify metadata manager containers | Done |
| 112 | Dish dropdown width and keyboard | Planned |
| 113 | Use only prep_categories; discard mise_categories | Done |
| 116 | Center main loader in viewport | Done |
| 117 | Dish row absolute actions | Done |
| 118 | Sidebar close on breakpoint | Planned |
| 120 | Export "All" view option (recipe + menu) + cost per portion fix | Active |
| 121 | Product units display fix (Edit form + ingredient unit select) | Active |
| 122 | AI Chatbot Gemini scope (conceptual) | Planned |
| 123 | Recipe builder product-only units + persist new unit to product | Active |
| 124 | Unified styling audit and theme | Active |
| 126 | Purchase unit recipe builder fix | Active |
| 127 | Recipe builder cost display fix | Active |
| 128 | Hebrew canonical value resolution | Done |
| 129 | Post-execute verification bullets | Active |
| 130 | Numeric precision audit | Done |
| 131 | Spec coverage techdebt commit | Active |
| 132 | Translation add-value flow | Done |
| 133 | List quick-edit inline | Planned |
| 136 | Product form keyboard focus | Active |
| 137 | Techdebt spec coverage agent adherence | Active |
| 139 | Menu intelligence keyboard focus | Active |
| 140 | Recipe builder real-changes confirmation | Active |
| 138 | Product form header redesign | Active |
| 135 | Translation modal cancel guard title fix | Active |
| 134 | Translation and confirmation modals unified | Active |
| 141 | Hero FAB refactor and page-specific actions | Active |
| 142 | FAB Add-new for list pages | Active |
| 143 | Cook-view recipe yield units | Done |
| 144 | Precision-based counter step | Active |
| 145 | Secondary unit dropdown fix | Active |
| 150 | Secondary units in ingredient dropdown | Active |
| 163 | toFix audit PRD | Planned |
| 163-2 | Unit-creator keyboard flow | Active |
| 169 | List quick-edit UX overlay | Active |
| 170 | Add-new option and styling | Done |
| 167 | Category/unit add-new audit | Active |
| 163-1 | Cook-view ingredient alignment (2.1) | Active |
| 165 | Maison Plus row style | Done |
| 164 | Custom select preserve text on focus | Planned |
| 162 | No-auto-test agent rule | Active |
| 160 | Global user message queue | Active |
| 159 | Type-to-filter all dropdowns | Active |
| 157 | Fix sidebar alignment and close on breakpoint | Active |
| 156 | Category single-input type-in | Active |
| 155 | List shell and cell expand | Active |
| 153 | Recipe approve stamp button | Active |
| 152 | Recipe book date filter sidebar | Planned |
| 151 | Recipe secondary unit conversion | Active |
| 173 | Selected-item-display whole clickable | Active |
| 177 | Workflow select behavior | Merged into 178 |
| 178 | App-wide custom-select behavior | Active |
| 182 | toFix verification undone | Planned |
| 183 | Agent Intelligence Map and Optimization | Done |
| 184 | Recipe header SCSS dedupe | Done |
| 186 | Select-on-focus display click | Active |
| 187 | Unit creator i18n and focus | Done |
| 188 | Units metadata and system defaults | Done |
| 189 | Custom multi-select component | Done |
| 190 | Labels UI glass theme | Done |

*Excluded from audit: `plans/recipe-builder-page.md` (recipe book plan).*

