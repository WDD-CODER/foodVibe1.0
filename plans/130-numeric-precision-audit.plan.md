---
name: Numeric precision audit
overview: "Updated plan: no global 2-decimal storage rule; precision issues come from HTML number inputs. This version locks in concrete step values (step=\"0.001\" for yield and recipe amounts), leaves lower-priority and unit-creator unchanged, and adds Past changes plus a diff from the previous plan."
todos: []
isProject: false
---

# Numeric precision audit (updated)

## Past changes (this session)

- **Duplicate unit message and in-modal error:** UnitRegistryService now accepts `openUnitCreator(context?: { existingUnitSymbols?: string[] })` and `registerUnit()` returns `RegisterUnitResult`. When the unit name already exists on the product, it returns `{ success: false, alreadyOnProduct: true }` (no save, no close). When it exists only in the global registry, it shows the single message "נוספה לרשימת יחידות הרכש של המוצר." and returns success so the modal closes. UnitCreatorModal shows in-modal error "היחידה כבר קיימת במוצר זה. בחר שם אחר." on alreadyOnProduct and does not close. Product form and recipe-ingredients pass `existingUnitSymbols` when opening the unit creator.
- **Conversion rate formula:** Product form and recipe-ingredients use `conversion_rate_ = unitFactor / baseFactor` (base units per 1 purchase unit) everywhere. Product-form spec updated for kg/kg and mock refreshFromStorage/unitAdded$.
- **Conversion rate precision:** Product form `conversion_rate_` input has `step="any"` and `min="0.0001"` so values like 0.015 are not rounded to 0.02.

---

## Finding: no global 2-decimal storage rule

- **Display only:** Angular `number` pipe in templates is display-only; does not change form or app state.
- **Export only:** `roundExportNumber` in export.util.ts is used only for Excel in export.service.ts; does not touch in-app state.
- **Intentional stored rounding:** Menu-intelligence patches `food_cost_money` with 2 decimals when selecting a dish; acceptable for menu pricing.
- The conversion_rate_ issue was the **HTML number input** lacking `step`; the fix (`step="any"` and `min="0.0001"`) remains.

---

## Where the same risk exists

### High priority

| Location | Field | Current | Recommendation |
|----------|--------|---------|----------------|
| recipe-ingredients-table.component.html (line 61) | amount_net | No step | Add `step="any"` or `step="0.001"` to align with quantity-step.util. |
| product-form.component.html (line 147) | price_override_ | No step | Add `step="0.01"` or `step="any"`. |

### Medium priority (concrete choices)

| Location | Field | Current | Recommendation |
|----------|--------|---------|----------------|
| product-form.component.html (line 278) | yield_factor_ | step="0.01" | Change to `step="0.001"` for finer yield (e.g. 0.995). |
| recipe-header.component.html (lines 53, 89) | Primary/secondary amount | No step | Add `step="0.001"` so fractional portions (e.g. 0.5 for preps) are preserved. |
| unit-creator.component.html (line 26) | New unit quantity | No step | **No change.** Typically integers (15, 330); no need to touch. |
| metadata-manager unit rate input (line 176) | Unit rate | No step | **Optional.** Risk: registry stores grams per unit (e.g. 15); decimal values (e.g. 15.5) could be rounded. Adding `step="any"` would preserve them. Implement only if you need decimal rates; avoid TypeScript `any` in related code. |

### Lower priority — no change needed

- cook-view quantity/amount inputs: already use step; integer or coarse values by design.
- quick-add-product-modal: buy_price and yield have step="0.01"; other fields integers. Yield step updated to 0.001 for parity.
- recipe-workflow labor time: integer minutes. No change.
- Equipment, suppliers, venues: integer quantities. No change.

---

## Recommended actions (updated)

1. **Keep** the existing conversion_rate_ fix (`step="any"` and `min="0.0001"`).
2. **Add** `step="any"` or `step="0.001"` to recipe-ingredients `amount_net` input.
3. **Add** `step="0.01"` or `step="any"` to product-form `price_override_` input.
4. **Change** `yield_factor_` to `step="0.001"` in product-form and in quick-add-product-modal for parity.
5. **Add** `step="0.001"` to recipe-header primary and secondary amount inputs.
6. **Do not** change unit-creator quantity input, cook-view, recipe-workflow, equipment, suppliers, or venues.
7. **Optionally** add `step="any"` to metadata-manager unit rate input only if decimal grams-per-unit are needed; avoid TypeScript `any` in related code.
8. **Do not** change display pipes or export rounding; only adjust the inputs above.

---

## Differences from previous plan

- **Lower priority:** Explicitly **no change needed** for cook-view, quick-add (beyond yield step), recipe-workflow, equipment, suppliers, venues.
- **yield_factor_:** Recommendation is now **concrete:** use `step="0.001"`.
- **Recipe header amount:** Recommendation is now **concrete:** use `step="0.001"` to preserve fractional portions.
- **Unit-creator quantity:** **Removed** from recommended actions; **do not touch**.
- **Metadata-manager unit rate:** Clarified as **optional**; avoid TypeScript `any` in related code.
- **New section:** "Past changes (this session)" added.
- **New section:** "Differences from previous plan" added.
