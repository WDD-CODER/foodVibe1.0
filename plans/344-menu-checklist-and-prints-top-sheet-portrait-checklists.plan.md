# Plan 344 — Menu "צ'קליסט והדפסות": top drop-down sheet from the FAB, and portrait-safe checklist views

Status: draft
Snapshot: acab8cff39fd0240f67af00439a8bd044c23889e

## Problem Statement

Two problems with exports and checklists in the menu builder:

1. **The toolbar is scattered and the FAB action is dead.** In `menu-intelligence.page.html` (L3-143), the `.pill-row` holds:
   - 4 separate export pills: shopping (`toolbar_shopping` → view/export), checklist (`toolbar_checklist` → by dish / category / station via `toggleExportChecklistDropdown()` → `onViewChecklist(mode)`), a hard-coded "🖨 הדפסה" (`printMenu()`), and all (`toolbar_all` → view/export).
   - The save pill.

   Their dropdowns (`_toolbar.scss:~64-88`, `position:absolute; right:0; min-width:220px`) aren't clamped to the viewport. Meanwhile the hero-fab action `menu_toolbar_open` (icon `printer`, `menu-intelligence.page.ts:262`) calls `openToolbar()`, which sets `toolbarOpen_`, and no template reads it. `showExport_` and `menuFabExpanded_` are dead too. Dandan wants that FAB button to drop a panel down from the top of the screen, with animation, containing all checklist and print options. Clicking outside closes it.
2. **Checklist views break in portrait.** Every view renders through `shared/export-preview`. `export-preview.component.scss` has no media queries:
   - fixed `.paper-inner` padding `2rem 2.5rem 2.5rem`
   - `max-height: calc(100vh - 12rem)`
   - the table has no overflow wrapper
   - the `.export-preview-actions` row has no wrap

## Goals & Success Criteria

- Primary: one entry point. The FAB "צ'קליסט והדפסות" opens a top sheet with every export, checklist and print option, and the 4 export pills are gone.
- Primary: every checklist and export preview is readable and usable at 360px portrait.
- Success: the dead signals are removed. Save stays reachable.

## Execution Mode

