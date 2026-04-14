## Goal
Separate cook timer from labor time in cook-view: add a small unobtrusive timer icon per step (h:mm countdown based on recipe-builder setting), hide labor time from cook-view entirely, and add an optional per-step stopwatch icon.

## Scope

### Modified files:
- `src/app/core/models/recipe.model.ts` — add `cooking_time_minutes_?: number` field to `RecipeStep` (separate from `labor_time_minutes_`)
- `src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.html` — add "cook time" field alongside existing labor time field
- `src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.ts` — add cook time increment/decrement/keyboard logic
- `src/app/pages/recipe-builder/services/recipe-form.service.ts` — add `cooking_time` to `createStepGroup()` and patch/map logic
- `src/app/pages/cook-view/cook-view.page.html` — remove labor time display; redesign timer area: small icon → tap → h:mm input (pre-filled from `cooking_time_minutes_`) → countdown; optional small stopwatch icon
- `src/app/pages/cook-view/cook-view.page.ts` — update `startTimer()` for h:mm format (supports hours); add stopwatch signal + logic; fix `ngOnDestroy` interval leak; remove `activeTimerStepIndex_` conflation with labor
- `src/app/pages/cook-view/cook-view.page.scss` — new small timer icon styles (unobtrusive before expanded, h:mm display when active)
- `public/assets/data/dictionary.json` — add keys: `cooking_time_minutes`, `timer_set`, `stopwatch_start`, `stopwatch_stop`, `h_mm_placeholder`
- `src/app/core/services/recipe-export.service.ts` — include `cooking_time_minutes_` in export/import mapping
- `src/app/pages/recipe-builder/recipe-builder.page.ts` — include `cooking_time` in cached step rows + normalization

### New files:
- None

## Out of Scope
- Labor time is NOT shown anywhere in cook-view (neither cooking mode nor view mode) — admin/management only
- Auto-parsing cook time from instruction text ("bake 15 min")
- Notification API / browser push on timer completion (can be a follow-up)
- Pulse animation on completion (follow-up)
- Multiple simultaneous countdown timers (one active at a time)

## Constraints
- Timer icon must be **small and unobtrusive** in the step card — appears as an icon, not a pill that clutters the layout
- Expanding the input (h:mm) happens only after tap — collapsed state is just the icon
- Cook-view shows timer controls only; edit mode (recipe inline edit in cook-view) shows labor time
- h:mm format: 90 minutes displays as "1:30", not "90 min"
- `cooking_time_minutes_` is optional (0 = not set); timer icon only appears when > 0 OR always appears with empty input (TBD — default: always shows icon, pre-fills if set)
- Fix `ngOnDestroy`: clear `timerIntervalId_` on component destroy

## Prior Work
- Plan 201 FR-10: deferred this exact feature; timer signals already exist in cook-view.page.ts
- `activeTimerStepIndex_`, `timerSecondsLeft_`, `timerDisplay_`, `startTimer()`, `cancelTimer()` already implemented — repurpose/keep these
- Current `cv-timer-pill` in HTML uses `labor_time_minutes_` — this wiring is the bug to fix

## Success Criteria
- [ ] `cooking_time_minutes_` field exists in `RecipeStep` model and persists via recipe-builder
- [ ] Cook-view shows a small timer icon per step; tapping opens h:mm input (pre-filled if set in recipe)
- [ ] Timer counts down; displays as m:ss under 60 min, h:mm:ss over 60 min
- [ ] Labor time field is visible in recipe-builder and cook-view edit mode only — never in cook-view cooking mode
- [ ] Optional stopwatch icon per step: tap to start count-up, tap again to stop/reset
- [ ] `ngOnDestroy` clears active interval (no leak on navigation)
- [ ] All new strings have i18n keys in `dictionary.json`
- [ ] Existing tests pass; new tests cover `startTimer()` h:mm logic

## Session ID
2026-04-13-cook-timer-labor-separation
