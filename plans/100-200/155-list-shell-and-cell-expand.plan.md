---
name: List shell and cell expand
overview: "Plan covers: (1) list-shell sidebar border-radius animation and small-screen panel alignment, and (2) recipe-book-list allergens/labels cell behavior: per-cell toggle with multiple cells open, header toggles all, and reset on navigation."
todos: []
isProject: true
---

# List shell and recipe-book cell expand behavior

## Scope

- **List-shell** ([src/app/shared/list-shell/](src/app/shared/list-shell/)): shared by recipe-book, equipment, venue, supplier, inventory. Changes here affect all lists that use the sidebar.
- **Recipe-book-list** ([src/app/pages/recipe-book/components/recipe-book-list/](src/app/pages/recipe-book/components/recipe-book-list/)): only list with allergens/labels expandable cells; behavior changes are confined here.

---

## 1. List-shell: border radius next to sidebar (toFix 109)

**Current:** [list-shell.component.scss](src/app/shared/list-shell/list-shell.component.scss) already sets `.list-container.panel-open .table-area { border-inline-start-radius: 0; }` so the table's start-side corners are square when the panel is open.

**Gap:** The panel animates with `transition: width 0.3s var(--ease-spring), min-width 0.3s var(--ease-spring), ...` but the table-area's border-radius does not transition, so the corner change is instant.

**Change:**

- Add a transition on `.table-area` for `border-inline-start-radius` (and if needed `border-radius` for the start side) using the same duration/easing as the panel: `0.3s var(--ease-spring)`.
- Keep all styling inside `@layer components.list-shell` and use existing tokens (e.g. `var(--radius-lg)`).

---

## 2. List-shell: small-screen sidebar aligned to list container (toFix 111)

**Current:** In the `@media (max-width: 768px)` block, `.filter-panel` is `position: absolute; inset-block: 0; inset-inline-start: 0;` and `.list-container` has `position: relative` and `padding: 1rem`. The panel is positioned at the start edge of the list-container's content box, so it can appear to "grow over" the full content area.

**Goal:** When the small-screen sidebar is open, it should stay aligned to the list container (e.g. not feel like it's covering the whole viewport; align with the table/list content).

**Change:**

- In the same 768px block, adjust the overlay panel so it is aligned with the list container's content area. Position the panel relative to the list-container with insets that respect the container's padding (e.g. so the panel sits flush with the table-area's start edge). Ensure the panel's start edge aligns with the list container's padded content. No new layout outside list-shell; keep structure as-is and adjust only positioning/sizing in [list-shell.component.scss](src/app/shared/list-shell/list-shell.component.scss).

---

## 3. Recipe-book-list: allergens/labels cell and header behavior

**Current (summary):**

- **Header click** (Allergens / Labels column): toggles "expand all" and clears the single-recipe popover.
- **Cell click:** turns off "expand all" and sets a single recipe ID (or toggles that row off). So only one row can be open at a time for each column.

**Desired:**

- **Cell click (allergens or labels):** Open that cell only; do **not** close other open cells. Clicking the same cell again closes that cell.
- **Header click (column title):** "Open all" or "close all" together (toggle all cells in that column).
- **Navigate away and back:** When the user leaves the page and returns, all cells are closed (reset).

**Implementation:**

- **State:** Replace single-recipe IDs with **sets of recipe IDs** for per-cell expansion: `allergenExpandedRecipeIds_: signal<Set<string>>` and `labelsExpandedRecipeIds_: signal<Set<string>>`.
- **Display logic:** A row's allergens (or labels) cell is "expanded" if `allergenExpandAll_()` is true **or** the recipe's `_id` is in the corresponding Set.
- **Cell click:** Toggle that recipe ID in the Set (add if not present, remove if present). Do not clear other IDs or change "expand all".
- **Header click:** Toggle "expand all": if turning on, set expand-all to true and clear the Set; if turning off, set expand-all to false and clear the Set (close all).
- **Outside click:** Close all (clear expand-all and both Sets for that column).
- **Navigation reset:** Reset in `ngOnDestroy` and, if route reuse is used, on route leave.

**Files to touch:**

- [recipe-book-list.component.ts](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts): replace single-ID signals with Set-based signals; update toggle/close methods; add navigation reset.
- [recipe-book-list.component.html](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html): use helper methods for "is this cell expanded?" (expandAll or Set has recipeId).

---

## 4. Order of work

1. **List-shell (visual):** Add border-radius transition; then adjust 768px panel alignment.
2. **Recipe-book-list (state + UX):** Introduce Set-based state, update template conditions, implement cell/header/outside-click and navigation-reset behavior.

All SCSS must follow [.claude/skills/cssLayer/SKILL.md](.claude/skills/cssLayer/SKILL.md).
