# Plan 424 — Give every item and user a business, and move existing data into one business per user

Status: draft
Track: code
Snapshot: 8ffda3d2c4d8f3ab5137bfee30e9d80026d28110

## Problem Statement
Spec 01.1 (business entity and isolation between businesses), first of three plans (424 → 425 → 426).
Today every document has one owner field, `userId` (`shared/schemas/base.schema.ts` `baseDocShape`), every user
gets a private clone of `__master__` at signup (`cloneMasterDataToUser`, `server/services/clone-master.js`), and
there is one global `role` (`admin`/`user`, `server/models/user.model.js`). There is no business, no
"who created this" stamp and no platform-admin flag, so an owner and a staff member can never share one
kitchen's data.

This plan lays the data foundation without changing what anyone sees:
- every item gets `businessId` and `createdBy`; the server stamps both on every new write;
- users get `businessId`, `businessRole`, `isPlatformAdmin`, `removedAt`, `createdAt`; a `businesses` collection
  exists; signup creates the new user's business; the access token carries the business fields;
- migration 0006 gives every existing user a business named "העסק של [username]" and stamps every existing item;
- ADR 0023 records the decision and INV-1 / INV-2 are rewritten.

Reads and writes **still filter by `userId`** after this plan. Plan 425 switches the filters to `businessId`.
That split keeps production safe if 424 merges alone: the new fields are inert until 425 reads them.

## Goals & Success Criteria
- Primary: after this plan and the Atlas migration, every user has a business, every item (and every
  `__master__` item) carries `businessId` + `createdBy`, and every new write is stamped — with no visible change.
- Success:
  - [auto] `npm --prefix server test` passes, including the new tests:
    - `server/test/migration-0006-business-tenant.test.js`: two users + master docs + one orphan doc (userId with
      no user) + the `__global__` dictionary doc + a purged stub → after `write`: each user has a business named
      `העסק של <name>`, `businessRole: 'owner'`, `isPlatformAdmin` true only for the `role: 'admin'` user; every
      doc in every collection of `ALL_USER_ENTITY_TYPES` has `businessId` (the owner's business; `'__master__'`
      for master docs) and `createdBy` (= its `userId`); the `__global__` doc and the orphan are unchanged and the
      orphan is reported; a second `write` changes 0 docs and creates 0 businesses; `verify` exits 0; per user and
      collection, count by `userId` = count by `businessId`;
    - `server/test/business-scope-util.test.js`: `stampNew` sets `businessId` from the token, `createdBy =
      req.user.userId`, keeps a numeric `createdAt`; `scopeFilter` / `readScope` return the contract filters;
      anonymous → `{ businessId: '__master__' }`; `scopeFilter` throws when a signed-in token has no `businessId`;
    - `server/test/business-stamp.test.js`: POST stamps `businessId` + `createdBy` and ignores client-sent values;
      PUT never changes stored `businessId` / `createdBy` even when the body sends them; an admin's `shared: true`
      term gets `businessId: '__master__'`; `PUT /VERSION_HISTORY` (replace-all) stamps every doc;
      push-to-master gives the master copy `businessId: '__master__'` and never writes the pusher's business onto
      master; login sync (Rule 2) never overwrites a clone's `businessId` with `'__master__'`; seed-master stamps
      `businessId: '__master__'`;
    - `server/test/auth-business.test.js`: signup creates one `businesses` doc `{ name: 'העסק של <name>',
      ownerId, internal: false }`, sets the user's `businessId` / `businessRole: 'owner'` / `isPlatformAdmin:
      false` / `createdAt`, and every cloned item carries that `businessId`; the access token from signup, login,
      refresh and guest decodes to `{ userId, name, role, businessId, businessRole, isPlatformAdmin }`; a
      `role: 'admin'` user's token has `isPlatformAdmin: true`; `requirePlatformAdmin` → 403 for a non-admin.
  - [auto] `npx ng build` passes.
  - [auto] Rehearsal on a scratch copy (a local restore of the newest Atlas snapshot already on disk, else the
    seeded local dev DB — run mode): `node server/migrations/0006-business-tenant.js --target=local
    --db=foodvibe_scratch_0006` prints the plan; with `--write=yes` it applies; a second `--write=yes` prints
    `0 businesses created, 0 docs stamped`; `--verify=yes` exits 0 and prints `ok` for every user/collection count line.
  - [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
  - [human] (deferred to the final gate — run mode) Dandan reads the Atlas dry-run output (users → businesses,
    docs per collection, orphans) and replies `go 0006` before the Atlas `--write=yes` runs.
  - [human] (deferred to the final gate — run mode) Before the Atlas apply Dandan notes the four dashboard numbers on production
    (`https://wdd-coder.github.io/foodVibe1.0/dashboard`); after it, he signs in again (phone and desktop) and sees
    the same four numbers, and the recipe book, inventory and menu library look exactly as before.

