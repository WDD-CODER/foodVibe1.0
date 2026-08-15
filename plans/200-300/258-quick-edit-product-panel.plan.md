---
name: Quick-Edit Product Panel (Recipe Builder)
overview: Inline panel to fix incomplete/invalid products from within the recipe builder — no page navigation required.
isProject: false
---

# Goal
Replace `navigateToEditProduct()` on both badge buttons in the recipe ingredients table with an inline quick-edit panel. Desktop gets an accordion below the row; mobile gets a modal overlay. Both edit the same 5 product fields (name, base unit, category, price, supplier) and save via `ProductDataService.updateProduct()`.

# Atomic Sub-tasks

## New Files
- [ ] Create `src/app/core/services/quick-edit-product-modal.service.ts` — service driving the mobile modal
- [ ] Create `src/app/shared/quick-edit-product-panel/quick-edit-product-panel.component.ts` — 5-field form, shared between accordion and modal
- [ ] Create `src/app/shared/quick-edit-product-panel/quick-edit-product-panel.component.html`
- [ ] Create `src/app/shared/quick-edit-product-panel/quick-edit-product-panel.component.scss`
- [ ] Create `src/app/shared/quick-edit-product-modal/quick-edit-product-modal.component.ts` — modal shell for mobile
- [ ] Create `src/app/shared/quick-edit-product-modal/quick-edit-product-modal.component.html`
- [ ] Create `src/app/shared/quick-edit-product-modal/quick-edit-product-modal.component.scss`

## App Shell Registration
- [ ] Edit `src/app/appRoot/app.component.ts` — add QuickEditProductModalComponent to imports
- [ ] Edit `src/app/appRoot/app.component.html` — add <app-quick-edit-product-modal/>

## RecipeIngredientsTableComponent
- [ ] Edit `recipe-ingredients-table.component.ts` — add BreakpointObserver, toSignal, map, signals, getProductForGroup, onQuickEditBadgeClick, onQuickEditSaved
- [ ] Edit `recipe-ingredients-table.component.html` — replace badge click handlers, add accordion @if block with .quick-edit-accordion wrapper
- [ ] Edit `recipe-ingredients-table.component.scss` — add .quick-edit-accordion { grid-column: 1 / -1 }

# Constraints
- Accordion panel must be inside the cdkDrag element (not a sibling) to avoid CDK index remapping
- grid-column: 1 / -1 is required on the accordion wrapper — ingredient-grid-row uses display: grid with 7 columns
- Saving must NOT mark the recipe form as dirty (isDirty)
- Plan 257 (isBlockingRow, isWarningRow, getProductValidationStatus) already implemented — do not re-implement

# Done When
- Clicking red badge on an ingredient row opens inline accordion (desktop) or modal (mobile) — does not navigate
- Clicking yellow badge does the same
- Panel shows 5 fields pre-filled with current product values
- Save calls ProductDataService.updateProduct() → store updates → line costs refresh automatically
- Badge disappears after a valid price is saved
- Error on save shows inline message, panel stays open
- "Full edit" link navigates to /inventory/edit/:id
