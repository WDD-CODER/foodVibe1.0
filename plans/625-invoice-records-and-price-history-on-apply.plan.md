# Plan 625 — Keep every approved invoice and every price change when prices are applied

Status: draft
Depends-on: 618, 619
Snapshot: e916e48e3943a650ba9767ebb4023d20e823ae8d

## Problem Statement
When an owner approves a supplier price list or a scanned invoice, the server overwrites the price on the product and
nothing else remains: no invoice, no previous price, no way to say "this went up" (brief MP-05). This plan makes the
one existing save request also write the invoice as a record and one history row per price it created or changed, and
close the AI draft trail with what the person really saved. It is server only; the screen comes in plan 628.

Verified on `origin/main` (e916e48e, 2026-11-17):
- `server/routes/product-import.js` is 134 lines and has one route, `POST /apply` (line 37): `verifyToken` →
  `assertCan(req, res, 'editMoney', { type: 'products' })` (line 38) → `importLimiter` (10 per 15 minutes per user,
  `IMPORT_LIMIT_MAX`, lines 25–32) → the handler. Mounted at `/api/v1/product-import` (`server/app.js:214`).
- The handler reads `rows` (line 41), refuses more than `MAX_IMPORT_ROWS` = 200 (line 43), checks the supplier inside the
  business with projection `{ _id: 1 }` (line 47), loads the business's live products and keys them by
  `normalizeProductName(nameHebrew)` (lines 52–57), then walks the rows once (lines 69–121) into `created`, `updates`
  and `skippedRows` (`invalid` | `duplicate` | `no_price` | `same_price`).
- The old price is known at line 81 (`current = sources.find(source => source.supplierId === sourceKey)`) and is
  overwritten at line 84. Nothing keeps it.
- The writes are `insertMany(created, { ordered: false })` (line 123) then `bulkWrite(updates, { ordered: false })`
  (line 124). No transaction. The answer is `{ created, updated, skipped, skippedRows }` (line 127). The log line is
  `product_import.applied` with counts only (line 126); an error logs `product_import.failed` and answers 500 (lines 129–130).
- A row matched to an existing product is sent by the browser with that product's name
  (`src/app/pages/inventory/components/product-import/product-import.component.ts:238`), so the text the supplier
  printed never reaches the server today.
- `server/test/product-import-route.test.js` (210 lines, 23 tests) covers the route. Every assertion on the apply answer
  is `toMatchObject` or a single field, so an added response field breaks none. Its `beforeEach` (lines 32–39) empties
  every collection and seeds two suppliers.
- `server/routes/generic.js:58–62` answers 405 `{ error: 'USE_ROUTER' }` for any non-GET on a type flagged
  `routerWrites`; `readProjection` (line 124) trims a staff read through `staffProjection(type)`
  (`server/utils/permissions.js`), which keeps the base fields plus `STAFF_READ_FIELDS[type]`.
- `server/middleware/validate.js:12` `checkStoredDoc(type, doc)` validates a whole document against
  `SCHEMA_BY_COLLECTION`. `server/utils/business-scope.js:27` `stampNew(req, doc)` stamps `businessId`, `createdBy`,
  `createdAt`. `server/utils/id.js` `newId()`. `server/utils/actor.js` `actorOf(req)` → `{ userId, name }`.
- `server/test/helpers/log-capture.js` `captureLogs()` collects log records by `event`.
- Not on `origin/main` yet, delivered by wave 0 before this plan starts (C-REGISTRY, C-AIDRAFT, C-FILES):
  `shared/schemas/entities/invoice.schema.ts` and `price-history.schema.ts` with their `SCHEMA_BY_COLLECTION` entries,
  the collections `invoices` (generic read, `routerWrites`), `priceHistory`, `aiDrafts`, `storedFiles`, their indexes,
  `OWNER_ONLY_TYPES` / `MONEY_FIELDS` / `STAFF_READ_FIELDS` entries for `invoices`, and
  `server/services/ai-drafts.js` (`confirmAiDraft`).

## Goals & Success Criteria
**Primary:** one `POST /api/v1/product-import/apply` request leaves, beside the products, one `priceHistory` row per
price it created or changed and, when an invoice header is sent, exactly one `invoices` document — and a failure of
that trail never undoes or hides the prices the owner approved.

