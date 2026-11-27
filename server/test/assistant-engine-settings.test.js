'use strict';
/**
 * Plan 760: the engine numbers the platform admin changes — the defaults (quiet wait 3 s), the admin-only save with a
 * range per number, the history of every save, and that the assistant works with the saved numbers from the next guest
 * message.
 */
const request = require('supertest');
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');
const { captureLogs } = require('./helpers/log-capture');
const { seedBusiness, seedConversation, controllableWait, NOW } = require('./helpers/conversation-fixtures');
const { clearModuleCache } = require('../middleware/require-module');
const {
  ENGINE_RULES, ENGINE_DEFAULTS, engineSettings, resetEngineSettingsForTests,
} = require('../services/assistant-engine-settings');
const { handleInbound, setTurnHandler, setWaitForTest, resetInboundForTest, nextStep } = require('../services/inbound');
const { preCheck } = require('../services/frontdesk-guardrails');
const { buildTurnBody, unansweredTail } = require('../services/frontdesk-prompt');
const { runTurn } = require('../services/frontdesk-turn');
const { ENGINE_FIELDS } = require('../generated/schemas/front-desk/engine-settings.schema');

let app;
let logs;
beforeAll(async () => { app = await buildTestApp(); logs = captureLogs(); }, 60000);
afterAll(async () => { await teardownTestApp(); });

const BASE = '/api/v1/assistant-runs';
const OWNER = { userId: 'own1', name: 'o', businessId: 'b1', businessRole: 'owner' };
const STAFF = { userId: 'st1', name: 's', businessId: 'b1', businessRole: 'staff' };
const CONSULTANT = {
  userId: 'consult', name: 'c', businessId: 'b1', businessRole: 'consultant', homeBusinessId: 'bc', acting: 'consultant',
};
const ADMIN = { userId: 'boss', name: 'boss', businessId: 'b1', businessRole: 'owner', isPlatformAdmin: true };
const OTHER_ADMIN = { ...ADMIN, userId: 'boss2', name: 'boss2' };
/** Today's constants, written out: only the quiet wait differs from before this plan (2000). */
const EXPECTED = {
  quietMs: 3000, maxWaitMs: 6000, dailyTurns: 300, turnLimit: 8, followUpMax: 3, historyWindow: 12, glueMax: 5,
  factsMaxChars: 6000, firstModelMs: 6000, turnBudgetMs: 35000,
};

