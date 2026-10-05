# Plan 385 — Unblock writes: per-user write rate limit, drop redundant client rename cascades

Status: active
Snapshot: adb954d97afb90d0874b524731ac7e63297d57d4

## Problem Statement
Deletes and saves fail with no clear message. The cause is `dataWriteLimiter` in
`server/routes/generic.js:19`: it allows 300 writes per 15 min **per IP**, and once that is
used up every POST/PUT/DELETE returns 429. Human evidence from 2026-10-05: a menu-event delete
failed on `POST /api/v1/data/TRASH_MENU_EVENTS` with **429**. The budget runs out because
Metadata Manager renames loop **one PUT per document** on the client
(`kitchen-state.service.ts` `cascadeRename{Label,Course,Category,Allergen}ForAll`), and
products also add a version-history POST each. Since P3.4 (`5512ea1a`) the server already
re-keys every referencing doc (`renameTermEverywhere`, `TERM_REFERENCES`), so these client
loops are now pure double work. The client also shows a generic error on 429 instead of
saying what happened.

## Goals & Success Criteria
- Primary: normal Metadata Manager / recipe / menu work never hits 429. A rename costs O(1) client writes.
- Success: renaming a label used by N recipes makes 1 PUT (the term) from the client, and the recipes show the new key after reload. A 429 shows the `rate_limited` toast.

## Execution Mode
- Parallel: no
- Concurrent plans: —
- Isolated DB: no

## Read-Write Scope

```scope
server/routes/generic.js
server/test/**
server/.env.example
src/app/core/services/kitchen-state.service.ts
src/app/core/services/kitchen-state.service.spec.ts
src/app/core/services/metadata-registry.service.ts
src/app/core/services/metadata-registry.service.spec.ts
src/app/core/interceptors/**
src/app/pages/metadata-manager/metadata-manager.page.component.ts
src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts
docs/brain/gotchas/backend.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories
- As a chef, I want deletes and renames to just work, so that I'm not blocked by a hidden server limit.
- As a chef, when the server does refuse, I want to see why.

## Functional Requirements

### Must Have (P0)
- [ ] `dataWriteLimiter` is keyed per **user**. Its `keyGenerator` verifies the Bearer token with the same `ACCESS_SECRET` / `jwt.verify` as `server/middleware/auth.js` and returns `user:<userId>`. Without a valid token it falls back to `ipKeyGenerator(req.ip)` (express-rate-limit v8 helper, IPv6-safe).
- [ ] `max` comes from `process.env.DATA_WRITE_LIMIT_MAX` (default **1000**). `DATA_WRITE_LIMIT_MAX=0` skips the limiter entirely (local use). GETs stay skipped. Document both in `server/.env.example`.
- [ ] Do **not** gate on `NODE_ENV`: `npm run dev` sets `NODE_ENV=production` (`server/package.json`).
- [ ] Metadata Manager rename (`confirmAndCascadeRename`, `metadata-manager.page.component.ts`) no longer calls `cascadeRename`. It calls `registryRename` only (the server re-keys the referencing docs), then reloads the affected client lists (recipes + dishes for label/course; products for category/allergen) via their existing `ensureLoaded`/reload paths. The "updated N items" toast keeps the count computed before the rename.
- [ ] Remove the now-unused `cascadeRename{Label,Course,Category,Allergen}ForAll` from `kitchen-state.service.ts`, plus `applyProductCascadeUpdate` if it becomes unused. Keep `cascadeClearLabelFromAll` / `cascadeClearCourseFromAll` / `cascadeRemoveIngredientForAll`: delete still needs them, because the server blocks deleting a referenced term.
- [ ] `auth.interceptor.ts`: on HTTP 429, show `translate('rate_limited')` (existing key, `dictionary.json:733`) via `UserMsgService`, then rethrow.

### Should Have (P1)
- [ ] Gotcha in `docs/brain/gotchas/backend.md` covering two traps: (1) "`npm run dev` runs as NODE_ENV=production — never gate dev behavior on NODE_ENV"; (2) "client per-doc cascades burn the write limit; the server owns re-key".

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- No new UI. Reuses the `rate_limited` key. No new dictionary keys.

## Atomic Sub-tasks
- [ ] A1: Limiter: per-user `keyGenerator` + IP fallback, `DATA_WRITE_LIMIT_MAX` (default 1000, `0` = off), `.env.example` lines (`server/routes/generic.js`, `server/.env.example`).
- [ ] A2: Server tests: user A exhausting the limit (set `DATA_WRITE_LIMIT_MAX=3` in test) does not 429 user B on the same IP; `0` never 429s (`server/test/**`).
- [ ] A3: Before removing anything, confirm `TERM_REFERENCES` covers every field the client rename loops touch (label → recipes/dishes `labels[]`, `autoLabels[]`; course → `course`; category → products `categories[]`; allergen → products `allergens[]`). If a field is missing, STOP and report.
- [ ] A4: `confirmAndCascadeRename` → server rename only + reload the affected lists. Remove the dead cascade-rename methods. Update/trim the specs that referenced them (`metadata-manager.page.component.ts`, `kitchen-state.service.ts` + specs).
- [ ] A5: 429 handling in `auth.interceptor.ts`.
- [ ] A6: Gotcha entry (P1) (`docs/brain/gotchas/backend.md`).

## Technical Considerations
- Dependencies: `TaxonomyStore.update` (server re-key), `metadata-registry.service.ts` rename facades, `RecipeDataService` / `DishDataService` / `ProductDataService` reload.
- Accepted loss: renames no longer write one version-history entry per affected product. The term rename is the single source of truth.
- Security surface: the limiter's `keyGenerator` verifies JWTs — reuse `server/middleware/auth.js`'s secret/verify, never decode without verifying (a forged `userId` would let a client pick its own bucket).
- New files needed: none.
- Model changes: none.
- Hebrew canonical values: n/a.

## Success Criteria
- [auto] `npm --prefix server test` → exits 0, and the new limiter tests are listed as passing.
- [auto] `npx ng build` → exits 0.
- [auto] `npx ng test --watch=false --browsers=ChromeHeadless` → exits 0.
- [auto] `git grep -n "cascadeRename.*ForAll" -- src/app` → no output.
- [human] Restart the server, sign in, then Metadata Manager → rename a label that some recipes use. DevTools Network shows **one** `PUT taxonomyTerms/...` (not one per recipe). The Recipe Book shows the new label on those recipes.
- [human] Delete a recipe and a menu event → both succeed and appear in trash.
- [human] With `DATA_WRITE_LIMIT_MAX=2` in the local server `.env`, do 3 quick saves → the third shows the "יותר מדי ניסיונות" toast. Then set it back.

## Out of Scope
- Moving the delete cascade-clear (`cascadeClearLabelFromAll` etc.) server-side.
- Ownership/permission changes (Plan 386).
- Refresh-token 401 handling.

## Critical Questions
- none open (Human confirmed the 429 evidence on 2026-10-05)
