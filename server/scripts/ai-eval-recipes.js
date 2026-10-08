'use strict';
/**
 * ai-eval-recipes.js — opt-in live eval of AI recipe generation (plan 370).
 *
 * Sends a fixed set of prompts to Gemini, several runs each, with the same system prompt
 * and generation config as POST /api/v1/ai/generate, then checks that the portions and
 * amounts are realistic. Not part of `npm test` and never run in CI: it makes real Gemini
 * calls (5 prompts × 5 runs = 25+, counted against the Google API quota).
 *
 * No few-shot examples are sent (no DB connection), so this measures the prompt rules alone.
 * The app's daily usage counter (GEMINI_USAGE) is not incremented.
 *
 * Calls are paced for the free tier (~15/min), so a full run takes a few minutes.
 *
 * Usage (needs GEMINI_API_KEY in server/.env or the environment):
 *   node server/scripts/ai-eval-recipes.js [--runs=5] [--only=1,2]
 *
 * --only picks prompts by their 1-based position in CASES. The free tier allows only 20 calls
 * per model per day, so a full 5×5 run has to be split across days (e.g. --only=1,2,3 today,
 * --only=4,5 tomorrow). On the daily-quota 429 the script stops at once with exit 3.
 *
 * Prints a pass-rate table and exits 1 if any prompt passes in fewer than 4 of 5 runs
 * (scaled to --runs), 2 if the key is missing, 3 if the daily quota ran out.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const {
  GEMINI_URL,
  RECIPE_GENERATION_CONFIG,
  SYSTEM_PROMPT,
  extractJsonPayload,
  normalizeIngredientUnits,
  validateRecipeDraft,
  estimateGramsPerPortion,
} = require('../services/ai-recipe-helpers');

const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').split('=')[1];
const RUNS = Number((process.argv.find((a) => a.startsWith('--runs=')) || '').split('=')[1]) || 5;
const MIN_PASS_RATIO = 4 / 5;
const TIMEOUT_MS = 30000;
const EGG_NAME_PATTERN = /ביצ|\begg/i;
// Free-tier Gemini allows ~15 requests a minute: pace the calls, and on a 429 wait and try again.
const CALL_GAP_MS = 4500;
const RATE_LIMIT_WAIT_MS = 30000;
const RATE_LIMIT_RETRIES = 3;

const GRAMS_PER_PORTION = { min: 100, max: 450 };
const EGGS_PER_PORTION = { min: 2, max: 3 };

/** yield: exact count or [min, max]; omelet: check eggs per portion; totalEggs: the stated egg count. */
const CASES = [
  { prompt: 'חביתה', yield: [1, 2], omelet: true },
  { prompt: 'חביתה ל-2', yield: 2, omelet: true },
  { prompt: 'חביתה מ-3 ביצים', yield: [1, 2], omelet: true, totalEggs: 3 },
  { prompt: 'שקשוקה ל-4', yield: 4 },
  { prompt: 'סלט ירקות קצוץ', yield: [1, 12] },
];

function countEggs(draft) {
  return draft.ingredients
    .filter((ing) => ing && ing.unit === 'unit' && typeof ing.name === 'string' && EGG_NAME_PATTERN.test(ing.name))
    .reduce((sum, ing) => sum + (typeof ing.amount === 'number' ? ing.amount : 0), 0);
}

/** Returns the list of failed checks for one draft; empty means the run passed. */
function checkDraft(draft, testCase) {
  const failures = [];
  if (draft.recipe_type !== 'dish') failures.push(`recipe_type=${draft.recipe_type}`);
  if (draft.yield_unit !== 'portion') failures.push(`yield_unit=${draft.yield_unit}`);

  const portions = draft.yield_amount;
  const yieldOk = Array.isArray(testCase.yield)
    ? portions >= testCase.yield[0] && portions <= testCase.yield[1]
    : portions === testCase.yield;
  if (!yieldOk) failures.push(`yield_amount=${portions}`);

  if (testCase.omelet && portions > 0) {
    const eggsPerPortion = countEggs(draft) / portions;
    if (eggsPerPortion < EGGS_PER_PORTION.min || eggsPerPortion > EGGS_PER_PORTION.max) {
      failures.push(`eggs/portion=${eggsPerPortion.toFixed(1)}`);
    }
  }
  if (testCase.totalEggs !== undefined && countEggs(draft) !== testCase.totalEggs) {
    failures.push(`eggs=${countEggs(draft)}`);
  }

  const grams = estimateGramsPerPortion(draft);
  if (grams === null || grams < GRAMS_PER_PORTION.min || grams > GRAMS_PER_PORTION.max) {
    failures.push(`g/portion=${grams === null ? 'n/a' : Math.round(grams)}`);
  }

  if (!Array.isArray(draft.steps) || draft.steps.length < 2) failures.push('steps<2');
  return failures;
}

