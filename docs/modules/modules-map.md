# Modules program plan map — plan of record (Reality Check and plan numbers 2026-11-17)

Source brief: `docs/modules/modules-program-brief.md` (Part 0.5 = decisions D1–D19 and assumptions A1–A7, Part 2 =
cross-cutting rules, Part 3 = specs MP-nn and the Reality Check seeds, Part 4 = rounds and runs).
Verified against origin/main SHA: `e916e48e3943a650ba9767ebb4023d20e823ae8d` (2026-11-17, Step 0) — use as `Snapshot:`.
No commit between `39699900` and that SHA touches `server/`, `shared/` or `src/app`.
Highest ADR 0031, highest migration 0012. Plan numbers 615–637 are assigned below (`node scripts/next-plan-number.mjs`
printed 615 on 2026-11-17).
Builds on the Front Desk Contracts in `docs/frontdesk/frontdesk-map.md`: C-ACTOR, C-AIUSAGE, C-GUEST.

Reference plans by NNN only. The `Mn` ids stay in the first column so the brief's Part 4 can still be read; every
other place in this file uses the plan number. The Contracts below are frozen (Step 1, 2026-11-17).

## Plan rows

Size: S / M / L (one Worker session each; an L may be split at drafting). Tier: the builder's starting tier
(`docs/agent/model-routing.md`).

### Wave 0 — foundation (run `mod-0`, alone, first)

| Map# | NNN | Spec | Title | Size · tier | Depends on (must be merged) |
|---|---|---|---|---|---|
| M0 | 615 | all | Register the program once — new schemas, collections, indexes, permission lists, AI feature keys, empty routers and their mounts (C-REGISTRY) | L · build | — |
| M1 | 616 | MP-01 | Modules on the server — `requireModule`, the gate on every covered route, the platform-admin write, existing businesses unchanged (C-MODULES) | M · build | 615 |
| M3 | 617 | MP-02 | Monthly AI cap per business, read from the ledger, enforced before the model call (C-AICAP) | S · build | 616 |
| M4 | 618 | MP-02 | Learning by default — `aiPrivate`, `mayLearnFrom`, the owner switch route removed, the draft trail `aiDrafts` (C-LEARN, C-AIDRAFT) | M · build | 617 |
| M5 | 619 | MP-03, MP-06 | Private file store and audio / PDF model input; works without keys (C-FILES) | M · build | 618 |
| M2 | 620 | MP-01, MP-02 | Modules and AI rules in the browser — `ModuleService`, route guard, navigation, the platform dialog (modules, cap, private), the owner's locked chip | M · build | 616, 617, 618 |

### Wave 1 — field events (module `event_logistics`)

| Map# | NNN | Spec | Title | Size · tier | Depends on |
|---|---|---|---|---|---|
| M6 | 621 | MP-03 | Voice note → transcript on the server, recording kept (C-VOICE) | S · build | 619 |
| M7 | 622 | MP-03 | Notes → checklist draft on the server: numbered questions, positions back, unanswered list (C-LOGX) | M · build | 618 |
| M8 | 623 | MP-03 | Logistics panel: record or paste, review the draft line by line, save; shared `app-voice-note` | M · build (design-light) | 621, 622 |
| M9 | 624 | MP-04 | Loading list: pure builder, printable sheet, ticks on the event (C-LOAD) | M · build | 616 |

### Wave 2 — invoices and prices (always on)

| Map# | NNN | Spec | Title | Size · tier | Depends on |
|---|---|---|---|---|---|
| M10 | 625 | MP-05 | Invoice records and price history written by `apply` in one request (C-INVOICE) | M · build | 618, 619 |
| M11 | 626 | MP-06 | Invoice read: header, PDF, stored file, supplier suggested by tax id (C-INVREAD) | M · build | 619, 625 |
| M12 | 627 | MP-07 | Name memory: own aliases, shared supplier brain, `resolve` before the model (C-ALIAS) | M · build | 626 |
| M13 | 628 | MP-08 | Invoice screen: photo or PDF, header strip, memory first, price change in percent; invoices list | M · build (design-light) | 627 |
| M14 | 629 | MP-08 | Price-rise alert (`priceRiseAlertPct`), impact on recipes and dishes, dashboard card | M · build | 628 |
| M15 | 630 | MP-09 | Platform screen: scan accuracy per flow and model, size of the supplier brain, file-store status | S · build | 627, 620 |

