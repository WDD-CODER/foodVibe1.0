# Session State

## Branch
fix/379-dedupe-master-recipe-dish-names

## Date
2026-10-05

## Session Summary
- Plan 379: master duplicate names merged on Atlas (backup atlas-2026-10-05T04-56-29; 2,326 writes, 0 dupes / 0 dangling refs). push-to-master 409 on name collision. Guest approve-stamp gated; post-login /cook swaps master copy for the user's own copy.

## Files Modified
 plans/379-dedupe-master-recipe-dish-names.plan.md  |  91 ++++++
 server/routes/generic.js                           |  20 ++
 server/scripts/dedupe-master-names.js              | 359 +++++++++++++++++++++
 server/test/dedupe-master-names.test.js            | 130 ++++++++
 server/test/push-to-master.test.js                 |  18 ++
 src/app/core/resolvers/recipe.resolver.ts          |   9 +
 src/app/core/services/user.service.ts              |  23 ++
 src/app/pages/cook-view/cook-view.page.ts          |  16 +-
 .../pages/recipe-builder/recipe-builder.page.ts    |   6 +-
 9 files changed, 670 insertions(+), 2 deletions(-)

## Commit
5bbf75a6

## PR
N/A

## Next Steps
- Human: validate the 3 [human] items in plans/379 after deploy. Planner: data-integrity follow-up brief (dead eq_/dish_/demo_ refs, amount 0, empty recipes, unpriced products, v1 collections).
