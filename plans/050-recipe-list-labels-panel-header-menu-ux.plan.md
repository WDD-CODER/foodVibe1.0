---
name: Recipe list labels panel header
overview: Implement labels column with allergen-style compact/expand UX, row height growth for expandable cells, unified side-panel close icon and animation, and a shared header layout (title right, search center) for recipe-book-list and inventory-product-list; plus menu-intelligence date-as-label with picker and DD/MM/YYYY keyboard entry, guest number without spinner, and +/- buttons with minus disabled at 0.
---

# Recipe list: labels UX, row height, panel icon/animation, header layout

## 1. Labels column: same logic as allergens (compact + expandable grid)

**Current:** [recipe-book-list.component.html](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html) lines 50–57 show labels as inline chips; header (31–34) is a plain sortable header.

**Target:** Mirror the allergens pattern:

- **Cell:** When the recipe has labels, show a small "labels" container with a **designated icon** (e.g. `tag` or `tags` from Lucide) and the **count**. On click, expand to a **grid** of label chips (same chips as now, in a dense grid). When no labels, keep the placeholder dash.
- **Header:** Change the Labels column header to **toggle expand-all** (like Allergens), so one click expands all rows' label grids, another collapses. Keep sort behavior if desired (can be "toggle expand" only like allergens).
- **Outside click:** Collapse the labels popover (single row or expand-all) when clicking outside, reusing the same pattern as `closeAllergenView` (e.g. a `closeLabelsView` and `(clickOutside)` on a wrapper).

**Implementation:**

- **Template (recipe-book-list.component.html):**
  - Table header: replace the current `col-labels` sortable header with one that calls `toggleLabelsExpandAll()` (and optional `setSort('labels')` or keep only expand toggle, to match allergens).
  - Cell: wrap content in a `labels-btn-wrapper` (same structure as `allergen-btn-wrapper`): when `getAllRecipeLabels(recipe).length > 0`, show a button with icon + count; when `labelsExpandAll_() || labelsPopoverRecipeId_() === recipe._id`, show the expanded grid of `.label-chip` elements. Use `(clickOutside)="closeLabelsView($event)"` on the wrapper. When no labels, keep `<span class="placeholder-dash">—</span>`.
- **Component (recipe-book-list.component.ts):**
  - Add signals: `labelsPopoverRecipeId_`, `labelsExpandAll_`.
  - Add methods: `toggleLabelsPopover(recipeId)`, `toggleLabelsExpandAll()`, `closeLabelsView(clickTarget?)` (clear popover and expand-all when click is outside the labels header/cells).
  - In `onRowClick`, exclude clicks from `.labels-btn-wrapper` (in addition to existing exclusions) so opening the labels popover doesn't navigate.
- **Styles (recipe-book-list.component.scss):**
  - Reuse the same pattern as allergens: `.labels-btn-wrapper` (position relative, flex column, centered; when `.labels-expanded-open` hide the compact button and show the expanded grid). Add a `.labels-btn` style (similar to `.allergen-btn`) with a distinct look for "labels" (e.g. neutral/info style vs warning for allergens). Use an icon + count in the button. `.labels-expanded` grid with same dense grid as `.allergen-expanded.dense-grid`, keeping existing `.label-chip` for each label.
- **Icon:** Use Lucide `tag` or `tags` for the labels compact button. Ensure the icon is available in the project's Lucide set.

---

## 2. Row height: grow to fit labels/allergens expanded content

**Current:** Rows use `display: contents` and cells are grid children of `.table-body` with `grid-auto-rows: auto`. Cells use `display: flex; align-items: center`.

**Target:** When the labels or allergens expanded block needs more space, the row height should grow to fit (no clipping).

**Implementation:**

- In [recipe-book-list.component.scss](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss):
  - For `.col-labels` and `.col-allergens`, set the cell's alignment to **start** (e.g. `align-items: flex-start` or a wrapper with `align-items: start`) so that when the expanded grid is tall, the cell grows and the row height follows. Ensure the expandable wrapper (`.allergen-btn-wrapper` / `.labels-btn-wrapper`) has `min-height` only if needed and no `max-height` that would clip; let the grid flow naturally so `grid-auto-rows: auto` sizes the row to the tallest cell content.
