---
name: Remove supplier modal edit redundancy
overview: Remove the unused edit path from the supplier modal flow now that editing is done inline in the list; simplify SupplierModalService to add-only and update the modal template to pass null for supplierToEdit.
todos:
  - Simplify supplier-modal.service.ts (remove edit API and state)
  - Update supplier-modal.component.html to bind supplierToEdit to null
---

# Remove redundant supplier modal edit code

## Context

Edit was moved to **inline row** in the supplier list; the modal is now used only for **Add**. The service still has `openEdit()`, `editingSupplier_`, and the modal still binds `[supplierToEdit]="modalService.editingSupplier()"`. No code calls `openEdit()` anymore.

## Changes

### 1. Simplify supplier-modal.service.ts

- Remove the **edit** API and state: delete `editingSupplier_` signal and `editingSupplier` readonly; delete `openEdit(supplier: Supplier)`.
- Keep: `isOpen_`, `isOpen`, `openAdd()`, `close()`.
- In `openAdd()`: only set `isOpen_.set(true)`.
- In `close()`: only set `isOpen_.set(false)`.
- Remove the unused `Supplier` import if only used for `openEdit`.

### 2. Update supplier-modal.component.html

- Replace `[supplierToEdit]="modalService.editingSupplier()"` with `[supplierToEdit]="null"` so the embedded form is always in add mode.
- Optional: short comment that the modal is add-only (edit is inline in the list).

### 3. No changes elsewhere

- Supplier form keeps `supplierToEdit` and `embeddedInDashboard`; standalone edit route still uses `supplierToEdit` from route data.
- Supplier list already uses only `supplierModal.openAdd()`.
- App root keeps `<app-supplier-modal />`.

## Summary

| File | Action |
|------|--------|
| supplier-modal.service.ts | Remove editingSupplier_, editingSupplier, openEdit(); simplify openAdd() and close(). |
| supplier-modal.component.html | Bind [supplierToEdit]="null". |
