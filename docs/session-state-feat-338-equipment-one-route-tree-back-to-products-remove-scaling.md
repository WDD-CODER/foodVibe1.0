# Session State

## Branch
feat/338-equipment-one-route-tree-back-to-products-remove-scaling

## Date
2026-10-06

## Session Summary
- Plan 338 shipped: /equipment redirects to /inventory/equipment, EquipmentPage removed; inventory chips מוצרים + ציוד; scaling UI removed (data kept). Human verified all items.

## Files Modified
 ...e-route-tree-back-to-products-remove-scaling.md | 15 +++++
 ...te-tree-back-to-products-remove-scaling.plan.md | 32 +++++------
 public/assets/data/dictionary.json                 |  1 +
 src/app/app.routes.ts                              | 28 ++--------
 .../tab-chips/tab-chips.component.spec.ts          | 16 +++++-
 .../components/tab-chips/tab-chips.component.ts    |  6 +-
 src/app/core/models/equipment.model.ts             |  2 +
 src/app/core/resolvers/equipment.resolver.ts       |  2 +-
 .../equipment-form/equipment-form.component.html   | 33 -----------
 .../equipment-form/equipment-form.component.scss   | 18 ------
 .../equipment-form/equipment-form.component.ts     | 43 ++------------
 .../equipment-list/equipment-list.component.html   | 51 +----------------
 .../equipment-list/equipment-list.component.scss   | 65 ----------------------
 .../equipment-list.component.spec.ts               |  9 ++-
 .../equipment-list/equipment-list.component.ts     | 57 +++----------------
 src/app/pages/equipment/equipment.page.html        |  8 ---
 src/app/pages/equipment/equipment.page.scss        | 52 -----------------
 src/app/pages/equipment/equipment.page.ts          | 18 ------
 .../inventory-product-list.component.html          |  8 ---
 19 files changed, 79 insertions(+), 385 deletions(-)

## Commit
3a8a41c0

## PR
N/A

## Next Steps
- Out-of-scope cleanup: unused RouterLink imports + dead .control-nav SCSS in inventory-product-list; EquipmentPage row in src/app/pages/breadcrumbs.md.
