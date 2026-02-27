---
name: Liquid Glass Design System
overview: Complete design system overhaul of FoodVibe to the "Liquid Glass" visual language — glassmorphic translucent cards, ambient gradient mesh background, frosted-glass navigation, teal accent, and unified component styling across all 30+ component files, following the cssLayer skill protocol.
todos:
  - id: tokens
    content: Replace :root tokens in styles.scss with new Liquid Glass set + add body ambient gradient + add all engine classes (c-glass-card, c-btn-primary, c-input, c-modal-overlay, etc.)
    status: completed
  - id: index-html
    content: Remove Cormorant Garamond font link from index.html
    status: completed
  - id: header-footer
    content: Restyle header (frosted-glass nav bar) and footer (frosted-glass bottom bar)
    status: completed
  - id: app-shell
    content: Update app.component.scss — remove padding-bottom, let ambient gradient show
    status: completed
  - id: dashboard
    content: Restyle dashboard page, overview component, and metadata-manager with glass tokens
    status: completed
  - id: modals
    content: Restyle all 6 shared modals (confirm, add-item, translation-key, unit-creator, global-specific, restore-choice) with glass engine
    status: pending
  - id: inventory
    content: Restyle inventory page, product-list (glass data grid), and product-form with glass engine
    status: pending
  - id: recipe-book
    content: Restyle recipe-book page and list component (glass data grid, sidebar, filters)
    status: pending
  - id: recipe-builder
    content: Restyle recipe-builder page, header, ingredients-table, workflow, ingredient-search, preparation-search
    status: pending
  - id: menu-library
    content: Replace parchment theme in menu-library-list with Liquid Glass (biggest visual change)
    status: pending
  - id: menu-intelligence
    content: Update menu-intelligence — keep paper metaphor inside preview, glass everything else
    status: pending
  - id: cook-view
    content: Restyle cook-view — remove all --cv-* tokens, apply glass panels and teal accent
    status: pending
  - id: equipment-venues
    content: Restyle equipment page/list/form and venues page/list/form with glass engine
    status: pending
  - id: trash
    content: Restyle trash page with glass panels
    status: pending
  - id: remaining
    content: Restyle version-history-panel and user-msg with glass styling
    status: pending
  - id: responsive-global
    content: "Add global responsive framework: $break-mobile/$break-tablet/$break-desktop SCSS vars, 100dvh fix, safe-area insets, mobile touch-target sizes, reduced blur on mobile, hover-only media query wrappers"
    status: pending
  - id: responsive-header
    content: Implement mobile hamburger menu on header (full-screen glass overlay nav, mobile-menu-btn, HTML changes)
    status: pending
  - id: responsive-data-grids
    content: Add mobile card layout for recipe-book-list and inventory-product-list data grids (grid-to-card conversion at 768px)
    status: pending
  - id: responsive-tables
    content: Add mobile card layout for equipment-list and venue-list tables (hide thead, tr becomes card)
    status: pending
  - id: responsive-forms
    content: Add mobile form stacking for product-form, equipment-form, venue-form (single column, full-width buttons)
    status: pending
  - id: responsive-recipe-builder
    content: Add mobile layout for recipe-builder (full-width sections), recipe-header (2-col reflow), ingredients-table (3-col), workflow (wrapped flex)
    status: pending
  - id: responsive-pages
    content: Add mobile layout for dashboard, menu-library, menu-intelligence, cook-view, trash, metadata-manager
    status: pending
  - id: responsive-modals
    content: Add mobile modal styles (full-width cards, stacked buttons, max-height with overflow, dropdowns fixed to bottom)
    status: pending
  - id: animations
    content: "Implement all Part 7 micro-interactions: card hover lift, button press, icon rotate, focus pulse, page enter, modal enter/exit, row stagger, chip pop, delete slide-out, toast slide-in, empty float, qty bounce, nav underline, mobile menu stagger, filter expand, counter spin, prefers-reduced-motion, easing tokens"
    status: pending
  - id: rtl-audit
    content: "Final pass: audit all files for logical properties (replace left/right with inline-start/end)"
    status: pending
isProject: false
---

# FoodVibe "Liquid Glass" Design System — Implementation Plan

## Reference Image

The chosen direction is **Option B: Liquid Glass** — see generated reference at `assets/option-b-liquid-glass.png`. The core idea: translucent frosted-glass cards floating over a subtle ambient gradient mesh, with a single teal accent, clean sans-serif typography, and generous whitespace. Think **Linear meets Apple** for a cooking management app.

---

## Part 1: Global Design Tokens — `src/styles.scss`

**What to do:** Replace the entire `:root` block with the new Liquid Glass token set. Keep Heebo as the sole font. Remove the serif/parchment tokens (`--font-serif`, `--color-ink`, `--color-frame`, `--bg-paper-`*, `--color-ornament`, etc.) — they are no longer used in any component after the redesign.

### New `:root` token set

```scss
:root {
  font-family: 'Heebo', sans-serif;

  /* ---- Surfaces ---- */
  --bg-body:        #f0f4f8;
  --bg-pure:        #ffffff;
  --bg-glass:       rgba(255, 255, 255, 0.55);
  --bg-glass-strong:rgba(255, 255, 255, 0.72);
  --bg-glass-hover: rgba(255, 255, 255, 0.82);
  --bg-subtle:      rgba(255, 255, 255, 0.35);
  --bg-muted:       rgba(241, 245, 249, 0.6);
  --bg-frosted-nav: rgba(255, 255, 255, 0.6);

  /* ---- Borders ---- */
  --border-glass:   rgba(255, 255, 255, 0.45);
  --border-default: rgba(226, 232, 240, 0.6);
  --border-strong:  rgba(203, 213, 225, 0.7);
  --border-focus:   rgba(20, 184, 166, 0.5);

  /* ---- Text ---- */
  --color-text-main:       #0f172a;
  --color-text-secondary:  #1e293b;
  --color-text-muted:      #64748b;
  --color-text-muted-light:#94a3b8;
  --color-text-on-primary: #ffffff;

  /* ---- Primary (teal) ---- */
  --color-primary:       #14b8a6;
  --color-primary-hover: #0d9488;
  --color-primary-soft:  rgba(20, 184, 166, 0.12);
  --color-primary-glow:  rgba(20, 184, 166, 0.25);

  /* ---- Semantic: success ---- */
  --color-success:  #10b981;
  --bg-success:     rgba(220, 252, 231, 0.7);
  --text-success:   #166534;

  /* ---- Semantic: warning ---- */
  --bg-warning:     rgba(254, 243, 199, 0.7);
  --text-warning:   #92400e;
  --border-warning: #f59e0b;

  /* ---- Semantic: danger ---- */
  --color-danger:      #dc2626;
  --bg-danger-subtle:  rgba(254, 226, 226, 0.7);

  /* ---- Radii ---- */
  --radius-xs:   0.25rem;
  --radius-sm:   0.375rem;
  --radius-md:   0.75rem;
  --radius-lg:   1rem;
  --radius-xl:   1.25rem;
  --radius-full: 999px;

  /* ---- Shadows ---- */
  --shadow-glass:  0 4px 24px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  --shadow-card:   0 8px 32px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.04);
  --shadow-modal:  0 16px 48px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06);
  --shadow-glow:   0 0 20px rgba(20, 184, 166, 0.15);
  --shadow-focus:  0 0 0 3px rgba(20, 184, 166, 0.2);
  --shadow-hover:  0 8px 40px rgba(0, 0, 0, 0.1), 0 2px 6px rgba(0, 0, 0, 0.05);

  /* ---- Glass blur ---- */
  --blur-glass:    blur(16px);
  --blur-nav:      blur(20px);
  --blur-modal:    blur(24px);

  /* ---- Overlay ---- */
  --overlay-backdrop: rgba(15, 23, 42, 0.4);

  /* ---- Breakpoints ---- */
  --break-sm: 48rem;
  --break-md: 56.25rem;
}
```

### Body and ambient background

Add to `styles.scss` after the `:root` block:

```scss
body {
  margin: 0;
  padding: 0;
  font-family: 'Heebo', sans-serif;
  background: var(--bg-body);
  color: var(--color-text-main);
  min-height: 100vh;
  position: relative;
}

body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(ellipse 600px 400px at 15% 20%, rgba(20, 184, 166, 0.12), transparent),
    radial-gradient(ellipse 500px 500px at 80% 70%, rgba(251, 191, 36, 0.08), transparent),
    radial-gradient(ellipse 400px 300px at 50% 50%, rgba(14, 165, 233, 0.06), transparent);
  pointer-events: none;
}
```

### Remove from `index.html`

Remove the Cormorant Garamond font link (`<link href="...Cormorant+Garamond...">`) — it is no longer used.

---

## Part 2: Shared Glass Mixins (add to bottom of `styles.scss`)

These are reusable patterns referenced throughout the plan. The implementer should add them as CSS class engines OR SCSS placeholder selectors so components can `@extend` or apply directly:

