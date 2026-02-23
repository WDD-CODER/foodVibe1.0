# Project Plan: foodVibe1.0 (FoodCo)

## Goal
Build a kitchen and recipe management application that handles product inventory, recipe authoring (with ingredients and steps), and metadata/command-center management. The app uses a simulated backend (async storage) with a path to future API migration.

## Unique Value Proposition
- **Unified kitchen data**: Products, units, recipes, and metadata in one place.
- **Recipe builder**: Structured recipes with ingredients (product/recipe refs), steps, yield, and optional i18n.
- **User control**: Pending-changes guard and clear UX for edits and approvals.

## i18n: English Codebase, Hebrew UI

The application is **written in English** (keys, IDs, code) but **serves Hebrew to the user** via a local translation system.

### Translation System
- **Pipe**: `translatePipe` — use in templates: `{{ 'KEY' | translatePipe }}` or `{{ variable | translatePipe }}`
- **Service**: `TranslationService` — `translate(key)` for programmatic use
- **Dictionary**: `public/assets/data/dictionary.json` — local JSON with nested sections: `units`, `categories`, `allergens`, `general`
- **Cache**: User-added translations stored in `localStorage` (`DICTIONARY_CACHE`), merged with base dictionary at load

### Mandatory Workflow
1. **All user-facing text** must use `translatePipe` (or `translationService.translate()`) with an **English key** (lowercase, underscores).
2. **Before or with each feature**: Add the key and Hebrew value to `dictionary.json` in the appropriate section (`general` for UI strings, `units` for units, etc.).
3. **Never hardcode Hebrew** in templates or components — always go through the dictionary.
4. **Key format**: `snake_case`, e.g. `add_new_unit`, `recipe_name_placeholder`, `cost_label`.

### Dictionary Structure
```json
{
  "units": { "gram": "גרם", "cup": "כוס", ... },
  "categories": { "dairy": "חלבי", "vegetables": "ירקות", ... },
  "allergens": { "gluten": "גלוטן", "nuts": "אגוזים", ... },
  "general": { "search": "חיפוש", "cost": "עלות", ... }
}
```

## Features — Core (Complete)
- [x] **Inventory**: Product list with filters, sorting, inline editing, add/edit product form with validation, supplier integration.
- [x] **Recipe builder**: Create/edit recipes and dishes with ingredients table, cost calculation, workflow steps, dual type (preparation/dish), pending changes guard.
- [x] **Recipe book**: Browse, filter, sort, and manage all recipes with allergen aggregation and actions.
- [x] **Command center**: Metadata manager for units, categories, allergens with translation key modal.
- [x] **Data layer**: Core services (product-data, recipe-data, dish-data, supplier-data, unit-registry, metadata-registry, preparation-registry, async-storage, user-msg, translation, kitchen-state, recipe-cost, conversion).
- [x] **UX**: User messaging (toast with undo), pending-changes guard, translation pipe (Hebrew UI), cohesive modals (AddItemModal, TranslationKeyModal, GlobalSpecificModal, ConfirmModal).
- [x] **Unit tests**: 89+ specs passing (Karma/Jasmine) covering services, components, guards, resolvers, pipes, directives.

## Features — Planned (see `plans/010-product-roadmap.plan.md`)
- [ ] **Dashboard**: KPI cards, recent activity, quick actions — default landing page.
- [ ] **Supplier management page**: Dedicated CRUD page for suppliers.
- [ ] **Recipe quick actions**: Duplicate, approval toggle, batch operations.
- [ ] **Low stock alerts**: Visual indicators, filter, dashboard card.
- [ ] **Empty states & onboarding**: Guided first-use experience.
- [ ] **Print-friendly recipes**: Print stylesheet for kitchen use.
- [ ] **Backend API preparation**: Formalize adapter interface, document API contract.
- [x] **E2E tests**: Playwright setup with critical flow coverage (product CRUD, recipe creation, recipe edit).

## Tech Stack
- **Frontend**: Angular 19 (Standalone, Signals, strict TypeScript)
- **Styling**: SCSS, Tailwind, lucide-angular
- **Storage**: AsyncStorageService (simulated backend; migration-ready)
- **Routing**: Lazy-loaded pages with resolvers and guards

## High-Level Implementation
1. **Foundation**: This Angular app with strict TypeScript and path aliases.
2. **Core**: Services in `src/app/core/services/`, models in `src/app/core/models/`, guards/resolvers/pipes/directives in `src/app/core/`.
3. **Pages**: `inventory`, `recipe-builder`, `metadata-manager` (command-center) with page-specific components.
4. **Shared**: Reusable UI in `src/app/shared/`; app shell in `src/app/appRoot/`.

## Next Steps
- Follow the phased roadmap in `plans/010-product-roadmap.plan.md`.
- Track progress in `.assistant/todo.md`.
- Align any new features with this plan and the `plans/` folder.
- Keep `agent.md` and `.assistant/copilot-instructions.md` as the source of truth for AI agents.
- **i18n**: For every new user-facing string, add the English key to `dictionary.json` and use `translatePipe` in templates (or `translationService.translate()` in code).
