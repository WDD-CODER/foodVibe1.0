# Plan 627 — Remember which product each printed invoice name means, for the business and for everyone

Status: draft
Depends-on: 626
Snapshot: e916e48e3943a650ba9767ebb4023d20e823ae8d

## Problem Statement
Every invoice is matched to products from zero: the tenth invoice from the same supplier is read no better than the
first, for the business that scanned nine of them and for everyone else (brief MP-07, decision D7). This plan makes
every approved invoice teach two memories — the business's own (the name this supplier prints → my product) and a
shared one (the name this supplier prints → the product of the shared catalog, plus how that supplier's invoices are
built) — and adds one server read that answers names from memory with no model call. Prices, quantities and the
identity of a business are never in the shared memory. It is server only; plan 628 makes the screen ask the memory first.

Verified on `origin/main` (e916e48e, 2026-11-17):
- `server/routes/product-import.js` (134 lines) has only `POST /apply`; nothing is learned from a match the person
  approved. A row linked to an existing product arrives with that product's name
  (`src/app/pages/inventory/components/product-import/product-import.component.ts:238`), so the printed name reaches
  the server only in the `invoice.lines[].printedName` that plan 625 adds.
- The trap of the card is real: `server/routes/product-import.js:115` writes `_masterId: _id` on a product the import
  creates — its own id. A product copied from the shared catalog gets `_masterId: String(masterId)`, the `_id` of the
  `businessId: '__master__'` document (`server/services/clone-master.js:63–70`). So "from the shared catalog" needs a
  live `products` document with `businessId: '__master__'` and `_id === product._masterId`; `_masterId` alone proves nothing.
- `server/utils/business-scope.js:7` `MASTER_BUSINESS_ID = '__master__'`; `server/jobs/purge-deleted.js:18`
  `LIVE = { deletedAt: { $exists: false } }`.
- `server/utils/price-list-import.js:25` `normalizeProductName(s)` (trim, single spaces, lower case) is the name rule
  the apply route already matches by.
- `server/services/business.js` (103 lines): `getBusiness(id)` (line 50); `setShareAiExamples` (lines 82–91) is what
  plan 618 replaces with `setAiPrivate`. `server/services/business.js` requires nothing from the import code, so a
  service it calls must not require `business.js` back.
- `POST /api/v1/ai/match-product-names` (`server/routes/ai.js`, from line 650) is the model call the memory makes
  unnecessary; its ledger feature key is `product_match` (`server/constants/ai-features.js`).
- `server/test/product-import-route.test.js` shows the harness (`buildTestApp`, `signTestToken`, `testDb`, `stored`,
  `productBody`, `supplierBody`); `server/test/ai-receipt-photo.test.js:29–41` shows the model fake (`vi.stubGlobal('fetch', …)`).
- Not on `origin/main` yet, delivered before this plan starts: `shared/schemas/entities/invoice-alias.schema.ts`,
  `supplier-profile.schema.ts`, the collections `invoiceAliases` and `supplierProfiles` with their indexes (615);
  `mayLearnFrom` in `server/utils/ai-learning.js` and `setAiPrivate` in `server/services/business.js`, which calls a
  `forgetBusiness` that does nothing yet (618); the invoice trail in `apply` with its guarded steps and
  `SUPPLIER_KEY_PATTERN` (625); `server/utils/supplier-key.js` and the `supplier` trail step (626).

## Goals & Success Criteria
**Primary:** after one approved invoice, the same printed name from the same supplier is answered from memory by
`POST /api/v1/product-import/resolve` with no model call — for that business from its own memory, and for any other
business from the shared memory when the product comes from the shared catalog.

