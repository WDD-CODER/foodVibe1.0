# foodVibe1.0 — current state (read from `main`, 2026-10-09)

Angular 19, standalone components, signals, SCSS, lucide-angular. RTL Hebrew (`<html lang="he" dir="rtl">`). Heebo from Google Fonts. Tokens and `.c-*` engine classes live in `src/styles.scss`.

## Shell (`appRoot/app.component.html`)
`<app-header>` → `<app-tab-chips>` → `.app-content > <router-outlet>`; global modals (`@defer`), `<app-hero-fab>`, `<app-confirm-modal>`, `<user-msg>`, update banner.

- **Header** (`core/components/header`): sticky, 3.875rem, frosted (`::before` blur). Three flex zones: user chip or guest avatar + "sign in" (start), centered `.nav-pills` glass group of 4 links (Dashboard, Inventory, Recipe book, Menu library; active = teal gradient pill), brand mark `fc-mark.svg` + "foodCo" 800 (end). Tablet 768–1023: tighter pills. Phone ≤620: top bar hidden, fixed 3.5rem **bottom tab bar** (profile menu + the 4 links). A hamburger drawer markup exists for small tablets.
- **Tab chips** (`tab-chips`): contextual sub-nav under the header, in `app-scroll-rail`, chosen by URL prefix. Dashboard: venues, metadata, suppliers, trash (the current one becomes a "dashboard" home chip). Inventory: products, equipment. Recipes: recipe-builder, cook-view (carry the open recipe id). Menus: menu-library, menu-intelligence. Uses `.c-tab-pill`.
- **Hero FAB** (`hero-fab`): fixed bottom-end, 3.5rem teal circle with flame icon, expands to glass action pills (page actions + "recipe builder"); lifts above the tab bar on phones.

## Routes
dashboard (overview, `?tab=metadata|venues|add-venue|trash`), inventory (list/add/edit, equipment list/add/edit), recipe-book, recipe-builder(/:id), cook(/:id), menu-library, menu-intelligence(/:id), venues (list/add/view/edit), suppliers (list/add/edit), trash. Auth-guarded: add/edit, recipe-builder, menu-intelligence, trash. `pendingChangesGuard` on forms and cook/:id.

## Screens
- **Dashboard overview:** `h1.page-title` + subtitle; 4 `.kpi-card`s (icon chip, label, value, link buttons, sparkline; `warning`/`info` tones); "Recent activity" list grouped by day, rows with entity avatar, type tag, name, action pill, relative time, expandable change chips (`del`/`ins` old→new).
- **List pages** (inventory products, equipment, recipe book, menu library, venues, suppliers) all use **`app-list-shell`** + **`app-page-header`**: title + count chip, filter-toggle button (sliders icon), search (`.c-input-wrapper`), primary "add" pill (icon-only on phone). Below: optional `app-selection-bar` (bulk count, select all, clear, delete, change-field select), pinned pagination + column header (`.c-grid-header-cell`, sortable), grid body of `.c-list-row`/`.c-list-body-cell`, row actions in `app-row-actions-menu` (`.c-icon-btn`), checkbox column (hidden on touch, long-press selects). Side **filter panel** (250px, collapsible; stacks above table ≤1023): `.c-filter-category` headers with counts, `.c-toggle-chip` options with counts and color dots. Phone: columns collapse into a `column-carousel`; table card is one screen tall. Row states: `row--invalid`, `row--incomplete`, `is-selected`, low-stock and validation badges, nutrition badge, allergen popovers, label chips, rating stars, favorite heart, approval-pending clock.
- **Cook view** (`pages/cook-view`): `.cv-shell`, class `theme-kitchen` for a dark kitchen mode (sun/moon toggle in `.cv-nav`). Hero with recipe image or placeholder, scrim, approved badge, cost badge, title, rating stars, live timer chip, prep-progress bar. Actions row: edit (save/undo in edit mode) and an expandable export bar (view + download for recipe info, shopping list, checklist for dishes or cooking steps). Phone-only pane swap bar. Two panes: **ingredients** (progress bar, multiplier chips, quantity counter + unit select + conversion badge, checklist rows with "set recipe by this item" scale action; edit mode swaps to an editable table) and **steps** (cards: active "פעיל עכשיו" with timer/stopwatch pills and "mark done", done with undo, pending tap-to-jump; dish mode shows prep/mise-en-place items; edit mode embeds `app-recipe-workflow`; completion banner). Scaled-view banner, edit-mode banner, `app-approve-stamp` floating, `app-export-preview`. Empty state with recent-recipe chips. Uses emoji (🧪 ⏱ ⌚ 🎉 ✓) in places, which the README says the brand avoids.
- **Others:** recipe-builder (header, ingredients table, workflow, search), menu-intelligence (paper UI, toolbar, dish rows, export sheet), metadata-manager (categories, preparations, users), trash, venue detail/form, supplier/equipment forms, inline-edit panels (desktop inline, tablet/phone modal or bottom sheet).
- **Shared:** modals use `.c-modal-overlay/.c-modal-card/.c-modal-actions`; `app-custom-select` (native select is banned by lint), `app-counter`, `app-scaling-chip`, `app-empty-state`, `app-loader`, `app-scroll-rail`, `app-export-preview`.

## Design system (as implemented)
Liquid Glass. Tokens in `:root` of `styles.scss`; `.c-glass-card` (lifts), `.c-glass-panel`, `.c-btn-primary` (teal gradient pill; `--danger`, `--warning`), `.c-btn-ghost` (+`--sm`), `.c-input`, `.c-input-wrapper`, `.c-chip` (teal/amber/red), `.c-tab-pill`, `.c-toggle-chip`, `.c-tap-chip`, `.c-icon-btn` (hover rotates), `.c-table`, `.c-empty-state`, `.header-btn`, `.inline-edit-panel`, `.m-*` mobile utilities. Breakpoints 479/620/767/768/1023. Reduced-motion respected. Lucide icons only, registered in app config.

## Observations relevant to a refactor
- The shipped app already contains an earlier port of a design ("UI refactor/", plan 305: pills, tab chips, `.cv-*` cook view, `shell.js` parent map). The Heebo redesign in this project is a second pass on the same structure.
- Mixed units: some page SCSS uses `px` (cook view, list-shell), tokens are `rem`.
- Breakpoint sprawl (480/620/767/768/900/1023/1200) and a documented 767/768 collision.
- Hard-coded colors outside tokens (cook view `--cv-*`, header rgba values, `#fff`).
- Duplicated filter/list markup across inventory, recipe book, equipment, venues, suppliers.
- Emoji in cook view versus a no-emoji brand rule.
- Large files: cook-view.page.html 29 KB / scss 33 KB, styles.scss 52 KB.
- Heebo in the app versus Heebo in this project's redesign.
