# Plan 629 — Price-rise alert: the business's own threshold, what a rise does to recipes and dishes, and a dashboard card of recent rises

Status: draft
Depends-on: 628
Snapshot: e916e48e3943a650ba9767ebb4023d20e823ae8d

## Problem Statement
After plan 628 the import screen shows by how many percent each price moved. That is a number on a row; it does not
say "this one matters", it does not say what the rise does to the menu, and it is gone once the owner leaves the
screen. This plan finishes brief MP-08: the business sets one number (`priceRiseAlertPct`, default 5, assumption A3);
a row that rose by that much or more is marked in the preview; after the save one panel lists the recipes and dishes
that use the products that rose, with their cost before and after; and the dashboard shows the prices that rose in the
last 60 days, read from the price history plan 625 writes.

Verified on `origin/main` (e916e48e, 2026-11-17):
- `server/routes/product-import.js` (134 lines) has one route, `POST /apply` (line 37), gated by
  `assertCan(req, res, 'editMoney', { type: 'products' })` and scoped with `scopeFilter(req)` from
  `server/utils/business-scope.js` (returns `{ businessId: req.user.businessId }`). It has no `GET` route. Plans 625,
  626 and 627 (merged before this run) add to this file; none adds `price-rises` (the map gives it to this plan).
- `server/routes/business.js:16` imports `BUSINESS_SETTINGS_DEFAULTS` from `../generated/schemas/entities` and line 40
  fills the defaults on read; `getBusiness(id)` is exported by `server/services/business.js` (line 50).
  `shared/schemas/entities/business.schema.ts:7` has three defaults today (`profitTargetPct`, `safetyMarginPct`,
  `overrunThresholdPct`); plan 615 adds `priceRiseAlertPct: 5` to the defaults and the optional field (`> 0`, `≤ 100`)
  to `businessSettingsSchema`.
- Server tests run against an in-memory app: `server/test/product-import-route.test.js` shows the pattern
  (`buildTestApp`, `signTestToken`, `testDb` from `server/test/helpers/app.js`; `OWNER` / `STAFF` / `OTHER_OWNER`
  tokens; collections emptied in `beforeEach`). No model, file store or clock is involved in this plan's route.
- `src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.ts` (162 lines): the form
  has three number controls and a `fields: FieldDef[]` list of three entries (lines 51–88) that the template loops
  over; `save()` sends `this.form.getRawValue()` — the whole settings object — through
  `BusinessService.updateSettings` (`PUT /api/v1/business/settings`). `canSave`, `hasRealChanges` and `saveAll` all
  iterate `fields`, so a fourth entry is picked up by all three. Its spec (125 lines, 8 cases) asserts "sends all
  three numbers" (line 86). The error key `pct_range_overrun` = «חייב להיות בין 0.1 ל-100» already exists.
- `RecipeCostService.computeRecipeCost(recipe)` (`src/app/core/services/recipe-cost.service.ts:53`, 389 lines) is the
  one cost engine. It reads **live** state: `computeIngredientCost` (line 347) takes the product from
  `KitchenStateService.productsById_()` and its price from `getEffectivePrice(product, ing.supplierId)`
  (`src/app/core/utils/product-source.util.ts:8`); a `type: 'recipe'` ingredient recurses through
  `recipesById_()` (depth ≤ 5). It has no "cost at an earlier price" input — so "before" can only be computed while
  the old prices are still in memory.
- `ProductImportService.apply` (`src/app/core/services/product-import.service.ts`) awaits
  `ProductDataService.reloadFromStorage()` before it returns, so when `apply` resolves `KitchenStateService.products_()`
  already holds the new prices. `KitchenStateService.recipes_()` (line 39) is recipes ∪ dishes; a recipe has
  `nameHebrew`, `ingredients`, `recipeType?: 'dish' | 'preparation'` (`src/app/core/models/recipe.model.ts`).
- Dashboard cards live in `src/app/pages/dashboard/components/` (7 folders). The pattern to follow is
  `frontdesk-week-card/` (88-line component: owner-only, loads once in an `effect`, hidden when it has nothing to say,
  a failed load is a `logging.warn` and no card). Cards are mounted in
  `dashboard-overview/dashboard-overview.component.html` (line 11 `<app-frontdesk-week-card />`) and imported in
  `dashboard-overview.component.ts`; its spec (391 lines) builds the real children with `provideHttpClientTesting()`.
