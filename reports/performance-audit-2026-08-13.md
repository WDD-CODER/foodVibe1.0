# FoodVibe — Performance Audit (2026-08-13)

**Scope:** Why the app feels slow on Render (remote) since the catalog grew ~5x.
**Status:** Read-only investigation. Nothing was changed. No fixes applied.
**Relationship to plan 301:** Plan 301 correctly identified the "load everything, filter in memory" architecture and shipped Milestone 1 (server-side typeahead). That fixed *one* symptom. This audit finds that the largest remaining costs are **not** in the search path — they are in infrastructure, boot payload, and client render CPU. Plan 301's Milestone 2 is still the right long-term fix for the data volume, but three cheaper wins sit in front of it.

---

## TL;DR — where the time actually goes

Ranked by (time saved) ÷ (effort). The first three are configuration, not architecture.

| # | Problem | Cost to user | Fix effort |
|---|---|---|---|
| 1 | **Render free tier spins down after 15 min idle** | +50–90s on the first request after idle. This alone explains "it takes forever to load." | Config / $7-per-month |
| 2 | **No `Cache-Control` on static assets** | ~30 conditional GET round-trips to a cold Render box on *every* page load | ~3 lines |
| 3 | **`PreloadAllModules` downloads all 2.8 MB of JS at boot**, including a 996 KB ExcelJS chunk | Multi-second stall competing with the data fetches for bandwidth | ~1 line |
| 4 | **Per-row template functions do full-array `.find()` scans** in recipe-book and inventory | Tens of millions of ops per change-detection pass. This is the "clicking feels laggy" problem. | Medium |
| 5 | **~5 MB of JSON fetched at boot** across 4 auto-loading collections | Seconds of transfer + parse + normalize on every session | Large (plan 301 M2) |
| 6 | **`syncMasterToUser` runs on every page load and every 13 min** | ~40 Mongo queries per page load, several scanning 1,500-doc collections | Small–medium |
| 7 | **1.27 MB PNG placeholder** loaded by recipe-builder | 1.27 MB for an image that should be ~30 KB | Trivial |

---

## First: you are flying blind

There are no numbers anywhere in this repo — no timing logs, no `explain()` output, no Lighthouse run. Every estimate below is derived from reading code and measuring the built bundle. **Before fixing anything, get real measurements**, because #1 may be masking everything else:

- **Server:** `morgan('tiny')` is already installed but doesn't log duration. Switch to `morgan(':method :url :status :res[content-length] - :response-time ms')` and read Render's logs. That single change tells you whether slowness is server-side at all.
- **Client:** Chrome DevTools → Network (disable cache) and Performance tab on the recipe-book page. Look at "Scripting" time vs "Loading" time. My read of the code says recipe-book will be dominated by scripting; boot will be dominated by loading.
- **Mongo:** run `.explain('executionStats')` on the two hot queries (below) against the real Atlas data, not local.

Without this you will not be able to tell which of the fixes below actually worked.

---

## A. Infrastructure — the biggest single win, zero code

### A1. Render free tier is spinning your server down 🔴 CRITICAL

`render.yaml:4`

```yaml
plan: free
```

Render's free tier **suspends the instance after 15 minutes with no inbound traffic**, and a cold start has to boot Node, connect to Atlas, run `connectDb()`'s ~20 `createIndex` calls, and run `seedMasterData()` before `app.listen()` is ever called (`server/index.js:125-131`). Real-world cold starts on this tier are **50–90 seconds**.

The free tier also gives you **0.1 shared CPU and 512 MB RAM**. Serving a 5 MB JSON response — read from Mongo, serialized, then gzipped — on 0.1 CPU is slow *even when warm*.

This is almost certainly the single biggest contributor to "it takes a lot of time to load," and it is invisible in code review because the code is fine. If the user's experience is "sometimes instant, sometimes a minute," that's this, definitively.

