# Plan 566 — Meter every AI call so pricing can be set from real numbers

Status: draft
Depends-on: 543, 532
Snapshot: 05741afd08ec936d1aec6f8d9a53631141905f93

## Problem Statement
The Front Desk program adds AI features (knowledge import 554, the assistant 562, voice notes 560). Before any of them
ships, Dandan needs to know what each call costs, per business and per feature, so the paid plans can be priced from
real numbers (brief Part 0.5 D8, rule R-21: "Every model call is metered — business, feature, model, input/output
tokens, audio seconds, latency, outcome, estimated cost (C-AIUSAGE)"). Today the server counts calls per model per day
only, for the free-tier quota chain; it records no tokens, no business and no feature.

Verified on `origin/main` (5702f6d1, 2026-11-10):
- `server/services/gemini-client.js` (498 lines) is the only place that calls Gemini. `callGemini({ body, timeoutMs, log, eventPrefix, needsVision = false, model: requested })` at line 399 makes **exactly one** HTTP call per invocation (plan 395: the server never falls back to another model by itself). `incrementUsage(model)` (line 209) writes the per-model day counter in `GEMINI_USAGE`. It returns `{ kind: 'ok' | 'model_removed' | 'model_exhausted' | 'all_exhausted' | 'gemini_error' | 'timeout' | 'network', … }` and never throws.
- Several rows per user action come from the route side, not the chain: `callGeminiForRecipeWithRetry` (`server/routes/ai.js:254`) calls `callGeminiForRecipe` → `callGemini` a second time when the first reply is unusable JSON. The card's trap ("retries down a model chain") is corrected here: one action = one row per real HTTP call, retry included.
- Every `callGemini` call site is in `server/routes/ai.js` (13 sites). `server/routes/product-import.js` does **not** call Gemini (it only imports `createRateLimiter`, `verifyToken`, `assertCan`, scope helpers). `server/scripts/ai-eval-recipes.js` calls `fetch(modelUrl(model))` directly, not `callGemini`, and has no business.
- Call sites, route → eventPrefix → feature key this plan passes:

| Line | Route | eventPrefix | feature |
|---|---|---|---|
| 335 (via retry helper) | `POST /generate` | `ai.generate` | `recipe_generate` |
| 409 | `POST /parse-text` | `ai.parse_text` | `parse_text` |
| 484 | `POST /parse-price-list` | `ai.parse_price_list` | `parse_price_list` |
| 556 | `POST /parse-receipt-photo` | `ai.parse_receipt_photo` | `receipt_photo` |
| 668 | `POST /match-product-names` | `ai.match_product_names` | `product_match` |
| 776 | `POST /patch-recipe` | `ai.patch_recipe` | `recipe_patch` (new key) |
| 915 | `POST /generate-menu` | `ai.generate_menu` | `menu_generate` (new key) |
| 1010 | `POST /patch-menu` | `ai.patch_menu` | `menu_patch` (new key) |
| 1133 | `POST /generate-product` | `ai.generate_product` | `product_generate` (new key) |
| 1224 | `POST /patch-product` | `ai.patch_product` | `product_patch` (new key) |
| 1293 (via retry helper) | `POST /generate-from-image` | `ai.generate_from_image` | `recipe_from_image` (new key) |
| 1335 | `POST /generate-product-from-image` | `ai.generate_product_from_image` | `product_from_image` |
| 1467 (via retry helper) | `POST /generate-from-url` | `ai.generate_from_url` | `generate_from_url` |

- The C-AIUSAGE closed list names 7 existing-route keys; the code has 13 routes. The 6 keys marked "new key" above extend the list so R-21 ("every model call") holds — see Execution Notes.
- Platform admin routes live in `server/routes/admin.js` (`verifyToken, requirePlatformAdmin`, e.g. `GET /businesses` line 77). The `/platform` page is `src/app/pages/platform-dashboard/platform-dashboard.page.ts` (176 lines) with `PlatformAdminService` (`src/app/core/services/platform-admin.service.ts`). `jerusalemDate(ms)` is exported by `server/middleware/usage.js`.
- `server/constants/collections.js` `COLLECTIONS` has no server-only entry today (`usageDays`, `GEMINI_USAGE` are not listed); indexes are created in `server/db.js`.

## Goals & Success Criteria
**Primary:** every real Gemini HTTP call writes one `aiUsage` row with business, feature, model, tokens, latency, outcome and
an estimated USD cost, and the platform admin sees the totals per business and per feature on `/platform`.

- [auto] `pnpm run test:server` passes, including `server/test/ai-usage.test.js` and the updated `server/test/gemini-client.test.js`.
- [auto] A mocked Gemini reply with `usageMetadata { promptTokenCount: 1200, candidatesTokenCount: 300, thoughtsTokenCount: 100, totalTokenCount: 1600 }` on `gemini-3.1-flash-lite` writes exactly one row: `inputTokens 1200`, `outputTokens 400`, `totalTokens 1600`, `ok: true`, `estCostUsd` = (1200 × 0.25 + 400 × 1.50) / 1,000,000 = `0.0009`, `day` in Asia/Jerusalem (`server/test/ai-usage.test.js`).
- [auto] A 500 reply, a timeout, a network error and a daily-quota 429 each write one row with `ok: false` and `errorCode` `http_500` / `timeout` / `network` / `quota`; `model_removed`, an already-known exhausted model and `all_exhausted` write no row (no HTTP call was made) (`server/test/ai-usage.test.js`).
- [auto] `callGemini` without `usage`, or with a `feature` not in `AI_FEATURES`, throws under vitest (`server/test/gemini-client.test.js`).
- [auto] A failed ledger insert never changes the `callGemini` result and logs `ai.usage.write_failed` (`server/test/ai-usage.test.js`).
- [auto] Every model in `DEFAULT_MODELS` has a row in `AI_PRICES`, and every `callGemini` call site in `server/routes/ai.js` passes a `usage.feature` from `AI_FEATURES` (static test reading the file: 13 `callGemini(` / retry-helper sites, 13 `feature:` keys) (`server/test/ai-usage.test.js`).
- [auto] A recipe `POST /generate` whose first reply is invalid JSON and second is valid writes two rows with `feature: 'recipe_generate'` (`server/test/ai-usage.test.js`).
- [auto] `GET /api/v1/admin/ai-usage?groupBy=business|feature|model|day` returns the right totals for seeded rows of two businesses; a business owner gets 403; `format=csv` returns `text/csv` with a header row (`server/test/ai-usage.test.js`).
- [auto] No `aiUsage` row contains a prompt, reply text or phone: the stored keys are exactly the C-AIUSAGE field list (`server/test/ai-usage.test.js`).
- [auto] `pnpm run test:ci` passes, including the new cases in `src/app/pages/platform-dashboard/platform-dashboard.page.spec.ts` (table rows from a stubbed service; drill-down by feature; empty state).
- [auto] `pnpm --dir server run lint` exits 0, `pnpm run lint` exits 0, `pnpm run lint:icons` exits 0.
- [auto] `pnpm run build` passes.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] On `/platform`, signed in as the platform admin, the "שימוש ב-AI החודש" table shows this month's calls, tokens and estimated cost per business, and a row opens the per-feature breakdown.
- [human] Dandan makes one real AI call (e.g. a recipe from text), then compares its row's tokens with the usage shown in Google AI Studio for that minute; the numbers match.

