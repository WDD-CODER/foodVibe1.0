'use strict';
/**
 * Plan 760: the assistant's engine numbers. This table is the one place of each number's default, range and unit; the
 * platform admin's changes live in one document of `platformSettings` that holds only the values that differ from the
 * defaults, with one history entry per save. Reads are cached in memory for a few seconds and a save refreshes the
 * cache, so a change applies from the next guest message without a restart. Logs carry numbers, field names and ids.
 */
const { logger } = require('../logger');

const COLLECTION = 'platformSettings';
const DOC_ID = 'assistant-engine';
const CACHE_MS = 5000;
/** The longest wait is never closer than this to the quiet wait. */
const MAX_WAIT_GAP_MS = 1000;

const row = (def, min, max, unit) => Object.freeze({ def, min, max, unit });

const ENGINE_SETTINGS = Object.freeze({
  // A run starts when the guest has been quiet this long, and never later than `maxWaitMs` after the burst began.
  quietMs: row(3000, 1000, 10000, 'ms'),
  maxWaitMs: row(6000, 2000, 30000, 'ms'),
  dailyTurns: row(300, 1, 2000, 'daily'),
  turnLimit: row(8, 1, 50, 'replies'),
  followUpMax: row(3, 0, 10, 'replies'),
  historyWindow: row(12, 2, 40, 'messages'),
  glueMax: row(5, 1, 10, 'messages'),
  factsMaxChars: row(6000, 1000, 20000, 'chars'),
  // Under the 15 s limit of one model call, or the first model is never cut.
  firstModelMs: row(6000, 2000, 14000, 'ms'),
  // At least 30 s under the conversation's run lease (`frontdesk-lease.js`, 90 s).
  turnBudgetMs: row(35000, 10000, 60000, 'ms'),
});

const ENGINE_DEFAULTS = Object.freeze(
  Object.fromEntries(Object.entries(ENGINE_SETTINGS).map(([field, { def }]) => [field, def]))
);

let cache = null; // { engine, readAt }
let generation = 0; // a read that began before a save never replaces the newer cache
let warned = false;

const inRange = (value, { min, max }) => Number.isInteger(value) && value >= min && value <= max;

/** The numbers the engine works with, from the stored values: a missing or unfit one is its default. */
function engineFrom(values) {
  let unfit = false;
  const engine = {};
  for (const [field, setting] of Object.entries(ENGINE_SETTINGS)) {
    const value = values ? values[field] : undefined;
    const fits = inRange(value, setting);
    if (value !== undefined && !fits) unfit = true;
    engine[field] = fits ? value : setting.def;
  }
  engine.maxWaitMs = Math.max(engine.maxWaitMs, engine.quietMs + MAX_WAIT_GAP_MS);
  return { engine: Object.freeze(engine), unfit };
}

/** The range of every number as it holds now: the longest wait's min follows the quiet wait. */
function limitsOf(engine) {
  const limits = {};
  for (const [field, { min, max, unit }] of Object.entries(ENGINE_SETTINGS)) limits[field] = { min, max, unit };
  limits.maxWaitMs.min = Math.max(limits.maxWaitMs.min, engine.quietMs + MAX_WAIT_GAP_MS);
  return limits;
}

function warnOnce(log, reason) {
  if (warned) return;
  warned = true;
  log.warn({ event: 'assistant_engine.settings.defaults', reason });
}

/** The numbers last read, without a read: the defaults until `loadEngine` ran. */
function engineNow() {
  return cache ? cache.engine : ENGINE_DEFAULTS;
}

/** The numbers in force. Never throws: a missing or unreadable document gives the defaults. */
async function loadEngine(db, { log = logger } = {}) {
  if (cache && Date.now() - cache.readAt < CACHE_MS) return cache.engine;
  const started = generation;
  let values;
  let problem;
  try {
    const doc = await db.collection(COLLECTION).findOne({ _id: DOC_ID });
    if (doc) values = doc.values;
    else problem = 'missing';
  } catch {
    problem = 'unreadable';
  }
  const { engine, unfit } = engineFrom(values);
  if (problem || unfit) warnOnce(log, problem ?? 'unreadable');
  if (started !== generation) return engineNow();
  cache = { engine, readAt: Date.now() };
  return engine;
}

/**
 * Saves one number and writes its history entry in the same update, so two saves at once both stay in the history and
 * the last one wins. `{ ok: false, reason: 'OUT_OF_RANGE', min, max }` writes nothing.
 * @param {{ field: string, value: number, actor: { userId: string, name: string }, now?: number, log?: object }} save
 */
async function saveEngineSetting(db, { field, value, actor, now = Date.now(), log = logger }) {
  generation += 1;
  cache = null;
  const current = await loadEngine(db, { log });
  const { min, max } = limitsOf(current)[field];
  if (!inRange(value, { min, max })) return { ok: false, reason: 'OUT_OF_RANGE', min, max };

  const { def } = ENGINE_SETTINGS[field];
  const path = `values.${field}`;
  const entry = {
    at: now,
    by: { $literal: actor.userId },
    byName: { $literal: actor.name },
    field: { $literal: field },
    old: { $ifNull: [`$${path}`, def] },
    new: value,
  };
  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { _id: DOC_ID },
    [
      {
        $set: {
          history: { $concatArrays: [{ $ifNull: ['$history', []] }, [entry]] },
          values: { $mergeObjects: [{ $ifNull: ['$values', {}] }, { [field]: value }] },
          updatedAt: now,
        },
      },
      // A value equal to its default is not kept.
      ...(value === def ? [{ $unset: path }] : []),
    ],
    { upsert: true, returnDocument: 'before' }
  );
  const before = result && Object.prototype.hasOwnProperty.call(result, 'value') ? result.value : result;
  const old = before?.values?.[field] ?? def;
  generation += 1;
  cache = null;
  const engine = await loadEngine(db, { log });
  log.info({ event: 'assistant_engine.saved', field, old, new: value, userId: actor.userId });
  return { ok: true, engine, limits: limitsOf(engine) };
}

/** Drops the cached read only. */
function forgetEngineCacheForTest() { cache = null; }
/** As after a start: no cache, and the warning not yet logged. */
function resetEngineSettingsForTest() { cache = null; warned = false; }

module.exports = {
  ENGINE_SETTINGS, ENGINE_DEFAULTS, engineNow, loadEngine, saveEngineSetting, limitsOf,
  forgetEngineCacheForTest, resetEngineSettingsForTest,
};
