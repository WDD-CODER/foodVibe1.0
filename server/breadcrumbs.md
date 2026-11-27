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
| `services/knowledge.js` | `publicFacts(db, businessId)` (plan 554, C-KB): the one fact source for the assistant — profile facts then approved public knowledge items by topic, at most 6,000 characters, cut at a whole line; plan 755: takes `{ query, context, budget }` and returns what was sent and what was left out |
| `services/fact-pick.js` | `pickFacts`, `scoreItem`, `factTokens`, `factQueryOf` (plan 755): which knowledge lines are sent when they do not all fit — the profile's lines always, items whole, ranked by the guest's words; pure |
| `utils/text-norm.js` | `norm` (plan 755): lower-case text without Hebrew vowel points; used by the guardrails and the fact picker |
| `services/front-desk-setup.js` | `frontDeskSetup(db, businessId)` (plan 556): the front desk checklist per business type (`REQUIRED_TOPICS`, `MIN_APPROVED_PER_TOPIC`); used by `GET /business/setup-status` and the admin business rows; never a baseline item |
| `services/knowledge-import-prompt.js` | The English prompt and generation config of `POST /ai/knowledge-import` (plan 554) |
| `utils/terms-version.js` | `currentTermsVersion()` — reads `version` from `public/assets/legal/terms.he.json`, the file the app shows (plan 584) |
| `routes/requests.js` | Customer requests at `/api/v1/requests` (plan 549): manual request, status moves, wanted edits; the only writer of `requests`; a table request of a business with `tables` is approved through the table booking service (plan 685) |
| `routes/notifications.js` | In-app alerts at `/api/v1/notifications` (plan 646): `GET ?limit` → `{ rows, unread }`, `POST /:id/read`, `POST /read-all`; scoped to the caller and to a live grant for other businesses |
| `services/notifications.js` | `createPriceChangeAlerts(db, business, rows)` (plan 646): one alert per recipient (owner + live consultants) per row at or beyond `priceRiseAlertPct`; called by the invoice apply; a failure logs `notifications.write_failed` and never fails the apply; keeps 200 per user |
| `routes/diag.js` | Diagnosis record at `/api/v1/diag` (plan 633); the only writer of `diagnoses`; gate reads the home business |
| `routes/ai/diag.js` | `POST /api/v1/ai/diag/menu`: a pasted menu → names and prices (plan 633) |
| `routes/bookings.js` | Booking status moves and table bookings at `/api/v1/bookings` (plan 549; plan 668: phone booking, walk-in, move, change, availability, the day with holds); the only writer of `bookings` |
| `services/table-holds.js` | The table holds (plan 668, C-HOLD): `claim`, `move`, `release`, `holdsOf`, `rangesOf` over `tableHolds`, one row per table per 15-minute cell; the unique index is the only guard against a double booking |
| `services/table-bookings.js` | The one booking service (plan 668): `reserveTable` (assign then claim), `bookTable` (reserve, write, release on failure), `rebookTable`, `createWalkIn`, `countBooking`, `loadTableContext`, `wallOf`, `checkTables`; the only caller of `claim` |
| `services/inbound.js` | The one way in (plan 675, C-CONV): `handleInbound`, `registerButton`, `setTurnHandler`; idempotent, one client per phone, the wait of R-03; a human chat goes back to the assistant after a failure or 2 h idle (plan 719); `answerWaiting`; plan 752: the turn is told the measured wait; plan 753: `nextStep` is the one place that decides run / wait / leave, a message during a run is noted on its lease; plan 754: a quiet wait (`QUIET_MS` / `MAX_WAIT_MS`, `burstStart`) |
| `services/frontdesk-lease.js` | `takeLease`, `noteWaiting`, `leaseCheck`, `endLease`, `clearLease` (plan 753, R-26 / R-27): one assistant run per conversation, the lease on the conversation document |
| `services/outbound.js` | The one sender (plan 675): `sendOut` checks do-not-contact, the test rule, the live profile, the 24-hour window; the only caller of a transport's `send`; plan 754: `showTyping`, the one caller of a transport's `typing` |
| `services/conversations.js` | One live conversation per guest and channel (plan 675): `findOrCreateConversation`, `loadConversation`, `closeConversation`, `listConversations` (plan 687) |
| `services/channels/` | The only place that names a channel (plan 675): `index.js` `channelFor`, `sim-channel.js`; WhatsApp joins in plan 683; plan 754: a transport may have an optional `typing` |
| `routes/sim.js` | The simulator routes (plan 675): `POST /inbound`, `DELETE /test-data`; owner or platform admin; plan 752: clear test data also clears the test runs |
| `services/frontdesk-runs.js` | `startRun`, `listRuns`, `loadRun`, `markAdminView` (plan 752, C-RUNS): the step-by-step record of an assistant run in `assistantRuns`, 30 days; plan 754: `quietMs`, `capped` on the first step and `answerMs` on the send step |
| `routes/assistant-runs.js` | Mounted at `/api/v1/assistant-runs` (plan 752): list and one run; owner / consultant / acting platform admin; a real run opened by the acting admin leaves a trace; plan 756: `GET /setup`; plan 760: `PUT /engine-settings` (platform admin only) |
| `services/assistant-setup.js` | `assistantSetup` (plan 756): the engine's numbers in force and one business's own values for the assistant page; read-only; plan 760: `editable` and `ranges` for the platform admin |
| `services/assistant-engine-settings.js` | `ENGINE_RULES`, `engineSettings(db)`, `saveEngineSetting` (plan 760): the one table of the assistant's engine numbers (default, range, unit), the cached read every reader uses, and the admin's save with its history (collection `platformSettings`, platform-wide) |
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
| `services/ai-key.js` | `keyFor(businessId)` (plan 679, C-AIKEY): the one place that resolves a model key; the environment key today |
| `services/frontdesk-turn.js` | `runTurn`, `decide`, `failureReason`, `FRONTDESK_DAILY_TURNS` (plan 679, C-AI): the assistant's turn — registered with `setTurnHandler` when loaded; plan 701: a failed guest turn stores `assistantFailed { at, reason: busy\|timeout\|quota\|other }` on the conversation; plan 733: one holding message on a technical failure; a test conversation is answered as level 1 (`turnProfile`); plan 751: `fillWhen` before the rules; `frontdesk.turn.blocked` carries the time counts; plan 752: every run is recorded step by step; plan 753: `runTurn` holds the conversation's lease for a run and its follow-ups and re-checks after the model call; plan 754: asks for the typing sign after the pre-check and reads history / count and facts / tables in pairs; plan 755: the facts are picked; `frontdesk.turn.facts` |
| `services/frontdesk-when.js` | `fillWhen`, `currentGuestText` (plan 751, R-24): fills the date the model left out from its own value or the guest's current message(s); pure |
| `shared/schemas/front-desk/date-words.ts` | `dateFromWords`, `clockTimeOf` (plan 751): date words and clock times as `YYYY-MM-DD` / `HH:mm` in Asia/Jerusalem |
| `services/gemini-client.js` | `callGemini` (plans 395, 614): plan 701 adds the opt-in `fallback` (next free model on overload) and `deadlineMs` for the front desk only — every other caller keeps one model per request; a gone model (404 / no longer available) is skipped by the fallback until the quota day resets (plan 730); plan 754: `firstLimitMs` cuts a slow first call and `onCall` reports every call |
| `services/frontdesk-prompt.js` | `buildTurnBody`, `TURN_SYSTEM_PROMPT`, `todayBlock` (plan 679): the English rules and the request body of a turn; plan 753: `unansweredTail` and the UNANSWERED data block |
| `services/frontdesk-guardrails.js` | `preCheck(ctx)`, `applyGuardrails(answer, ctx)`, `isRemoval` (plan 679, filled by 689): the one place of the assistant's blocks; plan 751: a time passes when it stands in any fact line (R-25); plan 753: `follow_up_limit` after three follow-ups in a row; plan 755: `norm` lives in `utils/text-norm.js` |
| `services/frontdesk-tables.js` | `tablesFor`, `handleTableIntent`, `deliver`, `registerTableButtons` (plan 680, C-AI2): the chat's book / change / cancel dialogue — the engine answers, the dictionary speaks; the buttons `OK`, `ALT`, `OTHER`, `BK` make no model call |
| `routes/ai/frontdesk.js` | Mounted at `/api/v1/ai/frontdesk` (plan 679): `askTurnModel` (the assistant's one model call), `POST /suggest` and `POST /fix` (plan 682: a wrong assistant message + the right answer → one draft knowledge item, `source: correction`); plan 754: `FIRST_MODEL_LIMIT_MS`, one traced attempt per model call |
| `services/knowledge-correction-prompt.js` | `buildCorrectionBody` (plan 682): the English prompt that turns a staff correction into one knowledge item |
| `utils/fixed-text.js` | `fixedText`, `reasonText` (plan 679): a dictionary sentence as server text |
| `routes/floor-plan.js` | Mounted at `/api/v1/floor-plan` (plan 662, C-FLOOR, C-HOLD): GET / and PUT / of the one floor plan (plan 664); the hold routes come with plan 667; PUT /confirm-mode (plan 667) changes only `tableService.confirmMode` of the owner's profile |
| `routes/waitlist.js` | Mounted at `/api/v1/waitlist` (plan 662, C-WAIT; plan 673): `GET /?date=` → `{ entries, now }`, `POST /`, `PUT /:id/notify` (stamps only), `PUT /:id/seat` (claims the entry, then `createWalkIn`, puts the entry back when refused), `PUT /:id/left`; both module checks; the only writer of `waitlistEntries`; logs hold no name or phone |
| `routes/conversations.js` | Mounted at `/api/v1/conversations` (plan 687, C-CONV): list, thread, member reply, take over, hand back, close; members only, server-only collections; plan 753: take over and a member's reply remove the lease of a working run |
| `shared/schemas/modules.ts` | `MODULE_KEYS`, `DEFAULT_MODULES`, `modulesOf`, `hasModule`, `MODULE_OF_TYPE`, `platformUpdateSchema` (plan 615, C-MODULES); shared by the server gate and the browser |
| `routes/public.js` | Public door for non-members at `/api/v1/public` (plan 543, ADR 0030) — no member token; plan 555: profile view, send, read by token, cancel by token; plan 669: `GET /:slug/availability` (free times, own read limiter), `POST …/:token/confirm`, automatic confirmation of a table request, the guest's cancel of a confirmed booking |
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
| `services/ai-drafts.js` | The draft trail (plan 618, C-AIDRAFT): `saveAiDraft` (stores what the model suggested, never throws, keeps the newest 500 per business and feature) and `confirmAiDraft` (what was saved and the closeness score); the only writer of `aiDrafts`, returns only ids |
| `utils/ai-learning.js` | `mayLearnFrom(business)` (plan 618, C-LEARN): the one consent test before the platform copies or lists a business's AI material — true unless `aiPrivate` |
| `constants/ai-features.js` | `AI_FEATURES` closed list of AI feature keys, `isAiFeature` (plan 566) |
| `constants/frontdesk-guard-words.js` | `GUARD_WORDS` (HANDOFF, DEFERRED, COMPLETION, INTERNALS, GREETINGS, REMOVAL_WORDS): the word lists of the assistant's guardrails (plan 689) |
| `constants/ai-prices.js` | `AI_PRICES` USD per 1M tokens per model, `PRICES_AS_OF`, `PRICES_SOURCE` (plan 566) |
| `services/business-report.js` | The business report (plan 568): `buildReport` — monthly series, first vs latest 30 days, baseline mapping, rule findings; read-only |
| `services/frontdesk-stats.js` | Front desk numbers of one business (plan 559): `frontDeskStats`, `parseRange`, `isOutsideHours`; read-only, test requests never count |
| `constants/report.js` | `REPORT_METRICS`, `REPORT_MIN_EVENTS`, finding thresholds (plan 568) |
| `jobs/scheduler.js` | `runDue(db, now)`, `startScheduler`, `stopScheduler` (plan 676, C-JOBS): one unref'd 60 s tick running the four jobs, each in its own try; off under vitest |
| `jobs/reminders.js`, `jobs/no-show.js`, `jobs/waitlist-expire.js`, `jobs/orphan-holds.js` | The four jobs (plan 676): reminder with Confirm / Cancel buttons (`remindOne`), automatic no-show (`markOne`), waiting-list expiry, two-tick orphan hold sweep |
| `services/booking-buttons.js` | `registerBookingButtons` (plan 676): the `CONFIRM` and `CANCEL` taps of the reminder, bound to the conversation's own client; registered by `inbound.js` |
| `jobs/retention.js` | `purgeRetained(db, businessId, now)` — lazy 24-month delete of final requests and bookings, stored files (voice recordings, abandoned invoice reads) past their `deleteAfter`, 12 months of messages; throttled to once a day per business; run from the generic GET (plan 558) |
| `scripts/erase-client.js` | Operator script: erase one customer of one business by phone (`planErase`, `runErase`); dry run by default, `--target` required (plan 558) |
| `scripts/repair-supplier-refs.js` | Plan 649: lists (dry run) or repairs (`--write`) product sources whose supplier is foreign, unknown or empty — map by `_masterId`, by trimmed name, or clear; prices never change; `--target` other than `local` needs `--confirm-remote` |
| `scripts/seed-demo-business.js` | Fills a local database with one demo catering business (dry run by default; `--write`; local only) |
| `scripts/ai-eval-frontdesk.js` | Plan 681: the assistant's eval — plays the 30 dialogues of `eval/frontdesk/dialogues/` through `handleInbound` on the `sim` channel and scores what the server wrote; `--dry` validates the files; without it a live run on the real model chain against an in-memory database (`GEMINI_API_KEY`, exit 0 at 26/30, 1 below, 2 no key, 3 daily quota); never in CI |
| `eval/frontdesk/` | Plan 681: the eval set's data — `dialogue-schema.js` (strict zod shape of one dialogue), `room14.js` (plan 663's 14-table room and the table settings), `dialogues/NN-<slug>.json` (20 restaurant, 5 catering, 5 private chef) |
| `scripts/seed-demo-restaurant.js` | Fills a local database with one demo restaurant (plan 674): a 14-table room, a profile, 6 clients, 40 bookings placed by the table engine with their holds, 4 waiting parties; dry run by default; `--write`; local only; raises the demo assistant to level 1 (plan 719); `lib/demo-restaurant-data.js` is its pure builder |
| `middleware/auth.js` | `verifyToken` — JWT Bearer verification, attaches `req.user` |
| `middleware/require-module.js` | Plan 616: `requireModule`, `requireHomeModule`, `requireModuleForType` — 403 `MODULE_OFF` when the business lacks a module; 30 s cache, `clearModuleCache` |
| `scripts/catalog-enrichment/` | Plan 583: local-only master catalog pricing from the chains' published price files — `inventory`, `fetch-price-files`, `build-candidates`, `batch-view`, `merge-decisions`, `audit-sheet`, `apply-enrichment` (dry run unless `--write`), `merge-rescue`, `worksheet`, `stage-c-sheets`, `apply-worklist` (stage C + Dan's product fixes), `fix-line-units` (recipe/dish line units, backup + `--restore`), `report`, `verify-enrichment`; work folder `../foodvibe-catalog-work` beside the main checkout |

## Key Patterns
- **One model, many types**: All domain data (products, recipes, menus, etc.) uses the generic `Entity` model with `entityType` as discriminator (e.g. `PRODUCT_LIST`, `RECIPE_LIST`).
- **Auth required on all data routes**: `router.use(verifyToken)` gates everything in `generic.js`.
- **IDs from Angular**: `_id` is a 5-char alphanumeric string from Angular's `makeId()` — not a Mongo ObjectId.
- **New feature checklist**: Does the feature need persistence? → use existing `/api/v1/data/:type` routes. Needs custom logic? → add a new route file and mount it in `index.js`.
