---
name: Incomplete Product Badge + Three-Option Guard Modal + AI-Prefill Guard Fix
overview: Add warning badge on skeleton-product ingredients, upgrade ConfirmModalService to support ternary (Cancel/Save/Leave) flow, and fix canDeactivate guard for new/AI-prefilled recipes.
todos:
  - "[x] recipe-ingredients-table: Router inject + isProductIncomplete + navigateToEditProduct"
  - "[x] recipe-ingredients-table HTML: incomplete-row class + incomplete-badge button"
  - "[x] recipe-ingredients-table SCSS: .incomplete-row, .incomplete-badge, pulse animation"
  - "[x] dictionary.json: product_incomplete_hint"
  - "[x] confirm-modal.service.ts: openTernary(), showSaveButton, saveButtonLabel, ConfirmModalResult"
  - "[x] confirm-modal.component.html: string choose() calls + conditional 3rd button"
  - "[x] pending-changes.guard.ts: saveAndWait interface + ternary vs binary flow"
  - "[x] recipe-builder.page.ts: saveAndWait() method"
  - "[x] dictionary.json: save_and_leave, error_saving_recipe"
  - "[x] confirm-modal.component.spec.ts: update mock + assertions"
  - "[x] recipe-builder.page.ts: hasRealChanges() failsafe-only for new recipes"
isProject: false
---

# Plan 239 — Incomplete Product Badge + Three-Option Guard Modal + AI-Prefill Guard Fix

## Goal

Three improvements to the recipe-builder:

1. **Incomplete product badge** — Show a pulsing danger-colored `alert-triangle` icon on ingredient rows linked to products with `buy_price_global_ === 0`. Clicking navigates to product edit.
2. **Three-option unsaved changes modal** — Upgrade `ConfirmModalService` with `openTernary()` for Cancel / Save & Leave / Leave without saving. Wire into `pendingChangesGuard`.
3. **AI-prefill guard fix** — Ensure `hasRealChanges()` fires for new/AI-prefilled recipes using failsafe checks (name or ingredient referenceId present).

## Atomic Sub-tasks

- [ ] `recipe-ingredients-table.component.ts` — Add `Router` import, `router_ = inject(Router)`, `isProductIncomplete()`, `navigateToEditProduct()`
- [ ] `recipe-ingredients-table.component.html` — Add `[class.incomplete-row]` + `@if (isProductIncomplete)` badge button inside `selected-item-display`
- [ ] `recipe-ingredients-table.component.scss` — Add `&.incomplete-row` inside `.selected-item-display`, add `.incomplete-badge` block + `@keyframes incomplete-pulse`; fix flex layout for 3-child row
- [ ] `dictionary.json` — Add `product_incomplete_hint`
- [ ] `confirm-modal.service.ts` — Full rewrite: add `openTernary()`, `showSaveButton`, `saveButtonLabel`, `ConfirmModalResult` type; `choose()` accepts boolean or string
- [ ] `confirm-modal.component.html` — Replace `choose(false/true)` with string values; add conditional save button
- [ ] `pending-changes.guard.ts` — Full rewrite: add `saveAndWait` to interface; ternary flow for recipe-builder, binary flow for others
- [ ] `recipe-builder.page.ts` — Add `saveAndWait()` method below `hasRealChanges()`
- [ ] `dictionary.json` — Add `save_and_leave`, `error_saving_recipe`
- [ ] `confirm-modal.component.spec.ts` — Add `showSaveButton`/`saveButtonLabel` to mock; update assertions to `'cancel'`/`'confirm'`
- [ ] `recipe-builder.page.ts` — Replace `hasRealChanges()` with failsafe-only approach for new recipes (amended: no `getEmptyFormSnapshot_`, no ngOnInit change)

## Constraints

- Do NOT touch `getItemMetadata()` — it already works correctly
- Do NOT add badge to cook-view, only recipe-builder ingredients table
- Use `var(--color-danger)` — no raw hex colors (except `--color-danger-hover` fallback)
- `AlertTriangle` is already registered in `app.config.ts` — do NOT add again
- `open()` MUST remain backward-compatible — returns `Promise<boolean>`
- Single quotes in TS, double quotes in HTML
- `getEmptyFormSnapshot_()` NOT needed — failsafes in `hasRealChanges()` are sufficient and avoid snapshot key-mismatch regression

## Verification

```bash
npx ng build 2>&1 | tail -20
grep -n 'isProductIncomplete' src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts
grep -n 'incomplete-badge' src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.html
grep 'product_incomplete_hint' src/assets/i18n/dictionary.json
grep -n 'openTernary' src/app/core/services/confirm-modal.service.ts
grep -n 'saveAndWait' src/app/core/guards/pending-changes.guard.ts
grep -n 'saveAndWait' src/app/pages/recipe-builder/recipe-builder.page.ts
grep 'save_and_leave\|error_saving_recipe' src/assets/i18n/dictionary.json
```