- Icons `trending-up` and `alert-triangle` are registered in `src/app/app.config.ts`; `TEST_LUCIDE_ICONS`
  (`src/testing/test-lucide-icons.ts`) has no `TrendingUp`, so a spec that renders it extends its own pick.
- From plan 628 (not on `e916e48e`): `priceChangePct` in `src/app/core/utils/price-change.util.ts`, `changePct` on
  every row of `view_` in `product-import.component.ts`, the `import-flags` cell of the preview table, the
  `/inventory/invoices` list.

## Goals & Success Criteria
**Primary:** a price that rose by the business's threshold or more is impossible to miss — at the moment of the scan,
in what it does to the dishes, and on the dashboard for 60 days.

- [auto] `pnpm run test:server` passes, including the new `server/test/product-import-price-rises.test.js`: with no `priceRiseAlertPct` stored a history row of 6% is returned and a row of 4% is not; exactly 5% is returned; with `settings.priceRiseAlertPct: 10` the 6% row is not returned; a row older than `days` is left out; two qualifying rises of one product and supplier return only the later one; a later qualifying rise at another supplier is its own row; another business's rows are never returned; a staff token gets 403 `FORBIDDEN`; no token gets 401; `days=0`, `days=366` and `days=abc` get 400 `BAD_DAYS`; every returned row has exactly the keys `productId`, `supplierId`, `from`, `to`, `changePct`, `at`.
- [auto] The existing apply tests pass with no edit to their file (`pnpm run test:server`, same run).
- [auto] `pnpm run test:ci` passes, including: `src/app/core/utils/price-change.util.spec.ts` (`isPriceRiseAlert(6, 5)` true, `(4, 5)` false, `(5, 5)` true, `(null, 5)` false; `recipesUsingProducts` finds a direct use, a use through a prep two levels down, and stops on a cycle); `src/app/pages/inventory/components/product-import/product-import.component.spec.ts` (a row 5 → 5.3 shows the mark at the default 5 and a row 5 → 5.2 does not; with a stored threshold of 10 the 6% row has no mark; the panel after a save lists the recipe that uses the product with the cost before and after, and is absent when no price rose); `src/app/pages/inventory/components/product-import/price-impact-panel/price-impact-panel.component.spec.ts`; `src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.spec.ts` (the fourth field shows the stored number, 0 is refused with `pct_range_overrun`, a save sends all four numbers); `src/app/pages/dashboard/components/price-rises-card/price-rises-card.component.spec.ts` (renders name, old and new price and percent; hidden with no rows; hidden and not loaded for a member without `editMoney`; a row of an unknown product is skipped; a failed load shows no card); `src/app/core/services/product-import.service.spec.ts` (`getPriceRises` sends `days=60`).
- [auto] `pnpm run lint` exits 0, `pnpm --dir server run lint` exits 0, `pnpm run lint:icons` exits 0, `pnpm run lint:reuse` exits 0.
- [auto] `pnpm run build` passes.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/inventory/import`, after pasting a list (the parse route answered by a prepared fixture: the spec's own product «מוצר בדיקה 629» at 12, stored at 10 from the spec's own supplier, used by the spec's own recipe «מתכון בדיקה 629»), choosing that supplier and pressing «שמור הכל», the panel «מה זה עושה למנות ולמתכונים» shows the text «מתכון בדיקה 629» (`e2e/ui/629-1.spec.ts`).
- [ui] On `/dashboard` (the `price-rises` route answered by a prepared fixture with one row for the spec's own product «מוצר בדיקה 629») the card «מחירים שעלו ב-60 הימים האחרונים» shows the text «מוצר בדיקה 629» (`e2e/ui/629-2.spec.ts`).
- [ui] On `/settings?tab=business` the form shows a field labelled «התראת עליית מחיר (%)» (`e2e/ui/629-3.spec.ts`).
- [human] Dandan saves a real invoice with a price that rose: the mark, the panel and (after a reload) the dashboard card read clearly on his phone, and the numbers in the panel match the recipe's cost in the recipe book.

## Execution Mode
- Parallel: no — 628 edits the same folder `src/app/pages/inventory/components/product-import/**` and must be merged first (same run, earlier); `server/routes/product-import.js` is also written by 625, 626, 627 (merged before this run); and no other screen run may be live, because 620, 623, 624, 628, 630, 632, 634, 636, 637 all append to `public/assets/data/dictionary.json`.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/product-import.js
server/test/product-import-price-rises.test.js
src/app/core/utils/price-change.util.ts
src/app/core/utils/price-change.util.spec.ts
src/app/core/services/product-import.service.ts
src/app/core/services/product-import.service.spec.ts
src/app/pages/inventory/components/product-import/**
src/app/pages/inventory/components/product-import/product-import.component.spec.ts
src/app/pages/inventory/components/product-import/price-impact-panel/price-impact-panel.component.spec.ts
src/app/pages/settings/components/business-settings-tab/**
src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.spec.ts
src/app/pages/dashboard/components/price-rises-card/**
src/app/pages/dashboard/components/price-rises-card/price-rises-card.component.spec.ts
src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html
src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.ts
src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.spec.ts
public/assets/data/dictionary.json
e2e/ui/629-1.spec.ts
e2e/ui/629-2.spec.ts
e2e/ui/629-3.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-none: preserves — the scope reaches no file in an invariant's `Touches` list; the one new route reads `priceHistory` through `scopeFilter(req)` behind `assertCan(…, 'editMoney', …)` like `apply` beside it, and the cost before and after is computed in the browser by the existing engine (no server write, no client loop of writes).

## Reuse Check

- `GET /price-rises` handler — family: server-auth — rung: 1 — why: `verifyToken`, `assertCan` and `scopeFilter` as the `apply` route beside it uses them; no new guard, no new limiter.
- `isPriceRiseAlert`, `recipesUsingProducts` in `src/app/core/utils/price-change.util.ts` — family: helpers — rung: 2 — why: two more pure functions in the util file plan 628 created, with spec cases.
- `ProductImportService.getPriceRises` — family: http — rung: 3 — why: one more method on the existing service through the `API.productImport` path.
- Price-rise mark on a preview row — family: chip — rung: 1 — why: the static `c-chip amber` the row's other flags already use, with the `trending-up` icon.
- Threshold number field in settings — family: form-field — rung: 2 — why: a fourth entry in the form's existing `fields` list; the template loop, `appNumberBox` and the error line are unchanged.
- `app-price-impact-panel` — family: none — rung: 4 — why: a page-local read-only table of recipes with two costs; no shared piece lists "before and after" values, and it is used on one screen only (a `c-glass-panel` with page-local rows, no new `.c-*` class).
- `app-price-rises-card` — family: none — rung: 4 — why: a dashboard card; dashboard cards are page-local components by design (`frontdesk-week-card`, `setup-checklist-card`) and none shows a list of prices. It copies the structure of `frontdesk-week-card` and uses `c-glass-panel`.
- Cost before and after — family: event-plan — rung: 1 — why: `RecipeCostService.computeRecipeCost` as is, called twice; no second cost rule.
- Money and percent text — family: helpers — rung: 1 — why: `formatMoney`, `formatPct1` from `src/app/core/engine/rounding.ts`.
- Card and panel waits and failures — family: feedback — rung: 1 — why: `LoggingService` only; a failed card load shows no card (the dashboard pattern).

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a chef-owner, I want to decide what counts as a price rise worth telling me about so that small movements do not shout.
- As a chef-owner, I want a risen price marked while I check the invoice so that I can call the supplier before I approve it.
- As a chef-owner, I want to see, right after I save, which dishes and recipes just became more expensive and by how much so that I know which menu prices to look at.
- As a chef-owner, I want the dashboard to remind me of the prices that rose in the last two months so that I do not depend on remembering one invoice.
- As a consultant acting in a client's business (after plan 631), I want the same marks, panel and card the owner sees.

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
- [ ] **`GET /api/v1/product-import/price-rises`** in `server/routes/product-import.js`: `verifyToken`, then the same owner gate as `apply` (`assertCan(req, res, 'editMoney', { type: 'products' })`); no rate limiter (a read the dashboard makes once per visit).
  - `days`: absent → 60; otherwise it must be an integer from 1 to 365, else 400 `{ error: 'BAD_DAYS' }`.
  - threshold = `{ ...BUSINESS_SETTINGS_DEFAULTS, ...(business.settings ?? {}) }.priceRiseAlertPct`, the business read with `getBusiness(req.user.businessId)` (the same fill `GET /api/v1/business` does); a missing business answers 404 `{ error: 'Business not found' }`.
  - rows = `priceHistory` documents matching `{ ...scopeFilter(req), at: { $gte: Date.now() - days × 86,400,000 }, changePct: { $gte: threshold } }`, sorted by `at` descending, at most 2,000 read (the `{ businessId, at }` index of plan 615 serves it). Walking them newest first, the first row of each `productId` + `supplierId` pair is kept — that is "the latest rise per product and supplier at or above the threshold". At most 200 pairs are answered, newest first.
  - answer: a JSON array of `{ productId, supplierId, from: prevPrice, to: price, changePct, at }` — these six keys and nothing else (no name, no invoice id). The code reads `changePct` as stored; it computes nothing new.
  - log: on failure `req.log.error({ err, event: 'product_import.price_rises.failed' })` and 500 `{ error: 'Server error' }`; no success log line, and never a product name or a price in a log.
- [ ] **Settings number:** `business-settings-tab.component.ts` gains the control `priceRiseAlertPct` (`BUSINESS_SETTINGS_DEFAULTS.priceRiseAlertPct`, `Validators.required`, `min(0.1)`, `max(100)`) and a fourth `fields` entry `{ key: 'priceRiseAlertPct', labelKey: 'price_rise_alert_pct', helpKey: 'price_rise_alert_help', errorKey: 'pct_range_overrun' }`. Nothing else in the component or template changes: the loop renders it, `canSave` / `hasRealChanges` / `saveAll` already iterate `fields`, and the save sends the whole object with the fourth number. On edit: save enables when the number differs from the stored one; on leave with an unsaved number the settings page asks as it does for the other three; an invalid number shows the field error and disables save; a server refusal shows `settings_invalid` (all existing behaviour). Its spec's "sends all three numbers" case becomes four.
- [ ] **Two pure functions** added to `src/app/core/utils/price-change.util.ts`:
  - `isPriceRiseAlert(changePct: number | null, thresholdPct: number): boolean` → `changePct !== null && changePct >= thresholdPct` (at or above, the Contract's rule).
  - `recipesUsingProducts(recipes: readonly Recipe[], productIds: ReadonlySet<string>): Recipe[]` → the recipes and dishes that use one of the products directly (`ingredient.type === 'product'` and `referenceId` in the set) or through a prep (`type === 'recipe'`, looked up by `_id` among `recipes`), to a depth of 5 (the engine's own limit), each recipe visited once per walk so a cycle ends. Order of `recipes` kept.
- [ ] **The mark in the preview:** `view_` in `product-import.component.ts` gives each row `isRiseAlert = isPriceRiseAlert(changePct, threshold)` where `threshold` = `BusinessService.business_()?.settings?.priceRiseAlertPct ?? BUSINESS_SETTINGS_DEFAULTS.priceRiseAlertPct`. A row with `isRiseAlert` shows, in the `import-flags` cell after the status chip, `<span class="c-chip amber" data-testid="import-flag-rise">` with the icon `trending-up` (size 12) and the text `import_flag_price_rise`. The mark follows every edit of the price and every change of supplier (it is computed). It never blocks the save and opens no dialog.
- [ ] **The impact panel — exactly how "before" and "after" are computed** (`saveAll()` in `product-import.component.ts`):
  1. Before the apply request is sent, from the current `view_()`: `risen` = the set of `match._id` of rows with `status === 'update'` and `changePct !== null && changePct > 0` (every price that goes up in this save, marked or not).
  2. When `risen` is not empty: `affected = recipesUsingProducts(kitchenState.recipes_(), risen)` and `before = new Map(affected.map(r => [r._id, recipeCost.computeRecipeCost(r)]))`. At this moment `KitchenStateService` still holds the old prices, so this is the cost the recipe had until now, by the same engine every other screen uses.
  3. `await importService.apply(…)` — it resolves after the products were reloaded from the server.
  4. `after` = `recipeCost.computeRecipeCost(r)` for the same `affected` recipes, now over the new prices. A row is kept when `roundMoney(after) !== roundMoney(before)` (a recipe that buys the product from another supplier, or a product whose row the server skipped, does not change and is not listed). Row = `{ id, name: r.nameHebrew, isDish: r.recipeType === 'dish', before, after, changePct: priceChangePct(before, after) }`, sorted by `after − before` descending.
  5. `impact_` (a signal, `null` when `risen` was empty) is set with the rows; a failed apply sets nothing. It is cleared where `summary_` is cleared (the next read or parse).
  No cost is sent to or read from the server, and no model is involved.
- [ ] **`app-price-impact-panel`** — child component in `src/app/pages/inventory/components/product-import/price-impact-panel/` (`.ts`, `.html`, `.scss`, `.spec.ts`), input `rows = input.required<PriceImpactRow[]>()`, rendered right under the save summary (`import-summary`) while `impact_()` is not `null`. A `c-glass-panel` (`data-testid="price-impact"`) with the title `price_impact_title`; with rows: a list, one row each — the name, a static tag (`dish` «מנה» or `preparation` «הכנה», existing keys), «לפני ₪x» and «אחרי ₪y» (`price_impact_before`, `price_impact_after`, `formatMoney`, `dir="ltr"` on the numbers, class `c-num`) and the percent (`+3.2%`, `formatPct1`); the first 30 rows are shown and, when there are more, one closing line `price_impact_more` with the count of the rest; with no rows: the one line `price_impact_none`. Read-only: no edit, no link, no dismiss button. It disappears with the summary on the next read or when the owner leaves the screen (it is not stored).
- [ ] **`ProductImportService.getPriceRises(days = 60): Promise<PriceRise[]>`** — `GET ${authApiUrl}${API.productImport('price-rises')}` with the query `days`; `PriceRise = { productId: string; supplierId: string; from: number; to: number; changePct: number; at: number }`.
- [ ] **Dashboard card `app-price-rises-card`** in `src/app/pages/dashboard/components/price-rises-card/` (`.ts`, `.html`, `.scss`, `.spec.ts`), built like `frontdesk-week-card`, mounted in `dashboard-overview.component.html` directly after `<app-frontdesk-week-card />` and added to the `imports` of `dashboard-overview.component.ts`:
  - only for a member with `PermissionService.can('editMoney', { type: 'products' })` — otherwise it makes no request and renders nothing;
  - loads once (`getPriceRises(60)`) in an `effect` after the business is loaded, guarded by an `isRequested_` signal; a failed load is `logging.warn('Price rises could not be loaded', { status })` and no card;
  - visible only when at least one row names a product that is in `KitchenStateService.productsById_()` (a row of a deleted product is skipped); with nothing to show there is no card and no empty state;
  - content: the header (icon `trending-up`, title `price_rises_card_title`, link «לכל החשבוניות» `price_rises_card_all` → `/inventory/invoices`) and a list of at most 5 rows, newest first: product name (`nameHebrew`), supplier name (from `KitchenStateService.suppliers_()`; `supplierId` `''` or unknown → `import_no_supplier`), `₪from ← ₪to` written as two `dir="ltr"` numbers with `formatMoney`, the percent `+6.0%` (`formatPct1`), and the date (`dd/MM/yy`); when more than 5 rows exist a closing line `price_impact_more` with the count of the rest;
  - `data-testid="price-rises-card"`, rows `data-testid="price-rise-row"`. Read-only: nothing to edit, leave or cancel.
- [ ] Specs: `dashboard-overview.component.spec.ts` keeps passing with the new child — its `PermissionService` stub today is `{ isOwner_ }` only (line 103), so the card's `can(...)` call would throw: add `can: () => false` to that stub (the card then makes no request and renders nothing); a spec that renders `trending-up` extends its pick with `LucideAngularModule.pick({ ...TEST_LUCIDE_ICONS, TrendingUp })`.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; logical CSS properties only; prices and percents `dir="ltr"` with `c-num`; no new `.c-*` class — page-local classes `price-impact*` and `price-rises*` in the two new `.scss` files; the card uses the `frontdesk-week-card` head layout (icon, title, link). On a phone the panel rows wrap to two lines (name and tag; numbers).
- New keys, appended to the `general` section of `public/assets/data/dictionary.json` (none exists today):
  - `price_rise_alert_pct` «התראת עליית מחיר (%)» (settings label) · `price_rise_alert_help` «מחיר שעלה באחוז הזה או יותר יסומן בייבוא חשבונית ויופיע בלוח הבקרה» (settings help)
  - `import_flag_price_rise` «עליית מחיר» (the mark on a preview row)
  - `price_impact_title` «מה זה עושה למנות ולמתכונים» (panel title) · `price_impact_none` «אף מנה או מתכון לא התייקרו מהמחירים שעלו» (panel with no rows) · `price_impact_before` «לפני» · `price_impact_after` «אחרי» · `price_impact_more` «ועוד {count}» ("and {count} more")
  - `price_rises_card_title` «מחירים שעלו ב-60 הימים האחרונים» (card title) · `price_rises_card_all` «לכל החשבוניות» (card link)
  - Existing keys reused: `pct_range_overrun`, `dish`, `preparation`, `import_no_supplier`, `settings_saved`, `settings_invalid`.
- Lucide icons: `trending-up` — already registered in `src/app/app.config.ts` (`TrendingUp`). No new icon; `src/app/app.config.ts` is not edited.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Let the owner's browser ask the server which prices rose lately, by the business's own threshold — GET /price-rises (days check, threshold from the filled settings, latest qualifying rise per product and supplier, six keys, 200 cap) and its test file with the fixtures of the first Done-when item — server/routes/product-import.js, server/test/product-import-price-rises.test.js (new)
- [ ] A2: Add the threshold to the business settings form so each business sets its own number — the fourth control and fields entry, the two dictionary keys, the spec's stored-number, range and four-numbers cases — src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.ts, src/app/pages/settings/components/business-settings-tab/business-settings-tab.component.spec.ts, public/assets/data/dictionary.json
- [ ] A3: Add the rule for what counts as a rise and the walk that finds who uses a product — isPriceRiseAlert and recipesUsingProducts with spec cases (6 and 4 against 5, exactly 5, null, direct use, use through preps, a cycle) — src/app/core/utils/price-change.util.ts, src/app/core/utils/price-change.util.spec.ts
- [ ] A4: Mark a risen price in the invoice preview while the owner can still question it — isRiseAlert in view_ from the business threshold, the amber chip with the icon in the flags cell, the dictionary key, spec cases at 5 and at a stored 10 — src/app/pages/inventory/components/product-import/product-import.component.ts, src/app/pages/inventory/components/product-import/product-import.component.html, src/app/pages/inventory/components/product-import/product-import.component.spec.ts, public/assets/data/dictionary.json
- [ ] A5: Show after the save which recipes and dishes became more expensive and by how much — the before map taken before the apply, the after costs once it resolves, the impact_ signal, the panel child with its 30-row cap and its empty line, dictionary keys, specs — src/app/pages/inventory/components/product-import/product-import.component.ts, src/app/pages/inventory/components/product-import/product-import.component.html, src/app/pages/inventory/components/product-import/product-import.component.spec.ts, src/app/pages/inventory/components/product-import/price-impact-panel/ (new: .ts, .html, .scss), src/app/pages/inventory/components/product-import/price-impact-panel/price-impact-panel.component.spec.ts (new), public/assets/data/dictionary.json
- [ ] A6: Put the recent rises on the dashboard so they are seen without opening an invoice — getPriceRises on the service with a spec case, the card (permission, one load, five rows, link, hidden when empty), mounted after the front desk week card, the overview spec kept green, dictionary keys — src/app/core/services/product-import.service.ts, src/app/core/services/product-import.service.spec.ts, src/app/pages/dashboard/components/price-rises-card/ (new: .ts, .html, .scss), src/app/pages/dashboard/components/price-rises-card/price-rises-card.component.spec.ts (new), src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.html, src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.ts, src/app/pages/dashboard/components/dashboard-overview/dashboard-overview.component.spec.ts, public/assets/data/dictionary.json
- [ ] A7: Prove the panel, the card and the settings field in the running app, then run every check — 629-1 creates its supplier, product and recipe through the API, answers the parse route with page.route, saves for real and removes what it created; 629-2 answers the price-rises route with page.route; 629-3 reads the label; then test:server, test:ci, both lints, lint:icons, lint:reuse, build, log-query — e2e/ui/629-1.spec.ts (new), e2e/ui/629-2.spec.ts (new), e2e/ui/629-3.spec.ts (new)

## Technical Considerations
- Dependencies: `RecipeCostService`, `KitchenStateService` (`recipes_`, `productsById_`, `suppliers_`), `BusinessService.business_()`, `PermissionService`, `ProductImportService`; plan 628's `priceChangePct` and `view_().changePct`; plan 615's `priceRiseAlertPct` in the schema and defaults; plan 625's `priceHistory` rows.
- New files needed: `server/test/product-import-price-rises.test.js`, `price-impact-panel/` (4 files), `price-rises-card/` (4 files), `e2e/ui/629-1.spec.ts`, `e2e/ui/629-2.spec.ts`, `e2e/ui/629-3.spec.ts`.
- Model changes: browser types `PriceRise`, `PriceImpactRow`; the `view_` row gains `isRiseAlert`. No schema change (615 added the settings field).
- Backend / API: new `GET /api/v1/product-import/price-rises?days=60` (the shape C-INVOICE fixes). Dedicated, not the generic API: `priceHistory` is server-only and the answer is a computed selection, not a list of documents.
- Auth and validation: owner (and, after 631, consultant) through `assertCan(…, 'editMoney', { type: 'products' })`; `days` validated; the business is always taken from the token (`scopeFilter`). The settings write keeps its existing owner check and Zod validation on the server.
- Security surface: one new read of money data, owner only, own business only; no new input beyond `days`; no secret; logs carry no product name or price.
- Data / migration: none. A business with no stored `priceRiseAlertPct` reads 5 (defaults filled on read; nothing is written until the owner saves the form).
- Project checks: `[auto] log-query`; new dictionary keys named with Hebrew values; icon named (already registered); Reuse Check filled with both rung-4 reasons; dedicated endpoint named and justified; `pnpm run test:server` + `pnpm run test:ci`; hotspot `dictionary.json` append-only; `[ui]` specs sign in with `signInQa`.

## Out of Scope
- Price history from a price typed by hand on a product (assumption A6).
- A price-history screen or chart per product; price volatility (plan 633).
- Any notification outside the app (push, mail, WhatsApp).
- Changing `overrunThresholdPct` or reusing it (assumption A3).
- Storing the impact panel or showing it again later; links from the panel to a recipe; suggesting a new selling price.
- Marking price drops.
- A rate limiter or a cache for the new read.

## Critical Questions
- none

## Execution Notes
- decided: the impact panel covers every product whose price goes up in the save, not only the marked ones — why: the brief says "the products that rose"; the threshold decides the mark and the dashboard card, and a recipe whose rounded cost did not move is not listed anyway.
- decided: "before" is `computeRecipeCost` taken just before the apply request, "after" the same call once `apply` has reloaded the products — why: the cost engine reads live prices and has no "price at a date" input; this needs no second cost rule and no server cost.
- decided: the panel shows the total recipe cost (the engine's number), not a per-portion cost — why: one existing number, the same the recipe book shows.
- decided: "latest rise per product and supplier at or above the threshold" is read as the newest history row that itself qualifies — why: the Contract's words; a later small drop does not erase a rise the owner has not seen.
- decided: no dashboard card and no empty state when nothing rose — why: the dashboard pattern (`frontdesk-week-card` hides itself); an empty card is noise.
- decided: the card shows 5 rows and the panel 30, each with an "and N more" line — why: a staple like oil sits in hundreds of recipes; the screen must stay readable on a phone.
- decided: the client range for the new number is 0.1–100 with the existing `pct_range_overrun` message — why: the schema is `> 0`, `≤ 100` and the inputs step by 0.1, the same as the overrun field.
- decided: no rate limiter on `price-rises` — why: one indexed read, owner only, once per dashboard visit; `importLimiter` (10 per 15 minutes) would break the dashboard.
- decided: the card is shown by `can('editMoney')`, not `isOwner_` — why: the server gate is `editMoney`, and a consultant (plan 631) must see it too.
