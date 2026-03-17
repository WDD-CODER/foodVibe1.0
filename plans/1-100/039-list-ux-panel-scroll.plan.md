# List UX: Panel Side, Toggle Icon, Scrollbars, Recipe Actions

## Overview

Move the filter panel to the visual right, replace the panel toggle button with a hover-reveal arrow icon with slow opacity transition, hide scrollbars on scrollable containers, and remove the redundant cook and history action buttons from the recipe book table.

## a. Move sidebar (filter panel) to the right

Swap grid column order so the panel is the first column and the table is the second. In RTL, the first column is on the visual right.

- `grid-template-columns: 1fr auto` → `grid-template-columns: auto 1fr`
- `grid-template-areas: "header header" / "table panel"` → `"header header" / "panel table"`
- Optional: border-radius on `.filter-panel` from `0 var(--radius-lg) var(--radius-lg) 0` to `var(--radius-lg) 0 0 var(--radius-lg)`

Files: recipe-book-list.component.scss, inventory-product-list.component.scss.

## b. Replace panel toggle button with hover-reveal arrow icon

- HTML: Use a focusable/clickable wrapper (e.g. `<button type="button" class="panel-toggle-icon">`) containing only the lucide-icon; keep aria-label and (click)="togglePanel()".
- SCSS: Wrapper transparent; icon `opacity: 0`. On `.filter-panel:hover` (or wrapper hover), icon `opacity: 1`. `transition: opacity 0.4s ease 0.15s`.

Files: both list component HTML and SCSS.

## c. Hide default scrollbar on scrolling containers

Apply to `.table-body` and `.filter-panel` (and `.panel-content` if it scrolls):

- `scrollbar-width: none;`
- `-ms-overflow-style: none;`
- `&::-webkit-scrollbar { display: none; }`

Files: both list component SCSS.

## d. Remove redundant cook and history buttons from recipe book table

Delete the Cook and History action buttons from recipe-book-list.component.html. Keep Edit and Delete. Remove `.action-btn.cook` and `.action-btn.history` from recipe-book-list.component.scss if present.

Files: recipe-book-list.component.html, recipe-book-list.component.scss.
