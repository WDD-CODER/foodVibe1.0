---
name: Form Field-Level Inline Validation
overview: Add red border + Hebrew error message beneath each invalid required field on save attempt, across all 6 form components app-wide
todos: []
isProject: false
---

# Goal

Add field-level inline validation to all forms app-wide: when a required field is empty or invalid on save attempt, show a red border and a specific Hebrew error message beneath that field — in addition to a generic toast.

# Atomic Sub-tasks

## Phase 1 — Shared infrastructure

- [ ] Task 1: `src/styles.scss` — add `.c-field-error` and `.c-input--invalid` / `[aria-invalid="true"]` engine classes using `var(--color-danger)`
- [ ] Task 2: `public/assets/data/dictionary.json` — add `field_required`, `field_name_required`, `field_unit_required`, `field_amount_required`, `field_category_required`, `field_price_required`, `form_has_errors` keys with Hebrew values

## Phase 2 — Form implementation (parallel after Phase 1)

### Stream A — product-form

- [ ] Task 3: `product-form.component.ts` — add `validationErrors_` signal
- [ ] Task 4: `product-form.component.ts` — add `validateForm_()` checking `productName`, `base_unit_`, `buy_price_global_`, `categories_`
- [ ] Task 5: `product-form.component.ts` — wire `validateForm_()` into `onSubmit()`, replace hardcoded Hebrew toast with `form_has_errors` dictionary key
- [ ] Task 6: `product-form.component.html` — add `[class.c-input--invalid]` + `[attr.aria-invalid]` + `@if` error spans on required fields
- [ ] Task 7: `product-form.component.html` — change submit button disabled to `isSaving_()` only (allow save-attempt to trigger validation UI)
- [ ] Task 8: `product-form.component.ts` — reset `validationErrors_` on successful save

### Stream B — recipe-header / recipe-builder

- [ ] Task 9: `recipe-header.component.ts` — add `validationErrors_` signal + public `validate(): boolean` (name_hebrew, yield amount, yield unit)
- [ ] Task 10: `recipe-builder.page.ts` — add `viewChild(RecipeHeaderComponent)`, call `validate()` in `saveRecipe()` and `saveAndWait()`
- [ ] Task 11: `recipe-header.component.html` — add `[class.c-input--invalid]` + `[attr.aria-invalid]` + error spans

### Stream C — equipment-form, supplier-form, venue-form

- [ ] Task 12: `equipment-form.component.ts` — add `validationErrors_` signal + `validateForm_()` + wire into `onSubmit()`
- [ ] Task 13: `equipment-form.component.html` — add error bindings
- [ ] Task 14: `supplier-form.component.ts` — inject `UserMsgService`, add validation signal + method + wire
- [ ] Task 15: `supplier-form.component.html` — add error bindings
- [ ] Task 16: `venue-form.component.ts` — inject `UserMsgService`, add validation signal + method + wire
- [ ] Task 17: `venue-form.component.html` — add error bindings

### Stream D — auth-modal

- [ ] Task 18: `auth-modal.component.html` — add `[class.c-input--invalid]` + `[attr.aria-invalid]` bindings leveraging existing `errorKey` signal

## Phase 3 — Verify

- [ ] Task 19: `ng build` — zero errors
- [ ] Task 20: Save plan + update todo.md

# Rules

- No new components — `.c-field-error` and `.c-input--invalid` are pure engine classes in `styles.scss`
- Signals only — `validationErrors_` must be `signal<Record<string, string>>({})`
- Trailing underscore on private signals
- Do not touch UserMsgService internals (Plan 160 scope)
- `.c-*` engine classes in `src/styles.scss` only
- All error text via `translatePipe` — no hardcoded Hebrew in templates
- `aria-invalid="true"` must be bound on every invalid input
- Use `var(--color-danger)` (not `--color-error` which doesn't exist)
- Use raw `0.75rem` for error text size (no `--text-xs` token exists)

# Done when

- Saving any form with missing required fields shows red border + Hebrew error beneath that field
- Generic toast still fires (`form_has_errors`)
- `ng build` passes with zero errors
- All required fields across product-form, recipe-builder, equipment-form, supplier-form, venue-form, and auth-modal are covered
