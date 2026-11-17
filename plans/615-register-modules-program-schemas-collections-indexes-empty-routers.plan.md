# Plan 615 — Register the Modules program once: schemas, collections, indexes, permission lists, AI feature keys and empty routers

Status: draft
Depends-on: none
Snapshot: e916e48e3943a650ba9767ebb4023d20e823ae8d

## Problem Statement
The Modules program (plans 615–637, `docs/modules/modules-map.md`) adds nine collections, five routers, five AI
sub-routers, four AI feature keys and several fields on existing documents. All of them are declared in a handful of
shared registry files. If each later plan edited those files itself, the runs of the program could never work side by
side, and every merge would collide. This plan declares everything once, with no behaviour of its own, so that after it
merges no plan of the program edits a shared registry file again (Contract C-REGISTRY).

Verified on `origin/main` (e916e48e, 2026-11-17):
- `shared/schemas/entities/index.ts` (54 lines): `SCHEMA_BY_COLLECTION` (line 30) is hand-written source with 14 keys;
  `server/generated/schemas/**` is its compiled copy (`pnpm run build:schemas` = `tsc -p shared/schemas/tsconfig.cjs.json`,
  which includes every `.ts` under `shared/schemas`). `decisionLog` is the precedent of a server-only collection that has
  a schema in the map.
- `shared/schemas/entities/business.schema.ts` (103 lines): `BUSINESS_SETTINGS_DEFAULTS` (line 7) has three keys;
  `businessSettingsSchema` (line 9) and `businessSchema` (line 82) are `z.strictObject`. No `modules`, `platformHistory`,
  `aiMonthlyTokenCap`, `aiPrivate`, `priceRiseAlertPct`.
- `server/routes/business.js:40` fills the settings defaults on read with `{ ...BUSINESS_SETTINGS_DEFAULTS, ...settings }`;
  `PUT /settings` (line 48) replaces the whole `settings` object.
- Three existing server tests compare the settings or the business document with an exact object:
  `server/test/business-settings.test.js:21` (`DEFAULTS`), `:39`, `:56`, and `server/test/business-route.test.js:32`.
- The browser imports the shared schemas through `@schemas/*` (64 imports). `BUSINESS_SETTINGS_DEFAULTS` is read by
  `src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.ts` (lines 52–62, 95) and
  `event-closing-dialog.component.ts:102`; the settings form has three controls and saves only those.
- `shared/schemas/entities/supplier.schema.ts` (20 lines): no `taxId`.
- `shared/schemas/entities/menu-event.schema.ts:150–171`: `siteLogistics` is a `z.strictObject` with `answers`,
  `hiddenKeys`, `meetingAt`, `meetingWith`, `phaseDone`; no `loaded`. `siteLogistics` as a whole is in
  `EVENT_SERVER_FIELDS` (`shared/schemas/entities/event-stage.ts:18`), so a field inside it is already server-owned.
  `PUT /api/v1/events/:id/logistics` (`server/routes/events.js:295`) rebuilds it as `{ ...base, answers }`, so an
  unknown-to-it field such as `loaded` survives a logistics save.
- `server/constants/collections.js` (70 lines): entries carry `userData, cloneable, backup, searchable, softDelete` and
  optionally `routerWrites`; `ROUTER_WRITE_TYPES` (line 68). `server/test/collections.test.js:47` asserts
  `ROUTER_WRITE_TYPES` equals `['requests', 'bookings']` and (line 27) that a `backup` entry is also `userData`.
- `server/routes/generic.js:49–62`: a type outside `ALL_USER_ENTITY_TYPES` answers 403; a non-GET on a
  `routerWrites` type answers 405 `USE_ROUTER`. A staff read is trimmed by `staffProjection` (`generic.js:124`,
  `server/utils/permissions.js:66`), which needs `STAFF_READ_FIELDS[type]` and a schema with `.shape`.
- `server/test/cross-business.test.js:60` asserts that its `BODY` map has one key per `ALL_USER_ENTITY_TYPES` entry
  (router-written types hold `() => ({})`, lines 52–53).
- `server/utils/permissions.js:21`: `OWNER_ONLY_TYPES = new Set(['clients', 'frontDeskProfiles', 'knowledgeItems'])`.
  `shared/schemas/money-fields.ts` (21 lines) has five types; `shared/schemas/staff-fields.ts` (7 lines) has `clients`.
- `server/db.js` (157 lines): indexes are created in `connectDb`; the partial-index precedent is lines 127–134
  (`partialFilterExpression`), and lines 118–122 show a "one live row" rule done with a helper field because a partial
  filter cannot say "field is absent".
- `server/constants/ai-features.js` (30 lines): 19 keys, `voice_transcribe` among them;
  `server/test/ai-usage.test.js:220–221` asserts the length 19.
- `server/routes/ai.js` (1,876 lines): `aiLimiter` (line 18), `router.use(trackAiOutcome)` (line 106), `usageOf`
  (line 109), `requestedModel` (line 315), `respondFromGeminiFailure` (line 325). It exports the router,
  `appendKnownMetadata` and `PRICE_LIST_SYSTEM_PROMPT` only (lines 1874–1876). There is no `server/routes/ai/` folder.
- `server/app.js` (249 lines): routers are required at lines 12–26 and mounted at lines 203–216; an unknown `GET /api/…`
  answers JSON 404 (line 229), any other method Express's own 404.
- `docs/brain/invariants.md`: INV-6 `Touches` is `server/routes/ai.js`, `src/app/**/*ai*`; INV-1 `Touches` lists the
  existing routers. `scripts/scope-check.mjs --arch` only compares a plan's scope with the `Touches` globs; it has no
  rule about a plan that edits the registry file itself.
- The brief's "the whole existing suite green, untouched" cannot hold literally: five existing server tests assert a
  registry's exact content. In this plan the rule is "green, with only the registry-content assertions updated":
  `server/test/collections.test.js`, `server/test/cross-business.test.js`, `server/test/ai-usage.test.js`,
  `server/test/business-settings.test.js`, `server/test/business-route.test.js` (all five are in the scope block).
- None of these names exists in `server/`, `shared/schemas/` or `src/app/`: `MODULE_OFF`, `requireModule`,
  `modulesOf`, `stockCounts`, `priceHistory`, `aiDrafts`, `storedFiles`, `businessAccess`, `invoiceAliases`,
  `supplierProfiles`.

## Goals & Success Criteria
**Primary:** every schema, collection flag, index, permission list entry, AI feature key, empty router and mount the
program needs exists and is tested, and the application behaves as before.

- [auto] `pnpm run test:server` → exit 0, including the new `server/test/modules-schema.test.js` and
  `server/test/modules-registry.test.js` and the five updated files named in the scope.
- [auto] `server/test/modules-schema.test.js`: `modulesOf` returns the four defaults for a business with no `modules`
  field, `[]` for a stored empty list, and drops `event_logistics` when `events` is not in the list; `hasModule`
  agrees; `MODULE_OF_TYPE` has exactly the seven types of the C-MODULES table.
