# Plan 425 — Keep each business's data inside that business on every server read and write

Status: active
Track: code
Snapshot: 8ffda3d2c4d8f3ab5137bfee30e9d80026d28110

## Problem Statement
Spec 01.1, second of three plans (424 → 425 → 426). After plan 424 every item and user carries a `businessId`,
but the server still scopes everything by `userId`: `server/routes/generic.js` has ~120 `userId` uses with no
central helper (`readOwner`, `termWriteOwner`, `termScope`, `masterHasTerm`, the trash routes, push / delete
from master, replace-all, bulk delete), the master clone and sync run per user (`cloneMasterDataToUser`,
`syncMasterToUser`), the Trash purge is keyed by user (`server/jobs/purge-deleted.js`), indexes lead with
`userId` (`server/db.js`), and "admin" is the legacy `role` (`isAdmin` in generic.js, `requireAdmin` in
`ai.js` / `admin.js`, the inline check on `PUT /DICTIONARY_OVERRIDES/global`).

This plan switches every server read and write to the business: one scope helper
(`server/utils/business-scope.js`, from 424), clone and sync once per business, Trash and purge per business,
indexes led by `businessId`, a platform-admin flag instead of `role`, login blocked for users with no business
or removed from it, a `GET /api/v1/business` route, admin routes that understand businesses, and real
cross-business and INV-1 / INV-2 tests. No client change: one user per business today, so every screen looks
the same.

## Goals & Success Criteria
- Primary: no server route returns or changes another business's data; owner and staff of one business share
  one copy; platform-admin powers come only from `isPlatformAdmin`.
