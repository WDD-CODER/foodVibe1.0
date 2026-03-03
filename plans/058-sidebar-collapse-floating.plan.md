# Sidebar Collapse and Floating Overlay Fixes

Unify sidebar collapse, floating overlay, border-radius, and close icon behavior across inventory and recipe-book pages.

---

## 1. Inventory: Full collapse to width 0

The inventory panel currently collapses to a 48px icon strip. It should collapse fully to 0 like recipe-book.

**inventory-product-list.component.scss**
- Remove `$panel-width-collapsed: 48px` variable (line 4)
- Change `.filter-panel.collapsed` from `width: $panel-width-collapsed` / `min-width: $panel-width-collapsed` to `width: 0` / `min-width: 0`
- Add `border-inline-start-width: 0` to `.collapsed` (matching recipe-book)
- Remove the hover-driven opacity logic on `.panel-toggle-icon lucide-icon` since the icon strip is no longer visible when collapsed

**inventory-product-list.component.html**
- Wrap the `<button class="panel-toggle-icon">` in `@if (isPanelOpen_())` so it only shows when open (matching recipe-book pattern)

---

## 2. Floating sidebar at first breakpoint (both pages)

At `$break-mobile` (768px), the sidebar becomes a floating overlay on top of the list when open and completely hidden when closed.

**Both SCSS files** — inside the existing `@media (max-width: 768px)` block:
- Container: single-column grid so table takes full width; `position: relative`
- `.filter-panel`: `position: absolute`, `inset-block: 0`, `inset-inline-start: 0`, `z-index: 10`, `max-height: 100%`

---

## 3. Switch border-radius direction (both pages)

Panels sit on the right in RTL; outer edge (right side) should be rounded.

**Both SCSS files** — in `.filter-panel`:
- Change `border-radius: var(--radius-lg) 0 0 var(--radius-lg)` to `border-radius: 0 var(--radius-lg) var(--radius-lg) 0`

---

## 4. Close icon = chevron-left (both pages)

**inventory-product-list.component.html**: Change panel toggle icon to `name="chevron-left"` (remove conditional panel-right-close/panel-left-close).

**recipe-book-list.component.html**: Change `name="chevron-right"` to `name="chevron-left"`.

---

## Files to edit

| File | Changes |
|------|---------|
| inventory-product-list.component.html | Wrap toggle in `@if`, change icon to `chevron-left` |
| inventory-product-list.component.scss | Full collapse, border-radius, floating at breakpoint |
| recipe-book-list.component.html | Change icon to `chevron-left` |
| recipe-book-list.component.scss | Border-radius, floating at breakpoint |
