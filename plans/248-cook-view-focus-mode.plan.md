---
name: Cook View Focus Mode Redesign
overview: Transform cook-view from a static viewer into a cooking workflow engine with step progression, ingredient checklist, timer, and completion screen.
todos: []
isProject: false
---

# Goal
Full UX redesign of cook-view.page — two-column layout (ingredients left, steps right) with deliberate, progressive interactions. Three sequential briefs: A (signals/methods), B (template), C (SCSS + translations).

# Atomic Sub-tasks

## Brief A — Signals & Methods (cook-view.page.ts)
- [ ] A1: Add `activeStepIndex_` signal, reset on recipe load
- [ ] A2: Add `stepDoneSet_` signal, reset on recipe load
- [ ] A3: Skip — `checkedIngredients_` already exists
- [ ] A4: Add `allIngredientsChecked_` computed
- [ ] A5: Add `ingredientCheckProgress_` computed
- [ ] A6: Add `activeTimerStepIndex_` signal
- [ ] A7: Add `timerSecondsLeft_` signal
- [ ] A8: Add `timerIntervalId_` private field
- [ ] A9: Add `cookingComplete_` computed
- [ ] A10: Skip — `toggleIngredientCheck()` already exists
- [ ] A11: Add `markStepDone(index)` method
- [ ] A12: Add `peekedStepIndex_` signal + `toggleStepPeek(index)` method
- [ ] A13: Add `startTimer(stepIndex, minutes)` method
- [ ] A14: Add `cancelTimer()` method
- [ ] A15: Add `cancelTimer()` to ngOnDestroy
- [ ] A16: Add `timerDisplay_` computed
- [ ] A17: Update `completedStepCount_` to use `stepDoneSet_`
- [ ] A18: Reset new signals in ngOnInit recipe-set block
- [ ] A19: `ng build` — verify clean

## Brief B — Template Rewrite (cook-view.page.html)
- [ ] B1: Verify all Brief A signals exist
- [ ] B2: Keep outer shell, export-preview, approve-stamp untouched
- [ ] B3: Replace cook-view-shell interior with new layout (use `name_hebrew` not `name_`, `scaledCost_()` not `totalCost_()`)
- [ ] B4: Header bar + scale bar
- [ ] B5: Ingredient pane with checklist and progress
- [ ] B6: Step pane with card layout, timer, mark-done
- [ ] B7: Dish mode cards iterating `scaledPrep_()`
- [ ] B8: Completion screen (use `.c-btn-ghost` not `.c-btn-secondary`)
- [ ] B9: Preserve edit-mode blocks
- [ ] B10: `ng build` — verify clean

## Brief C — SCSS + Translations
- [ ] C1: Delete old layout selectors, keep preserved ones
- [ ] C2: Add Focus Mode token block
- [ ] C3: Add all new selectors
- [ ] C4: Mobile breakpoint
- [ ] C5: Add 9 translation keys to `public/assets/data/dictionary.json`
- [ ] C6: `ng build` — verify clean

## Cleanup
- [ ] D1: Remove dead code (`checkedSteps_`, `toggleStepCheck()`, `onTimerHintTap()`)

# Corrections from Verification
- `recipe.name_` -> `recipe.name_hebrew` (model field)
- `totalCost_()` -> `scaledCost_()` (actual signal)
- `.c-btn-secondary` -> `.c-btn-ghost` (no secondary exists)
- Outer wrapper is `cook-view-container` not `cook-view-page`
- Dictionary at `public/assets/data/dictionary.json` not `src/assets/i18n/`
- `checkedIngredients_` + `toggleIngredientCheck()` already exist — skip
- `completedStepCount_`/`totalStepCount_` must be updated to use `stepDoneSet_`

# Rules
- All signals use trailing underscore convention
- No BehaviorSubject/Subject — signals only
- No template changes in Brief A
- No SCSS changes in Brief A
- Five-group vertical rhythm in SCSS (cssLayer)
- Logical properties only
- ng build must pass after each brief

# Done when
- Page renders with recipe loaded
- Ingredient rows check on tap with progress bar
- Step cards show active/pending/done states
- "Mark done" advances to next step
- Timer starts/cancels on step cards
- Completion screen shows after last step
- Edit mode still works
- Mobile stacks correctly
- All translation keys render in Hebrew

## Backend Impact — None
