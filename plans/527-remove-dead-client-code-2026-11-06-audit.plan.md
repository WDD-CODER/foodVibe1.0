# Plan 527 — Remove dead client code found by the 2026-11-06 audit

Status: draft
Depends-on: none
Snapshot: f99816b3d37f6e0c555c79e7471f8761cbca0068

## Problem Statement
The dead-code audit of 2026-11-06 (`reports/dead-code-audit-2026-11-06.md` once the scripts-cleanup plan lands)
found class members, exports and one whole file in `src/app` that no code and no template uses — several are
whole features removed from the screen whose code stayed (inline price editing in the product list, the add-with-
category picker in the recipe workflow, keyboard handlers in the yield manager). It also found 8 internal notes
files and a demo JSON under `public/assets/data/` that ship to production with every build and are served to any
visitor. The September audit already listed some of these and nothing was removed, so they keep confusing agents
that read the code and keep showing in every audit.

## Goals & Success Criteria
**Primary:** every symbol and file listed in A1–A4 is gone, nothing references it, and lint, build and the client
tests pass with no behaviour change.

- [auto] `git grep -nwE "onPriceFocus|onPriceBlur|onPriceChange|lastPriceEdit_|savingPriceId_|sortIconFor_|shouldShowAddCategoryPicker_|toggleAddCategoryPicker|onAddWithCategory|onLaborTimeKeydown|onCookTimeKeydown|onAmountManualChange|onPrimaryAmountKeydown|onSecondaryAmountInput|onSecondaryAmountKeydown|getValuesNeedingTranslation|removeValuesNeedingTranslation|allergenOptions_|updateInternalDictionaries|getChainConversion|clearLastViewed|reloadLabelsFromStorage|reloadCoursesFromStorage|getPreparationsByCategory_|getProductById|_clearSessionStorage|_getLoggedInUser|makeId|replaceIngredient|toggleStepPeek|canEdit_|getSectionCount|getDishCount|hasManualLabels_|onPrimaryUnitChangeWrapper|equipmentName|envTypeLabel|onClearDraft|translateUnit|someSelected|hoveredIndex|menuSectionCategories_|verifyPassword|DateFieldParam|getProductUnits" -- src/app` → no output
- [auto] `git grep -nw "hasKey" -- src/app/core/services/translation.service.ts` → no output; `git grep -nw "setItems" -- src/app/core/services/base-entity-data.service.ts` → no output; `git grep -nE "currentUser\b" -- src/app/core/services/user.service.ts` → no output; `git grep -nw "maxRows" -- src/app/pages/inventory/components/product-import` → no output; `git grep -nw "customSelect" -- src/app/shared/scaling-chip` → no output
- [auto] `git ls-files src/app/core/utils/id.util.ts public/assets/data` → only `public/assets/data/dictionary.json`
- [auto] `pnpm run lint` → exit 0
- [auto] `pnpm run build` → exit 0, and `dist/food-vibe1.0/browser/assets/data/` holds only `dictionary.json`
- [auto] `pnpm run test:ci` → `TOTAL: ... SUCCESS` (0 failed)
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries
- [human] Open Inventory → products list (sort, edit a product, save), Recipe builder (yield field, workflow add step, labels), Cook view (open a recipe, toggle steps), Venues list and form, AI recipe modal (open, close): all behave as before, no console error.

