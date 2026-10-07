# Plan 341 — Suppliers: add/edit as a page like venues; center the venues inner nav

Status: active
Snapshot: acab8cff39fd0240f67af00439a8bd044c23889e

## Problem Statement

Adding a supplier opens a global modal. `SupplierListComponent.onAdd()` (`supplier-list.component.ts:~272`) and the hero-fab action (`:~156`) both call `SupplierModalService.openAdd()`, which shows `<app-supplier-modal>` (mounted under `@defer` in `src/app/appRoot/app.component.html:~38`) wrapping `<app-supplier-form [embeddedInDashboard]="true">`. Editing is an inline row edit (`onEdit()`, `editingId_`, `hydrateEditForm`).

Dandan wants supplier add and edit to be a page, like venues. Venues uses routed `/venues/add` and `/venues/edit/:id`, with a `VenuesPage` shell that has a `.venues-nav` back bar, and `VenueFormComponent` with `.venue-form-container` / `.form-section` / `.c-form-actions`. The supplier routes `/suppliers/add` and `/suppliers/edit/:id` already exist (`app.routes.ts:~202-210`), and `SupplierFormComponent` has a full-page branch. `SuppliersPage` is a bare `<router-outlet>` with no back bar.

Also, `.venues-nav` (`venues.page.scss`) has no `justify-content`, so it hugs the RTL start edge instead of being centered. `.venue-form-container` (`max-width:35rem`) and `.supplier-form-container` (`max-width:32rem`) aren't centered either.

## Goals & Success Criteria

- Primary: supplier add and edit happen on `/suppliers/add` and `/suppliers/edit/:id`, which look and behave like the venue form pages.
- Primary: the venues and suppliers inner nav bars and form cards are centered.
- Success: `SupplierModalService` and `SupplierModalComponent` are deleted. The product-form "add supplier" flow (`AddSupplierFlowService`) still works.

## Execution Mode

- Parallel: yes
- Concurrent plans: run after the toggle-chip engine plan (plan 339 — shared supplier-list and venue-list), and before the form-checkboxes plan (plan 342).
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/suppliers/**
src/app/pages/venues/venues.page.*
src/app/pages/venues/components/venue-form/venue-form.component.scss
src/app/shared/supplier-modal/**
src/app/core/services/supplier-modal.service.ts
src/app/core/services/supplier-modal.service.spec.ts
src/app/appRoot/app.component.html
src/app/appRoot/app.component.ts
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html
src/app/pages/inventory/components/product-form/product-form.component.scss
src/app/shared/breadcrumbs.md
src/app/core/services/breadcrumbs.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

- As a chef, I want adding or editing a supplier to feel the same as adding or editing a venue: a clear full page with a back button.

## Functional Requirements

### Must Have (P0)

- [x] `onAdd()` and the hero-fab "add supplier" action → `router.navigate(['/suppliers/add'])`, keeping the `requireAuth()` guard.
- [x] Row edit → `router.navigate(['/suppliers/edit', item._id])`. Remove the inline edit (`editingId_`, `editForm_`, `hydrateEditForm`, `saveCurrentInlineEdit`, its template block and styles) per Critical Question 1 default.
- [x] `SuppliersPage` gets a `.suppliers-nav` back bar on non-list routes, cloned from `VenuesPage`: `isListRoute_`, `goBackToList()`, `navRoutes_` with `add_supplier`. Its `:host` padding matches venues.
- [x] `SupplierFormComponent` full-page branch: structure and classes mirror venue-form (`.form-header`, `.form-section`, `.form-group`, `.c-form-actions`). Save and cancel go back to `/suppliers/list` (already at `:186-211`).
- [x] Delete `SupplierModalComponent`, `SupplierModalService` (plus specs) and the `<app-supplier-modal>` `@defer` block in `app.component.html`. Drop the `embeddedInDashboard` branch from `SupplierFormComponent` if nothing else uses it (grep first).
- [x] Centering: `.venues-nav` and `.suppliers-nav` get `justify-content:center`; `.venue-form-container` and `.supplier-form-container` get `margin-inline:auto`. Both containers use the same `max-width` (35rem).

### Should Have (P1)

- [ ] (skipped — needs a non-append edit of the existing suppliers routes; not trivial) The `pendingChangesGuard` (as used by product-form) on `suppliers/edit/:id` and `suppliers/add`, if the form exposes dirty state. That's a route addition to `app.routes.ts` (append-only: adding `canDeactivate` to the existing entry needs escalation; skip if not trivial).

### Nice to Have (P2)

- None.

## UI/UX Notes

- Back button label: `supplier_list` key if it exists, otherwise add `supplier_list` = "רשימת ספקים".
- `add_supplier` key: check and reuse.
- Mobile: the form card is full-width with the 16px gutter; actions sit at the bottom, clear of the bottom bar (`:host` padding as in venues).

## Atomic Sub-tasks

- [x] A1: `SuppliersPage` back bar plus centering styles; venues centering (`src/app/pages/suppliers/suppliers.page.*`, `src/app/pages/venues/venues.page.scss`, `venue-form.component.scss`)
- [x] A2: Route add and edit to pages; remove inline edit from supplier-list (`supplier-list.component.*`)
- [x] A3: Align the supplier-form full-page markup and styles with venue-form (`supplier-form.component.*`)
- [x] A4: Delete the supplier modal, its service and mount; grep for leftovers (`shared/supplier-modal/**`, `supplier-modal.service*`, `app.component.*`)
- [x] A5: Build, specs, e2e grep for supplier-modal. Update the session-state file.
- [x] A6 (review fallout): supplier save button no longer grows (loader removed); new supplier lands on list searched by name + success toast (session-restored filters hid it); `min_order` dictionary key
- [x] A7 (Human request): mobile carousels — supplier min_order, recipe-book cost, inventory unit moved into the cell carousel; supplier desktop grid gets its missing 9th track
- [x] A8 (Human request): product-form mobile — nested media rules never matched (`.form-container .form-container`); form grid item gets `min-width:0`

## Technical Considerations

- Dependencies: `SupplierListComponent`, `SupplierFormComponent`, `SuppliersPage`, `VenuesPage`, `HeroFabService`, `RequireAuthService`. `AddSupplierFlowService` (used by product-form) is a separate flow; don't touch it, and verify it still works.
- New files: none.
- Model changes: none.

## Out of Scope

- The supplier list filter restyle (done in the toggle-chip plan, 339).
- Checkbox → chip in the supplier form delivery days (form-checkboxes plan, 342).
- Product-form's quick add-supplier popup.

## Critical Questions

1. Supplier edit:
   - a) Edit button opens `/suppliers/edit/:id`; remove the inline row edit (default, matches venues)
   - b) Keep the inline row edit on desktop, use the page on mobile only

## Success Criteria

- [x] [auto] `rg -n "SupplierModal|app-supplier-modal|supplier-modal" src/app` → no matches.
- [x] [auto] `npx ng test --watch=false --include=src/app/pages/suppliers/**/*.spec.ts --include=src/app/pages/venues/**/*.spec.ts` → 0 failures.
- [x] [auto] `npm run build` → exit 0.
- [x] [human] Phone: Suppliers → + → a full page with "רשימת ספקים" back button, centered → fill and save → back on the list with the new supplier. Edit opens the same page with the data.
- [x] [human] Venues → add venue: the inner nav bar and form card are centered.
- [x] [human] Product form → add supplier still works.
