# Interactive Element Catalog — FoodVibe 1.0
Generated: 2026-04-09 | Mobile audit: 375×812, RTL

## Global Shell (app.component.html + header.component.html)

| page | element_selector | trigger_action | expected_behavior |
|------|-----------------|---------------|-------------------|
| ALL | `.mobile-menu-btn` (header) | tap | Opens mobile nav overlay with slide-in menu |
| ALL | `.mobile-nav-backdrop` | tap | Closes mobile nav overlay |
| ALL | `.mobile-close-btn` in `ul` | tap | Closes mobile nav overlay |
| ALL | `.bottom-nav a` | tap | Navigates to route; nav stays pinned at bottom |
| ALL | `.avatar-guest` / `.auth-link` | tap | Opens auth modal (`app-auth-modal`) |
| ALL | `.auth-username-btn` | tap | Logs user out |
| ALL | `.fab-main` (hero-fab) | tap | Expands `.fab-actions` with context-aware action buttons |
| ALL | `.fab-action` | tap | Runs action (e.g. go to recipe-builder) |
| ALL | `app-confirm-modal` (.c-modal-overlay) | service trigger | Shows centered confirm/danger modal overlay |
| ALL | `add-item-modal` (.c-modal-overlay) | service trigger | Shows add-item modal overlay |
| ALL | `app-quick-add-product-modal` | service trigger | Shows quick-add modal overlay |
| ALL | `app-supplier-modal` | service trigger | Shows supplier modal overlay |
| ALL | `app-ai-recipe-modal` | service trigger | Shows AI recipe generation modal overlay |
| ALL | `app-auth-modal` | service trigger | Shows auth (sign in / sign up) modal overlay |

---

## /dashboard — DashboardPage

| page | element_selector | trigger_action | expected_behavior |
|------|-----------------|---------------|-------------------|
| dashboard | `.header-btn[data-testid="btn-nav-metadata"]` | tap | Switches to metadata tab (shows app-metadata-manager) |
| dashboard | `.header-btn[data-testid="btn-nav-venues"]` | tap | Switches to venues tab |
| dashboard | `.header-btn[data-testid="btn-nav-trash"]` | tap | Switches to trash tab |
| dashboard | `.header-btn[data-testid="btn-nav-suppliers"]` | tap | Navigates to /suppliers |
| dashboard | `.change-tag` (activity list) | tap | Opens change popover overlay |
| dashboard | `.activity-scroll-btn` | tap | Scrolls activity changes row horizontally |
| dashboard | `.link-btn[data-testid="btn-view-inventory"]` | tap | Navigates to /inventory |
| dashboard | `.link-btn[data-testid="btn-add-product"]` | tap | Navigates to /inventory/add (auth-required) |
| dashboard | `.link-btn[data-testid="btn-view-recipes"]` | tap | Navigates to /recipe-book |
| dashboard | `.link-btn[data-testid="btn-view-low-stock"]` | tap | Navigates to /inventory (filtered) |
| dashboard | `.link-btn[data-testid="btn-view-unapproved"]` | tap | Navigates to /recipe-book (filtered) |
| dashboard/metadata | `app-metadata-manager` | embedded | Loads metadata manager with its own interactive fields |
| dashboard/venues | `app-venue-list` | embedded | Loads venues list with panel/search |
| dashboard/trash | `app-trash-page` | embedded | Loads trash page |

---

## /recipe-book — RecipeBookListComponent (via list-shell)

