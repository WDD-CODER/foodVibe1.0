# Plan 511 — Validation fixes for run 499-502: longer undo, step undo shows at once, stepper hold climbs digit by digit, one empty ingredient row

Status: done
Track: code
Depends-on: 499, 500, 501, 502 (PR #487 merged into main)
Snapshot: 3224c973f7fba595ca50cf92ed58dc8783632e94

## Prerequisites

- PR #487 (`orch/run-499-502`) is merged into `main`. Every file below changes code that only exists on that branch.
  Readiness must refuse this plan until `git log origin/main` contains `f9fb510f` (plan 502's merge).

## Problem Statement

The Human validated the run-499-502 cards on 2026-10-30. Most passed. These did not, or came with a change:

1. **Undo toast is too short (card ②).** Every line-removal undo goes through `UserMsgService.onLineRemoved`, which
   uses the plain success toast: `SUCCESS_DURATION_MS = 2000` (`src/app/core/services/user-msg.service.ts:4`). The Human
   wants an undo toast to stay at least 30 seconds. It is not only purchase options: there are 15 callers (product
   form, product import, recipe builder ingredients / steps / logistics, cook view, menu intelligence dishes and
   sections, event notes, event closing photos, venue rows, AI product and AI recipe drafts).
2. **A restored workflow step does not show (found by the Human).** Recipe builder: delete a step, press undo. The step
   is back in the form, but the list does not redraw until the user adds another step. Cause: `deleteStep`
   (`recipe-builder.page.ts:1096`) re-inserts into `workflowArray` from the toast's click, outside
   `RecipeWorkflowComponent`, which is `OnPush` and lists `workflowFormArray().controls`, so it is never marked for a
   redraw. The ingredients table and the logistics baseline restore the same way and may have the same bug.
3. **Hold-to-repeat jumps past the number the user wants (card ⑥, cook view).** Hold steps depend on the value's size
   (`getHoldIncrStep` / `getHoldStepIncrement` in `src/app/core/utils/quantity-step.util.ts`, plan 176 / 214). At
   100.1 g a hold snaps to 200, then 300, so 145 can only be reached by tapping one at a time. The Human wants the step
   to grow with how long the button is held: the ones digit first, then tens, then hundreds.
4. **Enter from the unit text (card ③).** Tapping the unit text next to a quantity and pressing Enter picks an option in
   the unit list instead of moving to the next row. Tapping the quantity and pressing Enter does move to a new row.
5. **New: only one empty ingredient row (Human request).** Like menu intelligence, the recipe ingredient list must never
   have more than one empty row (a row with no item name). Enter and the add-row button do not add a second one.

## Goals & Success Criteria

- Primary: the four validation findings are fixed and the one-empty-row rule holds in the recipe ingredient list.
- Success:
  - [ ] [auto] `quantity-step.util.spec.ts` covers the new hold tiers: from 100 g holding + gives 101 … 109, then 110,
    120 … 190, then 200, 300; releasing and holding again starts at the ones digit; holding − mirrors it and stops at the
    minimum; kg starts at 0.1.
  - [ ] [auto] `step-hold.directive` spec: the emitted repeat count resets on release.
  - [ ] [auto] `user-msg.service.spec.ts`: an undo toast stays 30 000 ms; a plain success toast still 2 000 ms.
  - [ ] [auto] `recipe-workflow.component.spec.ts`: a step re-inserted from outside the component is rendered without
    another user action. Same for the ingredients table.
  - [ ] [auto] A recipe-builder spec: with one empty ingredient row, the add-row button and Enter add no row and focus
    the empty one.
  - [ ] [auto] `pnpm run build` and `pnpm run test:ci` pass; `node scripts/scope-check.mjs --arch --plan=<this plan>` and
    `--reuse --plan=<this plan>` exit 0; `node scripts/kit-manifest-check.mjs` passes.
  - [ ] [human] Product form: delete a purchase option → the undo toast stays about 30 seconds and undo still works.
  - [ ] [human] Recipe builder: delete a workflow step, press undo → the step shows again at once, in its place.
  - [ ] [human] Cook view: from 100 g hold + → it climbs 101…109, then by tens; let go at 140, tap + five times → 145.
  - [ ] [human] Recipe builder: tap the unit text of a row, press Enter → the cursor moves to the next row.
  - [ ] [human] Recipe builder: with an empty ingredient row open, press the add-row button and press Enter in it →
    no second empty row appears.

## Execution Mode

- Parallel: no — one small batch, one builder.
- Concurrent plans: 510 (suppliers) — no file overlap.
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/services/user-msg.service.ts
src/app/core/services/user-msg.service.spec.ts
src/app/core/utils/quantity-step.util.ts
src/app/core/utils/quantity-step.util.spec.ts
src/app/shared/counter/step-hold.directive.ts
src/app/shared/counter/step-hold.directive.spec.ts
src/app/shared/counter/counter.component.ts
src/app/shared/counter/counter.component.spec.ts
src/app/pages/cook-view/cook-view.page.ts
src/app/pages/cook-view/cook-view.page.html
src/app/pages/menu-intelligence/menu-intelligence.page.ts
src/app/pages/menu-intelligence/menu-intelligence.page.html
src/app/pages/recipe-builder/recipe-builder.page.ts
src/app/pages/recipe-builder/recipe-builder.page.html
src/app/pages/recipe-builder/recipe-builder.page.spec.ts
src/app/pages/recipe-builder/components/recipe-workflow/**
src/app/pages/recipe-builder/components/recipe-ingredients-table/**
src/app/pages/recipe-builder/services/recipe-logistics-picker.service.ts
```

## Escalation Protocol

A file outside the scope is needed → STOP, name the file, the change and why; offer `approved: <path>`; append it to
the scope block; retry.

## Architecture Impact

- INV-none: preserves — client-side UI behaviour only (toast timing, redraw, stepper maths, row rule). No data shape,
  route or server change.

## Reuse Check

- Undo toast timing — family: feedback — rung: 1 — why: extend `UserMsgService` (`onLineRemoved` gets its own
  duration); no new toast.
- Hold tiers — family: helpers — rung: 1 — why: change `quantity-step.util.ts` and `StepHoldDirective` that every
  stepper already uses; no new stepper.
- One empty row — family: form-field — rung: 2 — why: reuse the ingredients table's existing `isEmptyRow_` check;
  same behaviour as the menu intelligence dish rows.

## Step 0 — Reality Check

`node scripts/scope-check.mjs --drift --plan=<this plan>`. Confirm PR #487 is in `main`. Reproduce findings 2 and 4 in
the running app (or a spec) before changing code. Read how menu intelligence keeps one empty dish row and copy that rule.

## Functional Requirements

1. **Undo toast 30 s (A1).** `onLineRemoved` shows its toast for `UNDO_DURATION_MS = 30000`. Plain success toasts stay
   2 s; errors 4 s. A newer toast still replaces it (current behaviour). The existing owner `DestroyRef` dismissal stays.
2. **Restored rows redraw (A2).** A row re-inserted by undo shows at once in the workflow steps, the ingredients table
   and the logistics baseline. Fix it in the list components (react to the form array's changes, e.g. a signal bumped
   on `valueChanges` or `markForCheck`), not by forcing a redraw from the toast.
3. **Hold climbs digit by digit (A3).** During one press: the first 9 repeats step by the base step, the next 9 by
   base × 10, after that by base × 100 (three tiers, as the Human asked). When the tier goes up, the value first snaps to
   a multiple of the new step (109 → 110, 190 → 200). Releasing resets to the base step. The base step: 1 for g, ml and
   plain numbers (guest count, minutes); 0.1 for kg and l (0.01 when the value has 2 decimals). A single tap stays one
   base step — for grams that is now 1 instead of 0.1. `StepHoldDirective` passes the repeat count; the maths stays in
   `quantity-step.util.ts`. Same timing as now (500 ms delay, 80 ms repeat). `explicitStep` callers are unchanged.
4. **Enter from the unit text (A4).** Tapping the unit text focuses and selects the quantity (it does today); Enter then
   does what Enter in the quantity does (next row / new row) and never picks a unit option. If the unit text is itself a
   unit picker, the tap must not open it.
5. **One empty ingredient row (A5).** `addNewIngredientRow` from the add-row button or Enter: when an empty row
   (no item name) already exists, add nothing and focus that row's search. Paste, AI drafts and the reset path keep
   their current behaviour.

## Atomic Sub-tasks

- [x] A1: Keep the undo toast on screen for 30 seconds so a removed line can still be brought back — UNDO_DURATION_MS for onLineRemoved, spec — src/app/core/services/user-msg.service.ts, src/app/core/services/user-msg.service.spec.ts
- [x] A2: Show a restored step or ingredient at once after undo, without needing another click — OnPush lists react to form-array changes; workflow, ingredients table, logistics baseline; specs — src/app/pages/recipe-builder/components/recipe-workflow/**, src/app/pages/recipe-builder/components/recipe-ingredients-table/**, src/app/pages/recipe-builder/recipe-builder.page.ts
- [x] A3: Make holding + or − climb by ones, then tens, then hundreds, so any amount is easy to reach — repeat count from StepHoldDirective, count-based tiers with snap, base step per unit, specs — src/app/core/utils/quantity-step.util.ts, src/app/shared/counter/step-hold.directive.ts, src/app/shared/counter/counter.component.ts, src/app/pages/cook-view/cook-view.page.ts, src/app/pages/menu-intelligence/menu-intelligence.page.ts, src/app/pages/recipe-builder/components/**
- [x] A4: Let Enter after tapping the unit text move to the next ingredient row, like it does from the quantity — src/app/pages/recipe-builder/components/recipe-ingredients-table/**
- [x] A5: Allow only one empty ingredient row, so Enter or the add button never stacks blank rows — guard in addNewIngredientRow, focus the empty row, spec — src/app/pages/recipe-builder/recipe-builder.page.ts, src/app/pages/recipe-builder/recipe-builder.page.spec.ts

## Open Questions

- None. Planner decisions (Human delegated "decide yourself" for this batch): 30 s applies to every line-removal undo,
  not only purchase options; three tiers ×1/×10/×100 switching after 9 repeats; grams single tap becomes 1.

## Architect + PM review

- Architect: all changes stay in existing shared pieces (toast service, step maths, hold directive, list components).
  The tier change touches every stepper, so its spec carries the whole table; the redraw fix goes in the lists so any
  future restore path works. No invariant touched.
- PM: answers each failed card directly, in the Human's words (30 s, 145 g, Enter, one empty row). The grams single-tap
  change (0.1 → 1) follows the Human's "the first clicks only change 100.1 to 100.2" complaint. Research: no common
  standard grows the step by count; the closest is LabVIEW's decade steps on its increment buttons, and NN/G asks that a
  hold speed up while typing stays possible — both kept.

## Done when

All [auto] items pass and the Human answers the [human] cards.

## Execution Notes

- 2026-10-30 Planner: from the Human's validation reply to the run-499-502 cards. Passed: ④ ⑤ ⑦ ⑧ ⑨ ⑪ ⑫ ⑬ ⑭ ⑮.
  ② passed with the 30 s change. ③ partly failed (Enter from the unit text). ⑥ failed (hold jumps). ① and ⑩ not
  answered yet. Step undo redraw found by the Human outside the cards.
- Orchestrator readiness (2026-10-30, Planner decided — Human's standing rule: decide and report): undo restore fails → keep the current onLineRemoved handling, no new message.
- Orchestrator readiness (2026-10-30): pointer leaves the button or pointercancel mid-hold → treat as a release; the repeat count resets to the base step.
- Orchestrator readiness (2026-10-30): user navigates away while the 30 s toast is open → the toast is dismissed with its owner and the removal stays.
- Orchestrator readiness (2026-10-30): typed value with extra decimals (100.15 g) then hold + → g/ml base stays 1; the first step snaps to the tier step.
- 2026-10-30 Builder: build exit 0; lint 0 errors; test:ci 1646 SUCCESS; scope-check --arch/--reuse exit 0; kit-manifest-check exit 0. `--drift` reports only the 499-502 commits this plan depends on (all merged), not a conflict.
- Builder: StepHoldDirective now emits a number (0 first press, 1.. repeats); callers take `holdRepeat`. A4 is a capture-phase Enter listener on `.col-unit` in the ingredients table (the picker stops Enter itself).

- Step 0 drift: the 4 drift commits (499-502) are the plan's own Depends-on, already merged; Snapshot moved to origin/main 3224c973 -> drift clean.
