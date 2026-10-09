'use strict';
/**
 * The one place the server calls Gemini (plan 395).
 *
 * Google's free tier gives each model its own daily bucket (20 to 500 calls/day on our key).
 * The admin orders the models (chain); every request makes exactly ONE Gemini call, on the
 * user's chosen model or the chain's first. When that model is out of its daily quota
 * (until midnight America/Los_Angeles) the caller gets 'model_exhausted' plus the next
 * usable model, and the user decides whether to switch — the server never retries on
 * another model by itself (Human decision, 2026-10-09: no unattended spend).
 * Default order and per-model budgets: MODEL_DAILY_BUDGETS below.
 *
 * Exhausted state lives in memory and is mirrored on today's quota doc in GEMINI_USAGE
 * (see "Usage docs" below) so a restart doesn't burn a call re-discovering it.
 * Mongo errors are never blocking.
 */

const mongoose = require('mongoose');

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/**
 * Free-tier requests per day, per model, for our key's project. Google no longer publishes
 * these (ai.dev/rate-limit shows them only to the signed-in owner); values come from 429
 * `quotaValue`s — ours for gemini-2.5-flash-lite (2026-10-08), aiplug.work's measurements
 * (2026-09-02) for the rest. Informational: the chain reacts to the real 429, not to these.
 */
const MODEL_DAILY_BUDGETS = {
  'gemini-3.1-flash-lite': 500,
  'gemini-3.5-flash-lite': 500,
  'gemini-2.5-flash-lite': 20,
  'gemini-2.5-flash': 20,
  'gemini-3.5-flash': 20,
  'gemini-3.6-flash': 20,
  'gemini-3.7-flash': 20,
  'gemini-3.8-flash': 20,
};

/**
 * Order (plan 395 G6, 2026-10-09): gemini-3.1-flash-lite leads — the biggest bucket and the
 * best recipe-eval score (20/25). gemini-3.5-flash-lite is the other 500-a-day bucket but
 * scored 11/25 with 503s, so it is the last reserve. The order only picks who answers; the
 * total stays ~1,120 calls a day. Every model here answered 200 on 2026-10-09.
 */
const DEFAULT_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash-lite',
];

/** Models that accept inline images — every gemini-*-flash* model today. */
const VISION_MODEL_PATTERN = /^gemini-[\d.]+-flash/;

const USAGE_COLLECTION = 'GEMINI_USAGE';
const RESET_TIME_ZONE = 'America/Los_Angeles';

const SETTINGS_DOC_ID = 'chain-settings';

/** model -> Date it becomes usable again */
const exhaustedUntil = new Map();
/** The admin's saved chain ([{ name, enabled }] in order), or null when none is saved. */
let adminSettings = null;
let loadPromise = null;

// ---------------------------------------------------------------------------
// Chain + reset time
// ---------------------------------------------------------------------------

function envModels() {
  return (process.env.GEMINI_MODELS || '')
    .split(',')
    .map(m => m.trim())
    .filter(Boolean);
}

/** The chain before any admin choice: GEMINI_MODELS (comma list) when set, else DEFAULT_MODELS. */
function baseChain() {
  const fromEnv = envModels();
  return fromEnv.length > 0 ? fromEnv : DEFAULT_MODELS;
}

/** Every model the admin may pick from: the base chain plus every model with a known budget. */
function modelCatalog() {
  return [...new Set([...baseChain(), ...Object.keys(MODEL_DAILY_BUDGETS)])];
}

/**
 * The admin's full list, in order, with on/off: the saved settings (models still in the
 * catalog), then any catalog model the settings don't mention, off. Without settings: the
 * base chain on, the rest of the catalog off.
 */
function chainSettings() {
  const catalog = modelCatalog();
  if (!adminSettings) {
    const base = new Set(baseChain());
    return [...baseChain(), ...catalog.filter(m => !base.has(m))].map(name => ({ name, enabled: base.has(name) }));
  }
  const saved = adminSettings.filter(e => catalog.includes(e.name));
  const savedNames = new Set(saved.map(e => e.name));
  return [...saved, ...catalog.filter(m => !savedNames.has(m)).map(name => ({ name, enabled: false }))];
}

