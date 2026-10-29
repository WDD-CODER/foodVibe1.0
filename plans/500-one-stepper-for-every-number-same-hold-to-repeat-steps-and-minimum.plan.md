# Plan 500 — One stepper (+/−) for every number: same hold-to-repeat, steps and minimum

Status: draft
Track: code
Depends-on: 499
Snapshot: 21a2ffe5464ca65b4630ac0bdd5894a160a3cb8f

## Problem Statement
Every +/− control around a number should behave the same, but there are five stepper implementations besides `app-counter`, and they differ in hold-to-repeat, step size and minimum. Measured against `origin/main` at b6181027 (Human brief 02, 2026-10-26; re-check on arrival):
- Base: `src/app/shared/counter/` `app-counter` — press-and-hold repeat with `setTimeout`, `stepOptions` via `src/app/core/utils/quantity-step.util.ts` (`quantityIncrement` / `quantityDecrement`). Its hold uses mouse events; it is unchecked on touch.
- `menu-intelligence.page.html` guest count — own hold (`startGuestHold` / `stopGuestHold`, pointer events).
- `cook-view.page.html` — two `.cv-stepper`s, click only (`stepScaledBannerAmount`, `setIngredientAmount`).
- `recipe-ingredients-table` — click only (`decrementAmount`), minus disabled at 0.
- `recipe-workflow` — labor time and cook time minus/plus buttons (lines ~79, ~126), click only.

