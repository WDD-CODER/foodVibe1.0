# Plan 454 — Share one data-service base and stop wrapping Promises into Observables

Status: draft
Track: code
Depends-on: 450
Conflicts-with: 451, 452, 453, 455, 456
Snapshot: c1e6db7afb472e27bc90befbe3527b5cb3a9bebd

## Problem Statement
Reuse audit family "Entity data service / Taxonomy / State" (`docs/mvp/reuse-audit-2026-10-20.md`):
1. `recipe-data.service.ts`, `dish-data.service.ts`, `product-data.service.ts` and `menu-event-data.service.ts` each hand-copy the load block (`loaded_`, `loadPromise_`, `hasLoaded`, `ensureLoaded`, `reloadFromStorage`) that `core/services/base-entity-data.service.ts` (`BaseEntityDataService<T>`) already provides. `equipment-`, `supplier-` and `venue-data.service.ts` already extend it.
2. `kitchen-state.service.ts` wraps Promise-based data-service calls in `from(...)` and returns `Observable`s (`saveProduct`, `deleteProduct`, `saveRecipe`, `deleteRecipe`, `permanentlyDeleteRecipe`); every caller then `.subscribe`s or `firstValueFrom`s a one-shot value.
3. `unit-registry.service.ts` keeps a RxJS `unitAdded$ = new Subject<string>()` (plus `creatorClosed$`) behind `awaitUnitCreated()`; AGENTS.md says signals only.
4. The five taxonomy facades (`metadata-registry`, `preparation-registry`, `equipment-category-registry`, `menu-event-type`, `menu-section-categories`) plus `unit-registry` each repeat `.catch((err) => this.logLoadError(err))` and a private `logLoadError`.
Pure refactor: behaviour must not change.

## Goals & Success Criteria
- Primary: one load-block implementation, no Observable wrapping of Promises in KitchenState, no `unitAdded$`, one error-logging path for taxonomy loads.
- Success:
  - [ ] [auto] `npx ng build` passes and `npx ng test --watch=false` passes (existing specs updated only for the changed call shape; no spec deleted, no assertion weakened).
  - [ ] [auto] `grep -n "from(this\." src/app/core/services/kitchen-state.service.ts` and `grep -rn "unitAdded\$\|creatorClosed\$" src` → no matches.
  - [ ] [auto] `grep -n "loadPromise_" src/app/core/services/recipe-data.service.ts src/app/core/services/dish-data.service.ts src/app/core/services/product-data.service.ts src/app/core/services/menu-event-data.service.ts` → no matches; `grep -rn "logLoadError" src/app` → no matches.
  - [ ] [auto] `git diff --numstat origin/main -- src/app/pages/cook-view/cook-view.page.ts src/app/pages/inventory/components/product-form/product-form.component.ts src/app/pages/recipe-builder/recipe-builder.page.ts` → added minus removed <= 0 for each file.
  - [ ] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries (or `deferred: local MongoDB down` per run mode).
  - [ ] [human] Smoke each touched page with `ng serve -c local`: recipe book (rate, approve, delete a recipe), recipe builder (save a new and an existing recipe, add a new unit from an ingredient row), inventory (edit a price inline, delete, bulk delete, product-form save and add a new purchase unit), cook view (approve, save an edit, change a product unit), metadata manager (lists load; add and rename a category). Same toasts, same data as before.

## Execution Mode
- Parallel: no — S3–S5 touch pages that other refactor plans (451–457) also edit.
- Concurrent plans: 451–457 may touch the same pages; run sequentially and rebase, never batch.
- Isolated DB: no

## Execution Notes
- Depends on: the MVP merge to main (branch `mvp`), and plan 450 (reuse layer: registry `docs/brain/component-families.md`, `scope-check --reuse`). Independent of 451–453 and 455–457.
- Convert one service per sub-task; `ng build` after each; commit per sub-task. Checkpoints (Human smoke before continuing): after S3, after S5.
- Frozen files (`cook-view.page.ts`, `product-form.component.ts`, `recipe-builder.page.ts`) may only shrink: converting `.subscribe({ next, error })` to `try { await … } catch` must be line-neutral or smaller; if a file would grow, extract the handler into a new service and ask for `approved: <path>`.
- Hotspots (`styles.scss`, `dictionary.json`, `app.routes.ts`): not touched.
- The MVP changed many files: run Step 0 first and correct the call-site lists below to what main really contains.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/services/base-entity-data.service.ts
src/app/core/services/recipe-data.service.ts
src/app/core/services/dish-data.service.ts
src/app/core/services/product-data.service.ts
src/app/core/services/product-data.service.spec.ts
src/app/core/services/menu-event-data.service.ts
src/app/core/services/kitchen-state.service.ts
src/app/core/services/kitchen-state.service.spec.ts
src/app/core/services/unit-registry.service.ts
src/app/core/services/unit-registry.service.spec.ts
src/app/core/services/taxonomy-store.service.ts
src/app/core/services/taxonomy-store.service.spec.ts
src/app/core/services/metadata-registry.service.ts
src/app/core/services/preparation-registry.service.ts
src/app/core/services/equipment-category-registry.service.ts
src/app/core/services/menu-event-type.service.ts
src/app/core/services/menu-section-categories.service.ts
src/app/core/services/breadcrumbs.md
src/app/pages/recipe-book/components/recipe-book-list/services/recipe-row-actions.service.ts
src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.spec.ts
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.spec.ts
src/app/pages/inventory/components/product-form/product-form.component.ts
src/app/pages/inventory/components/product-form/product-form.component.spec.ts
src/app/pages/recipe-builder/recipe-builder.page.ts
src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.ts
src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.spec.ts
src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts
src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.ts
src/app/pages/cook-view/cook-view.page.ts
src/app/shared/ai-recipe-modal/ai-draft-editor/ai-draft-editor.component.ts
src/app/shared/quick-add-product-modal/quick-add-product-modal.component.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact
- INV-1: preserves — no permission or role logic touched.
- INV-2: preserves — no `businessId` scoping change; storage keys and endpoints unchanged.
- INV-3: preserves — no client-side cascades added; `kitchen-state` keeps calling the same single data-service methods (the server owns cascades).
- INV-4: preserves — no schema or persisted-field change; `BaseEntityDataService` only owns load/reload state.
- No ADR needed (no new rule; the base class already exists).

