# Plan 710 — Platform, diagnosis and report: shared tables, tiles, loaders and headers

Status: draft
Depends-on: 703, 709
Track: code
Snapshot: d06302a3

## Problem Statement
The three admin and consultant screens draw their own tables, tiles and headers (`night/style-audit.md` P1, P4, P6,
P8, P12): the platform page's business grid has its own sort buttons, its AI usage table is a raw `<table>`, its total
tiles copy the dashboard's dark tile verbatim, three sub-panels show nothing while they load, and one chip lacks its
base class; the diagnosis list is a private grid of `c-list-row` without header cells, the workspace writes a hand
`<h1>` beside an empty page header, and the report tables are raw; the report page has a `loading_` signal it never
shows, reads a token that does not exist (`--color-border`) and draws its own tile. This plan converges them on
`.c-sortable-header`, `.c-table`, `.c-stat-tile`, `app-loader`, `app-empty-state`, `app-page-header` and tokens. The
report keeps its own header because it is an A4 print document.

Verified on `chore/restaurant-staging` (`d06302a3`, 2026-11-23):
- `platform-dashboard/platform-dashboard.page.html:40-226` `div.platform-grid[role=table]` in `.c-glass-panel`, header
  row of `.c-grid-header-cell` + `.c-sortable-header` each holding a local `button.sort-btn` (`:53,67`;
  `.scss:140-152`, icon 12); rows `.platform-row.c-list-row` with `app-column-carousel-cell`; raw checkbox
  `.internal-toggle` (`:152`); `<p class="platform-empty">` (`:7`); `<table class="platform-table ai-table">` (`:242`,
  `.scss:105-138`); total tiles `.total-tile` with the hero copied in `.scss:66-85`; `.pbd-*` dialog styles through
  `::ng-deep` (`.scss:252-335`, left as is).
- `platform-dashboard/components/platform-ai-shots`, `platform-logistics-items`, `platform-learning`: `@if
  (!isLoading_())` with nothing while loading; `platform-logistics-items` has `<li class="c-chip--tag">` without
  `c-chip`; `platform-learning.component.scss:54-65` `.learning__card`/`.learning__tile` surfaces, weights `:19,79,100,144`;
  `.learning__empty` (`html:14`).
- `diagnosis/diagnosis.page.html:36-48` `.diagnosis-list` (`.scss:38`, `1fr auto auto`) of `a.c-list-row`;
  `:17` hand field label; `.scss:11` `48rem`.
- `diagnosis/components/diagnosis-workspace/diagnosis-workspace.component.html:6-21` `app-page-header` (back only) +
  `h1.diagnosis-workspace__title` + status chip + toggle; tabs `c-chip--tab` in `app-scroll-rail` (kept).
- `diagnosis/components/diag-report/diag-report.component.html:17,75` raw `<table class="diag-report__table">`
  (`.scss:46-65`), `:86` empty `<p>`; `diag-menu.component.html:33` hand field label.
- `report/report.page.html:1-29` hand header (kept), `:32` notice `<p class="report__notice c-glass-panel">`, `:88`
  raw `<table class="trend">` (`.scss:129-147`, rgba and `999px`); `.tile` (`.scss:76-82`) with
  `var(--color-border, rgba(…))`; `report.page.ts:98` `loading_`; print rules `.scss:171-206`.
- From 703: `.c-table`, `.c-table--compact`, `.c-stat-tile(--hero)`, `.c-list`, `.c-row-link`, `.c-page`,
  `styleFindings`. From 709: the dashboard's tiles on `.c-stat-tile` (same markup pattern used here).

## Goals & Success Criteria
**Primary:** every table on these screens is a `.c-table` or a shared row grid, every tile a `.c-stat-tile`, every
wait an `app-loader`, and the workspace title sits in the shared header.

