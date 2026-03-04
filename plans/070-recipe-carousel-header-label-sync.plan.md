# Recipe-book carousel: dynamic header label by visible column

## Current behavior

- In **carousel mode** (mobile, max-width 768px), recipe-book-list shows a single header label (`.carousel-header-label`) hardcoded to **"details"**, while each row's `app-cell-carousel` has three slides: **type**, **labels**, **allergens** (each with `cellCarouselSlide` and a `label`).
- Row carousels are **independent** (no `activeIndex` binding), so each row can show a different slide and there is no single "current column" to reflect in the header.
- CellCarouselComponent has an `activeIndex` **input** (used in equipment-list and supplier-list to drive all rows from the header) but **no output** when the user clicks prev/next inside a cell, so the parent cannot sync when the user "spins" the carousel from a row.

## Goal

- The single visible header label in carousel mode should show **type**, **labels**, or **allergens** according to the column currently in view.
- When the user spins the carousel (e.g. to the right) from any row, the header label should update to match.
- All row carousels should stay on the same slide index so the header always matches what the user sees.

## Approach

1. **Single source of truth for index** in recipe-book-list: introduce `carouselHeaderIndex_` (0 = type, 1 = labels, 2 = allergens) and drive every row carousel from it via `[activeIndex]`.
2. **Header label** from that index: show `getCarouselHeaderLabel_() | translatePipe` instead of the fixed "details".
3. **Sync when user spins from a cell**: add an output on CellCarouselComponent so that when the user clicks prev/next inside a cell, the parent can update `carouselHeaderIndex_` and the header label updates; all rows stay in sync because they are bound to the same `activeIndex`.

Optional: add header prev/next buttons (like equipment-list) so the user can change the column from the header as well.

---

## Implementation

### 1. CellCarouselComponent: emit index when user changes slide

- Add an `Output`: e.g. `activeIndexChange = new EventEmitter<number>()`.
- In `next()` and `prev()`, after updating `currentIndex`, emit the new index: `this.activeIndexChange.emit(this.currentIndex())`.

### 2. Recipe-book-list: shared index and dynamic header label

**TS:** Add `carouselHeaderIndex_ = signal(0)` and `getCarouselHeaderLabel_()` returning 'type' | 'labels' | 'allergens' based on index.

**HTML:** Replace static "details" with `{{ getCarouselHeaderLabel_() | translatePipe }}`; on each `app-cell-carousel` add `[activeIndex]="carouselHeaderIndex_()"` and `(activeIndexChange)="carouselHeaderIndex_.set($event)"`.

---

## Summary

| Item                             | Action                                                                 |
|----------------------------------|------------------------------------------------------------------------|
| **CellCarouselComponent**        | Add `activeIndexChange` output; emit new index in `next()` and `prev()`. |
| **RecipeBookListComponent (TS)** | Add `carouselHeaderIndex_` signal and `getCarouselHeaderLabel_()`.    |
| **Recipe-book-list (HTML)**      | Header label: `getCarouselHeaderLabel_() | translatePipe`; bindings on carousel. |
