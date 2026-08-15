# Plan 257 — Two-Tier Product Validation (Red / Yellow)

## Goal
Replace the single "incomplete" red indicator with a two-tier validation system across
the product list and recipe builder ingredient table.

- **Red (blocking / invalid):** missing `name_hebrew` or `base_unit_` — product cannot be used in calculations
- **Yellow (warning / incomplete):** price = 0, no category, or no supplier — product works but data is degraded

---

## Design Summary

### Validation tiers

| Field               | Missing → tier |
|---------------------|----------------|
| `name_hebrew`       | RED (invalid)  |
| `base_unit_`        | RED (invalid)  |
| `buy_price_global_` | YELLOW (incomplete) |
| `categories_`       | YELLOW (incomplete) |
| `supplierIds_`      | YELLOW (incomplete) |

### Badge tooltip
On hover, show a small floating tooltip containing one chip per missing field:
```
[icon] label   [icon] label
```
Each chip = Lucide icon (e.g. `tag` for category, `truck` for supplier, `coins` for price,
`type` for name, `ruler` for unit) + field name text. No verbose sentences.

### Product list row tinting
- Invalid row → `color-mix(in srgb, var(--color-danger) 4%, transparent)` background on all cells
- Incomplete row → `color-mix(in srgb, var(--color-warning) 5%, transparent)` background on all cells
- Subtle but scannable at a glance

### Recipe builder
- **Blocking rows** (red): unresolved name (no referenceId), unlinked referenceId (not in pool), or referenced product is `invalid` tier
- **Warning rows** (yellow): referenced product is `incomplete` tier only
- Save is **blocked** when any blocking row exists — inline error shown; warning rows allow save

---

## Atomic Sub-tasks

### Task 1 — `src/app/core/utils/product-validation.util.ts` *(new file)*
Create a pure utility with two exports:

```ts
export type ProductValidationStatus = 'invalid' | 'incomplete' | 'valid'

export function getProductValidationStatus(product: Product): ProductValidationStatus
// invalid  → !name_hebrew || !base_unit_
// incomplete → price === 0/null || !categories_.length || !supplierIds_.length
// valid → all above pass

export function getProductMissingFields(product: Product): string[]
// returns array of i18n keys: e.g. ['missing_price', 'missing_category', 'missing_supplier']
```

### Task 2 — `inventory-product-list.component.ts`
- Import `getProductValidationStatus`, `getProductMissingFields`
- Expose `getValidationStatus(product)` and `getMissingFields(product)` helper methods on the component
- Add two boolean filter signals: `showInvalidOnly_ = signal(false)` and `showIncompleteOnly_ = signal(false)`
- Update `filteredProducts_` computed to apply these filters (OR logic: if both active, show either tier)
- Update `hasActiveFilters_()` to include these signals

### Task 3 — `inventory-product-list.component.html`
- In the `col-name` cell, after `low-stock-badge`, add:
  ```html
  @if (getValidationStatus(product) === 'invalid') {
    <span class="validation-badge validation-badge--invalid" [class.has-tooltip]="true">
      <lucide-icon name="alert-circle" [size]="12"></lucide-icon>
      <span class="validation-tooltip">
        @for (field of getMissingFields(product); track field) {
          <span class="tooltip-chip">
            <lucide-icon [name]="getFieldIcon(field)" [size]="11"></lucide-icon>
            {{ field | translatePipe }}
          </span>
        }
      </span>
    </span>
  } @else if (getValidationStatus(product) === 'incomplete') {
    <span class="validation-badge validation-badge--incomplete" ...>
      <lucide-icon name="alert-triangle" [size]="12"></lucide-icon>
      ...
    </span>
  }
  ```
- Add `[class.row--invalid]` and `[class.row--incomplete]` to `.product-grid-row` div
- In `shell-filters`, add two checkbox filter options for "Invalid" and "Incomplete" above the existing category filters (or as a dedicated "Status" filter section)

### Task 4 — `inventory-product-list.component.scss`
Add inside `@layer components.inventory-product-list`:

```scss
// Row tints (applied via class on .product-grid-row — affects cells via :has or direct child selector)
.product-grid-row.row--invalid .c-list-body-cell {
  background: color-mix(in srgb, var(--color-danger) 4%, transparent);
}
.product-grid-row.row--incomplete .c-list-body-cell {
  background: color-mix(in srgb, var(--color-warning) 5%, transparent);
}

// Badge
.validation-badge {
  position: relative;
  display: inline-flex;
  align-items: center;
  margin-inline-end: 0.25rem;
  cursor: default;

  &--invalid  { color: var(--color-danger); }
  &--incomplete { color: var(--color-warning); }
}

// Tooltip
.validation-tooltip {
  display: none;
  position: absolute;
  top: calc(100% + 4px);
  inset-inline-start: 50%;
  transform: translateX(-50%);
  z-index: 10;
  gap: 0.25rem;
  padding: 0.375rem 0.5rem;
  background: var(--bg-popover);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-md);
  white-space: nowrap;
  flex-direction: row;
  flex-wrap: wrap;
}

.validation-badge:hover .validation-tooltip {
  display: flex;
}

// Tooltip chips
.tooltip-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  font-size: 0.6875rem;
  font-weight: 500;
  border-radius: var(--radius-xs);

  .validation-badge--invalid & {
    background: color-mix(in srgb, var(--color-danger) 10%, transparent);
    color: var(--color-danger);
  }

  .validation-badge--incomplete & {
    background: color-mix(in srgb, var(--color-warning) 10%, transparent);
    color: var(--color-warning);
  }
}
```

