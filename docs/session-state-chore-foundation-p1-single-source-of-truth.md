# Session State

## Branch
chore/foundation-p1-single-source-of-truth

## Date
2026-09-29

## Session Summary
- Executed Plan 321 Phase 1 (single sources of truth & dead paths) in full: `server/constants/collections.js` as the one registry, `newId()` (server + client) replacing 5 duplicated id generators, localStorage fallback mode fully removed, `PUT /:type` restricted to an allowlist, rate limits added, doc/code drift fixed, `PERF_LOG` off.
- Reality Check found and adjusted two plan assumptions before they caused damage: (1) `makeId` existed in 6 places, not 3; (2) `PUT /:type` (whole-collection replace) is used by 6 services for `TRASH_*`/`VERSION_HISTORY`, not just one registry — the allowlist was broadened accordingly.
- Mid-implementation finding: the plan's "client-supplied `_id` is always ignored" would have broken `HttpStorageAdapter.appendExisting()` (trash restore). Adjusted: server generates `_id` only when the body omits one.
- Real regression found and fixed: removing `useBackendAuth` gating means `UserService`'s constructor now always attempts a silent token refresh, needing `HttpClient` unconditionally — broke 5 spec files (23 test failures), all fixed by adding `provideHttpClient()`/`provideHttpClientTesting()`. Also removed the fake-guest-login/fake-signup localStorage bypass this exposed.
- Gathered a 65-branch stale-branch list (P1.8) — not deleted, awaiting Human approval.

## Files Modified
```
 .claude/todo.md                                    |  12 +-
 docs/agent/standards-backend.md                    |  33 ++-
 docs/agent/standards-security.md                   |   4 +-
 docs/session-state-foundation-refactor.md          |  48 +++++
 package.json                                       |   1 +
 plans/321-professional-foundation-refactor.plan.md |  32 +--
 render.yaml                                        |  12 +-
 scripts/check-backup-entity-types.mjs              |  41 ++++
 server/constants/all-user-entity-types.js          |  29 +--
 server/constants/cloneable-types.js                |  29 +--
 server/constants/collections.js                    |  61 ++++++
 server/constants/searchable-entity-types.js        |  15 +-
 server/routes/ai.js                                |  38 +++-
 server/routes/auth.js                              |  13 +-
 server/routes/generic.js                           |  62 ++++--
 server/services/clone-master.js                    |   8 +-
 server/services/seed-master.js                     |   8 +-
 server/services/sync-master.js                     |   8 +-
 server/test/collections.test.js                    |  45 +++++
 server/test/generic.test.js                        |  37 +++-
 server/utils/id.js                                 |  18 ++
 src/app/core/components/auth-modal/auth-modal.component.ts | 19 +-
 src/app/core/interceptors/auth.interceptor.ts      |   2 +-
 src/app/core/models/recipe.model.ts                |   2 +-
 src/app/core/services/activity-log.service.ts      |  11 +-
 src/app/core/services/async-storage.service.spec.ts| 167 +++++++--------
 src/app/core/services/async-storage.service.ts     | 225 +++------------------
 src/app/core/services/dish-data.service.ts         |   8 +-
 src/app/core/services/equipment-data.service.ts    |   4 +-
 src/app/core/services/http-storage.adapter.ts      |  47 ++---
 src/app/core/services/kitchen-state.service.spec.ts|  54 +++--
 src/app/core/services/preparation-registry.service.spec.ts | 16 +-
 src/app/core/services/preparation-registry.service.ts | 3 +-
 src/app/core/services/product-data.service.ts      |   2 +-
 src/app/core/services/recipe-data.service.ts       |   8 +-
 src/app/core/services/server-heartbeat.service.ts  |   2 +-
 src/app/core/services/user.service.ts              | 162 ++++-----------
 src/app/core/services/venue-data.service.ts        |   4 +-
 src/app/core/services/version-history.service.ts   | 106 +++++-----
 src/app/core/utils/id.util.ts                      |  12 ++
 src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.spec.ts | 4 +
 src/app/pages/inventory/components/product-form/product-form.component.spec.ts | 4 +
 src/app/pages/inventory/inventory.page.spec.ts     |   4 +-
 src/environments/*.ts (all 5)                      | dropped useBackend/useBackendAuth
 48 files changed, 684 insertions(+), 754 deletions(-)
```

## Commit
9360cc16

## PR
N/A yet — will open on ship approval.

## Next Steps
- Two Human actions still open: (1) mirror `render.yaml`'s `PERF_LOG: "0"` in the Render dashboard (doesn't auto-sync); (2) review the 65-branch stale list and approve any deletions (P1.8, not done).
- Plan 321 Phase 2a ("Shared Zod schema package, observe mode") is next — its own Step 0 Reality Check is mandatory before any code.
- Live browser click-through (create/edit/delete a product/recipe/menu event on `dev:local`) was not done this phase — flagged rather than assumed; automated coverage (49 server + 309 client tests, `ng build` clean) is the verification basis instead.