/** The ordered chain callGemini walks: the admin's enabled models, else the base chain. */
function modelChain() {
  const enabled = chainSettings().filter(e => e.enabled).map(e => e.name);
  return enabled.length > 0 ? enabled : baseChain();
}

function isVisionModel(model) {
  return VISION_MODEL_PATTERN.test(model);
}

function modelUrl(model) {
  return `${GEMINI_BASE_URL}/${model}:generateContent`;
}

/** Milliseconds the reset time zone is ahead of UTC at `date` (negative for LA). */
function zoneOffsetMs(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: RESET_TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
  }).formatToParts(date);
  const get = type => Number(parts.find(p => p.type === type).value);
  const wallAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return wallAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** Next midnight in America/Los_Angeles after `now` — when Google resets free-tier daily quotas. */
function nextResetAt(now = new Date()) {
  const local = new Date(now.getTime() + zoneOffsetMs(now));
  const nextMidnightWall = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1);
  const guess = nextMidnightWall - zoneOffsetMs(now);
  // Re-read the offset at the guess so a DST change before midnight lands exactly on 00:00.
  return new Date(nextMidnightWall - zoneOffsetMs(new Date(guess)));
}

/** True when a Gemini 429 body names a per-day quota (not the per-minute one). */
function isDailyQuota(body) {
  const details = Array.isArray(body?.error?.details) ? body.error.details : [];
  return details.some(d => Array.isArray(d.violations) && d.violations.some(v => /PerDay/.test(v.quotaId ?? '')));
}

// ---------------------------------------------------------------------------
// Usage docs (GEMINI_USAGE)
//   { _id: 'YYYY-MM-DD' (UTC), count }        — total calls; shared with the Python seeder
//   { _id: 'quota-YYYY-MM-DD' (LA date), calls: { <model>: n }, exhausted: { <model>: iso } }
//                                              — per model, on Google's quota day
// ---------------------------------------------------------------------------

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

/** Google's quota day: the calendar date in America/Los_Angeles. */
function quotaDayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: RESET_TIME_ZONE }).format(date); // "YYYY-MM-DD"
}

function quotaDocId(date = new Date()) {
  return `quota-${quotaDayKey(date)}`;
}

function usageCol() {
  return mongoose.connection.db.collection(USAGE_COLLECTION);
}

/** Mongo field names can't hold dots; model names do. */
function encodeModelKey(model) {
  return model.replace(/\./g, '_');
}

/** Today's dispatched-call count. Non-blocking: DB errors read as 0. */
async function getUsageCount() {
  try {
    const doc = await usageCol().findOne({ _id: todayKey() });
    return doc ? doc.count ?? 0 : 0;
  } catch {
    return 0;
  }
}

/** Counts one dispatched call, in total and for its model. Non-blocking: DB errors are ignored. */
async function incrementUsage(model) {
  try {
    const now = new Date();
    await Promise.all([
      usageCol().updateOne({ _id: todayKey(now) }, { $inc: { count: 1 } }, { upsert: true }),
      usageCol().updateOne({ _id: quotaDocId(now) }, { $inc: { [`calls.${encodeModelKey(model)}`]: 1 } }, { upsert: true }),
    ]);
  } catch {
    // don't crash the AI call over the counter
  }
}

async function persistExhausted(model, resetAt, now) {
  try {
    await usageCol().updateOne(
      { _id: quotaDocId(now) },
      { $set: { [`exhausted.${encodeModelKey(model)}`]: resetAt.toISOString() } },
      { upsert: true }
    );
  } catch {
    // the in-memory map still holds it
  }
}

/** Today's quota doc, or {} when there is none or the DB is unreachable. */
async function readQuotaDoc(now = new Date()) {
  try {
    return (await usageCol().findOne({ _id: quotaDocId(now) })) ?? {};
  } catch {
    return {};
  }
}

/**
 * Restores the admin's chain settings and today's exhausted models. Retried on the next
 * call if the DB isn't reachable yet.
 */
