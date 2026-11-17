# Plan 635 — Stock counts on the server: records, draft and final, on-hand and one unit rule

Status: draft
Depends-on: 615
Snapshot: e916e48e3943a650ba9767ebb4023d20e823ae8d

## Problem Statement
A kitchen has no record of what is on the shelf. The only stock field is `minStockLevel` on a product, and nothing is
compared with it (brief MP-12, decision D15). This plan gives the server the stock count: a count is a record with a
date and lines (product, quantity in the unit the person used, and the same amount in the product's base unit), it is a
draft until someone finalises it, and the newest final count that lists a product is that product's stock on hand.
The amount in the base unit must come from the one unit rule the app already has, so that rule moves to where the
server can load it. No screen in this plan (636) and no AI (637).

Verified on `origin/main` (e916e48e, 2026-11-17):
- The unit rule is browser-only. `src/app/core/engine/units.ts` (63 lines) exports `UnitFamily` (line 7),
  `normalizeUnit` (9), `unitFamily` (14), `toBase(amount, unit, product, units)` (32) and `toYield` (50); the private
  `convertWithinFamily` (23) serves both `toBase` and `toYield`. It imports `optionRateInBase` from
  `src/app/core/utils/purchase-option-rate.util.ts` (21 lines) and `MASS_UNITS`, `UNIT_ALIASES`, `VOLUME_UNITS` from
  `src/app/core/utils/recipe-cost.constants.ts` (23 lines), and the type `UnitConversion`
  (`{ getConversion(key): number; has(key): boolean }`, `src/app/core/engine/event-plan.types.ts:6`).
- The rates: `SYSTEM_UNITS` (`src/app/core/services/unit-registry.service.ts:31`, 11 keys: kg 1000, liter 1000, gram 1,
  ml 1, unit 1, dish 1, tablespoon 15, teaspoon 5, cup 240, pinch 1, portion 1). `globalUnits_` (line 79) is every
  `unit` taxonomy term's `gramRate` with the system units laid over them; `getConversion(key)` (line 142) answers
  `globalUnits_()[key] || 1` — an unknown unit reads as 1. `TaxonomyStore.terms(kind)` lists shared terms first, then
  the business's own (`src/app/core/services/taxonomy-store.service.ts:91`), so for one key the business's own rate wins.
- Callers of the pieces that move: `./units` is imported by `src/app/core/engine/event-plan.engine.ts:17` and
  `units.spec.ts`; `optionRateInBase` by `event-plan.engine.ts`, `recipe-cost.service.ts`, `product-price.util.ts`,
  `inventory-product-list.component.ts`, `recipe-ingredients-table.component.ts`; the constants by `portions.ts`,
  `rounding.ts`, `recipe-cost.service.ts`, `recipe-yield-manager.util.ts`, `recipe-ingredients-table.component.ts`,
  `ai-recipe-modal.component.ts`; `SYSTEM_UNITS` by `event-plan.fixture.ts`, `event-plan.service.spec.ts`,
  `purchase-option-rate.util.spec.ts`, `metadata-manager.page.component.ts`. None of these import paths change.
- How one file serves both sides: the browser imports `shared/schemas` through the `@schemas/*` path in `tsconfig.json`
  (precedent for runtime code: `src/app/core/utils/client-display.util.ts:5`
  `export { normalizePhone, phoneKey } from '@schemas/phone'`). The server loads the CommonJS build:
  `pnpm run build:schemas` = `tsc -p shared/schemas/tsconfig.cjs.json` (`include: ./**/*.ts`, `outDir:
  ../../server/generated/schemas`, no path aliases), e.g. `require('../generated/schemas/front-desk/qualify')`. A file
  under `shared/schemas/units/` is built without touching `shared/schemas/index.ts` or `entities/index.ts`, and it must
  not import anything from `src/app`.
- The server has no unit code: `SYSTEM_UNITS` and `gramRate` appear only in migrations, the seed and tests. A `unit` term
  is `{ ...termShape, kind: 'unit', gramRate > 0 }` (`shared/schemas/entities/taxonomy-term.schema.ts:133`);
  `readScope(req, 'taxonomyTerms')` (`server/utils/business-scope.js:18`) is master ∪ the business's own.
- A product stores `baseUnit: string`, `purchaseOptions: [{ unitSymbol, conversionRate, priceOverride?, uom? }]` and
  `minStockLevel: number` (`shared/schemas/entities/product.schema.ts:8, 15, 24`).
- The pattern of a router that owns a type: `server/routes/bookings.js` (101 lines) — `router.use(dataWriteLimiter)`,
  `verifyToken`, `scopeFilter(req)` + `LIVE` (`server/jobs/purge-deleted.js:18`), `assertCan`, `actorOf(req)`,
  `checkStoredDoc(TYPE, doc)` before the write, a write conditional on the status that was read. The generic API answers
  405 `USE_ROUTER` for any write of a `routerWrites` type and still serves its reads (`server/routes/generic.js:58-60, 257`).
- `can(user, 'edit', { type, doc })` (`server/utils/permissions.js:39`) is already "the owner, or the staff member who
  created the document"; `'create'` is any member with a role. No change to `permissions.js` is needed.
- Test harness: `server/test/helpers/app.js` exports `buildTestApp`, `teardownTestApp`, `signTestToken`, `testDb`
  (in-memory MongoDB); `server/test/bookings-router.test.js` is the shape to copy. A pure function of
  `shared/schemas` is tested from the server (`server/test/qualify.test.js` requires the generated file).
- Not on `origin/main` yet, created by 615 (C-REGISTRY) and required before this plan starts:
  `shared/schemas/entities/stock-count.schema.ts`, the `stockCounts` row of `server/constants/collections.js`
  (`userData` and `routerWrites` true, `softDelete` false), the index `{ businessId: 1, status: 1, countedAt: -1 }`, the
  field `draftIds?: string[]` (at most 20) on the count, the empty `server/routes/stock.js` and its mount at `/api/v1/stock`.
- The specs that must stay green with no edit: `src/app/core/engine/units.spec.ts` (44 lines),
  `src/app/core/utils/purchase-option-rate.util.spec.ts` (22), `src/app/core/engine/event-plan.engine.spec.ts` (383),
  `src/app/core/engine/event-plan.service.spec.ts`, `src/app/core/services/recipe-cost.service.spec.ts` (496),
  `src/app/core/services/unit-registry.service.spec.ts` (267).

## Goals & Success Criteria
**Primary:** a member saves a stock count as a draft and finalises it through `/api/v1/stock`; the server works out
every line's amount in the product's base unit with the same rule the browser uses, and `GET /api/v1/stock/on-hand`
answers, per product, the amount of the newest final count that lists it.

- [auto] `pnpm run test:server` passes, including the new `server/test/unit-to-base.test.js` and `server/test/stock-counts.test.js`.
- [auto] `server/test/unit-to-base.test.js`: 500 `gram` on a `kg` product → 0.5; 2 `kg` on a `gram` product → 2000; 3 of the pack unit `ארגז` (`conversionRate: 10, uom: 'kg'`) on a `kg` product → 30; 2 of a jar (`conversionRate: 500, uom: 'gram'`) on a `kg` product → 1; 1 `liter` on a `kg` product → `null`; an unknown unit → `null`; `unitRatesFrom` gives 1000 for `kg` even when a stored term says otherwise, and the business's own rate over the master's for the same key.
- [auto] `server/test/stock-counts.test.js`: a final count of 4 `kg` flour sets on-hand 4; a later draft of 9 `kg` leaves it 4; finalising that draft makes it 9; a newer final count that does not list flour leaves flour at 9 and adds its own products.
- [auto] `server/test/stock-counts.test.js`: `POST /counts` with a unit the product cannot convert answers 400 `{ error: 'UNIT_NOT_CONVERTIBLE', line: <index> }` and stores nothing; a body that carries `baseQuantity` or `status` answers 400.
- [auto] `server/test/stock-counts.test.js`: staff edits and finalises his own draft (200); staff on another member's draft gets 403 `FORBIDDEN`; the owner edits and finalises anyone's; an owner of another business gets 404; `PUT` or a second `finalize` on a final count answers 409 `COUNT_FINAL`; `finalize` with no lines answers 400 `EMPTY_COUNT`; no token answers 401.
- [auto] `server/test/stock-counts.test.js`: `GET /counts?status=draft` answers the business's drafts newest first with their lines and none of another business; `status=final` answers only final counts; `limit=1` answers one; no `status` answers 400 `BAD_STATUS`; `limit=101` answers 400 `BAD_LIMIT`.
- [auto] `server/test/stock-counts.test.js`: `POST`, `PUT` and `DELETE` on `/api/v1/data/stockCounts` answer 405 `USE_ROUTER`; `GET /api/v1/data/stockCounts` lists the business's counts and none of another business.
- [auto] `pnpm run test:ci` passes; the six specs named in the Problem Statement are unchanged in the diff.
- [auto] `pnpm run build` passes (the browser compiles the shared unit file through `@schemas/units/to-base`).
- [auto] `pnpm --dir server run lint` exits 0 and `pnpm run lint` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.

## Execution Mode
- Parallel: no — first plan of run `mod-stock` (635, 636, 637 in this order). It edits no shared registry file of the map's must-not-run list and no docs file (615 writes the docs rows for the router). The only files outside its own new ones are the four unit files under `src/app/core/`, which no other plan of this program lists. The Planner checks this before putting 635 beside the round-2 server runs.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
shared/schemas/units/to-base.ts
shared/schemas/stock/stock-count-input.schema.ts
server/routes/stock.js
server/utils/unit-rates.js
server/test/unit-to-base.test.js
server/test/stock-counts.test.js
src/app/core/engine/units.ts
src/app/core/utils/purchase-option-rate.util.ts
src/app/core/utils/recipe-cost.constants.ts
src/app/core/services/unit-registry.service.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — `server/routes/stock.js` scopes every read and write with `scopeFilter(req)`, authorises create with `assertCan(…, 'create')` and edit / finalise with `assertCan(…, 'edit', { doc })` (the owner, or the staff member who created the count); `permissions.js` is not edited.
- INV-4: preserves — the new shapes are Zod schemas under `shared/schemas`; every stored count passes `checkStoredDoc('stockCounts', …)` before the write; the moved unit rule is plain functions with no schema.
- INV-5: preserves — unit terms stay in `taxonomyTerms`; `unit-registry.service.ts` only takes `SYSTEM_UNITS` from the shared file and re-exports it; the server reads the same terms through `readScope`.

## Reuse Check

- `shared/schemas/units/to-base.ts` (`toBase`, `normalizeUnit`, `unitFamily`, `convertWithinFamily`, `optionRateInBase`, the unit constants, `unitRatesFrom`) — family: event-plan — rung: 3 — why: the existing unit rule of the family moves, unchanged, to where the server can load it; `src/app/core/engine/units.ts` re-exports it, so there is still one rule.
- `server/utils/unit-rates.js` (`loadUnitRates`) — family: none — rung: 4 — why: the server had no way to read unit rates; it mirrors what `UnitRegistryService.globalUnits_` does in the browser, through the shared `unitRatesFrom`.
- `/api/v1/stock` routes in `server/routes/stock.js` — family: server-auth — rung: 1 — why: `verifyToken`, `scopeFilter`, `assertCan` and `dataWriteLimiter` used as they are, the way `server/routes/bookings.js` does.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef, I want a stock count to be kept as a record with its date so that I can see what was on the shelf and when.
- As a chef, I want to save a count half way and finish it later so that an interrupted count is not lost and does not change the stock figure before it is complete.
- As a chef, I want to count in the unit I see on the shelf (a crate, a jar, a kilo) so that I never convert in my head.
- As an owner, I want only the person who started a count, or me, to change or close it so that nobody overwrites a colleague's count.

## Functional Requirements

### Must Have (P0)
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
- [ ] `shared/schemas/units/to-base.ts` (new; no import from `src/app`, no `zod`): holds, moved verbatim, `UNIT_ALIASES`, `MASS_UNITS`, `VOLUME_UNITS` (from `recipe-cost.constants.ts`), `SYSTEM_UNITS` (from `unit-registry.service.ts`), `optionRateInBase` (from `purchase-option-rate.util.ts`), `UnitFamily`, `normalizeUnit`, `unitFamily`, `convertWithinFamily` (now exported) and `toBase` (from `units.ts`). The parameter types become structural so nothing from `@models` or `@services` is needed: `UnitRates = { getConversion(key: string): number }`; the product is `{ baseUnit?: string; purchaseOptions?: { unitSymbol: string; conversionRate: number; uom?: string }[] }`. Function bodies do not change. One addition: `unitRatesFrom(terms: { key: string; gramRate: number }[]): UnitRates & { has(key: string): boolean }` — builds `{ ...termsByKey, ...SYSTEM_UNITS }` in the order given (a later term replaces an earlier one, the system units replace both) and answers `getConversion(key) = rates[key] || 1`, the same rule as `UnitRegistryService.getConversion`.
- [ ] Browser files become re-exports, with no behaviour change and no change to any import path elsewhere: `units.ts` keeps `toYield` and re-exports `UnitFamily`, `normalizeUnit`, `unitFamily`, `toBase` from `@schemas/units/to-base` (and imports `convertWithinFamily`, `normalizeUnit` for `toYield`); `purchase-option-rate.util.ts` re-exports `optionRateInBase`; `recipe-cost.constants.ts` re-exports `UNIT_ALIASES`, `MASS_UNITS`, `VOLUME_UNITS` and keeps `VOLUME_OR_WEIGHT_KEYS`, `MAX_RECURSION_DEPTH`; `unit-registry.service.ts` imports `SYSTEM_UNITS` from the shared file and re-exports it (`export { SYSTEM_UNITS }`), nothing else in the service changes. The six specs named in the Problem Statement pass without an edit.
- [ ] `shared/schemas/stock/stock-count-input.schema.ts` (new): `stockCountInputSchema = z.strictObject({ countedAt: z.number().int().positive(), source: z.enum(['manual', 'voice', 'text']).optional(), draftIds: z.array(z.string().min(1).max(64)).max(20).optional(), note: z.string().max(500).optional(), lines: z.array(z.strictObject({ productId: z.string().min(1), quantity: z.number().min(0).max(1_000_000), unit: z.string().min(1).max(40) })).max(2000) })` and the types `StockCountInput`, `OnHandRow = { productId: string; baseQuantity: number; countedAt: number }`. The browser (636) imports the types through `@schemas/stock/stock-count-input.schema`. The body never carries `baseQuantity`, `status`, `finalAt` or `finalBy` (strict: 400).
- [ ] `server/utils/unit-rates.js` (new): `loadUnitRates(req)` → reads `taxonomyTerms` with `{ ...readScope(req, 'taxonomyTerms'), kind: 'unit' }`, projection `{ key: 1, gramRate: 1, businessId: 1 }`, orders the master's terms before the business's own, and returns `unitRatesFrom(terms)`.
- [ ] `server/routes/stock.js` (file created empty by 615; this plan fills it). `router.use(dataWriteLimiter)`; every route `verifyToken`. One helper `convertLines(req, lines)` used by all three writes: loads the listed products with `{ _id: { $in: ids }, ...scopeFilter(req), ...LIVE }` (projection `baseUnit`, `purchaseOptions`) and the rates once, then per line, in order: a `productId` listed twice → 400 `{ error: 'DUPLICATE_PRODUCT', line }`; a product that is not a live product of the business → 400 `{ error: 'UNKNOWN_PRODUCT', line }`; `toBase(quantity, unit, product, rates)` is `null` → 400 `{ error: 'UNIT_NOT_CONVERTIBLE', line }`; else `baseQuantity = Math.round(result * 1e6) / 1e6`. `line` is the 0-based index. Nothing is stored when any line fails.
  - `POST /counts` — body `stockCountInputSchema` (fail → 400 `{ error: 'BAD_COUNT_INPUT', issues }`); `countedAt` more than 24 hours after now → 400 `BAD_COUNTED_AT`; `assertCan(req, res, 'create', { type: 'stockCounts' })`; stores `stampNew(req, { _id: newId(), schemaVersion: 2, updatedAt: now, countedAt, status: 'draft', source: source ?? 'manual', draftIds?, note?, lines })` after `checkStoredDoc`; answers 201 with the stored document. A draft may have no lines.
  - `PUT /counts/:id` — same body; reads the count with `{ _id, ...scopeFilter(req), ...LIVE }` (none → 404 `{ error: 'Count not found' }`); `assertCan(…, 'edit', { type, doc })` (403); `status` not `draft` → 409 `{ error: 'COUNT_FINAL' }`; replaces `countedAt`, `lines`, `note` (absent in the body = removed), and `source` / `draftIds` when the body carries them; `updatedAt = now`; the write is conditional on `status: 'draft'` (no match → 409 `COUNT_FINAL`); answers 200 with the document.
  - `POST /counts/:id/finalize` — no body fields; same read, same permission; already final → 409 `COUNT_FINAL`; no lines → 400 `{ error: 'EMPTY_COUNT' }`; runs `convertLines` again on the stored lines (so the base amounts match the products as they are now); sets `status: 'final'`, `finalAt: now`, `finalBy: actorOf(req).userId`, the recomputed `lines`, `updatedAt`; conditional on `status: 'draft'`; answers 200 with the document.
  - `GET /on-hand` — any member (`assertCan(…, 'create', { type: 'stockCounts' })`, so a caller with no role gets 403); one aggregation over the business's live final counts: `$match { ...scopeFilter(req), ...LIVE, status: 'final' }` → `$sort { countedAt: -1, finalAt: -1 }` → `$unwind '$lines'` → `$group` by `lines.productId` taking the first `baseQuantity` and `countedAt`; answers `[{ productId, baseQuantity, countedAt }]` sorted by `productId`. Products that were deleted since are still in the answer (the browser joins on its live products).
  - `GET /counts?status=draft|final&limit=` — any member (the same `assertCan … 'create'` test); `status` is required and must be `draft` or `final`, else 400 `{ error: 'BAD_STATUS' }`; `limit` is an integer from 1 to 100, default 20, anything else → 400 `{ error: 'BAD_LIMIT' }`; answers the business's counts of that status, newest first (`$sort { countedAt: -1, updatedAt: -1 }`), whole documents with their lines. It does not filter by creator: the browser picks the draft the member may edit, and the server decides again on the write.
  - Errors: a thrown error → 500 `{ error: 'Server error' }` and `req.log.error({ err, event: 'stock.<name>.failed' })`. Success logs carry counts only: `{ event: 'stock.count.created' | 'stock.count.updated' | 'stock.count.finalized', lines: <n> }` — no product id, no name, no note.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- No screen and no dictionary key in this plan. The count sheet is 636.
- The 400 answers carry the 0-based `line` so 636 can point at the row.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Move the unit rule to the shared package so the server and the browser convert the same way — new file with the constants, the conversion functions moved verbatim, structural parameter types and the rates builder; no import from the app — shared/schemas/units/to-base.ts
- [ ] A2: Point the four browser files at the shared rule so no second copy exists — each becomes a re-export (the yield conversion stays where it is); run the six existing specs and the build, none of them edited — src/app/core/engine/units.ts, src/app/core/utils/purchase-option-rate.util.ts, src/app/core/utils/recipe-cost.constants.ts, src/app/core/services/unit-registry.service.ts
- [ ] A3: Prove the shared rule from the server side — kg and gram both ways, a crate, a jar typed in grams on a kilo product, no mass-to-volume, an unknown unit, system units over stored terms, own term over master — server/test/unit-to-base.test.js
- [ ] A4: Describe what a member may send for a count and let the server read the unit rates of a business — strict input schema without server-owned fields; loadUnitRates over master and own unit terms — shared/schemas/stock/stock-count-input.schema.ts, server/utils/unit-rates.js
- [ ] A5: Let a member save a count as a draft and change it until it is final — POST /counts and PUT /counts/:id with convertLines, the three line errors with the line index, creator-or-owner on edit, 409 on a final count; tests for each — server/routes/stock.js, server/test/stock-counts.test.js
- [ ] A6: Let the creator or the owner finalise a count, and answer the counts list and the stock on hand — POST /counts/:id/finalize (recompute, stamp, conditional write), GET /counts by status with its limit, GET /on-hand (one aggregation); tests: final sets it, a later draft does not, a newer final without the product keeps the older value, the list is newest first and capped, two businesses — server/routes/stock.js, server/test/stock-counts.test.js
- [ ] A7: Check that the generic data API cannot write a count and still reads it per business — 405 USE_ROUTER on POST, PUT and DELETE; the scoped list read for two businesses — server/test/stock-counts.test.js
- [ ] A8: Run every check of this plan and record the output lines — test:server, test:ci, build, both lints, log-query; evidence into Execution Notes

## Technical Considerations
- Dependencies: `event-plan.engine.ts`, `recipe-cost.service.ts`, `product-price.util.ts` and the other callers listed in the Problem Statement keep their imports; they now reach the same functions through a re-export. `checkStoredDoc` needs 615's `stockCounts` schema in `SCHEMA_BY_COLLECTION`.
- New files needed: `shared/schemas/units/to-base.ts`, `shared/schemas/stock/stock-count-input.schema.ts`, `server/utils/unit-rates.js`, `server/test/unit-to-base.test.js`, `server/test/stock-counts.test.js`.
- Model changes: types `StockCountInput`, `OnHandRow`, `UnitRates` (shared). No change to `Product`.
- Backend / API: `POST /api/v1/stock/counts`, `PUT /api/v1/stock/counts/:id`, `POST /api/v1/stock/counts/:id/finalize`, `GET /api/v1/stock/counts?status=draft|final&limit=`, `GET /api/v1/stock/on-hand`. The generic `GET /api/v1/data/stockCounts` still answers (`userData: true`), but the screen uses the stock router's read.
- Auth and validation: every route needs a member token; create, the counts read and on-hand = any member with a role; edit and finalise = the creator or the owner (`can … 'edit'`); another business = 404. Body validated by `stockCountInputSchema` (strict), stored document by `checkStoredDoc`.
- Security surface: no secret, no new permission action, no money field (a count holds quantities only, so staff may read it). Logs carry counts of lines only. `dataWriteLimiter` bounds the writes.
- Data / migration: none — the collection and its schema are 615's; documents are created on first use. `GET /on-hand` and `GET /counts` both match on business and status and sort by `countedAt`, which is the index 615 registers (`{ businessId: 1, status: 1, countedAt: -1 }`). A count is at most 2,000 lines (about 150 KB), so a year of weekly counts stays a few MB on Atlas M0.
- Project checks: `[auto] log-query` present; `pnpm run test:server` + `pnpm run test:ci`; Reuse Check filled; entity shapes are Zod schemas in `shared/schemas`; the dedicated router is named and justified (server-owned `baseQuantity`, draft → final is one-way); no dictionary key, no icon, no screen.

Every Atomic Sub-task names its files and is concrete enough for a Worker to run without asking (no "TBD",
"handle errors appropriately", "same as the other screen"). `/plan`'s Architect + PM review checks this.

## Out of Scope
- The rows for the stock router in `docs/agent/standards-backend.md` and `server/breadcrumbs.md`: 615 writes them with the registration; this plan touches neither file.
- The count sheet screen and the below-minimum list (636); the voice / text extract route and the draft trail (637).
- Deleting a count: there is no delete route in this program and `stockCounts` is registered with `softDelete: false`. A draft cannot be deleted; it is continued or finalised.
- Changing the existing "low stock" number (`GET /api/v1/data/products/count?filter=lowStock`, `lowStockProducts_`) — it stays as it is (map delta 6).
- Stock movements between counts (deliveries, usage by events) — on-hand is the last final count only.
- Any change to `toYield`, to rounding, or to how recipes and events convert units.

## Critical Questions
- none

## Execution Notes
- decided: the constants and `optionRateInBase` move with `toBase` (the Contract's "and what they need"), and `SYSTEM_UNITS` moves too — why: the server needs the same fixed rates; four browser files become re-exports instead of two copies drifting apart.
- decided: the request schema lives in a new `shared/schemas/stock/` file, not in 615's entity file — why: 635 then writes no file another plan created except the empty router.
- decided: for one unit key the business's own term wins over the master's, and the system units win over both — why: that is what the browser's `globalUnits_` does today.
- decided: a product may appear once in a count (`DUPLICATE_PRODUCT`) — why: on-hand takes one value per product from a count; two lines would need a sum rule nobody asked for.
- decided: finalise recomputes the base amounts from the stored quantity and unit — why: a product's base unit or pack size may change between the draft and the finalise.
- decided: "newest" in on-hand is by `countedAt`, then `finalAt` — why: a count entered late for an earlier date must not hide a newer count.
- decided: edit and finalise use the existing `'edit'` action — why: it already means "the creator or the owner"; no new permission action and no edit of `permissions.js`.
- decided: the counts read answers every draft of the business, not only the caller's — why: the owner must be able to continue a staff member's draft; who may write is decided on the write.
- Contract corrections applied (Planner, C-STOCK): the index `{ businessId: 1, status: 1, countedAt: -1 }` is 615's; `softDelete: false` and no delete route; the new read `GET /counts?status=&limit=`; `draftIds?: string[]` (at most 20) replaces `draftId?`.
- trap: 615's test that every empty router answers 404 may probe a path this plan now serves; if it fails, offer `approved: <that test file>` and change only the stock row.
