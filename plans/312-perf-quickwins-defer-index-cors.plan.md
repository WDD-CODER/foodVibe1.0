# Plan 312 — Performance Quick Wins: Defer Auth Modal, Missing Indexes, CORS Preflight Cache

## Goal

Three independently-verified, low-risk performance wins from a fresh optimization audit (this session): defer the one remaining eager root-mounted modal to cut the initial bundle, add two missing Mongo compound indexes that currently force full per-user scans, and cache the CORS preflight response. No behavior change intended beyond the performance characteristics.

## Context

Follows a broader audit (this session, not persisted as its own plan — informal) covering four fresh angles not touched by the existing perf plan chain (302/303/304/309/310, all already shipped or gated): zoneless change detection (feasible, deferred to a future plan — ~0.5-1 day, needs 8 spec files converted off `fakeAsync`), server-side query/caching gaps, initial-bundle composition, and asset/PWA delivery. This plan picks the three items that are both high-impact and low-effort/low-risk; everything else (service worker, zoneless CD, image lazy-loading, font `@import`→`<link>`) is left for separate follow-up plans.

**Judgment call flagged here, not silently overridden:** `app.component.html:36` has an explicit comment — `<!-- Eager: confirm + auth used early in typical sessions -->` — documenting why `auth-modal` (and `confirm-modal`, untouched by this plan) were deliberately kept out of the existing `@defer` pattern used by the other ~14 root-mounted modals. `AuthModalService.isOpen` (`src/app/core/services/auth-modal.service.ts`) starts `false` and only flips via explicit `.open()` calls (auth guard, interceptor, gated actions) — same reactive shape as every other already-deferred modal, so a plain `@defer (when authModal.isOpen())` is mechanically safe. But the original concern (first-open latency for a screen used early in almost every anonymous session) is real and worth respecting rather than discarding. Resolution: use `@defer (when authModal.isOpen(); prefetch on idle)` — this keeps `auth-modal.component.ts` (16.9KB) and the `@angular/forms` it alone drags in eagerly (44.1KB) out of the initial bundle, while Angular prefetches the chunk during browser idle time after boot, so by the time a user actually triggers the auth modal the chunk is normally already warm. Best of both: ~61.5KB off the initial bundle (593.77kB → ~532kB, close to the 500kB budget) without reintroducing the latency the original author was avoiding.

## Files to check first

- `src/app/appRoot/app.component.html:36-54` — the `@defer` pattern to match, and the comment explaining why auth/confirm are eager
- `src/app/core/services/auth-modal.service.ts` — confirms `isOpen` signal shape matches every other deferred modal
- `server/db.js` — existing index-creation pattern (idempotent `createIndex` calls in `connectDb()`, `background: true`, run in parallel via `Promise.all` per entity-type list)
- `server/routes/generic.js:150-176` (`GET /:type/count`) and `:416-430` (`DELETE /:type/:id` referential-integrity check) — exact field names the new indexes must cover
- `server/index.js:106-121` — `corsOptions` object

## Atomic Sub-tasks

- [x] `src/app/appRoot/app.component.html:54` — wrap `<app-auth-modal />` in `@defer (when authModal.isOpen(); prefetch on idle) { <app-auth-modal /> }`, matching the existing modal pattern's indentation/style
- [x] `src/app/appRoot/app.component.ts` — inject `AuthModalService` as `protected readonly authModal = inject(AuthModalService)` alongside the other modal-service injections (keep `AuthModalComponent` in the `imports` array as-is, `@defer` doesn't require removing it)
- [x] `server/db.js` — add compound index `{ userId: 1, min_stock_level_: 1 }` on `PRODUCT_LIST` (supports the `lowStock` count filter)
- [x] `server/db.js` — add compound index `{ userId: 1, is_approved_: 1 }` on `RECIPE_LIST` and `DISH_LIST` (supports the `unapproved` count filter)
- [x] `server/db.js` — add multikey compound index `{ userId: 1, 'ingredients_.referenceId': 1 }` on `RECIPE_LIST` and `DISH_LIST` (supports the product-delete referential-integrity check)
- [x] `server/index.js` — add `maxAge: 86400` to `corsOptions` (24h preflight cache)
- [x] `ng build --configuration=production` — confirm initial bundle dropped from 593.77kB and no new errors/warnings — 593.77kB → 532.44kB → 532.36kB (after font-import removal)
- [x] `ng test --watch=false --browsers=ChromeHeadless` — full suite still passes (311/311 baseline) — reverified 311/311 after every change
- [x] Manual verify: trigger the auth modal — not live-browser-verified (this repo's `/browse` gstack tooling wasn't available in this session); verified instead via the production build's verbose chunk table showing `auth-modal-component` correctly split into its own lazy chunk (18.48kB) with the `prefetch on idle` trigger applied, matching every other deferred modal's proven pattern
- [x] Manual verify: new indexes pick up on next `connectDb()` run — not live-verified against Mongo (no `MONGO_URI` in this session's `.env`); `node --check` confirms both `server/db.js` and `server/index.js` are syntactically valid and match the existing idempotent `createIndex` pattern exactly

## Addendum — approved same session: image lazy-loading + font `@import`→`<link>`

Two more trivial items from the same audit, approved by Human mid-session rather than left for a separate plan.

- [x] `src/app/pages/venues/components/venue-list/venue-list.component.html` — `loading="lazy"` on the `.venue-card-photo` `<img>` (off-screen grid item)
- [x] `src/app/shared/approve-stamp/approve-stamp.component.html` — `loading="lazy"` on `.approve-stamp__img` (repeated per recipe/dish row)
- [x] `src/styles.scss` — removed the `@import url('https://fonts.googleapis.com/...')` line (was render-blocking in a way a `<link>` isn't)
- [x] `src/index.html` — added `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Heebo:wght@100..900&display=swap">` in `<head>`, after the existing `preconnect`/`dns-prefetch` hints
- [x] `ng build --configuration=production` reverified — 532.44kB → 532.36kB (small drop, expected; this fix is about render timing, not size)
- [x] `ng test --watch=false --browsers=ChromeHeadless` reverified — 311/311

## Rules

- Do not touch `confirm-modal` — same "used early" reasoning applies and it wasn't flagged as a bundle-size contributor in this audit, no reason to change it.
- Do not start the zoneless change-detection or service-worker work in this plan — both need their own scoping (spec-file conversion plan; PWA config plan).
- Do not touch `plans/304-…`'s M1 (list projections) or any other already-tracked/gated perf-plan scope.

## Done when

- `ng build --configuration=production` succeeds, initial bundle measurably smaller than 593.77kB (target: under or near the 500kB budget).
- `ng test` full suite green.
- Auth modal manually verified still opens correctly (first-trigger and subsequent).
- The two new index groups + CORS `maxAge` are live in `server/db.js`/`server/index.js`, matching existing code style.
