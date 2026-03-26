---
name: Custom select preserve text on focus
overview: Change the type-to-filter custom select so that focusing/clicking the input does not clear the field; the current selection (or existing text) stays in the input so the user can edit or extend it instead of always starting from empty.
todos: []
isProject: false
---

# Preserve input text when focusing custom select (type-to-filter)

## Current behavior

- On focus, `[openDropdown()](src/app/shared/custom-select/custom-select.component.ts)` runs and sets `this.searchQuery_.set('')`, so the input always shows an empty value and the user must type from scratch.

## Desired behavior

- On focus, keep the current content in the input: when there is a selection, show its label (same as when closed); when there is no selection, keep empty. The user can then place the cursor and edit/append, or select-all and type to replace.

## Implementation

**File:** [src/app/shared/custom-select/custom-select.component.ts](src/app/shared/custom-select/custom-select.component.ts)

1. **In `openDropdown()` (lines 149–157)**
   - Remove the unconditional clear: do **not** call `this.searchQuery_.set('')`.
   - Instead, set `searchQuery_` to the value that would be shown when closed:
     - If there is a current value (`this._value()`): use the selected option's label, with translation applied when `translateLabels()` is true (same logic as `inputDisplayValue_` when closed).
     - If there is no current value: set `searchQuery_` to `''`.
   - After updating `searchQuery_`, compute `filteredOptions_()` and set `highlightedIndex` to the index of the **currently selected value** in that filtered list (so Enter and arrow keys match the visible selection). If the current value is not in the filtered list, fall back to `0` if the list is non-empty, otherwise `-1`.
2. **No change to `close()`**
   - Keeping `this.searchQuery_.set('')` on close is correct so that when the dropdown closes the input again shows the selected label via `inputDisplayValue_` (which uses `selectedLabel()` when closed, not `searchQuery_`).
3. **No template changes**
   - The input already binds to `inputDisplayValue_()` and opens via `(focus)="openDropdown()"`; no HTML changes required.

## Result

- Clicking/focusing the input opens the dropdown with the current selection's label in the input; the user can edit or extend without it being cleared.
- If nothing is selected, the input stays empty on focus.
- Closing the dropdown continues to clear the internal search query and show the selected label when closed.