### Task 5 — `recipe-ingredients-table.component.ts`
Refactor `isIncompleteRow(group)`:

```ts
/** True when the row cannot be saved — must be resolved before recipe can be saved. */
isBlockingRow(group: FormGroup): boolean {
  // Unresolved: AI-added name with no referenceId
  if (group.get('name_hebrew')?.value && !group.get('referenceId')?.value) return true
  const refId = group.get('referenceId')?.value as string | null
  if (!refId) return false
  const pool = ...
  const found = pool.find(x => x._id === refId)
  // Unlinked: referenceId not found
  if (!found) return true
  // Product is invalid tier (missing name or unit)
  if (group.get('item_type')?.value === 'product') {
    return getProductValidationStatus(found as Product) === 'invalid'
  }
  return false
}

/** True when the row is resolved but product has incomplete data (warning tier). */
isWarningRow(group: FormGroup): boolean {
  if (this.isBlockingRow(group)) return false
  const refId = group.get('referenceId')?.value as string | null
  if (!refId || group.get('item_type')?.value !== 'product') return false
  const product = this.kitchenStateService.products_().find(p => p._id === refId)
  if (!product) return false
  return getProductValidationStatus(product) === 'incomplete'
}

/** Expose for recipe-builder save guard. */
hasBlockingRows(): boolean {
  return this.ingredientGroups.some(g => this.isBlockingRow(g))
}
```

Remove old `isIncompleteRow()` or keep as alias delegating to `isBlockingRow || isWarningRow` if still referenced externally.

### Task 6 — `recipe-ingredients-table.component.html`
- Replace `[class.incomplete-row]="isIncompleteRow(group)"` with `[class.incomplete-row]="isBlockingRow(group)"` and add `[class.warning-row]="isWarningRow(group)"`
- Replace `@if (isIncompleteRow(group))` with `@if (isBlockingRow(group) || isWarningRow(group))`
- Inside the badge, conditionally apply `incomplete-badge` vs `warning-badge` class based on which tier

### Task 7 — `recipe-ingredients-table.component.scss`
Add `.warning-row` and `.warning-badge` mirroring the existing red styles but using warning tokens:

```scss
&.warning-row {
  border: 1px solid var(--color-warning);
  background: color-mix(in srgb, var(--color-warning) 6%, var(--bg-muted));
}

.warning-badge {
  // same dimensions as .incomplete-badge
  // color: var(--color-warning) instead of var(--color-danger)
  animation: warning-pulse 3s ease-in-out infinite; // slower pulse = less urgent
}

@keyframes warning-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
```

### Task 8 — `recipe-builder.page.ts`
In `saveRecipe()`, after `this.recipeForm_.invalid || !headerValid` check, add:

```ts
const ingredientTable = this.recipeIngredientsTableRef_()  // @ViewChild
if (ingredientTable?.hasBlockingRows()) {
  this.saving.setSaving(false)
  // set an error signal that the template displays
  this.blockingIngredientsError_.set(true)
  return
}
```

Add a signal `blockingIngredientsError_ = signal(false)` and clear it when user resolves rows.
Wire a visible inline error message near the save button: "Some ingredients are invalid — fix or remove them before saving."

### Task 9 — Translation files
Add to all translation JSON files (he, en, etc.):

```json
"missing_price": "מחיר",
"missing_category": "קטגוריה",
"missing_supplier": "ספק",
"missing_name": "שם",
"missing_unit": "יחידה",
"product_invalid": "מוצר לא תקין",
"product_incomplete": "מוצר חסר פרטים",
"blocking_ingredients_error": "יש רכיבים לא תקינים — יש לתקן או להסיר לפני השמירה",
"filter_invalid": "לא תקינים",
"filter_incomplete": "חסרי פרטים"
```

---

## Files Touched

| File | Change |
|------|--------|
| `src/app/core/utils/product-validation.util.ts` | NEW |
| `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts` | Edit |
| `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html` | Edit |
| `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.scss` | Edit |
| `src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts` | Edit |
| `src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.html` | Edit |
| `src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.scss` | Edit |
| `src/app/pages/recipe-builder/recipe-builder.page.ts` | Edit |
| `src/assets/i18n/*.json` (he, en) | Edit |

---

## Branch
`fix/recipe-false-dirty-dialog` is already active — consider branching to `feat/product-validation-two-tier` for isolation.
