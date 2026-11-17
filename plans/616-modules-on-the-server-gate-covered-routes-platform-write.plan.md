# Plan 616 — Modules on the server: one gate on every covered route, and the platform admin's switch with a reason

Status: draft
Depends-on: 615
Snapshot: e916e48e3943a650ba9767ebb4023d20e823ae8d

## Problem Statement
Every business gets every part of FoodVibe today. The platform admin cannot sell or withhold events, field logistics,
the front desk or AI creation per business (brief MP-01, decisions D1–D3). Hiding a link in the browser is not a gate:
the server must refuse a route of an area the business does not have, and it must do so in one place per kind of route
so the rule cannot drift. Existing businesses must notice nothing (D2): a business with no stored list has the four
default modules.

Verified on `origin/main` (e916e48e, 2026-11-17):
- No module code exists: `MODULE_OFF`, `requireModule`, `modulesOf` appear nowhere in `server/`, `shared/schemas/` or
  `src/app/`. Plan 615 adds `shared/schemas/modules.ts` (`MODULE_KEYS`, `DEFAULT_MODULES`, `modulesOf`, `hasModule`,
  `MODULE_OF_TYPE`, `platformUpdateSchema`) and the optional business fields `modules`, `platformHistory`,
  `aiMonthlyTokenCap`, `aiPrivate`; the server reads them from `server/generated/schemas/modules`.
- `server/middleware/auth.js` (109 lines): `verifyToken` (line 60) puts the token payload on `req.user`;
  `verifyAccessToken(req)` (line 23) returns the payload or `null` and never answers. `attachUser` (line 42) calls
  `recordUsage`, so running `verifyToken` twice on one request would register usage twice.
- `server/services/business.js:50`: `getBusiness(id)` returns the `businesses` document or `null`. Many existing tests
  sign a token for a business that has no document (`server/test/helpers/app.js:47`, `'b_' + userId`).
- `server/routes/generic.js` (1,437 lines): the type allowlist is one `router.use('/:type', …)` at lines 50–55, before
  any token is read; reads use `optionalToken` (lines 257, 329, 363, 527), writes `verifyToken`. An anonymous read
  returns `__master__` documents (`server/utils/business-scope.js:11`).
- `server/routes/events.js` (350 lines): nine routes, each with its own `verifyToken` (lines 56, 89, 129, 153, 191,
  219, 242, 270, 295); line 295 is `PUT /:id/logistics`. `server/routes/requests.js`: five routes (lines 197, 288, 319,
  355, 380). `server/routes/bookings.js`: lines 39, 61. `server/routes/knowledge.js`: line 18.
  `server/routes/clients.js`: `router.use(verifyToken)` at line 25, routes at 75 and 122.
  `server/routes/business.js:188`: `POST /front-desk-intake`. `server/routes/stats.js:69`: `GET /frontdesk`
  (`?businessId=` is allowed for the platform admin only); lines 22 and 51 are `/business` and `/report`.
- `server/routes/ai.js` route lines at the Snapshot (plan 615 adds about ten lines above them): `/generate` 370,
  `/parse-text` 452, `/parse-price-list` 523, `/parse-receipt-photo` 595, `/match-product-names` 711,
  `/patch-recipe` 821, `/generate-menu` 1044, `/patch-menu` 1145, `/generate-product` 1272, `/patch-product` 1362,
  `/generate-from-image` 1419, `/generate-product-from-image` 1468, `/generate-from-url` 1568,
  `/knowledge-import` 1686, `/shots` 1768, `/shots/confirm` 1806, `/save-menu-shot` 1838. Each has `verifyToken`
  first and (all but `/shots/confirm`) `aiLimiter` after it.
- `server/routes/public.js` (198 lines) resolves the business only through `loadPublicProfile(db, slug)`
  (`server/utils/public-profile.js:12`; four call sites, lines 113, 127, 162, 176), and every call site answers 404
  `NOT_FOUND` for `null`. `server/test/invariants.test.js:196` fails if `public.js` contains `verifyToken`,
  `verifyAccessToken`, `decodeAccessToken`, `req.user` or `recordUsage`.
