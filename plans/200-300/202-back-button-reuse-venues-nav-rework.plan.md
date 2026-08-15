# Plan 202 — Back Button Reuse + Venues Nav Rework

## Context

The dashboard-header has a styled "back to dashboard" pill button (`.header-btn.header-btn--back`)
with a Lucide arrow-right icon. Three UX gaps exist:

1. `/venues/list` and `/suppliers/list` have no "back to dashboard" link — users must use browser back.
2. `/venues/edit/:id` has no back-to-list button inside the venues-nav.
3. The venues-nav (list + add tabs) is shown even on the venue list, cluttering the list-header.

## Settled Decisions

- **Style reuse:** Copy `.header-btn` / `.header-btn--back` styles locally into venue-list and
  supplier-list SCSS files (scoped, not `.c-*` — does NOT violate engine placement rule).
- **Back button placement:** Add into the `shell-actions` slot of each list (renders in
  `header-actions` div of list-shell).
- **Venues-nav visibility:** Conditionally hide on the `/venues/list` route using a reactive signal
  in `venues.page.ts`.
- **Venues-nav back button:** Add a hardcoded back button (not a route item) in `venues.page.html`
  that navigates to `/venues/list`.

---

## Atomic Sub-tasks

### Sub-task 1 — Back button in Venue List (shell-actions)

**Files:** `venue-list.component.html`, `venue-list.component.ts`, `venue-list.component.scss`

- **HTML:** Add before `<app-selection-bar>` inside `<ng-container shell-actions>`:
  ```html
  <button type="button" class="header-btn header-btn--back"
    data-testid="btn-back-to-dashboard-venues"
    (click)="backToDashboard()">
    <lucide-icon name="arrow-right" size="16"></lucide-icon>
    {{ 'back_to_dashboard' | translatePipe }}
  </button>
  ```
- **TS:** Add `backToDashboard()` method → `this.router.navigate(['/dashboard'])`. Router is already injected.
- **SCSS:** Add scoped `.header-btn` / `.header-btn--back` styles (copy from
  `dashboard-header.component.scss` — same design tokens).

---

### Sub-task 2 — Back button in Supplier List (shell-actions)

**Files:** `supplier-list.component.html`, `supplier-list.component.ts`, `supplier-list.component.scss`

- Same pattern as Sub-task 1.
- `data-testid="btn-back-to-dashboard-suppliers"`
- Check if Router is already injected in supplier-list TS; add if missing.

---

### Sub-task 3 — Add back-to-list button in venues-nav (edit page)

**Files:** `venues.page.html`, `venues.page.ts`, `venues.page.scss`

- **HTML:** Add a `<button>` inside `<nav class="venues-nav">` BEFORE the `@for` loop:
  ```html
  <button type="button" class="nav-link nav-link--back" (click)="goBackToList()">
    <lucide-icon name="arrow-right" size="16"></lucide-icon>
    {{ 'venue_list' | translatePipe }}
  </button>
  ```
- Uses `nav-link` base styles + `--back` modifier (primary color accent, matching dashboard pattern).
- **TS:** Inject Router, add `goBackToList()` → `this.router.navigate(['/venues/list'])`. Also add
  `isListRoute_` signal (see Sub-task 4).
- **SCSS:** Add `.nav-link--back` modifier:
  ```scss
  .nav-link--back {
    color: var(--color-primary);
    border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);
    gap: 0.375rem;
    &:hover { color: var(--color-primary-hover); border-color: var(--color-primary); }
  }
  ```

---

### Sub-task 4 — Hide venues-nav on /venues/list route

**Files:** `venues.page.html`, `venues.page.ts`

- **TS:** Add reactive route detection:
  ```ts
  import { toSignal } from '@angular/core/rxjs-interop';
  import { NavigationEnd, Router } from '@angular/router';
  import { filter, map, startWith } from 'rxjs/operators';

  protected readonly isListRoute_ = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(() => this.router.url.startsWith('/venues/list')),
      startWith(this.router.url.startsWith('/venues/list')),
    )
  );
  ```
- **HTML:** Wrap `<nav class="venues-nav">` with `@if (!isListRoute_())`.

---

## Critical Files

| File | Change |
|------|--------|
| `src/app/pages/venues/components/venue-list/venue-list.component.html` | Add back button to shell-actions |
| `src/app/pages/venues/components/venue-list/venue-list.component.ts` | Add `backToDashboard()` |
| `src/app/pages/venues/components/venue-list/venue-list.component.scss` | Add `.header-btn` styles |
| `src/app/pages/suppliers/components/supplier-list/supplier-list.component.html` | Add back button to shell-actions |
| `src/app/pages/suppliers/components/supplier-list/supplier-list.component.ts` | Add `backToDashboard()` + Router if missing |
| `src/app/pages/suppliers/components/supplier-list/supplier-list.component.scss` | Add `.header-btn` styles |
| `src/app/pages/venues/venues.page.html` | Add back-to-list btn in nav + `@if` guard |
| `src/app/pages/venues/venues.page.ts` | Inject Router, add `isListRoute_`, `goBackToList()` |
| `src/app/pages/venues/venues.page.scss` | Add `.nav-link--back` modifier |

## Existing Reuse

- Button style source: `dashboard-header.component.scss` lines 62–121 (`.header-btn` / `.header-btn--back`)
- Translation keys: `back_to_dashboard` (already in dictionary), `venue_list` (already in dictionary)
- Lucide `arrow-right` icon: already registered in `app.config.ts`
- Router already injected in `venue-list.component.ts`

## Verification

1. Navigate to `/venues/list` → back button appears in list-header; click → lands on `/dashboard`.
2. Navigate to `/suppliers/list` → back button appears in list-header; click → lands on `/dashboard`.
3. Navigate to `/venues/edit/:id` → venues-nav is visible with a "Venue List" back button; click → lands on `/venues/list`.
4. Navigate to `/venues/list` → venues-nav is NOT shown.
5. Navigate to `/venues/add` → venues-nav IS shown (only back button + "Add Venue" tab visible).
