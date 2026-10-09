# Plan 370 — AI recipe generation: realistic portion and ingredient ratios, with tests

Status: draft
Snapshot: b776163f43fd1db42a5e0501b3a0e5c30b0bded1

## Problem Statement

Asking the AI for a simple recipe like "חביתה" returns unrealistic portion counts and ingredient amounts. In `server/routes/ai.js`:

- **`SYSTEM_PROMPT`** (~L201-245) never ties amounts to the portion count:
  - Rule 3: for a dish, `yield_unit="portion"` and `yield_amount` is "an estimated number of portions".
  - Rule 2: missing quantities are "a reasonable amount".
- **Few-shot examples** come from `getApprovedShots(2)` (~L342), which returns the 2 newest approved shots regardless of topic. `buildFewShotBlock` (~L367) prepends them in `/generate` (~L488), `/generate-from-image` and `/generate-from-url`, so unrelated recent examples skew sizes.
- **No `generationConfig`**: default temperature, on `gemini-2.5-flash-lite` (~L50).
- **Shape-only checks**: `validateRecipeDraft` (~L180-199) checks shape only. `computeSoftWarnings` (~L294-308, mirrored in `src/app/core/services/gemini-shots.service.ts:16-31`) only flags yield > 20, fewer than 3 ingredients, fewer than 2 steps, or a dish with unit.
- **No tests**: nothing in `server/test/` covers AI, and `ai.js` exports only `router` (~L1457), so its helpers can't be unit-tested.

Dandan wants both a test and a fix.

## Goals & Success Criteria

- Primary: the prompt states that amounts are for the whole `yield_amount` and should be realistic per portion; few-shot examples are chosen by relevance, not recency; output is more deterministic.
- Primary: a soft warning flags implausible grams per portion. Offline unit tests cover the helpers, and an opt-in live eval checks a fixed prompt set (starting with omelet).
- Success: "חביתה" yields 1–2 portions with 2–3 eggs per portion, in at least 4 of 5 live runs.

## Execution Mode