```scss
/* ---- Engine: Glass Card ---- */
.c-glass-card {
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-glass);
  backdrop-filter: var(--blur-glass);
  -webkit-backdrop-filter: var(--blur-glass);
  transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;

  &:hover {
    background: var(--bg-glass-hover);
    box-shadow: var(--shadow-hover);
    transform: translateY(-1px);
  }
}

/* ---- Engine: Glass Card (no hover lift) ---- */
.c-glass-panel {
  background: var(--bg-glass-strong);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-glass);
  backdrop-filter: var(--blur-glass);
  -webkit-backdrop-filter: var(--blur-glass);
}

/* ---- Engine: Primary Button ---- */
.c-btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding-inline: 1.25rem;
  padding-block: 0.625rem;
  background: var(--color-primary);
  color: var(--color-text-on-primary);
  font-weight: 600;
  font-size: 0.875rem;
  border: none;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-glow);
  cursor: pointer;
  transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.15s ease;

  &:hover {
    background: var(--color-primary-hover);
    box-shadow: 0 0 24px rgba(20, 184, 166, 0.3);
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
}

/* ---- Engine: Ghost Button ---- */
.c-btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding-inline: 1.25rem;
  padding-block: 0.625rem;
  background: var(--bg-glass);
  color: var(--color-text-secondary);
  font-weight: 500;
  font-size: 0.875rem;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  backdrop-filter: var(--blur-glass);
  cursor: pointer;
  transition: background 0.2s ease, border-color 0.2s ease;

  &:hover {
    background: var(--bg-glass-hover);
    border-color: var(--border-strong);
  }
}

/* ---- Engine: Glass Input ---- */
.c-input {
  padding-inline: 0.75rem;
  padding-block: 0.625rem;
  background: var(--bg-glass);
  color: var(--color-text-main);
  font-size: 0.875rem;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  backdrop-filter: var(--blur-glass);
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &::placeholder {
    color: var(--color-text-muted-light);
  }

  &:focus {
    border-color: var(--border-focus);
    box-shadow: var(--shadow-focus);
  }
}

/* ---- Engine: Input Wrapper (icon + input) ---- */
.c-input-wrapper {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-inline: 0.75rem;
  padding-block: 0.5rem;
  background: var(--bg-glass);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  backdrop-filter: var(--blur-glass);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus-within {
    border-color: var(--border-focus);
    box-shadow: var(--shadow-focus);
  }

  lucide-icon {
    flex-shrink: 0;
    color: var(--color-text-muted);
  }

  input {
    flex: 1;
    min-width: 0;
    padding: 0;
    background: transparent;
    border: none;
    outline: none;
    font-size: 0.875rem;
    color: var(--color-text-main);

    &::placeholder {
      color: var(--color-text-muted-light);
    }
  }
}

/* ---- Engine: Glass Select ---- */
.c-select {
  padding-inline: 0.75rem;
  padding-block: 0.625rem;
  background: var(--bg-glass);
  color: var(--color-text-main);
  font-size: 0.875rem;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  backdrop-filter: var(--blur-glass);
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    border-color: var(--border-focus);
    box-shadow: var(--shadow-focus);
  }
}

/* ---- Engine: Glass Modal Overlay ---- */
.c-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--overlay-backdrop);
  backdrop-filter: blur(6px);
}

/* ---- Engine: Glass Modal Card ---- */
.c-modal-card {
  width: 90%;
  max-width: 28rem;
  padding: 2rem;
  background: var(--bg-glass-strong);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-modal);
  backdrop-filter: var(--blur-modal);
  -webkit-backdrop-filter: var(--blur-modal);
}

/* ---- Engine: Page Title ---- */
.c-page-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text-main);
  letter-spacing: -0.01em;
}

/* ---- Engine: Section Title ---- */
.c-section-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text-main);
}

/* ---- Engine: Action Icon Button ---- */
.c-icon-btn {
  display: grid;
  place-content: center;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  background: transparent;
  color: var(--color-text-muted);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.2s ease, background 0.2s ease, color 0.2s ease, transform 0.15s ease;

  &:hover {
    opacity: 1;
    background: var(--color-primary-soft);
    color: var(--color-primary);
    transform: scale(1.08);
  }

  &.danger:hover {
    background: var(--bg-danger-subtle);
    color: var(--color-danger);
  }
}

/* ---- Engine: Glass Chip/Tag ---- */
.c-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding-inline: 0.625rem;
  padding-block: 0.2rem;
  background: var(--color-primary-soft);
  color: var(--color-primary-hover);
  font-size: 0.8125rem;
  font-weight: 500;
  border-radius: var(--radius-full);
  line-height: 1.4;
}

/* ---- Engine: Glass Data Grid ---- */
.c-grid-header-cell {
  padding-inline: 0.75rem;
  padding-block: 0.625rem;
  background: var(--bg-glass);
  color: var(--color-text-muted);
  font-size: 0.8125rem;
  font-weight: 600;
  border-bottom: 1px solid var(--border-default);
  backdrop-filter: var(--blur-glass);
}

.c-grid-cell {
  padding-inline: 0.75rem;
  padding-block: 0.625rem;
  background: transparent;
  color: var(--color-text-main);
  font-size: 0.875rem;
  border-bottom: 1px solid rgba(241, 245, 249, 0.4);
  transition: background 0.15s ease;
}
```

---

## Part 3: Component-by-Component Specifications

Below is the exact specification for every file that must change. For each, the instructions follow the **cssLayer skill**: (1) check `styles.scss` for global tokens, (2) use `var(--token)` everywhere, (3) Five-Group property ordering, (4) logical properties for RTL/bidi.

---

### 3.1 App Shell — `src/app/appRoot/app.component.scss`

Remove `padding-bottom: 30px` (footer will be part of layout). Apply:

```scss
.app-content {
  display: flex;
  flex-direction: column;

  min-height: 100vh;
  padding-block-end: 3rem;
}
```

No background on `.app-content` — the `body::before` ambient gradient shows through.

---

### 3.2 Header — `src/app/core/components/header/header.component.scss`

Replace the entire file. The header becomes a frosted-glass bar that floats at the top:

```scss
.header-nav {
  position: sticky;
  top: 0;
  z-index: 100;

  padding-inline: 1.5rem;
  padding-block: 0;

  background: var(--bg-frosted-nav);
  backdrop-filter: var(--blur-nav);
  -webkit-backdrop-filter: var(--blur-nav);

  border-block-end: 1px solid var(--border-glass);
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.04);

  ul {
    display: flex;
    place-content: center;
    gap: 0.25rem;
    list-style: none;
    margin: 0;
    padding: 0;

    li a {
      display: inline-flex;
      align-items: center;

      padding-inline: 1rem;
      padding-block: 0.75rem;

      color: var(--color-text-muted);
      font-size: 0.875rem;
      font-weight: 500;
      text-decoration: none;

      border-radius: var(--radius-md);

      transition: color 0.2s ease, background 0.2s ease;

      &:hover {
        color: var(--color-text-main);
        background: var(--bg-glass);
      }

      &.active {
        color: var(--color-primary);
        background: var(--color-primary-soft);
        font-weight: 600;
      }
    }
  }
}
```

---

### 3.3 Footer — `src/app/core/components/footer/footer.component.scss`

Replace entirely. Footer becomes a frosted-glass bar at the bottom:

```scss
.app-footer {
  position: fixed;
  inset-inline: 0;
  bottom: 0;
  z-index: 100;
  display: grid;
  grid-auto-flow: column;
  justify-content: space-between;
  align-items: center;

  padding-inline: 1.5rem;
  padding-block: 0.5rem;

  background: var(--bg-frosted-nav);
  color: var(--color-text-muted);
  font-size: 0.8125rem;
  backdrop-filter: var(--blur-nav);
  -webkit-backdrop-filter: var(--blur-nav);

  border-block-start: 1px solid var(--border-glass);
  box-shadow: 0 -1px 8px rgba(0, 0, 0, 0.03);

  .logo {
    width: 2rem;
    height: 2rem;
    object-fit: contain;
  }
}
```

---

### 3.4 Dashboard Page — `src/app/pages/dashboard/dashboard.page.scss`

```scss
.dashboard-shell {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;

  padding: 1.5rem;
}

.tab-nav {
  display: flex;
  gap: 0.5rem;

  .tab-btn {
    padding-inline: 1.25rem;
    padding-block: 0.5rem;

    background: var(--bg-glass);
    color: var(--color-text-muted);
    font-size: 0.875rem;
    font-weight: 500;

    border: 1px solid var(--border-default);
    border-radius: var(--radius-full);
    backdrop-filter: var(--blur-glass);

    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;

    &:hover {
      background: var(--bg-glass-hover);
      color: var(--color-text-main);
    }

    &.active {
      background: var(--color-primary);
      color: var(--color-text-on-primary);
      border-color: var(--color-primary);
      box-shadow: var(--shadow-glow);
    }
  }
}
```

---

### 3.5 Dashboard Overview — `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.scss`

Replace with Liquid Glass. Key changes:

- `.dashboard-overview` — no background, flex column, gap 1.5rem
- `.page-title` — use `c-page-title` style (font-size: 1.5rem, weight 700)
- `.qa-btn` — use `c-btn-ghost` style; `.qa-btn.primary` uses `c-btn-primary`
- `.kpi-card` — use `c-glass-card` style: `background: var(--bg-glass)`, `backdrop-filter`, `border: 1px solid var(--border-glass)`, `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow-glass)`. Remove all hardcoded hex colors. `.kpi-value` keeps `font-size: 2rem; font-weight: 800; color: var(--color-primary)`.
- `.kpi-card.warning` — `.kpi-value { color: var(--border-warning); }`
- `.kpi-card.info` — `.kpi-value { color: var(--color-primary); }`
- `.activity-section` — use `c-glass-panel` style
- `.activity-item` — subtle bottom border `var(--border-default)`, no background, hover `var(--bg-glass)`
- `.change-tag` buttons — use `c-chip` style
- `.link-btn` — color `var(--color-primary)`, no border, hover underline

All hardcoded hex colors (`#020617`, `#0f766e`, `#ecfeff`, etc.) are replaced with token references.

---

### 3.6 Metadata Manager — `src/app/pages/metadata-manager/metadata-manager.page.component.scss`

- `.metadata-page` — `background: transparent` (ambient gradient shows), `padding: 1.5rem`
- `.manager-card` — apply `c-glass-panel` engine (`background: var(--bg-glass-strong)`, `backdrop-filter`, glass border/shadow)
- `.card-title h2` — weight 700, color `var(--color-text-main)`
- `.list-item` — `background: var(--bg-glass)`, `border-radius: var(--radius-md)`, hover: `var(--bg-glass-hover)`, remove `transform: translateX(-4px)` (not RTL-safe)
- `.input-group input` — use `c-input` engine
- `.input-group .btn-add` — use `c-btn-primary` engine
- `.allergen-pill` — `background: rgba(254, 226, 226, 0.5)`, `color: #9f1239`, `border: 1px solid rgba(254, 205, 213, 0.6)`, glass blur
- `.btn-demo` — use `c-btn-ghost` with warning color
- `.empty-state` — `border: 1px dashed var(--border-default)`, `color: var(--color-text-muted)`

---

### 3.7 Inventory Page — `src/app/pages/inventory/inventory.page.scss`

```scss
:host {
  display: block;
  padding: 1.5rem;
}

nav {
  display: flex;
  gap: 0.5rem;

  margin-block-end: 1.25rem;

  .nav-link {
    /* Same pill tabs as dashboard — use c-btn-ghost / c-btn-primary.active */
    display: inline-flex;
    padding-inline: 1rem;
    padding-block: 0.5rem;
    background: var(--bg-glass);
    color: var(--color-text-muted);
    text-decoration: none;
    border: 1px solid var(--border-default);
    border-radius: var(--radius-full);
    backdrop-filter: var(--blur-glass);
    transition: background 0.2s, color 0.2s;

    &:hover { background: var(--bg-glass-hover); color: var(--color-text-main); }
    &.active { background: var(--color-primary); color: var(--color-text-on-primary); border-color: var(--color-primary); }
  }
}
```

---

### 3.8 Inventory Product List — `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.scss`

This is a large file. Key changes (apply to every selector):

