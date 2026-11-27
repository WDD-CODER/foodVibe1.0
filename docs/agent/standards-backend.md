---
paths:
  - "server/**"
---

# Backend Persistence Standards

## 0 — Tech Stack (verified 2026-04-11)

| Layer | Technology | Version | Notes |
|---|---|---|---|
| **Runtime** | Node.js | v22.22.2 | âš ï¸ v22+ has a DNS SRV bug on Windows — `index.js` sets `dns.setServers(['8.8.8.8','8.8.4.4'])` at the top as a workaround |
| **Framework** | Express.js | 4.21.2 | |
| **ODM** | Mongoose | 8.9.2 | |
| **Database** | MongoDB Atlas | managed (M0 free tier) | SRV connection string: `mongodb+srv://` |
| **Auth** | jsonwebtoken | 9.0.2 | |
| **Security** | helmet | 8.1.0 | |
| **Rate limiting** | express-rate-limit | 8.3.1 | |
| **Config** | dotenv | 16.4.5 | |

> When suggesting Node.js changes or debugging DNS/network issues, always check this version first.

> Load this file when: adding a new entity type, adding new fields to an existing entity, changing CRUD logic in a data service, creating a new data service, or building any UI that reads/writes persisted data.

> **Security**: Backend API security rules (JWT, rate-limiting, PBKDF2, etc.) live in `standards-security.md §9–17`. Do not duplicate them here.

---

## 1 — Collection Registry

> **Canonical reference.** `BACKUP_ENTITY_TYPES` in `src/app/core/services/async-storage.service.ts` is the code-level source of truth. This table must stay in sync with it.

