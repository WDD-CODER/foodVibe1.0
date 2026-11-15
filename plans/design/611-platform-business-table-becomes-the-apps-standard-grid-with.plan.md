# Plan 611 — Platform business table becomes the app's standard grid with the phone column carousel

Status: draft
Track: design
Depends-on: none
Snapshot: c1eb0cd89b768f944cc3374bb91666125b8c59d8
## Problem Statement

The Human reports that the business table on `/platform` (platform-admin dashboard,
`src/app/pages/platform-dashboard/platform-dashboard.page.html`, `<table class="platform-table">`) "breaks" and does not
look like the other tables in the app, and that the front-desk edit button (`.c-btn-ghost`, `data-testid="fd-edit"`)
shows on top of the business-name column when the table is scrolled sideways and the button passes under it.

Root cause of the overlap (stacking order, not a z-index typo on the button):

- The name column is `position: sticky; inset-inline-start: 0` (`.platform-table .sticky-col` in
  `platform-dashboard.page.scss`) with **no `z-index`**. A positioned element with `z-index: auto` is painted in the
  same paint step as every other positioned element and every element that makes its own stacking context with
  `z-index: auto/0` — in DOM order.
- `.c-btn-ghost` (`src/styles.scss`) has `backdrop-filter: var(--blur-glass)` (and `transform` on hover). Both make the
  button a stacking context painted in that same step. The button sits later in the DOM than the row's sticky `<th>`,
  so it is painted after it — on top of the name cell when it scrolls under it. Any later cell with a filter, transform
  or position (the `.c-glass-panel` look, the hover lift) would do the same.
- The fix is to give the pinned name cell its own layer (`z-index: 1`, header name cell `z-index: 2`) and an opaque
  background, so nothing that scrolls under it can paint over it.

Why it "doesn't look like the rest": every other entity list (clients, inventory, recipe book, equipment, suppliers)
is a CSS grid built from the `.c-grid-header-cell` / `.c-list-row` / `.c-list-body-cell` engines, and on a phone
(≤768px) it keeps the first column, shows one other column at a time in the shared column carousel
(`app-column-carousel-header` / `app-column-carousel-cell`, plan 349) and folds row actions into `app-row-actions-menu`.
The platform table is a plain `<table>` with 18 `white-space: nowrap` columns: at 375px it is a long sideways scroll.
(The 2026-11-14 Style QA screenshots `platform-default-375-1.png` / `-1366-1.png` show `/dashboard`: the QA user is not
a platform admin, so the guard redirected it — the run never saw this table.)

## Goals & Success Criteria
**Primary:** the `/platform` business table is drawn with the app's list-grid engines; on a phone it shows the business
name, one swipeable column (carousel) and a ⋮ actions button, with no sideways scroll; on desktop the pinned name
column always stays on top of every cell and button that scrolls under it.

Done when:
- [auto] `pnpm run build` → exit 0
- [auto] `pnpm run test:ci` → exit 0
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries
- [ui] At 1366x768 on `/platform` signed in as a platform admin, after scrolling `.platform-grid-scroll` fully to its
  inline end, `document.elementFromPoint` at the centre of every visible `[data-testid="biz-name"]` cell returns an
  element inside that same cell (never a `[data-testid="fd-edit"]` button or another cell) — `e2e/ui/611-1.spec.ts`,
  screenshot `screens/611-1.png`
- [ui] At 375x812 on `/platform` signed in as a platform admin, `.platform-grid-scroll` has
  `scrollWidth <= clientWidth + 1`, and clicking the `.cc-arrow--next` button in `.platform-grid
  app-column-carousel-header` changes the `.cc-header` `aria-label` and the first row's `.cc-cell-label-text` shows the
  same column name — `e2e/ui/611-2.spec.ts`, screenshot `screens/611-2.png`
- [human] Signed in as the platform admin, `/platform` at 1366px and on a phone (or a 375px window): the business table
  looks like the clients or inventory list (same header strip, row lines and cell look), the name column stays pinned
  and clean while you scroll sideways on desktop, and on the phone the arrows swap the second column and ⋮ opens
  "שינוי" (front desk edit) and the report link.
- [human] Nothing else moved: the totals tiles above the table, the CSV export button, the AI usage table (and its
  per-feature drill-down) and the logistics items section look and work as before; sorting, idle-row colours, the
  internal checkbox, the report link and the front desk edit dialog still work.

## Execution Mode

