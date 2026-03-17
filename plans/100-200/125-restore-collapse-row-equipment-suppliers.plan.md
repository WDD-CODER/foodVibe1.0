---
name: Restore collapse row equipment suppliers
overview: "Restore the intended behavior in equipment and supplier lists: row click should expand/collapse the inline edit panel (toggle the row), not navigate to the full edit page. Remove the navigation-only code added for those two lists and keep cursor/pointer and accessibility."
todos: []
isProject: true
---

# Restore collapse row in equipment and supplier lists

## What went wrong

Equipment and supplier lists were built with an **inline edit panel** (collapsible row): clicking the pencil opens a form below the row (`editingId_` + `inline-edit-panel`). When we added "row click → go to edit," we made row click **navigate to the full edit page** instead of **toggling that inline panel**. The intended behavior is: **row click = expand/collapse the inline edit row** (same idea as the pencil, but from the row).

## Current vs desired

| List      | Row click (current)    | Row click (desired)      |
| --------- | ---------------------- | ------------------------ |
| Equipment | Navigate to edit route | Toggle inline edit panel |
| Suppliers | Navigate to edit route | Toggle inline edit panel |

Product list and venue list have no inline panel; they keep **row click → navigate to edit page**. Only equipment and suppliers change.

---

## 1. Equipment list

**Files:** equipment-list.component.html, equipment-list.component.ts.

- **Template:** Keep row `(click)="onRowClick(item, $event)"`, `role="button"`, `tabindex="0"`. Change keyboard handlers to toggle: `(keydown.enter)="toggleRowEdit(item)"` and `(keydown.space)="$event.preventDefault(); toggleRowEdit(item)"`.
- **TS:** Remove `navigateToEquipmentEdit(id: string)`. Replace `onRowClick` body: if click is on button/a/`.inline-edit-panel`, return; if `editingId_() === item._id`, close with `this.editingId_.set(null)`; else `void this.onEdit(item)`. Add `toggleRowEdit(item: Equipment): void`: if `editingId_() === item._id` then `this.editingId_.set(null)`; else `void this.onEdit(item)`.
- **SCSS:** No change.

---

## 2. Supplier list

**Files:** supplier-list.component.html, supplier-list.component.ts.

- **Template:** Keep row click; change keyboard to `toggleRowEdit(item)`.
- **TS:** Remove `navigateToSupplierEdit(id: string)`. Replace `onRowClick` with same toggle pattern. Add `toggleRowEdit(item: Supplier): void`.
- **SCSS:** No change.

---

## 3. Redundant code removed

- Equipment: Delete `navigateToEquipmentEdit` and its template references.
- Suppliers: Delete `navigateToSupplierEdit` and its template references.

Full-page edit routes remain in the router; only the list row (and keyboard) stop calling them.