## Backend Impact
- Collections affected: none.
- New collections: no
- Server changes needed: no

## Step 0 — Reality Check
Runs first, because the MVP merge changed many files. On current `main` find each symbol and print `ok` or `conflict: <what>`:
- `BaseEntityDataService`: `loadInitialData`, `ensureLoaded`, `reloadFromStorage`, `setItems`, `updateItems`, `currentItems`, constructor `(storageKey, autoLoad)`.
- In `recipe-/dish-/product-/menu-event-data.service.ts`: fields `loaded_`, `loadPromise_`; methods `hasLoaded`, `ensureLoaded`, `reloadFromStorage`, `loadInitialData`; any MVP-added `businessId`/tenancy hook in the load path.
- `KitchenStateService.saveProduct/deleteProduct/deleteRecipe/permanentlyDeleteRecipe/saveRecipe`, and every call-site in S3–S4 (`grep -rn "\.\(saveProduct\|deleteProduct\|deleteRecipe\|permanentlyDeleteRecipe\|saveRecipe\)(" src`).
- `UnitRegistryService.unitAdded$`, `awaitUnitCreated` and each call-site in S5 (`grep -rn awaitUnitCreated src`).
- `logLoadError` in the five facades and `unit-registry`; `TaxonomyStore.ensureLoaded/reload`.
- Load behaviour differs per service (recipe/dish defer loading to the resolver; product auto-loads in its constructor; recipe/dish/product `reloadFromStorage` calls `loadInitialData` directly while menu-event and the base call `ensureLoaded`): record each, and keep it via the base `autoLoad` flag.
Any `conflict` → stop and report to the Human before editing.

## User Stories
- As a developer, I want one place that owns "load once, reload on demand" for entity lists so a fix lands everywhere.
- As a chef, I want recipes, products and units to behave exactly as before.

## Functional Requirements

### Must Have (P0)
- [ ] The four data services extend `BaseEntityDataService<T>` and keep their public method and signal names.
- [ ] `KitchenStateService` mutators return `Promise`s with identical results; an error becomes a rejected promise with the same error object.
- [ ] `UnitRegistryService.awaitUnitCreated()` returns `Promise<string | null>` (`null` when the creator closes without a save, or a later unit never reaches a cancelled field), with no RxJS.
- [ ] `TaxonomyStore` offers one safe-load helper that logs; facades call it instead of repeating the catch.

## UI/UX Notes
- None. No visible change; no new dictionary keys.

