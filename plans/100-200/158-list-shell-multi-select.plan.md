---
name: List shell multi-select
overview: "Add a reusable multi-select behavior to all list-shell lists: a checkbox as the last column, selection mode (when at least one item is marked) that switches row click from navigate-to-edit to toggle-selection, header checkbox to mark/unmark all visible items, and bulk actions (e.g. delete selected)."
todos: []
isProject: false
---

# List shell multi-select (checkbox column + bulk actions)

## Behavior (confirmed)

- **Checkbox column**: Last column in every list; user can click the checkbox to mark an item.
- **Before any item is marked**: Row click keeps current behavior (navigate to details/edit).
- **After at least one item is marked**: Row click toggles that row’s selection (add/remove from marked set); user can also use the checkbox. So “selection mode” = “at least one selected” (no separate toggle).
- **Bulk actions**: When there are selected items, show actions (e.g. “Clear selection”, “Remove selected”) so the user can act on many items at once.
- **Header checkbox (select all)**: Clicking the checkbox column header marks all visible/filtered items if not all are marked, or unmarks all if all are marked. So the header acts as “select all” / “deselect all” for the current list view.

## Architecture

- **list-shell** stays layout-only (content projection). It does **not** own rows or selection state.
- **Shared selection state**: A small, reusable class (e.g. in `src/app/shared/list-selection/`) that holds `selectedIds` and exposes `toggle(id)`, `clear()`, `selectionMode` (derived: `selectedIds().size > 0`), `selectAll(ids)`, `allSelected(ids)`, `toggleSelectAll(visibleIds)`. Each list component instantiates this (one instance per list).
- **Checkbox column**: Implemented by each list that uses the shell: add one extra grid column and one header cell (with checkbox for select all) + one cell per row with a checkbox. Use a shared presentational checkbox component for consistent look and to stop propagation so row click does not double-toggle.
- **Row click**: In each list’s `onRowClick`, if the target is a button/link/checkbox → return; if `selection.selectionMode()` → `selection.toggle(item._id)`; else → current behavior (navigate or open edit).
- **Bulk actions**: Rendered in each list when `selection.selectionMode()` is true (e.g. in `shell-actions` or a small bar), with list-specific actions (e.g. delete selected) plus “Clear selection”.

## Implementation

### 1. Shared selection state

- **Path**: `src/app/shared/list-selection/list-selection.state.ts`.
- **API**: Plain class (no Angular DI required), usable in any list:
  - `selectedIds = signal<Set<string>>(new Set())`
  - `selectionMode = computed(() => this.selectedIds().size > 0)`
  - `toggle(id: string)`: add or remove `id` from the set.
  - `clear()`: set to empty.
  - `isSelected(id: string): boolean`
  - `selectAll(ids: string[])`: set selection to exactly the given ids (all visible/filtered).
  - `allSelected(ids: string[])`: true if every id in the list is selected (for header checkbox checked state).
  - `toggleSelectAll(visibleIds: string[])`: if all visible are selected → clear; else → select all visible (used on header checkbox click).
- No template; used by list components only.

### 2. Shared row checkbox component

- **Path**: `src/app/shared/list-selection/list-row-checkbox.component.ts` (and `.html`, `.scss`).
- **Role**: Presentational only. Prevents row click from firing when the user clicks the checkbox.
- **Inputs**: `checked: boolean`, optional `disabled`.
- **Output**: `(toggle)`.
- **Behavior**: On click, `preventDefault` and `stopPropagation`, then emit toggle.
- **Styling**: Follow cssLayer SKILL; use `@layer components.list-selection` and existing tokens from `src/styles.scss`.

### 3. List-shell

- **No structural change.** The shell does not add a checkbox column or slots for it.

### 4. Per-list changes (all five list components)

- **Grid templates**: Append one column `minmax(44px, auto)` to both `gridTemplate` and `mobileGridTemplate`.
- **Table header**: Add one final cell containing the shared checkbox: `[checked]="... allSelected(visibleIds)"` and `(toggle)="selection.toggleSelectAll(visibleIds)"` so clicking the header marks or unmarks all visible items.
- **Table body**: In each row, add one final cell with `<app-list-row-checkbox [checked]="selection.isSelected(item._id)" (toggle)="selection.toggle(item._id)" />`.
- **Row click**: In `onRowClick`, if target is checkbox/button/link → return; if `selection.selectionMode()` → `selection.toggle(item._id)`; else → navigate/edit.
- **Bulk actions**: When `selection.selectionMode()`, show “Clear selection” and “Remove selected” (list-specific bulk delete), then `selection.clear()` after bulk action.

**Lists**: inventory-product-list, venue-list, equipment-list, supplier-list, recipe-book-list.

### 5. Translations

- Add keys in `public/assets/data/dictionary.json` (general): `clear_selection`, `remove_selected`, `select_all`.

## Summary

| Item                       | Location / action                                                                 |
| -------------------------- | --------------------------------------------------------------------------------- |
| Selection state class      | `src/app/shared/list-selection/list-selection.state.ts`                           |
| Row checkbox component     | `src/app/shared/list-selection/list-row-checkbox.component.*`                      |
| Checkbox column + bulk     | Each of the 5 list components (inventory, venues, equipment, suppliers, recipe-book) |
| Translations               | `clear_selection`, `remove_selected`, `select_all` in dictionary.json             |
