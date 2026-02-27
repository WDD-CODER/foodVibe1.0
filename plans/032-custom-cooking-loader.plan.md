# 032 — Custom Cooking Loader for FoodVibe

## Overview

FoodVibe currently has zero visual loading indicators — no spinners, no skeletons, no animated loaders anywhere in the application. When data loads, the user sees plain text ("pending") or nothing at all. This plan defines a custom, branded loader that fits the **Liquid Glass** design system, uses a **cooking-themed animation**, supports Hebrew, and specifies exactly where and how to apply it across every page and component.

---

## 1. The Loader Concept — "Simmering Pot"

The loader is a small animated cooking pot that gently simmers. It consists of three visual elements:

1. **A pot silhouette** — a simple rounded pot shape (SVG or CSS-drawn), using `var(--color-primary)` (teal) as the stroke/fill color. Approximately 48px wide for the standard size, 24px for inline/small.

2. **Steam wisps** — three thin curved lines that rise from the pot and fade out, staggered in timing. They use `var(--color-primary-soft)` (semi-transparent teal). Each wisp takes 1.5s to rise and fade, offset by 0.3s from the previous one. This creates a gentle, continuous simmering effect.

3. **Optional text label** — below the pot, a translated label (e.g., the Hebrew for "loading...", "saving...", "cooking up your data...") in `var(--color-text-muted)`, `font-size: 0.875rem`, `font-weight: 500`. The text should be configurable via an input. - yes i like this!

The whole loader lives inside a **glass container** — a small `var(--bg-glass)` box with `backdrop-filter: var(--blur-glass)`, `border-radius: var(--radius-lg)`, and `var(--shadow-glass)`. This ties it to the Liquid Glass system.

### Size variants

The loader component must support three sizes via an input:

- **`large`** — 48px pot, visible text label, used for full-page loading states (initial route load, demo data import). Pot centered in the viewport.
- **`medium`** — 32px pot, optional text, used for section-level loading (loading a panel, loading version history). Centered in the section.
- **`small`** — 20px pot, no text, inline. Used next to a button label (e.g., "Saving..." with a small simmering pot next to the text). No glass container — just the pot and steam inline.

### Color variants

- **Default (teal):** For general loading states. Uses `var(--color-primary)`.
- **Success (green):** Briefly shown when loading completes (pot produces a checkmark wisp). Uses `var(--color-success)`. Duration: 600ms, then disappears.
- **Warning (amber):** For slow loads (shown after 5s of loading). Uses `var(--border-warning)`.

---

## 2. Component Architecture

Create a single reusable Angular standalone component:

**File path:** `src/app/shared/loader/loader.component.ts`
**File path:** `src/app/shared/loader/loader.component.html`
**File path:** `src/app/shared/loader/loader.component.scss`

### Inputs

- `size: 'large' | 'medium' | 'small'` — default `'medium'`
- `label: string` — optional, translation key displayed below the pot (e.g., `'pending'`, `'saving'`, a custom string). Only shown for large and medium.
- `overlay: boolean` — default `false`. When true, the loader renders inside a full-area semi-transparent glass overlay that covers its parent container (useful for section-level or page-level loading overlays).
- `inline: boolean` — default `false`. When true, renders as an inline-flex element (for placing next to button text).

### Template structure (HTML — plain text description)

The template should render:
- An outer `<div class="loader-wrap">` that gets CSS classes based on `size`, `overlay`, and `inline` inputs.
- Inside: an SVG (or CSS-drawn div) for the pot body — a simple U-shape with a rim line at the top and two small handles.
- Above the pot: three `<div class="steam-wisp">` elements, each absolutely positioned above the pot rim, animated to rise and fade.
- Below the pot (if `size` is not `small`): a `<span class="loader-label">` showing the translated label.

### Styling (SCSS — conceptual)

- `.loader-wrap` — flexbox column, centered, gap 0.5rem.
- `.loader-wrap.overlay` — `position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: var(--bg-glass); backdrop-filter: var(--blur-glass); z-index: 50; border-radius: inherit;`
- `.loader-wrap.inline` — `display: inline-flex; align-items: center; gap: 0.375rem;`
- `.pot` — the pot SVG/div, sized based on variant.
- `.steam-wisp` — three elements with a shared `@keyframes steam` animation:
  - From: `opacity: 0.7; transform: translateY(0) scaleX(1);`
  - To: `opacity: 0; transform: translateY(-1rem) scaleX(0.5);`
  - Duration: 1.5s, infinite, ease-out.
  - Each wisp gets `animation-delay: 0s`, `0.3s`, `0.6s` respectively.
  - The wisps should be thin curved paths (can use CSS `border-radius` on thin divs rotated at different angles, or SVG `<path>` elements).
