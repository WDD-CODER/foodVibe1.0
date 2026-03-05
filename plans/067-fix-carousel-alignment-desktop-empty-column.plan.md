# Fix carousel alignment, desktop layout, and empty column

## Root cause analysis

All three issues trace back to two fundamental problems with how the carousel interacts with RTL:

### 1. `align-items: center` + 300% strip = wrong initial position

Every carousel wrap uses `align-items: center` in a column flex. Since the strip is 300% wide, centering it means the **middle third** (second cell) is visible at `translateX(0)` instead of the first cell. This is why selecting "allergens" in the header shows "category" in the cells.

### 2. `direction: ltr` on the strip conflicts with RTL container

The strip was set to `direction: ltr`, which causes the strip children to lay out left-to-right while the container is RTL. Combined with a **negative** `translateX`, the transform slides the strip the wrong way. This is also why the third column appears empty.

### 3. Inventory desktop: no cell styling on carousel slides

On desktop, `app-cell-carousel` uses `display: contents`, so its child slides become direct grid items. The SCSS only styles `product-grid-row > app-cell-carousel`, not the individual slides. Recipe-book works because it has desktop-only selectors for `.col-type`, `.col-labels`, `.col-allergens`; inventory has no equivalent.

---

## Fix plan

### A. Remove `direction: ltr` everywhere (4 list SCSS + cell-carousel)

Remove `direction: ltr` from the mobile strip in recipe-book-list, inventory-product-list, equipment-list, supplier-list SCSS. Remove from `.carousel-cell` in cell-carousel.component.scss. Remove `display: flex; align-items: center; justify-content: center` from `.carousel-header-cell` in all 4 list SCSS files.

### B. Fix wrap alignment: `center` to `flex-start` (4 SCSS files)

In the mobile breakpoint, change carousel wrap from `align-items: center` to `align-items: flex-start` in all 4 lists.

### C. Flip the transform sign (4 HTML templates)

Change FROM: `'translateX(' + (-carouselHeaderIndex_() * 100 / 3) + '%)'` TO: `'translateX(' + (carouselHeaderIndex_() * 100 / 3) + '%)'` in recipe-book-list, inventory-product-list, equipment-list, supplier-list HTML.

### D. Fix inventory desktop cell styling

Add `@media (min-width: 769px)` block in inventory-product-list.component.scss for `.product-grid-row .col-category`, `.col-allergens`, `.col-supplier` (display flex, padding, border, background, hover) matching recipe-book pattern.

---

## Summary

- **a. Broken desktop layout**: Fixed by step D.
- **b. Header/cell mismatch**: Fixed by steps B + C.
- **c. Always-empty column**: Fixed by steps A + C.
