# Plan 485 — One product per name in a business, enforced by the server

Status: active
Track: code
Snapshot: 6ce29799

## Problem Statement
Human, 2026-10-22: "I don't want to have any duplicates in the products. It's not allowed… Nobody is supposed to be
able to keep two existing products with the same name." Today only the product form checks (client side). The server
accepts any name, and several client paths skip the form's check.

Verified (read-only survey of `feat/484`):
- No server check on product names: `POST /data/:type` (`server/routes/generic.js:436-502`), `PUT /data/:type/:id`
  (:544-643), trash restore (:383-400) and restore-all (:368-381) write any name. Push-to-master compares exact trimmed
  names only (:735-741). Login sync `syncMasterToBusiness` (`server/services/sync-master.js`) compares exact names and
  its Rule 2 can rename a clone into a clash. Only the price-list import (`server/routes/product-import.js`) matches by
  the normalized name.
- Client paths with no name check: quick-add modal (`shared/quick-add-product-modal/…ts:221-262`), AI create in the
  inventory list (`inventory-product-list.component.ts:234-252`), stub product from an unlinked recipe line
  (`recipe-ingredients-table.component.ts:191-209`), quick-edit rename (`quick-edit-product-panel.component.ts:173-181`),
  version restore (`version-history.service.ts:116`).
- Local DB holds duplicates (Guest Admin 4 × «מלפפון», 4 × «כרובית»; QA Review Kitchen 6 × «כרובית», …). Atlas has none
  (read-only check 2026-10-22: 4 owners × 1,475 products, 0 names used twice).
- References to a product `_id`: `recipes`/`dishes` `ingredients[].referenceId` (+ `nameSnapshot`), `VERSION_HISTORY`
  `entityId` (+ recipe snapshots' ingredients). Nothing else stores product ids.

## Goals & Success Criteria
- Primary: two live products in one business can never share a name (normalized: trim, single spaces, lower-case),
  whatever path writes them; the local duplicates are merged.
- Success:
  - [ ] [auto] `npx ng build` passes; `npm --prefix server test` passes, with new tests: POST with a taken name → 409 `PRODUCT_NAME_TAKEN`; PUT renaming to a taken name → 409; PUT keeping the name → 200; restore of a trashed product whose name is now taken → 409; restore-all skips clashing ones and reports them; another business may use the same name.
  - [ ] [auto] Client specs: a 409 `PRODUCT_NAME_TAKEN` shows «כבר קיים חומר גלם בשם זה - לא ניתן לשמור» from kitchen-state save and the quick-add modal.
  - [ ] [auto] Local cleanup script dry run lists every duplicate group; after `--write` a second dry run finds 0 groups, and no recipe/dish ingredient points at a removed product.
  - [ ] [human] Quick-add from the recipe builder with an existing product's name → refused with «כבר קיים חומר גלם בשם זה - לא ניתן לשמור», nothing created.
  - [ ] [human] Inventory: «מלפפון» appears once for Guest Admin; recipes that used any of its old copies still show «מלפפון» with its price.

## Execution Mode
- Parallel: no (generic.js + many client files). Isolated DB: no.

## Execution Notes
- Base `feat/484-edit-product-with-duplicate-name` (needs its "keep the saved name" rule), then `mvp-review-fixes`.
- Built in this session (Human chose "build one by one", 2026-10-22).
- The guard lets an existing product keep its unchanged name (otherwise any old twin blocks price/unit saves).
- Atlas: no migration and no data change — Atlas has no duplicates; the guard ships with the code.
- Cleanup merges in place: keep the copy most recipes use (ties: oldest), merge supplier `sources` by `supplierId`
  (keep the latest price per supplier), re-point `ingredients[].referenceId` and set `nameSnapshot`, re-point
  `VERSION_HISTORY.entityId`, move the other copies to the Trash (`deletedAt`) — restoring one is then refused by the guard.

## Read-Write Scope

Always allowed: this plan file, `.claude/sessions/**`, `.worktree-*`, append-only hotspots.

```scope
server/utils/product-name-guard.js
server/routes/generic.js
server/services/sync-master.js
server/scripts/dedupe-business-products.js
server/test/**
src/app/core/services/kitchen-state.service.ts
src/app/core/services/kitchen-state.service.spec.ts
src/app/core/services/product-data.service.ts
src/app/core/services/version-history.service.ts
src/app/core/utils/product-name-error.util.ts
src/app/shared/quick-add-product-modal/**
src/app/shared/quick-edit-product-panel/**
src/app/pages/inventory/components/inventory-product-list/**
src/app/pages/recipe-builder/components/recipe-ingredients-table/**
docs/mvp/runs/485.md
```

## Read Scope
Entire repo.

## Escalation Protocol
Writing outside the scope block: log path + change + why under `## Decisions`, add it to the scope block, continue.

## Architecture Impact
- INV-1: preserves — same permission checks run before the name check; no ownership change.
- INV-2: preserves — the name check reads only the caller's business scope (`scopeFilter`); another business may use the same name.
- INV-3: preserves — the rule lives on the server, in the same request as the write.
- INV-4: preserves — schemas unchanged; the name rule is an extra server check after schema validation.
- INV-5, INV-6: preserves.

## Backend Impact
- Collections affected: products (reads for the check). New collections: no. Server changes needed: yes.

## Atomic Sub-tasks
- [ ] S1: `server/utils/product-name-guard.js` — `findProductNameClash(collection, scope, name, exceptId)` (LIVE docs of that scope, normalized compare with `normalizeProductName` from `price-list-import.js`).
- [ ] S2: Guard POST, PUT (only when the name changed), restore, restore-all (per doc: restore the free ones, keep clashing ones in Trash, return `skipped`), push-to-master (normalized) — 409 `{ error: 'PRODUCT_NAME_TAKEN', messageKey: 'product_duplicate_name_error', nameHebrew }` — `generic.js`.
- [ ] S3: Login sync — Rule 1 skips a master product whose normalized name a LIVE product already has; Rule 2 does not rename a clone into a name another product has — `sync-master.js`.
- [ ] S4: Server tests (see Done-when) — `server/test/`.
- [ ] C1: Client — one helper `isProductNameTaken(err)`; kitchen-state `saveProduct` shows `product_duplicate_name_error` on that 409 instead of the generic error; quick-add, AI create, stub-from-unlinked-line, quick-edit rename and version restore show it too (and a client pre-check against `products_` where the path has a name) — files in scope.
- [ ] D1: `server/scripts/dedupe-business-products.js` (`--target=local|atlas`, dry run by default, `--write`), modelled on `dedupe-master-names.js`; run dry on local, give the Human the write command.
- [ ] V1: Build, server tests, client specs, browser replay, `docs/mvp/runs/485.md`.

## Out of Scope
- A unique DB index (soft-deleted docs share names; a partial index can't express "not deleted").
- Recipes/dishes name uniqueness (already its own rule).
