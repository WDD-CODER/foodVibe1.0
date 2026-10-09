# Plan 395 — Gemini Model Chain with Daily Quota Fallback and Real Free-Tier Limit

Status: active
Snapshot: 070feb29

## Problem Statement
The app calls exactly one Gemini model, `gemini-2.5-flash-lite` (`server/routes/ai.js:50`; after PR #298 / plan 370 it lives in `server/services/ai-recipe-helpers.js`). Google's free tier is **per project, per model, per day**, and for our key that model's limit is **20 calls a day** (429 body: `quotaId: GenerateRequestsPerDayPerProjectPerModel-FreeTier, quotaValue: 20`, validated 2026-10-08). So the whole app, every user and every AI route, gets 20 AI calls a day, then every AI feature fails until the reset.

The app believes the limit is 1,000: `DAILY_LIMIT = 1000` in `ai.js` (Mongo counter `GEMINI_USAGE`), `DAILY_LIMIT = 1000` again in `src/app/core/utils/gemini-usage.util.ts`, and three dictionary strings that say "1,000". That was Google's old published limit; Google cut it in Dec 2025. The Human's Google One / AI Pro subscription covers the consumer Gemini app only, not the API, and the Human will not pay for an API tier.

Evidence, same key, one tiny call per model, 2026-10-08:

| Model | Result |
| --- | --- |
| gemini-2.5-flash-lite (current) | 429, daily quota (20) used up |
| gemini-2.5-flash | 200 |
| gemini-3.1-flash-lite | 200 |
| gemini-3.5-flash-lite | 200 |
| gemini-3.5-flash | 200 |
| gemma-4-31b-it | 500 (Google internal error) |

Each model has its own daily bucket. A chain of models multiplies the free calls per day and keeps AI features alive when one bucket is empty. Exact per-model limits are visible only at https://ai.dev/rate-limit signed in to the key's account (Human).

## Goals & Success Criteria
**Primary:** when one model's daily quota is gone, the next AI request succeeds on the next model without the user noticing, and the app stops claiming 1,000 calls a day.

- [auto] `cd server && npx vitest run test/gemini-client.test.js` → all pass (chain order; daily-quota 429 moves to the next model; per-minute 429 does not move; 5xx / timeout do not move; all models exhausted → `all_exhausted`; a model comes back after its reset time).
- [auto] `rg -n "GEMINI_URL|generativelanguage.googleapis.com" server/routes/ai.js server/services/ai-recipe-helpers.js` → no matches (every Gemini call goes through `server/services/gemini-client.js`).
- [auto] `rg -n "DAILY_LIMIT|1,000|1000" server/routes/ai.js src/app/core/utils/gemini-usage.util.ts public/assets/data/dictionary.json` → no matches that refer to the Gemini daily limit.
- [auto] `curl -s http://localhost:3000/api/v1/ai/usage` → JSON with `count`, `date` and a `models` array where each entry has `name`, `exhausted` (boolean) and `resetAt` (ISO string or null); no `limit: 1000`.
- [auto] `npx ng build` → exit 0; `cd server && npm test` → all pass.
- [human] With the first model's daily quota already used up, generate a recipe in the app → the modal says the model reached its daily quota and offers "עבור ל-<next model>"; nothing is sent until you click it and send again, then the recipe arrives (server log: one `ai.model.exhausted`, then one `ai.generate.gemini_call` on the new model). (Changed by G9.)
- [human] When every model in the chain is exhausted, the recipe / menu / product modals show the new Hebrew "daily limit" message with no number in it.

## Execution Mode
Worker in a `wt-N` slot, after PR #298 (plan 370) is merged. Single Worker; no parallel plan touches `server/routes/ai.js`.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts` —
add to them, never rewrite or remove an existing entry without escalating).

```scope
server/services/gemini-client.js
server/services/ai-recipe-helpers.js
server/routes/ai.js
server/scripts/ai-eval-recipes.js
server/test/gemini-client.test.js
server/test/ai-recipe-helpers.test.js
src/app/core/utils/gemini-usage.util.ts
src/app/shared/ai-recipe-modal/**
src/app/shared/ai-menu-modal/**
src/app/shared/ai-product-modal/**
.env.example
src/app/core/services/gemini.service.ts
server/.env.example
src/app/pages/metadata-manager/components/ai-model-manager/**
src/app/pages/metadata-manager/metadata-manager.page.component.html
src/app/pages/metadata-manager/metadata-manager.page.component.ts
src/app/pages/metadata-manager/metadata-manager.page.component.spec.ts
```

Notes: `gemini-client.js` and `gemini-client.test.js` are new. In the modals only the limit-message key and the `remaining` / usage display change. `dictionary.json` is append-only (hotspot).