- `.loader-label` — `color: var(--color-text-muted); font-size: 0.875rem; font-weight: 500;`
- Respect `@media (prefers-reduced-motion: reduce)` — replace the steam animation with a simple opacity pulse.

### Dictionary keys to add

Add to `public/assets/data/dictionary.json`:
- `"loader_loading"` — Hebrew: "טוען..." / English: "Loading..."
- `"loader_saving"` — Hebrew: "שומר..." / English: "Saving..."
- `"loader_please_wait"` — Hebrew: "רגע, מכינים הכל..." / English: "Just a moment..."
- `"loader_cooking_up"` — Hebrew: "מבשלים את המידע..." / English: "Cooking up your data..."

---

## 3. Where to Apply the Loader — Every Location in the App

### 3.1 Route-Level Loading (Large Loader)

**What:** When the Angular router is resolving data for a route (recipe resolver, equipment resolver, venue resolver), the user currently sees nothing — the page is blank until the resolver completes.

**Where to implement:** In `src/app/appRoot/app.component.ts` and `app.component.html`.

**How:** Listen to Angular Router events (`NavigationStart`, `NavigationEnd`, `NavigationCancel`, `NavigationError`). When `NavigationStart` fires, show the large loader centered in the `.app-content` area. When `NavigationEnd` fires, hide it.

**Specifics:**
- Add a signal `isRouteLoading = signal(false)` in the app component.
- Subscribe to `router.events` in the constructor.
- In `app.component.html`, add the loader component above the `<router-outlet>`:
  ```
  @if (isRouteLoading()) {
    <app-loader size="large" label="loader_please_wait" [overlay]="true" />
  }
  ```
- The overlay should cover the `.app-content` area (not the header/footer), so wrap `<router-outlet>` in a `position: relative` container.

### 3.2 Dashboard — Initial Data Load (Medium Loader)

**What:** When the dashboard loads for the first time and KPI data is being computed from `kitchenState`, there may be a brief moment where signals haven't resolved.

**Where:** `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html`

**How:** If the kitchen state service exposes a `dataReady` signal (or equivalent), show a medium loader inside the `.dashboard-main` area until data is ready. If the data is synchronous (from localStorage), this may not be needed — but the infrastructure should exist for when a backend is added.

### 3.3 Recipe Book List — Delete Operation (Small Loader)

**What:** When the user deletes a recipe, there is currently no feedback between clicking delete and the item disappearing.

**Where:** `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html`

**How:** When delete is in progress for a specific row, replace the delete icon button with a small inline loader. Add a signal `deletingId = signal<string | null>(null)`. In the template, conditionally show the loader:
```
@if (deletingId_() === recipe._id) {
  <app-loader size="small" [inline]="true" />
} @else {
  <button class="action-btn delete" ...>
}
```

### 3.4 Inventory Product List — Delete + Inline Save (Small Loader)

**What:** Same as recipe book — delete and inline price/unit save operations have no loading feedback.

**Where:** `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html`

**How:** Same pattern as 3.3 for delete. For inline save (price blur), briefly show a small loader in the price cell while saving.

### 3.5 Recipe Builder — Save Button (Small Loader in Button)

**What:** When saving a recipe, the button text changes to "saving" but there is no visual animation.

**Where:** `src/app/pages/recipe-builder/recipe-builder.page.html`

**How:** When `isSaving_()` is true, show a small inline loader inside the `.main-submit-btn` next to the "saving" text:
```
<button class="main-submit-btn" [disabled]="isSaving_()">
  @if (isSaving_()) {
    <app-loader size="small" [inline]="true" />
  }
  {{ (isSaving_() ? 'saving' : ...) | translatePipe }}
</button>
```

### 3.6 Menu Intelligence — Save Button (Small Loader in Button)

**What:** Same as recipe builder — the save button shows "saving" text but no animation.

**Where:** `src/app/pages/menu-intelligence/menu-intelligence.page.html`

**How:** Same pattern as 3.5. Add small inline loader inside the `.toolbar-btn.save` when `isSaving_()` is true.

### 3.7 Cook View — Save Edits (Small Loader in Button)

**What:** When saving edits in cook view, there is no loading feedback.

**Where:** `src/app/pages/cook-view/cook-view.page.html`

**How:** Add an `isSaving` signal to the cook-view page component. Show small inline loader in the `.save-btn` when saving.

### 3.8 Product Form — Save Button (Small Loader in Button)

**What:** When saving a product (add or edit), there is no loading feedback.

**Where:** `src/app/pages/inventory/components/product-form/product-form.component.html`

**How:** Add an `isSaving` signal. Show small inline loader in the `.btn-primary` submit button.

### 3.9 Equipment Form — Save Button (Small Loader)

**Where:** `src/app/pages/equipment/components/equipment-form/equipment-form.component.html`

