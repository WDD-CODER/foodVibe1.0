'use strict';
/**
 * Plan 752 (C-RUNS): the recorder of the assistant's runs — 13 steps in order, clipping, nothing written when
 * discarded, a refused or failed write that never throws, the list's filters and paging, the business scope, the
 * indexes, the business delete and the dictionary words of every name.
 */
const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app');
const { captureLogs } = require('./helpers/log-capture');
const {
  startRun, NO_RUN, listRuns, loadRun, markAdminView, _setInsertForTests, RUN_TTL_DAYS, RAW_MAX, LEAD_MAX,
  TRIGGER_TEXT_MAX,
} = require('../services/frontdesk-runs');
const { deleteBusinessServerData } = require('../services/business');
const { RUN_STEP_KEYS, RUN_OUTCOMES, RUN_REASONS, assistantRunSchema } = require('../generated/schemas/entities');
const dictionary = require('../../public/assets/data/dictionary.json');

let logs;
beforeAll(async () => { await buildTestApp(); logs = captureLogs(); }, 60000);
afterAll(async () => { await teardownTestApp(); });

const db = () => testDb();
const runs = () => db().collection('assistantRuns').find({}).toArray();
const CONVERSATION = { _id: 'cv1', businessId: 'b1' };
const NOW = Date.parse('2030-01-07T10:00:00Z');

beforeEach(async () => {
  await db().collection('assistantRuns').deleteMany({});
  logs.records.length = 0;
});
afterEach(() => { _setInsertForTests(null); });

const record = async (outcome = 'answered', work = () => {}, conversation = CONVERSATION, options = { now: NOW }) => {
  const run = startRun(db(), conversation, options);
  work(run);
  run.end(outcome);
  await run.finish();
  return (await runs()).find(r => r._id === run.id);
};