## Read Scope
`docs/brain/invariants.md`, `docs/agent/standards-backend.md`, `docs/agent/standards-security.md`, `server/test/helpers/**`, `tools/catalog-seeder/config.py` (to note its model, not to change it).

## Escalation Protocol
Blocked outside scope → stop and ask `approved: <path>`. Never edit an existing dictionary key; append a new one. Never read or print `.env`.

## Architecture Impact
- INV-2: preserves — the only `server/services/**` file touched is the new `gemini-client.js` (plus `ai-recipe-helpers.js`); no master data, overrides or tenancy logic change.
- INV-3: preserves — no document writes change; `GEMINI_USAGE` gains an `exhausted` map on the same daily doc, written only by the server.
- INV-4: preserves — no entity schema or write validation changes.
- INV-6: preserves — the new `gemini-client.js` is a server module called only from `server/routes/ai.js`; the browser never holds a key. It now sees model names (usage bar, switch prompt, admin list) and may send `model` in a request body, but only through `/api/v1/ai/*`, and the server accepts only models enabled in the admin's chain.
- No new invariant. No ADR.

## Step 0 — Reality Check
- [x] Confirm PR #298 is merged into `main` and `GEMINI_MODEL` / `GEMINI_URL` now live in `server/services/ai-recipe-helpers.js`. If #298 is not merged, STOP: this plan rebases on it.
- [x] Count the Gemini call sites: `rg -n "fetch\(\`\$\{GEMINI_URL\}" server/routes/ai.js` (8 on today's `main`: generate, parse-text, patch-recipe, generate-menu, patch-menu, generate-product, patch-product, generate-from-image, generate-product-from-image, generate-from-url — note which share `callGeminiForRecipe`).
- [x] Read `src/app/core/utils/gemini-usage.util.ts` and the three modals' use of `remaining` / `isGeminiLimitReached()` so the client change in G5 is minimal.
- [x] Run one tiny call per candidate model with the key (a 10-line Node script in the scratch dir, never committed) and record today's status table here, under "Step 0 results".

## Functional Requirements

### Must Have (P0)
- **Model chain.** `GEMINI_MODELS` in `.env` (comma list) overrides a default ordered list. Default order: `gemini-2.5-flash-lite` (prompt was tuned on it) → `gemini-3.1-flash-lite` → `gemini-3.5-flash-lite` → `gemini-2.5-flash` → `gemini-3.5-flash`. G6 may reorder after the eval.
- **One client.** `server/services/gemini-client.js` exports `callGemini({ body, timeoutMs, log, eventPrefix, needsVision })` and returns a discriminated result, never throws: `{ kind: 'ok', model, data }`, `{ kind: 'gemini_error', model, status, message }`, `{ kind: 'all_exhausted', resetAt }`, `{ kind: 'timeout' | 'network', model }`. It picks the first model that is not marked exhausted (and, when `needsVision`, is in the vision-capable set), dispatches, and on a **daily-quota 429** (any violation whose `quotaId` matches `/PerDay/`, same test as `isDailyQuota()` in `server/scripts/ai-eval-recipes.js` from PR #298) marks that model exhausted until the next reset and retries the same body on the next model. Logs `ai.model.fallback { from, to, resetAt }` each time it moves.
- **Only the daily quota moves the chain.** Per-minute 429 (`PerMinute` quota id or no `PerDay` violation), 5xx, invalid JSON and timeouts return as they do today, on the model that was tried. No retries added for those.
- **Exhausted state survives a restart.** In-memory `Map<model, resetAt>` plus a mirror on today's `GEMINI_USAGE` doc: `{ _id: 'YYYY-MM-DD', count, exhausted: { [model]: resetAtIso } }`. On boot the client reads today's doc. Reset time = next midnight **America/Los_Angeles** (Google's free-tier reset); a model whose `resetAt` has passed is tried again.
- **Real limit.** Delete the `DAILY_LIMIT` hard gate from every route. `daily_limit_reached` (HTTP 429) is returned only when the client says `all_exhausted`, with `resetAt` in the body. `incrementUsage()` still counts every dispatched call (one per model attempt) so the counter keeps reflecting real spend; add `model` to the log event of each call.
- **`/usage` contract.** Returns `{ date, count, models: [{ name, exhausted, resetAt }] }`. Drop `limit` and `remaining`. The client util drops `DAILY_LIMIT` and `isGeminiLimitReached()`; the modals stop pre-blocking on a local count and rely on the server's 429 (they already handle `daily_limit_reached`). The usage indicator shows `count` and, when any model is exhausted, "N מתוך M מודלים זמינים".
- **Dictionary.** Append `ai_daily_limit_reached_all` = "הגעת למגבלת הבקשות היומית של כל מודלי ה-AI. נסה שוב מחר." and `ai_models_available` = "{{available}} מתוך {{total}} מודלים זמינים" under `general`. Switch the three modals to `ai_daily_limit_reached_all`. Leave the three old keys in place (append-only rule); they become unreferenced.
- **Vision routes.** `generate-from-image` and `generate-product-from-image` pass `needsVision: true`. The vision-capable set is a constant in the client (all `gemini-*-flash*` models today; verify in G6 with one image call per model).

### Should Have (P1)
- `ai-eval-recipes.js --model=<name>` to run the plan-370 eval against one model; results table per model recorded in this plan under G6.
- `.env.example` documents `GEMINI_MODELS` with the default order.

### Nice to Have (P2)
- `tools/catalog-seeder/config.py` reads the same default order (Python side; separate plan if it needs more than a constant change).

## UI/UX Notes
No new screens. Only the limit message text and the small usage indicator change. Hebrew strings through `translatePipe` + `dictionary.json`.

## Atomic Sub-tasks
- [x] G0: Step 0 reality check; record the per-model status table under "Step 0 results".
- [x] G1: `server/services/gemini-client.js` — chain from `GEMINI_MODELS` / default, `callGemini()`, daily-quota detection, exhausted map + Mongo mirror, LA-midnight reset, `ai.model.fallback` log, vision set, `getModelStatus()` for `/usage`.
- [x] G2: `server/test/gemini-client.test.js` — offline vitest with mocked `fetch`: chain order; daily 429 → next model + fallback log; per-minute 429 stays; 5xx stays; timeout stays; all exhausted → `all_exhausted` with `resetAt`; model returns after `resetAt`; `needsVision` skips non-vision models; `GEMINI_MODELS` override.
- [x] G3: `ai.js` + `ai-recipe-helpers.js` — every Gemini `fetch` through `callGemini()`; remove `GEMINI_MODEL` / `GEMINI_URL` / `DAILY_LIMIT` gates; `daily_limit_reached` only on `all_exhausted`; `/usage` new contract; `model` in call logs. `ai-recipe-helpers.test.js` updated.
- [x] G4: `dictionary.json` append the two keys; modals use `ai_daily_limit_reached_all`.
- [x] G5: `gemini-usage.util.ts` + modals + usage indicator — drop `DAILY_LIMIT` / `isGeminiLimitReached()`, read `models` from `/usage`, show "N מתוך M".
- [x] G5a: (Human, 2026-10-09) remove the three old "1,000" dictionary keys; find today's per-model budgets and set the chain by them — `MODEL_DAILY_BUDGETS` in `gemini-client.js`, `dailyBudget` per model in `/usage`, chain extended with gemini-3.6/3.7/3.8-flash. Approved out-of-scope paths: `src/app/core/services/gemini.service.ts`, `server/.env.example`.
- [x] G5b: (Human, 2026-10-09) show how much of today's budget is used / left — per-model `calls` on a `quota-<LA date>` doc in GEMINI_USAGE; `/usage` adds `budget`, `used`, `remaining` and per-model `used` / `remaining`; the three modals show "used / budget · נותרו X".
- [x] G8: (Human, 2026-10-09) admin-only AI model manager in the metadata manager: turn models on/off and set their order for all users. Paths approved 2026-10-09.
- [x] G8a: (Human, 2026-10-09) drag & drop reorder in the AI model manager (CDK, grip handle; up/down buttons kept for keyboard); metadata-manager spec updated to 10 jump-nav tabs (approved).
- [x] G9: (Human, 2026-10-09) **no automatic fallback.** Every request makes exactly one Gemini call. When the model is out of its daily quota the server answers 429 `model_exhausted` { model, nextModel, resetAt } — without calling Gemini when the exhaustion is already known — and the modal shows "עבור ל-<next>"; only the user's click switches (GeminiService sends `model` on later requests). Supersedes the auto-fallback in Must Have "One client" and the `ai.model.fallback` log (now `ai.model.exhausted`).
- [x] G8b: (Human, 2026-10-09) a no-browser check that every model answers — `ai-eval-recipes.js --check-models`; results under "G6 results".
- [x] G6: `ai-eval-recipes.js --model=`; run the plan-370 eval once per model that answered 200 in G0; one image call per model; record the table here; set the final default order in `gemini-client.js`.
- [x] G7: `.env.example` `GEMINI_MODELS` line; run every [auto] criterion; HOW TO VALIDATE cards; `/ship`.

## Technical Considerations
- Daily-quota detection must read the 429 body **once**; `callGeminiForRecipe` today reads it for the log message — the client reads it, decides, and passes `message` along.
- `incrementUsage()` is called per dispatched attempt, so a fallback counts twice on the day counter. That is correct (real spend) and the plan-370 comment above `callGeminiForRecipe` already says so.
- Reset: Google documents free-tier daily quotas resetting at midnight Pacific. Compute with `Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', ... })`, no new dependency.
- Mongo errors stay non-blocking, as today's `getUsageCount()` / `incrementUsage()` do; the in-memory map is the fast path.
- The catalog seeder (`tools/catalog-seeder/*.py`) still calls one model and shares the key's buckets; out of scope beyond the P2 note.

## Out of Scope
- Paying for a Gemini API tier (Human decision, memory: no paid upgrades).
- Changing the recipe / menu / product prompts (plan 370 owns the recipe prompt).
- Per-user quotas or a UI to pick a model.
- The Python seeder's fallback logic.

## Critical Questions
1. Default order: tuned model first (`2.5-flash-lite`, then the newer lites, then the flashes) — or newest first? **Default: tuned first**; G6's eval decides the rest.
2. Should the chain skip a model whose last 5xx was under a minute ago? **Default: no** — only the daily quota moves the chain; keep the first version simple.
3. `remaining` removal: any other client reader of `/usage` `limit` / `remaining`? **G0 greps; if only the util and the three modals, remove.**

## Step 0 results
2026-10-09, one tiny call per model, same key:

| Model | Result |
| --- | --- |
| gemini-2.5-flash-lite | 200 (yesterday's 20 calls reset) |
| gemini-3.1-flash-lite | 200 |
| gemini-3.5-flash-lite | 200 |
| gemini-2.5-flash | 200 |
| gemini-3.5-flash | 200 |

- PR #298 is merged; `GEMINI_MODEL` / `GEMINI_URL` lived in `server/services/ai-recipe-helpers.js`.
- 8 direct `fetch(GEMINI_URL)` sites in `ai.js` (7 routes plus `callGeminiForRecipe`, which serves generate, generate-from-image and generate-from-url).
- Readers of the `isGeminiLimitReached()` local pre-block: the three modals **and `src/app/core/services/gemini.service.ts`** (10 call sites, each throwing a hardcoded "(1,000)" Hebrew error). That file is outside the Read-Write Scope — escalated.
- No client reader of `/usage` `limit` / `remaining` beyond the util (it already read only `date` and `count`).
- Dictionary placeholders use the codebase's single-brace `.replace('{n}', …)` convention: `ai_models_available` = "{available} מתוך {total} מודלים זמינים".

## G6 results
Per-model free-tier budgets (RPD): our 429 for gemini-2.5-flash-lite = 20 (2026-10-08); aiplug.work's 429 measurements (2026-09-02): 3.1-flash-lite 500, 3.5-flash-lite 500, 3.5/3.6/3.7-flash 20; 2.5-flash and 3.8-flash assumed 20. ai.google.dev no longer lists numbers. Total ~1,120/day.

Recipe eval (`ai-eval-recipes.js --model=`, 5 prompts × 5 runs, 2026-10-09):

| Model | חביתה | חביתה ל-2 | חביתה מ-3 ביצים | שקשוקה ל-4 | סלט ירקות קצוץ | Total |
| --- | --- | --- | --- | --- | --- | --- |
| gemini-3.1-flash-lite | 5/5 | 5/5 | 5/5 | 5/5 | 0/5 (g/portion=30) | 20/25 |
| gemini-3.5-flash-lite | 5/5 | 2/5 (503s) | 4/5 | 2/5 | 0/5 (g/portion=23) | 11/25 |

The salad fails on both models with the same constant g/portion — likely the eval's gram estimate for count-based vegetables, not the model (plan 370's check). The 20-a-day models were not evaluated (one eval = 25+ calls, more than their whole day). Final order: 3.1-flash-lite → 2.5-flash-lite → 2.5-flash → 3.5-flash → 3.6-flash → 3.7-flash → 3.8-flash → 3.5-flash-lite. Image call per model (8×8 PNG, "what color?"): all answered "Red" except gemini-3.7-flash, 503 overloaded — so every chain model stays in the vision set.

Model check (`--check-models`, one "חביתה" recipe per model, 2026-10-09 ~10:30): OK — 3.1-flash-lite 2.2s, 2.5-flash 7.9s, 3.5-flash 12.5s, 3.6-flash 6.8s, 3.8-flash 18.4s, 3.5-flash-lite 1.4s. FAIL — 2.5-flash-lite: daily quota (429, quotaValue 20 — the key is shared with other running copies of the app, e.g. production, which still calls only this model); 3.7-flash: 503 overloaded (200 on an immediate retry; 503 also in the image check).

## Sequencing
After PR #298 (plan 370) merges. Unblocks plan 370's in-app Human check and its A4 eval, both stuck on today's 20-call quota.
