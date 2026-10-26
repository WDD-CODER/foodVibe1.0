# Plan 432 — Import products from a pasted supplier price list

Status: done
Track: code
Snapshot: 8ffda3d2c4d8f3ab5137bfee30e9d80026d28110

## Problem Statement
Spec 06.2. A new business has dozens of supplier prices in WhatsApp messages and Excel sheets. Today every price
goes in one product at a time through the product form, so the setup step "10 products with price" (plan 431) is
the slowest part of onboarding. This plan adds «ייבוא מוצרים» in inventory: paste the list, optionally pick the
supplier, the server's AI turns it into an editable preview (name · base unit · price · purchase unit · category),
each row marked «חדש» or «קיים – עדכן מחיר», and «שמור הכל» creates and updates everything **in one server
request** with a summary «X נוצרו, Y עודכנו, Z דולגו».

Rules that shape the design: one AI call per import, counted in the AI quota and only through
`server/routes/ai.js` (INV-6); ≤ 200 rows; owner only (money); match by normalized name; an update changes only
price and supplier, never name or unit.

User stories:
- As a chef who owns the business, I want to paste my vegetable supplier's WhatsApp price list and get all the
  products priced in one go so that I can cost menus on day one.
- As a chef, I want to check and fix every row before anything is saved so that a misread line never lands in my
  inventory.
- As a chef, I want a new price list from the same supplier to update the prices I already have so that I don't
  get duplicate products.

## Goals & Success Criteria
**Primary:** paste → one AI call → editable preview → one save request that creates new products and updates
prices of existing ones, owner only, ≤ 200 rows.

Done when:
- [x] [auto] `npx ng build` passes.
- [x] [auto] `npm --prefix server test -- test/price-list-import.test.js` passes (pure helper, no AI), covering:
  - `normalizePriceListRows({ rows: [...] })`: row without name dropped; name longer than 200 chars cut to 200;
    unit missing → `'unit'` + `needsReview: true`; unknown unit (`'ארגזון'`) → `'unit'` + `needsReview: true`;
    Hebrew unit words map to keys (`'ק"ג'`/`'קילו'` → `kg`, `'גרם'` → `gram`, `'ליטר'` → `liter`, `'מ"ל'` → `ml`,
    `'יח''`/`'יחידה'` → `unit`); price ≤ 0 / NaN → `null`; `pricePer: 'purchaseUnit'` with `purchaseQty: 10` and
    price 50 → `price: 5`; two rows «עגבנייה» → one row (the last), `duplicate: true`; 201 rows → 200 + `truncated: true`;
  - `normalizeProductName('  שמנת   32% ')` → `'שמנת 32%'` (trim, single spaces, lower-case Latin).
- [x] [auto] `npm --prefix server test -- test/product-import-route.test.js` passes, covering:
  - `POST /api/v1/ai/parse-price-list` without token → 401; staff token → 403 `no_permission` **before** any Gemini
    call (usage count unchanged); empty `rawText` → 400; `rawText` over 20 000 chars → 400 `TEXT_TOO_LONG`;
  - `POST /api/v1/product-import/apply` as owner with supplier «ירקן» and rows עגבנייה kg 5.9 / מלפפון kg 4.5 /
    «שמנת 32%» liter 12 → 200 `{ created: 3, updated: 0, skipped: 0 }`; the three products exist in the owner's
    business with `sources: [{ supplierId: <ירקן id>, price }]`, `createdBy` = owner, `yieldFactor: 1`;
  - again with עגבנייה 6.2 → `{ created: 0, updated: 1, skipped: 0 }`; the product's ירקן price is 6.2, its
    name and `baseUnit` unchanged, still one «עגבנייה» product;
  - again with עגבנייה 6.2 → `{ updated: 0, skipped: 1 }` (same price);
  - no supplier → price saved as the global price (`supplierId: ''`); a row with `price: null` creates the product
    with `sources: []`;
  - staff → 403; 201 rows → 400 `TOO_MANY_ROWS`; a `supplierId` from another business → 400 `UNKNOWN_SUPPLIER`;
    a product of another business with the same name is never updated (a new one is created in this business).