- `server/routes/admin.js` (437 lines): `GET /businesses` (line 87) projects `name, ownerId, createdAt, internal` and
  builds rows at lines 128–147; `PUT /businesses/:id/front-desk` (line 204) is the precedent of a platform write with
  a kept reason (`frontDeskAdminUpdateSchema`, `actorOf`, `$push … $slice: -50`, log without the reason).
  `server/test/admin-businesses.test.js:29` (`EXPECTED_KEYS`) asserts the exact keys of a row.
- `server/routes/business.js:36–40`: `GET /api/v1/business` returns the whole document to any member.
- `signup` creates a business through `createBusinessFor` (`server/services/business.js:17`), which writes no
  `modules` field.

## Goals & Success Criteria
**Primary:** a route of a gated area answers 403 `{ error: 'MODULE_OFF', module }` for a business without the module
and works as before with it; the platform admin changes a business's modules with a reason; a business with no stored
list behaves exactly as today.

- [auto] `pnpm run test:server` → exit 0, including the new `server/test/modules-gate.test.js` and
  `server/test/admin-platform.test.js`; no existing test file is edited except `server/test/admin-businesses.test.js`
  and `server/test/business-settings.test.js` (two added cases).
- [auto] `server/test/business-settings.test.js`: for a business whose stored settings hold `priceRiseAlertPct: 8`, a
  `PUT /api/v1/business/settings` body with only the three existing numbers answers 200 and the stored value is
  still 8; a body with `priceRiseAlertPct: 12` stores 12; for a business with none stored, a three-number body stores
  no `priceRiseAlertPct` (the read still fills the default 5).
- [auto] `server/test/modules-gate.test.js`, one case per row of the C-MODULES table, each run for a business with
  `modules: []` (403 `MODULE_OFF` and the named `module`) and for one with the module (the status the route gives
  today):
  - `events`: `PUT /api/v1/events/:id/stage`; generic `GET /api/v1/data/menuEvents` and `/venues`; a generic `POST`
    of a venue.
  - `event_logistics`: `PUT /api/v1/events/:id/logistics` answers 403 with `module: 'event_logistics'` for a business
    with `['events']`, and 200 with `['events', 'event_logistics']`.
  - `frontdesk`: `POST /api/v1/requests`, `GET /api/v1/bookings/day?date=2026-01-01`, `PUT /api/v1/knowledge/approve`,
    generic `GET` of `requests`, `bookings`, `frontDeskProfiles`, `knowledgeItems`, `POST /api/v1/business/front-desk-intake`,
    `POST /api/v1/ai/knowledge-import`, `GET /api/v1/stats/frontdesk`.
  - the public router: for a business with a public profile, `GET /api/v1/public/:slug` answers 200 with `frontdesk`
    and 404 `{ error: 'NOT_FOUND' }` without it; `POST /api/v1/public/:slug/requests` answers 404 and writes no request.
  - `events` or `frontdesk`: generic `GET /api/v1/data/clients` and `PUT /api/v1/clients/:id/do-not-contact` are
    refused with `[]`, allowed with `['events']`, allowed with `['frontdesk']`.
  - `ai_create`: each of the thirteen routes of the table answers 403 and the stubbed `fetch` is never called.
  - `consultant_diag`: `requireHomeModule('consultant_diag')` called with a request whose `homeBusinessId` business
    has the module passes, and is refused when only the active `businessId` business has it.