- Success:
  - [x] [auto] `npm --prefix server test` passes, including the new tests:
    - `server/test/cross-business.test.js`: for every type in `ALL_USER_ENTITY_TYPES` (products, recipes,
      dishes, suppliers, equipment, venues, menuEvents, taxonomyTerms, VERSION_HISTORY, activity_log,
      DICTIONARY_OVERRIDES) a member of business X creates an item; a member of business Y gets it in no list
      (`GET /:type`), `GET /:type/:id` → 404, `PUT` → 404, `DELETE` → 404, `DELETE /:type/bulk` → `deletedCount: 0`;
      for searchable types `/search` returns nothing of X's and `/count` counts only Y's; for Trash types X's
      deleted item is not in Y's `/trash`, `PUT /:id/restore` → 404, `restore-all` / `DELETE /trash` leave it
      untouched; VERSION_HISTORY `?filterEntityId=` of X's entity returns `[]` to Y; the X stored doc is
      unchanged after every Y attempt;
    - same file: owner and staff tokens of one business — staff lists the owner's product; the owner edits it;
      staff's `GET /products/:id` returns the edit;
    - same file: a token without `businessId` → 401 on a data route; anonymous `GET /products` returns only
      `businessId: '__master__'` docs;
    - `server/test/invariants.test.js`: every `INV-1 …` / `INV-2 …` `it.todo` is a real test (cases in A9);
    - `server/test/sync-master.test.js` (updated): a new business gets the full master copy stamped with its
      `businessId`; a master change reaches the business on the next sync; a business-modified item and a
      business-deleted item are never overwritten or re-cloned; two members of one business → one copy, and
      `businesses.lastSyncedMasterVersion` gates the refresh sync;
    - `server/test/auth-business.test.js` (extended): login of a user with no `businessId` → 403
      `{ error: 'NO_BUSINESS' }`; login of a user with `removedAt` → 403 `{ error: 'USER_REMOVED' }`; refresh for
      either → 401 with the same `error` and the refresh cookie cleared; a `role: 'admin'` user without
      `isPlatformAdmin` gets 403 on `GET /api/v1/admin/users`;
    - `server/test/business-route.test.js`: `GET /api/v1/business` returns the caller's business doc for owner
      and staff; anonymous → 401;
    - `server/test/admin-business.test.js`: `GET /api/v1/admin/users` rows carry `businessId`, `businessName`,
      `businessRole`, `isPlatformAdmin`; deleting an owner removes the business, all its users and every doc
      with its `businessId`, and nothing of another business; deleting a staff user removes only that user (their
      items stay); deleting a user of the caller's own business → 403.
  - [x] [auto] `npx ng build` passes.
  - [x] [auto] Rehearsal on the scratch copy (`--target=local --db=foodvibe_scratch_0006`, B1): after inserting one
    user without `businessId` and one product without `businessId` / `createdBy` into that DB, `--write=yes` stamps
    them and
    `--verify=yes` exits 0: 0 users without a business, 0 non-orphan docs missing `businessId` / `createdBy`,
    every count line `ok`.
  - [auto] (deferred to the final gate — run mode) `node server/migrations/0006-business-tenant.js --target=atlas
    --confirm-host=<host> --verify=yes` after the Atlas re-run exits 0 with the same three results.
  - [x] [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
  - [human] On the wt-1 slot (`http://localhost:4201`), sign up two new accounts in two browser windows (one
    normal, one private). Account A adds product "בדיקה עסק א" in Inventory. Account B: Inventory list, the
    ingredient search in a new recipe, and Trash show no "בדיקה עסק א". Desktop and phone width.
  - [human] (deferred to the final gate — run mode; after deploy) Dandan notes the four dashboard numbers on production
    (`https://wdd-coder.github.io/foodVibe1.0/dashboard`) before the merge, signs in after the deploy on phone and
    desktop, and sees the same numbers; the AI model list and user list in Settings tab "metadata" still open for
    him.

## Execution Mode
- Parallel: no — must not run alongside any plan that edits `shared/schemas/**` or `server/routes/generic.js`.
- Concurrent plans: none of the above; lane wt-1 only.
- Isolated DB: yes — server tests on the slot's isolated DB; B1 is rehearsed on the scratch copy; the Atlas
  re-run follows the same go protocol as plan 424 and is deferred to the final gate (run mode).

## Execution Notes
- MVP run mode: executed unattended into branch `mvp` per `docs/mvp/run-mode.md` — Atlas steps are rehearsed on a
  scratch copy and deferred to the final gate; [human] items become validation cards in `docs/mvp/runs/425.md`.
- Depends on: plan 424 merged (into `mvp`). Plan 424's Atlas apply of 0006 (424 A8) is deferred to the final
  gate and does not block building this plan.
- Gate before production (B1, deferred to the final gate — the Worker does not stop on it): re-run 0006
  `--write=yes` on Atlas after Dandan's go (catches signups and writes made with an old token since the first
  apply), then `--verify=yes` must pass, before `mvp` (with this plan) is deployed. Without that, items written
  in the gap would disappear from their owner's lists once this plan's filters go live.
- Must not run at the same time as: any plan that edits `shared/schemas/**` or `server/routes/generic.js` —
  today 427, 436, 438, 440, 442, 443, 445, 446 (run `node scripts/scope-check.mjs --overlap --plan=<this>` at take
  time). Plan 430 (usage middleware) waits for this plan.
- Decision (Planner review): `/refresh` answers 401 (not 403) `{ error: 'NO_BUSINESS' | 'USER_REMOVED' }` and
  clears the cookie; `/login` answers 403 as C-USER says — the existing interceptor signs the user out on a 401
  refresh, and plan 428's tests were aligned to 401 for refresh.
- Deploy note: after the deploy every access token older than the deploy that lacks `businessId` gets a 401, the
  client refreshes silently and continues (`auth.interceptor.ts`). No user action needed.
- Rollback: revert the merge commit. The data is untouched by this plan (only indexes are added; the old
  `userId` indexes are kept), so the previous code works on the same data.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/admin.js