- [auto] `server/test/modules-schema.test.js`: a stored business document of today (no new field) still passes
  `businessSchema`; one with `modules`, `platformHistory`, `aiMonthlyTokenCap: 0`, `aiPrivate: true` passes; a sixth
  module, a repeated module, a 51st history row, a cap of `-1` and a cap of `1.5` are each refused.
- [auto] `server/test/modules-schema.test.js`: `businessSettingsSchema` accepts a body without `priceRiseAlertPct` and
  one with `5`, and refuses `0` and `101`; `supplierSchema` accepts `taxId: '123456789'` and refuses `'12345'`;
  `menuEventSchema` accepts `siteLogistics.loaded` with one row and refuses 601 rows.
- [auto] `server/test/modules-schema.test.js`: each of the nine new schemas accepts one full valid document and refuses
  one with an unknown key; `Object.keys(sharedInvoiceAliasSchema.shape)` and `Object.keys(supplierProfileSchema.shape)`
  equal the Contract's key lists (no price, quantity or date of purchase); `SCHEMA_BY_COLLECTION` has the nine new keys.
- [auto] `server/test/collections.test.js`: the nine new entries carry the flags of the C-REGISTRY table — with `softDelete: false` on all nine, `invoices` and `stockCounts` included — and
  `ROUTER_WRITE_TYPES` equals `['requests', 'bookings', 'invoices', 'diagnoses', 'stockCounts']`.
- [auto] `server/test/modules-registry.test.js`: for `invoices`, `diagnoses` and `stockCounts` the owner's generic
  GET returns his seeded document, another business gets `[]`, and a generic POST, PUT and DELETE answer 405
  `USE_ROUTER`; a staff GET of `invoices` returns only `supplierName`, `invoiceDate`, `invoiceNumber` and the base
  fields (no `lines`); a staff GET of `diagnoses` returns no `menu`; a generic GET of each of the six server-only
  collections answers 403.
- [auto] `server/test/modules-registry.test.js`: after `connectDb` the ten indexes named in Must Have exist by
  name; two own aliases with the same `businessId`, `supplierKey`, `nameKey` collide (E11000) while two shared rows
  that differ only in `masterProductId` do not, and an own row and a shared row with the same keys do not; two live
  `businessAccess` rows of one user and business collide, a revoked one beside a live one does not.
- [auto] `server/test/modules-registry.test.js` ("registry probe" block): `GET <mount>/__registry_probe__` answers 404
  for each of the ten mounts — `/api/v1/files`, `/api/v1/access`, `/api/v1/stock`, `/api/v1/diag`,
  `/api/v1/admin/learning`, `/api/v1/ai/voice`, `/api/v1/ai/logistics`, `/api/v1/ai/invoices`, `/api/v1/ai/diag`,
  `/api/v1/ai/stock` — sent with the token of a platform admin who owns a business that has all five modules; each
  of the ten router modules loads on its own and exports a router function; `require('../routes/ai')` exposes
  `respondFromGeminiFailure`, `usageOf`, `requestedModel` and `aiLimiter` as functions.
- [auto] `server/test/modules-registry.test.js`: a `PUT /api/v1/events/:id/logistics` on an event whose
  `siteLogistics.loaded` holds one row leaves that row unchanged.
- [auto] `server/test/ai-usage.test.js`: `AI_FEATURES` has 23 keys and `isAiFeature` is true for
  `logistics_extract`, `invoice_read`, `menu_prices_parse`, `stock_extract`.
- [auto] `server/test/business-settings.test.js` and `server/test/business-route.test.js`: a read of a business with
  no stored settings returns `priceRiseAlertPct: 5` beside the three existing defaults, and a `PUT /settings` body
  with only the three existing numbers still answers 200.
- [auto] `pnpm run test:ci` → exit 0 (the browser compiles the changed shared schemas; no spec is edited).
- [auto] `pnpm run build` → exit 0. `pnpm --dir server run lint` → exit 0. `pnpm run lint` → exit 0.
- [auto] `node scripts/scope-check.mjs --arch --plan=plans/615-register-modules-program-schemas-collections-indexes-empty-routers.plan.md`
  → `ARCH: ok INV-1, INV-4, INV-6` after the `Touches` lines are edited.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.

## Execution Mode
- Parallel: no — first plan of run `mod-0` (615, 616, 617, 618, 619, 620, in that order). It edits every shared
  registry of the map's must-not-run list (`shared/schemas/entities/index.ts`, `business.schema.ts`,
  `server/constants/collections.js`, `server/constants/ai-features.js`, `server/db.js`, `server/app.js`,
  `server/routes/ai.js`, `server/utils/permissions.js`, `shared/schemas/money-fields.ts`,
  `shared/schemas/staff-fields.ts`); no other plan of the program, and no open plan that edits `server/routes/ai.js`,
  may run beside it.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/modules.ts
