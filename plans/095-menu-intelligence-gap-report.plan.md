# Gap report: current app vs. conversation implementation

You undid changes from this conversation. Below is what the codebase has **now** versus what we had implemented, so you can re-apply only what's missing.

---

## What is still present (not reverted)

These are already in the codebase and match what we did:

- **Footer reactivity:** `formValueVersion_`, `valueChanges` subscription, `totalRevenue_` computed from form controls (not `getRawValue()`), food cost % shows "—" when `totalRevenue_() <= 0` in [menu-intelligence.page.html](src/app/pages/menu-intelligence/menu-intelligence.page.html) (lines 293–298).
- **SelectOnFocus + quantity stepping:** `SelectOnFocusDirective` import and usage on sell_price and dish-field inputs; `onSellPriceKeydown`, `onDishFieldKeydown` in TS; template has `(keydown)="onSellPriceKeydown(...)"` and `(keydown)="onDishFieldKeydown(...)"` on the inline inputs.
- **Dish-name layout:** `.dish-name-cell` grid, `.dish-name-meta-wrap` (overflow hidden), `.dish-name-meta` viewport-centered band in [menu-intelligence.page.scss](src/app/pages/menu-intelligence/menu-intelligence.page.scss); same structure in HTML.
- **Autocomplete:** `autocomplete="off"` on event-type search, section search, and dish search inputs.
- **Event-type dropdown:** `eventTypeHighlightedIndex_`, `onEventTypeSearchKeydown`, `[class.highlighted]` on options, document keydown delegates to `onEventTypeSearchKeydown`.
- **Section-category dropdown:** `sectionCategoryHighlightedIndex_`, `getSectionCategoryHighlightedIndex`, `onSectionSearchKeydown`, `[class.highlighted]` on options, document keydown delegates to `onSectionSearchKeydown`.
- **Document keydown:** `@HostListener('document:keydown', ['$event'])` and `onDocumentKeydown` that handle ArrowDown/ArrowUp/Enter for event-type, section, and dish dropdowns when focus is inside the relevant wrapper.
- **Dish replace-in-place (TS only):** `editingDishAt_`, `activeDishSearch_`, `startEditDishName`, `onDishSearchQueryChange` (sets/clears `activeDishSearch_` and restores `previousRecipeId` on clear), `selectRecipe` branch for editing (patch item, no `addItem`), `clearDishSearch` restores recipe when `editingDishAt_` matches.
- **Dish search TS:** `dishSearchHighlightedIndex_`, `getDishSearchHighlightKey`, `getDishSearchHighlightedIndex`, `onDishSearchKeydown` with highlight and scroll-into-view.

So most of the TypeScript and structure is still there. The gaps are wiring and a few UI details.

---

## Gaps (what to restore)

### 1. Document keydown: use capture phase

**Current:** [menu-intelligence.page.ts](src/app/pages/menu-intelligence/menu-intelligence.page.ts) line 406:

```ts
@HostListener('document:keydown', ['$event'])
```

**Intended:** Use capture so the handler runs before the default behavior (e.g. list scroll / page scroll):

```ts
@HostListener('document:keydown', ['$event'], { capture: true })
```

---

### 2. Dish search: wire `ngModelChange` to `onDishSearchQueryChange`

**Current:** [menu-intelligence.page.html](src/app/pages/menu-intelligence/menu-intelligence.page.html) line 225:

```html
(ngModelChange)="setDishSearchQuery(sectionIndex, itemIndex, $event)"
```

**Effect:** `activeDishSearch_` is never set when the user types, so the document keydown handler never runs for the dish dropdown (it checks `activeDishSearch_()`). Arrow keys and Enter in the dish search dropdown therefore do nothing.

**Intended:** Call the existing component method so query, highlight, and `activeDishSearch_`/`editingDishAt_` stay in sync:

```html
(ngModelChange)="onDishSearchQueryChange(sectionIndex, itemIndex, $event)"
```

---

### 3. Dish search: show highlighted option

**Current:** Recipe buttons in the dish dropdown have no highlight; [menu-intelligence.page.html](src/app/pages/menu-intelligence/menu-intelligence.page.html) lines 232–234:

```html
@for (recipe of getFilteredRecipes(sectionIndex, itemIndex); track recipe._id) {
  <button type="button" class="dropdown-item" (click)="selectRecipe(...)">
```

**Intended:** Add index and `[class.highlighted]` so keyboard nav has visible feedback:

