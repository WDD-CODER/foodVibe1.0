# Mobile UI Audit Report — Phone (375×812)

**Date:** 2026-03-29
**Viewport:** 375×812 (iPhone 13/14/15 baseline)
**Auth:** Signed up as `auditchef` / `Audit1234` (backend auth, MongoDB)
**Data:** Imported from `foodvibe-backup-2026-03-28.json` (98 products, 22 recipes/dishes, 67 equipment, 5 venues, 7 suppliers)
**Pages audited:** 10 (+ bonus interactive session on recipe-book filter)
**Total issues:** 26 unique issues across 5 severity levels

---

## Agent Quick-Start

Before running any fix:
1. Dev server must be on `http://localhost:4200`, backend on `http://localhost:3000`
2. Log in via auth modal as `auditchef` / `Audit1234` to access auth-gated pages
3. All breakpoint fixes should be scoped to `@media (max-width: 620px)` — that's when the bottom nav appears
4. The CSS class names, file paths, and computed values in this report were verified live via Playwright on 2026-03-29

---

## Summary by Severity

| Severity | Count | Description |
|----------|-------|-------------|
| **BLOCKING** | 1 | FAB completely inaccessible — affects every page |
| **LAYOUT** | 6 | Overflow, wrapping, cramped columns, broken UX |
| **TOUCH** | 14 | Touch targets below 44×44px minimum |
| **A11Y** | 5 | Untranslated i18n keys rendered as raw key strings |
| **INFO** | 1 | Cosmetic — tooltip visible before interaction |

---

## Cross-Cutting Issues

---

### [BLOCKING] All FABs hidden behind bottom nav — Every page

**Root cause:** All FABs use `z-index: 90`. The bottom nav uses `z-index: 200`. At ≤620px the bottom nav is fixed at the bottom and every FAB bottom edge (y=804) overlaps with the nav's top edge (y=756), and the nav renders on top.

#### Affected elements and their SCSS sources:

**FAB 1 — Quick Actions (Dashboard, Inventory, Recipe Book, Menu Library, Equipment)**
- DOM: `div.hero-fab-container > button.fab-main.grow-only`
- Computed: `position: fixed; z-index: 90; bottom: 8px`
- BoundingRect: `top=756, bottom=804, width=48, height=48`
- **SCSS source:** `src/app/core/components/hero-fab/hero-fab.component.scss`

**FAB 2 — AI Add Recipe (Recipe Book only)**
- DOM: `button.fab-action` inside `.hero-fab-container > .fab-actions`
- Part of the same `.hero-fab-container` wrapper — same fix applies

**FAB 3 — Cook Approve (Cook View, Recipe Builder)**
- DOM: `button.approve-stamp`
- Computed: `position: fixed; z-index: 90; bottom: 8px`
- BoundingRect: `top=724, bottom=804, width=80, height=80` — bottom 48px overlap nav
- **SCSS source:** `src/app/shared/approve-stamp/approve-stamp.component.scss`

**Bottom nav reference values:**
- DOM: `nav.bottom-nav`
- Computed: `position: fixed; z-index: 200; height: 56px`
- BoundingRect: `top=756, bottom=812, width=360`
- **SCSS source:** `src/app/core/components/header/header.component.scss`

**Fix — apply to both SCSS files:**
```scss
// hero-fab.component.scss AND approve-stamp.component.scss
@media (max-width: 620px) {
  .hero-fab-container,
  .approve-stamp {
    bottom: calc(56px + env(safe-area-inset-bottom, 0px) + 12px);
    z-index: 210;
  }
}
```

---

### [TOUCH] Bottom nav labels too small — All pages

**Element:** Anonymous `<span>` inside each `nav.bottom-nav a` link
**Computed:** `font-size: 10px`
**Minimum for legibility:** 12px
**SCSS source:** `src/app/core/components/header/header.component.scss`

**Fix:**
```scss
@media (max-width: 620px) {
  .bottom-nav a span {
    font-size: 12px;
  }
}
```

---