- **Container** (`.inventory-container`): keep grid layout, `padding: 1.5rem`, no background
- **Action bar** (`.products-header.action-bar`): same flex layout
  - `.burger-btn`: use `c-icon-btn` engine, `background: var(--bg-glass)`, glass border
  - `.page-title`: use `c-page-title` engine
- **Data grid** (`.products-grid`): `background: var(--bg-glass-strong)`, `border: 1px solid var(--border-glass)`, `border-radius: var(--radius-lg)`, `backdrop-filter: var(--blur-glass)`, `overflow: hidden`, `box-shadow: var(--shadow-glass)`
  - Header cells: use `c-grid-header-cell` style
  - Row cells: use `c-grid-cell` style
  - Row hover: `background: var(--bg-glass)`
- **Sidebar** (`.action-sidebar`): when open, `background: var(--bg-glass-strong)`, `backdrop-filter: var(--blur-glass)`, glass border and shadow
  - `sidebar-content`, `sidebar-close-btn`: use tokens
  - `.input-wrapper`: use `c-input-wrapper` engine
  - `.filter-category-header.expanded`: `background: var(--color-primary-soft)`, `color: var(--color-primary)`, `border-color: rgba(20,184,166,0.2)`
  - `.filter-category-count`: `color: var(--color-primary)`
  - Checkboxes: `accent-color: var(--color-primary)`
- **Action buttons** (`.action-btn`): use `c-icon-btn` engine
  - `.action-btn.edit:hover` — teal highlight (keep existing but use tokens)
  - `.action-btn.delete:hover` — danger highlight
- **Grid input/select**: use `c-input` / `c-select` engines
- **Allergen pills** (`.allergen-pill`): `background: rgba(254, 243, 199, 0.5)`, glass blur, `border-radius: var(--radius-full)`
- **All hardcoded hex** (`#e2e8f0`, `#f8fafc`, `#64748b`, etc.): replace with corresponding `var(--token)`.

---

### 3.9 Product Form — `src/app/pages/inventory/components/product-form/product-form.component.scss`

- `.product-form-container`: `max-width: 50rem`, `margin: 0 auto`, `border-top: 4px solid var(--color-primary)` (was emerald, now teal), `background: transparent`
- `.form-container`: apply `c-glass-panel` engine, `padding: 2rem`, `border-radius: var(--radius-xl)`
- `.form-header h2`: `font-weight: 700`, `color: var(--color-text-main)`
- `.form-header .subtitle`: `color: var(--color-text-muted)`
- `&.edit-mode .form-header h2`: `color: var(--color-primary)`
- All `input`, `select`: use `c-input` / `c-select` engine
- `.form-group label`: `color: var(--color-text-secondary)`, `font-weight: 600`
- `.scaling-box`: `background: var(--bg-glass)`, `border: 1px dashed var(--border-default)`, `border-radius: var(--radius-md)`, `backdrop-filter: var(--blur-glass)`
- `.btn-primary`: use `c-btn-primary` engine
- `.btn-ghost`: use `c-btn-ghost` engine
- `.chipe.allergen`: `background: rgba(254,243,199,0.5)`, `.chipe.supplier`: `background: rgba(220,252,231,0.5)`, `.chipe.category`: `background: rgba(224,242,254,0.5)` — all semi-transparent for glass effect
- `.dropdown`: `background: var(--bg-glass-strong)`, `backdrop-filter: var(--blur-glass)`, glass border, `border-radius: var(--radius-md)`, `box-shadow: var(--shadow-card)`
- All `#` hex values replaced with tokens.

---

### 3.10 Equipment Page — `src/app/pages/equipment/equipment.page.scss`

Already mostly tokenized. Changes:

- `:host` padding stays
- `.nav-link.active`: `background: var(--color-primary)`, `color: var(--color-text-on-primary)`, `border-radius: var(--radius-full)`, add `border: 1px solid var(--color-primary)`

### 3.11 Equipment List — `src/app/pages/equipment/components/equipment-list/equipment-list.component.scss`

- `.equipment-table`: wrap in glass panel: `background: var(--bg-glass-strong)`, `border: 1px solid var(--border-glass)`, `border-radius: var(--radius-lg)`, `backdrop-filter`, `overflow: hidden`
- `th`: use `c-grid-header-cell` style
- `td`: use `c-grid-cell` style
- `.btn-icon`: use `c-icon-btn` engine

### 3.12 Equipment Form — `src/app/pages/equipment/components/equipment-form/equipment-form.component.scss`

- Wrap `.equipment-form-container` content area in glass panel style
- All inputs/selects: use `c-input` / `c-select`
- `.btn-primary`: use `c-btn-primary`
- `.btn-secondary`: use `c-btn-ghost`

---

### 3.13 Venues Page — `src/app/pages/venues/venues.page.scss`

Same as equipment page — pill-tab nav links with teal active state.

### 3.14 Venue List — `src/app/pages/venues/components/venue-list/venue-list.component.scss`

Same glass treatment as equipment list.

### 3.15 Venue Form — `src/app/pages/venues/components/venue-form/venue-form.component.scss`

Same glass treatment as equipment form.

---

### 3.16 Recipe Book Page — `src/app/pages/recipe-book/recipe-book.page.scss`

Keep `:host { display: block; min-height: 100%; }` — no changes needed.

### 3.17 Recipe Book List — `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss`

This is the largest component. Same exact treatment as inventory product list:

- Data grid: glass panel (`bg-glass-strong`, border, backdrop-filter, shadow)
- Header cells: `c-grid-header-cell`
- Row cells: `c-grid-cell`
- Row hover: `bg-glass`
- Sidebar: glass panel when open
- Action buttons: `c-icon-btn`
- Input wrapper: `c-input-wrapper`
- Add button: `c-btn-primary`
- Filter expanded state: teal accent
- All hex colors replaced with tokens

---

### 3.18 Recipe Builder — `src/app/pages/recipe-builder/recipe-builder.page.scss`

- `.recipe-builder-container`: `background: transparent` (ambient gradient shows), `padding: 2rem 1rem`
- `.section-card`: apply `c-glass-panel` engine, `border-right: none` (remove blue strip), add `border-inline-start: 4px solid var(--color-primary)`, `border-radius: var(--radius-lg)`
- `.section-title`: `color: var(--color-primary)`, `font-weight: 700`
- `.main-submit-btn`: use `c-btn-primary` engine, `width: 12.5rem`
- `.add-row-btn`: use `c-btn-primary` style (smaller)
- `.placeholder-text`: `border: 2px dashed var(--border-default)`, `color: var(--color-text-muted-light)`, `border-radius: var(--radius-md)`
- `.history-view-banner`: `background: var(--bg-warning)`, `border-color: var(--border-warning)`, `color: var(--text-warning)`, `border-radius: var(--radius-md)`
- Logistics section: all inputs/selects use tokens

### 3.19 Recipe Header — `src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.scss`

- `.header-dashboard-container`: apply `c-glass-panel` engine, `border-radius: var(--radius-xl)`, `padding: 1.25rem`
- `.recipe-name-input`: `border-bottom: 2px solid var(--border-default)`, focus: `border-color: var(--color-primary)`
- `.type-toggle-btn`: glass background; `&.dish-mode` uses `background: var(--bg-success)`, `color: var(--text-success)`
- `.scaling-chip`: glass background, `.primary` uses `background: var(--color-primary-soft)`, `border-color: rgba(20,184,166,0.3)`
- `.counter-grid`: glass border, teal text/buttons
- `.metrics-square`: `background: var(--color-primary-hover)` (teal instead of navy), `color: white`, `border-radius: var(--radius-lg)`
- All `#1e3a8a` (navy blue) replaced with `var(--color-primary)` or `var(--color-primary-hover)`

### 3.20 Recipe Ingredients Table — `src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.scss`

- Header row: `c-grid-header-cell` style
- Data rows: `c-grid-cell` style, hover: `background: var(--bg-glass)`
- Inputs/selects: `c-input` / `c-select`
- `.col-cost` (green): `color: var(--color-primary)` (teal instead of emerald)

### 3.21 Recipe Workflow — `src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.scss`

- `.workflow-grid`: apply `c-glass-panel` engine
- `.grid-header`: `background: var(--bg-glass)`, `color: var(--color-primary)`, `border-bottom: 1px solid var(--border-default)`, `backdrop-filter: var(--blur-glass)`
- `.step-badge`: `background: var(--color-primary)`, `border-radius: var(--radius-sm)`
- `.add-row-btn`: glass bottom border, teal color
- All `#1e3a8a` replaced with `var(--color-primary)`

### 3.22 Ingredient Search — `src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.scss`

- `.input-wrapper`: use `c-input-wrapper` engine
- `.results-dropdown`: `background: var(--bg-glass-strong)`, `backdrop-filter: var(--blur-glass)`, `border: 1px solid var(--border-glass)`, `border-radius: var(--radius-md)`, `box-shadow: var(--shadow-card)`
- `.result-item:hover`: `background: var(--bg-glass)`
- `.type-pill.product`: `background: var(--color-primary-soft)`, `color: var(--color-primary-hover)`
- `.type-pill.recipe`: `background: var(--bg-success)`, `color: var(--text-success)`
- Focus ring: teal (`var(--border-focus)`, `var(--shadow-focus)`)

### 3.23 Preparation Search — `src/app/pages/recipe-builder/components/preparation-search/preparation-search.component.scss`

Same treatment as ingredient search. Glass dropdown, teal focus, glass input wrapper.

---

### 3.24 Menu Library List — `src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.scss`

This currently uses the parchment/serif theme. **Complete replacement:**

- Remove all `:host` local parchment tokens (`--mll-paper-dark`, `--mll-border-warm`, etc.)
- `.menu-library-container`: `max-width: 56.25rem`, `margin: 0 auto`, `padding: 1.75rem 1.5rem`, `background: transparent` (no more paper bg), no double frame border
- `.page-title`: use `c-page-title` style (Heebo, not serif)
- `.search-wrap .input-wrapper`: use `c-input-wrapper` engine
- `.add-btn`: use `c-btn-primary` engine
- `.filters-bar`: glass panel wrapper, `display: flex`, `flex-wrap: wrap`, `gap: 1rem`, `padding: 1rem`, `background: var(--bg-glass)`, `border-radius: var(--radius-lg)`, `backdrop-filter`
  - `label` and `select`: use `c-select` engine
  - Date inputs: use `c-input` engine
- `.event-card`: use `c-glass-card` engine, `padding: 1rem 1.25rem`, `border-radius: var(--radius-lg)`
  - `.card-title`: `font-weight: 600`, `color: var(--color-text-main)` (Heebo, not serif)
  - `.card-subtitle`: `color: var(--color-text-muted)`, `font-size: 0.875rem`
