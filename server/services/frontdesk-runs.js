'use strict';
/**
 * Plan 752 (C-RUNS): records one run of the assistant's turn — 13 steps with status, duration, input and output — and
 * writes it once, at the end, to `assistantRuns`. Recording never breaks or slows a turn: no method throws, nothing is
 * awaited before `finish`, and a failed write is one warn line. A run document holds the guest's words and the AI's
 * answer; the LOG never does — log lines here carry ids, enums and numbers only.
 * The one module that reads and writes `assistantRuns`.
 */
const { performance } = require('node:perf_hooks');
const { logger } = require('../logger');
const { newId } = require('../utils/id');
const { checkStoredDoc } = require('../middleware/validate');
const { RUN_STEP_KEYS } = require('../generated/schemas/entities');

const COLLECTION = 'assistantRuns';
const RUN_TTL_DAYS = 30;
const RAW_MAX = 4000;
const LEAD_MAX = 8000;
const TRIGGER_TEXT_MAX = 300;
const TRIGGER_IDS_MAX = 12;
const STRING_MAX = 300;
const ARRAY_MAX = 200;
const DEPTH_MAX = 3;
const ADMIN_VIEWS_MAX = 20;
const DAY_MS = 86400000;

const defaultInsert = (db, doc) => db.collection(COLLECTION).insertOne(doc);
let insertForTests = null;
/** Tests only: replaces the insert (`fn(doc)`); `null` restores it. */
function _setInsertForTests(fn) { insertForTests = fn; }

/**
 * A copy of a step's `in` / `out` value that is safe to store: long strings cut (`raw` keeps more), long arrays cut,
 * containers nested deeper than three levels dropped (the `in` / `out` object itself is level 1).
 */
function clip(value, key, depth) {
  if (typeof value === 'string') return value.slice(0, key === 'raw' ? RAW_MAX : STRING_MAX);
  if (typeof value === 'function' || typeof value === 'symbol') return undefined;
  if (value === null || typeof value !== 'object' || value instanceof Date) return value;
  if (depth > DEPTH_MAX) return undefined;
  if (Array.isArray(value)) {
    return value.slice(0, ARRAY_MAX).map(v => clip(v, key, depth + 1)).filter(v => v !== undefined);
  }
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    const kept = clip(v, k, depth + 1);
    if (kept !== undefined) out[k] = kept;
  }
  return out;
}

const isRecord = v => !!v && typeof v === 'object' && !Array.isArray(v);

function createRun(db, conversation, { now, mode, inbound }) {
  const id = newId();
  const startedPerf = performance.now();
  const steps = new Map();
  const facts = {};
  let result = null;
  let discarded = false;

  const stepOf = key => {
    if (!RUN_STEP_KEYS.includes(key)) return null;
    if (!steps.has(key)) steps.set(key, { status: 'ok', ms: 0 });
    return steps.get(key);
  };

  function step(key, patch) {
    try {
      const entry = stepOf(key);
      if (!entry || !isRecord(patch)) return;
      if (patch.status !== undefined) entry.status = patch.status;
      if (patch.ms !== undefined) entry.ms = patch.ms;
      for (const side of ['in', 'out']) {
        if (isRecord(patch[side])) entry[side] = { ...entry[side], ...clip(patch[side], side, 1) };
      }
    } catch {
      // Recording never breaks a turn.
    }
  }

  function addTime(key, since) {
    const entry = stepOf(key);
    if (entry) entry.ms += Math.round(performance.now() - since);
  }

  const failStep = (key, err) => step(key, { status: 'stopped', out: { error: (err && err.name) || 'Error' } });

  async function time(key, fn) {
    const since = performance.now();
    try {
      return await fn();
    } catch (err) {
      failStep(key, err);
      throw err;
    } finally {
      addTime(key, since);
    }
  }

  function timeSync(key, fn) {
    const since = performance.now();
    try {
      return fn();
    } catch (err) {
      failStep(key, err);
      throw err;
    } finally {
      addTime(key, since);
    }
  }

  function set(patch) {
    try {
      for (const [key, value] of Object.entries(patch ?? {})) {
        if (value !== undefined) facts[key] = value;
      }
    } catch {
      // Recording never breaks a turn.
    }
  }

  function end(outcome, reason) { result = { outcome, reason }; }

  function discard() { discarded = true; }

  function inboundStep(answers) {
    if (!inbound) {
      return { key: 'inbound', status: 'skipped', ms: 0, out: { via: mode === 'suggest' ? 'suggest' : 'direct' } };
    }
    const waitedMs = inbound.waitedMs ?? 0;
    return {
      key: 'inbound', status: answers > 1 ? 'note' : 'ok', ms: waitedMs,
      in: { at: inbound.at }, out: { waitedMs, answers },
    };
  }

  function document() {
    const waited = inbound?.waitedMs ?? 0;
    const ms = Math.max(0, Math.round(performance.now() - startedPerf)) + waited;
    const startedAt = now - waited;
    const trigger = {
      messageIds: (facts.trigger?.messageIds ?? []).slice(0, TRIGGER_IDS_MAX),
      text: String(facts.trigger?.text ?? '').slice(0, TRIGGER_TEXT_MAX),
    };
    const { outcome, reason } = result ?? { outcome: 'failed', reason: 'error' };
    const { model, firstModel, intent, lead, tone, tablesOn } = facts;
    const keepPrompt = typeof lead === 'string' && (outcome === 'handover' || outcome === 'failed');
    return {
      _id: id,
      businessId: conversation.businessId,
      conversationId: conversation._id,
      ...(conversation.test === true && { test: true }),
      mode,
      level: facts.level ?? 0,
      startedAt,
      endedAt: startedAt + ms,
      ms,
      expiresAt: new Date(startedAt + RUN_TTL_DAYS * DAY_MS),
      trigger,
      outcome,
      ...(reason && { reason }),
      fallbackUsed: !!model && !!firstModel && model !== firstModel,
      ...(model && { model }),
      ...(intent && { intent }),
      steps: RUN_STEP_KEYS.map(key => {
        if (key === 'inbound') return inboundStep(trigger.messageIds.length);
        const entry = steps.get(key);
        return entry ? { key, ...entry } : { key, status: 'skipped', ms: 0 };
      }),
      ...(keepPrompt && {
        prompt: {
          lead: lead.slice(0, LEAD_MAX), ...(lead.length > LEAD_MAX && { truncated: true }), tone, tablesOn: !!tablesOn,
        },
      }),
    };
  }

  async function finish({ log = logger } = {}) {
    try {
      if (discarded) return;
      const conversationId = conversation._id;
      const doc = document();
      const check = checkStoredDoc(COLLECTION, doc);
      if (!check.ok) {
        const paths = check.issues.slice(0, 10).map(i => i.path);
        log.warn({ event: 'frontdesk.run.record_failed', conversationId, reason: 'schema', paths });
        return;
      }
      try {
        await (insertForTests ? insertForTests(doc) : defaultInsert(db, doc));
      } catch (err) {
        log.warn({ event: 'frontdesk.run.record_failed', conversationId, reason: 'db', errName: err && err.name });
        return;
      }
      const { outcome, reason, ms, fallbackUsed } = doc;
      log.info({
        event: 'frontdesk.run.recorded', runId: id, conversationId, outcome, ...(reason && { reason }), ms, fallbackUsed,
      });
    } catch {
      // Recording never breaks a turn, a throwing log included.
    }
  }

  return { id, time, timeSync, step, set, end, discard, finish };
}