### [TOUCH] Row checkboxes 12×12px — Inventory, Recipe Book, Equipment, Venues, Suppliers

**Element:** `input[type="checkbox"]` (no CSS class on the input itself)
**Wrapper element:** `div.list-row-checkbox` — renders at 20×20px
**Computed checkbox size:** `width: 12px; height: 12px`
**WCAG minimum touch target:** 44×44px
**SCSS source:** `src/app/shared/list-selection/list-row-checkbox.component.scss`

**Fix:**
```scss
@media (max-width: 620px) {
  .list-row-checkbox {
    min-width: 44px;
    min-height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}
```

---

### [TOUCH] Icon action buttons 24px wide — Inventory, Recipe Book, Equipment, Venues, Suppliers

**Element:** `button.c-icon-btn` (edit), `button.c-icon-btn.danger` (delete)
**Computed:** `width: 24px; height: 44px` — height is fine, **width is the violation**
**aria-label values:** `"עריכה"` (edit), `"מחיקה"` (delete)
**Global SCSS source:** `src/styles.scss` (`.c-icon-btn` is a global component class)
**Also used in:** inventory, recipe-book, equipment, venue, supplier list component SCSS files

**Fix:**
```scss
// src/styles.scss — inside existing .c-icon-btn definition or add breakpoint:
@media (max-width: 620px) {
  .c-icon-btn {
    min-width: 44px;
  }
}
```

---

### [TOUCH] Carousel prev/next arrows 24px wide — Inventory, Recipe Book, Equipment, Venues, Suppliers

**Two arrow types exist:**

**Type A — Column-switching header arrows**
- DOM: `button.carousel-header-arrow.prev`, `button.carousel-header-arrow.next`
- aria-labels: `"Previous column"`, `"Next column"`
- Computed: `width: 24px; height: 50px` — width is the violation
- **SCSS source:** `src/app/shared/carousel-header/carousel-header.component.scss`

**Type B — Row-level slide arrows (recipe book, inline carousels)**
- DOM: `button.carousel-arrow.carousel-arrow-prev`, `button.carousel-arrow.carousel-arrow-next`
- aria-labels: `"Previous slide"`, `"Next slide"`
- Computed: `width: 24px; height: 82px` — width is the violation
- **SCSS source:** `src/app/shared/carousel-header/carousel-header.component.scss`

**Fix:**
```scss
// carousel-header.component.scss
@media (max-width: 620px) {
  .carousel-header-arrow,
  .carousel-arrow {
    min-width: 44px;
  }
}
```

---

### [TOUCH] Auth username button 71×31px — All pages

**Element:** `button.auth-username-btn`
**Computed:** `width: 71px; height: 31px` — height is the violation
**Location:** Top navigation bar (top-right in RTL layout)
**SCSS source:** `src/app/core/components/header/header.component.scss`

**Fix:**
```scss
@media (max-width: 620px) {
  .auth-username-btn {
    min-height: 44px;
  }
}
```

---

## Per-Page Results

---

### 1. Dashboard (`/dashboard`)

**Status:** PARTIAL PASS

#### [TOUCH] Dashboard section tab buttons — height 37px

**Element:** `button.header-btn`, `button.header-btn.header-btn--trash`
**Computed:** `width: 83–118px; height: 37px; font-size: 13px`
**Tabs:** הגדרות ליבה (93×37), מיקומי אירוע (118×37), ספקים (85×37), אשפה (83×37)
**Container:** `nav[aria-label="Dashboard sections"]`
**SCSS source:** `src/app/pages/dashboard/components/dashboard-header/dashboard-header.component.scss`

**Fix:**
```scss
@media (max-width: 620px) {
  .header-btn {
    min-height: 44px;
  }
}
```

#### [TOUCH] Card action buttons — height 27px

**Element:** `button.link-btn`
**Computed:** `height: 27px; font-size: 12.8px`
**Examples:** "צפייה במלאי" (67×27), "הוסף מוצר" (55×27), "צפייה בספר מתכונים" (109×27)
**Location:** Inside KPI `<article>` cards in main dashboard overview
**SCSS source:** `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.scss`