### Wave 3 — access and the consultant

| Map# | NNN | Spec | Title | Size · tier | Depends on |
|---|---|---|---|---|---|
| M16 | 631 | MP-10 | One user, more than one business — grants, active business, switch route, role `consultant`, ADR 0032, INV-1 change (C-ACCESS) | L · judgment | 616, gate G1 |
| M17 | 632 | MP-10 | Business switcher, acting banner, "enter business" from the platform table, the owner's access list | M · build | 631, 620 |
| M18 | 633 | MP-11 | Diagnosis on the server — records, menu-with-prices read, price volatility data (C-DIAG) | M · build | 627, 631 |
| M19 | 634 | MP-11 | Diagnosis screens and the margin report (computed in the browser, printable) | M · build (design-light) | 633, 628, 632 |

### Wave 4 — stock count (always on)

| Map# | NNN | Spec | Title | Size · tier | Depends on |
|---|---|---|---|---|---|
| M20 | 635 | MP-12 | Stock counts on the server — records, draft and final, on-hand, unit conversion (C-STOCK) | M · build | 615 |
| M21 | 636 | MP-12 | Count sheet screen, below-minimum list | M · build | 635 |
| M22 | 637 | MP-12 | Count by voice or text: numbered products, positions back, draft on the sheet | M · build | 636, 621, 623 |

## Runs

`mod-0` = 615, 616, 617, 618, 619, 620 · `mod-events-srv` = 621, 622 · `mod-invoices-srv` = 625, 626, 627 ·
`mod-access-srv` = 631 · `mod-events-ui` = 623, 624 · `mod-invoices-ui` = 628, 629, 630 · `mod-access-ui` = 632 ·
`mod-diag` = 633, 634 · `mod-stock` = 635, 636, 637.

Side by side: the three `-srv` runs (round 2). One at a time: the `-ui` runs, `mod-diag`, `mod-stock`. 635 has no
screen and could join round 2 if its scope stays clear of the three `-srv` runs — decide after the dry run.
Confirm every grouping with `node scripts/plan-order.mjs` and the `/orchestrate` dry run before printing the list.

## Must not run at the same time (write `Parallel: no` against these)

- Every plan of `mod-0` with every other plan of the program: wave 0 edits the shared registries
  (`shared/schemas/entities/index.ts`, `business.schema.ts`, `server/constants/collections.js`,
  `server/constants/ai-features.js`, `server/db.js`, `server/app.js`, `server/routes/ai.js`,
  `server/utils/permissions.js`, `shared/schemas/money-fields.ts`, `shared/schemas/staff-fields.ts`,
  `server/services/gemini-client.js`, `server/routes/admin.js`, `server/routes/generic.js`).
- 616, 617, 618 all edit `server/routes/admin.js`; 617 and 619 both edit `server/services/gemini-client.js` — sequential
  inside `mod-0` (already the row order).
- 625, 626, 627 all edit `server/routes/product-import.js` — sequential inside `mod-invoices-srv`.
- 631 edits `server/routes/generic.js` (one line, the Trash filter), `server/middleware/auth.js`, `server/routes/auth.js`, `server/utils/permissions.js`,
  `server/middleware/usage.js`, `server/test/invariants.test.js`, `docs/brain/invariants.md` — alone in its run; no
  other live run may touch those files.
- 624 and 616 both edit `server/routes/events.js` (616 merges in round 1, so only a re-run can collide).
- 620, 623, 624, 628, 629, 630, 632, 634, 636, 637 all append to `public/assets/data/dictionary.json`,
  `src/app/app.routes.ts`, `src/app/app.config.ts` (icons), `tab-chips.component.ts` — one screen run at a time.
- 623 and 624 both touch `src/app/pages/menu-intelligence/**`; `menu-intelligence.page.ts` is growth-frozen — net
  lines ≤ 0 in both.
