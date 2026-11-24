# Plan 730 — The assistant skips AI models Google has retired and moves on when a model is gone

Status: draft
Depends-on: none
Snapshot: 1a164745bd629ae964297d85bfbab093cae56a7c

## Problem Statement
Base branch: `chore/restaurant-staging` (the restaurant code is not on `main`; the Snapshot is that branch's head).

On 2026-11-24 (09:17–09:18, `.claude/be.log` of slot `wt-2`) a front-desk guest turn failed even with the plan-701
fallback on. The request walked `gemini-3.1-flash-lite` (timeout) → `gemini-3.5-flash-lite` (503 "high demand") →
`gemini-2.5-flash-lite`, and Google answered **404** "This model models/gemini-2.5-flash-lite is no longer available to
new users. Please update your code to use models/gemini-3.5-flash-lite…". The 404 is not an overload, so the loop
stopped there and the turn failed (`frontdesk.turn.failed` reason `gemini_error`, group `other`). The log holds three
such 404s on `gemini-2.5-flash-lite` the same morning.

Root causes, verified on the Snapshot:
- `server/services/gemini-client.js:55-63` — `DEFAULT_MODELS` (the catalog) still lists `gemini-2.5-flash-lite` (`:58`)
  and `gemini-2.5-flash` (`:59`); `MODEL_DAILY_BUDGETS` (`:33-41`, `:36`-`:37`) and `MODEL_MEDIA` (`:150-158`,
  `:153`-`:154`) list them too, and `server/constants/ai-prices.js:12-13` prices them.
- Google's deprecations page (https://aistudio.google.com/docs/deprecations, read 2026-11-24): `gemini-2.5-flash` "is
  no longer available in Google AI Studio", shutdown **2026-12-01**, requests then route to `gemini-3.5-flash-lite`.
  `gemini-2.5-flash-lite` has no date on that page, but the API already answers it 404 for our key (be.log above). The
  other five catalog models are listed as available (`gemini-3.1-flash-lite` shuts down 2027-05-07 — not now).
- `server/services/gemini-client.js` `callWithFallback` (plan 701) moves on only for `isOverloaded` (network, timeout,
  429 not daily, 500/502/503/504) and a daily-quota 429; any other answer — a 404 included — ends the request at once.
  The next guest turn hits the same gone model again, because nothing remembers it.

Plan 412 already has the pattern for a retired model: drop it from the catalog, and an old saved chain entry or
`GEMINI_MODELS` name becomes "removed" — never called, shown switched off and marked removed in the admin chain.

## Goals & Success Criteria
**Primary:** the server never calls `gemini-2.5-flash-lite` or `gemini-2.5-flash` again (both are "removed" models),
and when some other model is retired later, a `fallback: true` caller (the front desk) moves on to the next model in
the same request and skips that model until Google's quota day resets.

- [auto] `pnpm run test:server` → exit 0, including the new cases in `server/test/gemini-fallback.test.js` and the
  changed cases in `server/test/gemini-client.test.js`.
- [auto] `server/test/gemini-client.test.js`: `DEFAULT_MODELS` equals `['gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3-flash-preview']`; neither
  `MODEL_DAILY_BUDGETS` nor `MODEL_MEDIA` has a `gemini-2.5-flash-lite` or `gemini-2.5-flash` key; a saved chain naming
  `gemini-2.5-flash-lite` (enabled) and `gemini-3.1-flash-lite` → `modelChain()` is `['gemini-3.1-flash-lite']`,
  `getChainSettings()` lists `gemini-2.5-flash-lite` with `removed: true, enabled: false`, and a call never fetches it;
  `callGemini({ model: 'gemini-2.5-flash' })` → `{ kind: 'model_removed', model: 'gemini-2.5-flash' }` with 0 fetch
  calls; the existing budget-order test and "every default model has a media entry" still pass.
- [auto] `server/test/gemini-fallback.test.js` (fetch stubbed, chain `[A, B, C]`, `fallback: true`): A answering 404
  "models/A is no longer available" and B answering 200 → `{ kind: 'ok', model: B }`, exactly 2 fetch calls, no wait,
  one `${eventPrefix}.fallback` warn `{ from: A, to: B, attempt: 1, kind: 'gone', status: 404 }`; a second request on
  the same chain then calls B first (A is skipped, 1 fetch call); after `resetForTests()` A is called again; a 404 on
  the only model of a one-model chain → `gemini_error` 404 after 1 call; A answering 404, B 503, C 200 → ok on C after
  3 calls; a 400 still does not fall back (plan 701 case unchanged).
- [auto] `server/test/gemini-fallback.test.js` (default path): **without** `fallback`, A answering 404 → `{ kind:
  'gemini_error', model: A, status: 404 }` after exactly 1 call, no `.fallback` log, and the next request calls A again
  (the gone mark is never read by the default path).
- [auto] `server/test/ai-usage.test.js` keeps passing unchanged (every catalog model still has a price).
- [auto] `pnpm --dir server run lint` → exit 0.
- [auto] `node scripts/log-query.mjs --since=plan-start --level=error` → no entries.
- [human] On the simulator (`/frontdesk/simulator`, as `demo_host`), the test guest writes "מתי אתם פתוחים?" three
  times in a row · each one gets an answer from the assistant (no "passed to a person" on any of the three).

## Execution Mode
- Parallel: yes with plans that do not touch `server/services/gemini-client.js` or `server/constants/ai-prices.js`.
- Concurrent plans: none
- Isolated DB: no
- Base branch: `chore/restaurant-staging`

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss, src/app/app.routes.ts` — add to them, never rewrite or remove an existing entry without escalating).

```scope
server/services/gemini-client.js
server/constants/ai-prices.js
server/test/gemini-client.test.js
server/test/gemini-fallback.test.js
server/test/ai-usage.test.js
server/breadcrumbs.md
server/test/ai-cap.test.js
server/test/ai-diag-menu.test.js
server/test/ai-invoice-read.test.js
server/test/ai-logistics-extract.test.js
server/test/ai-match-product-names.test.js
server/test/ai-menu.test.js
server/test/ai-receipt-photo.test.js
server/test/ai-shots-saved.test.js
server/test/ai-shots-shared.test.js
server/test/ai-shots.test.js
server/test/ai-stock-extract.test.js
server/test/ai-voice-transcribe.test.js
server/test/generate-from-url.test.js
server/test/knowledge-import.test.js
server/test/price-list-prompt.test.js
server/test/product-import-route.test.js
docs/workflow-kit/manifest.json
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the `## Read-Write Scope` above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; offer `approved: <path>`; then
append the path to the scope block above and retry.

## Architecture Impact

- INV-6: preserves — every Gemini call still goes through `callGemini` in `server/services/gemini-client.js`, called from the AI sub-routers; this plan only shrinks the catalog and lets the opt-in fallback skip a gone model; no key or model call reaches the browser.
- INV-2: preserves — the gone mark is per model on the one shared key (like the exhausted mark), holds no business data, and changes no business scoping or ledger row.

## Reuse Check

- `isGone(result)` and the `goneUntil` map in `server/services/gemini-client.js` — family: none — rung: 4 — why: one predicate and one in-memory map beside plan 701's `isOverloaded` and the existing `exhaustedUntil`, inside the one Gemini client; `docs/brain/inventory.md` `gemini-fallback` says a second model-switching loop is never added, and none is.
- New cases in `server/test/gemini-fallback.test.js` — family: none — rung: 4 — why: cases in the existing plan-701 test file, same stub pattern.

## Defaults

- loading-and-error-states — exception — why: no screen in this plan; the server only stops calling retired models
- hints-in-tooltips — exception — why: no screen in this plan
- confirm-destructive-action — exception — why: no screen and no user action; "removed" means a model leaves the server's catalog
- empty-state-on-list — exception — why: no screen; the model list is a server constant
- app-list-container — exception — why: no screen in this plan
- one-breakpoint-set — exception — why: no screen and no CSS in this plan

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch) and print one line per commit:
`ok` or `conflict: <what>`. All `ok` → continue. STOP for a go only on a `conflict` (a symbol,
line or file this plan names was removed, renamed or rewritten).

