# Plan 047 — Recipe Builder Polish: Audit Report

**Note:** The plan file `plans/047-recipe-builder-polish.plan.md` was not found in the repo; audit is based on the todo list in [.claude/todo.md](.claude/todo.md) (lines 240–253) and direct code inspection.

---

## Done (verified in code)

### L4: Reduce logistics search width by 20%; sort dropdown by relevance

- **Width 20% smaller — DONE.**  
  In `src/app/pages/recipe-builder/recipe-builder.page.scss`, `.logistics-tool-search-wrap` uses `flex: 0 1 53.33%` and `max-width: 53.33%` (down from 66.67%), matching a 20% reduction. Implemented in Plan 051.

- **Sort dropdown by relevance (closest match first) — NOT DONE.**  
  In `src/app/pages/recipe-builder/recipe-builder.page.ts`, `filteredLogisticsTools_` (lines 453–458) only filters: `available.filter((eq) => eq.name_hebrew.toLowerCase().includes(q))`. There is no scoring or sorting by "closest match"; order is unchanged from the source list.

**Verdict:** Half done. Todo can stay checked for width only; add a sub-item or note for "sort by relevance" if you want it tracked.

---

## Not done (verified missing or partial)

### S1: Ingredient row style (border, arrows, delete, add-btn match workflow)

- **Status: Partially aligned, not fully "matched".**  
  Ingredients table (`src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.scss`) has: row border (`border-block-end`), quantity +/- (`.qty-btn`), and `.remove-btn` with `trash-2`. Workflow uses `.delete-btn` (different class), `.counter-btn`, and `.add-row-btn`. Visual style (tokens, spacing, borders) is not unified.

**How to complete:** Unify row styling (borders, buttons, spacing) and reuse the same token set or a shared row style.

---

### S2: Timer value fixed-width container

- **Status: NOT DONE.**  
  In recipe-workflow component, the timer uses `.timer-counter`, `.timer-field`, and `.timer-value`. The SCSS does not set a fixed or min width for the value/input.

**How to complete:** In `recipe-workflow.component.scss`, give the timer value/input a fixed or min width (e.g. `min-width: 3rem`) so the column does not jump when switching between view and edit.

---

### S3: Textarea align + auto-grow

- **Status: NOT DONE.**  
  `recipe-workflow.component.scss` defines `.workflow-textarea` with `min-height: 2.5rem` and `resize: none`. There is no auto-grow (height following content).

**How to complete:** Add either CSS `field-sizing: content` (where supported) or a small directive that sets textarea height from `scrollHeight` on input/change; align text per design.

---

### S4: Workflow prep rows match ingredient rows

- **Status: NOT DONE.**  
  Workflow prep (dish) mode has its own grid and row structure and does not reuse the ingredient grid row styles or layout.

**How to complete:** Refactor workflow prep row markup/classes to reuse the same row style as ingredients and align borders, spacing, and action buttons.

---

### L1: Unit before amount in ingredient grid

- **Status: NOT DONE.**  
  In `recipe-ingredients-table.component.html`, column order is: **name → quantity → unit → percent → cost**. Plan 047 asks for "Unit before amount", i.e. **name → unit → quantity → percent → cost**.

**How to complete:** Reorder the grid template and the HTML column blocks so the unit column comes before the quantity column.

---

### L2: Smart shrinking grid + delete on hover

- **Status: NOT DONE.**  
  Ingredients grid uses a fixed template; the delete button is always visible. No "show delete only on row hover" behavior.

**How to complete:** (1) Adjust grid to flexible/minmax columns; (2) Hide delete by default and show on row hover via CSS.

---

### L3: Responsive tablet/mobile

- **Status: PARTIAL.**  
  recipe-builder.page.scss, ingredients table, and workflow each have media queries, but no single unified recipe builder tablet/mobile pass.

**How to complete:** Define a short tablet/mobile spec and align page + ingredients + workflow + logistics to it.

---

### B1: Labels add/remove + demo labels + translations

- **Status: Add/remove DONE; demo + translations UNCLEAR.**  
  Recipe form and recipe-header have labels add/remove and LabelCreationModalService. "Demo labels" and "translations" (dictionary keys) were not fully verified.