## Execution Mode
- Parallel: yes
- Concurrent plans: safe alongside 471, 510, 517–523 — files they own are left out on purpose (see Out of Scope)
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/core/utils/id.util.ts
src/app/core/utils/auth-crypto.ts
src/app/core/utils/list-state.util.ts
src/app/core/utils/product-price.util.ts
src/app/core/utils/recipe-yield-manager.util.ts
src/app/core/services/util.service.ts
src/app/core/services/base-entity-data.service.ts
src/app/core/services/conversion.service.ts
src/app/core/services/cook-view-state.service.ts
src/app/core/services/metadata-registry.service.ts
src/app/core/services/preparation-registry.service.ts
src/app/core/services/product-data.service.ts
src/app/core/services/translation.service.ts
src/app/core/services/user.service.ts
src/app/pages/cook-view/cook-view.page.ts
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts
src/app/pages/inventory/components/product-form/product-form.component.ts
src/app/pages/inventory/components/product-import/product-import.component.ts
src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.ts
src/app/pages/menu-intelligence/services/menu-ai-flow.service.ts
src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.ts
src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.ts
src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.ts
src/app/pages/venues/components/venue-form/venue-form.component.ts
src/app/pages/venues/components/venue-list/venue-list.component.ts
src/app/shared/ai-recipe-modal/ai-recipe-modal.component.ts
src/app/shared/list-selection/list-selection.state.ts
src/app/shared/rating-stars/rating-stars.component.ts
src/app/shared/scaling-chip/scaling-chip.component.ts
src/app/core/utils/recipe-yield-manager.util.spec.ts
src/app/core/services/conversion.service.spec.ts
src/app/core/services/cook-view-state.service.spec.ts
src/app/core/services/metadata-registry.service.spec.ts
src/app/core/services/preparation-registry.service.spec.ts
src/app/core/services/product-data.service.spec.ts
src/app/core/services/translation.service.spec.ts
src/app/core/services/user.service.spec.ts
src/app/pages/cook-view/cook-view.page.spec.ts
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.spec.ts
src/app/pages/inventory/components/product-form/product-form.component.spec.ts
src/app/pages/inventory/components/product-import/product-import.component.spec.ts
src/app/pages/menu-intelligence/components/event-stage-bar/event-stage-bar.component.spec.ts
src/app/pages/menu-library/components/menu-library-list/menu-library-list.component.spec.ts
src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.spec.ts
src/app/pages/recipe-builder/components/recipe-workflow/recipe-workflow.component.spec.ts
src/app/pages/venues/components/venue-form/venue-form.component.spec.ts
src/app/pages/venues/components/venue-list/venue-list.component.spec.ts
src/app/shared/ai-recipe-modal/ai-recipe-modal.component.spec.ts
src/app/core/breadcrumbs.md
public/assets/data/Ideas.md
public/assets/data/project-plan.md
public/assets/data/toFix.md
public/assets/data/step2-1280px.md
public/assets/data/step3-900px.md
public/assets/data/step4-700px.md
public/assets/data/step5-480px.md
public/assets/data/step6-360px.md
public/assets/data/demoProducts.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — in `product-data.service.ts` and `base-entity-data.service.ts` only the unused `getProductById` and `setItems` are removed; no read, write or permission path changes.
- INV-5: preserves — in `metadata-registry.service.ts` and `preparation-registry.service.ts` only unused readers (`reloadLabelsFromStorage`, `reloadCoursesFromStorage`, `getPreparationsByCategory_`) are removed; taxonomy still comes only from `taxonomyTerms` via `TaxonomyStore`.
- INV-6: preserves — `ai-recipe-modal.component.ts` loses two unused methods and `menu-ai-flow.service.ts` one unused injection; every AI call still goes through `server/routes/ai.js`.

## Reuse Check

- none — the plan only removes code; no component, util, pipe, service or `.c-*` class is created or renamed, and no registered family piece is removed (`UtilService` stays; only its unused `makeId` goes).

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want the app to ship only what it uses so that internal notes are not readable by anyone who opens the site.
- As the developer, I want each component to contain only live handlers so that agents do not wire new UI to leftover dead methods.

## Functional Requirements

### Must Have (P0)
- [ ] Every member, export and file in A1–A4 is removed, plus any import, injection, private helper or field that becomes unused because of it (the linter and `ng build` report them).
- [ ] No template, route, spec or behaviour changes (the spec files are in scope only because the code under them changes; none should need an edit). If removing a listed symbol breaks a template, spec or build: STOP, restore it, and write the symbol and the error in Execution Notes (it was a false positive).

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- No visible change. No `dictionary.json` change (orphan keys stay by Human decision 2026-11-06).

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked. Before
deleting each symbol, run `git grep -nw <symbol> -- src` and confirm the only hit is its declaration (and, for
A2, its export line).

