---
name: Precision-based counter step
overview: "Implement precision- and magnitude-based step for all custom counters: for whole numbers step scales upward by order of magnitude (1–9 → 1, 10–99 → 10, 100–999 → 100); for decimals step follows precision (1.2 → 0.1, 1.15 → 0.01). Arrow Up/Down and +/- use the shared quantity-step util. Centralize in the util and wire keydown everywhere."
todos: []
isProject: false
---

# Precision-based step for custom counters

## Problem

- **Current behavior**: Many counters use a fixed step (e.g. `step="0.001"` on inputs) or the util's rule "value ≥ 1 → step 1, value < 1 → step 0.001". When the user focuses the **input** and presses Arrow Up/Down, the **browser** applies the input's `step`, so e.g. value 1 with `step="0.001"` becomes 1.001 instead of 2.
- **Expected behavior**:
  - **Decimals**: Value **1.15** → Arrow Up → **1.16** (step 0.01). Value **1.2** → **1.3** (step 0.1). So step follows decimal precision (one decimal → 0.1, two → 0.01, three → 0.001).
  - **Whole numbers (magnitude)**: Step scales **upward** by order of magnitude: **1–9** → step **1** (e.g. 2 → 3); **10–99** → step **10** (e.g. 10 → 20, 20 → 30); **100–999** → step **100** (e.g. 100 → 200, 500 → 600); **1000+** → step **1000**; and so on.

So **step = magnitude for integers** (10^floor(log10(max(1, |value|)))), **step = precision for decimals** (10^(-decimalPlaces)), and **Arrow Up/Down must be handled in code** (prevent default and use the shared util) so keyboard and +/- stay in sync.

---

## 1. Change step logic in quantity-step.util

**File:** [src/app/core/utils/quantity-step.util.ts](src/app/core/utils/quantity-step.util.ts)

- **Keep** `explicitStep` and `integerOnly`; when set, behavior unchanged.
- **Replace** the default rule with **two cases**:
  - **Value is a whole number** (no meaningful fractional part after rounding): step = **magnitude** = `10^floor(log10(max(1, abs(value))))`:
    - 1–9 → step **1** (2 → 3, 9 → 10)
    - 10–99 → step **10** (10 → 20, 50 → 60)
    - 100–999 → step **100** (100 → 200, 500 → 600)
    - 1000–9999 → step **1000**, etc.
  - **Value has decimals**: step = **precision** = `10^(-decimalPlaces)` (cap decimal places at 3):
    - 1 decimal (1.2, 0.5) → step **0.1**
    - 2 decimals (1.15, 2.34) → step **0.01**
    - 3 decimals (1.001, 0.123) → step **0.001**
- **Implementation**: Normalize value (e.g. round to 6 decimals). If rounded === floor(rounded), treat as integer and use magnitude step; else count fractional digits and use precision step. Value 0 or non-finite → step 1. Min clamping and rounding in increment/decrement unchanged.

**File:** [src/app/core/utils/quantity-step.util.spec.ts](src/app/core/utils/quantity-step.util.spec.ts)

- Add tests for **magnitude** (integers): 1 → step 1, 9 → 1, 10 → 10, 99 → 10, 100 → 100, 500 → 100; increment 10 → 20, 100 → 200.
- Add tests for **precision** (decimals): 1.2 → step 0.1, 1.15 → 0.01, 0.5 → 0.1; increment 1.2 → 1.3, 1.15 → 1.16.
- Keep integerOnly / explicitStep behavior. Adjust tests that assumed old "value < 1 → 0.001".

---

## 2. Wire Arrow Up/Down on counter inputs (single source of truth)

For every **custom counter** that has a number input and +/- buttons, add or extend **keydown** so Arrow Up/Down call the same `quantityIncrement` / `quantityDecrement` (with the same options as the +/- handlers), then **preventDefault()** so the browser does not apply the native step. Optionally set `[step]` from `getQuantityStep(currentValue, options)` for consistency and a11y; the authoritative behavior stays in TS.

