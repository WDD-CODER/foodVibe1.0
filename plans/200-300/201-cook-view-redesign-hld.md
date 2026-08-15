# HLD: Cook View Redesign — Plan 201

## Overview
- **Related Plan**: plans/201-cook-view-redesign.plan.md
- **Status**: Draft
- **Scope**: Phase 1 only (Core UX). Phase 2 (Cook Mode) is deferred.
- **Components affected**: `CookViewPage`, `FormatQuantityPipe`, `CookViewStateService`, `app.config.ts`, `dictionary.json`

Phase 1 transforms the Cook View from a read-only recipe display into an interactive cooking companion: preset multiplier chips for quick scaling, ingredient and step check-off, smart fraction display, enhanced quantity styling, tappable timer hints, and an improved empty state.

All new state is session-only (component-level signals). No model changes, no new routes, no new services, no new sub-components.

---

## Architecture Decisions

### AD-1: Multiplier Chips (FR-1)

**Decision**: Add a horizontal chip row below the quantity-control-wrap, using the global `.c-chip` engine class from `styles.scss` for base styling, with a local `.cv-chip--active` modifier for the selected state.

**Signal design**:
```
activeMultiplier_: WritableSignal<number | null> = signal(1)
```
- Chip options: `[0.5, 1, 2, 3, 4]` (constants array on the component).
- Tapping a chip calls `selectMultiplier(factor)`, which sets `targetQuantity_` to `convertedYieldAmount_() * factor` and sets `activeMultiplier_` to that factor.
- Manual stepper changes (via `setQuantity`, `incrementQuantity`, `decrementQuantity`) set `activeMultiplier_` to `null`, deselecting all chips.
- The chip row is hidden when `isScaledView_()` (scale-by-ingredient mode) or `editMode_()`.

**Sync with existing stepper**: The existing `setQuantity()` method already clears scale-by-ingredient state. We add `this.activeMultiplier_.set(null)` to `setQuantity`, `incrementQuantity`, `decrementQuantity`, and `onYieldUnitChange`. In `selectMultiplier`, we call `setQuantity(convertedYieldAmount_() * factor)` then re-set `activeMultiplier_` after (since `setQuantity` clears it).

**Why `.c-chip` engine and not a new class**: The global `.c-chip` already provides the correct padding, border-radius, font-size, and gap. We only need a local active-state variant. This follows copilot-instructions Section 4 (prefer shared structures).

**Alternatives considered**:

| Approach | Pros | Cons |
|----------|------|------|
| A. Use `.c-chip` engine + local modifier | Consistent with app design system; minimal CSS | Need to ensure active variant styling |
| B. Fully local `.cv-chip` class | Total control | Duplicates engine; violates Section 4 |

**Chosen**: A.

---

### AD-2: Ingredient Check-Off (FR-2, FR-4)

**Decision**: Add a session-only signal on the component for tracking checked ingredient indices.

**Signal design**:
```
checkedIngredients_: WritableSignal<Set<number>> = signal(new Set())
```

**Interaction**:
- In view mode (not `editMode_()` and not `settingByIngredientIndex_() === i`): the entire ingredient row is clickable via `(click)="toggleIngredientCheck(i)"`.
- Checked rows get CSS class `cv-ingredient-row--checked` which applies `opacity: 0.5` and `text-decoration: line-through` on name and amount text.
- A "Reset" button appears in the ingredients section title (inline, end-aligned) when any ingredient is checked. Calls `resetIngredientChecks()` which replaces the set with `new Set()`.
- Check state resets automatically when `recipe_()` changes (the signal is on the component, not persistent).

**Tap target**: Full row click in view mode, minimum row height 48px for WCAG touch target compliance.

**Redesigned quantity display (FR-4)**: The existing `.col-amount` in view mode already has `font-weight: 600; color: var(--cv-accent)`. We enhance: bump to `font-weight: 700`, set `font-size: 1.1rem` minimum. No structural layout change needed since the existing grid already separates name/amount/unit columns. The mobile two-column layout described in the PRD maps naturally to the existing grid.

---

### AD-3: Smart Fraction Display (FR-3)

**Decision**: Extend the existing `FormatQuantityPipe` with an optional `fractions` parameter (boolean, default `false`). When `true`, the pipe renders common fractions as Unicode vulgar fraction characters.

