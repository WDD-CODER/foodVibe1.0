# Plan 453 — Share the list search, sort and clear logic and let card pages use the list shell

Status: done
Track: code
Depends-on: 450
Conflicts-with: 452, 454, 455, 456, 457
Snapshot: 34c560fc8db9272f41a85c57c5eb8d3407b3caed

## Problem Statement
Six list pages copy the same four handlers, and four pages draw their own list chrome instead of `shared/list-shell` (reuse audit 2026-10-20, family "List logic" and "List page"):
1. **Copied handlers** — `onClearSearch`, `onSearchEscape`, `setSort`, `clearAllFilters` exist in `equipment-list`, `inventory-product-list`, `recipe-book-list`, `supplier-list`, `venue-list` and `menu-library-list` (all `src/app/pages/*/components/*/*.component.ts`). `setSort` is byte-identical in equipment, inventory, menu-library and recipe-book.
2. **Search ignores Hebrew normalising** — every list filters with `trim().toLowerCase().includes()`; `normalizeHebrew` (`src/app/core/utils/recipe-match.util.ts`) is not used, so niqqud or punctuation breaks a match.
3. **No cards layout** — `app-list-shell` only does the table grid. `menu-library-list` (event library, a card grid), `venue-list`, `trash.page` and `metadata-manager.page.component` each rebuild page header, search, empty state and selection by hand.

This plan adds one logic helper, one `layout: 'cards'` mode, and converts one page per sub-task. It changes no behaviour except the search widening in Critical Question 1.

## Goals & Success Criteria
- Primary: one source for list search/sort/clear logic; card-grid pages built on `app-list-shell`; no visible change.
- Success:
  - [x] [auto] `npx ng build` passes after every sub-task. (evidence: docs/mvp/runs/453.md)
  - [x] [auto] `npx ng test --watch=false` passes, including new specs for `list-controls.util` and the `cards` layout of `list-shell`; existing `supplier-list`, `equipment-list` and `list-shell` specs unchanged and green.
  - [x] [auto] `grep -rnE "protected (onClearSearch|onSearchEscape|setSort|clearAllFilters)\(" src/app/pages` → only handlers that delegate to `listControls` (one line each); no copied bodies remain in the converted pages.
  - [x] [auto] Frozen files (`product-form.component.ts`, `menu-intelligence.page.ts`, `menu-export.service.ts`, `recipe-builder.page.ts`, `cook-view.page.ts`) have net lines <= 0: `git diff --numstat origin/main -- <each>` → added <= removed (none are in scope; expected empty).
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `deferred: local MongoDB down`).
  - [ ] [human] Smoke each touched page (suppliers, equipment, inventory, recipe book, venues, menu library, trash, metadata manager): search, clear (X), Escape in search, sort by clicking a column, clear filters, select rows, empty state, RTL layout — all behave exactly as before.

## Execution Mode
- Parallel: no — S1 creates the util all later sub-tasks import; S8 changes `list-shell` the card pages use. Sub-tasks run in order.
- Concurrent plans: 454 (data services), 455 (form kit) and 452 (search combobox) touch other files; `recipe-book-list` and `inventory-product-list` also appear in 452 (ingredient filter picker) — run 453 and 452 one after the other, not together.
- Isolated DB: no

