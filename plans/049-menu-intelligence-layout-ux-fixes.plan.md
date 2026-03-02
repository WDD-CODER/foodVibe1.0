---
name: Menu Intelligence Layout and UX Fixes
overview: "Six targeted changes on the menu-intelligence page: move meta-column to the opposite side, remove focus borders from all inputs/triggers, move delete icons to the opposite side, ensure info/chevron-up toggle behavior, hide number input spinners, and make food cost read-only (calculated from serving portions)."
---

# Menu Intelligence Layout and UX Fixes

## Scope

All changes are in menu-intelligence.page.html, menu-intelligence.page.scss, and menu-intelligence.page.ts.

---

## a. Meta-column to the other side

Update `.meta-column` to `margin-inline-start: 0; margin-inline-end: auto`.

## b. Remove focus border from all inputs/selects

Remove box-shadow on focus for `.meta-input`, `.meta-input.menu-name-input`, `.meta-trigger`, and `.meta-column ::ng-deep .custom-select-trigger`.

## c. Delete icon to the other side

`.dish-remove`: use `inset-inline-end: 0`. `.section-remove`: use `right: 0` (or `inset-inline-end: 0`).

## d. Dish meta toggle

Already correct (info when closed, chevron-up when open). Verify only.

## e. Remove number input arrows

Add WebKit and Firefox spinner-hide rules to `.dish-field-input-inline` (or number inputs in dish-data).

## f. Food cost read-only

Add `isDishFieldReadOnly(fieldKey)` returning true for `'food_cost_money'`. In template: for read-only fields show span only and do not enter edit mode on click.
