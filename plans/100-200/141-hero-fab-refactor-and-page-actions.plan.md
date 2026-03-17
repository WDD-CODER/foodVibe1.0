# Plan 141 — Hero FAB refactor and page-specific actions

## Goals

1. **Hero FAB**: Main button always "create new recipe"; hover shows only page-specific actions (no global defaults).
2. **Recipe-builder**: Export on create; Export + Cook-view on edit. Use replace mode.
3. **Menu-intelligence**: Export only, replace mode.
4. **Cook-view** (when viewing a recipe, `/cook/:id`): FAB action "Edit recipe" → `/recipe-builder/:id`.
5. **Menu-library**: FAB action "New menu" → `/menu-intelligence`.
6. **Recipe-book list**: Replace the row **edit** button with a **cook** button (go to cook view for that recipe); row click still opens edit.
7. **Cook-view when no recipe** (`/cook`): No FAB action (not reachable without row/flow).

## Implementation

### 1. Hero FAB component

- **effectiveActions_**: When `pageActions()` is `null`, return `[]`. When state exists, return only `state.actions` (treat as replace-only for this refactor).
- **Template**: Remove or simplify the `title` that showed "sign_in_to_use" for `recipe_creation` (no longer an action).

### 2. Recipe-builder page

- In `ngOnInit`, after route/resolver handling, build actions: always `[Export]`; if `this.recipeId_()` is set, add `{ labelKey: 'cook_view', icon: 'cooking-pot', run: () => this.router_.navigate(['/cook', this.recipeId_()]) }`.
- Call `setPageActions(actions, 'replace')`.

### 3. Menu-intelligence page

- Change `setPageActions` to use mode `'replace'` (same single action).

### 4. Cook-view page

- Inject `HeroFabService`. In `ngOnInit`, when `recipe_()` is set (i.e. we have route data recipe), call `setPageActions([{ labelKey: 'edit', icon: 'pencil', run: () => this.router.navigate(['/recipe-builder', this.recipe_()!._id]) }], 'replace')`.
- In `ngOnDestroy`, call `clearPageActions()`.

### 5. Menu-library page

- Add `OnInit`, `OnDestroy`, inject `HeroFabService` and `Router`. In `ngOnInit`, `setPageActions([{ labelKey: 'menu_new_event', icon: 'file-plus', run: () => this.router.navigate(['/menu-intelligence']) }], 'replace')`. In `ngOnDestroy`, `clearPageActions()`.
- Ensure `FilePlus` is registered in app.config (already present).

### 6. Recipe-book list

- In the row actions column: **replace** the edit (pencil) button with a cook button: icon `cooking-pot`, `(click)="onCookRecipe(recipe); $event.stopPropagation()"`, `aria-label`/`title` from translation key `cook` (or `cook_view`).
- Row click and keyboard (Enter/Space) remain `onEditRecipe(recipe)` (edit in recipe-builder).

### 7. Translation

- Add `cook_view` to dictionary (e.g. "מצב בישול" / "Cook view") for recipe-builder FAB action label.

## Files

- [hero-fab.component.ts](src/app/core/components/hero-fab/hero-fab.component.ts)
- [hero-fab.component.html](src/app/core/components/hero-fab/hero-fab.component.html)
- [recipe-builder.page.ts](src/app/pages/recipe-builder/recipe-builder.page.ts)
- [menu-intelligence.page.ts](src/app/pages/menu-intelligence/menu-intelligence.page.ts)
- [cook-view.page.ts](src/app/pages/cook-view/cook-view.page.ts)
- [menu-library.page.ts](src/app/pages/menu-library/menu-library.page.ts)
- [recipe-book-list.component.html](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html)
- [dictionary.json](public/assets/data/dictionary.json)