- Action buttons (edit/clone/delete): use `c-icon-btn` engine
- `.empty-state`: `color: var(--color-text-muted)`, glass card style

### 3.25 Menu Library Page — `src/app/pages/menu-library/menu-library.page.scss`

Remove any custom padding/background. Keep minimal:

```scss
:host {
  display: block;
  padding: 1.5rem;
}
```

---

### 3.26 Menu Intelligence — `src/app/pages/menu-intelligence/menu-intelligence.page.scss`

This is the decorative "paper" page. **Preserve the paper metaphor inside the paper area only**, but update surroundings and controls to glass:

- `:host`: `background: var(--bg-body)` (instead of `--bg-page-menu`)
- `.editor-toolbar`: glass panel wrapper for buttons
- `.toolbar-btn`: use `c-btn-ghost` engine; `.toolbar-btn.save` uses `c-btn-primary`
- `.paper-outer`, `.paper`, `.paper-inner`: **Keep the double-border paper metaphor** — this is the one page where it makes sense (it is a printed menu preview). But update:
  - `.paper` background: `var(--bg-pure)` (clean white, not parchment)
  - Border: keep `3px solid #1a1a1a`
  - Shadow: use `var(--shadow-card)`
- All inputs/selects inside the paper: use `c-input` focus rings (teal)
- `.financial-bar` (fixed bottom): `background: var(--bg-frosted-nav)`, `backdrop-filter: var(--blur-nav)`, `border-block-start: 1px solid var(--border-glass)`
- Font inside paper: **can keep serif** for the printed-menu look, but all chrome/toolbar/buttons use Heebo
- `.dropdown-item:hover`: `background: var(--bg-glass)`

---

### 3.27 Cook View — `src/app/pages/cook-view/cook-view.page.scss`

- Remove all `:host` custom tokens (the `--cv-`* set)
- `.cook-view-container`: `background: transparent`, `padding: 1.5rem`
- `.cook-view-header`: apply `c-glass-panel` engine, teal gradient removed, replaced with glass background + teal accent via `.recipe-name` color and `.scaled-cost-badge`
  - `.recipe-name`: `color: var(--color-text-main)`, `font-weight: 700`
  - `.edit-btn`: use `c-btn-ghost` engine with teal icon
  - `.quantity-controls`: glass container, teal buttons
  - `.scaled-cost-badge`: `background: var(--bg-success)`, `color: var(--text-success)`, `border-radius: var(--radius-full)`
- `.cook-view-section`: apply `c-glass-panel` engine
  - `.section-title`: `color: var(--color-text-main)`, icon color `var(--color-primary)`
- `.ingredients-table`: glass wrapper, header uses `c-grid-header-cell`, rows use `c-grid-cell`
  - `.col-amount`: `color: var(--color-primary)`, `font-weight: 600`
- `.prep-row`: `background: var(--bg-glass)`, `border-inline-start: 3px solid var(--color-primary)`, `border-radius: var(--radius-md)`
- `.step-item`: glass background, `border-inline-start: 3px solid var(--color-primary)`, `border-radius: var(--radius-md)`, remove `border: 1px solid #000`
- `.step-time`: `background: var(--color-primary-soft)`, `color: var(--color-primary-hover)`
- `.cook-view-empty`: glass card, teal accent link

---

### 3.28 Trash Page — `src/app/pages/trash/trash.page.scss`

- `.trash-page`: `max-width: 45rem`, `margin: 0 auto`, `padding: 1.5rem`
- `.btn-refresh`: use `c-btn-ghost` engine
- `.trash-section`: apply `c-glass-panel` engine (instead of `#fafafa` background)
- `.trash-section-header h2`: `c-section-title` engine
- `.trash-item`: `background: var(--bg-glass)`, `border-radius: var(--radius-md)`, `border-bottom: 1px solid var(--border-default)`
- `.btn-action.btn-restore`: `background: var(--bg-warning)`, glass border
- `.btn-action.btn-dispose`: `background: var(--bg-danger-subtle)`, glass border
- `.btn-item.btn-history`: `background: var(--bg-glass)`, border `var(--border-default)`
- `.history-overlay`: use `c-modal-overlay` engine

---

### 3.29 Shared Modals

All five modals follow the same glass pattern:

**Files:**

- `src/app/shared/confirm-modal/confirm-modal.component.scss`
- `src/app/shared/add-item-modal/add-item-modal.component.scss`
- `src/app/shared/translation-key-modal/translation-key-modal.component.scss`
- `src/app/shared/unit-creator/unit-creator.component.scss`
- `src/app/shared/global-specific-modal/global-specific-modal.component.scss`
- `src/app/shared/restore-choice-modal/restore-choice-modal.component.scss`

**Unified specification for all:**

- `.modal-overlay`: use `c-modal-overlay` engine
- `.modal-card`: use `c-modal-card` engine (`max-width` varies: confirm=28rem, add-item=28rem, translation-key=34rem, unit-creator=34rem, global-specific=25rem, restore-choice=28rem)
- `h3` inside modal: `font-weight: 700`, `color: var(--color-text-main)`, `font-size: 1.125rem`, `margin-block-end: 1.25rem`
- `.modal-message` / `.modal-detail`: `color: var(--color-text-secondary)`, `font-size: 0.9375rem`
- `.formula-grid`: `background: var(--bg-glass)`, `border: 1px dashed var(--border-default)`, `border-radius: var(--radius-md)`, `backdrop-filter: var(--blur-glass)`, `padding: 1.25rem`
  - Labels: `color: var(--color-text-muted)`, `font-weight: 600`, `font-size: 0.75rem`
  - Inputs: use `c-input` engine, focus border `var(--border-focus)`
- `.modal-actions`: `border-top: 1px solid var(--border-default)`, `padding-block-start: 1rem`
  - `.btn-ghost` (cancel): use `c-btn-ghost` engine
  - `.btn-save` / `.btn-confirm` (primary action): use `c-btn-primary` engine
  - `.btn-confirm` in `modal-card--danger`: `background: var(--color-danger)`, `box-shadow: 0 0 20px rgba(220,38,38,0.15)`
  - `.btn-confirm` in `modal-card--warning`: `background: var(--border-warning)`, warning glow
  - `.btn-add-new` (restore-choice): use `c-btn-primary`
  - `.btn-replace` (restore-choice): `background: var(--border-warning)`, `color: white`
  - `.btn-specific` (global-specific): use `c-btn-ghost`
  - `.btn-global` (global-specific): use `c-btn-primary`
- `.cost-preview` (unit-creator): `background: var(--bg-success)`, `border: 1px solid rgba(167,243,208,0.5)`, `color: var(--text-success)`, `border-radius: var(--radius-md)`

---

### 3.30 Version History Panel — `src/app/shared/version-history-panel/version-history-panel.component.scss`

- `.version-history-panel`: apply `c-modal-card` style (glass-strong, border, shadow, blur)
- `.btn-close`: `color: var(--color-text-muted)`, hover `color: var(--color-text-main)`
- `.version-item`: `border-bottom: 1px solid var(--border-default)`
- `.btn-view`: use `c-btn-ghost` engine (small size)
- `.btn-restore`: `background: var(--bg-warning)`, `color: var(--text-warning)`, `border: 1px solid var(--border-warning)`

---

### 3.31 User Message — `src/app/core/components/user-msg/user-msg.component.scss`

Apply glass styling: glass background, teal accent for success messages, red for errors, amber for warnings. Use `border-radius: var(--radius-lg)`, glass shadow.

---

## Part 4: RTL / Bidi Robustness Checklist

Across ALL files above, the implementer must:

1. Replace `left` / `right` with `inset-inline-start` / `inset-inline-end`
2. Replace `margin-left` / `margin-right` with `margin-inline-start` / `margin-inline-end`
3. Replace `padding-left` / `padding-right` with `padding-inline-start` / `padding-inline-end`
4. Replace `border-left` / `border-right` with `border-inline-start` / `border-inline-end`
5. Replace `text-align: left/right` with `text-align: start/end`
6. Replace `float: left/right` with logical equivalents or flex/grid
7. For `translateX` in sidebar animations: use `calc(-1 * ...)` pattern already in place — ensure it works in both directions

---

## Part 5: Implementation Order (recommended)

1. `**styles.scss`** — new tokens + body ambient background + all engine classes
2. `**index.html`** — remove Cormorant Garamond font link
3. **Header + Footer** — immediate visual impact
4. **Dashboard** (page + overview + metadata-manager)
5. **All shared modals** (6 files) — they appear everywhere
6. **Inventory** (page + list + form)
7. **Recipe Book** (page + list)
8. **Recipe Builder** (page + header + ingredients table + workflow + searches)
9. **Menu Library** (page + list)
10. **Menu Intelligence** (partial — keep paper inside, glass outside)
11. **Cook View**
12. **Equipment** (page + list + form)
13. **Venues** (page + list + form)
14. **Trash**
15. **Version History Panel + User Message**
16. **Final pass** — RTL logical-property audit across all files

---

## Key Design Rules Summary


| Element                    | Token / Value                                             |
| -------------------------- | --------------------------------------------------------- |
| Card background            | `var(--bg-glass)` = `rgba(255,255,255,0.55)`              |
| Card border                | `var(--border-glass)` = `rgba(255,255,255,0.45)`          |
| Card blur                  | `backdrop-filter: blur(16px)`                             |
| Card shadow                | `var(--shadow-glass)`                                     |
| Card hover                 | lift 1px + stronger shadow                                |
| Primary color              | `#14b8a6` (teal)                                          |
| Primary button glow        | `0 0 20px rgba(20,184,166,0.15)`                          |
| Input focus                | 3px teal ring                                             |
| Nav background             | `rgba(255,255,255,0.6)` + `blur(20px)`                    |
| Modal backdrop             | `rgba(15,23,42,0.4)` + `blur(6px)`                        |
| Ambient gradient           | Fixed teal + amber + blue blobs behind body               |
| Font                       | Heebo only (serif removed except menu-intelligence paper) |
| Border radius (cards)      | `1rem`                                                    |
| Border radius (inputs)     | `0.75rem`                                                 |
| Border radius (pills/tabs) | `999px`                                                   |


---

## Part 6: Responsive Design — Desktop and Mobile Specifications

### 6.0 Global Responsive Framework

#### Breakpoint tokens — add to `:root` in `styles.scss`

The project currently uses 8 different breakpoint values (414px, 500px, 583px, 600px, 650px, 768px, 830px, 900px). **Consolidate to three standardized SCSS variables** defined at the top of `styles.scss` (not CSS custom properties, because media queries cannot use CSS variables):

```scss
$break-mobile:  768px;   // phones and small tablets
$break-tablet:  900px;   // tablets and narrow desktop
$break-desktop: 1200px;  // full desktop
```

