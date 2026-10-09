# Plan 367 — Dashboard sub-nav: a "לוח בקרה" chip replaces the current page's chip; remove the four back buttons

Status: done
Snapshot: b776163f43fd1db42a5e0501b3a0e5c30b0bded1

## Problem Statement

Returning to the dashboard overview from its sub-pages (venues, metadata, suppliers, trash) is done through four separate, inconsistent back buttons:

| Page | Location |
| --- | --- |
| Metadata | `src/app/pages/dashboard/components/dashboard-header/dashboard-header.component.html` (`button.header-btn--back`, `back_to_dashboard`, `data-testid="btn-back-to-dashboard"`, `backToDashboard()` emits `tabChange('overview')`) |
| Venues list | `src/app/pages/venues/components/venue-list/venue-list.component.html` ~L3-11 (`btn-back-to-dashboard-venues`) |
| Trash | `src/app/pages/trash/trash.page.html` ~L3-11 (`btn-back-to-dashboard-trash`) |
| Suppliers | `src/app/pages/suppliers/components/supplier-list/supplier-list.component.html` (`[shell-back-btn]`, `btn-back-to-dashboard-suppliers`), which also squeezes the list-shell title |

The dashboard group's chip row (`src/app/core/components/tab-chips/tab-chips.component.ts`, `CHIPS_BY_GROUP.dashboard`: אתרים, מטא-דאטה, ספקים, אשפה) is the natural place for this. Dandan's rule: on a dashboard sub-page, the chip of the page you're on is replaced, in the same position, by a "לוח בקרה" chip. On the overview itself, the row shows the 4 sub-pages as today.

## Goals & Success Criteria

- Primary: in metadata the row reads אתרים · לוח בקרה · ספקים · אשפה; in suppliers it reads אתרים · מטא-דאטה · לוח בקרה · אשפה; and so on. On `/dashboard` (overview) it reads אתרים · מטא-דאטה · ספקים · אשפה.
- Primary: the 4 back buttons and their `backToDashboard()` handlers are gone.
- Success: one tap from any dashboard sub-page returns to the overview, from the same place on every page.

## Execution Mode

- Parallel: no. Run after plans 338 and 350 (both touch tab-chips) and 341 (supplier-list), and before plan 353 (353 has been amended not to re-add these back buttons).
- Concurrent plans: none touching the files below
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/components/tab-chips/**
src/app/pages/dashboard/components/dashboard-header/**
src/app/pages/dashboard/dashboard.page.*
src/app/pages/venues/components/venue-list/**
src/app/pages/trash/**
src/app/pages/suppliers/components/supplier-list/**
e2e/**
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

As a chef in metadata, suppliers, venues or trash, I want the dashboard to be one tap away, in the same spot on every page.

## Functional Requirements

### Must Have (P0)
- [x] `TabChipsComponent`:
  - Determine the current chip from the URL in the `chips_` computed: path match (`/venues*`, `/suppliers*`, `/trash*`), and for metadata, `/dashboard` with `tab=metadata` in the query.
  - If the group is `dashboard` and a current chip exists, return the group's chips with that one replaced by `{ id: 'dashboard', labelKey: 'dashboard', icon: 'layout-dashboard', path: '/dashboard', queryParams: { tab: 'overview' } }` (check how `DashboardPage` reads `tab`; use whatever selects the overview) in the same index.
  - On the overview (no current chip), return the 4 chips unchanged.
- [x] Active styling: no chip is "active" on sub-pages, because the current one was replaced. Drop `routerLinkActive` reliance for the dashboard group, or keep it harmlessly. On the overview none are active.
- [x] `currentUrl_` must update on query-param-only navigation (metadata ↔ overview are the same path). Verify the `NavigationEnd` subscription uses `urlAfterRedirects` including the query.
- [x] Remove the back buttons and handlers:
  - dashboard-header (button and `backToDashboard`; if the component is left with only an h1, keep it as is, since plan 353 handles its title)
  - venue-list (button and `backToDashboard`)
  - trash (button and `backToDashboard`)
  - supplier-list (`[shell-back-btn]` content and `backToDashboard`)
  - Delete their now-unused styles.
- [x] Update or remove specs and e2e selectors that reference `btn-back-to-dashboard`, `-venues`, `-trash` and `-suppliers`.

### Should Have (P1)
- [x] The "לוח בקרה" chip gets a subtle distinct style (e.g. outline instead of fill) so it reads as "back", not as a section. Use a modifier class `.c-tab-pill--home` (append to `styles.scss`).

### Nice to Have (P2)
- None.

## UI/UX Notes

- Label key `dashboard` ("לוח בקרה") already exists; icon `layout-dashboard` is already used, so check it's registered (`npm run lint:icons`).
- The chip row stays centered when it fits (and scrolls on phone after plan 350).

## Atomic Sub-tasks

- [x] A1: Tab-chips replacement logic plus spec (overview → 4 chips; metadata, suppliers, venues and trash → dashboard chip in the right index; query-only navigation updates) (`core/components/tab-chips/**`).
- [x] A2: Remove the 4 back buttons, handlers and styles.
- [x] A3: Specs and e2e cleanup; P1 style.
- [x] A4: Build, specs, icons lint, check on phone and desktop. Update session-state.

## Technical Considerations

- Dependencies: `TabChipsComponent`, `DashboardPage` (`activeTab` / `setTab`, how `tab` query maps), `DashboardHeaderComponent`, `VenueListComponent`, `TrashPage`, `SupplierListComponent`.
- New files: none.
- Model changes: none.

## Out of Scope

- Other groups (inventory, recipes, menus) keep their behavior.
- Page title redesign (plans 352/353).

## Critical Questions

- Position of the "לוח בקרה" chip:
  a) In place of the current page's chip (default, per Dandan)
  b) Always first

## Success Criteria

- [auto] `rg -n "btn-back-to-dashboard|backToDashboard" src/app e2e` → no matches.
- [auto] `npx ng test --watch=false --include=src/app/core/components/tab-chips/**/*.spec.ts --include=src/app/pages/dashboard/**/*.spec.ts --include=src/app/pages/trash/**/*.spec.ts --include=src/app/pages/venues/**/*.spec.ts --include=src/app/pages/suppliers/**/*.spec.ts` → 0 failures.
- [auto] `npm run lint:icons` → exit 0. `npm run build` → exit 0.
- [human] Dashboard overview: chips אתרים · מטא-דאטה · ספקים · אשפה. Tap מטא-דאטה → the row shows אתרים · לוח בקרה · ספקים · אשפה → tap לוח בקרה → back on the overview.
- [human] Suppliers, venues, trash: no back button on the page; the "לוח בקרה" chip sits where that page's chip was.
