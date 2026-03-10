---
name: Hero FAB export and page actions
overview: "Use the single hero FAB (bottom-left) as the entry point for export and page-specific actions: on menu-intelligence show Toolbar + Go back (and remove the separate menu FAB); on recipe-builder add Export and contextual Cook. Main FAB press starts new recipe. HeroFabService lets pages register actions."
todos: []
---

# Hero FAB as single entry for export and page actions

## Goal

- **One FAB**: Use only the main **hero FAB** (bottom-left, flame icon) for quick actions everywhere.
- **Main FAB button (flame) press**: Change default behavior from "go to Cook" to **start a new recipe** (navigate to recipe-builder).
- **Cook action**: When the user is on a **saved** recipe/dish (e.g. in recipe-builder), pressing Cook navigates to **cook-view for that item** (`/cook/:id`); otherwise `/cook`.
- **Menu builder**: Move menu FAB actions (open toolbar, go back) **into** the hero FAB; **remove** the separate menu FAB.
- **Recipe builder**: Register hero FAB in **replace** mode: Export, Cook (contextual), Recipe creation.

## Implementation

### 1. HeroFabService (new)

- **Path**: `src/app/core/services/hero-fab.service.ts`
- **API**: `setPageActions(actions: HeroFabAction[], mode: 'replace' | 'append')`, `clearPageActions()`, `pageActions()` (signal). `HeroFabAction`: `{ labelKey: string; icon: string; run: () => void }`. ProvidedIn: `'root'`.

### 2. Hero FAB component

- Main button `(click)` → `goToRecipeBuilder()`.
- Inject HeroFabService; add `isOnRecipeBuilder_()`. When `pageActions()` set: if mode `replace` show only those actions; if `append` show those + default; else show default (Recipe creation, Cook). Wire each action to `action.run()` then `collapse()`.

### 3. Menu-intelligence

- Inject HeroFabService. In ngOnInit: `setPageActions([{ labelKey: 'menu_toolbar_open', icon: 'settings', run: () => this.openToolbar() }, { labelKey: 'menu_library', icon: 'arrow-right', run: () => this.goBack() }], 'replace')`. In ngOnDestroy: `clearPageActions()`.
- Remove menu FAB block from HTML and related SCSS (`.menu-fab-container`, etc.).

### 4. Recipe-builder

- Inject HeroFabService and Router. In ngOnInit: `setPageActions([Export, Cook contextual, Recipe creation], 'replace')`. Export: `openExportFromHeroFab()` sets `exportBarExpanded_.set(true)`. Cook: `goToCookFromHeroFab()` → `navigate(recipeId_() ? ['/cook', recipeId_()] : ['/cook'])`. Recipe creation: `navigate(['/recipe-builder'])`. In ngOnDestroy: `clearPageActions()`.

## Files to add

- `src/app/core/services/hero-fab.service.ts`

## Files to change

- `src/app/core/components/hero-fab/hero-fab.component.ts`, `hero-fab.component.html`
- `src/app/pages/menu-intelligence/menu-intelligence.page.ts`, `menu-intelligence.page.html`, `menu-intelligence.page.scss`
- `src/app/pages/recipe-builder/recipe-builder.page.ts`