Every component file must use these variables instead of hardcoded breakpoint numbers. Remove all per-component breakpoint variables (`$mobile-breakpoint`, `--mll-break-mobile`, `--cv-break-md`, etc.) and import the global ones.

#### Mobile viewport fix — `100dvh` instead of `100vh`

Replace all `height: 100vh` and `min-height: 100vh` with `min-height: 100dvh` (dynamic viewport height). This fixes the mobile browser address-bar problem where `100vh` is taller than the visible area. Add a fallback for older browsers:

```scss
min-height: 100vh;           // fallback
min-height: 100dvh;          // modern mobile browsers
```

Files that need this change: `app.component.scss`, `recipe-book-list.component.scss`, `recipe-builder.page.scss`, `cook-view.page.scss`, `menu-intelligence.page.scss`, `metadata-manager.page.component.scss`, `menu-library.page.scss`.

#### Safe-area insets for notched devices

Add to `body` in `styles.scss`:

```scss
body {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

#### Touch target minimum

All interactive elements (buttons, links, icon buttons) must have a minimum touch target of **44x44px** on mobile. The `c-icon-btn` engine already uses `2.25rem` (36px) — on mobile, increase to `2.75rem` (44px):

```scss
@media (max-width: $break-mobile) {
  .c-icon-btn {
    width: 2.75rem;
    height: 2.75rem;
  }

  .c-btn-primary,
  .c-btn-ghost {
    min-height: 2.75rem;
    padding-block: 0.75rem;
  }
}
```

#### Backdrop-filter performance on mobile

`backdrop-filter: blur()` is GPU-intensive on mobile. Reduce blur values on mobile to maintain 60fps:

```scss
@media (max-width: $break-mobile) {
  :root {
    --blur-glass: blur(10px);
    --blur-nav:   blur(12px);
    --blur-modal: blur(16px);
  }
}
```

---

### 6.1 Header — Mobile Navigation

**File:** `src/app/core/components/header/header.component.scss`  
**File:** `src/app/core/components/header/header.component.html`

**Desktop (above 768px):** Horizontal frosted-glass nav bar with all links visible, centered.

**Mobile (768px and below):** The horizontal link list does not fit on a phone. Convert to a **hamburger menu** that opens a full-screen glass overlay:

**SCSS to add:**

```scss
.header-nav {
  /* ...existing desktop styles... */

  .mobile-menu-btn {
    display: none;
  }

  @media (max-width: $break-mobile) {
    padding-inline: 1rem;

    .mobile-menu-btn {
      display: grid;
      place-content: center;
      width: 2.75rem;
      height: 2.75rem;
      background: var(--bg-glass);
      color: var(--color-text-main);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      backdrop-filter: var(--blur-glass);
      cursor: pointer;
    }

    ul {
      position: fixed;
      inset: 0;
      z-index: 200;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 2rem;
      background: var(--bg-glass-strong);
      backdrop-filter: var(--blur-modal);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;

      &.menu-open {
        opacity: 1;
        pointer-events: auto;
      }

      li a {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 100%;
        max-width: 16rem;
        padding-block: 1rem;
        font-size: 1.125rem;
        font-weight: 500;
        border-radius: var(--radius-lg);
        text-align: center;

        &.active {
          background: var(--color-primary);
          color: var(--color-text-on-primary);
          font-weight: 600;
        }
      }
    }

    .mobile-close-btn {
      position: absolute;
      top: 1rem;
      inset-inline-end: 1rem;
      display: grid;
      place-content: center;
      width: 2.75rem;
      height: 2.75rem;
      background: var(--bg-glass);
      border: 1px solid var(--border-default);
      border-radius: var(--radius-md);
      color: var(--color-text-main);
      cursor: pointer;
    }
  }
}
```

**HTML changes required:** Add a `<button class="mobile-menu-btn">` with a hamburger icon before the `<ul>`. Add a `<button class="mobile-close-btn">` inside the `<ul>`. Add a signal/state `isMobileMenuOpen` to toggle the `.menu-open` class on `<ul>`. Each `<a>` click should close the menu.

---

### 6.2 Footer — Mobile

**File:** `src/app/core/components/footer/footer.component.scss`

**Desktop:** Fixed frosted-glass bar with three columns (date, logo, recipe count).

**Mobile (768px and below):** Reduce to a slim single-row bar. Hide non-essential info:

```scss
.app-footer {
  /* ...existing styles... */

  @media (max-width: $break-mobile) {
    padding-inline: 1rem;
    padding-block: 0.375rem;

    .left-content,
    .right-content {
      font-size: 0.75rem;
    }

    .center-content .logo {
      width: 1.5rem;
      height: 1.5rem;
    }
  }
}
```

---

### 6.3 Dashboard Overview — Mobile

**File:** `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.scss`

**Desktop (above 900px):** Two-column layout: KPI grid on the left, activity section on the right. Quick-action buttons in a row.

**Mobile (900px and below):** Single column, everything stacks:

```scss
.dashboard-header {
  @media (max-width: $break-tablet) {
    flex-direction: column;
    align-items: stretch;
    gap: 1rem;

    .page-title {
      text-align: center;
    }

    .quick-actions {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 0.5rem;

      .qa-btn {
        justify-content: center;
        font-size: 0.8125rem;
        padding-inline: 0.75rem;
      }
    }
  }
}

.dashboard-main {
  @media (max-width: $break-tablet) {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }
}

.kpi-grid {
  @media (max-width: $break-mobile) {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }
}

.kpi-card {
  @media (max-width: $break-mobile) {
    padding: 1rem;

    .kpi-value {
      font-size: 1.5rem;
    }
  }
}

.activity-item {
  @media (max-width: $break-mobile) {
    flex-wrap: wrap;
    gap: 0.5rem;

    .activity-name {
      flex: 1 1 100%;
      font-weight: 600;
    }
  }
}
```

---

### 6.4 Metadata Manager — Mobile

**File:** `src/app/pages/metadata-manager/metadata-manager.page.component.scss`

**Desktop:** Multi-column card grid.  
**Mobile (830px and below):** Single column stack.

```scss
.admin-grid {
  @media (max-width: $break-tablet) {
    grid-template-columns: 1fr;
    max-width: 28rem;
    margin-inline: auto;
  }
}

.manager-card {
  @media (max-width: $break-mobile) {
    padding: 1rem;
  }
}
```

---

### 6.5 Data Grids (Recipe Book + Inventory) — Mobile Card Layout

**Files:**

- `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss`
- `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.scss`

**Desktop (above 768px):** Standard CSS grid table with header row and data rows. Grid columns defined by `$recipes-grid-template` / `$products-grid-template`. Sidebar visible as a sticky column.

**Mobile (768px and below):** The multi-column grid does not fit on a phone screen. Convert each row into a **stacked card layout**:

#### Container layout change

```scss
// Shared for both recipe-book-list and inventory-product-list:
@media (max-width: $break-mobile) {
  .recipe-book-container,
  .inventory-container {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "table";
    padding: 1rem;
    gap: 0;
    height: auto;
    min-height: auto;
  }

  .action-bar {
    flex-wrap: wrap;
    gap: 0.75rem;

    .page-title {
      order: -1;
      flex: 1 1 100%;
      text-align: start;
      font-size: 1.25rem;
    }

    .add-btn {
      flex: 1;
      justify-content: center;
    }
  }
}
```

#### Grid-to-card conversion

```scss
@media (max-width: $break-mobile) {
  .recipes-grid,
  .products-grid {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    background: transparent;
    border: none;
    border-radius: 0;
    overflow: visible;
    box-shadow: none;
    backdrop-filter: none;
  }

  .recipes-grid-header,
  .products-grid-header {
    display: none;
  }

  .recipe-grid-row,
  .product-grid-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 1rem;
    background: var(--bg-glass-strong);
    border: 1px solid var(--border-glass);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-glass);
    backdrop-filter: var(--blur-glass);
  }

  .recipe-grid-row > *,
  .product-grid-row > * {
    padding: 0;
    border-bottom: none;
    text-align: start;
    justify-content: flex-start;
  }

  /* Name takes full width, prominent */
  .col-name {
    flex: 1 1 100%;
    font-weight: 600;
    font-size: 1rem;
    color: var(--color-text-main);
  }

  /* Secondary fields wrap in a row */
  .col-type,
  .col-main-category,
  .col-category,
  .col-supplier {
    flex: 0 0 auto;
    font-size: 0.8125rem;
    color: var(--color-text-muted);

    &::before {
      display: none; /* Remove any label prefixes if not needed */
    }
  }

  /* Cost and price */
  .col-cost,
  .col-price {
    flex: 0 0 auto;
    font-weight: 600;
    color: var(--color-primary);
  }

  /* Allergens */
  .col-allergens {
    flex: 1 1 100%;
    justify-content: flex-start;
  }

  /* Actions row at bottom */
  .col-actions {
    flex: 1 1 100%;
    justify-content: flex-end;
    padding-block-start: 0.5rem;
    border-block-start: 1px solid var(--border-default);
  }

  /* Unit select */
  .col-unit {
    flex: 0 0 auto;
  }
}
```

#### Sidebar on mobile — full-screen glass overlay

Both recipe-book and inventory already have touch-swipe sidebar behavior. Reinforce with glass styling:

```scss
@media (max-width: $break-mobile) {
  .action-sidebar {
    position: fixed;
    top: 0;
    inset-inline-end: 0;
    bottom: 0;
    z-index: 200;
    width: 85vw;
    max-width: 20rem;
    background: var(--bg-glass-strong);
    backdrop-filter: var(--blur-modal);
    border-radius: 0;
    border: none;
    border-inline-start: 1px solid var(--border-glass);
    box-shadow: -4px 0 24px rgba(0, 0, 0, 0.12);
    transform: translateX(100%);
    transition: transform 0.35s ease;

    &.open {
      transform: translateX(0);
      width: 85vw;
      min-width: 85vw;
    }
  }

  .sidebar-content {
    max-height: none;
    padding-block-start: 4rem;
    transform: none;

    .action-sidebar.open & {
      transform: none;
    }
  }

  .sidebar-close-btn {
    &.desktop-only {
      display: none;
    }
  }
}
```

#### Mobile search bar (recipe-book)

The existing `.mobile-search-bar` pattern is correct. Update styling to glass:

```scss
@media (max-width: $break-mobile) {
  .mobile-search-bar {
    position: fixed;
    top: 0;
    inset-inline: 0;
    z-index: 99;
    padding: 0.5rem 1rem;
    background: var(--bg-frosted-nav);
    backdrop-filter: var(--blur-nav);
    border-block-end: 1px solid var(--border-glass);
    box-shadow: 0 1px 8px rgba(0, 0, 0, 0.04);
  }

  .mobile-search-toggle {
    width: 2.75rem;
    height: 2.75rem;
    background: var(--bg-glass);
    border: 1px solid var(--border-default);
    border-radius: var(--radius-md);
    color: var(--color-text-muted);
  }
}
```

---

### 6.6 Equipment & Venue Tables — Mobile

**Files:**

- `src/app/pages/equipment/components/equipment-list/equipment-list.component.scss`
- `src/app/pages/venues/components/venue-list/venue-list.component.scss`

**Desktop:** Standard `<table>` with glass styling.

**Mobile (768px and below):** Convert table to stacked cards. Each `<tr>` becomes a card with label-value pairs:

```scss
@media (max-width: $break-mobile) {
  .equipment-table,
  .venue-table {
    border-collapse: separate;

    thead {
      display: none;
    }

    tbody tr {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      padding: 1rem;
      margin-block-end: 0.75rem;
      background: var(--bg-glass-strong);
      border: 1px solid var(--border-glass);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-glass);
      backdrop-filter: var(--blur-glass);
    }

    td {
      padding: 0;
      border-bottom: none;
      text-align: start;

      &.col-name {
        flex: 1 1 100%;
        font-weight: 600;
        font-size: 1rem;
      }

      &.col-category,
      &.col-env {
        flex: 1 1 auto;
        font-size: 0.8125rem;
        color: var(--color-text-muted);
      }

      &.col-owned,
      &.col-infra,
      &.col-consumable {
        flex: 0 0 auto;
        font-size: 0.875rem;
      }

      &.col-actions {
        flex: 1 1 100%;
        display: flex;
        justify-content: flex-end;
        gap: 0.5rem;
        padding-block-start: 0.5rem;
        border-block-start: 1px solid var(--border-default);
      }
    }
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;

    .search-section .input-wrapper {
      max-width: none;
    }
  }
}
```

---

### 6.7 Equipment & Venue Forms — Mobile

**Files:**

- `src/app/pages/equipment/components/equipment-form/equipment-form.component.scss`
- `src/app/pages/venues/components/venue-form/venue-form.component.scss`

**Desktop:** Max-width 35rem, standard form layout.

**Mobile (768px and below):**

```scss
@media (max-width: $break-mobile) {
  .equipment-form-container,
  .venue-form-container {
    max-width: none;
    padding-inline: 0.5rem;
  }

  .form-actions {
    flex-direction: column;
    gap: 0.5rem;

    .btn {
      width: 100%;
      justify-content: center;
    }
  }

  .scaling-fields {
    grid-template-columns: 1fr 1fr;
  }

  .infra-row {
    flex-wrap: wrap;

    select {
      flex: 1 1 100%;
    }

    input[type="number"] {
      flex: 1;
    }
  }
}
```

---

### 6.8 Product Form — Mobile

**File:** `src/app/pages/inventory/components/product-form/product-form.component.scss`

**Desktop:** 4-column grid sections, max-width 800px.

**Mobile:**

```scss
@media (max-width: $break-tablet) {
  .form-container .form-section {
    grid-template-columns: repeat(2, 1fr);
  }

  .form-container .form-section.product-info {
    grid-template-columns: repeat(2, 1fr);
  }

  .scaling-row {
    flex-wrap: wrap;
    gap: 0.5rem;
  }
}

