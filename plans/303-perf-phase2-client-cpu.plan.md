# Plan 303 — Performance Phase 2: Client CPU & Interaction Lag

overview: Phase 1 (`plans/302`) fixes how long the app takes to *load*. This plan fixes why it feels laggy once loaded — a different problem with a different cause. Every rendered row in the recipe-book and inventory lists calls template functions that perform full-array linear scans over 1,500-element catalogs, and Angular re-evaluates template function calls on **every** change-detection pass. With zone.js triggering change detection on essentially every browser event, a single click can cost tens of millions of comparisons. This plan replaces the scans with `Map` lookups and moves per-row computation out of templates. The first milestone is the highest value-per-line change in the entire performance audit.

**Source audit:** `reports/performance-audit-2026-08-13.md` sections C and D1.
**Sibling plans:** `plans/302-perf-phase1-infra-and-payload.plan.md` (load time), `plans/304-perf-phase3-data-volume.plan.md` (payload architecture).
**Ordering:** Requires plan 302 Milestone 1 (instrumentation) to be shipped, so improvements are measured rather than asserted. Does **not** require the rest of 302.

# Context

Verified read-only against the working tree on 2026-08-13 (branch `feat/session-20260813-1358`). Line numbers are from that state — re-confirm before editing.

## The core defect

`recipe-book-list.component.html` calls these **inside the row loop**:

| Line | Call |
| --- | --- |
| 89 | `{{ getAllRecipeLabels(...) }}` |
| 108 | `{{ getRecipeAllergens(...) }}` |
| 137 | `{{ getRecipeCost(...) }}` |
| 277 | `{{ getRecipeYieldDescription(...) }}` |
| 286 | `{{ formatUpdatedAtWithTime(...) }}` |

A function call in an Angular template is re-evaluated on every change-detection pass — every click, keystroke, scroll, HTTP response, and timer tick. These functions are not cheap:

```
recipe-cost.service.ts:260    products_().find(p => p._id === ing.referenceId)     // O(1,500)
recipe-cost.service.ts:282    recipes_().find(r => r._id === ing.referenceId)      // O(1,500), recursive
recipe-allergens.util.ts:22   allProducts.find(p => p._id === ing.referenceId)     // O(1,500)
recipe-allergens.util.ts:25   allRecipes.find(r => r._id === ing.referenceId)      // O(1,500), recursive
```

Arithmetic for an imported account (~1,500 products, ~1,500 recipes+dishes, ~20 ingredients/recipe):

- One recipe's cost = 20 ingredients × 1,500-element scan = **30,000 comparisons**
- Recursion into sub-recipes scans the 1,500-element recipe array again per level (`MAX_RECURSION_DEPTH` = 5)
- `getRecipeAllergens` repeats the same work independently
- Lists are **un-paginated with no virtual scroll** — every matching row renders
- One change-detection pass over 1,500 rows ≈ **45-90 million comparisons**

`provideZoneChangeDetection` (`app.config.ts:94`) means zone.js fires change detection on nearly every browser event. That is the lag.

It compounds: `filterCategories_` (`recipe-book-list.component.ts:276`) builds the filter sidebar by iterating every recipe and calling `getRecipeAllergens` on each — so facet construction is itself O(recipes × ingredients × products).

`inventory-product-list.component.html` has the same shape at lines 119 (`getCategoryDisplay`), 139 (`getProductSupplierNames`), 143 (`getPricePerUnit`).

## Already correct — do not "fix"

| Thing | State |
| --- | --- |
| `@for` `track` expressions | **99 / 99 present** ✅ — do not touch |
| Mongo indexes | `{userId:1}` + `{userId:1,name_hebrew:1}` cover both hot queries ✅ (`server/db.js`) |
| Deferred data services | `EquipmentDataService`, `VenueDataService`, `MenuEventDataService` already pass `autoLoad: false` ✅ |

## Related but separate

| Finding | File | Note |
| --- | --- | --- |
| `recipes_` re-allocates | `kitchen-state.service.ts:35-38` | `computed()` memoizes, but each dependency change allocates a fresh ~3,000-element array and invalidates every downstream filter/sort. Lower priority than M1; same neighbourhood. |
| `OnPush` coverage | 46 / 75 components | The other 29 are re-checked on every pass. |
| `syncMasterToUser` frequency | `user.service.ts:16`, `auth.js:274` | Server-side, but it is CPU the client is waiting behind. Covered in M3 below. |

# Milestone 1 — Map-based lookups (highest value-per-line in the audit)

Replace every O(n) `.find()` in the cost and allergen paths with O(1) `Map` lookups. This alone should remove ~99% of the comparisons above, and it is a contained change with no UI or API surface.

### 1a. Expose lookup Maps from `KitchenStateService`

`src/app/core/services/kitchen-state.service.ts` — add alongside the existing signals (lines 33-51):