shared/schemas/index.ts
shared/schemas/money-fields.ts
shared/schemas/staff-fields.ts
shared/schemas/entities/index.ts
shared/schemas/entities/business.schema.ts
shared/schemas/entities/supplier.schema.ts
shared/schemas/entities/menu-event.schema.ts
shared/schemas/entities/invoice.schema.ts
shared/schemas/entities/price-history.schema.ts
shared/schemas/entities/invoice-alias.schema.ts
shared/schemas/entities/supplier-profile.schema.ts
shared/schemas/entities/ai-draft.schema.ts
shared/schemas/entities/stored-file.schema.ts
shared/schemas/entities/business-access.schema.ts
shared/schemas/entities/diagnosis.schema.ts
shared/schemas/entities/stock-count.schema.ts
server/constants/collections.js
server/constants/ai-features.js
server/db.js
server/app.js
server/routes/ai.js
server/routes/ai/**
server/routes/files.js
server/routes/access.js
server/routes/stock.js
server/routes/diag.js
server/routes/admin-learning.js
server/utils/permissions.js
server/test/modules-schema.test.js
server/test/modules-registry.test.js
server/test/collections.test.js
server/test/cross-business.test.js
server/test/ai-usage.test.js
server/test/business-settings.test.js
server/test/business-route.test.js
docs/brain/invariants.md
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

- INV-1: preserves — `OWNER_ONLY_TYPES`, the money list and the staff read list only gain entries for the new types; the three new readable types are written by no generic route (405) and read inside the caller's business only; the five new routers are empty, and the `Touches` line gains them so every later plan that fills one is checked against this rule.
- INV-4: preserves — every new shape is a Zod schema in `shared/schemas`, registered in `SCHEMA_BY_COLLECTION`; the new fields on the business, the supplier and the event are optional, so stored documents still validate.
- INV-6: preserves — the five AI sub-routers are mounted inside `server/routes/ai.js`, so every model call still enters through that file; the `Touches` line gains `server/routes/ai/**`. The rule text is unchanged.

## Reuse Check

- `shared/schemas/modules.ts` (`MODULE_KEYS`, `DEFAULT_MODULES`, `modulesOf`, `hasModule`, `MODULE_OF_TYPE`, `platformUpdateSchema`) — family: none — rung: 4 — why: no module list exists; one shared file so the server gate and the browser service use the same rule.
- nine entity schema files under `shared/schemas/entities/` — family: none — rung: 4 — why: new stored shapes; they follow the existing pattern of one `z.strictObject` per file registered in `SCHEMA_BY_COLLECTION`.
- ten empty Express routers (`server/routes/files.js`, `access.js`, `stock.js`, `diag.js`, `admin-learning.js`, `server/routes/ai/voice.js`, `logistics.js`, `invoices.js`, `diag.js`, `stock.js`) — family: server-auth — rung: 1 — why: plain `Router()` files mounted like the existing ones; they add no auth, scope or limiter of their own.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the platform admin, I want the pieces of the program declared in one place so that the invoice, field-event and stock features can be built side by side without breaking each other.
- As an owner, I want nothing in my kitchen to change on the day this is installed so that my prices, events and settings read exactly as before.
- As a chef on staff, I want an invoice's prices to stay hidden from me by the same rule that hides other money so that the owner decides who sees costs.

## Functional Requirements

### Must Have (P0)
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
  **C-AICAP (617)**
  - `business.aiMonthlyTokenCap?: number` (integer ≥ 0; absent or `null` = no cap, A2).
  - `server/services/ai-cap.js` → `capState(db, businessId, now) → { cap, used, over }`. The month is the calendar
    month in `Asia/Jerusalem` (the `day` field of `aiUsage`); `used` = the sum of `totalTokens` of that month's rows.
    A per-process cache of at most 60 s per business is allowed.
  - Enforced in `callGemini`, before the first HTTP call, when `usage.businessId` is a real business: it returns a
    failure of kind `business_cap`, writes one ledger row `ok: false, errorCode: 'business_cap'` with zero tokens,
    and makes no request. `respondFromGeminiFailure` maps it to 429 `{ error: 'ai_monthly_cap_reached' }`.
    `'__platform__'` calls are never capped. Message key `ai_monthly_cap_reached`.
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-LEARN (618; used by 627, 630, 633)**
  - `business.aiPrivate?: boolean` — platform admin only (C-MODULES platform write). Absent = shared (D8).
  - `server/utils/ai-learning.js` → `mayLearnFrom(business) → business?.aiPrivate !== true`. The only test any code
    uses before it (a) copies something into a `'__master__'` pool, (b) lists a business's AI material for the
    platform admin. A private business keeps its own per-business memory and its own drafts.
  - `setAiPrivate(id, value)` in `server/services/business.js` replaces `setShareAiExamples`: turning private on
    deletes the business's promoted `GEMINI_SHOTS` copies (`promotedFrom.businessId`) and calls
    `forgetBusiness` (C-ALIAS, a no-op until 627).
  - Removed: `PUT /api/v1/business/share-ai-examples`, `shareAiExamplesInputSchema`,
    `BusinessService.updateShareAiExamples`. `business.shareAiExamples` stays in the schema as optional so stored
    documents validate; nothing reads it.
  - `GET /api/v1/admin/ai-shots` candidates and `POST …/promote`: every business with `mayLearnFrom` true.
  - The owner's card `ai-examples-share` shows one locked chip (shared / private) and a tooltip from a dictionary
    key saying private mode is arranged by contacting FoodVibe. It calls no route.
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-AIDRAFT (618; used by 622, 625, 626, 633, 637)**
  - Collection `aiDrafts` (server-only): `{ _id, businessId, userId, feature, subject?: { type: 'menuEvent' |
    'invoice' | 'diagnosis' | 'stockCount', id?: string }, input: { text?: string (≤ 20,000), fileId?: string },
    aiDraft, model?: string, saved?, keptRatio?: number (0–1), status: 'pending' | 'confirmed', at, confirmedAt? }`
    (`model` = the model that answered, so accuracy can be read per model).
    Index `{ businessId, feature, at }`. At most the newest 500 per business and feature are kept.
  - `server/services/ai-drafts.js`: `saveAiDraft(req, { feature, subject?, input, aiDraft, model? }) → draftId` (never
    throws; on failure returns `null` and the feature still answers); `confirmAiDraft(req, draftId, saved, ratio)`
    — `ratio` is a pure function `(aiDraft, saved) → 0..1` owned by the feature (lines saved unchanged / lines
    suggested). A draft of another business answers 404.
  - Nothing from `aiDrafts` is returned by a business route except its `_id`.
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-FILES (619; used by 621, 626, 628)**
  - `server/services/file-store.js`: `isFileStoreConfigured()` (all of `CLOUDINARY_CLOUD_NAME`,
    `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` set); `putPrivateFile(req, { kind: 'invoice' | 'voice', mimeType,
    buffer, deleteAfterDays? }) → fileId | null` — `null` when not configured or when the upload fails (one warn log with kind and
    size, never the content; never throws); `signedFileUrl(file, ttlSeconds)`; `deleteStoredFile(file)`;
    `setFileStoreForTests(fake)`.
  - Upload is signed by the server and delivered as an authenticated (non-public) asset; no new npm dependency
    (`node:crypto` + `fetch`). Check the provider's current upload and signed-delivery documentation before writing
    the plan; do not write the request shape from memory.
  - Collection `storedFiles` (server-only): `{ _id, businessId, kind, mimeType, bytes, provider: 'cloudinary',
    providerId, resourceType, createdBy, createdAt, deleteAfter?: number }`. Index `{ businessId, kind, createdAt }`.
  - `GET /api/v1/files/:id` → `{ url }` (expires in 300 s) for a member of the file's business; 404 otherwise.
    An invoice file: owner (and consultant) only — it shows prices.
  - Limits: base64 ≤ 1,800,000 characters (the JSON body limit is 2 MB). Mime allowlists — invoice:
    `image/jpeg`, `image/png`, `image/webp`, `application/pdf`; voice: `audio/webm`, `audio/mp4`, `audio/ogg`,
    `audio/mpeg`, `audio/wav`.
  - Retention: a voice file gets `deleteAfter = createdAt + 730 days`; `server/jobs/retention.js` deletes the
    provider asset and the document of every stored file whose `deleteAfter` has passed (lazy, same throttle). An
    invoice file is stored at read time with `deleteAfterDays: 30`; when `apply` writes the invoice it calls
    `keepStoredFile(db, businessId, fileId)` (`file-store.js`), which clears `deleteAfter` — so a read nobody saved is
    cleaned up, and a kept invoice's file lives as long as its invoice.
  - Model input: `callGemini` gains `needsMedia?: 'image' | 'audio' | 'pdf'` (`needsVision: true` keeps meaning
    `'image'`); a model that cannot take the medium is skipped in the chain; ledger rows gain `audioSeconds?` and
    `fileCount?`.
  - `GET /api/v1/admin/learning/status` → `{ fileStore: boolean }`.
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-LOAD (624)**
  - `shared/schemas/logistics/loading-list.ts` → `buildLoadingList({ equipment, guestCount, answers }) →
    LoadingRow[]`, `LoadingRow = { key, label, source: 'equipment' | 'logistics', quantity, owned?, shortage?,
    section? }`. Pure; used by the browser and by server tests.
  - Equipment rows: every live equipment record with a `scalingRule` whose `perGuests > 0` —
    `quantity = min(max(ceil(guestCount / perGuests), minQuantity), maxQuantity ?? ∞)`,
    `shortage = max(0, quantity − ownedQuantity)`. Step 0: no screen sets `scalingRule` today; the unused dictionary
    labels agree with "one per `perGuests` guests, between min and max". 624 adds the inputs to the equipment form
    (switch `scaling_enabled`, numbers `per_guests`, `min_quantity`, `max_quantity`; the list row shows
    `scaling_summary` or `no_scaling`), with the keys that already exist.
  - Logistics rows: answers with `status: 'needed'` and `payer` `ours` or `chef`; `quantity` = the answer's
    quantity, else 1; `key` = `itemKey`.
  - Ticks: `menuEvents.siteLogistics.loaded?: [{ key, at, by, byName }]` (≤ 600), server-owned, written by
    `PUT /api/v1/events/:id/loading` body `{ key, loaded: boolean }` — any member of the business,
    `requireModule('event_logistics')`, not on a finished event.
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-INVOICE (625; used by 626–629, 633)**
  - `invoices`: `{ ...baseDocShape, supplierId?, supplierName, supplierTaxId? (^\d{9}$), invoiceNumber? (≤ 40),
    invoiceDate? ('YYYY-MM-DD'), vatIncluded?, source: 'photo' | 'pdf' | 'text', fileId?, draftId?, supplierKey?,
    lines: [{ printedName (≤ 200), quantity?, unit?, unitPrice?, lineTotal?, price: number | null, needsReview,
    productId?, result: 'created' | 'updated' | 'same_price' | 'no_price' | 'invalid' | 'duplicate' }] (≤ 200) }`.
    Read through the generic API (owner; staff get 200 with only the three header fields — the generic API trims, it
    does not refuse); written only by `apply`.
  - `priceHistory` (server-only): `{ _id, businessId, productId, supplierId ('' = none), price, prevPrice?,
    changePct?, at, by, source: 'invoice' | 'import', invoiceId? }`. `changePct = (price − prevPrice) / prevPrice ×
    100`, two decimals, computed by code. Indexes `{ businessId, productId, at }`, `{ businessId, at }`.
  - `POST /api/v1/product-import/apply` body gains optional `invoice: { supplierName, supplierTaxId?,
    invoiceNumber?, invoiceDate?, vatIncluded?, source, fileId?, draftId?, supplierKey?, lines: [{ printedName,
    quantity?, unit?, unitPrice?, lineTotal?, needsReview, row: number }] }` (`row` = index into `rows`). In the same
    request: products as today, one `priceHistory` row per created or changed price, one `invoices` document, and
    `confirmAiDraft` when `draftId` is given. Response gains `invoiceId?`. Without `invoice` the route behaves as
    today, plus the history rows (`source: 'import'`). The route has no transaction today and gets none: the writes run
    in this order — products, `priceHistory`, `invoices`, the draft confirm. A failure after the product write is
    logged (`product_import.apply.trail_failed`, ids and counts only) and the response is still 200 with the product
    result and `invoiceId: null`: the prices the person approved are never rolled back by a failed trail. `invoiceId`
    is the real id whenever the history rows and the invoice were both written, also when only the draft confirm failed.
  - `GET /api/v1/product-import/price-rises?days=60` (owner) → `[{ productId, supplierId, from, to, changePct, at }]`
    — the latest rise per product and supplier at or above the business's `priceRiseAlertPct`.
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-INVREAD (626; used by 628, 634)**
  - `POST /api/v1/ai/invoices/read` body `{ fileBase64, mimeType, knownCategories? }` — owner or consultant
    (`editMoney` on `products`), checked before the route's own limiter (60 / 15 minutes per user; not `aiLimiter`); `feature: 'invoice_read'`;
    `needsMedia: 'image' | 'pdf'` → `{ header: { supplierName?, supplierTaxId?, supplierPhone?, invoiceNumber?,
    invoiceDate?, vatIncluded? }, supplier: { supplierId?, matchedBy?: 'taxId' | 'phone' | 'name', supplierKey },
    rows: ImportRow[], printed: [{ name, quantity, unit, unitPrice, lineTotal }], truncated, draftId, fileId }`.
  - Rows go through the existing `normalizeReceiptRows` (`RECEIPT_MISMATCH_TOLERANCE` 5%, `needsReview`): one
    implementation of the line check, never a block. It drops nameless lines and merges duplicates, so `rows` and
    `printed` are not aligned by index: a row is linked to its printed line by normalised name, and the last printed
    line with that name wins. Header values are copied as printed; a tax id that is not 9
    digits is dropped.
  - `server/utils/supplier-key.js` → `supplierKey({ taxId, phone, name })` = `tax:<9 digits>` |
    `phone:<last 9 digits>` | `name:<normalizeProductName(name)>`.
  - When an apply carries a tax id and the chosen supplier has none, the apply sets `suppliers.taxId`.
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-ALIAS (627; used by 628, 630)**
  - `invoiceAliases` (server-only). Own alias: `{ _id, businessId, supplierKey, nameKey, printedName, productId,
    unit?, packQty?, hits, lastAt }`, unique `{ businessId, supplierKey, nameKey }` over rows that have a `productId`
    (a partial index) — the person's latest link wins. `packQty` is not filled in this program (no read gives it).
    Shared alias: `{ _id, businessId: '__master__', supplierKey, nameKey, printedName, masterProductId, hits,
    contributors: string[] (≤ 200, never returned), lastAt }`, unique `{ supplierKey, nameKey, masterProductId }`
    over rows that have a `masterProductId` (a partial index; the two unique indexes never meet on one row).
    `nameKey = normalizeProductName(printedName)`.
  - `supplierProfiles` (server-only, shared): `{ _id: supplierKey, names: string[] (≤ 10), vatIncludedYes,
    vatIncludedNo, invoices, contributors: string[] (≤ 200, never returned), lastAt }`.
  - Neither shared shape has a price, a quantity or a date of purchase (a schema test asserts the key list).
  - `server/services/invoice-memory.js`: `learnFromApply(db, business, { supplierKey, supplierName, vatIncluded,
    lines: [{ printedName, productId, unit? }] })` — always writes own aliases; writes shared rows only when
    `mayLearnFrom(business)` and the product is from the shared catalog (a live `products` document with
    `businessId: '__master__'` and `_id === product._masterId`); `resolveNames(db, businessId, { supplierKey,
    names }) → [{ i, productId, source: 'own' | 'shared' }]` — own first; shared = the target with the most
    contributors (newest on a tie), mapped to the business's live product whose `_masterId` is that target;
    `forgetBusiness(db, businessId)` — pulls the business from every `contributors` list and deletes rows left empty.
  - `POST /api/v1/product-import/resolve` body `{ supplierKey, names: string[] (≤ 200) }` (owner or consultant) →
    `{ matches }`. No model call.
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
  **C-DIAG (633; used by 634)**
  - `diagnoses`: `{ ...baseDocShape, name, periodDays (default 60, 30–365), menu: [{ name (≤ 200), sellPrice (≥ 0),
    dishId? }] (≤ 300), invoiceIds: string[] (≤ 100), homeBusinessId, status: 'open' | 'done' }`; read through the
    generic API (owner, consultant), written only by the router.
  - `/api/v1/diag` (`requireHomeModule('consultant_diag')`; owner, consultant or acting platform admin):
    `POST /`, `PUT /:id/menu` body `{ menu, draftId? }` (it confirms the AI draft), `PUT /:id/invoices`, `PUT /:id/status`, `GET /:id/data` → `{ diagnosis,
    volatility: [{ productId, supplierId, min, max, movePct, points }] }` from `priceHistory` inside the period;
    `movePct = (max − min) / min × 100`, two decimals, by code.
  - `POST /api/v1/ai/diag/menu` body `{ text (1–20,000) }` → `{ items: [{ name, sellPrice }], draftId }`;
    `feature: 'menu_prices_parse'`; prices copied as printed; an item without a printed price is returned with
    `sellPrice: null` and the person types it.
  - `shared/schemas/diag/margin-report.ts` → `buildMarginReport({ menu, costByDishId, volatility, settings }) →
    { dishes: [{ name, sellPrice, cost?, marginPct?, underTarget }], findings: [{ key, value, evidenceCount }] }`.
    Pure. `marginPct = (sellPrice − cost) / sellPrice × 100`; `underTarget` when below
    `settings.profitTargetPct`. The browser supplies `costByDishId` from `RecipeCostService` (the server has no
    cost engine).
  - A batch of invoice files is a queue in the browser: one `POST /ai/invoices/read`, one preview, one `apply` at a
    time. `/api/v1/ai/invoices/read` gets its own limiter for this (60 / 15 minutes per user) in 626.
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-STOCK (635; used by 636, 637)**
  - `stockCounts`: `{ ...baseDocShape, countedAt, status: 'draft' | 'final', source: 'manual' | 'voice' | 'text',
    draftIds?: string[] (≤ 20), note? (≤ 500), lines: [{ productId, quantity (≥ 0), unit, baseQuantity (≥ 0) }] (≤ 2,000), finalAt?,
    finalBy? }`. Written only by the router; `baseQuantity` is computed by the server. Index
    `{ businessId, status, countedAt: -1 }`. A count is never deleted in this program: a draft is continued or made final.
  - `/api/v1/stock`: `POST /counts`, `PUT /counts/:id` (draft only; its creator or the owner),
    `POST /counts/:id/finalize` (its creator or the owner; it also confirms every pending draft in `draftIds`
    through `confirmAiDraft`, and a failure there never fails the finalise), `GET /counts?status=draft|final&limit=`
    (any member; newest first; 20 by default, 100 at most), `GET /on-hand` → `[{ productId, baseQuantity,
    countedAt }]` — per product, the value in the newest final count that lists it.
  - Conversion to the base unit uses the product's `baseUnit`, its `purchaseOptions` and the unit rates. Step 0: the
    rule is `toBase(amount, unit, product, units)` in `src/app/core/engine/units.ts`, browser-only. 635 moves it
    unchanged to `shared/schemas/units/to-base.ts` (with `normalizeUnit`, `unitFamily` and what they need);
    `units.ts` re-exports it, so the browser has no second rule. On the server the rates are the `gramRate` of the
    `unit` taxonomy terms (master ∪ the business's own) over the system units. A unit that cannot be converted for a
    product answers 400 `UNIT_NOT_CONVERTIBLE` with the line index.
  - `POST /api/v1/ai/stock/extract` body `{ text (1–20,000), fileId? }` — any member; `feature: 'stock_extract'` →
    `{ draftId, lines: [{ productId, quantity, unit }], unmatched: [{ spoken, quantity?, unit? }] }`. The server
    sends the numbered names of the business's live products (≤ 800; more → 413 `TOO_MANY_PRODUCTS`), the model
    answers positions; an out-of-range position goes to `unmatched`.
- [ ] This plan registers shapes only. It implements no route, no service and no gate of the Contracts above; each
  Contract's behaviour belongs to the plan the map names.
- [ ] `shared/schemas/modules.ts` (new), exported from `shared/schemas/index.ts` (`export * from './modules'`):
  - `MODULE_KEYS`, `ModuleKey`, `DEFAULT_MODULES` exactly as in C-MODULES.
  - `modulesOf(business)`: when `business?.modules` is an array → its entries that are in `MODULE_KEYS`, without
    repeats, in `MODULE_KEYS` order, minus `event_logistics` when `events` is not among them; otherwise a copy of
    `DEFAULT_MODULES`. `null` and `undefined` give the defaults. A stored empty list gives `[]`.
  - `hasModule(business, key)` = `modulesOf(business).includes(key)`.
  - `MODULE_OF_TYPE: Record<string, readonly ModuleKey[]>` = `{ menuEvents: ['events'], venues: ['events'],
    requests: ['frontdesk'], bookings: ['frontdesk'], frontDeskProfiles: ['frontdesk'], knowledgeItems: ['frontdesk'],
    clients: ['events', 'frontdesk'] }` (any one key of a list is enough).
  - `modulesFieldSchema` = `z.array(z.enum(MODULE_KEYS)).max(5)` refined to have no repeats.
  - `platformHistoryRowSchema` = `z.strictObject({ at: number, by: string min 1, byName: string max 80, reason: string
    min 3 max 200, changed: array of string (max 40) max 10 })`.
  - `platformUpdateSchema` (body of the platform write, used by 616) = `z.strictObject({ modules: modulesFieldSchema
    .optional(), aiMonthlyTokenCap: z.number().int().min(0).nullable().optional(), aiPrivate: z.boolean().optional(),
    reason: z.string().trim().min(3).max(200) })` refined: at least one of `modules`, `aiMonthlyTokenCap`, `aiPrivate`
    is present. Type `PlatformUpdate`.
- [ ] `shared/schemas/entities/business.schema.ts`: `businessSchema` gains `modules: modulesFieldSchema.optional()`,
  `platformHistory: z.array(platformHistoryRowSchema).max(50).optional()`, `aiMonthlyTokenCap:
  z.number().int().min(0).optional()`, `aiPrivate: z.boolean().optional()`. `businessSettingsSchema` gains
  `priceRiseAlertPct: z.number().gt(0).max(100).optional()`. `BUSINESS_SETTINGS_DEFAULTS` gains `priceRiseAlertPct: 5`,
  which makes `GET /api/v1/business` (`server/routes/business.js:40`, not edited) return it. `shareAiExamples` and
  `shareAiExamplesInputSchema` stay (618 removes the input schema).
- [ ] `shared/schemas/entities/supplier.schema.ts`: `taxId: z.string().regex(/^\d{9}$/).optional()`.
- [ ] `shared/schemas/entities/menu-event.schema.ts`: inside `siteLogistics`, `loaded: z.array(z.strictObject({ key:
  z.string().min(1).max(200), at: z.number(), by: z.string(), byName: z.string() })).max(600).optional()`.
  `EVENT_SERVER_FIELDS` is not edited: `siteLogistics` is already in it.
- [ ] Nine new files under `shared/schemas/entities/`, each added to `index.ts` with `export * from` and to
  `SCHEMA_BY_COLLECTION`. Every schema is a plain `z.strictObject` with no top-level `.refine` (so `.shape` stays
  readable). Every `_id` is a string (`newId()` on the server). Export names later plans use:
  - `invoice.schema.ts` → `INVOICE_SOURCES` (`photo`, `pdf`, `text`), `INVOICE_LINE_RESULTS` (`created`, `updated`,
    `same_price`, `no_price`, `invalid`, `duplicate`), `INVOICE_LINES_MAX = 200`, `invoiceLineSchema`
    (`printedName` 1–200, `quantity?`, `unit?` max 40, `unitPrice?`, `lineTotal?`, `price: number | null`,
    `needsReview: boolean`, `productId?`, `result`), `invoiceSchema` (`...baseDocShape`, `supplierId?`, `supplierName`
    1–200, `supplierTaxId?` `^\d{9}$`, `invoiceNumber?` max 40, `invoiceDate?` `^\d{4}-\d{2}-\d{2}$`, `vatIncluded?`,
    `source`, `fileId?`, `draftId?`, `supplierKey?` max 260, `lines` max 200), type `Invoice`. Map key `invoices`.
  - `price-history.schema.ts` → `PRICE_HISTORY_SOURCES` (`invoice`, `import`), `priceHistorySchema` (`_id`,
    `businessId`, `productId`, `supplierId` — a string that may be empty, `price` ≥ 0, `prevPrice?` ≥ 0, `changePct?`,
    `at`, `by`, `source`, `invoiceId?`). Map key `priceHistory`.
  - `invoice-alias.schema.ts` → two schemas: `ownInvoiceAliasSchema` (`_id`, `businessId` — any id except
    `'__master__'`, `supplierKey` max 260, `nameKey` max 200, `printedName` 1–200, `productId`, `unit?` max 40,
    `packQty?` > 0, `hits` integer ≥ 1, `lastAt`) and `sharedInvoiceAliasSchema` (`_id`, `businessId:
    z.literal('__master__')`, `supplierKey`, `nameKey`, `printedName`, `masterProductId`, `hits`, `contributors`:
    array of string max 200, `lastAt`); `invoiceAliasSchema = z.union([ownInvoiceAliasSchema,
    sharedInvoiceAliasSchema])` is what `SCHEMA_BY_COLLECTION.invoiceAliases` holds.
  - `supplier-profile.schema.ts` → `supplierProfileSchema` (`_id` = the supplier key, `names`: array of string 1–200
    max 10, `vatIncludedYes`, `vatIncludedNo`, `invoices` — integers ≥ 0, `contributors` max 200, `lastAt`); no
    `businessId`. Map key `supplierProfiles`.
  - `ai-draft.schema.ts` → `AI_DRAFT_SUBJECT_TYPES` (`menuEvent`, `invoice`, `diagnosis`, `stockCount`),
    `AI_DRAFT_STATUSES` (`pending`, `confirmed`), `AI_DRAFT_TEXT_MAX = 20000`, `aiDraftSchema` (`_id`, `businessId`,
    `userId`, `feature` string 1–40, `model?` string max 80 (the model that produced the draft, so accuracy can be reported per model — MP-09), `subject?: { type, id? }`, `input: { text?: max 20,000, fileId? }`, `aiDraft` and
    `saved?` — each a JSON object or a JSON array, `keptRatio?` 0–1, `status`, `at`, `confirmedAt?`). Map key `aiDrafts`.
  - `stored-file.schema.ts` → `STORED_FILE_KINDS` (`invoice`, `voice`), `storedFileSchema` (`_id`, `businessId`,
    `kind`, `mimeType` max 100, `bytes` integer ≥ 0, `provider: z.literal('cloudinary')`, `providerId` 1–300,
    `resourceType` max 20, `createdBy`, `createdAt`, `deleteAfter?`). Map key `storedFiles`.
  - `business-access.schema.ts` → `businessAccessSchema` (`_id`, `userId`, `businessId`, `role:
    z.literal('consultant')`, `grantedBy`, `grantedByName` max 80, `grantedAt`, `revokedAt?`, `revokedBy?`). Map key
    `businessAccess`.
  - `diagnosis.schema.ts` → `DIAGNOSIS_STATUSES` (`open`, `done`), `diagnosisSchema` (`...baseDocShape`, `name` 1–200,
    `periodDays` integer 30–365, `menu`: array max 300 of `{ name 1–200, sellPrice ≥ 0, dishId? }`, `invoiceIds`:
    array of string max 100, `homeBusinessId`, `status`). Map key `diagnoses`.
  - `stock-count.schema.ts` → `STOCK_COUNT_STATUSES` (`draft`, `final`), `STOCK_COUNT_SOURCES` (`manual`, `voice`,
    `text`), `stockCountSchema` (`...baseDocShape`, `countedAt`, `status`, `source`, `draftIds?`: array of string max 20, `note?` max 500,
    `lines`: array max 2,000 of `{ productId, quantity ≥ 0, unit 1–40, baseQuantity ≥ 0 }`, `finalAt?`, `finalBy?`).
    Map key `stockCounts`.
  Request-body schemas of the later routes (the `invoice` part of `apply`, the count bodies, and so on) are not written
  here: the plan that owns a schema file adds them to that file.
- [ ] `server/constants/collections.js`: nine entries exactly as the C-REGISTRY table, each with a one-line comment
  naming its plan and Contract. All nine carry `softDelete: false` — `invoices` and `stockCounts` too (Planner,
  2026-11-17: a router-written type gets 405 on every generic write and no Contract adds a delete route; the
  C-REGISTRY table is corrected to say so). The six server-only ones have no `routerWrites` key.
- [ ] `server/utils/permissions.js:21`: `OWNER_ONLY_TYPES` gains `'invoices'`, `'diagnoses'`. Nothing else in the
  file changes. `shared/schemas/money-fields.ts`: `invoices: ['lines[].unitPrice', 'lines[].lineTotal',
  'lines[].price']`. `shared/schemas/staff-fields.ts`: `invoices: ['supplierName', 'invoiceDate', 'invoiceNumber']`
  and `diagnoses: ['name', 'status']` (C-DIAG gives the read to the owner and the consultant only; without an entry
  the generic GET would hand staff the whole document with its selling prices — see Execution Notes).
- [ ] `server/db.js`, after the plan-550 block, one block per collection with a comment naming the Contract:
  - `aiDrafts` `{ businessId: 1, feature: 1, at: 1 }` name `ai_drafts_business_feature_at`.
  - `storedFiles` `{ businessId: 1, kind: 1, createdAt: 1 }` name `stored_files_business_kind`.
  - `priceHistory` `{ businessId: 1, productId: 1, at: 1 }` name `price_history_business_product_at` and
    `{ businessId: 1, at: 1 }` name `price_history_business_at`.
  - `invoiceAliases`, both unique and both partial so own and shared rows never collide (a partial filter cannot say
    "not equal"): `{ businessId: 1, supplierKey: 1, nameKey: 1 }` with `partialFilterExpression: { productId:
    { $exists: true } }`, name `invoice_alias_own_unique`; `{ supplierKey: 1, nameKey: 1, masterProductId: 1 }` with
    `partialFilterExpression: { masterProductId: { $exists: true } }`, name `invoice_alias_shared_unique`.
  - `businessAccess` unique `{ userId: 1, businessId: 1, revokedAt: 1 }`, name `business_access_live_unique`. This is
    how "one live grant per user and business" is enforced: a row with no `revokedAt` is indexed as null, so two live
    rows collide, and a revoked row carries its own time. A partial filter cannot say "the field is absent" (see
    Execution Notes).
  - `invoices` `{ businessId: 1, createdAt: -1 }` name `invoices_business_created`; `diagnoses`
    `{ businessId: 1, createdAt: -1 }` name `diagnoses_business_created`; `stockCounts`
    exactly `{ businessId: 1, status: 1, countedAt: -1 }` (the index C-STOCK's on-hand read uses), name `stock_counts_business_status_counted` — the three readable
    collections are not cloneable, so the generic `businessId` index loop (`db.js:77`) does not cover them.
  - `supplierProfiles` needs none (it is read by `_id`).
- [ ] `server/constants/ai-features.js`: `AI_FEATURES` gains `logistics_extract`, `invoice_read`,
  `menu_prices_parse`, `stock_extract` (23 keys), under a comment "Modules program (plan 615, C-REGISTRY)".
- [ ] Ten new router files, each exactly `'use strict'`, a comment naming the plan that fills it, `const { Router } =
  require('express')`, `module.exports = Router()`: `server/routes/ai/voice.js` (621), `ai/logistics.js` (622),
  `ai/invoices.js` (626), `ai/diag.js` (633), `ai/stock.js` (637), `server/routes/files.js` (619), `access.js` (631),
  `stock.js` (635), `diag.js` (633), `admin-learning.js` (619, 630).
- [ ] `server/routes/ai.js`: five mount lines directly after `router.use(trackAiOutcome)` (line 106) —
  `router.use('/voice', require('./ai/voice'))`, `'/logistics'`, `'/invoices'`, `'/diag'`, `'/stock'` — so the outcome
  tracker covers them. At the end of the file, after the existing exports, four more:
  `module.exports.respondFromGeminiFailure`, `.usageOf`, `.requestedModel`, `.aiLimiter`. No other line of the file
  changes. Because `ai.js` requires each sub-router before it sets its own `module.exports`, a sub-router must read
  these four with `require('../ai')` **inside a handler** (or a lazy getter), never at the top of its module — write
  this sentence as a comment above the mount lines and in each of the five sub-router files.
- [ ] The 404 test must stay green after later plans (619, 621, 622, 626, 630, 631, 633, 635, 637) fill these
  routers. It lives in `server/test/modules-registry.test.js`, probes only the path `/__registry_probe__` (a path no
  plan serves), sends a platform-admin token of a business with every module so a router-level token, admin or module
  check added later lets it through to the 404, and never asserts that a router has no route.
- [ ] `server/app.js`: five `require` lines beside the others; four mounts after the `product-import` mount and
  before the public router: `/api/v1/files`, `/api/v1/access`, `/api/v1/stock`, `/api/v1/diag`; and
  `/api/v1/admin/learning` directly **before** `app.use('/api/v1/admin', adminRouter)` (line 211)
  so the more specific path is matched first.
- [ ] `docs/brain/invariants.md`: INV-6 `Touches` gains `` `server/routes/ai/**` ``; INV-1 `Touches` gains
  `` `server/routes/files.js` ``, `` `server/routes/access.js` ``, `` `server/routes/stock.js` ``,
  `` `server/routes/diag.js` ``, `` `server/routes/admin-learning.js` ``. Only those two `- Touches:` lines change;
  the `Rule`, `Source`, `Users lose if broken` and `Test` lines and the file's shape stay byte-identical.
- [ ] Existing tests that assert a registry's exact content are updated, and nothing else in them:
  `collections.test.js` (the `ROUTER_WRITE_TYPES` list and its title), `cross-business.test.js` (`BODY` gains
  `invoices`, `diagnoses`, `stockCounts` as `() => ({})` with the comment "written only by their routers"),
  `ai-usage.test.js` (19 → 23), `business-settings.test.js` (`DEFAULTS` gains `priceRiseAlertPct: 5`; the
  "next GET returns them" case expects `{ ...VALID, priceRiseAlertPct: 5 }`), `business-route.test.js:32` (the
  settings object gains `priceRiseAlertPct: 5`). Every other existing test file stays untouched and green.
- [ ] The two backend docs are filled here, once, for everything this plan registers, so no later server plan of the
  program has to edit them. `docs/agent/standards-backend.md` §1: one row for each of the nine collections (purpose,
  who reads, who writes, flags, its Contract and the plan that fills it); §5: one paragraph "Modules program routes"
  listing the ten mounted paths, each with the Contract that defines its routes in `docs/modules/modules-map.md` and
  the plan that fills it. `server/breadcrumbs.md`: one row for each of the ten router files (path, mount, Contract,
  "empty until plan NNN") and one for `shared/schemas/modules.ts`.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- No screen changes and no dictionary key. The settings tab keeps its three inputs: it reads the stored settings with
  the new default filled in and saves only its three controls, as today.
- The labels of the four new AI feature keys (`ai_feature_logistics_extract`, `ai_feature_invoice_read`,
  `ai_feature_menu_prices_parse`, `ai_feature_stock_extract`) are added by the browser plan that first shows them; until
  then the platform table shows the raw key for a feature nobody can call yet.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Name the five modules and the rule for a business that has no list yet — MODULE_KEYS, DEFAULT_MODULES, modulesOf, hasModule, MODULE_OF_TYPE, modulesFieldSchema, platformHistoryRowSchema, platformUpdateSchema; export from the package index; first cases of the schema test — shared/schemas/modules.ts, shared/schemas/index.ts, server/test/modules-schema.test.js
- [ ] A2: Let a business, a supplier and an event carry the new optional fields without breaking stored ones — modules, platformHistory, aiMonthlyTokenCap, aiPrivate, priceRiseAlertPct with default 5, taxId, siteLogistics.loaded; schema cases; update the two settings tests — shared/schemas/entities/business.schema.ts, supplier.schema.ts, menu-event.schema.ts, server/test/modules-schema.test.js, server/test/business-settings.test.js, server/test/business-route.test.js
- [ ] A3: Describe the nine new kinds of record so the server can validate them — the nine schema files with the export names in Must Have, index exports, SCHEMA_BY_COLLECTION keys; one valid and one refused document each, shared key lists — shared/schemas/entities/invoice.schema.ts, price-history.schema.ts, invoice-alias.schema.ts, supplier-profile.schema.ts, ai-draft.schema.ts, stored-file.schema.ts, business-access.schema.ts, diagnosis.schema.ts, stock-count.schema.ts, shared/schemas/entities/index.ts, server/test/modules-schema.test.js
- [ ] A4: Register the nine collections and who may read or change them — the nine collections.js entries; OWNER_ONLY_TYPES, MONEY_FIELDS, STAFF_READ_FIELDS entries; collections test, cross-business BODY; owner, staff, other-business and 405 cases — server/constants/collections.js, server/utils/permissions.js, shared/schemas/money-fields.ts, shared/schemas/staff-fields.ts, server/test/collections.test.js, server/test/cross-business.test.js, server/test/modules-registry.test.js
- [ ] A5: Create the database indexes the new records are found by — the ten indexes of Must Have with their names and partial filters; index-name and duplicate-key cases — server/db.js, server/test/modules-registry.test.js
- [ ] A6: Add the four new AI feature names so every later model call can be counted — AI_FEATURES 19 to 23; update the length assertion — server/constants/ai-features.js, server/test/ai-usage.test.js
- [ ] A7: Open five empty doors under the AI route and share its helpers with them — five Router files, five mounts after trackAiOutcome, four extra exports at the end, the lazy-require comment; 404, module-load and export cases — server/routes/ai/voice.js, logistics.js, invoices.js, diag.js, stock.js, server/routes/ai.js, server/test/modules-registry.test.js
- [ ] A8: Open five empty doors for files, access, stock, diagnosis and platform learning — five Router files, requires and mounts (admin/learning before admin); 404 cases and the logistics-save-keeps-loaded case — server/routes/files.js, access.js, stock.js, diag.js, admin-learning.js, server/app.js, server/test/modules-registry.test.js
- [ ] A9: Point the architecture rules and the backend docs at the new files — INV-6 and INV-1 Touches lines only; nine rows in the collection table and the routes paragraph; eleven rows in the server map — docs/brain/invariants.md, docs/agent/standards-backend.md, server/breadcrumbs.md
- [ ] A10: Run every check and record the results — test:server, test:ci, build, both lints, scope-check --arch on this plan, log-query; paste the exit lines into Execution Notes — this plan file

## Technical Considerations
- Dependencies: `server/routes/generic.js` (reads `ALL_USER_ENTITY_TYPES`, `ROUTER_WRITE_TYPES`, `SOFT_DELETE_TYPES`), `server/jobs/purge-deleted.js` (unchanged: none of the nine collections is a soft-delete type), `server/routes/admin.js` (a whole-business delete loops `ALL_USER_ENTITY_TYPES`, so it now also clears the three readable collections), `server/utils/schema-check.js`, the browser's settings tab and closing dialog (read `BUSINESS_SETTINGS_DEFAULTS`).
- New files needed: `shared/schemas/modules.ts`; the nine schema files; the ten router files; `server/test/modules-schema.test.js`, `server/test/modules-registry.test.js`.
- Model changes: `Business`, `BusinessSettings`, `Supplier`, `MenuEvent` gain optional fields; new types `ModuleKey`, `PlatformUpdate`, `Invoice`.
- Backend / API: no new working route. Ten mounted paths that answer 404. `GET /api/v1/data/invoices`, `/diagnoses`, `/stockCounts` become readable (empty until 625, 633, 635 write them); `GET /api/v1/business` settings gain `priceRiseAlertPct`.
- Auth and validation: generic writes of the three readable types answer 405; staff reads of `invoices` and `diagnoses` are trimmed by `staffProjection`; the six server-only collections stay unreachable through the generic API (403).
- Security surface: none new — no input is accepted. The supplier `taxId` becomes a writable optional field of a supplier, checked as nine digits.
- Data / migration: no migration; every new field is optional and every new collection is created on first insert. Ten indexes are created at startup (`createIndex` is idempotent). Tests fake nothing here: no model, file store or clock is involved; the registry test uses the in-memory Mongo app of `server/test/helpers/app.js` (`buildTestApp`, `signTestToken`, `testDb`).
- Project checks: `[auto] log-query`; `pnpm run test:server` and `pnpm run test:ci`; `standards-backend.md` §3 steps 1, 2, 4 and 5 for the three readable collections (step 3, the browser model and data service, belongs to the screen plans 628, 634, 636; step 7 does not apply — none of the three holds a customer's personal data); entity shapes in `shared/schemas`; no dictionary key, no icon, no new UI piece.

## Out of Scope
- Any behaviour: the module gate (616), the cap (617), learning and the draft trail (618), the file store (619), every route of the ten routers.
- The browser: `ModuleService`, guards, navigation, dialogs (620) and every screen.
- `users.activeBusinessId` and the token payload (631, `server/models/user.model.js`).
- An input for `priceRiseAlertPct` in the settings tab (629). Until then a save of the settings tab stores the three numbers only, as today.
- Removing `shareAiExamples` handling (618).
- The clean-up of the six server-only collections when the platform admin deletes a whole business.

## Critical Questions
- none

## Execution Notes
- decided: "the whole existing suite green, untouched" (brief, card) is replaced by "green, with only the registry-content assertions updated" — why: `collections.test.js`, `cross-business.test.js`, `ai-usage.test.js`, `business-settings.test.js` and `business-route.test.js` assert the exact lists and defaults this plan extends; no other existing test is edited.
- decided: the rows of `standards-backend.md` and `server/breadcrumbs.md` for all nine collections and all ten routers are written here — why: one place; later server plans of the program need not touch those two docs.
- decided: all nine collections are registered with `softDelete: false`, the `stockCounts` index is exactly `{ businessId, status, countedAt: -1 }`, and a stock count carries `draftIds?` (at most 20) instead of `draftId?` — why: Planner corrections from the stock lane, 2026-11-17.
- decided: the empty-router test probes `/__registry_probe__` with an all-modules platform-admin token and does not assert emptiness — why: later plans fill the routers and must not break this test.
- decided: `aiDraftSchema` gains `model?` (at most 80 characters) — why: Planner, 2026-11-17; plan 630 reports scan accuracy per model.
- decided: 615 stays one plan — why: all of it is declaration with no behaviour (about 21 small new files and 14 edited ones), the two halves the card suggests would both edit `entities/index.ts` and `collections.js`, and a second number would shift every plan of the run.
- decided: the body schema of the platform write (`platformUpdateSchema`) lives in `shared/schemas/modules.ts` and is written here — why: 616 then writes no file under `shared/schemas`.
- decided: `STAFF_READ_FIELDS` gains `diagnoses: ['name', 'status']`, which C-REGISTRY does not list — why: C-DIAG says a diagnosis is read by the owner and the consultant; the generic GET trims a staff read only through this list, and no later plan may edit the file.
- decided: `businessAccess` uniqueness is a full unique index on `userId, businessId, revokedAt` instead of the partial index C-ACCESS words — why: MongoDB partial filters cannot express "no `revokedAt`"; the effect (one live grant per user and business) is the same and the document shape of the Contract is untouched.
- decided: both `invoiceAliases` unique indexes are partial (`productId` / `masterProductId` exists) — why: Planner instruction 2026-11-17; without it shared rows with two different targets would collide on the own-alias index.
- decided: three extra indexes led by `businessId` for `invoices`, `diagnoses`, `stockCounts` — why: every read is scoped by business (`db.js:75`), these collections are not in the cloneable index loop, and `db.js` is closed to later plans.
- decided: the AI helpers are shared by four extra exports at the end of `server/routes/ai.js`, read lazily by the sub-routers — why: Planner instruction 2026-11-17; `ai.js` loads the sub-routers before its own exports exist.
- decided: `siteLogistics.loaded[].key` allows 200 characters — why: a logistics key is at most 120 and an equipment row may carry a prefix.
- decided: `BUSINESS_SETTINGS_DEFAULTS` gains the default 5 — why: it is the one place the read fills defaults; it changes three exact-object assertions in two existing server tests, which this plan updates.
