# Unify design engine across the app

## Overview

Project-wide audit of list/table and UI patterns found duplicated styles and inconsistent use of global engine classes. This plan lists every duplication and the exact steps to unify on the existing engine in `src/styles.scss` for a more robust and unified application.

---

## 1. Table/list action buttons (twist animation)

**Cause:** Global `.c-icon-btn` in `src/styles.scss` (lines 560–593) provides `transform: scale(1.12) rotate(-8deg)` on hover and `rotate(8deg)` for `.danger`. Supplier-list, venue-list, and equipment-list already use it.

**Gap:** Recipe-book-list, inventory-product-list, and menu-library-list use `.action-btn` with local SCSS (scale only or no transform). No twist.

**Fix:**
- In recipe-book-list: Replace `action-btn edit` with `c-icon-btn`, `action-btn delete` with `c-icon-btn danger` in HTML. Remove the `.action-btn` block from SCSS. Add scoped opacity only: `.recipe-grid-row .c-icon-btn { opacity: 0.7 }`, `.recipe-grid-row:hover .c-icon-btn { opacity: 1 }`. Keep mobile size override inside existing 768px block if needed.
- In inventory-product-list: Same (swap to `c-icon-btn` / `c-icon-btn danger`, remove `.action-btn`, add `.product-grid-row` opacity overrides).
- In menu-library-list: Replace `action-btn edit`, `action-btn clone` with `c-icon-btn`, `action-btn delete` with `c-icon-btn danger`. Remove `.action-btn` block from SCSS.

**Files:** `recipe-book-list.component.html`, `recipe-book-list.component.scss`, `inventory-product-list.component.html`, `inventory-product-list.component.scss`, `menu-library-list.component.html`, `menu-library-list.component.scss`.

---

## 2. Add button (header/toolbar)

**Cause:** Global `.c-btn-primary` exists and matches the intended look.

**Gap:** Recipe-book-list, inventory-product-list, and menu-library-list use `.add-btn` or `.list-header .add-btn` with duplicated properties (inline-flex, padding, primary background, hover, etc.).

**Fix:** Replace `add-btn` with `c-btn-primary` in the HTML of recipe-book-list, inventory-product-list, and menu-library-list. Remove local `.list-header .add-btn` / `.add-btn` rules from their SCSS.

**Files:** `recipe-book-list.component.html`, `recipe-book-list.component.scss`, `inventory-product-list.component.html`, `inventory-product-list.component.scss`, `menu-library-list.component.html`, `menu-library-list.component.scss`.

---

## 3. Search input wrapper

**Cause:** Global `.c-input-wrapper` in `src/styles.scss` (lines 267–302) provides icon + input, focus-within, placeholder styling.

**Gap:** Recipe-book-list, inventory-product-list, menu-library-list, ingredient-search, and preparation-search use local `.input-wrapper` with the same structure.

**Fix:** Replace `input-wrapper` with `c-input-wrapper` in the HTML of those five components. Remove local `.input-wrapper` blocks from their SCSS. Menu-library adds `backdrop-filter`; add a single scoped override if needed (e.g. `.search-wrap .c-input-wrapper { backdrop-filter: var(--blur-glass); }`).

**Files:** `recipe-book-list.component.html`, `recipe-book-list.component.scss`, `inventory-product-list.component.html`, `inventory-product-list.component.scss`, `menu-library-list.component.html`, `menu-library-list.component.scss`, `ingredient-search.component.html`, `ingredient-search.component.scss`, `preparation-search.component.html`, `preparation-search.component.scss`.

---

## 4. Visually-hidden utility

**Cause:** No global utility; each component defines its own.

**Gap:** Recipe-book-list, inventory-product-list (identical block). Equipment-list, venue-list, supplier-list (slightly different: `inset: 0`, no `white-space: nowrap`).

**Fix:** Add a single `.visually-hidden` block to `src/styles.scss` (e.g. position absolute, 1px size, overflow hidden, clip). Remove all local `.visually-hidden` definitions from the five list components. Use one canonical definition (prefer the recipe-book/inventory version for accessibility).

