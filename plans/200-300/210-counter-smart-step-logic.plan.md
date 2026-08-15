---
name: Counter Smart Step Logic
overview: Add unit-aware tick-based (kg/L) and range-based (g/ml) step logic to the counter component.
todos: []
isProject: false
---

# Counter Smart Step Logic

## Goal
Replace the generic step logic in `app-counter` with intelligent stepping that adapts to unit type and hold duration.

## Atomic Sub-tasks

- [ ] Extend `QuantityStepOptions` with `unit?: 'kg' | 'L' | 'g' | 'ml'` and `ticks?: number` in `quantity-step.util.ts`
- [ ] Add `unitAwareIncrement(value, min, opts)` to `quantity-step.util.ts` — bucket A tick-based, bucket B range-based UP, 2dp rounding, floor 0
- [ ] Add `unitAwareDecrement(value, min, opts)` to `quantity-step.util.ts` — bucket A tick-based, bucket B range-based DOWN (jump-to-0 at ≤0.25 confirmed), 2dp rounding, floor 0
- [ ] Add `private ticks_ = signal(0)` to `CounterComponent`; update `increment()` / `decrement()` to track ticks and pass them in merged options
- [ ] Update `stopRepeat()` in `CounterComponent` to reset `ticks_.set(0)` — neighborhood blocker
- [ ] Route `increment()` / `decrement()` through `unitAwareIncrement` / `unitAwareDecrement` when `stepOptions().unit` is set
- [ ] Update `onKeydown` arrow-key handler to use unit-aware functions when unit is set — should-fix

## Rules / Constraints
- Round all unit-aware results to 2dp (not the existing 3dp `DECIMAL_PRECISION`)
- Floor: value never below 0
- Single click = ticks=1 (always smallest step)
- Existing `quantityIncrement` / `quantityDecrement` untouched — new functions are additive
- No HTML changes required

## Done When
- `+` single-click on a kg/L counter steps by 0.1
- Hold on kg/L: steps 1–5 = 0.1 each; step 6+ = 1.0 each
- Release and re-click kg/L: ticks reset, starts at 0.1 again
- g/ml UP range table works: 0→1.15 (+0.05), 1.15→1.25 (jump), 1.25→2.0 (+0.25), 2–10 (+1), 10+ (+10)
- g/ml DOWN range table works: >0.8 (-0.05), 0.5–0.8 (jump 0.5), 0.25–0.5 (jump 0.25), ≤0.25 (jump 0)
- Arrow keys also use unit-aware logic when `unit` is set
- `ng build` passes with no errors