| page | element_selector | trigger_action | expected_behavior |
|------|-----------------|---------------|-------------------|
| recipe-book | `.open-panel-btn` (list-shell header) | tap | Slides open filter panel aside |
| recipe-book | `.panel-backdrop` | tap | Closes filter panel aside |
| recipe-book | `#recipe-search` input | focus + type | Filters recipe list |
| recipe-book | `.c-filter-category-header` | tap | Accordion: expands/collapses filter category |
| recipe-book | `.labels-btn-wrapper` (recipe row) | tap | Expands inline labels chip grid |
| recipe-book | `.allergen-btn-wrapper` (recipe row) | tap | Expands inline allergens chip grid |
| recipe-book | `app-carousel-header` columns | tap | Cycles visible column (type/labels/allergens/date) |
| recipe-book | `.recipe-grid-row` | tap | Navigates to /cook/:id |
| recipe-book | `.c-icon-btn[aria-label="cook"]` | tap | Navigates to /cook/:id |
| recipe-book | `.c-icon-btn.danger[aria-label="delete"]` | tap | Triggers confirm modal + delete |
| recipe-book | `.c-btn-primary` "Add recipe" | tap | Navigates to /recipe-builder (auth gated) |
| recipe-book | `.date-cell-wrap` / `.cost-cell-wrap` | hover/tap | Shows fixed-position tooltip |
| recipe-book | `.history-overlay` | service trigger | Full-screen overlay with version-history-panel |
| recipe-book | `app-selection-bar` | visible when rows selected | Bulk-action bar |
| recipe-book | filter: date range inputs | tap | Opens date filter inside accordion |
| recipe-book | filter: ingredient search input | type | Shows scrollable autocomplete dropdown |
| recipe-book | filter: ingredient chip | tap | Removes ingredient filter |

---

## /inventory/list — InventoryProductListComponent (via list-shell)

| page | element_selector | trigger_action | expected_behavior |
|------|-----------------|---------------|-------------------|
| inventory | `.open-panel-btn` | tap | Slides open filter panel |
| inventory | `#product-search` input | focus + type | Filters product list |
| inventory | `app-carousel-header` columns | tap | Cycles visible column (category/allergens/supplier) |
| inventory | `.c-filter-category-header` | tap | Accordion: expands/collapses filter category |
| inventory | `.status-badge` (Invalid/Incomplete row) | visible | Row tinted red/amber on validation failure |
| inventory | `.c-btn-primary` "Add product" | tap | Navigates to /inventory/add (auth gated) |
| inventory | `.c-icon-btn.danger[aria-label="delete"]` | tap | Triggers confirm modal + delete |
| inventory | `app-selection-bar` | visible when rows selected | Bulk-action bar |

---

## /cook/:id — CookViewPage

| page | element_selector | trigger_action | expected_behavior |
|------|-----------------|---------------|-------------------|
| cook | `.export-bar-main` | tap | Expands `.export-bar-actions` with view/download buttons |
| cook | `.export-bar-actions` (on mouseleave) | mouse leave | Collapses export bar |
| cook | `.edit-btn[aria-label="edit"]` | tap | Enters edit mode (requires auth) |
| cook | `.edit-btn.save-btn` (edit mode) | tap | Saves edits |
| cook | `.edit-btn.undo-btn` (edit mode) | tap | Undoes edits |
| cook | `.c-chip.cv-chip-btn` (×½ ×1 ×2 etc.) | tap | Sets quantity multiplier |
| cook | `app-counter` (quantity stepper) | tap +/- | Adjusts target quantity |
| cook | `app-custom-select.unit-select` | tap | Opens unit dropdown |
| cook | `.cv-ing-row` (ingredient row) | tap | Toggles checked state |
| cook | `.set-by-ingredient-btn` | tap | Opens inline set-by-ingredient input |
| cook | `.convert-scale-btn` (set-by mode) | tap | Applies scale-by-ingredient |
| cook | `.cancel-set-by-btn` | tap | Cancels scale-by-ingredient |
| cook | `.cv-step-card-head` | tap | Peeks/collapses step card body |
| cook | `.cv-step-done-btn` | tap | Marks step as done |
| cook | `.cv-timer-pill` | tap | Starts/cancels timer |
| cook | `.back-to-full-recipe-btn` (scaled view) | tap | Resets to full recipe |
| cook | `app-approve-stamp` | tap | Marks recipe as approved |
| cook | `app-export-preview` | service trigger | Shows full-screen export preview overlay |
| cook | cooking completion screen | state | Shows on all steps done |

