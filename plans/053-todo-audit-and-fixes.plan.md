# Plan 053 — Todo Audit and Fixes

## Goal

Audit the todo.md backlog, mark completed items, and fix the single remaining issue (ingredient search dropdown z-index).

## Audit Results

### Plan 046-1 — Cook-view scale-by UX fixes: ALL DONE

Both HTML and SCSS items are fully implemented in `src/app/pages/cook-view/cook-view.page.html` and `cook-view.page.scss`:

- Button is inside `col-name-with-set-by` (left of name); empty `col-scale-action` for normal rows.
- Hover opacity, row box-shadow on hover, yellow `--cv-shadow-setting` for setting state.

### Plan 034 — Recipe Builder UI Fixes: 6 of 7 done, 1 fix applied

| Item | Description | Status |
|------|-------------|--------|
| a | Type toggle | Done (was marked) |
| b | Header unit dropdowns: overflow + z-index | Done — `z-index: 100` already on `::ng-deep .c-dropdown` (recipe-header.component.scss line 145) |
| c | Add row button centering | Done (was marked) |
| d | Ingredient search dropdown z-index | Fixed in this plan — added `z-index: 100` in ingredient-search.component.scss |
| e | Ingredients table container-aware grid | Done — `container-type: inline-size`, `@container` at 520px, `@media` at 640px |
| f | Workflow section space-evenly + prep-flat-grid | Done — `justify-content: space-evenly` and `.prep-flat-grid` in recipe-workflow SCSS |
| g | Add step button width 100% | Done — `.add-row-btn` has `width: 100%` and centering |

### Phase 1 — Stabilize & Complete: effectively done

- Specs exist for all 6 recipe-builder subcomponents.
- "When adding new features" is an ongoing process guideline.

### Phase 2 and Phase 3

Future roadmap items — no changes.

## Execution

1. Add `z-index: 100` to ingredient search dropdown via `app-scrollable-dropdown ::ng-deep .c-dropdown` in `ingredient-search.component.scss`.
2. Update `todo.md` checkboxes for all verified-done items.
3. Update Plan Index: mark 046-1 and 034 as Done, add row for 053.
