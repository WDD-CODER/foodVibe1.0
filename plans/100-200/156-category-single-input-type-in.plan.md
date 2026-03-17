---
name: Category single-input type-in
overview: Unify the Category control into one type-in container: the main visible area is both the place for chips and the single input; remove the separate "Filter" section and search input from inside the dropdown. Apply only in product-form (the only place this pattern exists).
---

# Category: Single type-in container (no Filter section in dropdown)

## Step 1 – Where the pattern was applied (findings)

The **"Filter label + separate search input inside dropdown"** pattern exists in **exactly one place** in the codebase:

| Location | Usage |
|----------|--------|
| `src/app/pages/inventory/components/product-form/product-form.component.html` (lines 26–86) | **Category** field: trigger (chips + placeholder) opens a dropdown that contains a **"סינון" (Filter)** block with a dedicated search input, then the option list. |

**Not used elsewhere:** Allergen in the same form is already a single container (chips + one input). Supplier dropdown has no search. No other components use this pattern.

## Step 2 – Desired behavior and implementation

### Desired behavior

- **One type-in container**: Chips + one input in the same row. No "Filter" section or second search field inside the dropdown.
- **Click/focus**: Clicking the container or the input focuses the input and opens the dropdown.
- **Typing**: User types in that same input; options filter by `categorySearchQuery_`.
- **Dropdown content**: Only the list of (filtered) options + "Add new category" row.
- **Keyboard**: Input has focus when dropdown opens; ArrowDown from input moves focus into the list; Enter/Space select; Escape closes dropdown. After adding a category, focus stays in the input.

### Files to touch

1. **product-form.component.html** – Restructure category block to chips + single input; remove Filter block from dropdown.
2. **product-form.component.ts** – Focus single input on open/after select; ArrowDown-from-input to list; use `categoryInputRef` instead of trigger ref where appropriate.
3. **product-form.component.scss** – Remove in-dropdown search styles; add styles for the single input in the category box.
