# Cook-view ingredient list alignment (Plan 163-1; PRD 2.1 Verify)

## Scope

- **Goal:** Values (amount, unit, etc.) align under column headers; top-aligned; no spread.
- **Files:** [src/app/pages/cook-view/cook-view.page.html](src/app/pages/cook-view/cook-view.page.html), [src/app/pages/cook-view/cook-view.page.scss](src/app/pages/cook-view/cook-view.page.scss).
- **Note:** The PRD mentions "col-cost"; cook-view has no cost column. Actual columns are **col-name**, **col-amount**, **col-unit**, and **col-scale-action** (when not in edit mode).

## Critical Questions

- **Scope:** Verify-only (document result) vs apply a small SCSS tweak (e.g. `min-width` on `.col-amount` / `.col-unit`) preemptively for robust alignment?
- **Col-cost:** Confirm scope is only col-name, col-amount, col-unit, col-scale-action (no cost column in cook-view).

## Current implementation

- **Grid:** `.ingredients-table-header` and `.ingredients-table-row` share the same rules:
  - `display: grid`
  - `align-items: start` (already satisfies top-alignment)
  - `grid-template-columns: minmax(120px, 1fr) minmax(60px, auto) minmax(60px, auto)` (edit mode)
  - With `.has-scale-action` / `.view-mode-row`: fourth column `minmax(80px, auto)`
- **Cells:** `.col-name` has `min-width: 0`. `.col-amount` and `.col-unit` have `white-space: nowrap` but no explicit `min-width`. `.col-name-with-set-by` uses flex + `min-width: 0` on the text span.

So **align-items: start** and a single set of column definitions are already in place; header and rows use the same grid, so columns should line up.

## Verification steps

1. **Visual check (cook view, view mode and edit mode)**  
   Open a recipe in cook-view. Confirm:
   - Header labels (Ingredient, Quantity, Unit, and scale column when present) line up with the first row of cell content.
   - Rows look top-aligned (no vertical stretch in cells).
   - Long names or "set by" rows don't push amount/unit out of alignment; amount and unit stay under their headers.

2. **If alignment is off:**  
   - Ensure no extra wrapper or margin is breaking the grid (inspect DOM in [cook-view.page.html](src/app/pages/cook-view/cook-view.page.html) lines 128–210).  
   - Consider adding explicit `min-width` to `.col-amount` and `.col-unit` in [cook-view.page.scss](src/app/pages/cook-view/cook-view.page.scss) (e.g. `min-width: 3.5rem` or a token) so the quantity/unit columns don't shrink and misalign. Keep existing `white-space: nowrap` so values don't wrap and spread.

3. **Standards:**  
   Any new or edited rules in the component SCSS must follow [.assistant/skills/cssLayer/SKILL.md](.assistant/skills/cssLayer/SKILL.md) (five-group vertical rhythm, tokens from `src/styles.scss` or `:host`, logical properties).

## Deliverable

- **If verification passes:** Mark 2.1 done; no code change required.
- **If tweaks needed:** Apply minimal SCSS only (e.g. `min-width` on `.col-amount` / `.col-unit`), then re-verify and mark 2.1 done.
