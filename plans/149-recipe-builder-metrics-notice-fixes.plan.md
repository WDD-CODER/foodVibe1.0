# Recipe-builder and metrics notice fixes

## 1. Preserve quantity when changing ingredient by name

When the user changes the item by clicking the name (edit mode), keep the existing quantity; only item (name, referenceId, item_type) and unit change. In `onItemSelected`, when `editingNameAtRow_() === index` use `amount_net: group.get('amount_net')?.value ?? (hasPurchaseOptions ? 1 : 0)`.

**File:** recipe-ingredients-table.component.ts

---

## 2. Fix metrics-notice-floating position (recipe-header)

Position the "items not convertible" panel relative to the whole `.metric-group-weight-volume` so it appears above the entire VOLUME block, centered, without overlapping the value. Move floating div to be direct child of `.metric-group-weight-volume` in template; position in SCSS with bottom: 100%, left: 50%, transform: translateX(-50%).

**Files:** recipe-header.component.html, recipe-header.component.scss

---

## 3. Category-input-box search — clarify

Search was added in Inventory → Add/Edit product → Category dropdown (input at top). Optional: add label or clearer placeholder and ensure search block styling is visible.

**Files:** product-form.component.html, product-form.component.scss
