# Header carousel shift (move left/right, change all columns)

## Goal

Add an option on **top of the header** to move the carousel content left/right (like the per-cell arrows). When used, that control drives a **single global index**: the header and every row's carousel show the same slide (Type / Labels / Allergens), so all columns change together.

## Current behavior

- **Desktop**: Table grid has 6 columns (name, type, labels, allergens, cost, actions). Header uses `carousel-header-wrap` with `display: contents`, so the three carousel headers are separate grid cells. Each row's `app-cell-carousel` also uses `display: contents`, so three grid cells (type, labels, allergens) are visible per row. No shared index.
- **Mobile**: One carousel column; header shows "Details"; each row's carousel shows one slide at a time with prev/next; each row has its own index.
- **Cell carousel** ([cell-carousel.component.ts](src/app/shared/cell-carousel/cell-carousel.component.ts)): Owns `currentIndex`; has `next()`/`prev()`; no external control.

## Approach

1. **Single source of truth in the list**
   - In [recipe-book-list.component.ts](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts): add `carouselHeaderIndex_ = signal(0)` and methods e.g. `carouselHeaderPrev()` / `carouselHeaderNext()` that update it with wrap (0 ↔ 2). This index applies to both header and all row carousels.

2. **Cell carousel: optional external index**
   - In [cell-carousel.component.ts](src/app/shared/cell-carousel/cell-carousel.component.ts):
     - Add optional `activeIndex = input<number>()`.
     - When `activeIndex` is set, keep `currentIndex` in sync (e.g. effect that writes `currentIndex.set(activeIndex())` when `activeIndex()` changes), and when user clicks prev/next, emit the new index so the parent can update the global index.
     - Add `indexChange = output<number>()`; in `next()`/`prev()` after updating `currentIndex`, emit `indexChange.emit(this.currentIndex())` so the list can set `carouselHeaderIndex_.set(value)`.
   - In the list template, pass `[activeIndex]="carouselHeaderIndex_()"` and `(indexChange)="carouselHeaderIndex_.set($event)"` to each `<app-cell-carousel>`, so header and all rows stay in sync.

3. **Header UI: sliding strip + prev/next**
   - In [recipe-book-list.component.html](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html) (lines 34–45):
     - Add two buttons (e.g. "previous" / "next") that call `carouselHeaderPrev()` and `carouselHeaderNext()`, with keyboard support and `aria-label` (e.g. "Previous column" / "Next column").
     - Make the header carousel area a **single sliding strip** that shows one column at a time, aligned with how the cell carousel works:
       - Wrap the three header cells (type, labels, allergens) in an inner strip.
       - Use a wrapper with `overflow: hidden` and the inner strip with `transform: translateX(-carouselHeaderIndex_() * columnWidth)` (or equivalent %) so the same "window" shows Type, Labels, or Allergens in turn.
   - **Desktop**: Today the header has three grid cells (display: contents). Change so the carousel header is **one grid cell that spans the three carousel columns** (e.g. `grid-column: 2 / 5`), with the sliding strip + prev/next inside. That way the header has one "slot" whose content moves left/right.
   - **Mobile**: Keep the single "Details" label but add the same prev/next buttons so the global index is controllable from the header; the row carousels already show one slide and will sync via `activeIndex`.

4. **Layout and styles**
   - In [recipe-book-list.component.scss](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss):
     - **Desktop**: `.carousel-header-wrap` becomes one grid cell spanning the three carousel columns: e.g. `grid-column: 2 / 5`, `overflow: hidden`, and an inner strip (flex or grid) with three equal-width segments; `transform: translateX(...)` based on a CSS variable or class tied to the current index (or use inline style from the component, e.g. `[style.transform]` bound to `carouselHeaderIndex_()`).
     - Follow the existing [cssLayer skill](.assistant/skills/cssLayer/SKILL.md) and [src/styles.scss](src/styles.scss) tokens; use logical properties and the five-group vertical rhythm where applicable.
   - Ensure the header strip's column widths align with the body's carousel column (one logical column when we show one slide).

5. **Accessibility and UX**
   - Header prev/next: `role="button"`, `tabindex="0"`, `(keydown.enter)` and `(keydown.space)` with `preventDefault` for space.
   - Optional: disable or hide "previous" when index is 0 and "next" when index is 2 (or keep wrap and rely on aria-labels).

## Optional refinement

- If you want the **body** to also show only one carousel column on desktop (so the table has 4 columns: name, one carousel column, cost, actions), the grid would change from 6 to 4 columns and the carousel would always render in "single slide" mode (like mobile). That would make the header and body columns align 1:1. The plan above stays valid; the main decision is whether desktop keeps three visible carousel columns (with header sliding and index only syncing which slide is "active") or collapses to one carousel column to match the header. Recommendation: **collapse to one carousel column on desktop** so "move header left/right" literally moves the one visible column for the whole table; that matches "change all the columns" with minimal ambiguity.

## Files to touch

- [cell-carousel.component.ts](src/app/shared/cell-carousel/cell-carousel.component.ts) — add `activeIndex` input, `indexChange` output, sync and emit.
- [recipe-book-list.component.ts](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts) — add `carouselHeaderIndex_`, `carouselHeaderPrev()`, `carouselHeaderNext()`.
- [recipe-book-list.component.html](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html) — header: sliding strip structure, prev/next buttons; body: bind `[activeIndex]` and `(indexChange)` on each `<app-cell-carousel>`.
- [recipe-book-list.component.scss](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss) — carousel header as one cell, overflow hidden, inner strip and transform (and, if chosen, 4-column grid so body has one carousel column on desktop).

## Summary

- One global index in the list; header prev/next and (optionally) row carousel prev/next update it.
- Cell carousel gains optional `activeIndex` + `indexChange` so all rows and the header stay in sync.
- Header gets a sliding strip and prev/next so "moving" the header moves all columns the same way as the cells inside.