**Files:** `src/styles.scss`, `recipe-book-list.component.scss`, `inventory-product-list.component.scss`, `equipment-list.component.scss`, `venue-list.component.scss`, `supplier-list.component.scss`.

---

## 5. Placeholder-dash

**Cause:** Used for empty cell content (e.g. "—").

**Gap:** Identical block in recipe-book-list and inventory-product-list only.

**Fix:** Add `.placeholder-dash { color: var(--color-text-muted-light); font-size: 0.875rem; }` to `src/styles.scss`. Remove from recipe-book-list and inventory-product-list SCSS.

**Files:** `src/styles.scss`, `recipe-book-list.component.scss`, `inventory-product-list.component.scss`.

---

## 6. Clear-filters button

**Cause:** Same look in recipe-book and inventory filter panels.

**Gap:** Identical `.clear-filters-btn` in both SCSS files.

**Fix:** Add a small ghost/secondary button variant to the engine (e.g. `.c-btn-ghost--sm` or reuse `.c-btn-ghost` with a size modifier) in `src/styles.scss`. Use it in both templates and remove local `.clear-filters-btn` rules.

**Files:** `src/styles.scss`, `recipe-book-list.component.html`, `recipe-book-list.component.scss`, `inventory-product-list.component.html`, `inventory-product-list.component.scss`.

---

## 7. Panel toggle icon (filter panel)

**Cause:** Same chevron/close button in recipe-book and inventory filter panels.

**Gap:** Nearly identical `.panel-toggle-icon` in both (one has border, one has border: none).

**Fix:** Add `.c-icon-btn--panel` or similar in `src/styles.scss` (or extend `.c-icon-btn` with a modifier) for the panel toggle. Use it in both templates; remove local `.panel-toggle-icon` blocks.

**Files:** `src/styles.scss`, `recipe-book-list.component.html`, `recipe-book-list.component.scss`, `inventory-product-list.component.html`, `inventory-product-list.component.scss`.

---

## 8. Filter panel (recipe-book + inventory)

**Cause:** Same collapsible panel, filter sections, category headers, options, checkboxes.

**Gap:** `.filter-panel`, `.panel-content`, `.filter-section`, `.filter-section-header`, `.filter-category`, `.filter-category-header`, `.filter-category-count`, `.filter-options`, `.filter-option` duplicated with minor differences (transition timing, border on toggle).

**Fix:** Extract shared filter-panel styles into global classes in `src/styles.scss` (e.g. `.c-filter-panel`, `.c-filter-panel__content`, `.c-filter-section`, `.c-filter-category`, `.c-filter-option`). Use these classes in recipe-book-list and inventory-product-list HTML/SCSS. Keep only layout-specific overrides (e.g. grid-area, width) in components. Align on one transition (e.g. `0.25s var(--ease-spring)`).

**Files:** `src/styles.scss`, `recipe-book-list.component.html`, `recipe-book-list.component.scss`, `inventory-product-list.component.html`, `inventory-product-list.component.scss`.

---

## 9. No-results / empty state

**Cause:** Two families: (1) recipe-book and inventory use `.table-body .no-results` + `.empty-state`; (2) equipment, venue, supplier use `.no-results` + `.empty-state-cell` + inner `.empty-state`.

**Gap:** Same structure (icon, message, optional CTA) but different padding, text-align, class names.

**Fix:** Add global `.c-empty-state`, `.c-empty-state__icon`, `.c-empty-state__msg` (and optionally `.c-empty-state--cell` for table cell context) in `src/styles.scss`. Migrate recipe-book, inventory, equipment, venue, supplier to use these classes. Unify padding and text-align (e.g. center for standalone, end for table cell). Remove duplicated `.no-results`, `.empty-state`, `.empty-state-icon`, `.empty-state-msg` blocks from all five list SCSS files.

**Files:** `src/styles.scss`, `recipe-book-list.component.html`, `recipe-book-list.component.scss`, `inventory-product-list.component.html`, `inventory-product-list.component.scss`, `equipment-list.component.html`, `equipment-list.component.scss`, `venue-list.component.html`, `venue-list.component.scss`, `supplier-list.component.html`, `supplier-list.component.scss`.

