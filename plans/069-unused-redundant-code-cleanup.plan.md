# Unused and Redundant Code Cleanup Plan

## Summary

After exploring the codebase, the following were identified:

- **Unused code**: 3 removable items (RecipeModule, SystemHealth, ingredient.service stub)
- **Dead commented code**: 2 locations (metadata-manager page, unit-creator spec)
- **Stale config**: 1 tsconfig path alias
- **Documentation**: 2 breadcrumb files to update after removals
- **Redundant patterns**: List/form duplication already scoped in [plans/068-unified-list-shell-component.plan.md](plans/068-unified-list-shell-component.plan.md) — no duplicate cleanup here

---

## 1. Unused code to remove

### 1.1 RecipeModule (empty NgModule)

| Where | What |
|-------|------|
| [src/app/core/models/recipe/recipe.module.ts](src/app/core/models/recipe/recipe.module.ts) | NgModule with empty `declarations`, only imports `CommonModule` |

- **Evidence**: Never imported anywhere in the app (grep for `RecipeModule` / `recipe.module` only finds its definition).
- **Action**: Delete [src/app/core/models/recipe/recipe.module.ts](src/app/core/models/recipe/recipe.module.ts). If the folder [src/app/core/models/recipe/](src/app/core/models/recipe/) contains only this file and an index, remove the file only; if an `index.ts` re-exports it, remove that export (or the file) and keep other exports.

### 1.2 SystemHealth (unused utility)

| Where | What |
|-------|------|
| [src/app/core/utils/system-health.ts](src/app/core/utils/system-health.ts) | Exported class with a single `appStatus` signal |

- **Evidence**: Only referenced in [src/app/core/breadcrumbs.md](src/app/core/breadcrumbs.md); no imports in app or tests.
- **Action**: Delete [src/app/core/utils/system-health.ts](src/app/core/utils/system-health.ts). Update [src/app/core/breadcrumbs.md](src/app/core/breadcrumbs.md): remove the `utils/ | system-health.ts` row from the Navigation table (and any other references to `system-health` or "System health helpers").

### 1.3 IngredientService (fully commented-out file)

| Where | What |
|-------|------|
| [src/app/core/services/ingredient.service.ts](src/app/core/services/ingredient.service.ts) | Entire file is commented out (no active export) |

- **Evidence**: No active `IngredientService` export; breadcrumbs still list it.
- **Action**: Delete [src/app/core/services/ingredient.service.ts](src/app/core/services/ingredient.service.ts). In [src/app/core/services/breadcrumbs.md](src/app/core/services/breadcrumbs.md), remove the row for `ingredient.service.ts` (e.g. `| ingredient.service.ts | Ingredient helpers | IngredientService |`).

---

## 2. Dead commented code to remove or fix

### 2.1 Metadata-manager: commented removeUnit / removeAllergen / removeCategory

| Where | What |
|-------|------|
| [src/app/pages/metadata-manager/metadata-manager.page.component.ts](src/app/pages/metadata-manager/metadata-manager.page.component.ts) | Lines ~219–263: large block of commented-out logic |

- **Content**: Commented `removeUnit`, `removeAllergen`, and `removeCategory` methods (with in-use checks and registry calls). Deletion is already handled in the active `deleteItem` flow (e.g. `deleteAllergen`, `deleteCategory`).
- **Action**: Delete the commented block (lines 219–263). No behavior change; reduces noise and confusion.

### 2.2 Unit-creator spec: fully commented and wrong import path

| Where | What |
|-------|------|
| [src/app/shared/unit-creator/unit-creator.component.spec.ts](src/app/shared/unit-creator/unit-creator.component.spec.ts) | Entire spec commented out; references `./unit-creator-modal.component` (old path) |