- 628 and 629 both edit `src/app/pages/inventory/components/product-import/**` — sequential.
- 620, 630 and 632 all edit `src/app/pages/platform-dashboard/**` — never in two live runs.
- Any open plan that edits `server/routes/ai.js`, `server/routes/generic.js` or
  `src/app/pages/menu-intelligence/**` while a run of this program is live. Step 0: 471 writes only
  `menu-intelligence/components/menu-export-sheet/**`, 581 only the metadata manager's logistics item manager, design
  373 none of these — no clash today.

## Human gates

- **G1 (before saving 631):** Dandan types `approve arch change INV-1` in the Planner session (he chose this on
  2026-11-16; the gate needs the literal words where the line is written). Then 631 carries
  `Arch-approved: Human <date>` and writes ADR 0032.
- **G2 (631):** Dandan reads the ADR 0032 text and the new sentence of INV-1 before the plan is saved.
- **G3 (not a gate — the end):** Dandan sets `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  on Render. Until then every feature works and files are not kept (D16). 619 documents the three names in
  `render.yaml` and `docs/security-go-live.md`.
- **G4:** the updated `docs/frontdesk/pilot-terms-draft.md` goes to Dandan's lawyer (sections 4.2, 7.1, 7.5, 7.6, 7.7).
- Dandan merges each run branch. Every plan's `[human]` Done-when.

## Reality Check deltas

Step 0 ran on 2026-11-17 against `origin/main` `e916e48e`. One line per seed of brief Part 3, in the brief's order.

Tenancy, users, permissions
- `business-scope.js` (`scopeFilter`, `MASTER_BUSINESS_ID`): ok.
- `auth.js` `signAccess`, `/refresh`, one `businessId` per user: ok — `signAccess` (line 81) signs every access token;
  refresh tokens are signed apart with `{ userId }` only. `verifyAccessToken` (`server/middleware/auth.js:23`) is used by
  `server/middleware/write-limit.js` and `server/routes/log.js`.
- `permissions.js` (13 actions, the owner-only lists, the client mirror): ok.
- `actor.js` `actorOf(req)`: ok.
- Platform admin sees no business from inside: ok — changed in detail: `GET /api/v1/stats/report` lives in
  `server/routes/stats.js`; `admin.js` also has `GET /users`, `DELETE /users/:userId`, `GET /frontdesk-stats`,
  `PUT /businesses/:id/internal`, `DELETE /ai-shots/shared/:id`.

Business document and platform screen
- `businessSchema` strict, no `modules`: ok — `hiddenLogisticsKeys` is `[{ key, at }]`, not a list of strings (delta 1).
- `GET /api/v1/business` returns the whole document, `BusinessService.business_`: ok.
- Platform screen (12 sortable columns, `front-desk-admin-dialog`): ok — the page file is
  `src/app/pages/platform-dashboard/platform-dashboard.page.ts`.
- Navigation: changed: the header is as written; `tab-chips` has five groups, not four — `dashboard` (venues, metadata,
  suppliers, trash), `inventory` (products, equipment), `recipes` (recipe-builder, cook-view), `menus` (menu-library,
  menu-intelligence), `frontdesk` (requests, bookings, clients, knowledge, settings) (delta 2).

AI
- `ai.js` 1,876 lines, `aiLimiter` 20 / 15 minutes, no `server/routes/ai/` folder: ok.
- `callGemini` signature, 19 feature keys, `voice_transcribe` unused, no audio or PDF flag, `countImages`: ok — a call
  without `usage.feature` throws only under vitest; in production it logs `ai.usage.missing` and goes on unmetered.
- `ai-usage.js` ledger, `aggregateAiUsage`, no cap: ok.
- AI examples (plan 600): ok.
- `express.json({ limit: '2mb' })`, `RECEIPT_IMAGE_MAX_BASE64`: ok — the constant is in
  `shared/schemas/ai-receipt-photo.schema.ts`.

Events and logistics
- `event-logistics.ts` enums: ok — a section is also a free string since plan 579 (a business adds its own
  `logisticsSection` terms); the nine built-in keys are `infrastructure, space, service, rentals, access, staff, weather,
  food, other`.
- Questions are `logisticsItem` terms: ok — terms also carry `foldedAt`.
- Answers on the event, written only by `PUT /events/:id/logistics`: ok — `EVENT_SERVER_FIELDS` is in
  `shared/schemas/entities/event-stage.ts`.
- The panel (417 lines): changed: the list of questions is not built in the component. It is
  `LogisticsItemRegistryService.forEvent(createdAt, phase, environment)`
  (`src/app/core/services/logistics-item-registry.service.ts`) plus `buildRows` in the component, and the rule is by
  date (delta 1).
- Stations, prep sheets, supplier orders: ok.
- Guest count, `targetsOverride`, `pricing` on `menuEvents`: ok.
- Equipment `ownedQuantity` / `scalingRule`, `resolvedItems`, nothing computes them: ok — and more: the equipment form
  shows only the owned quantity. No screen sets a scaling rule; the dictionary keys `scaling_rule`, `scaling_enabled`,
  `per_guests`, `min_quantity`, `max_quantity`, `scaling_summary`, `no_scaling` exist and nothing uses them (delta 3).
- No audio code: ok.

Invoices and prices
- `parse-receipt-photo`: ok — the owner test is `assertCan(..., 'editMoney')`.
- `normalizeReceiptRows`, 5%: ok — a row with only a line total also gets `needsReview`.
- `product-import` component (416 lines, spec 530): ok — the name matching goes through `ProductNameMatcherService`.
- `POST /apply`: ok — one request, an `insertMany` then a `bulkWrite`, no transaction (delta 5).
- `supplier.schema.ts`, no tax id: ok.
- `products.sources[]`, `_masterId` of an imported product: ok.
- Cost only in the browser, no selling price on a dish: ok.
- Cloudinary from the browser, no server file code, `retention.js`: ok.

Stock
- No stored stock, `minStockLevel`: ok — trap: the existing "low stock" (`server/routes/generic.js` near line 359 and
  `lowStockProducts_` in `kitchen-state.service.ts`) means only `minStockLevel > 0`; it compares nothing (delta 6).

Numbers
- ADR 0031, migration 0012, next plan 615: ok. Open plans 471, 542, 581, design 373: ok — none of them lists a file
  this program writes (471: `menu-intelligence/components/menu-export-sheet/**`; 581:
  `metadata-manager/**/logistics-item-manager`). No `Parallel: no` is needed against them; the orchestrator's preflight
  still checks at start.

**Deltas that override the brief** (none contradicts a decision in Part 0.5)

1. **Which questions an event shows is a rule by date** (plan 579), and it lives in the browser. C-LOGX is rewritten
   below: the pure function takes the event's `createdAt` and the business's `[{ key, at }]` hide list. 623 scope gains
   `src/app/core/services/logistics-item-registry.service.ts` (the service calls the shared function, so there is one rule).
2. **`venues` is a chip of the `dashboard` group**, not of `menus`. C-MODULES browser cell corrected.
3. **No screen sets an equipment scaling rule.** The labels that exist ("לכל אורחים", "כמות מינימלית", "כמות מקסימלית")
   agree with the reading "one per `perGuests` guests, between min and max". 624 adds the three inputs to the equipment
   form with the keys that already exist; scope gains `src/app/pages/equipment/components/equipment-form/**` and the
   equipment list. Plan 338 removed these inputs on Dandan's decision ("meaningless" then, because nothing used them).
   Critical Question 1 of the program asks Dandan to confirm.
4. **Unit conversion is browser-only**: `toBase` in `src/app/core/engine/units.ts` (63 lines), with rates in
   gram-equivalent from the `unit` taxonomy terms (`gramRate`) and `SYSTEM_UNITS`. 635 moves the pure rule to
   `shared/schemas/units/to-base.ts`; `units.ts` re-exports it. 635 scope gains `src/app/core/engine/units.ts` and its
   spec.
5. **`apply` has no transaction.** C-INVOICE fixes the order of the writes and what a failure after the first write
   answers.
6. **"Low stock" today is not a comparison.** 636 adds the real below-minimum list from `GET /stock/on-hand` and leaves
   the existing counter as it is. Critical Question 2 asks whether the old counter should change.
7. **`collections.js` entries carry `backup` and `searchable` too.** C-REGISTRY table completed.
8. **An acting session outside `verifyToken`.** `write-limit.js` and `log.js` read the token without the grant re-check.
   C-ACCESS says what they do with an acting token.
9. **A feature key is enforced only in tests.** 617 keeps that; the cap check runs only for a call that has a
   `usage.businessId`.
11. **Found while drafting (2026-11-17):** routers under `server/routes/ai/` could not reach the shared AI helpers
    (C-REGISTRY now exports four of them); the two C-ALIAS unique indexes could collide (both are partial now);
    C-INVREAD and C-DIAG disagreed on the limiter (the invoice read has only its own); the brief's MP-05 seed "a staff
    token gets 403 on the invoice read" is replaced by the Contract: staff get the three header fields.
    `invoices` and `stockCounts` are registered without soft delete (no plan deletes one); the `businessAccess`
    index is a full unique index; C-STOCK gains its index, the counts read, `draftIds` and `fileId`; a settings save
    keeps a stored `priceRiseAlertPct`; staff read only the name and status of a diagnosis; 619 makes deleting a
    business remove its rows in the program's server-only collections. A draft records the model that answered;
    an invoice file nobody saved is deleted after 30 days; rows and printed lines of an invoice read are linked by name.
    625 therefore also depends on 619. C-ACCESS gains the `ACCESS_ENDED` answer, `homeModules` on the user object
    while acting, and the Trash filter line in `generic.js`; a client log line carries no business id.
    C-FILES gains `format`, the request-builder file, the download endpoint for the expiring link and the
    `media-src` line; C-VOICE maps `audio/mp4` to the model's `audio/m4a`; C-LOGX names the master test by
    `createdBy`; the loading tick uses the existing `markArrival` action. 620 is size L and stays one plan.
    Dandan's answer of 2026-11-17 to the VAT question: C-DIAG gains `pricesIncludeVat`, `vatPct`, `netPrice`
    and `suggestedPrice`.
    Known and left for later: the cost estimate of an audio call uses the text token price
    (`server/constants/ai-prices.js` has no audio price yet). The brief's "whole existing suite green,
    untouched" for 615 means: green, with only the assertions that list registry content updated.
10. **Kit v3.4.0 (lesson K1):** a plan that edits a file under `.claude/` cannot be built unattended. No plan of this
    program does.

## Contracts (frozen in Step 1 — copy verbatim into every plan that uses them)

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

**C-AICAP (617)**
- `business.aiMonthlyTokenCap?: number` (integer ≥ 0; absent or `null` = no cap, A2).
- `server/services/ai-cap.js` → `capState(db, businessId, now) → { cap, used, over }`. The month is the calendar
  month in `Asia/Jerusalem` (the `day` field of `aiUsage`); `used` = the sum of `totalTokens` of that month's rows.
  A per-process cache of at most 60 s per business is allowed.
- Enforced in `callGemini`, before the first HTTP call, when `usage.businessId` is a real business: it returns a
  failure of kind `business_cap`, writes one ledger row `ok: false, errorCode: 'business_cap'` with zero tokens,
  and makes no request. `respondFromGeminiFailure` maps it to 429 `{ error: 'ai_monthly_cap_reached' }`.
  `'__platform__'` calls are never capped. Message key `ai_monthly_cap_reached`.

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
- The owner's card `ai-examples-share` shows one locked chip (shared / private) and a tooltip from a dictionary
  key saying private mode is arranged by contacting FoodVibe. It calls no route.

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

**C-VOICE (621; used by 623, 637)**
- `POST /api/v1/ai/voice/transcribe` body `{ audioBase64, mimeType, purpose: 'logistics' | 'stock', durationSec? }`
  → `{ transcript: string (≤ 20,000), fileId: string | null }`. Any signed-in member; `aiLimiter`;
  `feature: 'voice_transcribe'`; `needsMedia: 'audio'`. The prompt asks for the words as spoken, in the spoken
  language, with no summary and no answer to anything said. Silence → 200 with `transcript: ''`.
- The browser stops a recording at 180 seconds.
- `audio/mp4` (what a phone browser records) is accepted and sent to the model labelled `audio/m4a`, the name the
  model's audio documentation lists for the same container.

**C-LOGX (622; used by 623)**
- `shared/schemas/logistics/visible-items.ts` → `visibleLogisticsItems({ terms, hiddenLogisticsKeys, eventCreatedAt,
  phase, environment, eventHiddenKeys? }) → LogisticsItemTerm[]` — the questions this event shows. Pure. It is the rule
  `LogisticsItemRegistryService.forEvent` has today (plan 579), moved: `terms` = master ∪ the business's own
  `logisticsItem` terms; group by `key`; a term with `foldedAt` gives no row but still counts for the start date; the
  row is the live term, else the newest removed one; a key counts from the earliest of its terms (a term whose `createdBy` is `'__master__'` = 0,
  else `createdAt`) until the earliest `removedAt` or the business's hide date (`hiddenLogisticsKeys[].at`); it shows
  when `start ≤ eventCreatedAt < end` (no `eventCreatedAt` = now); `phase` must equal the term's; a term with
  `environments` shows only when the event has no environment or has one of them (`event.logistics.environmentType`).
  `eventHiddenKeys` (`event.siteLogistics.hiddenKeys`), when given, are taken out: the server passes them, the panel
  does not (it shows them behind its "show hidden" switch). The order of `terms` is kept.
  In 623 `forEvent` calls this function, so there is one rule.
- `POST /api/v1/ai/logistics/extract` body `{ eventId, phase, text (1–20,000), fileId? }` — owner or consultant
  (`editLogistics` on that event), `requireModule('event_logistics')`, `feature: 'logistics_extract'` →
  `{ draftId, answers: [{ itemKey, phase, section, status: 'needed' | 'not_needed' | 'client_provides',
  quantity?, text? }], conflicts: [{ itemKey, current, suggested }], adhoc: [{ label (≤ 120), section, status,
  quantity?, text? }] (≤ 20), unanswered: string[] }`.
- The model receives the numbered questions (number, text, answer type, hint) and the note, and returns
  `{ answers: [{ i, status, quantity?, text? }], extra: [{ label, section, status, text? }] }`. Server rules:
  an `i` out of range or repeated is dropped; `quantity` is kept only for a `quantity` question; `text` ≤ 500;
  `payer` and `showToClient` are never taken from the model; a question the event already answered (status other
  than `unchecked`) goes to `conflicts`, not to `answers`; `extra.section` must be a section the business has,
  else `other`. `unanswered` = visible questions with no answer other than `unchecked` after the draft.
- The route never writes the event. The owner saves through `PUT /api/v1/events/:id/logistics`, then
  `POST /api/v1/ai/logistics/extract/:draftId/confirm` body `{ saved }` stores what was kept (C-AIDRAFT).

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
  `requireModule('event_logistics')`, not on a finished event. There is no permission action of its own: the route
  uses the existing `markArrival` action, so `permissions.js` is not edited.

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

## Planning cards

A card is a seed (brief Step 2). Every path below was seen at `39699900`; verify before use.

**615 — registry.** Scope seed: `shared/schemas/**`, `server/constants/**`, `server/db.js`, `server/app.js`,
`server/routes/ai.js` (mount lines only), `server/routes/ai/**`, `server/routes/{files,access,stock,diag,
admin-learning}.js`, `server/utils/permissions.js` (the type list only), `docs/brain/invariants.md` (`Touches`),
`server/test/**`. Must cover: every C-REGISTRY line; `pnpm run build:schemas` output; the collections test; no
behaviour change (the whole existing suite green, untouched). Traps: `businessSchema` and the entity schemas are
`z.strictObject` — a stored document must still validate; `SCHEMA_BY_COLLECTION` and `server/generated/schemas`
are generated, never hand-edited; `standards-backend.md` §3 for each `userData` collection. If it will not fit one
session, split into schemas + collections + permissions, then routers + mounts + feature keys.

**616 — modules, server.** Scope seed: `server/middleware/require-module.js`, `server/routes/{generic,events,
requests,bookings,knowledge,clients,public,business,stats,ai,admin}.js`, `server/test/**`. Must cover: the coverage
table row by row with one test each; the `clients` either-module rule; the public 404; the platform write with
`platformHistory`; `GET /admin/businesses` fields; INV-1 and INV-2 `preserves`. Traps: `generic.js` is 1,437 lines
and INV-1 — add the type gate in one place; the platform admin's own business is gated like any other, `/admin`
routes never; do not gate taxonomy reads.

**617 — AI cap.** Scope seed: `server/services/{ai-cap,gemini-client,ai-usage}.js`, `server/routes/ai.js`
(`respondFromGeminiFailure` only), `server/routes/admin.js`, `server/test/**`. Traps: `callGemini` must still
throw in tests when `usage.feature` is missing; the cap check must not add a read to a `'__platform__'` call.

**618 — learning and the draft trail.** Scope seed: `server/utils/ai-learning.js`, `server/services/{business,
ai-drafts}.js`, `server/routes/{business,admin}.js`, `server/test/**`, `src/app/core/services/business.service.ts`
(remove one method). Must cover: C-LEARN and C-AIDRAFT; the removed route answers 404; existing shots tests updated
for the new consent test. Trap: the client card is rewritten in 620 — 618 only removes the service method the card
calls, so 620 must follow in the same run.

**619 — files and media.** Scope seed: `server/services/{file-store,gemini-client,ai-usage}.js`,
`server/routes/{files,admin-learning}.js`, `server/jobs/retention.js`, `render.yaml`, `docs/security-go-live.md`,
`server/test/**`. Must cover: every C-FILES line; all tests on the fake store; the not-configured path. Traps: no
secret in code, logs or tests; a file's bytes never enter MongoDB; Cloudinary's API is read from its documentation
at planning time.

**620 — modules and AI rules, browser.** Scope seed: `src/app/core/services/module.service.ts`,
`src/app/core/guards/**`, `src/app/core/components/{header,tab-chips}/**`, `src/app/app.routes.ts`,
`src/app/pages/platform-dashboard/**`, `src/app/pages/metadata-manager/components/ai-examples-share/**`,
`src/app/core/services/platform-admin.service.ts`, `dictionary.json`, `app.config.ts`. Must cover: every browser
cell of the coverage table; the AI entry points hidden without `ai_create`; one platform dialog for modules, cap
and private with a required reason; a "modules" column and "AI this month / cap" in the table; the locked chip.
Reuse: `front-desk-admin-dialog` is the family to follow. Trap: `header.component.spec.ts` and
`tab-chips.component.spec.ts` assert the link lists.

**621 — transcribe.** Scope seed: `server/routes/ai/voice.js`, `server/test/**`. Traps: the audio never reaches a
log; a fake model in tests; check the model chain really has a model that takes audio (`needsMedia`).

**622 — extract.** Scope seed: `shared/schemas/logistics/**`, `server/routes/ai/logistics.js`, `server/test/**`.
Must cover: every C-LOGX server rule with a fixture; the prompt in English with the note in the `user` part; the
event document byte-identical after a call. Trap: read how the panel filters questions today
(`event-logistics-panel.component.ts`) before writing `visibleLogisticsItems` — the function must give the same
list.

**623 — the panel.** Scope seed: `src/app/pages/menu-intelligence/components/event-logistics-panel/**`,
`src/app/shared/voice-note/**`, `src/app/core/services/gemini.service.ts`, `dictionary.json`, `app.config.ts`,
`docs/brain/component-families.md`. Must cover: record or paste; draft as a list with accept / edit / drop per
line; conflicts shown beside the current answer and off by default; ad-hoc suggestions; the "still to check"
list; save through the existing route, then confirm the draft. `app-voice-note` is a new family (rung 4, why: no
audio piece exists). Traps: the panel is 417 lines — the draft view is its own child component;
`menu-intelligence.page.ts` net lines ≤ 0; no confirmation dialog nobody asked for.

**624 — loading list.** Scope seed: `shared/schemas/logistics/loading-list.ts`, `server/routes/events.js`
(one route), `src/app/pages/menu-intelligence/components/loading-list/**`, `dictionary.json`, `app.config.ts`,
tests. Trap: the equipment-rule reading (C-LOAD) — settle it in Step 0.

**625 — invoice records.** Scope seed: `server/routes/product-import.js`, `server/test/**`. Must cover: C-INVOICE;
INV-3 (one request); the existing apply tests unchanged.

**626 — invoice read.** Scope seed: `server/routes/ai/invoices.js`, `server/utils/supplier-key.js`,
`server/routes/product-import.js` (tax id on apply), `server/test/**`. Traps: reuse `normalizeReceiptRows`; the
existing prompt tells the model to skip the header — the new prompt is written from scratch in English.

**627 — memory.** Scope seed: `server/services/invoice-memory.js`, `server/routes/product-import.js`,
`server/services/business.js` (`forgetBusiness` call), `server/test/**`. Must cover: C-ALIAS; the two-business
test; the private test; the no-price schema test. Trap: `_masterId` of an imported product is its own id.

**628 — invoice screen.** Scope seed: `src/app/pages/inventory/components/product-import/**`,
`src/app/pages/inventory/components/invoices-list/**`, `src/app/core/services/{gemini,product-import}.service.ts`,
`app.routes.ts`, `tab-chips.component.ts`, `dictionary.json`, `app.config.ts`. Must cover: photo or PDF; header
strip; `resolve` before `matchWithAi_`; percent change; the list with the signed file link. Trap: the component is
416 lines and its spec 530 — split the header strip out.

**629 — alert and impact.** Scope seed: `server/routes/product-import.js` (`price-rises`),
`src/app/pages/settings/components/business-settings-tab/**`,
`src/app/pages/inventory/components/product-import/**`, `src/app/pages/dashboard/components/**`,
`dictionary.json`, tests. Trap: the settings form posts the whole settings object — keep a body without the new
number valid.

**630 — platform learning section.** Scope seed: `server/routes/admin-learning.js`,
`src/app/pages/platform-dashboard/**`, `src/app/core/services/platform-admin.service.ts`, `dictionary.json`,
tests.

**631 — access.** Scope seed: `server/services/access.js`, `server/routes/{access,auth}.js`,
`server/middleware/{auth,usage}.js`, `server/utils/permissions.js`, `server/models/user.model.js`,
`server/routes/business.js`, `server/test/**` (incl. `invariants.test.js`), `docs/brain/invariants.md`,
`docs/brain/decisions/0032-*.md`. Must cover: every C-ACCESS line; ADR and INV-1 text; `## Architecture Impact`
`INV-1: changes — ADR … — Arch-approved: Human <date>` (only after G1). Traps: `signAccess` is "the one place a
token is signed" — keep it one; `/refresh` runs every 13 minutes; `verifyAccessToken` (log ingest, write-limit
key) reads the payload without the re-check — decide and say what an acting session is there; the dev guest user.

**632 — switcher.** Scope seed: `src/app/core/components/header/**`, `src/app/core/services/{user,permission}.
service.ts`, `src/app/pages/platform-dashboard/**`, `src/app/pages/settings/**` (`SETTINGS_TABS`, an access tab),
`dictionary.json`, `app.config.ts`. Must cover: the switcher only for a user with something to switch to; a
banner on every screen while acting, with "back to my business"; a full state reload on switch.

**633 — diagnosis, server.** Scope seed: `server/routes/{diag,ai/diag}.js`, `shared/schemas/diag/**`,
`server/test/**`.

**634 — diagnosis, screens.** Scope seed: `src/app/pages/diagnosis/**`, `app.routes.ts`, `dictionary.json`,
`app.config.ts`, a `breadcrumbs.md` for the new page folder. Must cover: the invoice queue reusing the import
preview; menu paste and dish linking; the printable report.

**635 — stock, server.** Scope seed: `server/routes/stock.js`, `shared/schemas/units/**` (only if the rule moves),
`server/test/**`.

**636 — count sheet.** Scope seed: `src/app/pages/inventory/components/stock-count/**`, `app.routes.ts`,
`tab-chips.component.ts`, `dictionary.json`, `app.config.ts`. Reuse `app-list-shell`, `app-counter`.

**637 — count by voice.** Scope seed: `server/routes/ai/stock.js`,
`src/app/pages/inventory/components/stock-count/**`, `dictionary.json`, tests. Reuse `app-voice-note`.

## Contract extensions (run)

Workers append here: `- plan NNN · <extension> · why`.
