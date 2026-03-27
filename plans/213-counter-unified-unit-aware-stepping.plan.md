---
name: Counter Unified Unit-Aware Stepping
overview: Replace Plan 210 bucket logic with a single unit-aware decimal step path wired into quantityIncrement/quantityDecrement; propagate unit to scaling-chip, cook-view, and recipe-ingredients-table.
todos: []
isProject: false
---

# Counter Unified Unit-Aware Stepping

## Goal
When a mass/volume unit is set (kg, g, L, ml, gram, liter, etc.), all units use the same tick-based decimal step logic: single-click 0.01, hold ticks 1–10 = 0.01, ticks 11–20 = 0.1, ticks 21+ = 1.0.

## Atomic Sub-tasks

- [ ] `quantity-step.util.ts`: widen unit to string; remove Plan 210 bucket block; add UNIT_AWARE_SET / isUnitAware / getUnitAwareStep; wire unit-aware branch into quantityIncrement + quantityDecrement; update getQuantityStep
- [ ] `counter.component.ts`: remove unitAwareIncrement/unitAwareDecrement imports; simplify increment/decrement/onKeydown to always call quantityIncrement/quantityDecrement
- [ ] `counter.component.html`: update [step] binding to use 0.01 for unit-aware
- [ ] `scaling-chip.component.ts`: import QuantityStepOptions; add stepOptions input
- [ ] `scaling-chip.component.html`: add [stepOptions]="stepOptions()" to app-counter
- [ ] `cook-view.page.ts`: add cookViewStepOpts_ computed; update incrementQuantity/decrementQuantity; update onEditAmountKeydown + getEditAmountStep with rowUnit param
- [ ] `cook-view.page.html`: bind cookViewStepOpts_(); update onEditAmountKeydown + getEditAmountStep calls; fix ingredient [step]
- [ ] `recipe-ingredients-table.component.ts`: add unit to stepOpts in incrementAmount/decrementAmount/onQuantityKeydown
- [ ] `recipe-header.component.html`: add [stepOptions] to primary and secondary scaling-chips
- [ ] `quantity-step.util.spec.ts`: add describe('unit-aware stepping') block with 10 test cases

## Rules / Constraints
- explicitStep > integerOnly > unit-aware > default priority order
- Round unit-aware results to 2dp (not 3dp DECIMAL_PRECISION)
- Floor: value never below min (or 0)
- All existing tests must pass unchanged
- Single quotes in TS, double quotes in HTML

## Done When
- Single click + on a kg counter at 1 → 1.01; - → 0.99
- Hold: ticks 1–10 → 0.01 steps; 11–20 → 0.1; 21+ → 1.0
- Release and re-click: ticks reset, starts at 0.01 again
- Arrow keys use unit-aware (ticks=1 → 0.01)
- Cook-view counter respects selected unit; dish → integer
- Recipe-ingredients-table +/− uses row unit
- Scaling-chip in recipe-header passes unit to counter
- unit: 'unit' or unknown → fall through to existing behavior
- All existing tests pass; ng build passes
