# Active Tasks

Update status after each sub-task. Link plan files here when applicable.

---

## Done

- [x] Recipe-builder plan executed: `plan/recipe-builder-page.md` — A1–A5, C1–C2 (currentCost, mise-en-place fix, persistence, RecipeDataService, edit flow, pendingChangesGuard, reactive portions).
- [x] Unit test suite in place: 27 `.spec.ts` files (Karma/Jasmine).
- [x] Core services with substantive tests: `product-data.service`, `async-storage.service`, `unit-registry.service`, `metadata-registry.service`, `conversion.service`, `kitchen-state.service`, `translation.service`.
- [x] Core guards, resolvers, pipes, directives covered: `pending-changes.guard`, `product.resolver`, `translation-pipe.pipe`, `select-on-focus.directive`, `click-out-side.directive`, `item.validators`.
- [x] Core UI components: `header`, `footer`, `user-msg`.
- [x] Inventory page and components: `inventory.page`, `inventory-product-list`, `product-form`.
- [x] Recipe-builder page and components: page + `recipe-workflow`, `recipe-ingredients-table`, `recipe-header`, `ingredient-search` (minimal “should create” specs).
- [x] Metadata-manager page: `metadata-manager.page.component`.
- [x] Shared: `unit-creator.component`.
- [x] App root: `app.component.spec.ts`.
- [x] Fix spec compile errors: `pending-changes.guard.spec`, `translation-pipe.pipe.spec`, `metadata-manager.page.component.spec` (suite builds and runs; 68 pass, 21 fail at runtime).

---

## Ahead

- [x] Fix remaining 21 failing unit tests: provide `HttpClient` / `TranslationService` where needed; satisfy required inputs in `RecipeIngredientsTableComponent` and `RecipeWorkflowComponent`; align `MetadataRegistryService` and `UnitRegistryService` specs with async API; add Lucide icons to specs where needed; fix header route assertion.
- [x] Run full unit test suite (`npm test -- --no-watch --browsers=ChromeHeadless`) and confirm all tests pass (89/89).
- [ ] Add or extend e2e tests (Playwright per `.assistant/copilot-instructions.md`) if not yet present.
- [ ] Optionally expand minimal specs (e.g. recipe-builder page and subcomponents) with behavior tests when touching those areas.
- [ ] When adding new features: add/update `.spec.ts` and mark related sub-tasks here; run tests before considering the task done.