**Fix:**
```scss
@media (max-width: 620px) {
  .link-btn {
    min-height: 44px;
    padding-block: 10px;
  }
}
```

#### [A11Y] `low_stock` KPI card — untranslated i18n key

**Element:** `<h2 class="kpi-label">{{ 'low_stock' | translatePipe }}</h2>`
**Template source:** `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html:69`
**Rendered text:** `"low_stock"` (raw key, not translated)
**Fix:** Add `"low_stock": "מלאי נמוך"` to the translation dictionary via `TranslationService`

---

### 2. Inventory List (`/inventory/list`)

**Status:** PARTIAL PASS

Cross-cutting issues only (checkboxes, icon buttons — see above).

**Confirmed working:**
- No horizontal overflow (`scrollWidth = 375`)
- `.app-content` has `padding-bottom: 56px` — content clears bottom nav ✓
- Filter panel `.filter-panel.collapsed` is off-screen at `left: 390px` (translateX(330px)) ✓
- 98 products rendered with real data ✓

---

### 3. Recipe Book (`/recipe-book`)

**Status:** PARTIAL PASS

#### [LAYOUT] Filter backdrop does not close panel on tap

**Root cause:** The backdrop element is `div.mobile-nav-backdrop`. When opened, display changes to block — but **no `(click)` event handler is wired to it**. Tapping backdrop leaves panel open; only X button closes it.

**Verification:** `div.mobile-nav-backdrop.onclick === null` confirmed via Playwright evaluate.

**Filter panel:**
- DOM: `div.filter-panel.collapsed` → removes `.collapsed` when open
- Computed (collapsed): `position: fixed; transform: matrix(1,0,0,1,330,0)` (translateX(330px), off-screen)
- **SCSS source:** `src/app/shared/list-shell/list-shell.component.scss`

**Backdrop:**
- DOM: `div.mobile-nav-backdrop`
- Computed (collapsed): `display: none; pointer-events: none`
- **SCSS source:** `src/app/core/components/header/header.component.scss`
- **Fix:** In `ListShellComponent` or `RecipeBookListComponent` — add `(click)="closeFilters()"` to the backdrop `<div>`

#### [INFO] Price tooltip visible on page load

**Element:** `div.cost-tooltip.cost-tooltip-fixed`
**Rendered text:** `"מחיר עבור : 1 מנה"` visible on load before any interaction
**SCSS source:** `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss`
**Investigate:** Visibility condition — should show only on hover/focus

---

### 4. Menu Library (`/menu-library`)

**Status:** PARTIAL PASS

#### [TOUCH] Sort direction button — height 42px

**Element:** `button.sort-order-btn`
**Computed:** `width: 83px; height: 42px`
**SCSS source:** `src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.scss`

**Fix:** `@media (max-width: 620px) { .sort-order-btn { min-height: 44px; } }`

#### [TOUCH] Card icon action buttons — 36×36px

**Elements:** `button.action-btn.edit`, `button.action-btn.clone`, `button.action-btn.delete`
**Computed:** `width: 36px; height: 36px`
**SCSS source:** `src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.scss`

**Fix:** `@media (max-width: 620px) { .action-btn { min-width: 44px; min-height: 44px; } }`

---

### 5. Equipment List (`/equipment/list`)

**Status:** PARTIAL PASS — Cross-cutting issues only. 67 items rendered ✓

---

### 6. Venues List (`/venues/list`)

**Status:** FAIL

#### [LAYOUT] Carousel column extremely cramped — multi-line row inflation

**Computed cell values:**
- `.carousel-cell`: `width: 54px; height: 120px; white-space: normal`
- `.col-env.c-list-body-cell.carousel-slide-active`: `width: 30px; height: 67px; white-space: normal; min-width: 0px`
- Row `.venue-grid-row.c-list-row` inflates to ~120px height due to text wrapping

**Fix:**
```scss
// src/app/pages/venues/components/venue-list/venue-list.component.scss
@media (max-width: 620px) {
  .carousel-cell,
  .col-env {
    min-width: 80px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
```

