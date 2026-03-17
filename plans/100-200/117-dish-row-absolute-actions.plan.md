---
name: Dish row absolute actions
overview: Replace the dish-name-cell grid with a layout where price and trash are absolutely positioned on the end side, and the dish name (and search) is centered in the available space, with reserved padding so text never overlaps the buttons.
---

# Dish row: absolute action buttons + centered text

## Current state

- [menu-intelligence.page.scss](src/app/pages/menu-intelligence/menu-intelligence.page.scss): `.dish-name-cell` uses **grid** (`grid-template-columns: 1fr 10% auto`) with three columns: dish name+meta, sell price, trash.
- Dish name is already visually centered in the **viewport** via `.dish-name-meta`: `width: 100vw; margin-inline-start: calc(50% - 50vw)`.
- [menu-intelligence.page.html](src/app/pages/menu-intelligence/menu-intelligence.page.html) (242–295): one `.dish-name-cell`; when a recipe is selected it contains `.dish-name-meta-wrap`, `.dish-sell-price`, and `.dish-remove`; when searching it only has `.dish-search-wrap`.

## Recommendation

Using **absolute positioning for the actions** and **centered text** (content center within the paper).

## Implementation

### SCSS

- **.dish-name-cell**: Remove grid; keep `position: relative`; add `padding-inline-end` (~5.5–6rem) to reserve space for price + trash.
- **.dish-name-meta**: Content center — remove `width: 100vw` and `margin-inline-start: calc(50% - 50vw)`; use `text-align: center` and center within the cell.
- **.dish-sell-price**: `position: absolute`, `top: 50%`, `transform: translateY(-50%)`, `inset-inline-end: 2.25rem`; remove margin-inline rules.
- **.dish-remove**: `position: absolute`, `top: 50%`, `transform: translateY(-50%)`, `inset-inline-end: 0.25rem`.

### HTML

No structural change.

## Summary

| Item           | Action                                                          |
| -------------- | --------------------------------------------------------------- |
| Cell layout    | Drop grid; use relative + padding-inline-end for button reserve |
| Price          | Absolute, end side, vertically centered                         |
| Trash          | Absolute, end side, vertically centered                         |
| Text alignment | Content center (within paper)                                   |
| RTL            | Use inset-inline-end and padding-inline-end                     |