## User Stories
- As a restaurant owner, I want the assistant to keep answering guests when Google retires one of its models, so that a guest is not passed to a person for no reason.
- As the admin, I want retired models shown as removed, so that I do not switch one back on.

## Functional Requirements

### Must Have (P0)

**Catalog — `server/services/gemini-client.js`, `server/constants/ai-prices.js`**
- [ ] Remove `gemini-2.5-flash-lite` and `gemini-2.5-flash` from `DEFAULT_MODELS`, `MODEL_DAILY_BUDGETS` and
  `MODEL_MEDIA`, and from `AI_PRICES` (plan 412 pattern: a dropped model leaves every map; `ai-usage.test.js` checks
  only that catalog models have a price). Remaining order: `gemini-3.1-flash-lite`, `gemini-3.5-flash-lite`,
  `gemini-3.6-flash`, `gemini-3.8-flash`, `gemini-3-flash-preview` (500, 500, 20, 20, 20 — the order test holds).
- [ ] Add one line to the catalog comment block (`:43-54`): "Dropped 2026-11-24 (plan 730): gemini-2.5-flash-lite
  (Google answers 404 'no longer available') and gemini-2.5-flash (shutdown 2026-12-01, aistudio.google.com/docs/deprecations)."
  Update the `MODEL_MEDIA` comment, which today names `gemini-2.5-flash` as the one model without PDF.
