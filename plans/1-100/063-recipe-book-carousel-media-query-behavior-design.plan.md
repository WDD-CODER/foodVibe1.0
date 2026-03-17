# Recipe book carousel: media query, behavior, and design

## Goal

- **Carousel only on narrow viewport** (max-width: 768px). On full page (desktop) the table shows three separate columns (Type, Labels, Allergens) with no carousel UI.
- **Behavior:** Header arrows change the **whole column**; cell arrows change **only that row**.
- **Design (when carousel is active):** Header looks like one carousel cell: small label above the title, prev/next arrows **on hover only**, same style as row cells.

---

## 1. Carousel only inside media query (max-width: 768px)

**Current state:** The header carousel (sliding strip + arrows) is applied at **desktop** (min-width: 769px) in recipe-book-list.component.scss. Row cells use cell-carousel.component.scss, which already applies carousel layout only at max-width: 768px; on desktop the carousel uses `display: contents` and all three columns are visible.

**Target:**

- **Desktop (min-width: 769px):** Header shows three normal columns (Type, Labels, Allergens) with **no** sliding strip and **no** arrows. Keep `.carousel-header-wrap` as one grid cell (grid-column: 2 / 5) but make it a 3-column grid with no overflow; `.carousel-header-slide-strip` displays the three cells side-by-side (width 100%, no transform); `.carousel-header-arrow` is `display: none`.
- **Mobile (max-width: 768px):** Carousel applies in the header (one visible column, sliding strip, arrows) and in rows (already handled by `app-cell-carousel` at 768px).

**Files:** recipe-book-list.component.scss. Move carousel header rules from `@media (min-width: 769px)` into desktop = three columns + hide arrows; apply sliding strip and arrows only in `@media (max-width: 768px)`.

---

## 2. Behavior: header vs cell arrows

**Current state:** In recipe-book-list.component.html, each `<app-cell-carousel>` has `[activeIndex]="carouselHeaderIndex_()"` and `(indexChange)="carouselHeaderIndex_.set($event)"`, so any arrow click updates the global index.

**Target:** Header arrows set `carouselHeaderIndex_` (whole column). Cell arrows change only that row.

**Change:** Remove `(indexChange)="carouselHeaderIndex_.set($event)"` from `<app-cell-carousel>`. Keep `[activeIndex]="carouselHeaderIndex_()"`.

---

## 3. Design: header matches row cells (mobile only)

When the carousel is active (mobile): small label above the main title; arrows on hover only (opacity 0 default, opacity 1 on `.carousel-header-wrap:hover`); same size/position/style as cell arrows.

**Template:** Inside `.carousel-header-wrap`, add a small label (e.g. `<span class="carousel-header-label-above">`) bound to current column name via `getCarouselHeaderLabel_()` or computed from `carouselHeaderIndex_()` (0 → type, 1 → labels, 2 → allergens). Shown only in mobile layout (CSS).

**Styles:** In mobile block: style small label like cell `.carousel-label`; `.carousel-header-arrow` default `opacity: 0`, `.carousel-header-wrap:hover .carousel-header-arrow { opacity: 1 }`; match cell arrow size/position. Optional: `@media (hover: none)` with `opacity: 0.6` for touch.

---

## 4. Summary of edits

| Area | File | Change |
|------|------|--------|
| Media query | recipe-book-list.component.scss | Desktop: 3 header columns, hide arrows, no sliding. Mobile: carousel header (sliding strip, overflow, arrows, small label, hover-only arrows). |
| Behavior | recipe-book-list.component.html | Remove `(indexChange)="carouselHeaderIndex_.set($event)"` from `<app-cell-carousel>`. |
| Design (label) | recipe-book-list.component.html | Add small label bound to current column name (getCarouselHeaderLabel_ or computed). |
| Design (label + hover) | recipe-book-list.component.scss | Mobile: style small label; header arrows opacity 0, opacity 1 on wrap hover; match cell arrows. |

Optional: add method or computed in recipe-book-list.component.ts that returns translation key for current header index ('type' | 'labels' | 'allergens').

---

## Flow (mobile only)

- **Header arrows** → update `carouselHeaderIndex_` → all rows receive new `activeIndex` → whole column changes.
- **Cell arrows** → update only that carousel's internal index; no `indexChange` binding → that row only changes.
