---
name: Fix sidebar alignment and close on breakpoint
overview: "Fix two regressions: (1) small-screen sidebar top alignment and full-height behavior by reverting the vertical insets added in plan 155; (2) ensure the sidebar closes when the viewport shrinks below 768px by adding the breakpoint listener to the inventory list, which currently lacks it."
todos: []
isProject: true
---

# Fix sidebar alignment and close on breakpoint

## Root cause

### 1. Sidebar "aligned to bottom but not at the top"

In [list-shell.component.scss](src/app/shared/list-shell/list-shell.component.scss), the 768px block was changed (plan 155) to add `margin-block: 1rem` and `max-height: calc(100% - 2rem)`. Those make the overlay panel shorter and push it in from the top and bottom, so the panel no longer fills the list-container and the top is misaligned.

**Fix:** Remove `margin-block` and `max-height` from `.filter-panel` in the `@media (max-width: 768px)` block. Keep `inset-block: 0` and `inset-inline-start: 1rem`.

### 2. Sidebar stays open when screen shrinks below 768px

Inventory list has no `matchMedia` or `afterNextRender`; recipe-book, equipment, venues, suppliers all close the panel when viewport enters `(max-width: 768px)`.

**Fix:** Add the same breakpoint logic to [inventory-product-list.component.ts](src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts): `afterNextRender` + `matchMedia('(max-width: 768px)')` and close panel when `e.matches`. Optionally set initial `isPanelOpen_` from `getPanelOpen('inventory')` for consistency.

## Implementation

| File | Change |
|------|--------|
| list-shell.component.scss | In 768px block for `.filter-panel`: remove `margin-block: 1rem` and `max-height: calc(100% - 2rem)`. |
| inventory-product-list.component.ts | Add `afterNextRender`; in constructor run matchMedia and on match (init + change) set `isPanelOpen_.set(false)`. |
