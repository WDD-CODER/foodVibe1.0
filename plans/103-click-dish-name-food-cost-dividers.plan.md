---
name: Click dish name to search
overview: Enable click-on-dish-name to turn the cell into the existing search bar; add read-only food cost per portion in dish-data; use one divider style between info and menu and a different one between course categories.
todos: []
isProject: true
---

# Click dish name to change dish (inline search)

## Current state

- When a row has a recipe (`recipe_id_` set), the template shows the dish name in a **non-clickable** `<span class="dish-name">`.
- When a row has no recipe, the same cell shows the **search input + dropdown** (`dish-search-wrap`).

The component already implements "edit dish name" end-to-end via `startEditDishName`, `selectRecipe` (replace when `editingDishAt_`), and `clearDishSearch`. The only gap is wiring the dish name to `startEditDishName`.

## Implementation

### 1. Template: make dish name clickable

- Replace the static `<span class="dish-name">` with a **button** (click calls `startEditDishName(sectionIndex, itemIndex)`), aria-label from translation key `change_dish`.

### 2. Styles: button that looks like text

- Add `.dish-name-btn` (or style `.dish-name` when button): reset (border/background/padding), cursor pointer, hover affordance. Follow cssLayer SKILL.

### 3. (a) Read-only food cost per portion in dish-data

- Add a **separate** read-only field in `dish-data`: label from `dish_food_cost_per_portion`, value from `getFoodCostPerPortion(sectionIndex, itemIndex)` = `getAutoFoodCost(...) / Math.max(1, serving_portions)`. Use `.dish-field.read-only` (no click, no input).

### 4. (b) Divider: info–menu only vs between course categories

- **Info–menu boundary (once):** Replace `paper-divider` with an element using the current **section-ornament** style (e.g. class `info-menu-divider`).
- **Between sections:** Keep an element when `sectionIndex > 0` but with a **different** class (e.g. `section-divider`) and distinct styling (e.g. paper-divider look or thinner/dotted).

### 5. i18n

- Add `change_dish`, `dish_food_cost_per_portion` to dictionary.json (general) if missing.

## Optional

- Consider registering any new Lucide icon only if adding an icon next to the dish name.
