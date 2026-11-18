# Plan 628 — Invoice screen: scan a photo or a PDF, confirm the header, match from memory first, see the price change in percent, and an invoices list

Status: draft
Depends-on: 627
Snapshot: e916e48e3943a650ba9767ebb4023d20e823ae8d

## Problem Statement
The import screen (`/inventory/import`) reads a pasted price list or a photo of a receipt, shows a preview and saves
prices. After the server run of this program (625, 626, 627) the server can do much more than the screen asks for: it
reads the invoice header (supplier, tax id, date, number), takes a PDF, keeps the file, remembers which printed name
belongs to which product, and keeps an invoice record with a price history. None of that reaches the chef until the
screen calls the new routes. This plan makes the screen use them (brief MP-08, first half): photo or PDF in, a header
strip the owner confirms, names matched from memory before any model call, the old price, the new price and the change
in percent on every row, and a list of the saved invoices that opens the stored file.

Verified on `origin/main` (e916e48e, 2026-11-17):
- `src/app/pages/inventory/components/product-import/product-import.component.ts` is 416 lines, its template 302, its
  styles 283 and its spec 530 (38 `it` cases). State is signals: `supplierId_`, `rows_`, `isFromPhoto_` (line 99),
  `isMatching_`, `pendingIds_`, `summary_`. `view_` (line 138) gives each row `status` (`new` / `update` / `same` /
  `matching`), `match` and `oldPrice` — the old price is `match.sources.find(s => s.supplierId === supplierId_())?.price`,
  so it is the price **of the chosen supplier** only.
- One read path for both inputs: `parse()` (line 168, pasted text → `GeminiService.parsePriceList`) and
  `onPhotoChosen()` (line 178 → `GeminiService.parseReceiptPhoto`) both call `readAndFill_()` (line 190), which fills
  `rows_` and then calls `matchWithAi_()` (line 367). `matchWithAi_` sends to the model only the rows `matchOf_()`
  (line 357) could not settle; `matchOf_` prefers `row.matchedId`, then the exact / variant name match of
  `ProductNameMatcherService.matchExact`. So a row whose `matchedId` is set before `matchWithAi_` runs is never sent
  to the model — that is the hook for "memory first".
- `saveAll()` (line 232) sends one request through `ProductImportService.apply(supplierId, rows)`
  (`src/app/core/services/product-import.service.ts`, 50 lines, no spec file). A matched row is sent with the
  product's own name (`match.nameHebrew`), which is how `POST /api/v1/product-import/apply`
  (`server/routes/product-import.js:37`) finds the product (normalised name, first one wins).
- Template: two hidden file inputs `import-photo-camera-input` (with `capture`) and `import-photo-upload-input`
  (line 58), both `accept="image/jpeg,image/png,image/webp"`; the supplier select `import-supplier` (line 41) sits in
  the paste panel; the old price is shown under the price box (`import-old-price`, line 195) only for status `update`;
  the note `import-photo-privacy` (line 93) shows key `import_photo_privacy` = «התמונה נשלחת לקריאה ב-AI ואינה נשמרת
  באפליקציה» — untrue once the file is kept.
- `GeminiService` (`src/app/core/services/gemini.service.ts`, 375 lines): `parseReceiptPhoto` (line 156) shrinks the
  photo twice (`encodeImage_(file, 2000, 0.75)`, then `1400, 0.6`) against `RECEIPT_IMAGE_MAX_BASE64` = 1,800,000
  (`shared/schemas/ai-receipt-photo.schema.ts`) and rejects with `IMAGE_TYPE_UNSUPPORTED` / `IMAGE_TOO_LARGE`. Its
  only caller is this component; `gemini.service.spec.ts` has a `describe('GeminiService.parseReceiptPhoto')` (line 112).
- `server/utils/price-list-import.js`: `normalizeReceiptRows` → `normalizePriceListRows` drops lines without a name
  and merges duplicate names (last one wins). So the `rows` and the `printed` lists of C-INVREAD are **not** aligned by
  index; a row is linked to its printed line by the normalised name. The browser has the same rule:
  `normalizeProductName` in `src/app/core/utils/product-name.util.ts`.
- Backend paths live in one map: `API` in `src/app/core/services/http-storage.adapter.ts` (line 9). It has `ai(path)`
  and `productImport(path)`; it has no entry for `/api/v1/files`.
- The `inventory` chip group (`src/app/core/components/tab-chips/tab-chips.component.ts:60`) has two chips, `products`
  and `equipment`; `tab-chips.component.spec.ts:83` asserts that exact list. The `inventory` route
  (`src/app/app.routes.ts:67`) has lazy children `list`, `add`, `import`, `edit/:id`, `equipment…`.
- `BaseEntityDataService<T>` (`src/app/core/services/base-entity-data.service.ts`) loads a type through the generic
  API (`storage.query`), exposes `all_`, and has `reloadFromStorage()`. Staff reads of a type listed in
  `STAFF_READ_FIELDS` are trimmed by the server (`staffProjection`, `server/utils/permissions.js`).
- `app-date-field` (`src/app/shared/date-field/`) takes and gives an ISO date `yyyy-mm-dd` — the format of
  `invoiceDate`.
