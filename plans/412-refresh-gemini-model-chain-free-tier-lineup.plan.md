# Plan 412 — Refresh Gemini Model Chain to Google's Oct-2026 Free-Tier Lineup

Status: active
Snapshot: 5e0342575a4765db9400ae169d3b3473e87eca4e

## Problem Statement
The model chain from plan 395 (`server/services/gemini-client.js`) still lists `gemini-3.5-flash` and `gemini-3.7-flash`. Google deprecated both on 2026-10-08 and auto-routes them (`3.7-flash → 3.8-flash`, `3.5-flash → 3.6-flash`), so they likely add calls to a bucket we already list instead of adding capacity. The default order also puts quality first, so users burn the small buckets of the strong models before the big free buckets.

Decision (Human, 2026-10-19): **free tier only.** No paid models, no billing.

Research (2026-10-19; ai.google.dev changelog / models / pricing / rate-limits):
- The 2026-10-09 Google downgrade is the consumer Gemini app only; the API free tier still exists.
- Free-tier text models: `gemini-3.8-flash`, `gemini-3.6-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-3-flash-preview` (labelled legacy).
- Paid-only, never add: `gemini-4-argon`, `gemini-3.1-pro-preview`.
- Deprecated 2026-10-08, auto-routed: `gemini-3.7-flash`, `gemini-3.5-flash` (both in our chain today).
- `gemini-2.5-flash` / `gemini-2.5-flash-lite`: not deprecated, but since 2026-09-18 open only to projects that used them before (ours did). Keep, treat as fragile.
- Shut down: `gemini-2.0-flash`, `gemini-2.0-flash-lite`, `gemini-3.1-flash-lite-preview`, `gemini-3-pro-preview`.
- Google publishes no per-model free RPD. Limits are per project, shown only at ai.dev/rate-limit to the key owner, reset at midnight America/Los_Angeles, "not guaranteed".
- Not verified: Gemma models' free-tier status. Check live (A1).

## Goals & Success Criteria
**Primary:** the chain holds only live free-tier models, ordered by free daily quota (largest first), and an old saved chain can never send a request to a removed model.

- [auto] `cd server; npx vitest run test/gemini-client.test.js` → all pass.
- [auto] Unit test "DEFAULT_MODELS is sorted by MODEL_DAILY_BUDGETS descending (ties allowed; unknown budgets last)" → passes.
- [auto] `rg -n "gemini-3\.5-flash['\",]|gemini-3\.7-flash" server src` → no matches.
- [auto] `GET /api/v1/ai/usage` → `models` lists only kept models.
- [auto] `cd server; npm test` → all pass; `npx ng build` → exit 0 (only if a frontend file changed).
- [human] Generate a recipe, and a product from a photo, on the new first model.
- [human] The admin chain screen shows no removed models; an old saved chain shows them as removed.

## Execution Mode
Worker in a `wt-N` slot, single Worker. A1 needs the real key in the slot's `server/.env` (read by the script, never printed). C1 needs the Human's ai.dev/rate-limit screenshot.

