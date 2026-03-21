# Plan 193 — Duplicate Name Validation: Venues & Suppliers

## Status
Ready for approval

## Problem
QA test file (`plans/test_md.md`, steps 1 & 2) confirmed that duplicate venue names and duplicate supplier names are accepted on save. The form only has `Validators.required`; there is no case-insensitive, trimmed comparison against existing records.

All other issues in `test_md.md` (steps 3–17) were verified as **already solved** in the codebase:
- Spinner/loader on save: uses `useSavingState()` on all pages.
- `app-counter` features: long-press, decimal 0.01, integer-only, min enforcement all present.
- Bulk delete selection bar: `SelectionBarComponent` wired on all list pages.

## Root Cause
`item.validators.ts` contains `duplicateNameValidator()` but it is typed against `Product[]` only. It is applied to the inventory product form but was never extended to venues or suppliers.

## Solution
1. Generalize the validator to a generic `duplicateEntityNameValidator<T>` that accepts any entity with `{ name_hebrew: string; _id: string }`.
2. Apply it to `venue-form.component.ts` (new + edit).
3. Apply it to `supplier-form.component.ts` (new + edit, both route-resolver mode and embedded modal mode).
4. Show the validation error in both HTML templates.
5. Update `test_md.md` steps 1 & 2 to `Solved`.

## Approach Detail

### Validator generalization
Add a second export to `src/app/core/validators/item.validators.ts`:
```typescript
export function duplicateEntityNameValidator<T extends { name_hebrew: string; _id: string }>(
  itemsSignal: () => T[],
  currentId?: string | null | (() => string | null)
): ValidatorFn
```
Keep the existing `duplicateNameValidator` unchanged (used by inventory product form).

### Venue form
- Inject `VenueDataService` (already injected — no new injection needed).
- In `buildForm()` add the new validator to `name_hebrew`:
  ```typescript
  duplicateEntityNameValidator(
    () => this.venueData.allVenues_(),
    () => (this.route.snapshot.data['venue'] as VenueProfile)?._id ?? null
  )
  ```
- In the template, show `שם מקום כבר קיים` when `name_hebrew.errors?.['duplicateName']` is truthy.

### Supplier form
- `SupplierDataService` already injected.
- In `buildForm()` add the validator to `name_hebrew`:
  ```typescript
  duplicateEntityNameValidator(
    () => this.supplierData.allSuppliers_(),
    () => {
      if (!this.isEditMode_()) return null
      if (this.embeddedInDashboard()) return this.supplierToEdit()?._id ?? null
      return (this.route.snapshot.data['supplier'] as Supplier)?._id ?? null
    }
  )
  ```
- In the template, show `שם ספק כבר קיים` when `name_hebrew.errors?.['duplicateName']` is truthy.

## Files Changed
| File | Change |
|------|--------|
| `src/app/core/validators/item.validators.ts` | Add generic `duplicateEntityNameValidator` |
| `src/app/pages/venues/components/venue-form/venue-form.component.ts` | Add validator + import |
| `src/app/pages/venues/components/venue-form/venue-form.component.html` | Show duplicate error |
| `src/app/pages/suppliers/components/supplier-form/supplier-form.component.ts` | Add validator + import |
| `src/app/pages/suppliers/components/supplier-form/supplier-form.component.html` | Show duplicate error |
| `plans/test_md.md` | Update steps 1 & 2 to Solved |

## Atomic Sub-tasks
- [ ] S1 — Add `duplicateEntityNameValidator` to `item.validators.ts`
- [ ] S2 — Apply validator + show error in venue-form (ts + html)
- [ ] S3 — Apply validator + show error in supplier-form (ts + html)
- [ ] S4 — Update `test_md.md` steps 1 & 2 status to Solved

## Critical Questions
No blockers — pattern is clear from existing `duplicateNameValidator` usage.

## How to Verify (Phase 5)
1. Go to `/venues/new` — create a venue. Then try to create another with the exact same name (or same name with different casing/spaces) → save button stays disabled, error message shows.
2. Go to `/venues/:id/edit` — editing an existing venue does NOT show duplicate error for its own name.
3. Go to `/suppliers/new` — create a supplier. Try duplicate name → blocked with error.
4. Go to `/suppliers/:id/edit` — editing its own name → no false-positive duplicate error.
5. Open supplier modal (dashboard embed) with an existing supplier — edit name to a different duplicate → blocked.
