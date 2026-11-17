# Plan 617 — Monthly AI cap per business, read from the usage ledger and enforced before the model call

Status: draft
Depends-on: 616
Snapshot: e916e48e3943a650ba9767ebb4023d20e823ae8d

## Problem Statement
Every business uses the AI at the platform's cost and nothing limits how much one business may use in a month (brief
MP-02). The usage ledger already records every call with its tokens, so the limit needs no second counter: an optional
monthly token cap on the business, compared with the ledger in one place, before any request leaves for the model
(Contract C-AICAP, assumption A2: no cap until the platform admin sets one).

Verified on `origin/main` (e916e48e, 2026-11-17):
- `server/services/gemini-client.js` (548 lines) is the only caller of the model. `callGemini({ body, timeoutMs, log,
  eventPrefix, needsVision, model, usage })` starts at line 403. Lines 404–409: a missing or unknown `usage.feature`
  throws under vitest and otherwise logs `ai.usage.missing` and sets `meter = false`. Lines 411–418 return
  `model_removed` or `all_exhausted` without a call; line 420 picks `model`; lines 421–424 return `model_exhausted`
  for a model known to be out; the first HTTP call is inside the loop at line 429 (`callOnce`, line 451, where
  `fetch` is at line 463). It never throws.
- `server/services/ai-usage.js` (195 lines): `recordAiUsage({ usage, model, ok, errorCode, data, body, latencyMs,
  log })` (line 73) writes one `aiUsage` row fire-and-forget; with no `data` the three token fields are 0 and with no
  `body` there is no `imageCount` (`buildRow`, lines 44–70). A row carries `day` = `jerusalemDate(at)` (line 62) and
  `businessId = usage.businessId ?? '__platform__'` (line 52). `_waitForUsageWritesForTests` is exported.
  `aggregateAiUsage` (line 149) counts a row with `ok: false` as a failed call and lists its `errorCode`.
- Indexes `ai_usage_business_day` `{ businessId: 1, day: 1 }` and `ai_usage_day_feature` exist (`server/db.js:102–103`).
- `jerusalemDate(ms)` (`server/middleware/usage.js:29`) gives the Israel calendar date `YYYY-MM-DD`.
- `server/routes/ai.js`: `usageOf(req)` (line 109) passes `req.user.businessId`; `respondFromGeminiFailure(res,
  result)` (line 325) maps `model_exhausted`, `all_exhausted`, `model_removed`, `gemini_error`, `timeout` and falls to
  500 for anything else; every model route answers a non-`ok` call through it (directly, or through
  `respondFromRecipeResult`, line 348). Plan 615 exports it for the AI sub-routers, so the mapping added here reaches them too.
- `server/test/gemini-client.test.js:55` calls `callGemini` with `usage.businessId: 'b1'` and **no database
  connection**; `server/test/ai-usage.test.js` calls it with `'bizA'`, which has no business document, on the
  in-memory Mongo app. Both must keep passing untouched.
- `server/routes/admin.js`: `GET /businesses` (line 87). After plan 616 its rows carry `modules`, `aiPrivate`,
  `aiMonthlyTokenCap`, and `PUT /businesses/:id/platform` writes `aiMonthlyTokenCap` (a number, or `null` to remove
  it). `businessSchema.aiMonthlyTokenCap` (integer ≥ 0, optional) comes from plan 615.
- The browser shows the daily-limit text for **any** 429 of an AI route (`ai-recipe-modal.component.ts:280`,
  `ai-product-modal.component.ts:356`, `ai-menu-modal.component.ts:336`, `recipe-ingredients-table.component.ts:376`,
  `product-import.component.ts:224`). Showing the cap's own Hebrew message is browser work (see Out of Scope).

## Goals & Success Criteria
**Primary:** a business over its monthly cap gets no model request: the call is refused before the first HTTP call,
one ledger row says so, and the route answers 429 `ai_monthly_cap_reached`; a business with no cap, and every platform
call, behave exactly as today.

- [auto] `pnpm run test:server` → exit 0, including the new `server/test/ai-cap.test.js`;
  `server/test/gemini-client.test.js` and `server/test/ai-usage.test.js` pass with no assertion changed (they are in scope only for a `clearCapCache()` line in `beforeEach`, if one is needed).
