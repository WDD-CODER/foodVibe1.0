---
name: Menu Intelligence UX Polish
overview: "Polish the menu-intelligence page with 8 UX improvements: auto-focus dish search on recipe select, restyle delete icons, width-fit metadata, unified glass dropdowns with clickOutside, borderless meta rows, keyboard navigation, info icon toggle for dish meta, and centered dish-data fields."
---

# Menu Intelligence UX Polish

## Files to modify

- [menu-intelligence.page.html](src/app/pages/menu-intelligence/menu-intelligence.page.html) -- template changes
- [menu-intelligence.page.scss](src/app/pages/menu-intelligence/menu-intelligence.page.scss) -- styling changes
- [menu-intelligence.page.ts](src/app/pages/menu-intelligence/menu-intelligence.page.ts) -- logic for focus, keyboard nav, clickOutside

---

## 1. Auto-focus dish search input on recipe select

When a user selects a recipe for one dish, after adding a new row (or when adding an item), programmatically focus the dish search input so the user can start typing immediately.

- In `addItem()`: after pushing the new form group, schedule a `setTimeout` to focus the new input (e.g. last `.dish-search-input` in that section).
- When user selects a recipe in `selectRecipe()`, optionally auto-add next item and focus its search input so they can keep adding dishes.

## 2. Restyle delete icons

- Replace `<lucide-icon name="x" ...>` with `<lucide-icon name="trash-2" ...>` on `.dish-remove` and `.section-remove`.
- Remove hover background on `.dish-name-cell` (no `background-color` on hover).
- Keep delete button on the left (already `inset-inline-start: 0`).

## 3. Meta-column width: fit-content

- Change `.meta-column` to `width: fit-content; min-width: 200px;` (remove or adjust `max-width: 360px`).

## 4. Unify all dropdowns to glass design + clickOutside

- Event type dropdown: wrap in a container with `(clickOutside)="closeEventTypeDropdown()"`.
- Dish search dropdown: add `(clickOutside)` to `.dish-search-wrap` to clear/close.
- Section search already has clickOutside.
- Use design-system tokens for dropdown items (e.g. `var(--bg-glass)`, `var(--border-glass)`).

## 5. Meta rows — remove borders, consistent look

- Remove or unify borders on `.meta-input` and `.event-type-search`; keep only subtle `:focus` indicator.
- Override `app-custom-select` trigger in `.meta-column` context to match borderless meta rows.

## 6. Keyboard navigation

- Extend for section headers, dish search inputs (Escape, Enter to select first), and dish field Tab order.
- Keep existing `onMetaKeydown` and add handlers where needed.

## 7. Dish meta toggle: info icon + spacing

- Collapsed: show `info` icon. Expanded: show `chevron-up`.
- Add `margin-inline-start` to `.dish-meta-toggle` to separate from dish name.

## 8. Center dish-data fields

- Add `justify-content: center` to `.dish-data`.
- Ensure `.dish-field` label/value alignment (e.g. `text-align: center` if desired).