- [auto] `pnpm run test:server` → exit 0, including the new `server/test/invoice-memory.test.js`.
- [auto] After one apply with an invoice whose line links a printed name to a product, `resolve` with that supplier key and that printed name (in another letter case and with extra spaces) returns `[{ i: 0, productId: <that product>, source: 'own' }]`; the model fake was never called and `aiUsage` holds zero rows with `feature: 'product_match'` (`server/test/invoice-memory.test.js`).
- [auto] Two businesses each hold their own copy of one shared-catalog product (a live `products` document with `businessId: '__master__'`). Business A approves an invoice linking a printed name to its copy; business B, which never saw that invoice, resolves the same supplier key and name and gets B's own product id with `source: 'shared'` (`server/test/invoice-memory.test.js`).
- [auto] A product created by the import (its `_masterId` is its own id) adds an own alias and no shared alias (`server/test/invoice-memory.test.js`).
- [auto] A business with `aiPrivate: true` that approves the same invoice adds its own alias, and the number of `invoiceAliases` documents with `businessId: '__master__'` and the number of `supplierProfiles` documents both stay 0 (`server/test/invoice-memory.test.js`).
- [auto] The shared alias shape has exactly the keys `_id, businessId, supplierKey, nameKey, printedName, masterProductId, hits, contributors, lastAt` and the supplier profile shape exactly `_id, names, vatIncludedYes, vatIncludedNo, invoices, contributors, lastAt` — read from the Zod schemas, so no price, quantity or purchase date can be stored in either (`server/test/invoice-memory.test.js`).
- [auto] Every `invoiceAliases` and `supplierProfiles` document the tests produced passes its Zod schema, and no stored shared document contains a key named `price`, `unitPrice`, `lineTotal`, `quantity`, `invoiceDate` or `invoiceId` (`server/test/invoice-memory.test.js`).
- [auto] Own beats shared; a second approval that links the same printed name to another product makes `resolve` return the newer one; with two shared targets for one name the one with more contributors wins, and on a tie the newer one; a target the asking business has no live copy of gives no match; a deleted product is never returned; another business's own alias is never returned (`server/test/invoice-memory.test.js`).
- [auto] `setAiPrivate(<A>, true)` removes A from every `contributors` list, deletes the shared rows A alone contributed to, keeps the rows business B also contributed to, and leaves A's own aliases in place (`server/test/invoice-memory.test.js`).
- [auto] `resolve` answers 401 without a token, 403 for a staff token, 400 `INVALID_REQUEST` for 201 names or a supplier key that does not match `SUPPLIER_KEY_PATTERN`, and its answer contains only `matches` with `i`, `productId`, `source` (no `contributors`, no `hits`) (`server/test/invoice-memory.test.js`).
- [auto] When the memory write throws, the apply still answers 200 with the product counts and the real `invoiceId`, and one `product_import.apply.trail_failed` log record has `stage: 'memory'` (`server/test/invoice-memory.test.js`).
- [auto] `pnpm run test:server` → the invoice trail tests written by plans 625 and 626 all pass without an edit (their test file is outside this plan's scope).
- [auto] `pnpm --dir server run lint` → exit 0.
- [auto] `pnpm run build` → passes.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.

## Execution Mode
- Parallel: no — 625, 626 and 627 all edit `server/routes/product-import.js` and run one after another inside `mod-invoices-srv`; `server/services/business.js` was edited by 618 in `mod-0`, which is merged before this run; never beside any plan of `mod-0`.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/services/invoice-memory.js
server/routes/product-import.js
server/services/business.js
shared/schemas/entities/invoice-alias.schema.ts
shared/schemas/entities/supplier-profile.schema.ts
server/test/invoice-memory.test.js
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — `resolve` is authorised through `assertCan(…, 'editMoney', { type: 'products' })` and returns only product ids of the caller's own business; shared `__master__` rows are written by the server's own learning code inside the authorised apply, never from a request body, and no member can edit or read them directly (both collections are server-only).
- INV-2: preserves — own aliases carry the caller's `businessId` and are read only with it; shared rows carry `businessId: '__master__'` (aliases) or no business at all (profiles), hold no price, quantity or date, and name no business outside the `contributors` list that is never returned; a shared match is always mapped to the asking business's own copy of the product, never to another business's document.
- INV-3: preserves — the memory is written by the server inside the one apply request; the browser sends nothing extra.
- INV-4: preserves — both shapes are the Zod schemas of `shared/schemas`; the request of `resolve` is parsed by a Zod schema; the tests parse every stored memory document with its schema.

## Reuse Check

- `server/services/invoice-memory.js` (`learnFromApply`, `resolveNames`, `forgetBusiness`) — family: none — rung: 4 — why: server service; no name memory exists, and C-ALIAS names this file. It sits beside `business.js` and requires nothing from it.
- `invoiceResolveRequestSchema` in `shared/schemas/entities/invoice-alias.schema.ts` — family: none — rung: 4 — why: the request shape of the new read, kept in the alias schema file wave 0 created.

Reused as they are, no new piece: `normalizeProductName` (`nameKey` uses the apply route's own name rule), `mayLearnFrom`, `getBusiness`, `MASTER_BUSINESS_ID`, `LIVE`, `newId`.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want the app to remember that "עגב' שרי 1 ק״ג" on my greengrocer's invoice is my cherry tomatoes so that I link it once and never again.
- As a chef opening a new kitchen, I want invoices from a supplier other kitchens already buy from to be matched on my first scan so that I start with the work already done.
- As an owner, I want to be sure that what other kitchens get from my invoices is only which printed name means which catalog product — never what I paid, how much I bought or who I am.
- As the platform admin, I want a business I switch to private to stop feeding the shared memory at once, and what it already gave to be taken out.

## Functional Requirements

### Must Have (P0)
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
  **C-LEARN (618; used by 627, 630, 633)**
  - `business.aiPrivate?: boolean` — platform admin only (C-MODULES platform write). Absent = shared (D8).
  - `server/utils/ai-learning.js` → `mayLearnFrom(business) → business?.aiPrivate !== true`. The only test any code
    uses before it (a) copies something into a `'__master__'` pool, (b) lists a business's AI material for the
    platform admin. A private business keeps its own per-business memory and its own drafts.
  - `setAiPrivate(id, value)` in `server/services/business.js` replaces `setShareAiExamples`: turning private on
    deletes the business's promoted `GEMINI_SHOTS` copies (`promotedFrom.businessId`) and calls
    `forgetBusiness` (C-ALIAS; 618 leaves a one-line placeholder and 627 adds the real call).
  - Removed: `PUT /api/v1/business/share-ai-examples`, `shareAiExamplesInputSchema`,
    `BusinessService.updateShareAiExamples`. `business.shareAiExamples` stays in the schema as optional so stored
    documents validate; nothing reads it.
  - `GET /api/v1/admin/ai-shots` candidates and `POST …/promote`: every business with `mayLearnFrom` true.
  - Deleting a business keeps what the platform learned from it (Dandan, 2026-11-17). Always deleted, as the
    business's own records: `priceHistory`, its own `invoiceAliases`, its `storedFiles` and the provider files
    (recordings, invoice files), its `businessAccess` rows. Kept when the business is not private at that moment: its
    contributions to the shared supplier brain, its promoted recipe examples, and its `aiDrafts` rows reduced to
    numbers (`feature`, `model`, `keptRatio`, `status`, `at`, `confirmedAt`, `businessId`; no input, draft, saved text
    or user id). A private business leaves nothing. To erase everything of a business, the platform admin turns
    private mode on, then deletes it (619).
  - The owner's card `ai-examples-share` shows one locked chip (shared / private) and a tooltip from a dictionary
    key saying private mode is arranged by contacting FoodVibe. It calls no route.
- [ ] Schema files (created by 615; this plan may add exports, and changes nothing 615 wrote unless a step below says so):
  - `shared/schemas/entities/invoice-alias.schema.ts` gains `invoiceResolveRequestSchema` = `z.strictObject({ supplierKey: z.string().regex(SUPPLIER_KEY_PATTERN), names: z.array(z.string().max(200)).min(1).max(200) })` (`SUPPLIER_KEY_PATTERN` imported from `./invoice.schema`, plan 625). Plan 615 exports `ownInvoiceAliasSchema`, `sharedInvoiceAliasSchema` and their union `invoiceAliasSchema` from this file; this plan changes none of them.
  - `shared/schemas/entities/supplier-profile.schema.ts`: no change expected; it is in scope only so a key-list mismatch found by the test can be fixed here.
  - The service requires them from `../generated/schemas/entities/invoice-alias.schema` and `…/supplier-profile.schema` after `pnpm run build:schemas`.
- [ ] `server/services/invoice-memory.js` (new). It requires `mongoose` types only through the `db` handle it is given, `newId`, `normalizeProductName`, `MASTER_BUSINESS_ID`, `LIVE` and `mayLearnFrom`; it never requires `server/services/business.js`.
  - `learnFromApply(db, business, { supplierKey, supplierName, vatIncluded, lines })`, `lines` = `[{ printedName, productId, unit? }]`:
    1. Nothing is written when `supplierKey` is empty or no line has both a `productId` and a non-empty `nameKey = normalizeProductName(printedName)`. Lines are reduced to one per `nameKey` (the last one wins).
    2. Own aliases, always: one `bulkWrite` of upserts on `{ businessId: business._id, supplierKey, nameKey }` — `$set: { printedName, productId, lastAt: now }`, `unit` set when the line has one and unset when it has none, `$inc: { hits: 1 }`, `$setOnInsert: { _id: newId() }`. The latest link wins because `productId` is always overwritten. `packQty` is not written by this plan (the Contract's `lines` carry no pack size).
    3. Shared rows only when `mayLearnFrom(business)` is true:
       - Which lines qualify: read the business's live products among the linked ids (projection `_masterId`); keep those whose `_masterId` is set and differs from their own `_id`; then read `products` `{ _id: { $in: <those _masterId values> }, businessId: '__master__', ...LIVE }` (projection `_id`). A line qualifies only when its product's `_masterId` is in that result.
       - Shared alias per qualifying line: upsert on `{ businessId: '__master__', supplierKey, nameKey, masterProductId }` — `$set: { printedName, lastAt: now }`, `$inc: { hits: 1 }`, `$setOnInsert: { _id: newId(), contributors: [] }`; then a second update on the same key with the extra filter `{ contributors: { $ne: business._id }, 'contributors.199': { $exists: false } }` and `$addToSet: { contributors: business._id }` (the list never passes 200).
       - Supplier profile, once per call, whether or not a line qualified: upsert on `{ _id: supplierKey }` — `$inc: { invoices: 1 }` plus `vatIncludedYes: 1` when `vatIncluded === true` or `vatIncludedNo: 1` when it is `false`, `$set: { lastAt: now }`, `$setOnInsert: { names: [], contributors: [] }` with the counters it does not increment set to 0 on insert; then the same guarded `$addToSet` for `contributors` (limit 200) and, when `supplierName` trimmed is not empty, for `names` with the filter `{ names: { $ne: <name cut at 200> }, 'names.9': { $exists: false } }` (the list never passes 10).
    4. It returns `{ own: <count>, shared: <count> }` and lets a database error throw (the caller's trail step catches it).
  - `resolveNames(db, businessId, { supplierKey, names })` → `[{ i, productId, source }]`, only for names that resolved, in ascending `i`:
    1. `nameKey` per name; empty keys are skipped.
    2. Own: read `invoiceAliases` `{ businessId, supplierKey, nameKey: { $in: keys } }`; keep an alias only when its `productId` is a live product of that business (one read of `products` `{ _id: { $in }, businessId, ...LIVE }`). → `source: 'own'`.
    3. Shared, for the keys still open: read `invoiceAliases` `{ businessId: '__master__', supplierKey, nameKey: { $in } }`; per `nameKey` pick the row with the longest `contributors` list, and on a tie the largest `lastAt`; then one read of the business's live products `{ businessId, _masterId: { $in: <picked masterProductId values> }, ...LIVE }`, and a picked row gives a match only when such a product exists (the lowest `_id` when there are several). → `source: 'shared'`. A picked target with no copy in this business gives no match; the next target is not tried.
    4. It works the same for a private business (reading the shared memory copies nothing out of the business).
  - `forgetBusiness(db, businessId)`: `invoiceAliases.updateMany({ businessId: '__master__', contributors: businessId }, { $pull: { contributors: businessId } })`, then `deleteMany({ businessId: '__master__', contributors: { $size: 0 } })`; the same pair on `supplierProfiles` (without the `businessId` filter). Own aliases are not touched. Returns the four counts.
- [ ] `server/routes/product-import.js`:
  - `POST /apply`: a new guarded trail step `stage: 'memory'`, placed after the `supplier` step of plan 626 and before the `draft` step. It runs when an invoice was sent with a `supplierKey` and the product writes succeeded (it does not depend on the invoice step): `business = await getBusiness(req.user.businessId)` (from `server/services/business.js`), then `learnFromApply(db, business ?? { _id: req.user.businessId }, { supplierKey, supplierName, vatIncluded, lines })` where `lines` are the stored invoice lines that have a `productId`, as `{ printedName, productId, unit }`. A failure is logged with `product_import.apply.trail_failed` and `stage: 'memory'` and changes neither the status nor `invoiceId`. The applied log line gains the counts `aliasesOwn` and `aliasesShared`.
  - New `POST /resolve`: `verifyToken`, then `assertCan(req, res, 'editMoney', { type: 'products' })`, then the handler: the body is parsed with `invoiceResolveRequestSchema` (failure → 400 `{ error: 'INVALID_REQUEST' }`); `matches = await resolveNames(db, req.user.businessId, body)`; `req.log.info({ event: 'product_import.resolved', names: <count>, own: <count>, shared: <count> })`; 200 `{ matches }`. No model call, no write, no limiter (it is three indexed reads; the import limiter of 10 per 15 minutes would block a normal day of invoices). A thrown error → `product_import.resolve_failed` and 500 `{ error: 'Server error' }`.
  - The header comment of the file gains the new route and the memory step. No printed name, product name or supplier key value is logged.
- [ ] `server/services/business.js` — one change, the `forgetBusiness` call inside `setAiPrivate` (written by plan 618 as a call that does nothing yet): the call becomes `await require('./invoice-memory').forgetBusiness(mongoose.connection.db, String(id))`, and whatever placeholder 618 left for it in this file (a local empty `forgetBusiness` function or constant) is deleted. If 618 instead created `server/services/invoice-memory.js` as a stub exporting an empty `forgetBusiness`, this plan fills that file and `business.js` is not edited. The Worker writes in Execution Notes which of the two it found and the exact line it changed. Nothing else in `setAiPrivate` changes: it still runs only when private is turned on, after the promoted examples are deleted.
- [ ] Tests in `server/test/invoice-memory.test.js` (new), on the harness of `server/test/product-import-route.test.js` with `process.env.IMPORT_LIMIT_MAX = '200'`:
  - Fixtures inserted straight into the test database: one shared product `stored(productBody({ nameHebrew: 'עגבניות שרי' }), { _id: 'm1', businessId: '__master__', userId: 'admin' })`; business A's copy `{ _id: 'a1', businessId: 'bA', _masterId: 'm1' }` and business B's copy `{ _id: 'b1', businessId: 'bB', _masterId: 'm1' }`; `businesses` documents for `bA` and `bB` (and `aiPrivate: true` on the private case); supplier key `tax:514236987`; printed name `עגב' שרי 1 ק״ג`.
  - Learning runs through the real route: `POST /api/v1/product-import/apply` with `rows: [{ name: 'עגבניות שרי', baseUnit: 'kg', price: 9.9, … }]` and `invoice: { supplierName, source: 'photo', supplierKey, lines: [{ printedName, needsReview: false, row: 0 }] }`; reading runs through `POST /api/v1/product-import/resolve`.
  - The "no model call" case stubs global `fetch` (the pattern of `server/test/ai-receipt-photo.test.js:29–41`) and asserts it was never called, then counts `aiUsage` rows with `feature: 'product_match'`.
  - The key-list case reads `Object.keys(sharedInvoiceAliasSchema.shape)` and the keys of the supplier profile schema's shape from the generated modules.
  - The forget case calls `setAiPrivate('bA', true)` from `server/services/business.js` directly.
  - The failing-memory case spies on `mongoose.mongo.Collection.prototype.bulkWrite` and throws only for `invoiceAliases`.
  - One case stores two shared rows for the same supplier key and name with different `masterProductId` values: both are stored (plan 615's indexes `invoice_alias_own_unique` and `invoice_alias_shared_unique` are partial — on rows with `productId` and on rows with `masterProductId`), and the ranking cases read them.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- No screen in this plan. Plan 628 calls `resolve` before the model step and shows which rows came from memory; plan 630 shows the size of the shared memory to the platform admin.
- No `dictionary.json` key, no icon.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Prove by test that the shared memory has no place for a price, a quantity or a date — the two exact key lists read from the schemas; add the resolve request schema; run pnpm run build:schemas — shared/schemas/entities/invoice-alias.schema.ts, shared/schemas/entities/supplier-profile.schema.ts, server/test/invoice-memory.test.js
- [x] A2: Make every approved invoice line teach the business which product a printed name means — learnFromApply steps 1 and 2 (own aliases, latest link wins, hit count) — server/services/invoice-memory.js
- [x] A3: Let an approval also teach everyone, for shared-catalog products only, never from a private business — learnFromApply step 3: the live master document test, shared aliases, the supplier profile, the list limits — server/services/invoice-memory.js
- [x] A4: Answer printed names from memory, the business's own first and then the shared one — resolveNames with the live-product checks, most contributors then newest, mapping to the asking business's own copy — server/services/invoice-memory.js
- [x] A5: Wire the memory into the approval and add the read the screen will call before the model — the memory step in the apply trail, the new resolve route, the header comment — server/routes/product-import.js
- [x] A6: Take a business out of the shared memory the moment it becomes private — forgetBusiness and the one changed line in setAiPrivate; note which placeholder was found — server/services/invoice-memory.js, server/services/business.js
- [x] A7: Test the whole memory through the real routes with two businesses — own after one invoice with zero model calls, shared across businesses, imported product, private business, ranking, deleted product, forget, auth and limits, failing memory write — server/test/invoice-memory.test.js
- [x] A8: Run the full checks and confirm the invoice trail tests of the two earlier plans still pass — pnpm run test:server, server lint, build, log-query — no file

## Technical Considerations
- Dependencies: the apply trail and stored invoice lines (plan 625), the `supplier` step and `supplierKey` values (plan 626), `mayLearnFrom` and `setAiPrivate` (plan 618), the two collections, their schemas (`ownInvoiceAliasSchema`, `sharedInvoiceAliasSchema`, `invoiceAliasSchema`) and partial unique indexes (plan 615). `getBusiness` from `server/services/business.js` (required by the route, not by the service, so there is no require cycle).
- New files needed: `server/services/invoice-memory.js`, `server/test/invoice-memory.test.js`.
- Model changes: `invoiceResolveRequestSchema` in `shared/schemas/entities/invoice-alias.schema.ts`.
- Backend / API: new `POST /api/v1/product-import/resolve` body `{ supplierKey, names }` → `{ matches: [{ i, productId, source: 'own' | 'shared' }] }`. `POST /api/v1/product-import/apply` now also writes the memory. `setAiPrivate` now really removes a business from the shared memory.
- Auth and validation: `resolve` — owner (later the consultant) through `editMoney` on `products`; never module-gated (C-MODULES: `/api/v1/product-import/**`). Body parsed by Zod: key pattern, at most 200 names of at most 200 characters.
- Security surface: this is the first data that crosses from one business to others. What crosses: supplier key, printed product name, the shared-catalog product id, counters. What never does: prices, quantities, dates, invoice numbers, the business's own products, the business id (it sits only in `contributors`, which no route returns and plan 630 only counts). A private business writes nothing shared and is removed from what it gave. The supplier key from the request is format-checked; a client that sends false links can only add aliases that lose to the links more businesses agree on. `resolve` returns product ids of the caller's business only.
- Data / migration: no migration. `invoiceAliases` grows by one small document per distinct printed name per supplier per business (about 200 bytes; 2,000 names is about 0.4 MB on the free database tier) plus one shared row per name and catalog product; `supplierProfiles` by one document per supplier key. Nothing is back-filled from invoices approved before this plan.
- Project checks: `[auto] log-query` item present; server tests through `pnpm run test:server`; shapes are Zod schemas in `shared/schemas`; no new collection beyond those plan 615 registered; no dictionary key, no icon, no screen; no model call, so no prompt.

## Out of Scope
- The screen that calls `resolve` before the model and marks rows as "from memory" — plan 628. The check "scan the same invoice twice and the second preview is already matched" needs that screen and is its `[human]` card.
- Showing the size of the shared memory to the platform admin, and the scan accuracy — plan 630.
- Learning from an apply that carries no invoice or no supplier key (a pasted price list with no supplier identity): nothing is learned.
- Learning the pack size (`packQty`) of an alias: the field stays empty until a plan sends it.
- A shared alias for a product the business created itself, or a way to add a product to the shared catalog from an invoice.
- Returning unit or pack size from `resolve`; using the supplier profile (VAT included or not) to pre-fill the next read.
- Back-filling memory from invoices saved before this plan, and lowering `hits` when a business is forgotten.
- Any change to `POST /api/v1/ai/match-product-names`.

## Critical Questions
- none

## Execution Notes
- decided: the supplier profile is written on every apply with an invoice from a business that may teach, even when no line is a shared-catalog product — why: the profile describes the supplier's paper (names it prints, VAT included or not, how many invoices), not a product; the Contract ties only the shared alias to the catalog test.
- decided: every stored invoice line that has a product teaches an alias, whatever happened to its price (`created`, `updated`, `same_price`, `no_price`) — why: the person confirmed the link either way; the tenth identical invoice should still strengthen it.
- decided: `packQty` is not written — why: the Contract's `learnFromApply` lines are `{ printedName, productId, unit? }`; inventing a source for the pack size would go beyond it (reported to the Planner as a gap between the brief's MP-07 text and C-ALIAS).
- decided: a shared target the asking business has no live copy of gives no match and the next target is not tried — why: the Contract says shared is "the target with the most contributors … mapped to the business's live product"; trying the runner-up would silently offer the link fewer kitchens agreed on.
- decided: an own alias whose product was deleted is skipped and the name may then resolve from the shared memory — why: returning a product in Trash would make the screen update nothing.
- decided: `resolve` has no rate limiter — why: no model call and three indexed reads per request; the import limiter (10 per 15 minutes) would block a consultant's batch of invoices, and the Contract names none.
- decided: the memory step runs even when the invoice record failed to save — why: the prices were approved and written; the link the person made is true whether or not the record was kept.
- decided: `learnFromApply` throws on a database error and the route's trail step catches it — why: one place (the trail) decides that a failed side write never fails the approval, as in plans 625 and 626.
- decided: the route, not the service, loads the business document — why: `server/services/business.js` will require `invoice-memory.js` for `forgetBusiness`; the service must not require it back.
- decided: no row is added to `docs/agent/standards-backend.md` or `server/breadcrumbs.md` — why: the same reason as in plan 625 (no existing row for this router; side-by-side server runs).
- evidence: pnpm run test:server -> exit 0, 125 files / 1675 tests pass (incl. invoice-memory.test.js, 13 tests); pnpm --dir server run lint -> exit 0 (0 errors); pnpm run build -> exit 0; pnpm run lint -> exit 0; breadcrumbs-check clean; kit-manifest-check ok; log-query: no database configured (skip).
- placeholder found in server/services/business.js: two comment lines from 618 (`// plan 627 calls forgetBusiness(db, id) here ...` in setAiPrivate, and the same in deleteBusinessServerData); no stub invoice-memory.js existed. Both comments replaced by `await require('./invoice-memory').forgetBusiness(...)`.
- decided: the second placeholder (deleteBusinessServerData, private business) is filled too — why: 618/619 left that comment naming 627, and C-LEARN says a private business leaves nothing.