---

## 10. Table-wrap (equipment, venue, supplier)

**Cause:** Identical `.table-wrap` in all three (overflow, background, border, radius, shadow, backdrop-filter).

**Fix:** Add `.c-table-wrap` to `src/styles.scss` with the same properties. Use it in the three templates; remove local `.table-wrap` blocks.

**Files:** `src/styles.scss`, `equipment-list.component.html`, `equipment-list.component.scss`, `venue-list.component.html`, `venue-list.component.scss`, `supplier-list.component.html`, `supplier-list.component.scss`.

---

## 11. Table base (th/td) for equipment, venue, supplier

**Cause:** Identical `th`/`td` base and `th` styling in all three.

**Fix:** Add `.c-table` (or `.c-data-table`) in `src/styles.scss` with `th, td` and `th` rules. Apply class to the `<table>` in equipment, venue, supplier. Remove duplicated th/td blocks from the three SCSS files (keep only column-specific min-widths if needed).

**Files:** `src/styles.scss`, `equipment-list.component.html`, `equipment-list.component.scss`, `venue-list.component.html`, `venue-list.component.scss`, `supplier-list.component.html`, `supplier-list.component.scss`.

---

## 12. Sortable header

**Cause:** Recipe-book and inventory share identical `.sortable-header` (flex, center, cursor, transition, hover background/color). Equipment uses `.sortable` (cursor, user-select) only.

**Fix:** Add `.c-sortable-header` to `src/styles.scss` with the shared block. Use it in recipe-book-list and inventory-product-list; remove local `.sortable-header`. Optionally align equipment’s sortable behavior with the same class if it has a clickable header.

**Files:** `src/styles.scss`, `recipe-book-list.component.scss`, `inventory-product-list.component.scss`, optionally `equipment-list.component.html`/SCSS.

---

## 13. Grid table header/cell (recipe-book, inventory)

**Cause:** `.c-grid-header-cell` and `.c-grid-cell` exist in `src/styles.scss` (lines 477–495) with similar padding, background, border, font.

**Gap:** Recipe-book and inventory define `.table-header > *` and row cell styles locally instead of using the engine.

**Fix:** Where possible, use `.c-grid-header-cell` and `.c-grid-cell` in the grid layout (e.g. add classes to header cells and body cells). If the grid structure (e.g. `display: contents` rows) prevents direct use, refactor to a shared mixin or partial that both components import, or add a wrapper class and use the engine with a single override for the grid context. Goal: one source of truth for padding, border, background, font.

**Files:** `src/styles.scss`, `recipe-book-list.component.html`, `recipe-book-list.component.scss`, `inventory-product-list.component.html`, `inventory-product-list.component.scss`.

---

## 14. Col-actions layout

**Cause:** Same flex layout for the actions column in recipe-book and inventory.

**Gap:** Identical `.col-actions` block (padding-inline-end, flex, gap, justify-content, align-items) in both.

**Fix:** Add `.c-col-actions` (or reuse a generic utility) in `src/styles.scss`. Use it in both; remove local `.col-actions` rules. If the name is tied to grid column semantics, keep the class name but define it once in styles.scss and remove from components.

**Files:** `src/styles.scss`, `recipe-book-list.component.scss`, `inventory-product-list.component.scss`.

---

## 15. Allergen pill / allergen button

**Cause:** Same warning-style pill and expandable button in recipe-book and inventory.

**Gap:** `.allergen-pill`, `.allergen-btn`, `.allergen-btn-wrapper`, `.allergen-expanded` duplicated with minor padding/font differences.

**Fix:** Add `.c-chip--allergen` (pill) and `.c-allergen-toggle` (or similar) in `src/styles.scss`. Use in both components; remove local blocks. Metadata-manager uses a danger variant; add `.c-chip--allergen-danger` if needed.

**Files:** `src/styles.scss`, `recipe-book-list.component.scss`, `inventory-product-list.component.scss`, optionally `metadata-manager.page.component.scss`.

