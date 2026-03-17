# Recipe builder UX fixes

## 1. Ingredients table – unit select border and layout

**Files:** `src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.scss`, `recipe-ingredients-table.component.html`

- **Remove border of select in unit column:** Override only in the table context: in `recipe-ingredients-table.component.scss`, use a selector that pierces encapsulation (e.g. `:host ::ng-deep .col-unit .custom-select-trigger`) to set `border: none` (and optionally `box-shadow: none` on focus). Follow cssLayer SKILL and use existing tokens where applicable.
- **Same height for value containers:** Give value columns (`.col-quantity`, `.col-unit`, `.col-percent`, `.col-cost`) a consistent min-height so all rows stay aligned. Keep `.col-name` flexible.
- **Header: center non-text columns:** In `.ingredients-grid-header`, add `text-align: center` to `.col-quantity`, `.col-unit`, `.col-percent`, `.col-cost`; keep `.col-name` start-aligned.

---

## 2. Logistics tool search width – 20% smaller

**File:** `src/app/pages/recipe-builder/recipe-builder.page.scss`

- Reduce `.logistics-tool-search-wrap` from `66.67%` to ~`53.33%` (flex and max-width).

---

## 3. "Add new tool" as last option in dropdown

**File:** `src/app/pages/recipe-builder/recipe-builder.page.html`

- Move the "Add new tool" `<li>` to the **bottom**: render the `@for (eq of filteredLogisticsTools_(); ...)` block first, then the single `<li class="logistics-tool-option logistics-tool-add-new">`.

---

## 4. Collapsible section cards (default collapsed, expand button, header toggles)

**Scope:** All section cards **except** the first (recipe header). Affected: **table-logic**, **workflow-logic**, **logistics-logic**.

**Files:** `recipe-builder.page.html`, `recipe-builder.page.ts`, `recipe-builder.page.scss`

- **State:** Add per-section collapsed state (e.g. three signals default `true`). Toggle when user clicks section header or expand/collapse button.
- **Markup:** `.section-card-header` (clickable: title + corner chevron button); `.section-card-body` (content). When collapsed, hide body.
- **Styling:** `.section-card.collapsible.is-collapsed .section-card-body { display: none; }`; header affordance (chevron). Follow cssLayer.

---

## Summary of file changes

| Area | File | Changes |
|------|------|--------|
| Table | recipe-ingredients-table.component.scss | Unit trigger border; value col height; center header cells except col-name |
| Logistics search | recipe-builder.page.scss | .logistics-tool-search-wrap ~53.33% |
| Add new at bottom | recipe-builder.page.html | @for first, then "add new" li |
| Collapsible | recipe-builder.page.html | Header/body structure + bindings for table, workflow, logistics |
| Collapsible | recipe-builder.page.ts | Collapsed signals + toggle methods |
| Collapsible | recipe-builder.page.scss | .section-card-header, .section-card-body, .is-collapsed |
