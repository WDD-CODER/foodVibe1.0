# Plan 304 — Performance Phase 3: Data Volume

overview: Plans 302 and 303 fix load time and interaction lag without changing the data architecture. This plan finally addresses the volume itself: the app fetches an estimated 5-7 MB of JSON at boot across four auto-loading collections, fetches it **twice** on login, returns whole documents where lists render a handful of fields, and renders every row of a 1,500-item list with no pagination or virtualisation. These are real costs, but they are also the largest and riskiest work in the audit — which is exactly why they come last. Ship 302 and 303 first and re-measure; they may reduce this plan's scope, and they will certainly change its priorities.

**Source audit:** `reports/performance-audit-2026-08-13.md` sections C1.3, D2, D3.
**Sibling plans:** `plans/302-perf-phase1-infra-and-payload.plan.md`, `plans/303-perf-phase2-client-cpu.plan.md`.
**Ordering:** Do not start until 302 and 303 have shipped **and** been measured. See "Prerequisite gate" below — it is a real gate, not a formality.

# Out of scope — see plan 301

Faceted server-side search and pagination for `inventory-product-list` and `recipe-book-list` is **already scoped** as `plans/301-server-side-search-lean-data-loading.plan.md` Milestone 2. Do **not** restate or re-design it here.

Plan 301 M2 is the terminal step of the whole performance effort. It needs its own design pass (Mongo `$facet` aggregation for facet counts, a decision on how `resolveRecipeAllergens`'s recursive nested-recipe logic moves server-side or gets cached, and a pagination UI change).

**Relationship:** this plan's milestones should ship and be measured **before** 301 M2 begins. They may materially reduce its scope — M1's projections cut payload, M2 cuts how often a full load happens at all, and M3 removes the DOM-size pressure that is one of 301 M2's motivations. An agent picking up 301 M2 without this context risks building faceted search on top of problems that were about to disappear.

Plan 301 Milestones 3 (count endpoints) and 4 (collapsing the double fetch) overlap with this plan's M2 — see the note there.

# Prerequisite gate

Before any work in this plan starts, confirm all of the following. If any is unmet, stop and go finish the earlier plan.

- [ ] Plan 302 Milestone 1 instrumentation is deployed and `reports/performance-audit-2026-08-13.md` has an "Observed" section with real numbers
- [ ] Plan 302 Milestone 2 is resolved (either the tier was upgraded, or cold starts were disproven from logs)
- [ ] Plan 303 Milestones 1-2 have shipped — the O(n) scans and per-row template calls are gone
- [ ] The app has been re-measured after the above, and the observed payload/parse cost still justifies this work

That last checkbox matters most. Every estimate below is derived from reading code and sizing demo data. It is entirely possible that after 302 and 303 the app feels fine and this plan should be reduced or dropped.

# Context

Verified read-only against the working tree on 2026-08-13 (branch `feat/session-20260813-1358`). Line numbers are from that state — re-confirm before editing.

## Estimated payload

`server/routes/generic.js:67-71` — `GET /:type` applies no projection:

```js
const docs = await col(req.params.type).find(filter).skip(skip).limit(limit).toArray();
```

Sized from `public/assets/data/demo-*.json` as a proxy for real documents:

| Collection | bytes/doc | × ~1,500 docs |
| --- | --- | --- |
| `PRODUCT_LIST` | ~382 | ~570 KB |
| `RECIPE_LIST` | ~1,753 | ~2.5 MB |
| `DISH_LIST` | ~2,505 | ~3.7 MB |

So a boot fetch is on the order of **5-7 MB of JSON**. `compression()` is enabled (`server/index.js:57`) and JSON gzips well — roughly 700 KB-1 MB over the wire — but the browser still parses all 5-7 MB, and for products runs `normalizeProduct()` over every row (`product-data.service.ts:69`). **Gzip fixes transfer, not parse.**

Plan 302 M1's `bytes=` logging will replace these estimates with observed numbers. Use those, not these.

## What loads at boot, and twice on login

`KitchenStateService` is listed directly in `app.config.ts:98` providers, so it instantiates at bootstrap and pulls in four data services, all of which call `ensureLoaded()` in their constructors:

| Service | File | Constructor |
| --- | --- | --- |
| `ProductDataService` | `product-data.service.ts:34-36` | `void this.ensureLoaded()` |
| `RecipeDataService` | `recipe-data.service.ts:23-25` | `void this.ensureLoaded()` |
| `DishDataService` | `dish-data.service.ts:23-25` | `void this.ensureLoaded()` |
| `SupplierDataService` | `supplier-data.service.ts:13-15` | `super(ENTITY)` — `autoLoad` defaults true |

Four full-collection GETs before any route resolves. Then `_reloadDataServices()` (`user.service.ts:54-93`) re-fetches all of them again after login/signup/logout.

The deferred pattern already exists and works — `EquipmentDataService:19`, `VenueDataService:15`, and `MenuEventDataService` pass `autoLoad: false` and are guarded by `hasLoaded()` in `_reloadDataServices`. The four heavy services simply do not use it.

The default landing route is `dashboard` (`app.routes.ts:211`), which needs none of `RECIPE_LIST` or `DISH_LIST` in full.

## Rendering

No pagination and no virtualisation anywhere:

```
cdk-virtual-scroll usages    0     (@angular/cdk is already a dependency)
Paginated lists              0
@for loops with track       99/99  ✅ already correct
```

# Milestone 1 — List projections on `GET /:type`

The cheapest meaningful payload cut, and far lower risk than 301 M2.

Add an optional projection to `GET /:type` (`server/routes/generic.js:45-77`) that omits fields lists never render — candidates: `steps_`, `nutrition_per_100g`, `logistics_`, long description fields. Fetch full documents only on detail views (`GET /:type/:id`, already implemented at `generic.js:136-152`).

The pattern to follow already exists in this file: `SEARCH_PROJECTIONS` (`generic.js:82-86`) does exactly this for the typeahead endpoint, added by plan 301 M1. Mirror its shape — a per-type projection map — rather than inventing a new mechanism.

**Design decisions to settle before coding:**
- Opt-in query param (`?view=list`) vs. always-lean for list fetches. Opt-in is safer and lets the client migrate incrementally.
- Which consumers actually need the omitted fields, and whether they already have a detail-fetch path. **Audit this before removing any field** — silently dropping a field that a component reads produces subtle broken UI, not an error.
- `normalizeProduct()` (`product-data.service.ts:77-118`) reads many fields including `nutrition_per_100g` (line 116). Confirm what breaks if they are absent.

Expect this to roughly halve the payload for a fraction of 301 M2's effort and risk.

### Verification (M1)

1. `ng build` passes.
2. Plan 302 M1's `bytes=` logging shows the drop; record before/after in the audit report.
3. Every list page renders identically — inventory, recipe-book, menu-library, dashboard, cook-view.
4. Detail/edit views still receive complete documents; saving a product or recipe does **not** drop the omitted fields. **This is the regression risk: a lean list doc round-tripping through a save would silently erase data.** Verify explicitly that edit flows fetch the full document first.

# Milestone 2 — Defer boot loads & collapse the double fetch

### 2a. Defer the heavy collections

Apply the existing `autoLoad: false` + `ensureLoaded()` resolver pattern to `RecipeDataService` and `DishDataService` at minimum. The dashboard needs neither.

The resolvers already exist and already do the right thing — `kitchenDataEnsureLoadedResolver` (`kitchen-data-ensure-loaded.resolver.ts`) awaits products, recipes, and dishes, and is wired to `recipe-builder`, `recipe-book`, and `cook` in `app.routes.ts:122,134,142,172,177`.

**Do not remove the eager load without confirming the resolver covers every consumer.** The resolver's docstring warns that a component reading `KitchenStateService.recipes_()` before hydration can *permanently unlink ingredient rows* (plan 300 finding 3). That is a data-corruption risk, not a cosmetic one. Enumerate every route and component that touches `products_()` / `recipes_()` and confirm each is gated.

`ProductDataService` is the most widely consumed — treat it as the last one to defer, if at all.

### 2b. Collapse the double fetch

`_reloadDataServices()` (`user.service.ts:54-93`) re-fetches everything right after login, on top of each service's constructor load. Investigate skipping the constructor-time load when auth is known to resolve in the same tick.

This is **plan 301 Milestone 4**, already written up there. Cross-reference it rather than duplicating; whichever plan executes it first should mark the other's item done.

### Verification (M2)

1. `ng build` passes.
2. DevTools Network on a cold dashboard load: `RECIPE_LIST` and `DISH_LIST` requests are **absent**.
3. Navigating to recipe-book / recipe-builder / cook still loads them, and ingredient rows resolve correctly.
4. **Critical regression check:** open a recipe with nested sub-recipe ingredients directly by URL (cold, no prior navigation) and confirm no ingredient row is unlinked. Save it and confirm references survive. This is plan 300 finding 3 and it must not regress.
5. Login fires one round of fetches, not two.

# Milestone 3 — List virtualisation

`@angular/cdk` is already a dependency (`package.json`) and `cdk-virtual-scroll` appears nowhere in the codebase.

Add virtual scrolling (or pagination) to `inventory-product-list` and `recipe-book-list`. Rendering 1,500 rows means ~1,500 × N DOM nodes, which costs layout and memory independent of the scan problem plan 303 fixed.

**Sequencing note:** plan 303 M2's precomputed row model is a prerequisite in spirit — virtualising rows that still call functions per render just reduces how many expensive calls happen, rather than removing them. Do 303 M2 first.

Preserve the existing `track` expressions.

### Verification (M3)

1. `ng build` passes.
2. DOM node count on recipe-book with 1,500 recipes drops by an order of magnitude.
3. Scroll performance is smooth; no blank rows or jumping.
4. Filtering, sorting, and selection still behave correctly across the virtual viewport — **selection state across a virtualised list is the classic bug here**; test selecting a row, scrolling far away, and scrolling back.
5. RTL layout is not broken by the viewport (the app is `dir="rtl"` — `index.html`).

# Verification (whole plan)

1. `ng build` passes at every commit.
2. Observed payload per boot, measured via plan 302 M1's logging, before and after.
3. No data loss on save after M1's projections (the highest-severity risk in this plan).
4. No ingredient unlinking after M2's deferral (plan 300 finding 3 must not regress).
5. Numbers recorded in `reports/performance-audit-2026-08-13.md`.
6. Re-assess whether plan 301 M2 is still needed at its original scope.

# Atomic Sub-tasks

## Prerequisite gate
- [ ] Confirm plan 302 M1 instrumentation is deployed and "Observed" numbers exist in the audit report
- [ ] Confirm plan 302 M2 is resolved (tier upgraded, or cold starts disproven)
- [ ] Confirm plan 303 M1-M2 have shipped
- [ ] Re-measure and confirm payload/parse cost still justifies this plan; reduce or drop scope if not

## Milestone 1 — List projections
- [ ] Audit which components read `steps_`, `nutrition_per_100g`, `logistics_` and whether they have a detail-fetch path
- [ ] Confirm what `normalizeProduct()` does when omitted fields are absent — `product-data.service.ts:77-118`
- [ ] Decide opt-in (`?view=list`) vs. always-lean; document the choice
- [ ] Add per-type list projections mirroring the existing `SEARCH_PROJECTIONS` shape — `server/routes/generic.js:82-86`, applied at `:45-77`
- [ ] Verify every list page renders identically
- [ ] Verify edit flows fetch full documents and saving does not erase omitted fields
- [ ] Record before/after `bytes=` from plan 302 M1's logging

## Milestone 2 — Defer boot loads & collapse double fetch
- [ ] Enumerate every route/component reading `products_()` / `recipes_()` and confirm resolver coverage
- [ ] Switch `RecipeDataService` to `autoLoad: false` — `recipe-data.service.ts:23-25`
- [ ] Switch `DishDataService` to `autoLoad: false` — `dish-data.service.ts:23-25`
- [ ] Evaluate whether `ProductDataService` can be deferred; document the decision either way
- [ ] Regression test: cold-load a recipe with nested sub-recipes by direct URL; confirm no ingredient unlinking (plan 300 finding 3)
- [ ] Collapse the post-login re-fetch with the constructor load — `user.service.ts:54-93` (this is plan 301 M4; mark it done there too)

## Milestone 3 — List virtualisation
- [ ] Confirm plan 303 M2's precomputed row model has shipped first
- [ ] Add `cdk-virtual-scroll` (or pagination) to `inventory-product-list`
- [ ] Add `cdk-virtual-scroll` (or pagination) to `recipe-book-list`
- [ ] Preserve all existing `track` expressions
- [ ] Test selection state across scroll (select → scroll far → scroll back)
- [ ] Verify RTL layout is intact inside the virtual viewport

## Hand-off
- [ ] Re-assess plan 301 Milestone 2's scope in light of measured results; update `plans/301-server-side-search-lean-data-loading.plan.md` with findings
