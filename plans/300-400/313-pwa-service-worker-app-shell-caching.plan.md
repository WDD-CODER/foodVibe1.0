# Plan 313 — PWA Service Worker for App-Shell Caching

## Goal

Add an Angular service worker so repeat visits render the app shell from cache instead of a full network round-trip — the biggest lever identified in this session's fresh performance audit for a Render free-tier deployment with cold starts. API calls (`/api/**`) are deliberately left completely untouched by the service worker — this is a kitchen-management app with live mutable data (inventory counts, recipe edits), not content that should ever be served stale.

## Context

From the same audit that produced `plans/312-perf-quickwins-defer-index-cors.plan.md`: "no `@angular/service-worker` at all... biggest lever available for mobile/kitchen repeat use" given Render free-tier cold starts. This plan implements it.

This repo's own history already shows awareness of stale-cache risk — `plans/302-…plan.md` has an unstarted sub-task "Verify a fresh deploy is still picked up by a returning browser (guards the fallback caching bug)". A service worker makes this risk *more* real if done carelessly (a user could get stuck on a cached old version indefinitely), so this plan explicitly builds in an update-detection + reload-prompt flow rather than shipping bare caching.

## What was done

1. **`ng add @angular/pwa`** — scaffolded `ngsw-config.json`, `public/manifest.webmanifest`, placeholder icons, and wired `provideServiceWorker`/`serviceWorker: "ngsw-config.json"` into `app.config.ts`/`angular.json`. The schematic's own `npm install` step failed on the same `@angular/core` peer-version mismatch hit in plan 312 (installed core is pinned at `19.2.21`, latest resolvable `@angular/service-worker` is `19.2.25`) — installed `@angular/service-worker@19.2.21` explicitly to match, same fix as plan 312's `@angular/platform-browser-dynamic` incident.
2. **Cleaned up the schematic's output** to match repo conventions: removed the semicolon it added to the `rxjs` import (hard rule: no semicolons in `.ts`), reformatted `provideServiceWorker(...)`'s indentation, and swapped `!isDevMode()` for `environment.production` — this app already gates every other environment-dependent behavior through `environment.production`, no reason for the service worker to be the one exception. Also restored `package.json`'s trailing newline that the schematic dropped.
3. **`ngsw-config.json`** — left at the schematic's default: an `app` asset group (prefetch: `index.html`, `*.css`, `*.js`, `manifest.webmanifest`) and an `assets` group (lazy, images/fonts). **No `dataGroups` added** — this is the deliberate choice that keeps `/api/**` completely outside the service worker's reach; it only ever sees what's explicitly declared here.
4. **Update-detection + reload prompt** (the safety net referenced above): `src/app/core/services/app-update.service.ts` wraps `SwUpdate.versionUpdates` (filtered to `VERSION_READY`) and `SwUpdate.unrecoverable`, exposing an `updateAvailable_` signal and a `reload()` method that calls `document.location.reload()`. `src/app/core/components/update-banner/` is a small root-mounted, `@defer`-gated component (same pattern as every other root modal) that shows a persistent "new version available, reload" banner when the signal flips — no auto-dismiss, since missing this prompt means staying on a stale build indefinitely.
5. Two new dictionary keys added to `public/assets/data/dictionary.json` (`update_available`, `reload_now`) per the hard rule that all user-facing text goes through `translatePipe`.
6. Confirmed server-side caching is already correct for this with zero changes needed: `server/index.js`'s `HASHED_ASSET` regex only matches content-hashed filenames (`chunk-XXXXXXXX.js`); `ngsw.json`/`ngsw-worker.js`/`manifest.webmanifest` have no hash suffix, so they already get `Cache-Control: no-cache` from the existing static-serving logic — exactly what's needed for the SW's own update-check manifest to never be stuck cached itself.

## Files touched

- `angular.json`, `package.json`, `package-lock.json` — schematic wiring + pinned `@angular/service-worker` version
- `src/app/app.config.ts` — `provideServiceWorker(...)`, cleaned up
- `src/index.html` — `<link rel="manifest">` + `<noscript>` (schematic default)
- `ngsw-config.json`, `public/manifest.webmanifest`, `public/icons/*` (new, schematic defaults — icons are generic Angular placeholders, not app-branded; flagged as a follow-up polish item, not blocking)
- `src/app/core/services/app-update.service.ts` (new)
- `src/app/core/components/update-banner/` (new: `.ts`/`.html`/`.scss`)
- `src/app/appRoot/app.component.ts`/`.html` — wired the banner in, `@defer`-gated
- `src/app/appRoot/app.component.spec.ts` — added `provideServiceWorker(..., { enabled: false })` to the TestBed (Angular's documented pattern for testing components that inject `SwUpdate`; without it, `AppUpdateService`'s `SwUpdate` injection throws `NullInjectorError` in specs)
- `public/assets/data/dictionary.json` — 2 new keys

## Verification

- `npm run build:render` — 538.63kB initial bundle (small increase from plan 312's 532.36kB baseline; `provideServiceWorker`'s own registration code is necessarily eager, the banner component itself is deferred). `dist/food-vibe1.0/browser/` contains `ngsw.json`, `ngsw-worker.js`, `manifest.webmanifest`. Same pre-existing build warnings, no new ones.
- `ng test --watch=false --browsers=ChromeHeadless` — 311/311 (3 failures surfaced and fixed mid-session: `AppComponent`'s spec needed the `enabled: false` service-worker provider).
- **Not live-verified** (no `/browse` gstack tooling available this session, and this specifically needs an actual production-mode serve, not `ng serve`, since `enabled: environment.production` gates registration): confirm in a real deploy that (a) the SW registers, (b) a second visit shows faster paint, (c) the update banner actually appears and reload works on a fresh deploy after this one — this is the single most important manual check for this plan, more so than any prior plan in this session, given the "stuck on stale content" failure mode.
- CSP: `server/index.js`'s helmet config has no explicit `worker-src` directive; same-origin service worker registration falls back through `child-src` → `script-src 'self'` per the CSP spec, so it should be allowed — **worth confirming with an actual browser console check on first deploy**, since this session had no way to verify it live.

## Rules

- Do not add `dataGroups` for `/api/**` without a deliberate, separate decision — this app's data is live/mutable, caching it risks serving stale inventory/recipe state.
- Do not remove the update-banner/reload-prompt flow to "simplify" — it's the safety net for exactly the failure mode this repo has already flagged as a risk.
- App-branded icons (replacing the generic Angular placeholders in `public/icons/`) are an explicit follow-up, not required for this plan's goal (caching speed, not installability polish).
