# Recipe builder UI fixes

## Overview

Fix seven recipe-builder UX issues: type toggle reactivity, header/workflow dropdown positioning and visibility, add-row button alignment and centering, ingredients table responsive behavior with optional carousel on small screens, workflow section alignment, and add-step button alignment.

## a. Type toggle button (הכנה) not updating when clicked

**Cause:** The label is bound to `form().get('recipe_type')?.value` in recipe-header. Updating the form control with `setValue` in `toggleType()` does not trigger Angular change detection in the child.

**Fix:** Pass reactive type from parent; add optional input in header; use it for button label and dish-mode class.

**Files:** recipe-builder.page.html, recipe-header.component.ts, recipe-header.component.html

---

## b. Recipe header unit dropdowns not absolute / hidden when open

**Fix:** Ensure `.primary-chip-wrapper` and `.scaling-chip` have `overflow: visible`; give `.unit-dropdown-menu` high z-index (e.g. 100).

**Files:** recipe-header.component.scss

---

## c. Add row button (ingredients index) – center text on largest screens

**Fix:** Add `justify-content: center` to base `.add-row-btn` in recipe-builder.page.scss.

**Files:** recipe-builder.page.scss

---

## d. Ingredient search dropdown – make it absolute

**Fix:** Raise `.results-dropdown` z-index (e.g. 100); ensure no ancestor clips (overflow: visible on row/container if needed).

**Files:** ingredient-search.component.scss, possibly recipe-ingredients-table or section overflow

---

## e. Ingredients table – values always visible; responsive grid and small-screen

**Fix:** Container-aware grid (minmax/fr, optional container queries); below breakpoint use stacked card-per-row layout (Option A). Option B carousel only if explicitly wanted.

**Files:** recipe-ingredients-table.component.scss, recipe-ingredients-table.component.html (and .ts if carousel)

---

## f. Workflow section – justify-content: space-evenly

**Fix:** Style `.workflow-container` / `.workflow-grid` / `.prep-flat-grid` so header and rows use space-evenly; define `.prep-flat-grid`, `.prep-grid-header`, `.prep-grid-row` if missing.

**Files:** recipe-workflow.component.scss

---

## g. Add step button not aligned

**Fix:** Add-step button `width: 100%`, `display: flex; justify-content: center`, same flow as grid.

**Files:** recipe-workflow.component.scss

---

## Implementation order

1. a – Type toggle
2. b – Header dropdowns
3. c – Add row button centering
4. d – Ingredient search dropdown
5. f – Workflow section space-evenly
6. g – Add step button alignment
7. e – Ingredients table (container grid + small-screen stacked)