- Parallel: yes — no other open plan writes the platform dashboard page.
- Isolated DB: no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/platform-dashboard/platform-dashboard.page.html
src/app/pages/platform-dashboard/platform-dashboard.page.scss
src/app/pages/platform-dashboard/platform-dashboard.page.ts
src/app/pages/platform-dashboard/platform-dashboard.page.spec.ts
e2e/ui/611-1.spec.ts
e2e/ui/611-2.spec.ts
```

## Read Scope

Entire repo.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — a template, stylesheet and component-imports change on one page plus its specs; no server,
  schema, ownership, tenancy, taxonomy or AI-call path is touched, and no scope path matches an invariant's Touches
  glob.

## Reuse Check

- Business table rows and header on the shared grid engines (`.c-grid-header-cell`, `.c-list-row`, `.c-list-body-cell`, `.c-sortable-header`, `.c-col-actions`) — family: engine-classes — rung: 1 — why: the same classes every list uses; no new `.c-*` class.
- Phone column carousel (`appColumnCarouselGroup`, `app-column-carousel-header`, `app-column-carousel-cell`, `appColumnSlide`) and row actions (`app-row-actions-menu`) — family: list-page — rung: 2 — why: used as is through `COLUMN_CAROUSEL` and their existing inputs; `app-list-shell` itself is not used (see Technical Considerations).

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

- As the platform admin on my phone, I want to read each business's numbers one column at a time, like the other lists,
  so that I don't scroll a wide table sideways.
- As the platform admin on desktop, I want the business name to stay readable while I scroll the wide table, so that
  I always know which row a number belongs to.

## Functional Requirements

### Must Have (P0)
- [ ] Replace the business `<table class="platform-table">` (only that one; the AI usage table keeps its `<table>`) with
  `<div class="platform-grid-scroll c-glass-panel">` wrapping `<div class="platform-grid" role="table"
  appColumnCarouselGroup [attr.aria-label]="'platform_dashboard' | translatePipe">`. The grid's columns come from
  `grid-template-columns: var(--platform-grid)` set in the page SCSS (no new input needed):
  - desktop (> 768px), 18 tracks in today's order — name, owner, staff, joined, last activity, active days 7, events
    total / active / closed / finished, close rate, last event, front desk, fd requests, fd median, fd no-show,
    internal, actions:
    `minmax(12rem, 2fr) minmax(8rem, 1.2fr) repeat(4, minmax(5.5rem, 1fr)) repeat(5, minmax(4.5rem, 0.8fr))
    minmax(6rem, 1fr) minmax(12rem, 1.6fr) repeat(3, minmax(5rem, 0.8fr)) minmax(4rem, 0.6fr) minmax(5.5rem, auto)`;
  - phone (`@media (max-width: 768px)` — the carousel's own `CAROUSEL_MEDIA_QUERY`, not the page's `min-width: 768px`
    block): `minmax(7rem, 1fr) minmax(0, 1.4fr) 2.75rem` (name | carousel | ⋮).
  `.platform-grid-scroll` keeps `overflow-x: auto` (desktop needs it: the 18 tracks are about 107rem wide).
- [ ] Header row: `<div class="c-list-row" role="row">` containing
  - the name header `<div class="col-name c-grid-header-cell c-sortable-header" role="columnheader"
    [attr.aria-sort]="ariaSort('name')">` with today's `.sort-btn` button (`sortBy('name')`);
  - `<app-column-carousel-header>` with one `appColumnSlide` per remaining column: the 11 sortable ones from
    `carouselColumns` (`columns.slice(1)`, new `protected readonly` field) as `<div class="c-grid-header-cell
    c-sortable-header" appColumnSlide [label]="col.labelKey" role="columnheader" [attr.aria-sort]="ariaSort(col.key)">`
    each holding today's `.sort-btn`; then the four front desk headers (`platform_frontdesk_col`,
    `platform_col_fd_requests`, `platform_col_fd_median`, `platform_col_fd_no_show`) and `platform_col_internal` as
    plain `c-grid-header-cell` slides with those keys as `label`;
  - `<div class="col-actions c-col-actions c-grid-header-cell" role="columnheader">{{ "actions" | translatePipe }}</div>`.