- [auto] `server/test/ai-cap.test.js` (`capState`): with a cap of 1,000 and seeded rows of 600 and 400 tokens in the
  current Israel month → `{ cap: 1000, used: 1000, over: true }`; with 600 and 399 → `over: false`; rows of the
  previous month and rows of another business do not count; with `now` at 2026-11-30 22:30 UTC (already 1 December
  in Israel) only December rows count; no cap stored → `{ cap: null, used: <sum>, over: false }`; cap 0 → `over:
  true` with no row at all; a second call inside 60 seconds makes no database read and one after
  `clearCapCache(businessId)` does.
- [auto] `server/test/ai-cap.test.js` (`callGemini`): for a business over its cap the result is `{ kind:
  'business_cap' }`, the stubbed `fetch` was called 0 times, and exactly one `aiUsage` row was written with `ok:
  false`, `errorCode: 'business_cap'`, `inputTokens: 0`, `outputTokens: 0`, `totalTokens: 0`, the business id and the
  feature; for a business under its cap `fetch` is called once and the row is `ok: true`.
- [auto] `server/test/ai-cap.test.js`: a call with no `usage.businessId`, and one with `'__platform__'`, reads the
  `businesses` collection 0 times (spy on the collection) and calls `fetch`; a call without `usage.feature` still
  throws `callGemini: usage.feature required`; a failed cap read (the lookup rejects) lets the call go on and logs
  `ai.cap.check_failed`.
- [auto] `server/test/ai-cap.test.js` (route): `POST /api/v1/ai/parse-text` by an owner of a business over its cap
  answers 429 with `error: 'ai_monthly_cap_reached'` and `code: 'ai_monthly_cap_reached'`, and `fetch` was not called;
  `POST /api/v1/ai/generate` (the recipe path) answers the same.
- [auto] `server/test/admin-businesses.test.js`: every row of `GET /api/v1/admin/businesses` has `aiTokensThisMonth`
  — the sum of `totalTokens` of this Israel month for a business with ledger rows, `0` for one without.
- [auto] `server/test/admin-platform.test.js`: after `PUT /api/v1/admin/businesses/:id/platform` with
  `aiMonthlyTokenCap: 1` for a business that already used 50 tokens this month, its very next AI call answers 429
  `ai_monthly_cap_reached` (the cap cache was cleared), and after `aiMonthlyTokenCap: null` the next call reaches `fetch`.
- [auto] `pnpm --dir server run lint` → exit 0. `pnpm run build` → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.

## Execution Mode
- Parallel: no — third plan of run `mod-0` (615, 616, 617, 618, 619, 620, in that order). It edits
  `server/routes/admin.js` (after 616, before 618), `server/services/gemini-client.js` (before 619) and
  `server/routes/ai.js` — shared registries of the map's must-not-run list. No other plan of the program, and no open
  plan that edits `server/routes/ai.js`, may run beside it.
- Concurrent plans: none
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/services/ai-cap.js
server/services/gemini-client.js
server/routes/ai.js
server/routes/admin.js
server/test/ai-cap.test.js
server/test/gemini-client.test.js
server/test/ai-usage.test.js
server/test/admin-businesses.test.js
server/test/admin-platform.test.js
docs/agent/standards-backend.md
server/breadcrumbs.md
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-2: preserves — `ai-cap.js` reads one business's own cap and its own ledger rows by `businessId`; it reads no entity collection, copies nothing between businesses and takes no part in master sync. Ledger rows stay server-only.
- INV-6: preserves — the cap is tested inside `callGemini`, which is reached only through `server/routes/ai.js`; the browser still holds no key and only receives one more refusal code.

## Reuse Check

- `server/services/ai-cap.js` (`capState`, `monthTokensByBusiness`, `clearCapCache`) — family: none — rung: 4 — why: server service; no per-business limit exists. It reads the existing `aiUsage` ledger, so there is no second counter, and sits beside `ai-usage.js` and `gemini-client.js`.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As the platform admin, I want to give one business a monthly AI ceiling so that a single customer cannot use up what the platform pays for.
- As the platform admin, I want to see this month's tokens beside the cap for every business so that I can tell who is close before they are stopped.
- As an owner whose business reached its ceiling, I want a clear refusal instead of a spinner or a model error so that I know to contact FoodVibe.
- As a chef in a business with no ceiling, I want every AI action to work exactly as before so that nothing in my day changes.

## Functional Requirements