- [ ] A1: Remove dead features in pages — `inventory-product-list.component.ts`: `onPriceFocus`, `onPriceBlur`, `onPriceChange`, `lastPriceEdit_`, `savingPriceId_`, `sortIconFor_` (the inline price edit was removed from the template). `recipe-workflow.component.ts`: `shouldShowAddCategoryPicker_`, `toggleAddCategoryPicker`, `onAddWithCategory`, `onLaborTimeKeydown`, `onCookTimeKeydown`. `product-form.component.ts`: `getValuesNeedingTranslation`, `removeValuesNeedingTranslation`, `allergenOptions_`. `cook-view.page.ts`: `replaceIngredient`, `toggleStepPeek`. `product-import.component.ts`: `maxRows`. `event-stage-bar.component.ts`: `canEdit_`. `menu-library-list.component.ts`: `getSectionCount`, `getDishCount`. `recipe-header.component.ts`: `hasManualLabels_`, `onPrimaryUnitChangeWrapper`. `venue-form.component.ts`: `equipmentName`. `venue-list.component.ts`: `envTypeLabel`. Check: `pnpm run lint` and `pnpm run build`.
- [ ] A2: Remove dead members in core and shared — `recipe-yield-manager.util.ts`: `onAmountManualChange`, `onPrimaryAmountKeydown`, `onSecondaryAmountInput`, `onSecondaryAmountKeydown` (keep `updatePrimaryAmount`/`updateSecondaryAmount`: their specs use them). `translation.service.ts`: `hasKey`, private `updateInternalDictionaries`. `base-entity-data.service.ts`: protected `setItems`. `conversion.service.ts`: `getChainConversion`. `cook-view-state.service.ts`: `clearLastViewed`. `metadata-registry.service.ts`: `reloadLabelsFromStorage`, `reloadCoursesFromStorage`. `preparation-registry.service.ts`: `getPreparationsByCategory_`. `product-data.service.ts`: `getProductById`. `user.service.ts`: `currentUser`, `_clearSessionStorage`, `_getLoggedInUser` (keep the `@deprecated isAdmin_` alias: 8 files still read it). `util.service.ts`: `makeId` (keep `getEmptyProduct`, used by `product-form`). `ai-recipe-modal.component.ts`: `onClearDraft`, `translateUnit`. `menu-ai-flow.service.ts`: the unused injection `menuSectionCategories_`. `list-selection.state.ts`: `someSelected`. `rating-stars.component.ts`: `hoveredIndex`. `scaling-chip.component.ts`: the `customSelect` view query. Check: `pnpm run lint`, `pnpm run build`, `pnpm run test:ci`.
- [ ] A3: Remove dead exports and the unused id util — `git rm src/app/core/utils/id.util.ts` (no importer since commit `5512ea1a`, 2026-10-05). `auth-crypto.ts`: delete `verifyPassword` (password checks run on the server) and change the header line "Legacy SHA-256 hashes (no colon) are still verified for backwards compatibility." to "Verification runs on the server." `list-state.util.ts`: delete the `DateFieldParam` type. `product-price.util.ts`: delete `getProductUnits`. If `src/app/core/breadcrumbs.md` lists `id.util`, remove it (its `utils/` row lists `auth-crypto`, which stays). Check: `pnpm run build`.
- [ ] A4: Stop shipping internal notes — `git rm public/assets/data/Ideas.md public/assets/data/project-plan.md public/assets/data/toFix.md public/assets/data/step2-1280px.md public/assets/data/step3-900px.md public/assets/data/step4-700px.md public/assets/data/step5-480px.md public/assets/data/step6-360px.md public/assets/data/demoProducts.json` (zero references in code; `angular.json` copies all of `public/` into the build). Before deleting, tell the Human in one line that the notes are leaving the repo (git history keeps them). Check: `pnpm run build`, then `dist/food-vibe1.0/browser/assets/data/` holds only `dictionary.json`.

## Technical Considerations
- Dependencies: none of the removed symbols has a caller in any `.ts` or `.html` under `src/`, including specs (audit scan with word-boundary search over every `.ts` and `.html`, repeated to a fixpoint; `members.tsv` and `exports-classified.tsv` in `tools/dead-code-audit/baseline-2026-11-06/` once the scripts-cleanup plan lands).
- New files needed: none.
- Model changes: none.
- Backend / API: none.
- Auth and validation: `auth-crypto.ts` loses a client-side verifier no code calls; `hashPassword` stays. Follow `.claude/skills/auth-and-logging`.
- Security surface: smaller — internal notes no longer served at `/assets/data/*.md`.
- Data / migration: none.
- Project checks: log-query Done-when included; Reuse Check filled; `dictionary.json` not touched.

## Out of Scope
- `src/app/pages/menu-intelligence/menu-intelligence.page.ts` (`isEditingDishField`, `onViewMenuInfo`, `onExportMenuInfo`, the unreachable `'menu-info'` branch): file owned by plan 522.
- The menu-info export chain in `export.service.ts` / `menu-export.service.ts` and the dead helpers `styleExcelBlankRow`, `styleExcelBlockBorder` (`excel-workbook.util.ts`), `formatExportNumber` (`export.util.ts`): export domain, owned by plan 471 — add them to 471's scope instead.
- `recipe-ingredients-table.component.ts` (`focusUnitAtRow`, `onUnitKeydown`, `getGrossWeight`): owned by plan 510.
- Code used only by tests (Tier B in the report: `calculateNetCost`, `updateClient`, `reorder`, …) — separate decision.
- `export` keywords on symbols used only inside their own file (Tier D, cosmetic).
- Legacy-field shims in `product-data.service.ts` / `dish-data.service.ts` — waits for the DB probe.
- `shared/schemas` unused types (`ReceiptPhotoRequest`, `BusinessBaseline`, `SchemaCollection`).
- Any `dictionary.json` key.

## Critical Questions
- none

## Execution Notes