- [ ] Nothing else changes for removed models: `isCatalogModel`, `removedModels`, `getChainSettings` and
  `validateChainSettings` already turn a saved or `GEMINI_MODELS` name that left the catalog into a removed model.
- [ ] `server/scripts/ai-eval-recipes.js` is not changed: `--check-models` reads `modelCatalog()`, and the
  `--probe-models` candidate list keeps retired names on purpose (it already holds `gemini-3.5-flash` and
  `gemini-3.7-flash` from plan 412).

**Gone model with fallback — `server/services/gemini-client.js`**
- [ ] New pure `isGone(result)`: `result.kind === 'gemini_error'` and (`status === 404` or the message matches
  `/no longer available/i`).
- [ ] New in-memory `goneUntil` map (model → `nextResetAt(now)`), read only by `callWithFallback`: a usable model for
  the fallback loop is one that is neither exhausted nor gone (a `usableForFallback(m, now)` helper used by
  `nextUsableAfter` and by the fallback start). Cleared by `resetForTests()`. Not persisted (a restart costs one 404).
- [ ] In `callWithFallback`, after a gone answer: mark the model gone, log `warn` `ai.model.gone` `{ model, resetAt }`,
  take `next = nextUsableAfter(candidates, current, now)` with no wait, and log `${eventPrefix}.fallback` `{ from, to,
  attempt, kind: 'gone', status }`. No next model → return the 404 result. The `MAX_ATTEMPTS` (4) cap and the
  `deadlineMs` rule apply as for overload.
- [ ] The fallback start in `callGemini`: when `fallback` is true and the first model is gone, start on the first
  model that is usable for the fallback; none → return `all_exhausted` as today.
- [ ] The default path (no `fallback`) is byte-for-byte the same: it never reads `goneUntil`, and a 404 still returns
  `gemini_error` after one call.

### Should Have (P1)
- [ ] `server/breadcrumbs.md` line 43: add "a gone model (404 / no longer available) is skipped by the fallback until
  the quota day resets (plan 730)".

### Nice to Have (P2)
- [ ] none

## UI/UX Notes
- No screen change. The admin chain already shows removed models (plan 412); the two dropped models appear there only
  if the saved chain still names them.

## Atomic Sub-tasks

