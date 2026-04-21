# Plan 277 — Mobile audit fix: ingredient-grid-mobile

## Problem
The recipe-builder ingredient grid's `@media (max-width: 640px)` block explicitly hides `col-actions` (the delete button) and `col-drag` (drag handle) by setting `display: none`. It also hides `col-percent`. This means on mobile:
- Users cannot delete individual ingredient rows (C2 — critical)
- Drag reordering is inaccessible (C4 — critical, but CDK drag is not usable on touch anyway)
- In dish mode, `.col-prep-actions` is hidden by the same pattern (DC1 — critical)
- `.col-percent` waste % data is absent (M5 — major)

All four critical defects trace to one SCSS file, one media-query block.

## Scope
**Files to modify:**
- `src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.scss` — `@media (max-width: 640px)` block (lines 471–539)

**Out of Scope:**
- No template changes
- No CDK drag restoration on mobile (touch drag is inaccessible regardless — `col-drag` stays hidden)
- No changes to the `@container ingredients (max-width: 520px)` block (it already shows col-actions)
- No changes to `.col-prep-actions` template logic — only SCSS responsive rules

## Defects covered
| Flow | Selector | Fix approach |
|---|---|---|
| recipe-builder-new-prep | `.col-actions` in `.ingredient-grid-row` | Show in mobile grid — add 5th column |
| recipe-builder-new-prep | `.col-drag` | Keep `display: none` — CDK drag not usable on mobile touch |
| recipe-builder-new-prep | `.col-percent` | Show in mobile grid (was hidden — defer if layout too tight; see notes) |
| recipe-builder-new-dish | `.col-prep-actions` in `.prep-grid-row` | Verify same fix applies to prep grid rows |
| recipe-builder-edit | `.col-actions` | Same fix (shared component) |

## Requirements
1. Delete button (`.col-actions .c-icon-btn`) is visible and tappable (≥ 44px) on mobile ingredient rows
2. Delete button always visible without hover (mobile has no hover state)
3. Ingredient row height remains readable with the extra column
4. `ng build` passes with 0 errors

## Atomic Sub-tasks
- [ ] `recipe-ingredients-table.component.scss` — read cssLayer skill: `src/.claude/skills/cssLayer/SKILL.md` (this file uses no `@layer`, component-local SCSS)
- [ ] Same file, inside `@media (max-width: 640px)` block — change grid template from `1fr 5rem 4rem 3.5rem` to `1fr 5rem 4rem 3.5rem 2.75rem` (add 5th column for actions, 44px = 2.75rem)
- [ ] Same block — replace `.col-percent, .col-actions { display: none; }` with:
  ```scss
  .col-percent { display: none; }
  .col-actions {
    grid-column: 5;
    grid-row: 1;
    min-height: auto;
    justify-content: center;
    .c-icon-btn {
      opacity: 1;
      min-width: 2.75rem;
      min-height: 2.75rem;
    }
  }
  ```
- [ ] Run `ng build` — must be 0 errors
- [ ] Re-run `/mobile-flow-audit --only recipe-builder-new-prep --only recipe-builder-new-dish`
- [ ] Update `.claude/reports/mobile-audit/TRIAGE.md` — mark Cluster 2 (ingredient-grid-mobile) defects C2, C4, DC1, DC2 as ✓ resolved (plan 277); M5 as ✓ deferred (layout space constraint noted)

## Validation (mobile)
- Viewport 375×812 RTL
- Add 5 ingredient rows — confirm trash icon visible and tappable on each row
- Dish mode: add 5 prep items — confirm delete button visible
- Tap delete on row 3 — row is removed
- No horizontal overflow of the ingredient grid

## Notes
- `col-drag` stays `display: none` on mobile — CDK drag requires mouse/pointer events; no alternative reorder mechanism is in scope
- `col-percent` deferred: the 5-col layout with Hebrew labels may be tight; re-evaluate after visual QA. The critical fix is `col-actions`
- If `.scss` file is touched → read `.claude/skills/cssLayer/SKILL.md` first ✓ (noted above)
- `.col-prep-actions` in dish prep rows may be in a separate SCSS file for the prep grid — verify same `display: none` pattern and apply the same fix if present
