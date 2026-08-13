# Plan 302 — Performance Phase 1: Infrastructure & Boot Payload

overview: The app became slow after the legacy FoodComposer import (plan 300) grew PRODUCT_LIST/RECIPE_LIST/DISH_LIST to 1,000-1,500+ docs each. A read-only audit (`reports/performance-audit-2026-08-13.md`) found that the largest costs are **not** in the data-search path that plan 301 addressed — they are infrastructure and boot-payload issues that are cheap to fix. This plan covers those: instrumentation first (so every later claim is measured, not guessed), then the Render free-tier cold start, static-asset caching, bundle diet, and oversized images. Expected outcome: the app feels dramatically faster before a single line of data-loading architecture changes.

**Source audit:** `reports/performance-audit-2026-08-13.md` sections A, B, and "Measurement gap".
**Sibling plans:** `plans/303-perf-phase2-client-cpu.plan.md` (interaction lag), `plans/304-perf-phase3-data-volume.plan.md` (payload architecture).
**Ordering:** Milestone 1 gates everything. Do not start M2-M5 until M1 is deployed and producing numbers.

# Context

All findings below were verified read-only against the working tree on 2026-08-13 (branch `feat/session-20260813-1358`). Line numbers are from that state — re-confirm before editing.

| Finding | File / evidence | Why it costs time |
| --- | --- | --- |
| Render free tier | `render.yaml:4` → `plan: free` | Instance suspends after 15 min idle. Cold start boots Node, connects Atlas, runs ~20 `createIndex` calls and `seedMasterData()` **before** `app.listen()` (`server/index.js:125-131`). Realistic cold start 50-90s. Tier also caps at 0.1 shared CPU / 512 MB. |
| No static cache headers | `server/index.js:63` → bare `express.static(STATIC_DIR)` | Defaults to `maxAge: 0`. ~30 conditional GETs per page load, each a round-trip to a possibly-cold origin. Build uses `"outputHashing": "all"` (`angular.json`) so filenames are content-hashed and safe to cache for a year. |
| `PreloadAllModules` | `src/app/app.config.ts:96` | Defeats the lazy routes in `app.routes.ts` — downloads all 2.8 MB of JS right after bootstrap, competing with catalog fetches for bandwidth. |
| ExcelJS static import | `menu-export.service.ts:8`, `recipe-export.service.ts:8` | `import { Workbook } from 'exceljs'` pulls a **996 KB** chunk (`chunk-ORWVK2QB.js`). `ExportService` is injected by `cook-view.page.ts:82`, `menu-intelligence.page.ts:102`, `recipe-builder.page.ts:114`. With `PreloadAllModules` it downloads for every user, always. |
| Oversized images | `public/assets/style/img/` | `recipe_placeholder.png` = 1,276,764 B and **is** referenced (`recipe-header.component.ts:133`). `food-compos-logo.png` = 1,884,522 B and is referenced **nowhere** in `src/`. Stamps ~340 KB combined (`approve-stamp.component.ts:20,22`). |
| No timing data anywhere | repo-wide | `morgan('tiny')` (`server/index.js:65`) logs no duration. No `explain()` output, no Lighthouse run. Every number in the audit is an estimate derived from code + built bundle. |

## Measured baseline (from `dist/`, 2026-08-13)

```
Total JS                 2.8 MB
main-TYKI33PC.js       122,083 B
chunk-ORWVK2QB.js      996,505 B   (ExcelJS)
chunk-WRFK44MF.js      186,716 B
chunk-I54IBCL7.js      166,281 B
polyfills-B6TNHZQ6.js   34,579 B   (zone.js)
styles-66QBP2FO.css     30,588 B
```

Record the same numbers after M4 — that is the milestone's proof.

# Milestone 1 — Instrumentation (DO THIS FIRST, ship alone)

**Why first:** the audit's central weakness is that nothing is measured. If cold starts (M2) dominate, every other number is noise until that is known. One deploy of M1 tells you whether the slowness is server-side at all, and gives a before/after baseline for M2-M5 and for plans 303/304.

Ship this on its own and let it run for at least a day of real use before touching anything else.

### 1a. Give morgan a duration

`server/index.js:65` — currently `app.use(morgan('tiny'))`.

Replace the format with one that includes timing:

```js
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'))
```

**Two caveats an implementing agent must handle, not ignore:**