## Atomic Sub-tasks
- [ ] S1: Make the four entity data services use the base load block — one per commit, build between, order recipe, dish, product, menu-event: `extends BaseEntityDataService<T>`, `super(storageKey, autoLoad)` (recipe, dish, menu-event `false`; product `true`), implement `loadInitialData`, delete the copied block, keep `reloadFromStorage` semantics; change the base only if it lacks a hook a copy needs — `src/app/core/services/base-entity-data.service.ts`, `src/app/core/services/recipe-data.service.ts`, `src/app/core/services/dish-data.service.ts`, `src/app/core/services/product-data.service.ts`, `src/app/core/services/product-data.service.spec.ts`, `src/app/core/services/menu-event-data.service.ts`
- [ ] S2: Turn the `KitchenStateService` mutators into Promises — `saveProduct`, `deleteProduct`, `deleteRecipe`, `permanentlyDeleteRecipe`, `saveRecipe` lose `from(...).pipe(...)` and the `rxjs` imports and become `async`; update the specs' `.subscribe` uses. Callers break until S3–S4, so land S2–S4 on one branch — `src/app/core/services/kitchen-state.service.ts`, `src/app/core/services/kitchen-state.service.spec.ts`
- [ ] S3: Convert the recipe-book and inventory call-sites (checkpoint: Human smoke of recipe book + inventory list) — `recipe-row-actions.service.ts` (~32, 61, 74, 85, 96, 126: `deleteRecipe`, `saveRecipe`); `inventory-product-list.component.ts` (~561, 608 `firstValueFrom(deleteProduct)`; ~672, 721, 734 `saveProduct`); matching specs — `src/app/pages/recipe-book/components/recipe-book-list/services/recipe-row-actions.service.ts`, `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.spec.ts`, `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts`, `src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.spec.ts`
- [ ] S4: Convert the frozen-file and builder call-sites (these files may only shrink; check numstat after each file) — `recipe-builder.page.ts` (~699, 917 `saveRecipe`), `cook-view.page.ts` (~614, 673, 698 `saveRecipe`; ~1103 `saveProduct`), `product-form.component.ts` (~911 `saveProduct`), `recipe-ingredients-table.component.ts` (~580 `saveProduct`) — `src/app/pages/recipe-builder/recipe-builder.page.ts`, `src/app/pages/cook-view/cook-view.page.ts`, `src/app/pages/inventory/components/product-form/product-form.component.ts`, `src/app/pages/inventory/components/product-form/product-form.component.spec.ts`, `src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts`
- [ ] S5: Replace `unitAdded$` with a Promise-based `awaitUnitCreated()` (checkpoint: Human smoke of "add new unit" from recipe builder, inventory product form, cook view, quick-add product) — in `unit-registry.service.ts` keep a private resolver set when the creator opens, resolved with the key where `unitAdded$.next(key)` was (~139, 150) and with `null` on creator close; drop `Subject`, `take`, `takeUntil`, `Observable`. Convert every call-site: `cook-view.page.ts` (~430, 802, 1087), `product-form.component.ts` (~454, 474, 505), `recipe-header.component.ts` (~268), `recipe-ingredients-table.component.ts` (~556), `recipe-workflow.component.ts` (~194), `quick-add-product-modal.component.ts` (~163), `ai-draft-editor.component.ts` (~122). Update `unit-registry.service.spec.ts` (~112, 122: delivers-on-save and null-on-cancel cases stay) and the `awaitUnitCreated` mocks in `product-form.component.spec.ts` (~28–60) and `recipe-header.component.spec.ts` — `src/app/core/services/unit-registry.service.ts`, `src/app/core/services/unit-registry.service.spec.ts`, `src/app/pages/cook-view/cook-view.page.ts`, `src/app/pages/inventory/components/product-form/product-form.component.ts`, `src/app/pages/inventory/components/product-form/product-form.component.spec.ts`, `src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.ts`, `src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.spec.ts`, `src/app/pages/recipe-builder/components/recipe-ingredients-table/recipe-ingredients-table.component.ts`, `src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.ts`, `src/app/shared/quick-add-product-modal/quick-add-product-modal.component.ts`, `src/app/shared/ai-recipe-modal/ai-draft-editor/ai-draft-editor.component.ts`
- [ ] S6: Stop the taxonomy facades repeating the catch — add `TaxonomyStore.loadSafely()` / `reloadSafely()` (log through `LoggingService`, never throw) with a spec; use them in `metadata-registry.service.ts` (~59, 64), `preparation-registry.service.ts` (~59, 64), `equipment-category-registry.service.ts`, `menu-event-type.service.ts`, `menu-section-categories.service.ts`, `unit-registry.service.ts` (~73, 99); delete each private `logLoadError` — `src/app/core/services/taxonomy-store.service.ts`, `src/app/core/services/taxonomy-store.service.spec.ts`, `src/app/core/services/metadata-registry.service.ts`, `src/app/core/services/preparation-registry.service.ts`, `src/app/core/services/equipment-category-registry.service.ts`, `src/app/core/services/menu-event-type.service.ts`, `src/app/core/services/menu-section-categories.service.ts`, `src/app/core/services/unit-registry.service.ts`
- [ ] S7: Final gates — `ng build`, `ng test`, every grep/numstat criterion above, `node scripts/breadcrumbs-check.mjs` and refresh the services breadcrumb if it changed, then the validation cards — `src/app/core/services/breadcrumbs.md`

## Technical Considerations
- Dependencies: `BaseEntityDataService` (exists), `StorageService`, `LoggingService`, `LoadingService`.
- New files needed: none.
- Model changes: none.
- Backend / API: none; storage keys and HTTP calls unchanged.
- Rules: `inject()` only, signals only, trailing underscore on private state, no `any`, single quotes and no semicolons.
- Error semantics: an Observable error becomes a rejected Promise; every converted caller keeps its existing toast/log in a `catch`. Callers that ignored errors (`{ next: () => {}, error: () => {} }`) become `.catch(() => {})`.
- Risk: recipe/dish/product `reloadFromStorage` bypasses the `loadPromise_` re-use path the base takes; confirm with existing specs and a demo-data reload before S1 is done.
- Project checks: log-query [auto]; chef-side story; no new dictionary keys.

## Out of Scope
- Changing what any service loads or when; modal controllers (plan 451); form, list and chip kits; `equipment-`, `supplier-`, `venue-data.service.ts` (already on the base); removing other RxJS from components; server changes.

## Critical Questions
None.