- [auto] `pnpm run test:scripts` passes, including the new `scripts/test/style-710.test.mjs`: `styleFindings` on `src/app/pages/platform-dashboard/platform-dashboard.page.{html,scss}`, every `.html`/`.scss` under `src/app/pages/platform-dashboard/components/{platform-ai-shots,platform-logistics-items,platform-learning}/`, `src/app/pages/diagnosis/diagnosis.page.{html,scss}`, `src/app/pages/diagnosis/components/{diagnosis-workspace, diag-report,diag-menu}/` and `src/app/pages/report/report.page.{html,scss}` returns `[]` (the idle-row tint is written as `.platform-row.is-idle > .c-list-body-cell`, which starts with a page class); every `<table` in these templates has class `c-table`; none contains `sort-btn`, `total-tile`, `platform-empty`, `learning__empty`, `diagnosis-workspace__title`.
- [auto] `pnpm run test:ci` passes, including new cases in `src/app/pages/platform-dashboard/platform-dashboard.page.spec.ts` (pressing the "name" column head sorts by name as before; no businesses → `app-empty-state`), `src/app/pages/diagnosis/diagnosis.page.spec.ts` (two diagnoses → two `.c-list-row` under a header row of `.c-grid-header-cell`), `src/app/pages/diagnosis/components/diagnosis-workspace/diagnosis-workspace.component.spec.ts` (the business name renders inside `app-page-header`'s `h1`) and a new `src/app/pages/report/report.page.spec.ts` (while `loading_()` is true one `app-loader` renders).
- [auto] `pnpm run build` passes; `pnpm run lint` exits 0; `pnpm run lint:icons` exits 0; `pnpm run lint:reuse` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] `/platform` as the platform admin: the column sort arrows look like the clients list's; the total tiles look like the dashboard's tiles; the AI usage table has the same header style as the list headers.
- [human] `/report` → print preview (Ctrl+P): the A4 page still fits on one page and the trend table is readable.

- [human] the list's page with no items · open the page · a message says the list is empty (`/platform` → learning panel for a business with no data; default `empty-state-on-list`)
- [human] the screen's page with the data request failing · open the page · a readable error with a retry appears, not a blank page (`/platform` with the server stopped: the logistics panel shows "טעינת הפריטים נכשלה"; default `loading-and-error-states`)