const db = c => testDb().collection(c);
const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` });
const setup = (who = ADMIN) => request(app).get(BASE + '/setup').set(as(who));
const save = (body, who = ADMIN) => request(app).put(BASE + '/engine-settings').set(as(who)).send(body);
const stored = () => db('platformSettings').findOne({ _id: 'assistant-engine' });

beforeEach(async () => {
  for (const c of ['platformSettings', 'businesses', 'frontDeskProfiles', 'users', 'businessAccess', 'messages',
    'conversations', 'clients', 'assistantRuns', 'aiUsage']) {
    await db(c).deleteMany({});
  }
  await seedBusiness(testDb(), { businessId: 'b1' });
  await db('users').insertMany(['boss', 'boss2'].map(_id => ({
    _id, name: _id, email: _id + '@x.com', businessId: 'b_' + _id, businessRole: 'owner', isPlatformAdmin: true,
    removedAt: null,
  })));
  await db('businessAccess').insertOne({
    _id: 'grant1', userId: 'consult', businessId: 'b1', role: 'consultant', grantedBy: 'boss', grantedByName: 'boss', grantedAt: 1,
  });
  clearModuleCache();
  resetEngineSettingsForTests();
  resetInboundForTest();
  setWaitForTest(async () => {});
  logs.records.length = 0;
});

describe('the defaults', () => {
  it('with nothing saved every number is today\'s constant, and the quiet wait is 3000', async () => {
    expect(ENGINE_DEFAULTS).toEqual(EXPECTED);
    expect(await engineSettings(testDb())).toEqual(EXPECTED);
    expect([...ENGINE_FIELDS].sort()).toEqual(Object.keys(EXPECTED).sort());
    for (const [field, rule] of Object.entries(ENGINE_RULES)) {
      expect(rule.min, field).toBeLessThanOrEqual(rule.value);
      expect(rule.max, field).toBeGreaterThanOrEqual(rule.value);
      expect(typeof rule.unit, field).toBe('string');
    }
    const res = await setup(OWNER);
    expect(res.body.engine).toEqual(EXPECTED);
  });

  it('warns once for a missing document', async () => {
    await engineSettings(testDb());
    resetEngineSettingsForTests();
    logs.records.length = 0;
    await engineSettings(testDb());
    resetEngineSettingsForTests({ keepWarned: true });
    await engineSettings(testDb());
    const warned = logs.byEvent('assistant_engine.defaults');
    expect(warned).toHaveLength(1);
    expect(warned[0]).toMatchObject({ why: 'missing' });
  });

  it('uses the default for a stored value it cannot read, and for a read that fails', async () => {
    await db('platformSettings').insertOne({ _id: 'assistant-engine', values: { quietMs: 'soon', turnLimit: 100000, glueMax: 2 } });
    expect(await engineSettings(testDb())).toEqual({ ...EXPECTED, glueMax: 2 });
    resetEngineSettingsForTests();
    const broken = { collection: () => ({ findOne: async () => { throw new Error('down'); } }) };
    expect(await engineSettings(broken)).toEqual(EXPECTED);
    expect(logs.byEvent('assistant_engine.defaults').at(-1)).toMatchObject({ why: 'unreadable' });
  });

  it('keeps the longest wait at least one second above the quiet wait', async () => {
    await db('platformSettings').insertOne({ _id: 'assistant-engine', values: { quietMs: 8000 } });
    expect(await engineSettings(testDb())).toMatchObject({ quietMs: 8000, maxWaitMs: 9000 });
  });
});

describe('GET /setup', () => {
  it('tells the platform admin that the numbers are editable and their ranges, nobody else', async () => {
    const res = await setup();
    expect(res.status).toBe(200);
    expect(res.body.editable).toBe(true);
    expect(Object.keys(res.body.ranges)).toHaveLength(10);
    expect(res.body.ranges.quietMs).toEqual({ min: 1000, max: 15000, unit: 'ms' });
    expect(res.body.ranges.maxWaitMs).toEqual({ min: 4000, max: 30000, unit: 'ms' });
    for (const who of [OWNER, CONSULTANT]) {
      const other = await setup(who);
      expect(other.status).toBe(200);
      expect(other.body).not.toHaveProperty('editable');
      expect(other.body).not.toHaveProperty('ranges');
    }
  });
});

describe('PUT /engine-settings', () => {
  it('saves a number, answers with the new setup values and applies at once', async () => {
    await engineSettings(testDb()); // the cache holds the defaults: the save must drop it
    const res = await save({ field: 'quietMs', value: 4000 });
    expect(res.status).toBe(200);
    expect(res.body.engine).toEqual({ ...EXPECTED, quietMs: 4000 });
    expect(res.body.ranges.maxWaitMs.min).toBe(5000);
    expect((await stored()).values).toEqual({ quietMs: 4000 });
    expect((await setup()).body.engine.quietMs).toBe(4000);
    expect((await engineSettings(testDb())).quietMs).toBe(4000);
  });

  it('the next quiet wait uses the saved number', async () => {
    await engineSettings(testDb());
    await save({ field: 'quietMs', value: 4000 });
    const w = controllableWait();
    setWaitForTest(w.wait);
    const turn = vi.fn(async () => {});
    setTurnHandler(turn);
    const r = await handleInbound(testDb(), {
      businessId: 'b1', channel: 'sim', waId: '972521234567', text: 'hi', providerMessageId: 'q1', at: NOW,
    });
    await vi.waitFor(() => expect(w.calls).toHaveLength(1));
    expect(w.calls).toEqual([4000]);
    w.release();
    await r.settled;
    expect(turn.mock.calls[0][2].inbound).toMatchObject({ quietMs: 4000, capped: false });
  });

  it('holds only the values that differ from the defaults', async () => {
    await save({ field: 'turnLimit', value: 12 });
    await save({ field: 'glueMax', value: 2 });
    expect((await stored()).values).toEqual({ turnLimit: 12, glueMax: 2 });
    await save({ field: 'turnLimit', value: 8 });
    expect((await stored()).values).toEqual({ glueMax: 2 });
    await resetAndExpect({ ...EXPECTED, glueMax: 2 });
  });

  async function resetAndExpect(values) {
    resetEngineSettingsForTests();
    expect(await engineSettings(testDb())).toEqual(values);
  }

  it('takes both ends of every range and refuses one step outside it with 400', async () => {
    for (const field of ENGINE_FIELDS) {
      // The longest wait's floor follows the quiet wait, so it is read from the server.
      const { min, max } = (await setup()).body.ranges[field];
      for (const value of [min - 1, max + 1]) {
        const res = await save({ field, value });
        expect(res.status, `${field} ${value}`).toBe(400);
        expect(res.body).toEqual({ error: 'OUT_OF_RANGE', field, min, max });
      }
      for (const value of [min, max]) expect((await save({ field, value })).status, `${field} ${value}`).toBe(200);
      await save({ field, value: ENGINE_DEFAULTS[field] });
    }
  });

  it('refuses a longest wait that is less than a second above the quiet wait', async () => {
    await save({ field: 'quietMs', value: 5000 });
    expect((await save({ field: 'maxWaitMs', value: 5999 })).status).toBe(400);
    expect((await save({ field: 'maxWaitMs', value: 6000 })).status).toBe(200);
  });

  it('refuses a body that is not one known field with a whole number', async () => {
    const bad = [
      {}, { field: 'quietMs' }, { value: 4000 }, { field: 'nope', value: 4000 }, { field: 'quietMs', value: '4000' },
      { field: 'quietMs', value: 4000.5 }, { field: 'quietMs', value: null },
      { field: 'quietMs', value: 4000, extra: 1 },
    ];
    for (const body of bad) {
      const res = await save(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
      expect(res.body).toEqual({ error: 'BAD_INPUT' });
    }
    expect(await stored()).toBeNull();
  });

  it('401 without a token; 403 for an owner, staff and a consultant, and nothing is written', async () => {
    const anonymous = await request(app).put(BASE + '/engine-settings').send({ field: 'quietMs', value: 4000 });
    expect(anonymous.status).toBe(401);
    for (const who of [OWNER, STAFF, CONSULTANT]) {
      const res = await save({ field: 'quietMs', value: 4000 }, who);
      expect(res.status, who.userId).toBe(403);
    }
    expect(await stored()).toBeNull();
  });

  it('writes one history entry per save: who, when, field, old and new', async () => {
    const before = Date.now();
    await save({ field: 'quietMs', value: 4000 });
    await save({ field: 'quietMs', value: 5000 }, OTHER_ADMIN);
    await save({ field: 'dailyTurns', value: 50 });
    await save({ field: 'quietMs', value: 999999 });
    const { history } = await stored();
    expect(history.map(({ by, field, old, new: next }) => ({ by, field, old, next }))).toEqual([
      { by: 'boss', field: 'quietMs', old: 3000, next: 4000 },
      { by: 'boss2', field: 'quietMs', old: 4000, next: 5000 },
      { by: 'boss', field: 'dailyTurns', old: 300, next: 50 },
    ]);
    for (const entry of history) expect(entry.at).toBeGreaterThanOrEqual(before);
  });

  it('keeps both of two saves made at once', async () => {
    const answers = await Promise.all([
      save({ field: 'turnLimit', value: 10 }),
      save({ field: 'glueMax', value: 3 }, OTHER_ADMIN),
    ]);
    expect(answers.map(r => r.status)).toEqual([200, 200]);
    const doc = await stored();
    expect(doc.values).toEqual({ turnLimit: 10, glueMax: 3 });
    expect(doc.history).toHaveLength(2);
  });

  it('logs the save with numbers and ids only, no value of a business profile', async () => {
    await db('frontDeskProfiles').updateOne({ businessId: 'b1' }, {
      $set: { phone: '03-1234567', address: 'Secret Street', assistant: { level: 1, handoffText: 'secret handoff' } },
    });
    await save({ field: 'quietMs', value: 4000 });
    const lines = logs.byEvent('assistant_engine.saved');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ field: 'quietMs', from: 3000, to: 4000, userId: 'boss' });
    const text = JSON.stringify(logs.records);
    for (const value of ['03-1234567', 'Secret Street', 'secret handoff']) expect(text).not.toContain(value);
  });
});

describe('the assistant works with the saved numbers', () => {
  const guest = (_id, at) => ({ _id, direction: 'in', author: 'guest', kind: 'text', text: 'hi ' + _id, at });

  it('the wait, the pre-check and the prompt take the numbers they are given', () => {
    const free = { status: 'bot', lastInboundAt: 50000 };
    const limits = { quietMs: 4000, maxWaitMs: 5000 };
    const ask = over => nextStep({ conversation: free, at: 50000, now: 51000, waited: false, limits, ...over });
    expect(ask({})).toEqual({ do: 'wait', ms: 4000, capped: false });
    expect(ask({ burstAt: 47000 })).toEqual({ do: 'wait', ms: 2000, capped: true });
    expect(ask({ holder: true })).toEqual({ do: 'wait', ms: 3000, capped: false });

    const history = [guest('g1', 1), guest('g2', 2), guest('g3', 3)];
    const ctx = { profile: {}, history, mode: 'turn', now: 10 };
    expect(preCheck({ ...ctx, aiTurns: 2, turnLimit: 2 })).toEqual({ ok: false, reason: 'turn_limit' });
    expect(preCheck({ ...ctx, aiTurns: 9, turnLimit: 10 })).toEqual({ ok: true });
    expect(preCheck({ ...ctx, chain: 1, followUpMax: 0 })).toEqual({ ok: false, reason: 'follow_up_limit' });

    expect(unansweredTail(history, 2).map(m => m._id)).toEqual(['g2', 'g3']);
    const body = buildTurnBody({ profile: {}, facts: { text: '' }, history, now: NOW, historyWindow: 2, glueMax: 2 });
    expect(body.contents).toHaveLength(3);
    expect(body.contents[0].parts[0].text).toContain('no answer yet: 2');
  });

  it('a turn reads the daily quota, the window and the turn limit that were saved', async () => {
    for (const [field, value] of [['dailyTurns', 40], ['historyWindow', 2], ['turnLimit', 1]]) {
      expect((await save({ field, value })).status).toBe(200);
    }
    const { conversation } = await seedConversation(testDb(), { at: NOW });
    await db('messages').insertMany([
      { ...guest('a1', NOW - 3000), direction: 'out', author: 'ai' },
      guest('g1', NOW - 2000),
      guest('g2', NOW - 1000),
    ].map(m => ({ ...m, businessId: 'b1', conversationId: conversation._id, providerMessageId: m._id })));
    await runTurn(testDb(), conversation, { now: NOW });
    const run = await db('assistantRuns').findOne({ businessId: 'b1' });
    const step = key => run.steps.find(s => s.key === key);
    expect(step('limit').in).toEqual({ limit: 40 });
    expect(step('history').in).toEqual({ window: 2 });
    expect(step('history').out.messages).toBe(2);
    expect(step('precheck')).toMatchObject({ in: { turnLimit: 1 }, out: { ok: false, reason: 'turn_limit' } });
  });
});