- [auto] `pnpm run test:server` → exit 0, including the new `server/test/product-import-invoice.test.js` and `server/test/invoice-trail.test.js`.
- [auto] `pnpm run test:server` → the 23 existing tests of the price-list apply route (the route test file plan 432 wrote, named in the Problem Statement) all pass; that file is outside this plan's scope and is not edited.
- [auto] An apply with an invoice header and three rows (a new product at 4, an existing product going from 5.9 to 6.49, an existing product at its same price 4.5) writes exactly one `invoices` document and exactly two `priceHistory` rows: the new product's row has `price: 4`, `source: 'invoice'`, the invoice's id and no `prevPrice`; the changed one has `prevPrice: 5.9`, `price: 6.49`, `changePct: 10`; the same-price row writes none (`server/test/product-import-invoice.test.js`).
- [auto] The stored invoice's `lines` carry, in the order sent, `result` `created`, `updated`, `same_price`, the three product ids and `price` 4, 6.49, 4.5; the answer carries `invoiceId` equal to the document's `_id` (`server/test/product-import-invoice.test.js`).
- [auto] An apply without `invoice` answers with no `invoiceId` key, writes no `invoices` document, and writes one `priceHistory` row per created or changed price with `source: 'import'` and no `invoiceId` (`server/test/product-import-invoice.test.js`).
- [auto] When the `invoices` insert fails (the test makes that one insert throw), the answer is 200 with the product counts and `invoiceId: null`, the product holds the new price, and one `product_import.apply.trail_failed` log record exists with `stage: 'invoice'` and no product name or price in it; when the `priceHistory` insert fails, the answer is 200 with `invoiceId: null` and no `invoices` document is written (`server/test/product-import-invoice.test.js`).
- [auto] An `invoice` whose line points at a row that does not exist, or with a `supplierTaxId` that is not 9 digits, answers 400 `INVALID_INVOICE`; a `fileId` or `draftId` of another business answers 400 `UNKNOWN_FILE` / `UNKNOWN_DRAFT`; in all four cases no product, history row or invoice is written (`server/test/product-import-invoice.test.js`).
- [auto] An apply with the `draftId` of a pending draft whose two suggested lines were saved one unchanged and one with another unit price leaves that draft `status: 'confirmed'` with `keptRatio: 0.5` (`server/test/product-import-invoice.test.js`); `invoiceKeptRatio` gives 0 for a draft with no suggested lines and never more than 1 (`server/test/invoice-trail.test.js`).
- [auto] An apply whose invoice names a stored file of the business that carries a `deleteAfter` date leaves that `storedFiles` document without it once the invoice is saved (`keepStoredFile`); when the invoice insert fails the date stays (`server/test/product-import-invoice.test.js`).
- [auto] `GET /api/v1/data/invoices`: the owner gets the invoice with its `lines`; a staff member of the same business gets it with only the base fields plus `supplierName`, `invoiceDate`, `invoiceNumber` (no `lines`, no `supplierTaxId`); an owner of another business gets an empty list; `POST`, `PUT` and `DELETE` on `/api/v1/data/invoices` answer 405 `USE_ROUTER`; a staff token on `POST /api/v1/product-import/apply` with an invoice answers 403 and writes nothing (`server/test/product-import-invoice.test.js`).
- [auto] `pnpm --dir server run lint` → exit 0.
- [auto] `pnpm run build` → passes.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.

## Execution Mode
- Parallel: no — 625, 626 and 627 all edit `server/routes/product-import.js` and run one after another inside `mod-invoices-srv` (629 edits the same file later); never beside any plan of `mod-0`.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/product-import.js
server/utils/invoice-trail.js
shared/schemas/entities/invoice.schema.ts
server/test/product-import-invoice.test.js
server/test/invoice-trail.test.js
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — the route keeps `verifyToken` and `assertCan(…, 'editMoney', { type: 'products' })` before any read; `invoices` are written only by this router and the generic API refuses every write to them (`USE_ROUTER`); staff read three header fields only.
- INV-2: preserves — every new row carries the caller's `businessId` (`stampNew` for the invoice, the token's business for history); every query goes through `scopeFilter(req)`; neither collection is cloneable.
- INV-3: preserves — products, history, the invoice and the draft confirm are written by the server in the one apply request; the browser sends one request and never loops.
- INV-4: preserves — the request's `invoice` is parsed by a Zod schema in `shared/schemas`, and the stored invoice and every history row pass `checkStoredDoc` before they are written.

