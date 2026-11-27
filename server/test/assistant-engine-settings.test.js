'use strict';
/**
 * Plan 760: the engine's numbers as platform settings — the defaults, the platform admin's save, the ranges, who is
 * refused, the history, and that a saved number is used from the next guest message.
 */
const request = require('supertest');
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');
const { captureLogs } = require('./helpers/log-capture');
const { seedBusiness, controllableWait, NOW } = require('./helpers/conversation-fixtures');
const { clearModuleCache } = require('../middleware/require-module');

let app;
let logs;
let settings;
let inbound;
beforeAll(async () => {
  app = await buildTestApp();
  logs = captureLogs();
  settings = require('../services/assistant-engine-settings');
  inbound = require('../services/inbound');
}, 60000);
afterAll(async () => { await teardownTestApp(); });

const SAVE = '/api/v1/assistant-runs/engine-settings';
const SETUP = '/api/v1/assistant-runs/setup';
const OWNER = { userId: 'own1', name: 'o', businessId: 'b1', businessRole: 'owner' };
const STAFF = { userId: 'st1', name: 's', businessId: 'b1', businessRole: 'staff' };
const CONSULTANT = {
  userId: 'consult', name: 'c', businessId: 'b1', businessRole: 'consultant', homeBusinessId: 'bc', acting: 'consultant',
};
const ADMIN = { userId: 'boss', name: 'Boss', businessId: 'b1', businessRole: 'owner', isPlatformAdmin: true };
const ADMIN_TWO = { userId: 'boss2', name: '$values', businessId: 'b1', businessRole: 'owner', isPlatformAdmin: true };

/** Today's constants, with the one change of plan 760: the quiet wait is 3 seconds. */
const DEFAULTS = {
  quietMs: 3000, maxWaitMs: 6000, dailyTurns: 300, turnLimit: 8, followUpMax: 3, historyWindow: 12, glueMax: 5,
  factsMaxChars: 6000, firstModelMs: 6000, turnBudgetMs: 35000,
};

