# Hold-based tiered quantity step logic (Plan 176)

## Core rule

- **User has released the button** (even briefly): every + or − click changes the value by **1** only (fine control: 1, 2, 3, 123).
- **User is holding the button** (continuous press): use **tiered** steps (up: 0→9 then 10→100 then 100→1000; down: step 1 to next "round" then step 10/100).

Step size depends on whether the action is a single click or part of a hold. Counter supports hold-to-repeat and passes `continuousPress: true` when firing from repeat.

## Single-click mode

Increment: value + 1. Decrement: value − 1. No tiered jumps.

## Hold mode: increment

- 0–9: step 1 → 10
- 10–90: step 10 → 100
- 100–900: step 100 → 1000
- 1000+: step 1000

## Hold mode: decrement

- Step 1 until value is a multiple of 10 (e.g. 99→90, 1099→1090); then step 10 or 100 by range (90→80→…→10; 1090→…→1000; 1000→900→…→100; 10→9→…→1).

## Implementation

1. **quantity-step.util.ts**: Add `continuousPress?: boolean` to QuantityStepOptions. When not true, whole-number step = 1. When true, use tiered increment/decrement (hold rules).
2. **counter.component.ts**: Hold-to-repeat (mousedown timeout+interval, mouseup/mouseleave clear); single click calls with no continuousPress; repeat calls with `continuousPress: true`.
3. **counter.component.html**: mousedown, mouseup, mouseleave on both buttons.
4. **quantity-step.util.spec.ts**: Tests for single-click (step 1) and hold (tiered); keep integerOnly, decimal, explicitStep.
