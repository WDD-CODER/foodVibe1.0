# Modules program plan map — draft for the Planner's Reality Check (2026-11-16)

Source brief: `docs/modules/modules-program-brief.md` (Part 0.5 = decisions D1–D19 and assumptions A1–A7, Part 2 =
cross-cutting rules, Part 3 = specs MP-nn and the Reality Check seeds, Part 4 = rounds and runs).
Verified against origin/main SHA: `396999008e366bb510f75025413fa52024ca09e2` (2026-11-16) — use as `Snapshot:` only if
Step 0 finds no change; otherwise the SHA Step 0 ran on.
Highest ADR 0031, highest migration 0012, next plan number 615 (at that SHA).
Builds on the Front Desk Contracts in `docs/frontdesk/frontdesk-map.md`: C-ACTOR, C-AIUSAGE, C-GUEST.

Status of this file: the rows are `M0`…`M22` until the Planner assigns plan numbers in Step 1 of the brief. After
that, reference plans by NNN only and delete this sentence.

## Plan rows

Size: S / M / L (one Worker session each; an L may be split at drafting). Tier: the builder's starting tier
(`docs/agent/model-routing.md`).

### Wave 0 — foundation (run `mod-0`, alone, first)

| Map# | NNN | Spec | Title | Size · tier | Depends on (must be merged) |
|---|---|---|---|---|---|
| M0 | | all | Register the program once — new schemas, collections, indexes, permission lists, AI feature keys, empty routers and their mounts (C-REGISTRY) | L · build | — |
| M1 | | MP-01 | Modules on the server — `requireModule`, the gate on every covered route, the platform-admin write, existing businesses unchanged (C-MODULES) | M · build | M0 |
| M3 | | MP-02 | Monthly AI cap per business, read from the ledger, enforced before the model call (C-AICAP) | S · build | M1 |
| M4 | | MP-02 | Learning by default — `aiPrivate`, `mayLearnFrom`, the owner switch route removed, the draft trail `aiDrafts` (C-LEARN, C-AIDRAFT) | M · build | M3 |
| M5 | | MP-03, MP-06 | Private file store and audio / PDF model input; works without keys (C-FILES) | M · build | M4 |
| M2 | | MP-01, MP-02 | Modules and AI rules in the browser — `ModuleService`, route guard, navigation, the platform dialog (modules, cap, private), the owner's locked chip | M · build | M1, M3, M4 |

### Wave 1 — field events (module `event_logistics`)

| Map# | NNN | Spec | Title | Size · tier | Depends on |
|---|---|---|---|---|---|
| M6 | | MP-03 | Voice note → transcript on the server, recording kept (C-VOICE) | S · build | M5 |
| M7 | | MP-03 | Notes → checklist draft on the server: numbered questions, positions back, unanswered list (C-LOGX) | M · build | M4 |
| M8 | | MP-03 | Logistics panel: record or paste, review the draft line by line, save; shared `app-voice-note` | M · build (design-light) | M6, M7 |
| M9 | | MP-04 | Loading list: pure builder, printable sheet, ticks on the event (C-LOAD) | M · build | M1 |

### Wave 2 — invoices and prices (always on)

| Map# | NNN | Spec | Title | Size · tier | Depends on |
|---|---|---|---|---|---|
| M10 | | MP-05 | Invoice records and price history written by `apply` in one request (C-INVOICE) | M · build | M4 |
| M11 | | MP-06 | Invoice read: header, PDF, stored file, supplier suggested by tax id (C-INVREAD) | M · build | M5, M10 |
| M12 | | MP-07 | Name memory: own aliases, shared supplier brain, `resolve` before the model (C-ALIAS) | M · build | M11 |
| M13 | | MP-08 | Invoice screen: photo or PDF, header strip, memory first, price change in percent; invoices list | M · build (design-light) | M12 |
| M14 | | MP-08 | Price-rise alert (`priceRiseAlertPct`), impact on recipes and dishes, dashboard card | M · build | M13 |
| M15 | | MP-09 | Platform screen: scan accuracy per flow and model, size of the supplier brain, file-store status | S · build | M12, M2 |

### Wave 3 — access and the consultant

| Map# | NNN | Spec | Title | Size · tier | Depends on |
|---|---|---|---|---|---|
| M16 | | MP-10 | One user, more than one business — grants, active business, switch route, role `consultant`, ADR 0032, INV-1 change (C-ACCESS) | L · judgment | M1, gate G1 |
| M17 | | MP-10 | Business switcher, acting banner, "enter business" from the platform table, the owner's access list | M · build | M16, M2 |
| M18 | | MP-11 | Diagnosis on the server — records, menu-with-prices read, price volatility data (C-DIAG) | M · build | M12, M16 |
| M19 | | MP-11 | Diagnosis screens and the margin report (computed in the browser, printable) | M · build (design-light) | M18, M13, M17 |