- Parallel: yes
- Concurrent plans: run after Plan 343 (menu-building quick fixes; same page files). Nothing else touches `src/app/shared/export-preview/**`.
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/menu-intelligence/menu-intelligence.page.html
src/app/pages/menu-intelligence/menu-intelligence.page.ts
src/app/pages/menu-intelligence/menu-intelligence.page.spec.ts
src/app/pages/menu-intelligence/_toolbar.scss
src/app/pages/menu-intelligence/components/menu-export-sheet/**
src/app/shared/export-preview/**
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

- As a chef, I want one button that slides down all my print and checklist options, and gets out of the way when I tap outside.
- As a chef on my phone, I want checklists that fit the screen in portrait.

## Functional Requirements

### Must Have (P0)
- [ ] New component `menu-export-sheet` (`components/menu-export-sheet/`):
  - Inputs: `open` (signal input). Outputs: `close` and one per action.
  - A fixed panel at `inset-block-start:0; inset-inline:0`, `max-height 80dvh` with scroll, top-safe-area padding.
  - It slides down with `transform: translateY(-100%) → 0`, ~200ms, and respects `prefers-reduced-motion`.
  - A dimmed backdrop; clicking it closes the sheet (`ClickOutSideDirective` or backdrop click). Escape also closes it.
- [ ] Sheet content, as grouped rows with Lucide icons (no emoji):
  - צ'קליסט: by dish / by category / by station → `onViewChecklist(mode)`
  - רשימת קניות: view / export → `onViewMenuShoppingList()` / `onExportMenuShoppingList()`
  - הכל: view / export → `onViewAll()` / `onExportAllTogether()`
  - הדפסה: → `printMenu()`
  - Choosing an option closes the sheet, then runs the action.
- [ ] FAB action: change the label key `menu_toolbar_open` text to "צ'קליסט והדפסות" (dictionary value change, approved). Its `run` toggles a single `exportSheetOpen_` signal.
- [ ] Remove the 4 export pills and their dropdown markup, and their styles in `_toolbar.scss`. The `.pill-row` keeps only the Save pill.
- [ ] Delete the dead `toolbarOpen_`, `showExport_`, `menuFabExpanded_`, `openToolbar` and related toggle methods (~L122-124, ~L1151-1170), plus `toggleExportChecklistDropdown` / `viewExportModal_` if they're now unused.
- [ ] `export-preview.component.scss` gets `@media (max-width: 600px)`:
  - `.paper-inner` padding ~1rem
  - `max-height: calc(100dvh - 6rem)`
  - the section/table wrapper gets `overflow-x:auto`
  - table font `--fs-sm` and cell padding `.375rem .5rem`
  - `.export-preview-actions { flex-wrap:wrap }`
  - all `100vh` → `100dvh`

### Should Have (P1)
- [ ] Remove the hard-coded "🖨 הדפסה" string; the sheet uses dictionary key `menu_print` = "הדפסה" (add if missing).

### Nice to Have (P2)
- [ ] The sheet remembers the last-used group and opens with it expanded.

## UI/UX Notes

- The sheet sits above the app header (z-index above `.bottom-nav` 200 and hero-fab); the backdrop covers the page.
- Dictionary changes: the `menu_toolbar_open` value becomes "צ'קליסט והדפסות"; add `menu_print` if missing. Reuse `toolbar_checklist`, `toolbar_shopping`, `toolbar_all`, `view`, `export`, and the `export_checklist_by_*` keys.
- RTL: icons at inline-start, rows full-width, tap targets ≥44px.

## Atomic Sub-tasks

- [ ] A1: `menu-export-sheet` component: markup, animation, backdrop and Escape close, with a spec (open → backdrop click → close emitted) (`components/menu-export-sheet/**`).
- [ ] A2: Wire the FAB action → `exportSheetOpen_`; connect the sheet outputs to the existing page methods (`menu-intelligence.page.ts/.html`).
- [ ] A3: Remove the export pills, their styles and the dead signals and methods (`menu-intelligence.page.ts/.html`, `_toolbar.scss`).
- [ ] A4: export-preview portrait styles (`export-preview.component.scss`).
- [ ] A5: Build and run specs. Check at 360px portrait, landscape and desktop. Update the session-state file.

## Technical Considerations

- Dependencies: `HeroFabService.setPageActions`, `MenuIntelligencePage` export methods, `ExportPreviewComponent`, `MenuExportService` (unchanged), `ClickOutSideDirective`.
- New files: `components/menu-export-sheet/menu-export-sheet.component.{ts,html,scss,spec.ts}`.
- Model changes: none.
- `@media print` rules in `_toolbar.scss` must still hide the Save pill (`.no-print`).

## Out of Scope

- cook-view's export bar (`cook-view.page.html` `.export-bar-*`).
- The content and columns of the checklists (`menu-export.service.ts`).
- The recipe-builder `app-export-toolbar-overlay`.

## Critical Questions

1. On desktop:
   - a) Same: FAB opens the top sheet; export pills removed everywhere (default)
   - b) Keep the export pills on desktop (≥769px); sheet on mobile only

## Success Criteria

- [auto] `rg -n "toolbarOpen_|showExport_|menuFabExpanded_|openToolbar" src/app/pages/menu-intelligence` → no matches.
- [auto] `npx ng test --watch=false --include=src/app/pages/menu-intelligence/**/*.spec.ts --include=src/app/shared/export-preview/**/*.spec.ts` → 0 failures.
- [auto] `npm run build` → exit 0.
- [human] Phone, menu builder: tap FAB → "צ'קליסט והדפסות" → the sheet slides down from the top → tap outside → it slides away. Choose צ'קליסט → לפי מנה → the preview opens and is readable in portrait, with no horizontal page overflow; close, print and Excel buttons all visible.
- [human] Save is still visible and works.
