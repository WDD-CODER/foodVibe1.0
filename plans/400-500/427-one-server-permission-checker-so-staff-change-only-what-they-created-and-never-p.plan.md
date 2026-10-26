# Plan 427 — One server permission checker so staff change only what they created and never prices

Status: done
Track: code
Snapshot: 8ffda3d2c4d8f3ab5137bfee30e9d80026d28110

## Problem Statement
Spec 01.2 (team and permissions), server half. After plan 425 every member of a business can do everything
inside it: `server/routes/generic.js` checks only that a document belongs to the caller's business. There is
no permission checker (`server/utils/can-write.js` from the old INV-1 never existed), no list of money fields,
and nothing stops a staff member from changing a price, deleting the owner's recipe, or editing event and
serving types.

This plan adds the one central checker from contract C-PERM — `server/utils/permissions.js` with `can` /
`assertCan` — and the money-field list `shared/schemas/money-fields.ts`, and wires them into every generic
write route. Owners keep every right in their business; staff create anything, change and delete only what they
created, never touch money fields or event/serving types. Staff accounts are created by plan 428; until then
every user is an owner, so nothing changes for anyone today — the rules are proven by tests.

## Goals & Success Criteria
- Primary: every generic write by a staff member is decided by `can()`; a denied write returns 403
  `{ error: 'FORBIDDEN', messageKey: 'no_permission' }` and changes nothing.