| Location | Current | Change |
|----------|--------|--------|
| **Cook-view** — main quantity | `[step]="isDish_() ? 1 : 0.1"`, no keydown | Add `(keydown)="onQuantityKeydown($event)"`. In handler: if ArrowUp/ArrowDown, preventDefault, call existing `incrementQuantity()` / `decrementQuantity()` (they already use util with optional integerOnly for dish). Optionally bind `[step]="getQuantityStep(targetQuantity_(), options)"`. |
| **Cook-view** — ingredient amount / "setting by ingredient" inputs | type="number", no keydown | Add keydown on those inputs that call the same step logic (cook-view already has `getEditAmountStep` using the util); preventDefault and apply increment/decrement to the bound amount. |
| **Recipe-ingredients-table** — amount_net | `step="0.001"`, `onQuantityKeydown` only handles Enter | In recipe-ingredients-table.component.ts: in `onQuantityKeydown`, add ArrowUp/ArrowDown: preventDefault, read current from `group.get('amount_net')`, call `quantityIncrement`/`quantityDecrement` with same `stepOpts` as `incrementAmount`/`decrementAmount` (purchase unit → integerOnly, else default precision), setValue and `updateLineCalculations`. Remove fixed `step="0.001"` or set `[step]="getQuantityStep(current, stepOpts)"` for consistency. |
| **Recipe-builder** — logistics qty | No step, no keydown | Add keydown on recipe-builder.page.html input: ArrowUp/ArrowDown preventDefault, update `logisticsToolQuantity_` via `quantityIncrement`/`quantityDecrement` with `{ integerOnly: true }`, min 1. Set `step="1"` on the input. |
| **Recipe-header** — primary & secondary amount | `step="0.001"`, +/- use `current + delta` (fixed ±1) | In recipe-header.component.ts: (1) Change `updatePrimaryAmount(delta)` to use `quantityIncrement`/`quantityDecrement(primaryAmount_(), 0)` when delta is ±1 (or always use util with delta sign). (2) Same for `updateSecondaryAmount`: use util instead of `current + delta`. (3) Add keydown on both inputs: ArrowUp/ArrowDown preventDefault, apply util, then `applyPrimaryUpdate` / set secondary amount. (4) Remove fixed `step="0.001"` or bind step from `getQuantityStep(current, undefined)`. Update spec that expects "+1 → current+1" to expect precision-based next value (e.g. 1.2 + 1 → 1.3). |
| **Recipe-workflow** — labor time | Already keydown + integerOnly | No change; integerOnly already gives step 1. |
| **Menu-intelligence** — guest count, sell price, dish fields | Already keydown; integerOnly or explicitStep | No change for guest/sell price (integerOnly). Dish fields use explicitStep; keep as-is unless product wants precision-based there too. |

---

## 3. Optional: shared directive for counter keydown

To avoid duplicating keydown logic in every component, consider a small **directive** (e.g. `counterArrowKeys`) that listens to keydown on the host (input), on ArrowUp/ArrowDown preventDefault and call quantityIncrement/quantityDecrement with config, and write back. This is optional; implement in-component handlers first.

---

## 4. Summary of files to touch

| File | Change |
|------|--------|
| quantity-step.util.ts | `getQuantityStep`: magnitude for integers (1–9→1, 10–99→10, 100→100…), precision for decimals; keep integerOnly and explicitStep. |
| quantity-step.util.spec.ts | New tests for magnitude/precision step and increment/decrement; adjust tests that assumed old <1 → 0.001. |
| cook-view.page.html | Keydown on main quantity input (and ingredient amount inputs if counters). |
| cook-view.page.ts | `onQuantityKeydown` (and per-ingredient keydown if needed) calling existing increment/decrement. |
| recipe-ingredients-table.component.ts | `onQuantityKeydown`: handle ArrowUp/ArrowDown with util + same stepOpts as buttons. |
| recipe-ingredients-table.component.html | Optional: dynamic `[step]` or remove fixed step. |
| recipe-builder.page.html | Keydown on logistics qty input; step="1". |
| recipe-builder.page.ts | Handler for logistics input Arrow Up/Down (integerOnly, min 1). |
| recipe-header.component.ts | Use quantityIncrement/quantityDecrement in updatePrimaryAmount and updateSecondaryAmount; add keydown on primary/secondary inputs. |
| recipe-header.component.html | Keydown on primary and secondary amount inputs; optional dynamic step. |
| recipe-header.component.spec.ts | Update expectations for updatePrimaryAmount/updateSecondaryAmount (e.g. 1.2 + 1 → 1.3, 10 + 1 → 20). |

---

## 5. Step computation (getQuantityStep)

- **Normalize** value: e.g. `roundToPrecision(value, 6)` to avoid float noise.
- **If value is whole** (rounded === floor(rounded), or within epsilon): step = `10^floor(log10(max(1, abs(rounded))))`. So 1..9 → 1, 10..99 → 10, 100..999 → 100, etc. For 0 use step 1.
- **If value has decimals**: count fractional digits from string representation of rounded value (cap at 3); step = 10^(-decimalPlaces). Handles 1.2 → 0.1, 1.15 → 0.01.
- **Non-finite or negative**: use abs where needed; non-finite → step 1.