shared/schemas/base.schema.ts
server/routes/**
server/middleware/auth.js
server/utils/business-scope.js
server/services/**
server/jobs/**
server/db.js
server/app.js
server/scripts/reset-user-from-master.js
server/migrations/0003-taxonomy-terms.js
src/app/core/services/taxonomy-store.service.ts
server/test/**
server/breadcrumbs.md
docs/agent/standards-backend.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry. Every Atlas write needs the Human's go
at that moment.

## Architecture Impact

- INV-1: preserves — implements ADR 0023: every read and write is filtered by the caller's business through
  `server/utils/business-scope.js`; only a platform admin writes `__master__` items (`isPlatformAdmin`).
- INV-2: preserves — implements ADR 0023: clone and sync run once per business, never overwrite a
  business-modified or deleted item; taxonomy reads master ∪ the business's own terms.
- INV-3: preserves — term renames, supplier delete-for-everyone, purge-ingredient-everywhere and business delete
  stay single server requests; they are re-keyed by business, not split.
- INV-4: preserves — `businessId` / `createdBy` become required in `baseDocShape` and `userId` optional; the
  server still validates every write.
- INV-6: preserves — `server/routes/ai.js` only swaps `requireAdmin` for `requirePlatformAdmin`; every AI call
  still goes through it.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check by symbol: `scopeFilter`, `readScope`,
`stampNew`, `MASTER_BUSINESS_ID` (`business-scope.js`, plan 424); `createBusinessFor`, `ensureBusinessForUser`
(`server/services/business.js`); `signAccess`, `requirePlatformAdmin`; in generic.js `readOwner`,
`termWriteOwner`, `termScope`, `masterHasTerm`, `findTermReferences`, `renameTermEverywhere`,
`pushDocToMasterRecursive`, `purgeSupplierEverywhere`, `unlinkSuppliersFromProducts`, `replaceCollection`,
`replaceCollectionFallback`, `deleteStamp`, every route handler; `LIVE`, `IN_TRASH`, `isMasterClone`, `toStub`,
`disposeDoc`, `purgeExpired`; `cloneMasterDataToUser`, `syncMasterToUser`; index names in `db.js`; `GET /users`,
`DELETE /users/:userId` in admin.js. Print `ok` or `conflict: <what>` per commit.

## Contracts (verbatim from the approved MVP map)

**C-SCOPE (424/425)**
- Every business doc gets `businessId: string` and `createdBy: string` in `baseDocShape`. Master docs: `businessId: '__master__'`. Migration 0006 sets `createdBy = userId` and `businessId` = the user's business (master: `'__master__'`). Plan 425 stops using `userId` for scoping; the stored `userId` stays (optional in schema, never read for scope).
- `server/utils/business-scope.js` exports `MASTER_BUSINESS_ID = '__master__'`, `scopeFilter(req)` → `{ businessId: req.user.businessId }`, `readScope(req, type)` → taxonomy: `{ businessId: { $in: [bid, '__master__'] } }`, others `scopeFilter(req)`; anonymous → `{ businessId: '__master__' }`; `stampNew(req, doc)` → sets `businessId`, `createdBy = req.user.userId`, `createdAt`.
- Indexes re-led by `businessId` (taxonomy unique `{kind, key, businessId}`).

**C-USER (424/425/426)**
- User fields added: `businessId: string`, `businessRole: 'owner' | 'staff'`, `isPlatformAdmin: boolean` (migration: `true` where `role === 'admin'`), `removedAt?: number` (staff removed → login blocked), `createdAt: number`. `role` stays read-only legacy until 426 removes client use.
- JWT access payload: `{ userId, name, businessId, businessRole, isPlatformAdmin }` (15m). Refresh unchanged `{ userId }`.
- Middleware: `requirePlatformAdmin` (new name) in `server/middleware/auth.js`; `requireAdmin` kept as an alias until 425 replaces all uses.
- Login with no businessId → 403 `{ error: 'NO_BUSINESS' }`, client key `no_business` → "החשבון לא משויך לעסק – פנה לתמיכה". Removed staff → 403 `{ error: 'USER_REMOVED' }`.

**C-BUSINESS (424 creates the collection; 429/431 add fields)**
- Collection `businesses`, one doc per business: `{ _id, name, ownerId, createdAt, internal: false, lastSyncedMasterVersion, settings, baseline? }`. Duplicate names allowed. Migration names existing ones "העסק של [username]".
- `settings` defaults `{ profitTargetPct: 25, safetyMarginPct: 10, overrunThresholdPct: 10 }` (429).
- `baseline` `{ inquiriesPerMonth?, eventsClosedPerMonth?, avgRevenuePerEvent?, estProfitPct?, filledAt }` (431).
- Zod schema `shared/schemas/entities/business.schema.ts`.
- Dedicated router `server/routes/business.js` mounted at `/api/v1/business`: `GET /` (my business + settings, any member), `PUT /settings` (owner, 429), `PUT /baseline` (owner, 431), `GET/POST/DELETE /team…` (owner, 428). Client `BusinessService` `src/app/core/services/business.service.ts` with `business_` signal.

How this plan applies them:
- The access token keeps `role` until plan 426; from this plan `isPlatformAdmin` in the token is
  `user.isPlatformAdmin === true` only (the `role` fallback from 424 is removed) and no server check reads `role`.
- Refresh for a user with no business or with `removedAt` answers **401** `{ error: 'NO_BUSINESS' | 'USER_REMOVED' }`
  and clears the refresh cookie (so the existing client interceptor signs the user out); login answers 403 as
  the contract says.
- `GET /api/v1/business` returns the business doc as stored (`_id, name, ownerId, createdAt, internal,
  lastSyncedMasterVersion`, plus `settings` / `baseline` once 429 / 431 add them).

## User Stories
- As a chef, I want my products, recipes, menus and Trash to show only my kitchen's items so that another
  kitchen never sees my prices and I never see theirs.
- As a chef who owns a kitchen, I want my staff to see and use the same products and recipes as me so that we
  all cook from one list.
- As Dandan (platform admin), I want the shared catalog, AI models and the global dictionary to stay mine to
  manage so that no business owner can change them for everyone.

## Functional Requirements

### Must Have (P0)
- [x] Every generic route filters with `scopeFilter` / `readScope`; no find/update/delete filter reads `userId`.
- [x] Taxonomy: read master ∪ business; master terms written only by a platform admin; a business may not add
      or re-key a term onto a key master has; renames re-key only the term's business (master: everyone).
- [x] Push-to-master, delete-from-master, purge-ingredient-everywhere, supplier delete-for-everyone: platform
      admin only, re-keyed per business.
- [x] Trash list / restore / restore-all / empty / permanent delete and the 30-day purge per business.
- [x] Clone at signup and master sync per business; version gate on the business doc.
- [x] Tokens without `businessId` refused (401); login / refresh blocked for no business or removed users.
- [x] `requirePlatformAdmin` everywhere; `requireAdmin` alias deleted; `isAdmin` (role) gone from generic.js.
- [x] Indexes led by `businessId`; taxonomy unique `{ kind, key, businessId }`.
- [x] `businessId` / `createdBy` required, `userId` optional in `baseDocShape` / `tombstoneSchema`.
- [x] `GET /api/v1/business`; admin users list + business-aware user delete.
- [x] Cross-business tests for every data type; INV-1 / INV-2 real tests.

### Should Have (P1)
- [x] `reset-user-from-master.js` resets a business; `standards-backend.md` §5 and `server/breadcrumbs.md` updated.

## UI/UX Notes
- No UI change and no new dictionary keys (the NO_BUSINESS / USER_REMOVED messages arrive with plan 426; until
  then every user has a business, so nobody sees them).

## Atomic Sub-tasks
- [x] B1: Make sure all data is moved into businesses before the filters switch over — run now on the scratch copy `foodvibe_scratch_0006` (from 424 A8): insert one user without `businessId` and one product without `businessId` / `createdBy` (simulating the gap), then 0006 dry run → `--write=yes` → `--verify=yes` exits 0; outputs in `docs/mvp/runs/425.md` ## Evidence. Deferred to the final gate (run mode; written under `## Final gate — Atlas`, the Worker does not stop on it): after plan 424 is deployed, Atlas dry run of 0006 → Dandan's `go 0006 rerun` → `--write=yes --backup-dir=<fresh atlas snapshot>` → `--verify=yes` exits 0, before this plan reaches production — server/migrations/0006-business-tenant.js (run only), docs/mvp/runs/425.md
- [x] B2: Require a business and a creator on every item and let the owner field go — base.schema.ts: `businessId: z.string().min(1)`, `createdBy: z.string().min(1)`, `userId: z.string().min(1).optional()`; tombstoneSchema `businessId` required, `userId` optional; test helpers: `signTestToken(payload)` defaults `businessId: 'b_' + payload.userId`, `businessRole: 'owner'`, `isPlatformAdmin: payload.role === 'admin'` (each overridable); `stored(body, fields)` in v2-docs.js defaults `businessId` (`'__master__'` when `fields.userId === '__master__'`, else `'b_' + fields.userId`) and `createdBy: fields.userId` — shared/schemas/base.schema.ts, server/test/helpers/app.js, server/test/helpers/v2-docs.js
- [x] B3: Refuse tokens without a business and block sign-in for users with none or removed — middleware/auth.js `attachUser`: a verified token with `userId` but no `businessId` throws (→ 401 'Invalid or expired token'); `requirePlatformAdmin` checks `req.user.isPlatformAdmin === true` only; delete `requireAdmin` and switch every import (generic.js, ai.js `/models` ×3, admin.js ×2); auth.js `signAccess`: `isPlatformAdmin: user.isPlatformAdmin === true`; login after the password check: no `businessId` → 403 NO_BUSINESS, `removedAt` → 403 USER_REMOVED (no token, no cookie); refresh: same checks → clear cookie + 401 with that `error` — server/middleware/auth.js, server/routes/auth.js, server/routes/ai.js, server/routes/admin.js
- [x] B4: Filter every data read and write by the caller's business — generic.js: `readOwner` → `readScope(req, type)`; `isAdmin` → `req.user?.isPlatformAdmin === true`; `termWriteOwner(req)` → platform admin `{ businessId: { $in: [bid, MASTER] } }`, else `scopeFilter(req)`; `termScope(term)` → `term.businessId === MASTER ? { $exists: true } : term.businessId` used as `businessId:` in `findTermReferences` / `renameTermEverywhere`; `masterHasTerm` → `{ businessId: MASTER, kind, key }`; shared-term POST fold → `businessId: { $ne: MASTER }`; GET `/:type`, `/search`, `/count`, `/:id`, PUT `/:id`, DELETE `/bulk`, DELETE `/:id` (incl. the product-in-recipe check and `unlinkSuppliersFromProducts(businessId, ids)`) all use the scope helpers; POST keeps writing `userId` (caller, or MASTER for a shared term) next to `stampNew`; PUT `/DICTIONARY_OVERRIDES/global` uses `requirePlatformAdmin`; `GET/PUT /DICTIONARY_OVERRIDES/global` keep `{ userId: '__global__' }` — server/routes/generic.js
- [x] B5: Run push to master and the "for everyone" deletes per business — `pushDocToMasterRecursive(type, id, businessId, visited, pusherId)` reads/writes `{ _id, businessId }` and finds masters by `businessId: MASTER`; delete-from-master + `purgeSupplierEverywhere(masterId, callerBusinessId)`: clones of other businesses = `businessId: { $nin: [MASTER, callerBid] }`, unlink per clone's `businessId`, returns businesses affected; purge-ingredient-everywhere pulls per clone `businessId`; `replaceCollection(type, businessId, docs)` + fallback delete by `businessId`; conflict check `businessId: { $ne: bid }`; all four "for everyone" routes use `requirePlatformAdmin` — server/routes/generic.js
- [x] B6: Keep Trash and the 30-day purge per business — purge-deleted.js: `purgeExpired(db, { businessIds, types, now, days })` filters `businessId: { $in: businessIds }`; `isMasterClone(doc)` uses `doc.businessId !== MASTER`; `toStub` keeps `businessId` (and `userId` when present); `disposeDoc` filters `{ _id, businessId }`; generic.js trash routes: list / restore / restore-all / empty use `scopeFilter(req)`, the list's purge passes `[bid, MASTER]`; `deleteStamp(req.user.userId)` unchanged (`deletedBy` stays a user) — server/jobs/purge-deleted.js, server/routes/generic.js
- [x] B7: Copy and sync the master catalog once per business instead of per user — clone-master.js → `cloneMasterDataToBusiness(businessId, { createdBy })` (master read `{ businessId: MASTER, ...LIVE }`; clones get `businessId`, `createdBy`, `userId: createdBy`); sync-master.js → `syncMasterToBusiness(businessId, { createdBy })` (every `{ userId }` filter → `{ businessId }`, master → `{ businessId: MASTER }`, Rule 1 clones stamped with the business owner as `createdBy`/`userId`); services/business.js adds `getBusiness(id)` and `setBusinessSyncedVersion(id, v)`; auth.js signup / login / refresh / guest call the business versions and gate the refresh sync on `business.lastSyncedMasterVersion` (user's `lastSyncedMasterVersion` no longer read) — server/services/clone-master.js, server/services/sync-master.js, server/services/business.js, server/routes/auth.js
- [x] B8: Lead every index with the business — db.js: add `{ businessId: 1 }` on CLONEABLE_TYPES, VERSION_HISTORY `{ businessId, entityType, entityId }`, searchable `{ businessId, nameHebrew }`, products `{ businessId, minStockLevel }`, recipes/dishes `{ businessId, isApproved }` and `{ businessId, 'ingredients.referenceId' }`, taxonomyTerms unique `{ kind, key, businessId }` named `kind_key_business_unique` with `partialFilterExpression: { businessId: { $exists: true } }` (an orphan doc without the field can't break startup) and `{ businessId, kind, sortOrder }` named `business_kind_order`; keep the old `userId` indexes (migration 0003's `--verify` checks `kind_key_user_unique`) — server/db.js
- [x] B9: Add a route for the caller's business and make the admin user tools business-aware — new server/routes/business.js `GET /` (verifyToken) → the `businesses` doc for `req.user.businessId` (404 if missing), mounted in app.js at `/api/v1/business`; admin.js `GET /users` adds `businessId`, `businessRole`, `isPlatformAdmin`, `businessName` (one `businesses` lookup); `DELETE /users/:userId`: target in the caller's business → 403 `{ error: 'Cannot delete your own business' }`; owner → delete every doc with that `businessId` in `ALL_USER_ENTITY_TYPES`, all users with that `businessId`, and the business doc; staff → delete only the user doc; response `{ ok: true, deletedBusiness, usersDeleted }`; server/breadcrumbs.md gets a `routes/business.js` row — server/routes/business.js, server/app.js, server/routes/admin.js, server/breadcrumbs.md
- [x] B10: Prove no business can reach another's data and make the ownership and tenancy tests real — new server/test/cross-business.test.js, business-route.test.js, admin-business.test.js; extend auth-business.test.js and sync-master.test.js (cases in Goals); invariants.test.js real tests: INV-1 member creates/edits/deletes in own business; member of Y can't edit/delete X's item (404) and X's doc is unchanged; non-admin can't edit a `__master__` item (403/404); platform admin edits a shared master term; staff reads the owner's item; INV-2 signup business gets the full master copy with its `businessId`; master update reaches it; business-modified item not overwritten; a business's own term is invisible to another business while master terms reach both; update every other server test that seeds or asserts by `userId` (generic, soft-delete, push-to-master, supplier-delete, taxonomy-terms-api, dedupe-master-names, data-write-limit, …) to the business model — server/test/**
- [x] B11: Point the reset script and the backend standard at businesses — reset-user-from-master.js: `--user=<id>` resolves the user's business and deletes its docs by `businessId`, `--business=<id>` directly, resets `businesses.lastSyncedMasterVersion` to 0; standards-backend.md §5: "an authenticated request returns the caller's business's documents" and the push-to-master row says platform admin only — server/scripts/reset-user-from-master.js, docs/agent/standards-backend.md
- [x] B12: Build, test, check the logs and hand Dandan the two-account check — `npx ng build`, `npm --prefix server test`, `node scripts/log-query.mjs --since=plan-start --level=error`; start the wt-1 slot (`node scripts/slot-serve.mjs`) for the [human] check; post-deploy count check listed for after the merge — this plan file

## Technical Considerations
- Dependencies: plan 424's `business-scope.js`, `services/business.js`, `signAccess`, `requirePlatformAdmin`.
- New files: `server/routes/business.js`, four test files.
- Model changes: `baseDocShape` / `tombstoneSchema` required/optional flip (B2).
- Backend / API: new `GET /api/v1/business`; `DELETE /api/v1/admin/users/:userId` semantics change (owner →
  whole business); login 403 NO_BUSINESS / USER_REMOVED; refresh 401 with those codes; tokens without
  `businessId` → 401.
- Auth and validation: platform-admin routes = push-to-master, delete-from-master, purge-ingredient-everywhere,
  shared-term POST/PUT/DELETE of master terms, `PUT /DICTIONARY_OVERRIDES/global`, `/api/v1/ai/models`,
  `/api/v1/admin/*`.
- Security surface: this is the tenant-isolation change — every query in `generic.js` is a leak risk. Review
  every `col(...)` call; `scopeFilter` throws rather than returning an undefined `businessId` (Mongo would match
  docs missing the field). Medium/large plan touching auth and storage — pre-commit secret scan and the CI
  security workflow are the gates.
- Data / migration: no data writes in this plan's code; B1 re-runs 0006 (idempotent). New indexes build on
  startup (small collections on M0).
- Performance: queries keep the same shape with `businessId` in place of `userId`; indexes added in the same
  deploy.
- Project checks: log-query Done-when present; chef-side stories; no dictionary keys; no UI.

## Backend Impact
- Collections affected: suppliers, products, recipes, dishes, equipment, venues, menuEvents, VERSION_HISTORY,
  activity_log, taxonomyTerms, DICTIONARY_OVERRIDES, users, businesses (read + version stamp).
- New collections: no (plan 424 created `businesses`).
- Server changes needed: yes — every generic route, clone/sync, trash/purge, indexes, auth middleware, login /
  refresh blocks, admin routes, new `GET /api/v1/business`.

## Out of Scope
- Any client change: business name at signup, user state, NO_BUSINESS / USER_REMOVED messages, hiding
  platform-admin screens, dropping `role` from the token (plan 426).
- Owner/staff permission rules (plan 427); adding/removing staff (plan 428).
- Per-business AI quota (`aiLimiter` stays per user — spec 01.1 Out).
- Dropping the old `userId` indexes or the `userId` field from documents.
- Staff private changes, several businesses per user, ownership transfer (spec 01.1 Out).

## Critical Questions
None — product defaults are locked in the brief's Part 4. Deleting an owner from the admin user list deletes
the whole business (spec 01.1: "Platform admin deletes a whole business with all data and users"); the double
confirmation is plan 426's client.