## Execution Notes
- Orchestrator readiness (2026-10-27): C1 daily budgets → the Human sent the ai.dev/rate-limit screenshots (project on Tier 1, "Compare: Free tier" column). The shared key will come from a project with no billing, so set each `MODEL_DAILY_BUDGETS` value to the FREE-tier requests per day: gemini-3.5-flash-lite 500, gemini-3.1-flash-lite 500, gemini-2.5-flash-lite 20, gemini-2.5-flash 20, gemini-3-flash 20, gemini-3.6-flash 20, gemini-3.8-flash 20, gemma-4-26b and gemma-4-31b 14400. Skip any model that is not in the chain. The comment states the source and date: ai.dev/rate-limit screenshot 2026-10-27, free-tier values read from the compare column (approximate). Tick C1.
- Orchestrator readiness (2026-10-27): the two [human] Done-when checks (recipe and product from a photo on the new first model; admin chain screen shows removed models as removed) → leave both unticked for the Human.
- Orchestrator readiness (2026-10-27): plan drift (A1, B1, D1, D2, E1, E2, E3, F1, G1 already ticked, work in fe266724) → treat the plan as nearly done: re-run its checks, do not redo ticked items.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts` —
add to them, never rewrite or remove an existing entry without escalating).

```scope
server/services/gemini-client.js
server/routes/ai.js
server/scripts/ai-eval-recipes.js
server/test/gemini-client.test.js
server/.env.example
.env.example
src/app/pages/metadata-manager/components/ai-model-manager/**
src/app/core/services/gemini.service.ts
docs/brain/gotchas/backend.md
```

## Read Scope
`plans/300-400/395-gemini-model-chain-daily-quota-fallback.plan.md`, `docs/brain/invariants.md`, `docs/brain/decisions/`, `docs/brain/gotchas/backend.md`, `docs/agent/standards-backend.md`, `docs/agent/standards-security.md`.

## Escalation Protocol
Blocked outside scope → stop and ask `approved: <path>`. Never read or print `.env` or the key. Never add a paid-only model. `dictionary.json` is append-only.

## Architecture Impact
- INV-6: preserves — calls still go only through `gemini-client.js` from `server/routes/ai.js`; the browser holds no key. The server keeps accepting only models enabled in the admin chain, and now additionally refuses models outside the catalog.
- INV-2: preserves — the only `server/services/**` file touched is `gemini-client.js`; no master data, overrides or tenancy logic change.
- INV-3: preserves — no cross-document writes; the metadata-manager change is a read-only "removed" state in the AI model list; the saved chain doc keeps its shape.
- INV-4: preserves — no entity schema or write validation changes.
- Plan 395 rules kept (gotchas/backend.md "Gemini free tier is a tiny per-model daily bucket"): one Gemini call per request, no automatic model switch, the user decides (Human 2026-10-09: no unattended spend).
- No runtime model auto-discovery; the catalog stays hardcoded.
- No new invariant. No ADR.

## Rules for the Worker
- The live check (A1) is one `GET v1beta/models` plus one tiny `generateContent` per candidate, no more. Use or extend `node server/scripts/ai-eval-recipes.js --check-models`.
- `MODEL_DAILY_BUDGETS` comment must state source and date honestly (screenshot date, 429 `quotaValue` date).
- Order rule (Human 2026-10-19): sort by real free RPD descending. Quality is not the primary key — the strongest models have the smallest buckets and users must not burn them first. Recipe eval is only a tiebreaker between equal RPD. Unknown RPD goes after all known ones.

## Atomic Sub-tasks
- [x] A1: Check every candidate model live with our key and record which ones answer and share quota — GET v1beta/models, then one tiny generateContent per candidate (3.8-flash, 3.6-flash, 3.5-flash-lite, 3.1-flash-lite, 3-flash-preview, 2.5-flash, 2.5-flash-lite, 3.5-flash, 3.7-flash, any Gemma listed); record status, response modelVersion (proves auto-routing), 429 quotaId/quotaValue; confirm whether 3.5-flash / 3.7-flash share quota with 3.6-flash / 3.8-flash; table goes into this plan under "Live check results" — server/scripts/ai-eval-recipes.js
- [x] B1: Drop the two deprecated models and add only free models that answer on their own quota — remove gemini-3.5-flash and gemini-3.7-flash from MODEL_DAILY_BUDGETS, DEFAULT_MODELS and the GEMINI_MODELS example; add gemini-3-flash-preview only if A1 shows 200 and its own bucket; never paid-only models — server/services/gemini-client.js, server/.env.example, .env.example
- [ ] C1: Set each model's daily budget from the Human's rate-limit screenshot and real 429 numbers — [human] Human sends the ai.dev/rate-limit screenshot; update MODEL_DAILY_BUDGETS and its source/date comment — server/services/gemini-client.js
- [x] D1: Order the default chain by free daily quota, largest first, so users don't burn the small buckets first — sort DEFAULT_MODELS and the .env.example GEMINI_MODELS line by MODEL_DAILY_BUDGETS descending; recipe eval only breaks ties; unknown RPD after all known; replace the plan 395 rationale comment with this rule — server/services/gemini-client.js, server/.env.example, .env.example
- [x] D2: Add a test that fails if the default chain is ever not sorted by daily quota — DEFAULT_MODELS sorted by MODEL_DAILY_BUDGETS descending, ties allowed, unknown budgets last — server/test/gemini-client.test.js
- [x] E1: Never send a request to a removed model from an old saved chain or env list — entries in the admin's saved chain or GEMINI_MODELS that are not in the catalog are skipped by modelChain/callGemini and the explicit-model path, and reported as removed (e.g. removed: true) by the chain endpoint; usage endpoint lists only kept models — server/services/gemini-client.js, server/routes/ai.js
- [x] E2: Show removed models as removed in the admin chain screen — read-only "removed" state, cannot be enabled; new Hebrew label via translatePipe + appended dictionary key — src/app/pages/metadata-manager/components/ai-model-manager/**
- [x] E3: Add tests for stale saved chains and stale env lists — saved chain with gemini-3.7-flash: skipped, flagged removed, no fetch to it; GEMINI_MODELS with gemini-3.5-flash: same; explicit request for a removed model refused — server/test/gemini-client.test.js
- [x] F1: Confirm every kept model accepts inline images — VISION_MODEL_PATTERN matches all kept models including gemini-3-flash-preview (extend pattern + test if not) — server/services/gemini-client.js, server/test/gemini-client.test.js
- [x] G1: Update the Gemini free-tier gotcha with the new lineup and the quota-first ordering rule — docs/brain/gotchas/backend.md

## Live check results
`node server/scripts/ai-eval-recipes.js --probe-models`, 2026-10-19, our key. One GET v1beta/models (http 200, 46 models with generateContent) plus one tiny generateContent per candidate. No 429 came back, so no quotaId/quotaValue was observed today; "Own bucket?" is read from `modelVersion` (the model that actually answered).

| Model | Status | modelVersion | quotaId / quotaValue | Own bucket? |
| --- | --- | --- | --- | --- |
| gemini-3.8-flash | 200 | gemini-3.8-flash | — | yes |
| gemini-3.6-flash | 200 | gemini-3.6-flash | — | yes |
| gemini-3.5-flash-lite | 200 | gemini-3.5-flash-lite | — | yes |
| gemini-3.1-flash-lite | 200 | gemini-3.1-flash-lite | — | yes |
| gemini-3-flash-preview | 200 | gemini-3-flash-preview | — | yes (also: recipe eval חביתה 1/1 PASS, image call "Red") |
| gemini-2.5-flash | 200 | gemini-2.5-flash | — | yes |
| gemini-2.5-flash-lite | 200 | gemini-2.5-flash-lite | — | yes |
| gemini-3.5-flash | 200 | **gemini-3.6-flash** | — | no — auto-routed to 3.6-flash |
| gemini-3.7-flash | 200 | **gemini-3.8-flash** | — | no — auto-routed to 3.8-flash |
| gemma-4-26b-a4b-it | 200 | gemma-4-26b-a4b-it | — | yes, but not added (not in B1's list; no JSON-mode/vision check) |
| gemma-4-31b-it | 500 | — | "Internal error encountered." | unknown |

Quota sharing of 3.5/3.7-flash with 3.6/3.8-flash is inferred from routing, not proven by a 429 (that would need draining a bucket).