**Fix:** upgrade to Starter ($7/mo). Everything else in this report is optimizing around a problem that money solves outright. A keep-alive pinger is a common workaround but violates Render's terms and doesn't fix the 0.1 CPU ceiling.

**Secondary:** `seedMasterData()` blocks `app.listen()` on every boot. It's idempotent and exits after one `findOne` — cheap, but it's still one Atlas round-trip in front of your first byte. Move it after `listen()`.

### A2. Check your Atlas tier too

Not visible from the repo, but if `MONGO_URI` points at an M0 free cluster you have shared CPU there as well, plus a 500-connection cap. `mongoose.connect` uses `maxPoolSize: 10` (`server/db.js:14`) which is fine, but M0 latency under contention is unpredictable. Also verify the Atlas region matches the Render region — a cross-region hop adds 80–150 ms to *every single query*, and `syncMasterToUser` makes ~40 of them per page load.

### A3. Two Render services, one config

`render.yaml` declares `foodvibe`, `environment.gh-pages.ts` points at `foodvibe.onrender.com`, and `environment.remote.ts` points at `foodvibe-api.onrender.com`. If both exist on the free tier, both spin down independently and you have two cold starts. Worth confirming which is actually live.

---

## B. Boot payload — what the browser downloads before it can do anything

### B1. `PreloadAllModules` pulls the entire app down at startup 🔴 HIGH

`src/app/app.config.ts:96`

```ts
provideRouter(routes, withPreloading(PreloadAllModules))
```

Every route in `app.routes.ts` is lazy — good. But `PreloadAllModules` immediately defeats that by downloading **every** lazy chunk in the background right after bootstrap. Measured from your current `dist/`:

```
Total JS:              2.8 MB
main:                  122 KB
chunk-ORWVK2QB.js:     996 KB   ← ExcelJS
chunk-WRFK44MF.js:     187 KB
chunk-I54IBCL7.js:     166 KB
```

So a user who only opens the dashboard still downloads 2.8 MB of JavaScript, and it competes for bandwidth with the ~5 MB of catalog JSON being fetched at the same time.

**Worst offender:** that 996 KB chunk is ExcelJS. `menu-export.service.ts:8` and `recipe-export.service.ts:8` both do a **static** `import { Workbook } from 'exceljs'`. `ExportService` is injected by `cook-view`, `menu-intelligence`, and `recipe-builder` — so ~1 MB of spreadsheet library rides along with three of your heaviest pages, and with `PreloadAllModules` it downloads for everyone, always, even users who never export.

**Fix (two parts, both small):**
1. Drop `withPreloading(PreloadAllModules)` entirely, or replace it with a custom strategy that preloads only `dashboard` and `recipe-book`. On a fast connection preloading is a nice-to-have; on the mobile/kitchen connections this app is used on, it's actively harmful.
2. Make ExcelJS a dynamic import inside the export methods: `const { Workbook } = await import('exceljs')`. The library then loads only when someone clicks Export. `excel-workbook.util.ts:7` already uses `import type` correctly — the pattern is right there.

Expect this to cut initial JS from 2.8 MB to roughly 600–800 KB.

### B2. A 1.27 MB PNG placeholder 🟡

```
public/assets/style/img/food-compos-logo.png       1,884,522 bytes
public/assets/style/img/recipe_placeholder.png     1,276,764 bytes
public/assets/images/stamp-not-approved.png          177,305 bytes
public/assets/images/stamp-approved.png              161,418 bytes
```

- `recipe_placeholder.png` (1.27 MB) **is referenced** — `recipe-header.component.ts:133`. It's a placeholder image. It should be ~20–40 KB as a WebP, or better, a CSS gradient / inline SVG with zero bytes.
- `food-compos-logo.png` (1.88 MB) is referenced **nowhere** in `src/`. Dead weight in the repo and the deploy, though it won't be downloaded by users.
- The two stamps (~340 KB combined) are loaded by `approve-stamp.component.ts` and are also far larger than they need to be.

