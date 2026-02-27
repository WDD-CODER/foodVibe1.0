---
name: Sidebar filter UX
overview: Implement consistent sidebar UX for recipe book and inventory: collapsible filter categories, sticky desktop sidebar, deterministic open state by viewport, and mobile swipe-only close behavior.
todos:
  - id: add-collapsible-categories
    content: Add expandable category state/handlers in recipe and inventory components; render options conditionally by expanded state.
  - id: fix-recipe-category-keys
    content: Normalize recipe filter category keys for dictionary translation compatibility and keep filtering behavior intact.
  - id: desktop-sticky-open-default
    content: Update desktop sticky/sidebar CSS and init logic so sidebar is open on route entry for desktop.
  - id: mobile-swipe-close
    content: Implement mobile swipe-only close flow, hide mobile close button, and keep hamburger open trigger.
  - id: verify-sidebar-ux
    content: Validate desktop/mobile interactions and translation output on both pages.
---

# Sidebar Filter UX Plan

## Goals

- Make filter categories collapsible so options are shown only when their category header is expanded.
- Keep sidebar accessible while scrolling long lists (sticky desktop behavior).
- Ensure route-entry behavior is predictable: open on desktop at first render, hidden on mobile until hamburger press.
- Fix category label translation mismatch causing English display in recipe filters.
- On mobile, remove close button and close sidebar only with right-swipe gesture.

## Files To Update

- [recipe-book-list.component.ts](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts)
- [recipe-book-list.component.html](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html)
- [recipe-book-list.component.scss](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss)
- [inventory-product-list.component.ts](src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts)
- [inventory-product-list.component.html](src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html)
- [inventory-product-list.component.scss](src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.scss)

## Implementation Details

- Add `expandedFilterCategories_` state in both components, plus `toggleFilterCategory(name)` and `isCategoryExpanded(name)` helpers.
- Initialize filter category expansion as collapsed by default; render only category headers initially.
- In both templates: convert each category header into an interactive button/header row; show nested `.filter-options` only when that category is expanded; add expanded visual state class for active category color change.
- Keep existing checkbox filtering logic unchanged, but hide options unless parent category is expanded.
- Translation fix in recipe book: normalize category keys from mixed format (e.g. `Main-category`) to dictionary-compatible keys (e.g. `main_category`) for display; keep value-level filtering semantics unchanged.
- Desktop sticky: sidebar container and internal content use sticky constraints with viewport-aware max height and internal scroll; preserve table/list independent scrolling.
- Route-entry: on init set sidebar open if desktop, closed if mobile; add viewport listener so resizing keeps expected behavior.
- Mobile: remove/hide close button; hamburger opens; swipe-close gesture (touch start/move/end; if dragged right >= 50% panel width, close and finish animation; otherwise snap back open).

## Validation

- Desktop (both pages): sidebar opens by default; category options hidden until category click; expanded category highlight; sidebar visible while scrolling.
- Mobile (both pages): sidebar starts hidden; hamburger opens; no close X; right swipe closes when threshold crossed.
- Translation: recipe filter category labels render in Hebrew.
