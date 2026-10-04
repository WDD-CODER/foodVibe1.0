# Plan 353 — Page header, part 2: venues, menu library, dashboard, trash

Status: draft
Snapshot: acab8cff39fd0240f67af00439a8bd044c23889e

## Problem Statement

Plan 352 (part 1) created `<app-page-header>` (`src/app/shared/page-header/`) and moved the 4 list-shell pages onto it. The remaining pages still use their own headers:

| Page | File | Current header |
| --- | --- | --- |
| Venues | `pages/venues/components/venue-list/venue-list.component.html:2-~30` | `.action-bar`: a `.header-btn--back` (dashboard), `h2.page-title`, `p.result-count`, `.search-wrap` and CTA in one wrapping flex row |
| Menu library | `pages/menu-library/components/menu-library-list/menu-library-list.component.html:2-~18` | `.action-bar`: `h2.page-title` (hard-coded `1.5rem/700`), search, and "new menu" button |
| Dashboard | `pages/dashboard/components/dashboard-overview/dashboard-overview.component.html:2-7` | `header.dashboard-header` with `h1.page-title` plus `p.page-subtitle` |
| Dashboard tabs | `pages/dashboard/components/dashboard-header/dashboard-header.component.html` | a second `h1.page-title` "dashboard" plus a back button (used in `dashboard.page.html:7` for the non-overview tabs) |
| Trash | `pages/trash/trash.page.html:2-~15` | `header.trash-header`: a back button, `<h1>`, and `.btn-refresh` |

Each has its own `.page-title` CSS, and the look differs from screen to screen.

## Goals & Success Criteria

- Primary: these 5 headers use `<app-page-header>`, so every main page has the same title row.
- Success: `rg -n 'class="page-title"' src/app` returns nothing. The dashboard has exactly one `<h1>` per view.

## Execution Mode

- Parallel: yes
- Concurrent plans: run after Plan 352 (Page header part 1) and Plan 351 (Recent Activity) — both touch dashboard-overview.
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/venues/components/venue-list/**
src/app/pages/menu-library/components/menu-library-list/**
src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html
src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.scss
src/app/pages/dashboard/components/dashboard-header/**
src/app/pages/trash/**
src/app/shared/page-header/**
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

- As a chef, I want every page header to look and behave the same.

## Functional Requirements

### Must Have (P0)
- [ ] Venues: `<app-page-header titleKey="venue_list" [count]="…" (back)="backToDashboard()">`, with search in `[header-search]` and the CTA in `[header-actions]`. Remove the title, count, back and search wrapper from `.action-bar`; keep `.filters-bar` below.
- [ ] Menu library: `<app-page-header titleKey="menu_library">`, with search and the "תפריט חדש" button in the slots.
- [ ] Dashboard overview: `<app-page-header titleKey="dashboard">`. Add an optional `subtitleKey` input to `PageHeaderComponent` (muted line under the title, desktop only, hidden ≤768px) and use it for `dashboard_subtitle`.
- [ ] Dashboard tabs header: the title shows the active tab's name (not "dashboard" again), with back to the overview through `(back)`. Tab switching UI is unchanged.
- [ ] Trash: `<app-page-header titleKey="trash" (back)="backToDashboard()">`, with refresh in `[header-actions]`.
- [ ] Delete every local `.page-title`, `.page-subtitle`, `.dashboard-header` title-block, `.trash-header` and `.result-count` style that's now unused, and the back-button styles if no longer referenced.

### Should Have (P1)
- [ ] Back buttons are consistent: Lucide `arrow-right` (RTL back) as an icon button with the aria-label from the destination key.

### Nice to Have (P2)
- None.

## UI/UX Notes

- Same layout as part 1: title start-aligned, actions at the end, search on row 2 at ≤768px.
- New dictionary keys: none expected. The dashboard tab titles reuse their tab label keys.

## Atomic Sub-tasks

- [ ] A1: Add the `subtitleKey` input to `PageHeaderComponent`, plus a spec case (`src/app/shared/page-header/**`).
- [ ] A2: Venues and menu library (`venue-list/**`, `menu-library-list/**`).
- [ ] A3: Dashboard overview and the dashboard tabs header (title = active tab) (`dashboard-overview.component.html/.scss`, `dashboard-header/**`).
- [ ] A4: Trash (`src/app/pages/trash/**`).
- [ ] A5: Delete the dead styles; run `rg 'class="page-title"'`. Build and run specs. Check at 360px and 1280px. Update the session-state file.

## Technical Considerations

- Dependencies: `PageHeaderComponent` (part 1), `VenueListComponent`, `MenuLibraryListComponent`, `DashboardOverviewComponent`, `DashboardHeaderComponent`, `TrashPage`.
- New files: none.
- Model changes: none.
- e2e: keep the existing `data-testid`s on the back buttons (`btn-back-to-dashboard*`) by passing them through as inputs or attributes.

## Out of Scope

- Form page headers (product, equipment, venue and supplier forms) and hero headers (cook-view, venue-detail): different purpose, possibly a later pass.
- Menu builder (paper UI).

## Critical Questions

1. Dashboard subtitle on phone:
   - a) Hidden ≤768px (default)
   - b) Always shown

## Success Criteria

- [auto] `rg -n 'class="page-title"' src/app` → no matches.
- [auto] `npx ng test --watch=false --include=src/app/pages/venues/**/*.spec.ts --include=src/app/pages/menu-library/**/*.spec.ts --include=src/app/pages/dashboard/**/*.spec.ts --include=src/app/pages/trash/**/*.spec.ts --include=src/app/shared/page-header/**/*.spec.ts` → 0 failures.
- [auto] `npm run build` → exit 0.
- [human] Venues, menu library, dashboard, a dashboard tab (e.g. metadata) and trash all show the same title row as inventory. The dashboard tab title names the tab, and back returns to the overview.
- [human] Phone: each is at most 2 rows (title row plus search where there is one).
