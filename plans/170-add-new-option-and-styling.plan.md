# Add-new option everywhere + primary-color styling

**Saved:** plans/170-add-new-option-and-styling.plan.md

## A. Custom dropdowns that need "add new" (audit result)

Only **equipment-list** category (quick-edit + inline edit) was missing the option. All other category/unit custom-selects already have it (Plan 167 or earlier).

## B. Style "add new" in main app color

Sentinel values: `__add_new__`, `__add_category__`, `__add_unit__`, `NEW_UNIT`. Style these in CustomSelectComponent with primary color.

---

## Implementation

### Step 1 — Equipment-list: add "add new category"

- equipment-list.component.ts: sentinel constant, customCategories_ signal, categoryOptions computed, inject AddItemModalService + TranslationKeyModalService, onCategoryValueChange + openAddNewCategory, hydrateEditForm add custom category to list.
- equipment-list.component.html: (valueChange) on both category custom-selects, [options]="categoryOptions()".

### Step 2 — CustomSelectComponent: add-new modifier class

- custom-select.component.ts: ADD_NEW_SENTINELS set, isAddNewOption(value) method.
- custom-select.component.html: [class.custom-select-option--add-new]="isAddNewOption(opt.value)".

### Step 3 — Style .custom-select-option--add-new

- custom-select.component.scss: .custom-select-option--add-new using var(--color-primary), var(--color-primary-soft); follow cssLayer skill.

## Order of work

1. Step 2 + Step 3 (styling first).
2. Step 1 (equipment-list).
