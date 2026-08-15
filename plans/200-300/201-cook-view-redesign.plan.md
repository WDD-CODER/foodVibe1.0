# Plan 201 — Cook View Page Redesign

## Problem Statement

The Cook View page is the most important page in the app — it is where users go to actually cook a recipe. Today it displays recipe data and supports scaling, but it does not actively **help the user cook**. There is no way to track progress through steps, no quick-scaling shortcuts, no ingredient check-off, and no immersive cook mode. The page needs to become the user's most-used screen: a place that helps them understand what is happening in a recipe, divide/multiply/convert quantities effortlessly, and guide them through the cooking process.

## Goals & Success Criteria

- **Primary**: Transform Cook View from a read-only recipe display into an interactive cooking companion that users reach for every time they cook.
- **Success Criteria**:
  - Users can scale recipes with a single tap (multiplier chips).
  - Users can check off ingredients as they prep (session-only state).
  - Users can mark cooking steps as done and see progress.
  - Quantities display as kitchen-friendly fractions, not raw decimals.
  - Phase 2 delivers a full-screen Cook Mode with step-by-step navigation, timers, and screen wake lock.
  - All new UI text uses `translatePipe` + `dictionary.json` keys (Hebrew).
  - RTL layout preserved throughout.

## User Stories

- As a chef, I want to tap a multiplier chip (2x, 3x) so I can quickly scale a recipe without fiddling with the stepper.
- As a chef, I want to check off ingredients as I gather them so I know what I still need.
- As a chef, I want to see quantities as fractions (1/2, 3/4) so I can measure with standard kitchen tools.
- As a chef, I want to mark steps as done so I don't lose my place mid-cook.
- As a chef, I want an inline timer hint on steps with `labor_time_minutes_` so I know how long each step takes at a glance.
- As a chef, I want a full-screen cook mode (Phase 2) so I can follow one step at a time with large text in the kitchen.
- As a chef, I want the empty state to show recent recipes so I can jump right back in.

## Functional Requirements

### Must Have (P0) — Phase 1: Core UX

- [ ] **FR-1 Preset Multiplier Chips**: Render a horizontal chip row (½x, 1x, 2x, 3x, 4x) above or adjacent to the existing quantity stepper. Tapping a chip sets `targetQuantity_` to `convertedYieldAmount_() * chipValue`. Active chip is visually highlighted. Chips and stepper stay in sync — manual stepper changes deselect chips. Hidden during `isScaledView_()` (scale-by-ingredient mode). Hidden during `editMode_()`.
- [ ] **FR-2 Ingredient Check-Off**: Tapping an ingredient row in view mode (not edit mode, not setting-by-ingredient) toggles a checked/unchecked state. Checked rows show strikethrough text and reduced opacity. State is session-only (a `signal<Set<number>>()` on the component, keyed by row index). Check state resets when recipe changes or page reloads. Does not affect scaling or export.
- [ ] **FR-3 Smart Fraction Display**: Extend `FormatQuantityPipe` (or create a sibling pipe) to render common fractions as Unicode vulgar fractions: ¼, ⅓, ½, ⅔, ¾. Only apply when the fractional part matches a known fraction within a small tolerance (e.g., 0.005). Non-matching values fall back to current decimal display. Apply in ingredient amounts and prep amounts in Cook View.
- [ ] **FR-4 Redesigned Quantity Display**: Ingredient amounts rendered in accent color (`--cv-accent`) with increased `font-size` (1.1rem minimum) and `font-weight: 700`. Two-column layout on mobile (name left, amount+unit right) collapsing to the existing grid on wider screens. This is a CSS/template restructure of the existing `.ingredients-table-row`.
- [ ] **FR-5 Step Check-Off & Completion Marking**: Each cooking step (non-dish recipes) has a tappable checkbox/circle. Tapping marks the step done: text gets muted styling, a checkmark appears, and the next unchecked step gets subtle emphasis. State is session-only (`signal<Set<number>>()`). Completed count / total shown as a small counter near the section title (e.g., "3/7").
- [ ] **FR-6 Inline Timer Hints**: For each step where `labor_time_minutes_ > 0`, display a timer badge (clock icon + duration text, e.g., "15 min"). Badge is already partially present (`.step-time`). Enhance: make the badge tappable — on tap, show a tooltip/snackbar: "Say 'Hey Google, set timer for 15 minutes'" (translated via dictionary key `voice_timer_hint`). No actual timer logic in Phase 1.
- [ ] **FR-7 Enhanced Empty State**: When no recipe is loaded (`recipe_() === null` and no `lastRecipeId`), show: (a) friendly illustration or large icon, (b) translated message "Pick a recipe to start cooking", (c) CTA button linking to `/recipe-book`, (d) if `cookViewState` has recent recipe IDs (up to 3), show quick-pick chips linking to `/cook/:id`. Requires `CookViewStateService` to track a short recent-recipes list (session or localStorage).