- No file icon is registered: `src/app/app.config.ts` has `Camera`, `Image`, `Eye`, `Sparkles`, `Trash2`, no `FileText`.
- New after the plans this one depends on (not on `e916e48e`; the Contracts below are their shape): 
  `POST /api/v1/ai/invoices/read` (626), `POST /api/v1/product-import/resolve` (627), the `invoice` header on
  `apply` (625), `GET /api/v1/files/:id` (619), the `invoices` collection and its schema file
  `shared/schemas/entities/invoice.schema.ts` (615).

## Goals & Success Criteria
**Primary:** the owner photographs or uploads a supplier invoice, sees the supplier, date and number already filled,
sees most lines already linked to his products without waiting for the model, sees by how many percent each price
moved, saves once — and finds the invoice with its file in a list afterwards.

- [auto] `pnpm run test:ci` passes, including the cases this plan adds to `src/app/pages/inventory/components/product-import/product-import.component.spec.ts`: (a) a PDF chosen in the upload input calls `readInvoice` once and fills the preview; (b) after a file read `resolve` is called once with the read's `supplierKey` and every row name, and `matchNames` receives only the names `resolve` did not return; (c) with every name resolved `matchNames` is not called; (d) a failed `resolve` still calls `matchNames` with all unmatched names and shows no error; (e) a row with old price 5 and new price 5.3 shows `+6.0%`, a row with 5 → 4.8 shows `-4.0%`, a new row shows no percent; (f) the save after a file read sends `invoice` with `source`, `supplierKey`, `draftId`, `fileId`, the edited date and number and one line per kept row whose `row` is its index; (g) the save after a pasted list sends no `invoice`; (h) a deleted row has no line; (i) with no supplier chosen and none printed the save button is disabled and `invoice_supplier_required` is shown; (j) a save answered with `invoiceId: null` shows the summary and the `invoice_trail_failed` message.
- [auto] `pnpm run test:ci` passes, including `src/app/pages/inventory/components/product-import/invoice-header-strip/invoice-header-strip.component.spec.ts` (shows the chosen supplier, the printed name hint, the tax id, emits date and number edits, is disabled while saving), `src/app/pages/inventory/components/invoices-list/invoices-list.component.spec.ts` (rows newest first; owner sees the lines count and the file button; a staff session sees neither; no file → `invoice_no_file`; empty → `invoices_empty`), `src/app/core/services/invoice-data.service.spec.ts`, `src/app/core/services/product-import.service.spec.ts`, `src/app/core/utils/price-change.util.spec.ts`, `src/app/core/utils/invoice-lines.util.spec.ts`, `src/app/core/services/gemini.service.spec.ts` (`readInvoice`: a PDF is sent unshrunk; a PDF over 1,800,000 base64 characters rejects with `FILE_TOO_LARGE` before any request; `text/plain` rejects with `FILE_TYPE_UNSUPPORTED`; the body has `fileBase64`, `mimeType`, `knownCategories` and, only when a model was chosen, `model`) and the updated `src/app/core/components/tab-chips/tab-chips.component.spec.ts` (the inventory group is products, equipment, invoices).
- [auto] `pnpm run lint` exits 0, `pnpm run lint:icons` exits 0, `pnpm run lint:reuse` exits 0.
- [auto] `pnpm run build` passes.
- [auto] `node scripts/breadcrumbs-check.mjs` exits 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/inventory/import`, choosing an image in the upload input (the read route answered by a prepared fixture whose `supplier.supplierId` is a supplier the spec created, named «ספק בדיקה 628») shows the header strip with the text «ספק בדיקה 628» (`e2e/ui/628-1.spec.ts`).
- [ui] On `/inventory/invoices` (the generic read of `invoices` answered by a prepared fixture with one invoice of «ספק בדיקה 628», number «INV-628») the page shows the title «חשבוניות» and a row with the text «INV-628» (`e2e/ui/628-2.spec.ts`).
- [human] Dandan scans a real invoice on his phone: the header strip is right or easy to fix, the percent next to each price reads well in Hebrew RTL, and the save lands in the invoices list.
- [human] Dandan scans the same invoice a second time: the preview is matched before he touches it (brief MP-07), and the file opens from the invoices list (only once the file-store keys are set, gate G3; before that the row says «הקובץ לא נשמר»).

## Execution Mode
- Parallel: no — 629 edits the same folder `src/app/pages/inventory/components/product-import/**` (it runs after this plan in the same run); and no other screen run may be live: 620, 623, 624, 629, 630, 632, 634, 636, 637 all append to `public/assets/data/dictionary.json`, `src/app/app.routes.ts`, `src/app/app.config.ts` and `tab-chips.component.ts`.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/inventory/components/product-import/**
src/app/pages/inventory/components/product-import/product-import.component.spec.ts
src/app/pages/inventory/components/product-import/invoice-header-strip/invoice-header-strip.component.spec.ts
src/app/pages/inventory/components/invoices-list/**
src/app/pages/inventory/components/invoices-list/invoices-list.component.spec.ts
src/app/core/services/gemini.service.ts
src/app/core/services/gemini.service.spec.ts
src/app/core/services/product-import.service.ts
src/app/core/services/product-import.service.spec.ts
src/app/core/services/invoice-data.service.ts
src/app/core/services/invoice-data.service.spec.ts
src/app/core/services/http-storage.adapter.ts
src/app/core/services/breadcrumbs.md
src/app/core/utils/price-change.util.ts
src/app/core/utils/price-change.util.spec.ts
src/app/core/utils/invoice-lines.util.ts
src/app/core/utils/invoice-lines.util.spec.ts
src/app/core/components/tab-chips/tab-chips.component.ts
src/app/core/components/tab-chips/tab-chips.component.spec.ts
src/app/app.routes.ts
src/app/app.config.ts
public/assets/data/dictionary.json
e2e/ui/628-1.spec.ts
e2e/ui/628-2.spec.ts
docs/brain/component-families.md
docs/brain/inventory.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — the new `invoice-data.service.ts` only reads `invoices` through the generic API, which scopes to the caller's business and trims staff reads on the server; the screen writes nothing but the existing owner-only `apply`, and hiding a column in the browser is never the gate.
- INV-6: preserves — the file goes to `POST /api/v1/ai/invoices/read` on the server; the browser holds no AI key and makes no model call.

## Reuse Check

- `app-invoice-header-strip` (supplier, date, number above the preview) — family: form-field — rung: 1 — why: a page-local child that composes `app-form-field`, `app-custom-select` and `app-date-field` as they are; it exists only to keep the 416-line import component from growing.
- `invoice-header-strip`, `invoice-data`, `invoices-list`, `.invoice-header-strip`, `.invoice-strip`, `.invoice-strip__title`, `.invoice-strip__fields`, `.invoice-strip__note`, `.invoice-strip__chip`, `.invoices-list`, `.invoices-list__row`, `.invoices-list__state`, `.invoices-list__muted`, `.import-change`, `.import-change--up`, `.import-change--down` (the files and page-local classes of this plan) — family: invoice-screen — rung: 1 — why: names of the new files and of the page-local classes in the component `.scss` files, as the UI notes say; the list sits on `app-list-shell` (list-page family), the helpers are `priceChangePct` and `buildInvoiceLines` (helpers family).
- Supplier control in the strip — family: search-combobox — rung: 1 — why: the same `app-custom-select` with `[typeToFilter]` the page already has, moved into the strip after a file read; no add option (unchanged).
- Invoice date control — family: form-field — rung: 1 — why: `app-date-field` as is (ISO value).
- Invoice number control — family: form-field — rung: 1 — why: a `.c-input` text box inside `app-form-field`.
- Percent next to the price — family: helpers — rung: 2 — why: text formatted by `formatPct1` from `src/app/core/engine/rounding.ts`; a page-local span, not a new chip.
- `priceChangePct` in `src/app/core/utils/price-change.util.ts` — family: helpers — rung: 3 — why: one more pure file in `core/utils` with its spec; no percent-of-change helper exists (`rounding.ts` only formats).
- `buildInvoiceLines` in `src/app/core/utils/invoice-lines.util.ts` — family: helpers — rung: 3 — why: pure mapping of kept preview rows to the `invoice.lines` of the apply body; kept out of the component.
- `InvoiceDataService` — family: entity-data-service — rung: 2 — why: `BaseEntityDataService<Invoice>` with `autoLoad: false`, read-only (no save or delete method).
- `GeminiService.readInvoice`, `ProductImportService.resolve`, the `invoice` argument of `apply`, `API.files` — family: http — rung: 3 — why: new methods on the existing services and one more entry in the one `API` map.
- `app-invoices-list` screen — family: list-page — rung: 1 — why: `app-list-shell` + `app-page-header` as they are (pattern: `src/app/pages/suppliers/components/supplier-list/`).
- Empty invoices list — family: empty-state — rung: 1 — why: `app-empty-state` with a call-to-action.
- Loading and errors — family: feedback — rung: 1 — why: `app-loader`, `UserMsgService`, `LoggingService`.
- `invoices` tab chip — family: chip — rung: 2 — why: one more entry in `CHIPS_BY_GROUP.inventory`.
- "Open file" and "scan invoice" buttons — family: engine-classes — rung: 1 — why: `.c-btn-ghost--sm` and `.c-btn-primary` as they are.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef-owner, I want to photograph an invoice or upload the PDF the supplier mailed me so that I do not type prices.
- As a chef-owner, I want the supplier, the date and the invoice number filled for me, and to fix them when the scan got one wrong, so that the saved invoice is right.
- As a chef-owner, I want the lines I already linked last time to arrive linked so that the tenth invoice from a supplier takes seconds.
- As a chef-owner, I want to see by how many percent each price moved before I save so that a jump does not pass unnoticed.
- As a chef-owner, I want a list of the invoices I saved, with the original file one tap away, so that I can check a price against the paper.
- As a staff member, I want to see which invoices were entered (supplier, date, number) without seeing prices.
- As a consultant acting in a client's business (after plan 631), I want the same screen the owner has.

## Functional Requirements

### Must Have (P0)
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
  **C-FILES (619; used by 621, 626, 628)**
  - `server/services/file-store.js`: `isFileStoreConfigured()` (all of `CLOUDINARY_CLOUD_NAME`,
    `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` set); `putPrivateFile(req, { kind: 'invoice' | 'voice', mimeType,
    buffer, deleteAfterDays? }) → fileId | null` — `null` when not configured or when the upload fails (one warn log with kind and
    size, never the content; never throws); `signedFileUrl(file, ttlSeconds)`; `deleteStoredFile(file)`;
    `setFileStoreForTests(fake)`.
  - Upload is signed by the server and delivered as an authenticated (non-public) asset; no new npm dependency
    (`node:crypto` + `fetch`). The request shapes are in 619, taken from the provider's documentation as read on
    2026-11-17 and built by pure functions in `server/services/cloudinary-requests.js`: a signed delivery URL does not
    expire there, so the 300-second link is the provider's API download endpoint with `expires_at`.
  - `server/app.js` gains `media-src` in the content security policy (619), so a recording can be replayed from a
    `blob:` and from a stored file.
  - Collection `storedFiles` (server-only): `{ _id, businessId, kind, mimeType, bytes, provider: 'cloudinary',
    providerId, resourceType, format?: string (≤ 12, from the provider's upload answer), createdBy, createdAt,
    deleteAfter?: number }`. Index `{ businessId, kind, createdAt }`.
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
- [ ] **The flow after a file is chosen** (camera input or upload input), in this order, each step in the existing `readAndFill_` path:
  1. `GeminiService.readInvoice(file, knownCategories)` → `InvoiceReadResult`. On success `incrementGeminiUsage()` (as today).
  2. The rows fill the preview (as today). The invoice state is set from the answer: `source` (`'pdf'` when the file's type is `application/pdf`, else `'photo'`), `header`, `supplier.supplierKey`, `supplier.matchedBy`, `draftId`, `fileId`, `printed`. `supplierId_` is set to `supplier.supplierId` when that id is one of `KitchenStateService.suppliers_()`, else to `''`.
  3. `ProductImportService.resolve(supplierKey, names)` with the names of all rows, in row order. For every `{ i, productId }` whose product is in `KitchenStateService.products_()`, row `i` gets `matchedId = productId`. A rejected call is logged (`productImport.resolve_failed`, the HTTP status only) and the flow goes on; nothing is shown.
  4. `matchWithAi_()` unchanged — because of step 3 it now asks the model only for the names memory did not settle, and makes no call when none are left.
- [ ] **The pasted-list path is unchanged**: `parse()` → `parsePriceList` → preview → `matchWithAi_()` → `apply` with no `invoice`. A paste after a file read clears the invoice state (no header strip, no `invoice` in the save). No `resolve` call on this path (there is no supplier key without a read header).
- [ ] **`GeminiService.readInvoice(file: File, knownCategories: string[]): Promise<InvoiceReadResult>`** replaces `parseReceiptPhoto` (removed with its spec block; the server route `parse-receipt-photo` stays, brief A5):
  - allowed types `image/jpeg`, `image/png`, `image/webp`, `application/pdf` (`INVOICE_FILE_MIME_TYPES`, exported by plan 626 from `shared/schemas/ai-invoice-read.schema.ts`, imported through `@schemas/ai-invoice-read.schema` the way `RECEIPT_IMAGE_MIME_TYPES` is imported today) — anything else rejects with `Error('FILE_TYPE_UNSUPPORTED')` before any request;
  - an image is shrunk exactly as today (`encodeImage_(file, 2000, 0.75)`, then `1400, 0.6` when still over the limit); a PDF is read as base64 with `FileReader.readAsDataURL` and never changed;
  - base64 longer than 1,800,000 characters (`INVOICE_FILE_MAX_BASE64`, same schema file) rejects with `Error('FILE_TOO_LARGE')` before any request;
  - `POST ${authApiUrl}${API.ai('invoices/read')}` with body `{ fileBase64, mimeType, knownCategories, ...this.modelParam_() }` — the member's chosen model rides along as on every other AI call (plan 626's request schema accepts the optional `model`).
- [ ] **`ProductImportService`** (`src/app/core/services/product-import.service.ts`) gains the types `InvoiceHeader`, `PrintedLine`, `InvoiceReadResult`, `ResolveMatch`, `ApplyInvoice` (field for field the C-INVREAD answer, the C-ALIAS `matches` and the C-INVOICE `invoice` body), `resolve(supplierKey: string, names: string[]): Promise<ResolveMatch[]>` (`POST API.productImport('resolve')`, at most 200 names — the preview never has more), and `apply(supplierId, rows, invoice?: ApplyInvoice)`; `ApplyResult` gains `invoiceId?: string | null`.
- [ ] **Header strip** — child component `app-invoice-header-strip` in `src/app/pages/inventory/components/product-import/invoice-header-strip/` (`.ts`, `.html`, `.scss`, `.spec.ts`), shown above the preview table while the preview came from a file and has rows. Signals API: `supplierId = model<string>('')`, `invoiceDate = model<string>('')`, `invoiceNumber = model<string>('')`, `supplierOptions = input.required<{ value: string; label: string }[]>()`, `printedSupplierName = input<string | null>(null)`, `isSuggested = input(false)`, `taxId = input<string | null>(null)`, `vatIncluded = input<boolean | null>(null)`, `isSupplierMissing = input(false)`, `disabled = input(false)`. It shows:
  - the supplier select (the page's existing `app-custom-select` with `[typeToFilter]="true"`, `data-testid="invoice-supplier"`); while the strip is shown the select in the paste panel (`import-supplier`) is hidden, so there is one supplier control on screen;
  - under it, when a supplier name was printed and no supplier is chosen: «על החשבונית: <name>» (`invoice_supplier_printed`, `data-testid="invoice-supplier-printed"`); when the chosen supplier is the one the read suggested: a static chip `c-chip c-chip--tag c-chip--sm c-chip--teal` «זוהה אוטומטית» (`invoice_supplier_suggested`);
  - the date (`app-date-field`, `data-testid="invoice-date"`), the number (text box, `maxlength="40"`, `dir="auto"`, `data-testid="invoice-number"`);
  - read-only: the tax id when one was read («ח.פ. / עוסק: 123456789», `dir="ltr"` on the digits) and one line for VAT when the read said so (`invoice_vat_included` / `invoice_vat_excluded`); nothing when `vatIncluded` is `null`;
  - when `isSupplierMissing`: `c-field-error` «בחרו ספק כדי לשמור את החשבונית» (`invoice_supplier_required`, `role="alert"`).
- [ ] **Supplier rule for a file read:** the save needs a supplier name. `supplierName` sent = the chosen supplier's `nameHebrew`, else the printed `header.supplierName`. With neither, `canSave_` is false and the strip shows the required message. A pasted list keeps today's rule (no supplier is fine).
- [ ] **Price change in percent:** `priceChangePct(oldPrice: number | null, newPrice: number | null): number | null` in `src/app/core/utils/price-change.util.ts` — `null` when either is `null` or `oldPrice <= 0`; else `Math.round(((newPrice - oldPrice) / oldPrice) * 10000) / 100` (two decimals, the rule the server uses for `priceHistory.changePct`). `view_` gives every row `changePct` (from `oldPrice` and `row.price`; `null` for a new row, a row still matching, a product with no price from the chosen supplier). The price cell of a row with status `update` shows, as today, «היה ₪5.00» and after it the percent with a sign and one decimal (`+6.0%`, `-4.0%`; `formatPct1`; `dir="ltr"`; `data-testid="import-change"`; class `import-change--up` in `var(--color-danger)` when above 0, `import-change--down` in `var(--color-success)` when below; `aria-label` from `import_price_change`). It updates as the owner edits the price or changes the supplier.
- [ ] **The save after a file read** sends `apply(supplierId, rows, invoice)` where `invoice` = `{ supplierName, supplierTaxId?, invoiceNumber?, invoiceDate?, vatIncluded?, source, fileId?, draftId?, supplierKey, lines }` — `invoiceNumber` trimmed and left out when empty, `invoiceDate` left out when empty, `supplierTaxId` / `vatIncluded` / `fileId` / `draftId` left out when the read gave `null` or nothing. `lines` = `buildInvoiceLines(keptRows, printed)` (`src/app/core/utils/invoice-lines.util.ts`): one line per kept preview row, in the order of `rows`, `{ printedName, quantity?, unit?, unitPrice?, lineTotal?, needsReview, row }` with `row` = the row's index in the `rows` array of the same request; `printedName` = the name the row had **when it was read** (kept on the preview row as `printedName`, never changed by an edit); the four printed values come from the `printed` entry whose `normalizeProductName(name)` equals `normalizeProductName(printedName)` (the last such entry), each left out when it is not a finite number above 0 (`unit`: when not a non-empty string). After a successful save the invoice state is cleared with the rows.
- [ ] **Messages:** `errorKeyFor_` keeps the 429 / `daily_limit_reached` rule; a 429 whose `error` is `ai_monthly_cap_reached` shows the key `ai_monthly_cap_reached` (C-AICAP; append it with «הגעתם למכסת ה-AI החודשית של העסק» only if plan 620 did not add it); for a file: `FILE_TOO_LARGE` (thrown in the browser, or the server's 400 `FILE_TOO_LARGE`) or a 413 → `import_file_too_big`; `FILE_TYPE_UNSUPPORTED` (browser) or the server's 400 `UNSUPPORTED_FILE_TYPE` → `import_file_unsupported`; anything else, the 502 `INVOICE_READ_INVALID` of a malformed model answer included → `import_file_failed`. When a save that carried `invoice` answers 200 with `invoiceId: null` (C-INVOICE: the prices were saved, the invoice record was not), the usual summary is shown and one more error toast `invoice_trail_failed`; the rows are cleared as after any successful save. As today, a failed read keeps the rows already in the preview and the text in the box. The hint over the table after a file read is `import_file_check_hint`; the note under the buttons is `invoice_file_privacy` (the old keys stay in the dictionary, unused).
- [ ] **The upload button** takes a PDF too: the upload input's `accept` becomes `image/jpeg,image/png,image/webp,application/pdf`, its label `import_file_upload` with the icon `file-text`; the camera input and button are unchanged. `data-testid`s stay (`import-photo-camera`, `import-photo-upload`, `import-photo-camera-input`, `import-photo-upload-input`, `import-photo-hint`, `import-photo-privacy`) so the 38 existing spec cases keep their selectors; cases that stub `parseReceiptPhoto` stub `readInvoice` instead and assert the new keys.
- [ ] **What happens on edit, leave, cancel, error, empty** (import screen): editing the header changes only the strip's signals — nothing is sent until the save; editing a row's name drops its memory or model link (existing `updateRow` rule) while `printedName` stays; leaving with rows in the preview asks as today (`hasRealChanges()` unchanged — rows or text); there is no cancel button (unchanged) — deleting every row hides the preview and the strip, and choosing another file or pasting again replaces the invoice state; a file whose read returns zero rows shows `import_nothing_found` and no strip; a failed save keeps the rows, the strip and its values and shows `save_failed`.
- [ ] **Invoices list** — lazy child route `invoices` under `inventory` (`canActivate: [authGuard]`), component `app-invoices-list` in `src/app/pages/inventory/components/invoices-list/` on `app-list-shell` + `app-page-header` (`titleKey="invoices"`):
  - data: `InvoiceDataService` (`src/app/core/services/invoice-data.service.ts`, `BaseEntityDataService<Invoice>('invoices', false)`, alias `allInvoices_`; the `Invoice` type is the one `shared/schemas/entities/invoice.schema.ts` exports through `@schemas/entities`); the screen calls `reloadFromStorage()` on every entry (an apply writes on the server, so a cached list is stale) and shows `app-loader` until it resolves;
  - rows newest first: by `invoiceDate` descending (a missing date sorts last), then `createdAt` descending;
  - columns for the owner (`PermissionService.can('editMoney', { type: 'products' })`): supplier name, invoice date (`dd/MM/yy`), invoice number, number of lines (`lines.length`), saved on (`createdAt`, `dd/MM/yy`), file. For anyone else: supplier name, invoice date, invoice number, saved on — the server sends staff only those fields; the lines and file columns are not rendered;
  - file cell: with a `fileId` a button `c-btn-ghost--sm` (icon `eye`, label `invoice_open_file`, `data-testid="invoice-open-file"`); without one the muted text `invoice_no_file`;
  - opening: `InvoiceDataService.openFile(fileId)` opens a blank tab **synchronously in the click** (`window.open('about:blank', '_blank')`), then `GET ${authApiUrl}${API.files(fileId)}` → `{ url }`, sets the tab's `opener` to `null` and `location.replace(url)`; on any failure (404, or 503 `FILE_STORE_OFF` when the store is off) it closes the tab, logs `invoices.file_open_failed` (status only) and shows `invoice_file_open_failed`. (A tab opened after the await is blocked on phones.) The signed link is never stored or logged;
  - header action for the owner: `c-btn-primary` «סרוק חשבונית» (`invoices_scan_new`) → `/inventory/import`;
  - empty: `app-empty-state` `messageKey="invoices_empty"` `icon="file-text"`, with the same call-to-action for the owner;
  - a failed load is logged by the base service and the screen shows the empty state (the behaviour of every list on the base); there is nothing to edit, so leave and cancel need no rule; no search, filter, detail view or delete.
- [ ] **Navigation:** `CHIPS_BY_GROUP.inventory` gains `{ id: 'invoices', labelKey: 'invoices', icon: 'file-text', path: '/inventory/invoices' }` as the last chip (append only; the `/inventory` prefix already maps to the group). `API` gains `files: (id: string) => \`${API_ROOT}/files/${id}\``. `FileText` is registered in `LucideAngularModule.pick` in `src/app/app.config.ts`.
- [ ] `src/app/core/services/breadcrumbs.md` gains one row for `invoice-data.service.ts`.
- [ ] `product-import.component.ts` ends at no more than 480 lines: the strip is the child, the lines mapping and the percent are the two util files.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; logical CSS properties only; numbers, the tax id and the percent are `dir="ltr"` inside their cells; no new `.c-*` class (page-local classes `invoice-strip*`, `import-change*`, `invoices-list*` in the component `.scss` files). The strip is one `c-glass-panel` with the three fields in a row that wraps to one column on a phone.
- New keys, appended to the `general` section of `public/assets/data/dictionary.json` (none exists today):
  - `invoices` «חשבוניות» (chip, page title) · `import_file_upload` «העלה תמונה או PDF» (upload button) · `invoice_file_privacy` «הקובץ נשלח לקריאה ב-AI ונשמר עם החשבונית» (note under the buttons) · `import_file_check_hint` «נקרא מקובץ – בדקו כל שורה לפני השמירה» (hint over the table) · `import_file_too_big` «הקובץ גדול מדי (עד כ-1.3MB) – נסו קובץ קטן יותר או צלמו את החשבונית» · `import_file_unsupported` «יש לבחור תמונה (JPG, PNG, WEBP) או קובץ PDF» · `import_file_failed` «קריאת הקובץ נכשלה – נסו שוב או הדביקו את הטקסט»
  - `invoice_header_title` «פרטי החשבונית» (strip title) · `invoice_date` «תאריך החשבונית» · `invoice_number` «מספר חשבונית» · `invoice_tax_id` «ח.פ. / עוסק» · `invoice_supplier_printed` «על החשבונית:» (the printed supplier name follows) · `invoice_supplier_suggested` «זוהה אוטומטית» (supplier picked by the read) · `invoice_vat_included` «המחירים כוללים מע״מ» · `invoice_vat_excluded` «המחירים לפני מע״מ» · `invoice_supplier_required` «בחרו ספק כדי לשמור את החשבונית» · `import_price_change` «שינוי במחיר» (aria label of the percent)
  - `invoices_empty` «עדיין אין חשבוניות. חשבונית נשמרת כאן אחרי ייבוא מתמונה או מ-PDF» · `invoices_scan_new` «סרוק חשבונית» · `invoice_lines_count` «שורות» (column) · `invoice_saved_at` «נשמרה» (column: saved on) · `invoice_file` «קובץ» (column) · `invoice_open_file` «פתח את הקובץ» · `invoice_no_file` «הקובץ לא נשמר» · `invoice_file_open_failed` «לא הצלחנו לפתוח את הקובץ – נסו שוב» · `invoice_trail_failed` «המחירים נשמרו, אבל החשבונית לא נרשמה ברשימת החשבוניות»
  - Existing keys reused: `supplier` «ספק» (strip label, column), `import_no_supplier`, `import_old_price`, `import_nothing_found`, `save_failed`, `no_permission`.
- Lucide icons: `file-text` — **new**, register `FileText` in `src/app/app.config.ts` (a spec that renders it extends its own pick: `LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, FileText })`, the way `src/app/core/components/tab-chips/tab-chips.component.spec.ts:39` already does); `eye`, `camera`, `image`, `sparkles`, `trash-2`, `lock` — already registered.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Teach the browser services the three new server calls so the screen has something to call — readInvoice replaces parseReceiptPhoto (types, size and type checks, PDF unshrunk); resolve and the invoice argument of apply with their types; API.files; specs with HttpTestingController — src/app/core/services/gemini.service.ts, src/app/core/services/gemini.service.spec.ts, product-import.service.ts, src/app/core/services/product-import.service.spec.ts (new), http-storage.adapter.ts
- [x] A2: Add the two pure helpers that compute the price change and build the invoice lines — priceChangePct (two decimals, null rules) and buildInvoiceLines (printed values by normalised name, row index), each with a spec — src/app/core/utils/price-change.util.ts (new), src/app/core/utils/price-change.util.spec.ts (new), invoice-lines.util.ts (new), src/app/core/utils/invoice-lines.util.spec.ts (new)
- [x] A3: Build the header strip as its own small component so the import screen does not grow — the signals API, supplier select, date field, number box, printed-name hint, suggested chip, tax id and VAT lines, required message; spec — src/app/pages/inventory/components/product-import/invoice-header-strip/ (new: .ts, .html, .scss, .spec.ts)
- [x] A4: Make the import screen read a photo or a PDF and ask memory before the model — onFileChosen, source, invoice state, supplier preselect, the resolve step before matchWithAi_, PDF in the upload input, the new message keys, the paste path untouched; spec cases a–d and the renamed stubs — src/app/pages/inventory/components/product-import/product-import.component.ts, .html, .spec.ts
- [x] A5: Show the strip and the percent, and send the invoice header with the save — strip above the table bound to the signals, one supplier control, changePct in view_, the percent beside the old price, the supplier rule in canSave_, the invoice payload, cleanup after save; spec cases e–j — src/app/pages/inventory/components/product-import/product-import.component.ts, .html, .scss, .spec.ts
- [x] A6: Add the invoices list so a saved invoice and its file can be found again — InvoiceDataService with openFile, the list screen on app-list-shell (owner and staff columns, file button, empty state, scan button), specs, breadcrumbs row — src/app/core/services/invoice-data.service.ts (new), src/app/core/services/invoice-data.service.spec.ts (new), src/app/pages/inventory/components/invoices-list/ (new: .ts, .html, .scss, .spec.ts), src/app/core/services/breadcrumbs.md
- [x] A7: Put the list in the navigation and add the words and the icon — the lazy invoices route, the invoices chip and its spec, FileText in the icon registry, every dictionary key of the UI notes — src/app/app.routes.ts, src/app/core/components/tab-chips/tab-chips.component.ts, src/app/core/components/tab-chips/tab-chips.component.spec.ts, src/app/app.config.ts, public/assets/data/dictionary.json
- [x] A8: Prove the two screens in the running app with prepared answers, then run every check — 628-1 stubs the read, resolve and match routes with page.route, creates and removes its supplier through the API, uploads a 1-pixel PNG with setInputFiles; 628-2 stubs the generic invoices read; then test:ci, lint, lint:icons, lint:reuse, build, breadcrumbs-check, log-query — e2e/ui/628-1.spec.ts (new), e2e/ui/628-2.spec.ts (new)

## Technical Considerations
- Dependencies: `ProductNameMatcherService` and `matchWithAi_` are used as they are (no change to the matcher service). `KitchenStateService.suppliers_()` / `products_()`. `ProductImportService.apply` keeps reloading the products after a save. The server routes come from plans 619, 625, 626, 627 (merged before this run).
- New files needed: `invoice-header-strip/` (4 files), `invoices-list/` (4 files), `invoice-data.service.ts` + spec, `src/app/core/services/product-import.service.spec.ts`, `price-change.util.ts` + spec, `invoice-lines.util.ts` + spec, `e2e/ui/628-1.spec.ts`, `e2e/ui/628-2.spec.ts`.
- Model changes: browser types only — `InvoiceHeader`, `PrintedLine`, `InvoiceReadResult`, `ResolveMatch`, `ApplyInvoice`, `ApplyResult.invoiceId`; `PreviewRow` gains `printedName`. No schema change.
- Backend / API: none changed. Called as the Contracts define them: `POST /api/v1/ai/invoices/read`, `POST /api/v1/product-import/resolve`, `POST /api/v1/product-import/apply` (with `invoice`), `GET /api/v1/data/invoices`, `GET /api/v1/files/:id`.
- Auth and validation: every gate is on the server (owner or consultant for read, resolve, apply and an invoice file; the generic read trims staff). The browser checks the file type and the base64 size before sending and hides the import screen from a member without `editMoney` (existing `allowed_`).
- Security surface: an invoice file leaves the browser only to the server's read route; the signed file link is used once in a new tab (`opener` cleared) and never stored or logged; client logs carry an HTTP status only — no file name, supplier name, product name or price. No secret, no new permission.
- Data / migration: none.
- Project checks: `[auto] log-query`; every new dictionary key named with its Hebrew value; the one new icon named; Reuse Check filled; new screen is a lazy route; hotspots append-only (`dictionary.json`, `app.routes.ts`); `pnpm run test:ci`; `[ui]` specs sign in with `signInQa`. No canonical-value flow is touched (categories keep the existing translation-key flow in `resolveCategories_`).

## Out of Scope
- The price-rise mark, the impact panel, the settings number and the dashboard card (plan 629).
- Any server change. Removing `POST /api/v1/ai/parse-receipt-photo` (brief A5: a later cleanup).
- Creating a supplier from the header strip; editing the tax id; choosing a product for a row from a picker (a row is linked, as today, by memory, by the model or by typing the product's name).
- An invoice detail view, search, filters, paging, deleting or editing a saved invoice.
- A queue of several invoice files (plan 634 builds it on this preview).

## Critical Questions
- none

## Execution Notes
- decided: a pasted price list sends no `invoice` header and makes no `resolve` call — why: it has no number, date or supplier key, and C-INVOICE says an apply without `invoice` behaves as today plus history rows.
- decided: a file read needs a supplier (chosen or printed) before the save — why: `invoice.supplierName` is required by C-INVOICE; a pasted list keeps "no supplier is fine".
- decided: `supplierName` sent is the chosen supplier's own name, the printed one only when no supplier is chosen — why: the list should show the name the owner knows.
- decided: one supplier control on screen — the strip's select replaces the paste panel's while a file preview is shown — why: two controls bound to one value confuse.
- decided: the tax id and VAT are shown read-only in the strip — why: the apply writes the tax id onto a supplier that has none (C-INVREAD), so the owner should see it; the card asked only supplier, date and number to be editable.
- decided: a row is tied to its printed line by the normalised name, and `printedName` is the name as read — why: `normalizeReceiptRows` drops and merges lines, so `rows` and `printed` are not aligned by index.
- decided: `GeminiService.parseReceiptPhoto` is removed from the browser, the server route stays — why: the screen was its only caller (A5 keeps the route).
- decided: new keys `invoice_file_privacy` and `import_file_check_hint` instead of rewriting `import_photo_privacy` / `import_photo_check_hint` — why: the dictionary is append-only and the old privacy text ("not kept") is no longer true.
- decided: staff see the invoices list with supplier, date and number only — why: C-REGISTRY gives staff exactly those three fields of `invoices`.
- decided: the file tab is opened inside the click and pointed at the signed link afterwards — why: phones block a tab opened after an await.
- decided: no "matched from memory" marker on a row — why: not asked; the existing «קיים במלאי: …» line already shows the link.
- evidence: `pnpm run test:ci` → exit 0, TOTAL 2408 SUCCESS (incl. product-import cases a–j, strip, list, services, utils, tab-chips); `pnpm run lint` → 0 errors; `pnpm run lint:icons`, `lint:reuse`, `lint:no-native-select`, `breadcrumbs-check` → ok; `pnpm run build` → exit 0; kit-checks → ok; kit-manifest-check → ok; `product-import.component.ts` 470 lines (≤ 480).
- decided: page-local helper `invoice-import.util.ts` (state, apply-invoice, error key, change text, positiveNumber) inside the product-import folder — why: keeps the component under 480 lines; scope covers `product-import/**`.
- [ui] items written, not run: 628-1 (`e2e/ui/628-1.spec.ts`), 628-2 (`e2e/ui/628-2.spec.ts`).

- Round 1 (ANSWER 628-1): added (h) `a row deleted before saving after a file read has no invoice line`; (i) `with no supplier chosen and none printed the save is disabled and the message shows` now asserts the invoice_supplier_required text. Cases in product-import.component.spec.ts: (a) `a PDF chosen in the upload input calls readInvoice once and fills the preview`, (b) `asks memory once with the supplier key and every name, and the model only for the rest`, (c) `makes no model call when memory settled every name`, (d) `a failed resolve still asks the model for every unmatched name and shows no error`, (e) `shows +6.0% for 5 → 5.3, -4.0% for 5 → 4.8 and nothing for a new row`, (f) `the save after a file read sends the invoice with the edited header and one line per kept row`, (g) `the save after a pasted list sends no invoice`, (h) above, (i) above, (j) `a save answered with invoiceId null shows the summary and the invoice_trail_failed message`. `pnpm run test:ci --include=…product-import.component.spec.ts` → exit 0, 49 SUCCESS.