- Success:
  - [x] [auto] `npm --prefix server test` passes, including the new tests:
    - `server/test/permissions.test.js` (unit, `can`): owner → `{ ok: true }` for all 10 actions on a doc of
      his business; any role on another business's doc → `{ ok: false, reason: 'OTHER_BUSINESS' }`; a
      `businessId: '__master__'` doc → ok only for `isPlatformAdmin`; staff: `create` ok; `edit` / `delete` ok
      only when `doc.createdBy === user.userId` (else `NOT_CREATOR`); `editMoney`, `manageTeam`,
      `editSettings`, `editTaxonomy` → `{ ok: false, reason: 'OWNER_ONLY' }`; `changeStage` ok only on a
      `menuEvents` doc he created; `addNote` / `markArrival` ok on any `menuEvents` doc of his business; a user
      without `businessRole` → `NO_ROLE`; an unknown action → `UNKNOWN_ACTION`; no `doc`: owner `manageTeam` / `editSettings` → ok, staff → `OWNER_ONLY`;
    - same file (`stripMoneyFields`, `moneyFieldsChanged`): `stripMoneyFields('products', { sources: [{
      supplierId: 's1', price: 5 }], purchaseOptions: [{ unitSymbol: 'box', conversionRate: 10, priceOverride:
      30 }] })` → `{ sources: [{ supplierId: 's1' }], purchaseOptions: [{ unitSymbol: 'box', conversionRate: 10
      }] }`; `moneyFieldsChanged('products', before, after)` is true when a price changes, is added or is
      removed with its source, false when only `nameHebrew` changes or a source without a price is added;
      `menuEvents` `pricePerGuest` 200 → 210 → true;
    - `server/test/permissions-api.test.js` (routes, owner + staff tokens of one business): staff `PUT` and
      `DELETE` on the owner's recipe → 403 with the body above, recipe unchanged in Mongo; staff creates, edits
      and deletes his own recipe → 201 / 200 / 200; staff `POST /products` with `sources[0].price: 5` → 201 and
      the stored product has no `price`; staff `PUT` on his own product changing `sources[0].price` → 403, stored
      price unchanged; the same `PUT` changing only `nameHebrew` → 200; owner `PUT` changing the price → 200;
      staff `POST /taxonomyTerms` kind `eventType` or `menuType` → 403, kind `ingredientCategory` → 201; staff
      `PUT` on the owner's `ingredientCategory` term → 403; staff `PUT /:id/restore` on the owner's deleted
      recipe → 403; staff `restore-all` and `DELETE /trash` touch only items he created; staff `DELETE /bulk`
      with one own + one owner id → 403, nothing deleted; staff writes to `VERSION_HISTORY`, `activity_log`,
      `DICTIONARY_OVERRIDES` → allowed; a member of another business still gets 404 (scope before permission);
    - `server/test/invariants.test.js`: new `INV-1 staff …` cases — staff edits his own item; staff can't edit
      or delete the owner's item (403, unchanged); staff can't change a product price (403); owner can.
  - [x] [auto] `npx ng build` passes.
  - [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
  - [x] [auto] `grep -n "assertCan" server/routes/generic.js` lists the POST `/:type`, PUT `/:type/:id`, DELETE
    `/:type/:id`, DELETE `/:type/bulk`, PUT `/:type/:id/restore` handlers (≥ 5 lines).

## Execution Mode
- Parallel: no — must not run alongside any plan that edits `server/routes/generic.js` or `shared/schemas/**`.
- Concurrent plans: none of the above; lane wt-1 only.
- Isolated DB: no — no data is written or reshaped; server tests use their in-memory DB.

## Execution Notes
- MVP run mode: executed unattended into branch `mvp` per `docs/mvp/run-mode.md` — Atlas steps are rehearsed on a
  scratch copy and deferred to the final gate; [human] items become validation cards in `docs/mvp/runs/427.md`.
- Depends on: plan 425 merged (business scope, `businessRole` in the token, test helpers that default
  `businessRole: 'owner'`).
- Must not run at the same time as: any plan that edits `server/routes/generic.js` or `shared/schemas/**` —
  today 436, 438, 440, 442, 443, 445, 446 (run `node scripts/scope-check.mjs --overlap --plan=<this>` at take time).
- Later plans call this checker instead of inventing role checks: 428 (team, `manageTeam`; client mirror
  `permission.service.ts`), 429 (`editSettings`), 442 (`changeStage`, `addNote`), 445 (`editMoney`), 446
  (`markArrival`, `editMoney`). Each plan that adds a money field appends it to `MONEY_FIELDS`.
- No user-visible change until plan 428 creates staff accounts.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/money-fields.ts
shared/schemas/index.ts
server/utils/permissions.js
server/routes/generic.js
server/test/**
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — implements ADR 0023: every generic write is authorized through `server/utils/permissions.js`
  (`can` / `assertCan`), exactly as the rewritten rule says; owner rights unchanged.
- INV-2: preserves — implements ADR 0023: scoping by business is untouched; permission runs after the scope filter.
- INV-3: preserves — term renames and cascades stay one server request; a denied rename is refused before any
  document changes.
- INV-4: preserves — the money-field list lives in `shared/schemas/money-fields.ts`; the server still validates
  every write against the Zod schemas.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check by symbol: `scopeFilter`, `readScope`,
`MASTER_BUSINESS_ID` (`business-scope.js`); in generic.js the POST `/:type`, PUT `/:type/:id` (the `current` /
`merged` / `rekeyed` block), DELETE `/:type/:id`, DELETE `/:type/bulk`, PUT `/:type/:id/restore`, PUT
`/:type/trash/restore-all`, DELETE `/:type/trash` handlers and `TAXONOMY`; `signTestToken` defaults in
`server/test/helpers/app.js`; `SCHEMA_BY_COLLECTION` export path in `shared/schemas/index.ts`. Print `ok` or
`conflict: <what>` per commit.

## Contracts (verbatim from the approved MVP map)

**C-PERM (427; client mirror 428)**
- `server/utils/permissions.js`: `can(user, action, { type, doc?, patch? }) → { ok: true } | { ok: false, reason }` and `assertCan(req, res, action, ctx)` → sends 403 `{ error: 'FORBIDDEN', messageKey: 'no_permission' }` (Hebrew "אין לך הרשאה לפעולה הזו").
- Actions: `create`, `edit`, `delete`, `editMoney`, `changeStage`, `addNote`, `markArrival`, `manageTeam`, `editSettings`, `editTaxonomy`.
- Rules: owner → all in own business. Staff → create all entity types; edit/delete only `doc.createdBy === user.userId`; `editMoney`, `manageTeam`, `editSettings`, `editTaxonomy` (eventType, menuType, station) never; `changeStage` only on events they created; `addNote`, `markArrival` on any event. A staff-created product is saved with money fields stripped.
- Money fields: `shared/schemas/money-fields.ts` exports `MONEY_FIELDS: Record<type, string[]>` — products: `sources[].price`, `purchaseOptions[].priceOverride`; menuEvents: `pricePerGuest`, `extraCosts`, `targetsOverride`, `deposit`, `closing.suppliers[].actualPaid`, `closing.actualExtraCosts`, `closing.actualRevenue`; businesses: `settings`, `baseline`. Later plans that add a money field append it here.
- Client: `src/app/core/services/permission.service.ts` `can(action, ctx): boolean` (computed from user signal); UI hides/locks by the same rules; server decides.
- Before 427 merges: every signed-in user counts as owner.

**C-USER (424/425/426)** — the fields this plan reads
- User fields added: `businessId: string`, `businessRole: 'owner' | 'staff'`, `isPlatformAdmin: boolean` (migration: `true` where `role === 'admin'`), `removedAt?: number` (staff removed → login blocked), `createdAt: number`. `role` stays read-only legacy until 426 removes client use.
- JWT access payload: `{ userId, name, businessId, businessRole, isPlatformAdmin }` (15m). Refresh unchanged `{ userId }`.

How this plan applies them (extensions, all inside the contract's rules):
- Every rule is checked against a doc of the caller's own business; a doc with `businessId: '__master__'` is
  writable only by a platform admin (`MASTER_ONLY`); a doc of another business → `OTHER_BUSINESS` (routes never
  reach this — the scope filter returns 404 first).
- No `doc` in `ctx` (business-level actions such as `manageTeam` / `editSettings` from plans 428, 429, 431, or a
  route-level `editMoney` check from plan 432): the master / other-business checks are skipped (the caller's own
  business is implied) and only the role rules run.
- `can` evaluates master/other-business first (when `doc` is given), then: `businessRole === 'owner'` → ok; `'staff'` → the staff
  rules; anything else → `NO_ROLE` (deny by default).
- "Edit/delete only what they created" also covers Trash: restoring one item = `delete` on that item;
  `restore-all` and empty-Trash for staff are limited to `createdBy: user.userId`.
- System collections `VERSION_HISTORY`, `activity_log`, `DICTIONARY_OVERRIDES` are written by the app on every
  member's behalf (history, activity, translation keys) and are not checked per creator.
- Locked taxonomy kinds (`editTaxonomy`): `eventType`, `menuType`, `station` (station arrives with plan 436).
  Other kinds follow `create` / `edit` / `delete`.
- Staff `PUT` that changes a money field → `editMoney` denied (403, nothing saved). Staff `POST` → money fields
  stripped, saved without price (spec: "a product a staff member creates is saved without price").
- Denials are logged `req.log.warn({ event: 'permission.denied', action, type, reason })`.

## User Stories
- As a chef who owns the business, I want only me to change prices, settings and event types so that my
  margins stay as I set them.
- As a cook on the team, I want to create and fix my own recipes and products so that I can work without
  waiting for the owner.
- As a chef who owns the business, I want my own recipes safe from accidental edits by staff so that a dish
  never changes without me knowing.

## Functional Requirements

### Must Have (P0)
- [ ] `server/utils/permissions.js` with `can`, `assertCan`, `stripMoneyFields`, `moneyFieldsChanged`,
      `LOCKED_TAXONOMY_KINDS`, `SYSTEM_TYPES`.
- [ ] `shared/schemas/money-fields.ts` with the contract list, exported from `shared/schemas/index.ts`.
- [ ] POST: `create` (or `editTaxonomy` for locked kinds); staff body money-stripped.
- [ ] PUT `/:type/:id`: `edit` on the stored doc (or `editTaxonomy`); staff money change → `editMoney` 403.
- [ ] DELETE `/:type/:id` (incl. `?permanent=true`), DELETE `/bulk` (every id), restore: `delete` on each doc.
- [ ] Staff `restore-all` / empty Trash limited to own items.
- [ ] Unit + route + INV-1 tests listed in Goals.

## UI/UX Notes
- No UI in this plan. The message key `no_permission` («אין לך הרשאה לפעולה הזו») is added to `dictionary.json`
  by plan 428, which builds the client side; nobody can be denied before 428 creates staff.

## Atomic Sub-tasks
- [x] P1: Write down once which fields hold money — new money-fields.ts: `export const MONEY_FIELDS: Record<string, readonly string[]>` with exactly the contract's paths for products, menuEvents, businesses, and a comment "later plans append here"; re-export from shared/schemas/index.ts — shared/schemas/money-fields.ts, shared/schemas/index.ts
- [x] P2: Add the one checker that decides what owners and staff may do — new server/utils/permissions.js (CommonJS; `MONEY_FIELDS` from `../generated/schemas/money-fields`, `MASTER_BUSINESS_ID` from `./business-scope`): `can(user, action, { type, doc, patch })` per the contract + the extensions above; `assertCan(req, res, action, ctx)` → `true`, or logs `permission.denied`, sends 403 `{ error: 'FORBIDDEN', messageKey: 'no_permission' }` and returns `false`; `valuesAt(doc, path)` (supports `a`, `a.b`, `a[].b`, `a.b[].c`; returns defined values only); `stripMoneyFields(type, body)` (deep copy, deletes each path); `moneyFieldsChanged(type, before, after)` (compares `JSON.stringify(valuesAt(...))` per path); `LOCKED_TAXONOMY_KINDS = ['eventType', 'menuType', 'station']`; `SYSTEM_TYPES = ['VERSION_HISTORY', 'activity_log', 'DICTIONARY_OVERRIDES']`; unit tests — server/utils/permissions.js, server/test/permissions.test.js
- [x] P3: Check permission on every create and edit — generic.js POST `/:type`: skip `SYSTEM_TYPES`; action = locked taxonomy kind ? `editTaxonomy` : `create`; `assertCan` before the insert; staff → `stripMoneyFields`; PUT `/:type/:id`: after `current` is loaded and before the write, action = (taxonomy and `LOCKED_TAXONOMY_KINDS.includes(current.kind)`) ? `editTaxonomy` : `edit` with `doc: current`; then, when `moneyFieldsChanged(type, current, merged)`, `assertCan(..., 'editMoney', ...)`; master-term writes by a platform admin pass through `can`'s master rule — server/routes/generic.js
- [x] P4: Check permission on every delete and restore; staff Trash actions touch only their items — DELETE `/:type/:id` (both soft and `?permanent=true`, incl. terms): `delete` (or `editTaxonomy`) on `existing`; DELETE `/:type/bulk`: load the scoped docs for `ids`, `assertCan` each, any denial → 403 and nothing deleted; PUT `/:type/:id/restore`: load the scoped doc in Trash, `delete` on it, then unset; PUT `/:type/trash/restore-all` and DELETE `/:type/trash`: staff filter adds `createdBy: req.user.userId`; `SYSTEM_TYPES` skip all checks — server/routes/generic.js
- [x] P5: Prove the rules through the real routes and the ownership invariant — new server/test/permissions-api.test.js (owner + staff tokens via `signTestToken({ userId, businessId: 'b1', businessRole })`, seeds via `stored()` with `createdBy`); invariants.test.js `INV-1 staff …` cases (Goals) — server/test/permissions-api.test.js, server/test/invariants.test.js
- [x] P6: Build, test and check the logs — `npx ng build`, `npm --prefix server test`, `node scripts/log-query.mjs --since=plan-start --level=error`, the `assertCan` grep — this plan file

## Technical Considerations
- Dependencies: plan 425 (`business-scope.js`, token fields, test helper defaults); `server/generated/schemas`
  (built by `pretest` / `build:schemas` — `money-fields.ts` compiles because `shared/schemas/tsconfig.cjs.json`
  includes `./**/*.ts`).
- New files: `shared/schemas/money-fields.ts`, `server/utils/permissions.js`, two test files.
- Model changes: none to entity schemas.
- Backend / API: no new route; generic write routes can now answer 403 `{ error: 'FORBIDDEN', messageKey:
  'no_permission' }`.
- Auth and validation: permission runs after `verifyToken` and the scope lookup (404 for other businesses stays)
  and before any write; the platform-admin routes (`requirePlatformAdmin`) are unchanged.
- Security surface: new authorization layer on every generic write — review every write handler; deny by
  default for an unknown role or action. Pre-commit secret scan and the CI security workflow are the gates.
- Data / migration: none.
- Project checks: log-query Done-when present; chef-side stories; no dictionary key in this plan (428 adds
  `no_permission`); no UI.

## Backend Impact
- Collections affected: products, recipes, dishes, suppliers, equipment, venues, menuEvents, taxonomyTerms
  (writes now permission-checked); VERSION_HISTORY, activity_log, DICTIONARY_OVERRIDES exempt.
- New collections: no.
- Server changes needed: yes — `server/utils/permissions.js`, checks in every generic write route.

## Out of Scope
- Creating / removing staff, the Team tab, client `PermissionService`, hiding buttons and locking price fields
  in the UI, the `no_permission` dictionary key (plan 428).
- Business settings route (`editSettings`, plan 429); stage changes, notes, arrival marks (plans 442, 446) —
  the actions exist and are unit-tested here, the routes come later.
- Money fields outside the contract list (e.g. a menu item's `sellPrice`) — a later plan appends them if Dandan
  wants them locked.
- Platform-admin routes (push-to-master, AI models, admin users) — they keep `requirePlatformAdmin`.

## Critical Questions
None — the rules are spec 01.2 as locked in the brief's Part 4 and contract C-PERM.
