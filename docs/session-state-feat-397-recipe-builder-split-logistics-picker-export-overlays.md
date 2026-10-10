# Session State

## Branch
feat/397-recipe-builder-split-logistics-picker-export-overlays

## Date
2026-10-10

## Session Summary
- Plan 397: recipe builder logistics picker + export overlays moved to page services (1426 -> 1095 lines); validation fallout fixed: empty-tools save 400 on legacy logistics:null, tool dropdown clipped by overflow:hidden

## Files Modified
 ...ilder-split-logistics-picker-export-overlays.md |  23 ++
 ...-split-logistics-picker-export-overlays.plan.md |  31 +-
 .../pages/recipe-builder/recipe-builder.page.html  | 175 +++++++---
 .../pages/recipe-builder/recipe-builder.page.scss  |   2 +-
 .../pages/recipe-builder/recipe-builder.page.ts    | 372 +--------------------
 .../services/recipe-builder-export.service.spec.ts |  60 ++++
 .../services/recipe-builder-export.service.ts      | 140 ++++++++
 .../services/recipe-form.service.spec.ts           |  45 +++
 .../recipe-builder/services/recipe-form.service.ts |   4 +-
 .../recipe-logistics-picker.service.spec.ts        |  79 +++++
 .../services/recipe-logistics-picker.service.ts    | 210 ++++++++++++
 11 files changed, 713 insertions(+), 428 deletions(-)

## Commit
788b39cf

## PR
N/A

## Next Steps
- Missing /assets/images/add_ingrediant.png (404, 10 templates, never in git) -> Planner; save button shows through open tool dropdown (z-index, pre-existing); plan 401 builds on this

## A1 seam notes (2026-10-10)
- Stayed in the page (form-coupled): `exportQuantity_()` (reads form), `logisticsBaselineArray` getter
  (also used by `resetToNewForm_` and the snapshot), `buildRecipeFromForm()`.
- Services get only what they need: the picker gets the baseline FormArray via `connect()`; the export
  service gets `{ recipe, quantity }` callbacks via `connect()`.
- Dead code dropped, not moved (no template/spec/other callers): `allEquipment_`, `equipmentOptions_`,
  `phaseOptions_`, `addBaselineRow`, `incrementLogisticsQuantity`, `decrementLogisticsQuantity`,
  `onLogisticsQuantityKeydown` (quantity is handled by `<app-counter>`).
- Name clash: `core/services/recipe-export.service.ts` already has `RecipeExportService`, so the page
  service is `RecipeBuilderExportService` (`recipe-builder-export.service.ts`).

## Validation fallout (2026-10-10, both pre-existing — files untouched by the refactor)
- Save 400 `logistics: expected object, received null` (recipes/DLNHa, dishes/rX4Nr): client omitted
  `logistics` when baseline empty; server PUT merges over stored legacy null. Fixed in
  `recipe-form.service.ts` (always send baseline), spec red→green. 472/472.
- Tool dropdown invisible: `.logistics-add-wrap { overflow: hidden }` (d7c3d565 mobile fix) clips the
  absolute dropdown to 2px. Confirmed live by flipping overflow. Needs scss — out of scope, asked.
