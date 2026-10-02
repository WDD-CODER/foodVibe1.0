# Session State

## Branch
feat/321-professional-foundation-refactor

## Date
2026-10-02

## Session Summary
- Plan 321 P2b code-complete and pushed (5b0b0846). Human validation: menu save, trash restore OK; print OK but 2 pages; Excel quantities 0 (needs list redesign plan); AI-in-builder fixed (OnPush table redraw + netoConfirmed), retest pending. Handoff for Planner: docs/handoff-321-validation-findings.md.

## Files Modified
 .gitignore                                         |   3 +
 docs/handoff-321-validation-findings.md            |  63 +++
 ...te-feat-321-professional-foundation-refactor.md | 195 ++++++++
 docs/session-state-foundation-refactor.md          |  18 +
 package-lock.json                                  |   2 +-
 package.json                                       |   8 +-
 plans/321-professional-foundation-refactor.plan.md |  57 ++-
 public/assets/data/dictionary.json                 |   9 +-
 scripts/take-plan.mjs                              |   4 +-
 server/app.js                                      |   4 +-
 server/constants/collections.js                    |  14 +-
 server/db.js                                       |  24 +-
 server/middleware/validate.js                      |  18 +
 server/migrations/0001-v2-schema.js                | 250 ++++++++++
 server/migrations/0002-trash-and-history.js        | 128 +++++
 server/migrations/tools/_connect.js                |  47 ++
 server/migrations/tools/field-inventory.js         |  60 +++
 server/migrations/tools/validate-all.js            |  52 ++
 server/package-lock.json                           |  12 +-
 server/package.json                                |   4 +-
 server/routes/ai.js                                | 142 +++---
 server/routes/generic.js                           | 151 +++---
 server/scripts/fix-supplier-refs.js                |   1 +
 server/scripts/legacy-import/audit-against-spec.js |   1 +
 .../legacy-import/backfill-dish-prep-items.js      |   1 +
 .../legacy-import/backfill-legacy-config.js        |   1 +
 .../legacy-import/backfill-name-snapshots.js       |   1 +
 .../legacy-import/backfill-product-nutrition.js    |   1 +
 .../scripts/legacy-import/backfill-quantities.js   |   1 +
 .../legacy-import/backfill-supplier-phones.js      |   1 +
 server/scripts/legacy-import/cost-cross-check.js   |   1 +
 .../scripts/legacy-import/import-foodcomposer.js   |   1 +
 .../legacy-import/repair-dish-prep-items.js        |   1 +
 .../scripts/legacy-import/repair-recipe-yields.js  |   1 +
 .../scripts/legacy-import/repair-subrecipe-refs.js |   1 +
 .../scripts/legacy-import/verify-against-source.js |   1 +
 server/scripts/migrate-supplier-ids.js             |   1 +
 server/services/clone-master.js                    |  25 +-
 server/services/seed-master.js                     |  62 ++-
 server/services/sync-master.js                     | 134 +++---
 server/test/collections.test.js                    |   4 +-
 server/test/generic.test.js                        | 147 +++---
 server/test/helpers/v2-docs.js                     |  37 ++
 server/test/push-to-master.test.js                 |  60 +--
 server/test/sync-master.test.js                    |  54 +--
 server/test/upgrade-v1-to-v2.test.js               | 119 +++++
 server/test/v2-enforcement.test.js                 |  76 +++
 server/utils/schema-check.js                       |  38 ++
 server/utils/v1-only-guard.js                      |  16 +
 shared/schemas/base.schema.ts                      |  26 +
 shared/schemas/entities/common.schema.ts           |  44 ++
 shared/schemas/entities/equipment.schema.ts        |  20 +
 shared/schemas/entities/index.ts                   |  29 ++
 shared/schemas/entities/menu-event.schema.ts       |  41 ++
 shared/schemas/entities/product.schema.ts          |  47 ++
 shared/schemas/entities/recipe.schema.ts           |  59 +++
 shared/schemas/entities/supplier.schema.ts         |  21 +
 shared/schemas/entities/venue.schema.ts            |  24 +
 shared/schemas/field-map.v1-to-v2.ts               | 292 +++++++++++
 shared/schemas/index.ts                            |   4 +
 shared/schemas/tsconfig.cjs.json                   |  15 +
 shared/schemas/upgrade/upgrade.ts                  |  50 ++
 src/app/core/models/ai-menu-draft.model.ts         |  28 +-
 src/app/core/models/ai-product-draft.model.ts      |  14 +-
 src/app/core/models/equipment.model.ts             |  32 +-
 src/app/core/models/ingredient.model.ts            |  11 +-
 src/app/core/models/logistics.model.ts             |  43 +-
 src/app/core/models/menu-event.model.ts            |  70 ++-
 src/app/core/models/parsed-result.model.ts         |   6 +-
 src/app/core/models/product.model.ts               |  56 +--
 src/app/core/models/recipe.model.ts                |  72 +--
 src/app/core/models/supplier.model.ts              |  18 +-
 src/app/core/models/v2/conformance.ts              |  24 +
 src/app/core/models/v2/index.ts                    |   5 +
 src/app/core/models/v2/v2-types.spec.ts            |  32 ++
 src/app/core/models/venue.model.ts                 |  36 +-
 .../resolvers/equipment-ensure-loaded.resolver.ts  |   2 +-
 .../menu-events-ensure-loaded.resolver.ts          |   2 +-
 src/app/core/resolvers/product.resolver.spec.ts    |  37 +-
 src/app/core/resolvers/recipe.resolver.ts          |   4 +-
 .../resolvers/venues-ensure-loaded.resolver.ts     |   2 +-
 src/app/core/services/add-supplier-flow.service.ts |   8 +-
 src/app/core/services/ai-recipe-draft.service.ts   |   2 +-
 src/app/core/services/async-storage.service.ts     |   6 +-
 src/app/core/services/dish-data.service.ts         |  16 +-
 .../equipment-category-registry.service.ts         |  26 +-
 src/app/core/services/equipment-data.service.ts    |  18 +-
 src/app/core/services/excel-workbook.util.ts       |  43 +-
 src/app/core/services/export.service.spec.ts       | 200 ++++----
 src/app/core/services/gemini.service.ts            |  40 +-
 src/app/core/services/http-storage.adapter.ts      |  46 +-
 .../core/services/kitchen-state.service.spec.ts    |  94 ++--
 src/app/core/services/kitchen-state.service.ts     | 178 ++++---
 src/app/core/services/master-push.service.ts       |   6 +-
 src/app/core/services/menu-event-data.service.ts   |  10 +-
 src/app/core/services/menu-export.service.ts       | 294 +++++------
 .../services/menu-intelligence.service.spec.ts     | 228 ++++-----
 src/app/core/services/menu-intelligence.service.ts |  52 +-
 .../services/menu-section-categories.service.ts    |  22 +-
 .../services/metadata-registry.service.spec.ts     |  26 +-
 src/app/core/services/metadata-registry.service.ts |  80 +--
 .../core/services/preparation-registry.service.ts  |  56 +--
 src/app/core/services/product-data.service.spec.ts |  48 +-
 src/app/core/services/product-data.service.ts      |  70 +--
 src/app/core/services/recipe-cost.service.spec.ts  | 168 +++----
 src/app/core/services/recipe-cost.service.ts       |  72 +--
 src/app/core/services/recipe-data.service.ts       |  14 +-
 src/app/core/services/recipe-export.service.ts     |  88 ++--
 src/app/core/services/scaling.service.spec.ts      | 160 +++---
 src/app/core/services/scaling.service.ts           |  60 +--
 src/app/core/services/supplier-data.service.ts     |   2 +-
 src/app/core/services/user.service.ts              |   2 +-
 src/app/core/services/util.service.ts              |  23 +-
 src/app/core/services/venue-data.service.ts        |   6 +-
 src/app/core/services/version-history.service.ts   |   6 +-
 src/app/core/utils/product-price.util.ts           |  26 +-
 src/app/core/utils/product-source.util.ts          |   6 +-
 src/app/core/utils/product-validation.util.ts      |  16 +-
 src/app/core/utils/recipe-allergens.util.ts        |   6 +-
 src/app/core/utils/recipe-match.util.ts            |  32 +-
 src/app/core/validators/item.validators.spec.ts    |   6 +-
 src/app/core/validators/item.validators.ts         |  16 +-
 src/app/pages/cook-view/cook-view.page.html        |  32 +-
 src/app/pages/cook-view/cook-view.page.ts          | 154 +++---
 .../equipment-form/equipment-form.component.html   |  58 ++-
 .../equipment-form/equipment-form.component.ts     | 152 +++---
 .../equipment-list/equipment-list.component.html   |  30 +-
 .../equipment-list/equipment-list.component.ts     |  94 ++--
 .../inventory-product-list.component.html          |  14 +-
 .../inventory-product-list.component.spec.ts       |  28 +-
 .../inventory-product-list.component.ts            |  92 ++--
 .../product-form/product-form.component.html       |  34 +-
 .../product-form/product-form.component.spec.ts    |  34 +-
 .../product-form/product-form.component.ts         | 266 +++++-----
 .../inventory/services/product-ai-flow.service.ts  |  34 +-
 .../menu-dish-row/menu-dish-row.component.html     |  76 ++-
 .../menu-dish-row/menu-dish-row.component.ts       |  34 +-
 src/app/pages/menu-intelligence/menu-form.util.ts  |  25 +
 .../menu-intelligence/menu-intelligence.page.html  |  36 +-
 .../menu-intelligence/menu-intelligence.page.ts    | 296 ++++++------
 .../services/menu-ai-flow.service.ts               |  81 ++--
 .../menu-library-list.component.html               |  83 +++-
 .../menu-library-list.component.ts                 |  67 ++-
 src/app/pages/menu-library/menu-library.page.ts    |  46 +-
 .../preparation-category-manager.component.html    |  42 +-
 .../preparation-category-manager.component.ts      |  10 +-
 .../section-category-manager.component.html        |  42 +-
 .../section-category-manager.component.ts          |  12 +-
 .../metadata-manager.page.component.ts             |  20 +-
 .../recipe-book-list.component.html                |  14 +-
 .../recipe-book-list.component.spec.ts             |  22 +-
 .../recipe-book-list/recipe-book-list.component.ts |  70 +--
 .../ingredient-search.component.html               |  21 +-
 .../ingredient-search.component.ts                 |   2 +-
 .../preparation-search.component.ts                |   4 +-
 .../recipe-header/recipe-header.component.html     |  12 +-
 .../recipe-header/recipe-header.component.spec.ts  |   2 +-
 .../recipe-header/recipe-header.component.ts       |   4 +-
 .../recipe-ingredients-table.component.html        | 286 ++++++-----
 .../recipe-ingredients-table.component.spec.ts     |   4 +-
 .../recipe-ingredients-table.component.ts          | 121 ++---
 .../recipe-workflow/recipe-workflow.component.html |  71 +--
 .../recipe-workflow/recipe-workflow.component.ts   |  32 +-
 .../pages/recipe-builder/recipe-builder.page.html  | 536 +++++++++++++--------
 .../pages/recipe-builder/recipe-builder.page.ts    | 177 ++++---
 .../services/recipe-ai-flow.service.ts             |  59 ++-
 .../recipe-builder/services/recipe-form.service.ts | 254 +++++-----
 .../supplier-form/supplier-form.component.html     |  58 ++-
 .../supplier-form/supplier-form.component.ts       |  56 +--
 .../supplier-list/supplier-list.component.html     |  26 +-
 .../supplier-list/supplier-list.component.ts       |  65 ++-
 src/app/pages/trash/trash.page.html                | 301 ++++++------
 .../venue-detail/venue-detail.component.html       |  44 +-
 .../venue-detail/venue-detail.component.ts         |   6 +-
 .../venue-form/venue-form.component.html           |  56 +--
 .../components/venue-form/venue-form.component.ts  | 134 +++---
 .../venue-list/venue-list.component.html           |  24 +-
 .../components/venue-list/venue-list.component.ts  |  18 +-
 .../add-equipment-modal.component.html             |  63 +--
 .../add-equipment-modal.component.ts               |  20 +-
 .../ai-menu-modal/ai-menu-modal.component.html     | 116 +++--
 .../ai-menu-modal/ai-menu-modal.component.ts       |  50 +-
 .../ai-product-modal.component.html                |  90 ++--
 .../ai-product-modal/ai-product-modal.component.ts |  70 ++-
 .../ai-draft-editor/ai-draft-editor.component.html |  15 +-
 .../ai-draft-editor/ai-draft-editor.component.ts   | 131 +++--
 .../ai-recipe-modal/ai-recipe-modal.component.html |  58 ++-
 .../ai-recipe-modal/ai-recipe-modal.component.ts   |  10 +-
 .../nutrition-badge/nutrition-badge.component.ts   | 131 +++--
 .../quick-add-product-modal.component.html         |  71 +--
 .../quick-add-product-modal.component.ts           |  76 ++-
 .../quick-edit-product-panel.component.html        |  35 +-
 .../quick-edit-product-panel.component.ts          |  58 +--
 .../venue-link-chip/venue-link-chip.component.ts   |  18 +-
 src/styles.scss                                    |  54 +++
 tsconfig.json                                      |   3 +
 196 files changed, 6718 insertions(+), 4218 deletions(-)

## Commit
5b0b0846

## PR
N/A

## Next Steps
- 1) Human retests AI edit. 2) Choose Atlas maintenance window, run runbook in docs/session-state-foundation-refactor.md. 3) /code-review, then PR (merge only after Atlas). 4) Planner writes plans from handoff sections 2-3. Undecided: cooking_time_minutes_, ingredients_ cleanup.
