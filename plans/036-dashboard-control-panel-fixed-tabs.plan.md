# Dashboard Control Panel — Fixed Header, Five Tabs

## Goal

- **Fixed/sticky header** at the top of the dashboard with five buttons: סקירה, הגדרות ליבה, מיקומים, הוספת מיקום, אשפה.
- **No navigation away** from the dashboard when switching between these; only the **content below the header** changes.
- The existing `/venues` and `/trash` routes remain for direct links and for venue **edit** (edit still uses `/venues/edit/:id`).

## Current State

- dashboard.page.html: Two tabs (overview, metadata) switch content via `@if (activeTab() === ...)`. Three extra buttons use `goTo()` and navigate to `/venues/list`, `/venues/add`, `/trash`.
- dashboard.page.ts: `DashboardTab` is `'overview' | 'metadata'`; tab is driven by query param `tab`.
- VenueListComponent, VenueFormComponent, and TrashPage are standalone components that do not require route resolvers for list/add/trash views; VenueFormComponent uses ActivatedRoute only for edit mode (resolved `venue`).

## Implementation

### 1. Extend dashboard tab model and URL

- In dashboard.page.ts: Change `DashboardTab` to `'overview' | 'metadata' | 'venues' | 'add-venue' | 'trash'`. Derive `activeTab` from query param `tab` (support `metadata`, `venues`, `add-venue`, `trash`; default `overview`). In `setTab(tab)`, set `queryParams: { tab: <value> }` for all tabs (use empty object for `overview`). Remove `goTo()`; all five actions call `setTab()` instead.

### 2. Unify header into five tab buttons

- In dashboard.page.html: Replace the two tab-btn plus spacer plus three tab-action buttons with five tab buttons in one row, all using `tab-btn` style. Labels: overview, core_settings, venue_list, add_venue, trash (with icons for venues, add-venue, trash). Remove spacer and tab-action styling.

### 3. Sticky header and content area

- In dashboard.page.scss: Make `.tab-nav` sticky (`position: sticky; top: 0; z-index: 50` and background). Ensure content area has a clear scroll region (e.g. `flex: 1` or `min-height: 0`).

### 4. Render all five views in the content area

- In dashboard.page.html: Replace single `@else` with explicit branches for each tab (overview, metadata, venues, add-venue, trash). In dashboard.page.ts: Import and add VenueListComponent, VenueFormComponent, TrashPage.

### 5. Keep venue form inside dashboard after save

- VenueFormComponent: Add optional `@Input() embeddedInDashboard = false` and `@Output() saved`, optionally `@Output() cancel`. When `embeddedInDashboard` is true and save succeeds, emit `saved()` and do not call `router.navigate`. Dashboard passes `[embeddedInDashboard]="true"` and `(saved)="setTab('venues')"`; on cancel emit and dashboard sets tab to `venues`.

### 6. Venue list Edit behavior

- VenueListComponent keeps `router.navigate(['/venues/edit', id])` for edit. No change.

### 7. Direct links

- Leave app.routes.ts as-is for `path: 'venues'` and `path: 'trash'`.

## File summary

- dashboard.page.html — Five tab buttons; sticky nav; five content blocks.
- dashboard.page.ts — Extend DashboardTab; query param for all five; setTab only; import VenueList, VenueForm, TrashPage.
- dashboard.page.scss — Sticky tab bar; content scroll region.
- venue-form.component.ts — embeddedInDashboard input; saved (and optionally cancel) output; when embedded emit and do not navigate.