describe('the stored run', () => {
  it('(a) holds the 13 steps in order, the untouched ones skipped, and lives 30 days', async () => {
    const run = startRun(db(), CONVERSATION, { now: NOW });
    expect(await run.time('setup', async () => 'loaded')).toBe('loaded');
    expect(run.timeSync('precheck', () => 7)).toBe(7);
    run.end('answered');
    await run.finish();
    const [doc] = await runs();
    expect(doc.steps.map(s => s.key)).toEqual([...RUN_STEP_KEYS]);
    expect(doc.steps).toHaveLength(13);
    for (const step of doc.steps) {
      if (step.key === 'setup' || step.key === 'precheck') expect(step.status).toBe('ok');
      else expect(step).toMatchObject({ status: 'skipped', ms: 0 });
    }
    expect(doc.steps[0].out).toEqual({ via: 'direct' });
    expect(doc).toMatchObject({
      _id: run.id, businessId: 'b1', conversationId: 'cv1', mode: 'turn', level: 0, outcome: 'answered', startedAt: NOW,
      fallbackUsed: false, trigger: { messageIds: [], text: '' },
    });
    expect(doc.test).toBeUndefined();
    expect(doc.expiresAt).toBeInstanceOf(Date);
    expect(doc.expiresAt.getTime() - doc.startedAt).toBe(RUN_TTL_DAYS * 86400000);
    expect(doc.endedAt).toBe(doc.startedAt + doc.ms);
    expect(assistantRunSchema.safeParse(doc).success).toBe(true);
    expect(logs.byEvent('frontdesk.run.recorded')).toHaveLength(1);
  });

  it('counts the wait into the run and marks a test conversation and a suggestion', async () => {
    const doc = await record('draft', () => {}, { ...CONVERSATION, test: true },
      { now: NOW, inbound: { at: 5, waitedMs: 6000 } });
    expect(doc).toMatchObject({ test: true, startedAt: NOW - 6000 });
    expect(doc.ms).toBeGreaterThanOrEqual(6000);
    expect(doc.steps[0]).toMatchObject({ status: 'ok', ms: 6000, in: { at: 5 }, out: { waitedMs: 6000, answers: 0 } });
    const suggestion = await record('draft', () => {}, CONVERSATION, { now: NOW, mode: 'suggest' });
    expect(suggestion.steps[0]).toMatchObject({ status: 'skipped', out: { via: 'suggest' } });
  });

  it('plan 753: writes the run a follow-up continues and keeps how it started', async () => {
    const doc = await record('answered', run => {
      run.set({ followsRunId: 'first-run' });
      run.step('inbound', { out: { via: 'follow_up' } });
    }, CONVERSATION, { now: NOW, inbound: { at: 5, waitedMs: 10 } });
    expect(doc.followsRunId).toBe('first-run');
    expect(doc.steps[0]).toMatchObject({ key: 'inbound', ms: 10, out: { waitedMs: 10, answers: 0, via: 'follow_up' } });
    expect(assistantRunSchema.safeParse(doc).success).toBe(true);
    expect((await record()).followsRunId).toBeUndefined();
  });

  it('plan 754: stores the quiet wait and times the first answer that leaves', async () => {
    const options = {
      now: NOW, inbound: { at: 1, waitedMs: 500, quietMs: 500, capped: true, arrivedAt: Date.now() - 1000 },
    };
    const sendOf = doc => doc.steps.find(s => s.key === 'send').out;
    let first;
    const doc = await record('answered', run => {
      run.step('send', { out: { action: 'sent' } });
      first = Date.now();
      run.step('send', { out: { action: 'sent' } });
    }, CONVERSATION, options);
    expect(doc.steps[0].out).toMatchObject({ quietMs: 500, capped: true });
    expect(sendOf(doc).answerMs).toBeGreaterThanOrEqual(1000);
    expect(sendOf(doc).answerMs).toBeLessThanOrEqual(first - options.inbound.arrivedAt);
    expect(assistantRunSchema.safeParse(doc).success).toBe(true);

    for (const out of [{ action: 'draft' }, { action: 'none' }, { action: 'sent', refused: 'WINDOW_CLOSED' }]) {
      const silent = await record('draft', run => run.step('send', { out }), CONVERSATION, options);
      expect(sendOf(silent).answerMs, out.action).toBeUndefined();
    }
    for (const action of ['holding', 'removal_notice']) {
      const left = await record('failed', run => run.step('send', { out: { action } }), CONVERSATION, options);
      expect(sendOf(left).answerMs, action).toBeGreaterThanOrEqual(1000);
    }
    const untimed = await record('answered', run => run.step('send', { out: { action: 'sent' } }), CONVERSATION,
      { now: NOW, inbound: { at: 1, waitedMs: 500 } });
    expect(sendOf(untimed)).toEqual({ action: 'sent' });
    expect(untimed.steps[0].out).toEqual({ waitedMs: 500, answers: 0 });
  });

  it('marks a backup model', async () => {
    const doc = await record('answered', run => run.set({ model: 'second', firstModel: 'first' }));
    expect(doc).toMatchObject({ model: 'second', fallbackUsed: true });
  });

  it('a run that never ended is a failed one', async () => {
    const run = startRun(db(), CONVERSATION, { now: NOW });
    await run.finish();
    expect((await runs())[0]).toMatchObject({ outcome: 'failed', reason: 'error' });
  });

  it('(b) merges a step and clips long strings, the raw answer, long arrays, deep nesting and the trigger', async () => {
    const doc = await record('answered', run => {
      run.step('ai', { in: { feature: 'x'.repeat(400) } });
      run.step('ai', { status: 'note', out: { raw: 'r'.repeat(5000) } });
      run.step('ai', { out: { messageIds: Array.from({ length: 300 }, (_, i) => 'm' + i) } });
      run.step('facts', { out: { a: { b: { c: { d: 1 } }, kept: 2 } } });
      run.set({ trigger: { messageIds: Array.from({ length: 20 }, (_, i) => 'g' + i), text: 't'.repeat(500) } });
    });
    const ai = doc.steps.find(s => s.key === 'ai');
    expect(ai.status).toBe('note');
    expect(ai.in.feature).toHaveLength(300);
    expect(ai.out.raw).toHaveLength(RAW_MAX);
    expect(ai.out.messageIds).toHaveLength(200);
    expect(doc.steps.find(s => s.key === 'facts').out.a).toEqual({ b: {}, kept: 2 });
    expect(doc.trigger.messageIds).toHaveLength(12);
    expect(doc.trigger.text).toHaveLength(TRIGGER_TEXT_MAX);
  });

  it('(c) time rethrows the error of its function and marks the step stopped', async () => {
    const boom = Object.assign(new TypeError('boom'), {});
    const run = startRun(db(), CONVERSATION, { now: NOW });
    await expect(run.time('history', async () => { throw boom; })).rejects.toBe(boom);
    expect(() => run.timeSync('prompt', () => { throw boom; })).toThrow(boom);
    run.end('failed', 'error');
    await run.finish();
    const [doc] = await runs();
    for (const key of ['history', 'prompt']) {
      expect(doc.steps.find(s => s.key === key)).toMatchObject({ status: 'stopped', out: { error: 'TypeError' } });
    }
  });

  it('(d) a discarded run, the eval and NO_RUN write nothing and never throw', async () => {
    const run = startRun(db(), CONVERSATION, { now: NOW });
    run.discard();
    await run.finish();
    expect(startRun(db(), CONVERSATION, { feature: 'eval' })).toBe(NO_RUN);
    expect(await NO_RUN.time('ai', async () => 1)).toBe(1);
    expect(NO_RUN.timeSync('ai', () => 2)).toBe(2);
    NO_RUN.step('ai', { status: 'ok' });
    NO_RUN.set({ level: 1 });
    NO_RUN.end('answered');
    NO_RUN.discard();
    await NO_RUN.finish();
    const other = startRun(db(), CONVERSATION);
    expect(() => {
      other.step('nope', { status: 'ok' });
      other.step('ai', null);
      other.step(undefined);
      other.set(null);
      other.end();
    }).not.toThrow();
    expect(await runs()).toHaveLength(0);
  });

  it('(e) a document that fails the schema is not stored, finish resolves and one line says why', async () => {
    await expect(record('exploded')).resolves.toBeUndefined();
    expect(await runs()).toHaveLength(0);
    const failed = logs.byEvent('frontdesk.run.record_failed');
    expect(failed).toHaveLength(1);
    expect(failed[0]).toMatchObject({ reason: 'schema', conversationId: 'cv1' });
    expect(failed[0].paths).toContain('outcome');
  });

  it('a refused write and a throwing log never reach the caller', async () => {
    _setInsertForTests(async () => { throw new Error('down'); });
    await expect(record()).resolves.toBeUndefined();
    expect(logs.byEvent('frontdesk.run.record_failed')[0]).toMatchObject({ reason: 'db', errName: 'Error' });
    const throwing = { info: () => { throw new Error('log'); }, warn: () => { throw new Error('log'); } };
    await expect(startRun(db(), CONVERSATION).finish({ log: throwing })).resolves.toBeUndefined();
    _setInsertForTests(null);
    await expect(startRun(db(), CONVERSATION).finish({ log: throwing })).resolves.toBeUndefined();
    expect(await runs()).toHaveLength(1);
  });

  it('(f) keeps the data block only for a handover or a failure, cut at its limit', async () => {
    const withLead = run => run.set({ lead: 'L'.repeat(9000), tone: 'warm', tablesOn: true });
    for (const outcome of ['handover', 'failed']) {
      const doc = await record(outcome, withLead);
      expect(doc.prompt).toMatchObject({ truncated: true, tone: 'warm', tablesOn: true });
      expect(doc.prompt.lead).toHaveLength(LEAD_MAX);
    }
    expect((await record('answered', withLead)).prompt).toBeUndefined();
    const short = await record('failed', run => run.set({ lead: 'short', tone: 'formal', tablesOn: false }));
    expect(short.prompt).toEqual({ lead: 'short', tone: 'formal', tablesOn: false });
  });
});