@media (max-width: $break-mobile) {
  .product-form-container {
    max-width: none;
  }

  .form-container {
    padding: 1.25rem;
  }

  .form-container .form-section,
  .form-container .form-section.product-info {
    grid-template-columns: 1fr;
  }

  .form-actions {
    flex-direction: column;
    gap: 0.5rem;

    button {
      width: 100%;
      justify-content: center;
    }
  }
}
```

---

### 6.9 Recipe Builder — Mobile

**File:** `src/app/pages/recipe-builder/recipe-builder.page.scss`

**Desktop:** Max-width 960px, stacked sections.

**Mobile (768px and below):**

```scss
@media (max-width: $break-mobile) {
  .recipe-builder-container {
    padding: 1rem 0.75rem;
  }

  .builder-shell {
    gap: 1.25rem;
  }

  .section-card {
    padding: 1rem;
    border-radius: var(--radius-md);
    border-inline-start-width: 3px;
  }

  .section-title {
    font-size: 1.1rem;
    margin-block-end: 1rem;
  }

  .main-submit-btn {
    width: 100%;
    max-width: none;
  }

  .add-row-btn {
    width: 100%;
    justify-content: center;
    border-radius: var(--radius-md);
  }

  .logistics-logic .baseline-row {
    flex-direction: column;
    align-items: stretch;

    select, .qty-input {
      width: 100%;
    }

    .critical-check {
      align-self: flex-start;
    }
  }
}
```

### 6.10 Recipe Header — Mobile

**File:** `src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.scss`

**Desktop:** 3-column grid: image | controls | metrics.

**Mobile (650px and below — keep existing breakpoint logic but use `$break-mobile`):**

```scss
@media (max-width: $break-mobile) {
  .header-dashboard-container {
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    padding: 1rem;
  }

  .center-controls {
    display: contents;
  }

  .top-row {
    grid-column: 1 / -1;

    .recipe-name-input {
      font-size: 1.15rem;
    }
  }

  .scaling-dock-grid {
    display: contents;
  }

  .primary-chip-wrapper {
    grid-column: 1 / -1;
    justify-content: center;
  }

  .secondary-units-container {
    grid-column: 1 / -1;
    border-inline-end: none;
    border-block-end: 1px solid var(--border-default);
    padding-inline-end: 0;
    padding-block-end: 1rem;
  }

  .image-square {
    width: 5rem;
    height: 5rem;
  }

  .metrics-square {
    height: auto;
    padding: 0.75rem;
    gap: 0.5rem;
    min-width: 0;
  }
}
```

### 6.11 Recipe Ingredients Table — Mobile

**File:** `src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.scss`

**Desktop:** 6-column grid.

**Mobile (768px and below):** Simplify to 2-3 columns, stack vertically:

```scss
@media (max-width: $break-mobile) {
  .ingredients-grid-header,
  .ingredient-grid-row {
    grid-template-columns: 2fr 1fr 1fr;
    gap: 0.5rem;
    padding-inline: 0.75rem;
  }

  /* Hide percentage and cost columns on mobile */
  .col-percent,
  .col-cost {
    display: none;
  }

  .col-actions {
    grid-column: -1;
    grid-row: 1;
  }

  .quantity-controls .qty-btn {
    width: 2.75rem;
    height: 2.75rem;
  }
}
```

### 6.12 Recipe Workflow — Mobile

**File:** `src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.scss`

**Desktop:** 4-column grid (step#, instruction, timer, delete).

**Mobile (768px and below):**

```scss
@media (max-width: $break-mobile) {
  .workflow-grid .grid-header {
    display: none;
  }

  .workflow-grid .grid-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.75rem;

    .step-badge {
      flex: 0 0 auto;
    }

    .workflow-textarea {
      flex: 1 1 100%;
      min-height: 3rem;
    }

    .timer-counter {
      flex: 0 0 auto;
    }
  }

  /* Prep grid (dish mode) */
  .prep-grid-header {
    display: none;
  }

  .prep-grid-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.75rem;

    .col-prep-name {
      flex: 1 1 100%;
      font-weight: 600;
    }
  }
}
```

---

### 6.13 Menu Library List — Mobile

**File:** `src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.scss`

**Desktop:** Action bar with title + search + add button. Filters bar. Card list.

**Mobile (768px and below):**

```scss
@media (max-width: $break-mobile) {
  .menu-library-container {
    padding: 1rem;
  }

  .action-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;

    .page-title {
      font-size: 1.25rem;
      text-align: center;
    }

    .search-wrap {
      max-width: none;
    }

    .add-btn {
      width: 100%;
      justify-content: center;
    }
  }

  .filters-bar {
    flex-direction: column;
    gap: 0.75rem;

    .filter-item {
      width: 100%;
    }

    .date-range-wrap {
      width: 100%;
    }

    .date-range-inputs {
      flex-direction: column;
      gap: 0.5rem;

      .date-range-sep {
        display: none;
      }
    }
  }

  .event-card {
    flex-direction: column;
    gap: 0.75rem;

    .card-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.25rem;
      padding-block-start: 0.5rem;
      border-block-start: 1px solid var(--border-default);
    }
  }
}
```

---

### 6.14 Menu Intelligence — Mobile

**File:** `src/app/pages/menu-intelligence/menu-intelligence.page.scss`

**Desktop:** Centered paper with toolbar and financial bar.

**Mobile (600px and below):**

```scss
@media (max-width: $break-mobile) {
  .menu-editor-shell {
    padding: 0.75rem 0.75rem 6rem;
  }

  .editor-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;

    .toolbar-actions {
      display: flex;
      gap: 0.5rem;

      .toolbar-btn {
        flex: 1;
        justify-content: center;
        font-size: 0.8125rem;
      }
    }
  }

  .paper {
    padding: 0.5rem;
  }

  .paper-inner {
    padding: 1.25rem 1rem 1.5rem;
  }

  .meta-column {
    max-width: none;
  }

  .meta-row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.25rem;

    .meta-label {
      min-width: 0;
      text-align: start;
    }
  }

  .section-search-wrap {
    width: 100%;
  }

  .dish-row {
    gap: 0.5rem;
    padding-inline: 0.5rem;
  }

  .financial-bar {
    flex-wrap: wrap;
    gap: 1rem;
    padding: 0.75rem 1rem;
    justify-content: space-around;
  }
}
```

---

### 6.15 Cook View — Mobile

**File:** `src/app/pages/cook-view/cook-view.page.scss`

**Desktop (above 900px):** Two-column layout — header spans top, ingredients + steps side by side.

**Mobile (900px and below):** Single column, everything stacks. This is a cook-mode screen, so readability is paramount:

```scss
@media (max-width: $break-tablet) {
  .cook-view-shell {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;

    .cook-view-main {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
  }
}

@media (max-width: $break-mobile) {
  .cook-view-container {
    padding: 0.75rem;
  }

  .cook-view-header {
    padding: 1rem;
    border-radius: var(--radius-md);

    .header-top {
      flex-direction: column;
      align-items: stretch;
      gap: 0.75rem;

      .recipe-name {
        font-size: 1.15rem;
        text-align: center;
      }

      .edit-btn,
      .edit-actions {
        align-self: center;
      }

      .edit-actions {
        flex-wrap: wrap;
        justify-content: center;
      }
    }

    .quantity-control-wrap {
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.75rem;
    }

    .quantity-controls .qty-btn {
      padding: 0.625rem;
    }

    .scaled-cost-badge {
      align-self: center;
    }
  }

  .cook-view-section {
    padding: 0.875rem;

    .section-title {
      font-size: 1rem;
    }
  }

  .ingredients-table-header,
  .ingredients-table-row {
    grid-template-columns: 50% 25% 25%;
    gap: 0.5rem;
    padding: 0.5rem 0.625rem;
    font-size: 0.875rem;
  }

  .step-item {
    padding: 0.625rem;
  }

  .prep-row {
    padding: 0.625rem;
  }
}
```

---

### 6.16 Trash Page — Mobile

**File:** `src/app/pages/trash/trash.page.scss`

**Desktop:** Max-width 720px, centered.

**Mobile:**

```scss
@media (max-width: $break-mobile) {
  .trash-page {
    padding: 1rem;
  }

  .trash-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.75rem;

    h1 {
      font-size: 1.25rem;
      text-align: center;
    }

    .btn-refresh {
      width: 100%;
      justify-content: center;
    }
  }

  .trash-section-header {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
  }

  .trash-section-actions {
    display: flex;
    gap: 0.5rem;

    .btn-action {
      flex: 1;
      justify-content: center;
      font-size: 0.75rem;
    }
  }

  .trash-item {
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;

    .trash-item-actions {
      display: flex;
      gap: 0.25rem;
      justify-content: flex-end;
    }
  }
}
```

---

### 6.17 Shared Modals — Mobile

**Files:** All 6 modal SCSS files.

Modals already use `width: 90%` which works on mobile. Add:

```scss
@media (max-width: $break-mobile) {
  .c-modal-card,
  .modal-card {
    max-width: none;
    width: calc(100% - 2rem);
    margin-inline: 1rem;
    padding: 1.25rem;
    border-radius: var(--radius-lg);
    max-height: calc(100dvh - 4rem);
    overflow-y: auto;
  }

  .formula-grid {
    padding: 1rem;

    &[style*="grid-template-columns"] {
      grid-template-columns: 1fr;
    }
  }

  .modal-actions {
    flex-direction: column;
    gap: 0.5rem;

    button {
      width: 100%;
      justify-content: center;
      min-height: 2.75rem;
    }
  }
}
```

For the **unit-creator** modal specifically (`.formula-grid` has auto-fit columns):

```scss
@media (max-width: $break-mobile) {
  .formula-grid {
    grid-template-columns: 1fr 1fr;

    .math-operator {
      display: none;
    }
  }
}
```

---

### 6.18 Version History Panel — Mobile

**File:** `src/app/shared/version-history-panel/version-history-panel.component.scss`

```scss
@media (max-width: $break-mobile) {
  .version-history-panel {
    min-width: 0;
    max-width: calc(100vw - 2rem);
    width: 100%;
  }

  .version-actions {
    flex-wrap: wrap;
  }
}
```

---

### 6.19 Ingredient Search & Preparation Search — Mobile

**Files:**

- `src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.scss`
- `src/app/pages/recipe-builder/components/preparation-search/preparation-search.component.scss`

```scss
@media (max-width: $break-mobile) {
  .results-dropdown {
    max-height: 12rem;
    position: fixed;
    inset-inline: 1rem;
    top: auto;
    bottom: 0;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    box-shadow: var(--shadow-modal);
    z-index: 200;
  }
}
```

---

### 6.20 Responsive Summary Table


| Component                   | Desktop                                    | Mobile (<=768px)                                      |
| --------------------------- | ------------------------------------------ | ----------------------------------------------------- |
| **Header**                  | Horizontal glass nav bar, all links        | Hamburger menu, full-screen glass overlay             |
| **Footer**                  | Fixed glass bar, 3 columns                 | Slimmer bar, smaller elements                         |
| **Dashboard KPIs**          | 2-column main, auto-fit KPI grid           | Single column, 2-column KPI grid                      |
| **Dashboard Activity**      | Side-by-side with KPIs                     | Stacks below KPIs, wrapped items                      |
| **Metadata Manager**        | Multi-column card grid                     | Single column stack                                   |
| **Recipe Book / Inventory** | Data grid table + sidebar                  | Cards + full-screen glass drawer                      |
| **Equipment / Venue List**  | HTML table                                 | Stacked cards (hide `<thead>`)                        |
| **Equipment / Venue Form**  | Max-width form                             | Full-width, stacked actions                           |
| **Product Form**            | 4-column grid sections                     | 1-column at 768px                                     |
| **Recipe Builder**          | Max-width stacked sections                 | Full-width, stacked logistics                         |
| **Recipe Header**           | 3-column grid                              | 2-column, contents reflow                             |
| **Ingredients Table**       | 6-column grid                              | 3-column (hide % and cost)                            |
| **Workflow**                | 4-column grid                              | Wrapped flex, hide header                             |
| **Menu Library**            | Horizontal action bar + filter bar + cards | Stacked action bar, stacked filters, full-width cards |
| **Menu Intelligence**       | Centered paper preview                     | Full-width paper, stacked meta                        |
| **Cook View**               | 2-column (ingredients + steps)             | Single column stack, centered header                  |
| **Trash**                   | Max-width list                             | Full-width, stacked items                             |
| **Modals**                  | Centered card, max-width varies            | Full-width minus 2rem, stacked buttons                |
| **Dropdowns**               | Absolute, below input                      | Fixed to bottom of screen                             |


---

### 6.21 Mobile Performance Considerations

1. **Reduce `backdrop-filter` blur** on mobile (done in 6.0)
2. **Disable hover lift** (`transform: translateY(-1px)`) on touch devices — use `@media (hover: hover)`:

```scss
.c-glass-card {
  /* base: no hover effect */
  @media (hover: hover) {
    &:hover {
      background: var(--bg-glass-hover);
      box-shadow: var(--shadow-hover);
      transform: translateY(-1px);
    }
  }
}
```

Apply the same `@media (hover: hover)` wrapper to all hover-lift effects in `c-btn-primary`, `c-icon-btn`, and similar engines.

1. **Action button always-visible on mobile** — remove `opacity: 0.7` default on mobile since there is no hover to reveal:

```scss
@media (max-width: $break-mobile) {
  .c-icon-btn {
    opacity: 1;
  }

  .action-btn {
    opacity: 1;
  }
}
```

1. **Disable card hover shadow on touch** — same `@media (hover: hover)` pattern.
2. **Scrolling performance** — avoid `backdrop-filter` on elements inside scroll containers. The `body::before` ambient gradient is `position: fixed` and doesn't scroll, which is fine. For sidebar content that scrolls, do not apply `backdrop-filter` to individual list items — only to the sidebar container.

---

### 6.22 Touch Interaction Guidelines

1. **Sidebar swipe-to-close** (already in recipe-book and inventory): Keep the existing `touchstart`/`touchmove`/`touchend` handler pattern. Ensure the swipe threshold is at least 50px before closing.
2. **Cost tooltip on mobile** (recipe-book): The existing `toggleCostTooltipTap()` pattern is correct for mobile. Keep it.
3. **Pull-to-refresh**: Not required for now, but the architecture supports it if needed later.
4. **No long-press menus**: All actions are visible via icon buttons; no hidden long-press interactions.
5. **Scroll snap for horizontal pill filters**: If any filter bar has too many items, add `overflow-x: auto` and `scroll-snap-type: x mandatory` on mobile:

```scss
@media (max-width: $break-mobile) {
  .filters-bar,
  .tab-nav {
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }

    > * {
      scroll-snap-align: start;
      flex-shrink: 0;
    }
  }
}
```

---

## Part 7: Micro-Interactions and Animations

This section defines every animation and interactive delight across the app. Each entry specifies **what triggers it**, **what happens visually**, and **where to apply it** (which engine or component file). All animations respect `@media (prefers-reduced-motion: reduce)` — add this global rule to `styles.scss`:

```scss
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 7.1 Glass Card Hover — Lift and Glow

