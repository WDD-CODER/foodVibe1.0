# Tab Orders — Canonical Keyboard Navigation Reference

Reference for keyboard-only navigation order in key pages. When changing these pages or their child components, preserve this tab order. Irrelevant controls (e.g. plus/minus buttons) use `tabindex="-1"` and are skipped.

---

## Recipe Builder

1. **Dish or recipe** — Type toggle (recipe-header).
2. **Name** — Recipe/dish name input.
3. **Main unit** — Primary unit selector (unit-switcher open with Enter/Space; arrows to choose).
4. **Counter value** — Value inside the primary portions/servings input (arrows to change).
5. **Add another measurement unit** — Add-unit button.
6. **Added unit select** — Each secondary unit's selector (if present).
7. **Value inside new unit** — Each secondary amount input (if present).
8. **Label** — Labels container (open with Enter/Space).
9. **Ingredient index** — Ingredients section header (expand/collapse with Enter/Space).
10. **First ingredient search** — First row ingredient search.
11. **Ingredient rows** — Per row: search (or display), unit select, quantity input; then next row.
12. **Add row** — Add ingredient row button.
13. **Workflow container** — Workflow section header (expand/collapse).
14. **Text area** — Instruction textarea (prep) or first workflow control (dish).
15. **Time value** — Labor-time field (prep) per row.
16. **Add another row** — Add workflow step button.
17. **Logistics container** — Logistics section header (expand/collapse).
18. **Search (logistics)** — Tool search input.
19. **Quantity (logistics)** — Qty input (arrows to change; +/- skipped).
20. **Add (logistics)** — Add tool button.
21. **Items in grid** — Logistics chips (added tools).
22. **Save** — Save recipe/dish button.

---

## Menu Intelligence

1. **Menu name** — Text input (initial focus).
2. **Event type** — Trigger button; Enter/Space/ArrowDown open dropdown; ArrowUp/Down move, Enter/Space select; Escape close.
3. **Serving type** — Custom-select (Enter/Space open, Arrow move, Enter/Space select).
4. **Guest count** — Number input (ArrowUp/Down change value; +/- skipped).
5. **Event date** — Date wrap (Enter/Space open picker); date input for value.
6. **Section 1 title** — Button; Enter/Space open section category search.
7. **Section 1 category search** — When open: type to filter, ArrowUp/Down, Enter/Space select; Tab to first dish in section.
8. **Section 1 — Dish 1** — If empty: dish search input (Arrow/Enter/Space to select). If filled: dish name (optional edit), then **sell price** input (Arrow to change). Tab from dish search or sell price to next dish or add-dish.
9. **Section 1 — Dish 2, ...** — Same pattern per row.
10. **Section 1 — Add dish** — Button.
11. **Section 2 title**, **Section 2 category search**, **Section 2 dishes**, **Add dish**, ...
12. **Add section** — Button.
13. **Toolbar (when open)** — Export/Save etc.; **Save** as final action.