#### [LAYOUT] Header row overflow — "הוסף מיקום" text wraps

"חזרה ללוח הבקרה" and "הוסף מיקום" share one row at 375px → "הוסף מיקום" wraps.
**Fix:** Stack buttons vertically at mobile, or use icon-only with sr-only text.

---

### 7. Supplier List (`/suppliers/list`)

**Status:** FAIL

#### [LAYOUT] Table unreadable at 375px — 5 data columns

**Column widths at 375px:** שם (88px), contact_person carousel (~54px), זמן אספקה (**35px**), linked_products (**35px**), פעולות (80px), Select (44px)

**Fix:** Implement card/stack layout at ≤620px — collapse non-essential columns into detail expansion.

#### [A11Y] Four untranslated i18n keys

| Raw key | Element | Class | Source |
|---------|---------|-------|--------|
| `supplier_list` | `<h2>` | `page-title` | `supplier-list.component.html:7` |
| `contact_person` | `<div>` | `col-contact c-grid-header-cell` | `supplier-list.component.html:46` |
| `linked_products` | `<div>` | `col-linked c-grid-header-cell` | `supplier-list.component.html:51` |
| `general.day_sun…sat` | `<div>` | `col-delivery c-list-body-cell` | `supplier-list.component.ts:32` |

**Fix:** Add to translation dictionary:
```
supplier_list → "רשימת ספקים" | contact_person → "איש קשר"
linked_products → "מוצרים מקושרים"
general.day_sun/mon/tue/wed/thu/fri/sat → "א'/ב'/ג'/ד'/ה'/ו'/ש'"
```

---

### 8. Cook View (`/cook/prep_015`)

**Status:** PARTIAL PASS

> Use `/cook/:recipeId` for real data — `/cook` alone shows empty state. `prep_015` = "רוטב לסלט איטריות".

#### [TOUCH] Multiplier chip buttons — both dimensions < 44px

**Elements:** `button.c-chip.cv-chip-btn` / `.cv-chip--active`
**Computed:** ½× (39×26), 1× (36×26), 2–4× (36×26)
**SCSS source:** `src/app/pages/cook-view/cook-view.page.scss`
**Fix:** `@media (max-width: 620px) { .cv-chip-btn { min-height: 44px; min-width: 44px; } }`

#### [TOUCH] Timer buttons — height 26px

**Element:** `button.step-time` — `width: 62px; height: 26px`
**SCSS source:** `src/app/pages/cook-view/cook-view.page.scss`
**Fix:** `@media (max-width: 620px) { .step-time { min-height: 44px; display: inline-flex; align-items: center; } }`

#### [TOUCH] Quantity stepper buttons — both dimensions < 44px

**Element:** `button.ctrl-btn` — `width: 32px; height: 30px`
**SCSS source:** `src/app/shared/counter/counter.component.scss` (shared — also affects Recipe Builder)
**Fix:** `@media (max-width: 620px) { .ctrl-btn { min-width: 44px; min-height: 44px; } }`

---

### 9. Recipe Builder (`/recipe-builder`)

**Status:** PARTIAL PASS — Requires auth (`authGuard`).

#### [TOUCH] Recipe name input — both dimensions < 44px

**Element:** `input.recipe-name-input` — `width: 48px; height: 34px`
**SCSS source:** `src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.scss`
**Fix:** `@media (max-width: 620px) { .recipe-name-input { min-height: 44px; width: 100%; } }`

#### [TOUCH] Type toggle chip — height 34px

**Element:** `button.type-toggle-btn` — `width: 62px; height: 34px`
**SCSS source:** `src/app/pages/recipe-builder/recipe-builder.page.scss`
**Fix:** `@media (max-width: 620px) { .type-toggle-btn { min-height: 44px; } }`

#### [TOUCH] Import from text button — height 30px

**Element:** `button.import-text-btn` — `width: 113px; height: 30px`
**SCSS source:** `src/app/pages/recipe-builder/recipe-builder.page.scss`
**Fix:** `@media (max-width: 620px) { .import-text-btn { min-height: 44px; } }`