**Where:** `.c-glass-card` engine, used by KPI cards, event cards, trash items, data-grid row cards (mobile).  
**Trigger:** Mouse enters card (desktop only via `@media (hover: hover)`).  
**Effect:** Card lifts 2px and shadow intensifies, creating a subtle "floating" feeling. A very faint teal glow appears at the bottom edge.

```scss
.c-glass-card {
  transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1),
              box-shadow 0.25s cubic-bezier(0.22, 1, 0.36, 1),
              background 0.2s ease;

  @media (hover: hover) {
    &:hover {
      transform: translateY(-2px);
      box-shadow:
        var(--shadow-hover),
        0 4px 16px rgba(20, 184, 166, 0.08);
    }
  }
}
```

### 7.2 Button Press — Scale Down

**Where:** `.c-btn-primary`, `.c-btn-ghost` engines.  
**Trigger:** User clicks/taps the button (`:active` pseudo-class).  
**Effect:** Button scales down to 97% for 100ms, giving tactile "press" feedback. On release, it springs back.

```scss
.c-btn-primary,
.c-btn-ghost {
  transition: transform 0.15s cubic-bezier(0.22, 1, 0.36, 1),
              background 0.2s ease,
              box-shadow 0.2s ease;

  &:active:not(:disabled) {
    transform: scale(0.97);
  }
}
```

### 7.3 Icon Button — Rotate on Hover

**Where:** `.c-icon-btn` engine (edit, delete, cook, history, clone action buttons).  
**Trigger:** Mouse enters icon button.  
**Effect:** Icon rotates 8 degrees and scales up slightly. This makes icons feel alive.

```scss
.c-icon-btn {
  transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1),
              background 0.2s ease,
              color 0.2s ease,
              opacity 0.2s ease;

  @media (hover: hover) {
    &:hover {
      transform: scale(1.12) rotate(-8deg);
    }

    &.danger:hover {
      transform: scale(1.12) rotate(8deg);
    }
  }
}
```

### 7.4 Input Focus — Border Expand

**Where:** `.c-input`, `.c-select`, `.c-input-wrapper` engines.  
**Trigger:** Input receives focus.  
**Effect:** The teal focus ring expands outward from center with a brief glow pulse, then settles to a steady 3px ring. Uses `box-shadow` animation.

```scss
@keyframes focusPulse {
  0%   { box-shadow: 0 0 0 0 rgba(20, 184, 166, 0.4); }
  50%  { box-shadow: 0 0 0 5px rgba(20, 184, 166, 0.15); }
  100% { box-shadow: var(--shadow-focus); }
}

.c-input:focus,
.c-select:focus,
.c-input-wrapper:focus-within {
  animation: focusPulse 0.4s ease-out;
}
```

### 7.5 Page Entry — Fade In and Slide Up

