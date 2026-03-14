# Recipe-builder / edit — toFix items (lines 83–91)

## Scope (and toFix.md marking)

- **In scope:** The four bullet points under "recipe-builder / edit" in [public/assets/data/toFix.md](public/assets/data/toFix.md) (lines 85–91).
- **After implementation:** toFix.md is updated as needed; items remain unmarked (no checkboxes).

---

## 1. Change item by clicking on the item's name (ingredient index)

**Goal:** In the ingredient index, when an item is already selected, the user can click the item's name to change it to a different item.

**Approach:** Add `editingNameAtRow_ = signal<number | null>(null)`. When the user clicks the item name, set it to row index and show `app-ingredient-search` with optional `initialQuery` (current name). On itemSelected, patch form, clear editing state, focus quantity. Add optional `initialQuery` input to ingredient-search.

**Files:** recipe-ingredients-table (ts, html), ingredient-search (ts: optional initialQuery).

---

## 2. Align values underneath the title in the ingredient index

**Goal:** Values (unit, quantity, percent, cost) aligned under column titles (centered).

**Approach:** In `.ingredient-grid-row`, for `.col-unit`, `.col-quantity`, `.col-percent`, `.col-cost`, add `justify-content: center`. Follow cssLayer/SKILL.md.

**Files:** recipe-ingredients-table.component.scss.

---

## 3. metrics-square — Fix "Convert in grams to Volume"

**Goal:** Volume total only from ingredients with volume units or defined volume path; no generic 1g=1ml.

**Approach:** In `computeTotalVolumeL`, only add to totalMl when row unit is L/ml or product/recipe has volume (e.g. base_unit_ or purchase_option in ml/L). For other rows with weight only, append to unconvertibleNames instead of adding netG to totalMl.

**Files:** recipe-cost.service.ts.

---

## 4. category-input-box — Search in multi-select container

**Goal:** User can type to filter category options in product-form multi-select.

**Approach:** Add `categorySearchQuery_ = signal('')` and search input at top of category dropdown. Display options = filteredCategoryOptions_ then filter by categorySearchQuery_ (match key or translated label). Keyboard nav over filtered list.

**Files:** product-form.component.ts, product-form.component.html.

---

## 5. Update toFix.md

After implementation: update toFix.md as needed; keep the four items unmarked (no [x]).
