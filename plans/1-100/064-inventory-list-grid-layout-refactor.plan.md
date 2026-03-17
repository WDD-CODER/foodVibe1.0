# Fix inventory list: refactor table to grid+divs (recipe-book pattern)

## Problem

The global engine class `.c-sortable-header` in `src/styles.scss` sets `display: flex`. The inventory list uses a real `<table>` and puts this class on `<th>` elements. Overriding `<th>` to `display: flex` breaks table layout, so header cells stack or misalign.

## Solution — Same layout as recipe-book (one style everywhere)

**Goal:** Use the same list layout as recipe-book (grid + divs, no `<table>`) so one structure and one set of engine classes apply everywhere. No table-specific exceptions.

**Changes:**

1. **inventory-product-list.component.html**
   - Replace `<div class="c-table-wrap">` + `<table>` + `<thead>`/`<tbody>` with a structure like recipe-book:
     - `<section class="table-area">` (or re-use `main-content` and add a `table-area` inside for the list only).
     - `<div class="table-header">` with one div per column: `col-name`, `col-category`, `col-allergens`, `col-supplier`, `col-unit`, `col-price`, `c-col-actions`, each with the same classes and click/keyboard handlers as current `<th>` (e.g. `c-sortable-header` where applicable).
     - `<div class="table-body">` with `display: grid` and a column template.
     - Each data "row" is a wrapper div with `display: contents` and class e.g. `product-grid-row`; its children are divs with the same column classes (`col-name`, `col-category`, ...). Move current `<td>` content into those divs.
     - Empty state: one full-width div inside `table-body` (e.g. `no-results` spanning all columns) with the same empty-state content as now.
   - Add ARIA for accessibility: `role="table"` on the table-area or wrapper, `role="row"` on each row div, `role="columnheader"` on header divs, `role="cell"` on cell divs (and optionally `role="rowgroup"` for header/body).

2. **inventory-product-list.component.scss**
   - Define a grid template for the product list columns (e.g. `$inventory-grid-template` with column widths/fr for name, category, allergens, supplier, unit, price, actions).
   - Style `.table-area` like recipe-book: flex column, overflow hidden, glass styling.
   - `.table-header`: `display: grid; grid-template-columns: $inventory-grid-template;` and the same `& > *` padding/background/border as recipe-book.
   - `.table-body`: `display: grid; grid-template-columns: $inventory-grid-template; grid-auto-rows: auto; overflow-y: auto;` and hide scrollbar if desired.
   - `.product-grid-row { display: contents; }`.
   - Target cell divs by class (e.g. `.product-grid-row > .col-name`, `.col-unit`, ...) for borders, padding, alignment. Keep existing rules for `.col-unit`/`.col-price` flex inputs, allergen pills, low-stock badge, etc., but apply them to divs instead of `td`.
   - Remove or replace any `.inventory-product-table`/`table`/`thead`/`tbody`/`th`/`td` selectors with the new class-based selectors.

3. **No change** to `src/styles.scss` for `.c-sortable-header`; it will apply to header divs and work as-is.

**Result:** Inventory list looks the same but uses the same grid-of-divs pattern as recipe-book. One layout style; engine classes behave consistently. Optional later: add a carousel column on narrow viewports (e.g. category/allergens/supplier) like recipe-book.