/** The recorder that records nothing: `time` / `timeSync` still call their function. */
const NO_RUN = Object.freeze({
  time: async (_key, fn) => fn(),
  timeSync: (_key, fn) => fn(),
  step: () => {},
  set: () => {},
  end: () => {},
  discard: () => {},
  finish: async () => {},
});

/**
 * One run of `conversation`'s turn. Reads and writes nothing; the eval's turns (`feature: 'eval'`) are not recorded.
 * `inbound` is `{ at, waitedMs }` when a guest message started the turn.
 */
function startRun(db, conversation, { now = Date.now(), mode = 'turn', feature, inbound } = {}) {
  if (feature === 'eval') return NO_RUN;
  return createRun(db, conversation, { now, mode, inbound });
}

const GROUPS = {
  answered: { outcome: { $in: ['answered', 'asked'] } },
  handover: { outcome: { $in: ['handover', 'failed', 'removed'] } },
  fallback: { fallbackUsed: true },
};

const LIST_FIELDS = [
  '_id', 'conversationId', 'test', 'mode', 'startedAt', 'ms', 'outcome', 'reason', 'fallbackUsed', 'model', 'trigger.text',
];
const LIST_PROJECTION = Object.fromEntries(LIST_FIELDS.map(field => [field, 1]));

/** The business's runs, newest first: `{ runs, more }`. Each row is flat; `text` is the guest's words. */
async function listRuns(db, businessId, { filter = 'all', test = false, limit = 50, before } = {}) {
  const query = {
    businessId,
    test: test ? true : { $ne: true },
    ...(Object.prototype.hasOwnProperty.call(GROUPS, filter) && GROUPS[filter]),
    ...(typeof before === 'number' && { startedAt: { $lt: before } }),
  };
  const found = await db.collection(COLLECTION)
    .find(query, { projection: LIST_PROJECTION }).sort({ startedAt: -1, _id: -1 }).limit(limit + 1).toArray();
  const runs = found.slice(0, limit).map(({ trigger, ...row }) => ({ ...row, text: trigger?.text ?? '' }));
  return { runs, more: found.length > limit };
}

/** One whole run of this business, or `null`. */
function loadRun(db, businessId, id) {
  return db.collection(COLLECTION).findOne({ _id: id, businessId });
}

/** Writes on the run that the platform admin looked at it (the newest 20 are kept). Returns the row it wrote. */
async function markAdminView(db, run, userId, now) {
  const view = { at: now, userId: String(userId) };
  await db.collection(COLLECTION).updateOne(
    { _id: run._id, businessId: run.businessId },
    { $push: { adminViews: { $each: [view], $slice: -ADMIN_VIEWS_MAX } } }
  );
  return view;
}

module.exports = {
  RUN_TTL_DAYS, RAW_MAX, LEAD_MAX, TRIGGER_TEXT_MAX, startRun, NO_RUN, listRuns, loadRun, markAdminView, _setInsertForTests,
};
