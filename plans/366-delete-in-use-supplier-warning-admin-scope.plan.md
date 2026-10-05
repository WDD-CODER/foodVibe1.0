# Plan 366 — Delete a supplier that's in use: warning, then admin-only "only me / everyone"

Status: draft
Snapshot: b776163f43fd1db42a5e0501b3a0e5c30b0bded1

## Problem Statement

`SupplierListComponent.onDelete()` (`src/app/pages/suppliers/components/supplier-list/supplier-list.component.ts` ~L383-400) has four problems:

- **The warning shows a raw key.** When the supplier is linked to products (`linkedProductCount_` → `getSupplierIds` over `product.sources[].supplierId`), it shows a confirm with `supplier_in_use_cannot_delete`, which was a raw key until plan 361 (Lists quick fixes) added it.
- **It deletes anyway, leaving broken links.** After confirming, it calls `supplierData.removeSupplier()`, which only deletes the user's own copy. Products keep pointing at a supplier id that no longer exists.
- **Bulk delete** (`onBulkDeleteSelected`, ~L402) has no in-use check at all.
- **No scope choice for admins.** The server's `PUT /:type/:id/delete-from-master` (`server/routes/generic.js` ~L650-696) only allows recipes, dishes and products (`DELETABLE_FROM_MASTER_TYPES`, `MASTER_TRASH_KEY`). There is no `TRASH_SUPPLIERS` in `server/constants/collections.js`. `Supplier` in the client model has no `_masterId`, although `shared/schemas/entities/supplier.schema.ts:18` has it.

Dandan wants: after a warning, admins only choose "only me / everyone". "Everyone" removes the master supplier and removes that supplier from other users' products. Non-admins delete only their own copy, as today, but with clean unlinking.

## Goals & Success Criteria

- Primary: deleting an in-use supplier shows one clear warning with the product count, then (admins, master-linked only) the scope choice, using the `entity: 'supplier'` texts from plan 365 (scope wording).
- Primary: deleting always removes the supplier from the deleter's own products' `sources` (no dangling ids). "Everyone" also deletes the master supplier (to trash) and, for every other user, their clone of it and its entries in their products' `sources`.
- Success: after an admin's "everyone" delete, no user's product references that supplier and new users don't receive it.

## Execution Mode

- Parallel: no. Run after plan 365 (scope wording), plan 361 (Lists quick fixes) and plan 341 (supplier-list).
- Concurrent plans: none touching `server/routes/generic.js` or supplier-list
- Isolated DB: yes. This plan adds a cross-user write route; test it against the isolated or local DB first.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/suppliers/components/supplier-list/**
src/app/core/services/supplier-data.service.ts
src/app/core/services/supplier-data.service.spec.ts
src/app/core/services/master-push.service.ts
src/app/core/services/master-push.service.spec.ts
src/app/core/services/product-data.service.ts
src/app/core/models/supplier.model.ts
server/routes/generic.js
server/constants/collections.js
server/test/**
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

- As a chef, when I delete a supplier my products use, I want a clear warning and my products cleaned up, not left pointing at nothing.
- As an admin, I want to choose whether a supplier is removed for me only or for everyone.

## Functional Requirements

### Must Have (P0)
- [ ] Client flow, single delete:
  - If linked products > 0: warning "הספק מקושר ל-{n} מוצרים. מחיקה תסיר אותו מהמוצרים האלה." (key `supplier_delete_in_use_warning`, count substituted).
  - Then `masterPush.askDeleteScope(item, { entity: 'supplier' })`. This is admin + `_masterId` gated already, so non-admins skip it.
  - Delete own copy, and strip `sources[]` entries with that `supplierId` from the user's own products (batch through `ProductDataService`, no toast per item).
  - If "everyone": call the new `SupplierDataService.deleteFromMaster(id)`.
- [ ] Bulk delete: the same flow with the total linked count and count passed to the scope prompt.
- [ ] Add `_masterId?: string` to `Supplier` (`supplier.model.ts`); already in the schema.
- [ ] Server:
  - Add `'suppliers'` to `DELETABLE_FROM_MASTER_TYPES`, plus `TRASH_SUPPLIERS` in `MASTER_TRASH_KEY`, plus a `{ name: 'TRASH_SUPPLIERS', userData: true, cloneable: false, backup: true, searchable: false }` entry in `collections.js`.
  - New `PUT /api/v1/data/suppliers/:id/purge-supplier-everywhere` (`verifyToken`, `requireAdmin`), modeled on `purge-ingredient-everywhere`. Find other users' clones by `_masterId`. For each: `$pull sources: { supplierId: clone._id }` from that user's products, then move the clone to `TRASH_SUPPLIERS` (that user) and delete it. Return `{ usersAffected }`.
  - Same comment block as the existing purge, marking it as a deliberate, admin-only cross-user exception.
- [ ] `MasterPushService.deleteSupplierFromMaster(supplier)`: calls `delete-from-master`, then `purge-supplier-everywhere`. Best-effort, with an error message on failure, like `deleteFromMaster`.

### Should Have (P1)
- [ ] Legacy `supplierIds_` on products (read by `getSupplierIds` when `sources` is empty): also `$pull` the id there, client and server.
- [ ] Server test: purge removes other users' clones and source entries and leaves the caller and `__master__` handled by `delete-from-master`.

### Nice to Have (P2)
- None.

## UI/UX Notes

- Dictionary (append): `supplier_delete_in_use_warning` = "הספק מקושר ל-{n} מוצרים. מחיקה תסיר אותו מהמוצרים האלה.", and `confirm_delete_supplier` = "למחוק את הספק?" (replaces the hard-coded `'למחוק את הספק "…"?'`).
- Scope texts come from plan 365 (`entity_supplier`).

## Atomic Sub-tasks

- [ ] A1: Server: allowlist, trash collection and purge route, plus tests (against the isolated DB) (`server/routes/generic.js`, `server/constants/collections.js`, `server/test/**`).
- [ ] A2: Client services: `deleteFromMaster`, `deleteSupplierFromMaster`, own-products source strip.
- [ ] A3: `onDelete` / `onBulkDeleteSelected` flow, model field, dictionary keys.
- [ ] A4: Build, server tests, client specs. Manual test with 2 accounts. Update session-state.

## Technical Considerations

- Dependencies: `SupplierListComponent`, `SupplierDataService`, `ProductDataService`, `MasterPushService` (plan 365), `generic.js` routes, `bumpMasterVersion`.
- New files: none, apart from test files.
- Model changes: `Supplier._masterId` (client only; the schema already has it).
- Schema: `products.sources` array elements are removed, not reshaped, so they stay valid under the strict schema.
- Security surface: new admin-only cross-user write route — `requireAdmin` + `verifyToken` mandatory; test the 403 path.

## Out of Scope

- Restoring a supplier from trash and re-linking products.
- Supplier rename for everyone.

## Critical Questions

- Non-admin deleting an in-use supplier:
  a) Allowed after the warning; own products are unlinked (default)
  b) Blocked until products are unlinked manually

## Success Criteria

- [auto] Server tests for `purge-supplier-everywhere` and `delete-from-master` (suppliers) → 0 failures (`npm --prefix server test` or the repo's server-tests command).
- [auto] `npm run build` → exit 0.
- [human] As a user: delete a supplier linked to 3 products → the warning says 3 → confirm → the supplier is gone and those products show no supplier (no broken entry).
- [human] As admin, with a second test user who has the same master supplier: delete → "מחק מכולם" → log in as the test user → the supplier is gone and their products no longer list it. A new signup doesn't get it.
