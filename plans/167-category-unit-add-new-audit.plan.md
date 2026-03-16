# Category/unit "add new" audit — execution plan

**Source:** Plan 163 section 2.5 (App-wide category/unit "add new" audit).  
**Saved:** plans/167-category-unit-add-new-audit.plan.md

## Critical questions (resolved)

- **Equipment-form:** Add "add new category" with custom categories (same pattern as add-equipment-modal).
- **Add-equipment:** Do not add automatic focus to equipment name. Ensure the newly created value is set in the dropdown that triggered "add new" (the category dropdown) — current code already does this; verify and document.
- **Cook-view:** Leave the logic/option there so that if the user wishes to add a unit from cook-view they can; implement as optional step.

---

## Current state (audit result)

| Location | Dropdown | Has "add new"? | Post-save selection? | Notes |
|----------|----------|----------------|---------------------|--------|
| quick-add-product-modal | category, base unit | Yes | Yes | `__add_category__` / `__add_unit__` |
| add-equipment-modal | category | Yes | Yes | `__add_new__`; sets category in dropdown on save |
| recipe-workflow | category, unit | Yes | Yes | `__add_new__` / `__add_unit__` |
| recipe-ingredients-table | unit per row | Yes | Yes | `__add_unit__` |
| recipe-header | primary unit | Yes | Parent sets | `NEW_UNIT` → openUnitCreator.emit() |
| product-form | category, base unit, purchase unit | Category: custom UI; unit: Yes | **Base unit: NO** | unitAdded$ only patches purchase row, not base_unit_ |
| equipment-form | category | No | — | Fixed CATEGORIES only |
| cook-view | yield unit, per-row unit | No | — | Optional: add so user can add from there |
| metadata-manager | — | N/A | — | Text input + Add button |

---

## Implementation steps

### 1. Fix product-form base-unit "add new" flow (required)

In product-form.component.ts, in the `unitRegistry.unitAdded$.pipe(...).subscribe(unitKey => { ... })` block:
- If `this.isBaseUnitMode_()` is true: patch `productForm_.get('base_unit_')` with `unitKey`, set `isBaseUnitMode_.set(false)`, and return.
- Else keep existing logic when `activeRowIndex_()` is not null (patch purchase-option row, clear activeRowIndex_).

### 2. Add "add new category" to equipment-form (in scope)

- Append sentinel option (e.g. `__add_new__` or `__add_category__`) to categoryOptions; add `(valueChange)` handler on the category app-custom-select.
- When sentinel selected: open AddItemModalService; on save, resolve/register category (TranslationService.resolveCategory, or TranslationKeyModal for new key); set the new value in the category dropdown (patch form control).
- Add custom categories list (signal) merged with fixed CATEGORIES into categoryOptions, same pattern as add-equipment-modal.
- Inject AddItemModalService, TranslationService, TranslationKeyModalService.

### 3. Add-equipment: ensure new value in dropdown (verify)

Confirm add-equipment-modal sets `this.category_.set(keyToUse)` after saving new category so the dropdown shows the new value. No focus change.

### 4. Cook-view unit dropdowns (optional)

Implement "add new unit" so user can add a unit from cook-view if they wish: append `__add_unit__` to options; in handlers open unitRegistry.openUnitCreator() and subscribe to unitAdded$ to set the new unit in the dropdown.

---

## Order of work

1. Required: Fix product-form base-unit flow (step 1).
2. In scope: Add "add new category" to equipment-form (step 2).
3. Verify: Add-equipment sets new value in category dropdown (step 3).
4. Optional: Cook-view "add new unit" (step 4).

Before editing any `.scss`/`.css` in `src/`, read and apply .assistant/skills/cssLayer/SKILL.md if new styles are added.
