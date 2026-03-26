# Workflow custom-select: keep design, add ingredients-index behavior

## Goal
- **Keep**: The current workflow look (bordered box, `--bg-glass`, same layout under "Maison Plus") — i.e. **do not** use `variant="chip"`.
- **Add**: Same behavior as the ingredients index: type-to-filter, scrollable dropdown, add-new option always visible when filtering and styled.

## Why they look different today
- **Ingredients table** uses `variant="chip"` and `[typeToFilter]="true"` → chip look + type-to-filter.
- **Workflow** uses neither → default trigger (button, click to open), so it looks like the "beautiful design" but has no type-to-filter.

The component already supports **type-to-filter with default (non-chip) variant**: when `typeToFilter` is true and `variant` is not chip, the trigger is still the default box (same border, padding, `--bg-glass`) with an input inside instead of a label ([custom-select.component.html](src/app/shared/custom-select/custom-select.component.html) lines 2–22: `--chip` classes are only applied when `variant() === 'chip'`). So we only need to enable the behavior in the workflow; no design change.

## Current workflow state
- [recipe-workflow.component.html](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.html): Two `app-custom-select` instances — category (lines 137–142) and unit (lines 162–167). No `typeToFilter`, no `addNewValue`.
- Options already include add-new sentinels: category `__add_new__` ([recipe-workflow.component.ts](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.ts) line 114), unit `__add_unit__` (line 120). Handlers `onCategoryChange` and `onUnitChange` already handle these values.
- Dropdown is already scrollable via `app-scrollable-dropdown` inside the component; no change needed.

## Implementation

### 1. Enable type-to-filter and add-new behavior in workflow template
**File:** [recipe-workflow.component.html](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.html)

- **Category select** (lines 137–142):  
  - Add `[typeToFilter]="true"`.  
  - Add `[addNewValue]="'__add_new__'"` so the component (a) keeps "add preparation category" at the end when filtering and (b) styles it with `custom-select-option--add-new` (left border, primary color).  
  - Do **not** add `variant="chip"` so the trigger stays the default bordered box.

- **Unit select** (lines 162–167):  
  - Add `[typeToFilter]="true"`.  
  - Add `[addNewValue]="'__add_unit__'"` (component default is already `__add_unit__`, but passing it explicitly keeps behavior and styling consistent and documents intent).  
  - Do **not** add `variant="chip"`.

### 2. Optional: translate option labels
If category/unit option labels are translation keys (e.g. `choose_category`, `add_preparation_category`, `+ יחידה חדשה`), add `[translateLabels]="true"` to both selects so the dropdown shows translated text. If labels are already plain text or translated elsewhere, skip this.

### 3. No changes to custom-select component or SCSS
- **filteredOptions_** in [custom-select.component.ts](src/app/shared/custom-select/custom-select.component.ts) already strips the add-new option from the filterable list and appends it at the end (lines 91–106), so "add new" stays visible when typing.
- **openDropdown()** already sets the search query to the current selection label so the value is not cleared when opening.
- **Scrollable dropdown** and **add-new styling** (`.custom-select-option--add-new` in [custom-select.component.scss](src/app/shared/custom-select/custom-select.component.scss) lines 195–208) are already implemented.
- Keyboard (Arrow Up/Down, Enter) and scroll-into-view for type-to-filter mode are already implemented.

## Summary
| Change | Where |
|--------|--------|
| `[typeToFilter]="true"` | Both workflow selects (category + unit) |
| `[addNewValue]="'__add_new__'"` | Category select |
| `[addNewValue]="'__add_unit__'"` | Unit select (optional, default is already this) |
| No `variant="chip"` | Leave as-is so design stays default |
| Optional `[translateLabels]="true"` | Both if options use translation keys |

Result: workflow selects keep the current "beautiful" default look, gain type-to-search, scrollable list, and styled add-new that stays at the bottom when filtering.
