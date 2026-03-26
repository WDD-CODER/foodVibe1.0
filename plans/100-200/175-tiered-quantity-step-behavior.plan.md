# Tiered quantity step behavior (increment / decrement)

## Goal

Make +/- counter steps **value-based and symmetric**: small steps when near the current "tier", bigger steps when in the middle of a range, so the user can move quickly with a consistent, predictable logic. No hold-time or click-count detection — only the current value decides the step.

## Scope

- **In scope**: `src/app/core/utils/quantity-step.util.ts` — step logic for whole numbers when **not** `integerOnly` and no `explicitStep`.
- **Unchanged**: `integerOnly: true` (guest count, labor minutes, dish yield, purchase units) → always step 1. Decimals → existing precision steps. `explicitStep` → override as now. No UI or component API changes.

## Tier rules (whole numbers only)

### Increment (plus)

| Value range   | Step | Sequence (repeated clicks) |
|---------------|------|----------------------------|
| 0–4           | +1   | 0→1→2→3→4→5                |
| 5–9           | +5   | 5→10 (bridge)              |
| 10–45         | +10  | 10→20→30→40→50             |
| 50–95         | +50  | 50→100 (bridge)             |
| 100–450       | +100 | 100→200→300→400→500        |
| 500–950       | +500 | 500→1000 (bridge)           |
| 1000+         | +1000| 1000→2000→3000→…           |

### Decrement (minus)

| Value range   | Step | Sequence (repeated clicks) |
|---------------|------|----------------------------|
| 996–1000      | −1   | 1000→999→998→997→996→995   |
| 991–995       | −5   | 995→990 (bridge)            |
| 100–990       | −10  | 990→980→…→100, then 100→90→…→10 |
| 100–900       | −100 | 900→800→700→…→100          |
| 10–99         | −10  | (90→80→…→10)               |
| 1–10          | −1   | 10→9→8→…→1                  |

Decrement in one rule set:

- **v in (995, 1000]** → step 1
- **v in (990, 995]** → step 5 (995→990)
- **v in (900, 990]** → step 10
- **v in (100, 900]** → step 100
- **v in (10, 100]** → step 10
- **v in [1, 10]** → step 1

## Implementation

1. **quantity-step.util.ts**: Add internal `getQuantityStepIncrement` and `getQuantityStepDecrement`; use them in `quantityIncrement` / `quantityDecrement` for whole-number path (when no explicitStep, no integerOnly). Keep decimals and options unchanged.
2. **quantity-step.util.spec.ts**: Update/add tests for tiered increment and decrement; keep integerOnly, decimal, explicitStep, min, non-finite tests.

## Summary

- Single file to change: **quantity-step.util.ts**
- Spec file: **quantity-step.util.spec.ts**
- Result: consistent "fast but logical" movement when holding plus or minus; integerOnly and decimal behavior unchanged.