1. **`:response-time` stops when response headers are written, not when the body finishes transferring.** For a 5 MB JSON response most of the wall-clock cost is body transfer and is invisible to this number. So a fast `:response-time` on `GET /api/v1/data/RECIPE_LIST` does **not** mean the request was fast for the user. Sub-task 1c exists to cover that gap.
2. **`:res[content-length]` will log `-` for most responses** because `compression()` (`server/index.js:57`) switches to chunked transfer encoding and removes the header. Do not conclude payloads are empty. Sub-task 1c logs the real byte count instead.

### 1b. Move morgan above `express.static`

Currently the order is `helmet` → `compression` → `express.static` → `morgan` (`server/index.js:28,57,63,65`). Because `express.static` terminates the response for any file it matches, **static asset requests never reach morgan and are not logged at all today.**

Move `app.use(morgan(...))` to just after `compression()` and before `express.static`. This is what makes M3's cache-header win measurable — without it you cannot see the ~30 revalidation round-trips in the logs, before or after.

### 1c. Time the hot data endpoint properly

`server/routes/generic.js:45-77`, `GET /:type`. Add timing that separates the two costs the audit could only estimate:

- **Mongo time** — wall-clock around the `.find(...).toArray()` call (line 67-71)
- **Serialize + send time** — from `toArray()` returning to `res.json()` completing
- **Real payload size** — `Buffer.byteLength(JSON.stringify(docs))`, i.e. pre-compression bytes, plus `docs.length`

Log one line per request, e.g.:

```
[data/query] RECIPE_LIST docs=1487 bytes=2606413 mongo=340ms serialize=180ms
```

Keep it to a single `console.log` — this is diagnostic, not a logging framework. There is no server-side logging convention in this repo (checked: `docs/agent/standards-backend.md` has none), so do not invent one here.

**Note:** computing `JSON.stringify` purely to measure adds real CPU on a 0.1-CPU instance. Either gate it behind an env flag (`PERF_LOG=1`) or accept it as temporary and plan to remove it. State which choice you made in the PR.

### 1d. Make cold starts visible

`server/index.js:125-131`. Capture a timestamp at module load and log elapsed ms inside the `app.listen()` callback:

```
foodVibe server listening on port 10000 (boot 8420ms)
```

Every time that line appears in Render's logs during normal business hours, you are looking at a cold start. This is the single cheapest way to confirm or kill the M2 hypothesis — no upgrade required to find out.

### Verification (M1)

1. `ng build` passes (no client changes here, but the repo rule applies to every commit).
2. Local: `npm run dev:local`, hit `GET /api/v1/data/PRODUCT_LIST` — confirm one morgan line **and** one `[data/query]` line, with plausible non-zero timings.
3. Local: request a static asset (e.g. `/main-*.js`) — confirm it now appears in morgan output (proves 1b worked).
4. Deploy to Render. Leave it ~24h of real use.
5. Collect from Render logs: (a) how often the boot line appears, (b) p50/p95 `:response-time` for `/api/v1/data/*`, (c) typical `docs=` / `bytes=` for the three big collections.
6. **Write those numbers into `reports/performance-audit-2026-08-13.md`** under a new "Observed" section, replacing the estimates. This is the deliverable — not the code.

# Milestone 2 — Render tier & cold starts

Do not start until M1's numbers exist. If the boot line from 1d is **not** appearing during normal use, this milestone's premise is wrong — say so and re-prioritise rather than upgrading on faith.

- **`render.yaml:4`** — change `plan: free` to `plan: starter`. This is a billing change; it needs explicit Human sign-off, not an agent decision.
- **Atlas region** — confirm the cluster region matches the Render service region. A cross-region hop adds 80-150 ms to *every* query, and `syncMasterToUser` issues ~40 per page load (see plan 303 M3). Not visible from the repo — needs a Human to check the Atlas and Render dashboards.
- **Atlas tier** — if `MONGO_URI` points at an M0 free cluster, that is shared CPU on the database side too. Check and report; upgrading is a separate call.
- **`server/index.js:125-131`** — move `seedMasterData()` to run *after* `app.listen()`. It is idempotent and exits after one `findOne` (`seed-master.js:81-86`), but it is still an Atlas round-trip in front of your first byte on every cold start.
- **Duplicate services** — `render.yaml` declares `foodvibe`; `environment.gh-pages.ts:4` points at `foodvibe.onrender.com`; `environment.remote.ts:4` points at `foodvibe-api.onrender.com`. Determine whether both services exist. If they do, both spin down independently and you have two cold-start surfaces. Relates to the known `dev:remote` naming collision between root and server `package.json`.

