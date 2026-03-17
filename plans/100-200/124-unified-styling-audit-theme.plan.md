# Unified Styling Audit and Theme Plan

## 1. Current design system (what you already have)

The app has a **Liquid Glass** design system defined in [src/styles.scss](src/styles.scss):

- **Global tokens** in `:root`: `--bg-glass`, `--bg-glass-strong`, `--bg-glass-hover`, `--border-glass`, `--blur-glass`, `--blur-nav`, `--shadow-glass`, `--shadow-card`, `--shadow-modal`, `--color-primary`, `--radius-*`, semantic (success/warning/danger), etc.
- **Engines** (reusable classes): `.c-glass-card`, `.c-glass-panel`, `.c-btn-primary`, `.c-btn-ghost`, `.c-input`, `.c-input-wrapper`, `.c-select`, `.c-modal-overlay`, `.c-modal-card`, `.c-modal-body`, `.c-input-stack`, `.c-dropdown`, `.c-page-title`, `.c-section-title`, `.c-icon-btn`, `.c-chip`, `.c-grid-header-cell`, `.c-list-row`, `.c-list-body-cell`, `.c-table-wrap`, `.c-data-table`, `.c-sortable-header`, `.c-col-actions`, `.c-empty-state`, `.c-filter-*`, etc.

Many pages and shared components already use these tokens and engines; the main issue is **inconsistent adoption** and **local duplication** (custom classes that repeat glass styling or use raw colors instead of tokens).

---

## 2. Page-by-page audit

### 2.1 Pages that already use the glass theme well

| Page | Notes |
|------|------|
| **Recipe Builder** [recipe-builder.page.scss](src/app/pages/recipe-builder/recipe-builder.page.scss) | Section cards use `--bg-glass-strong`, `--blur-glass`, `--shadow-glass`; logistics, buttons, inputs use tokens. Uses local classes (e.g. `section-card`) that mirror engine styles. |
| **Recipe Book (list)** | Renders via [list-shell](src/app/shared/list-shell/list-shell.component.scss) + [recipe-book-list](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss). List uses glass; HTML uses `c-btn-primary`, `c-input-wrapper`. Some raw rgba in recipe-book-list for borders/semantic states. |
| **Menu Library** | [menu-library-list](src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.scss) uses glass tokens throughout (event cards, filters, search, buttons). No engines in HTML (custom `.input-wrapper`, `.add-btn`, `.event-card`). |
| **Dashboard** [dashboard.page.scss](src/app/pages/dashboard/dashboard.page.scss) | Frosted nav, glass tab buttons; one raw `#ef4444` / `#fff` for trash tab. |
| **Equipment / Venues** | Nav links use glass; content via list/detail components. |
| **Metadata Manager** [metadata-manager.page.component.scss](src/app/pages/metadata-manager/metadata-manager.page.component.scss) | Heavy glass usage; raw colors only in error state. |
| **Trash** [trash.page.scss](src/app/pages/trash/trash.page.scss) | Glass panels and list; raw hex/rgba for warning/danger buttons. |
| **Cook View** [cook-view.page.scss](src/app/pages/cook-view/cook-view.page.scss) | Uses tokens (including `:host` component tokens); large file but consistent. |
| **Menu Intelligence** [menu-intelligence.page.scss](src/app/pages/menu-intelligence/menu-intelligence.page.scss) | **Inconsistent**: glass in places but also `#1a1a1a`, `#94a3b8`, `#a0833f`, `#fff`, various rgba. Needs tokenization. |

### 2.2 Pages that are thin wrappers (styling lives in children)

| Page | Wrapper styling | Where the real UI is |
|------|-----------------|----------------------|
| **Recipe Book** [recipe-book.page.scss](src/app/pages/recipe-book/recipe-book.page.scss) | ~4 lines, `:host` only | [recipe-book-list](src/app/pages/recipe-book/components/recipe-book-list/) (uses list-shell + glass). |
| **Inventory** [inventory.page.scss](src/app/pages/inventory/inventory.page.scss) | ~4 lines | Router-outlet → product list, [product-form](src/app/pages/inventory/components/product-form/), etc. |
| **Suppliers** [suppliers.page.html](src/app/pages/suppliers/suppliers.page.html) | Just `<router-outlet>` | [supplier-list](src/app/pages/suppliers/components/supplier-list/), etc. |
| **Menu Library** [menu-library.page.scss](src/app/pages/menu-library/menu-library.page.scss) | ~8 lines, `--bg-body` | [menu-library-list](src/app/pages/menu-library/components/menu-library-list/) — already glass. |