- **Evidence**: Component is now [src/app/shared/unit-creator/unit-creator.component.ts](src/app/shared/unit-creator/unit-creator.component.ts) (export `UnitCreatorModal`, selector `unit-creator-modal`). Spec is leftover from a refactor.
- **Options** (choose one):
  - **A (recommended)**: Delete the commented block and add a minimal placeholder spec that imports from `./unit-creator.component` and has a single `it('should create', () => { ... })` so the file is valid and the path is correct.
  - **B**: Delete the entire spec file if the project does not require tests for this component.
  - **C**: Restore and fix the full spec (update imports and selector to current component) in a follow-up task.

---

## 3. Stale config

### 3.1 tsconfig path alias @components/*

| Where | What |
|-------|------|
| [tsconfig.json](tsconfig.json) | `"@components/*": ["src/app/components/*"]` |

- **Evidence**: There is no `src/app/components` directory; components live under `appRoot`, `core/components`, `shared`, and `pages/*/components`. No import in the repo uses `@components/`.
- **Action**: Remove the `@components/*` entry from the `paths` object in [tsconfig.json](tsconfig.json) to avoid misleading future edits.

---

## 4. Optional consistency (non-blocking)

- **Import path**: [src/app/shared/custom-select/custom-select.component.ts](src/app/shared/custom-select/custom-select.component.ts) imports `ClickOutSideDirective` via `'../../core/directives/click-out-side'`. Rest of the app uses `@directives/click-out-side`. Consider changing to the alias for consistency only; not required for this cleanup.

---

## 5. Redundant patterns (already planned)

- **List components**: Equipment, venue, supplier, inventory-product, recipe-book, and menu-library lists share similar structure (search, filters, shell, optional carousel). Consolidation is covered by [plans/068-unified-list-shell-component.plan.md](plans/068-unified-list-shell-component.plan.md). No additional "remove redundant code" actions in this plan; execute 068 when ready.
- **SCSS TODOs**: The three `TODO: remove ::ng-deep` comments in recipe-header, ingredient-search, and recipe-ingredients-table SCSS are intentional follow-ups (when custom-select/scrollable-dropdown expose slots or engine classes). Leave as-is.

---

## 6. Execution order

1. **Config**: Remove `@components/*` from [tsconfig.json](tsconfig.json).
2. **Delete unused files**: [recipe.module.ts](src/app/core/models/recipe/recipe.module.ts), [system-health.ts](src/app/core/utils/system-health.ts), [ingredient.service.ts](src/app/core/services/ingredient.service.ts).
3. **Update docs**: [core/breadcrumbs.md](src/app/core/breadcrumbs.md) (remove utils/system-health), [core/services/breadcrumbs.md](src/app/core/services/breadcrumbs.md) (remove ingredient.service).
4. **Remove commented code**: [metadata-manager.page.component.ts](src/app/pages/metadata-manager/metadata-manager.page.component.ts) (delete lines ~219–263).
5. **Unit-creator spec**: Either replace with minimal passing spec (Option A) or delete file (Option B).

---

## 7. Files changed (checklist)

| Action | File |
|--------|------|
| Edit | [tsconfig.json](tsconfig.json) |
| Delete | [src/app/core/models/recipe/recipe.module.ts](src/app/core/models/recipe/recipe.module.ts) |
| Delete | [src/app/core/utils/system-health.ts](src/app/core/utils/system-health.ts) |
| Delete | [src/app/core/services/ingredient.service.ts](src/app/core/services/ingredient.service.ts) |
| Edit | [src/app/core/breadcrumbs.md](src/app/core/breadcrumbs.md) |
| Edit | [src/app/core/services/breadcrumbs.md](src/app/core/services/breadcrumbs.md) |
| Edit | [src/app/pages/metadata-manager/metadata-manager.page.component.ts](src/app/pages/metadata-manager/metadata-manager.page.component.ts) |
| Edit or delete | [src/app/shared/unit-creator/unit-creator.component.spec.ts](src/app/shared/unit-creator/unit-creator.component.spec.ts) |
| Optional | [src/app/shared/custom-select/custom-select.component.ts](src/app/shared/custom-select/custom-select.component.ts) (alias for ClickOutSideDirective) |

After changes, run the build and tests to confirm nothing breaks (no other code imports the removed modules or system-health).