### Must Have (P0)
- [ ] Contract copied verbatim from `docs/modules/modules-map.md` (frozen 2026-11-17):
  **C-AICAP (617)**
  - `business.aiMonthlyTokenCap?: number` (integer ≥ 0; absent or `null` = no cap, A2).
  - `server/services/ai-cap.js` → `capState(db, businessId, now) → { cap, used, over }`. The month is the calendar
    month in `Asia/Jerusalem` (the `day` field of `aiUsage`); `used` = the sum of `totalTokens` of that month's rows.
    A per-process cache of at most 60 s per business is allowed.
  - Enforced in `callGemini`, before the first HTTP call, when `usage.businessId` is a real business: it returns a
    failure of kind `business_cap`, writes one ledger row `ok: false, errorCode: 'business_cap'` with zero tokens,
    and makes no request. `respondFromGeminiFailure` maps it to 429 `{ error: 'ai_monthly_cap_reached' }`.
    `'__platform__'` calls are never capped. Message key `ai_monthly_cap_reached`.
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
- [ ] `server/services/ai-cap.js` (new):
  - `monthRangeOf(now)` → `{ from, to }`: `ym = jerusalemDate(now).slice(0, 7)`, `from = ym + '-01'`, `to = ym +
    '-31'` (the `day` field is a `YYYY-MM-DD` string, so a string range covers the month).
  - `capState(db, businessId, now)` → `{ cap, used, over }`: `cap` = the business's `aiMonthlyTokenCap` when it is a
    number, else `null` (one `findOne` on `businesses` with the projection `{ aiMonthlyTokenCap: 1 }`); `used` = the
    sum of `totalTokens` of `aiUsage` rows with that `businessId` and `day` in the range (one aggregation on the
    `ai_usage_business_day` index); `over` = `cap !== null && used >= cap`. The result is kept per business for
    60,000 ms. It throws on a database error; the caller decides what that means.
  - `monthTokensByBusiness(db, now)` → `Map<businessId, number>`: one aggregation grouped by `businessId` over the
    same range, not cached (the platform table).
  - `clearCapCache(businessId?)`: one entry, or all. Tests call it in `beforeEach`.
- [ ] `server/services/gemini-client.js` `callGemini`: one block directly after `const model = …` (line 420) and
  before the known-exhausted check (line 421):
  - It runs only when `usage?.businessId` is a non-empty string other than `'__platform__'` and `'__master__'`. A
    call with no business makes no cap read.
  - When `mongoose.connection.readyState !== 1` it is skipped silently (callers without a database keep working).
  - `capState(mongoose.connection.db, usage.businessId, Date.now())` inside `try`; a thrown error logs
    `log.warn({ event: 'ai.cap.check_failed', businessId })` and the call goes on (a ledger problem never blocks AI).
  - When `over`: if `meter` is true, `recordAiUsage({ usage, model, ok: false, errorCode: 'business_cap', latencyMs:
    0, log })` (no `data`, no `body`: zero tokens, no image count); `log.info({ event: 'ai.cap.refused', feature:
    usage.feature })`; return `{ kind: 'business_cap', model, cap, used }`. `incrementUsage` is not called and no
    request is made.
  - The lines above it are unchanged: the feature check still throws under vitest, and `model_removed` /
    `all_exhausted` still return first (no call would have been made anyway). The function's comment gains the new
    result kind.
- [ ] `server/routes/ai.js` `respondFromGeminiFailure` (line 325): `case 'business_cap': return
  res.status(429).json({ error: 'ai_monthly_cap_reached', code: 'ai_monthly_cap_reached' })`. No other change in the
  file. `ai_monthly_cap_reached` is also the message key the browser will translate.
- [ ] `server/routes/admin.js`:
  - `GET /businesses`: `monthTokensByBusiness(mongoose.connection.db, now)` joins the `Promise.all`; each row gains
    `aiTokensThisMonth: tokens.get(b._id) ?? 0`.
  - `PUT /businesses/:id/platform` (plan 616): after the write, when `aiMonthlyTokenCap` was in the body,
    `clearCapCache(id)`.
- [ ] A capped business may pass its cap by what it uses within the 60 seconds a cached state lives, and by calls
  already in flight; that is accepted (C-AICAP allows the cache) and is written in the service's comment.
- [ ] `docs/agent/standards-backend.md`: the existing `aiUsage` row of §1 gains "`errorCode: 'business_cap'` =
  refused by the monthly cap, no call made" (the only doc change; this plan adds no route and no collection).
  `server/breadcrumbs.md`: a row for the new `services/ai-cap.js`.