So the "added recipe" and "recipe builder" you mentioned: **Recipe Builder** is already well-styled. The **Recipe Book** (list + "Add recipe/dish" button) is styled via list-shell and recipe-book-list; the list has some non-token borders/semantic colors. The main gaps are **inventory** (product list/form) and **menu-intelligence** (inconsistent tokens), plus **semantic colors** (warning/danger/success) used as raw hex/rgba in several places.

### 2.3 Components with minimal or no glass

- **scrollable-dropdown** [scrollable-dropdown.component.scss](src/app/shared/scrollable-dropdown/scrollable-dropdown.component.scss): ~3 lines, no glass (host only). Often used inside other components that style the dropdown; could stay minimal or inherit parent.
- **translation-key-modal**, **restore-choice-modal**: Use only semantic tokens, no glass surfaces.
- **supplier-modal**, **add-item-modal**, **add-equipment-modal**: Rely on engine classes in HTML (e.g. `.c-modal-overlay`, `.c-modal-card`); no component glass SCSS (by design).

---

## 3. Inconsistencies (raw colors and duplication)

### 3.1 Raw hex/rgba that should use tokens

| Location | Current | Recommendation |
|----------|--------|----------------|
| **menu-intelligence.page** | `#1a1a1a`, `#94a3b8`, `#a0833f`, `#fff` | Use `--color-text-main`, `--color-text-muted`, existing or new token for gold, `--color-text-on-primary` or `--bg-pure`. |
| **export-preview** | `rgba(0,0,0,0.4)`, `#1a1a1a` | Use `--overlay-backdrop` and `--color-text-main` (or new `--paper-border` token if needed). |
| **trash.page** | `#fde68a`, `#991b1b`, `#fecaca`, rgba warning/danger | Use `--bg-warning`, `--text-warning`, `--color-danger`, `--bg-danger-subtle` (add if missing). |
| **dashboard.page** | `#ef4444`, `#fff` for trash tab | Use `--color-danger`, `--color-text-on-primary` or `--bg-pure`. |
| **recipe-book-list**, **inventory-product-list** | Warning bg, `rgba(241,245,249,0.4)` border | Use `--bg-warning`, `--border-default` (or add `--border-row` in styles.scss if used in many list rows). |
| **product-form** | `rgb(0 0 0 / 0.05)`, `#e2e8f0`, success/warning | Use `--border-default`, `--bg-muted`, semantic tokens. |
| **list-shell**, **c-list-body-cell**, **c-grid-cell** (styles.scss) | `rgba(241,245,249,0.4)` row border | Add `--border-row` or `--border-default` in `:root` and use it everywhere for list/table row borders. |
| **header**, **footer** | `box-shadow: 0 1px 8px rgba(0,0,0,0.04)` | Add `--shadow-nav` (or reuse `--shadow-glass`) in styles.scss. |
| **user-msg** | `#fff`, rgba for variants | Use semantic tokens and `--color-text-on-primary` where appropriate. |
| **recipe-header** | `rgba(167,243,208,0.6)` accent | Use `--color-primary-soft` or new `--border-accent` if needed. |
| **unit-creator** | `rgba(167,243,208,0.5)` border | Use `--color-primary-soft` or `--border-focus`. |

### 3.2 Duplication: custom classes that mirror engines

- **menu-library-list**: `.input-wrapper` duplicates `.c-input-wrapper`; `.add-btn` duplicates `.c-btn-primary`. Prefer using engine classes in HTML and only override when necessary.
- **recipe-builder**: `.main-submit-btn` could be `.c-btn-primary` with a block/modifier; `.section-card` could extend or reuse `.c-glass-panel` (e.g. add `.c-glass-panel--section` or use a shared class in styles.scss).
- **recipe-book-list**: Already uses `c-btn-primary`, `c-input-wrapper`; keep standardizing on engines for new elements.