### Should Have (P1) — Phase 2: Cook Mode

- [ ] **FR-8 Full-Screen Cook Mode Overlay**: A new overlay/route (`/cook/:id/mode` or a modal overlay) showing one step at a time with large text (minimum 1.5rem body, 2rem instruction). Navigation: prev/next buttons + swipe gestures (HammerJS or native touch). Exit button returns to normal Cook View. Ingredient list accessible via a slide-out drawer within Cook Mode.
- [ ] **FR-9 Step Progress Bar**: Horizontal segmented progress bar at the top of Cook Mode. Each segment represents a step; tappable to jump to that step. Filled segments = completed steps. Current segment highlighted.
- [ ] **FR-10 Inline Step Timers (Active)**: In Cook Mode, steps with `labor_time_minutes_ > 0` show a countdown timer button. Tapping starts a visible countdown (session-only, no persistence). Timer uses `setInterval` + signal state. When timer reaches 0, pulse animation + optional browser Notification (if permission granted). Multiple timers can run simultaneously.
- [ ] **FR-11 Screen Wake Lock**: When Cook Mode is active, request `navigator.wakeLock.request('screen')` (Web Wake Lock API). Release on Cook Mode exit or component destroy. Feature-detect and silently skip on unsupported browsers. No user-facing error if unavailable.
- [ ] **FR-12 Swipe Gesture Navigation**: In Cook Mode, swipe left/right to navigate between steps. Use touch event listeners (no heavy gesture library). Minimum swipe threshold: 50px horizontal, < 30px vertical deviation. Respect RTL: swipe right = previous step, swipe left = next step.
- [ ] **FR-13 Large Tap Targets**: All interactive elements in Cook Mode must be >= 48x48px touch target (WCAG 2.5.8). Buttons, checkboxes, timer controls, navigation arrows.

### Nice to Have (P2) — Phase 3: Advanced

- [ ] **FR-14 AI Substitutions**: Per-ingredient "Suggest substitute" button. Calls an AI/LLM endpoint with ingredient name + recipe context. Displays suggestion in a popover. Deferred — requires backend AI integration.
- [ ] **FR-15 Ingredient Cross-Reference in Steps**: Parse step instruction text to detect ingredient names from the recipe's ingredient list. Wrap matches in `<strong>` (Angular pipe or directive). Must not break RTL or Hebrew text shaping. Complex — defer to Phase 3.
- [ ] **FR-16 Voice Command Integration**: Beyond timer hints, integrate with Web Speech API for hands-free step navigation ("next step", "previous step", "start timer"). Experimental — defer to Phase 3.
- [ ] **FR-17 Unit System Toggle (Metric/Imperial)**: Global toggle that converts all ingredient units between metric and imperial using `UnitRegistryService` conversions. Requires mapping every unit to its counterpart. Defer — existing per-row unit override covers most use cases.

## UI/UX Notes

