# Unify Design Engine -- Refactoring Plan (059-1)

Refactor of Plan 059. Phased execution plan to eliminate duplicated SCSS across all component files by migrating to shared engine classes in `src/styles.scss`.

---

## Phase 1 -- Add missing engine classes to `src/styles.scss`

Patterns duplicated across 2+ components that have no engine class yet.

- `.visually-hidden` -- Duplicated in 5 components (recipe-book-list, inventory-product-list, equipment-list, venue-list, supplier-list).
- `.placeholder-dash` -- Duplicated in recipe-book-list and inventory-product-list.
- `.c-table-wrap` -- Duplicated in equipment-list, venue-list, supplier-list (glass panel + overflow-x).
- `.c-data-table` -- Shared th/td base styles duplicated in equipment-list, venue-list, supplier-list.
- `.c-sortable-header` -- Duplicated in recipe-book-list and inventory-product-list.
- `.c-col-actions` -- Duplicated in recipe-book-list and inventory-product-list.
- `.c-empty-state`, `.c-empty-state__icon`, `.c-empty-state__msg` -- Duplicated across 5 list components.
- `.c-btn-ghost--sm` -- For clear-filters pattern in recipe-book-list and inventory-product-list.
- `.c-chip--warning` -- For allergen pills in recipe-book-list and inventory-product-list.
- `.c-chip--success` -- For ingredient/recipe type pills.
- `.c-grid-input` / `.c-grid-select` -- Inline table inputs in recipe-ingredients-table and inventory-product-list.

---

## Phase 2 -- Migrate action buttons to `.c-icon-btn`

Replace local `.action-btn` with engine `.c-icon-btn` / `.c-icon-btn danger`.

- recipe-book-list (HTML + SCSS)
- inventory-product-list (HTML + SCSS)
- menu-library-list (HTML + SCSS)

---

## Phase 3 -- Migrate add buttons to `.c-btn-primary`

Replace local `.add-btn` with engine `.c-btn-primary`.

- recipe-book-list (HTML + SCSS)
- inventory-product-list (HTML + SCSS)
- menu-library-list (HTML + SCSS)

---

## Phase 4 -- Migrate search wrappers to `.c-input-wrapper`

Replace local `.input-wrapper` with engine `.c-input-wrapper`.

- recipe-book-list (HTML + SCSS)
- inventory-product-list (HTML + SCSS)
- menu-library-list (HTML + SCSS)
- ingredient-search (HTML + SCSS)
- preparation-search (HTML + SCSS)

---

## Phase 5 -- Remove local `.visually-hidden` and `.placeholder-dash`

SCSS-only removals (class names unchanged, now sourced from engine).

- `.visually-hidden` from: recipe-book-list, inventory-product-list, equipment-list, venue-list, supplier-list
- `.placeholder-dash` from: recipe-book-list, inventory-product-list

---

## Phase 6 -- Migrate table structure (equipment, venue, supplier)

Replace `.table-wrap` with `.c-table-wrap`, th/td with `.c-data-table`, `.no-results` with `.c-empty-state`.

- equipment-list (HTML + SCSS)
- venue-list (HTML + SCSS)
- supplier-list (HTML + SCSS)

---

## Phase 7 -- Extract filter panel to engine

Extract shared `.c-filter-panel`, `.c-filter-panel__content`, `.c-filter-section`, `.c-filter-category`, `.c-filter-option` to styles.scss. Migrate `.panel-toggle-icon`, `.clear-filters-btn`, `.sortable-header`, `.col-actions`.

- recipe-book-list (HTML + SCSS)
- inventory-product-list (HTML + SCSS)

---

## Phase 8 -- Migrate chips to `.c-chip` variants

Replace `.chipe`, `.allergen-pill`, `.tag`, `.type-pill`, `.category-pill`, `.label-chip` with `.c-chip` + modifiers.

- recipe-book-list (HTML + SCSS)
- inventory-product-list (HTML + SCSS)
- menu-library-list (HTML + SCSS)
- ingredient-search (HTML + SCSS)
- preparation-search (HTML + SCSS)

---

## Phase 9 -- Migrate grid header/cell (recipe-book, inventory)

Use `.c-grid-header-cell` / `.c-grid-cell` and `.c-grid-input` / `.c-grid-select`.

- recipe-book-list (HTML + SCSS)
- inventory-product-list (HTML + SCSS)

---

## Phase 10 -- Standardize breakpoints and transitions

- Replace hardcoded `768px` with `$break-mobile` across all components.
- Standardize transition values to engine tokens.

---

## Execution rules

- After each phase: `ng build` to verify no regressions.
- Follow cssLayer skill for all SCSS changes.
- One commit per phase for clean git history.
- Keep component-specific layout in component SCSS -- only remove duplicated visual styling.
