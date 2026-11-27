'use strict';
/**
 * Plan 752 (C-RUNS): the read routes of the assistant's runs — who may read, the business scope, filters and paging,
 * the acting platform admin's hidden text and its trace, and the prompt that only the platform admin gets.
 */
const request = require('supertest');
const mongoose = require('mongoose');
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');
const { captureLogs } = require('./helpers/log-capture');
const { seedBusiness } = require('./helpers/conversation-fixtures');
const { clearModuleCache } = require('../middleware/require-module');
const { startRun } = require('../services/frontdesk-runs');
const { TURN_SYSTEM_PROMPT, TABLE_SYSTEM_PROMPT } = require('../services/frontdesk-prompt');

let app;
let logs;
beforeAll(async () => { app = await buildTestApp(); logs = captureLogs(); }, 60000);
afterAll(async () => { await teardownTestApp(); });

const BASE = '/api/v1/assistant-runs';
const OWNER = { userId: 'own1', name: 'o', businessId: 'b1', businessRole: 'owner' };
const STAFF = { userId: 'st1', name: 's', businessId: 'b1', businessRole: 'staff' };
const OTHER = { userId: 'own2', name: 'o2', businessId: 'b2', businessRole: 'owner' };
const OFF = { userId: 'own3', name: 'o3', businessId: 'b3', businessRole: 'owner' };
const CONSULTANT = {
  userId: 'consult', name: 'c', businessId: 'b1', businessRole: 'consultant', homeBusinessId: 'bc', acting: 'consultant',
};
const PLATFORM = {
  userId: 'boss', name: 'boss', businessId: 'b1', businessRole: 'owner', homeBusinessId: 'b_boss', acting: 'platform',
  isPlatformAdmin: true,
};
const HOME_ADMIN = { userId: 'boss', name: 'boss', businessId: 'b1', businessRole: 'owner', isPlatformAdmin: true };

