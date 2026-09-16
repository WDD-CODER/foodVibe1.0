# Session State

## Branch
chore/pwa-service-worker

## Date
2026-09-16

## Session Summary
- Added an Angular service worker (`ng add @angular/pwa`, pinned `@angular/service-worker@19.2.21` to match installed core — same peer-version issue as plan 312's `platform-browser-dynamic`) for app-shell caching on repeat visits, the biggest remaining lever from this session's perf audit given Render free-tier cold starts.
- `ngsw-config.json` deliberately has no `dataGroups` — `/api/**` stays completely untouched, this app's data is live/mutable.
- Built an update-detect + reload-prompt safety net (`app-update.service.ts` + `update-banner`, `@defer`-gated) so a deploy never leaves a user stuck on stale content — this repo's own history already flagged that exact risk.
- Found and fixed a real bug along the way: `.gitignore`'s blanket `*.png` rule was silently excluding the manifest's icon files from ever deploying.
- `ng build`: 538.63kB initial bundle (up from plan 312's 532.36kB — SW registration code is necessarily eager). `ng test`: 311/311 (fixed 3 `AppComponent` spec failures needing a `SwUpdate` test provider).

## Files Modified
```
27 files changed, 293 insertions(+), 15 deletions(-)
 .claude/todo-archive/011.md, .claude/todo.md, .gitignore, angular.json,
 package.json, package-lock.json, public/assets/data/dictionary.json,
 src/app/app.config.ts, src/app/appRoot/app.component.{html,ts,spec.ts},
 src/index.html
 new: ngsw-config.json, plans/313-pwa-service-worker-app-shell-caching.plan.md,
 public/icons/*.png (8), public/manifest.webmanifest,
 src/app/core/components/update-banner/*, src/app/core/services/app-update.service.ts
```

## Commit
997b017

## PR
N/A at write time — about to be opened

## Next Steps
- **Critical live-deploy check, more important than any prior item this session:** after this ships, deploy and confirm (a) the SW actually registers with no CSP console errors — no explicit `worker-src` directive in `server/index.js`'s helmet config, should fall back to `script-src 'self'` per spec but unverified live, (b) a second visit loads noticeably faster, (c) the update banner appears and its reload button works on the *next* deploy after this one.
- App-branded PWA icons (currently generic Angular placeholders in `public/icons/`) — explicit follow-up, not blocking.
- Remaining audit items not started: zoneless change detection (~0.5-1 day, needs 8 spec files off `fakeAsync`); older tracked backlog (plan 304 M1 list projections, plan 310 faceted search).
- **Still flagged from last session:** `src/app/core/interceptors/auth.interceptor.ts`, `recipe-header.component.ts`, `venue-form.component.ts` are still sitting uncommitted in this shared working directory from another session — none of it is mine, left untouched again this session.
