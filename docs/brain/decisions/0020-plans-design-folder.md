---
status: accepted
date: 2026-10-10
review-by: 2027-04-10
---

# 0020. Open design plans live in `plans/design/`; closed plans still go to the range folder

## Context

The Human wanted open design plans (Track `design` or `split`: Claude Design work, mostly style and
layout) in one folder they can open at a glance. Every plan tool only looked for open plans at the flat
path `plans/NNN-*.plan.md`. A plan moved into a subfolder could not be taken (`take-plan`), was not
allowed on `main` by `branch-guard.sh` / `.husky/pre-push`, and was never closed by `plan-close`.
Rejected: a `Track:` filter in a script (the Human wanted a folder, not a query), and moving closed
design plans into a separate archive (closed plans belong in the range folders with everything else).

## Decision

- Open plans are the `*.plan.md` files directly inside the open plan folders: `plans/` and `plans/design/`.
  Range folders (`plans/300-400/`) and `plans/archive/` never count as open.
- `scripts/lib/plan-paths.mjs` is the only place that knows this (`OPEN_PLAN_DIRS`, `isOpenPlanPath`,
  `listOpenPlans`, `findOpenPlan`, `findOpenPlanIn`, `OPEN_PLAN_SHELL_RE`). `take-plan`, `todo-query`,
  `scope-check`, `lib/slot`, `plan-close` and `next-plan-number` use it. The shell guards carry the same
  regex, `^(plans|plans/design)/[^/]+\.plan\.md$`.
- `save-plan` puts a Track `design` / `split` plan in `plans/design/`, every other plan in `plans/`.
- `plan-close` files a finished plan from any open folder into `plans/<range>/`.
- Kit-first (ADR 0018): kit config key `plans.openDirs` (default `["plans"]`), rendered with `|quoted`
  in the helper and the new `|alt` filter in the shell guards. Kit PR WDD-CODER/ai-workflow-kit#6.

## Consequences

- A new open folder is one config value in the kit plus the same value in FoodVibe's helper and the
  two shell guards. No script owns its own `plans/` readdir any more.
- `scripts/ship-prep.mjs` (the ULTRA-TRIVIAL lane for a plan-only diff) uses `isOpenPlanPath` too (kit PR #7),
  so a diff that only touches `plans/design/` is plan-only like a flat plan.
- `.worktree-plan` may hold a pre-move path; `activePlanPath()` falls back to the branch's plan when the
  recorded file is gone.

## Review

Check that design plans were taken, guarded and closed like flat plans (look for any `plans/design/`
plan that stayed open after its merge). If nobody uses `plans/design/`, remove it from `OPEN_PLAN_DIRS`.
