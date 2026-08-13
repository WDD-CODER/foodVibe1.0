# Plan 301 — Server-side search & lean data loading for large catalogs

overview: The legacy FoodComposer import (plan 300) pushed one account's PRODUCT_LIST/RECIPE_LIST/DISH_LIST to 1,000-1,500+ docs each — the app currently has no server-side search at all, so every list/search UI works by eagerly fetching a user's *entire* collection into an Angular signal at boot and filtering it client-side on every keystroke. Plan 300 raised the server's hard result cap (was silently truncating at 500) and added gzip compression as an immediate correctness fix, but that only makes the existing "load everything, search in memory" architecture *not silently wrong* — it doesn't make it fast, and the user directly observed real added latency once catalogs are this large (recipe-builder's ingredient-search typeahead: "the first matter takes about 2 seconds, then more time to load"). This plan scopes the actual fix: move the highest-value search surface to the server, so most page loads stop needing the full collection at all.

# Context

Investigated (read-only, this session) exactly what reads the full in-memory catalog and why, before proposing a design — see the "What exists today" table below. Two load paths currently fetch a user's entire PRODUCT_LIST/RECIPE_LIST/DISH_LIST on every session: each data service's own constructor (`ProductDataService`/`RecipeDataService`/`DishDataService`, `src/app/core/services/*.ts`, via `ensureLoaded()`), and `UserService._reloadDataServices()` (`src/app/core/services/user.service.ts:54-93`) unconditionally re-fetching all of them again right after login/guest-login/signup/logout to switch from the anonymous `__master__` view to the real user-scoped one — so a fresh login currently costs **two** full-collection fetches per entity type, not one.

## What exists today (no changes made, investigation only)

| Surface | File | Pattern |
| --- | --- | --- |
| Ingredient search (recipe-builder) | `src/app/pages/recipe-builder/components/ingredient-search/ingredient-search.component.ts:91-105` | `computed()` reads `KitchenStateService.products_()`+`recipes_()` in full, filters via `filterOptionsByStartsWith` (`src/app/core/utils/filter-starts-with.util.ts`) on every keystroke. Only needs `name_hebrew`/`item_type_` to filter+display; unit/price ride along only because the whole entity is already resident. |
| Ingredient filter (recipe-book list) | `recipe-book-list.component.ts:327-333` | Same `filterOptionsByStartsWith` pattern over `kitchenState.products_()`. |
| Preparation search | `preparation-search.component.ts:66-72` | Same pattern over the (much smaller) `PreparationRegistryService.allPreparations_()` — not in scope, not a large-catalog problem. |
| Inventory product list | `inventory-product-list.component.ts:202-323` + `.html:76` | Rich **faceted** filter (category/allergen/supplier/low-stock/validation-status/nutrition + free-text `.includes()`), facet counts (`filterCategories_`) built by scanning the full array, full un-paginated `@for` render — no virtual scroll. |
| Recipe book list | `recipe-book-list.component.ts:270-407` | Same shape: faceted filters (type/allergens/labels/approved/station/date-range/favorites/ingredient-containment) + free-text search + facet counts, all over `kitchenState.visibleRecipes_()` in full, no pagination. Allergen resolution (`resolveRecipeAllergens`) is recursive over nested recipe-in-recipe ingredients — needs the full products+recipes arrays as input today. |
| Dashboard stats | `dashboard-overview.component.ts:42-58` | `totalProducts_`/`totalRecipes_`/`lowStockCount_`/`unapprovedCount_` are all `.length` on the fully-loaded arrays — no dedicated count query exists. |
| `KitchenStateService` computed signals | `kitchen-state.service.ts:33-51` | `recipes_` (concat), `visibleRecipes_` (filter), `lowStockProducts_` (filter) — all cheap O(n) scans, not the bottleneck. |
| `ProductDataService` computed signals | `product-data.service.ts:19-29` | `allTopCategories_`/`allAllergens_` — `flatMap`+`Set` over full product array, moderate cost. |
| Server search support | `server/routes/generic.js` | `GET /:type` supports only `filterEntityType`/`filterEntityId`/`limit`/`skip` — flat equality filter, no text/name search param exists anywhere. |
| Mongo indexes | `server/db.js:23-39` | Only `{userId:1}` per cloneable collection + a compound index on `VERSION_HISTORY`. No text index, no index on `name_hebrew` or any searchable field. |

**Key implication:** the two typeahead search components (ingredient search, recipe-book ingredient filter) are simple prefix-match-on-name and only need a handful of display fields — a natural, low-risk first server-side search target. The two faceted list pages (inventory, recipe-book) are a much bigger redesign (facets, recursive allergen resolution, pagination UI) and should **not** be attempted in the same milestone.

# Fix approach — staged, do Milestone 1 first

## Milestone 1 (do first — directly fixes the latency the user reported)

**New server endpoint** — `GET /api/v1/data/:type/search?q=<prefix>&limit=<n>` in `server/routes/generic.js` (or a new small route module if that file is getting crowded):
- Case-insensitive prefix match on `name_hebrew` (matches the existing client-side `filterOptionsByStartsWith` semantics exactly, so behavior doesn't change from the user's point of view — just where it runs).
- Restricted to entity types that actually need it (`PRODUCT_LIST`, `RECIPE_LIST`, `DISH_LIST` — reuse/extend the existing `ALLOWED_ENTITY_TYPES` allowlist pattern already in `generic.js`).
- Returns a **lean projection** only — `_id`, `name_hebrew`, `base_unit_`/`item_type_`-equivalent, whatever minimal field the dropdown actually renders (confirm exact field list against `ingredient-search.component.ts`'s template before implementing) — not full documents. This is the actual performance win: a 25-row lean result is tiny regardless of collection size.
- Small default `limit` (e.g. 25-50) — a typeahead never needs more than what's visible in a dropdown.
- Add a Mongo index to support this: `{ userId: 1, name_hebrew: 1 }` (or a text index if Hebrew prefix-matching needs it — confirm collation/locale behavior for Hebrew before choosing text-index vs. anchored-regex-on-indexed-field; anchored regex `^prefix` on an indexed field can use the index directly and is simpler to reason about than Mongo's text index, which tokenizes and wouldn't preserve "starts with" semantics).

**Client changes:**
- `ingredient-search.component.ts`: replace the `computed()` over full `products_()`/`recipes_()` with a debounced (~200-300ms) call to the new search endpoint, cancelling in-flight requests on new keystrokes (`switchMap`). Keep a minimum query length (match `preparation-search.component.ts`'s existing `2`-char minimum for consistency).
- `recipe-book-list.component.ts`'s ingredient filter (`filteredProductsForIngredientSearch_`): same treatment.
- New small client service or extend `StorageService`/`HttpStorageAdapter` with a `search<T>(entityType, query, limit)` method mirroring the existing `query()`/`queryFiltered()` shape.

**Explicitly not touched in Milestone 1:** `ProductDataService`/`RecipeDataService`/`DishDataService`'s full-collection `ensureLoaded()`/constructor load stays exactly as-is — inventory, recipe-book, dashboard, and everything else keep working off the full in-memory arrays unchanged. This milestone only changes *how the two typeahead components search*, nothing about what's loaded at boot.

## Milestone 2 (separate, larger — do not start until Milestone 1 ships and is validated)

Faceted server-side search/pagination for `inventory-product-list` and `recipe-book-list`: category/allergen/supplier/low-stock/date-range/favorites filters plus facet counts, currently all computed client-side over the full array. This needs its own design pass — likely a Mongo aggregation pipeline per page (facet counts via `$facet`), decisions on how `resolveRecipeAllergens`'s recursive nested-recipe logic moves server-side (or gets cached), and a pagination UI change (currently un-paginated `@for` over the full filtered result). Flag explicitly: this is where the real long-term payload/DOM-size win is, but it's high-risk to rush — scope it as its own plan once Milestone 1's pattern is proven out.

## Milestone 3 (small, independent — can be done anytime)

Dedicated lightweight count endpoints (`GET /api/v1/data/:type/count?filter=...` or similar) so `dashboard-overview.component.ts`'s `totalProducts_`/`totalRecipes_`/`lowStockCount_`/`unapprovedCount_` don't require the full array to exist at all — currently harmless (dashboard already benefits from the full load happening for other reasons) but becomes a real win once Milestone 2 reduces how often a full load happens.

## Milestone 4 (small, independent — worth a quick look)

`UserService._reloadDataServices()` (`user.service.ts:54-93`) causes a second full-collection fetch of every data service right after every login/guest-login/signup/logout, on top of each service's own constructor-time load — investigate whether the constructor-time load can be skipped/deferred when we know auth will resolve within the same tick (e.g. guest auto-login), so a fresh session does one full fetch instead of two. Lower priority than Milestones 1-3; only pursue if it's a small, safe change once the bigger wins land.

# Verification (per milestone)

**Milestone 1:**
1. `ng build` passes.
2. New `/search` endpoint: `curl "http://localhost:3000/api/v1/data/PRODUCT_LIST/search?q=עגב"` (or similar prefix) returns only matching lean results, capped at the configured limit, sub-100ms.
3. In the running app: type in the recipe-builder ingredient search box — results appear with the same prefix-match behavior as before (no regression), noticeably faster on first character for a large catalog account (`dev-guest`).
4. Confirm inventory/recipe-book pages are unaffected (still full-list, unchanged behavior) — this milestone must not touch them.
5. Confirm no duplicate/wasted network calls introduced by the debounce (check via browser network tab that typing quickly doesn't fire one request per keystroke).

# Atomic Sub-tasks

## Milestone 1 (do first) — done, merged to `main` (PR #177), Human-validated 2026-08-13
- [x] Confirm exact lean field list the ingredient-search dropdown needs (read `ingredient-search.component.html` template) before designing the `/search` response shape
- [x] Add `{ userId: 1, name_hebrew: 1 }` index (or equivalent) to `server/db.js` for `PRODUCT_LIST`/`RECIPE_LIST`/`DISH_LIST`
- [x] Add `GET /api/v1/data/:type/search?q=&limit=` to `server/routes/generic.js` — prefix match on `name_hebrew`, lean projection, restricted to an allowlist of searchable entity types
- [x] Add `search<T>()` to `HttpStorageAdapter`/`StorageService` mirroring the existing `query()`/`queryFiltered()` shape
- [x] Refactor `ingredient-search.component.ts` to debounce + call the new search endpoint instead of filtering `KitchenStateService.products_()`/`recipes_()` in full
- [x] Refactor `recipe-book-list.component.ts`'s `filteredProductsForIngredientSearch_` the same way
- [x] Verify per the Verification section above (build, curl, live typeahead behavior, no regression on inventory/recipe-book, no keystroke-spam requests)

## Milestone 2 (separate, larger — scope its own plan once Milestone 1 is validated)
- [ ] Design faceted server-side search/pagination for `inventory-product-list` and `recipe-book-list` (out of scope for this plan's execution — placeholder so it isn't lost)

## Milestone 3 (small, independent)
- [ ] Add lightweight count endpoint(s) so dashboard stats don't require the full array

## Milestone 4 (small, independent, lower priority)
- [ ] Investigate collapsing `UserService._reloadDataServices()`'s post-login re-fetch with each service's constructor-time load so a fresh session does one full fetch instead of two