## Execution Mode
- Parallel: no — the map's must-not-run list: no other plan editing `server/services/gemini-client.js` or `server/routes/ai.js` (554, 562 run after 566). Also not with 532 (running in `run-522`; edits `server/routes/admin.js` and the platform dashboard — hence Depends-on 532), 568 (edits `src/app/pages/platform-dashboard/**`), 544 (`collections.js`, `db.js`; lane order 544 → 545 → 566).
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/services/gemini-client.js
server/services/ai-usage.js
server/constants/ai-features.js
server/constants/ai-prices.js
server/constants/collections.js
server/db.js
server/routes/ai.js
server/routes/admin.js
server/test/gemini-client.test.js
server/test/ai-usage.test.js
server/test/ai-match-product-names.test.js
server/test/ai-receipt-photo.test.js
server/test/price-list-prompt.test.js
server/test/product-import-route.test.js
src/app/pages/platform-dashboard/**
src/app/core/services/platform-admin.service.ts
src/app/core/models/ai-usage.model.ts
src/app/app.config.ts
public/assets/data/dictionary.json
docs/agent/standards-backend.md
server/breadcrumbs.md
src/app/core/models/breadcrumbs.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-1: preserves — the new admin route uses `verifyToken, requirePlatformAdmin` like every route in `admin.js`; nothing a business member writes changes.
- INV-2: preserves — `aiUsage` rows carry the caller's `businessId` (or `'__platform__'`), are server-only and never cloned; `server/services/ai-usage.js` reads them only for the platform admin.
- INV-6: preserves — every Gemini call still goes through `server/routes/ai.js` → `gemini-client.js`; the browser only reads totals from the admin route.

## Reuse Check

- `server/services/ai-usage.js` (`recordAiUsage`, `aggregateAiUsage`, `estimateCostUsd`) — family: none — rung: 4 — why: server service; no ledger exists. It sits beside `gemini-client.js` so the client file stays the one Gemini caller.
- `server/constants/ai-features.js`, `server/constants/ai-prices.js` — family: none — rung: 4 — why: new closed lists (C-AIUSAGE); constants, not UI.
- `PlatformAdminService.getAiUsage()` — family: http — rung: 3 — why: one more method on the existing admin service, same `environment.apiUrl` + `API.admin(...)` pattern.
- AI usage table on `/platform` — family: empty-state — rung: 1 — why: added to the existing platform dashboard page with its own `.platform-table` styles; `app-empty-state` for "no calls yet", `app-loader` (feedback family) while loading.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the platform admin, I want to see what AI costs per business and per feature so that I can price the paid plans from real numbers.
- As the platform admin, I want a failed or retried call to count too so that the estimate is never lower than the real bill.
- As a chef, I want metering to never slow down or break my AI action so that recipes from text still work when the ledger has a problem.

## Functional Requirements

### Must Have (P0)
- [ ] Contract copied verbatim from `docs/frontdesk/frontdesk-map.md` (frozen):
  - **C-AIUSAGE (566; used by 554, 559, 560, 562, 565)**
    - Collection `aiUsage` (server-only, not in the generic API, `userData: false`, no soft delete), one row per model call: `{ _id, businessId | '__platform__', userId?, feature, model, ok, errorCode?, inputTokens, outputTokens, totalTokens, audioSeconds?, imageCount?, latencyMs, estCostUsd, at, day: 'YYYY-MM-DD' (Asia/Jerusalem) }`. No prompt text, no reply text, no phone.
    - `feature` keys (closed list in `server/constants/ai-features.js`): existing routes `recipe_generate`, `parse_text`, `generate_from_url`, `parse_price_list`, `product_match`, `product_from_image`, `receipt_photo`; new `knowledge_import`, `frontdesk_turn`, `frontdesk_suggest`, `voice_transcribe`, `knowledge_correction`, `eval`.
    - `callGemini({ …, usage: { businessId, userId?, feature } })` — `usage` is required; a call without it throws in tests. Token counts come from the response `usageMetadata`; a failed call writes a row with `ok: false`.
    - `server/constants/ai-prices.js`: `{ [model]: { inputPerMTok, outputPerMTok, audioPerMinute? } }` in USD with a `pricesAsOf` date; `estCostUsd` is computed at write time from this table (the free tier still gets the paid-tier estimate — that is the number pricing needs).
    - `GET /api/v1/admin/ai-usage?from&to&groupBy=business|feature|model|day` (platform admin) → totals of calls, tokens, cost. Indexes `{ businessId, day }`, `{ day, feature }`.
    - Per-business daily cap (FD-07 `frontDeskUsage.aiTurns`) is read from this ledger — no second counter.
- [ ] `server/constants/ai-features.js` exports `AI_FEATURES` (frozen array) = the 13 C-AIUSAGE keys plus the 6 keys for existing routes the contract list missed: `recipe_patch`, `menu_generate`, `menu_patch`, `product_generate`, `product_patch`, `recipe_from_image` (19 keys), and `isAiFeature(key)`.
- [ ] `server/constants/ai-prices.js` exports `PRICES_AS_OF = '2026-11-10'`, `PRICES_SOURCE = 'https://ai.google.dev/gemini-api/docs/pricing'` and `AI_PRICES` (USD per 1M tokens, Standard paid tier, text/image/video input; output includes thinking tokens): `gemini-3.1-flash-lite` 0.25 / 1.50 · `gemini-3.5-flash-lite` 0.30 / 2.50 · `gemini-2.5-flash-lite` 0.10 / 0.40 · `gemini-2.5-flash` 0.30 / 2.50 · `gemini-3.6-flash` 1.50 / 7.50 · `gemini-3.8-flash` 0.375 / 1.875 · `gemini-3-flash-preview` 0.50 / 3.00. The Worker re-reads the pricing page while building; a value that changed is updated and the change is written in Execution Notes. `audioPerMinute` is left unset (no audio feature yet; plan 560 adds it).
- [ ] `server/services/ai-usage.js`:
  - `estimateCostUsd(model, inputTokens, outputTokens)` → `(in × inputPerMTok + out × outputPerMTok) / 1e6`, rounded to 6 decimals; a model with no price → `0` and one `ai.usage.no_price` warn per model per process.
  - `recordAiUsage({ usage, model, ok, errorCode, data, body, latencyMs, log })` builds the row: `inputTokens = usageMetadata.promptTokenCount ?? 0`, `outputTokens = (candidatesTokenCount ?? 0) + (thoughtsTokenCount ?? 0)`, `totalTokens = totalTokenCount ?? inputTokens + outputTokens`, `imageCount` = number of `inlineData` parts with an `image/*` `mimeType` in `body.contents` (omitted when 0), `at = Date.now()`, `day = jerusalemDate(at)`, `businessId = usage.businessId ?? '__platform__'`, `userId` only when given. Inserts into `aiUsage`; the promise is tracked in a module set and never awaited by `callGemini`; a rejected insert logs `ai.usage.write_failed` (warn, with `feature` and `model` only). Exports `_waitForUsageWritesForTests()`.
  - `aggregateAiUsage(db, { from, to, groupBy, businessId? })` — one aggregation on `day` in [from, to]: `calls`, `failedCalls` (`ok: false`), `inputTokens`, `outputTokens`, `totalTokens`, `estCostUsd` per group key, plus `totals`. `groupBy=business` adds `label` = the business `name` from `businesses`.
- [ ] `server/services/gemini-client.js` `callGemini` gains `usage`:
  - Before any work: `usage` missing or `!isAiFeature(usage.feature)` → under vitest (`process.env.VITEST`) throw `Error('callGemini: usage.feature required')`; otherwise log `ai.usage.missing` (error) and go on without a ledger row.
  - A row is written after every real HTTP call: success (`ok: true`), non-OK reply (`ok: false`, `errorCode: 'http_<status>'`; daily-quota 429 → `'quota'`), timeout (`'timeout'`), network error (`'network'`), unreadable body (`'unreadable'`). No row for `model_removed`, a known-exhausted model or `all_exhausted` (no call made). `latencyMs` is measured around `fetch` + body read.
  - Return values and logging stay exactly as today; `incrementUsage` stays (it is the quota counter, not the ledger).
- [ ] `server/routes/ai.js`: each of the 13 call sites passes `usage: { businessId: req.user.businessId, userId: req.user.userId, feature: '<key>' }` per the table in the Problem Statement (the 3 retry-helper callers pass it in the options object, which `callGeminiForRecipe` spreads into `callGemini`). No other change to the routes.
- [ ] `server/constants/collections.js`: entry `{ name: 'aiUsage', userData: false, cloneable: false, backup: false, searchable: false, softDelete: false }` with a comment "server-only AI ledger (plan 566, C-AIUSAGE)". `server/db.js`: indexes `{ businessId: 1, day: 1 }` (`ai_usage_business_day`) and `{ day: 1, feature: 1 }` (`ai_usage_day_feature`).
- [ ] `server/routes/admin.js`: `GET /ai-usage` (`verifyToken, requirePlatformAdmin`). Query: `from`, `to` (`YYYY-MM-DD`, default the first and last day of the current Asia/Jerusalem month), `groupBy` (`business` default | `feature` | `model` | `day`, else 400 `BAD_GROUP_BY`), optional `businessId` (drill-down), `format=csv`. Range over 366 days or `from > to` → 400 `BAD_RANGE`. JSON: `{ from, to, groupBy, pricesAsOf, rows: [{ key, label?, calls, failedCalls, inputTokens, outputTokens, totalTokens, estCostUsd }], totals }`. CSV: `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="ai-usage-<from>-<to>.csv"`, header `key,label,calls,failedCalls,inputTokens,outputTokens,totalTokens,estCostUsd`.
- [ ] `/platform` (`platform-dashboard.page.*`): a second section under the businesses table, title `platform_ai_usage_title`, loaded once with `groupBy=business` for the current month. Columns: business, calls, failed, tokens, estimated cost (USD, 4 decimals). A row click loads `groupBy=feature&businessId=<id>` and shows the per-feature rows under it (one open at a time; feature label `ai_feature_<key>`). A note line `platform_ai_cost_note` with the `pricesAsOf` date. A "ייצוא CSV" button (`download` icon) opens the CSV URL for the current month. Empty → `app-empty-state` with `platform_ai_empty`. State in signals (`aiUsage_`, `aiDrill_`, `aiLoading_`).
- [ ] `src/app/core/models/ai-usage.model.ts` (`AiUsageRow`, `AiUsageReport`) and `PlatformAdminService.getAiUsage(params)`.
- [ ] `docs/agent/standards-backend.md`: §1 row for `aiUsage` (server-only), §5 row for `GET /api/v1/admin/ai-usage`. `server/breadcrumbs.md`: rows for `services/ai-usage.js`, `constants/ai-features.js`, `constants/ai-prices.js`.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- RTL; numbers left-to-right inside cells; logical CSS properties only; reuse the page's `.platform-table` look.
- Dictionary keys (Hebrew values) to add in `public/assets/data/dictionary.json`:
  - `platform_ai_usage_title` "שימוש ב-AI החודש" · `platform_ai_col_calls` "קריאות" · `platform_ai_col_failed` "נכשלו" · `platform_ai_col_tokens` "טוקנים" · `platform_ai_col_cost` "עלות משוערת ($)" · `platform_ai_cost_note` "הערכה לפי מחירון בתשלום, גם כשהשימוש בחינם. מחירון מתאריך" · `platform_ai_by_feature` "לפי פעולה" · `platform_ai_export_csv` "ייצוא CSV" · `platform_ai_empty` "אין עדיין קריאות AI בתקופה הזו"
  - Feature labels: `ai_feature_recipe_generate` "יצירת מתכון" · `ai_feature_recipe_patch` "עריכת מתכון" · `ai_feature_recipe_from_image` "מתכון מתמונה" · `ai_feature_parse_text` "ניתוח טקסט" · `ai_feature_generate_from_url` "מתכון מקישור" · `ai_feature_parse_price_list` "מחירון ספק" · `ai_feature_receipt_photo` "צילום חשבונית" · `ai_feature_product_match` "התאמת מוצרים" · `ai_feature_product_generate` "יצירת מוצר" · `ai_feature_product_patch` "עריכת מוצר" · `ai_feature_product_from_image` "מוצר מתמונה" · `ai_feature_menu_generate` "יצירת תפריט" · `ai_feature_menu_patch` "עריכת תפריט" · `ai_feature_knowledge_import` "ייבוא מידע על העסק" · `ai_feature_frontdesk_turn` "תשובת עוזר" · `ai_feature_frontdesk_suggest` "הצעת החלטה" · `ai_feature_voice_transcribe` "תמלול הודעה קולית" · `ai_feature_knowledge_correction` "תיקון תשובה" · `ai_feature_eval` "בדיקת איכות"
- Lucide icons: `download` (already registered in `src/app/app.config.ts` as `Download`), `arrow-up-down` (already used on the page). No new icon; `pnpm run lint:icons` confirms.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Name every AI feature and price every model in two fixed lists — the 19 feature keys and the price table with its date and source — server/constants/ai-features.js, server/constants/ai-prices.js
- [ ] A2: Add the ledger that writes one row per real model call without ever slowing or breaking it — recordAiUsage, estimateCostUsd, aggregateAiUsage; collection entry and two indexes — server/services/ai-usage.js, server/constants/collections.js, server/db.js
- [ ] A3: Make the Gemini caller require a feature and write a ledger row on success and every failure — usage parameter, throw under vitest, no row when no call was made; update the test helper — server/services/gemini-client.js, server/test/gemini-client.test.js
- [ ] A4: Tag each of the thirteen AI routes with its feature so every call is counted — the table in the Problem Statement; fix the route tests that call these routes if they now need usage — server/routes/ai.js, server/test/ai-match-product-names.test.js, server/test/ai-receipt-photo.test.js, server/test/price-list-prompt.test.js, server/test/product-import-route.test.js
- [ ] A5: Test the ledger end to end — tokens and cost, each failure kind, no-call cases, retry gives two rows, failed insert is silent, stored fields, every route tagged — server/test/ai-usage.test.js
- [ ] A6: Let the platform admin read totals by business, feature, model or day, also as a file — GET /ai-usage with ranges, drill-down and CSV; tests for totals, 403 and CSV — server/routes/admin.js, server/test/ai-usage.test.js
- [ ] A7: Show this month's AI usage per business on the platform dashboard with a per-feature breakdown — model, service method, table, drill-down, CSV button, dictionary keys, spec cases — src/app/pages/platform-dashboard/platform-dashboard.page.ts, .html, .scss, .spec.ts, src/app/core/services/platform-admin.service.ts, src/app/core/models/ai-usage.model.ts, public/assets/data/dictionary.json
- [ ] A8: Record the new collection and route in the backend docs and the server map — docs/agent/standards-backend.md, server/breadcrumbs.md
- [ ] A9: Run the full checks and hand Dandan the two hand checks — test:server, test:ci, both lints, lint:icons, build, log-query; then the [human] cards

## Technical Considerations
- Dependencies: `gemini-client.js` return contract unchanged (every route keeps working); `GEMINI_USAGE` quota counter unchanged.
- New files needed: `server/services/ai-usage.js`, `server/constants/ai-features.js`, `server/constants/ai-prices.js`, `server/test/ai-usage.test.js`, `src/app/core/models/ai-usage.model.ts`.
- Model changes: `AiUsageRow`, `AiUsageReport` (client).
- Backend / API: `GET /api/v1/admin/ai-usage` (platform admin). `callGemini` signature gains required `usage`.
- Auth and validation: platform admin only (`requirePlatformAdmin`); query params checked (`BAD_GROUP_BY`, `BAD_RANGE`).
- Security surface: the ledger stores no prompt, reply or phone (tested). The CSV holds business names and numbers only, for the platform admin.
- Data / migration: new server-only collection, created on first insert; indexes at startup. No migration. Free tier: one small document per AI call (≈ 250 bytes; 10,000 calls ≈ 2.5 MB on Atlas M0).
- Project checks: `[auto] log-query`; dictionary keys named; icons named (already registered); Reuse Check filled; `pnpm run test:server` + `pnpm run test:ci`.

## Out of Scope
- `server/scripts/ai-eval-recipes.js` — it calls Gemini directly with no business and no database; the `eval` key is reserved for plan 562's eval, which goes through `callGemini`.
- Audio pricing (`audioSeconds`, `audioPerMinute`) — plan 560 (voice notes) fills them.
- The per-business daily AI cap (`frontDeskUsage.aiTurns`) — plan 562 reads it from this ledger.
- Changing any existing prompt (some are Hebrew today; D12 applies to new prompts).
- Showing usage to business owners.

## Critical Questions
- none

## Execution Notes
- Contract extension (map "Contract extensions (run)"): plan 566 · `AI_FEATURES` gains `recipe_patch`, `menu_generate`, `menu_patch`, `product_generate`, `product_patch`, `recipe_from_image` · the C-AIUSAGE list named 7 existing-route keys but `server/routes/ai.js` has 13 Gemini routes; R-21 requires every call metered.
- Prices looked up 2026-11-10 on https://ai.google.dev/gemini-api/docs/pricing (Standard tier). `gemini-3.8-flash`: Google's "What's new in Gemini 3.8 Flash" page gives an introductory $0.75 / $3.75 through 2026-12-31 ($1.50 / $7.50 from 2027-01-01) while the pricing page showed $0.375 / $1.875 — Human chose the pricing-page value $0.375 / $1.875 (2026-11-10); re-check at build.
- Plan number: map row 3b, renumbered +2 on 2026-11-10 (old 564 → 566).
- Prices re-read 2026-11-10: no network lookup of the pricing page was possible in this run; the plan's values (incl. gemini-3.8-flash 0.375 / 1.875, the Human's choice) were used unchanged.
- CSV: the page fetches the CSV with the session token (blob) and saves it, because a plain link cannot carry the Bearer header.
- Evidence: pnpm run test:server -> exit 0 (77 files, 934 tests); pnpm run test:ci -> exit 0 (1877 SUCCESS); pnpm run lint / lint:icons / lint:no-native-select / server lint / build -> exit 0; kit-manifest-check ok; override-check ok; plan-ledger-check OK.
- BLOCKED: node scripts/breadcrumbs-check.mjs -> exit 1 ("src/app/core/models/breadcrumbs.md ... not mentioned: ai-usage.model.ts"). The fix is one row in src/app/core/models/breadcrumbs.md, which is outside the Read-Write Scope. Needs `approved: src/app/core/models/breadcrumbs.md`.