## Execution Mode
- Parallel: no — must not run alongside any plan that edits `shared/schemas/**` or `server/routes/generic.js`.
- Concurrent plans: none of the above; lane wt-1 only.
- Isolated DB: yes — server tests on the slot's isolated DB; migration rehearsed on a scratch copy
  (`--db=foodvibe_scratch_0006`, a restored Atlas snapshot when one is on disk) before Atlas (memory: plan 310 —
  test against real data early).

## Execution Notes
- MVP run mode: executed unattended into branch `mvp` per `docs/mvp/run-mode.md` — Atlas steps are rehearsed on a
  scratch copy and deferred to the final gate; [human] items become validation cards in `docs/mvp/runs/424.md`.
- Depends on: no plan in this run (plan 407 is merged). Note only, not a build blocker: plan 407 P6.3 — migration
  0005 run on Atlas with `--verify=yes` clean — must be done before 0006 runs on Atlas; 0006 must never run on
  Atlas before 0005. That confirmation is part of the final gate (A8), and the Worker does not stop on it.
- Must not run at the same time as: any plan that edits `shared/schemas/**` or `server/routes/generic.js` —
  today 427, 436, 438, 440, 442, 443, 445, 446 (run `node scripts/scope-check.mjs --overlap --plan=<this>` at take
  time).
- Human gates (all deferred to the final gate — run mode; written as ordered commands under `## Final gate —
  Atlas` in `docs/mvp/runs/424.md`): (0) Dandan confirms 407 P6.3; (1) Atlas host confirm before the Atlas
  backup; (2) `go 0006` on the Atlas dry-run before `--write=yes`. Every Atlas write needs Dandan's go at that
  moment.
- Order in production: Atlas apply may run before or after this plan's merge — the fields are inert until plan
  425. Plan 425 re-runs `--write=yes` (idempotent) after this plan is deployed, to catch users who signed up and
  docs written with an old token in between, then `--verify=yes` must be 0 before 425 merges (run mode: before `mvp` is deployed to production — final gate).
