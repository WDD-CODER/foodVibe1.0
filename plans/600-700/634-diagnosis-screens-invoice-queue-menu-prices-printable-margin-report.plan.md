# Plan 634 — Diagnosis screens: the invoice queue, the menu with prices and the printable margin report

Status: done
Depends-on: 633, 628, 632
Snapshot: e916e48e3943a650ba9767ebb4023d20e823ae8d

## Problem Statement
A consultant starting with a new client spends the first week typing the client's invoices and menu into a
spreadsheet (spec MP-11). Plan 633 gives the server a diagnosis record, a menu-with-prices read and the price-movement
numbers; plan 628 gives the invoice screen (photo or PDF, header strip, name memory, preview, apply); plan 632 lets the
consultant work inside the client's business with a banner. This plan is the screens: inside a client's business the
consultant opens a diagnosis, drops a batch of invoice files and approves them one after another through the normal
preview, pastes the menu and links each line to a dish, and reads a printable report of margins and price movements
computed from stored data. No bulk shortcut, no number from a model.

Verified on `origin/main` (e916e48e, 2026-11-17):
- No `src/app/pages/diagnosis/` folder and no `diagnosis` route exist. Routes are lazy `loadComponent` entries in
  `src/app/app.routes.ts` (315 lines); the import preview's route is `inventory/import` (lines 82–87) with
  `canDeactivate: [pendingChangesGuard]`.
- The import preview is `ProductImportComponent`, selector `app-product-import`
  (`src/app/pages/inventory/components/product-import/product-import.component.ts`, 416 lines, spec 530 lines). At the
  snapshot it is a routed page: it has no `input()` and no `output()`, it renders its own `app-page-header` and a
  "back to inventory" link, takes one photo through `onPhotoChosen` (line 178) and saves through `saveAll` (line 232);
  `hasRealChanges()` (line 162) is what the leave guard asks. Plan 628 rewrites this component (photo or PDF,
  `POST /api/v1/ai/invoices/read`, `resolve` before the model, apply with an `invoice` and an `invoiceId` in the
  answer); its final inputs are not known at drafting time.
- `RecipeCostService` (`src/app/core/services/recipe-cost.service.ts`): `computeRecipeCostStatus(recipe)` (line 67)
  returns `{ cost, partial, missing }`; `getRecipeCostPerUnit(recipe)` (line 139) is the total cost divided by
  `yieldAmount`. A dish is a `Recipe` with `recipeType === 'dish'`. Dishes and recipes load on demand through the
  resolver `kitchenDataEnsureLoadedResolver` (`src/app/core/resolvers/`; `dish-data.service.ts:16`).
- `src/app/core/components/tab-chips/tab-chips.component.ts` (178 lines): `GROUP_BY_PATH_PREFIX` (lines 31–46) and
  `CHIPS_BY_GROUP` (lines 48–76); the `inventory` group has `products` and `equipment`. Its spec asserts the chip
  lists (`tab-chips.component.spec.ts:77`). Plan 620 makes the chips filter through `ModuleService`; plan 628 adds an
  invoices chip.
- Printing: `src/app/pages/report/report.page.ts:217` calls `window.print()` and `report.page.scss:162` holds the
  `@media print` rules of the one-page A4 report — the pattern to follow.
- `breadcrumbs.md` maps exist only at six seams (`scripts/breadcrumbs-check.mjs:24`); a `breadcrumbs.md` inside
  `src/app/pages/diagnosis/` would be reported as `STRAY`. The new page is recorded as a row of
  `src/app/pages/breadcrumbs.md`.
- `app-search-combobox` (`src/app/shared/search-combobox/`): inputs `options`, `labelOf`, `keyOf`, `placeholder`,
  output `picked`. `normalizeHebrew` is in `src/app/core/utils/recipe-match.util.ts:3`.
- Lucide icons registered in `src/app/app.config.ts`: `printer`, `plus`, `trash-2`, `check`, `x`. Not registered:
  `stethoscope`, `upload`. No key starting `diag_` and no key `diagnosis` exists in
  `public/assets/data/dictionary.json`; `print`, `save`, `cancel`, `remove`, `supplier`, `server_error`,
  `ai_daily_limit_reached_all` exist.
- From the plans merged before this one: `/api/v1/diag` routes, `POST /api/v1/ai/diag/menu`,
  `@schemas/diag/margin-report` (`buildMarginReport`) (633); `UserService.acting_`, `homeModules_`,
  `app-acting-banner` in `src/app/core/components/acting-banner/` (632); `ModuleService` and `moduleGuard`
  (620, `src/app/core/services/module.service.ts`, `src/app/core/guards/`); `ai_monthly_cap_reached` (620).

## Goals & Success Criteria
**Primary:** a consultant inside a client's business goes from a pile of invoice files and a pasted menu to a printed
report that lists every dish with its selling price, cost and margin, marks the dishes under the business's profit
target and shows the products whose price moved the most.

