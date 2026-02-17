# Project Plan: foodVibe1.0 (FoodCo)

## Goal
Build a kitchen and recipe management application that handles product inventory, recipe authoring (with ingredients and steps), and metadata/command-center management. The app uses a simulated backend (async storage) with a path to future API migration.

## Unique Value Proposition
- **Unified kitchen data**: Products, units, recipes, and metadata in one place.
- **Recipe builder**: Structured recipes with ingredients (product/recipe refs), steps, yield, and optional i18n.
- **User control**: Pending-changes guard and clear UX for edits and approvals.

## Features
- [ ] **Inventory**: Product list, add/edit product with form and validation.
- [ ] **Recipe builder**: Create/edit recipes with ingredients table, steps, header, and ingredient search.
- [ ] **Command center**: Metadata manager for global/config data.
- [ ] **Data layer**: Core services (product-data, ingredient, unit-registry, metadata-registry, async-storage, user-msg, translation, kitchen-state).
- [ ] **UX**: User messaging (toast/feedback), pending-changes guard, translation pipe, theme-aware styling.

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
- Align any new features with this plan and the `plan/` folder.
- Keep `agent.md` and `.assistant/copilot-instructions.md` as the source of truth for AI agents.