- **RTL**: All new UI must use logical CSS properties (`margin-inline-start`, `padding-inline-end`, etc.). Chip row flows naturally in RTL via `dir="rtl"` on container.
- **Multiplier chips**: Use existing `.c-chip` engine from `styles.scss` if available, or create minimal chip styling in cook-view SCSS. Active state uses `--cv-accent` background with `--color-text-on-primary` text.
- **Ingredient check-off**: Tap target is the entire row (not just a checkbox icon). Checked state: `opacity: 0.5`, `text-decoration: line-through` on name and amount.
- **Step check-off**: Show a circle/check icon inline-start of the step instruction. Unchecked = hollow circle, checked = filled check circle in accent color.
- **Dark mode**: Verify all new components respect existing CSS custom property theming. No hardcoded colors.
- **Fractions**: Use Unicode characters directly (¼ = U+00BC, ½ = U+00BD, ¾ = U+00BE, ⅓ = U+2153, ⅔ = U+2154). No images or SVGs.

### Translation Keys Required (dictionary.json)

| Key | Hebrew Value | Section |
|-----|-------------|---------|
| `multiplier_half` | `½×` | `general` |
| `multiplier_1x` | `1×` | `general` |
| `multiplier_2x` | `2×` | `general` |
| `multiplier_3x` | `3×` | `general` |
| `multiplier_4x` | `4×` | `general` |
| `voice_timer_hint` | `אמור: "היי גוגל, שים טיימר ל-{0} דקות"` | `general` |
| `pick_recipe_to_cook` | `בחר מתכון כדי להתחיל לבשל` | `general` |
| `recent_recipes` | `מתכונים אחרונים` | `general` |
| `steps_completed` | `{0}/{1}` | `general` |
| `cook_mode` | `מצב בישול` | `general` |
| `exit_cook_mode` | `יציאה ממצב בישול` | `general` |
| `next_step` | `הצעד הבא` | `general` |
| `previous_step` | `הצעד הקודם` | `general` |
| `start_timer` | `התחל טיימר` | `general` |
| `timer_done` | `הטיימר הסתיים!` | `general` |
| `ingredient_checked` | `סומן` | `general` |

## Atomic Sub-tasks

### Phase 1 — Core UX

- [x] A1: Add multiplier chip row to cook-view template + SCSS (½x, 1x, 2x, 3x, 4x). Wire chip tap to `setQuantity()` with calculated value. Track active chip via computed signal.
- [x] A2: Add ingredient check-off signal (`checkedIngredients_ = signal<Set<number>>(new Set())`). Add tap handler on ingredient row (view mode only). Apply strikethrough + opacity CSS class.
- [x] A3: Extend `FormatQuantityPipe` to support Unicode fraction rendering for ¼, ⅓, ½, ⅔, ¾ values. Add unit tests for fraction edge cases.
- [x] A4: Redesign ingredient row CSS for bolder quantity display — accent color, larger font, improved mobile two-column layout.
- [x] A5: Add step check-off signal (`checkedSteps_ = signal<Set<number>>(new Set())`). Add check circle UI per step row. Show completion counter in section title. Apply muted styling on checked steps.
- [x] A6: Enhance `.step-time` badge: make tappable, show voice timer hint snackbar/tooltip on tap. Add `voice_timer_hint` dictionary key.
- [x] A7: Enhance empty state: add illustration, translated CTA, recent-recipe quick-pick chips. Extend `CookViewStateService` to track last 3 recipe IDs.
- [x] A8: Add all Phase 1 translation keys to `dictionary.json`.
- [x] A9: Read and apply `cssLayer` skill for all new/edited SCSS.
- [x] A10: Verify RTL layout for all Phase 1 additions (logical properties, chip flow direction).

### Phase 2 — Cook Mode

- [ ] A11: Create `CookModeComponent` (standalone, overlay-based). Single-step display with large text. Prev/next navigation buttons.
- [ ] A12: Add swipe gesture navigation (touch events, RTL-aware direction mapping).
- [ ] A13: Add step progress bar (segmented, tappable, shows completion state).
- [ ] A14: Implement active countdown timers per step (signal-based, `setInterval`). Pulse animation + Notification API on completion.
- [ ] A15: Implement `navigator.wakeLock` in Cook Mode (feature-detect, acquire on enter, release on exit/destroy).
- [ ] A16: Ensure all Cook Mode interactive elements meet 48px minimum tap target.
- [ ] A17: Add Phase 2 translation keys to `dictionary.json`.
- [ ] A18: Read and apply `cssLayer` skill for Cook Mode SCSS.

### Phase 3 — Advanced (deferred)