function ensureLoaded() {
  if (!loadPromise) {
    loadPromise = (async () => {
      const now = new Date();
      const [settings, doc] = await Promise.all([
        usageCol().findOne({ _id: SETTINGS_DOC_ID }),
        usageCol().findOne({ _id: quotaDocId(now) }),
      ]);
      adminSettings = Array.isArray(settings?.models) ? settings.models : null;
      const byKey = new Map(modelCatalog().map(m => [encodeModelKey(m), m]));
      for (const [key, iso] of Object.entries(doc?.exhausted ?? {})) {
        const model = byKey.get(key);
        const resetAt = new Date(iso);
        if (!model || Number.isNaN(resetAt.getTime()) || resetAt <= now) continue;
        exhaustedUntil.set(model, resetAt);
      }
    })().catch(() => {
      loadPromise = null;
    });
  }
  return loadPromise;
}

// ---------------------------------------------------------------------------
// Exhausted state + budget
// ---------------------------------------------------------------------------

function exhaustedResetAt(model, now) {
  const resetAt = exhaustedUntil.get(model);
  if (!resetAt) return null;
  if (resetAt <= now) {
    exhaustedUntil.delete(model);
    return null;
  }
  return resetAt;
}

function markExhausted(model, now) {
  const resetAt = nextResetAt(now);
  exhaustedUntil.set(model, resetAt);
  persistExhausted(model, resetAt, now);
  return resetAt;
}

/**
 * Per-model status for GET /usage: quota state plus today's budget. `used` counts this
 * server's calls on Google's quota day; a model Google reports exhausted has 0 remaining
 * whatever the count says (other callers on the key, e.g. the seeder, spend it too).
 */
async function getModelStatus(names) {
  await ensureLoaded();
  const now = new Date();
  const calls = (await readQuotaDoc(now)).calls ?? {};
  return (names ?? modelChain()).map(name => {
    const resetAt = exhaustedResetAt(name, now);
    const dailyBudget = MODEL_DAILY_BUDGETS[name] ?? null;
    const used = calls[encodeModelKey(name)] ?? 0;
    const remaining = resetAt !== null ? 0 : dailyBudget === null ? null : Math.max(0, dailyBudget - used);
    return { name, exhausted: resetAt !== null, resetAt: resetAt ? resetAt.toISOString() : null, dailyBudget, used, remaining };
  });
}

/** The admin view: every catalog model in chain order, on/off, with today's status. */
async function getChainSettings() {
  await ensureLoaded();
  const settings = chainSettings();
  const status = await getModelStatus(settings.map(e => e.name));
  return settings.map((e, i) => ({ ...status[i], enabled: e.enabled, vision: isVisionModel(e.name) }));
}

/** Returns an error string for a bad admin chain list, or null. */
function validateChainSettings(models) {
  if (!Array.isArray(models)) return 'models must be an array';
  const catalog = modelCatalog();
  const names = models.map(e => e?.name);
  if (models.some(e => typeof e?.enabled !== 'boolean')) return 'every model needs a boolean "enabled"';
  if (names.some(n => !catalog.includes(n))) return 'unknown model';
  if (new Set(names).size !== names.length) return 'duplicate model';
  if (!models.some(e => e.enabled)) return 'at least one model must stay on';
  return null;
}

/**
 * Saves the admin's chain ([{ name, enabled }] in order; null = back to the default).
 * Returns an error string for a bad list, or null. Applies at once on this server.
 */
async function saveChainSettings(models) {
  await ensureLoaded();
  if (models === null) {
    await usageCol().deleteOne({ _id: SETTINGS_DOC_ID });
    adminSettings = null;
    return null;
  }
  const error = validateChainSettings(models);
  if (error) return error;
  const clean = models.map(e => ({ name: e.name, enabled: e.enabled }));
  await usageCol().updateOne({ _id: SETTINGS_DOC_ID }, { $set: { models: clean, updatedAt: new Date() } }, { upsert: true });
  adminSettings = clean;
  return null;
}

/** Chain-wide budget for today: sum of the known per-model budgets, used, and remaining. */
function summarizeBudget(models) {
  const known = models.filter(m => m.dailyBudget !== null);
  const budget = known.reduce((sum, m) => sum + m.dailyBudget, 0);
  const remaining = known.reduce((sum, m) => sum + m.remaining, 0);
  return { budget, used: budget - remaining, remaining };
}

// ---------------------------------------------------------------------------
// The call
// ---------------------------------------------------------------------------