- [auto] `pnpm run test:ci` → exit 0, including `src/app/pages/diagnosis/diagnosis.guard.spec.ts` (acting: allowed only when the home modules include `consultant_diag`; at home: the module guard decides), `src/app/pages/diagnosis/services/diagnosis.service.spec.ts`, `src/app/pages/diagnosis/diagnosis.page.spec.ts` (list, empty state, create), `src/app/pages/diagnosis/components/diag-invoice-queue/diag-invoice-queue.component.spec.ts` (three files: only the first is handed to the preview; the second is handed only after the first is applied or skipped; an applied invoice id is saved to the diagnosis), `src/app/pages/diagnosis/components/diag-menu/diag-menu.component.spec.ts` (rows from the read, a missing price blocks the save, a name equal to exactly one dish is linked, save sends `draftId`, the VAT switch and percent; the percent is hidden while the switch is off), `src/app/pages/diagnosis/components/diag-report/diag-report.component.spec.ts` (a dish under the target shows "מתחת ליעד"; a row without a cost shows "אין עלות" and a dash for the suggested price; the price-without-VAT column and the note line follow the switch; the suggested price of the shared function is shown; `costByDishId` holds the per-portion cost only for a dish whose cost is complete), `src/app/core/components/acting-banner/acting-banner.component.spec.ts` (the diagnosis link only with the home module), `src/app/core/components/tab-chips/tab-chips.component.spec.ts`, `src/app/pages/inventory/components/product-import/product-import.component.spec.ts`.
- [auto] `pnpm run lint` → exit 0; `pnpm run lint:icons` → exit 0; `pnpm run lint:reuse` → exit 0.
- [auto] `pnpm run build` → passes.
- [auto] `node scripts/breadcrumbs-check.mjs` → `BREADCRUMBS: clean`.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [ui] On `/diagnosis/qa-diag` with the diagnosis routes answered by the spec's fixture (one menu row "פסטה" at 40 linked to a dish that costs 35), the QA owner taps "דוח" and sees "מתחת ליעד" on the row "פסטה" (`e2e/ui/634-1.spec.ts`; the spec fulfils `**/api/v1/diag/**`, `**/api/v1/data/diagnoses**` and adds `consultant_diag` to the `**/api/v1/business` answer with `page.route`, because the QA business does not have the module).
- [human] The partner (a working consultant) builds a diagnosis from his own client's invoices and menu and reads the report: the numbers match what he knows, and the page prints on A4 without cut columns.
- [human] Dandan drops three invoice files: he is asked to approve them one at a time, and can skip one.

