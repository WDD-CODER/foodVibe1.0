# Plan 282 — Mobile audit fix: dropdown-z-index

## Problem
Dropdown panels across the app have three related issues:
1. **Critical (DEF-IE-01):** Category dropdown in inventory-edit stays open after selection and applies a second tag (implicit multi-select) — data integrity risk
2. **Critical (single-flow, grouped here):** inventory-edit stale duplicate-name validator fires on load for an existing product, falsely blocking save
3. **Major:** Dropdowns don't dismiss on Escape key (global, affects ng-select and custom dropdowns)
4. **Major:** Dropdown panels don't flip upward when near viewport bottom — last options and "הוסף" hidden
5. **Major:** Labels dropdown overlaps ingredient table with no boundary

## Scope
**Files to modify:**
- Inventory edit/add product component TS — fix category dropdown close-on-select; fix stale duplicate-name validator
- `src/styles.scss` — global Escape dismiss for ng-select / `.c-dropdown` panels (if missing)
- Inventory product SCSS — dropdown panel max-height + upward flip rule

**Out of Scope:**
- No new dropdown component
- No changes to ng-select library itself
- No changes to recipe-book filter dropdowns (minor severity — deferred)

## Defects covered
| Flow | Selector | Fix approach |
|---|---|---|
| inventory-edit-product | category dropdown | Close dropdown on selection in TS handler; ensure single-select mode in template |
| inventory-edit-product | duplicate-name validator | Fix validator to exclude current product's own name from uniqueness check |
| inventory-add-product | all dropdowns | Global Escape dismiss via `(keydown.escape)` handler or ng-select `closeOnEsc` config |
| recipe-builder-new-dish | תוויות labels dropdown | Escape dismiss fix (same global handler) |
| inventory-edit-product | category dropdown panel | Add `max-height + overflow-y: auto`; add upward-flip `@media` when near bottom |

## Requirements
1. Category dropdown closes after user selects a value — no dual-tag applied
2. Edit form load: no false "duplicate name" error for existing product's unchanged name
3. Escape key dismisses any open dropdown across the app
4. Category dropdown panel shows all options without clipping (scrolls or flips upward)
5. `ng build` passes with 0 errors

## Atomic Sub-tasks
- [x] Find inventory edit product component TS — `Glob src/app/pages/inventory/**/*.ts` then read the file that handles category selection
- [x] Inventory component TS — locate `onCategorySelect` or `(ngModelChange)` for category field; ensure dropdown panel closes after selection (call `categoryDropdown.close()` or set `closeOnSelect: true`)
- [x] Inventory component template — verify category ng-select has `[multiple]="false"` or no `[multiple]` attribute; remove if present
- [x] Inventory component TS — locate duplicate-name validator; add exclusion for current product ID: `products.filter(p => p._id !== this.currentProductId).some(p => p.name === value)`
- [x] `src/styles.scss` — search for global Escape handler on `.ng-dropdown-panel` or ng-select; if missing, add `ng-select` config `closeOnEsc: true` or global `(document:keydown.escape)` service call
- [x] Inventory product SCSS — add `@media (max-width: 620px)` rule for category dropdown: `max-height: 40vh; overflow-y: auto`; add upward-flip logic (position absolute; `bottom: 100%` when near viewport bottom)
- [x] Run `ng build` — must be 0 errors
- [x] Re-run `/mobile-flow-audit --only inventory-edit-product --only inventory-add-product --only recipe-builder-new-dish`
- [x] Update TRIAGE.md — mark Cluster 8 (dropdown-z-index) defects as ✓ resolved (plan 282); mark DEF-IE-02 in single-flow-bug cluster as ✓ resolved (plan 282)

## Validation (mobile)
- Viewport 375×812 RTL
- Inventory edit: select "בשר" from category → dropdown closes, only "בשר" tag shown (not two tags)
- Inventory edit load: no red "כבר קיים" error on pristine load
- Any dropdown: press Escape → dropdown closes
- Category dropdown with 10+ options: scroll shows all options; "הוסף" button accessible

## Notes
- If `.scss` file is touched → `.claude/skills/cssLayer/SKILL.md` first
- The TS validator fix is a logic change, not a style change — no cssLayer applies
- Be careful: if the category field genuinely supports multiple categories, do NOT force single-select; verify the data model first before changing `[multiple]`
