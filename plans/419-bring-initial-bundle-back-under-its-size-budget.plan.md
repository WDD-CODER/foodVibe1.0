# Plan 419 — Bring the initial bundle back under its size budget

Status: draft
Track: code — here (not design)
Snapshot: b81cb1f4858b4ae86e97b382cf931bd9ca4445f4

## Problem Statement

`ng build` warns: "bundle initial exceeded maximum budget. Budget 560.00 kB was not met by 1.88 kB with a total of
561.88 kB." The budget was raised from a lower value to 560 kB only on 2026-10-10 (commit `19d1fe41`, plan 318), and
ten days later it is exceeded again. It is a warning only, but it grows with every feature and hides new regressions.

Planner measurement (2026-10-20, `ng build --stats-json` on `d6bc9500`): 46 initial JS chunks, 507.6 kB of JS inputs
plus 37.6 kB styles. Largest contributors:

| kB | Source |
| --- | --- |
| 137.7 | @angular/core |
| 68.4 | @angular/router |
| 39.4 | @angular/common |
| 33.8 | zone.js |
| 23.9 | rxjs |
| 22.7 | lucide-angular (88 icons picked in `app.config.ts`; only `Archive` looks unused) |
| 18.7 | `core/components/header/header.component.ts` |
| 12.1 | `core/services/kitchen-state.service.ts` |
| 7.1 / 5.8 / 5.4 | product / recipe / dish data services |
| 5.6 | `shared/scroll-rail/scroll-rail.component.ts` (pulled in by `tab-chips`) |
| 5.1 | `core/components/hero-fab/hero-fab.component.ts` |
| 4.7 | `shared/loader/loader.component.ts` |

All root modals are already behind `@defer` (plan 312), so the remaining wins are in the always-visible shell
(header, tab-chips, hero-fab) and in what they import.

## Goals & Success Criteria

- Primary: the initial bundle is under budget with room to spare, so the next feature doesn't trip it straight away.
  Target: **initial total ≤ 550 kB** (10 kB headroom). Raising the budget is the fallback, decided on purpose.
- Success:
  - [auto] `ng build` prints no `bundle initial exceeded maximum budget` warning, and the Worker pastes the
    "Initial total" line from the build output (target ≤ 550 kB; if only the fallback in A4 was used, say so).
  - [auto] `ng test` passes.
  - [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
  - [human] Dashboard and recipe builder load and work as before: header menus, tab chips scroll, the + button, and
    opening a recipe all respond as usual.

## Execution Mode

- Parallel: yes — touches only the app shell; wt-1 (377) and wt-2 (417) work in pages and shared selects.
- Concurrent plans: 377, 417
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
angular.json
src/app/app.config.ts
src/app/appRoot/**
src/app/core/components/header/**
src/app/core/components/tab-chips/**
src/app/core/components/hero-fab/**
src/app/shared/scroll-rail/**
```

## Read Scope

Entire repo, plus the build's `stats.json`.

## Escalation Protocol

If a file outside the scope is needed (for example a service the header imports): STOP, tell the Human the file, the
change and why; offer `approved: <path>`; append it to the scope block; retry.

## Architecture Impact

- INV-6: preserves — the scope globs only overlap the `*ai*` pattern by name; the AI modals stay deferred and no AI call is added or moved.
- INV-none: preserves — build output and lazy loading of shell components only; no write route, schema, taxonomy
  term or AI call changes.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Re-measure before A2: plans merged since
`d6bc9500` change the numbers.

## User Stories

- As a chef, the app opens as fast as it does today or faster, and every screen works the same.

## Functional Requirements

1. **Measure (A1):** `ng build --stats-json`, then list the initial chunk's inputs grouped by source (an esbuild
   metafile: `outputs[<main and its import-statement imports>].inputs[*].bytesInOutput`). Write the top 15 and the
   chosen cuts into `## Execution Notes` before changing code.
2. **Trim (A2–A3), in this order, stopping once the target is met:**
   - Header: move parts that open only on a click (menus, popovers, panels) behind `@defer (on interaction)` or a
     lazy component, and drop imports the template doesn't use.
   - Tab-chips / scroll-rail and hero-fab: same check — defer what is only shown on interaction; keep what is on
     screen at first paint.
   - Lucide: remove picked icons no template uses (`Archive` is a candidate; confirm with a search for
     `name="archive"` and `'archive'` before removing). Icons only used on lazy pages stay picked (the pick is global).
   - Nothing on screen at first paint may load late or flicker.
3. **Fallback (A4) — only if trimming can't reach the target without visible changes:** raise `maximumWarning` in
   `angular.json` to the measured total + 10 kB, rounded up to 10 kB, and put a one-line reason in the commit
   message and in `## Execution Notes`.

## UI/UX Notes

- No visual change. A deferred part must show instantly on first use; use `prefetch on idle` where a delay would show.

## Atomic Sub-tasks

- [ ] A1: Measure what fills the first download and pick what to cut — stats-json breakdown, top 15 and chosen cuts in Execution Notes — angular.json (read), build output
- [ ] A2: Load the header's click-only parts on first use instead of at startup — @defer / lazy pieces, unused imports removed — src/app/core/components/header/**
- [ ] A3: Trim the other always-on shell parts and unused icons — tab-chips, scroll-rail, hero-fab, Lucide pick — src/app/core/components/tab-chips/**, hero-fab/**, src/app/shared/scroll-rail/**, src/app/app.config.ts
- [ ] A4: Raise the warning budget on purpose only if trimming was not enough — new value + one-line reason — angular.json

## Out of Scope

- The `cook-view.page.scss` component-style warning (25.89 kB over a 20 kB budget) and the `exceljs` non-ESM warning
  — separate issues, not in the initial bundle.
- Angular / zone.js / router replacement (e.g. zoneless) — too large for this plan.
- Backend, API, auth, schemas, data migration: none.

## Execution Notes
- Orchestrator readiness (2026-10-27): no questions. Re-measured on main: Initial total 564.41 kB (budget 560 kB, over by 4.41 kB), so the ≤ 550 kB target needs about 14.4 kB of trimming. The [human] check stays unticked for the Human.
