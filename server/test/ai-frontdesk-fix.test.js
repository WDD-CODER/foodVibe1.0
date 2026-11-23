'use strict';
/** Plan 682: POST /api/v1/ai/frontdesk/fix — a wrong assistant answer becomes a draft knowledge item; model faked. */
const request = require('supertest');

process.env.GEMINI_API_KEY = 'test-key';
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');
const { seedBusiness, seedConversation } = require('./helpers/conversation-fixtures');
const { captureLogs } = require('./helpers/log-capture');
const { resetForTests } = require('../services/gemini-client');
const { _waitForUsageWritesForTests } = require('../services/ai-usage');
const { clearModuleCache } = require('../middleware/require-module');

let app;
let fetchMock;
let logs;
beforeAll(async () => { app = await buildTestApp(); logs = captureLogs(); }, 60000);
afterAll(async () => { await teardownTestApp(); });

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` });
const STAFF = { userId: 'st1', name: 's', businessId: 'b1', businessRole: 'staff' };
const OTHER = { userId: 'own2', name: 'o2', businessId: 'b2', businessRole: 'owner' };
const OFF = { userId: 'own3', name: 'o3', businessId: 'b3', businessRole: 'owner' };
const LIM = { userId: 'own4', name: 'o4', businessId: 'b4', businessRole: 'owner' };
const db = c => testDb().collection(c);
const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const modelAnswer = obj => jsonResponse(200, { candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] });
const post = (body, who = STAFF) => request(app).post('/api/v1/ai/frontdesk/fix').set(as(who)).send(body);
const GOOD = { topic: 'location', question: 'יש חניה?', answer: 'אין חניה במקום', variations: ['איפה חונים?', 'חניה קרובה?'] };

const msg = (id, conversationId, at, extra = {}) => ({
  _id: id, businessId: 'b1', conversationId, direction: 'in', author: 'guest', kind: 'text', text: 'hi ' + id,
  at, providerMessageId: 'p_' + id, status: 'delivered', ...extra,
});

let conversationId;
let body;
beforeEach(async () => {
  resetForTests();
  clearModuleCache();
  for (const c of ['messages', 'conversations', 'clients', 'aiUsage', 'businesses', 'frontDeskProfiles', 'knowledgeItems']) {
    await db(c).deleteMany({});
  }
  for (const b of ['b1', 'b2', 'b4', 'b5']) await seedBusiness(testDb(), { businessId: b });
  await db('businesses').insertOne({ _id: 'b3', name: 'Off', ownerId: 'own3', createdAt: 3, modules: ['events'] });
  const { conversation } = await seedConversation(testDb(), { at: Date.now() });
  conversationId = conversation._id;
  await db('messages').insertMany([
    msg('g1', conversationId, 1000, { text: 'יש לכם חניה?' }),
    msg('a1', conversationId, 2000, { direction: 'out', author: 'ai', text: 'כן, יש חניה' }),
    msg('m1', conversationId, 3000, { direction: 'out', author: 'member', text: 'x' }),
  ]);
  body = { conversationId, messageId: 'a1', answer: 'אין חניה במקום', issue: 'wrong_info' };
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('POST /ai/frontdesk/fix', () => {
  it('stores one draft correction item, one ledger row, no message, conversation unchanged', async () => {
    fetchMock.mockResolvedValue(modelAnswer(GOOD));
    const before = await db('conversations').findOne({ _id: conversationId });
    const res = await post(body);
    expect(res.status).toBe(200);
    expect(res.body.drafted).toBe(true);
    const items = await db('knowledgeItems').find({}).toArray();
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual(expect.objectContaining({
      status: 'draft', source: 'correction', visibility: 'public', createdBy: 'st1', businessId: 'b1',
      topic: 'location', question: GOOD.question, answer: GOOD.answer, variations: GOOD.variations,
    }));
    expect(res.body.item._id).toBe(items[0]._id);
    await _waitForUsageWritesForTests();
    const rows = await db('aiUsage').find({}).toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].feature).toBe('knowledge_correction');
    expect(await db('messages').countDocuments({})).toBe(3);
    expect(await db('conversations').findOne({ _id: conversationId })).toEqual(before);
  });

  it('falls back to a plain draft when the model call fails', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, {}));
    const res = await post(body);
    expect(res.status).toBe(200);
    expect(res.body.drafted).toBe(false);
    const item = await db('knowledgeItems').findOne({});
    expect(item).toEqual(expect.objectContaining({ topic: 'faq', question: 'יש לכם חניה?', answer: 'אין חניה במקום', status: 'draft', source: 'correction' }));
    expect(item.variations).toBeUndefined();
  });

  it('falls back when the model answer is not valid, and uses the typed answer when no guest message precedes', async () => {
    fetchMock.mockResolvedValue(modelAnswer({ topic: 'nope', question: '', answer: '' }));
    await db('messages').deleteOne({ _id: 'g1' });
    const res = await post({ ...body, answer: 'ת'.repeat(300) });
    expect(res.status).toBe(200);
    expect(res.body.drafted).toBe(false);
    const item = await db('knowledgeItems').findOne({});
    expect(item.question).toBe('ת'.repeat(200));
    expect(item.answer).toBe('ת'.repeat(300));
  });

  it('refuses bad input and stores nothing', async () => {
    fetchMock.mockResolvedValue(modelAnswer(GOOD));
    expect((await post({ ...body, messageId: 'm1' })).status).toBe(400);
    expect((await post({ ...body, messageId: 'nope' })).status).toBe(404);
    expect((await post(body, OTHER)).status).toBe(404);
    expect((await post({ ...body, issue: 'x' })).status).toBe(400);
    expect((await post({ ...body, answer: '  ' })).status).toBe(400);
    expect((await post({ ...body, answer: 'א'.repeat(1201) })).status).toBe(400);
    expect(await db('knowledgeItems').countDocuments({})).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a message of another conversation', async () => {
    const other = await seedConversation(testDb(), { waId: '972529999999', at: Date.now() });
    const res = await post({ ...body, conversationId: other.conversation._id });
    expect(res.status).toBe(404);
  });

  it('answers 403 MODULE_OFF without the frontdesk module', async () => {
    const res = await post(body, OFF);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('MODULE_OFF');
  });

  it('answers 429 on the eleventh call inside 15 minutes', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, {}));
    const bad = { ...body, issue: 'x' };
    for (let i = 0; i < 10; i++) expect((await post(bad, LIM)).status).toBe(400);
    expect((await post(bad, LIM)).status).toBe(429);
  });

  it('logs hold the issue, ids and lengths only (logs)', async () => {
    fetchMock.mockResolvedValue(modelAnswer(GOOD));
    const start = logs.records.length;
    await post({ ...body, answer: 'סוד-של-חברים-123' });
    const lines = logs.records.slice(start);
    const fix = lines.filter(r => r.event === 'frontdesk.fix');
    expect(fix).toHaveLength(1);
    expect(fix[0]).toEqual(expect.objectContaining({ issue: 'wrong_info', drafted: true, conversationId, messageId: 'a1' }));
    const text = JSON.stringify(lines);
    expect(text).not.toContain('סוד-של-חברים-123');
    expect(text).not.toContain('יש לכם חניה');
    expect(text).not.toContain('972521234567');
  });

  it('drafts the same way for a test conversation, with no test field on the item', async () => {
    const t = await seedConversation(testDb(), { businessId: 'b5', waId: '972528888888', test: true, at: Date.now() });
    await db('messages').insertOne(msg('a5', t.conversation._id, 2000, { businessId: 'b5', direction: 'out', author: 'ai', text: 'כן' }));
    fetchMock.mockResolvedValue(modelAnswer(GOOD));
    const res = await post(
      { ...body, conversationId: t.conversation._id, messageId: 'a5' },
      { userId: 'own5', name: 'o5', businessId: 'b5', businessRole: 'owner' }
    );
    expect(res.status).toBe(200);
    expect((await db('knowledgeItems').findOne({})).test).toBeUndefined();
  });
});