- [ ] A19: AI substitution endpoint integration + popover UI.
- [ ] A20: Ingredient cross-reference parsing pipe/directive for step text.
- [ ] A21: Web Speech API integration for voice navigation.
- [ ] A22: Metric/Imperial unit system toggle.

## Technical Considerations

- **Dependencies (existing services/components affected)**:
  - `CookViewPage` — primary target for Phase 1 changes (template, SCSS, component class).
  - `CookViewStateService` — extend to track recent recipe IDs (currently only tracks `lastRecipeId`).
  - `FormatQuantityPipe` — extend with fraction rendering logic.
  - `ScalingService` / `ScaledIngredientRow` — no changes needed; consumed as-is.
  - `UnitRegistryService` — no changes for Phase 1; Phase 3 unit toggle may need new API.
  - `ExportService` — no changes; export ignores check-off state.
  - `CounterComponent` — no changes; multiplier chips are additive, not a replacement.

- **New files needed**:
  - Phase 1: No new component files. All changes in existing `cook-view.page.*` files + `FormatQuantityPipe`.
  - Phase 2: `src/app/pages/cook-view/components/cook-mode/cook-mode.component.ts|html|scss` (standalone component).

- **Model changes**: None. All new state is session-only signals on the component. `RecipeStep` interface unchanged.

- **Hebrew canonical values**: No new canonical values (units, categories, allergens) introduced. Only new dictionary keys for UI labels (see Translation Keys table above). Sections 7.1–7.2 not triggered.

- **Security surface**: No new routes requiring `authGuard` in Phase 1. Phase 2 Cook Mode is an overlay on the existing protected route — no new auth surface. No `[innerHTML]` usage. No localStorage writes of sensitive data.

## Out of Scope

- **Backend/API changes**: No new endpoints. All state is client-side/session-only.
- **Recipe data model changes**: No new fields on `Recipe`, `RecipeStep`, or ingredient interfaces.
- **Persistent check-off state**: Check-off is session-only; no database persistence.
- **AI/LLM features**: AI substitutions deferred to Phase 3.
- **Voice control (active)**: Only passive hints in Phase 1; active voice control deferred to Phase 3.
- **Metric/Imperial toggle**: Deferred; per-row unit override covers the use case today.
- **Ingredient grouping by category**: Existing data model uses `prep_categories_` for dishes; extending to regular ingredients requires recipe model changes — out of scope.
- **Print-optimized layout**: Existing export/print flow is sufficient.
- **Offline/PWA caching of recipes**: Out of scope for this plan.

## Critical Questions

All scoping decisions were pre-answered by the user. No open questions remain for Phase 1 execution.

Phase 2 open question (to be answered before A11):

Should Cook Mode be implemented as a route (`/cook/:id/mode`) or as a fullscreen overlay component on the existing Cook View page?
a. New child route `/cook/:id/mode` — cleaner URL, supports deep linking, requires route guard setup.
b. Overlay component toggled by a signal on `CookViewPage` — simpler, no new route, but no deep-link support.
c. Dialog/modal using CDK overlay — framework-managed z-index and focus trap, but heavier setup.

Recommendation: b (overlay component). Cook Mode is a transient UI state, not a destination. No deep-linking needed. Simpler implementation, lower risk.

---

## QA Review

**Reviewer**: QA Engineer
**Date**: 2026-03-25
**Scope**: Phase 1 (Core UX) — PRD + HLD
**Overall Verdict**: PASS WITH NOTES

### 3.1 Spec Completeness

- [x] Every Phase 1 functional requirement (FR-1 through FR-7) maps to at least one atomic sub-task (A1–A10) -- PASS
- [x] Every atomic sub-task has a clear acceptance criterion -- PASS
- [x] No requirement is ambiguous enough to cause implementation disagreement -- PASS WITH NOTE

NOTE (A1/FR-1): The `selectMultiplier` method calls `setQuantity()` which clears `activeMultiplier_`, then re-sets it. The HLD documents this race pattern explicitly ("call `setQuantity(...)` then re-set `activeMultiplier_` after"). This is correct but the implementation must follow this exact sequence — document the ordering constraint as a code comment.

