# Plan: Dashboard QA — Specs, `data-testid`, Pattern Fixes

## Context
The QA audit of `src/app/pages/dashboard` revealed zero coverage for `DashboardOverviewComponent`, thin coverage for `DashboardPage` and `DashboardHeaderComponent`, 5 pattern violations in existing specs, and zero `data-testid` attributes across all three templates.
This plan adds 38 new tests, fixes all 5 violations, migrates legacy `*ngIf`/`*ngFor` to `@if`/`@for`, and seeds every interactive element with a `data-testid`.

---

## Critical Files

| File | Change |
|---|---|
| `src/app/pages/dashboard/dashboard.page.html` | Add `data-testid` to tab-branch containers |
| `src/app/pages/dashboard/dashboard.page.spec.ts` | Fix V1 (`HttpClientTestingModule`), fix V2 (`unknown` casts), add 11 tests |
| `src/app/pages/dashboard/components/dashboard-header/dashboard-header.component.html` | Add `data-testid` to 6 nav buttons |
| `src/app/pages/dashboard/components/dashboard-header/dashboard-header.component.spec.ts` | Fix V2–V4 (casts, mock, output pattern), add 7 tests |
| `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html` | Add `data-testid`, migrate `*ngIf`/`*ngFor` → `@if`/`@for` |
| `src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.spec.ts` | **New file** — 20 tests |

---

## Atomic Sub-tasks

### Sub-task 1 — Template: `data-testid` + `@if`/`@for` migration

**`dashboard.page.html`** — add to tab branches:
```
data-testid="dashboard-tab-overview"   (on <app-dashboard-overview>)
data-testid="dashboard-tab-metadata"   (on wrapper div)
data-testid="dashboard-tab-venues"     (on <app-venue-list>)
data-testid="dashboard-tab-add-venue"  (on <app-venue-form>)
data-testid="dashboard-tab-trash"      (on <app-trash-page>)
```

**`dashboard-header.component.html`** — add to buttons:
```
data-testid="btn-back-to-dashboard"   (back button)
data-testid="btn-nav-metadata"        (core_settings button)
data-testid="btn-nav-venues"          (venue_list button)
data-testid="btn-nav-suppliers"       (suppliers button)
data-testid="btn-nav-trash"           (trash button)
```

**`dashboard-overview.component.html`** — add `data-testid` + migrate legacy directives:
- Replace `*ngIf="getRecentActivity().length; else noActivity"` → `@if (getRecentActivity().length)` / `@else` block
- Replace `*ngFor="let item of getRecentActivity(); trackBy: trackByActivityId"` → `@for (item of getRecentActivity(); track item.id)`
- Replace inner `*ngFor="let change of item.changes || []"` → `@for`
- Remove `<ng-template #noActivity>` — use `@else` block inline
- Add `data-testid` to KPI cards, buttons, and activity elements

---

### Sub-task 2 — Fix `dashboard.page.spec.ts`

**Pattern fixes:**
- Replace `HttpClientTestingModule` → `provideHttpClient()` + `provideHttpClientTesting()` (V1)
- Replace `unknown` casts → test via DOM using `data-testid` (V2)
- Use `BehaviorSubject` for `queryParams` in `ActivatedRoute` stub

**New tests to add (11):**
- Tab resolution from query params (metadata, venues, add-venue, trash, unknown, no-param)
- Template rendering per tab (7 scenarios)
- Navigate with empty queryParams when overview tab set

---

### Sub-task 3 — Fix `dashboard-header.component.spec.ts`

**Pattern fixes:**
- Replace minimal `{ translate: (k: string) => k || '' }` → full `jasmine.createSpyObj` (V4)
- Replace `unknown` casts → DOM clicks (V2)
- Replace `subscribe` pattern → `spyOn(component.tabChange, 'emit')` (V3)

**New tests to add (7):**
- Back button visibility by activeTab
- Tab emission for each nav button
- Active class for venues and trash buttons

---

### Sub-task 4 — Create `dashboard-overview.component.spec.ts`

**20 tests covering:**
- Lifecycle (create, syncFromStorage)
- KPI signals (totalProducts, totalRecipes, lowStock, unapproved)
- Activity list (empty state, items rendered, not-empty)
- Navigation (7 navigation paths)
- tabChange output
- Popover open/close
- Auth (title attr on add-product button)

---

## Verification

1. Run `ng test --include="**/dashboard*"` — all 44 tests (6 existing + 38 new) must pass
2. Verify no console errors about missing Lucide icon registrations
3. Visual check: build the app with `ng build`; confirm no template compilation errors from `@if`/`@for` migration
4. Manual smoke: open the dashboard in a browser; confirm tab switching, KPI cards, and activity list still render correctly