---

## /recipe-builder — RecipeBuilderPage

| page | element_selector | trigger_action | expected_behavior |
|------|-----------------|---------------|-------------------|
| recipe-builder | Export toolbar button (any `.toolbar-glass-btn`) | tap | Opens `app-export-toolbar-overlay` at top |
| recipe-builder | `.view-export-wrap button` | tap | Opens inline view/export dropdown |
| recipe-builder | `.section-card-header` (ingredients) | tap | Collapses/expands ingredients section |
| recipe-builder | `.section-card-header` (workflow) | tap | Collapses/expands workflow section |
| recipe-builder | `.section-card-header` (logistics) | tap | Collapses/expands logistics section |
| recipe-builder | `app-recipe-header` image picker | tap | Opens image upload UI |
| recipe-builder | `app-recipe-ingredients-table` rows | tap | Ingredient search interaction |
| recipe-builder | `.add-row-btn` | tap | Adds new ingredient row |
| recipe-builder | logistics search input | type | Shows scrollable equipment dropdown |
| recipe-builder | `app-counter` (logistics quantity) | tap | Adjusts tool quantity |
| recipe-builder | `.logistics-add-btn` | tap | Adds logistics chip |
| recipe-builder | `.logistics-chip` | tap | Removes logistics chip |
| recipe-builder | `.action-footer .c-btn-primary` | tap | Saves recipe |
| recipe-builder | `app-approve-stamp` | tap | Toggles recipe approval |
| recipe-builder | `app-export-preview` | service trigger | Shows export preview overlay |
| recipe-builder | `.history-view-banner` (history mode) | visible | Banner shown in read-only history view mode |

---

## /menu-intelligence — MenuIntelligencePage

| page | element_selector | trigger_action | expected_behavior |
|------|-----------------|---------------|-------------------|
| menu-intelligence | `.toolbar-glass-btn` (export bar) | tap | Opens export toolbar overlay |
| menu-intelligence | `.checklist-export-dropdown` | tap chevron | Opens sub-dropdown for checklist export type |
| menu-intelligence | `.meta-input.menu-name-input` | tap | Edits menu name (inline) |
| menu-intelligence | `.meta-trigger` (event type) | tap | Opens event-type searchable dropdown |
| menu-intelligence | `app-custom-select` (serving type) | tap | Opens serving type dropdown |
| menu-intelligence | `.counter-pill-btn` (guests ±) | tap | Adjusts guest count |
| menu-intelligence | `.meta-date-wrap` | tap | Opens native date picker |
| menu-intelligence | `.section-title-plain` | tap | Opens section-category searchable dropdown |
| menu-intelligence | `.section-remove button` | tap | Removes menu section |
| menu-intelligence | `app-menu-dish-row` (each row) | tap | Opens dish search interaction |
| menu-intelligence | `.add-dish-btn` | tap | Adds new dish row in section |
| menu-intelligence | `.add-section-btn` | tap | Adds new section |
| menu-intelligence | `footer.financial-bar` | visible | Fixed financial totals bar |
| menu-intelligence | `app-export-preview` | service trigger | Shows export preview overlay |

---

## /equipment/list — EquipmentListComponent

| page | element_selector | trigger_action | expected_behavior |
|------|-----------------|---------------|-------------------|
| equipment | `.equipment-nav a` (tab links) | tap | Navigates within equipment section |
| equipment | List rows (via list-shell) | tap | Navigates to edit or view |
| equipment | `.c-btn-primary` "Add equipment" | tap | Navigates to /equipment/add |
| equipment | Filter panel toggle | tap | Slides open filter panel |

---

## /suppliers/list — SupplierListComponent (via list-shell)