| `entityType` key | Domain | Purpose |
|---|---|---|
| `PRODUCT_LIST` | Kitchen | Ingredients / raw products |
| `RECIPE_LIST` | Kitchen | Recipes |
| `DISH_LIST` | Kitchen | Plated dishes |
| `KITCHEN_SUPPLIERS` | Kitchen | Supplier directory |
| `EQUIPMENT_LIST` | Kitchen | Kitchen equipment |
| `VENUE_PROFILES` | Venue | Event venue profiles |
| `MENU_EVENT_LIST` | Menu | Menu events |
| `clients` | CRM | Clients (ADR 0027, ADR 0031): owner-only to write, staff read `name`, `phone`, `tags`, `kinds`. Soft delete (Trash). Server-owned fields, dropped from every generic write (`CLIENT_SERVER_FIELDS`): `phoneNormalized`, `phoneKey`, `kinds`, `lifecycle`, `firstSeenAt`, `lastContactAt`, `counters`, `waId`, `mergedInto`, `doNotContact` |
| `frontDeskProfiles` | Front desk | The business's one front desk profile (plan 548, C-PROFILE): owner-only to write (`editFrontDesk`), not cloneable, hard delete. Unique `businessId` (409 `PROFILE_EXISTS`) and `slug` (409 `SLUG_TAKEN`). `PROFILE_SERVER_FIELDS` (`status`, `whatsapp`) are dropped from every generic write; reads never carry `whatsapp.phoneNumberId` |
| `knowledgeItems` | Front desk | Short facts the business knows about itself (plan 554, C-KB): `topic`, `question`, `answer`, `status` (`draft` / `approved`), `source`, `visibility` (`public` / `internal`), `variations?`. Owner-only to write (`OWNER_ONLY_TYPES`), staff read all fields. Not cloneable, no clone lineage, soft delete (Trash). Only `approved` + `public` items reach a customer, through `services/knowledge.js` `publicFacts()` |
| `requests` | Front desk | Customer requests (plan 549, C-REQUEST): router writes only (`routerWrites`; generic POST / PUT / DELETE → 405 `USE_ROUTER`), generic GET lists and runs lazy expiry. Any member (`manageRequests`). Not cloneable, hard delete. `REQUEST_SERVER_FIELDS` are written only by `/api/v1/requests` |
| `bookings` | Front desk | Calendar records of an approved table, tasting or consultation (plan 549, C-REQUEST): router writes only (`routerWrites`), generic GET reads. Any member (`manageRequests`). Not cloneable, hard delete. `BOOKING_SERVER_FIELDS` are written only by `/api/v1/bookings` |
| `decisionLog` | Front desk | One row per approve / decline / ask on a request (plan 550, C-REQUEST): ids, enums and numbers only, never a name, phone or free text. Server-only (not in the generic API), never cloned, `backup: false` (the collections test ties backup to userData). Index `decisionlog_business_at`. Read later by stats (559, 563) |
| `aiUsage` | System | Server-only AI ledger (plan 566, C-AIUSAGE): one row per real Gemini HTTP call — business, feature, model, tokens, latency, outcome, estimated cost; `outcome` (`accepted` / `rejected`, plan 580) and `rejectCode`, a missing `outcome` means accepted. `errorCode: 'business_cap'` = refused by the monthly cap, no call made (plan 617). Not in the generic API, never cloned, no prompt or reply text. Read only by `GET /api/v1/admin/ai-usage` |
| `invoices` | Modules | An approved supplier invoice (plan 615, C-INVOICE): header, source, `lines[]` with prices. Router writes only (`routerWrites`; generic POST / PUT / DELETE → 405 `USE_ROUTER`), generic GET reads. Owner only (`OWNER_ONLY_TYPES`); staff read `supplierName`, `invoiceDate`, `invoiceNumber` only; line prices are money fields. Not cloneable, `softDelete: false`, `backup: true`. Index `invoices_business_created`. Filled by plan 625 |
| `diagnoses` | Modules | A consultant's menu-and-margin diagnosis (plan 615, C-DIAG): menu with selling prices, VAT, invoice ids, `status`. Router writes only (`routerWrites`); generic GET reads. Owner only; staff read `name`, `status` only. Written only by `server/routes/diag.js` (plan 633). Not cloneable, `softDelete: false`, `backup: true`. Index `diagnoses_business_created` |
| `stockCounts` | Modules | A stock count (plan 615, C-STOCK): `status` draft / final, `lines[]` with `baseQuantity` computed by the server. Router writes only (`routerWrites`); generic GET reads, any member. Not cloneable, `softDelete: false`, `backup: true`. Index `stock_counts_business_status_counted`. Filled by plan 635 |
| `priceHistory` | Modules | One row per created or changed price (plan 615, C-INVOICE). Server-only (generic API 403), never cloned, `backup: false`. Indexes `price_history_business_product_at`, `price_history_business_at`. Written by plan 625 |
| `invoiceAliases` | Modules | Printed invoice names linked to products, own rows and `'__master__'` shared rows (plan 615, C-ALIAS): no price, quantity or date. Server-only. Partial unique indexes `invoice_alias_own_unique`, `invoice_alias_shared_unique`. Written by plan 627 |
| `supplierProfiles` | Modules | What the platform learned about a supplier, `_id` = supplier key (plan 615, C-ALIAS). Server-only, shared, read by `_id` (no index). Written by plan 627 |
| `aiDrafts` | Modules | What the model suggested and what the person kept (plan 615, C-AIDRAFT). Server-only, never returned except its `_id`. Index `ai_drafts_business_feature_at`. Its only writer is `server/services/ai-drafts.js` (`saveAiDraft` / `confirmAiDraft`, plan 618); at most the newest 500 per business and feature |
| `storedFiles` | Modules | Private files kept at the provider, invoices and recordings (plan 615, C-FILES). Server-only. Index `stored_files_business_kind`. Written by plan 619, only through `server/services/file-store.js` |
| `businessAccess` | Modules | A consultant's grant into a business (plan 615, C-ACCESS). Server-only. Unique index `business_access_live_unique` on `userId, businessId, revokedAt` (one live grant per user and business). Plan 631: read and written only by `server/services/access.js` (a live row has no `revokedAt`; removing sets `revokedAt`, `revokedBy`); never reachable through the generic API |
| `floorPlans` | Restaurant | A business's one floor plan (plan 662, C-FLOOR): `grid`, `areas[]`, `tables[]`, `joins[]`, each with a stable `key`. Router writes only (`routerWrites`), generic GET reads, gated by module `tables`. Owner only to write (`OWNER_ONLY_TYPES`), staff read all fields. Not cloneable, `softDelete: false`, `backup: true`. Unique index `floor_plans_business_unique`. Filled by plans 664 and 667 |
| `waitlistEntries` | Restaurant | One party on a day's waiting list (plan 662, C-WAIT). Router writes only (`routerWrites`), generic GET reads, gated by module `tables`; any member. Not cloneable, `softDelete: false`, `backup: true`. Index `waitlist_business_date_status`. Filled by plan 673 |
| `tableHolds` | Restaurant | One claimed cell of one table for one booking (plan 662, C-HOLD, INV-7, ADR 0033). Server-only. Unique index `table_holds_cell_unique` on `businessId, tableKey, cell` is the only guard against two bookings on one table at one time; index `table_holds_booking`. Written by plan 667 |
| `conversations` | Restaurant | One chat with one guest (plan 662, C-CONV): `channel` `sim` / `whatsapp`, `status`, `liveKey` while open. Server-only. Partial unique index `conversations_live_key_unique`; index `conversations_business_last`. Filled by plan 675; `run`: the lease of the working assistant run (plan 753) |
| `messages` | Restaurant | One message of a conversation (plan 662, C-CONV). Server-only. Unique index `messages_provider_unique` on `businessId, providerMessageId`; index `messages_conversation_at`. Filled by plan 675 |
| `assistantRuns` | Restaurant | One run of the front-desk assistant, step by step (plan 752, C-RUNS). Server-only. Indexes `assistant_runs_business_started`, `assistant_runs_conversation`, TTL `assistant_runs_ttl` (30 days) |
| `GEMINI_SHOTS` | System | Recipe AI few-shot examples (`ai.js` only, plan 582/600). Per business (`businessId`); `status` `pending` / `approved` / `rejected`: the AI window saves `pending` with a client `shotKey` on continue, `POST /ai/shots/confirm` makes it `approved` once the recipe is saved (`aiDraft` = the AI's original, `draft` = as saved, `keptRatio`, `recipeId`, `confirmedAt`). `keptRatio` is the closeness score (plan 612, `draftCloseness`): the mean of type, yield, names and amounts, 0–1; the admin list recomputes it from `aiDraft` and `draft` when both are stored. `__master__` shots are the shared pool the platform admin curates: a copy of an approved shot of a business that is not private (`businesses.aiPrivate`, `mayLearnFrom`), with `promotedFrom { businessId, shotId }`, `promotedBy`, no business name. Prompts take the business's own approved shots first, the shared ones fill the rest. |
| `VERSION_HISTORY` | System | Schema/version snapshots |
| `activity_log` | System | Activity log entries (`ACTIVITY_STORAGE_KEY`) |
| `KITCHEN_UNITS` | Registry | Unit of measure registry |
| `KITCHEN_PREPARATIONS` | Registry | Preparation method registry |
| `KITCHEN_CATEGORIES` | Registry | Category registry |
| `KITCHEN_ALLERGENS` | Registry | Allergen registry |
| `KITCHEN_LABELS` | Registry | Label registry |
| `MENU_TYPES` | Registry | Menu type registry |
| `MENU_SECTION_CATEGORIES` | Registry | Menu section category registry |

**22 entity types total.**

**User terms acceptance (plan 584).** The `users` document (not an entity type) holds `termsAcceptedVersion`, `termsAcceptedAt`, `termsAcceptedIp`, written only by `server/routes/auth.js` (`POST /signup`, `POST /accept-terms`); the client sees only the version. Any change to the text in `public/assets/legal/terms.he.json` needs a new `version` and `sectionsHash` (CI checks the hash); every user then accepts again at the next sign-in.

---

## 2 — When This Applies

Load this standard when a plan or feature involves any of:

- Adding a new entity type
- Adding new fields to an existing entity
- Changing CRUD logic in a data service
- Creating a new data service
- Building any UI that reads or writes persisted data

---

## 3 — New Collection Checklist

When a feature needs a new persisted entity type:

1. Add the Zod schema to `shared/schemas/entities/<name>.schema.ts` (`z.strictObject({ ...baseDocShape, ... })`), import and export it in `shared/schemas/entities/index.ts`, and register it in `SCHEMA_BY_COLLECTION` (INV-4: the server validates every generic write against it). Run `npm run build:schemas`.
2. Add the entry to `COLLECTIONS` in `server/constants/collections.js`. Every list the server uses derives from its flags: `userData` (reachable through `/api/v1/data/:type`), `cloneable` (copied to a new business; a cloneable doc carries `_masterId` / `_userModified`, a non-cloneable one must not), `backup`, `searchable` (lean `/search` endpoint) and `softDelete` (delete stamps `deletedAt`, Trash lists it; plan 407 / ADR 0022). The key is the camelCase collection name.
3. Add the TypeScript model to `src/app/core/models/` and a data service extending `BaseEntityDataService`.
4. **Generic routes need no new code** — `server/routes/generic.js` calls `mongoose.connection.db.collection(type)` directly, scopes every query by `businessId` (`scopeFilter`) and checks permissions with `assertCan`. Add per-type rules only where the type needs them: owner-only writes (`OWNER_ONLY_TYPES` in `server/utils/permissions.js`), a trimmed staff read (`STAFF_READ_FIELDS` in `shared/schemas/staff-fields.ts`), money fields (`shared/schemas/money-fields.ts`).
5. Add a server test that covers the owner path, the staff path and a second business (`server/test/cross-business.test.js` lists a body for every type).
6. If the new entity needs a dedicated endpoint beyond generic CRUD, add it to `server/routes/` and document it in this file.
7. **Retention and erase (plan 558).** A new collection that holds a customer's personal data (names, phones, messages) joins `server/jobs/retention.js` (a lazy delete after its retention period) and `server/scripts/erase-client.js` (`planErase` / `runErase`), in the same plan. Logs never carry phones, names or tokens.

---

## 4 — Existing Feature Persistence Check

When modifying an existing feature:

- Identify which `entityType` the feature reads/writes (use the registry table above)
- Confirm the data service already handles the CRUD path
- **Adding new fields**: no backend migration needed (schema-less `Mixed` storage) — update the TypeScript model only
- **Changing persisted data shape**: consider backward compatibility for existing documents in both localStorage and MongoDB

---

## 5 — Backend API Contract

Write routes (`POST`/`PUT`/`DELETE`) require `Authorization: Bearer <token>`. `GET` reads
are intentionally public/optional-auth (`optionalToken` middleware): an authenticated
request returns the caller's business's documents (every member of a business shares one copy;
scoping goes through `server/utils/business-scope.js`, never `userId`); an anonymous request returns `__master__`
(shared catalog) documents. This is a deliberate product decision (confirmed 2026-09-29,
Plan 321 Phase 1) — not the drift it used to look like against an earlier, incorrect
version of this section (and of `standards-security.md §9`, corrected the same day).

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/api/v1/data/:type` | optional | List all — authed: the caller's business's docs (taxonomy: master ∪ the business's); anonymous: `__master__` docs |
| `GET` | `/api/v1/data/:type/:id` | optional | Get one — same auth split as above |
| `GET` | `/api/v1/data/:type/search` | optional | Lean prefix-match typeahead, `SEARCHABLE_ENTITY_TYPES` only |
| `GET` | `/api/v1/data/:type/count` | optional | Lightweight count, `filter=lowStock\|unapproved` |
| `GET` | `/api/v1/stats/report` | required | Plan 568: the business report (`months=3\|6\|12`, default 6): measured monthly series, first-30-days vs latest-30-days, rule-based findings. Owner only (staff 403); `businessId` only for the platform admin (others 403, unknown 404); no client names or phones |
| `GET` | `/api/v1/stats/frontdesk` | required | Plan 559: front desk numbers for `from`/`to` (Israel dates, default last 7 days, range ≤ 366 days else 400): requests by channel and kind, after-hours share, outcomes, decline reasons, median minutes to decision, no-show rate, events from requests, owner estimates. Owner only (staff 403); `businessId` only for the platform admin (others 403, unknown 404); test requests never count; no names or phones |
| `GET` | `/api/v1/admin/frontdesk-stats` | platform admin | Plan 559: one row per business (`businessId, name, requests, afterHoursPct, approved, declined, medianMinutesToDecision, noShowRatePct, eventsFromRequests`), default last 30 days; `format=csv` downloads it (`text/csv`, `Content-Disposition: attachment`). Business names and numbers only |
| `POST` | `/api/v1/data/:type` | required | Create. Server generates `_id` unless the body already supplies one (Plan 321 Phase 1 — a client-supplied id is still honored, e.g. `appendExisting`/trash-restore) |
| `PUT` | `/api/v1/data/:type/:id` | required | Replace one — mirrors `StorageService.put()` |
| `PUT` | `/api/v1/data/:type/:id/push-to-master` | required | Platform admin only (`requirePlatformAdmin`, `isPlatformAdmin` in the token) — as are delete-from-master, purge-ingredient-everywhere and shared-term writes |
| `PUT` | `/api/v1/data/:type` | required | Replace all (requires `X-Confirm-Replace: true` header) — restricted (Plan 321 Phase 1) to `REPLACEABLE_TYPES` in `generic.js`, not every entity type |
| `DELETE` | `/api/v1/data/:type/bulk` | required | Remove many by id |
| `DELETE` | `/api/v1/data/:type/:id` | required | Remove one |
| `POST` | `/api/v1/ai/shots/confirm` | required | Plan 600: `{ shotKey, draft, recipeId }` — the caller's pending recipe example becomes approved with the saved draft; 404 when none, 400 on a bad draft or instruction-like text. Calls no AI. `POST /ai/shots` takes `status` `pending` (needs `shotKey`, 8-64 chars) or `rejected` only. |
| `GET` `POST` `DELETE` | `/api/v1/admin/ai-shots`, `/admin/ai-shots/:id/promote`, `/admin/ai-shots/shared/:id` | platform admin | Plan 600: list `{ candidates, shared }`; promote an approved shot of a business that is not private into the pool (plan 618, `mayLearnFrom`) (409 `not_shared` / `already_shared`); remove a shared copy. |
| `GET` | `/api/v1/admin/ai-usage` | platform admin | Plan 566: AI call totals `?from&to&groupBy=business|feature|model|day&businessId&format=csv` (default: this Jerusalem month). Errors: `BAD_GROUP_BY`, `BAD_RANGE` (366 days max). Rows carry `failures` per reason (plan 580) |
| `PUT` | `/api/v1/events/:id/stage` | required | Plan 442: move an event to another stage `{ stage, reason?, reasonText? }`. C-PERM `changeStage` (owner, or the event's creator). Errors: `BAD_STAGE`, `EVENT_FINISHED` (409), `USE_FINISH`, `NOT_CLOSED_FROM_STAGE`, `REASON_REQUIRED`, `DATE_REQUIRED` |
| `POST` | `/api/v1/events/:id/notes` | required | Plan 442: add a note `{ text }` (1 to 2,000 chars; `NOTE_EMPTY`, `NOTE_TOO_LONG`). C-PERM `addNote` (any member) |
| `PUT` / `DELETE` | `/api/v1/events/:id/notes/:noteId` | required | Plan 442: edit (`editedAt` set) or delete a note - its author only (403 otherwise) |
| `PUT` | `/api/v1/events/:id/logistics` | required | Plan 519: save site-logistics answers `{ answers?, environmentType?, venueProfileId?, meetingAt?, meetingWith?, phaseDone? }`, merged and stamped (`by`/`at`) by the server. C-PERM `editLogistics` (owner only). Errors: `BAD_LOGISTICS`, `EVENT_FINISHED` (409) |
| `POST` | `/api/v1/requests` | required | Plan 549: record a phone request `{ kind, clientId? | guestName + guestPhone, wanted, answers? }`; finds or creates the client, runs `qualify`, 201. C-PERM `manageRequests` (any member). Errors: `BAD_REQUEST_INPUT` (400), `NO_PROFILE` (409), `CLIENT_NOT_FOUND` (404) |
| `PUT` | `/api/v1/requests/:id/status` | required | Plan 549: move a request `{ status, note? }` along `new | qualified | needs_info` → `qualified | needs_info | cancelled`. Errors: `BAD_STATUS`, `STATUS_CHANGED` (409) |
| `PUT` | `/api/v1/requests/:id/wanted` | required | Plan 549: edit what the customer wants `{ wanted, answers? }`, re-qualified by the rules; only while open. Errors: `ALREADY_DECIDED`, `NO_PROFILE`, `STATUS_CHANGED` (409) |
| `POST` | `/api/v1/requests/:id/approve` | required | Plan 550: approve once `{ wanted?, note? }`: claims the request, creates a `menuEvents` inquiry (kind event, via `buildNewEventDoc`) or a confirmed booking, updates the client's kinds and counters, writes a `decisionLog` row; 200 `{ request, outcome }`. C-PERM `manageRequests`. Errors: `ALREADY_DECIDED` (409), `BAD_REQUEST_INPUT`, `MISSING_BOOKING_FIELDS` (400) |
| `POST` | `/api/v1/requests/:id/decline` | required | Plan 550: decline `{ reason, text? }` (`reason` in `DECLINE_REASONS`, `text` at most 500), stores `decline`, writes a `decisionLog` row. Errors: `BAD_REASON`, `BAD_REQUEST_INPUT` (400), `ALREADY_DECIDED` (409) |
| `GET` | `/api/v1/bookings/day?date=YYYY-MM-DD` | required | Plan 550: the business's non-cancelled bookings of that day by `startAt`, and `coversByHour` (party sizes of confirmed / seated / finished bookings by start hour). Error: `BAD_DATE` (400) |
| `PUT` | `/api/v1/bookings/:id/status` | required | Plan 549: `confirmed → seated → finished`, `confirmed → no_show` (only after `startAt`; adds 1 to the client's `counters.noShows`), `confirmed | seated → cancelled`. Errors: `BAD_STATUS`, `STATUS_CHANGED` (409) |
| `POST` | `/api/v1/diag` | required | Plan 633 (C-DIAG): create a diagnosis in the active business `{ name, periodDays?, pricesIncludeVat?, vatPct? }` → 201. Gate: `requireHomeModule('consultant_diag')` (the consultant's HOME business), then C-PERM `editMoney` on `diagnoses` (owner, consultant, acting platform admin; staff 403). Errors: `MODULE_OFF` (403), `Validation failed` (400), 404 for an id of another business |
| `PUT` | `/api/v1/diag/:id/menu` | required | Plan 633: replace `menu` `{ menu, draftId?, pricesIncludeVat?, vatPct? }`; confirms the AI draft. Errors: `UNKNOWN_DISH` (400), `DIAGNOSIS_DONE` (409) |
| `PUT` | `/api/v1/diag/:id/invoices` | required | Plan 633: replace `invoiceIds` `{ invoiceIds }`. Errors: `UNKNOWN_INVOICE` (400), `DIAGNOSIS_DONE` (409) |
| `PUT` | `/api/v1/diag/:id/status` | required | Plan 633: `{ status: 'open' | 'done' }` (reopen is one call) |
| `GET` | `/api/v1/diag/:id/data` | required | Plan 633: `{ diagnosis, volatility: [{ productId, supplierId, min, max, movePct, points }] }` from `priceHistory` of the last `periodDays` (at most 20,000 rows; warn `diag.data.history_capped`) |
| `POST` | `/api/v1/ai/diag/menu` | required | Plan 633: `{ text }` (1–20,000) → `{ items: [{ name, sellPrice | null }], draftId }`; feature `menu_prices_parse`; same gates as `/diag`, then the AI limiter. Errors: `TEXT_REQUIRED`, `TEXT_TOO_LONG` (400), `ai_bad_reply` (502), `ai_monthly_cap_reached` (429) |
| `POST` | `/api/v1/clients/:id/merge` | owner | Plan 551: fold a duplicate client into another `{ intoId }` in one request: re-keys `clientId` on `menuEvents`, `requests`, `bookings` and `conversations` (when it exists) of the business, sums counters, unions kinds / tags, stamps `mergedInto` + `deletedAt` on the merged-away client and unsets its `liveKey`; 200 `{ ok, client, moved }`. C-PERM `edit` on `clients` (owner). Errors: `SAME_CLIENT` (400), `ALREADY_MERGED`, `TARGET_NOT_LIVE` (409), 404 for an id of another business |
| `PUT` | `/api/v1/clients/:id/do-not-contact` | required | Plan 551 (R-02): `{ on, reason? }`. On: any member (`manageRequests`), `reason` 1–200 chars, stores `doNotContact { at, reason, via: 'member' }`; off: owner only, removes it. Returns the client (staff: trimmed to `STAFF_READ_FIELDS`). Errors: `REASON_REQUIRED`, `BAD_BODY` (400) |
| `POST` | `/api/v1/ai/knowledge-import` | owner | Plan 554: `{ text }` or `{ url }` (exactly one, else 400 `TEXT_OR_URL`; text over 20,000 chars 400 `TEXT_TOO_LONG`; private-network url 400; fetch failure 502 / no text 422). One metered Gemini call (`knowledge_import`) stores up to 60 `draft` / `ai_import` items; 201 `{ items, dropped }`. `aiLimiter`; staff 403 |
| `PUT` | `/api/v1/knowledge/approve` | owner | Plan 554: `{ ids }` (1–200, else 400 `NO_IDS` / `TOO_MANY_IDS`): one `updateMany` moves the caller business's live `draft` items to `approved`; 200 `{ approved }`. C-PERM `edit` on `knowledgeItems`; staff 403 |
| `GET` | `/api/v1/business` | required | The caller's `businesses` document (any member) |
| `PUT` | `/api/v1/business/baseline` | owner | Plans 431, 567: the opening baseline, whole replace, `filledAt` server-set. Every field optional: four card numbers plus eleven kitchen and front desk estimates (`BASELINE_KITCHEN_FIELDS`, `BASELINE_FRONTDESK_FIELDS`); `hasBaseline` looks at the card fields only |
| `POST` | `/api/v1/business/front-desk-intake` | owner | Plan 556: the onboarding form in one save. Strict body `{ businessType, profile, knowledge[≤60], baseline? }` (`frontDeskIntakeSchema`: never `status`, `whatsapp` or `assistant.level`, else 400). Creates the profile from `templateFor(type)` as `draft` (400 `SLUG_REQUIRED`, 409 `SLUG_TAKEN`) or merges over it; knowledge: new → `draft`, a `draft` with the same question is updated, an `approved` one is left (`skipped`); baseline only when a number is filled (D15) and the caller may `editSettings` (plan 631: a consultant gets `skipped`). 200 `{ profileId, knowledge: { created, updated, skipped }, baseline: 'saved' \| 'skipped' }`. C-PERM `editFrontDesk`; staff 403 |
| `GET` | `/api/v1/business/setup-status` | owner | Plans 431, 556: the five setup counts plus `frontDesk: { businessType, items: [{ key, done }], done, total }` from `services/front-desk-setup.js` (`businessType: null` and no items while there is no profile; never a baseline item). The platform admin's `GET /admin/businesses` rows carry `frontDesk: { status, done, total } \| null` from the same service |
| `PUT` | `/api/v1/admin/businesses/:id/front-desk` | platform admin | Plan 557: strict body `{ status?, assistantLevel?: 0\|1, plan?: pilot\|basic\|pro, reason }` (`frontDeskAdminUpdateSchema`; one of the three, reason 1–200, else 400 with `issues`). 404 `Business not found`, 404 `NO_PROFILE`. One `updateOne` on the profile (`status`, `assistant.level`, `updatedAt`, `$push` `adminHistory` `{ at, by, byName, … reason }` last 50) and, with `plan`, `business.frontDeskPlan`. Log `admin.front_desk.updated` (fields, never the reason). Members cannot write these fields through the generic API (`PROFILE_SERVER_FIELDS` and the kept `assistant.level`) |
| `PUT` | `/api/v1/admin/businesses/:id/platform` | platform admin | Plan 616: strict body `{ modules?: ModuleKey[], aiMonthlyTokenCap?: number|null, aiPrivate?: boolean, reason }` (`platformUpdateSchema`; one of the three, reason 3–200, else 400 with `issues`). 404 `Business not found`. One `findOneAndUpdate` on `businesses` (`$set` modules / cap / private, `$unset` cap on `null`, `$push` `platformHistory` `{ at, by, byName, reason, changed }` last 50), then the module cache is cleared. Plan 617 enforces the cap from the ledger. Plan 639: `aiPrivate` only stops learning; it erases nothing. Log `admin.platform.updated` (business id and field names, never the reason) |
| `POST` | `/api/v1/admin/businesses/:id/erase-learned` | platform admin | Plan 639 (C-LEARN): body `{ reason }` (trimmed, 1–300, else 400). 404 `Business not found` before any delete. `eraseLearnedData` removes the business's promoted `GEMINI_SHOTS` copies, its `aiDrafts` and its share of the shared aliases and supplier profiles (rows left with no contributor are deleted); one `platformHistory` row `{ changed: ['learnedData'], changes: [{ field: 'learnedData', from: '', to: 'erased' }], reason }`; answers `{ ok: true, counts }`. Log `admin.learned_data.erased` (id and counts, never the reason) / `admin.learned_data.erase_failed` |
| `GET` | `/api/v1/admin/businesses/:id/platform-history` | platform admin | Plan 638: `{ rows }` = the business's `platformHistory` newest first (`[]` when none; 404 `Business not found`). Rows written from plan 638 on carry `changes: [{ field, from, to }]` (strings, only fields that really changed; `PUT …/platform` builds them). Log `admin.platform_history.failed` on error |
| `POST` | `/api/v1/auth/switch-business` | required | Plan 631 (C-ACCESS): `{ businessId: string (1–64) | null }` → `{ token, user }`; `null` or the home id → home; otherwise a live grant (`consultant`) or the platform admin (`owner`, `acting: 'platform'`), else 403 `NO_ACCESS` and nothing written. 400 `INVALID_BODY`. Stores `users.activeBusinessId`; refresh and login re-resolve it |
| `GET` | `/api/v1/access/businesses` | required | Plan 631: `[{ businessId, name, role }]` — home first (stored role), then each live grant (`consultant`) by name |
| `POST` | `/api/v1/access/grants` | platform admin | Plan 631: `{ businessId, username }` → 201 `{ _id, userId, name, businessId, grantedAt }`. 400 `INVALID_BODY`, 404 `BUSINESS_NOT_FOUND` / `USER_NOT_FOUND`, 409 `ALREADY_MEMBER` / `ALREADY_GRANTED`. 30 per 15 minutes per user. Log `access.grant.created` (ids only) |
| `DELETE` | `/api/v1/access/grants/:id` | platform admin or owner | Plan 631: ends a live grant (`revokedAt`, `revokedBy`); an owner only for his business (else 404 `NOT_FOUND`), staff and consultants 403. The acting session gets 401 `ACCESS_ENDED` on its next request. Log `access.grant.removed` (ids only) |
| `GET` | `/api/v1/access/grants` | owner | Plan 631: the live grants of the caller's business `[{ _id, name, grantedAt }]`, newest first (C-PERM `manageTeam`) |
| `GET` | `/api/v1/assistant-runs?filter&scope&limit&before` | owner, consultant, acting platform admin (module `frontdesk`) | Plan 752 (C-RUNS): the business's assistant runs, newest first `{ runs, more, now }`; `filter` `all` / `answered` / `handover` / `fallback`, `scope` `real` / `test`, `limit` 1–100, `before` a start time. For the acting platform admin a real run's `text` is empty with `textHidden`. Staff 403; a malformed value 400 `BAD_INPUT` |
| `GET` | `/api/v1/assistant-runs/setup` | owner, consultant, acting platform admin (module `frontdesk`) | Plan 756: how the assistant is set up, read-only `{ engine, business, models? }`: the engine's ten fixed numbers, this business's own values (`null` without a front desk profile); `models` for the platform admin only. No query is read. Staff 403 |
| `GET` | `/api/v1/assistant-runs/:id` | owner, consultant, acting platform admin (module `frontdesk`) | Plan 752: one run `{ run }`; `prompt` and `promptRules` for the platform admin only. The acting platform admin opening a real run first writes `adminViews` on it (503 `TRACE_FAILED` when that fails). Staff 403; another business's id 404 |
| `GET` | `/api/v1/admin/users` | platform admin | Users with `businessId`, `businessName`, `businessRole`, `isPlatformAdmin` |
| `DELETE` | `/api/v1/admin/users/:userId` | platform admin | Owner: deletes the whole business (data, users, business doc); staff: only that user; own business → 403. Plan 639: query `eraseLearned=true` (exact string; whole-business only) runs `eraseLearnedData` first; otherwise what was learned is kept. Log `admin.users_delete` with `eraseLearned` and counts |
| `GET` | `/api/v1/public/health` | none | Plan 543: public router probe; the public door for non-members (ADR 0030, C-GUEST). No member token is read under /api/v1/public. |
| `GET` | `/api/v1/public/:slug` | none | Plan 555: the public view of a front desk profile (`publicView`: no `businessId`, `whatsapp`, `assistant`, `status`, budget or areas). 404 `NOT_FOUND`; draft or suspended → 200 `{ available: false, displayName }`. |
| `POST` | `/api/v1/public/:slug/requests` | none, `publicLimiter` + `honeypot` | Plan 555: a guest sends a request (strict `publicRequestSchema`, `consentTerms: true`). 201 `{ reference, token }`; 400 `BAD_REQUEST_INPUT` (+ `issues`), `KIND_DISABLED`, `UNKNOWN_QUESTION`; 403 `NOT_AVAILABLE`; 404 `NOT_FOUND`; 429. Honeypot `website` filled → silent 201, nothing written. |
| `GET` | `/api/v1/public/:slug/requests/:token` | none (token) | Plan 555: the guest's own request by its 32-char token. A malformed token or a token of another slug → 404 `NOT_FOUND` (no read for a malformed one). No phone, answers or decline text. |
| `POST` | `/api/v1/public/:slug/requests/:token/cancel` | none (token), `publicLimiter` | Plan 555: `new`, `qualified`, `needs_info` → `cancelled` (`via: 'guest'`); any other status → 409 `ALREADY_DECIDED`; 404 `NOT_FOUND`; 429. |

`POST /api/v1/data/clients` finds-or-creates by `phoneKey` (plan 545): 201 new, 200 existing; restore or a phone change that would make a second live client → 409 `PHONE_TAKEN`.

Every later public write route under `/api/v1/public` carries `publicLimiter` (`server/middleware/rate-limit.js`), the
`honeypot` (`server/middleware/honeypot.js`) and, when the guest may read back, a token from `newPublicToken`
(`server/utils/public-token.js`) — all three in the plan that adds the route.

Why a dedicated `/api/v1/events` router (plan 442): an event's stage history, `closedAt` and notes are server-owned.
The actor (`by`, `byName`) comes from the token and each change is one atomic write (`$push` / `$pull` / `$set`
with `arrayFilters`), so the generic API strips `EVENT_SERVER_FIELDS` (`shared/schemas/entities/event-stage.ts`)
from every `menuEvents` POST and PUT, and a generic POST starts the event in `inquiry`. Pure rules live in
`server/utils/event-stage.js`. Plan 446 adds `closing`, `finish`, `reopen`, `refresh-plan` to the same router.

Why a dedicated `/api/v1/access` router (plan 631, ADR 0032): a grant is not a business item. It decides which
businesses a user may enter, so it lives in the server-only `businessAccess` collection, is created only by the platform
admin and must never be reachable through the generic API. While a token is `acting`, `verifyToken` re-checks the grant
on every request (401 `ACCESS_ENDED` once it is removed, 503 when the check cannot run).

A token without `businessId` is refused with 401 on every route that verifies a token (the client
refreshes silently). Login for a user with no business → 403 `NO_BUSINESS`, removed user → 403
`USER_REMOVED`; refresh answers 401 with the same `error` and clears the cookie.

Plan 321 Phase 1 also added rate limiting: a moderate write limit on `/api/v1/data`
(300 req/15 min, writes only) and a strict per-user limit on `/api/v1/ai` (20 req/15 min,
keyed by `userId`) — see `dataWriteLimiter` in `generic.js` and `aiLimiter` in `ai.js`.

> Allowlist guard: only types in `ALL_USER_ENTITY_TYPES` (`server/constants/all-user-entity-types.js`) are reachable through the generic router — everything else, including `signed-users-db`, `users` (auth router only), and `GEMINI_SHOTS`/`GEMINI_USAGE` (`ai.js` only), returns `403`. Adding a new entity type means adding it to `ALL_USER_ENTITY_TYPES` first.


**Modules program routes (plan 615, C-REGISTRY).** Ten paths are mounted and answer 404 until the plan that fills them merges; their routes are defined by the Contract named in `docs/modules/modules-map.md`: `/api/v1/files` (C-FILES, plan 619), `/api/v1/access` (C-ACCESS, plan 631), `/api/v1/stock` (C-STOCK, plan 635), `/api/v1/diag` (C-DIAG, plan 633), `/api/v1/admin/learning` (C-FILES, C-LEARN, plans 619 and 630), and under `/api/v1/ai`: `/voice` (plan 621), `/logistics` (C-LOAD, plan 622), `/invoices` (C-INVREAD, plan 626), `/diag` (C-DIAG, plan 633), `/stock` (C-STOCK, plan 637). The AI sub-routers read the helpers `respondFromGeminiFailure`, `usageOf`, `requestedModel` and `aiLimiter` with `require('../ai')` inside a handler.

**File routes (plan 619, C-FILES).** `GET /api/v1/files/:id` → `{ url }` (link expires in 300 s): a member of the file's business only (another business or an unknown id: 404); an invoice file needs `editMoney` (staff 403); `503 FILE_STORE_OFF` when the keys are not set. `GET /api/v1/admin/learning/status` → `{ fileStore: boolean }`, platform admin only.

**Module gate (plan 616).** A route of a part of the product the business does not have answers 403 `{ error: 'MODULE_OFF', module }` (logged at `info`, never `warn`). The gate is `server/middleware/require-module.js`: `requireModule(key|key[])` after `verifyToken` (any one key is enough), `requireHomeModule` for the consultant's home business, and one `requireModuleForType` line in `generic.js` using `MODULE_OF_TYPE`. A business with no stored `modules` list has the four defaults. The module list is cached per process for 30 seconds and cleared by the platform write. The public router answers 404 `NOT_FOUND` for a business without `frontdesk` (`loadPublicProfile` returns `null`). Never gated: `/admin/**`, `/stats/business`, `/stats/report`, product import, price-list and receipt AI routes.

### 5a — Logging (Plan 383)

- No `console.*` in server runtime code (`app.js`, `db.js`, `index.js`, `logger.js`,
  `routes/`, `services/`, `middleware/`) — `npm --prefix server run lint` errors on it.
  `scripts/`, `migrations/`, `test/` may keep console.
- Inside a handler use `req.log.<level>(...)` (carries `requestId`, and `userId` after auth);
  outside a request use `logger` from `server/logger.js`.
- `event` is mandatory, `domain.action.result`; errors go in as `{ err }`.
- `warn`+ is persisted to `app_logs` automatically — do not call `log-sink` from routes.
- Redacted / never logged: `Authorization`, cookies, `password`, `email`, IP, user-agent.
  `userId` is the only user field.
- Every response carries `X-Request-Id` (incoming id reused when it matches
  `^[A-Za-z0-9_-]{8,64}$`); the client copies it onto `http.error` events.

Event map and recipe: `docs/brain/patterns/server-log-events.md`.

---

## 6 — Plan Annotation Rule

Every implementation plan that touches persisted data **MUST** include a `## Backend Impact` section:

```markdown
## Backend Impact
- Collections affected: [list entityType keys]
- New collections: [yes/no — if yes, list with justification]
- Server changes needed: [yes/no — if yes, describe]
```

If the answer to all three is "no impact", write `## Backend Impact — None` explicitly. This makes the decision visible rather than assumed.

---

## 7 — Backup & Restore

Before any destructive data operation (a legacy re-import, a bulk repair, a schema migration),
take a full snapshot with `server/scripts/db-backup.js`, and prove it's actually usable with
`server/scripts/db-restore.js` — a snapshot that's never been restored is not a rollback path,
it's a hope. `mongodump`/`mongorestore` are not installed; these two scripts are the only way
back on this project (Atlas is on the free M0 tier, which has no point-in-time restore).

```powershell
# Full JSON snapshot (Extended JSON — dates/ObjectIds/Decimal128 survive the round trip).
# Written OUTSIDE the repo by default (../foodvibe-db-backups/<target>-<timestamp>/) —
# a snapshot contains real user data and must never be committed.
node server/scripts/db-backup.js --target=local
node server/scripts/db-backup.js --target=atlas   # read-only against Atlas — still confirm the masked host with the Human first

# Restore a snapshot into a named SCRATCH database — never over the source. Refuses to run
# if --db matches the source database name, and refuses to restore into a database that
# already has collections in it. Prints a per-collection document-count comparison against
# the snapshot's _manifest.json and exits non-zero on any mismatch.
node server/scripts/db-restore.js --target=local --dir="<snapshot dir>" --db=foodvibe_scratch_<label>
```

Drop the scratch database manually when done (`db.dropDatabase()` via `mongosh` or the driver) —
the restore script deliberately leaves it in place for inspection rather than auto-cleaning.
Note: the app's own DB user may not hold `dropDatabase`/`dropCollection` privileges outside its
primary database (least-privilege by design) — if so, drop the scratch DB with an admin-scoped
connection instead.

`db-backup.js` filters out Mongo's internal `system.*` namespaces (e.g. `system.views`, which
`RECIPE_BOOK_VIEW` — an actual DB view — causes to appear in `listCollections()`); reading them
needs privileges the app DB user doesn't have and they hold no user data of their own.

