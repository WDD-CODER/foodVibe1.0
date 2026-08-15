---
name: Cook Timer / Labor Time Separation
overview: Separate cook timer from labor time in cook-view — add cooking_time_minutes_ field, redesign cook-view timer UI (small icon → h:mm countdown), hide labor time from cook-view, add optional stopwatch.
todos: []
isProject: false
---

# Cook Timer / Labor Time Separation

## Goal

Separate cook timer from labor time in cook-view: add `cooking_time_minutes_` field to `RecipeStep`, wire a small unobtrusive timer icon (h:mm countdown) into each step card, hide `labor_time_minutes_` from cook-view entirely, and add an optional per-step stopwatch.

## Atomic Sub-tasks

- [ ] Task 1: `src/app/core/models/recipe.model.ts` — add `cooking_time_minutes_?: number` to RecipeStep
- [ ] Task 2: `src/app/pages/recipe-builder/services/recipe-form.service.ts` — add `cooking_time: [0]` to createStepGroup()
- [ ] Task 3: `src/app/pages/recipe-builder/services/recipe-form.service.ts` — patch `cooking_time` in patchFormFromRecipe()
- [ ] Task 4: `src/app/pages/recipe-builder/services/recipe-form.service.ts` — StepRow type + buildRecipeFromForm cooking_time mapping
- [ ] Task 5: `src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.ts` — add cookTimeOpenRows_, isCookTimeOpen, toggleCookTime, editingCookTimeIndex_, ViewChildren, increment/decrement/enter/exit/keydown methods
- [ ] Task 6: `src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.html` — add cook time icon + collapsible input row in preparation branch
- [ ] Task 7: `src/app/pages/cook-view/cook-view.page.ts` — add timerInputExpandedIndex_, timerCustomInput_, stopwatch signals/methods, expandTimerInput, confirmTimerInput, cancelTimerInput, startStopwatch, stopStopwatch
- [ ] Task 8: `src/app/pages/cook-view/cook-view.page.ts` — update timerDisplay_ for h:mm:ss, add ngOnDestroy with interval cleanup
- [ ] Task 9: `src/app/pages/cook-view/cook-view.page.ts` — applyWorkflowFormToRecipe(): add cooking_time_minutes_ mapping
- [ ] Task 10: `src/app/pages/cook-view/cook-view.page.ts` — setupWorkflowForm_(): patch cooking_time in form init
- [ ] Task 11: `src/app/pages/cook-view/cook-view.page.html` — redesign timer area: icon → h:mm input → countdown; add stopwatch icon; remove labor_time references
- [ ] Task 12: `src/app/pages/cook-view/cook-view.page.scss` — add cv-timer-icon, cv-timer-input-row, cv-stopwatch-icon styles
- [ ] Task 13: `public/assets/data/dictionary.json` — add cooking_time_minutes, timer_input_placeholder, stopwatch_start, stopwatch_stop keys
- [ ] Task 14: `src/app/core/services/recipe-export.service.ts` — add cooking_time_minutes_ column to exportCookingSteps()
- [ ] Task 15: `src/app/pages/recipe-builder/recipe-builder.page.ts` — cachedSteps_ type + workflowNorm cooking_time
- [ ] Task 16: Tests — timerDisplay_ h:mm:ss test + cooking_time control in step group test

## Constraints

- Timer icon shows only when cooking_time_minutes_ > 0 (Approach A — preset-gated)
- Timer icon is small/collapsed by default — expands only on tap
- h:mm format: 90 min → "1:30", displayed as h:mm:ss when active and ≥ 3600s
- Labor time NOT shown in cook-view cooking mode (admin-only)
- ngOnDestroy must clear both timerIntervalId_ and stopwatchIntervalId_
- All new strings have i18n keys in dictionary.json

## Done when

- cooking_time_minutes_ persists via recipe-builder
- Cook-view shows small timer icon → h:mm input → countdown (h:mm:ss when ≥ 3600s)
- Labor time: recipe-builder + cook-view edit mode only
- Optional stopwatch per step
- ngOnDestroy clears intervals
- Build passes 0 errors
