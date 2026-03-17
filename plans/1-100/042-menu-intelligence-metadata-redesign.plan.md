---
name: Menu Intelligence metadata redesign
overview: Redesign the Menu Intelligence dish block so metadata (portions, cost, etc.) always sits beneath the dish name, is toggled per dish via a hide/show button, uses click-to-edit fields (no visible input until focused), and becomes a swipeable carousel on narrow screens.
---

# Menu Intelligence: Metadata beneath name, toggle, click-to-edit, carousel

## Goal

- **Default view**: User sees the menu as a clean list of dish names.
- **On demand**: User can expand metadata (costs, portions, etc.) per dish; a button hides it again.
- **Layout**: Metadata is always **below** the dish name (stacked), not beside it.
- **Editing**: Each data field is a single container; clicking the value (or label) enters edit mode with an **adjustable-width** input (no fixed-width box); no visible input until the user clicks.
- **Responsive**: When width allows, show all fields in a row; when narrow, the metadata block becomes a **horizontal carousel** (swipe to see/edit each field).

---

## Current state (reference)

- [menu-intelligence.page.html](src/app/pages/menu-intelligence/menu-intelligence.page.html): Each dish row has two grid cells — `.dish-name-cell` (name + remove + search) and `.dish-data` (list of `.dish-field` with label + `<input>`). Form: `formArrayName="items_"`, `[formGroupName]="itemIndex"`, `[formControlName]="fieldKey"`.
- [menu-intelligence.page.scss](src/app/pages/menu-intelligence/menu-intelligence.page.scss): `.dish-list` is a grid (e.g. `1fr 30%`); `.dish-row` uses `display: contents`; at 768px it becomes one column with order; at 480px `.dish-data` is a flex carousel.
- [menu-intelligence.page.ts](src/app/pages/menu-intelligence/menu-intelligence.page.ts): `activeMenuTypeFields_()`, `getItemsArray(sectionIndex)`, and form structure for sections/items/fields are used.

---

## 1. Layout: Metadata always beneath the name

- **Structure**: Change each dish from a two-cell grid row to a **single-column block**:
  - **Top**: Dish name + remove button + (when recipe selected) **toggle-metadata** button.
  - **Bottom** (conditional): Metadata block (`.dish-data`) only when that dish's metadata is expanded.
- **HTML**: In the dish list, make each item a real block (not grid contents):
  - `.dish-row` becomes a wrapper with `display: block` (or flex column) containing:
    1. `.dish-name-cell` (name, toggle button, remove, or search UI).
    2. `@if (isDishMetaExpanded(sectionIndex, itemIndex)) { <div class="dish-data"> ... </div> }`.
- **Grid removal**: `.dish-list` will be a single-column layout (e.g. `display: flex; flex-direction: column; gap: …`). Remove the two-column grid and the 30% column. `.menu-section` can stay one column as well (no need for 1fr 30% at section level).

---

## 2. Per-dish "show/hide metadata" state and button

- **State**: In [menu-intelligence.page.ts](src/app/pages/menu-intelligence/menu-intelligence.page.ts), add a signal (or equivalent) to track which dish rows have metadata visible, e.g.:
  - `expandedMetaKeys_ = signal<Set<string>>(new Set())` with key `sectionIndex-itemIndex` (e.g. `"2-1"`).
- **Methods**: `isDishMetaExpanded(sectionIndex, itemIndex): boolean` and `toggleDishMeta(sectionIndex, itemIndex): void` to read/update that set.
- **Button**: In `.dish-name-cell`, for items that have a selected recipe, add a button (e.g. chevron-down/up or "info") that calls `toggleDishMeta(sectionIndex, itemIndex)`. Label/aria: "Show metadata" / "Hide metadata" so the user can open metadata one-by-one or close it to see only the recipe name.

---

## 3. Click-to-edit data fields (no visible input until focus)

- **Concept**: Each `.dish-field` is one container. By default it shows **label + value as text** (no visible input). Clicking the value (or the whole field/label) switches to **edit mode**: show a single `<input>` that:
  - Is bound to the same `formControlName` (reactive form unchanged).
  - Has **adjustable width** (sized to content, not fixed px).
  - On blur or Enter: commit and switch back to display mode.
- **Implementation**:
  - **State**: Track which field is being edited, e.g. `editingField_ = signal<string | null>(null)` where the value is `"sectionIndex-itemIndex-fieldKey"` (or an object). So only one field is in edit mode at a time.
  - **Template** (per field):
    - `@if (isEditing(sectionIndex, itemIndex, fieldKey))`: render `<input type="number" [formControlName]="fieldKey" ... (blur)="commitEdit()" (keydown.enter)="commitEdit()">` with a class for "inline edit" and dynamic width (see below).
    - `@else`: render a clickable `<span>` (or `<button type="button">`) that shows the current control value and `(click)="startEdit(sectionIndex, itemIndex, fieldKey)"`. Label remains visible; clicking label can also call `startEdit(...)`.
  - **Width**: So the input is "adjustable" and not fixed:
    - Option B: Use **ch units**: e.g. `[style.width]="getInputWidth(item.get(fieldKey)?.value)"` where `getInputWidth(v)` returns something like `(String(v ?? '').length + 2) + 'ch'` (with a min).
    - Option C: **size** attribute on the input bound to value length (with a min) so the input grows with content.
  Recommend Option B or C for simplicity.
- **Styling**: In display mode, the field looks like a single unit (e.g. "Portions 12" or "Cost 3.5"). In edit mode, only the value part is the input; style the input to match the text (same font/size), minimal or no border until focused, and the width as above. No heavy "box" look so the whole data block stays clean.

---

## 4. Responsive: All fields in a row vs carousel

- **Wide enough**: When horizontal space allows, `.dish-data` lays out all `.dish-field` in a row (e.g. `display: flex; flex-wrap: wrap` or a small grid). No carousel.
- **Narrow**: Below a breakpoint (e.g. 480px or 600px), `.dish-data` becomes a **horizontal scroll carousel**:
  - `display: flex; flex-wrap: nowrap; overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch`
  - Each `.dish-field` (the click-to-edit container) is a snap item: `scroll-snap-align: start`, `flex: 0 0 auto`, `min-width` so the user can swipe to see each field and tap to edit. No change to the click-to-edit behavior; only the container scrolls.

---

## 5. Files and order of work

| Step | File | Change |
|------|------|--------|
| 1 | menu-intelligence.page.ts | Add `expandedMetaKeys_`, `isDishMetaExpanded`, `toggleDishMeta`; add `editingField_`, `startEdit`, `commitEdit`, `isEditing`, and optional `getInputWidth` for input sizing. |
| 2 | menu-intelligence.page.html | Restructure dish row: one block per dish; name cell with toggle button; conditionally render `.dish-data`; replace each field with display/edit branches and click-to-edit binding. |
| 3 | menu-intelligence.page.scss | `.dish-list` single column; `.dish-row` block stacking name then data; style toggle button; style click-to-edit (display vs input); carousel only at narrow breakpoint; follow cssLayer (tokens, five groups). |

---

## 6. Optional: Global "show all / hide all" metadata

If desired later, add one control (e.g. in the toolbar) that expands all dish metadata or collapses all, by updating `expandedMetaKeys_` in one go. Not required for the first version.

---

This plan keeps the existing reactive form and `activeMenuTypeFields_()` usage; only the DOM structure, visibility (toggle), presentation (click-to-edit + adjustable width), and responsive behavior (carousel on small screens) change.