- [auto] `server/test/modules-gate.test.js`: for a business with `modules: []` these still answer as today (never 403
  `MODULE_OFF`): generic `GET` of `products`, `suppliers`, `equipment`, `recipes`, `dishes`, `taxonomyTerms`;
  `GET /api/v1/business`; `GET /api/v1/stats/business`; `GET /api/v1/stats/report`; `POST /api/v1/product-import/apply`;
  `POST /api/v1/ai/parse-price-list`, `/parse-receipt-photo`, `/match-product-names`; and, for a platform admin whose
  own business has `modules: []`, `GET /api/v1/admin/businesses` (while his generic `GET /api/v1/data/menuEvents` is 403).
- [auto] `server/test/modules-gate.test.js`: a token of a business that has no document, and a business document with
  no `modules` field, both pass every gated route; an anonymous `GET /api/v1/data/venues` still returns the master list;
  an expired token on a gated generic read answers 401, not 403.
- [auto] `server/test/modules-gate.test.js`: after a direct database change of `modules`, a request inside 30 seconds
  still sees the old list, and sees the new one after `clearModuleCache()`; a 403 `MODULE_OFF` writes no `warn` or
  `error` log line.
- [auto] `server/test/admin-platform.test.js`: `PUT /api/v1/admin/businesses/:id/platform` with
  `{ modules: ['events'], reason: 'pilot scope' }` stores `modules`, appends one `platformHistory` row
  `{ at, by, byName, reason, changed: ['modules'] }`, and the business's very next gated request follows the new list
  (the cache was cleared); `aiMonthlyTokenCap: 5000` is stored and `null` removes the field; `aiPrivate: true` is
  stored; the 51st write keeps 50 history rows; a body without a reason, with a 2-character reason, with an unknown
  module, with a repeated module, with an unknown key or with none of the three fields answers 400 with `issues`; an
  unknown business answers 404; an owner answers 403; no token answers 401; the log line carries the business id and
  the changed field names and never the reason.
- [auto] `server/test/admin-platform.test.js`: `GET /api/v1/business` of that business returns `modules` and never
  `platformHistory`; a signed-up business (`createBusinessFor`) has no `modules` field.
- [auto] `server/test/admin-businesses.test.js`: each row of `GET /api/v1/admin/businesses` has exactly the earlier
  keys plus `modules` (the resolved list: the four defaults for a business with no field), `aiPrivate` (boolean) and
  `aiMonthlyTokenCap` (number or `null`).
- [auto] `pnpm --dir server run lint` → exit 0. `pnpm run build` → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.