- [ ] Each business row: `<div class="platform-row c-list-row" role="row" data-testid="biz-row"
  [class.is-idle-7]="idleClass(row) === 'is-idle-7'" [class.is-idle-14]="idleClass(row) === 'is-idle-14'">`,
  containing
  - `<div class="col-name c-list-body-cell" role="rowheader" data-testid="biz-name">` — name + today's `.idle-label`;
  - `<app-column-carousel-cell>` with one `c-list-body-cell` `appColumnSlide` per carousel column, in the header's
    order, each `[label]` the same dictionary key as its header, keeping today's content and `data-testid`s
    (`frontdesk-cell`, `fd-level`, `fd-requests`, `fd-median`, `fd-no-show`) and adding `data-testid="close-rate"` on
    the close-rate slide; the internal slide keeps the `.internal-toggle` checkbox and its `aria-label`;
  - `<app-row-actions-menu class="col-actions c-col-actions c-list-body-cell" role="cell">` holding the report link
    (`<a class="c-icon-btn" data-testid="report-link" routerLink="/report" [queryParams]="{ businessId: row._id }"
    [attr.aria-label]="'platform_col_report' | translatePipe">` with `<lucide-icon name="trending-up" [size]="16">`)
    and, only when `row.frontDesk` is set, the edit button (`<button type="button" class="c-icon-btn"
    data-testid="fd-edit" (click)="editFrontDesk(row)" [attr.aria-label]="'platform_fd_edit' | translatePipe">` with
    `<lucide-icon name="pencil" [size]="16">`). The front desk slide then shows only
    `done/total · status · level` (the inline `.c-btn-ghost` is removed from it).