## Execution Mode
- Parallel: yes — after 703 and 709.
- Concurrent plans: any of 704–717 not in this plan's Depends-on line or depending on it (no two of 704–717 share a file)
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/platform-dashboard/platform-dashboard.page.html
src/app/pages/platform-dashboard/platform-dashboard.page.scss
src/app/pages/platform-dashboard/platform-dashboard.page.ts
src/app/pages/platform-dashboard/platform-dashboard.page.spec.ts
src/app/pages/platform-dashboard/components/platform-ai-shots/**
src/app/pages/platform-dashboard/components/platform-logistics-items/**
src/app/pages/platform-dashboard/components/platform-learning/**
src/app/pages/diagnosis/diagnosis.page.html
src/app/pages/diagnosis/diagnosis.page.scss
src/app/pages/diagnosis/diagnosis.page.spec.ts
src/app/pages/diagnosis/components/diagnosis-workspace/**
src/app/pages/diagnosis/components/diag-report/**
src/app/pages/diagnosis/components/diag-menu/**
src/app/pages/report/**
src/app/pages/report/report.page.spec.ts
scripts/test/style-710.test.mjs
src/app/pages/diagnosis/components/diagnosis-workspace/diagnosis-workspace.component.spec.ts
docs/workflow-kit/manifest.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-6: preserves — the scope matches `src/app/**/*ai*` only by file or folder name (e.g. waitlist, platform-ai-shots, ai-model-manager, deposit-paid, dashboard); no AI call is added, moved or changed, and every model call still goes through `server/routes/ai.js`.
- INV-none: preserves — templates and styles; platform, diagnosis and report data come from the same routes (`server/routes/admin-learning.js`, `server/routes/diag.js`, `server/routes/stats.js` are not touched), so ownership and admin checks are unchanged.

## Reuse Check

- Business grid sort heads — family: list-page — rung: 1 — why: `.c-sortable-header` as the clickable head itself (the inner `.sort-btn` goes), as the clients list does.
- AI usage, diagnosis report and report trend tables — family: engine-classes — rung: 1 — why: `.c-table` (`--compact` in print), tokenised by 703.
- Total tiles, learning tiles, report tiles — family: engine-classes — rung: 1 — why: `.c-stat-tile` / `--hero`.
- Diagnosis list — family: list-page — rung: 1 — why: `.c-list` with a header row of `.c-grid-header-cell` and `.c-row-link` names.
- Workspace title — family: list-page — rung: 1 — why: `app-page-header` `header-title` and `header-actions` slots.
- Loading — family: feedback — rung: 1 — why: `app-loader`.
- Empty — family: empty-state — rung: 1 — why: `app-empty-state`.
- Hand field labels — family: form-field — rung: 1 — why: `app-form-field`.
- none new.

## Defaults

- loading-and-error-states — applies — how: `app-loader` in the three platform panels and the report; their existing error texts (e.g. `platform_logistics_load_failed`) show through `app-empty-state icon="alert-triangle"`
- empty-state-on-list — applies — how: `app-empty-state` for no businesses, no learning data, no volatility rows
- app-list-container — exception — why: the platform grid keeps its own scroll container with a sticky name column and column carousel (a 20-column admin table); it uses the shared row, header and sort pieces but not `app-list-shell`; the diagnosis list is a short in-page list on `.c-list`
- one-breakpoint-set — applies — how: `$break-*` names only

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the platform admin, I want the business table to behave like every other list, so that sorting and reading it needs no new habit.
- As a consultant, I want the diagnosis screens to look like the app the owner uses, so that the report I print feels like part of it.

## Functional Requirements

### Must Have (P0)
- [ ] Platform grid: each sortable head is the `.c-grid-header-cell.c-sortable-header` element itself as a `button`
  (`type="button"`, `aria-sort` as today), with the sort icon 14 inside; `.sort-btn` rules go. The internal-flag
  checkbox becomes `label.c-chip.c-chip--toggle` with a visually hidden text from its existing `aria-label` key.
  The CSV export button sits in the page header's actions instead of below the table.
- [ ] Platform totals: `.total-tile` → `.c-stat-tile` (the first one `--hero`); the copied hero block goes.
- [ ] Platform AI usage: `<table class="c-table">`; the local `.platform-table` rules go.
- [ ] `<p class="platform-empty">` → `app-empty-state icon="building-2"` with the existing key.
- [ ] `platform-ai-shots`, `platform-logistics-items`, `platform-learning`: `@if (isLoading_())` → `app-loader`;
  `<li class="c-chip--tag">` → `c-chip c-chip--tag`; `.learning__card` → `.c-glass-panel`, `.learning__tile` →
  `.c-stat-tile`; `.learning__empty` → `app-empty-state [compact]="true"`.
- [ ] Diagnosis list: `.c-page.c-page--narrow`; `div.c-list[role=table]` with a header row (`.c-grid-header-cell`
  ×3: business, date, status) and rows `a.c-list-row` → the row becomes `div.c-list-row[role=row]` whose first cell
  holds `a.c-row-link` (same route); the period label → `app-form-field`.
- [ ] Diagnosis workspace: the hand `h1` and status chip move into `app-page-header`'s `header-title` (title text +
  chip), the toggle button into `header-actions`; `backLink` stays.
- [ ] `diag-report`: both tables → `.c-table.c-table--compact`; the empty `<p>` → `app-empty-state [compact]="true"`;
  `diag-menu` field → `app-form-field`.
- [ ] Report: `@if (loading_())` → `app-loader`; the owner-only notice → `app-empty-state icon="lock"` with its key;
  `.tile` → `.c-stat-tile`; the trend table → `.c-table.c-table--compact` with the bar using
  `color-mix(in srgb, var(--color-primary) 10%, transparent)` and `--radius-full`; `--color-border` → `--border-default`;
  the hand header stays; print rules stay in `@media print`.
- [ ] Every literal in the touched stylesheets becomes a token (703 mapping), except inside `@media print`.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL. Icons 14 in sort heads and meta, 16 in buttons, 18 in header. No new dictionary key; icons already
  registered (`building-2`, `lock`, `alert-triangle`, `arrow-up-down`).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Put the platform business grid on the shared sort heads, the totals on the shared tile and the AI usage on the shared table — src/app/pages/platform-dashboard/platform-dashboard.page.html, .scss, .ts, .spec.ts
- [x] A2: Show a loader in the three platform panels and fix the chip without its base class — src/app/pages/platform-dashboard/components/{platform-ai-shots,platform-logistics-items,platform-learning}/*
- [x] A3: Give the diagnosis list header cells and row links, and put the workspace title in the shared header — src/app/pages/diagnosis/diagnosis.page.*, src/app/pages/diagnosis/components/diagnosis-workspace/*
- [x] A4: Draw the diagnosis report tables as shared tables and its fields as shared fields — src/app/pages/diagnosis/components/diag-report/*, src/app/pages/diagnosis/components/diag-menu/*
- [x] A5: Show the report's loader, shared tiles and shared trend table without breaking the A4 print — src/app/pages/report/*
- [x] A6: Lock the three areas on the shared pieces and tokens — scripts/test/style-710.test.mjs

## Technical Considerations
- The style test `scripts/test/style-710.test.mjs` exports `FILES` (the checked paths) and `ALLOW` (its allow entries, `[]` when none), so plan 718 re-checks the whole run without editing it.
- Dependencies: 703, 709.
- New files: `src/app/pages/report/report.page.spec.ts`, `scripts/test/style-710.test.mjs`.
- Model changes: none. Backend / API: none. Auth and validation: none. Security surface: none. Data / migration: none.
- Project checks: `log-query` item; no dictionary, `app.config.ts` or `src/styles.scss` change.
- Traps: the idle-row tint on the platform grid is written unlayered today to beat the cell engine (`.scss:229-250`);
  keep it unlayered, scoped as `.platform-row.is-idle > .c-list-body-cell`, with token colours.
  `.c-table` cells have their own padding — remove the old `diag-report__table` paddings, don't stack them.

## Out of Scope
- `platform-business-dialog`, `grant-access-dialog`, `front-desk-admin-dialog` and the `.pbd-*` styles.
- `diag-invoice-queue`. Moving the platform grid into `app-list-shell`.

## Critical Questions
- none

## Execution Notes
- behaviour: the report keeps its hand header (print document, `report_print` button) — the one page header exception besides the editors.
- behaviour: the CSV export button moves into the platform page header (one place for page actions).
- behaviour: the idle-row tint stays an unlayered rule (it must beat the cell engine), scoped under the page's row class.
- behaviour: the diagnosis list status header uses the existing key `fd_card_status` because no neutral status key exists and the plan adds no key — reverse: add a `diag_col_status` key and swap it in `diagnosis.page.html`.
- behaviour: the report shows its loader only while there is no report yet (`loading() && !report()`), so a month switch keeps the old report on screen — reverse: drop `&& !report()`.
- behaviour: the platform CSV export button shows in the page header only while there are businesses (as before) — reverse: remove the `@if (rows_().length)` around it.
- evidence: `pnpm run build` exit 0; `pnpm run lint` exit 0 (0 errors); `pnpm run test:ci` exit 0, 3213 of 3213 SUCCESS; `node --test scripts/test/style-710.test.mjs` 4 pass, 0 fail.