## Execution Mode
- Parallel: no — second plan of run `mod-0` (615, 616, 617, 618, 619, 620, in that order). It edits
  `server/routes/admin.js` (also 617, 618), `server/routes/generic.js` and `server/routes/ai.js` (shared registries of
  the map's must-not-run list) and `server/routes/events.js` (also 624, which runs in a later round). No other plan of
  the program, and no open plan that edits `server/routes/ai.js` or `server/routes/generic.js`, may run beside it.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/middleware/require-module.js
server/routes/generic.js
server/routes/events.js
server/routes/requests.js
server/routes/bookings.js
server/routes/knowledge.js
server/routes/clients.js
server/routes/business.js
server/routes/stats.js
server/routes/ai.js
server/routes/admin.js
server/utils/public-profile.js
server/test/modules-gate.test.js
server/test/admin-platform.test.js
server/test/admin-businesses.test.js
server/test/business-settings.test.js
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

- INV-1: preserves — the gate only refuses; it never widens what a caller reads or writes. It reads the business id from the token the server signed, runs before `scopeFilter` and `assertCan`, and leaves both untouched. The platform write is behind `verifyToken, requirePlatformAdmin` like every route of `admin.js`. `public.js` is not edited and still reads no member token; the business is still resolved from the slug.
- INV-2: preserves — the gate is one extra middleware in `generic.js`; every scoped query still goes through `business-scope.js`, taxonomy is still read as master and own, and nothing is copied or synced differently. Switching a module off deletes and changes no data.
- INV-3: preserves — `generic.js` gains only the type gate; renames and cascades are not touched.
- INV-6: preserves — the AI routes stay in `server/routes/ai.js`; fourteen of them gain a gate before the limiter and before any model call.

## Reuse Check

- `server/middleware/require-module.js` (`requireModule`, `requireHomeModule`, `requireModuleForType`, `businessModules`, `clearModuleCache`) — family: server-auth — rung: 3 — why: one more "who is calling and what may they reach" check beside `auth.js` and `permissions.js`; it uses the token payload and `getBusiness` and adds no second way to scope or authorise.
- platform write `PUT /api/v1/admin/businesses/:id/platform` — family: server-auth — rung: 2 — why: same guards, actor stamp and kept-reason history as the existing front desk admin write in `admin.js`.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the platform admin, I want to switch a part of the product on or off for one business and write down why, so that each customer gets what was agreed.
- As an owner, I want my kitchen to keep working exactly as it does today until someone changes my plan, so that an update never takes a screen away from me by surprise.
- As a chef in a business without the events part, I want products, recipes and the cook view to work as always, so that my daily work is not touched by what the business did not buy.
- As a consultant, I want the diagnosis to depend on my own business's plan and not on my client's, so that I can use it inside any business I advise.

## Functional Requirements

### Must Have (P0)
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
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-REGISTRY (615; used by every plan)** — after 615 merges, no plan of this program edits a shared registry file.
  615 creates, with tests (schema round-trips, the collections test, a route test that each empty router answers 404):
  - `shared/schemas/modules.ts` (C-MODULES names).
  - `businessSchema` gains, all optional: `modules`, `platformHistory`, `aiMonthlyTokenCap`, `aiPrivate`.
    `businessSettingsSchema` gains optional `priceRiseAlertPct` (`> 0`, `≤ 100`); reads fill the default 5 the way
    `BUSINESS_SETTINGS_DEFAULTS` fills the others; a `PUT /business/settings` body without it stays valid and keeps
    the stored number (the route replaces the whole settings object today; 616 makes it keep this one field).
  - `supplierSchema` gains `taxId?` (`^\d{9}$`). `menuEvents.siteLogistics` gains `loaded?` (C-LOAD), added to what
    the events router owns.
  - New schema files under `shared/schemas/entities/`, exported from `index.ts` and `SCHEMA_BY_COLLECTION`:
    `invoice.schema.ts`, `price-history.schema.ts`, `invoice-alias.schema.ts`, `supplier-profile.schema.ts`,
    `ai-draft.schema.ts`, `stored-file.schema.ts`, `business-access.schema.ts`, `diagnosis.schema.ts`,
    `stock-count.schema.ts` — shapes as in the Contracts below. A later plan may edit its own schema file.
  - `server/constants/collections.js`:

    | name | userData | cloneable | backup | searchable | softDelete | routerWrites |
    |---|---|---|---|---|---|---|
    | `invoices` | true | false | true | false | false | true |
    | `diagnoses` | true | false | true | false | false | true |
    | `stockCounts` | true | false | true | false | false | true |
    | `priceHistory`, `invoiceAliases`, `supplierProfiles`, `aiDrafts`, `storedFiles`, `businessAccess` | false | false | false | false | false | — |

  - `server/utils/permissions.js`: `OWNER_ONLY_TYPES` gains `invoices`, `diagnoses`. `shared/schemas/money-fields.ts`:
    `invoices` → `lines[].unitPrice`, `lines[].lineTotal`, `lines[].price`. `shared/schemas/staff-fields.ts`:
    `invoices` → `['supplierName', 'invoiceDate', 'invoiceNumber']`, `diagnoses` → `['name', 'status']` (staff never
    read a diagnosis's selling prices).
  - `server/db.js` indexes: the ones named in the Contracts below.
  - `server/constants/ai-features.js` gains `logistics_extract`, `invoice_read`, `menu_prices_parse`, `stock_extract`
    (`voice_transcribe` is already there).
  - Empty routers (each exports a `Router()` with no route) and their one-line mounts:
    in `server/routes/ai.js` — `router.use('/voice', …ai/voice)`, `'/logistics'` → `ai/logistics`, `'/invoices'` →
    `ai/invoices`, `'/diag'` → `ai/diag`, `'/stock'` → `ai/stock` (files under `server/routes/ai/`);
    in `server/app.js` — `/api/v1/files` → `routes/files.js`, `/api/v1/access` → `routes/access.js`,
    `/api/v1/stock` → `routes/stock.js`, `/api/v1/diag` → `routes/diag.js`, `/api/v1/admin/learning` →
    `routes/admin-learning.js`.
  - `server/routes/ai.js` also exports `respondFromGeminiFailure`, `usageOf`, `requestedModel` and `aiLimiter`, so a
    router under `server/routes/ai/` uses the same failure answers, usage stamp, model choice and limiter. `ai.js`
    requires each sub-router before its own `module.exports`, so a sub-router reads them with `require('../ai')`
    inside the handler, never at the top of the file.
  - `docs/brain/invariants.md`: INV-6 `Touches` gains `server/routes/ai/**` (the rule holds: every model call still
    enters through `server/routes/ai.js`); INV-1 `Touches` gains the five new routers. `preserves`.
- [ ] `server/middleware/require-module.js` (new). It requires `getBusiness` from `../services/business`,
  `modulesOf`, `MODULE_OF_TYPE` from `../generated/schemas/modules` and `verifyAccessToken` from `./auth`; it never
  requires a route file.
  - `businessModules(businessId)` → `Promise<ModuleKey[]>`: `modulesOf(await getBusiness(businessId))`, kept in a
    `Map` per business id for 30,000 ms. A business with no document resolves to the defaults (`modulesOf(null)`).
  - `clearModuleCache(businessId?)`: one entry, or all when called with nothing. Tests call it in `beforeEach`.
  - `requireModule(key | key[])` → middleware, placed after `verifyToken`: reads `req.user.businessId`; passes when
    the business has any one of the keys; else `res.status(403).json({ error: 'MODULE_OFF', module: <the first key> })`
    and `req.log.info({ event: 'module.off', module })` (info, so a refused call is not stored as a warning). A
    failed business read answers 500 `{ error: 'Server error' }` with `req.log.error({ err, event: 'module.check.failed' })`.
  - `requireHomeModule(key)`: the same test on `req.user.homeBusinessId ?? req.user.businessId`.
  - `requireModuleForType` → middleware for the generic router: `keys = MODULE_OF_TYPE[req.params.type]`; no keys →
    `next()`; `payload = verifyAccessToken(req)`; no payload or no `payload.businessId` → `next()` (an anonymous read
    keeps returning the master list, and a bad token is answered 401 by the route's own token check); else the same
    any-of test and the same 403.
- [ ] `server/routes/generic.js`: one line, directly after the allowlist `router.use('/:type', …)` (line 55):
  `router.use('/:type', requireModuleForType)`. It runs before every read and write of a gated type, before
  `router.param('type', …)`'s 405 has any effect on a refused business, and nowhere else in the file is a module tested.
- [ ] Per-route gates — `requireModule(…)` is inserted directly after `verifyToken` (never a second `verifyToken`):
  - `server/routes/events.js`: `requireModule('events')` on the eight routes at lines 56–270;
    `requireModule('event_logistics')` on `PUT /:id/logistics` (line 295) — it implies `events`, because `modulesOf`
    drops `event_logistics` without it.
  - `server/routes/requests.js` (five routes), `server/routes/bookings.js` (two), `server/routes/knowledge.js` (one):
    `requireModule('frontdesk')`.
  - `server/routes/clients.js`: `router.use(requireModule(['events', 'frontdesk']))` directly after
    `router.use(verifyToken)` (line 25).
  - `server/routes/business.js`: `requireModule('frontdesk')` on `POST /front-desk-intake` (line 188).
  - `server/routes/stats.js`: `GET /frontdesk` (line 69) is gated by `frontdesk`, except when the caller is the
    platform admin reading another business with `?businessId=` (that read is the platform's own, like an `/admin`
    route): `(req, res, next) => (isPlatformAdmin(req) && req.query.businessId !== undefined ? next() :
    requireModule('frontdesk')(req, res, next))`. `/business` and `/report` are not gated.
  - `server/routes/ai.js`: `requireModule('ai_create')` after `verifyToken` and before `aiLimiter` on `/generate`,
    `/parse-text`, `/generate-from-url`, `/generate-from-image`, `/patch-recipe`, `/generate-menu`, `/patch-menu`,
    `/generate-product`, `/patch-product`, `/generate-product-from-image`, `/shots`, `/shots/confirm`,
    `/save-menu-shot`; `requireModule('frontdesk')` after `verifyToken` on `/knowledge-import`. `/parse-price-list`,
    `/parse-receipt-photo`, `/match-product-names`, `/usage`, `/models` and the five sub-router mounts are not gated.
- [ ] `server/utils/public-profile.js`: `loadPublicProfile(db, slug)` returns `null` when the found profile's business
  does not have `frontdesk` (`businessModules(profile.businessId)`). All four public routes already answer 404
  `NOT_FOUND` for `null`, so a stranger cannot tell the business from one that does not exist.
  `server/routes/public.js` is not edited.
- [ ] `server/routes/admin.js`:
  - `PUT /businesses/:id/platform` (`verifyToken, requirePlatformAdmin`), placed after the front desk write. Body
    checked with `platformUpdateSchema` (`../generated/schemas/modules`); a failure answers 400
    `{ error: 'Validation failed', issues: [{ path, code, message }] }` like the front desk write. One
    `findOneAndUpdate` on `businesses` by `_id` (`returnDocument: 'after'`): `$set` `modules` (in `MODULE_KEYS`
    order) when given, `$set` `aiMonthlyTokenCap` when a number and `$unset` it when `null`, `$set` `aiPrivate` when
    given, and `$push: { platformHistory: { $each: [row], $slice: -50 } }` with `row = { at: Date.now(), by:
    actor.userId, byName: String(actor.name).slice(0, 80), reason, changed }` (`actorOf(req)`; `changed` = the names
    of the given fields among `modules`, `aiMonthlyTokenCap`, `aiPrivate`). No document → 404
    `{ error: 'Business not found' }`. Then `clearModuleCache(id)`, `req.log.info({ event:
    'admin.platform.updated', businessId: id, changed })` (never the reason), and 200 `{ ok: true, modules:
    modulesOf(after), aiMonthlyTokenCap: after.aiMonthlyTokenCap ?? null, aiPrivate: after.aiPrivate === true }`.
    A failure logs `admin.platform.failed` and answers 500.
  - In this plan `aiPrivate` is a plain field write. Plan 618 replaces that one line with `setAiPrivate` (C-LEARN),
    and plan 617 adds the cap-cache clear and `aiTokensThisMonth`; leave a comment naming both at the spot.
  - `GET /businesses`: the projection gains `modules`, `aiPrivate`, `aiMonthlyTokenCap`; each row gains `modules:
    modulesOf(b)`, `aiPrivate: b.aiPrivate === true`, `aiMonthlyTokenCap: b.aiMonthlyTokenCap ?? null`.
- [ ] `server/routes/business.js` `GET /` (line 36): the answer leaves out `platformHistory` (the platform admin's
  own notes); everything else, `modules` included, is returned as stored, so the browser resolves the list with the
  same `modulesOf`.
- [ ] `server/routes/business.js` `PUT /settings` (line 48) replaces the whole `settings` object today, so the
  three-field settings form would wipe a stored `priceRiseAlertPct` (added by plan 615). After validation, when the
  body has no `priceRiseAlertPct`, the route reads the business's stored settings and, if they hold one, saves
  `{ ...parsed.data, priceRiseAlertPct: <stored> }`; a body that carries it replaces it. The response returns the
  settings as saved. Nothing else of the route changes (owner only, same validation, same 404).
- [ ] Routes that do not exist yet take their gate in the plan that adds them, with the middleware of this plan:
  `PUT /events/:id/loading` (624), `/api/v1/ai/logistics/**` (622), `/api/v1/diag/**` and `/api/v1/ai/diag/**` (633).
- [ ] `docs/agent/standards-backend.md` §5: one row for `PUT /api/v1/admin/businesses/:id/platform` (the route this
  plan adds; plan 617 does not edit the doc again, so the row already says the cap is enforced from the ledger) and one
  paragraph "Module gate" (the 403 body, the 30-second cache, the generic type gate, the public 404).
  `server/breadcrumbs.md`: a row for `middleware/require-module.js`.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- No screen in this plan and no dictionary key. The browser side (navigation, route guard, the platform dialog) is
  plan 620, which runs later in the same run; until it merges a business whose module was switched off would see its
  links and get refusals, so no business is switched before the run is merged.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Add the one check that says whether a business has a part of the product — businessModules with the 30-second cache, clearModuleCache, requireModule, requireHomeModule, requireModuleForType; cache, default and home-business cases — server/middleware/require-module.js, server/test/modules-gate.test.js
- [ ] A2: Refuse the shared data route for a kind of record the business does not have — one router.use line after the allowlist; menuEvents, venues, clients either-module, front desk types, never-gated types, anonymous and expired-token cases — server/routes/generic.js, server/test/modules-gate.test.js
- [ ] A3: Refuse the event, client and front desk routes without their module — requireModule after verifyToken on events (eight routes plus logistics), requests, bookings, knowledge, clients, front-desk-intake, stats frontdesk with the platform exception; one case per row — server/routes/events.js, requests.js, bookings.js, knowledge.js, clients.js, business.js, stats.js, server/test/modules-gate.test.js
- [ ] A4: Refuse the create-with-AI routes before the limiter and before any model call — ai_create on thirteen routes, frontdesk on knowledge-import, three import routes left open; fetch stub never called — server/routes/ai.js, server/test/modules-gate.test.js
- [ ] A5: Make the public page of a business without the front desk look as if it does not exist — loadPublicProfile returns null; profile read and request post answer 404, nothing written — server/utils/public-profile.js, server/test/modules-gate.test.js
- [ ] A6: Let the platform admin change a business's modules, cap and private flag with a kept reason — PUT businesses/:id/platform with platformUpdateSchema, history capped at 50, cache cleared, log without the reason; every refusal case — server/routes/admin.js, server/test/admin-platform.test.js
- [ ] A7: Show each business's modules in the platform table data and keep the admin's notes from members — three new row fields in GET businesses; platformHistory left out of GET business; update the exact-keys test — server/routes/admin.js, server/routes/business.js, server/test/admin-businesses.test.js, server/test/admin-platform.test.js
- [ ] A7b: Keep the price-rise alert number when the owner saves the three existing settings — PUT settings keeps a stored priceRiseAlertPct when the body has none, replaces it when the body has one; two added cases — server/routes/business.js, server/test/business-settings.test.js
- [ ] A8: Write the new route and the gate into the backend docs and the server map — docs/agent/standards-backend.md, server/breadcrumbs.md
- [ ] A9: Run every check and record the results — test:server, server lint, build, log-query; paste the exit lines into Execution Notes — this plan file

## Technical Considerations
- Dependencies: plan 615 (`shared/schemas/modules.ts`, the business fields). `getBusiness`, `verifyToken`, `verifyAccessToken`, `isPlatformAdmin`, `actorOf`. Every gated request adds at most one `businesses` read per business per 30 seconds.
- New files needed: `server/middleware/require-module.js`, `server/test/modules-gate.test.js`, `server/test/admin-platform.test.js`.
- Model changes: none (615 added the fields).
- Backend / API: new `PUT /api/v1/admin/businesses/:id/platform`; `GET /api/v1/admin/businesses` rows gain `modules`, `aiPrivate`, `aiMonthlyTokenCap`; `GET /api/v1/business` no longer carries `platformHistory`; gated routes may answer 403 `{ error: 'MODULE_OFF', module }`; the public routes answer 404 for a business without `frontdesk`.
- Auth and validation: the platform write is platform admin only and its body is a strict Zod schema; the gate uses only the business id of the server-signed token; the platform admin's own business is gated like any other, `/api/v1/admin/**` never.
- Security surface: one new admin input (modules, cap, private flag, reason — the reason is stored, never logged, never returned to members). The gate cannot grant anything: it runs before the existing permission checks and only refuses.
- Data / migration: none. No stored business is changed; a business without `modules` reads as the four defaults. Tests fake nothing but the model: the AI cases stub the global `fetch` exactly as `server/test/ai-usage.test.js` does (`vi.stubGlobal('fetch', vi.fn())`) and assert it was not called; everything else runs on the in-memory Mongo app of `server/test/helpers/app.js`.
- Project checks: `[auto] log-query`; `pnpm run test:server`; the dedicated route is named and justified (a platform-written field must not go through the generic API); no dictionary key, no icon.

## Out of Scope
- The browser: `ModuleService`, the route guard, navigation, the platform dialog, the "modules" column (620). The [human] check of brief MP-01 (a panel disappears after one refresh) belongs to 620.
- `aiTokensThisMonth` and the cap itself (617); `setAiPrivate` and what turning private on deletes (618).
- Gates on routes that later plans add (622, 624, 633).
- Deleting or hiding stored data of a module that is switched off: nothing is deleted; switching it on again shows everything as it was.
- Reports: `/stats/business` and `/stats/report` keep counting events for a business without `events`.

## Critical Questions
- none

## Execution Notes
- decided: the generic type gate reads the token with `verifyAccessToken` inside one `router.use` — why: the generic routes verify the token per route (reads with `optionalToken`), so one place before every read and write cannot rely on `req.user`; a missing or bad token falls through to the route's own answer.
- decided: per-route `requireModule` after each route's own `verifyToken`, not a router-level `verifyToken` — why: `verifyToken` registers usage, so running it twice would count a request twice.
- decided: the public 404 is done in `loadPublicProfile`, and `server/routes/public.js` is not edited — why: all four routes already answer 404 for `null`, and the invariant test forbids member-token code in `public.js`.
- decided: `module` in the 403 body is the first key of the list (`events` for the clients rule) — why: the Contract names one field.
- decided: a refused call is logged at `info` — why: `warn` is stored in `app_logs`, and a business without a module would fill it.
- decided: `GET /api/v1/business` leaves out `platformHistory` — why: the row holds the platform admin's own reason and name; members need only `modules`.
- decided: `GET /stats/frontdesk?businessId=` by the platform admin is not gated — why: it reads another business for the platform, as `/admin` routes do; the admin's own business modules say nothing about it.
- decided: in this plan `aiPrivate` and `aiMonthlyTokenCap` are plain field writes — why: the run order is 616, 617, 618; 617 adds the cap cache clear and `aiTokensThisMonth`, 618 swaps the `aiPrivate` line for `setAiPrivate`.
- decided: `PUT /api/v1/business/settings` keeps a stored `priceRiseAlertPct` when the body has none (Planner, 2026-11-17) — why: the route replaces the whole object (`business.js:48`) and the current form sends three numbers, so the value plan 629 will let the owner set would be wiped by any settings save.
- decided: a business with a stored empty list has no module — why: `modulesOf` falls back to the defaults only when the field is absent (C-MODULES).
