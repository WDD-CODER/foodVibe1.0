# Carousel title value + inventory list carousel

## 1. Carousel title shows the relevant value when switched (recipe-book)

**Goal:** When the user switches the carousel (header arrows), the visible title in the header should clearly show the column they switched to (e.g. Type, Labels, or Allergens).

**User choices:**
- **Remove the small label** (carousel-header-label-above) — it is redundant.
- **Add one explicit main title** that displays the current column name: a single element showing `getCarouselHeaderLabel_() | translatePipe` as the main carousel title when in carousel mode (mobile). Style it like a title; the sliding strip stays for layout/consistency with row cells.

**Changes:**
- [recipe-book-list.component.html](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html): Remove `span.carousel-header-label-above`. Add one main title element (e.g. a span or div with class such as `carousel-header-title`) bound to `{{ getCarouselHeaderLabel_() | translatePipe }}`, visible in carousel mode (mobile). Keep the sliding strip and arrows.
- [recipe-book-list.component.scss](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss): Remove or repurpose styles for `.carousel-header-label-above`. Add styles for the new main title (e.g. font size, weight) so it is the clear “value” when switched. On desktop the carousel header is not in carousel mode so title may be hidden; on mobile show the new title.

---

## 2. Apply the same carousel to the inventory list

**Goal:** On narrow viewport (max-width: 768px), collapse Category, Allergens, and Supplier into one carousel column (same pattern as recipe-book). Header has one main title (current column name) + sliding strip + prev/next; each row has one carousel cell with three slides; header arrows change the whole column, cell arrows change only that row.

**Changes:**

### 2.1 [inventory-product-list.component.ts](src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts)
- Import `CellCarouselComponent` and `CellCarouselSlideDirective` from `src/app/shared/cell-carousel/cell-carousel.component`. Add to `imports` array.
- Add `carouselHeaderIndex_ = signal(0)`, `carouselHeaderPrev()`, `carouselHeaderNext()` (wrap 0..2), and `getCarouselHeaderLabel_(): string` returning `'category' | 'allergens' | 'supplier'` based on `carouselHeaderIndex_()`.

### 2.2 [inventory-product-list.component.html](src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html)
- **Header:** Replace the three column headers (col-category, col-allergens, col-supplier) with one **carousel header** block: `div.carousel-header-wrap` containing (1) one main title `{{ getCarouselHeaderLabel_() | translatePipe }}` (no redundant small label), (2) `div.carousel-header-slide-strip` with `[style.transform]` bound to `carouselHeaderIndex_()`, with three divs (category, allergens, supplier) with same handlers and `carousel-header-cell`, (3) prev/next buttons with keyboard and aria-label (previous_column / next_column). Optional: `div.carousel-header-label` for mobile “Details” if desired.
- **Body rows:** Replace the three cells (col-category, col-allergens, col-supplier) with one **app-cell-carousel** with `[activeIndex]="carouselHeaderIndex_()"`, no `(indexChange)`, and three `cellCarouselSlide` divs (category, allergens, supplier) with same content and labels.

### 2.3 [inventory-product-list.component.scss](src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.scss)
- **Desktop:** Keep 7-column grid. `.carousel-header-wrap` is one grid cell spanning the three carousel columns (e.g. `grid-column: 2 / 5`), strip shows all three headers side-by-side (`width: 100%`, `transform: none`), `.carousel-header-arrow { display: none }`. Main title hidden or not used on desktop.
- **Mobile (max-width: 768px):** 5-column grid (e.g. `2fr 1fr 6.25rem 6rem 80px`). `.carousel-header-wrap`: position relative, overflow hidden, sliding strip 300%, transform from component. One main title visible (current column name). Arrows opacity 0, hover 1; match recipe-book. `.table-body` and `.product-grid-row` use same 5-column template; app-cell-carousel occupies one column.

### 2.4 Grid template
- Desktop: `$inventory-grid-template` with seven columns; carousel wrapper spans three.
- Mobile: `$inventory-grid-mobile` (e.g. 2fr 1fr 6.25rem 6rem 80px) for header and body; carousel is one column.

**Result:** Recipe-book carousel header shows one clear title (the switched-to column name); small label removed. Inventory list gets the same carousel pattern on mobile with one main title, sliding strip, and row carousels; header arrows move whole column, cell arrows move only that row.