/** The first model in `candidates` that isn't out of its daily quota, or null. */
function firstUsable(candidates, now) {
  return candidates.find(m => exhaustedResetAt(m, now) === null) ?? null;
}

/** 'all_exhausted' with the earliest reset among `candidates`. */
function allExhausted(candidates) {
  const resets = candidates.map(m => exhaustedUntil.get(m)).filter(Boolean).sort((a, b) => a - b);
  return { kind: 'all_exhausted', resetAt: resets[0] ? resets[0].toISOString() : null };
}

/**
 * Sends `body` to ONE model — never more than one Gemini call per request (plan 395, Human
 * 2026-10-09: switching models is the user's decision, not the server's). The model is
 * `model` when the user picked one (it must be an enabled chain model), else the first in
 * the chain. If that model is out of its daily quota — known already, or learned from this
 * call's 429 — the result is 'model_exhausted' naming the next usable model, and the user
 * decides whether to send again on it. Never throws. Returns:
 *   { kind: 'ok', model, data }
 *   { kind: 'model_exhausted', model, nextModel, resetAt }
 *   { kind: 'all_exhausted', resetAt }          (ISO string or null)
 *   { kind: 'gemini_error', model, status, message }
 *   { kind: 'timeout' | 'network', model }
 */
async function callGemini({ body, timeoutMs, log, eventPrefix, needsVision = false, model: requested }) {
  await ensureLoaded();
  const apiKey = process.env.GEMINI_API_KEY;
  const candidates = modelChain().filter(m => !needsVision || isVisionModel(m));
  const now = new Date();
  if (!firstUsable(candidates, now)) return allExhausted(candidates);

  const model = candidates.includes(requested) ? requested : candidates[0];
  const knownReset = exhaustedResetAt(model, now);
  if (knownReset) {
    return { kind: 'model_exhausted', model, nextModel: firstUsable(candidates, now), resetAt: knownReset.toISOString() };
  }

  await incrementUsage(model);
  log.info({ event: `${eventPrefix}.gemini_call`, model });

  let res;
  try {
    res = await fetch(`${modelUrl(model)}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    if (err?.name === 'TimeoutError' || err?.name === 'AbortError') {
      log.warn({ event: `${eventPrefix}.timeout`, model });
      return { kind: 'timeout', model };
    }
    log.error({ err, event: `${eventPrefix}.failed`, model });
    return { kind: 'network', model };
  }

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    if (res.status === 429 && isDailyQuota(errBody)) {
      const resetAt = markExhausted(model, now);
      const nextModel = firstUsable(candidates, now);
      log.warn({ event: 'ai.model.exhausted', model, nextModel, resetAt: resetAt.toISOString() });
      if (!nextModel) return allExhausted(candidates);
      return { kind: 'model_exhausted', model, nextModel, resetAt: resetAt.toISOString() };
    }
    const message = errBody?.error?.message ?? '';
    log.error({ event: `${eventPrefix}.gemini_failed`, model, status: res.status, geminiMessage: message });
    return { kind: 'gemini_error', model, status: res.status, message };
  }

  try {
    return { kind: 'ok', model, data: await res.json() };
  } catch {
    log.error({ event: `${eventPrefix}.gemini_failed`, model, status: res.status, geminiMessage: 'unreadable response body' });
    return { kind: 'gemini_error', model, status: res.status, message: 'unreadable response body' };
  }
}

/** The text of the first candidate's first part, or '' — what every route parses. */
function responseText(data) {
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
}

/** Test-only: forget all exhausted state and reload from Mongo on the next call. */
function resetForTests() {
  exhaustedUntil.clear();
  adminSettings = null;
  loadPromise = null;
}

/** Test-only: set the admin's chain without Mongo. */
function setChainSettingsForTests(models) {
  adminSettings = models;
}

module.exports = {
  DEFAULT_MODELS,
  MODEL_DAILY_BUDGETS,
  callGemini,
  getChainSettings,
  getModelStatus,
  saveChainSettings,
  validateChainSettings,
  getUsageCount,
  isDailyQuota,
  isVisionModel,
  modelCatalog,
  modelChain,
  modelUrl,
  nextResetAt,
  quotaDayKey,
  summarizeBudget,
  responseText,
  todayKey,
  resetForTests,
  setChainSettingsForTests,
};