- Apply the same idea in [inventory-product-list.component.scss](src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.scss) for `.col-allergens` so product rows also grow when allergen content expands.

---

## 3. Panel close icon: more appealing, no border

**Current:** Both [recipe-book-list](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html) (lines 101–104) and [inventory-product-list](src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html) use `panel-right-close` and `.panel-toggle-icon` has `border: 1px solid var(--border-default)`.

**Target:** Use a clearer "collapse" icon (e.g. `chevron-right` in RTL to indicate "push panel away") and remove the border from the close button.

**Implementation:**

- **HTML:** In both components, replace `<lucide-icon name="panel-right-close" [size]="20">` with a single, consistent icon. Suggested: `chevron-right` (in RTL layout it visually suggests closing the right-side panel). Same icon in both recipe-book-list and inventory-product-list.
- **SCSS:** In both [recipe-book-list.component.scss](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss) and [inventory-product-list.component.scss](src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.scss), under `.panel-toggle-icon`, remove the border (delete `border: 1px solid var(--border-default)`). Keep background, size, and hover for a clean, borderless look.

---

## 4. Panel open/close animation: sharper and consistent

**Current:** `.filter-panel` uses `transition: width 0.3s var(--ease-smooth), min-width 0.3s var(--ease-smooth)`; `.panel-content` uses `transition: opacity 0.2s ease`. Same in both components.

**Target:** A sharper, more "pro" feel and the **same** animation (and icons) for both side panels (recipe-book and inventory).

**Implementation:**

- **Easing / duration:** Use a snappier easing (e.g. `var(--ease-spring)` from [src/styles.scss](src/styles.scss) or a custom cubic-bezier like `cubic-bezier(0.32, 0.72, 0, 1)`) and a slightly shorter duration (e.g. `0.22s` or `0.25s`) for `width` and `min-width`. Optionally add a brief `opacity` transition on the panel content in sync (e.g. same duration, so content fades as the panel closes).
- **Where:** Update `.filter-panel` and `.panel-content` transitions in **both**:
  - [recipe-book-list.component.scss](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss)
  - [inventory-product-list.component.scss](src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.scss)
  so the animation is identical.

---

## 5. Header layout: title right, search center, same design for both

**Current:** Both headers use flex with `justify-content: flex-end`; `.page-title` has `flex: 1` and `text-align: center`; `.header-search` has `flex: 1` and min/max width.

**Target:** "Header more to the right", "search bar more to the center", and the **same** layout and design for recipe-book and inventory.

**Implementation:**

- **Layout concept:** Use a single flex row: Start (RTL) = optional open-panel button; Center = search bar truly centered; End (RTL) = page title + primary action (Add recipe / Add product). Concretely: `[menu?] [flex: 1] [search wrapper with fixed max-width, centered] [flex: 1] [title + add button]`.
- **Template:** In both list components, use the **same** structure for `.list-header`: open-panel btn, then a div for the center area containing the search (label + input-wrapper), then a div for end containing `.page-title` and `.add-btn`.
- **SCSS:** Unify in both component SCSS: `.list-header` flex with spacers so search is centered and title+add are at end; `.page-title` grouped with add button, no flex:1 center; ensure `.header-search` and `.input-wrapper` look identical in both. Follow cssLayer and tokens from [src/styles.scss](src/styles.scss).

---

## 6. Menu Intelligence: date as clickable label with date picker and keyboard entry

**Context:** [menu-intelligence.page.html](src/app/pages/menu-intelligence/menu-intelligence.page.html) (lines 99–103): event date is a plain `<input type="date">` with label "menu_set_date".

**Target:**