---

## 16. Chips (chipe typo, ingredient/category/supplier)

**Cause:** Recipe-book has `.chipe.ingredient`; product-form has `.chipe` with `.allergen`, `.supplier`, `.category`. Global `.c-chip` exists (lines 463–474).

**Fix:** Rename `.chipe` to use `.c-chip` with modifiers (e.g. `.c-chip--success`, `.c-chip--warning`, `.c-chip--category`). Replace local chip blocks with engine + modifiers. Fix typo everywhere.

**Files:** `src/styles.scss`, `recipe-book-list.component.html`, `recipe-book-list.component.scss`, `product-form.component.html`, `product-form.component.scss`.

---

## 17. Grid input / grid select

**Cause:** Inline inputs and selects in tables (e.g. inventory price, unit). Recipe-ingredients-table and inventory use different padding/background.

**Fix:** Add `.c-grid-input` and `.c-grid-select` to `src/styles.scss` with one consistent look (padding, background, border-radius, font-size). Use in recipe-ingredients-table and inventory-product-list; remove local `.grid-input` / `.grid-select` blocks.

**Files:** `src/styles.scss`, `recipe-ingredients-table.component.scss`, `inventory-product-list.component.scss`, corresponding HTML if class names change.

---

## 18. Mobile breakpoint

**Cause:** `$break-mobile: 768px` exists in `src/styles.scss` but is not imported in component SCSS.

**Gap:** Many components use `@media (max-width: 768px)` or `768px` hardcoded.

**Fix:** In each component SCSS that uses `768px`, add `@use 'path/to/styles' as *;` or the project’s standard way to use the global breakpoint, then replace `768px` with `$break-mobile`. Alternatively, add a CSS custom property for the breakpoint and use `@media (max-width: var(--break-mobile))` if the build supports it. Document the approach in the cssLayer skill or HOW-WE-WORK.

**Files:** All component SCSS that reference 768px (recipe-book-list, inventory-product-list, menu-library-list, dashboard-overview, trash, unit-creator, recipe-workflow, hero-fab, product-form, metadata-manager, loader, footer, version-history-panel, etc.).

---

## 19. Transition values

**Cause:** Mix of `0.2s ease`, `0.15s ease`, `var(--ease-spring)`, `var(--ease-smooth)`, and `transition: all`.

**Fix:** Standardize on `var(--ease-spring)` or `var(--ease-smooth)` and a single duration (e.g. 0.2s) for interactive states. Add a duration token to `:root` if desired (e.g. `--transition-fast: 0.15s`; `--transition-normal: 0.2s`). Replace ad-hoc `ease` and `all` in component SCSS. Do incrementally to avoid large diffs.

**Files:** Component SCSS across the app; optionally `src/styles.scss` for new tokens.

---

## 20. Cost tooltip (recipe-book)

**Cause:** Only recipe-book has `.cost-tooltip` / `.cost-tooltip-fixed`. No global tooltip engine.

**Fix:** If other tooltips are added later, introduce `.c-tooltip` in `src/styles.scss` and migrate recipe-book to it. Otherwise leave as-is until reuse is needed.

**Files:** Optional; `src/styles.scss`, `recipe-book-list.component.scss`.

---

## Execution order (suggested)

1. Global additions: `.visually-hidden`, `.placeholder-dash`, `.c-table-wrap`, `.c-empty-state*`, `.c-sortable-header`, `.c-col-actions`, chip/panel/button variants (sections 4, 5, 6, 7, 9, 10, 11, 12, 14).
2. Migrate list markup and remove local duplicates: action buttons (1), add button (2), search wrapper (3), clear-filters (6), panel toggle (7), empty state (9), table-wrap (10), table base (11), sortable header (12), col-actions (14).
3. Filter panel extraction (8) and grid header/cell alignment (13).
4. Chips and allergens (15, 16), grid input/select (17).
5. Breakpoint (18) and transitions (19) as a follow-up pass.

Each step: update `src/styles.scss`, then update the listed components’ HTML/SCSS, then run build and fix lints.
