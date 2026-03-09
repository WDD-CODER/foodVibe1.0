# Plan 094 — Inline Edit & Supplier Modal

## Overview

Replace the separate edit-page navigation for Equipment with inline row expansion, and replace the broken two-step supplier add flow with a proper full-form modal used for both add and edit. Venues are left unchanged.

## Scope

| List     | Change                                |
|----------|----------------------------------------|
| Equipment | Inline row expansion for edit         |
| Supplier  | Full-form modal for both add and edit |
| Venue     | No change                             |

## Part 1 — Equipment inline row expansion

- **equipment-list.component.ts**: Add `editingId_`, `editForm_` (same fields as equipment-form), `isSavingEdit_`, dirty guard via `ConfirmModalService`, `onEdit(item)` (with save/discard then switch), `onInlineSave()`, `onInlineCancel()`.
- **equipment-list.component.html**: Inside the `@for` loop, after the row div, add `@if (editingId_() === item._id)` block with inline form and actions.
- **equipment-list.component.scss**: Add `.inline-edit-panel` with `grid-column: 1 / -1`, padding, expand animation (cssLayer).

## Part 2 — Supplier full-form modal

- **New**: `src/app/core/services/supplier-modal.service.ts` — `isOpen_`, `editingSupplier_`, `openAdd()`, `openEdit(supplier)`, `close()`.
- **New**: `src/app/shared/supplier-modal/` — component wrapping `SupplierFormComponent` in `c-modal-overlay` / `c-modal-card`, `[embeddedInDashboard]="true"`, `[supplierToEdit]`, `(saved)`/`(cancel)` → close.
- **supplier-form.component.ts**: Add `supplierToEdit = input<Supplier | null>(null)` and `effect()` to hydrate form when non-null (modal mode).
- **supplier-list.component.ts**: `onAdd()` → `supplierModalService.openAdd()` when not embedded; `onEdit(id)` → resolve supplier and `supplierModalService.openEdit(supplier)`.
- **app.component.html**: Add `<app-supplier-modal/>`.
- **app.config.ts**: Register `SupplierModalComponent` if needed.

## Dictionary

- Reuse `unsaved_changes_confirm` for equipment dirty guard.

## File size

- equipment-list: keep under ~300 lines; equipment-list HTML under ~200.