- Parallel: yes
- Concurrent plans: none touching `server/routes/ai.js` (plan 336 does: run after it).
- Isolated DB: no

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`
— add to them, never rewrite or remove an existing entry without escalating).

```scope
server/routes/ai.js
server/services/ai-recipe-helpers.js
server/test/**
server/scripts/ai-eval-recipes.js
src/app/core/services/gemini-shots.service.ts
src/app/core/services/gemini-shots.service.spec.ts
```

## Read Scope

Entire repo. Analysis and architectural suggestions are expected.

## Escalation Protocol

Thinking outside the box is expected; writing outside it requires explicit consent. If a
Worker needs a file outside the ## Read-Write Scope above: STOP, tell the Human the file,
the exact change, and why it can't be done in-scope; wait for `approved: <path>`; then
append the path to the scope block above and retry.

## Step 0 — Reality Check

Runs only when `scope-check.mjs --drift` reports `REALITY: drift`. Check the listed commits
by symbol (do not re-run the whole reality check from scratch), then STOP for a go before
touching any milestone.

## User Stories

As a chef, when I ask the AI for an omelet, I want 1–2 portions with realistic egg counts, not a banquet.

## Functional Requirements

### Must Have (P0)
- [x] Extract the pure helpers from `ai.js` into `server/services/ai-recipe-helpers.js` (CommonJS): `extractJsonPayload`, `validateRecipeDraft`, `normalizeIngredientUnits`, `computeSoftWarnings`, `buildFewShotBlock`, plus a new `selectShots(shots, prompt, n)`. `ai.js` imports them; behavior is unchanged except where stated below.
- [x] Prompt additions (Hebrew, in `SYSTEM_PROMPT`):
  - Ingredient amounts are for the whole `yield_amount`.
  - If the user names a number of portions, use it exactly; otherwise default to a realistic home or restaurant serving (for single-serving dishes like an omelet, 1 portion).
  - Aim for realistic per-portion amounts (a main dish is typically 150–450 g per portion).
- [x] `selectShots`: score approved shots by keyword overlap with the request text (normalized Hebrew tokens, niqqud stripped). Take the top 2 with score > 0, otherwise 0 shots (no unrelated examples). Use it in all three generate routes.
- [x] `generationConfig: { temperature: 0.4 }` on the recipe generate calls.
- [x] New soft warning `implausible_portion_weight`: estimate total grams with a small unit→gram table (g, kg, ml, l, unit-egg ≈ 55 g, tablespoon 15, teaspoon 5, cup 240, pinch ≈ 0; unknown units skipped). Warn when grams per portion is < 60 or > 700 for a dish. Mirror it in `gemini-shots.service.ts`.
- [x] Offline vitest (`server/test/ai-recipe-helpers.test.js`) for every helper: fenced JSON, few-shot echo stripping, validation failures, unit normalization, soft warnings including the new one, `selectShots` relevance and empty fallback.
- [x] Opt-in live eval `server/scripts/ai-eval-recipes.js`:
  - Runs only with `GEMINI_API_KEY` set and is not in CI.
  - Prompts: "חביתה", "חביתה ל-2", "חביתה מ-3 ביצים", "שקשוקה ל-4", "סלט ירקות קצוץ"; each 5 times.
  - Asserts: dish type and `yield_unit=portion`; `yield_amount` matches the requested count, or is 1–2 for an omelet; eggs per portion 2–3 for the omelets; grams per portion 100–450; ≥ 2 steps.
  - Prints a pass-rate table; exits 1 if any prompt passes in fewer than 4 of 5 runs.

### Should Have (P1)
- [x] An npm script `ai:eval` in `server/package.json`, if in scope; otherwise escalate. Usage documented at the top of the script.

### Nice to Have (P2)
- None.

## UI/UX Notes

- The new soft warning shows in the existing AI draft warning area. Dictionary key `ai_warning_implausible_portion_weight` = "כמויות הרכיבים לא סבירות ביחס למספר המנות" (append).

## Atomic Sub-tasks

- [x] A1: Extract the helpers into `ai-recipe-helpers.js`; `ai.js` imports them; offline tests for the existing behavior (pass before any change).
- [x] A2: Prompt rules, `selectShots`, temperature (`server/routes/ai.js`).
- [x] A3: The `implausible_portion_weight` warning, server and client mirror, plus tests and the dictionary key.
- [x] A4: Live eval script. Run it locally with the key and paste the pass-rate table into the session state (`server/scripts/ai-eval-recipes.js`). Passed 2026-10-09 on `gemini-3.1-flash-lite`, 25/25 (5 prompts × 5 runs) after rule 3a now requires produce/meat/fish/cheese in grams, not `unit` (the salad's vegetables were unweighable, so g/portion read ~30). First run before that fix: salad 0/5, חביתה 3/5 (timeouts only; 4/5 and 5/5 on re-run).
- [x] A5: Build, server tests. Update session-state.

## Technical Considerations

- Dependencies: `server/routes/ai.js` (recipe routes), `GeminiShotsService` (client mirror).
- New files: `server/services/ai-recipe-helpers.js`, `server/test/ai-recipe-helpers.test.js`, `server/scripts/ai-eval-recipes.js`.
- Model changes: none (`AiRecipeDraft` shape unchanged).
- Gemini stays server-side only. The eval counts against the daily usage limit, so it runs locally only. Never print or commit the key.

## Out of Scope

- The product and menu AI routes.
- Changing the Gemini model.

## Critical Questions

- When the user gives no portion count, the default is:
  a) A realistic serving for that dish type (omelet → 1) (default)
  b) Always 4

## Success Criteria

- [auto] `npm --prefix server test` (or the repo's server-tests command) → the new ai-recipe-helpers tests pass, 0 failures.
- [auto] `npm run build` → exit 0.
- [auto] With `GEMINI_API_KEY` set: `node server/scripts/ai-eval-recipes.js` → every prompt ≥ 4/5, exit 0. (Run locally, not in CI.)
- [human] In the app: AI recipe "חביתה" → 1 portion, 2–3 eggs, a pinch of salt. "חביתה ל-2" → 2 portions, 4–6 eggs.
