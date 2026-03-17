---
name: Dish dropdown width and keyboard
overview: Narrow the dish-search dropdown by 20% in menu-intelligence, fix keyboard navigation (arrows + Enter) by wiring onDishSearchQueryChange, and add visible highlighted state for recipe dropdown items.
todos: []
isProject: false
---

# Dish search dropdown: width and keyboard

## Current state

- **Dropdown**: The dish search uses [menu-intelligence.page.html](src/app/pages/menu-intelligence/menu-intelligence.page.html) (269–291): an input and, when there is a query, `<app-scrollable-dropdown>` with recipe buttons. The dropdown is styled globally in [styles.scss](src/styles.scss) (`.c-dropdown` with `inset-inline: 0`), so it spans the full width of its parent `.dish-search-wrap` (which has `flex: 1` and fills the dish name cell).
- **Keyboard (broken)**: The logic for Arrow Up/Down and Enter exists in `onDocumentKeydown` → `onDishSearchKeydown`, but it only runs when `activeDishSearch_()` is non-null. The template binds input changes to `setDishSearchQuery` only; the method that sets `activeDishSearch_` when the query is non-empty is `onDishSearchQueryChange` (lines 673–686), and it is never called from the template. So when the user types, `activeDishSearch_` stays null, the document keydown condition fails, and arrow/Enter do nothing. **Fix**: Wire the input's `(ngModelChange)` to `onDishSearchQueryChange(sectionIndex, itemIndex, $event)` instead of `setDishSearchQuery(...)`, so that typing sets `activeDishSearch_` and keyboard handling runs.
- **Gap**: The recipe dropdown buttons do **not** use the highlighted index: they have no `[class.highlighted]` binding (line 283), so keyboard users do not see which item is selected. The other dropdowns on the page (event type, section category) already use `[class.highlighted]="..."` and rely on `scrollDropdownHighlightIntoView`; the dish list is the only one missing the binding and a visible `.highlighted` style in this page.

## 1. Make the dropdown 20% narrower

- **Where**: [menu-intelligence.page.scss](src/app/pages/menu-intelligence/menu-intelligence.page.scss), in the same area as `.dish-search-wrap` (around 711).
- **What**: Scope only the dish-search dropdown so it uses 80% of the wrap width. The host of `app-scrollable-dropdown` is the containing block for the inner `.c-dropdown` (which has `inset-inline: 0`), so constraining the host constrains the dropdown.
  - Add a rule: `.dish-search-wrap app-scrollable-dropdown` with `width: 80%` (and, if desired, `margin-inline: auto` to center it). No change to [scrollable-dropdown.component](src/app/shared/scrollable-dropdown/scrollable-dropdown.component.html) or global `.c-dropdown`; this keeps the change local to the dish-search context.
- **Standards**: Follow [.assistant/skills/cssLayer/SKILL.md](.assistant/skills/cssLayer/SKILL.md) (five property groups, tokens from `src/styles.scss` or component-scoped, logical properties).

## 2. Fix keyboard handling so arrows and Enter work

- **Where**: [menu-intelligence.page.html](src/app/pages/menu-intelligence/menu-intelligence.page.html) (line 276).
- **Change**: Replace `(ngModelChange)="setDishSearchQuery(sectionIndex, itemIndex, $event)"` with `(ngModelChange)="onDishSearchQueryChange(sectionIndex, itemIndex, $event)"`. That way, when the user types a non-empty query, `activeDishSearch_.set({ sectionIndex, itemIndex })` runs (inside `onDishSearchQueryChange`), so `onDocumentKeydown` will see `activeDish !== null` and call `onDishSearchKeydown` for Arrow Up/Down and Enter.

## 3. Expose keyboard selection visually and keep Enter to select

- **Template**: In [menu-intelligence.page.html](src/app/pages/menu-intelligence/menu-intelligence.page.html), add the index to the `@for` and bind `highlighted` to the current highlighted index so the item that would be selected by Enter is visible:
  - Change the recipe `@for` to expose the index (e.g. `let i = $index`).
  - On the recipe `<button class="dropdown-item">` (line 283), add `[class.highlighted]="getDishSearchHighlightedIndex(sectionIndex, itemIndex) === i"`.
- **Styles**: In [menu-intelligence.page.scss](src/app/pages/menu-intelligence/menu-intelligence.page.scss), add a `.dropdown-item.highlighted` (or `&.highlighted` under `.dropdown-item`) rule so the keyboard-highlighted row matches the hover state (e.g. same background as `&:hover`, e.g. `var(--bg-glass-hover)`), consistent with other dropdowns and [recipe-builder](src/app/pages/recipe-builder/recipe-builder.page.scss) (`&:hover, &.highlighted`).

Sections 2 and 3 together make keyboard nav both functional and visible. No change to the shared [scrollable-dropdown](src/app/shared/scrollable-dropdown/scrollable-dropdown.component.html) component or its template is required: width is controlled by the parent, and keyboard behavior and highlight state are fully handled in the menu-intelligence page.

## Summary

| Item                       | Action                                                                                                                                  |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Dropdown width             | In menu-intelligence SCSS: `.dish-search-wrap app-scrollable-dropdown { width: 80%; margin-inline: auto; }`                              |
| Arrow keys + Enter         | Fix: use `onDishSearchQueryChange` in `(ngModelChange)` so `activeDishSearch_` is set when typing and document keydown runs (section 2) |
| Visible keyboard selection | Add `[class.highlighted]="getDishSearchHighlightedIndex(sectionIndex, itemIndex) === i"` on recipe buttons and expose `i` in `@for`       |
| Highlight style            | Add `.dropdown-item.highlighted` (or `&.highlighted`) with same background as hover in menu-intelligence SCSS                           |
