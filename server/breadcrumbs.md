# server/ — Express Backend

## Structure
| File/Dir | Purpose |
|----------|---------|
| `index.js` | Express app entry — middleware, route mounting, static file serving, error handler |
| `db.js` | MongoDB connection via Mongoose; target chosen by `utils/db-target.js` (local by default; Atlas only via git-ignored `server/.env.live` or Render's env) |
| `models/entity.model.js` | Generic entity schema: `_id` (string), `entityType`, `data` (Mixed) |
| `routes/generic.js` | Full CRUD at `/api/v1/data/:type` — mirrors Angular's `StorageService` |
| `routes/business.js` | The caller's business at `/api/v1/business` (plan 425; owner-only sub-routes arrive with plans 427-431; plan 579: `PUT /logistics-hidden`, the business's hidden logistics questions with their dates) |
| `routes/auth.js` | Login, signup, refresh, logout, accept-terms at `/api/v1/auth` — JWT + rate limiting; signup needs the current terms version (plan 584); plan 631: `signAccess` signs the active business from `resolveSession`, `POST /switch-business` |
| `routes/clients.js` | Client actions at `/api/v1/clients` (plan 551): merge a duplicate into another client, set or clear do-not-contact; the only writer of `mergedInto` and `doNotContact` |
| `routes/knowledge.js` | `PUT /api/v1/knowledge/approve` (plan 554): bulk-approve the caller business's draft knowledge items in one `updateMany` |
| `services/knowledge.js` | `publicFacts(db, businessId)` (plan 554, C-KB): the one fact source for the assistant — profile facts then approved public knowledge items by topic, at most 6,000 characters, cut at a whole line |
| `services/front-desk-setup.js` | `frontDeskSetup(db, businessId)` (plan 556): the front desk checklist per business type (`REQUIRED_TOPICS`, `MIN_APPROVED_PER_TOPIC`); used by `GET /business/setup-status` and the admin business rows; never a baseline item |
| `services/knowledge-import-prompt.js` | The English prompt and generation config of `POST /ai/knowledge-import` (plan 554) |
| `utils/terms-version.js` | `currentTermsVersion()` — reads `version` from `public/assets/legal/terms.he.json`, the file the app shows (plan 584) |
| `routes/requests.js` | Customer requests at `/api/v1/requests` (plan 549): manual request, status moves, wanted edits; the only writer of `requests` |
| `routes/notifications.js` | In-app alerts at `/api/v1/notifications` (plan 646): `GET ?limit` → `{ rows, unread }`, `POST /:id/read`, `POST /read-all`; scoped to the caller and to a live grant for other businesses |
| `routes/geocode.js` | Venue address from a saved spot at `/api/v1/geocode/reverse?lat&lng` → `{ address }` (plan 373): calls OpenStreetMap Nominatim from the server (one call per second, 20 per user per minute, no CSP change); only the two numbers leave our server; a failure answers `{ address: null }` |
| `services/notifications.js` | `createPriceChangeAlerts(db, business, rows)` (plan 646): one alert per recipient (owner + live consultants) per row at or beyond `priceRiseAlertPct`; called by the invoice apply; a failure logs `notifications.write_failed` and never fails the apply; keeps 200 per user |
| `routes/diag.js` | Diagnosis record at `/api/v1/diag` (plan 633); the only writer of `diagnoses`; gate reads the home business |
| `routes/ai/diag.js` | `POST /api/v1/ai/diag/menu`: a pasted menu → names and prices (plan 633) |
| `routes/bookings.js` | Booking status moves at `/api/v1/bookings` (plan 549); the only writer of `bookings` |
| `routes/ai.js` | Gemini AI proxy at `/api/v1/ai` — generate + parse-text; plan 600: recipe examples are saved `pending` and confirmed on recipe save (`POST /shots/confirm`), prompts add the shared pool after the business's own |
| `routes/access.js` | Mounted at `/api/v1/access` (plan 615; filled by plan 631, C-ACCESS): `GET /businesses` (where the user may go), `POST` / `DELETE` / `GET /grants` (platform admin grants, owner lists and removes); no query of its own |
| `services/access.js` | Which business a session is in (plan 631, ADR 0032): `resolveSession`, `canEnter`, `stillActing` (the per-request re-check of an acting token), `liveGrant`, `listEnterable` and the grant helpers; the only reader and writer of `businessAccess` |
| `routes/stock.js` | Mounted at `/api/v1/stock` (plan 615, C-STOCK): empty until plan 635 |
| `routes/diag.js` | Mounted at `/api/v1/diag` (plan 615, C-DIAG): empty until plan 633 |
| `routes/ai/voice.js` | Mounted at `/api/v1/ai/voice` inside `routes/ai.js` (plan 615): empty until plan 621 |
| `routes/ai/logistics.js` | Mounted at `/api/v1/ai/logistics` (plan 615, C-LOAD): empty until plan 622 |
| `routes/ai/invoices.js` | Mounted at `/api/v1/ai/invoices` (plan 615, C-INVREAD): empty until plan 626 |
| `routes/ai/diag.js` | Mounted at `/api/v1/ai/diag` (plan 615, C-DIAG): empty until plan 633 |
| `routes/ai/stock.js` | Mounted at `/api/v1/ai/stock` (plan 615, C-STOCK): empty until plan 637 |
| `shared/schemas/modules.ts` | `MODULE_KEYS`, `DEFAULT_MODULES`, `modulesOf`, `hasModule`, `MODULE_OF_TYPE`, `platformUpdateSchema` (plan 615, C-MODULES); shared by the server gate and the browser |
| `routes/public.js` | Public door for non-members at `/api/v1/public` (plan 543, ADR 0030) — no member token; plan 555: profile view, send, read by token, cancel by token |
| `utils/public-profile.js` | `loadPublicProfile`, `isPublic`, `publicView` (plan 555): the one place that decides which profile fields a stranger sees |
| `utils/request-create.js` | `createRequest`, `runQualify` (plan 555): the one request-creation path of the manual route and the public route |
| `utils/redact-url.js` | `redactUrl` (plan 555): masks a guest's token in a logged URL; used by the pino-http `req` serializer |
| `scripts/set-front-desk-status.js` | `--slug --status [--target]` (plan 555): sets one profile's status until plan 557's admin switch; prints `FRONT_DESK_STATUS: <slug> <old> → <new>` |
| `services/ai-usage.js` | The AI ledger (plan 566): `recordAiUsage` (one `aiUsage` row per Gemini call, fire-and-forget), `estimateCostUsd`, `aggregateAiUsage`, `trackAiOutcome`, `markAiUsageRejected` (plan 580: marks refused answers) |
| `services/file-store.js` | The private file store (plan 619, C-FILES): `putPrivateFile`, `keepStoredFile`, `signedFileUrl`, `deleteStoredFile`, `readUploadedFile`, `setFileStoreForTests`, `createMemoryFileStore`; only writer of `storedFiles` |
| `services/cloudinary-requests.js` | Pure request builders for the file store (plan 619): `signParams`, `uploadRequest`, `downloadUrl`, `destroyRequest` |
| `routes/files.js` | `GET /api/v1/files/:id` → `{ url }`, 300-second link (plan 619) |
| `routes/admin-learning.js` | `GET /api/v1/admin/learning/status` → `{ fileStore }` (plan 619); `GET …/stats` → drafts per flow and model by week, brain counts, private count; counts only (plan 630) |
| `routes/admin.js` (erase learned data) | `POST /api/v1/admin/businesses/:id/erase-learned` → `{ ok, counts }` via `eraseLearnedData` in `services/business.js` (plan 639); `DELETE /users/:userId?eraseLearned=true` does the same before deleting a business |
| `routes/admin.js` (platform history) | `GET /api/v1/admin/businesses/:id/platform-history` → `{ rows }` newest first (plan 638); `PUT …/platform` stores `changes` (`platformChangesOf`) |
| `utils/learning-stats.js` | `weekStart`, `buildLearningStats` (plan 630): pure grouping of AI drafts into flow x model x Sunday-week with the average closeness |
| `services/ai-cap.js` | The monthly AI cap per business (plan 617, C-AICAP): `capState` (cap vs this Israel month's ledger tokens, 60 s cache), `monthTokensByBusiness`, `clearCapCache`; read by `callGemini` and the platform table |
| `services/ai-allowance.js` | Each user's lifetime AI allowance (plan 736): `reserveAiCall` (one atomic `findOneAndUpdate` on `users`), `refundAiCall`, `allowanceOf` (missing = 100 / 0), `trackAiAllowance` (AI router middleware: one holder per request, refund on a 4xx/5xx); reserved by `callGemini`, read by `/ai/usage` and the admin user list |
| `services/ai-drafts.js` | The draft trail (plan 618, C-AIDRAFT): `saveAiDraft` (stores what the model suggested, never throws, keeps the newest 500 per business and feature) and `confirmAiDraft` (what was saved and the closeness score); the only writer of `aiDrafts`, returns only ids |
| `utils/ai-learning.js` | `mayLearnFrom(business)` (plan 618, C-LEARN): the one consent test before the platform copies or lists a business's AI material — true unless `aiPrivate` |
| `constants/ai-features.js` | `AI_FEATURES` closed list of AI feature keys, `isAiFeature` (plan 566) |
| `constants/ai-prices.js` | `AI_PRICES` USD per 1M tokens per model, `PRICES_AS_OF`, `PRICES_SOURCE` (plan 566) |
| `services/business-report.js` | The business report (plan 568): `buildReport` — monthly series, first vs latest 30 days, baseline mapping, rule findings; read-only |
| `services/frontdesk-stats.js` | Front desk numbers of one business (plan 559): `frontDeskStats`, `parseRange`, `isOutsideHours`; read-only, test requests never count |
| `constants/report.js` | `REPORT_METRICS`, `REPORT_MIN_EVENTS`, finding thresholds (plan 568) |
| `jobs/retention.js` | `purgeRetained(db, businessId, now)` — lazy 24-month delete of final requests and bookings, stored files (voice recordings, abandoned invoice reads) past their `deleteAfter`, 12 months of messages; throttled to once a day per business; run from the generic GET (plan 558) |
| `scripts/erase-client.js` | Operator script: erase one customer of one business by phone (`planErase`, `runErase`); dry run by default, `--target` required (plan 558) |
| `scripts/repair-supplier-refs.js` | Plan 649: lists (dry run) or repairs (`--write`) product sources whose supplier is foreign, unknown or empty — map by `_masterId`, by trimmed name, or clear; prices never change; `--target` other than `local` needs `--confirm-remote` |
| `scripts/seed-demo-business.js` | Fills a local database with one demo catering business (dry run by default; `--write`; local only) |
| `middleware/auth.js` | `verifyToken` — JWT Bearer verification, attaches `req.user` |
| `middleware/require-module.js` | Plan 616: `requireModule`, `requireHomeModule`, `requireModuleForType` — 403 `MODULE_OFF` when the business lacks a module; 30 s cache, `clearModuleCache` |
| `scripts/catalog-enrichment/` | Plan 583: local-only master catalog pricing from the chains' published price files — `inventory`, `fetch-price-files`, `build-candidates`, `batch-view`, `merge-decisions`, `audit-sheet`, `apply-enrichment` (dry run unless `--write`), `merge-rescue`, `worksheet`, `stage-c-sheets`, `apply-worklist` (stage C + Dan's product fixes), `fix-line-units` (recipe/dish line units, backup + `--restore`), `report`, `verify-enrichment`; work folder `../foodvibe-catalog-work` beside the main checkout |

## Key Patterns
- **One model, many types**: All domain data (products, recipes, menus, etc.) uses the generic `Entity` model with `entityType` as discriminator (e.g. `PRODUCT_LIST`, `RECIPE_LIST`).
- **Auth required on all data routes**: `router.use(verifyToken)` gates everything in `generic.js`.
- **IDs from Angular**: `_id` is a 5-char alphanumeric string from Angular's `makeId()` — not a Mongo ObjectId.
- **New feature checklist**: Does the feature need persistence? → use existing `/api/v1/data/:type` routes. Needs custom logic? → add a new route file and mount it in `index.js`.