| page | element_selector | trigger_action | expected_behavior |
|------|-----------------|---------------|-------------------|
| suppliers | `.open-panel-btn` | tap | Slides open filter panel |
| suppliers | Search input | type | Filters suppliers |
| suppliers | `.c-btn-primary` "Add supplier" | tap | Navigates to /suppliers/add (auth gated) |
| suppliers | List row | tap | Navigates to /suppliers/edit/:id |
| suppliers | `.c-icon-btn.danger` | tap | Delete confirmation modal |

---

## /venues/list — VenueListComponent (via list-shell)

| page | element_selector | trigger_action | expected_behavior |
|------|-----------------|---------------|-------------------|
| venues | `.open-panel-btn` | tap | Slides open filter panel |
| venues | Search input | type | Filters venues |
| venues | `.c-btn-primary` "Add venue" | tap | Navigates to /venues/add (auth gated) |
| venues | List row | tap | Navigates to edit |
| venues | `.c-icon-btn.danger` | tap | Delete confirmation modal |

---

## /trash — TrashPage (auth required)

| page | element_selector | trigger_action | expected_behavior |
|------|-----------------|---------------|-------------------|
| trash | `.btn-refresh` | tap | Refreshes trash content |
| trash | `.btn-action.btn-restore` (section header) | tap | Restores all items in section |
| trash | `.btn-action.btn-dispose` (section header) | tap | Disposes all items in section |
| trash | `.btn-item.btn-history` (row) | tap | Opens version history overlay panel |
| trash | `.btn-item.btn-restore` (row) | tap | Restores single item |
| trash | `.btn-item.btn-dispose` (row) | tap | Permanently disposes single item |
| trash | `.history-overlay` | visible | Full-screen overlay with version-history-panel slide-in |
| trash | `.history-overlay-panel .c-close-btn` | tap | Closes history overlay |

---

## Shared Components (used across pages)

| component | pages_using_it | trigger_action | expected_behavior |
|-----------|---------------|---------------|-------------------|
| `app-list-shell` | recipe-book, inventory, equipment, suppliers, venues | panel toggle | Slides aside filter panel open/closed; backdrop tap closes |
| `app-confirm-modal` | ALL (via ConfirmModalService) | service trigger | Centered modal overlay with confirm/cancel buttons |
| `app-add-item-modal` | recipe-book, inventory, dashboard | service trigger | Modal overlay for naming new items |
| `app-carousel-header` / `app-cell-carousel` | recipe-book, inventory | column tap | Swaps visible column in grid header + rows |
| `app-custom-select` | cook-view, recipe-builder, recipe-book | tap | Custom dropdown with typeahead filter |
| `app-scrollable-dropdown` | recipe-book, recipe-builder, menu-intelligence | visible on input | Scrollable autocomplete list |
| `app-counter` | cook-view, recipe-builder | tap +/- | Numeric stepper with smart step logic |
| `app-selection-bar` | recipe-book, inventory | visible when rows selected | Sticky bulk-action bar |
| `app-version-history-panel` | recipe-book, trash | history button | Slides in panel showing version history |
| `app-approve-stamp` | cook-view, recipe-builder | tap | Floating stamp button; animates on approve |
| `app-export-preview` | cook-view, recipe-builder, menu-intelligence | service trigger | Full-screen export preview overlay |
| `app-export-toolbar-overlay` | recipe-builder, menu-intelligence | toolbar toggle | Fixed top overlay with glass-morph buttons |
| `app-hero-fab` | ALL | tap main button | Expands floating action menu |
| `app-auth-modal` | ALL (via AuthService) | unauthenticated action | Auth sign-in/sign-up modal |
| `app-change-popover` | dashboard | change-tag tap | Small popover overlay showing before/after values |
| `app-empty-state` | recipe-book, inventory, cook-view | empty data state | Centered empty-state UI with CTA button |
| `app-loader` | ALL | loading state | Spinner; inline or overlay variants |