```ts
readonly productsById_ = computed(() => new Map(this.products_().map(p => [p._id, p])))
readonly recipesById_  = computed(() => new Map(this.recipes_().map(r => [r._id, r])))
```

`computed()` memoizes, so each Map is rebuilt only when the underlying list changes — not per render.

### 1b. Consume the Maps in `RecipeCostService`

`src/app/core/services/recipe-cost.service.ts:260` and `:282` — replace the two `.find()` calls with `.get()` on the new Maps.

### 1c. Consume the Maps in `resolveRecipeAllergens`

`src/app/core/utils/recipe-allergens.util.ts:22,25`. This is a pure function taking `allRecipes: Recipe[]` and `allProducts: Product[]` (lines 10-16). **Change the signature to accept Maps instead of arrays** and update all callers.

Known callers to update:
- `recipe-book-list.component.ts:464` (`getRecipeAllergens`)

Search for every other call site before editing — this is a shared util and the compiler will catch missed callers, but an agent should enumerate them up front rather than fixing them reactively.

Keep the function pure and keep the recursion-depth guard (`MAX_ALLERGEN_RECURSION`) exactly as-is.

### Verification (M1)

1. `ng build` passes.
2. **Correctness is the risk here, not speed.** Recipe costs and allergen badges must be *identical* before and after. Pick 10 recipes spanning: a plain product-only recipe, one with nested sub-recipes, one hitting the recursion depth limit, one with a missing/broken `referenceId`, and one with `purchase_options_` price overrides. Record costs + allergens before, compare after.
3. DevTools Performance profile on recipe-book with a large account: scripting time per interaction should drop by orders of magnitude.
4. Confirm the filter sidebar (`filterCategories_`) still produces the same facet values and counts.

# Milestone 2 — Precomputed row model

With M1 shipped the scans are gone, but the template still re-invokes five functions per row per change-detection pass. Eliminate that entirely.

Build a `computed()` that produces the fully-derived row objects once per data change, and have templates read plain properties:

```ts
protected readonly displayRows_ = computed(() =>
  this.filteredRecipes_().map(recipe => ({
    recipe,
    cost: /* … */,
    allergens: /* … */,
    labels: /* … */,
    yieldDesc: /* … */,
    updatedAt: /* … */,
  }))
)
```

Then `recipe-book-list.component.html` iterates `displayRows_()` and reads `row.cost`, `row.allergens`, etc. Change detection then costs nothing for these cells.

Apply the same treatment to `inventory-product-list.component.html` lines 119, 139, 143.

**Preserve the existing `track` expressions** — they are all correct today and must keep tracking the stable entity `_id`, not the new wrapper object identity.

Also convert the remaining 29 non-`OnPush` components to `ChangeDetectionStrategy.OnPush`. Do this as a separate commit from the row-model work so a regression is easy to bisect.

### Verification (M2)

1. `ng build` passes.
2. Rendered output byte-identical to M1's state — same costs, badges, labels, dates, sort order.
3. DevTools Performance: change-detection passes on recipe-book and inventory should show near-zero scripting for row rendering.
4. Sorting and filtering still work (both lists sort by derived values — `inventory-product-list.component.ts:338-348` sorts on `getCategoryDisplay` / `getSupplierNames` output, so those must come from the same precomputed source or they will drift).

# Milestone 3 — `syncMasterToUser` frequency & the O(n²) Set

Server-side, but it is CPU the client waits behind — and on a 0.1-CPU instance it competes directly with the catalog GETs the client issues at the same moment.

### 3a. Stop syncing on every page load

`UserService`'s constructor calls `refreshToken()` on **every page load** when `useBackendAuth` is true — which it is in production (`environment.prod.ts:5`). `_startRefreshTimer()` fires it again every 13 minutes (`user.service.ts:16`). Server-side, `POST /refresh` calls `syncMasterToUser` (`auth.js:274`).

Each run does, for **each of 14 cloneable types** (`sync-master.js:205-212`):

```js
const [masterDocs, userDocs, allUserDocs] = await Promise.all([
  col.find({ userId: '__master__' }).toArray(),               // full documents
  col.find({ userId, _masterId: { $ne: null } }).toArray(),   // full documents
  col.find({ userId }, { projection: { _id: 1, name_hebrew: 1 } }).toArray(),
]);
```

≈42 queries per run, several scanning 1,500-doc collections. Plus `getCrossCollectionNameSet()` and `ensureRecipeDishPrepass()` add more full scans of `RECIPE_LIST` / `DISH_LIST`.

Two fixes, either or both:

- **Remove the sync from `/refresh` entirely** (`auth.js:274`). Refresh is a token operation — nothing about master data changed in the last 13 minutes. Keep it on `/login` (`auth.js:226`) and `/signup`. Simplest, and probably sufficient.
- **Version-gate it.** Stamp a `masterDataVersion` when master data changes, store the last-synced version per user, return immediately when they match. Turns ~42 queries into 1 for the overwhelming majority of calls. More robust, more work.