- Rollback: the new fields and the `businesses` collection are unread while this plan's code still scopes by
  `userId`, so leaving them is safe. A full undo = restore the A7 Atlas snapshot
  (`docs/agent/standards-backend.md` §7).

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/**
server/models/**
server/middleware/auth.js
server/routes/auth.js
server/routes/generic.js
server/services/**
server/utils/business-scope.js
server/migrations/0006-business-tenant.js
server/db.js
server/test/**
docs/brain/decisions/0023-business-is-the-tenant.md
docs/brain/invariants.md
docs/brain/index.md
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

- INV-1: changes — ADR docs/brain/decisions/0023-business-is-the-tenant.md — Arch-approved: Human 2026-10-20
- INV-2: changes — ADR docs/brain/decisions/0023-business-is-the-tenant.md — Arch-approved: Human 2026-10-20
- INV-3: preserves — the backfill runs server-side in migration 0006; stamping happens inside the existing single
  requests (POST / PUT / replace-all / push-to-master); the client sends nothing new.
- INV-4: preserves — `businessId`, `createdBy` and the business document are Zod schemas in `shared/schemas/`;
  the server validates every write against them.
- INV-5: preserves — taxonomy terms gain only the two base fields; kinds, axes and `taxonomyTerms` are unchanged.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check by symbol: `baseDocShape`,
`tombstoneSchema` (`base.schema.ts`); `SCHEMA_BY_COLLECTION` (`entities/index.ts`); the POST `/:type`, PUT
`/:type/:id`, PUT `/:type` (replace-all), `pushDocToMasterRecursive`, `isAdmin`, `TAXONOMY`, `MASTER` in
`generic.js`; `cloneMasterDataToUser`, `syncMasterToUser` (Rules 1–2); `seedMaster*` in `seed-master.js`;
signup / login / refresh / guest `jwt.sign` calls in `server/routes/auth.js`; `requireAdmin` in
`server/middleware/auth.js`; `ALL_USER_ENTITY_TYPES`; `checkBackup` in `0001-v2-schema.js`; `parseArgs` /
`connect` in `migrations/tools/_connect.js`. Print `ok` or `conflict: <what>` per commit.

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

How this plan applies them (transition, until 425/426):
- `businessId` / `createdBy` are `.optional()` in `baseDocShape` here; plan 425 makes them required and `userId`
  optional, after Atlas `--verify` is clean.
- The access token keeps `role` next to the contract fields until plan 426 removes the last client read of it;
  while `role` exists, `isPlatformAdmin` in the token is `user.isPlatformAdmin === true || user.role === 'admin'`
  (plan 425 drops the `role` fallback).
- `settings` / `baseline` are not in this plan's business schema; plans 429 / 431 add them.
- The NO_BUSINESS / USER_REMOVED login blocks are plan 425's.

## User Stories
- As a chef who owns a kitchen, I want everything I already made to move into my business unchanged so that I
  lose nothing when my team joins.
- As a chef, I want every item to remember who created it so that later my staff can change only what they made.
- As Dandan (platform admin), I want my admin rights kept separate from being a business owner so that owners
  never get platform powers by accident.

## Functional Requirements

### Must Have (P0)
- [ ] `businessId` + `createdBy` in `baseDocShape` (and `businessId` in `tombstoneSchema`); new `businessSchema`.
- [ ] User model fields `businessId`, `businessRole`, `isPlatformAdmin`, `removedAt`, `createdAt`.
- [ ] `server/utils/business-scope.js` with the C-SCOPE exports; `stampNew` used by every create.
- [ ] Every create path stamps `businessId` + `createdBy`: POST `/:type`, shared-term POST, PUT `/:type`
      replace-all, signup clone, login/refresh/guest sync (Rule 1), push-to-master master copy, seed-master.
- [ ] Clients can never set or change `businessId` / `createdBy` (stripped like `userId` on POST/PUT/replace-all).
- [ ] Sync Rule 2 and push-to-master never copy one side's `businessId` / `createdBy` onto the other.
- [ ] Signup creates the user's business (default name "העסק של <name>"); guest login ensures a business.
- [ ] Access token carries `businessId`, `businessRole`, `isPlatformAdmin`; login/signup/guest responses' user
      object carries them too. `requirePlatformAdmin` + `requireAdmin` alias.
- [ ] Migration 0006 (dry-run default, `--write=yes` + `--backup-dir`, `--confirm-host` for Atlas, `--db`
      scratch, `--verify=yes` read-only, idempotent), pure functions exported and tested.
- [ ] ADR 0023 (supersedes ADR 0008 D1); INV-1 and INV-2 rewritten in `docs/brain/invariants.md`.

### Should Have (P1)
- [ ] `docs/brain/index.md` row pointing business/tenant questions at ADR 0023.

## UI/UX Notes
- No UI change. No new dictionary keys. Business names are created in Hebrew by the server/migration:
  `העסק של <username>`.

## Atomic Sub-tasks
- [ ] A1: Add business and creator fields to every item, plus a schema for the business itself — baseDocShape gets `businessId: z.string().min(1).optional()` and `createdBy: z.string().min(1).optional()` (comment: required from plan 425); tombstoneSchema gets optional `businessId`; new `businessSchema = z.strictObject({ _id: z.string().min(1), name: nameField.min(1), ownerId: z.string().min(1), createdAt: z.number(), internal: z.boolean(), lastSyncedMasterVersion: z.number().int().min(0) })` + `type Business`, exported from entities/index.ts (not added to SCHEMA_BY_COLLECTION — not a generic type); if `node server/migrations/tools/validate-all.js --target=local` reports the two fields as unmapped, add them to `COMMON` in field-map.v1-to-v2.ts — shared/schemas/base.schema.ts, shared/schemas/entities/business.schema.ts, shared/schemas/entities/index.ts, shared/schemas/field-map.v1-to-v2.ts
- [ ] A2: Give users a business, a role in it and a platform-admin flag, created in one place — user.model.js: `businessId` (String, default null), `businessRole` (enum ['owner','staff'], default null), `isPlatformAdmin` (Boolean, default false), `removedAt` (Number, default null), `createdAt` (Number, default null); new server/services/business.js: `createBusinessFor(user, { name, now, masterVersion })` validates with `businessSchema` (from `server/generated/schemas/entities`), inserts into `businesses` (`internal: false`), then sets the user's `businessId`, `businessRole: 'owner'`, `createdAt` (if missing); `ensureBusinessForUser(user)` returns the existing id or calls `createBusinessFor` with `העסק של ${user.name}`; db.js `businesses.createIndex({ ownerId: 1 })` — server/models/user.model.js, server/services/business.js, server/db.js
- [ ] A3: Add the one shared helper that stamps and scopes by business — server/utils/business-scope.js per C-SCOPE: `MASTER_BUSINESS_ID`, `scopeFilter(req)` (anonymous → master; signed in without `businessId` → throw `Error('NO_BUSINESS_IN_TOKEN')`, never an undefined filter), `readScope(req, type)` (taxonomyTerms → `$in: [bid, MASTER]`), `stampNew(req, doc)` (`businessId` from the token when present, `createdBy = req.user.userId`, `createdAt` = existing number or now); only `stampNew` is wired in this plan; unit tests in server/test/business-scope-util.test.js — server/utils/business-scope.js, server/test/business-scope-util.test.js
- [ ] A4: Stamp business and creator on every new item and never let a client change them — generic.js: POST `/:type` strips `businessId`/`createdBy` from the body with `userId`/`_masterId`, then `stampNew`; a `shared: true` term overrides `businessId: MASTER_BUSINESS_ID`; PUT `/:type/:id` strips `businessId`/`createdBy` from `safeBody` (stored values kept); PUT `/:type` replace-all stamps each doc via `stampNew`; `pushDocToMasterRecursive` strips `businessId`/`createdBy` from `safeBody` and inserts the first master copy with `businessId: MASTER_BUSINESS_ID, createdBy: <pusher userId>`; scope filters stay on `userId`; tests in server/test/business-stamp.test.js — server/routes/generic.js, server/test/business-stamp.test.js
- [ ] A5: Keep business fields right when master items are cloned, synced or seeded — `cloneMasterDataToUser(userId, { businessId })` strips `businessId`/`createdBy` from master `rest` and sets `businessId` (when given) + `createdBy: userId` on each clone; `syncMasterToUser(userId, { businessId })`: Rule 1 clones the same way, Rule 2 strips `businessId`/`createdBy` from `masterRest` before `$set`; seed-master.js stamps `businessId: '__master__', createdBy: '__master__'` on every master doc it writes (terms and products, incl. the `master()` helper); callers pass `user.businessId` (omit when null) — server/services/clone-master.js, server/services/sync-master.js, server/services/seed-master.js, server/routes/auth.js
- [ ] A6: Create a business at signup and put the business fields in every access token — auth.js: one `signAccess(user)` helper used by signup / login / refresh / guest → `{ userId, name, role, businessId, businessRole, isPlatformAdmin: user.isPlatformAdmin === true || user.role === 'admin' }`; signup: `User.create` → `createBusinessFor(user, { name: 'העסק של ' + name, masterVersion })` → clone with the new `businessId`; guest: after the upsert, `ensureBusinessForUser` (dev-guest gets `isPlatformAdmin: true`); login/signup/guest `user` objects add `businessId`, `businessRole`, `isPlatformAdmin`; middleware/auth.js adds `requirePlatformAdmin` (403 `{ error: 'Admin access required' }` unless `isPlatformAdmin === true || role === 'admin'`) and `requireAdmin = requirePlatformAdmin`; tests in server/test/auth-business.test.js — server/routes/auth.js, server/middleware/auth.js, server/test/auth-business.test.js
- [ ] A7: Write migration 0006 that gives every user a business and stamps every existing item — server/migrations/0006-business-tenant.js following 0005's shape (`parseArgs(process.argv, { write: 1, verify: 1, 'backup-dir': 1 })`, `connect`, `checkBackup` from 0001 for `--write=yes`, `--db` scratch needs no backup); exported pure functions: `businessDocFor(user, now, newId)` → `{ _id, name: 'העסק של ' + user.name, ownerId: user._id, createdAt: now, internal: false, lastSyncedMasterVersion: user.lastSyncedMasterVersion ?? 0 }`, `userBusinessFields(user, businessId, now)` → `{ businessId, businessRole: 'owner', isPlatformAdmin: user.role === 'admin', createdAt: user.createdAt ?? now }`, `ownerOf(userId, businessByUser)` → `{ businessId, createdBy }` for a user, `{ '__master__', '__master__' }` for master, `'skip'` for `'__global__'`, `'orphan'` for an unknown userId; `plan(db)` lists users without `businessId` (skip `_id: '__master__'`) and, per collection in `ALL_USER_ENTITY_TYPES`, per owner the docs missing `businessId` / `createdBy` (plus orphans); `write` creates businesses + user fields, then `updateMany({ userId, businessId: { $exists: false } }, { $set: { businessId } })` and the same for `createdBy`, and upserts marker `{ _id: '0006-business-tenant', lastRunAt, runs }` in `migrations` (re-runs allowed — idempotent); `verify` (read-only) fails on any user without a business or any non-orphan doc missing a field, prints `ORPHAN <collection> userId=<id> docs=<n>` warnings and one `ok|MISMATCH <user> <collection> byUser=<n> byBusiness=<n>` line per user/collection; header comment with modes + the rollback note; tests in server/test/migration-0006-business-tenant.test.js — server/migrations/0006-business-tenant.js, server/test/migration-0006-business-tenant.test.js
- [ ] A8: Rehearse the migration on a scratch copy and leave the Atlas run for the final gate — run now: (3) `node server/scripts/db-restore.js --target=local --dir="<newest Atlas snapshot already on disk>" --db=foodvibe_scratch_0006` (no snapshot on disk → copy the seeded local dev DB into `foodvibe_scratch_0006` instead, and log that in Decisions); (4) on the scratch DB: dry run, `--write=yes`, second `--write=yes` (0 changes), `--verify=yes`; record outputs in `docs/mvp/runs/424.md` ## Evidence. Deferred to the final gate (run mode — written as ordered commands under `## Final gate — Atlas`, the Worker does not stop on them): (1) Dandan confirms plan 407's 0005 is applied on Atlas; (2) confirm the masked Atlas host with Dandan, then `node server/scripts/db-backup.js --target=atlas`; (5) Atlas dry run `--target=atlas --confirm-host=<host>` → output for Dandan; (6) on `go 0006`: `--write=yes --backup-dir=<snapshot from step 2>` then `--verify=yes` — server/migrations/0006-business-tenant.js (run only)
- [ ] A9: Record that the business is the tenant and rewrite the ownership and tenancy rules — new ADR 0023 (front matter `supersedes: 0008-professional-foundation-refactor` for D1 only; decision: the business is the clone unit; every item has one `businessId` + `createdBy`; owner and staff share one copy; master stays `'__master__'` and only the platform admin writes it; per-user and per-business private overrides rejected (out of MVP); `server/utils/business-scope.js` is the only scoping path; `server/utils/permissions.js` (plan 427) the only write-permission path); invariants.md INV-1 / INV-2 replaced with the exact text in Design §1 (five `- Field:` lines each); index.md row; invariants.test.js: replace the plan-386 `it.todo`s with `it.todo('INV-1 … (plan 425)')` / `it.todo('INV-2 … (plan 425)')` naming the new rules — docs/brain/decisions/0023-business-is-the-tenant.md, docs/brain/invariants.md, docs/brain/index.md, server/test/invariants.test.js
- [ ] A10: Build, test, check the logs and write the Atlas steps and checks for Dandan — `npx ng build`, `npm --prefix server test`, `node scripts/log-query.mjs --since=plan-start --level=error`, rehearsal outputs; `go 0006` and the production look-around become the final-gate commands and validation cards in `docs/mvp/runs/424.md` — this plan file, docs/mvp/runs/424.md

## Design

### 1. Invariant text (A9 writes exactly this; keep the parser shape)

```
## INV-1 — Ownership
- Rule: every item belongs to exactly one business. Members read all of their business's items and nothing from another business; every write is authorized through `server/utils/permissions.js` (`can` / `assertCan`): the owner may do everything in the business, staff create anything but change only what they created and never money fields, business settings, the team or event/serving types (until plan 427 merges every member counts as owner). Only a platform admin writes shared `__master__` items.
- Source: ADR 0023 (plan 424), `server/utils/business-scope.js`, `server/utils/permissions.js`
- Touches: `server/routes/generic.js`, `server/utils/business-scope.js`, `server/utils/permissions.js`, `server/middleware/**`, `src/app/core/services/permission.service.ts`, `src/app/core/services/taxonomy-store.service.ts`, `src/app/core/services/*-data.service.ts`
- Users lose if broken: a cook sees or changes another kitchen's recipes and prices, or a staff member changes prices, settings or the team that only the owner may change; the platform admin can't fix the shared default lists.
- Test: server/test/invariants.test.js "INV-1 …"

## INV-2 — Tenancy
- Rule: the business is the tenant. A new business gets its own full copy of the shared `__master__` catalog; master sync runs per business and never overwrites an item the business changed or deleted; taxonomy is read as master ∪ the business's own terms; owner and staff share that one copy. The global master (`businessId: '__master__'`) belongs to no business and only a platform admin changes it. Every scoped query goes through `server/utils/business-scope.js`.
- Source: ADR 0023 (plan 424; supersedes ADR 0008 D1)
- Touches: `server/routes/generic.js`, `server/utils/business-scope.js`, `server/services/**`, `server/migrations/**`, `server/jobs/**`, `src/app/core/services/taxonomy-store.service.ts`, `src/app/core/services/master-push.service.ts`
- Users lose if broken: one kitchen's products or prices show up in another kitchen's lists, the owner and staff end up on different copies, or a master update overwrites a kitchen's own edit.
- Test: server/test/invariants.test.js "INV-2 …"
```

Who loses what with the change (goes in ADR 0023 Consequences): the never-built "per-user override of shared
data" (ADR 0008 D1, plan 386 retired) is dropped — a staff member can't keep private changes; owner and staff
always see the same copy (spec 01.1 minimal version, Part 4).

### 2. Migration 0006 output (dry run)
```
[migrate] users without a business: <n>  → businesses to create: <n>
[migrate]   <userId> → "העסק של <name>"  isPlatformAdmin=<bool>
[migrate] <collection>: businessId missing <n> (master <m>) · createdBy missing <k> · orphans <o>
[migrate] DRY RUN — nothing written.
```
Collections = `ALL_USER_ENTITY_TYPES` from `server/constants/all-user-entity-types.js` (suppliers, products,
recipes, dishes, equipment, venues, menuEvents, VERSION_HISTORY, activity_log, taxonomyTerms,
DICTIONARY_OVERRIDES) — so a later collection is covered automatically. Purged stubs are stamped like any doc.
`DICTIONARY_OVERRIDES` `userId: '__global__'` is skipped. The `users` collection is updated through the native
driver (`db.collection('users')`).

## Technical Considerations
- Dependencies: `server/services/master-version.js` (`getMasterVersion`) for the new business's
  `lastSyncedMasterVersion`; `server/generated/schemas` (built by `pretest`).
- New files: `shared/schemas/entities/business.schema.ts`, `server/utils/business-scope.js`,
  `server/services/business.js`, `server/migrations/0006-business-tenant.js`, four test files, ADR 0023.
- Model changes: `baseDocShape` + `tombstoneSchema` (optional fields), `businessSchema`, User model fields.
- Backend / API: no new route. Responses of signup/login/guest gain three user fields; the access token gains
  three claims (old clients ignore them).
- Auth and validation: `requirePlatformAdmin` added (same behavior as `requireAdmin` today); POST/PUT strip the
  new reserved fields; the business doc is Zod-validated.
- Security surface: the token now carries `businessId` (not secret; signed). Clients can't spoof
  `businessId`/`createdBy` (stripped). The migration reads `server/.env` through `_connect.js` and never prints a
  URI.
- Data / migration: 0006 as above; rollback in Execution Notes.
- Project checks: log-query Done-when present; chef-side stories; no dictionary keys; no UI.

## Backend Impact
- Collections affected: suppliers, products, recipes, dishes, equipment, venues, menuEvents, VERSION_HISTORY,
  activity_log, taxonomyTerms, DICTIONARY_OVERRIDES (per-user docs), users.
- New collections: yes — `businesses` (one doc per business; owned by the dedicated `/api/v1/business` router from
  plan 425, never reachable through the generic `/api/v1/data/:type` pipe, so it is not added to `COLLECTIONS`).
- Server changes needed: yes — schemas, user model, scope helper, stamping in generic.js, clone/sync/seed,
  auth tokens, `requirePlatformAdmin`, migration 0006.

## Out of Scope
- Switching any read or write filter from `userId` to `businessId`, new indexes led by `businessId`, sync per
  business, the business router, NO_BUSINESS / USER_REMOVED blocks, admin route changes (plan 425).
- Business name at signup, client user state, platform-admin-only screens (plan 426).
- Permission checks (plan 427), team (plan 428), business settings (plan 429), baseline (plan 431).
- Real join dates for pre-migration users: their `createdAt` and their business's `createdAt` = the migration time.
- Dropping the legacy `role` field from user documents.

## Critical Questions
None — product defaults are locked in the brief's Part 4; INV-1 / INV-2 changes approved by Dandan 2026-10-20.
