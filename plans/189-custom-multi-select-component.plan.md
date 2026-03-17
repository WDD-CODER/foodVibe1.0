# Custom Multi-Select Component (Option 2)

## Goal

Implement a new **CustomMultiSelectComponent** that reuses the same UX as `custom-select` (keyboard navigation, click-outside close, ARIA listbox, ScrollableDropdown) while supporting **multi-select**: value is `string[]`, trigger shows chips (removable + optional read-only), and selecting an option **adds** to the selection (dropdown stays open). Support **read-only chips** (e.g. auto labels) and **per-option chip colors** for the recipe-header labels use case.

## Component API

- **Location**: `src/app/shared/custom-multi-select/`
- **Inputs**: `options` (required, `{ value, label, color? }[]`), `placeholder`, `maxHeight`, `translateLabels`, `triggerId`, `compact`, `variant`, `readonlyChips`, `addNewValue`
- **Outputs**: `valueChange` (string[]), `addNewChosen` (void)
- **ControlValueAccessor** for `string[]`
- **Chip colors**: Option `color` used for chip background; luminance-based text color. Single exception for dynamic chip color (no other inline styles).

## Implementation steps

1. Create CustomMultiSelectComponent (TS, HTML, SCSS, spec).
2. Refactor recipe-header labels to use `app-custom-multi-select` with `labelMultiSelectOptions_()`, `readonlyChips`, `addNewChosen`.
3. Recipe-header SCSS: remove/reduce labels-specific styles; run tests.

## Files to add

- `src/app/shared/custom-multi-select/custom-multi-select.component.ts`
- `src/app/shared/custom-multi-select/custom-multi-select.component.html`
- `src/app/shared/custom-multi-select/custom-multi-select.component.scss`
- `src/app/shared/custom-multi-select/custom-multi-select.component.spec.ts`

## Files to modify

- `recipe-header.component.ts`: Import CustomMultiSelectComponent; add `labelMultiSelectOptions_()`; keep `openCreateLabel`, `clearAllManualLabels`; remove/simplify label dropdown state.
- `recipe-header.component.html`: Replace labels container with `app-custom-multi-select` and Labels/Clear all buttons.
- `recipe-header.component.scss`: Remove or reduce labels-specific styles.