describe('reading runs', () => {
  const seeded = (id, startedAt, outcome, extra = {}) => ({
    _id: id, businessId: 'b1', conversationId: 'cv1', mode: 'turn', startedAt, ms: 5, outcome, fallbackUsed: false,
    trigger: { messageIds: ['g'], text: 'text ' + id }, steps: [], ...extra,
  });
  beforeEach(async () => {
    await db().collection('assistantRuns').insertMany([
      seeded('answered', 1, 'answered'), seeded('asked', 2, 'asked'), seeded('draft', 3, 'draft'),
      seeded('handover', 4, 'handover', { reason: 'keyword' }), seeded('failed', 5, 'failed'),
      seeded('removed', 6, 'removed'), seeded('backup', 7, 'draft', { fallbackUsed: true, model: 'second' }),
      seeded('test', 8, 'answered', { test: true }), seeded('foreign', 9, 'answered', { businessId: 'b2' }),
    ]);
  });
  const ids = async options => (await listRuns(db(), 'b1', options)).runs.map(r => r._id);

  it('(g) newest first, each filter, test runs apart, before and limit with more', async () => {
    expect(await ids()).toEqual(['backup', 'removed', 'failed', 'handover', 'draft', 'asked', 'answered']);
    expect(await ids({ filter: 'answered' })).toEqual(['asked', 'answered']);
    expect(await ids({ filter: 'handover' })).toEqual(['removed', 'failed', 'handover']);
    expect(await ids({ filter: 'fallback' })).toEqual(['backup']);
    expect(await ids({ test: true })).toEqual(['test']);
    const page = await listRuns(db(), 'b1', { limit: 2 });
    expect(page.more).toBe(true);
    expect(page.runs.map(r => r._id)).toEqual(['backup', 'removed']);
    const rest = await listRuns(db(), 'b1', { limit: 10, before: 6 });
    expect(rest.more).toBe(false);
    expect(rest.runs.map(r => r._id)).toEqual(['failed', 'handover', 'draft', 'asked', 'answered']);
    expect(rest.runs[1]).toEqual({
      _id: 'handover', conversationId: 'cv1', mode: 'turn', startedAt: 4, ms: 5, outcome: 'handover', reason: 'keyword',
      fallbackUsed: false, text: 'text handover',
    });
  });

  it('plan 753: a dropped run is listed with the handovers, a superseded one under all only', async () => {
    await db().collection('assistantRuns').insertMany([
      seeded('dropped', 10, 'dropped', { reason: 'taken_over' }),
      seeded('superseded', 11, 'superseded', { reason: 'overtaken' }),
    ]);
    expect(await ids({ filter: 'handover' })).toEqual(['dropped', 'removed', 'failed', 'handover']);
    expect(await ids({ filter: 'answered' })).toEqual(['asked', 'answered']);
    expect((await ids()).slice(0, 2)).toEqual(['superseded', 'dropped']);
  });

  it('(h) a run is read only inside its own business', async () => {
    expect((await loadRun(db(), 'b1', 'answered'))._id).toBe('answered');
    expect(await loadRun(db(), 'b2', 'answered')).toBeNull();
    expect(await loadRun(db(), 'b1', 'foreign')).toBeNull();
  });

  it('an admin look is written on the run, the newest 20 kept', async () => {
    const run = { _id: 'answered', businessId: 'b1' };
    for (let i = 0; i < 22; i++) await markAdminView(db(), run, 'boss', i + 1);
    const { adminViews } = await loadRun(db(), 'b1', 'answered');
    expect(adminViews).toHaveLength(20);
    expect(adminViews.at(-1)).toEqual({ at: 22, userId: 'boss' });
    await markAdminView(db(), { _id: 'answered', businessId: 'b2' }, 'boss', 99);
    expect((await loadRun(db(), 'b1', 'answered')).adminViews.at(-1).at).toBe(22);
  });

  it('(i) the three indexes exist by name, the last one deletes by expiresAt', async () => {
    const indexes = await db().collection('assistantRuns').indexes();
    expect(indexes.map(i => i.name)).toEqual(expect.arrayContaining([
      'assistant_runs_business_started', 'assistant_runs_conversation', 'assistant_runs_ttl',
    ]));
    expect(indexes.find(i => i.name === 'assistant_runs_ttl')).toMatchObject({ key: { expiresAt: 1 }, expireAfterSeconds: 0 });
  });

  it('(j) a deleted business loses its runs and no other business does', async () => {
    const counts = await deleteBusinessServerData(db(), { _id: 'b1' });
    expect(counts.assistantRuns).toBe(8);
    expect((await runs()).map(r => r._id)).toEqual(['foreign']);
  });
});

describe('(k) the words', () => {
  const words = dictionary.general;
  it('every reason, step, outcome and verdict has its Hebrew key', () => {
    const keys = [
      ...RUN_REASONS.map(r => `asr_reason_${r}`), 'asr_reason_unknown',
      ...RUN_STEP_KEYS.map(k => `asr_step_${k}`),
      ...RUN_OUTCOMES.flatMap(o => [`asr_outcome_${o}`, `asr_verdict_${o}`]),
    ];
    for (const key of keys) expect(words[key], key).toBeTruthy();
  });
});