## Goals & Success Criteria
- Primary: every +/− around a number has the same press-and-hold repeat (touch and mouse), the same step rules, the same minimum handling, the same disabled look and the same keyboard (arrow up / down).
- Success:
  - [ ] [auto] Counter specs pass for: hold repeats with pointer events, release stops it, the minimum stops the repeat and disables the minus button, arrow up / down steps. `npx ng test --watch=false --browsers=ChromeHeadless` green.
  - [ ] [auto] `node scripts/reuse-lint.mjs --diff=origin/main` reports no new stepper copy and warns on a fixture minus/plus pair next to a number input outside the stepper; `node scripts/reuse-lint.mjs --check-registry` exits 0.
  - [ ] [auto] `npx ng build` passes; `node scripts/scope-check.mjs --arch --plan=<this plan>` and `--reuse --plan=<this plan>` exit 0; `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
  - [ ] [human] Recipe builder ingredient quantity, cook-view amount and menu guest count: hold − → repeats at the same speed in all three and stops at the minimum.
  - [ ] [human] Phone width: press and hold + on the guest count → it repeats; release stops it.
  - [ ] [human] The cook-view and menu-intelligence steppers still look like their own pages (the ink and paper skins).

## Execution Mode
- Parallel: no — the page steppers move onto one shared component.
- Concurrent plans: none (501, 502 depend on this plan)
- Isolated DB: no

## Execution Notes
- Source: Human briefs 00 + 02 (verified against `origin/main` b6181027). `main` is now 21a2ffe5: re-check every claim before editing. This plan is the stepper half (02b) of brief 02; plan 499 is the number box.
- Run order of the batch: 498 → 499 → 500 → 501 → 502, one at a time.
- Design direction (the Worker decides): extend `app-counter`, or add a sibling if it would need more than 3 new flags (ADR 0024 sibling rule), so the page steppers move onto it. Keep the page visual skins (cook-view ink set, menu-intelligence paper skin) as variants, not copies. Hold-to-repeat uses pointer events on touch and mouse.
- A stepper that sits around a number box (plan 499) must keep the number box tap behaviour; the +/− buttons are the inner buttons that the number box ignores.
- Risks: `type="number"` refuses `setSelectionRange` — the select-all directive handles it, do not regress plan 482. `appFocusByRow` (Enter to next row) in the recipe tables must keep working. RTL: the minus / plus order flips with the layout, keep today's visual order on each page.
- Hebrew RTL and logical CSS properties only; any new text goes through the dictionary.

## Reuse Check
- One stepper for all page steppers — family: none — rung: 4 — why: the registry has no stepper family; `app-counter` is extended (or one sibling added) and registered as the new family `stepper`
- Quantity step rules — family: helpers — rung: 1 — why: keep `quantityIncrement` / `quantityDecrement` in `core/utils/quantity-step.util.ts` as is
- Fixture rule for a minus/plus pair outside the stepper — family: helpers — rung: 2 — why: one data entry in `scripts/lib/registry-families.mjs`

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/shared/counter/**
src/app/core/utils/quantity-step.util.ts
src/app/core/utils/quantity-step.util.spec.ts
src/app/pages/menu-intelligence/menu-intelligence.page.ts
src/app/pages/menu-intelligence/menu-intelligence.page.html
src/app/pages/menu-intelligence/menu-intelligence.page.scss
src/app/pages/menu-intelligence/menu-intelligence.page.spec.ts
src/app/pages/cook-view/cook-view.page.ts
src/app/pages/cook-view/cook-view.page.html
src/app/pages/cook-view/cook-view.page.scss
src/app/pages/cook-view/cook-view.page.spec.ts
src/app/pages/recipe-builder/components/recipe-ingredients-table/**
src/app/pages/recipe-builder/components/recipe-workflow/**
scripts/lib/registry-families.mjs
scripts/test/reuse-lint.test.mjs
scripts/test/fixtures/reuse/**
docs/brain/component-families.md
src/app/shared/breadcrumbs.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — client-side screens only, no permission or write-route file is touched.
- INV-2: preserves — no tenancy or master-data change.
- INV-3: preserves — no cascades added or moved.
- INV-4: preserves — no schema change.
- INV-5: preserves — no taxonomy change.
- INV-6: preserves — no AI file is touched.

## Atomic Sub-tasks

- [ ] T1: List every +/− control around a number and what each one does today, and record the list — hold or click only, step size, minimum, disabled look — this plan file
- [ ] T2: Make the shared counter hold-to-repeat with pointer events so it works on touch and mouse, and add specs — release stops the repeat, the minimum stops it and disables the minus — src/app/shared/counter/**
- [ ] T3: Decide extend-or-sibling for the counter and add the page skins as variants — cook-view ink set and menu-intelligence paper skin — src/app/shared/counter/**
- [ ] T4: Move the menu guest count onto the shared stepper and delete its own hold code — src/app/pages/menu-intelligence/**
- [ ] T5: Move the cook-view amount steppers onto it — src/app/pages/cook-view/**
- [ ] T6: Move the recipe ingredient quantity and the labor / cook time steppers onto it — src/app/pages/recipe-builder/components/recipe-ingredients-table/**, src/app/pages/recipe-builder/components/recipe-workflow/**
- [ ] T7: Warn when a minus/plus pair is added next to a number input outside the stepper, and register the family — `reuse-lint` rule with fixtures; new `stepper` family with its remaining copies — scripts/lib/registry-families.mjs, scripts/test/reuse-lint.test.mjs, docs/brain/component-families.md
- [ ] T8: Run the full checks and paste the output — `ng build`, headless `ng test`, reuse-lint, scope-check, log-query — Execution Notes

## Done when
- [ ] [auto] Every `[auto]` item under Success Criteria passes (output pasted in the Worker's report).
- [ ] [human] The three `[human]` items under Success Criteria pass.
- Orchestrator readiness (2026-10-29, Planner decided — Human delegated: 'decide yourself'): 500 runs only after 499 is merged into the run branch; if 499 parks, 500 does not start.
- Orchestrator readiness (2026-10-29, Planner decided — Human delegated: 'decide yourself'): drift since 21a2ffe5 (plan 498, and 499 in this run) → builder re-reads in-scope files before editing.
- Orchestrator readiness (2026-10-29, Planner decided — Human delegated: 'decide yourself'): leave → stop the repeat on pointerup, pointerleave and pointercancel.
- Orchestrator readiness (2026-10-29, Planner decided — Human delegated: 'decide yourself'): cancel → no cancel; the value stays where the repeat stopped.
- Orchestrator readiness (2026-10-29, Planner decided — Human delegated: 'decide yourself'): error → clamp to the minimum each page uses today, no maximum, no new message.
- Orchestrator readiness (2026-10-29, Planner decided — Human delegated: 'decide yourself'): edit → each step emits a change as today; arrow keys act on the focused stepper element.
- Orchestrator readiness (2026-10-29, Planner decided — Human delegated: 'decide yourself'): log-query runs as [auto:main] from the main folder (read-only) → approved.
- Orchestrator readiness (2026-10-29, Planner decided — Human delegated: 'decide yourself'): three [human] checks → after the run.
