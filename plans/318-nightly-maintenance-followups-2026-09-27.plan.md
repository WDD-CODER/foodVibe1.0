# Plan 318 — Nightly Maintenance Follow-ups (2026-09-27)

**Source:** Unattended `/nightly-maintenance` run, 2026-09-27. Report-only findings — nothing here was fixed by that run; it never commits/pushes application code. Persisted as a plan per Human request so these don't get lost.

## Context

Full audit: `.claude/techdebt-reports/techdebt-2026-09-27.md`. Two items are real rule violations; the rest is background debt logged for visibility, not urgency.

## Atomic Sub-tasks

- [ ] `src/app/core/interceptors/auth.interceptor.ts:4,22` — replace `BehaviorSubject<string | null | undefined>` (refresh-token gate) with `signal()`. Hard rule: signals only, no `BehaviorSubject`. Auth-path file — read `.claude/skills/auth-and-logging/SKILL.md` before touching.
- [x] `src/app/shared/nutrition-badge/nutrition-badge.component.ts:46` — replace legacy `@Input() nutrition` decorator with `input()`. Flagged since at least `techdebt-2026-04-20.md` (~5 months unresolved).
- [x] `src/app/shared/quick-add-product-modal/quick-add-product-modal.component.ts:121` — remove stray trailing semicolon.
- [x] `src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.ts:197` — remove stray trailing semicolon.
- [ ] Bundle budget: initial bundle is 39.17 kB over its 500 kB budget (down from 93.77 kB over on 2026-09-16 — improving, not blocking). Revisit if it keeps climbing.
- [ ] Refactor-candidate backlog (24 files >300 lines, full-project sweep): triage which of the top offenders (`menu-intelligence.page.ts` 1413 lines, `recipe-builder.page.ts` 1394, ~~`cook-view.page.ts` 1201~~) are worth a deliberate split. Not a nightly drive-by — needs a dedicated session.
  - [x] `cook-view.page.ts` — triaged 2026-09-28: timer/stopwatch + export/preview flows (no coupling to the recipe/scaling/edit-mode signals) extracted to component-scoped `CookTimerService`/`CookViewExportService` in `src/app/pages/cook-view/services/`; page dropped 1201 → 979 lines. Scaling/edit-mode/workflow-form (~600+ lines) deliberately left in place — all wired through the same `recipe_`/`scaleFactor_`/`isDish_` signals, splitting would relocate coupling not remove it. Branch `chore/cook-view-service-split`, `ng build` clean. Human-validated 2026-09-28.
  - [ ] `menu-intelligence.page.ts` (1413 lines) — not yet triaged
  - [ ] `recipe-builder.page.ts` (1394 lines) — not yet triaged
  - [ ] Remaining ~21 files in the >300-line backlog — not yet triaged
- [x] `venue-detail.component.html:45` / `venue-list.component.html:119` — remove unnecessary `?? []` (NG8102 warning; `available_infrastructure_` is never null/undefined per its type).

## Notes

- Verified 2026-10-10 (night 1010, base `f739e9a1`): the 4 items ticked above were already fixed on `main` by earlier work — `nutrition-badge` uses `readonly nutrition = input<…>()`; `rg -n ';\s*$' src/app --type ts -g '!*.spec.ts'` → 0 hits; `rg 'available_infrastructure_.*\?\?' src/app` → 0 hits; `npx ng build` → exit 0 with no NG8102 warnings. Still open: `auth.interceptor.ts` `BehaviorSubject` (line 28), the >300-line backlog, and the bundle budget (now 46.12 kB over 500 kB, up from 39.17 kB on 2026-09-27 — climbing again).

- No security flags found this pass.
- Docs (`breadcrumbs.md` in `core/services/`, `shared/`, `core/components/`, `core/models/`) were already synced and committed as part of this same nightly-maintenance follow-through — not part of this plan's remaining work.