**Fraction map**:
```typescript
private static readonly FRACTION_MAP: [number, string][] = [
  [0.125, '⅛'],
  [0.25,  '¼'],
  [0.333, '⅓'],
  [0.5,   '½'],
  [0.667, '⅔'],
  [0.75,  '¾'],
]
```

**Algorithm**:
1. Separate value into whole part and fractional part.
2. For the fractional part, find the closest match in `FRACTION_MAP` within tolerance `0.04`.
3. If match found: return `whole > 0 ? `${whole} ${fraction}` : fraction`.
4. If no match: fall back to current `Intl.NumberFormat` behavior.
5. Special case: if value is 0, return empty string (current behavior).

**Why extend vs. new pipe**: The pipe is already imported in `CookViewPage`. Adding a parameter keeps a single pipe and avoids import churn. Existing usages pass no argument, so `fractions` defaults to `false` — zero breaking changes.

**Usage in template**: `{{ getDisplayAmount(i, row) | formatQuantity:true }}` in the cook-view ingredient rows (view mode only). Prep amounts also use `:true`.

**Alternatives considered**:

| Approach | Pros | Cons |
|----------|------|------|
| A. Extend `FormatQuantityPipe` with param | Single pipe; no import changes | Pipe grows slightly |
| B. New `FractionQuantityPipe` | Clean separation | Two pipes to maintain; extra import |

**Chosen**: A.

---

### AD-4: Step Check-Off & Progress (FR-5)

**Decision**: Add a session-only signal for tracking completed step orders, plus computed signals for progress.

**Signal design**:
```
checkedSteps_: WritableSignal<Set<number>> = signal(new Set())
completedStepCount_: Signal<number> = computed(() => this.checkedSteps_().size)
totalStepCount_: Signal<number> = computed(() => this.recipe_()?.steps_?.length ?? 0)
```

**Interaction**:
- Each step row gets a tappable circle/check icon at inline-start, before the step order number.
- Unchecked: `<lucide-icon name="circle">` (already registered).
- Checked: `<lucide-icon name="circle-check">` in accent color (already registered).
- Tapping the icon or the step row calls `toggleStepCheck(step.order_)`.
- Checked steps get `.cv-step-item--checked` modifier: muted text color, reduced opacity.
- The next unchecked step gets no special emphasis in Phase 1 (deferred to Phase 2 Cook Mode).

**Progress counter**: Rendered inline in the steps section title: `{{ completedStepCount_() }}/{{ totalStepCount_() }}` — only shown when `totalStepCount_() > 0`. Uses translation key `steps_completed` with interpolation.

---

### AD-5: Inline Timer Hints (FR-6)

**Decision**: Enhance the existing `.step-time` badge. Make it tappable. On tap, show a snackbar via `UserMsgService` with the voice timer hint.

**Implementation**:
- Wrap the existing `<span class="step-time">` content in a `<button>` (for accessibility) with class `cv-timer-hint`.
- Add `<lucide-icon name="timer">` (already registered) before the duration text.
- On click: `onTimerHintTap(step.labor_time_minutes_)` which calls `this.userMsg.onSetInfoMsg(this.translation.translate('voice_timer_hint', [minutes]))`.
- The `voice_timer_hint` dictionary key uses `{0}` placeholder for minutes.
- Styling: `cursor: pointer` on the badge, subtle hover effect.

**No real timer logic**. No clipboard. No deep links. Just a helpful snackbar message.

---

### AD-6: Enhanced Empty State (FR-7)

**Decision**: Replace the existing minimal empty state block with a richer panel.

**Current empty state** (template lines 282-287): Shows a utensils icon, "no recipe selected" text, and a link to recipe-book. This is the `@else` branch of `@if (recipe_(); as recipe)`.

**Enhanced design**:
1. Icon: `<lucide-icon name="chef-hat">` — needs registration (not yet in `app.config.ts`).
2. Headline: `{{ 'pick_recipe_to_cook' | translatePipe }}`.
3. CTA button: styled link to `/recipe-book` using `.c-btn-primary` engine class.
4. Recent recipes section: If `cookViewState.lastRecipeId()` exists, show a "Continue cooking" quick-link chip to `/cook/<lastId>`.

**CookViewStateService extension for recent recipes**: The PRD mentions tracking up to 3 recent recipe IDs. However, the current service only stores `lastRecipeId` in sessionStorage. For Phase 1, we keep it simple: show only the single `lastRecipeId` as a "Continue cooking" link. Expanding to 3 IDs requires storing an array in sessionStorage — deferred to Phase 2 to keep Phase 1 scope tight.

