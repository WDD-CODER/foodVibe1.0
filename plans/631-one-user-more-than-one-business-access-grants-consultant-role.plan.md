# Plan 631 — One user, more than one business: access grants, the active business and the consultant role

Status: draft
Depends-on: 616
Snapshot: e916e48e3943a650ba9767ebb4023d20e823ae8d

## Problem Statement
A consultant cannot work inside the kitchens he advises, and the platform admin cannot look inside a business to help
it: a user has exactly one `businessId`, and the access token carries only that one (ADR 0023). Dandan decided (brief
Part 0.5, D11–D14) that one user may have access to more than one business and switch between them, that a consultant
acting in a client's business may do what the owner does except the team and the business settings, and that the
platform admin enters any business through the same mechanism. This plan builds the server side (spec MP-10, Contract
C-ACCESS) and writes the rule change down (ADR 0032, INV-1). The screens are plan 632.

This plan changes architecture invariant INV-1. Human gate G1 (`approve arch change INV-1`, typed to the Planner) and
gate G2 (Dandan reads the ADR text and the new INV-1 sentence below) come before the plan is saved.

Verified on `origin/main` (e916e48e, 2026-11-17):
- `server/routes/auth.js` (464 lines): `signAccess(user)` at line 81 is synchronous and is "the one place an access
  token is signed"; payload = `userId, name, businessId, businessRole, isPlatformAdmin` (lines 82–88). It is called at
  lines 213 (`/signup`), 294 (`/login`), 344 (`/refresh`) and 439 (`/guest`). `toPublicUser(user)` (line 93) copies
  `businessId` and `businessRole` from the user document. `blockedReason(user)` (line 107) reads the user's own
  `businessId` and `removedAt`. Refresh tokens are signed apart with `{ userId }` only (lines 214, 295, 346, 440).
- `/refresh` (line 322) reads the user by id, signs a new access token and starts a master sync for `user.businessId`
  without waiting for it (lines 360–370). The browser calls it every 13 minutes (`REFRESH_INTERVAL_MS` in
  `src/app/core/services/user.service.ts:17`) and after any 401.
- `/guest` (line 423) answers only on localhost and upserts the user `dev-guest` with `isPlatformAdmin: true`
  (line 433); it never touches any other field of that user.
- `/accept-terms` (line 385) answers `toPublicUser(updated)` from the user document.
- `server/middleware/auth.js` (109 lines): `attachUser(req, res, token)` (line 42) is synchronous, sets `req.user` to
  the decoded payload, refuses a payload without `businessId` (line 45), and calls `recordUsage(req, res)` (line 48).
  `verifyToken` (line 60) and `optionalToken` (line 85) both call it and answer 401
  `{ error: 'Invalid or expired token' }` on any throw. `verifyAccessToken(req)` (line 23) returns the payload or
  `null` and never answers.
- `verifyAccessToken` has two callers: `server/middleware/write-limit.js:17` (bucket key `user:<userId>`) and
  `server/routes/log.js:28` (`lenientUser`). `log.js` passes only `userId` to the log sink (line 46); a client log
  record has no `businessId` field at all.
- `server/middleware/usage.js` (78 lines): `recordUsage` (line 54) writes one `usageDays` document per user and day
  with the token's `businessId` (`$setOnInsert`, line 45).
- `server/utils/permissions.js` (167 lines): 13 `ACTIONS` (lines 13–17); `can()` (line 39) refuses a document of
  another business (`OTHER_BUSINESS`, line 44), lets `businessRole === 'owner'` do everything (line 46) and refuses any
  role that is neither owner nor staff with `NO_ROLE` (line 47).
- Server code that reads the role outside `can()`: `server/routes/generic.js:125` and `:577`,
  `server/routes/clients.js:140`, `server/utils/event-visibility.js:18` — all test `=== 'staff'`, so any other role
  reads like the owner. One place tests `=== 'owner'`: `trashOwnerFilter` (`server/routes/generic.js:180–186`), used by
  `PUT /:type/trash/restore-all` (line 426) and `DELETE /:type/trash` (line 1357). For a role that is neither owner
  nor staff it calls `assertCan(req, res, 'delete', {})` and returns `null`; when that check passes no answer is ever
  sent. With a consultant role that request would hang, so this plan changes that one line.
- `server/models/user.model.js` (32 lines): `businessId` (line 17), `businessRole` enum `['owner', 'staff']`
  (line 18). No `activeBusinessId`.
- `server/routes/business.js` (391 lines) has 12 routes; the table under Must Have maps each of them.
- `server/utils/actor.js`: `actorOf(req)` returns `{ userId: req.user.userId, name: req.user.name }`.
  `server/utils/business-scope.js`: `scopeFilter(req)` and `stampNew(req, doc)` read `req.user.businessId` and
  `req.user.userId`. Neither needs a change: the token's `businessId` becomes the active business.
- `server/test/helpers/app.js`: `signTestToken(payload)` signs whatever it is given, with no `acting` by default, so
  every existing test keeps a home session. `server/test/invariants.test.js` (282 lines) has the "INV-1 …" tests in
  `describe('INV-1 Ownership')` (line 76) and `describe('INV-1 guest door')` (line 195).
- Not on `origin/main` yet, created by wave 0 (merged before this plan starts): the empty router
  `server/routes/access.js` mounted at `/api/v1/access`, `shared/schemas/entities/business-access.schema.ts`, the
  collection `businessAccess` with its full unique index `{ userId, businessId, revokedAt }` in `server/db.js`, `server/middleware/require-module.js`
  (`requireHomeModule` already reads `req.user.homeBusinessId ?? req.user.businessId`), `shared/schemas/modules.ts`.

## Goals & Success Criteria
**Primary:** a user with a live grant switches into a client's business and works there with the owner's rights minus
the team and the business settings; the platform admin enters any business the same way; a removed grant stops the
session on its very next request; every stamp keeps the real person.