- [x] [auto] `npm --prefix server test` passes (whole server suite).
- [x] [auto] `npx ng test --watch=false --include='src/app/pages/inventory/components/product-import/**/*.spec.ts' --include='src/app/core/utils/product-name.util.spec.ts'`
  passes, covering: preview marks a row matching an existing product «קיים – עדכן מחיר», same price «ללא שינוי»,
  otherwise «חדש»; deleting a row adds 1 to «דולגו» in the summary; «שמור הכל» sends one apply request with the
  kept rows; on an AI 429 the pasted text stays in the box and `ai_daily_limit_reached_all` is shown;
  `normalizeProductName` gives the same results as the server cases.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] Desktop, owner: inventory → «+» menu → «ייבוא מוצרים» → paste
  `עגבנייה 5.9 לק"ג` / `מלפפון 4.5 לק"ג` / `שמנת 32% 1 ליטר 12` (three lines), supplier «ירקן» (create it first if
  missing) → «נתח» → 3 rows: עגבנייה · ק"ג · 5.9 ₪; מלפפון · ק"ג · 4.5 ₪; שמנת 32% · ליטר · 12 ₪, all «חדש».
  «שמור הכל» → «3 נוצרו, 0 עודכנו, 0 דולגו»; the three products are in the list with the price under ירקן.
- [human] Desktop, owner: import again `עגבנייה 6.2 לק"ג` with «ירקן» → row «קיים – עדכן מחיר» → «שמור הכל» →
  «0 נוצרו, 1 עודכנו, 0 דולגו»; עגבנייה now shows 6.2.
- [human] Desktop, owner: in a preview, delete one row with the trash icon and change another row's unit →
  «שמור הכל» → summary counts the deleted row under «דולגו»; the changed unit is saved on the new product.
- [human] Staff login: the inventory «+» menu has no «ייבוא מוצרים»; opening `/inventory/import` by hand shows
  «אין לך הרשאה לפעולה הזו» and no paste box.
- [human] Mobile (≤ 620 px), owner: paste box, supplier picker and the preview fit the screen; the preview table
  scrolls inside its own box (not the page); every row's unit and price are editable with the phone keyboard.