---

### 10. Menu Intelligence (`/menu-intelligence`)

**Status:** PARTIAL PASS — Requires auth (`authGuard`).

#### [TOUCH] Four undersized controls

| Element | Class | Computed | Fix selector |
|---------|-------|----------|--------------|
| Event type btn | `.meta-trigger` | 202×35px | `min-height: 44px` |
| Category btn | `.section-title-plain` | 250×38px | `min-height: 44px` |
| Add dish btn | `.add-dish-btn.no-print` | 100×30px | `min-height: 44px` |
| Add course btn | `.add-section-btn.no-print` | 115×31px | `min-height: 44px` |
| Guest stepper | `.counter-pill-btn` | 32×34px | `min-width: 44px; min-height: 44px` |

**SCSS source:** `src/app/pages/menu-intelligence/menu-intelligence.page.scss`

**Bulk fix:**
```scss
@media (max-width: 620px) {
  .meta-trigger, .section-title-plain, .add-dish-btn, .add-section-btn, .counter-pill-btn {
    min-height: 44px;
  }
  .counter-pill-btn { min-width: 44px; }
}
```

---

## Recommended Fix Priority

### P1 — BLOCKING (~10 min)
| Fix | Files |
|-----|-------|
| FAB z-index + bottom clearance | `hero-fab.component.scss`, `approve-stamp.component.scss` |

### P2 — TOUCH Shared (~1 hr)
| Selector | File |
|----------|------|
| `.list-row-checkbox` → 44×44 | `list-row-checkbox.component.scss` |
| `.c-icon-btn` → `min-width: 44px` | `src/styles.scss` |
| `.carousel-header-arrow`, `.carousel-arrow` → `min-width: 44px` | `carousel-header.component.scss` |
| `.ctrl-btn` → 44×44 | `counter.component.scss` |
| `.auth-username-btn` → `min-height: 44px` | `header.component.scss` |
| `nav.bottom-nav a span` → `font-size: 12px` | `header.component.scss` |

### P3 — TOUCH Page-Specific (~30 min)
| Selector | File |
|----------|------|
| `.header-btn` | `dashboard-header.component.scss` |
| `.link-btn` | `dashboard-overview.component.scss` |
| `.sort-order-btn`, `.action-btn` | `menu-library-list.component.scss` |
| `.cv-chip-btn`, `.step-time` | `cook-view.page.scss` |
| `.recipe-name-input`, `.type-toggle-btn`, `.import-text-btn` | `recipe-builder` SCSS files |
| 5 selectors bulk fix | `menu-intelligence.page.scss` |

### P4 — LAYOUT (~2–4 hr)
| Issue | File | Approach |
|-------|------|----------|
| Filter backdrop close on tap | `ListShellComponent` or `RecipeBookListComponent` | Add `(click)="closeFilters()"` to `div.mobile-nav-backdrop` |
| Suppliers table | `supplier-list.component.html/scss` | Card/stack layout at ≤620px |
| Venues carousel column | `venue-list.component.scss` | Increase `.carousel-cell` min-width + ellipsis |
| Venues header row | `venue-list.component.html` | Stack buttons vertically |

### P5 — A11Y (~15 min)
Add 10 keys to `TranslationService`:
`low_stock`, `supplier_list`, `contact_person`, `linked_products`, `general.day_sun/mon/tue/wed/thu/fri/sat`

### P6 — INFO
`div.cost-tooltip.cost-tooltip-fixed` visible on recipe-book page load — investigate trigger condition.

---

## Reproduction Steps

1. Chrome DevTools → device toolbar → 375×812
2. `http://localhost:4200` → login as `auditchef` / `Audit1234`

**FAB bug:** Any page at ≤620px — Quick Actions/Approve button obscured by bottom nav

**Backdrop close bug:** `/recipe-book` → open filter → tap grey area outside panel → panel stays open

**Translation bug:** `/suppliers/list` → heading shows `"supplier_list"`, filter shows `"general.day_sun"`