/** One Gemini call, parsed and validated like the route does. Returns { draft } or { error }. */
async function generateOnce(apiKey, prompt) {
  const body = {
    contents: [{ parts: [{ text: SYSTEM_PROMPT + '\n\n## הבקשה הנוכחית — החזר JSON בלבד עבורה:\n' + prompt }] }],
    generationConfig: RECIPE_GENERATION_CONFIG,
  };
  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.status === 429 && (await isDailyQuota(res))) return { error: 'daily quota', dailyQuota: true, retry: false };
    if (!res.ok) return { error: `http ${res.status}`, status: res.status, retry: false };
    const data = await res.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    const parsed = extractJsonPayload(raw);
    if (parsed.error) return { error: `json ${parsed.error}`, retry: true };
    normalizeIngredientUnits(parsed.value);
    const errors = validateRecipeDraft(parsed.value);
    if (errors.length > 0) return { error: `invalid: ${errors[0]}`, retry: true };
    return { draft: parsed.value };
  } catch (err) {
    return { error: err?.name === 'TimeoutError' ? 'timeout' : 'network error', retry: false };
  }
}

/** A per-day quota (free tier: 20 calls/model/day) won't clear by waiting a minute — stop instead. */
async function isDailyQuota(res) {
  const body = await res.json().catch(() => ({}));
  const details = Array.isArray(body?.error?.details) ? body.error.details : [];
  return details.some((d) => Array.isArray(d.violations) && d.violations.some((v) => /PerDay/.test(v.quotaId ?? '')));
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Paced call that waits out free-tier rate limits (429) before giving up. */
async function pacedCall(apiKey, prompt) {
  for (let attempt = 0; ; attempt++) {
    await sleep(CALL_GAP_MS);
    const result = await generateOnce(apiKey, prompt);
    if (result.status !== 429 || attempt >= RATE_LIMIT_RETRIES) return result;
    process.stdout.write('~');
    await sleep(RATE_LIMIT_WAIT_MS);
  }
}

/** Same retry rule as the route: one more try when the content was unusable. */
async function generate(apiKey, prompt) {
  const first = await pacedCall(apiKey, prompt);
  return first.retry ? pacedCall(apiKey, prompt) : first;
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set (server/.env or environment). Skipping live eval.');
    process.exit(2);
  }

  const minPasses = Math.ceil(RUNS * MIN_PASS_RATIO);
  const rows = [];
  const cases = ONLY ? CASES.filter((c, i) => ONLY.split(',').includes(String(i + 1))) : CASES;
  for (const testCase of cases) {
    let passes = 0;
    const notes = [];
    for (let run = 1; run <= RUNS; run++) {
      const result = await generate(apiKey, testCase.prompt);
      if (result.dailyQuota) {
        console.error(`
Gemini daily quota used up (free tier: 20 calls/day) at "${testCase.prompt}" run ${run}. Try again tomorrow, or use --only / --runs.`);
        process.exitCode = 3;
        return;
      }
      const failures = result.error ? [result.error] : checkDraft(result.draft, testCase);
      if (failures.length === 0) passes++;
      else notes.push(`#${run}: ${failures.join(', ')}`);
      process.stdout.write(failures.length === 0 ? '.' : 'x');
    }
    rows.push({ prompt: testCase.prompt, passes, ok: passes >= minPasses, notes });
  }
  process.stdout.write('\n\n');

  console.log(`| Prompt | Passed | Result | Failures |`);
  console.log(`| --- | --- | --- | --- |`);
  for (const row of rows) {
    console.log(`| ${row.prompt} | ${row.passes}/${RUNS} | ${row.ok ? 'PASS' : 'FAIL'} | ${row.notes.join('; ') || '—'} |`);
  }

  const failed = rows.filter((row) => !row.ok);
  console.log(`\n${failed.length === 0 ? 'All prompts passed' : `${failed.length} prompt(s) below ${minPasses}/${RUNS}`}.`);
  process.exitCode = failed.length === 0 ? 0 : 1;
}

if (require.main === module) {
  main();
}

module.exports = { checkDraft, countEggs, CASES };