## Execution Mode
- Parallel: no against plans editing `server/routes/ai.js` / the AI paste flow (439 — paste recipe/ingredients),
  `inventory-product-list.component.ts` (420 — product-delete warning, 438 — lean product form, 444 — "לא סגור
  סופית" inventory filter) or the router mounts in `server/app.js` (442, 447); yes otherwise — check
  `node scripts/scope-check.mjs --overlap --plan=<this>` at take time.
- Concurrent plans: lane 2 / lane 3 plans other than 420, 438, 439, 442, 444 and 447.
- Isolated DB: no — creates and updates products in the slot's own business through the new route only.

## Execution Notes
- Depends on: plan 431 merged (lane order; setup card counts the imported products), plan 427 merged
  (`assertCan`, `editMoney`). Through them: 424–426, 428–430.
- Must not run at the same time as: 439 (`server/routes/ai.js` / AI paste flow), 420, 438, 444
  (`inventory-product-list.component.ts`), 442, 447 (`server/app.js` router mounts).
- Lane wt-1, after 431. Next in lane: 448.
- MVP run mode: executed unattended into branch `mvp` per `docs/mvp/run-mode.md` — Atlas steps are rehearsed on a scratch copy and deferred to the final gate; [human] items become validation cards in `docs/mvp/runs/<NNN>.md`.
- Contract extension (run): `POST /api/v1/ai/parse-price-list` and the dedicated router `server/routes/product-import.js`
  at `/api/v1/product-import` (`POST /apply`, owner via `editMoney`). Append both to `docs/mvp/mvp-map.md`
  `## Contract extensions (run)` (plan 432) and log them in `docs/mvp/runs/432.md` `## Decisions`.
- The `no_permission` dictionary key reused below is added by plan 428 (not on the snapshot).
- Plan 423 (`optionRateInBase`) must be merged before this plan saves purchase options — it is earlier in lane 2;
  Step 0 confirms.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/ai.js
server/routes/product-import.js
server/utils/price-list-import.js
server/app.js
server/test/price-list-import.test.js
server/test/product-import-route.test.js
src/app/core/services/gemini.service.ts
src/app/core/services/product-import.service.ts
src/app/core/utils/product-name.util.ts
src/app/core/utils/product-name.util.spec.ts
src/app/pages/inventory/components/product-import/**
src/app/pages/inventory/components/inventory-product-list/inventory-product-list.component.ts
src/app/app.config.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

INV-1/INV-2 wording comes from ADR `docs/brain/decisions/0023-business-is-the-tenant.md` (plan 424). Re-run
`node scripts/scope-check.mjs --arch --plan=<this>` at Step 0 and add a line for any newly reached invariant.

- INV-6: preserves — the price-list parse is a new route in `server/routes/ai.js` using `callGemini` (one call per
  import, counted by `incrementUsage` like every route, behind `aiLimiter`); the browser only calls our server.
- INV-4: preserves — every product the import creates or updates is checked with `checkStoredDoc('products', doc)`
  (the same Zod validation the generic routes use) before it is written; 200-char name cap applies.
- INV-3: preserves — the whole import is applied on the server in one request (no client loop of one write per
  product).
- INV-1: preserves — both routes are owner-only through `assertCan(req, res, 'editMoney', { type: 'products' })`
  and only read/write `scopeFilter(req)` products and suppliers.

## Step 0 — Reality Check

Runs always. Check by symbol, one line each, `ok` or `conflict: <what>`:
- `server/routes/ai.js`: `callGemini`, `responseText`, `extractJsonPayload`, `respondFromGeminiFailure`,
  `aiLimiter`, `requestedModel`, `appendKnownMetadata`; `/parse-text` unchanged by plan 439.
- `server/utils/permissions.js` `assertCan` + `editMoney`; `server/utils/business-scope.js` `scopeFilter`,
  `stampNew`; `server/middleware/validate.js` `checkStoredDoc`; `server/jobs/purge-deleted.js` `LIVE`;
  `server/utils/id.js` `newId`.
- Product schema fields (`shared/schemas/entities/product.schema.ts`): `sources[]{supplierId, price, addedBy?,
  addedAt?}`, `purchaseOptions[]{unitSymbol, conversionRate, priceOverride?, uom?}`, `businessId`, `createdBy`.
- Plan 423 merged: `purchaseOptions[].uom` is read by `optionRateInBase`.
- Plan 438 merged or not: whether `categories` / `yieldFactor` are still required on the product form (does not
  change this plan — the server builds full docs).
- `InventoryProductListComponent.ngOnInit` `heroFab.setPageActions` list; `GeminiService.parseText` pattern
  (`authBase_`, `modelParam_`, `incrementGeminiUsage`); `resolveDraftMetadata` / `registerDraftMetadata` in
  `src/app/pages/inventory/services/ai-draft-metadata.util.ts`.
All `ok` → continue. A `conflict` → STOP for a go.

## Contracts used (verbatim from the approved map)

**C-SCOPE (424/425)**
- Every business doc gets `businessId: string` and `createdBy: string` in `baseDocShape`. Master docs: `businessId: '__master__'`. Migration 0006 sets `createdBy = userId` and `businessId` = the user's business (master: `'__master__'`). Plan 425 stops using `userId` for scoping; the stored `userId` stays (optional in schema, never read for scope).
- `server/utils/business-scope.js` exports `MASTER_BUSINESS_ID = '__master__'`, `scopeFilter(req)` → `{ businessId: req.user.businessId }`, `readScope(req, type)` → taxonomy: `{ businessId: { $in: [bid, '__master__'] } }`, others `scopeFilter(req)`; anonymous → `{ businessId: '__master__' }`; `stampNew(req, doc)` → sets `businessId`, `createdBy = req.user.userId`, `createdAt`.
- Indexes re-led by `businessId` (taxonomy unique `{kind, key, businessId}`).

**C-PERM (427; client mirror 428)**
- `server/utils/permissions.js`: `can(user, action, { type, doc?, patch? }) → { ok: true } | { ok: false, reason }` and `assertCan(req, res, action, ctx)` → sends 403 `{ error: 'FORBIDDEN', messageKey: 'no_permission' }` (Hebrew "אין לך הרשאה לפעולה הזו").
- Actions: `create`, `edit`, `delete`, `editMoney`, `changeStage`, `addNote`, `markArrival`, `manageTeam`, `editSettings`, `editTaxonomy`.
- Rules: owner → all in own business. Staff → create all entity types; edit/delete only `doc.createdBy === user.userId`; `editMoney`, `manageTeam`, `editSettings`, `editTaxonomy` (eventType, menuType, station) never; `changeStage` only on events they created; `addNote`, `markArrival` on any event. A staff-created product is saved with money fields stripped.
- Money fields: `shared/schemas/money-fields.ts` exports `MONEY_FIELDS: Record<type, string[]>` — products: `sources[].price`, `purchaseOptions[].priceOverride`; menuEvents: `pricePerGuest`, `extraCosts`, `targetsOverride`, `deposit`, `closing.suppliers[].actualPaid`, `closing.actualExtraCosts`, `closing.actualRevenue`; businesses: `settings`, `baseline`. Later plans that add a money field append it here.
- Client: `src/app/core/services/permission.service.ts` `can(action, ctx): boolean` (computed from user signal); UI hides/locks by the same rules; server decides.
- Before 427 merges: every signed-in user counts as owner.

## Design

### 1. Pure helpers (`server/utils/price-list-import.js`)
- `MAX_IMPORT_ROWS = 200`, `MAX_IMPORT_TEXT = 20000`.
- `normalizeProductName(s)` → `String(s).trim().replace(/\s+/g, ' ').toLowerCase()` (same rule as
  `nameHebrewNormalized` written by the seed and as `duplicateNameValidator` on the client).
- `HEBREW_UNIT_MAP` (ק"ג, קג, קילו, קילוגרם → kg; גרם, ג' → gram; ליטר, ל' → liter; מ"ל → ml; יח', יחידה,
  יחידות → unit) + the canonical keys `gram | ml | kg | liter | unit` (the base units a product may have).
- `normalizePriceListRows(payload)` → `{ rows: ImportRow[], truncated: boolean }` where
  `ImportRow = { name, baseUnit, price: number | null, purchaseUnit: string | null, purchaseQty: number | null,
  category: string | null, needsReview: boolean, duplicate: boolean }` — rules exactly as the Done-when cases
  (dedupe by `normalizeProductName`, last wins; cap after dedupe).

### 2. AI route (`server/routes/ai.js`)
`POST /parse-price-list` — `verifyToken`, `assertCan(req, res, 'editMoney', { type: 'products' })` (before the
limiter, so staff never burn quota), `aiLimiter`. Body `{ rawText, knownCategories?: string[] }`; empty → 400
`rawText is required`; longer than `MAX_IMPORT_TEXT` → 400 `TEXT_TOO_LONG`. One `callGemini` with
`PRICE_LIST_SYSTEM_PROMPT` (new constant next to `TEXT_IMPORT_SYSTEM_PROMPT`):
- input is a supplier price list (WhatsApp text or columns pasted from Excel), Hebrew;
- output ONLY JSON `{ "rows": [ { "name": string, "unit": string|null, "price": number|null, "pricePer":
  "unit"|"purchaseUnit", "purchaseUnit": string|null, "purchaseQty": number|null, "category": string|null } ] }`;
- one row per product line, keep the product name as written (e.g. «שמנת 32%» — never treat the 32% as a price);
  `unit` = the unit the price refers to; «לק"ג» → kg; never invent rows or prices;
- `category`: one of `knownCategories` exactly as written, else null (passed through `appendKnownMetadata`).
`generationConfig: { temperature: 0.2, maxOutputTokens: 8192 }`, `timeoutMs: 45000`, `eventPrefix:
'ai.parse_price_list'`. Failures → `respondFromGeminiFailure` (429 `daily_limit_reached` reaches the client as
today). Parse with `extractJsonPayload`; invalid → 502 `Gemini returned invalid JSON`. Success → 200
`normalizePriceListRows(parsed.value)`. An empty result → 200 `{ rows: [], truncated: false }`.

### 3. Apply route (new `server/routes/product-import.js`, mounted in `server/app.js` at `/api/v1/product-import`)
Why a dedicated router: the import must be one request (INV-3, and the generic write limiter of 300 writes / 15 min
would be eaten by one 200-row import); `generic.js` is a hotspot owned by the scoping plans.
`POST /apply` — `verifyToken`, `assertCan(req, res, 'editMoney', { type: 'products' })`, an `importLimiter`
(10 per 15 min per `req.user.userId`). Body `{ supplierId: string | null, rows: ApplyRow[] }`, `ApplyRow = { name,
baseUnit, price: number | null, category: string | null, purchaseUnit: string | null, purchaseQty: number | null }`.
- > 200 rows → 400 `TOO_MANY_ROWS`. `supplierId` set but not a LIVE supplier in `scopeFilter(req)` → 400
  `UNKNOWN_SUPPLIER`.
- Load once: LIVE products in `scopeFilter(req)` (`_id`, `nameHebrew`, full doc) → map by `normalizeProductName`.
- Existing match: `key = supplierId ?? ''`; `price == null` or the source with that `supplierId` already has this
  price → skipped. Else set that source's `price` (or push `{ supplierId: key, price, addedBy: userId, addedAt: now
  }`), `updatedAt: now`, `_userModified: true` (so master sync never overwrites it); name, `baseUnit`, categories,
  purchase options untouched.
- New: `{ _id: newId(), schemaVersion: 2, nameHebrew: name, baseUnit, sources: price != null ? [{ supplierId: key,
  price, addedBy: userId, addedAt: now }] : [], purchaseOptions: (purchaseUnit is a key in the business's unit terms
  and purchaseQty > 0) ? [{ unitSymbol: purchaseUnit, conversionRate: purchaseQty, uom: baseUnit }] : [],
  categories: category ? [category] : [], yieldFactor: 1, allergens: [], minStockLevel: 0, expiryDaysDefault: 0,
  nameHebrewNormalized, _masterId: _id, _userModified: false, updatedAt: now }` then `stampNew(req, doc)`.
- Every doc → `checkStoredDoc('products', doc)`; a failing row is skipped with `{ name, reason: 'invalid' }`.
- Writes: `insertMany(newDocs, { ordered: false })` + `bulkWrite(updates)`. Response `{ created, updated, skipped,
  skippedRows: [{ name, reason: 'same_price' | 'no_price' | 'invalid' }] }`.
- Log `product_import.applied` with counts only (no names, no prices).

### 4. Client
- `src/app/core/utils/product-name.util.ts` — `normalizeProductName` (same rule as the server) + spec.
- `GeminiService.parsePriceList(rawText, knownCategories): Observable<{ rows: ImportRow[]; truncated: boolean }>`
  — `POST ${authBase_}/api/v1/ai/parse-price-list` with `modelParam_()`, `incrementGeminiUsage()` on success
  (same pattern as `parseText`).
- New `src/app/core/services/product-import.service.ts` — `apply(supplierId, rows)` → `POST
  ${environment.authApiUrl}/api/v1/product-import/apply`; on success `ProductDataService.reloadFromStorage()`.
- Route: inside the `inventory` children in `src/app/app.routes.ts` append `{ path: 'import', loadComponent: () =>
  import('./pages/inventory/components/product-import/product-import.component').then(m =>
  m.ProductImportComponent), canActivate: [authGuard] }` (before `edit/:id` is irrelevant — distinct path).
- `InventoryProductListComponent.ngOnInit`: add a third HeroFab action `{ labelKey: 'import_products', icon:
  'clipboard-paste', run: () => router.navigate(['/inventory/import']) }` only when
  `permission.can('editMoney', { type: 'products' })`.
- New `src/app/pages/inventory/components/product-import/product-import.component.*`
  (`ProductImportComponent`, lazy):
  - not allowed `editMoney` → `app-empty-state` with `no_permission`, nothing else;
  - step 1: textarea (`import_paste_hint`), supplier `custom-select` from `KitchenStateService.suppliers_()`
    with «ללא ספק», «נתח» → `parsePriceList`. Error 429 → `ai_daily_limit_reached_all`; other errors →
    `import_ai_failed`; the textarea keeps its text. `truncated` → warning `import_truncated`. Zero rows →
    `import_nothing_found`;
  - step 2 (preview): one row per `ImportRow` with editable name (new rows only), base unit (select of `gram, ml,
    kg, liter, unit` via `UnitRegistryService` labels), price (number, ₪), purchase unit + qty (text, new rows only),
    category (`custom-select` of `MetadataRegistryService.allCategories_()`, empty = «כללי» shown). Status chip:
    `import_status_new` / `import_status_update` / `import_status_same`, plus `import_flag_review` (needsReview) and
    `import_flag_duplicate`. Matching rows are found with `normalizeProductName` against
    `KitchenStateService.products_()`; for an existing product, name and unit are shown read-only (the update never
    changes them). Trash icon removes a row (counted as skipped);
  - «שמור הכל» → unknown category texts go through `resolveDraftMetadata({ categories: distinct }, metadataRegistry)`
    once and `registerDraftMetadata` before apply; then `ProductImportService.apply`; summary toast and on-page line
    `import_summary` built as «{created} נוצרו, {updated} עודכנו, {skipped} דולגו» (numbers inserted in the
    component; skipped = server skipped + rows deleted in the preview); «חזרה למלאי» → `/inventory/list`.

### 5. Dictionary (append, group `general`)
| key | Hebrew |
|---|---|
| `import_products` | ייבוא מוצרים |
| `import_paste_hint` | הדבק כאן רשימת מחירים מ-WhatsApp או עמודות מ-Excel – מוצר בכל שורה |
| `import_supplier_optional` | ספק (רשות) |
| `import_no_supplier` | ללא ספק |
| `import_parse` | נתח |
| `import_save_all` | שמור הכל |
| `import_status_new` | חדש |
| `import_status_update` | קיים – עדכן מחיר |
| `import_status_same` | ללא שינוי |
| `import_flag_review` | לבדיקה |
| `import_flag_duplicate` | כפול |
| `import_col_purchase_unit` | יחידת רכש |
| `import_created` | נוצרו |
| `import_updated` | עודכנו |
| `import_skipped` | דולגו |
| `import_truncated` | נלקחו רק 200 השורות הראשונות |
| `import_nothing_found` | לא זוהו מוצרים בטקסט |
| `import_ai_failed` | הניתוח נכשל – הטקסט נשמר, נסה שוב |
| `import_back_to_inventory` | חזרה למלאי |
Reused: `price`, `unit`, `category`, `name`, `supplier`, `delete`, `ai_daily_limit_reached_all`, `no_permission`.

### 6. Icons
Add `ClipboardPaste` to `src/app/app.config.ts` (import list + `pick`). `Trash2`, `Sparkles` already registered.

## Functional Requirements

### Must Have (P0)
- [ ] «ייבוא מוצרים» in inventory, owner only (UI hidden, server 403).
- [ ] One AI call per import through `server/routes/ai.js`, counted in quota; failure keeps the text.
- [ ] Editable preview: name · base unit · price · purchase unit · category; «חדש» / «קיים – עדכן מחיר».
- [ ] ≤ 200 rows; no-name rows dropped; no-unit rows → «יחידה» flagged; duplicates → last wins, «כפול».
- [ ] One apply request: create new, update price/supplier only on existing, skip same price; summary X / Y / Z.
- [ ] Supplier chosen → price under that supplier; none → global price; missing price → product saved without price.

### Should Have (P1)
- [ ] Purchase unit saved on new products when it is a known unit with a quantity.

## UI/UX Notes
- Preview table uses the existing list look (`.c-*` list engines in `src/styles.scss`); on mobile the table scrolls
  inside its own container with `overflow-x: auto`, sticky name column.
- RTL; numbers `dir="ltr"` inside inputs; logical properties only; run `cssLayer` before `.scss`.
- Hebrew canonical values: categories go through the canonical resolution flow (`resolveDraftMetadata` → the
  translation-key modal for unknown values), per `docs/agent/standards-domain.md`.

## Atomic Sub-tasks
- [x] I1: Clean the AI's rows into a safe preview list — normalizeProductName, Hebrew unit map, dedupe, 200 cap, per-unit price — server/utils/price-list-import.js
- [x] I2: Let the owner turn pasted price-list text into rows with one AI call — POST /parse-price-list, PRICE_LIST_SYSTEM_PROMPT, assertCan before aiLimiter — server/routes/ai.js
- [x] I3: Save a whole import in one server request: create new products, update only prices — product-import.js /apply with match, skip, stampNew, checkStoredDoc, insertMany/bulkWrite; mount in app.js — server/routes/product-import.js, server/app.js
- [x] I4: Prove the cleaning rules and the apply route with server tests — every Done-when case — server/test/price-list-import.test.js, server/test/product-import-route.test.js
- [x] I5: Give the browser the same name-matching rule and the two calls — normalizeProductName + spec, GeminiService.parsePriceList, ProductImportService.apply — src/app/core/utils/product-name.util.ts, src/app/core/services/gemini.service.ts, src/app/core/services/product-import.service.ts
- [x] I6: Build the paste, preview and save screen — ProductImportComponent (paste, supplier, preview, statuses, row delete, category resolution, summary), spec — src/app/pages/inventory/components/product-import/**
- [x] I7: Open the import screen from inventory for the owner only — lazy inventory/import route, HeroFab action gated by editMoney — src/app/app.routes.ts, inventory-product-list.component.ts
- [x] I8: Add the Hebrew texts and the paste icon — 19 dictionary keys, ClipboardPaste — public/assets/data/dictionary.json, src/app/app.config.ts
- [x] I9: Build, test and hand over the import checks — ng build, server suite, listed specs, log-query; Human runs the [human] items on desktop and mobile — this plan file

## Technical Considerations
- Dependencies: `callGemini` chain and usage counting (`server/services/gemini-client.js`), `assertCan`,
  `scopeFilter` / `stampNew`, `checkStoredDoc`, `KitchenStateService.products_/suppliers_`,
  `MetadataRegistryService`, `ai-draft-metadata.util.ts`, `ProductDataService.reloadFromStorage`.
- New files: listed in scope.
- Model changes: client `ImportRow` / `ApplyRow` interfaces in `product-import.service.ts`; no schema change.
- Backend / API: `POST /api/v1/ai/parse-price-list`, `POST /api/v1/product-import/apply`.
- Auth and validation: owner only (`editMoney`) on both; text ≤ 20 000 chars; ≤ 200 rows; every doc
  Zod-validated; supplier must belong to the business.
- Security surface: pasted text goes to Gemini through the server only (as the other AI routes); no prices or
  names in logs; new route rate-limited.
- Data / migration: none; new and updated `products` docs only.
- Project checks: log-query Done-when; chef stories; 19 dictionary keys; Hebrew canonical categories flow; RTL
  logical CSS; `ClipboardPaste` registered; new screen is a lazy route.

## Backend Impact
- Collections affected: `products` (create + update `sources`), reads `suppliers`, `taxonomyTerms` (unit keys).
- New collections: no.
- Server changes needed: yes — one AI route in `server/routes/ai.js`, a dedicated `server/routes/product-import.js`
  router (one-request bulk apply, justified above), pure helper `server/utils/price-list-import.js`, mount in
  `server/app.js`.

## Out of Scope
- Bulk recipe import, Excel file upload, automatic price-list sync.
- Changing an existing product's name, unit, categories or purchase options from an import.
- Allergens, waste factor, stock levels from the list (defaults only).
- "לא סגור סופית" label/filter for unpriced products (plan 444).

## Critical Questions
None — spec 06.2 and the brief's Part 4 (import in MVP) fix the behaviour.