const db = c => testDb().collection(c);
const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` });
const save = (field, value, who = ADMIN) => request(app).put(SAVE).set(as(who)).send({ field, value });
const setup = (who = ADMIN) => request(app).get(SETUP).set(as(who));
const stored = () => db('platformSettings').findOne({ _id: 'assistant-engine' });

beforeEach(async () => {
  for (const c of ['platformSettings', 'businesses', 'frontDeskProfiles', 'users', 'businessAccess', 'conversations', 'messages', 'clients']) {
    await db(c).deleteMany({});
  }
  await seedBusiness(testDb(), { businessId: 'b1' });
  await db('frontDeskProfiles').updateOne({ businessId: 'b1' }, { $set: { phone: '03-9998887', address: 'Secret Street 5' } });
  await db('businessAccess').insertOne({
    _id: 'grant1', userId: 'consult', businessId: 'b1', role: 'consultant', grantedBy: 'boss', grantedByName: 'boss', grantedAt: 1,
  });
  clearModuleCache();
  settings.resetEngineSettingsForTest();
  inbound.resetInboundForTest();
  logs.records.length = 0;
});

describe('defaults', () => {
  it("with nothing saved every number is today's constant, and the quiet wait is 3000", async () => {
    expect(await settings.loadEngine(testDb())).toEqual(DEFAULTS);
    const res = await setup();
    expect(res.body.engine).toEqual(DEFAULTS);
  });

  it('every number has a min and a max in one table, around its default', () => {
    expect(Object.keys(settings.ENGINE_SETTINGS).sort()).toEqual(Object.keys(DEFAULTS).sort());
    for (const [field, row] of Object.entries(settings.ENGINE_SETTINGS)) {
      expect(row.def, field).toBe(DEFAULTS[field]);
      expect(row.min, field).toBeLessThanOrEqual(row.def);
      expect(row.max, field).toBeGreaterThanOrEqual(row.def);
      expect(row.unit, field).toEqual(expect.any(String));
    }
  });

  it('a missing document gives the defaults and one warning', async () => {
    await settings.loadEngine(testDb());
    settings.forgetEngineCacheForTest();
    await settings.loadEngine(testDb());
    const warned = logs.byEvent('assistant_engine.settings.defaults');
    expect(warned).toHaveLength(1);
    expect(warned[0]).toMatchObject({ reason: 'missing' });
  });

  it('an unreadable document gives the defaults and one warning', async () => {
    const broken = { collection: () => ({ findOne: async () => { throw new Error('down'); } }) };
    expect(await settings.loadEngine(broken)).toEqual(DEFAULTS);
    settings.forgetEngineCacheForTest();
    expect(await settings.loadEngine(broken)).toEqual(DEFAULTS);
    const warned = logs.byEvent('assistant_engine.settings.defaults');
    expect(warned).toHaveLength(1);
    expect(warned[0]).toMatchObject({ reason: 'unreadable' });
  });

  it('a stored value outside its range is read as the default', async () => {
    await db('platformSettings').insertOne({ _id: 'assistant-engine', values: { turnLimit: 100000, glueMax: 'many', dailyTurns: 9 } });
    expect(await settings.loadEngine(testDb())).toEqual({ ...DEFAULTS, dailyTurns: 9 });
  });
});

describe('the admin saves', () => {
  it('saves quietMs 4000, and the next quiet wait uses 4000', async () => {
    await settings.loadEngine(testDb()); // a cached default that the save must replace
    const res = await save('quietMs', 4000);
    expect(res.status).toBe(200);
    expect(res.body.engine).toEqual({ ...DEFAULTS, quietMs: 4000 });
    expect((await stored()).values).toEqual({ quietMs: 4000 });

    const w = controllableWait();
    inbound.setWaitForTest(w.wait);
    const turn = vi.fn(async () => {});
    inbound.setTurnHandler(turn);
    const sent = await inbound.handleInbound(testDb(), {
      businessId: 'b1', channel: 'sim', waId: '972521234567', text: 'hi', providerMessageId: 'p1', at: NOW,
      actor: { userId: 'boss', name: 'Boss' },
    });
    await vi.waitFor(() => expect(w.calls).toHaveLength(1));
    expect(w.calls).toEqual([4000]);
    w.release();
    await sent.settled;
    expect(turn.mock.calls[0][2].inbound).toMatchObject({ quietMs: 4000, capped: false });
  });

  it('the longest wait is at least the quiet wait and one second', async () => {
    const res = await save('quietMs', 8000);
    expect(res.body.engine).toMatchObject({ quietMs: 8000, maxWaitMs: 9000 });
    expect(res.body.limits.maxWaitMs).toMatchObject({ min: 9000, max: 30000 });
    expect((await save('maxWaitMs', 8500)).status).toBe(400);
    expect((await save('maxWaitMs', 9000)).status).toBe(200);
  });

  it('a saved number reaches the rules of the turn', async () => {
    const { preCheck } = require('../services/frontdesk-guardrails');
    const { unansweredTail } = require('../services/frontdesk-prompt');
    await save('turnLimit', 2);
    await save('glueMax', 1);
    expect(preCheck({ history: [], aiTurns: 2, mode: 'turn' })).toEqual({ ok: false, reason: 'turn_limit' });
    const guest = id => ({ _id: id, author: 'guest', text: id });
    expect(unansweredTail([guest('a'), guest('b')]).map(m => m._id)).toEqual(['b']);
  });

  it('keeps only the values that differ from the defaults', async () => {
    await save('turnLimit', 12);
    await save('turnLimit', 8);
    expect((await stored()).values).toEqual({});
    expect((await setup()).body.engine).toEqual(DEFAULTS);
  });

  it('writes one history entry per save: who, when, field, old and new; both of two admins stay', async () => {
    const before = Date.now();
    await save('quietMs', 4000);
    await save('quietMs', 5000, ADMIN_TWO);
    const { history, values } = await stored();
    expect(values.quietMs).toBe(5000);
    expect(history).toEqual([
      { at: expect.any(Number), by: 'boss', byName: 'Boss', field: 'quietMs', old: 3000, new: 4000 },
      { at: expect.any(Number), by: 'boss2', byName: '$values', field: 'quietMs', old: 4000, new: 5000 },
    ]);
    expect(history[0].at).toBeGreaterThanOrEqual(before);
  });

  it('logs the save with no value of a business profile', async () => {
    await save('quietMs', 4000);
    const lines = logs.byEvent('assistant_engine.saved');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ field: 'quietMs', old: 3000, new: 4000 });
    const text = JSON.stringify(logs.records);
    for (const value of ['03-9998887', 'Secret Street']) expect(text).not.toContain(value);
  });
});

describe('refusals', () => {
  it('refuses a value below the min or above the max of every number with 400', async () => {
    for (const [field, row] of Object.entries(settings.ENGINE_SETTINGS)) {
      for (const value of [row.min - 1, row.max + 1]) {
        const res = await save(field, value);
        expect(res.status, `${field}=${value}`).toBe(400);
        expect(res.body.error, `${field}=${value}`).toBe('OUT_OF_RANGE');
      }
    }
    expect(await stored()).toBeNull();
  });

  it('refuses a body that is not one known field with a whole number', async () => {
    for (const body of [
      {}, { field: 'quietMs' }, { field: 'quietMs', value: '4000' }, { field: 'quietMs', value: 4000.5 },
      { field: 'nope', value: 4000 }, { field: 'quietMs', value: 4000, more: 1 },
    ]) {
      const res = await request(app).put(SAVE).set(as(ADMIN)).send(body);
      expect(res.status, JSON.stringify(body)).toBe(400);
    }
    expect(await stored()).toBeNull();
  });

  it('401 without a token; 403 for an owner, staff and a consultant', async () => {
    expect((await request(app).put(SAVE).send({ field: 'quietMs', value: 4000 })).status).toBe(401);
    for (const who of [OWNER, STAFF, CONSULTANT]) {
      expect((await save('quietMs', 4000, who)).status, who.userId).toBe(403);
    }
    expect(await stored()).toBeNull();
  });

  it('tells only the platform admin that the numbers may be edited', async () => {
    const admin = await setup();
    expect(admin.body.editable).toBe(true);
    expect(admin.body.limits.quietMs).toEqual({ min: 1000, max: 10000, unit: 'ms' });
    for (const who of [OWNER, CONSULTANT]) {
      const res = await setup(who);
      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty('editable');
      expect(res.body).not.toHaveProperty('limits');
    }
  });
});