const db = c => testDb().collection(c);
const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` });
const get = (path, who = OWNER) => request(app).get(BASE + path).set(as(who));
const ids = res => res.body.runs.map(r => r._id);

/** One real recorded run, stored with the id and the facts the test names. */
async function seedRun(id, at, outcome, { businessId = 'b1', test, fallback, text = 'guest words ' + id } = {}) {
  const conversation = { _id: 'cv_' + businessId, businessId, ...(test && { test: true }) };
  const run = startRun(testDb(), conversation, { now: at });
  run.set({
    trigger: { messageIds: ['g1'], text }, lead: 'LEAD ' + id, tone: 'formal', tablesOn: true,
    ...(fallback && { model: 'second', firstModel: 'first' }),
  });
  run.end(outcome);
  await run.finish();
  const stored = await db('assistantRuns').findOne({ _id: run.id });
  await db('assistantRuns').deleteOne({ _id: run.id });
  await db('assistantRuns').insertOne({ ...stored, _id: id });
}

beforeEach(async () => {
  for (const c of ['assistantRuns', 'businesses', 'frontDeskProfiles', 'users', 'businessAccess', 'app_logs']) {
    await db(c).deleteMany({});
  }
  await seedBusiness(testDb(), { businessId: 'b1' });
  await seedBusiness(testDb(), { businessId: 'b2' });
  await db('businesses').insertOne({ _id: 'b3', name: 'Off', ownerId: 'own3', createdAt: 3, modules: ['events'] });
  await db('users').insertOne({
    _id: 'boss', name: 'boss', email: 'b@x.com', businessId: 'b_boss', businessRole: 'owner', isPlatformAdmin: true,
    removedAt: null,
  });
  await db('businessAccess').insertOne({
    _id: 'grant1', userId: 'consult', businessId: 'b1', role: 'consultant', grantedBy: 'boss', grantedByName: 'boss', grantedAt: 1,
  });
  clearModuleCache();
  await seedRun('answered', 1000, 'answered');
  await seedRun('handover', 2000, 'handover');
  await seedRun('backup', 3000, 'draft', { fallback: true });
  await seedRun('testrun', 4000, 'failed', { test: true });
  await seedRun('foreign', 5000, 'answered', { businessId: 'b2' });
  logs.records.length = 0;
});

describe('access', () => {
  it('401 without a token, 403 MODULE_OFF without the module, 403 for staff on both routes', async () => {
    expect((await request(app).get(BASE)).status).toBe(401);
    expect((await request(app).get(BASE + '/answered')).status).toBe(401);
    for (const path of ['', '/answered']) {
      const off = await get(path, OFF);
      expect(off.status).toBe(403);
      expect(off.body).toEqual({ error: 'MODULE_OFF', module: 'frontdesk' });
      const staff = await get(path, STAFF);
      expect(staff.status).toBe(403);
      expect(staff.body.error).toBe('FORBIDDEN');
    }
  });

  it('200 for the owner and for a consultant, without the prompt', async () => {
    for (const who of [OWNER, CONSULTANT]) {
      const list = await get('', who);
      expect(list.status).toBe(200);
      expect(ids(list)).toEqual(['backup', 'handover', 'answered']);
      expect(list.body.runs[1]).toMatchObject({ text: 'guest words handover' });
      expect(typeof list.body.now).toBe('number');
      const one = await get('/handover', who);
      expect(one.status).toBe(200);
      expect(one.body.run).toMatchObject({ _id: 'handover', trigger: { text: 'guest words handover' } });
      expect(one.body.run.steps).toHaveLength(13);
      expect(one.body.run.prompt).toBeUndefined();
      expect(one.body.run.promptRules).toBeUndefined();
      expect(one.body.run.adminViews).toBeUndefined();
    }
    expect(await db('assistantRuns').countDocuments({ adminViews: { $exists: true } })).toBe(0);
  });

  it("another business's run answers 404 and never appears in the list", async () => {
    expect(ids(await get(''))).not.toContain('foreign');
    const res = await get('/foreign');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'Run not found' });
    expect(ids(await get('', OTHER))).toEqual(['foreign']);
    expect((await get('/answered', OTHER)).status).toBe(404);
  });

  it('the generic API refuses the collection', async () => {
    const res = await request(app).get('/api/v1/data/assistantRuns').set(as(OWNER));
    expect(res.status).toBe(403);
  });
});

describe('the list', () => {
  it('the filters and the test scope return exactly their rows', async () => {
    expect(ids(await get('?filter=answered'))).toEqual(['answered']);
    expect(ids(await get('?filter=handover'))).toEqual(['handover']);
    expect(ids(await get('?filter=fallback'))).toEqual(['backup']);
    expect(ids(await get('?scope=test'))).toEqual(['testrun']);
    expect(ids(await get('?scope=real&filter=all'))).toEqual(['backup', 'handover', 'answered']);
  });

  it('limit and before page with more', async () => {
    const first = await get('?limit=2');
    expect(ids(first)).toEqual(['backup', 'handover']);
    expect(first.body.more).toBe(true);
    const next = await get('?limit=2&before=2000');
    expect(ids(next)).toEqual(['answered']);
    expect(next.body.more).toBe(false);
  });

  it('a malformed query answers 400 BAD_INPUT', async () => {
    for (const query of ['limit=x', 'limit=0', 'limit=101', 'before=-1', 'filter=nope', 'scope=nope', 'limit=1&limit=2']) {
      const res = await get('?' + query);
      expect(res.status, query).toBe(400);
      expect(res.body).toEqual({ error: 'BAD_INPUT' });
    }
  });
});

describe('the platform admin', () => {
  it('acting: a real guest text is hidden in the list, a test run is not', async () => {
    const real = await get('', PLATFORM);
    expect(real.status).toBe(200);
    for (const row of real.body.runs) expect(row).toMatchObject({ text: '', textHidden: true });
    const test = await get('?scope=test', PLATFORM);
    expect(test.body.runs[0].text).toBe('guest words testrun');
    expect(test.body.runs[0].textHidden).toBeUndefined();
    expect(await db('assistantRuns').countDocuments({ adminViews: { $exists: true } })).toBe(0);
  });

  it('acting: opening a real run writes the trace and one warn line, every time', async () => {
    const first = await get('/handover', PLATFORM);
    expect(first.status).toBe(200);
    expect(first.body.run.trigger.text).toBe('guest words handover');
    expect(first.body.run.adminViews).toEqual([{ at: expect.any(Number), userId: 'boss' }]);
    expect((await db('assistantRuns').findOne({ _id: 'handover' })).adminViews).toHaveLength(1);
    const lines = logs.byEvent('assistant_runs.admin_read');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({
      level: 40, runId: 'handover', conversationId: 'cv_b1', userId: 'boss', acting: 'platform', actingIn: 'b1',
    });
    await get('/handover', PLATFORM);
    expect((await db('assistantRuns').findOne({ _id: 'handover' })).adminViews).toHaveLength(2);
    const text = JSON.stringify(logs.records);
    for (const secret of ['guest words', 'LEAD handover']) expect(text).not.toContain(secret);
  });

  it('acting: a test run leaves no trace', async () => {
    expect((await get('/testrun', PLATFORM)).status).toBe(200);
    expect((await db('assistantRuns').findOne({ _id: 'testrun' })).adminViews).toBeUndefined();
    expect(logs.byEvent('assistant_runs.admin_read')).toHaveLength(0);
  });

  it('acting: when the trace cannot be written the run is not shown', async () => {
    const native = mongoose.connection.db;
    const proto = Object.getPrototypeOf(native.collection('assistantRuns'));
    const spy = vi.spyOn(proto, 'updateOne').mockRejectedValueOnce(new Error('down'));
    try {
      const res = await get('/handover', PLATFORM);
      expect(res.status).toBe(503);
      expect(res.body).toEqual({ error: 'TRACE_FAILED' });
    } finally {
      spy.mockRestore();
    }
  });

  it('gets the prompt and the rules of today; the admin in his own business leaves no trace', async () => {
    for (const who of [PLATFORM, HOME_ADMIN]) {
      const res = await get('/handover', who);
      expect(res.body.run.prompt).toEqual({ lead: 'LEAD handover', tone: 'formal', tablesOn: true });
      expect(res.body.run.promptRules).toBe(TURN_SYSTEM_PROMPT.replace('{{TONE}}', 'formal') + '\n' + TABLE_SYSTEM_PROMPT);
    }
    expect((await db('assistantRuns').findOne({ _id: 'handover' })).adminViews).toHaveLength(1);
    const answered = await get('/answered', HOME_ADMIN);
    expect(answered.body.run.prompt).toBeUndefined();
    expect(answered.body.run.promptRules).toBeUndefined();
  });
});

describe('plan 756: the setup read', () => {
  const profileOf = (businessId, over = {}) => db('frontDeskProfiles').updateOne({ businessId }, { $set: over });
  const item = (id, businessId, status, visibility, over = {}) => ({
    _id: id, businessId, status, visibility, topic: 'other', question: 'q', answer: 'a', createdAt: 1, ...over,
  });
  const PROFILE = {
    displayName: '', phone: '03-1234567', address: 'Secret Street 5', serviceArea: 'Secret Town',
    hours: [{ days: 'sun', time: '10-22' }, { days: 'fri', time: '10-14' }],
    assistant: { level: 1, tone: 'formal', handoffText: 'secret handoff sentence' },
    requestKinds: { event: { enabled: true }, table: { enabled: false } },
    tableService: { confirmMode: 'auto' },
  };

  beforeEach(async () => {
    await db('knowledgeItems').deleteMany({});
    await profileOf('b1', PROFILE);
    await db('knowledgeItems').insertMany([
      item('k1', 'b1', 'approved', 'public'),
      item('k2', 'b1', 'approved', 'public'),
      item('k3', 'b1', 'approved', 'internal'),
      item('k4', 'b1', 'draft', 'public'),
      item('k5', 'b1', 'approved', 'public', { deletedAt: 5 }),
      item('k6', 'b2', 'approved', 'public'),
    ]);
  });

  it('401 without a token, 403 for staff', async () => {
    expect((await request(app).get(BASE + '/setup')).status).toBe(401);
    const staff = await get('/setup', STAFF);
    expect(staff.status).toBe(403);
    expect(staff.body.error).toBe('FORBIDDEN');
  });

  it('gives the owner every engine number from the constant the turn uses', async () => {
    const res = await get('/setup');
    expect(res.status).toBe(200);
    const inbound = require('../services/inbound');
    const guardrails = require('../services/frontdesk-guardrails');
    const prompt = require('../services/frontdesk-prompt');
    const route = require('../routes/ai/frontdesk');
    const { engine } = res.body;
    expect(engine.quietMs).toBe(inbound.QUIET_MS);
    expect(engine.maxWaitMs).toBe(inbound.MAX_WAIT_MS);
    expect(engine.dailyTurns).toBe(require('../services/frontdesk-turn').FRONTDESK_DAILY_TURNS);
    expect(engine.turnLimit).toBe(guardrails.TURN_LIMIT);
    expect(engine.followUpMax).toBe(guardrails.FOLLOW_UP_MAX);
    expect(engine.historyWindow).toBe(prompt.HISTORY_WINDOW);
    expect(engine.glueMax).toBe(prompt.GLUE_MAX);
    expect(engine.factsMaxChars).toBe(require('../services/knowledge').MAX_FACTS_CHARS);
    expect(engine.firstModelMs).toBe(route.FIRST_MODEL_LIMIT_MS);
    expect(engine.turnBudgetMs).toBe(route.TURN_BUDGET_MS);
    expect(Object.keys(engine)).toHaveLength(10);
  });

  it("answers this business's own values, counting no other business's items", async () => {
    const res = await get('/setup');
    expect(res.body.business).toEqual({
      level: 1, status: 'active', tone: 'formal', handoffTextSet: true, activeHoursSet: false, hoursSet: true,
      profileFieldsFilled: 3, profileFieldsTotal: 4, kindsOn: 1, knowledgeApproved: 3, knowledgePublic: 2,
      tablesOn: false, confirmMode: 'auto',
    });
    expect(res.body.models).toBeUndefined();
  });

  it('answers business null for a business without a profile', async () => {
    await db('frontDeskProfiles').deleteMany({ businessId: 'b1' });
    const res = await get('/setup');
    expect(res.status).toBe(200);
    expect(res.body.business).toBeNull();
    expect(Object.keys(res.body.engine)).toHaveLength(10);
  });

  it('adds the model order for the platform admin only, and never reads "setup" as a run id', async () => {
    const { modelChain } = require('../services/gemini-client');
    for (const who of [PLATFORM, HOME_ADMIN]) {
      const res = await get('/setup', who);
      expect(res.status).toBe(200);
      expect(res.body.models).toEqual(modelChain());
    }
    for (const who of [OWNER, CONSULTANT]) {
      const res = await get('/setup', who);
      expect(res.status).toBe(200);
      expect(res.body).not.toHaveProperty('models');
      expect(res.body.error).toBeUndefined();
    }
  });

  it('logs the read with no value of the profile', async () => {
    await get('/setup');
    const lines = logs.byEvent('assistant_runs.setup_read');
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ hasProfile: true });
    const text = JSON.stringify(logs.records);
    for (const value of ['03-1234567', 'Secret Street', 'Secret Town', 'secret handoff']) {
      expect(text).not.toContain(value);
    }
  });
});