- Show the **date as a label** (readable formatted date). When the user **clicks** that label/area, open the date picker and **set focus** to the date input so the user can type.
- **Keyboard entry:** Allow the user to enter numbers in order so the **first 2 digits = day**, **next 2 = month**, **then year** (DD MM YYYY). As the user types, the value fills in accordingly.

**Implementation:**

- **Template:** Replace the current date row with a **clickable label** that displays the formatted date. Keep a hidden or minimal `<input type="date">`. On click of the label/container, open the native date picker (`input.showPicker()` if available) and call `focus()` on the input.
- **Component:** Add logic to handle **keyboard numeric entry** in order: accept digits; when length reaches 2 = day, next 2 = month, remaining = year (e.g. 2+2+4 digits = DD MM YYYY). Parse and set the form control value (ISO date string). Ensure the date input receives focus when the user clicks the label.
- **Accessibility:** Keep `aria-label` or visible label; ensure the clickable area is keyboard-activatable.

---

## 7. Menu Intelligence: remove default spinner from guest number

**Context:** [menu-intelligence.page.html](src/app/pages/menu-intelligence/menu-intelligence.page.html) (lines 93–96): guest count uses `<input type="number" ...>` which shows browser default up/down arrows.

**Target:** Remove the default number input spinner so the control relies on custom +/- buttons only.

**Implementation:**

- **SCSS:** In [menu-intelligence.page.scss](src/app/pages/menu-intelligence/menu-intelligence.page.scss), target the guest count input (e.g. `.meta-number`): `appearance: none`; `-moz-appearance: textfield`; hide `::-webkit-inner-spin-button` and `::-webkit-outer-spin-button` (opacity: 0 or display: none).

---

## 8. Menu Intelligence: plus/minus buttons for guest number; disable minus at 0

**Context:** Same guest count input (form control `guest_count_`). Consider allowing 0 and disabling minus at 0, or keep min 1 and disable minus when value is 1.

**Target:**

- Add **plus** and **minus** buttons on (or over) the guest number control. Plus increments; minus decrements.
- When the number is **0** (or the minimum), **disable the minus button**.

**Implementation:**

- **Template:** Wrap the guest count row in a container. Add minus and plus buttons (e.g. `lucide-icon name="minus"` / `plus`). Bind to methods that decrement/increment `guest_count_` and patch the form. Disable the minus button when value is 0 (or ≤ minimum).
- **Component:** Add `incrementGuests()` and `decrementGuests()` that get current value, clamp (min 0 or 1, max optional), and `patchValue` on the form.
- **SCSS:** Style the plus/minus buttons to match the page (e.g. recipe-header ctrl-btn pattern). Follow cssLayer and existing tokens.

---

## File summary

| Area | Files to touch |
|------|----------------|
| Labels column | `recipe-book-list.component.html`, `recipe-book-list.component.ts`, `recipe-book-list.component.scss` |
| Row height | `recipe-book-list.component.scss`, `inventory-product-list.component.scss` |
| Panel close icon + border | Both list HTML + both SCSS |
| Panel animation | Both list SCSS |
| Header layout | Both list HTML + both SCSS |
| Date label + picker + keyboard | `menu-intelligence.page.html`, `menu-intelligence.page.ts` |
| Guest number: remove spinner | `menu-intelligence.page.scss` |
| Guest number: +/- buttons | `menu-intelligence.page.html`, `menu-intelligence.page.ts`, `menu-intelligence.page.scss` |

---

## Order of work

1. Labels: signals/methods, template, SCSS, onRowClick exclusion.
2. Row height: col-labels/col-allergens in both components.
3. Panel: chevron-right icon, remove border, sharper animation in both.
4. Header: unify markup and SCSS (search center, title + add right).
5. Menu Intelligence date: clickable label, picker + focus, DD/MM/YYYY keyboard.
6. Guest number: remove spinner (SCSS).
7. Guest number: +/- buttons, disable minus at 0.

All SCSS changes must follow [.assistant/skills/cssLayer/SKILL.md](.assistant/skills/cssLayer/SKILL.md) and reuse tokens from [src/styles.scss](src/styles.scss).