It is already correctly fire-and-forget on `/refresh` so it does not block the token response — but it still burns CPU at exactly the wrong moment.

### 3b. Hoist the rebuilt `Set` out of the loop

`server/services/sync-master.js:273-274` — verified against `main` **after** commit `e7b9198` (collision-log summarization). An earlier draft of this plan cited `272-273`, which was correct only for the pre-`e7b9198` working tree; if you are reading a checkout without that commit, subtract 8.

```js
for (const master of masterDocs) {
  ...
  const allProductNames = new Set(allUserDocs.map(d => d.name_hebrew?.trim()).filter(Boolean));
```

The `Set` is rebuilt from `allUserDocs` on **every** master-product iteration. With ~83 master products against 1,500 user docs that is ~125,000 redundant string operations per sync.

It only fires on the `!existing` branch (new clones), so steady-state logins skip it — but it hits hard on first login and after any master-data change. Hoisting the construction above the loop is a one-line fix with no behaviour change.

### Verification (M3)

1. Confirm from plan 302 M1's logging that `/refresh` no longer triggers a burst of Mongo queries.
2. Login still correctly clones master data for a **brand-new** user — this is the regression risk. Create a fresh account end-to-end and verify products/recipes/dishes/suppliers all appear with correctly remapped `referenceId`s.
3. An existing user's data is unchanged after login (Rule 3 — user modifications still win).
4. p95 response time for `/api/v1/auth/refresh` and for concurrent `/api/v1/data/*` calls improves against the 302 M1 baseline.

# Verification (whole plan)

1. `ng build` passes at every commit.
2. Recipe costs and allergen resolution are provably unchanged (M1's comparison table).
3. DevTools Performance profile before/after on recipe-book with a 1,500-recipe account.
4. New-user signup still receives correctly cloned and remapped master data (M3's regression risk).
5. Numbers recorded in `reports/performance-audit-2026-08-13.md`.

# Atomic Sub-tasks

## Milestone 1 — Map-based lookups (do first)
- [ ] Add `productsById_` and `recipesById_` computed Maps — `src/app/core/services/kitchen-state.service.ts:33-51`
- [ ] Replace the product `.find()` with a Map `.get()` — `src/app/core/services/recipe-cost.service.ts:260`
- [ ] Replace the sub-recipe `.find()` with a Map `.get()` — `src/app/core/services/recipe-cost.service.ts:282`
- [ ] Enumerate every caller of `resolveRecipeAllergens` before changing its signature
- [ ] Change `resolveRecipeAllergens` to accept Maps instead of arrays, preserving purity and the depth guard — `src/app/core/utils/recipe-allergens.util.ts:10-34`
- [ ] Update `getRecipeAllergens` to pass Maps — `src/app/pages/recipe-book/components/recipe-book-list/recipe-book-list.component.ts:464`
- [ ] Record before/after costs + allergens for 10 representative recipes (incl. nested, depth-limited, broken-ref, price-override cases)
- [ ] DevTools Performance profile on recipe-book before/after; record in the audit report

## Milestone 2 — Precomputed row model
- [ ] Build `displayRows_` computed for recipe-book, covering cost / allergens / labels / yield / updatedAt
- [ ] Rewrite `recipe-book-list.component.html` lines 89, 108, 137, 277, 286 to read precomputed properties
- [ ] Build the equivalent computed row model for inventory
- [ ] Rewrite `inventory-product-list.component.html` lines 119, 139, 143 to read precomputed properties
- [ ] Ensure sorting reads the same precomputed values so sort and display cannot drift — `inventory-product-list.component.ts:338-348`
- [ ] Verify all `track` expressions still track stable entity `_id`, not wrapper identity
- [ ] Separate commit: convert the remaining 29 components to `ChangeDetectionStrategy.OnPush`

## Milestone 3 — sync-master frequency & Set hoist
- [ ] Hoist the `allProductNames` Set construction above the master loop — `server/services/sync-master.js:273-274`
- [ ] Remove `syncMasterToUser` from `POST /refresh` (or implement the `masterDataVersion` gate) — `server/routes/auth.js:274`
- [ ] Decide and document which of the two approaches was taken, and why
- [ ] Regression test: brand-new account signup receives correctly cloned + remapped master data
- [ ] Regression test: existing user's modified docs still win after login (Rule 3)

## Deferred — revisit only after M1-M3 are measured
- [ ] Evaluate whether `recipes_`'s array re-allocation still matters once M1/M2 land — `kitchen-state.service.ts:35-38`
- [ ] Do **not** pursue a zoneless migration yet: with M1+M2 shipped, most of the pain zoneless would address is already gone, and 29 non-`OnPush` components make it a large migration