**How to complete:** If not already present: add demo recipes with `labels_` and ensure label UI strings have dictionary keys.

---

### B2: Duplicate recipe/dish name validation

- **Status: NOT DONE.**  
  In recipe-builder.page.ts, `name_hebrew` has only `Validators.required`. No duplicate-name check against existing recipes/dishes.

**How to complete:** Add an async validator that checks `name_hebrew` against existing names (and optionally type) and sets a validation error; show error in template.

---

### B3: Volume conversion fix

- **Status: NOT VERIFIABLE.**  
  RecipeCostService implements volume (e.g. `computeTotalVolumeL`). Without a written "volume conversion fix" spec or bug ID, it cannot be determined whether a specific fix was applied.

**How to complete:** If there is a known bug, document it and add a targeted fix + test; otherwise mark B3 as "N/A" or "needs spec".

---

### B4: Unit selectors in recipe-header

- **Status: EXISTS; specific "B4" polish UNKNOWN.**  
  recipe-header has primary and secondary unit selectors (unit-switcher buttons and scrollable dropdowns). Plan 034 mentions "Header unit dropdowns: overflow visible + z-index". If B4 meant that polish, it may or may not be done.

**How to complete:** If B4 is "dropdown overflow/z-index", add the needed overflow and z-index; then mark B4 done.

---

## Summary table

| Id  | Description                              | Status        | How / note                                                |
|-----|------------------------------------------|---------------|-----------------------------------------------------------|
| L4  | Logistics search 20% smaller             | Done          | 53.33% in recipe-builder.page.scss (Plan 051)            |
| L4  | Sort dropdown by relevance                | Not done      | filteredLogisticsTools_ only filters, no sort            |
| S1  | Ingredient row style match workflow       | Partial       | Different classes; no unified row style                  |
| S2  | Timer value fixed-width                    | Not done      | No min/fixed width on timer value/input                  |
| S3  | Textarea align + auto-grow                 | Not done      | Fixed min-height, resize none; no auto-grow               |
| S4  | Workflow prep rows match ingredient rows   | Not done      | Different layout and styles                               |
| L1  | Unit before amount in grid                | Not done      | Order is name, quantity, unit, …                         |
| L2  | Smart shrinking grid + delete on hover     | Not done      | Fixed grid; delete always visible                        |
| L3  | Responsive tablet/mobile                  | Partial       | Media queries exist; no unified pass                     |
| B1  | Labels add/remove                          | Done          | Header + form + modal                                    |
| B1  | Demo labels + translations                | Unclear       | Not verified in demo data / dictionary                   |
| B2  | Duplicate name validation                  | Not done      | Only required on name_hebrew                             |
| B3  | Volume conversion fix                     | Unverifiable  | No spec; service has volume logic                        |
| B4  | Unit selectors in recipe-header           | Exists        | Header has unit dropdowns; overflow/z-index not verified |

---

## Recommended next steps

1. **Todo list:** Update .claude/todo.md so L4 is split into "width done" and "sort by relevance not done", and mark S1–S4, L1–L3, B2 as not done; B1/B4 with the caveats above. *(Done.)*
2. **Quick wins:** Implement L1 (column reorder), S2 (timer fixed width), and optionally "sort by relevance" for L4 (e.g. sort by match position or length). *(Done: L1, S2, L4 sort.)*
3. **Clarify:** B3 (volume fix) and B4 (exact header polish) with a short spec or acceptance criteria so implementation and audit are unambiguous.

---

## B3 / B4 clarification (acceptance criteria)

- **B3 — Volume conversion fix (implemented):** Spec: (a) Use registry conversion factors for L/ml (1 L = 1000 ml). (b) Round totalL to 4 decimal places in `computeTotalVolumeL` for display consistency. (c) Keep 1 g = 1 ml fallback for weight-only ingredients. Implemented in RecipeCostService.
- **B4 — Unit selectors in recipe-header:** Acceptance criteria: (1) Dropdown overflow visible (options not clipped by parent overflow). (2) z-index such that open dropdown appears above adjacent content and modals if needed. Verify in recipe-header unit switcher and scrollable dropdowns; if both hold, mark B4 done.
