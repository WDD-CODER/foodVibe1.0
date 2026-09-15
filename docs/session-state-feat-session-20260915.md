# Session State

## Branch
feat/dashboard-counts-sync-versioning

## Date
2026-09-15

## Session Summary
- User reported the app is "really really slow" both locally and remote (~10s loads, un-throttled search that gets stuck, items rendering partially) — diagnosed root cause via 3 parallel investigations: existing perf-plan history (301/303/304/309/310), client search/debounce wiring, and server query/index behavior.
- Root cause: every page load fetched the entire RECIPE_LIST/DISH_LIST (~4.3MB) regardless of need, and recipe-book/inventory rendered all ~2,000+ rows unpaginated, so every keystroke re-filtered and re-rendered thousands of DOM nodes with no debounce on the list-page search boxes.
- Ruled out Render/Atlas billing+region items (plan 309 M3) as the primary cause — user confirmed local is *slower* than remote, which local cold-starts/region mismatch can't explain.
- Implemented plan 304 Milestone 2 (defer `RecipeDataService`/`DishDataService` boot loads): audited every `recipes_()`/`dishes_()` consumer, gated `menu-library`/`menu-intelligence` routes, migrated dashboard's recipe/dish counts to a new client-side `/count` wrapper, added defensive `ensureLoaded()` calls in metadata-manager screens. Found and fixed a second bootstrap trigger in `user.service.ts`'s `_reloadDataServices()` (missing `hasLoaded()` guard) that would have silently undone the deferral on every login/guest/refresh.
- Implemented plan 304 Milestone 3 as **pagination** instead of `cdk-virtual-scroll` — discovered the shared `.c-list-row { display: contents }` engine class (used by every list page) is structurally incompatible with CDK's item-wrapper DOM. Added a new `.c-pagination-controls` engine class + 50-row pagination to `recipe-book-list` and `inventory-product-list`, with page-reset-on-filter-change and selection-state preserved across pages.
- Deliberately did **not** start Milestone 1 (list projections) — found it would break `recipe.resolver.ts`'s in-memory cache-hit path (used by cook-view/recipe-builder navigation), which the plan hadn't fully resolved.
- Verified everything live via `gstack browse`: cold dashboard load network trace (RECIPE_LIST/DISH_LIST gone), pagination row counts (~2,113 → 50), search responsiveness (sub-second, was previously causing browser-automation timeouts), cold direct-URL recipe load (ingredients resolve correctly, no unlinking — plan 300 finding 3), selection persistence across page navigation.
- Captured 2 brain updates: corrected stale "keep Recipe/Dish eager" guidance in `docs/brain/patterns/defer-singleton-data-ensureLoaded.md`, and a new gotcha in `docs/brain/gotchas/angular.md` documenting the `cdk-virtual-scroll` / `display: contents` incompatibility.
- Shipped via `/ship fast` (REGULAR lane — 20 files, 254 insertions — `fast` only collapsed the approval step, full review still ran and found/fixed one CSS ordering nit).

## Files Modified
```
 .claude/todo.md                                    |  8 ++---
 docs/brain/gotchas/angular.md                      | 10 ++++++
 docs/brain/patterns/defer-singleton-data-ensureLoaded.md |  2 +-
 plans/304-perf-phase3-data-volume.plan.md          | 24 +++++++-------
 public/assets/data/dictionary.json                 |  3 ++
 src/app/app.routes.ts                              |  9 +++++-
 src/app/core/services/async-storage.service.ts     | 15 +++++++++
 src/app/core/services/dish-data.service.ts         | 11 +++++--
 src/app/core/services/http-storage.adapter.ts      | 15 +++++++++
 src/app/core/services/preparation-registry.service.ts |  3 ++
 src/app/core/services/recipe-data.service.ts       | 11 +++++--
 src/app/core/services/user.service.ts              | 14 ++++++--
 src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.ts | 23 ++++++++++----
 src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.html | 18 ++++++++++-
 src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts | 33 +++++++++++++++++++
 src/app/pages/metadata-manager/components/preparation-category-manager/preparation-category-manager.component.ts | 8 +++++
 src/app/pages/metadata-manager/metadata-manager.page.component.ts | 8 +++++
 src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.html | 18 ++++++++++-
 src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts | 37 ++++++++++++++++++++++
 src/styles.scss                                    | 18 +++++++++++
 20 files changed, 254 insertions(+), 34 deletions(-)
```

## Commit
e626b5b — perf(client): defer recipe/dish loads, paginate large lists (plan 304 M2/M3)

## PR
Pending — feature-complete path chosen, PR being opened this ship

## Next Steps
- Plan 304 prerequisite gate + Milestone 1 (list projections) remain open — M1 needs a design decision on how to keep `recipe.resolver.ts`'s in-memory cache-hit path safe before it can proceed (see gotcha-equivalent note in plan 304 M1 section)
- Plan 309 M3 human-only infra unblockers (billing tier, Atlas region, canonical Render service, deploy+collect logs) still open — user explicitly deferred the billing-tier item ("stay on free tier, no cost")
- Plan 310 (faceted search) still parked until plan 304 fully ships and is measured