Converting these to WebP at sensible dimensions saves ~1.5 MB of real user download for roughly ten minutes of work.

### B3. No cache headers on static assets 🔴 HIGH

`server/index.js:62`

```js
app.use(express.static(STATIC_DIR))
```

No options. `express.static` defaults to `maxAge: 0`, which means the browser must revalidate **every asset on every page load** — ~30 conditional GETs, each a full round-trip to a Render box that may be cold. The responses are 304s, so it's cheap in bytes but expensive in latency, and it's serialized against a slow origin.

Your Angular build uses `"outputHashing": "all"` (`angular.json`), so every JS/CSS filename already contains a content hash. These files are **immutable by construction** and are exactly what long-lived caching is designed for:

```js
app.use(express.static(STATIC_DIR, {
  maxAge: '1y',
  immutable: true,
  index: false,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache')
    }
  }
}))
```

`index.html` must stay `no-cache` so deploys are picked up; everything else can be cached for a year. This turns a repeat visit from ~30 network round-trips into zero. Given #1 (cold starts), this is disproportionately valuable — it's the difference between a repeat load being instant and a repeat load waiting on a sleeping server.

Note also that `express.static` is mounted **before** the API routes, so every `/api/` request does a filesystem stat miss first. Minor, but moving it after the API routers is free.

### B4. `dictionary.json` blocks bootstrap