### Should Have (P1)
- [ ] none

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- No screen in this plan and no dictionary key. The Hebrew text for `ai_monthly_cap_reached`, the place each AI
  window shows it, the cap input in the platform dialog and the "AI this month / cap" column are plan 620.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [ ] A1: Work out from the ledger how much AI a business used this month and whether it is over its ceiling — monthRangeOf, capState with the 60-second cache, monthTokensByBusiness, clearCapCache; month boundary, other business, no cap, cap zero and cache cases — server/services/ai-cap.js, server/test/ai-cap.test.js
- [ ] A2: Stop a capped business before any request leaves for the model and record the refusal — the block after the model is picked; business_cap result, one zero-token ledger row, no fetch; platform calls unread, feature check unchanged, failed read lets the call through — server/services/gemini-client.js, server/test/ai-cap.test.js
- [ ] A3: Answer a refused AI action with one clear code every AI route shares — business_cap case in respondFromGeminiFailure; parse-text and generate route cases — server/routes/ai.js, server/test/ai-cap.test.js
- [ ] A4: Give the platform table this month's tokens and make a new ceiling count at once — aiTokensThisMonth in GET businesses, clearCapCache after the platform write; update both admin tests — server/routes/admin.js, server/test/admin-businesses.test.js, server/test/admin-platform.test.js
- [ ] A5: Write the cap into the backend docs and the server map — docs/agent/standards-backend.md, server/breadcrumbs.md
- [ ] A6: Run every check and record the results — test:server, server lint, build, log-query; paste the exit lines into Execution Notes — this plan file

## Technical Considerations
- Dependencies: plan 615 (`business.aiMonthlyTokenCap`), plan 616 (the platform write and the row fields). `recordAiUsage`, `jerusalemDate`, the `ai_usage_business_day` index. A business call adds at most one `businesses` read and one indexed aggregation per 60 seconds.
- New files needed: `server/services/ai-cap.js`, `server/test/ai-cap.test.js`.
- Model changes: none.
- Backend / API: `callGemini` may return `{ kind: 'business_cap', model, cap, used }`; AI routes may answer 429 `{ error: 'ai_monthly_cap_reached', code: 'ai_monthly_cap_reached' }`; `GET /api/v1/admin/businesses` rows gain `aiTokensThisMonth`.
- Auth and validation: nothing new is accepted from a caller; the cap is written only by the platform admin's route of plan 616.
- Security surface: none new. The refusal carries no number (neither the cap nor the usage reaches a business member); logs carry the business id and the feature only.
- Data / migration: none. A refused call adds one small `aiUsage` row; no new collection or index. Tests fake the model the way `server/test/ai-usage.test.js` does (`vi.stubGlobal('fetch', vi.fn())`, `resetForTests()`, `_waitForUsageWritesForTests()`), pass the clock as the `now` argument of `capState`, and seed ledger rows whose `day` is `jerusalemDate(Date.now())` for the `callGemini` and route cases; no key, real model or network is needed.
- Project checks: `[auto] log-query`; `pnpm run test:server`; no new collection, no dictionary key, no icon.

## Out of Scope
- The browser: the Hebrew message, the five AI entry points that today show the daily-limit text for any 429, the cap input and the "AI this month / cap" column (620). The [human] check of brief MP-02 (set a cap, see the Hebrew message) belongs to 620.
- A daily cap, a cap per feature or per user, a warning before the cap is reached, and any e-mail or notice to the owner.
- Showing a business its own usage or cap.
- Changing the model chain, the daily quotas or the price table.

## Critical Questions
- none

## Execution Notes
- decided: `over` is `used >= cap` — why: a cap of 0 then means "no AI at all", and a business that reached its number is stopped on the next call rather than one call later.
- decided: the check sits after the model is picked and before the known-exhausted answer — why: the ledger row needs a model, and a capped business should hear about its cap, not be asked to switch model first; the two earlier returns make no call either way.
- decided: a failed cap read lets the call through, and a missing database connection skips the check silently — why: `callGemini` never throws and the ledger must never break an AI action; `gemini-client.test.js` runs without a database.
- decided: the refusal is logged at `info` and the 429 body also carries `code` — why: a capped business would otherwise fill the stored warnings; every other case of `respondFromGeminiFailure` carries `code`.
- decided: the cap row is written only when the call is metered (a valid feature) — why: the ledger takes only known feature keys; the cap is still enforced for a call with a business and no valid feature (map delta 9).
- decided: `aiTokensThisMonth` is added here, not in 616 — why: it is read from the ledger by the same month rule as the cap (C-AICAP); 616 adds `modules`, `aiPrivate`, `aiMonthlyTokenCap`.
- decided: this plan has no dictionary key and no [human] item — why: it is server-only; the message is shown by plan 620 in the same run.
