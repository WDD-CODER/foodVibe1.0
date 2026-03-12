---
name: Recipe builder cost display fix
overview: Fix the Recipe Builder so the cost column shows the correct value instead of "ממתין" (Waiting) by addressing (1) treating zero cost as a valid value, (2) ensuring total_cost control updates the view when set, and (3) triggering change detection after each line calculation.
---

# Recipe Builder: Correct Cost Value and "ממתין" Display

## Summary

- **1. Zero treated as pending:** Template used `!group.get('total_cost')?.value`, so 0 showed "ממתין". Fix: show "ממתין" only when value is null/undefined; show ₪0.00 or amount for any number.
- **2. Disabled control:** `total_cost` was `disabled: true`, so setValue did not emit valueChanges and view could stay stale. Fix: enable control (`total_cost: [0]`).
- **3. Change detection:** `updateLineCalculations(index)` did not call `markForCheck()`. Fix: call `this.cdr.markForCheck()` at end of `updateLineCalculations(index)`.

## Files changed

- recipe-ingredients-table.component.html: pending only when cost null/undefined.
- recipe-form.service.ts: total_cost as enabled control.
- recipe-ingredients-table.component.ts: markForCheck() in updateLineCalculations.