**Where:** `.app-content` (the `<router-outlet>` container in `app.component.scss`).  
**Trigger:** Route change — new page content appears.  
**Effect:** The incoming page fades in and slides up by 12px over 300ms. This can be done via Angular's route animation or a CSS-only approach using `:host` on each page.

**CSS-only approach (per page):** Add to every page-level `:host` block:

```scss
:host {
  display: block;
  animation: pageEnter 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes pageEnter {
  from {
    opacity: 0;
    transform: translateY(0.75rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**Files to apply this:** Every page-level SCSS file:

- `dashboard.page.scss`, `inventory.page.scss`, `equipment.page.scss`, `venues.page.scss`, `recipe-book.page.scss`, `recipe-builder.page.scss`, `cook-view.page.scss`, `menu-library.page.scss`, `menu-intelligence.page.scss`, `trash.page.scss`

### 7.6 Modal Enter/Exit — Scale and Fade

**Where:** `.c-modal-overlay` and `.c-modal-card` engines.  
**Trigger:** Modal opens or closes.  
**Effect:** Overlay fades in. Card scales from 95% to 100% and fades in. On close, reverse.

```scss
@keyframes overlayIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(0.5rem);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.c-modal-overlay {
  animation: overlayIn 0.2s ease-out;
}

.c-modal-card {
  animation: cardIn 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}
```

### 7.7 Sidebar Open/Close — Slide with Glass Blur

**Where:** `.action-sidebar` in recipe-book-list and inventory-product-list.  
**Trigger:** Burger button click or swipe gesture.  
**Effect:** Sidebar slides in from the inline-end side with a slight blur-in effect. The backdrop (page content behind) dims slightly.

Already partially implemented with `transform: translateX()`. Enhance with an easing curve:

```scss
.action-sidebar {
  transition: transform 0.35s cubic-bezier(0.22, 1, 0.36, 1),
              box-shadow 0.35s ease;
}
```

### 7.8 Data Grid Row — Stagger Entrance

**Where:** `.recipe-grid-row`, `.product-grid-row` in recipe-book-list and inventory-product-list.  
**Trigger:** Page loads or filter changes and rows appear.  
**Effect:** Each row fades in with a slight upward slide, staggered by 30ms per row. Use `animation-delay` with CSS custom property set via `[style.--row-index]` in the template.

**SCSS:**

```scss
@keyframes rowEnter {
  from {
    opacity: 0;
    transform: translateY(0.5rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.recipe-grid-row,
.product-grid-row {
  animation: rowEnter 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--row-index, 0) * 30ms);
}
```

**HTML change:** On each `@for` loop, add `[style.--row-index]="$index"` to the row element. Cap at 15 (so max delay is 450ms):

```html
<div class="recipe-grid-row" [style.--row-index]="$index < 15 ? $index : 0">
```

### 7.9 KPI Value — Count Up

**Where:** `.kpi-value` in dashboard-overview.  
**Trigger:** Dashboard loads.  
**Effect:** KPI numbers count up from 0 to their value over 600ms. This is a TypeScript animation, not CSS. Use `requestAnimationFrame` to animate a displayed signal from 0 to the target.

**Implementation hint:** Create a utility function `animateValue(from: number, to: number, duration: number): Signal<number>` and use it in the dashboard overview component for each KPI.

### 7.10 Chip/Tag — Pop In

**Where:** `.c-chip` engine, allergen pills, filter chips, ingredient chips.  
**Trigger:** Chip is added (e.g., selecting a filter, adding an allergen).  
**Effect:** Chip pops in with a slight scale overshoot.

```scss
@keyframes chipPop {
  0%   { transform: scale(0); opacity: 0; }
  60%  { transform: scale(1.1); }
  100% { transform: scale(1); opacity: 1; }
}

.c-chip {
  animation: chipPop 0.25s cubic-bezier(0.22, 1, 0.36, 1);
}
```

### 7.11 Tab/Pill Active — Smooth Background Slide

**Where:** `.tab-nav .tab-btn`, dashboard tabs.  
**Trigger:** User switches tabs.  
**Effect:** The active background color transitions smoothly. Already handled by `transition: background 0.2s ease`. No additional code needed, but verify the transition is smooth.

### 7.12 Card Delete — Slide Out and Collapse

**Where:** Event cards in menu-library, trash items, data-grid rows.  
**Trigger:** User deletes an item.  
**Effect:** Card slides out to the inline-end, fades, and then collapses its height to 0 (so the list reflows smoothly). Duration: 300ms.

**Implementation hint:** Before removing from the array, add a `.deleting` class to the item, wait 300ms, then remove from the data. SCSS:

```scss
@keyframes slideOutEnd {
  to {
    opacity: 0;
    transform: translateX(100%);
    max-height: 0;
    padding-block: 0;
    margin-block-end: 0;
    overflow: hidden;
  }
}

.event-card.deleting,
.trash-item.deleting,
.recipe-grid-row.deleting,
.product-grid-row.deleting {
  animation: slideOutEnd 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
```

### 7.13 Toast Message — Slide In from Top

**Where:** `user-msg.component.scss`.  
**Trigger:** Success/error message appears.  
**Effect:** Toast slides down from above the viewport and fades in. On dismiss, slides back up.

```scss
@keyframes toastIn {
  from {
    opacity: 0;
    transform: translateY(-1rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.user-msg {
  animation: toastIn 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
```

### 7.14 Empty State — Gentle Float

**Where:** `.empty-state` blocks in menu-library, recipe-book, inventory (the "no results" / "no data" screens with the icon).  
**Trigger:** Empty state is visible.  
**Effect:** The icon gently floats up and down in a continuous loop (subtle, 3px amplitude, 3s period).

```scss
@keyframes gentleFloat {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(-3px); }
}

.empty-state lucide-icon {
  animation: gentleFloat 3s ease-in-out infinite;
}
```

### 7.15 Quantity Controls — Bounce Feedback

**Where:** `.qty-btn` in cook-view, recipe-header, recipe-ingredients-table.  
**Trigger:** User taps +/- button.  
**Effect:** Button briefly bounces (scale 0.85 then back to 1).

```scss
.qty-btn:active {
  animation: qtyBounce 0.15s ease;
}

@keyframes qtyBounce {
  0%   { transform: scale(1); }
  50%  { transform: scale(0.85); }
  100% { transform: scale(1); }
}
```

### 7.16 Header Nav Link — Underline Grow

**Where:** `.header-nav ul li a` in the desktop header.  
**Trigger:** Mouse hovers over a nav link.  
**Effect:** A teal underline grows from center outward beneath the link text.

```scss
li a {
  position: relative;

  &::after {
    content: '';
    position: absolute;
    inset-inline: 50%;
    bottom: 0.25rem;
    height: 2px;
    background: var(--color-primary);
    border-radius: 1px;
    transition: inset-inline 0.25s cubic-bezier(0.22, 1, 0.36, 1);
  }

  @media (hover: hover) {
    &:hover::after {
      inset-inline: 20%;
    }
  }

  &.active::after {
    inset-inline: 10%;
  }
}
```

### 7.17 Mobile Menu — Staggered Link Entry

**Where:** Header mobile menu overlay (section 6.1).  
**Trigger:** Hamburger menu opens.  
**Effect:** Each nav link fades in and slides up, staggered by 50ms.

```scss
ul.menu-open li {
  animation: linkFadeUp 0.3s cubic-bezier(0.22, 1, 0.36, 1) both;
  animation-delay: calc(var(--link-index, 0) * 50ms);
}

@keyframes linkFadeUp {
  from {
    opacity: 0;
    transform: translateY(1rem);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

Set `--link-index` on each `<li>` in the template.

### 7.18 Filter Expand/Collapse — Smooth Height

**Where:** `.filter-options` in recipe-book-list and inventory-product-list sidebar.  
**Trigger:** User expands/collapses a filter category.  
**Effect:** Options section smoothly reveals its height using `grid-template-rows` animation (the modern CSS technique for animating height to/from 0):

```scss
.filter-options-wrap {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.25s ease;

  &.expanded {
    grid-template-rows: 1fr;
  }

  > .filter-options {
    overflow: hidden;
  }
}
```

This requires a small HTML wrapper around `.filter-options` with the `.filter-options-wrap` class.

### 7.19 Scaling Chip Counter — Number Spin

**Where:** `.counter-grid .chip-input-native` in recipe-header.  
**Trigger:** User increments/decrements a scaling value.  
**Effect:** The number briefly slides out upward and new number slides in from below (or vice versa for decrement). Subtle, 200ms.

**Implementation hint:** This needs a brief class toggle (`spin-up` / `spin-down`) on the number container, with CSS:

```scss
@keyframes spinUp {
  0%   { transform: translateY(0); opacity: 1; }
  50%  { transform: translateY(-0.5rem); opacity: 0; }
  51%  { transform: translateY(0.5rem); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

@keyframes spinDown {
  0%   { transform: translateY(0); opacity: 1; }
  50%  { transform: translateY(0.5rem); opacity: 0; }
  51%  { transform: translateY(-0.5rem); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
```

### 7.20 Animation Easing Token

Add a global easing variable to `:root` in `styles.scss` for consistency:

```scss
:root {
  --ease-spring: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
}
```

All animations above should reference these tokens for consistency.

### 7.21 Animation Summary Table


| Animation         | Trigger      | Duration  | Where                              |
| ----------------- | ------------ | --------- | ---------------------------------- |
| Card lift + glow  | Hover        | 250ms     | c-glass-card                       |
| Button press      | :active      | 150ms     | c-btn-primary, c-btn-ghost         |
| Icon rotate       | Hover        | 200ms     | c-icon-btn                         |
| Focus pulse       | :focus       | 400ms     | c-input, c-select, c-input-wrapper |
| Page enter        | Route change | 300ms     | Every page :host                   |
| Modal enter       | Open         | 250ms     | c-modal-overlay, c-modal-card      |
| Sidebar slide     | Toggle       | 350ms     | action-sidebar                     |
| Row stagger       | Load/filter  | 30ms/row  | grid rows                          |
| KPI count-up      | Page load    | 600ms     | kpi-value (TypeScript)             |
| Chip pop          | Added        | 250ms     | c-chip                             |
| Delete slide-out  | Delete       | 300ms     | cards, rows                        |
| Toast slide-in    | Show         | 300ms     | user-msg                           |
| Empty float       | Visible      | 3s loop   | empty-state icon                   |
| Qty bounce        | Tap +/-      | 150ms     | qty-btn                            |
| Nav underline     | Hover        | 250ms     | header nav link                    |
| Mobile menu links | Open         | 50ms/link | mobile nav                         |
| Filter expand     | Toggle       | 250ms     | filter-options                     |
| Counter spin      | +/-          | 200ms     | scaling chip                       |


