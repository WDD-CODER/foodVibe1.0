# Header and Navigation Refactor

## Current State

The header has 9 nav links: Dashboard, Inventory, Equipment, Venues, Recipe Builder, Recipe Book, Menu Library, Trash, Cook. The mobile-close X button leaks into desktop view because it lacks a `display: none` rule outside the mobile media query.

## Changes Summary

### A. Fix X icon in desktop mode

- In [header.component.scss](src/app/core/components/header/header.component.scss), add `.mobile-close-btn { display: none; }` at the top level of `.header-nav` (before the media query), so it's hidden in desktop and only shown inside the `@media (max-width: 768px)` block.

### B + E. Remove unneeded header nav items and add padding

- In [header.component.html](src/app/core/components/header/header.component.html), remove the `<li>` entries for: `/equipment`, `/venues`, `/trash`, `/cook`, `/recipe-builder`.
- Remaining nav items: **Dashboard, Inventory, Recipe Book, Menu Library** (4 items instead of 9).
- In [header.component.scss](src/app/core/components/header/header.component.scss), increase `gap` in the `ul` from `0.25rem` to `0.5rem` to add breathing room between routes.

### C + D. Equipment embedded inside Inventory page

**Route change** in [app.routes.ts](src/app/app.routes.ts):

- Add a new child route `equipment` under the `/inventory` route that lazy-loads the existing `EquipmentListComponent`.
- The `/equipment` top-level route stays for edit pages (`/equipment/edit/:id`).

**Inventory page nav** in [inventory.page.html](src/app/pages/inventory/inventory.page.html) and [inventory.page.ts](src/app/pages/inventory/inventory.page.ts):

- Add two entries to `navRoutes_`:
  - **Equipment List** (`path: 'equipment'`) - renders the equipment list inside the inventory `<router-outlet>`.
  - **Add Equipment** - a separate `<button>` (not a nav link) that calls `onAddEquipment()` to open the new modal.

**New component: `AddEquipmentModal`** (under `src/app/shared/add-equipment-modal/`):

- Files: `add-equipment-modal.component.ts`, `.html`, `.scss`, and `add-equipment-modal.service.ts` in `src/app/core/services/`.
- Modal contains two fields: **Name** (text input) and **Category** (dropdown of `EquipmentCategory` values, displayed with Hebrew labels via `translatePipe`).
- Follows the existing modal pattern (overlay + card, backdrop blur, click-outside-to-close).
- The service's `open()` returns `Promise<{name: string, category: EquipmentCategory} | null>`.
- On save, the inventory page calls the equipment data service to persist the new item.
- Register `<add-equipment-modal/>` in [app.component.html](src/app/appRoot/app.component.html) alongside other modals.

### F. Location and Add-Location buttons in The Brain

- In [metadata-manager.page.component.html](src/app/pages/metadata-manager/metadata-manager.page.component.html), add an action bar between the header and the admin-grid with buttons for Location Gallery, Add Location.
- In [metadata-manager.page.component.ts](src/app/pages/metadata-manager/metadata-manager.page.component.ts), inject `Router` and add a `goTo(path: string)` helper method.
- Style `.brain-actions` as a flex row with gap, matching the existing Liquid Glass design tokens.

### G. Floating Hero Action Button (FAB)

**New component: `HeroFab`** (under `src/app/core/components/hero-fab/`):

- Files: `hero-fab.component.ts`, `.html`, `.scss`.
- Fixed position at bottom-left of screen since the app is RTL.
- Default state: a single teal circular button with the **flame** icon.
- **Desktop**: on hover, expands upward (speed-dial) to reveal Cook and Create Recipe mini-buttons.
- **Mobile/touch**: tap toggles expanded/collapsed state.
- Animation: smooth CSS transitions with staggered delays, main button rotates when expanded.
- Uses icons only (no text).

### H. Trash button in The Brain

- In the same action bar added in step F, add a Trash button.
- This replaces the Trash header nav item.

## File Impact Summary

**Modified files:**

- `src/app/core/components/header/header.component.html`
- `src/app/core/components/header/header.component.scss`
- `src/app/app.routes.ts`
- `src/app/pages/inventory/inventory.page.html`
- `src/app/pages/inventory/inventory.page.ts`
- `src/app/pages/metadata-manager/metadata-manager.page.component.html`
- `src/app/pages/metadata-manager/metadata-manager.page.component.ts`
- `src/app/appRoot/app.component.html`
- `src/app/appRoot/app.component.ts`

**New files:**

- `src/app/core/components/hero-fab/hero-fab.component.ts`
- `src/app/core/components/hero-fab/hero-fab.component.html`
- `src/app/core/components/hero-fab/hero-fab.component.scss`
- `src/app/shared/add-equipment-modal/add-equipment-modal.component.ts`
- `src/app/shared/add-equipment-modal/add-equipment-modal.component.html`
- `src/app/shared/add-equipment-modal/add-equipment-modal.component.scss`
- `src/app/core/services/add-equipment-modal.service.ts`
