---
name: Custom dropdown for all selects
overview: Replace every native HTML select in the project with a shared custom-select component that uses the same visual and behavior as Plan 043 scrollable dropdown (glass panel, hidden scrollbar, hover scroll arrows), works with reactive forms and ngModel, and is applied consistently everywhere a dropdown is needed.
todos: []
isProject: true
---

# Custom dropdown for all selects (project-wide)

## Goal

Use the same custom dropdown (glass look, hidden scrollbar, hover scroll arrows from Plan 043) everywhere a dropdown is needed. That includes the equipment/phase select in recipe-builder.page.html and all other native select elements in the app. No native select should remain; all become the custom trigger + scrollable list pattern.

## Approach

1. Introduce a shared custom-select component with trigger (c-select style), panel using ScrollableDropdownComponent, options as clickable items, ControlValueAccessor for formControlName/ngModel, placeholder, optional valueChange output, and keyboard/accessibility.
2. Replace every native select in the 14 files listed in section 2 with app-custom-select.
3. Reuse .c-select for trigger and existing .c-dropdown/scrollable-dropdown for the list.

## 1. Shared custom-select component

- Path: src/app/shared/custom-select/ (custom-select.component.ts, .html, .scss).
- Selector: app-custom-select.
- Inputs: options (Array of { value, label }), placeholder, maxHeight (default 240), translateLabels (default true).
- Output: valueChange (optional) for parent handling of special values e.g. __add_new__.
- CVA: implement ControlValueAccessor for formControlName and ngModel.
- Template: trigger with .c-select + chevron; when open, wrapper with app-scrollable-dropdown and option buttons; ClickOutSideDirective to close.
- Accessibility: aria-expanded, aria-haspopup="listbox", role="listbox"/"option", keyboard (Escape, ArrowUp/Down, Enter).

## 2. Where to replace selects

- recipe-builder.page.html: equipment_id_, phase_ (form array baseline_)
- cook-view.page.html: unit x2 (value + change)
- venue-form: environment_type_, equipment_id_
- unit-creator: basis unit (ngModel)
- product-form: base_unit_, unit_symbol_ (per row), uom (per row)
- menu-intelligence: serving_type_
- inventory-product-list: base_unit_ per row (ngModel)
- recipe-ingredients-table: unit per row (formControlName + change)
- equipment-form: category_
- equipment-list: category filter (ngModel)
- recipe-workflow: category_name, unit per row (category has __add_new__)
- menu-library-list: eventType, servingStyle, sortBy (ngModel)
- add-equipment-modal: category (ngModel)

Edge cases: recipe-workflow __add_new__ handled via valueChange; product-form onBaseUnitChange and recipe-ingredients-table updateLineCalculations via valueChange or parent subscription.

## 3. Implementation order

1. Add CustomSelectComponent with CVA, trigger, scrollable-dropdown list.
2. Replace recipe-builder.page (equipment + phase).
3. Replace menu-intelligence, venue-form, equipment-form, equipment-list, add-equipment-modal, unit-creator.
4. Replace product-form, recipe-workflow, recipe-ingredients-table, inventory-product-list, cook-view, menu-library-list.

## 4. Summary

Create CustomSelectComponent; replace all native select in 14 files with app-custom-select; handle edge cases via valueChange. Result: one custom dropdown pattern for select-like dropdowns across the app.