`app.config.ts:100-105` — the first `APP_INITIALIZER` awaits `loadGlobalDictionary()`. That's a 46 KB fetch that must complete before Angular renders anything. It's correct (Hebrew UI can't render without it), but it's a serial dependency in front of your first paint. Options: inline it into the bundle at build time, or add `<link rel="preload">` in `index.html` so it starts downloading in parallel with the JS rather than after it.

---

## C. Client CPU — why interaction feels laggy (as distinct from slow to load)

This is the part plan 301 hasn't addressed, and it's why the app feels "annoying" rather than merely slow. Loading is a one-time wait; this is a tax on *every click*.

### C1. Per-row template functions doing full-array scans 🔴 CRITICAL

`recipe-book-list.component.html` calls these inside the row loop:

```
line 137:  {{ getRecipeCost(...) }}
line 108:  {{ getRecipeAllergens(...) }}
line  89:  {{ getAllRecipeLabels(...) }}
line 277:  {{ getRecipeYieldDescription(...) }}
line 286:  {{ formatUpdatedAtWithTime(...) }}
```

A function call in an Angular template is re-evaluated on **every change-detection pass** — every click, keystroke, scroll event, HTTP response, and timer tick. And these are not cheap functions:

`recipe-cost.service.ts:260`
```ts
const product = this.kitchenState_.products_().find(p => p._id === ing.referenceId)
```
`recipe-cost.service.ts:282`
```ts
const subRecipe = this.kitchenState_.recipes_().find(r => r._id === ing.referenceId)
```
`recipe-allergens.util.ts:22,25` — the same two linear scans, also recursive.

Work out the arithmetic for an imported account (~1,500 products, ~1,500 recipes+dishes, ~20 ingredients per recipe):

- One recipe's cost = 20 ingredients × 1,500-element linear scan = **30,000 comparisons**
- Plus recursion into sub-recipes, each scanning the 1,500-element recipe array again
- `getRecipeAllergens` does the same again, independently
- The list is **not paginated and has no virtual scroll** — every matching recipe renders
- So one change-detection pass over 1,500 rows ≈ **45–90 million comparisons**

And `provideZoneChangeDetection` (`app.config.ts:94`) means zone.js triggers change detection on essentially every browser event. This is the lag.

It gets worse: `filterCategories_` (`recipe-book-list.component.ts:276`) — the filter sidebar — iterates every recipe and calls `getRecipeAllergens` on each, so building the facet list is itself O(recipes × ingredients × products).

`inventory-product-list.component.html` has the same shape at lines 119, 139, 143 (`getCategoryDisplay`, `getProductSupplierNames`, `getPricePerUnit`).

**Fixes, in order of value:**

1. **Build lookup Maps instead of scanning arrays.** A `computed(() => new Map(products.map(p => [p._id, p])))` in `KitchenStateService`, consumed by `RecipeCostService` and `resolveRecipeAllergens`, turns every O(n) `.find()` into O(1). This is a contained change and on its own should remove ~99% of the comparisons above. **Do this one first — it is the highest value-per-line change in the entire report.**
2. **Move per-row values out of the template.** Compute a `displayRows_ = computed(...)` that produces `{ recipe, cost, allergens, labels, yieldDesc, updatedAt }` once per data change, and have the template read plain properties. Change detection then costs nothing.
3. **Paginate or virtualize the lists.** `@angular/cdk` is already a dependency and `cdk-virtual-scroll` appears nowhere in the codebase. Rendering 1,500 rows also means ~1,500 × N DOM nodes, which is its own cost independent of the scans.
4. **`OnPush` everywhere.** 46 of 75 components use it. The remaining 29 are re-checked on every pass.

Credit where due: every `@for` in the codebase (99 of them) has a `track` expression. That part is already right.

### C2. `recipes_` allocates a new array on every read

`kitchen-state.service.ts:35-38`

```ts
recipes_ = computed(() => [
  ...this.recipeDataService.allRecipes_(),
  ...this.dishDataService.allDishes_()
])
```

`computed` memoizes, so this only recomputes when a dependency changes — but when either list changes it allocates a fresh 3,000-element array, and every downstream `visibleRecipes_`, filter, and sort re-runs. Combined with C1's per-row scans over this array, it's worth being deliberate about. Lower priority than C1 but same neighbourhood.

---

## D. Server and database

### D1. `syncMasterToUser` runs far more often than you think 🟠 MEDIUM-HIGH

`UserService`'s constructor calls `refreshToken()` on **every page load** when `useBackendAuth` is true — which it is in production (`environment.prod.ts:5`). And `_startRefreshTimer()` fires it again every 13 minutes (`user.service.ts:16`).

Server side, `POST /refresh` calls `syncMasterToUser` (`auth.js:274`). It's correctly fire-and-forget so it doesn't block the token response — but it still runs, and on a 0.1-CPU instance it competes with the catalog GETs the client is making at that exact moment.

What one run does (`sync-master.js:205-212`), for **each** of 14 cloneable types:

```js
const [masterDocs, userDocs, allUserDocs] = await Promise.all([
  col.find({ userId: '__master__' }).toArray(),               // full documents
  col.find({ userId, _masterId: { $ne: null } }).toArray(),   // full documents
  col.find({ userId }, { projection: { _id: 1, name_hebrew: 1 } }).toArray(),
]);
```

That's ~42 queries per run, several of them scanning 1,500-document collections. Plus `getCrossCollectionNameSet()` and `ensureRecipeDishPrepass()` add more full scans of `RECIPE_LIST` and `DISH_LIST`.

Also note `sync-master.js:272-273`:

```js
for (const master of masterDocs) {
  ...
  const allProductNames = new Set(allUserDocs.map(d => d.name_hebrew?.trim()).filter(Boolean));
```

The `Set` is rebuilt from `allUserDocs` **inside** the per-master loop. With ~83 master products against 1,500 user docs that's ~125,000 redundant string operations per sync. It only triggers on the `!existing` branch (new clones), so steady-state logins skip it — but it fires hard on first login and after any master-data change. Hoisting that `Set` construction out of the loop is a one-line fix.

**Fixes:**
- Only sync when there's something to sync. Stamp a `masterDataVersion` when master data changes, store the last-synced version on the user, and return immediately when they match. This turns ~42 queries into 1 for the overwhelming majority of calls.
- Don't sync on `/refresh` at all — sync on `/login` and `/signup` only. Refresh is a token operation; nothing about master data changed in the last 13 minutes.
- Hoist the `allProductNames` Set out of the loop.

### D2. The main list endpoint returns whole documents 🟠 MEDIUM

`generic.js:67-71`

```js
const docs = await col(req.params.type).find(filter).skip(skip).limit(limit).toArray();
```

No projection. Measured against your demo data as a size proxy:

| Collection | bytes/doc | × ~1,500 docs |
|---|---|---|
| `PRODUCT_LIST` | ~382 | ~570 KB |
| `RECIPE_LIST` | ~1,753 | ~2.5 MB |
| `DISH_LIST` | ~2,505 | ~3.7 MB |

So a boot fetch is on the order of **5–7 MB of JSON**. `compression()` is enabled (`index.js:57`) and JSON gzips well — roughly 700 KB–1 MB over the wire — but the browser still has to parse all 5–7 MB and, for products, run `normalizeProduct()` over every row (`product-data.service.ts:69`). Gzip fixes the transfer, not the parse.

The real fix is plan 301 Milestone 2 (server-side faceted queries + pagination). A useful interim step: add a list projection that omits the heavy fields lists never render — `steps_`, `nutrition_per_100g`, `logistics_`, long descriptions — and fetch full documents only on detail views. That likely halves the payload for a fraction of Milestone 2's effort and risk.

### D3. Four full collections fetched at boot, twice on login 🟠 MEDIUM

`KitchenStateService` is listed directly in `app.config.ts:98` providers, so it instantiates at bootstrap and pulls in `ProductDataService`, `RecipeDataService`, `DishDataService`, and `SupplierDataService`. All four call `ensureLoaded()` in their constructors — four full-collection GETs before any route resolves.

Then `_reloadDataServices()` (`user.service.ts:54-93`) re-fetches all of them again after login. Plan 301 Milestone 4 already flags this; it's still true, and it's a straightforward win.

`EquipmentDataService`, `VenueDataService`, and `MenuEventDataService` correctly pass `autoLoad: false` and use `hasLoaded()` guards. The four heavy ones don't. The same deferred pattern should apply to `DISH_LIST` and `RECIPE_LIST` at minimum — the dashboard (the default landing route) doesn't need either.

### D4. Index check

`db.js` ensures `{userId: 1}` on all cloneable collections and `{userId: 1, name_hebrew: 1}` on the three searchable ones. That covers both hot queries correctly:
- `{ userId, _userDeleted: {$ne: true} }` → uses the `userId` prefix ✅
- `{ userId, name_hebrew: /^prefix/ }` → uses the compound index ✅

One caveat: `generic.js:115` adds the `i` flag for Latin queries, and a case-insensitive regex **cannot** use the index — it degrades to a collection scan. The comment at line 100 acknowledges this and argues Latin queries are rare. That's probably right for a Hebrew-first app, but if Latin search ever gets common, a normalized lowercase field (`name_lower`) with its own index is the fix.

Nothing else needs an index. The database schema is not your problem — the volume of data you're moving out of it is.

---

## Recommended order of work

**Phase 1 — do this week, mostly config (expect the app to feel dramatically better):**
1. Upgrade Render off the free tier, and confirm the Atlas region matches
2. Add `Cache-Control` to `express.static` (§B3)
3. Remove `PreloadAllModules` and make ExcelJS a dynamic import (§B1)
4. Add `:response-time` to morgan so you can measure what you just did (§Measurement)
5. Compress the PNGs (§B2)

**Phase 2 — the interaction lag:**
6. `Map`-based lookups in `RecipeCostService` and `resolveRecipeAllergens` (§C1.1) ← highest value-per-line in this report
7. Move per-row template calls into a precomputed `computed()` (§C1.2)
8. Stop syncing master data on `/refresh`; hoist the `Set` out of the loop (§D1)

**Phase 3 — the data volume (this is plan 301 Milestone 2):**
9. List projections on `GET /:type` (§D2)
10. Defer `RECIPE_LIST`/`DISH_LIST` boot loads; collapse the double fetch on login (§D3)
11. Virtual scroll or pagination on the two big lists (§C1.3)
12. Server-side faceted filtering — the full plan 301 M2 design

---

## What *not* to do

- **Don't start with plan 301 Milestone 2.** It's the largest, riskiest piece of work in this report, and Phase 1 + 2 will deliver more perceived speed for a small fraction of the effort. Measure again after Phase 2 before committing to it.
- **Don't add more caching layers** (Redis, service worker) before fixing the free tier and the static-asset headers. You'd be caching around problems that have direct fixes.
- **Don't go zoneless yet.** It's the right long-term direction, but with 29 non-`OnPush` components it's a large migration, and fixing C1 removes most of the pain that zoneless would otherwise address.
- **Don't touch the Mongo indexes.** They're correct.

---

## Appendix — measured facts

```
Built bundle (dist/food-vibe1.0/browser):
  Total JS                 2.8 MB
  main-TYKI33PC.js       122,083 B
  chunk-ORWVK2QB.js      996,505 B   (ExcelJS)
  chunk-WRFK44MF.js      186,716 B
  chunk-I54IBCL7.js      166,281 B
  polyfills-B6TNHZQ6.js   34,579 B   (zone.js)
  styles-66QBP2FO.css     30,588 B

Static assets (public/assets):
  style/img/food-compos-logo.png    1,884,522 B   (unreferenced)
  style/img/recipe_placeholder.png  1,276,764 B   (referenced)
  images/stamp-not-approved.png       177,305 B
  images/stamp-approved.png           161,418 B
  data/dictionary.json                 46,324 B   (blocks bootstrap)

Document size (from demo data, as proxy for real docs):
  PRODUCT_LIST   ~382 B/doc
  RECIPE_LIST  ~1,753 B/doc
  DISH_LIST    ~2,505 B/doc

Component hygiene:
  Components using OnPush        46 / 75
  @for loops with track          99 / 99  ✅
  cdk-virtual-scroll usages       0
  Paginated lists                 0
```

---

## Observed (plan 302 Milestone 1 instrumentation)

Instrumentation landed (`server/index.js`, `server/routes/generic.js`) 2026-08-13: `:response-time`/`:res[content-length]` on morgan, morgan moved above `express.static` so asset requests are logged, `[data/query]` Mongo/serialize/byte-count logging behind `PERF_LOG=1`, and a boot-duration line in the `app.listen()` callback.

**Local verification (isolated instance, port 3999, `PERF_LOG=1`, local Mongo, real `PRODUCT_LIST` data) — confirms the code works, is not production evidence:**

```
foodVibe server listening on port 3999 (boot 907ms)
[data/query] PRODUCT_LIST docs=1478 bytes=738314 mongo=51ms serialize=7ms
GET /api/v1/data/PRODUCT_LIST 200 738314 - 68.947 ms
GET /main.js 200 5417 - 3.032 ms        ← proves 1b: static assets now reach morgan
GET /dashboard 200 5417 - 1.956 ms      ← SPA fallback also logged
```

**`PERF_LOG` decision:** gated behind `PERF_LOG=1` (unset in production by default), not left running unconditionally. The `JSON.stringify` call to measure real payload size is genuine extra CPU on Render's 0.1-shared-CPU free tier, and gating means the instrumentation can stay in the codebase permanently as an opt-in diagnostic instead of needing a follow-up removal PR.

**Still open — cannot be produced without a deploy:**
- Deploy to Render and let it run ~24h of real use
- p50/p95 `:response-time` for `/api/v1/data/*` in production
- How often the boot line appears during business hours (confirms or kills the M2 cold-start hypothesis)
- Typical `docs=`/`bytes=` for the three big collections under real account data (set `PERF_LOG=1` in the Render env to capture — currently off by default)

M2 (Render tier upgrade, billing change) stays blocked on these numbers per the plan's gate.
