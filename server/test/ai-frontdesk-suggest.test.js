'use strict';
/** Plan 679: POST /api/v1/ai/frontdesk/suggest — a draft reply for the inbox, model faked by a stubbed fetch. */
const request = require('supertest');

process.env.GEMINI_API_KEY = 'test-key';
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');
const { seedBusiness, seedConversation } = require('./helpers/conversation-fixtures');
const { resetForTests } = require('../services/gemini-client');
const { _waitForUsageWritesForTests } = require('../services/ai-usage');
const { clearModuleCache } = require('../middleware/require-module');

let app;
let fetchMock;
beforeAll(async () => { app = await buildTestApp(); }, 60000);
afterAll(async () => { await teardownTestApp(); });

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` });
const STAFF = { userId: 'st1', name: 's', businessId: 'b1', businessRole: 'staff' };
const OTHER = { userId: 'own2', name: 'o2', businessId: 'b2', businessRole: 'owner' };
const OFF = { userId: 'own3', name: 'o3', businessId: 'b3', businessRole: 'owner' };
const db = c => testDb().collection(c);
const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const modelAnswer = obj => jsonResponse(200, { candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] });
const post = (body, who = STAFF) => request(app).post('/api/v1/ai/frontdesk/suggest').set(as(who)).send(body);

let conversationId;
beforeEach(async () => {
  resetForTests();
  clearModuleCache();
  for (const c of ['messages', 'conversations', 'clients', 'aiUsage', 'businesses', 'frontDeskProfiles']) await db(c).deleteMany({});
  await seedBusiness(testDb(), { businessId: 'b1' });
  await seedBusiness(testDb(), { businessId: 'b2' });
  await db('businesses').insertOne({ _id: 'b3', name: 'Off', ownerId: 'own3', createdAt: 3, modules: ['events'] });
  const { conversation } = await seedConversation(testDb(), { at: Date.now() });
  conversationId = conversation._id;
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('POST /ai/frontdesk/suggest', () => {
  it('stores and returns a suggestion, one ledger row, no outbound, also for a human conversation', async () => {
    await db('conversations').updateOne({ _id: conversationId }, { $set: { status: 'human' } });
    fetchMock.mockResolvedValue(modelAnswer({ reply: 'טיוטה', intent: 'smalltalk' }));
    const res = await post({ conversationId });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ suggestion: 'טיוטה' });
    expect((await db('conversations').findOne({ _id: conversationId })).suggestion).toBe('טיוטה');
    await _waitForUsageWritesForTests();
    const rows = await db('aiUsage').find({}).toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].feature).toBe('frontdesk_suggest');
    expect(await db('messages').countDocuments({ direction: 'out' })).toBe(0);
  });

  it("answers 404 for another business's conversation", async () => {
    fetchMock.mockResolvedValue(modelAnswer({ reply: 'x', intent: 'smalltalk' }));
    expect((await post({ conversationId }, OTHER)).status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers 403 MODULE_OFF without the frontdesk module and 401 without a token', async () => {
    const res = await post({ conversationId }, OFF);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('MODULE_OFF');
    expect((await request(app).post('/api/v1/ai/frontdesk/suggest').send({ conversationId })).status).toBe(401);
  });

  it('a failed model call is 502 AI_FAILED and the conversation is unchanged', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, {}));
    const before = await db('conversations').findOne({ _id: conversationId });
    const res = await post({ conversationId });
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'AI_FAILED', reason: 'other' });
    expect(await db('conversations').findOne({ _id: conversationId })).toEqual(before);
  });

  it('plan 701: every model busy is 502 AI_FAILED with reason busy; the conversation is unchanged', async () => {
    fetchMock.mockImplementation(async () => jsonResponse(503, { error: { message: 'high demand' } }));
    const before = await db('conversations').findOne({ _id: conversationId });
    const res = await post({ conversationId });
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'AI_FAILED', reason: 'busy' });
    expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
    const after = await db('conversations').findOne({ _id: conversationId });
    expect(after).toEqual(before);
    expect(after.assistantFailed).toBeUndefined();
  });

  it('rejects a body without a conversationId', async () => {
    expect((await post({})).status).toBe(400);
  });

  it('plan 689: a blocked reply answers 200 with the handoff sentence and leaves the status', async () => {
    await db('frontDeskProfiles').updateOne({ businessId: 'b1' }, { $set: { assistant: { level: 1, handoffText: 'נעביר לצוות' } } });
    fetchMock.mockResolvedValue(modelAnswer({ reply: 'אבדוק ואחזור אליך', intent: 'smalltalk' }));
    const res = await post({ conversationId });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ suggestion: 'נעביר לצוות' });
    expect((await db('conversations').findOne({ _id: conversationId })).status).toBe('bot');
  });
});
