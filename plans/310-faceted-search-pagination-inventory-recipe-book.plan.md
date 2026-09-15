# Plan 310 — Faceted Server-Side Search & Pagination for Inventory + Recipe Book

overview: Carves out `plans/301-server-side-search-lean-data-loading.plan.md` Milestone 2 into its own Plan Contract, per that plan's own note ("needs its own design pass... scope it as its own plan once Milestone 1's pattern is proven out") and per `plans/304-perf-phase3-data-volume.plan.md`'s framing of this work as "the terminal step of the whole performance effort." No code changes in this plan yet — this is the design pass plan 301 M2 asked for, plus a persisted Prerequisite Gate so an agent doesn't start it before its own dependencies have shipped.

# Relationship to plans 301, 303, 304 — read before touching this plan

- **`plans/301-…plan.md` Milestone 2`** is the origin of this scope; that plan's Milestone 2 line now points here. Milestones 1 (search), 3 (count endpoints), 4 (double-fetch collapse) are unaffected and already shipped.
- **`plans/304-…plan.md`** explicitly claims this exact scope is "out of scope — see plan 301" and warns: *"An agent picking up 301 M2 without this context risks building faceted search on top of problems that were about to disappear."* Its M1 (list projections) cuts payload, M2 (defer boot loads) cuts how often a full load happens at all, and **M3 (list virtualisation / `cdk-virtual-scroll` or pagination for these exact two components) overlaps directly with this plan's pagination-UI milestone.** Do not design pagination here in a way that duplicates or contradicts 304 M3 — see Decision 4 below.
- **`plans/303-…plan.md`** M1/M2 (Map-based lookups, precomputed row model) already shipped and are load-bearing for anything server-side here that re-derives allergen/cost data — see Decision 2.

# Prerequisite gate — do not start implementation milestones until all of these are true

Mirrors `plans/304-…plan.md`'s own gate structure. This plan's *design* (Milestone 0 below) can proceed now — it's read-only investigation. Milestones 1+ (actual server/client code) must wait.

- [ ] Plan 304 Milestone 1 (list projections) has shipped and been measured
- [ ] Plan 304 Milestone 2 (defer boot loads, collapse double fetch) has shipped and been measured
- [ ] Plan 304 Milestone 3 (list virtualisation) has shipped — **if 304 M3 already solves the DOM-size/pagination problem for these two components, re-scope this plan's pagination milestone down to "wire the new server endpoints into the pagination 304 M3 already built" instead of designing a second pagination mechanism**
- [ ] Re-confirm from measured numbers that faceted server-side search is still worth the risk at the scope below — plan 304's own text flags this as plausible: "they will certainly change its priorities"

# Context — current client-side behavior (read-only investigation, this session)

## Inventory (`inventory-product-list.component.ts`)

| Facet/control | Current implementation | Server-side difficulty |
| --- | --- | --- |
| Category, Supplier | `filterOptionCounts_` scans full `products_()`, buckets via `buildFilterOptionCounts` (`filter-category-counts.util.ts`) | Low — plain field/array match, `$facet` aggregation is a direct port |
| Allergens | Same util, buckets `product.allergens_` | Low — same as above (products don't need recursion, only recipes do) |
| Low stock / invalid / incomplete / nutrition toggles | Client-side `.filter()` on flags/derived status (`getProductValidationStatus`) | Low-medium — `min_stock_level_ > 0` and `nutrition_per_100g` exist as-is are trivial Mongo matches; `getProductValidationStatus`'s "invalid/incomplete" logic (`product-validation.util.ts`) needs to be read and ported or replicated exactly — duplication-drift risk if not shared |
| Free-text search | `.includes()` substring on `name_hebrew`, applied *within* already-filtered results | Existing `/search` endpoint (plan 301 M1) is prefix-only, not substring — needs either a new substring-capable query or accepting a UX change to prefix-match |
| Sort | In-memory `localeCompare(..., 'he')` per column | Needs Mongo collation confirmed for Hebrew (`locale: 'he'`) — unverified whether current Mongo deployment has ICU collation support |

## Recipe book (`recipe-book-list.component.ts`)

| Facet/control | Current implementation | Server-side difficulty |
| --- | --- | --- |
| Type (dish/preparation), Approved, Station | Same `buildFilterOptionCounts` pattern | Low |
| Labels | Same pattern, falls back to `'no_label'` sentinel | Low |
| Allergens | `getRecipeAllergens()` → `resolveRecipeAllergens()` (`recipe-allergens.util.ts`), **recursive** over `ingredients_` where `type === 'recipe'`, depth-capped at `MAX_ALLERGEN_RECURSION`, needs full `recipesById`/`productsById` Maps in memory | **High — this is the architecturally hard piece, see Decision 2** |
| Ingredient-containment (`selectedProductIds_` → `recipeContainsAllProducts`) | Filters recipes whose `ingredients_` reference all selected product IDs | Low-medium — `generic.js` already queries `'ingredients_.referenceId': id` for delete-integrity checks (line ~389), so the field is provably queryable; needs an `$all`/`$elemMatch` variant plus an index |
| Date range (created/updated) | In-memory timestamp comparison | Low — direct range match on `addedAt_`/`updatedAt_` |
| Favorites | Not yet inspected in this session — confirm storage shape before scoping | Unknown — investigate before Milestone 1 |
| Free-text search | Same substring-vs-prefix gap as inventory | Same as inventory |
| Sort | Same Hebrew collation question | Same as inventory |

# Milestone 0 — Decisions (Human must confirm before any implementation milestone starts)

## Decision 1 — Facet counts
Recommend: Mongo `$facet` aggregation stage per list request (one query returns filtered page + all facet counts). Alternative (precomputed/cached counts, invalidated on write) is more complex and only worth it if `$facet` proves too slow under real load — don't build it speculatively.

## Decision 2 — Allergens (the hard one)
Three options, no default recommendation — this needs a real call:
- **(a) Denormalize:** store `resolved_allergens_` on each Recipe/Dish doc, recomputed on write. Requires a cascade: editing a product's allergens must trigger recompute on every recipe/dish that references it (directly or via nested sub-recipe), which is a fan-out write problem, not a read problem.
- **(b) `$graphLookup`:** Mongo can traverse `ingredients_` self-referentially for recipe-in-recipe, joined to `PRODUCT_LIST` for leaf allergens, depth-capped to mirror `MAX_ALLERGEN_RECURSION`. Feasible but nontrivial pipeline; needs a prototype against real nested data before committing.
- **(c) Punt:** keep the allergens facet client-side-only (still requires full `products_()`+`recipes_()` in memory for *that one facet*), server-side for everything else. Simplest, but only a partial fix — re-check whether plan 304 M2's deferred-load pattern already makes this acceptable (allergens facet would force-load the full collections anyway, defeating 304 M2's point on any page using it).

## Decision 3 — Ingredient-containment filter
Confirm `ingredients_.referenceId` has (or gets) an index scoped correctly for this query shape before shipping — check `server/db.js` for existing indexes on `RECIPE_LIST`/`DISH_LIST`.

## Decision 4 — Pagination/virtualisation ownership
**Do not build a second mechanism if plan 304 M3 already ships `cdk-virtual-scroll`.** If 304 M3 lands first, this plan's pagination milestone becomes "wire filtered/paginated server results into the existing virtual-scroll viewport" — a much smaller task. Re-check 304 M3's actual implementation before scoping this milestone's tasks in detail.

## Decision 5 — Search semantics
Confirm whether prefix-only search (existing `/search` endpoint) is an acceptable UX change from the current substring `.includes()` behavior, or whether a substring-capable index (text index, or `$regex` without anchor — not index-friendly at this collection size) is required.

## Decision 6 — Favorites storage
Investigate current favorites storage shape (not read in this session) before scoping a server-side equivalent.

# Milestones (implementation — blocked on Prerequisite Gate + Milestone 0 decisions)

## Milestone 1 — Low-risk facets + pagination skeleton
Server-side `Category`/`Supplier`/`Allergens`(products only)/low-stock/invalid/incomplete/nutrition for inventory; `Type`/`Approved`/`Station`/`Labels`/date-range for recipe-book. One paginated endpoint per list (`$facet` aggregation per Decision 1) returning `{ items, facetCounts, total }`.

## Milestone 2 — Allergens facet (recipe-book)
Implement per whichever option Decision 2 lands on. Expect this to be the largest single milestone in the plan — budget accordingly, do not bundle with Milestone 1.

## Milestone 3 — Ingredient-containment filter (recipe-book)
Server-side `recipeContainsAllProducts` equivalent, indexed per Decision 3.

## Milestone 4 — Client rewire
Replace `filteredProducts_`/`filteredRecipes_` computed()s with paginated server calls (debounced on filter/search/sort changes, `switchMap`-cancelled like the existing ingredient-search pattern). Wire into 304 M3's virtual-scroll viewport per Decision 4 rather than building new pagination UI if that milestone has shipped.

## Milestone 5 — Cross-screen verification
Both lists behave identically to current client-side filtering (parity check per facet), RTL intact, no regression on selection/bulk-edit/inline-price-edit flows that read `filteredProducts_()`/`filteredRecipes_()`/`displayRows_()`.

# Atomic Sub-tasks

## Prerequisite gate
- [ ] Confirm plan 304 M1 shipped and measured
- [ ] Confirm plan 304 M2 shipped and measured
- [ ] Confirm plan 304 M3 shipped; re-scope this plan's Milestone 4 if it changes the pagination approach
- [ ] Re-confirm this plan's scope is still justified against measured numbers

## Milestone 0 — Decisions (Human)
- [ ] Decision 1 — confirm `$facet` aggregation approach for facet counts
- [ ] Decision 2 — choose allergens strategy: (a) denormalize, (b) `$graphLookup`, or (c) punt/keep client-side
- [ ] Decision 3 — confirm/add index for `ingredients_.referenceId` containment queries
- [ ] Decision 4 — confirm pagination ownership relative to plan 304 M3's actual shipped implementation
- [ ] Decision 5 — confirm prefix-only vs substring search UX tradeoff
- [ ] Decision 6 — investigate current favorites storage shape

## Milestone 1 — Low-risk facets + pagination skeleton
- [ ] Design `$facet` aggregation query shape (target: one round-trip per list-page render)
- [ ] Add paginated faceted endpoint for `PRODUCT_LIST` (inventory) — Category/Supplier/Allergens/low-stock/invalid/incomplete/nutrition
- [ ] Add paginated faceted endpoint for `RECIPE_LIST`+`DISH_LIST` (recipe-book) — Type/Approved/Station/Labels/date-range
- [ ] Confirm Hebrew sort collation behavior in Mongo; document findings

## Milestone 2 — Allergens facet
- [ ] Implement chosen strategy from Decision 2
- [ ] Verify against `MAX_ALLERGEN_RECURSION`-depth nested recipes — parity with `resolveRecipeAllergens()` output

## Milestone 3 — Ingredient-containment filter
- [ ] Add server-side containment query + index
- [ ] Verify parity with `recipeContainsAllProducts()`

## Milestone 4 — Client rewire
- [ ] Replace `inventory-product-list.component.ts`'s `filteredProducts_` with debounced server calls
- [ ] Replace `recipe-book-list.component.ts`'s `filteredRecipes_` with debounced server calls
- [ ] Wire into plan 304 M3's virtual-scroll viewport (or build pagination UI if 304 M3 didn't ship one)
- [ ] Preserve `displayRows_()`-style precomputed-row pattern (plan 303 M2) on top of server results

## Milestone 5 — Cross-screen verification
- [ ] Facet-by-facet parity check against current client-side filtering, both screens
- [ ] RTL layout intact
- [ ] Selection state, bulk-edit, inline price/allergen edits unaffected
- [ ] `ng build` passes