**How:** Same pattern — add `isSaving` signal, show small inline loader in primary button.

### 3.10 Venue Form — Save Button (Small Loader)

**Where:** `src/app/pages/venues/components/venue-form/venue-form.component.html`

**How:** Same pattern.

### 3.11 Trash Page — Loading State (Medium Loader)

**What:** The trash page currently shows plain text "pending" while loading trash items.

**Where:** `src/app/pages/trash/trash.page.html`

**How:** Replace the `<p class="trash-loading">{{ 'pending' | translatePipe }}</p>` with:
```
<app-loader size="medium" label="loader_loading" />
```

### 3.12 Version History Panel — Loading State (Medium Loader)

**What:** The version history panel currently shows plain text "pending" while loading history.

**Where:** `src/app/shared/version-history-panel/version-history-panel.component.html`

**How:** Replace the `<p class="panel-loading">{{ 'pending' | translatePipe }}</p>` with:
```
<app-loader size="medium" label="loader_loading" />
```

### 3.13 Demo Data Import — Full Page Loader (Large)

**What:** When loading demo data from the metadata manager, the operation replaces all localStorage data. This can take a moment and the user sees nothing.

**Where:** `src/app/pages/metadata-manager/metadata-manager.page.component.html` (near the `.btn-demo` button).

**How:** Add an `isImporting` signal. When demo import starts, show a large overlay loader on the metadata page with label `"loader_cooking_up"`:
```
@if (isImporting_()) {
  <app-loader size="large" label="loader_cooking_up" [overlay]="true" />
}
```

### 3.14 Equipment & Venue Lists — Delete Operation (Small Loader)

**Where:**
- `src/app/pages/equipment/components/equipment-list/equipment-list.component.html`
- `src/app/pages/venues/components/venue-list/venue-list.component.html`

**How:** Same delete-loading pattern as recipe-book (3.3). Replace icon button with small inline loader during delete.

### 3.15 Menu Library — Delete + Clone (Small Loader)

**Where:** `src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.html`

**How:** Same pattern — small inline loader on the delete/clone button during operation.

---

## 4. Skeleton Loader (Secondary, Optional Enhancement)

In addition to the simmering pot loader, consider adding **skeleton loaders** for content-heavy pages. These are placeholder shapes (gray shimmer rectangles) that mimic the layout of the content being loaded.

### Where to use skeletons

- **Recipe book grid:** Show 5 skeleton rows matching the grid column template.
- **Inventory grid:** Show 5 skeleton rows.
- **Dashboard KPI cards:** Show 4 skeleton cards with pulsing rectangles.
- **Menu library:** Show 3 skeleton event cards.

### Skeleton implementation

Create a reusable component: `src/app/shared/skeleton/skeleton.component.ts` with inputs:
- `width: string` — CSS width (e.g., `'100%'`, `'8rem'`)
- `height: string` — CSS height (e.g., `'1rem'`, `'3rem'`)
- `borderRadius: string` — default `var(--radius-md)`

The skeleton is a div with a CSS shimmer animation:
```
@keyframes shimmer {
  0%   { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    var(--bg-glass) 25%,
    rgba(255,255,255,0.4) 50%,
    var(--bg-glass) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-md);
}
```

The skeleton is a **nice-to-have** secondary enhancement. The primary loader (simmering pot) is the must-have.

---

## 5. Implementation Order

1. **Create the loader component** (`src/app/shared/loader/`) — the pot SVG, steam animation, three size variants, overlay mode, inline mode.
2. **Add dictionary keys** to `dictionary.json`.
3. **Route-level loader** in app.component (highest impact — user sees it on every navigation).
4. **Trash page and version-history panel** — replace text with medium loader (quick wins).
5. **Save buttons** — recipe-builder, menu-intelligence, cook-view, product-form, equipment-form, venue-form (small inline loaders).
6. **Delete operations** — recipe-book, inventory, equipment, venue, menu-library (small inline loaders replacing icon buttons).
7. **Demo data import** — large overlay on metadata manager.
8. **(Optional) Skeleton loaders** — recipe-book grid, inventory grid, dashboard KPIs, menu-library cards.

---

## 6. Design Consistency Rules

- The loader must use only Liquid Glass design tokens (no hardcoded colors).
- The pot SVG/shape must be simple and recognizable at 20px (the small variant).
- Steam animation must be smooth at 60fps — use `transform` and `opacity` only (GPU-composited properties).
- The loader must work correctly in RTL layout.
- The loader must respect `prefers-reduced-motion` — replace steam with a simple opacity pulse.
- The glass container on large/medium variants must match the `c-glass-panel` engine look.
- On mobile, the large loader should account for the smaller viewport — max-width 200px, pot 40px.