## Execution Notes
- Depends on: the MVP merge to main (branch `mvp`), and plan 450 (reuse layer: `docs/brain/component-families.md`, `@utils` alias, `scope-check --reuse`). Does not depend on 451, 452, 454–457.
- Refactor only. Do not change markup classes, copy, grid templates or sort/filter results of a converted page; if a page cannot convert without a visible change, stop that sub-task, record it in the run notes, and ask via `approved:`.
- Checkpoints: S2 (first converted page — proves the util), S8 (list-shell cards layout built and specced), S12 (last page). Stop for the Human smoke at each checkpoint; the other sub-tasks only need `ng build`.
- Decision ladder (reuse audit): list-shell is extended with one input (`layout`), not forked. If a fourth variant flag would be added, split a sibling component instead.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/utils/list-controls.util.ts
src/app/core/utils/list-controls.util.spec.ts
src/app/shared/list-shell/list-shell.component.ts
src/app/shared/list-shell/list-shell.component.html
src/app/shared/list-shell/list-shell.component.scss
src/app/shared/list-shell/list-shell.component.spec.ts
src/app/shared/breadcrumbs.md
src/app/pages/suppliers/components/supplier-list/**
src/app/pages/equipment/components/equipment-list/**
src/app/pages/inventory/components/inventory-product-list/**
src/app/pages/recipe-book/components/recipe-book-list/**
src/app/pages/venues/components/venue-list/**
src/app/pages/menu-library/components/menu-library-list/**
src/app/pages/trash/trash.page.ts
src/app/pages/trash/trash.page.html
src/app/pages/trash/trash.page.scss
src/app/pages/metadata-manager/metadata-manager.page.component.ts
src/app/pages/metadata-manager/metadata-manager.page.component.html
src/app/pages/metadata-manager/metadata-manager.page.component.scss
docs/mvp/runs/453.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — no auth or role rule is touched.
- INV-2: preserves — no data access or `businessId` scoping change.
- INV-3: preserves — no client-side cascades; handlers only set list-view signals.
- INV-4: preserves — no schema or persisted-field change.

## Backend Impact
- Collections affected: none
- New collections: no
- Server changes needed: no

## Step 0 — Reality Check
The MVP changed many files, so this step always runs (also when `scope-check.mjs --drift` is quiet). On current `main`, find each symbol below and print `ok` or `conflict: <what>` per symbol; on a conflict, fix the plan's sub-task text before coding:
- `ListShellComponent` inputs (`isPanelOpen`, `gridTemplate`, `mobileGridTemplate`, `dir`, `resultCount`, `resultTotal`) and slots (`shell-title`, `shell-search`, `shell-actions`, `shell-selection-bar`, `shell-pagination`, `shell-table-header`, `shell-table-body`, `shell-filter-clear`, `shell-filters`, `shell-modal`) in `src/app/shared/list-shell/`.
- `normalizeHebrew` exported from `src/app/core/utils/recipe-match.util.ts`; check plan 450 did not move it behind `@utils`.
- In each of the six list components: `searchQuery_`, `sortBy_`, `sortOrder_`, `onClearSearch`, `onSearchEscape`, `setSort`, `clearAllFilters` (`venue-list` and `supplier-list` have no `setSort` — confirm), and whether the page still renders `app-list-shell` (equipment, inventory, recipe-book, supplier) or `app-page-header` directly (venue, menu-library).
- `trash.page.ts` and `metadata-manager.page.component.ts`: does each still hold a list that fits the cards layout (rows with title + actions, or a grid)? If a page now has no list, mark its sub-task `skipped (evidence)`.
- Run `grep -rnE "onClearSearch|onSearchEscape|clearAllFilters" src/app/pages` and add any new copy made by the MVP (new list pages) to the call-sites list; copies outside the scope block go through `approved:`.

## User Stories
- As a chef, I want every list page to search, sort and clear the same way so that I never relearn a screen.
- As a chef, I want a search for a Hebrew name to find it even when I type it without niqqud or punctuation.

## Functional Requirements

### Must Have (P0)
- [ ] `src/app/core/utils/list-controls.util.ts` exports `useListControls({ search, sortBy, sortOrder })` (called in an injection context, takes the page's own signals, returns `onClearSearch(input)`, `onSearchEscape(event, input)`, `setSort(field)` and a `clearAll(...resetters)` helper) and `matchesSearch(query, ...texts)` that applies `normalizeHebrew` to both sides.
- [ ] Each converted page keeps its own signals and filters; it only swaps the copied handler bodies for the shared ones and its `toLowerCase().includes()` for `matchesSearch`.
- [ ] `ListShellComponent` gets `layout = input<'table' | 'cards'>('table')`. `table` renders exactly today's DOM. `cards` renders the same header, selection-bar area, filter panel and scroll arrows, and replaces the pinned `table-top` / header with a plain scroll area that projects `[shell-cards]` as a responsive grid (`grid-template-columns: repeat(auto-fill, minmax(<card-min>, 1fr))`, `card-min` a new input with a default).
- [ ] Card pages reuse `app-page-header`, `app-selection-bar`, `app-row-actions-menu`, `app-empty-state`, `app-column-carousel` and `app-list-row-checkbox` where the page uses them today; nothing new is invented.

### Nice to Have (P1)
- [ ] `breadcrumbs.md` of `shared/` lists the util use and the `cards` layout.

## UI/UX Notes
- No visual change on any page. Card grid keeps each page's current card component and gap; only the surrounding chrome moves into the shell.
- Logical CSS properties only; any new SCSS for `cards` lives in `list-shell.component.scss` inside `@layer` as the neighbours do (`.cssLayer` skill). No new `.c-*` engine, no new dictionary keys (`translatePipe` existing keys only).

## Atomic Sub-tasks
- [x] S1: Write the shared list logic and its spec — `core/utils/list-controls.util.ts` with `useListControls` and `matchesSearch`; spec covers toggle-then-reset sort, clear keeps focus, Escape only acts on non-empty search, Hebrew niqqud match — `src/app/core/utils/list-controls.util.ts`, `src/app/core/utils/list-controls.util.spec.ts`
- [x] S2 (checkpoint): Convert the supplier list, the smallest table page — replace its `onClearSearch` / `onSearchEscape` / `clearAllFilters` bodies and the `toLowerCase` search (`nameHebrew`, `contactPerson`); keep `supplier-list.component.spec.ts` green — `src/app/pages/suppliers/components/supplier-list/**`
- [x] S3: Convert the equipment list (`setSort`, clear/escape, search on `nameHebrew`) — `src/app/pages/equipment/components/equipment-list/**`
- [x] S4: Convert the inventory product list (`setSort`, clear/escape, `clearAllFilters`, search on `nameHebrew`; leave its `internalName` map alone) — `src/app/pages/inventory/components/inventory-product-list/**`
- [x] S5: Convert the recipe book list (`setSort` plus the two date presets that call it, clear/escape, `clearAllFilters`, search) — `src/app/pages/recipe-book/components/recipe-book-list/**`
- [x] S6: Convert the venue list's handlers (`clearAllFilters`, clear/escape, search on `nameHebrew` and `environmentType`); keep its own page chrome for now — `src/app/pages/venues/components/venue-list/**`
- [x] S7: Convert the menu library list's handlers (`setSort`, clear/escape, search); keep its own page chrome for now — `src/app/pages/menu-library/components/menu-library-list/**`
- [x] S8 (checkpoint): Add `layout: 'cards'` and `cardMin` to `app-list-shell`, projecting `[shell-cards]`; spec asserts `table` DOM unchanged and `cards` renders the grid and slots; update the shared breadcrumbs — `src/app/shared/list-shell/list-shell.component.ts`, `src/app/shared/list-shell/list-shell.component.html`, `src/app/shared/list-shell/list-shell.component.scss`, `src/app/shared/list-shell/list-shell.component.spec.ts`, `src/app/shared/breadcrumbs.md`
- [x] S9: Move the venue list onto `app-list-shell layout="cards"` (header, search, selection bar, empty state into shell slots) — `src/app/pages/venues/components/venue-list/**`
- [-] S10 (skipped, see run file): Move the menu library (event library card grid) onto `app-list-shell layout="cards"` — `src/app/pages/menu-library/components/menu-library-list/**`
- [-] S11 (skipped, see run file): Move the trash page onto the cards layout, reusing `app-empty-state` and `app-row-actions-menu` — `src/app/pages/trash/trash.page.ts`, `src/app/pages/trash/trash.page.html`, `src/app/pages/trash/trash.page.scss`
- [-] S12 (skipped, see run file): Move the metadata manager page chrome onto the cards layout (its manager sub-components stay as they are) — `src/app/pages/metadata-manager/metadata-manager.page.component.ts`, `src/app/pages/metadata-manager/metadata-manager.page.component.html`, `src/app/pages/metadata-manager/metadata-manager.page.component.scss`
- [x] S13: Run the build, all specs, the grep and frozen-file checks; write the run file with the validation cards — `docs/mvp/runs/453.md`

## Technical Considerations
- Dependencies: `normalizeHebrew` (`core/utils/recipe-match.util.ts`), existing `list-state.util.ts` (URL/session param sync — leave as is), `app-page-header`, `app-selection-bar`, `app-row-actions-menu`, `app-empty-state`, `app-column-carousel`, `app-list-row-checkbox`.
- New files: `list-controls.util.ts` and its spec only. No new component: `cards` is an input on the existing shell (ladder step 3).
- Build and DI: the util is a plain function using signals and no `inject()` of its own except where it needs an injection context; no `BehaviorSubject`, no `any`, `_` suffix on private state.
- `list-shell` `table` mode must emit the same DOM as before so `equipment-list.component.spec.ts` and `list-shell.component.spec.ts` keep passing untouched.
- Data / migration: none. Backend / API: none.
- Project checks: log-query [auto]; chef-side stories; hotspots untouched (no `styles.scss`, dictionary or routes edits expected).

## Out of Scope
- Search combobox / dropdown shells in `ingredient-search`, `preparation-search`, `custom-select` (plan 452); modal shells (451); chip engine (457); `.form-group` and forms (455).
- Changing `list-state.util.ts`, pagination, grid templates, filter panels' content, or any server code.
- New list pages or new filters.

## Critical Questions
1. **Search widening** — replacing `toLowerCase().includes()` with `normalizeHebrew` makes searches match when niqqud or punctuation differ, so results can change slightly (more matches, never fewer). Recommended: accept it as the audit asks; the [human] smoke checks a plain Hebrew search still returns the same rows. Alternative: keep today's matching and apply `normalizeHebrew` in a later plan.
2. **Skipped pages** — if Step 0 finds trash or metadata manager no longer holds a list, skip S11/S12 (recorded with evidence) rather than force the layout. Recommended: skip.
