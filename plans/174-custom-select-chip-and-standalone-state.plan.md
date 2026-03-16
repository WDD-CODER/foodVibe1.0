---
name: Custom select chip and standalone state
overview: Document current custom-select work (chip variant, standaloneValue, type-to-filter) and where it is used (recipe header primary unit, recipe ingredients table unit column). Optional: apply chip + typeToFilter in cook-view ingredients index for consistency.
todos: []
isProject: false
---

# Custom Select Chip and Standalone State (Plan 174)

## Current state (saved)

### CustomSelectComponent

- **Variant:** `variant` (default | chip), `addNewValue`, `chipPrimaryLabel`, `standaloneValue` input with effect sync for use without form control.
- **Type-to-filter:** When `typeToFilter="true"`, trigger is an input; options filtered by typing (starts-with, Hebrew/Latin); text preserved on open; add-new option always kept at end of list; input-trigger chevron spaced so it does not overlap text.
- **Chip styles:** Trigger (pill, primary or main text), options (menu-item), add-new row (menu-item-create). All in custom-select.component.scss per cssLayer.

### Recipe header primary unit

- Uses `app-custom-select` with `variant="chip"`, `[chipPrimaryLabel]="true"`, `[typeToFilter]="true"`, `[standaloneValue]="primaryUnitLabel_()"`, `[options]="primaryUnitOptions_()"`, `(valueChange)="onPrimaryUnitValueChange($event)"`.
- Click to open, type to filter, keyboard nav, add-new opens unit creator.

### Recipe ingredients table (ingredients index in recipe builder)

- Unit column already uses `app-custom-select` with `variant="chip"`, `[typeToFilter]="true"`, `formControlName="unit"`, `[options]="getUnitOptions(group)"`, `(valueChange)="onUnitChange(...)"`. No change needed.

### Cook-view ingredients index (optional execution)

- Unit selects in cook-view (header yield unit + edit-mode row unit + view-mode row unit) can use `variant="chip"` and `[typeToFilter]="true"` so behavior matches recipe builder ingredients index.

## Verification

- Recipe builder: open a recipe, use unit dropdown in ingredients table (chip trigger, type to filter).
- Cook-view: after optional step, ingredients section unit dropdowns behave the same (chip + type-to-filter).