These are the plan's milestones: a Worker does them in order and ticks each one after it is checked.

- [x] A1: Stop calling the two Gemini models Google has retired, so they show as removed — drop gemini-2.5-flash-lite and gemini-2.5-flash from the catalog, budgets, media and price maps, update comments, rewrite the media and removed-model cases — server/services/gemini-client.js, server/constants/ai-prices.js, server/test/gemini-client.test.js
- [x] A2: Let the front desk move to the next model when one is gone, and skip it for the rest of the day — isGone, goneUntil, fallback start and loop, gone log; new cases plus the unchanged default path — server/services/gemini-client.js, server/test/gemini-fallback.test.js
- [x] A3: Note the gone-model rule where the next plan looks — server/breadcrumbs.md
- [x] A4: Confirm every model left in the list still has a price, so cost estimates stay right — run only, no edit expected — server/test/ai-usage.test.js
- [x] A5: Run every check of this plan and hand Dandan the hand check — test:server, server lint, log-query; evidence into Execution Notes

## Technical Considerations
- Dependencies: `callGemini` / `callWithFallback` (plans 395, 412, 614, 701), `MODEL_MEDIA` (619), `AI_PRICES` (566).
- New files needed: none.
- Model changes: none. Backend / API: none.
- Auth and validation: unchanged. Security surface: none new.
- Data / migration: none — a saved admin chain naming a dropped model keeps working (plan 412 removed handling).
- Cost: fewer models, same free tier; a gone answer adds no wait and no extra call beyond the 4-call cap.
- Traps: after this plan every catalog model takes image, audio and PDF, so the plan-619 media cases in
  `server/test/gemini-client.test.js` that used `gemini-2.5-flash` as "the model without PDF" have no catalog model to
  use: rewrite them as "every catalog model takes pdf" (`modelTakes`) and keep the media filter code as it is (it still
  guards a future model). The `ai.media.no_model` case can no longer be reached with catalog models — drop it and say
  so in Execution Notes. Keep `isGone` out of `isTransient` / `isOverloaded` so plan 614's default retries do not change.

## Out of Scope
- Moving the default chain's first model (`gemini-3.1-flash-lite`, shutdown 2027-05-07).
- Persisting the gone mark to Mongo or showing it in the admin chain.
- Changing any route or the front-desk turn (`server/routes/ai/frontdesk.js`, `server/services/frontdesk-turn.js`).
- `server/scripts/ai-eval-recipes.js` (see P0 note).

## Critical Questions
- none

## Execution Notes
- behaviour: `gemini-2.5-flash` is dropped now, a week before its 2026-12-01 shutdown, because Google already calls it "no longer available in Google AI Studio" and free-tier requests route elsewhere; if the Human wants it kept until then, restore its four map entries and the two media test cases.
- behaviour: any 404 from `generateContent` counts as gone (the URL is fixed, so a 404 can only mean the model), plus any answer whose message says "no longer available".
- behaviour: the gone mark lasts until Google's quota day resets (midnight America/Los_Angeles, `nextResetAt`), lives in memory only, and is used only by `fallback: true` callers; the default path keeps its one-model, user-decides behaviour (Human 2026-10-09).
- behaviour: a gone answer moves on with no wait, like a daily-quota 429, since waiting cannot bring the model back.
- behaviour: prices of the dropped models leave `AI_PRICES` (plan 412 pattern); ledger rows already written keep their stored cost.
- evidence: pnpm run test:server -> exit 0, 177 files / 2471 tests pass; pnpm run lint -> 0 errors; build, test:ci (3224), lint:icons, lint:no-native-select, override/ledger/breadcrumbs/kit-manifest checks -> exit 0; log-query -> SKIP no database.
- The `ai.media.no_model` case was dropped (no catalog model lacks a medium after this plan); the plan-619 pdf/audio cases became 'every catalog model takes pdf, audio, image'.
- Gone fallback log carries kind 'gone' (as the plan says); the `ai.model.gone` warn is logged beside it.