## Reuse Check

- `server/utils/invoice-trail.js` (`changePct`, `invoiceKeptRatio`, `buildInvoiceLines`) — family: invoice-trail — rung: 4 — why: server-side pure helpers; no price-change or draft-closeness helper for invoices exists, and keeping them out of the route makes them testable without a database.
- `invoiceApplyInputSchema` — family: invoice-trail — rung: 4 — why: the request shape of C-INVOICE; it lives in the invoice schema file wave 0 created so the screen (628) and the server read one definition.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As an owner, I want every invoice I approve to stay as a record so that I can go back to what a supplier charged me and when.
- As an owner, I want the previous price kept beside the new one so that the app can later tell me which products went up and by how much.
- As a chef, I want my price update to be saved even when the record-keeping part has a problem so that tomorrow's costs are right.
- As a consultant acting in a client's kitchen, I want the invoices I enter to build that kitchen's price history so that my diagnosis rests on real numbers.

## Functional Requirements

### Must Have (P0)
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
- [ ] This plan implements every line of C-INVOICE except `GET /api/v1/product-import/price-rises`, which plan 629 adds (the map's card for 629 owns it).
- [ ] `shared/schemas/entities/invoice.schema.ts` (created by 615) gains two exports; nothing 615 wrote in the file is changed:
  - `SUPPLIER_KEY_PATTERN = /^(tax:\d{9}|phone:\d{9}|name:.{1,200})$/`.
  - `invoiceApplyInputSchema` — a `z.strictObject`: `supplierName` (trimmed, 1–200), `supplierTaxId?` (`^\d{9}$`), `invoiceNumber?` (trimmed, 1–40), `invoiceDate?` (`^\d{4}-\d{2}-\d{2}$`), `vatIncluded?` (boolean), `source` (`'photo' | 'pdf' | 'text'`), `fileId?` (1–64), `draftId?` (1–64), `supplierKey?` (`SUPPLIER_KEY_PATTERN`), `lines` — 1 to 200 of a `z.strictObject` `{ printedName (trimmed, 1–200), quantity? (> 0), unit? (≤ 40), unitPrice? (≥ 0), lineTotal? (≥ 0), needsReview (boolean), row (integer ≥ 0) }`. Exported type `InvoiceApplyInput`.
  - The route reads it from `require('../generated/schemas/entities/invoice.schema')` (the per-file output of `pnpm run build:schemas`; the generated folder is never edited by hand).
- [ ] `server/utils/invoice-trail.js` (new, pure, no database):
  - `changePct(prevPrice, price)` → `Math.round((price - prevPrice) / prevPrice * 10000) / 100`; `undefined` when `prevPrice` is not a number above 0.
  - `buildInvoiceLines(invoiceLines, outcomes)` → for each sent line, in order: the printed fields as sent (`printedName`, and `quantity`, `unit`, `unitPrice`, `lineTotal` only when sent), `needsReview`, and from `outcomes[line.row]`: `price` (the positive price that row carried, else `null`), `result`, and `productId` when the outcome has one. The `row` number is not stored.
  - `invoiceKeptRatio(aiDraft, saved)` → the C-AIDRAFT closeness for an invoice: `suggested` = `aiDraft.printed` (the list of `{ name, quantity, unit, unitPrice, lineTotal }` plan 626 stores in the draft); a suggested line counts as kept when `saved` (the stored invoice lines) has a line whose `normalizeProductName(printedName)` equals `normalizeProductName(name)` and whose `quantity`, `unitPrice` and `lineTotal` are equal (`null` and absent are the same). Before comparing, the suggested lines are reduced to one per normalised name, the last printed line with that name winning — the same link between a row and its printed line that C-INVREAD states. Result = kept / the number of those distinct names, rounded to 4 decimals, never above 1; `0` when `aiDraft.printed` is missing, not a list or has no named line. Each saved line is used for at most one suggested line.
- [ ] `server/routes/product-import.js` `POST /apply`, in this order:
  1. After the `rows` checks that exist today: when `req.body.invoice` is present (not `undefined`), parse it with `invoiceApplyInputSchema`. A parse failure, or a line whose `row` is not below `rows.length`, answers 400 `{ error: 'INVALID_INVOICE' }` before any write. No `invoice` → this step and steps 5–6 are skipped.
  2. When the invoice names a `fileId`: one read of `storedFiles` `{ _id: fileId, businessId: <the caller's>, kind: 'invoice' }`; none → 400 `{ error: 'UNKNOWN_FILE' }`. When it names a `draftId`: one read of `aiDrafts` `{ _id: draftId, businessId: <the caller's> }` (projection `_id` only); none → 400 `{ error: 'UNKNOWN_DRAFT' }`. Both before any write.
  3. The row loop keeps what it does today and also records, per row index, an outcome `{ result, productId?, price }` (`result` = `created` | `updated` | `same_price` | `no_price` | `invalid` | `duplicate`; `productId` = the new product's id for `created`, the matched product's id for `updated`, `same_price`, `no_price`; `price` = `positive(row.price)`), and queues one history entry for every `created` row that has a price (`{ productId, supplierId: sourceKey, price }`) and every `updated` row (`{ productId, supplierId: sourceKey, price, prevPrice: current.price when current exists and its price is a number above 0, changePct: changePct(prevPrice, price) when prevPrice is set }`). `same_price`, `no_price`, `invalid`, `duplicate` queue nothing.
  4. The product writes are unchanged (`insertMany`, then `bulkWrite`). An error here answers 500 as today and writes no trail.
  5. The trail, each step inside its own `try`/`catch`; a caught error logs `req.log.error({ err, event: 'product_import.apply.trail_failed', stage, historyRows: <count queued>, invoiceId })` (ids and counts only) and never changes the HTTP status:
     - `stage: 'history'` — the queued entries become rows `{ _id: newId(), businessId: req.user.businessId, productId, supplierId, price, prevPrice?, changePct?, at: now, by: actorOf(req).userId, source: invoice ? 'invoice' : 'import', invoiceId? }`; `invoiceId` is a `newId()` made before this step when an invoice was sent, so the rows and the invoice share it. Each row must pass `checkStoredDoc('priceHistory', row)`; one that does not is dropped and counted in the applied log line as `historySkipped`. `insertMany(rows, { ordered: false })` when there is at least one.
     - `stage: 'invoice'` — only when an invoice was sent and the history step did not fail: `stampNew(req, { _id: invoiceId, userId, schemaVersion: 2, supplierId (only when the request named one), supplierName, supplierTaxId?, invoiceNumber?, invoiceDate?, vatIncluded?, source, fileId?, draftId?, supplierKey?, lines: buildInvoiceLines(invoice.lines, outcomes), updatedAt: now })`; it must pass `checkStoredDoc('invoices', doc)` (a failure is thrown into the same catch); `insertOne`. Then, when the invoice names a `fileId`, `await keepStoredFile(db, req.user.businessId, fileId)` (`server/services/file-store.js`, plan 619 — it lifts the 30-day clean-up a freshly read file carries, so a saved invoice's file stays) in its own `try`/`catch`: a throw is logged with `stage: 'invoice_file'` and does not null `invoiceId` (the invoice is saved).
     - `stage: 'draft'` — only when the invoice names a `draftId`: `await confirmAiDraft(req, draftId, <the stored lines>, invoiceKeptRatio)`. It runs whether or not the invoice step succeeded (the prices were approved either way).
  6. The answer: `{ created, updated, skipped, skippedRows }` as today; when an invoice was sent it also has `invoiceId` — the id when the history step and the invoice step both succeeded, else `null`. Without an invoice the key is absent.
  7. `product_import.applied` gains the counts `historyRows`, `historySkipped` and the boolean `invoice`. No name, price, tax id, invoice number or file id is logged anywhere in this route.
- [ ] The header comment of the file is updated to describe the new body field, the new response field, the write order and the "a failed trail never rolls back prices" rule.
- [ ] Tests in `server/test/product-import-invoice.test.js` (new) use the harness of `server/test/product-import-route.test.js` (`buildTestApp`, `signTestToken`, `testDb`, `supplierBody` / `productBody` / `stored` from `server/test/helpers/v2-docs.js`, the same `beforeEach` that empties every collection) and set `process.env.IMPORT_LIMIT_MAX = '200'` before the app is built. Fixtures are inserted straight into `storedFiles` and `aiDrafts` (no model, no file store, no network). The failing-insert cases use `vi.spyOn(mongoose.mongo.Collection.prototype, 'insertOne' | 'insertMany')` with an implementation that throws only when `this.collectionName` is `invoices` / `priceHistory` and otherwise calls the original; the spy is restored in `afterEach`. Log assertions use `captureLogs()` from `server/test/helpers/log-capture.js`.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- No screen in this plan. The invoice screen and the invoices list are plan 628; the price-rise alert is plan 629.
- No `dictionary.json` key, no icon.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Describe the invoice header an approval may carry so a wrong one is refused before any write — add SUPPLIER_KEY_PATTERN, invoiceApplyInputSchema and its type beside what 615 wrote; run pnpm run build:schemas — shared/schemas/entities/invoice.schema.ts
- [x] A2: Add the pure rules that work out a price change in percent and how close a draft was — changePct, buildInvoiceLines, invoiceKeptRatio with unit tests (10 percent fixture, null equals absent, a repeated printed name counts once with its last line, empty draft gives 0, never above 1) — server/utils/invoice-trail.js, server/test/invoice-trail.test.js
- [x] A3: Refuse a broken invoice header or one pointing at another business before anything is saved — steps 1 and 2 of the route requirement with the four 400 cases — server/routes/product-import.js, server/test/product-import-invoice.test.js
- [x] A4: Remember the old price of every product the approval changes, with or without an invoice — per-row outcomes, queued history entries, the history step, the applied log counts; tests for source invoice and source import, none for same price — server/routes/product-import.js, server/test/product-import-invoice.test.js
- [x] A5: Save the invoice itself as one record whose lines say what happened to each product — the invoice step, keeping its stored file, invoiceId in the answer, the header comment; tests for the stored lines, the kept file and the answer — server/routes/product-import.js, server/test/product-import-invoice.test.js
- [x] A6: Keep the approved prices and answer normally when the record keeping fails — per-step try and catch, the trail_failed log line, invoiceId null; tests with the throwing insert spies and the log capture — server/routes/product-import.js, server/test/product-import-invoice.test.js
- [x] A7: Close the AI draft with what was really saved so scan accuracy can be measured later — the draft step with invoiceKeptRatio; test with a seeded pending draft ending confirmed at 0.5 — server/routes/product-import.js, server/test/product-import-invoice.test.js
- [x] A8: Prove who may read an invoice and that nobody can write one around the approval — generic read as owner, staff and another business, the 405 on writes, staff 403 on apply — server/test/product-import-invoice.test.js
- [x] A9: Run the full checks and confirm the old apply tests still pass untouched — pnpm run test:server, server lint, build, log-query — no file

## Technical Considerations
- Dependencies: `server/services/ai-drafts.js` (`confirmAiDraft`, plan 618), the `invoices` / `priceHistory` schemas, collections, indexes and field lists (plan 615), `storedFiles` and `keepStoredFile(db, businessId, fileId)` in `server/services/file-store.js` (plan 619, merged in `mod-0` before this run). `normalizeProductName` from `server/utils/price-list-import.js`.
- New files needed: `server/utils/invoice-trail.js`, `server/test/product-import-invoice.test.js`, `server/test/invoice-trail.test.js`.
- Model changes: `invoiceApplyInputSchema`, `InvoiceApplyInput`, `SUPPLIER_KEY_PATTERN` in `shared/schemas/entities/invoice.schema.ts`.
- Backend / API: `POST /api/v1/product-import/apply` — the body gains optional `invoice`, the answer gains `invoiceId` when an invoice was sent; new errors `INVALID_INVOICE`, `UNKNOWN_FILE`, `UNKNOWN_DRAFT` (all 400). No new route.
- Auth and validation: unchanged gate — owner (and, after plan 631, a consultant) through `editMoney` on `products`, checked before the limiter. The header is validated by Zod; ids in it must belong to the caller's business.
- Security surface: one new input object. The file id and draft id are checked against the caller's business so an invoice can never point at another business's file. Logs carry counts and ids only. `supplierKey` is format-checked because plan 627 uses it as a key shared between businesses.
- Data / migration: no migration. Two collections start to fill: `invoices` (one document per approved invoice, at most 200 short lines) and `priceHistory` (one small row per changed price, about 150 bytes; 1,000 changed prices a month is about 150 KB on the free database tier). Existing products and prices are untouched; history starts from the first apply after this plan.
- Project checks: `[auto] log-query` item present; server tests through `pnpm run test:server`; entity shapes are Zod schemas in `shared/schemas`; the new collections follow `docs/agent/standards-backend.md` §3 in plan 615 (this plan adds no collection); no dictionary key, no icon, no screen.

## Out of Scope
- `GET /api/v1/product-import/price-rises` and `priceRiseAlertPct` — plan 629.
- Reading an invoice file, the header read by the model, storing the file, setting a supplier's tax id — plan 626.
- Name memory and the shared supplier brain — plan 627.
- Any screen — plans 628 and 629.
- Detecting that the same invoice was approved twice (the same supplier and number): both are saved.
- Deleting or editing an invoice: no route does it in this program (`invoices` is registered with `softDelete: false`, and the generic API refuses every write to it).
- A price typed by hand on a product writes no history (brief assumption A6).
- A database transaction around the apply (map delta 5: the route has none and gets none).

## Critical Questions
- none

## Execution Notes
- decided: `invoiceId` in the answer is the id only when both the history rows and the invoice document were written, else `null`; a failed draft confirm is logged and does not null it — why: C-INVOICE says a failed trail answers `invoiceId: null`; the draft confirm comes after the invoice exists, so nulling the id there would hide a record that was saved.
- decided: when the history step fails the invoice step is not tried — why: an invoice whose price changes were lost would show a record with no history behind it; one clear rule (`invoiceId` non-null = the full trail exists) is easier for 628 and 633 to rely on.
- decided: history rows of an invoice carry the invoice id even if the invoice insert then fails — why: the id is made before the history step so both share it without a second write; a dangling id is harmless because history is read by product, not through the invoice.
- decided: a stored line's `productId` is also set for `same_price` and `no_price` — why: the person linked that printed name to that product even though no price moved, and plan 627 learns the name from it.
- decided: `fileId` and `draftId` of another business answer 400 before any write — why: the Contract does not say; an invoice must never point at another business's file, and checking first keeps the "nothing written on a refused request" rule.
- decided: the closeness of an invoice draft compares printed name, quantity, unit price and line total of each suggested line — why: C-AIDRAFT asks for "lines saved unchanged / lines suggested" and leaves the meaning of "unchanged" to the feature; these are the values the model read.
- decided: the request schema and `SUPPLIER_KEY_PATTERN` live in 615's `invoice.schema.ts` — why: a plan may edit its own schema file and may not edit `shared/schemas/entities/index.ts`; the generated per-file module is requirable without the index.
- decided: `server/test/product-import-route.test.js` is left out of the scope on purpose — why: the Done-when is that it passes unchanged; out of scope means it cannot be edited to pass.
- decided: no row is added to `docs/agent/standards-backend.md` or `server/breadcrumbs.md` — why: neither file lists the product-import router today, and three server runs edit side by side; a docs row would be the only cross-run conflict.
- decided: the invoice's stored file is kept by `keepStoredFile` right after the invoice insert — why: C-FILES gives a freshly read file 30 days; only a saved invoice lifts that, so a file whose invoice failed to save is still cleaned up.
- evidence: `pnpm run test:server` → exit 0, 122 files / 1629 tests passed (incl. product-import-invoice, invoice-trail, the 23 unchanged product-import-route tests).
- evidence: `pnpm --dir server run lint` → exit 0 (0 errors); `pnpm run lint` → 0 errors; `pnpm run build` → ok; `plan-ledger-check` OK; `log-query` → SKIP: no database configured.

- Fix round 1: added family `invoice-trail` to docs/brain/component-families.md, regenerated docs/brain/inventory.md; Reuse Check rows now name the family. kit-checks → ok (6 checks).
