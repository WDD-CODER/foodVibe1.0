---
name: Sell price on dish change
overview: When the user changes a dish via the inline search, clear sell price when they pick a different recipe; when they pick the same recipe again, restore the sell price they had before.
todos: []
isProject: true
---

# Sell price on dish change (remember and restore)

- User switches to a **different** recipe: row sell price is cleared (0).
- User switches back to the **same** recipe: restore the previous sell price.
- Implementation: extend `editingDishAt_` with `previousSellPrice`; in `startEditDishName` store current sell_price; in `selectRecipe` when replacing set `sell_price` to 0 or `previousSellPrice` depending on whether selected recipe matches previous.