- [auto] `pnpm run test:server` passes, including `server/test/access.test.js`: `resolveSession` (home, live grant, platform admin, stale active business cleared), `POST /api/v1/auth/switch-business` (granted → token with `businessId` = the client's business, `businessRole: 'consultant'`, `homeBusinessId`, `acting: 'consultant'`; `null` → home; no grant → 403 `NO_ACCESS` and `users.activeBusinessId` unchanged; platform admin → `businessRole: 'owner'`, `acting: 'platform'`; unknown business and `'__master__'` → 403 `NO_ACCESS`), `/refresh` keeps the active business and lands at home after the grant is removed, the grant routes, `GET /api/v1/access/businesses`.
- [auto] `pnpm run test:server` passes, including `server/test/access-acting.test.js`: every row of the business-route table (consultant allowed / denied), a removed grant answers 401 `{ error: 'ACCESS_ENDED' }` on the next request, a forged `acting` token without a grant answers 401, an acting request writes no `usageDays` document, the write-limit key of an acting token is `user:<real userId>`, `POST /api/v1/log` with an acting token whose grant was removed answers 202 with the real `userId`, a home token runs zero acting checks, the consultant's Trash routes answer.
- [auto] `pnpm run test:server` passes, including `server/test/invariants.test.js`, including the new "INV-1 consultant …" and "INV-1 platform admin acting …" tests: a consultant with a grant to business A reads A's recipes and gets 403 on A's team and settings routes; the same user gets nothing of business C; a document he creates in A carries his own `createdBy` and A's `businessId`.
- [auto] `pnpm run test:server` passes, including `server/test/permissions.test.js`, including: consultant may do 11 actions, is refused `manageTeam` and `editSettings` with reason `CONSULTANT_DENIED`, is refused a document of another business (`OTHER_BUSINESS`) and a master document (`MASTER_ONLY`).
- [auto] `pnpm run test:server` → exit 0 with the whole existing suite green and no existing assertion weakened, including `server/test/auth-business.test.js`.
- [auto] `pnpm --dir server run lint` → exit 0.
- [auto] `node scripts/breadcrumbs-check.mjs` → `BREADCRUMBS: clean`.
- [auto] `node scripts/reuse-lint.mjs --check-registry` → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Dandan reads `docs/brain/decisions/0032-one-user-more-than-one-business.md` and the INV-1 section of `docs/brain/invariants.md` on the branch and confirms they say what he approved at gate G2.

## Execution Mode
- Parallel: no — the map's must-not-run list: 631 edits `server/middleware/auth.js`, `server/routes/auth.js`, `server/utils/permissions.js`, `server/middleware/usage.js`, `server/test/invariants.test.js`, `docs/brain/invariants.md`; it is alone in run `mod-access-srv` and no other live run may touch those files. It also changes one line of `server/routes/generic.js` (a wave 0 registry file): no run that edits `server/routes/generic.js` may be live with it.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/services/access.js
server/routes/access.js
server/routes/auth.js
server/routes/business.js
server/routes/generic.js
server/middleware/auth.js
server/middleware/usage.js
server/utils/permissions.js
server/models/user.model.js
server/test/access.test.js
server/test/access-acting.test.js
server/test/invariants.test.js
server/test/permissions.test.js
server/test/auth-business.test.js
docs/brain/invariants.md
docs/brain/decisions/0032-one-user-more-than-one-business.md
docs/brain/component-families.md
docs/agent/standards-backend.md
server/breadcrumbs.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: changes — ADR docs/brain/decisions/0032-one-user-more-than-one-business.md — Arch-approved: Human 2026-11-17
- INV-2: preserves — the business is still the tenant and every scoped query still goes through `server/utils/business-scope.js`; `scopeFilter(req)` is unchanged and reads the token's `businessId`, which is now the active business the server resolved. `server/services/access.js` clones, syncs and copies nothing; `businessAccess` is server-only and never cloned.
- INV-3: preserves — the one changed line of `server/routes/generic.js` (the Trash filter) adds a role to an existing test; no rename, no cascade and no client loop is touched.

## ADR 0032 and INV-1 text (gate G2 — the Human reads this before the plan is saved)

**(a) The full text of `docs/brain/decisions/0032-one-user-more-than-one-business.md`** (new file; the Planner sets
`date` and the approval date in the Context to the day of gate G1):

```markdown
---
status: accepted
date: 2026-11-17
review-by: 2027-05-17
supersedes: 0023-business-is-the-tenant ("one business per user": the Users bullet, lines 27-29, and "The access token carries the business fields")
---

# 0032. One user, more than one business: access grants and an active business

## Context

ADR 0023 made the business the tenant and gave every user exactly one business: `users.businessId`, copied into the
access token, scopes every read and write (INV-1, INV-2). Two people need more than that. A consultant advises several
kitchens and has to work inside each of them: read the invoices, fix prices, build recipes. The platform admin has to
look inside a business to help it. Until now the only way was to share the owner's password. The Human approved
changing INV-1 for this on 2026-11-17 (`approve arch change INV-1`).

## Decision

- A user still has one **home** business (`users.businessId`, `users.businessRole`), exactly as in ADR 0023. Nothing
  about home membership changes.
- A user may also hold **access grants**: rows of the server-only collection `businessAccess`
  (`userId`, `businessId`, `role: 'consultant'`, who granted it and when, who removed it and when). Only the platform
  admin creates a grant. The platform admin or the owner of that business removes it. A removed grant is kept as a row
  with `revokedAt`; one live grant per user and business.
- A user has one **active** business at a time (`users.activeBusinessId`; absent = home). `server/services/access.js`
  `resolveSession(user)` is the one place that decides where a session is: home; a business the user holds a live
  grant for (role `consultant`); or, for a platform admin, any business (role `owner`, marked `acting: 'platform'`).
  Anything else falls back to home and clears the stored value.
- The access token is still signed in one place (`signAccess` in `server/routes/auth.js`) and still carries one
  `businessId`: the **active** business. It also carries `homeBusinessId` and, away from home, `acting`
  (`'consultant'` or `'platform'`). Every existing scoped query keeps working unchanged, because it reads the same
  field. The business is never taken from a request body, a query string or a header.
- `POST /api/v1/auth/switch-business` changes the active business and signs a new token. It is refused (403
  `NO_ACCESS`) without a live grant, unless the caller is the platform admin.
- While a token is `acting`, `verifyToken` checks on every request that the grant is still live (or that the user is
  still the platform admin). A session whose grant was removed is refused on its very next request (401
  `ACCESS_ENDED`), and the next refresh signs a home token.
- A **consultant** may do everything the owner may in that business, except manage the team and change the business
  settings (`CONSULTANT_DENIED` in `server/utils/permissions.js`). The platform admin acting in a business has the
  owner's rights there. What only the platform admin sets from outside (modules, AI cap, private mode, front desk
  status) stays outside.
- Every stamp keeps the real person: `createdBy` and `actorOf(req)` are the user's own id and name, never the
  owner's. `businessId` on a created item is the active business.
- An acting session is not the business's own activity: `usageDays` is not written for it. AI usage is still charged
  to the business the call was made in.

## Rejected

- A second account per business for the same person: several passwords, and the stamps no longer say who did the work.
- Sending the business in a header or a body field on each request: every route would have to check it, and one
  missed check would open another kitchen. The business stays in the token the server signed.
- Making the consultant a staff member of each client business: staff cannot change prices, which is the consultant's
  job, and a user document holds one business.
- Trusting the token until it expires (15 minutes) after a grant is removed: an owner who removes access expects it
  to end now.

## Consequences

- INV-1 gains one sentence: who may read and write a business, and where the business comes from. INV-2 is unchanged:
  the business is still the tenant and every scoped query still goes through `server/utils/business-scope.js`.
- An acting request costs one extra indexed read. A home request costs nothing extra.
- A user who logs in again lands in the business that was active last; the screen always says so (plan 632).
- A grant gives the owner's view of prices and clients. Granting is therefore the platform admin's act, logged with
  ids, and the owner sees the list of who has access and can remove anyone on it.
- `write-limit.js` and the client log route read the token without the grant re-check. Neither reads or writes
  business data: the write limit is counted against the real user, and a client log line carries the real user id.

## Review

Check whether any route takes a business from anywhere but the token, whether owners remove grants and what happens
to work in flight, and whether a consultant needs a right this ADR refuses (team, settings).
```

**(b) `docs/brain/invariants.md`, section `## INV-1 — Ownership`** (the five `- Field:` lines keep their shape; each
stays one line):

- `Rule:` — append this sentence at the end of the existing line, after "(ADR 0030).":

  ` A user reads and writes a business only as its member, as a consultant with a live access grant, or as the platform admin acting in it, and the business is always the one in the token the server signed, never one named by the request; a consultant may do what the owner may except manage the team and change the business settings, and a session acting outside the user's own business is re-checked on every request (ADR 0032).`

- `Source:` — add `ADR 0032 (plan 631)` after `ADR 0030 (plan 543)`, and `` `server/services/access.js` `` at the end.
- `Touches:` — add `` `server/services/access.js` `` and `` `server/routes/access.js` `` (wave 0 may already have
  added the second one; add only what is missing).
- `Users lose if broken:` — append: ` A consultant keeps reading or changing a kitchen after the owner removed his access, or changes its team or settings.`
- `Test:` — unchanged.

## Reuse Check

- `server/services/access.js` (`resolveSession`, `stillActing`, `liveGrant`, `canEnter`) — family: server-auth — rung: 3 — why: "who is calling and in which business" belongs to the server-auth family; the file is added to that family's `Use` line in `docs/brain/component-families.md`. No second token check is created: `decodeAccessToken` stays the one verify and `signAccess` the one sign.
- Role `consultant` in `can()` — family: server-auth — rung: 2 — why: one more branch in the existing permission checker, no new checker.
- Grant routes in `server/routes/access.js` — family: server-auth — rung: 2 — why: they authorise through `requirePlatformAdmin` and `assertCan`, scope through `scopeFilter` and stamp through `actorOf`.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a consultant, I want to switch into a client's kitchen with my own login so that I fix its prices and recipes without the owner's password.
- As a business owner, I want a consultant's access to end the moment it is removed so that nobody keeps reading my prices.
- As a business owner, I want my team and my business settings to stay mine so that an adviser cannot add people or change my targets.
- As the platform admin, I want to enter a business and see what its owner sees so that I can help when something looks wrong.
- As a chef, I want every change to carry the name of the person who made it so that I know when the consultant, not my staff, changed a recipe.

## Functional Requirements

### Must Have (P0)
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-ACCESS (631; used by 632, 633)**
  - `businessAccess` (server-only): `{ _id, userId, businessId, role: 'consultant', grantedBy, grantedByName,
    grantedAt, revokedAt?, revokedBy? }`; unique index `{ userId, businessId, revokedAt }` (a partial index cannot
    say "no `revokedAt`"; two live grants of one user in one business collide, removed ones differ by their time).
    `users` gain `activeBusinessId?`.
  - Token payload: `{ userId, name, businessId, businessRole, isPlatformAdmin, homeBusinessId, acting? }` —
    `businessId` is the **active** business, so every existing reader keeps working; `businessRole` is `owner`,
    `staff` or `consultant`; `acting` is `'consultant'` or `'platform'` and absent at home.
  - `server/services/access.js` → `resolveSession(user) → { businessId, businessRole, acting? }`: no active
    business or active = home → home; a live grant → `consultant`; a platform admin → `owner` with
    `acting: 'platform'`; anything else → home, and `activeBusinessId` is cleared. `signAccess` uses it; `/refresh`
    re-resolves.
  - `POST /api/v1/auth/switch-business` body `{ businessId: string | null }` → `{ token, user }`, or 403
    `NO_ACCESS`. `GET /api/v1/access/businesses` → `[{ businessId, name, role }]` for the signed-in user.
  - While `acting` is set, `verifyToken` re-resolves on every request (one indexed read); a session whose grant was
    removed gets 401 `{ error: 'ACCESS_ENDED' }` on its very next request (so the browser can tell it from an expired
    token) and the refresh lands at home.
  - While acting, the user object the server answers on login, refresh and switch also carries `homeModules` (the
    resolved modules of the home business): `GET /api/v1/business` answers the client's business then, and the browser
    needs the home modules for the diagnosis entry (C-MODULES). The token payload does not change.
  - `trashOwnerFilter` in `server/routes/generic.js` tests the role name `owner` directly; 631 changes that one test
    so a consultant's "restore all" and "empty Trash" answer like the owner's.
  - `permissions.js`: `consultant` may do everything the owner may, except `manageTeam` and `editSettings`
    (`CONSULTANT_DENIED`). Map every `server/routes/business.js` route to one of the two sides in the plan. The
    platform write (modules, cap, private, front desk status) stays platform admin only.
  - Grants: `POST /api/v1/access/grants` body `{ businessId, username }` — platform admin only; the user must
    exist, not be removed, and not already belong to that business; `DELETE /api/v1/access/grants/:id` — platform
    admin, or the owner of that business; `GET /api/v1/access/grants` — the owner's list for his business
    (`name`, `grantedAt`). Every grant and removal is logged with ids only.
  - Stamps keep the real person: `createdBy` and `actorOf(req)` are unchanged. `aiUsage` rows keep the active
    `businessId`. `recordUsage` (`server/middleware/usage.js`) skips a request whose token has `acting`.
  - `verifyAccessToken` (used by `server/middleware/write-limit.js` and `server/routes/log.js`) does not re-check a
    grant: the write limit is keyed by the real `userId`, and a log line sent by an acting session carries the real
    `userId`. Neither reads or writes business data, so a removed grant loses nothing there.
  - INV-1 rule gains one sentence (a user reads and writes a business only as its member, as a consultant with a
    live grant, or as the platform admin acting in it; the business is always taken from the token the server
    signed). ADR `docs/brain/decisions/0032-one-user-more-than-one-business.md` (amends ADR 0023's "one business
    per user"). `Touches` gains `server/services/access.js`, `server/routes/access.js`.
  - Browser: `UserService` exposes `homeBusinessId` and `acting`; `PermissionService.can` mirrors the consultant
    rule; a switch reloads the application state from the server.
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-MODULES (616, 620; used by 624, 631, 633)**
  - `shared/schemas/modules.ts`: `MODULE_KEYS = ['events', 'event_logistics', 'frontdesk', 'ai_create',
    'consultant_diag'] as const`; `DEFAULT_MODULES = ['events', 'event_logistics', 'frontdesk', 'ai_create']`;
    `modulesOf(business) → ModuleKey[]` — the stored list when the field is present, else `DEFAULT_MODULES`;
    `event_logistics` without `events` is dropped (logistics lives on an event); `hasModule(business, key)`.
  - `business.modules?: ModuleKey[]` (unique, ≤ 5). `business.platformHistory?` — ≤ 50 rows
    `{ at, by, byName, reason, changed: string[] }`. Both written only by the platform admin; a new business is
    created without `modules` (A1).
  - `server/middleware/require-module.js`: `requireModule(key | key[])` — after `verifyToken`; any one of the keys is
    enough; reads the business through `getBusiness`; a per-process cache of at most 30 s is allowed and is cleared
    by the platform write (and resettable in tests); answers 403 `{ error: 'MODULE_OFF', module }`.
    `requireHomeModule(key)` — the same test on `req.user.homeBusinessId ?? req.user.businessId` (C-ACCESS).
  - What each module covers:

    | Module | Server | Browser |
    |---|---|---|
    | `events` | `/api/v1/events/**`; generic types `menuEvents`, `venues` | header link `/menu-library`; chip group `menus`; the `venues` chip of the `dashboard` group; routes `menu-library`, `menu-intelligence`, `venues` |
    | `event_logistics` | `PUT /events/:id/logistics`, `PUT /events/:id/loading`, `/api/v1/ai/logistics/**` | the logistics panel and the loading sheet inside the event |
    | `frontdesk` | `/api/v1/requests/**`, `/bookings/**`, `/knowledge/**`; generic `requests`, `bookings`, `frontDeskProfiles`, `knowledgeItems`; `POST /business/front-desk-intake`; `POST /ai/knowledge-import`; `/stats/frontdesk`; the public router answers 404 for the business | chips `requests`, `bookings`, `knowledge`, `settings` of the `frontdesk` group; routes `requests`, `bookings`, `frontdesk/**` |
    | `events` or `frontdesk` | generic `clients`, `/api/v1/clients/**` | header link `/clients`, chip `clients`, routes `clients/**` |
    | `ai_create` | `POST /api/v1/ai/` `generate`, `parse-text`, `generate-from-url`, `generate-from-image`, `patch-recipe`, `generate-menu`, `patch-menu`, `generate-product`, `patch-product`, `generate-product-from-image`, `shots`, `shots/confirm`, `save-menu-shot` | every "create with AI" entry point (the buttons and the AI modals) |
    | `consultant_diag` | `/api/v1/diag/**`, `/api/v1/ai/diag/**` through `requireHomeModule` | the diagnosis entry in the acting banner / inventory group |

    Never gated: products, suppliers, equipment, recipes, dishes, cook view, taxonomy (all kinds stay readable),
    settings, team, Trash, `/stats/business`, `/stats/report`, `/api/v1/product-import/**`,
    `POST /ai/parse-price-list`, `parse-receipt-photo`, `match-product-names`, `/ai/invoices/**`, `/ai/voice/**`,
    `/ai/stock/**`, `/api/v1/stock/**`, `/api/v1/files/**`, every `/api/v1/admin/**` route.
  - The generic API gates by type in one place (`MODULE_OF_TYPE` in `shared/schemas/modules.ts`), before any read or
    write of that type.
  - Platform write: `PUT /api/v1/admin/businesses/:id/platform` body
    `{ modules?: ModuleKey[], aiMonthlyTokenCap?: number | null, aiPrivate?: boolean, reason: string (3–200) }` →
    writes the given fields, appends one `platformHistory` row, clears the module cache; `aiPrivate` goes through
    `setAiPrivate` (C-LEARN). `GET /api/v1/admin/businesses` rows gain `modules` (resolved), `aiPrivate`,
    `aiMonthlyTokenCap`, `aiTokensThisMonth` (C-AICAP).
  - Browser: `ModuleService` (`src/app/core/services/module.service.ts`) — `has(key)` computed from
    `BusinessService.business_()` with the same `modulesOf`; `moduleGuard(keys)` redirects to `/dashboard`; the header
    and the tab chips filter through it. The server gate is the gate; the browser only hides.
- [ ] **`server/services/access.js` (new).** Exports:
  - `liveGrant(userId, businessId)` → the live `businessAccess` row or `null`, queried with `revokedAt: null` (matches an absent value). Plan 615 registers a full unique index `{ userId, businessId, revokedAt }` on `businessAccess`: two live rows of one user and business collide, removed rows differ by their timestamp. A new grant is therefore inserted **without** `revokedAt`, and a removal sets it to `Date.now()`. This plan never edits `server/db.js`.
  - `resolveSession(user)` → `{ businessId, businessRole, acting? }`, exactly the C-ACCESS order: (1) no `activeBusinessId`, or it equals `user.businessId` → `{ businessId: user.businessId ?? null, businessRole: user.businessRole ?? null }` with **no database read**; (2) the business does not exist (`getBusiness`) → home; (3) a live grant → `{ businessId: active, businessRole: 'consultant', acting: 'consultant' }`; (4) `user.isPlatformAdmin === true` → `{ businessId: active, businessRole: 'owner', acting: 'platform' }`; (5) anything else → home. In cases (2) and (5) it also runs `User.updateOne({ _id }, { $set: { activeBusinessId: null } })`.
  - `canEnter(user, businessId)` → `'consultant' | 'platform' | null` — the same test without writing: the business exists, is not `'__master__'`, and the user holds a live grant or is the platform admin.
  - `stillActing(payload)` → boolean, **one indexed read**: `acting === 'consultant'` → a live grant exists for `(payload.userId, payload.businessId)`; `acting === 'platform'` → `User.findById(payload.userId)` is found, `isPlatformAdmin === true` and `removedAt` is empty; any other value → `false`. It counts its calls in a module variable read by `_actingChecksForTests()` and zeroed by `_resetActingChecksForTests()` (the `_resetUsageThrottle` precedent in `server/middleware/usage.js`).
  - `listEnterable(userId)` and the grant helpers the router needs (`createGrant`, `removeGrant`, `grantsOfBusiness`). The router holds no query of its own.
- [ ] **`server/models/user.model.js`:** add `activeBusinessId: { type: String, default: null }` with a comment naming plan 631. The `businessRole` enum stays `['owner', 'staff']`: `consultant` is a role of a session, never stored on a user.
- [ ] **`server/routes/auth.js`:**
  - `signAccess(user)` becomes `async` and returns `{ token, session }`; it calls `resolveSession(user)` and signs `{ userId, name, businessId: session.businessId, businessRole: session.businessRole, isPlatformAdmin, homeBusinessId: user.businessId ?? null, ...(session.acting && { acting: session.acting }) }`. It stays the only `jwt.sign(..., ACCESS_SECRET, ...)` in the server (a static test counts the occurrences in `server/routes` and `server/services`: exactly one).
  - `toPublicUser(user, session)` returns `businessId` and `businessRole` from the session, plus `homeBusinessId`, and, only while acting, `acting` and `homeModules` (`modulesOf(homeBusiness)` from `server/generated/schemas/modules`, one `getBusiness(user.businessId)` read). `homeModules` goes beyond the Contract: while acting, `GET /api/v1/business` returns the client's business, so the browser has no other way to know whether the user's home business has `consultant_diag` (plans 632 and 634 read it). The token payload is exactly the Contract's.
  - `/signup`, `/login`, `/refresh`, `/guest`: `const { token, session } = await signAccess(user)` and `toPublicUser(user, session)`. `blockedReason(user)` keeps reading the home fields. The master sync in `/login`, `/refresh` and `/guest` stays on the home business (`user.businessId`).
  - `/guest`: the upsert also sets `activeBusinessId: null`, so a new local guest session always starts at home (the guest is a platform admin and could otherwise wake up inside the last business it entered).
  - `/accept-terms`: answers `toPublicUser(updated, { businessId: req.user.businessId, businessRole: req.user.businessRole, acting: req.user.acting })`.
  - New `POST /switch-business` (`refreshLimiter`, `verifyToken`): body `{ businessId }` must be a string of 1–64 characters or `null`, else 400 `{ error: 'INVALID_BODY' }`. Reads the user by `req.user.userId`; missing → 401 `USER_NOT_FOUND`; `blockedReason` → 403 with that reason. `null` or the home id → `activeBusinessId: null`. Otherwise `canEnter(user, businessId)`; `null` → 403 `{ error: 'NO_ACCESS' }` and nothing is written. Then `User.updateOne` sets `activeBusinessId`, a new token is signed through `signAccess`, and the answer is `{ token, user }` (the refresh cookie is not touched). One info log `auth.switch_business` with `{ to: 'home' | 'consultant' | 'platform', businessId }`.
- [ ] **`server/middleware/auth.js`:** `attachUser` becomes `async`. After the token is decoded and the `NO_BUSINESS_IN_TOKEN` check: when `payload.acting` is set and `stillActing(payload)` is false, it throws an error marked `ACCESS_ENDED`. `verifyToken` and `optionalToken` await it: `ACCESS_ENDED` → 401 `{ error: 'ACCESS_ENDED' }`; a database error during the check → 503 `{ error: 'DB_UNAVAILABLE' }` (deny, never fall through to `next()`); every other failure → today's 401 `{ error: 'Invalid or expired token' }`. A token without `acting` takes today's path with no read. While acting, the request logger child also gets `acting` and `actingIn: businessId` (ids only). `verifyAccessToken` is not changed.
- [ ] **`server/middleware/usage.js`:** `recordUsage` returns at once when `req.user.acting` is set.
- [ ] **`server/utils/permissions.js`:** `const CONSULTANT_DENIED = new Set(['manageTeam', 'editSettings'])`, exported. In `can()`, right after the owner line: `if (user?.businessRole === 'consultant') return CONSULTANT_DENIED.has(action) ? deny('CONSULTANT_DENIED') : OK`. The document checks above it (`MASTER_ONLY`, `OTHER_BUSINESS`) run first, unchanged. The JSDoc of `can` and the file header name the third role.
- [ ] **`server/routes/generic.js`:** in `trashOwnerFilter` the owner line becomes `if (role === 'owner' || role === 'consultant') return {}`. Nothing else in the file changes.
- [ ] **Every route of `server/routes/business.js`, on one side of the consultant line** (the platform admin acting in a business has `businessRole: 'owner'`, so every row is "allowed" for him):

  | Route (line at the snapshot) | Check today | Consultant |
  |---|---|---|
  | `GET /` (36) | any member | **allowed** — returns the active business; this is how the browser reads the client's modules |
  | `PUT /settings` (48) | `editSettings` | **denied** 403 |
  | `PUT /name` (67) | `editSettings` | **denied** 403 |
  | `PUT /staff-visible-stages` (86) | `editSettings` | **denied** 403 |
  | `PUT /share-ai-examples` (105; removed by plan 618) | `editSettings` | **denied** 403 while it exists |
  | `PUT /logistics-hidden` (124) | `editSettings` | **denied** 403 |
  | `PUT /baseline` (143) | `editSettings` | **denied** 403 |
  | `POST /front-desk-intake` (188) | `editFrontDesk` | **allowed**, but the optional `baseline` part is written only for a caller who may `editSettings`; for a consultant the answer has `baseline: 'skipped'` and the stored baseline is unchanged |
  | `GET /setup-status` (275) | `editSettings` | **denied** 403 |
  | `GET /team` (313) | `manageTeam` | **denied** 403 |
  | `POST /team` (328) | `manageTeam` | **denied** 403 |
  | `DELETE /team/:userId` (371) | `manageTeam` | **denied** 403 |

  The rule is mechanical: a route that asks `editSettings` or `manageTeam` is on the denied side; `can()` does it, no route gets a role test of its own. The only code change in the file is the intake's baseline line: `if (hasBaselineValue(baseline) && can(req.user, 'editSettings', { type: 'businesses' }).ok)`.
- [ ] **`server/routes/access.js`** (the empty router of wave 0, mounted at `/api/v1/access`):
  - `GET /businesses` (`verifyToken`) → `[{ businessId, name, role }]` for the signed-in user: first the home business (`req.user.homeBusinessId ?? req.user.businessId`, `role` = the user's stored `businessRole`), then one row per live grant (`role: 'consultant'`), by name. A grant whose business no longer exists is left out.
  - `POST /grants` (`verifyToken`, `requirePlatformAdmin`, a limiter of 30 per 15 minutes keyed by user): body `{ businessId, username }`, both non-empty strings, else 400 `INVALID_BODY`. Business missing or `'__master__'` → 404 `BUSINESS_NOT_FOUND`. User not found by exact `name`, or `removedAt` set → 404 `USER_NOT_FOUND` (one answer for both). `user.businessId === businessId` → 409 `ALREADY_MEMBER`. A live grant exists, or the insert hits the unique index (code 11000) → 409 `ALREADY_GRANTED`. The row is `{ _id: newId(), userId, businessId, role: 'consultant', grantedBy, grantedByName, grantedAt }` with the actor from `actorOf(req)`, checked with `checkStoredDoc('businessAccess', row)` before the insert. Answers 201 `{ _id, userId, name, businessId, grantedAt }`. Log `access.grant.created` with `{ grantId, userId, businessId }`.
  - `DELETE /grants/:id` (`verifyToken`): the live grant by `_id`, else 404 `NOT_FOUND`. The platform admin may remove any grant. Anyone else: the grant must belong to `req.user.businessId`, else 404 `NOT_FOUND`; then `assertCan(req, res, 'manageTeam', { type: 'businesses' })` (owner yes; staff and consultant 403). Sets `revokedAt` and `revokedBy`. Answers `{ ok: true }`. Log `access.grant.removed` with `{ grantId, userId, businessId }`.
  - `GET /grants` (`verifyToken`): `assertCan(req, res, 'manageTeam', { type: 'businesses' })`, then the live grants of `scopeFilter(req).businessId` as `[{ _id, name, grantedAt }]`, newest first; `name` is the user's `removedName ?? name`; a grant whose user no longer exists is left out.
  - No log line of this file carries a username or a business name.
- [ ] **Tests** (real app on the in-memory database, `buildTestApp` / `signTestToken` / `testDb` of `server/test/helpers/app.js`; no secret, no model, no network):
  - `server/test/access.test.js` (new) — the cases of the first Done-when item. Users are created through `/api/v1/auth/signup` (the `signup` helper of `server/test/auth-business.test.js`, line 31), grants through the route with a platform-admin token, tokens are decoded with `jwt.decode`.
  - `server/test/access-acting.test.js` (new) — the cases of the second Done-when item. An acting token is `signTestToken({ userId, businessId: <client>, businessRole: 'consultant', homeBusinessId: <home>, acting: 'consultant' })` with a matching row inserted into `businessAccess`; for `acting: 'platform'` a `users` document with `isPlatformAdmin: true` is inserted. The usage test uses the `until` helper at the top of `server/test/usage-days.test.js` and `_resetUsageThrottle`. The static test reads `server/routes` and `server/services` and expects one `ACCESS_SECRET` sign.
  - `server/test/invariants.test.js` — new `describe('INV-1 consultant and acting admin')`, every test name starting `INV-1`: (1) a consultant with a live grant lists and creates recipes in business A — the stored document has `businessId: 'b_userA'` and `createdBy` = the consultant's id; (2) he gets 403 on `GET /api/v1/business/team` and `PUT /api/v1/business/settings`, and the business document is unchanged; (3) the same user with a forged acting token for business C (no grant) gets 401 and reads nothing; (4) after the grant row gets `revokedAt`, the very next request answers 401 `ACCESS_ENDED`; (5) a platform admin acting in A edits A's product price; a user who is not a platform admin with `acting: 'platform'` gets 401. `beforeEach` also empties `businessAccess` and `users`.
  - `server/test/permissions.test.js` — the consultant cases of the fourth Done-when item.
  - `server/test/auth-business.test.js` — the token-fields test also expects `homeBusinessId` equal to `businessId` and no `acting` after signup and login.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- No screen in this plan. The switcher, the banner, the owner's access list and the platform admin's controls are plan 632.
- No `dictionary.json` key. Error codes the browser will translate in 632: `NO_ACCESS`, `ACCESS_ENDED`, `USER_NOT_FOUND`, `ALREADY_MEMBER`, `ALREADY_GRANTED`, `BUSINESS_NOT_FOUND`.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Write the rule change down first so the code is built against the approved words — create the ADR from section (a) of the gate text, apply the four field edits of section (b) to INV-1; keep each field on one line — docs/brain/decisions/0032-one-user-more-than-one-business.md, docs/brain/invariants.md
- [x] A2: Teach the permission checker the consultant role and its two refusals — CONSULTANT_DENIED set and the branch after the owner line, exported; the Trash filter line so a consultant's Trash request gets an answer; consultant cases in the permission tests — server/utils/permissions.js, server/routes/generic.js, server/test/permissions.test.js
- [x] A3: Add the one service that decides which business a session is in — liveGrant, resolveSession (no read at home), canEnter, stillActing with its test counter, grant helpers; the active-business field on the user model; read the wave 0 index and schema first — server/services/access.js, server/models/user.model.js
- [x] A4: Sign every access token through that decision and let a user switch business — async signAccess returning token and session, the public user object with home and acting fields, the four existing callers, the guest reset, accept-terms, the new switch route; token-field test updated — server/routes/auth.js, server/test/auth-business.test.js
- [x] A5: Stop an acting session on the first request after its grant is removed — async attachUser, the ACCESS_ENDED answer, the 503 on a failed check, no read for a home token, acting ids on the request log; usage is not recorded for an acting request — server/middleware/auth.js, server/middleware/usage.js
- [x] A6: Add the grant routes and the list of businesses a user may enter — the three grant routes and the businesses list with their error codes, limiter and id-only logs — server/routes/access.js
- [x] A7: Keep the baseline out of a consultant's reach inside the onboarding save — the one condition on the baseline line; every row of the business-route table gets a test — server/routes/business.js, server/test/access-acting.test.js
- [x] A8: Prove the whole flow with tests, including the ownership invariant — the switch, refresh, grant and list cases; the acting, usage, write-limit and log cases; the new INV-1 tests — server/test/access.test.js, server/test/access-acting.test.js, server/test/invariants.test.js
- [x] A9: Record the new service, collection and routes where the next developer looks — a row for the access service in the server map, the businessAccess collection and the five routes in the backend standards, the service on the server-auth family line — server/breadcrumbs.md, docs/agent/standards-backend.md, docs/brain/component-families.md
- [ ] A10: Run every check and hand Dandan the one reading check — the Done-when commands in order; then the human card for the ADR and INV-1 text — no file

## Technical Considerations
- Dependencies: every route behind `verifyToken` / `optionalToken` (the middleware becomes asynchronous; a home token behaves exactly as today); `signTestToken` in `server/test/helpers/app.js` is not changed, so existing tests keep home sessions; `requireModule` (plan 616) reads the active business and `requireHomeModule` the home one.
- New files needed: `server/services/access.js`, `server/test/access.test.js`, `server/test/access-acting.test.js`, `docs/brain/decisions/0032-one-user-more-than-one-business.md`.
- Model changes: `users.activeBusinessId` (Mongoose model, optional, default `null`). Token payload gains `homeBusinessId` and optional `acting`; `businessRole` may be `consultant`. The public user object gains `homeBusinessId`, `acting?`, `homeModules?`.
- Backend / API: new `POST /api/v1/auth/switch-business`, `GET /api/v1/access/businesses`, `POST /api/v1/access/grants`, `DELETE /api/v1/access/grants/:id`, `GET /api/v1/access/grants`. Changed: `/signup`, `/login`, `/refresh`, `/guest`, `/accept-terms` answers (more fields); 401 `ACCESS_ENDED` from any authenticated route; `POST /api/v1/business/front-desk-intake` skips the baseline for a consultant.
- Auth and validation: grants are created by the platform admin only; removed by the platform admin or the owner of that business; listed by the owner. The switch needs a live grant or the platform admin flag. Bodies are checked by hand (two string fields) and the stored grant by its Zod schema (`checkStoredDoc`).
- Security surface: this is the tenant boundary. The business comes only from the signed token; an acting token is re-checked on every request; a failed re-check denies (401 or 503), never passes; `verifyAccessToken` callers neither read nor write business data; logs carry ids only. A token minted before a removal lives at most until its next request. `scripts/pre-commit-secret-scan.mjs` and the CI security workflow are the gates; no new secret.
- Data / migration: none. `activeBusinessId` is optional; `businessAccess` and its index come from wave 0. Free tier: one small row per grant.
- Project checks: `[auto] log-query` item present; server tests through `pnpm run test:server`; no UI, so no dictionary keys and no icons; Reuse Check filled; `standards-backend.md` §1 and §5 rows added (a dedicated endpoint is named and justified: grants are not business items and must never be reachable through the generic API).

## Out of Scope
- Any screen (plan 632): switcher, banner, access list, "enter business", the grant control.
- Changing `server/middleware/write-limit.js` or `server/routes/log.js` (C-ACCESS: they stay as they are; tests only).
- Cleaning up grants when a business is deleted (plan 619 deletes its `businessAccess` rows) or when a user is deleted (`server/routes/admin.js` is a wave 0 file): a dead row is skipped by `resolveSession` and by both lists.
- A consultant role with fewer rights (read-only, no prices), per-grant expiry dates, an owner creating a grant himself.
- Counting an acting session in any statistic, or a separate usage report for consultants.
- The diagnosis (plans 633, 634).

## Critical Questions
- none

## Execution Notes
- decided: `verifyToken` answers 401 `{ error: 'ACCESS_ENDED' }` for a removed grant, not the generic 401 text — why: plan 632 must tell "your access ended" from "your token expired", so the browser does not replay a write meant for the client's business into the home business after the refresh.
- decided: a failed database read during the acting check answers 503 and stops the request — why: the tenant boundary denies by default.
- decided: the acting check for a platform admin re-reads the user (still platform admin, not removed); for a consultant it reads the grant — why: one indexed read each, as the Contract says, and each reads the thing that can be taken away.
- decided: `resolveSession` also falls back to home when the active business no longer exists — why: a platform admin's stored active business can outlive the business, and one read by id closes it.
- decided: `PUT /business/logistics-hidden` and `GET /business/setup-status` are on the denied side — why: both ask `editSettings`; the rule stays mechanical ("a route that asks `editSettings` or `manageTeam` is denied"), with no per-route role test.
- decided: `POST /business/front-desk-intake` is allowed for a consultant but skips the baseline — why: the front desk is not the team or the settings (D12); the baseline is written by `PUT /business/baseline` behind `editSettings`, so the intake must not be a side door to it.
- decided: `/guest` resets `activeBusinessId` — why: the local guest is a platform admin; a fresh local or test session must start in a known business.
- decided: the master sync on login and refresh stays on the home business — why: a client's business syncs when its own members sign in; a consultant's refresh every 13 minutes should not start a sync in someone else's business.
- decided: the public user object carries `homeModules` while acting (beyond C-ACCESS; the token payload is untouched) — why: C-MODULES puts the diagnosis entry in the acting banner by the HOME business's modules, and while acting the browser only ever sees the client's business.
- decided: one changed line in `server/routes/generic.js` (a wave 0 registry file) — why: `trashOwnerFilter` tests `role === 'owner'` and sends no answer for any other role that passes `can()`; without the change a consultant's "restore all" and "empty Trash" hang.
- decided: `GET /api/v1/access/grants` answers `_id` beside `name` and `grantedAt` — why: the owner's list removes a grant by id.
- round 2 (fresh judgment builder, from base ed839532): rerun of the failing check first — `pnpm run test:ci` on the base → exit 0, TOTAL: 2304 SUCCESS (the earlier 1 FAILED did not reproduce; this plan changes no browser file).
- decided: the grant tests give each test its own platform-admin id — why: the grant limiter (30 per 15 minutes, keyed by user, as the plan says) is shared by every test in the file otherwise.
- decided: `resolveSession` also treats an active `__master__` as "does not exist" (home, cleared) — why: the same rule `canEnter` uses; no session may sit in the master catalog.
- registry fix: `docs/brain/component-families.md` (in scope) had five registry paths that `reuse-lint --check-registry` could not resolve (lines 23, 164, 197, 314, 355); rewritten to the real file paths so the Done-when check passes.
- manifest: `docs/workflow-kit/manifest.json` gains the ADR 0032 entry (a generated kit file, always allowed by scope-check).
- evidence:
  - `pnpm run test:server` → exit 0, Test Files 127 passed, Tests 1723 passed (access.test.js 18, access-acting.test.js 22, invariants.test.js 41, permissions.test.js 24)
  - `pnpm --dir server run lint` → exit 0 (0 errors)
  - `node scripts/breadcrumbs-check.mjs` → BREADCRUMBS: clean
  - `node scripts/reuse-lint.mjs --check-registry` → exit 0, registry ok (39 families, 139 paths)
  - `node scripts/log-query.mjs --since=plan-start --level=error` → exit 0, SKIP: no database configured
  - `pnpm run build` → exit 0; `pnpm run lint` → exit 0; `pnpm run test:ci` → exit 0, TOTAL: 2304 SUCCESS
  - kit-manifest-check → KIT_MANIFEST: ok — 433 classified, 0 unclassified