**Do not** implement a keep-alive pinger as a workaround. It violates Render's terms and does not address the 0.1 CPU ceiling, which is the half of the free-tier problem that persists even when warm.

### Verification (M2)

1. Boot line from 1d no longer appears during business hours (or appears only on deploys).
2. p95 `:response-time` for `/api/v1/data/*` drops — compare against the M1 baseline.
3. First-load-after-idle, timed by hand with a stopwatch, is under ~3s.

# Milestone 3 — Static asset cache headers

`server/index.js:63`. Every file the Angular build emits is content-hashed (`"outputHashing": "all"`), so they are immutable by construction.

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

**Do not miss the SPA fallback.** `server/index.js:103-108` serves `index.html` via `res.sendFile()` for every non-API route. That path bypasses the `setHeaders` above entirely and must set `Cache-Control: no-cache` itself — otherwise deploys will not be picked up by returning users and you will ship a caching bug that is very unpleasant to diagnose.

Optional, free: move `express.static` to *after* the `/api/` routers. Today every API request does a filesystem stat miss first.

### Verification (M3)

1. `ng build` passes.
2. DevTools Network, second load: hashed assets report `(disk cache)` with **no** network row. Before the change they were 304s.
3. `index.html` still revalidates — confirm `Cache-Control: no-cache` on its response.
4. Deploy, hard-refresh, confirm the new build is served (guards against the fallback bug above).
5. Morgan (now logging static, per 1b) shows the asset requests disappearing on repeat loads.

# Milestone 4 — Bundle diet

### 4a. Drop `PreloadAllModules`

`src/app/app.config.ts:96`:

```ts
provideRouter(routes, withPreloading(PreloadAllModules))
```

Remove the preloading strategy, or replace it with a custom one that preloads only `dashboard` and `recipe-book`. Remove the now-unused `withPreloading, PreloadAllModules` import on line 4.

Recommendation: remove entirely first, measure, and only add a selective strategy back if navigation feels sluggish. On the connections this app is actually used on, preloading is a net loss.

### 4b. Make ExcelJS dynamic

`menu-export.service.ts:8` and `recipe-export.service.ts:8` both do `import { Workbook } from 'exceljs'`. Change to a dynamic import at the point of use:

```ts
const { Workbook } = await import('exceljs')
```

`excel-workbook.util.ts:7` already uses `import type { Workbook, Worksheet }` correctly — types are erased at compile time and cost nothing. Follow that pattern for any remaining type-only needs.

**Expect an API ripple:** the methods that construct a `Workbook` must become `async` if they are not already, and their callers in `cook-view.page.ts`, `menu-intelligence.page.ts`, and `recipe-builder.page.ts` must await. Check `ExportService` (`src/app/core/services/export.service.ts`) — it wraps both and its signatures may change too. This is the only part of Phase 1 with real blast radius; budget for it and verify every export button still works.

### Verification (M4)

1. `ng build` passes.
2. Re-measure `dist/food-vibe1.0/browser`: total JS should fall from 2.8 MB to roughly 600-800 KB, and `chunk-ORWVK2QB.js` (996 KB) must no longer load at boot.
3. DevTools Network on a cold dashboard load: confirm the ExcelJS chunk is **absent**.
4. Click Export in all three consumers (cook-view, menu-intelligence, recipe-builder) — confirm the chunk loads on demand and the produced `.xlsx` opens correctly. **This is the regression risk in this plan; do not skip it.**

# Milestone 5 — Image compression

| File | Size | Status |
| --- | --- | --- |
| `public/assets/style/img/food-compos-logo.png` | 1,884,522 B | Referenced nowhere in `src/` — verify, then delete |
| `public/assets/style/img/recipe_placeholder.png` | 1,276,764 B | Referenced at `recipe-header.component.ts:133` |
| `public/assets/images/stamp-not-approved.png` | 177,305 B | `approve-stamp.component.ts:22` |
| `public/assets/images/stamp-approved.png` | 161,418 B | `approve-stamp.component.ts:20` |