### 3.2 Testability

- [x] Each acceptance criterion is observable (visual, behavioral, or state-checkable) -- PASS
- [x] Check-off state behavior is fully specified: session-only, resets on navigation/destroy -- PASS
- [x] Multiplier chip behavior fully specified: chip sets `targetQuantity_`, stepper clears `activeMultiplier_` to `null` -- PASS
- [x] Fraction display tolerance documented: 0.04 tolerance in HLD (AD-3) -- PASS

### 3.3 Edge Cases

- [x] Recipe with 0 ingredients: `scaledIngredients_()` returns `[]`, `@for` renders nothing, check-off signal is an empty Set, no crash -- PASS
- [x] Recipe with 0 steps: `recipe.steps_` empty triggers `@else` branch showing `no_steps_defined` text, progress counter guards on `totalStepCount_() > 0` -- PASS
- [x] Very large ingredient counts (50+): Set operations are O(1), signal creates new Set on each update, no performance concern at reasonable counts -- PASS
- [x] Recipe with `yield_unit_ = 'dish'` and `integerOnly` stepper: multiplier chips calculate `convertedYieldAmount_() * factor` which may produce non-integer values (e.g. 3 * 0.5 = 1.5). The `setQuantity()` method enforces `min = 1` for dish but does NOT enforce integer. This is acceptable since the stepper handles integer stepping separately -- PASS WITH NOTE

NOTE: For `yield_unit_ = 'dish'`, the 0.5x chip produces fractional yield (e.g. 1.5 dishes). The PRD does not specify whether this should be allowed or rounded. Recommendation: document that multiplier chips bypass the `integerOnly` constraint (this is a conscious design choice, not a bug).

- [x] Scale-by-ingredient while a multiplier chip is active: `applyScaleByIngredient` calls through a path that sets `targetQuantity_` and `scaleByIngredientIndex_`, but does NOT clear `activeMultiplier_`. However, chip row is hidden during `isScaledView_()`, so visual conflict is avoided -- PASS WITH NOTE

NOTE: When exiting scaled view via `resetToFullRecipe()`, `activeMultiplier_` is not cleared — the old chip may re-highlight incorrectly. Recommendation: add `this.activeMultiplier_.set(null)` in `resetToFullRecipe()`.

- [x] Fraction display for values > 10 (e.g., 10.5): HLD algorithm separates whole and fractional parts, so "10 1/2" renders as "10 ½" -- PASS
- [x] Empty recipe name (`name_hebrew` empty string): header renders `<h1>` with empty content; no crash, just empty heading. Not a new issue; pre-existing behavior -- PASS
- [x] Timer hint for step with `labor_time_minutes_ = 0`: template guard `@if (step.labor_time_minutes_ > 0)` prevents rendering. Confirmed in existing template line 264 -- PASS

### 3.4 RTL / i18n

- [x] All new UI text uses `translatePipe` with `dictionary.json` keys -- PASS (HLD specifies all user-facing strings use translation keys)
- [x] New keys listed in PRD/HLD — confirmed all are new; none exist in current `dictionary.json` -- PASS
- [x] RTL layout: multiplier chips use `.c-chip` engine which is `display: inline-flex`; in an RTL container chips will flow right-to-left naturally -- PASS
- [x] Check-off strikethrough renders correctly in RTL text: `text-decoration: line-through` is direction-independent -- PASS

NOTE: Two Phase 1 keys from PRD are NOT in the HLD File Change Map's dictionary.json additions: `recent_recipes` and `cook_mode`. Since HLD defers multi-recipe history to Phase 2 and Cook Mode is Phase 2, these keys are correctly excluded from Phase 1 HLD scope. However, `ingredient_checked` is listed in HLD but has no usage specified in Phase 1 template — verify if it's needed (aria-label for checked state?).

### 3.5 Accessibility

- [x] Minimum 48px touch targets: HLD specifies "minimum row height 48px" for ingredient rows (AD-2). Step check-off uses the full row or icon area -- PASS WITH NOTE

NOTE: The step check-off icon (circle/circle-check) has no explicit minimum size documented. The `<lucide-icon>` default size varies. Recommendation: specify `[size]="20"` minimum for step check icons, and ensure the tappable area (button or clickable container) is >= 48px.