---

## 4. Gaps summary

- **Pages lacking unified styling**: Inventory and Suppliers are wrappers; their **child views** (product list, product form, supplier list) need to be audited for glass + tokens. Menu-intelligence is the one big page with mixed styling.
- **Components**: Most shared/core components use glass or engines; main work is **replacing raw colors with tokens** and **preferring engine classes** where duplicated.

---

## 5. Recommended approach (unify without changing too much)

### Phase 1: Centralize tokens and fix global engines (styles.scss)

- Add missing tokens used in multiple places: e.g. `--border-row` for list/table row borders (replace `rgba(241,245,249,0.4)`), `--shadow-nav` for header/footer if desired.
- In [src/styles.scss](src/styles.scss), replace any remaining raw rgba in **engine** definitions (e.g. `.c-list-body-cell`, `.c-grid-cell`) with these tokens.
- Document in one place (e.g. short comment block in styles.scss) the "Liquid Glass" theme: when to use `.c-glass-card` vs `.c-glass-panel`, when to use `.c-btn-primary` vs `.c-btn-ghost`, and that all new styles should use `var(--*)` and `rem`/`em` per [.assistant/skills/cssLayer/SKILL.md](.assistant/skills/cssLayer/SKILL.md).

### Phase 2: High-impact pages

- **Menu Intelligence** [menu-intelligence.page.scss](src/app/pages/menu-intelligence/menu-intelligence.page.scss): Replace all raw hex/rgba with tokens from styles.scss.
- **Inventory**: Audit [product-form](src/app/pages/inventory/components/product-form/) and product list components; replace raw colors with semantic tokens.
- **Trash** [trash.page.scss](src/app/pages/trash/trash.page.scss): Replace warning/danger button and banner colors with `--bg-warning`, `--text-warning`, `--color-danger`, `--bg-danger-subtle`.
- **Dashboard** [dashboard.page.scss](src/app/pages/dashboard/dashboard.page.scss): Replace `#ef4444` / `#fff` with tokens.

### Phase 3: Shared and core components

- **export-preview**: Use `--overlay-backdrop` and token-based borders/text.
- **list-shell**, **recipe-book-list**, **inventory-product-list**: Use `--border-row` (or `--border-default`) for row borders; use semantic tokens for warning/danger/success states.
- **header**, **footer**: Use a single `--shadow-nav` (or existing) for bar shadows.
- **user-msg**, **recipe-header**, **unit-creator**: Replace remaining raw rgba/hex with tokens.

### Phase 4: Prefer engines and reduce duplication

- **menu-library-list**: Switch to `c-input-wrapper` and `c-btn-primary` in HTML; remove or trim duplicate `.input-wrapper` and `.add-btn` from component SCSS.
- **recipe-builder**: Use `.c-btn-primary` for main submit.

### Phase 5: Representative "theme" pages and QA

- Spot-check representative pages; search and replace remaining raw colors in src/**/*.scss where appropriate.

---

## 6. Files to touch (summary)

| Priority | Files |
| -------- | ----- |
| **P0** | [src/styles.scss](src/styles.scss) (add tokens, fix engine borders/shadows) |
| **P1** | menu-intelligence.page.scss, trash.page.scss, dashboard.page.scss |
| **P2** | product-form, recipe-book-list.component.scss, list-shell.component.scss |
| **P3** | export-preview, header.component.scss, user-msg.component.scss, recipe-header.component.scss, unit-creator |
| **P4** | menu-library-list (prefer engines in HTML), recipe-builder main submit |

---

## 7. What not to change

- **Behavior and layout**: No change to component logic or layout structure; only replace colors/shadows/borders with tokens and prefer engine classes where it reduces duplication.
- **Pages that are already consistent**: Recipe Builder, Cook View, Metadata Manager, Equipment, Venues can be left as-is except for any small token cleanups.
- **Modals that already use `.c-modal-*` in HTML**: Keep using engines; only fix any inline or component-level raw colors.
