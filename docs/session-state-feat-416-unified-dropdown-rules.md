# Session State

## Branch
feat/416-unified-dropdown-rules

## Date
2026-10-20

## Session Summary
- Plan 416 shipped: unified dropdown rules from the Human's validation of plans 400-402 - contains filter with prefix-first, exact typed name hides the add option, every add opens its window prefilled, '"<name>" נוסף' message after save, one keyboard rule incl. menu serving type and recipe-book ingredient filter.|New recipes now count every field change as unsaved (hasRealChanges short-circuit removed; free-text ingredient name in snapshot; applied AI draft counts as unsaved).|Rule written into docs/agent/standards-domain.md (points 5-8 + keyboard) and the brain pattern; gotcha on host keydown ordering added.|Plans 400 A9, 401 A9, 402 A4 and 416 A1-A9 marked done on the Human's /ship merge.

## Files Modified
 docs/agent/standards-domain.md                     |  31 +++-
 docs/brain/patterns/dropdown-add-option.md         |   5 +-
 plans/416-unified-dropdown-rules.plan.md           | 166 +++++++++++++++++++++
 public/assets/data/dictionary.json                 |   3 +-
 src/app/core/services/add-item-modal.service.ts    |   2 +
 src/app/core/utils/add-option.util.spec.ts         |  18 ++-
 src/app/core/utils/add-option.util.ts              |  11 ++
 src/app/core/utils/dedupe-select-options.util.ts   |   6 +-
 src/app/core/utils/filter-starts-with.util.ts      |  23 ---
 src/app/core/utils/option-filter.util.spec.ts      |  26 ++++
 src/app/core/utils/option-filter.util.ts           |  16 ++
 .../equipment-list/equipment-list.component.ts     |  27 +---
 .../product-form/product-form.component.ts         |  22 ++-
 .../menu-dish-row/menu-dish-row.component.ts       |   4 +-
 .../menu-intelligence/menu-intelligence.page.html  |   8 +-
 .../menu-intelligence/menu-intelligence.page.ts    |  77 ++++++----
 .../recipe-book-list.component.html                |  15 +-
 .../recipe-book-list.component.scss                |   3 +-
 .../recipe-book-list/recipe-book-list.component.ts |  23 ++-
 .../ingredient-search.component.html               |  26 ++--
 .../ingredient-search.component.ts                 |   9 +-
 .../preparation-search.component.html              |   2 +-
 .../preparation-search.component.spec.ts           |  28 +++-
 .../preparation-search.component.ts                |  39 +++--
 .../recipe-header/recipe-header.component.ts       |   2 +
 .../recipe-workflow/recipe-workflow.component.ts   |   6 +
 .../pages/recipe-builder/recipe-builder.page.html  |   3 +-
 .../recipe-builder/recipe-builder.page.spec.ts     |  72 ++++++++-
 .../pages/recipe-builder/recipe-builder.page.ts    |  20 ++-
 .../services/recipe-logistics-picker.service.ts    |  16 +-
 .../add-equipment-modal.component.ts               |  29 ++--
 .../add-item-modal/add-item-modal.component.ts     |  10 +-
 .../chip-search-dropdown.component.spec.ts         |  51 +++++++
 .../chip-search-dropdown.component.ts              |  28 ++--
 .../custom-multi-select.component.spec.ts          |   7 +
 .../custom-multi-select.component.ts               |  27 ++--
 .../custom-select/custom-select.component.html     |   1 +
 .../custom-select/custom-select.component.spec.ts  |  48 +++++-
 .../custom-select/custom-select.component.ts       |  20 ++-
 .../quick-add-product-modal.component.ts           |  20 ++-
 40 files changed, 739 insertions(+), 211 deletions(-)

## Commit
96d75170

## PR
N/A

## Next Steps
- Optional: prefilled names for the unit creator and supplier add flow (needs its own plan).|Optional: Planner kit plan for a 'servers first' validation hook (slot-serve before validation cards).|Bundle initial budget still 1.88 kB over the 560 kB warning.