**Rationale for deferring multi-recipe history**: The single `lastRecipeId` already provides the most useful empty state improvement (quick resume). Storing and managing a recent-3 list adds sessionStorage serialization, deduplication, and ordering logic with marginal UX gain for Phase 1.

---

## Signal Flow Diagram

```
User Actions                  Writable Signals                    Computed Signals              Template Bindings
─────────────                 ────────────────                    ────────────────              ─────────────────
Tap multiplier chip ──────►  activeMultiplier_(number|null)
                     ├──────► targetQuantity_(number) ──────────► scaleFactor_() ──────────►  scaledIngredients_()
                     │                                                                         scaledPrep_()
Stepper +/- ─────────┘                                                                        scaledCost_()
                                                                                               convertedYieldAmount_()

Tap ingredient row ──────►   checkedIngredients_(Set<number>) ──────────────────────────────►  [class.cv-ingredient-row--checked]

Tap step row ────────────►   checkedSteps_(Set<number>) ────────► completedStepCount_() ───►  "X/Y" progress badge
                                                                  totalStepCount_()

Tap timer hint ──────────►   (side effect: UserMsgService snackbar)

                              recipe_(Recipe|null) ──────────────► isDish_() ──────────────►  section visibility
                                                                   yieldUnitOptions_()
                                                                   isScaledView_()
```

**Key invariants**:
- `activeMultiplier_` is set to `null` whenever the stepper changes quantity directly. It is only non-null when a chip is actively selected.
- `checkedIngredients_` and `checkedSteps_` are component-scoped, non-persistent. They reset on navigation/destroy.
- All new signals are independent of each other — no circular dependencies.

---

## Component Structure

### Phase 1: No new components

All changes stay within `CookViewPage`. The page is already ~800 lines but remains cohesive around a single recipe view concern. Extracting sub-components would add complexity without benefit at this scale.

**Phase 2 extraction plan**: When Cook Mode is added, it will be extracted as `CookModePanelComponent` under `src/app/pages/cook-view/components/cook-mode/`.

### Service changes

**`CookViewStateService`**: No changes for Phase 1. The existing `lastRecipeId()` computed signal is sufficient for the enhanced empty state.

**`FormatQuantityPipe`**: Extended with `fractions` parameter. Stays in `src/app/core/pipes/format-quantity.pipe.ts`.

---

## File Change Map

| File | Action | Changes | Est. Lines |
|------|--------|---------|------------|
| `src/app/pages/cook-view/cook-view.page.ts` | Modify | Add 3 writable signals (`activeMultiplier_`, `checkedIngredients_`, `checkedSteps_`), 2 computed signals (`completedStepCount_`, `totalStepCount_`), 5 methods (`selectMultiplier`, `toggleIngredientCheck`, `resetIngredientChecks`, `toggleStepCheck`, `onTimerHintTap`), multiplier options constant, `ChefHat` icon import. Modify `setQuantity`/`incrementQuantity`/`decrementQuantity`/`onYieldUnitChange` to clear `activeMultiplier_`. | +60 |
| `src/app/pages/cook-view/cook-view.page.html` | Modify | Add multiplier chip row after quantity-control-wrap. Add `(click)` handler and checked class on ingredient rows. Add reset button in ingredients section title. Add check icon + click handler on step rows. Add progress counter in steps section title. Wrap `.step-time` in tappable button with timer icon. Replace empty state block with enhanced version. Apply `formatQuantity:true` on ingredient/prep amounts. | +55 |
| `src/app/pages/cook-view/cook-view.page.scss` | Modify | Add `.cv-multiplier-chips` row layout, `.cv-chip--active` modifier, `.cv-ingredient-row--checked` modifier, `.cv-step-item--checked` modifier, `.cv-timer-hint` button style, enhanced empty state styles, `.cv-reset-btn` style. Enhance `.col-amount` for bolder quantity display (1.1rem, weight 700). | +65 |
| `src/app/core/pipes/format-quantity.pipe.ts` | Modify | Add `fractions` parameter to `transform()`. Add static `FRACTION_MAP`. Add fraction-matching algorithm. | +30 |
| `src/app/app.config.ts` | Modify | Import and register `ChefHat` from `lucide-angular`. | +2 |
| `public/assets/data/dictionary.json` | Modify | Add Phase 1 translation keys: `multiplier_half`, `multiplier_1x` - `multiplier_4x`, `voice_timer_hint`, `pick_recipe_to_cook`, `steps_completed`, `ingredient_checked`. | +10 |