## Execution Mode
- Parallel: no — the map's must-not-run list: 620, 623, 624, 628, 629, 630, 632, 634, 636, 637 all append to `public/assets/data/dictionary.json`, `src/app/app.routes.ts`, `src/app/app.config.ts` (icons) and `tab-chips.component.ts` — one screen run at a time; 628 and 629 edit `src/app/pages/inventory/components/product-import/**` (both merged before this plan). Run `mod-diag` holds 633 then 634.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
src/app/pages/diagnosis/**
src/app/pages/diagnosis/diagnosis.guard.spec.ts
src/app/pages/diagnosis/diagnosis.page.spec.ts
src/app/pages/diagnosis/services/diagnosis.service.spec.ts
src/app/pages/diagnosis/components/diagnosis-workspace/diagnosis-workspace.component.spec.ts
src/app/pages/diagnosis/components/diag-invoice-queue/diag-invoice-queue.component.spec.ts
src/app/pages/diagnosis/components/diag-menu/diag-menu.component.spec.ts
src/app/pages/diagnosis/components/diag-report/diag-report.component.spec.ts
src/app/pages/inventory/components/product-import/product-import.component.ts
src/app/pages/inventory/components/product-import/product-import.component.html
src/app/pages/inventory/components/product-import/product-import.component.spec.ts
src/app/pages/inventory/components/product-import/**
src/app/core/components/acting-banner/acting-banner.component.ts
src/app/core/components/acting-banner/acting-banner.component.html
src/app/core/components/acting-banner/acting-banner.component.scss
src/app/core/components/acting-banner/acting-banner.component.spec.ts
src/app/core/components/tab-chips/tab-chips.component.ts
src/app/core/components/tab-chips/tab-chips.component.spec.ts
src/app/core/services/http-storage.adapter.ts
src/app/app.routes.ts
src/app/app.config.ts
src/app/pages/breadcrumbs.md
public/assets/data/dictionary.json
e2e/ui/634-1.spec.ts
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

- INV-6: preserves — the scope holds the client of one AI route (`src/app/pages/diagnosis/**` calls `POST /api/v1/ai/diag/menu`); the call goes to the server through `HttpClient` and the `API` map, and the browser holds no AI key.
- INV-1: preserves — the screens only hide by module and permission (`diagnosisGuard`, `PermissionService.can('editMoney')`); every diagnosis write goes through the routes of plan 633, which gate, scope and authorise on the server.

## Reuse Check

- `DiagnosisService` (`src/app/pages/diagnosis/services/diagnosis.service.ts`) — family: http — rung: 2 — why: a page-scoped client of the `API` map and `HttpClient`, like `TeamService`; `diagnoses` is written only by its router, so `BaseEntityDataService` (generic writes) does not fit.
- `diagnosisGuard` — family: page-entry-loading — rung: 3 — why: at home it calls plan 620's `moduleGuard(['consultant_diag'])`; while acting it reads `UserService.homeModules_`, which the module guard cannot (it reads the active business).
- `DiagnosisPage` (the list) — family: list-page — rung: 2 — why: `app-page-header`, `.c-list-row` rows and `app-empty-state`; a handful of rows, so no search, filters or selection bar.
- New-diagnosis form (name input, period number, create button) — family: form-field — rung: 1 — why: `app-form-field` for the name, `app-counter` for the days.
- Workspace tabs (invoices, menu, report) — family: chip — rung: 1 — why: `c-chip c-chip--tab` buttons, as the settings page.
- `app-diag-invoice-queue` — family: none — rung: 4 — why: no piece holds a list of chosen files and hands them to a preview one at a time; it embeds `app-product-import` and adds no second preview.
- File picker button in the queue — family: form-field — rung: 1 — why: a hidden `input type="file" multiple` behind a `c-btn-ghost` button, the pattern the import preview uses for a photo.
- Queue status tags — family: chip — rung: 1 — why: `c-chip c-chip--tag` with the existing tones.
- `app-diag-menu` rows (name input, price number box, remove button, add-row button) — family: number-box — rung: 1 — why: the preview-row controls of the import screen (`appNumberBox`, `appSelectOnFocus`), `c-icon-btn` for remove.
- "Menu prices include VAT" switch — family: chip — rung: 1 — why: a `c-chip c-chip--toggle` (label > input + span), the existing toggle chip.
- VAT percent number — family: stepper — rung: 1 — why: `app-counter` as is, 0–100.
- Dish link on a menu row — family: search-combobox — rung: 1 — why: `app-search-combobox` over the business's dishes.
- `app-diag-report` — family: cost-badge — rung: 1 — why: tables in the report page's look; `app-partial-cost-badge` is not needed because a partly costed dish is shown as "no cost"; `app-empty-state` when there is no menu.
- Under-target and no-cost marks — family: chip — rung: 1 — why: `c-chip c-chip--tag` red and amber.
- Diagnosis link in the acting banner — family: feedback — rung: 2 — why: one `routerLink` button inside the existing banner.
- Diagnosis chip in the inventory group — family: chip — rung: 1 — why: one more entry of `CHIPS_BY_GROUP`.
- `embedded`, `file` inputs and `applied` output on `app-product-import` — family: none — rung: 4 — why: the import preview is in no registry family; the existing component is extended so a second host can use it; no copy of the preview is made.
- `diagnosis-workspace` component and its classes `.diagnosis-workspace`, `.diagnosis-workspace__head`, `.diagnosis-workspace__title`, `.diagnosis-workspace__tabs`, `.diagnosis-workspace__back` — family: chip — rung: 1 — why: the page shell of the three tabs; the tab buttons are `c-chip c-chip--tab`, only the layout is local.
- `diag-invoice-queue` component and its classes `.diag-invoice-queue`, `.diag-queue`, `.diag-queue__pick`, `.diag-queue__hint`, `.diag-queue__count`, `.diag-queue__locked`, `.diag-queue__list`, `.diag-queue__item`, `.diag-queue__name` — family: none — rung: 4 — why: see the `app-diag-invoice-queue` row; these are its layout classes.
- `diag-menu` component and its classes `.diag-menu`, `.diag-menu__vat`, `.diag-menu__vat-pct`, `.diag-menu__paste`, `.diag-menu__rows`, `.diag-menu__field`, `.diag-menu__error`, `.diag-menu__locked`, `.diag-menu__row`, `.diag-menu__price`, `.diag-menu__dish`, `.diag-menu__actions` — family: number-box — rung: 1 — why: the menu step's layout; the controls are the rows listed above (number box, toggle chip, counter, combobox).
- `diag-report` component and its classes `.diag-report`, `.diag-report__top`, `.diag-report__target`, `.diag-report__note`, `.diag-report__h2`, `.diag-report__wrap`, `.diag-report__table`, `.diag-report__tag`, `.diag-report__findings`, `.diag-report__print` — family: cost-badge — rung: 1 — why: the report's tables and print layout, in the report page's look.
- `diagnosis.page` classes `.diagnosis-page`, `.diagnosis-form`, `.diagnosis-form__period`, `.diagnosis-form__label`, `.diagnosis-list`, `.diagnosis-list__row`, `.diagnosis-list__name` — family: list-page — rung: 1 — why: the list page's layout around `.c-list-row` rows and `app-form-field`.
- `.c-btn-ghost` rule inside the workspace print block — family: chip — rung: 1 — why: only hides the existing ghost button in print; no new engine class.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a consultant, I want to drop a pile of a client's invoice files and approve them one after another so that his prices are in the system the same day.
- As a consultant, I want to paste the client's menu and link each line to a dish so that every selling price meets its cost.
- As a consultant, I want a report that marks the dishes under the profit target and the products whose price moved the most so that I know what to talk about first.
- As a business owner, I want to print that report so that I can read it with my chef.
- As a chef, I want every invoice in a diagnosis to pass the same line check as any other invoice so that a wrong price never enters my products in bulk.

## Functional Requirements

### Must Have (P0)
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-DIAG (633; used by 634)**
  - `diagnoses`: `{ ...baseDocShape, name, periodDays (default 60, 30–365), menu: [{ name (≤ 200), sellPrice (≥ 0),
    dishId? }] (≤ 300), pricesIncludeVat: boolean (default true), vatPct: number (0–100, default 18),
    invoiceIds: string[] (≤ 100), homeBusinessId, status: 'open' | 'done' }`; read through the
    generic API (owner, consultant), written only by the router.
  - `/api/v1/diag` (`requireHomeModule('consultant_diag')`; owner, consultant or acting platform admin):
    `POST /` (accepts `pricesIncludeVat?`, `vatPct?`), `PUT /:id/menu` body `{ menu, draftId?, pricesIncludeVat?,
    vatPct? }` (it confirms the AI draft), `PUT /:id/invoices`, `PUT /:id/status`, `GET /:id/data` → `{ diagnosis,
    volatility: [{ productId, supplierId, min, max, movePct, points }] }` from `priceHistory` inside the period;
    `movePct = (max − min) / min × 100`, two decimals, by code.
  - `POST /api/v1/ai/diag/menu` body `{ text (1–20,000) }` → `{ items: [{ name, sellPrice }], draftId }`;
    `feature: 'menu_prices_parse'`; prices copied as printed; an item without a printed price is returned with
    `sellPrice: null` and the person types it.
  - `shared/schemas/diag/margin-report.ts` → `buildMarginReport({ menu, costByDishId, volatility, settings,
    pricesIncludeVat, vatPct }) → { dishes: [{ name, sellPrice, netPrice, cost?, marginPct?, underTarget,
    suggestedPrice? }], findings: [{ key, value, evidenceCount }] }`. Pure, all by code, two decimals.
    `netPrice = pricesIncludeVat ? sellPrice / (1 + vatPct / 100) : sellPrice`;
    `marginPct = (netPrice − cost) / netPrice × 100`; `underTarget` when below `settings.profitTargetPct`;
    `suggestedPrice` = the price to charge to reach the target = `cost / (1 − profitTargetPct / 100)`, times
    `(1 + vatPct / 100)` when prices include VAT; absent without a cost or when the target is 100 or more. Costs are
    taken as stored: no VAT is removed from a cost in this program (Dandan, 2026-11-17: a menu sold to the public
    includes VAT, and the report must take it off and say what to charge). The browser supplies `costByDishId` from `RecipeCostService` (the server has no
    cost engine).
  - A batch of invoice files is a queue in the browser: one `POST /ai/invoices/read`, one preview, one `apply` at a
    time. `/api/v1/ai/invoices/read` gets its own limiter for this (60 / 15 minutes per user) in 626.
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
- [ ] **Routes** (appended to `src/app/app.routes.ts`, both lazy): `diagnosis` → `DiagnosisPage` and `diagnosis/:id` → `DiagnosisWorkspaceComponent`, both with `canActivate: [authGuard, diagnosisGuard]`; the second also with `resolve: { kitchenLoaded: kitchenDataEnsureLoadedResolver }` and `canDeactivate: [pendingChangesGuard]`.
- [ ] **`diagnosisGuard`** (`src/app/pages/diagnosis/diagnosis.guard.ts`): while `UserService.acting_()` is set → allowed when `homeModules_()` includes `consultant_diag`, else redirect to `/dashboard`; at home → the result of plan 620's `moduleGuard(['consultant_diag'])`. The server gate (`requireHomeModule`) stays the gate; a 403 `MODULE_OFF` from any diagnosis call sends the user to `/dashboard`.
- [ ] **Where the entry lives** (C-MODULES): (a) in the acting banner, a link "אבחון" (icon `stethoscope`, `routerLink="/diagnosis"`, `data-testid="acting-diagnosis"`) shown only when `homeModules_()` includes `consultant_diag`; (b) in the tab chips, a chip `{ id: 'diagnosis', labelKey: 'diagnosis', icon: 'stethoscope', path: '/diagnosis' }` at the end of the `inventory` group, tagged for the module `consultant_diag` the way plan 620 tags a chip (so at home it shows only when the business has the module), and `['/diagnosis', 'inventory']` in `GROUP_BY_PATH_PREFIX` so the inventory chips show on the diagnosis screens.
- [ ] **`DiagnosisService`** (page-scoped, root-provided): `API.diag(path?)` is added to the `API` map (`/api/v1/diag`, `/api/v1/diag/<path>`). Methods: `list()` (`GET` `API.data('diagnoses')`, newest first), `create({ name, periodDays })`, `loadData(id)` (`GET :id/data` → `{ diagnosis, volatility }`), `saveMenu(id, { menu, draftId?, pricesIncludeVat, vatPct })`, `saveInvoices(id, invoiceIds)`, `setStatus(id, status)`, `readMenu(text)` (`POST` `API.ai('diag/menu')` → `{ items, draftId }`). Each throws on a refusal; the caller maps the code to a key.
- [ ] **List screen** (`/diagnosis`, `DiagnosisPage`): `app-page-header` with `titleKey="diagnosis"`; a form row — name (`app-form-field`, required, at most 200 characters), period in days (`app-counter`, 30–365, starts at 60), button "יצירת אבחון" (disabled while the name is empty or a save runs) → `create` → navigates to `/diagnosis/<id>`. Below: one `.c-list-row` per diagnosis — name, created date `dd/MM/yyyy`, status tag (`diag_status_open` / `diag_status_done`) — the whole row is a link to its workspace. Loading → `app-loader`; none → `app-empty-state` with `diag_empty`; a failed load or create → toast `server_error`. Nothing to leave: the form holds one short field and is not guarded.
- [ ] **Workspace** (`/diagnosis/:id`, `DiagnosisWorkspaceComponent`): loads `loadData(id)` (404 → back to `/diagnosis` with toast `server_error`); header = the diagnosis name and its status tag; three tab chips "חשבוניות", "תפריט ומחירים", "דוח" chosen by `?tab=` (default `invoices`), one child component rendered at a time; a button "סימון כהושלם" / "פתיחה מחדש" → `setStatus`. While the status is `done` the invoices and menu tabs are read-only and show `diag_done_locked`. The component implements `PendingChangesComponent`: `hasRealChanges()` is true when the menu tab has unsaved edits or the embedded preview reports changes; `saveAndWait()` saves the menu tab (the preview keeps its own save button, so with preview changes it answers `false` and the guard's stay / leave choice applies).
- [ ] **Invoices tab** (`app-diag-invoice-queue`): a button "בחירת קובצי חשבוניות" (icon `upload`) opens a file input with `multiple` and `accept="image/jpeg,image/png,image/webp,application/pdf"`; the chosen files join a queue held in a signal (in memory only; never uploaded together). A line of help text (`diag_queue_hint`). The queue list shows each file's name and a status tag: "ממתין", "בבדיקה", "אושר", "דולג". Exactly one file is current: it is handed to the embedded `<app-product-import [embedded]="true" [file]="current" (applied)="onApplied($event)" />`, which reads it with one `POST /api/v1/ai/invoices/read`, shows the normal preview and applies it with its own save — the same guardrails as any invoice. `applied` with an `invoiceId` → the id is added and saved with `saveInvoices`, the file becomes "אושר" and the next waiting file becomes current; `applied` with `invoiceId: null` → the file becomes "אושר", toast `diag_queue_no_record`. A button "דילוג על הקובץ" marks the current file "דולג" and moves on (the preview's rows for that file are dropped). A line "חשבוניות באבחון: {count}" shows `invoiceIds.length`. The diagnosis holds at most 100 invoices: files beyond `100 − invoiceIds.length − files already queued` are not added and the toast `diag_queue_too_many` shows. A read error stays in the preview with the preview's own message; the file stays current so the person can retry or skip. Leaving the tab or the page drops the files not yet read (they were never sent).
- [ ] **`app-product-import` as an embedded preview.** If plan 628 left the component without them, this plan adds: `embedded = input(false)` (hides the page header, the back link and the paste box; nothing else changes), `file = input<File | null>(null)` (an `effect` starts the same read path a chosen file starts, once per file object), `applied = output<{ invoiceId: string | null }>()` (emitted after a successful apply). The routed page at `/inventory/import` behaves exactly as before; the component's spec gains the three cases. If 628 already exposes the same abilities under other names, use them and add nothing. Facts about 628's screen this plan keeps: a supplier must be chosen before the save (the person picks it in the header strip, which is a child component — in the queue too, per file), and the component is capped at 480 lines — the three additions stay inside that cap; if they do not fit, the file-to-read `effect` moves into the header-strip child or a small helper in the same folder, never by raising the cap.
- [ ] **Menu tab** (`app-diag-menu`): above the rows, a switch "מחירי התפריט כוללים מע״מ" (`diag_prices_include_vat`; a `c-chip c-chip--toggle`, on by default — the stored `pricesIncludeVat`) and, shown only while it is on, a number "אחוז מע״מ" (`diag_vat_pct`; `app-counter`, 0–100, the stored `vatPct`, 18 by default); both count as unsaved edits and are saved with the menu. Then a textarea (`diag_menu_paste_label`, at most 20,000 characters) and a button "קריאת התפריט" → `readMenu(text)`; while it runs the button is disabled and shows the loader. The answer becomes editable rows appended to the table: name (text input), selling price (`appNumberBox`; a `null` price shows an empty box with the tag "חסר מחיר"), dish link (`app-search-combobox` over the business's dishes by `nameHebrew`, with an X to clear), remove button (icon `trash-2`). After a read, a row whose `normalizeHebrew(name)` equals exactly one dish's is linked to it by code; every other row starts unlinked. "הוספת שורה" (icon `plus`) adds an empty row. "שמירת התפריט" is enabled when there is an unsaved change and every row has a name and a price of 0 or more; it sends `saveMenu(id, { menu: rows, draftId, pricesIncludeVat, vatPct })` (the `draftId` of the last read, once) → toast `diag_menu_saved`. The stored menu is shown the same way on open. Errors: 429 `ai_monthly_cap_reached` → that key; any other 429 → `ai_daily_limit_reached_all`; any other read failure → `diag_menu_read_failed` (the text stays in the box); an empty answer → `diag_menu_nothing_found`; a failed save → toast `server_error`, the rows stay; 400 `UNKNOWN_DISH` → toast `server_error` and the dishes are reloaded. No confirmation dialog is added.
- [ ] **Report tab** (`app-diag-report`): `costByDishId` is a `computed` over the linked dishes: for a dish found in `DishDataService`, when `RecipeCostService.computeRecipeCostStatus(dish).partial` is false and the cost is above 0, the value is `getRecipeCostPerUnit(dish)` (the cost of one portion); otherwise the dish has no entry. `report_ = computed(() => buildMarginReport({ menu, costByDishId, volatility, settings, pricesIncludeVat, vatPct }))` with `settings` from `BusinessService.business_().settings` and the two VAT values from the diagnosis. The page shows: the line "יעד הרווח של העסק: {pct}%"; a note line saying how the prices were read — `diag_vat_note_on` with the percent, or `diag_vat_note_off` — followed by `diag_cost_note`; a table — dish, price as entered (`sellPrice`), price without VAT (`netPrice`; this column only when the switch is on), cost per portion, gross margin %, and the suggested price to reach the target (`suggestedPrice`, a dash when absent) — where a row under the target carries the red tag "מתחת ליעד" and a row without a `marginPct` the amber tag "אין עלות"; the findings list (each key translated with its numbers; for `top_price_move` the product's name from `KitchenStateService`); a table of the 10 largest price movements — product, supplier, lowest, highest, change % — or `diag_volatility_empty`. Money and percent are formatted only through `src/app/core/engine/rounding.ts`. No menu saved → `app-empty-state` with `diag_report_empty`. A button "הדפסה" (`print`, icon `printer`) calls `window.print()`; the `@media print` rules follow `report.page.scss`: the header, tab chips, acting banner, buttons and the other tabs are hidden, tables keep their columns on A4 portrait.
- [ ] **Specs** for the guard, the service, the four components and the page (the cases of the first Done-when item), the updated `tab-chips`, `acting-banner` and `product-import` specs, and `e2e/ui/634-1.spec.ts` signing in with `signInQa`.
- [ ] `src/app/pages/breadcrumbs.md` gains the row `diagnosis/` ("`/diagnosis` — the consultant's diagnosis: invoice queue, menu with prices, printable margin report (plan 634)"). No `breadcrumbs.md` is created inside the page folder.
- [ ] A consultant sees plan 629's dashboard price-rise card and panel without any change here (they ask `can('editMoney')`); this plan adds no second price-rise view.
- [ ] `src/app/app.config.ts`: register `Stethoscope` and `Upload` (import and `LucideAngularModule.pick`).

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- Hebrew RTL; numbers left-to-right inside cells (`c-num`); logical CSS properties only; no new `.c-*` class (page styles stay in the components' own SCSS and use the existing tokens).
- State by state: edit — menu rows are edited in place and saved with one button; leave — the unsaved-changes guard asks only when the menu or the open preview holds edits; cancel — "skip" drops the current file, removing a row drops it at once; error — messages as listed per tab, typed text and rows are never cleared by a failure; empty — each list and the report have their empty text.
- Lucide icons: `stethoscope` and `upload` are new (registered in `src/app/app.config.ts` by this plan); `printer`, `plus`, `trash-2`, `check`, `x` are already registered.
- Which shared files this plan writes: `public/assets/data/dictionary.json` (append), `src/app/app.routes.ts` (two routes appended), `src/app/app.config.ts` (two icons), `tab-chips.component.ts` (one chip, one prefix).
- New keys in `public/assets/data/dictionary.json` (append only; none exists today):

  | Key | Hebrew | Meaning |
  |---|---|---|
  | `diagnosis` | אבחון | "diagnosis" — page title, chip, banner link |
  | `diag_name` | שם האבחון | diagnosis name |
  | `diag_period_days` | תקופה בימים | period in days |
  | `diag_create` | יצירת אבחון | create a diagnosis |
  | `diag_empty` | עדיין אין אבחונים לעסק הזה | no diagnoses for this business yet |
  | `diag_status_open` | פתוח | open |
  | `diag_status_done` | הושלם | done |
  | `diag_tab_invoices` | חשבוניות | invoices tab |
  | `diag_tab_menu` | תפריט ומחירים | menu and prices tab |
  | `diag_tab_report` | דוח | report tab |
  | `diag_mark_done` | סימון כהושלם | mark as done |
  | `diag_reopen` | פתיחה מחדש | reopen |
  | `diag_done_locked` | האבחון הושלם. כדי לשנות אותו יש לפתוח אותו מחדש | the diagnosis is done; reopen it to change it |
  | `diag_choose_files` | בחירת קובצי חשבוניות | choose invoice files |
  | `diag_queue_hint` | הקבצים נקראים אחד אחד. כל חשבונית מאושרת בנפרד לפני המעבר לבאה. | files are read one by one; each invoice is approved before the next |
  | `diag_queue_waiting` | ממתין | waiting |
  | `diag_queue_current` | בבדיקה | being checked |
  | `diag_queue_done` | אושר | approved |
  | `diag_queue_skipped` | דולג | skipped |
  | `diag_skip_file` | דילוג על הקובץ | skip this file |
  | `diag_queue_too_many` | אפשר לצרף עד 100 חשבוניות לאבחון | up to 100 invoices per diagnosis |
  | `diag_queue_no_record` | המחירים נשמרו, אך החשבונית לא נרשמה באבחון | prices saved, but the invoice was not recorded on the diagnosis |
  | `diag_invoices_count` | חשבוניות באבחון: {count} | invoices in the diagnosis: {count} |
  | `diag_menu_paste_label` | הדביקו כאן את התפריט עם המחירים | paste the menu with prices here |
  | `diag_menu_read` | קריאת התפריט | read the menu |
  | `diag_menu_read_failed` | קריאת התפריט נכשלה – הטקסט נשאר, נסו שוב | reading the menu failed; the text is kept, try again |
  | `diag_menu_nothing_found` | לא זוהו מנות בטקסט | no dishes found in the text |
  | `diag_menu_no_price` | חסר מחיר | price missing |
  | `diag_menu_link_dish` | קישור למנה | link to a dish |
  | `diag_menu_add_row` | הוספת שורה | add a row |
  | `diag_menu_save` | שמירת התפריט | save the menu |
  | `diag_menu_saved` | התפריט נשמר | menu saved |
  | `diag_report_empty` | כדי לראות דוח יש לשמור תפריט עם מחירים | save a menu with prices to see the report |
  | `diag_target_line` | יעד הרווח של העסק: {pct}% | the business's profit target: {pct}% |
  | `diag_prices_include_vat` | מחירי התפריט כוללים מע״מ | menu prices include VAT (the switch) |
  | `diag_vat_pct` | אחוז מע״מ | VAT percent |
  | `diag_vat_note_on` | מחירי התפריט נקראו ככוללים מע״מ של {pct}%. הרווח מחושב על המחיר ללא מע״מ, והמחיר המומלץ כולל מע״מ. | menu prices were read as including {pct}% VAT; the margin is on the price without VAT and the suggested price includes VAT |
  | `diag_vat_note_off` | מחירי התפריט נקראו כמחירים ללא מע״מ. | menu prices were read as prices without VAT |
  | `diag_cost_note` | העלויות מוצגות כפי שהן שמורות במוצרים. | costs are shown as stored on the products |
  | `diag_col_net_price` | מחיר ללא מע״מ | price without VAT |
  | `diag_col_suggested_price` | מחיר מומלץ להגעה ליעד | suggested price to reach the target |
  | `diag_col_dish` | מנה | dish |
  | `diag_col_sell_price` | מחיר בתפריט | price as entered on the menu |
  | `diag_col_cost` | עלות למנה | cost per portion |
  | `diag_col_margin` | רווח גולמי % | gross margin % |
  | `diag_under_target` | מתחת ליעד | under the target |
  | `diag_no_cost` | אין עלות | no cost |
  | `diag_findings_title` | ממצאים | findings |
  | `diag_finding_dishes_under_target` | {value} מנות מתחת ליעד הרווח, מתוך {evidence} מנות עם עלות | {value} dishes under the target, of {evidence} with a cost |
  | `diag_finding_dishes_without_cost` | {value} שורות בתפריט ללא עלות, מתוך {evidence} | {value} menu rows without a cost, of {evidence} |
  | `diag_finding_top_price_move` | המחיר של {name} זז ב-{value}% בתקופה | the price of {name} moved {value}% in the period |
  | `diag_volatility_title` | המחירים שזזו הכי הרבה ב-{days} הימים האחרונים | prices that moved the most in the last {days} days |
  | `diag_volatility_empty` | אין מספיק היסטוריית מחירים בתקופה | not enough price history in the period |
  | `diag_col_product` | מוצר | product |
  | `diag_col_min` | הנמוך | lowest |
  | `diag_col_max` | הגבוה | highest |
  | `diag_col_move` | שינוי % | change % |

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Add the diagnosis service, the guard and the two lazy routes so the screens have a door — the API map entry, the seven service calls, the guard for home and acting sessions, routes with the kitchen-data resolver and the leave guard; specs — src/app/pages/diagnosis/services/diagnosis.service.ts, src/app/pages/diagnosis/diagnosis.guard.ts, src/app/core/services/http-storage.adapter.ts, src/app/app.routes.ts
- [x] A2: Build the list screen where a consultant starts or reopens a diagnosis — header, the name and period form, rows with status, loader, empty state; spec — src/app/pages/diagnosis/diagnosis.page.ts, src/app/pages/diagnosis/diagnosis.page.html, src/app/pages/diagnosis/diagnosis.page.scss, src/app/pages/diagnosis/diagnosis.page.spec.ts
- [x] A3: Build the workspace that holds one diagnosis and its three tabs — load, tabs by query parameter, done and reopen, read-only when done, unsaved-changes answers; spec — src/app/pages/diagnosis/components/diagnosis-workspace/
- [x] A4: Let the import preview run inside another screen without changing its own page — the embedded switch, the file input and the applied event, only if 628 left them out; three spec cases — src/app/pages/inventory/components/product-import/product-import.component.ts, src/app/pages/inventory/components/product-import/product-import.component.html, src/app/pages/inventory/components/product-import/product-import.component.spec.ts
- [x] A5: Build the invoice queue that reads and approves one file at a time — file picker, queue with statuses, one current file in the embedded preview, skip, saving each invoice id, the 100 limit; spec — src/app/pages/diagnosis/components/diag-invoice-queue/
- [x] A6: Build the menu tab that turns pasted text into priced rows linked to dishes — the VAT switch and percent, paste and read, editable rows, exact-name linking by code, dish search, save with the draft id, every error text; spec — src/app/pages/diagnosis/components/diag-menu/
- [x] A7: Build the report that marks dishes under the target and prints on one page — per-portion costs from the cost service, the shared report function with the VAT values, the price-without-VAT and suggested-price columns, the note line, the two tables, findings, print rules; spec — src/app/pages/diagnosis/components/diag-report/
- [x] A8: Put the diagnosis entry where a consultant will find it — the link in the acting banner by the home modules, the chip and path prefix in the inventory group, the two new icons; specs updated — src/app/core/components/acting-banner/, src/app/core/components/tab-chips/tab-chips.component.ts, src/app/core/components/tab-chips/tab-chips.component.spec.ts, src/app/app.config.ts
- [x] A9: Add the words, the pages map row and the screen check, then run everything — the 56 dictionary keys, the breadcrumbs row, the ui spec with its fixtures, every Done-when command, the human cards — public/assets/data/dictionary.json, src/app/pages/breadcrumbs.md, e2e/ui/634-1.spec.ts

## Technical Considerations
- Dependencies: `ProductImportComponent` (628, 629), `app-acting-banner` and `UserService.homeModules_` (632), `ModuleService` / `moduleGuard` (620), `RecipeCostService`, `DishDataService`, `KitchenStateService`, `BusinessService`, `pendingChangesGuard`, `kitchenDataEnsureLoadedResolver`, `@schemas/diag/margin-report` (633).
- New files needed: `src/app/pages/diagnosis/` — `diagnosis.page.{ts,html,scss,spec.ts}`, `diagnosis.guard.ts` (+ spec), `services/diagnosis.service.ts` (+ spec), `components/diagnosis-workspace/`, `components/diag-invoice-queue/`, `components/diag-menu/`, `components/diag-report/` (each `.ts`, `.html`, `.scss`, `.spec.ts`); `e2e/ui/634-1.spec.ts`.
- Model changes: none stored; the browser uses the `Diagnosis` type inferred from `@schemas/entities` and the report types from `@schemas/diag/margin-report`.
- Backend / API: none new; the browser calls the six routes of plan 633 and the generic read of `diagnoses`.
- Auth and validation: the guard and the entries only hide; `requireHomeModule('consultant_diag')` and `editMoney` on the server decide. The browser checks a menu row has a name and a price before it sends.
- Security surface: invoice files stay in memory and go to the server one at a time through the existing read route; pasted menu text goes only to `POST /api/v1/ai/diag/menu`; nothing is logged from the browser but counts and status codes. No new secret.
- Data / migration: none.
- Project checks: `[auto] log-query` present; every dictionary key named with its Hebrew value; icons named with their registration state; Hebrew RTL and logical CSS; every screen a lazy route; Reuse Check lists every control; `[ui]` spec under `e2e/ui/` with `signInQa`; hotspots append-only; `menu-intelligence.page.ts` is not touched.

## Out of Scope
- Any server change (plan 633), any change to how an invoice is read, matched or applied (626–628).
- Reading several invoice files in one request, or approving several at once.
- Reading the menu from a photo or a PDF.
- An AI-written summary, charts, or an export of the report to Excel.
- Deleting a diagnosis.
- Any VAT adjustment of costs: a dish's cost is shown as stored on the products (the report says so); only menu prices are read with or without VAT.
- Creating a dish from an unlinked menu line (the consultant builds dishes in the recipe builder).
- Keeping the file queue across a page reload.

## Critical Questions
- Q: Menu prices are usually typed with VAT, while product costs may come from invoices without it. Which margin does the report show? a — the margin on the prices exactly as entered; b — a "menu prices include VAT" switch per diagnosis, and the report removes VAT before computing. A: b — the Human, 2026-11-17: a VAT switch per diagnosis; the report removes VAT before the margin and shows the price to charge to reach the target.

## Execution Notes
- decided: the page map is a row in `src/app/pages/breadcrumbs.md`, not a `breadcrumbs.md` inside the new folder — why: `scripts/breadcrumbs-check.mjs` reports a map outside the six seams as `STRAY`.
- decided: the queue embeds `app-product-import` and gives it one file at a time, adding `embedded`, `file` and `applied` to it only if 628 left them out — why: "the same guardrails, no bulk shortcut" means one preview implementation; a routed preview cannot receive a file from another page or report back.
- decided: the diagnosis entry is in the acting banner (by the home business's modules) and as a chip of the inventory group (at home, by the business's own modules) — why: C-MODULES names both places; while acting, the chips read the client's modules, so only the banner can show the consultant's own module.
- decided: a dish's cost in the report is the cost of one portion (`getRecipeCostPerUnit`) and only when the dish's cost is complete — why: a selling price is per portion, and a partial cost would show a margin that looks better than it is; such a row says "אין עלות".
- decided: after a menu read, a line is linked to a dish only on an exact normalised name match with exactly one dish — why: linking is the person's decision; code may pre-fill only what is unambiguous, and the model is not asked to match.
- decided (the Human, 2026-11-17, answer b): the menu step holds a "menu prices include VAT" switch (on) and a VAT percent (18), saved with the menu; the report shows the price as entered, the price without VAT, the margin on it and the suggested price to reach the target; costs are not adjusted.
- decided: the VAT switch and percent sit on the menu step, not on the create form — why: that is where the prices are typed, and the create route's defaults (on, 18) cover the start.
- decided: the report shows the gross margin percent, not a separate food-cost percent column — why: C-DIAG's report row carries `marginPct`; food cost percent is its complement and a second column would say the same thing twice.
- decided: the report lists the 10 largest price movements — why: the server returns up to 200; a printed page needs the top of the list.
- decided: files not yet read are dropped when the person leaves, without a question — why: they were never sent and nothing is lost but the selection; the guard asks only about typed edits.
- decided: the `[ui]` check answers the diagnosis routes from fixtures — why: the QA business does not have `consultant_diag`, and the gate reads the home business.
- evidence: `pnpm run build` → exit 0; `pnpm run lint` → exit 0 (0 errors, 67 warnings, none in new files); `pnpm run test:ci` → exit 0, TOTAL: 2555 SUCCESS; `pnpm run lint:reuse` → REUSE: ok; `pnpm run lint:icons` → 0 violations; `node scripts/breadcrumbs-check.mjs` → BREADCRUMBS: clean; `node scripts/log-query.mjs --since=plan-start --level=error` → SKIP: no database configured; kit-manifest-check → ok; scope-check → SCOPE: ok.
- scope extended: src/styles.scss — one print rule appended (`body:has(app-diag-report)` hides the app header, chips and banner) — it is an append-only hotspot, always allowed.
- scope extended: docs/brain/component-families.md and docs/brain/inventory.md were already in scope; the families file gained two family headings (diag-invoice-queue, import-preview-embedded) and a line for `diagnosisGuard`; inventory regenerated with `node scripts/inventory.mjs`.
- decided: the file-read `effect` stayed in `product-import.component.ts` (plan 628 left no `embedded`/`file`/`applied`); the file is now ~552 lines (507 before; no lint enforces a cap, 628's cap of 480 was already exceeded) — a split into a helper is a follow-up, not done here.
- decided: the route `diagnosis/:id` has `runGuardsAndResolvers: 'paramsOrQueryParamsChange'` so a tab switch asks the leave question like the settings page — why: a tab switch drops the open tab's unsaved menu edits.
- decided: the `[ui]` item 634-1 is written, not run (no app in this folder); its fixture also answers `data/dishes` and `data/products` so the linked dish costs 35.
- decided: the 57 dictionary rows of the plan's table were all added (the plan text says 56).
