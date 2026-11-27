'use strict';
/**
 * Plan 760: the assistant's engine numbers. `ENGINE_RULES` is the one table of them, each with its default, its range
 * and its unit. The platform admin's saved numbers live in one document (`platformSettings`, `assistant-engine`) that
 * holds only what differs from the defaults, plus the history of the saves. Every reader asks `engineSettings(db)`: a
 * short in-memory cache, dropped by a save, so a change applies from the next guest message with no restart. The
 * document is platform-wide, never business data. Logs carry field names, numbers and ids only.
 */
const { logger } = require('../logger');

const SETTINGS_COLLECTION = 'platformSettings';
const SETTINGS_ID = 'assistant-engine';
/** How long a read is kept: the longest another server process takes to see a save. */
const CACHE_MS = 5000;
const HISTORY_MAX = 500;
/** The longest wait is always at least this much above the quiet wait. */
const QUIET_GAP_MS = 1000;

const rule = (value, min, max, unit) => Object.freeze({ value, min, max, unit });
const ENGINE_RULES = Object.freeze({
  quietMs: rule(3000, 1000, 15000, 'ms'), // a run starts when the guest has been quiet this long
  maxWaitMs: rule(6000, 2000, 30000, 'ms'), // and never later than this after the first message of the burst
  dailyTurns: rule(300, 1, 2000, 'turns'), // the assistant's answers per business per day
  turnLimit: rule(8, 1, 50, 'turns'), // the assistant's answers in one conversation
  followUpMax: rule(3, 0, 10, 'turns'), // follow-up runs in a row that may call the model
  historyWindow: rule(12, 2, 40, 'messages'), // the newest messages a turn reads and sends
  glueMax: rule(5, 1, 15, 'messages'), // unanswered guest messages counted as waiting for one answer
  factsMaxChars: rule(6000, 1000, 20000, 'chars'), // the facts sent to the model
  firstModelMs: rule(6000, 2000, 15000, 'ms'), // the first model's time before the next one is tried
  // The top stays 30 s under the conversation lease (RUN_LEASE_MS), so a run never outlives its lease.
  turnBudgetMs: rule(35000, 10000, 60000, 'ms'), // the whole answer, retry included
});
const ENGINE_DEFAULTS = Object.freeze(
  Object.fromEntries(Object.entries(ENGINE_RULES).map(([field, { value }]) => [field, value]))
);

const inside = (value, { min, max }) => Number.isInteger(value) && value >= min && value <= max;

/** The numbers in force for what is stored: a value that cannot be read gives its default. Pure. */
function effective(stored) {
  const values = { ...ENGINE_DEFAULTS };
  const ignored = [];
  for (const [field, limits] of Object.entries(ENGINE_RULES)) {
    const saved = stored?.[field];
    if (saved === undefined) continue;
    if (inside(saved, limits)) values[field] = saved;
    else ignored.push(field);
  }
  values.maxWaitMs = Math.max(values.maxWaitMs, values.quietMs + QUIET_GAP_MS);
  return { values: Object.freeze(values), ignored };
}

/** The range of every number while `values` are in force: the longest wait starts above the quiet wait. Pure. */
function engineRanges(values) {
  const ranges = Object.fromEntries(
    Object.entries(ENGINE_RULES).map(([field, { min, max, unit }]) => [field, { min, max, unit }])
  );
  ranges.maxWaitMs.min = Math.max(ranges.maxWaitMs.min, values.quietMs + QUIET_GAP_MS);
  return ranges;
}

let cache = null;
let saves = 0;
let warned = false;

const settingsOf = db => db.collection(SETTINGS_COLLECTION);

function warnOnce(why, fields) {
  if (warned) return;
  warned = true;
  logger.warn({ event: 'assistant_engine.defaults', why, fields });
}

/** The engine numbers in force. Never throws: a missing or unreadable document gives the defaults. */
async function engineSettings(db) {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.values;
  const seen = saves;
  let doc = null;
  let why = null;
  try {
    doc = await settingsOf(db).findOne({ _id: SETTINGS_ID });
    if (!doc) why = 'missing';
  } catch {
    why = 'unreadable';
  }
  const { values, ignored } = effective(doc?.values);
  if (ignored.length) why = 'unreadable';
  if (why) warnOnce(why, ignored);
  // A save made while this read was on its way must not be covered by the older answer.
  if (seen === saves) cache = { at: Date.now(), values };
  return values;
}

/**
 * Saves one number and one history entry, in one write. `{ ok: true }`, or `{ ok: false, min, max }` for a value
 * outside its range. A database failure is thrown to the caller.
 */
async function saveEngineSetting(db, { field, value }, { userId, now = Date.now(), log = logger }) {
  const doc = await settingsOf(db).findOne({ _id: SETTINGS_ID });
  const { min, max } = engineRanges(effective(doc?.values).values)[field];
  if (!inside(value, { min, max })) return { ok: false, min, max };
  const fallback = ENGINE_DEFAULTS[field];
  const entry = {
    at: now,
    by: { $literal: userId },
    field: { $literal: field },
    old: { $ifNull: [`$values.${field}`, fallback] },
    new: value,
  };
  const before = await settingsOf(db).findOneAndUpdate(
    { _id: SETTINGS_ID },
    [{
      $set: {
        history: { $slice: [{ $concatArrays: [{ $ifNull: ['$history', []] }, [entry]] }, -HISTORY_MAX] },
        [`values.${field}`]: value === fallback ? '$$REMOVE' : value,
        updatedAt: now,
      },
    }],
    { upsert: true, returnDocument: 'before', includeResultMetadata: false }
  );
  saves += 1;
  cache = null;
  log.info({ event: 'assistant_engine.saved', field, from: before?.values?.[field] ?? fallback, to: value, userId });
  return { ok: true };
}

/** Test-only: forget the cache and, unless `keepWarned`, that a warning was logged. */
function resetEngineSettingsForTests({ keepWarned = false } = {}) {
  cache = null;
  if (!keepWarned) warned = false;
}

module.exports = {
  ENGINE_RULES, ENGINE_DEFAULTS, engineSettings, engineRanges, saveEngineSetting, resetEngineSettingsForTests,
};