**Total estimated additions**: ~222 lines across 6 files.

---

## New Lucide Icons Checklist

| Icon | PascalCase Import | Template `name` | Status |
|------|------------------|-----------------|--------|
| `ChefHat` | `ChefHat` | `chef-hat` | **NEEDS REGISTRATION** |
| `Circle` | `Circle` | `circle` | Already registered |
| `CircleCheck` | `CircleCheck` | `circle-check` | Already registered |
| `Timer` | `Timer` | `timer` | Already registered |

Only **`ChefHat`** requires a new import + registration in `app.config.ts`.

---

## CSS Layer Compliance Notes

Per `copilot-instructions.md` Section 4 and the cssLayer skill:

1. **No new `.c-*` engine classes** defined in `cook-view.page.scss`. All new classes use the `cv-` local prefix.
2. **Global `.c-chip`** engine is reused for multiplier chips in the template (no redefinition).
3. **Global `.c-btn-primary`** engine is reused for the empty state CTA button.
4. **Logical properties**: All new spacing/border rules use `margin-inline-start`, `padding-inline-end`, etc. No physical `left`/`right` properties (RTL compliance).
5. **CSS custom properties**: All colors reference `--cv-*` local tokens or global `--color-*`/`--bg-*` tokens. No hardcoded hex values.
6. **Property order**: Layout > Dimensions > Content > Structure > Effects (per Section 4).
7. **New local tokens added to `:host`**: None needed. Existing `--cv-accent`, `--cv-accent-soft`, etc. cover all new use cases.

---

## Phase 2 Deferral Notes

The following are explicitly deferred to Phase 2 (Cook Mode) and not part of Phase 1 implementation:

| Feature | Reason for Deferral |
|---------|-------------------|
| **Cook Mode overlay** (FR-8) | Requires new component, gesture handling, complex state. Separate HLD needed. |
| **Step progress bar** (FR-9) | Cook Mode specific. |
| **Active countdown timers** (FR-10) | Requires timer service, `setInterval`, Notification API. |
| **Screen wake lock** (FR-11) | Cook Mode lifecycle only. |
| **Swipe navigation** (FR-12) | Cook Mode only. |
| **Recent recipes list (3 items)** | `CookViewStateService` change deferred; single `lastRecipeId` sufficient for Phase 1 empty state. |
| **"Next unchecked step" emphasis** | Nice-to-have UX; Cook Mode navigation covers this better. |

**Phase 2 open question** (from PRD): Cook Mode implementation approach. Recommendation: overlay component toggled by signal on `CookViewPage` (option b).

---

## Risks & Open Questions

### Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Full-row click for ingredient check-off conflicts with scale-by-ingredient button** | Medium | Check-off click handler must guard: ignore click if `settingByIngredientIndex_() === i` or if click target is the "Set by" button. Use `$event.target` check or place check-off on a dedicated area (left side tap zone). |
| **Multiplier chip 0.5x may produce very small quantities** | Low | Existing min guard in `setQuantity` (`min = 0.01`) prevents zero/negative. No additional guard needed. |
| **Fraction display tolerance edge cases** | Low | Tolerance of 0.04 covers common kitchen fractions. Values like 0.1666 (1/6) will not match and fall back to decimal — acceptable since 1/6 is not a common kitchen fraction. |
| **Performance of `Set<number>` signal updates** | Low | Max ingredient count ~30; Set operations are O(1). Signal update creates new Set (immutable pattern) which is negligible. |

### Open Questions

1. **Ingredient check-off tap zone**: Should the entire row be clickable for check-off, or only a dedicated checkbox area at the row start? Full-row is more touch-friendly but may conflict with the scale-by-ingredient hover button.
   - **Recommendation**: Full row tap, but exclude the `.col-scale-action` zone and the `.set-by-ingredient-btn` from triggering check-off. Implement via `(click)` on the row with `$event.target` closest-ancestor check.

2. **Reset button position**: Should the ingredient check-off reset button appear in the section title or at the bottom of the ingredient list?
   - **Recommendation**: Inline in the section title, end-aligned. This is visible without scrolling.

3. **Fraction display in export**: Should exported recipes also use fraction characters?
   - **Recommendation**: No. Export uses `FormatQuantityPipe` without the `fractions` flag. Fraction characters may not render well in all share targets (WhatsApp, email). Keep decimal for exports.
