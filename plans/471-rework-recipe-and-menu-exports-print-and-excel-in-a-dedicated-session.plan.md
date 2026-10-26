# Plan 471 — Rework recipe and menu exports, print and Excel in a dedicated session

Status: draft
Track: code
Snapshot: de282213

## Problem Statement
Handoff section J (`docs/mvp/review-handoff-2026-10-21.md`): previews and print options look good, except «הדפס את
כל המתכון» (print the whole recipe), which still looks bad. The Excel export writes categories in English instead
of Hebrew, and the Excel output is weak across the board. The Human wants this done as a long, dedicated process
together with them, not as a quick fix.

**Not in the current fix run (plans 459–470).** This plan is the single home for every export, print and preview
change of a recipe or a menu. No other plan in the 459–470 batch may write the files in the scope below; findings
about exports from later validation cards are appended here.

## Goals & Success Criteria
- Primary: recipe and menu exports (print, preview, Excel) are good enough for a chef to hand to staff or a client.
- Success (to be refined in the dedicated session):
  - [ ] [human] «הדפס את כל המתכון» prints a clean, readable recipe.
  - [ ] [human] Excel export shows every category and label in Hebrew.
  - [ ] [human] The Human approves the Excel layout for recipes and menus.
  - [ ] [auto] `npx ng build` passes.
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.

## Execution Mode
- Parallel: no — not scheduled. Starts only in a dedicated planning session with the Human.

## Execution Notes
- Deferred: excluded from the 459–470 run by the Human (2026-10-21). Do not take this plan in an orchestrator run.
- Base branch `origin/mvp`; merge back into `mvp` only (never main); executed per `docs/mvp/run-mode.md` when scheduled.
- First step of the dedicated session: walk every export with the Human, collect the wanted output per export, then
  rewrite this plan's sub-tasks.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/export-preview/**
src/app/shared/export-toolbar-overlay/**
src/app/core/services/export.service.ts
src/app/core/services/export.service.spec.ts
src/app/core/services/menu-export.service.ts
src/app/core/services/recipe-export.service.ts
src/app/core/services/excel-workbook.util.ts
src/app/pages/cook-view/services/cook-view-export.service.ts
src/app/pages/recipe-builder/services/recipe-builder-export.service.ts
src/app/pages/menu-intelligence/components/menu-export-sheet/**
docs/mvp/runs/471.md
```

## Read Scope

Entire repo.

## Escalation Protocol

If a Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file, the exact change, and
why; offer `approved: <path>`; then append the path to the scope block above and retry.

## Architecture Impact
- INV-none: preserves — client-side export rendering only; no server, schema, permission or taxonomy writes.

## Backend Impact
- Collections affected: none. Server changes needed: no (to be confirmed in the session).

## Step 0 — Reality Check
In the dedicated session: list every export entry point (recipe builder, cook view, menu export sheet, inventory)
on `origin/mvp` and print what each produces.

## User Stories
- As a chef, I want printed recipes and Excel files that look professional and are in Hebrew so that I can hand them
  to my team and clients.

## Functional Requirements

### Must Have (P0)
- [ ] Print the whole recipe cleanly.
- [ ] Hebrew categories and labels in Excel.
- [ ] A better Excel layout (defined with the Human).

## UI/UX Notes
- Defined in the dedicated session.

## Atomic Sub-tasks
- [ ] X1: Walk every recipe and menu export with the Human and write down what each should look like — session notes into this plan — plans/471-rework-recipe-and-menu-exports-print-and-excel-in-a-dedicated-session.plan.md
- [ ] X2: Rewrite this plan's sub-tasks from those notes before any code is written — this plan file

## Technical Considerations
- Plan 470 cleans float noise in `computePortions`; exports already round via `roundExportNumber`, so no export change
  is needed for it.

## Out of Scope
- Every non-export fix in plans 459–470.

## Critical Questions
- To be asked in the dedicated session.
