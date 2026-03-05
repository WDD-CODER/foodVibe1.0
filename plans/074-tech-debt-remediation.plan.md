# Technical Debt Remediation Plan

This plan addresses the critical and high-priority issues identified in the [Tech Debt Report](docs/tech-debt-2025-03-05.md).

## Phase 1: Modernization & Type Safety (High Priority)

**Goal**: Eliminate legacy Angular patterns and improve type safety in core services.

### 1.1 Migrate `@Input()/@Output()` to Signals

Refactor the following components to use the modern `input()` and `output()` APIs:

- [src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts](src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts) (`focusSearchAtRow`)
- [src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.ts](src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.ts) (`focusRowAt`)
- [src/app/pages/suppliers/components/supplier-form/supplier-form.component.ts](src/app/pages/suppliers/components/supplier-form/supplier-form.component.ts) (`embeddedInDashboard`, `saved`, `cancel`)
- [src/app/pages/venues/components/venue-form/venue-form.component.ts](src/app/pages/venues/components/venue-form/venue-form.component.ts) (`embeddedInDashboard`, `saved`, `cancel`)
- [src/app/shared/cell-carousel/cell-carousel.component.ts](src/app/shared/cell-carousel/cell-carousel.component.ts) (`activeIndex`, `activeIndexChange`)
- [src/app/core/directives/click-out-side.ts](src/app/core/directives/click-out-side.ts) (`clickOutside`)

### 1.2 Fix Critical `any` Types

Replace `any` with proper interfaces in:

- [src/app/core/services/conversion.service.ts](src/app/core/services/conversion.service.ts) (`wastePercent`, `yieldFactor` -> `number`)
- [src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.ts](src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.ts) (`selectItem` -> `Ingredient | Recipe`)

## Phase 2: Critical File Size Reduction (Recipe Builder)

**Goal**: Reduce [src/app/pages/recipe-builder/recipe-builder.page.ts](src/app/pages/recipe-builder/recipe-builder.page.ts) from ~960 lines to <400.

### 2.1 Extract `RecipeFormService`

- Create `src/app/pages/recipe-builder/services/recipe-form.service.ts`.
- Move `FormGroup` initialization, validation logic, and `FormArray` manipulation (add/remove ingredients/steps) to this service.
- The page component will inject this service to bind the form to the template.

## Phase 3: SCSS Refactoring

**Goal**: Modularize large SCSS files (>700 lines) to improve maintainability.

### 3.1 Refactor Menu Intelligence Styles

- Split [src/app/pages/menu-intelligence/menu-intelligence.page.scss](src/app/pages/menu-intelligence/menu-intelligence.page.scss) into partials:
  - `_layout.scss` (Shell, grid)
  - `_paper-ui.scss` (The "paper" look, borders)
  - `_toolbar.scss` (Action buttons)
- Import these in the main component SCSS.

### 3.2 Refactor Recipe Book List Styles

- Apply similar modularization to [src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss](src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.scss).

## Phase 4: Localization & Polish (Medium Priority)

**Goal**: Remove hardcoded strings and clean up TODOs.

- Extract Hebrew strings in `ingredient-search.component.html` and `metadata-manager.page.component.html` to `dictionary.json`.
- Resolve `::ng-deep` TODOs in SCSS files where possible.
