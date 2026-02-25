---
name: Recipe book list UX overhaul
overview: Implement sidebar/side-panel behavior (open by default, sticky right, mobile off-canvas), remove approved/station columns, remove sort icons, make allergens column expandable with dense grid, move cost before actions with yield tooltip, and add ingredient-search (produce chips + filter) with responsive search bar placement and shared chip styling.
todos: []
isProject: false
---

# Recipe book list UX overhaul

## Scope

All changes are in [src/app/pages/recipe-book](src/app/pages/recipe-book), primarily in [recipe-book-list.component.html](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html), [recipe-book-list.component.scss](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss), and [recipe-book-list.component.ts](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts). Chip styling will be aligned with [product-form.component.scss](src/app/pages/inventory/components/product-form/product-form.component.scss) (lines 435–461, `.chipe` and modifiers).

---

## Your changes (reflected in this plan)

- **a. Mobile sidebar close**: On mobile, the user can **slide/drag** the panel back off-screen; when the panel is at **50% of the screen** it **auto-completes** the close and slides the rest of the way off (in addition to the close button).
- **b. Approved & station**: **Keep filtering by מאושר and תחנה in the action bar (sidebar)**—only remove their **table columns**. Sidebar filter options for approved and station stay (or are added).
- **c. Sort**: User must still **sort by clicking the relevant column title**; only the arrow icons are removed. Click-to-sort logic stays.
- **d. Allergens expand**: **Combine** two behaviors: (1) **Click the allergens column header** → expand **all** rows to show allergens; (2) **Click the icon in a row** → expand **only that row**. Another click on each reverses. **Row height** must only change due to allergens expansion—no other values should affect it.
- **(e–g)**: No wording changes from you; plan already matched (cost before actions + tooltip, search placement, ingredient search with chips and clear).

---

## a. Action bar (sidebar) behavior

- **Desktop**: Sidebar open by default; sticky to the right; close button.
- **Mobile**: Sidebar closed by default, off to the right; button to open (high z-index); close via button or swipe/drag—when panel at 50% screen, auto-complete close.

## b. Remove columns מאושר (approved) and תחנה (station)

- Remove table header and row cells for approved and station only. Keep filter categories for Approved and Station in sidebar. Grid 6 columns.

## c. Remove sort arrow icons, keep sort-on-title logic

- Remove all sort lucide-icons; keep click/keydown handlers and setSort.

## d. Allergens column

- Narrow by default; click header = expand all rows; click row icon = expand that row only; dense grid; only allergens expansion affects row height.

## e. Cost column

- Move before actions. Floating tooltip on hover (desktop) / tap (mobile): yield amount + unit (getRecipeYieldDescription).

## f. Search bar placement

- Desktop: ingredient search beside header (action bar row). Mobile: fixed top with toggle to open/close.

## g. Ingredient search (produce)

- Input + dropdown (products by name_hebrew); select → chip; click chip to remove; clear button; filter recipes that contain ALL selected products (AND). Chip styling like product-form .chipe.

---

## Summary of file changes

| File | Changes |
|------|--------|
| recipe-book-list.component.ts | Sidebar default (matchMedia); SortField without approved/station; filter categories Approved + Station; ingredient search signals + recipeContainsAllProducts + filteredRecipes_; getRecipeYieldDescription; allergen expand-all / expand-one; cost tooltip signals; isMobileSearchOpen_; optional swipe-to-close. |
| recipe-book-list.component.html | No approved/station columns; column order name, type, main_category, allergens, cost, actions; no sort icons; allergens header/row expand; cost tooltip; ingredient search (header + mobile fixed); sidebar filters include Approved, Station. |
| recipe-book-list.component.scss | 6-col grid; sidebar sticky + mobile off-canvas + swipe; col-allergens min + expanded dense grid; cost tooltip; .chipe.ingredient; mobile search fixed + toggle. |

No new dependencies. Use KitchenStateService, RecipeCostService, TranslationService, ClickOutSideDirective, FormsModule, LucideAngularModule.