### Wave 4 — stock count (always on)

| Map# | NNN | Spec | Title | Size · tier | Depends on |
|---|---|---|---|---|---|
| M20 | | MP-12 | Stock counts on the server — records, draft and final, on-hand, unit conversion (C-STOCK) | M · build | M0 |
| M21 | | MP-12 | Count sheet screen, below-minimum list | M · build | M20 |
| M22 | | MP-12 | Count by voice or text: numbered products, positions back, draft on the sheet | M · build | M21, M6, M8 |

## Runs

`mod-0` = M0, M1, M3, M4, M5, M2 · `mod-events-srv` = M6, M7 · `mod-invoices-srv` = M10, M11, M12 ·
`mod-access-srv` = M16 · `mod-events-ui` = M8, M9 · `mod-invoices-ui` = M13, M14, M15 · `mod-access-ui` = M17 ·
`mod-diag` = M18, M19 · `mod-stock` = M20, M21, M22.

Side by side: the three `-srv` runs (round 2). One at a time: the `-ui` runs, `mod-diag`, `mod-stock`. M20 has no
screen and could join round 2 if its scope stays clear of the three `-srv` runs — decide after the dry run.
Confirm every grouping with `node scripts/plan-order.mjs` and the `/orchestrate` dry run before printing the list.

## Must not run at the same time (write `Parallel: no` against these)

- Every plan of `mod-0` with every other plan of the program: wave 0 edits the shared registries
  (`shared/schemas/entities/index.ts`, `business.schema.ts`, `server/constants/collections.js`,
  `server/constants/ai-features.js`, `server/db.js`, `server/app.js`, `server/routes/ai.js`,
  `server/utils/permissions.js`, `shared/schemas/money-fields.ts`, `shared/schemas/staff-fields.ts`,
  `server/services/gemini-client.js`, `server/routes/admin.js`, `server/routes/generic.js`).
- M1, M3, M4 all edit `server/routes/admin.js`; M3 and M5 both edit `server/services/gemini-client.js` — sequential
  inside `mod-0` (already the row order).
- M10, M11, M12 all edit `server/routes/product-import.js` — sequential inside `mod-invoices-srv`.
- M16 edits `server/middleware/auth.js`, `server/routes/auth.js`, `server/utils/permissions.js`,
  `server/middleware/usage.js`, `server/test/invariants.test.js`, `docs/brain/invariants.md` — alone in its run; no
  other live run may touch those files.
- M9 and M1 both edit `server/routes/events.js` (M1 merges in round 1, so only a re-run can collide).
- M2, M8, M9, M13, M14, M15, M17, M19, M21, M22 all append to `public/assets/data/dictionary.json`,
  `src/app/app.routes.ts`, `src/app/app.config.ts` (icons), `tab-chips.component.ts` — one screen run at a time.
- M8 and M9 both touch `src/app/pages/menu-intelligence/**`; `menu-intelligence.page.ts` is growth-frozen — net
  lines ≤ 0 in both.
- M13 and M14 both edit `src/app/pages/inventory/components/product-import/**` — sequential.
- M2, M15 and M17 all edit `src/app/pages/platform-dashboard/**` — never in two live runs.
- Any open plan that edits `server/routes/ai.js`, `server/routes/generic.js` or
  `src/app/pages/menu-intelligence/**` while a run of this program is live (check 471, 581 and design 373 in Step 0).

## Human gates

- **G1 (before saving M16):** Dandan types `approve arch change INV-1` in the Planner session (he chose this on
  2026-11-16; the gate needs the literal words where the line is written). Then M16 carries
  `Arch-approved: Human <date>` and writes ADR 0032.