- [x] Checked ingredient rows: no `aria-checked` or `aria-label` specified in HLD -- FAIL

FAIL: Checked ingredient rows need accessibility state communication. Recommendation: add `[attr.aria-label]="'ingredient_checked' | translatePipe"` or `role="checkbox" [attr.aria-checked]="checkedIngredients_().has(i)"` on the ingredient row when in check-off mode. This is where the `ingredient_checked` dictionary key becomes useful.

- [x] Timer hint tap: HLD uses `UserMsgService.onSetInfoMsg()` which triggers a snackbar. Snackbars typically use `role="status"` or `aria-live="polite"` — confirm `UserMsgService` snackbar is accessible -- PASS (framework-level concern, not Phase 1 specific)
- [x] Multiplier chips: no `aria-pressed` specified for active chip state -- FAIL

FAIL: Active multiplier chip must communicate selected state to screen readers. Recommendation: add `[attr.aria-pressed]="activeMultiplier_() === factor"` on each chip button.

### 3.6 Signal Reactivity / Angular Standards

- [x] No BehaviorSubject used — all new state is Signals -- PASS
- [x] `checkedIngredients_` uses `Set` inside a Signal: HLD specifies immutable update pattern `update(s => { const n = new Set(s); n.add(i); return n; })` — this correctly triggers change detection by creating a new Set reference -- PASS
- [x] The Set mutation pattern is documented in HLD (AD-2, AD-4) -- PASS
- [x] Computed signals (`completedStepCount_`, `totalStepCount_`, `scaleFactor_`) do not close over mutable refs — they read from other signals only -- PASS
- [x] `activeMultiplier_` typed as `WritableSignal<number | null>` — initial value `signal(1)` correctly selects 1x chip on load -- PASS

### 3.7 Security Surface

- [x] Phase 1 touches NO auth, routes, localStorage, or sessionStorage -- PASS
- [x] No new HTTP calls, no new data persistence, no new routes -- PASS
- [x] Timer hint opens no external URLs (just a snackbar via `UserMsgService`) -- PASS

**Security Officer review NOT required for Phase 1.**

### 3.8 CSS Architecture

- [x] New classes use `cv-` prefix: `cv-chip--active`, `cv-ingredient-row--checked`, `cv-step-item--checked`, `cv-timer-hint`, `cv-reset-btn` -- PASS
- [x] `.c-chip` reuse: confirmed `.c-chip` engine exists in `src/styles.scss` (line 649) with `inline-flex`, padding, border-radius, and font styling. HLD correctly reuses it with only a local `cv-chip--active` modifier -- PASS
- [x] No inline styles -- PASS
- [x] cssLayer compliance: all new SCSS goes in `cook-view.page.scss`, not `styles.scss`. Sub-task A9 explicitly requires cssLayer skill read -- PASS

### Summary of Issues

| # | Severity | Item | Recommendation |
|---|----------|------|----------------|
| 1 | NOTE | 0.5x chip on `yield_unit_='dish'` produces fractional yield | Document as intentional; add code comment |
| 2 | NOTE | `resetToFullRecipe()` does not clear `activeMultiplier_` | Add `this.activeMultiplier_.set(null)` in `resetToFullRecipe()` |
| 3 | NOTE | `ingredient_checked` key listed but no usage specified | Assign to `aria-label` on checked rows (ties into item #4) |
| 4 | FAIL | No `aria-checked` or `role="checkbox"` on ingredient rows | Add `role="checkbox"` + `[attr.aria-checked]` for screen reader state |
| 5 | FAIL | No `aria-pressed` on active multiplier chip | Add `[attr.aria-pressed]="activeMultiplier_() === factor"` |
| 6 | NOTE | Step check icon minimum tap target not specified | Specify `[size]="20"` minimum + 48px tappable container |

**Blocking issues**: None. Items #4 and #5 are accessibility gaps but are non-blocking for Phase 1 implementation — they can be addressed during implementation as part of the template work (A1 and A2). They are documented here so implementers include them.

**Phase 1 plan is ready for user review and implementation.**