- Re-confirm `food-compos-logo.png` is unreferenced (grep `src/`, `public/`, and `index.html`) before deleting. It is only dead deploy weight, not a user download — low urgency, but free.
- `recipe_placeholder.png` is the real win: it is a *placeholder*, and 1.27 MB is absurd for one. Convert to WebP at actual display dimensions (expect ~20-40 KB), or replace with an inline SVG / CSS gradient for zero bytes.
- Convert both stamps to WebP.
- Keep PNG fallbacks only if you find a browser-support reason; the app already targets modern Angular 19 browsers, so WebP is safe.

### Verification (M5)

1. `ng build` passes.
2. Visual check: recipe-builder placeholder and both approve-stamp states render correctly.
3. Total `public/assets` size drops by ~3 MB; real user download on recipe-builder drops by ~1.2 MB.

# Verification (whole plan)

1. `ng build` passes at every commit.
2. M1's instrumentation is live and its numbers are recorded in `reports/performance-audit-2026-08-13.md`.
3. Before/after comparison, using M1's own logging, for: cold-start frequency, p95 API response time, initial JS bytes, repeat-load network request count.
4. No regression in Excel export (M4's risk), SPA deploy pickup (M3's risk), or image rendering (M5's risk).

# Atomic Sub-tasks

## Milestone 1 — Instrumentation (ship alone, before anything else)
- [x] Replace `morgan('tiny')` with a format including `:response-time` and `:res[content-length]` — `server/index.js:65`
- [x] Move `app.use(morgan(...))` above `app.use(express.static(...))` so asset requests are logged — `server/index.js:63,65`
- [x] Add Mongo-time / serialize-time / doc-count / pre-compression-byte logging to `GET /:type` — `server/routes/generic.js:45-77`
- [x] Decide and document whether the `JSON.stringify` size measurement is env-gated (`PERF_LOG=1`) or temporary
- [x] Log boot duration in the `app.listen()` callback to make cold starts visible — `server/index.js:125-131`
- [ ] Deploy; collect ~24h of real-use numbers from Render logs
- [ ] Record observed numbers in `reports/performance-audit-2026-08-13.md` under a new "Observed" section, replacing estimates

## Milestone 2 — Render tier & cold starts (needs M1 numbers + Human billing approval)
- [ ] Confirm from M1 logs whether cold starts actually occur during business hours — if not, stop and re-prioritise
- [ ] Human: approve billing change; set `plan: free` → `plan: starter` in `render.yaml:4`
- [ ] Human: verify Atlas cluster region matches Render service region; report findings
- [ ] Human: check whether `MONGO_URI` points at an M0 free cluster; report findings
- [ ] Move `seedMasterData()` to run after `app.listen()` — `server/index.js:125-131`
- [ ] Determine whether both `foodvibe` and `foodvibe-api` Render services exist; document which is canonical

## Milestone 3 — Static asset cache headers
- [ ] Add `maxAge: '1y'`, `immutable: true`, and the `index.html` → `no-cache` `setHeaders` guard to `express.static` — `server/index.js:63`
- [ ] Set `Cache-Control: no-cache` on the SPA fallback `res.sendFile(index.html)` — `server/index.js:103-108`
- [ ] Verify repeat loads serve hashed assets from disk cache with zero network rows
- [ ] Verify a fresh deploy is still picked up by a returning browser (guards the fallback caching bug)

## Milestone 4 — Bundle diet
- [ ] Remove `withPreloading(PreloadAllModules)` and its now-unused import — `src/app/app.config.ts:4,96`
- [ ] Convert `menu-export.service.ts:8` to `await import('exceljs')` at point of use
- [ ] Convert `recipe-export.service.ts:8` to `await import('exceljs')` at point of use
- [ ] Propagate any resulting `async` signature changes through `export.service.ts` and its three consumers (`cook-view.page.ts:82`, `menu-intelligence.page.ts:102`, `recipe-builder.page.ts:114`)
- [ ] Re-measure `dist/` total JS and record before/after in the audit report
- [ ] Manually verify Excel export still produces a valid `.xlsx` from all three consumer pages

## Milestone 5 — Image compression
- [ ] Re-confirm `food-compos-logo.png` is unreferenced across `src/`, `public/`, `index.html`; delete if so
- [ ] Convert `recipe_placeholder.png` to WebP at display dimensions (or replace with inline SVG / CSS gradient) — update `recipe-header.component.ts:133`
- [ ] Convert `stamp-approved.png` and `stamp-not-approved.png` to WebP — update `approve-stamp.component.ts:20,22`
- [ ] Visual regression check on recipe-builder placeholder and both approve-stamp states
