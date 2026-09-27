# Session State

## Branch
chore/perf-quickwins-defer-index-cors

## Date
2026-09-16

## Session Summary
- Ran a fresh 4-angle performance audit (zoneless change detection, server-side query/caching, initial-bundle composition, asset/PWA delivery) — none overlapping the existing 302/303/304/309/310 perf-plan chain.
- Persisted `plans/312-perf-quickwins-defer-index-cors.plan.md` and shipped the 3 highest-impact/lowest-risk items: `auth-modal` now `@defer`s with `prefetch on idle` (~61.5kB off the initial bundle), 2 new Mongo compound indexes fixing full-scan queries, CORS preflight caching.
- Added 2 trivial follow-ups mid-session (Human-approved): `loading="lazy"` on 2 off-screen images, Heebo font moved from a render-blocking `@import` to a `<link>` tag.
- `ng build`: 593.77kB → 532.36kB initial bundle. `ng test`: 311/311.

## Files Modified
```
.claude/todo.md                                                 |   3 +-
plans/312-perf-quickwins-defer-index-cors.plan.md (new)         |  46 ++++
server/db.js                                                    |  23 ++
server/index.js                                                 |   1 +
src/app/appRoot/app.component.html                              |   6 +-
src/app/appRoot/app.component.ts                                |   2 +
src/app/pages/venues/components/venue-list/venue-list.component.html |  2 +-
src/app/shared/approve-stamp/approve-stamp.component.html       |   3 +-
src/index.html                                                  |   1 +
src/styles.scss                                                 |   2 -
10 files changed, 111 insertions(+), 22 deletions(-)
```

## Commit
8093868

## PR
N/A at write time — about to be opened

## Next Steps
- Remaining audit items not yet started: **service worker** (biggest lever — no `@angular/service-worker` at all, matters for Render free-tier cold starts, needs its own plan e.g. 313), **zoneless change detection** (feasible, low risk, ~0.5-1 day, needs 8 spec files converted off `fakeAsync`).
- Older tracked backlog still open: plan 304 M1 (list projections on `GET /:type`), plan 310 (server-side faceted search + pagination, needs Human design decisions), plan 309 M3 / plan 302 remnants (Render billing tier, Atlas region check — Human-only chores).
- **Flag for the Human:** while this session worked, uncommitted changes appeared in `src/app/core/interceptors/auth.interceptor.ts` (a same-origin/CORS token-attachment fix) and `src/app/pages/recipe-builder/components/recipe-header/recipe-header.component.ts` (image-upload error logging) — neither touched by this session, suggesting the "stopped" concurrent session may still be active in this same working directory. Worth checking.