- **G2 (M16):** Dandan reads the ADR 0032 text and the new sentence of INV-1 before the plan is saved.
- **G3 (not a gate — the end):** Dandan sets `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
  on Render. Until then every feature works and files are not kept (D16). M5 documents the three names in
  `render.yaml` and `docs/security-go-live.md`.
- **G4:** the updated `docs/frontdesk/pilot-terms-draft.md` goes to Dandan's lawyer (sections 4.2, 7.1, 7.5, 7.6, 7.7).
- Dandan merges each run branch. Every plan's `[human]` Done-when.

## Reality Check deltas

Written by the Planner in Step 0: one line per seed of the brief (`ok` / `changed: …`), then the numbered deltas that
override the brief, in the shape of the Front Desk map.

## Contracts (frozen in Step 1 — copy verbatim into every plan that uses them)

**C-REGISTRY (M0; used by every plan)** — after M0 merges, no plan of this program edits a shared registry file.
M0 creates, with tests (schema round-trips, the collections test, a route test that each empty router answers 404):
- `shared/schemas/modules.ts` (C-MODULES names).
- `businessSchema` gains, all optional: `modules`, `platformHistory`, `aiMonthlyTokenCap`, `aiPrivate`.
  `businessSettingsSchema` gains optional `priceRiseAlertPct` (`> 0`, `≤ 100`); reads fill the default 5 the way
  `BUSINESS_SETTINGS_DEFAULTS` fills the others; a `PUT /business/settings` body without it stays valid.
- `supplierSchema` gains `taxId?` (`^\d{9}$`). `menuEvents.siteLogistics` gains `loaded?` (C-LOAD), added to what
  the events router owns.
- New schema files under `shared/schemas/entities/`, exported from `index.ts` and `SCHEMA_BY_COLLECTION`:
  `invoice.schema.ts`, `price-history.schema.ts`, `invoice-alias.schema.ts`, `supplier-profile.schema.ts`,
  `ai-draft.schema.ts`, `stored-file.schema.ts`, `business-access.schema.ts`, `diagnosis.schema.ts`,
  `stock-count.schema.ts` — shapes as in the Contracts below. A later plan may edit its own schema file.
- `server/constants/collections.js`:

  | name | userData | cloneable | softDelete | routerWrites |
  |---|---|---|---|---|
  | `invoices` | true | false | true | true |
  | `diagnoses` | true | false | false | true |
  | `stockCounts` | true | false | true | true |
  | `priceHistory`, `invoiceAliases`, `supplierProfiles`, `aiDrafts`, `storedFiles`, `businessAccess` | false | false | false | — |

- `server/utils/permissions.js`: `OWNER_ONLY_TYPES` gains `invoices`, `diagnoses`. `shared/schemas/money-fields.ts`:
  `invoices` → `lines[].unitPrice`, `lines[].lineTotal`, `lines[].price`. `shared/schemas/staff-fields.ts`:
  `invoices` → `['supplierName', 'invoiceDate', 'invoiceNumber']`.
- `server/db.js` indexes: the ones named in the Contracts below.
- `server/constants/ai-features.js` gains `logistics_extract`, `invoice_read`, `menu_prices_parse`, `stock_extract`
  (`voice_transcribe` is already there).
- Empty routers (each exports a `Router()` with no route) and their one-line mounts:
  in `server/routes/ai.js` — `router.use('/voice', …ai/voice)`, `'/logistics'` → `ai/logistics`, `'/invoices'` →
  `ai/invoices`, `'/diag'` → `ai/diag`, `'/stock'` → `ai/stock` (files under `server/routes/ai/`);
  in `server/app.js` — `/api/v1/files` → `routes/files.js`, `/api/v1/access` → `routes/access.js`,
  `/api/v1/stock` → `routes/stock.js`, `/api/v1/diag` → `routes/diag.js`, `/api/v1/admin/learning` →
  `routes/admin-learning.js`.
- `docs/brain/invariants.md`: INV-6 `Touches` gains `server/routes/ai/**` (the rule holds: every model call still
  enters through `server/routes/ai.js`); INV-1 `Touches` gains the five new routers. `preserves`.

**C-MODULES (M1, M2; used by M9, M16, M18)**
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
  | `events` | `/api/v1/events/**`; generic types `menuEvents`, `venues` | header link `/menu-library`; chip group `menus`; `/venues`; routes `menu-library`, `menu-intelligence`, `venues` |
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

**C-AICAP (M3)**
- `business.aiMonthlyTokenCap?: number` (integer ≥ 0; absent or `null` = no cap, A2).
- `server/services/ai-cap.js` → `capState(db, businessId, now) → { cap, used, over }`. The month is the calendar
  month in `Asia/Jerusalem` (the `day` field of `aiUsage`); `used` = the sum of `totalTokens` of that month's rows.
  A per-process cache of at most 60 s per business is allowed.
- Enforced in `callGemini`, before the first HTTP call, when `usage.businessId` is a real business: it returns a
  failure of kind `business_cap`, writes one ledger row `ok: false, errorCode: 'business_cap'` with zero tokens,
  and makes no request. `respondFromGeminiFailure` maps it to 429 `{ error: 'ai_monthly_cap_reached' }`.
  `'__platform__'` calls are never capped. Message key `ai_monthly_cap_reached`.

**C-LEARN (M4; used by M12, M15, M18)**
- `business.aiPrivate?: boolean` — platform admin only (C-MODULES platform write). Absent = shared (D8).
- `server/utils/ai-learning.js` → `mayLearnFrom(business) → business?.aiPrivate !== true`. The only test any code
  uses before it (a) copies something into a `'__master__'` pool, (b) lists a business's AI material for the
  platform admin. A private business keeps its own per-business memory and its own drafts.
- `setAiPrivate(id, value)` in `server/services/business.js` replaces `setShareAiExamples`: turning private on
  deletes the business's promoted `GEMINI_SHOTS` copies (`promotedFrom.businessId`) and calls
  `forgetBusiness` (C-ALIAS, a no-op until M12).
- Removed: `PUT /api/v1/business/share-ai-examples`, `shareAiExamplesInputSchema`,
  `BusinessService.updateShareAiExamples`. `business.shareAiExamples` stays in the schema as optional so stored
  documents validate; nothing reads it.
- `GET /api/v1/admin/ai-shots` candidates and `POST …/promote`: every business with `mayLearnFrom` true.
- The owner's card `ai-examples-share` shows one locked chip (shared / private) and a tooltip from a dictionary
  key saying private mode is arranged by contacting FoodVibe. It calls no route.

**C-AIDRAFT (M4; used by M7, M10, M11, M18, M22)**
- Collection `aiDrafts` (server-only): `{ _id, businessId, userId, feature, subject?: { type: 'menuEvent' |
  'invoice' | 'diagnosis' | 'stockCount', id?: string }, input: { text?: string (≤ 20,000), fileId?: string },
  aiDraft, saved?, keptRatio?: number (0–1), status: 'pending' | 'confirmed', at, confirmedAt? }`.
  Index `{ businessId, feature, at }`. At most the newest 500 per business and feature are kept.
- `server/services/ai-drafts.js`: `saveAiDraft(req, { feature, subject?, input, aiDraft }) → draftId` (never
  throws; on failure returns `null` and the feature still answers); `confirmAiDraft(req, draftId, saved, ratio)`
  — `ratio` is a pure function `(aiDraft, saved) → 0..1` owned by the feature (lines saved unchanged / lines
  suggested). A draft of another business answers 404.
- Nothing from `aiDrafts` is returned by a business route except its `_id`.

**C-FILES (M5; used by M6, M11, M13)**
- `server/services/file-store.js`: `isFileStoreConfigured()` (all of `CLOUDINARY_CLOUD_NAME`,
  `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` set); `putPrivateFile(req, { kind: 'invoice' | 'voice', mimeType,
  buffer }) → fileId | null` — `null` when not configured or when the upload fails (one warn log with kind and
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
  provider asset and the document (lazy, same throttle). An invoice file lives as long as its invoice.
- Model input: `callGemini` gains `needsMedia?: 'image' | 'audio' | 'pdf'` (`needsVision: true` keeps meaning
  `'image'`); a model that cannot take the medium is skipped in the chain; ledger rows gain `audioSeconds?` and
  `fileCount?`.
- `GET /api/v1/admin/learning/status` → `{ fileStore: boolean }`.

**C-VOICE (M6; used by M8, M22)**
- `POST /api/v1/ai/voice/transcribe` body `{ audioBase64, mimeType, purpose: 'logistics' | 'stock', durationSec? }`
  → `{ transcript: string (≤ 20,000), fileId: string | null }`. Any signed-in member; `aiLimiter`;
  `feature: 'voice_transcribe'`; `needsMedia: 'audio'`. The prompt asks for the words as spoken, in the spoken
  language, with no summary and no answer to anything said. Silence → 200 with `transcript: ''`.
- The browser stops a recording at 180 seconds.

**C-LOGX (M7; used by M8)**
- `shared/schemas/logistics/visible-items.ts` → `visibleLogisticsItems({ terms, business, event, phase }) →
  LogisticsItemTerm[]` — the questions this event shows: master ∪ the business's own, `removedAt` respected against
  the event's date the way the panel does today, minus `business.hiddenLogisticsKeys`, minus
  `event.siteLogistics.hiddenKeys`, filtered by `event.logistics.environmentType` and `phase`. Pure. The panel
  moves to this function in M8, so there is one rule.
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

**C-LOAD (M9)**
- `shared/schemas/logistics/loading-list.ts` → `buildLoadingList({ equipment, guestCount, answers }) →
  LoadingRow[]`, `LoadingRow = { key, label, source: 'equipment' | 'logistics', quantity, owned?, shortage?,
  section? }`. Pure; used by the browser and by server tests.
- Equipment rows: every live equipment record with a `scalingRule` whose `perGuests > 0` —
  `quantity = min(max(ceil(guestCount / perGuests), minQuantity), maxQuantity ?? ∞)`,
  `shortage = max(0, quantity − ownedQuantity)`. **Trap:** nothing computes `scalingRule` today, so "one per
  `perGuests` guests" is this contract's reading of the field; check the equipment form's labels in Step 0 and
  ask Dandan if they say something else.
- Logistics rows: answers with `status: 'needed'` and `payer` `ours` or `chef`; `quantity` = the answer's
  quantity, else 1; `key` = `itemKey`.
- Ticks: `menuEvents.siteLogistics.loaded?: [{ key, at, by, byName }]` (≤ 600), server-owned, written by
  `PUT /api/v1/events/:id/loading` body `{ key, loaded: boolean }` — any member of the business,
  `requireModule('event_logistics')`, not on a finished event.

**C-INVOICE (M10; used by M11–M14, M18)**
- `invoices`: `{ ...baseDocShape, supplierId?, supplierName, supplierTaxId? (^\d{9}$), invoiceNumber? (≤ 40),
  invoiceDate? ('YYYY-MM-DD'), vatIncluded?, source: 'photo' | 'pdf' | 'text', fileId?, draftId?, supplierKey?,
  lines: [{ printedName (≤ 200), quantity?, unit?, unitPrice?, lineTotal?, price: number | null, needsReview,
  productId?, result: 'created' | 'updated' | 'same_price' | 'no_price' | 'invalid' | 'duplicate' }] (≤ 200) }`.
  Read through the generic API (owner; staff see only the three header fields); written only by `apply`.
- `priceHistory` (server-only): `{ _id, businessId, productId, supplierId ('' = none), price, prevPrice?,
  changePct?, at, by, source: 'invoice' | 'import', invoiceId? }`. `changePct = (price − prevPrice) / prevPrice ×
  100`, two decimals, computed by code. Indexes `{ businessId, productId, at }`, `{ businessId, at }`.
- `POST /api/v1/product-import/apply` body gains optional `invoice: { supplierName, supplierTaxId?,
  invoiceNumber?, invoiceDate?, vatIncluded?, source, fileId?, draftId?, supplierKey?, lines: [{ printedName,
  quantity?, unit?, unitPrice?, lineTotal?, needsReview, row: number }] }` (`row` = index into `rows`). In the same
  request: products as today, one `priceHistory` row per created or changed price, one `invoices` document, and
  `confirmAiDraft` when `draftId` is given. Response gains `invoiceId?`. Without `invoice` the route behaves as
  today, plus the history rows (`source: 'import'`).
- `GET /api/v1/product-import/price-rises?days=60` (owner) → `[{ productId, supplierId, from, to, changePct, at }]`
  — the latest rise per product and supplier at or above the business's `priceRiseAlertPct`.

**C-INVREAD (M11; used by M13, M19)**
- `POST /api/v1/ai/invoices/read` body `{ fileBase64, mimeType, knownCategories? }` — owner or consultant
  (`editMoney` on `products`), checked before `aiLimiter`; `feature: 'invoice_read'`;
  `needsMedia: 'image' | 'pdf'` → `{ header: { supplierName?, supplierTaxId?, supplierPhone?, invoiceNumber?,
  invoiceDate?, vatIncluded? }, supplier: { supplierId?, matchedBy?: 'taxId' | 'phone' | 'name', supplierKey },
  rows: ImportRow[], printed: [{ name, quantity, unit, unitPrice, lineTotal }], truncated, draftId, fileId }`.
- Rows go through the existing `normalizeReceiptRows` (`RECEIPT_MISMATCH_TOLERANCE` 5%, `needsReview`): one
  implementation of the line check, never a block. Header values are copied as printed; a tax id that is not 9
  digits is dropped.
- `server/utils/supplier-key.js` → `supplierKey({ taxId, phone, name })` = `tax:<9 digits>` |
  `phone:<last 9 digits>` | `name:<normalizeProductName(name)>`.
- When an apply carries a tax id and the chosen supplier has none, the apply sets `suppliers.taxId`.

**C-ALIAS (M12; used by M13, M15)**
- `invoiceAliases` (server-only). Own alias: `{ _id, businessId, supplierKey, nameKey, printedName, productId,
  unit?, packQty?, hits, lastAt }`, unique `{ businessId, supplierKey, nameKey }` — the person's latest link wins.
  Shared alias: `{ _id, businessId: '__master__', supplierKey, nameKey, printedName, masterProductId, hits,
  contributors: string[] (≤ 200, never returned), lastAt }`, unique `{ supplierKey, nameKey, masterProductId }`
  among master rows. `nameKey = normalizeProductName(printedName)`.
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

**C-ACCESS (M16; used by M17, M18)**
- `businessAccess` (server-only): `{ _id, userId, businessId, role: 'consultant', grantedBy, grantedByName,
  grantedAt, revokedAt?, revokedBy? }`; unique partial index `{ userId, businessId }` over rows with no
  `revokedAt`. `users` gain `activeBusinessId?`.
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
  removed gets 401 on its very next request and the refresh lands at home.
- `permissions.js`: `consultant` may do everything the owner may, except `manageTeam` and `editSettings`
  (`CONSULTANT_DENIED`). Map every `server/routes/business.js` route to one of the two sides in the plan. The
  platform write (modules, cap, private, front desk status) stays platform admin only.
- Grants: `POST /api/v1/access/grants` body `{ businessId, username }` — platform admin only; the user must
  exist, not be removed, and not already belong to that business; `DELETE /api/v1/access/grants/:id` — platform
  admin, or the owner of that business; `GET /api/v1/access/grants` — the owner's list for his business
  (`name`, `grantedAt`). Every grant and removal is logged with ids only.
- Stamps keep the real person: `createdBy` and `actorOf(req)` are unchanged. `aiUsage` rows keep the active
  `businessId`. `recordUsage` (`server/middleware/usage.js`) skips a request whose token has `acting`.
- INV-1 rule gains one sentence (a user reads and writes a business only as its member, as a consultant with a
  live grant, or as the platform admin acting in it; the business is always taken from the token the server
  signed). ADR `docs/brain/decisions/0032-one-user-more-than-one-business.md` (amends ADR 0023's "one business
  per user"). `Touches` gains `server/services/access.js`, `server/routes/access.js`.
- Browser: `UserService` exposes `homeBusinessId` and `acting`; `PermissionService.can` mirrors the consultant
  rule; a switch reloads the application state from the server.

**C-DIAG (M18; used by M19)**
- `diagnoses`: `{ ...baseDocShape, name, periodDays (default 60, 30–365), menu: [{ name (≤ 200), sellPrice (≥ 0),
  dishId? }] (≤ 300), invoiceIds: string[] (≤ 100), homeBusinessId, status: 'open' | 'done' }`; read through the
  generic API (owner, consultant), written only by the router.
- `/api/v1/diag` (`requireHomeModule('consultant_diag')`; owner, consultant or acting platform admin):
  `POST /`, `PUT /:id/menu`, `PUT /:id/invoices`, `PUT /:id/status`, `GET /:id/data` → `{ diagnosis,
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
  time. `/api/v1/ai/invoices/read` gets its own limiter for this (60 / 15 minutes per user) in M11.

**C-STOCK (M20; used by M21, M22)**
- `stockCounts`: `{ ...baseDocShape, countedAt, status: 'draft' | 'final', source: 'manual' | 'voice' | 'text',
  draftId?, note? (≤ 500), lines: [{ productId, quantity (≥ 0), unit, baseQuantity (≥ 0) }] (≤ 2,000), finalAt?,
  finalBy? }`. Written only by the router; `baseQuantity` is computed by the server.
- `/api/v1/stock`: `POST /counts`, `PUT /counts/:id` (draft only; its creator or the owner),
  `POST /counts/:id/finalize` (its creator or the owner), `GET /on-hand` → `[{ productId, baseQuantity,
  countedAt }]` — per product, the value in the newest final count that lists it.
- Conversion to the base unit uses the product's `baseUnit`, its `purchaseOptions` and the unit registry.
  **Trap:** find where that conversion lives today (Step 0). If it exists only in the browser, move the pure rule
  to `shared/schemas/units/` and use it on both sides — never a second rule.
- `POST /api/v1/ai/stock/extract` body `{ text (1–20,000) }` — any member; `feature: 'stock_extract'` →
  `{ draftId, lines: [{ productId, quantity, unit }], unmatched: [{ spoken, quantity?, unit? }] }`. The server
  sends the numbered names of the business's live products (≤ 800; more → 413 `TOO_MANY_PRODUCTS`), the model
  answers positions; an out-of-range position goes to `unmatched`.

## Planning cards

A card is a seed (brief Step 2). Every path below was seen at `39699900`; verify before use.

**M0 — registry.** Scope seed: `shared/schemas/**`, `server/constants/**`, `server/db.js`, `server/app.js`,
`server/routes/ai.js` (mount lines only), `server/routes/ai/**`, `server/routes/{files,access,stock,diag,
admin-learning}.js`, `server/utils/permissions.js` (the type list only), `docs/brain/invariants.md` (`Touches`),
`server/test/**`. Must cover: every C-REGISTRY line; `pnpm run build:schemas` output; the collections test; no
behaviour change (the whole existing suite green, untouched). Traps: `businessSchema` and the entity schemas are
`z.strictObject` — a stored document must still validate; `SCHEMA_BY_COLLECTION` and `server/generated/schemas`
are generated, never hand-edited; `standards-backend.md` §3 for each `userData` collection. If it will not fit one
session, split into schemas + collections + permissions, then routers + mounts + feature keys.

**M1 — modules, server.** Scope seed: `server/middleware/require-module.js`, `server/routes/{generic,events,
requests,bookings,knowledge,clients,public,business,stats,ai,admin}.js`, `server/test/**`. Must cover: the coverage
table row by row with one test each; the `clients` either-module rule; the public 404; the platform write with
`platformHistory`; `GET /admin/businesses` fields; INV-1 and INV-2 `preserves`. Traps: `generic.js` is 1,437 lines
and INV-1 — add the type gate in one place; the platform admin's own business is gated like any other, `/admin`
routes never; do not gate taxonomy reads.

**M3 — AI cap.** Scope seed: `server/services/{ai-cap,gemini-client,ai-usage}.js`, `server/routes/ai.js`
(`respondFromGeminiFailure` only), `server/routes/admin.js`, `server/test/**`. Traps: `callGemini` must still
throw in tests when `usage.feature` is missing; the cap check must not add a read to a `'__platform__'` call.

**M4 — learning and the draft trail.** Scope seed: `server/utils/ai-learning.js`, `server/services/{business,
ai-drafts}.js`, `server/routes/{business,admin}.js`, `server/test/**`, `src/app/core/services/business.service.ts`
(remove one method). Must cover: C-LEARN and C-AIDRAFT; the removed route answers 404; existing shots tests updated
for the new consent test. Trap: the client card is rewritten in M2 — M4 only removes the service method the card
calls, so M2 must follow in the same run.

**M5 — files and media.** Scope seed: `server/services/{file-store,gemini-client,ai-usage}.js`,
`server/routes/{files,admin-learning}.js`, `server/jobs/retention.js`, `render.yaml`, `docs/security-go-live.md`,
`server/test/**`. Must cover: every C-FILES line; all tests on the fake store; the not-configured path. Traps: no
secret in code, logs or tests; a file's bytes never enter MongoDB; Cloudinary's API is read from its documentation
at planning time.

**M2 — modules and AI rules, browser.** Scope seed: `src/app/core/services/module.service.ts`,
`src/app/core/guards/**`, `src/app/core/components/{header,tab-chips}/**`, `src/app/app.routes.ts`,
`src/app/pages/platform-dashboard/**`, `src/app/pages/metadata-manager/components/ai-examples-share/**`,
`src/app/core/services/platform-admin.service.ts`, `dictionary.json`, `app.config.ts`. Must cover: every browser
cell of the coverage table; the AI entry points hidden without `ai_create`; one platform dialog for modules, cap
and private with a required reason; a "modules" column and "AI this month / cap" in the table; the locked chip.
Reuse: `front-desk-admin-dialog` is the family to follow. Trap: `header.component.spec.ts` and
`tab-chips.component.spec.ts` assert the link lists.

**M6 — transcribe.** Scope seed: `server/routes/ai/voice.js`, `server/test/**`. Traps: the audio never reaches a
log; a fake model in tests; check the model chain really has a model that takes audio (`needsMedia`).

**M7 — extract.** Scope seed: `shared/schemas/logistics/**`, `server/routes/ai/logistics.js`, `server/test/**`.
Must cover: every C-LOGX server rule with a fixture; the prompt in English with the note in the `user` part; the
event document byte-identical after a call. Trap: read how the panel filters questions today
(`event-logistics-panel.component.ts`) before writing `visibleLogisticsItems` — the function must give the same
list.

**M8 — the panel.** Scope seed: `src/app/pages/menu-intelligence/components/event-logistics-panel/**`,
`src/app/shared/voice-note/**`, `src/app/core/services/gemini.service.ts`, `dictionary.json`, `app.config.ts`,
`docs/brain/component-families.md`. Must cover: record or paste; draft as a list with accept / edit / drop per
line; conflicts shown beside the current answer and off by default; ad-hoc suggestions; the "still to check"
list; save through the existing route, then confirm the draft. `app-voice-note` is a new family (rung 4, why: no
audio piece exists). Traps: the panel is 417 lines — the draft view is its own child component;
`menu-intelligence.page.ts` net lines ≤ 0; no confirmation dialog nobody asked for.

**M9 — loading list.** Scope seed: `shared/schemas/logistics/loading-list.ts`, `server/routes/events.js`
(one route), `src/app/pages/menu-intelligence/components/loading-list/**`, `dictionary.json`, `app.config.ts`,
tests. Trap: the equipment-rule reading (C-LOAD) — settle it in Step 0.

**M10 — invoice records.** Scope seed: `server/routes/product-import.js`, `server/test/**`. Must cover: C-INVOICE;
INV-3 (one request); the existing apply tests unchanged.

**M11 — invoice read.** Scope seed: `server/routes/ai/invoices.js`, `server/utils/supplier-key.js`,
`server/routes/product-import.js` (tax id on apply), `server/test/**`. Traps: reuse `normalizeReceiptRows`; the
existing prompt tells the model to skip the header — the new prompt is written from scratch in English.

**M12 — memory.** Scope seed: `server/services/invoice-memory.js`, `server/routes/product-import.js`,
`server/services/business.js` (`forgetBusiness` call), `server/test/**`. Must cover: C-ALIAS; the two-business
test; the private test; the no-price schema test. Trap: `_masterId` of an imported product is its own id.

**M13 — invoice screen.** Scope seed: `src/app/pages/inventory/components/product-import/**`,
`src/app/pages/inventory/components/invoices-list/**`, `src/app/core/services/{gemini,product-import}.service.ts`,
`app.routes.ts`, `tab-chips.component.ts`, `dictionary.json`, `app.config.ts`. Must cover: photo or PDF; header
strip; `resolve` before `matchWithAi_`; percent change; the list with the signed file link. Trap: the component is
416 lines and its spec 530 — split the header strip out.

**M14 — alert and impact.** Scope seed: `server/routes/product-import.js` (`price-rises`),
`src/app/pages/settings/components/business-settings-tab/**`,
`src/app/pages/inventory/components/product-import/**`, `src/app/pages/dashboard/components/**`,
`dictionary.json`, tests. Trap: the settings form posts the whole settings object — keep a body without the new
number valid.

**M15 — platform learning section.** Scope seed: `server/routes/admin-learning.js`,
`src/app/pages/platform-dashboard/**`, `src/app/core/services/platform-admin.service.ts`, `dictionary.json`,
tests.

**M16 — access.** Scope seed: `server/services/access.js`, `server/routes/{access,auth}.js`,
`server/middleware/{auth,usage}.js`, `server/utils/permissions.js`, `server/models/user.model.js`,
`server/routes/business.js`, `server/test/**` (incl. `invariants.test.js`), `docs/brain/invariants.md`,
`docs/brain/decisions/0032-*.md`. Must cover: every C-ACCESS line; ADR and INV-1 text; `## Architecture Impact`
`INV-1: changes — ADR … — Arch-approved: Human <date>` (only after G1). Traps: `signAccess` is "the one place a
token is signed" — keep it one; `/refresh` runs every 13 minutes; `verifyAccessToken` (log ingest, write-limit
key) reads the payload without the re-check — decide and say what an acting session is there; the dev guest user.

**M17 — switcher.** Scope seed: `src/app/core/components/header/**`, `src/app/core/services/{user,permission}.
service.ts`, `src/app/pages/platform-dashboard/**`, `src/app/pages/settings/**` (`SETTINGS_TABS`, an access tab),
`dictionary.json`, `app.config.ts`. Must cover: the switcher only for a user with something to switch to; a
banner on every screen while acting, with "back to my business"; a full state reload on switch.

**M18 — diagnosis, server.** Scope seed: `server/routes/{diag,ai/diag}.js`, `shared/schemas/diag/**`,
`server/test/**`.

**M19 — diagnosis, screens.** Scope seed: `src/app/pages/diagnosis/**`, `app.routes.ts`, `dictionary.json`,
`app.config.ts`, a `breadcrumbs.md` for the new page folder. Must cover: the invoice queue reusing the import
preview; menu paste and dish linking; the printable report.

**M20 — stock, server.** Scope seed: `server/routes/stock.js`, `shared/schemas/units/**` (only if the rule moves),
`server/test/**`.

**M21 — count sheet.** Scope seed: `src/app/pages/inventory/components/stock-count/**`, `app.routes.ts`,
`tab-chips.component.ts`, `dictionary.json`, `app.config.ts`. Reuse `app-list-shell`, `app-counter`.

**M22 — count by voice.** Scope seed: `server/routes/ai/stock.js`,
`src/app/pages/inventory/components/stock-count/**`, `dictionary.json`, tests. Reuse `app-voice-note`.

## Contract extensions (run)

Workers append here: `- plan NNN · <extension> · why`.