```html
@for (recipe of getFilteredRecipes(sectionIndex, itemIndex); track recipe._id; let ri = $index) {
  <button type="button" class="dropdown-item" [class.highlighted]="getDishSearchHighlightedIndex(sectionIndex, itemIndex) === ri" (click)="selectRecipe(...)">
```

---

### 4. Clickable dish name (replace recipe in place)

**Current:** Dish name is a non-interactive span; [menu-intelligence.page.html](src/app/pages/menu-intelligence/menu-intelligence.page.html) line 199:

```html
<span class="dish-name">{{ getRecipeName(item.get('recipe_id_')?.value) }}</span>
```

**Intended:** Make the name open dish search for that row (replace in place), with stopPropagation so row/meta don't toggle:

```html
<button type="button" class="dish-name dish-name-clickable"
  (click)="startEditDishName(sectionIndex, itemIndex); $event.stopPropagation()">
  {{ getRecipeName(item.get('recipe_id_')?.value) }}
</button>
```

---

### 5. SCSS: styles for highlight and clickable name

**Current:** [menu-intelligence.page.scss](src/app/pages/menu-intelligence/menu-intelligence.page.scss) has `.dropdown-item` with `&:hover` but no `&.highlighted`. `.dish-name` has no `.dish-name-clickable` variant.

**Intended:**

- Under `.dropdown-item`, add something like:
  - `&.highlighted { background: var(--bg-glass-hover); }` (or your existing "selected" token) so the keyboard-highlighted option is visible.
- Under `.dish-name` (or next to it), add:
  - `.dish-name-clickable`: button reset, cursor pointer, text styling matching the current name, hover underline (e.g. `text-decoration: underline`) so it's clear the name is clickable.

(Follow the project's [cssLayer skill](.assistant/skills/cssLayer/SKILL.md) for layer placement.)

---

### 6. Section search: optional template fix for NG5002

**Current:** Section search [menu-intelligence.page.html](src/app/pages/menu-intelligence/menu-intelligence.page.html) line 162:

```html
(ngModelChange)="setSectionSearchQuery(sectionIndex, $event); sectionCategoryHighlightedIndex_.update(m => ({ ...m, [sectionIndex]: 0 }))"
```

If your Angular version ever reports an NG5002 (e.g. "Parser Error: Unexpected token") on that line, the fix we used was to move the logic into a method and call it from the template:

- In TS you already have `onSectionSearchQueryChange(sectionIndex, value)` (or add it) that does `setSectionSearchQuery(sectionIndex, value)` and `sectionCategoryHighlightedIndex_.update(...)`.
- In the template use: `(ngModelChange)="onSectionSearchQueryChange(sectionIndex, $event)"`.

Only necessary if you see that parser error.

---

## Summary table

| Area                    | Current state                                   | Intended (from this conversation)                                                           |
| ----------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Document keydown        | No `capture: true`                              | Add `{ capture: true }`                                                                     |
| Dish search active      | `ngModelChange` calls `setDishSearchQuery` only   | Call `onDishSearchQueryChange` so `activeDishSearch_` is set/cleared                         |
| Dish dropdown highlight | No `[class.highlighted]` on recipe buttons       | Add `let ri = $index` and `[class.highlighted]="getDishSearchHighlightedIndex(...) === ri"`  |
| Dish name interaction   | `<span class="dish-name">`                      | `<button class="dish-name dish-name-clickable">` with `startEditDishName` + stopPropagation |
| SCSS                    | No `.highlighted`, no `.dish-name-clickable`    | Add `.dropdown-item.highlighted` and `.dish-name-clickable`                                  |
| Section ngModelChange   | Inline update (may cause NG5002)                | Optional: use `onSectionSearchQueryChange` if parser errors appear                           |

---

## Files to touch

- [src/app/pages/menu-intelligence/menu-intelligence.page.ts](src/app/pages/menu-intelligence/menu-intelligence.page.ts): one line — add `{ capture: true }` to `@HostListener`.
- [src/app/pages/menu-intelligence/menu-intelligence.page.html](src/app/pages/menu-intelligence/menu-intelligence.page.html): dish search `ngModelChange`; dish dropdown `@for` + `[class.highlighted]`; dish name span → button with `startEditDishName`. Optionally section search `ngModelChange`.
- [src/app/pages/menu-intelligence/menu-intelligence.page.scss](src/app/pages/menu-intelligence/menu-intelligence.page.scss): `.dropdown-item.highlighted`; `.dish-name-clickable` (within the existing layer rules).

No new methods or signals are required; the missing pieces are template bindings, one HostListener option, and two small SCSS additions.