- [ ] The pinned name column (page SCSS, **outside** `@layer components.platform-dashboard`, because the `.c-list-*`
  engines in `src/styles.scss` are unlayered and would win — same pattern as the inventory list's row tints):
  - `.platform-grid .col-name { position: sticky; inset-inline-start: 0; z-index: 1; background: var(--bg-card-solid); }`
  - `.platform-grid .c-grid-header-cell.col-name { z-index: 2; }` (header name above body name cells);
  - idle tints: `.platform-row.is-idle-7 > .c-list-body-cell, .platform-row.is-idle-7 .column-carousel--cell
    .c-list-body-cell { background: var(--bg-warning-soft); }`, same for `is-idle-14` with `var(--bg-danger-subtle)`;
    on the name cell the tint is layered over the solid card colour so it stays opaque:
    `background: linear-gradient(var(--bg-warning-soft), var(--bg-warning-soft)), var(--bg-card-solid);`.
- [ ] Text alignment inside the grid follows the app's lists (engine default: centred); the name cell is
  `justify-content: flex-start` with wrapping allowed (`overflow-wrap: anywhere`), so a long Hebrew business name
  never widens the phone grid.
- [ ] `platform-dashboard.page.ts` imports `...COLUMN_CAROUSEL` (from `src/app/shared/column-carousel`) and
  `RowActionsMenuComponent`; no other logic changes (sorting, totals, idle rules, `toggleInternal`, `editFrontDesk`
  stay as they are). Signals only, `inject()`, no `any`, single quotes, no semicolons.
- [ ] Remove the now-unused `.sticky-col`, `.is-idle-7` and `.is-idle-14` rules from `.platform-table`; the remaining
  `.platform-table` rules stay for the AI usage table.
- [ ] No new dictionary keys: every label reuses an existing key (`actions`, `platform_col_*`, `platform_frontdesk_col`,
  `platform_fd_edit`, `platform_col_report`). No `.c-*` class is defined or restyled in the page SCSS; logical
  properties only.

### Should Have (P1)
- [ ] `platform-dashboard.page.spec.ts` moves its selectors to the grid (`[data-testid="biz-name"]` for row names,
  `.platform-grid .sort-btn` for headers, `[data-testid="biz-row"]` for idle classes, `[data-testid="close-rate"]` for
  the close rate, front desk text without the edit label) and adds two cases: the name cells and the name header are
  `position: sticky` with a numeric `z-index` of at least 1 and the header's higher than the body's; and the
  `fd-edit` button sits inside `app-row-actions-menu`, not inside `[data-testid="frontdesk-cell"]`.

## UI/UX Notes

- RTL: the pinned name column is on the right (`inset-inline-start`); the carousel arrows are already RTL-aware.
- Phone: 16 carousel slides (owner … internal). Order is today's column order so desktop and phone read the same.
- The ⋮ popover is in the top layer (`popover="manual"`), so it never fights the pinned column either.

## Atomic Sub-tasks

- [x] 611-A1: Rebuild the business table as the shared list grid with a pinned name column — div grid with the .c-list engines, --platform-grid tracks, sticky .col-name — src/app/pages/platform-dashboard/platform-dashboard.page.html, src/app/pages/platform-dashboard/platform-dashboard.page.scss
- [x] 611-A2: Keep the pinned name column above anything that scrolls under it, with opaque idle tints — z-index 1/2 and solid backgrounds outside the page layer — src/app/pages/platform-dashboard/platform-dashboard.page.scss
- [x] 611-A3: Show one swipeable column at a time on phones, like the other lists — COLUMN_CAROUSEL header + cells, carouselColumns field — src/app/pages/platform-dashboard/platform-dashboard.page.html, src/app/pages/platform-dashboard/platform-dashboard.page.ts
- [x] 611-A4: Move the report link and front desk edit into the row actions menu — app-row-actions-menu with c-icon-btn buttons — src/app/pages/platform-dashboard/platform-dashboard.page.html, src/app/pages/platform-dashboard/platform-dashboard.page.ts
- [x] 611-A5: Bring the page tests onto the new grid and cover the pinned column's layering — new selectors, sticky/z-index and actions-menu cases — src/app/pages/platform-dashboard/platform-dashboard.page.spec.ts
- [x] 611-A6: Prove on screen that the name column stays on top and the phone carousel works — e2e/ui/611-1.spec.ts, e2e/ui/611-2.spec.ts

## Technical Considerations

- Why not `app-list-shell`: it is a whole-screen list frame (`height: calc(100dvh - var(--list-shell-chrome-h))`,
  overflow hidden, its own page header with a filter toggle and a filter panel). `/platform` is a dashboard with totals
  tiles, the business table, the AI usage section and the logistics section on one scrolling page; wrapping the table
  in the shell would give it a viewport-tall box and an empty filter panel. The carousel group directive works on any
  wrapper (its doc: "the element that wraps both the header and the rows"), so the table takes the list-page family's
  pieces and engines without the shell.
- `contentChildren(ColumnSlideDirective)` in the carousel header/cell sees slides rendered inside an `@for` in the
  projected content, so the 11 sortable header slides can loop over `carouselColumns`.
- Platform admin for the e2e specs: `/platform` is guarded by `platformAdminGuard` (`isPlatformAdmin === true` in the
  session claims) and the QA user is not one — the 2026-11-14 Style QA run was redirected to `/dashboard`. Both specs
  sign in with `signInQa(context)`, `page.goto('/platform')`, and when the URL is not `/platform` call
  `test.skip(true, 'QA user is not a platform admin — /platform redirected; run the [human] check as the platform
  admin')`; they also skip with a message when the grid has no `[data-testid="biz-row"]`. The overlap itself is
  covered in `test:ci` by the component spec (611-A5), which does not need the guard.
- RTL horizontal scroll: in 611-1 scroll to the inline end with
  `el.scrollLeft = getComputedStyle(el).direction === 'rtl' ? -el.scrollWidth : el.scrollWidth`.
- Backend / API impact: none. Auth: none. Security surface: none. Data / migration: none.

## Out of Scope

- The AI usage table (5 columns, fits a phone, has its own drill-down rows) and the logistics items section.
- `app-list-shell`, the column carousel and `app-row-actions-menu` themselves (used as is).
- `.c-btn-ghost` in `src/styles.scss` (its backdrop-filter is correct for buttons; the fix is the pinned cell's layer).
- Making the QA user a platform admin, or any server/API change.

## Critical Questions

none

## Execution Notes
- decision (Planner default): reuse the list-page family's carousel, row-actions menu and grid engines but not
  `app-list-shell`, because the shell is a full-screen list frame and `/platform` is a multi-section dashboard.
- decision (Planner default): the report link and front desk edit move into `app-row-actions-menu` (⋮ on phones,
  inline icon buttons on desktop), matching the other lists; the internal checkbox stays a column (a carousel slide on
  phones) because it is data, not an action.
- decision (Planner default): the AI usage table stays a `<table>`; only the business table changes.
- evidence: pnpm run build → 0; pnpm run lint → 0; pnpm run test:ci → 0 (2192 SUCCESS; one unrelated DataExportCard flake on the first run, passed on rerun); lint:icons, lint:no-native-select, override-check, breadcrumbs-check, plan-ledger-check, log-query (error) → 0.
- decision: behaviour: the `[ui]` e2e specs skip when the QA user is not a platform admin (plan's own instruction) — reverse: remove the skip.
- note: the spec adds `TrendingUp` to its icon pick (the report-link icon is registered in app.config.ts, not in TEST_LUCIDE_ICONS, which is out of scope).
