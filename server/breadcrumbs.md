# server/ — Express Backend

## Structure
| File/Dir | Purpose |
|----------|---------|
| `index.js` | Express app entry — middleware, route mounting, static file serving, error handler |
| `db.js` | MongoDB connection via Mongoose; target chosen by `utils/db-target.js` (local by default; Atlas only via git-ignored `server/.env.live` or Render's env) |
| `models/entity.model.js` | Generic entity schema: `_id` (string), `entityType`, `data` (Mixed) |
| `routes/generic.js` | Full CRUD at `/api/v1/data/:type` — mirrors Angular's `StorageService` |
| `routes/business.js` | The caller's business at `/api/v1/business` (plan 425; owner-only sub-routes arrive with plans 427-431; plan 579: `PUT /logistics-hidden`, the business's hidden logistics questions with their dates) |
| `routes/auth.js` | Login, signup, refresh, logout, accept-terms at `/api/v1/auth` — JWT + rate limiting; signup needs the current terms version (plan 584) |
| `routes/clients.js` | Client actions at `/api/v1/clients` (plan 551): merge a duplicate into another client, set or clear do-not-contact; the only writer of `mergedInto` and `doNotContact` |
| `routes/knowledge.js` | `PUT /api/v1/knowledge/approve` (plan 554): bulk-approve the caller business's draft knowledge items in one `updateMany` |
| `services/knowledge.js` | `publicFacts(db, businessId)` (plan 554, C-KB): the one fact source for the assistant — profile facts then approved public knowledge items by topic, at most 6,000 characters, cut at a whole line |
| `services/knowledge-import-prompt.js` | The English prompt and generation config of `POST /ai/knowledge-import` (plan 554) |
| `utils/terms-version.js` | `currentTermsVersion()` — reads `version` from `public/assets/legal/terms.he.json`, the file the app shows (plan 584) |
| `routes/requests.js` | Customer requests at `/api/v1/requests` (plan 549): manual request, status moves, wanted edits; the only writer of `requests` |
| `routes/bookings.js` | Booking status moves at `/api/v1/bookings` (plan 549); the only writer of `bookings` |
| `routes/ai.js` | Gemini AI proxy at `/api/v1/ai` — generate + parse-text |
| `routes/public.js` | Public door for non-members at `/api/v1/public` (plan 543, ADR 0030) — no member token; plan 555: profile view, send, read by token, cancel by token |
| `utils/public-profile.js` | `loadPublicProfile`, `isPublic`, `publicView` (plan 555): the one place that decides which profile fields a stranger sees |
| `utils/request-create.js` | `createRequest`, `runQualify` (plan 555): the one request-creation path of the manual route and the public route |
| `utils/redact-url.js` | `redactUrl` (plan 555): masks a guest's token in a logged URL; used by the pino-http `req` serializer |
| `scripts/set-front-desk-status.js` | `--slug --status [--target]` (plan 555): sets one profile's status until plan 557's admin switch; prints `FRONT_DESK_STATUS: <slug> <old> → <new>` |
| `services/ai-usage.js` | The AI ledger (plan 566): `recordAiUsage` (one `aiUsage` row per Gemini call, fire-and-forget), `estimateCostUsd`, `aggregateAiUsage`, `trackAiOutcome`, `markAiUsageRejected` (plan 580: marks refused answers) |
| `constants/ai-features.js` | `AI_FEATURES` closed list of AI feature keys, `isAiFeature` (plan 566) |
| `constants/ai-prices.js` | `AI_PRICES` USD per 1M tokens per model, `PRICES_AS_OF`, `PRICES_SOURCE` (plan 566) |
| `services/business-report.js` | The business report (plan 568): `buildReport` — monthly series, first vs latest 30 days, baseline mapping, rule findings; read-only |
| `constants/report.js` | `REPORT_METRICS`, `REPORT_MIN_EVENTS`, finding thresholds (plan 568) |
| `jobs/retention.js` | `purgeRetained(db, businessId, now)` — lazy 24-month delete of final requests and bookings, 12 months of messages; throttled to once a day per business; run from the generic GET (plan 558) |
| `scripts/erase-client.js` | Operator script: erase one customer of one business by phone (`planErase`, `runErase`); dry run by default, `--target` required (plan 558) |
| `scripts/seed-demo-business.js` | Fills a local database with one demo catering business (dry run by default; `--write`; local only) |
| `middleware/auth.js` | `verifyToken` — JWT Bearer verification, attaches `req.user` |

## Key Patterns
- **One model, many types**: All domain data (products, recipes, menus, etc.) uses the generic `Entity` model with `entityType` as discriminator (e.g. `PRODUCT_LIST`, `RECIPE_LIST`).
- **Auth required on all data routes**: `router.use(verifyToken)` gates everything in `generic.js`.
- **IDs from Angular**: `_id` is a 5-char alphanumeric string from Angular's `makeId()` — not a Mongo ObjectId.
- **New feature checklist**: Does the feature need persistence? → use existing `/api/v1/data/:type` routes. Needs custom logic? → add a new route file and mount it in `index.js`.
