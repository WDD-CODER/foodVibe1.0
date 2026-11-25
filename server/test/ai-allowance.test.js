'use strict';
/**
 * Plan 736 — every user's lifetime AI allowance: the atomic reserve, the refund on a failed answer, the 402 refusal
 * before the model is called, the platform admin's PUT and the `mine` line of GET /ai/usage.
 */

const mongoose = require('mongoose');
const request = require('supertest');
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');
const { callGemini, resetForTests } = require('../services/gemini-client');
const { _waitForUsageWritesForTests } = require('../services/ai-usage');
const { clearCapCache } = require('../services/ai-cap');
const { allowanceOf, reserveAiCall, refundAiCall, _waitForRefundsForTests } = require('../services/ai-allowance');
const { AI_DEFAULT_ALLOWANCE } = require('../generated/schemas/ai-allowance.schema');

let app;
let fetchMock;

beforeAll(async () => {
  app = await buildTestApp();
}, 60000);
afterAll(async () => {
  await teardownTestApp();
});

beforeEach(async () => {
  resetForTests();
  clearCapCache();
  process.env.GEMINI_API_KEY = 'test-key';
  delete process.env.GEMINI_MODELS;
  delete process.env.AI_BUDGET_CONTACT_EMAIL;
  const db = testDb();
  for (const c of ['aiUsage', 'GEMINI_USAGE', 'businesses', 'users']) await db.collection(c).deleteMany({});
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const answer = text => jsonResponse(200, { candidates: [{ content: { parts: [{ text }] } }], usageMetadata: { totalTokenCount: 10 } });
const OK = () => answer('{"type":"dish","confidence":1,"data":{"nameHebrew":"מרק"}}');
const fakeLog = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });

let seq = 0;
/** A fresh user per test (the AI rate limiter allows 20 requests per user per 15 minutes). */
async function addUser(fields = {}) {
  seq += 1;
  const _id = `allow${seq}`;
  await testDb().collection('users').insertOne({ _id, name: _id, email: `${_id}@t.test`, ...fields });
  return _id;
}
const userDoc = id => testDb().collection('users').findOne({ _id: id });
const as = (userId, extra = {}) => ({ Authorization: `Bearer ${signTestToken({ userId, name: userId, ...extra })}` });
const parseText = (userId, extra) => request(app).post('/api/v1/ai/parse-text').set(as(userId, extra)).send({ rawText: 'מרק' });
/** Waits for the refund a 4xx/5xx answer starts on `finish`. */
async function settled() {
  await new Promise(r => setTimeout(r, 20));
  await _waitForRefundsForTests();
  await _waitForUsageWritesForTests();
}

describe('allowanceOf', () => {
  it('reads missing fields as the default allowance and 0 used', () => {
    expect(AI_DEFAULT_ALLOWANCE).toBe(100);
    expect(allowanceOf({})).toEqual({ allowance: 100, used: 0, remaining: 100 });
    expect(allowanceOf(null)).toEqual({ allowance: 100, used: 0, remaining: 100 });
    expect(allowanceOf({ aiAllowance: 50, aiCallsUsed: 80 })).toEqual({ allowance: 50, used: 80, remaining: 0 });
  });
});

describe('reserveAiCall / refundAiCall', () => {
  it('reserves once per holder, refuses at the allowance, never refunds below 0', async () => {
    const id = await addUser({ aiAllowance: 1 });
    const holder = { reserved: false };
    expect(await reserveAiCall(testDb(), holder, id)).toBe('reserved');
    expect(await reserveAiCall(testDb(), holder, id)).toBe('reserved');
    expect((await userDoc(id)).aiCallsUsed).toBe(1);
    expect(await reserveAiCall(testDb(), { reserved: false }, id)).toBe('over');
    await refundAiCall(testDb(), id);
    await refundAiCall(testDb(), id);
    expect((await userDoc(id)).aiCallsUsed).toBe(0);
  });
  it('a missing user is not counted', async () => {
    expect(await reserveAiCall(testDb(), { reserved: false }, 'nobody')).toBe('no_user');
  });
});

describe('callGemini', () => {
  const call = (usage, log = fakeLog()) =>
    callGemini({ body: { contents: [] }, timeoutMs: 1000, log, eventPrefix: 'ai.test', usage: { businessId: 'bA', feature: 'parse_text', ...usage } });

  it('throws under the test runner when a signed-in call has no allowance holder', async () => {
    await expect(call({ userId: 'u1' })).rejects.toThrow('callGemini: usage.allowance required');
  });
  it('retries inside one request count once', async () => {
    const id = await addUser();
    fetchMock.mockResolvedValueOnce(jsonResponse(503, {})).mockResolvedValueOnce(OK());
    const res = await call({ userId: id, allowance: { reserved: false } });
    expect(res.kind).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect((await userDoc(id)).aiCallsUsed).toBe(1);
  });
  it('over budget: no fetch, one ai_budget_exhausted ledger row', async () => {
    const id = await addUser({ aiAllowance: 3, aiCallsUsed: 3 });
    const log = fakeLog();
    const res = await call({ userId: id, allowance: { reserved: false } }, log);
    expect(res.kind).toBe('ai_budget_exhausted');
    expect(fetchMock).not.toHaveBeenCalled();
    await _waitForUsageWritesForTests();
    const rows = await testDb().collection('aiUsage').find({ errorCode: 'ai_budget_exhausted' }).toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ ok: false, userId: id, totalTokens: 0 });
  });
  it('a database error lets the call go on and logs ai.allowance.check_failed', async () => {
    const id = await addUser({ aiAllowance: 0 });
    const db = mongoose.connection.db;
    const original = db.collection.bind(db);
    vi.spyOn(db, 'collection').mockImplementation((name, ...rest) => {
      if (name === 'users') throw new Error('boom');
      return original(name, ...rest);
    });
    fetchMock.mockResolvedValue(OK());
    const log = fakeLog();
    const res = await call({ userId: id, allowance: { reserved: false } }, log);
    expect(res.kind).toBe('ok');
    expect(log.warn).toHaveBeenCalledWith({ event: 'ai.allowance.check_failed', userId: id });
  });
  it('an unlimited (platform admin) call never reserves', async () => {
    const id = await addUser({ aiAllowance: 0 });
    fetchMock.mockResolvedValue(OK());
    const res = await call({ userId: id, allowance: { reserved: false }, unlimited: true });
    expect(res.kind).toBe('ok');
    expect((await userDoc(id)).aiCallsUsed).toBeUndefined();
  });
});

describe('the AI routes', () => {
  it('a success counts one call; missing fields start at 100', async () => {
    const id = await addUser();
    fetchMock.mockResolvedValue(OK());
    const res = await parseText(id);
    expect(res.status).toBe(200);
    await settled();
    expect(await userDoc(id)).toMatchObject({ aiCallsUsed: 1 });
    expect((await userDoc(id)).aiAllowance).toBeUndefined();
  });
  it('an unusable answer (502) and a timeout (504) are refunded', async () => {
    const id = await addUser();
    fetchMock.mockResolvedValueOnce(answer('not json at all'));
    expect((await parseText(id)).status).toBe(502);
    const timeout = Object.assign(new Error('t'), { name: 'TimeoutError' });
    fetchMock.mockRejectedValueOnce(timeout);
    expect((await parseText(id)).status).toBe(504);
    await settled();
    expect((await userDoc(id)).aiCallsUsed).toBe(0);
  });
  it('the 101st request answers 402 with the contact email and makes no model call', async () => {
    const id = await addUser({ aiCallsUsed: 100 });
    const res = await parseText(id);
    expect(res.status).toBe(402);
    expect(res.body).toEqual({ error: 'AI_BUDGET_EXHAUSTED', code: 'AI_BUDGET_EXHAUSTED', contactEmail: 'dan.weibren@gmail.com' });
    expect(fetchMock).not.toHaveBeenCalled();
    await settled();
    expect((await userDoc(id)).aiCallsUsed).toBe(100);
  });
  it('the contact email comes from AI_BUDGET_CONTACT_EMAIL when set', async () => {
    process.env.AI_BUDGET_CONTACT_EMAIL = 'ops@example.test';
    const id = await addUser({ aiAllowance: 0 });
    const res = await parseText(id);
    expect(res.body.contactEmail).toBe('ops@example.test');
  });
  it('the recipe route sends a second request after an unusable answer and counts once', async () => {
    const id = await addUser();
    fetchMock.mockResolvedValueOnce(answer('not json')).mockResolvedValueOnce(answer('still not json'));
    const res = await request(app).post('/api/v1/ai/generate').set(as(id)).send({ prompt: 'מרק' });
    expect(res.status).toBe(502);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await settled();
    expect((await userDoc(id)).aiCallsUsed).toBe(0);
  });
  it('a sub-router route (stock) is gated too', async () => {
    const id = await addUser({ aiAllowance: 0 });
    await testDb().collection('products').insertOne({ _id: `p_${id}`, businessId: `b_${id}`, nameHebrew: 'קמח', baseUnit: 'kg' });
    const res = await request(app).post('/api/v1/ai/stock/extract').set(as(id)).send({ text: 'קמח 2 קילו' });
    expect(res.status).toBe(402);
    expect(res.body.code).toBe('AI_BUDGET_EXHAUSTED');
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it('five parallel requests at allowance 2 reach the model exactly twice', async () => {
    const id = await addUser({ aiAllowance: 2 });
    fetchMock.mockImplementation(async () => OK());
    const answers = await Promise.all([1, 2, 3, 4, 5].map(() => parseText(id)));
    const statuses = answers.map(r => r.status).sort();
    expect(statuses).toEqual([200, 200, 402, 402, 402]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await settled();
    expect((await userDoc(id)).aiCallsUsed).toBe(2);
  });
  it('a platform admin is never counted or refused', async () => {
    const id = await addUser({ aiAllowance: 0, isPlatformAdmin: true });
    fetchMock.mockResolvedValue(OK());
    const res = await parseText(id, { isPlatformAdmin: true });
    expect(res.status).toBe(200);
    await settled();
    expect((await userDoc(id)).aiCallsUsed).toBeUndefined();
  });
});

describe('PUT /api/v1/admin/users/:userId/ai-allowance', () => {
  const ADMIN = () => as('platAdmin', { role: 'admin', isPlatformAdmin: true });
  const put = (userId, body, headers = ADMIN()) =>
    request(app).put(`/api/v1/admin/users/${userId}/ai-allowance`).set(headers).send(body);

  it('the admin raises a user; history row kept; the raised user can call again', async () => {
    const id = await addUser({ aiAllowance: 2, aiCallsUsed: 2 });
    expect((await parseText(id)).status).toBe(402);
    const res = await put(id, { aiAllowance: 5 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, aiAllowance: 5, aiCallsUsed: 2 });
    const doc = await userDoc(id);
    expect(doc.aiAllowance).toBe(5);
    expect(doc.aiCallsUsed).toBe(2);
    expect(doc.aiAllowanceHistory).toHaveLength(1);
    expect(doc.aiAllowanceHistory[0]).toMatchObject({ by: 'platAdmin', byName: 'platAdmin', from: 2, to: 5 });
    fetchMock.mockResolvedValue(OK());
    expect((await parseText(id)).status).toBe(200);
  });
  it('reads a missing allowance as 100 in the history and keeps the last 20 rows', async () => {
    const id = await addUser();
    for (let n = 1; n <= 21; n++) expect((await put(id, { aiAllowance: n })).status).toBe(200);
    const doc = await userDoc(id);
    expect(doc.aiAllowanceHistory).toHaveLength(20);
    expect(doc.aiAllowanceHistory[0]).toMatchObject({ from: 1, to: 2 });
    expect(doc.aiAllowanceHistory[19]).toMatchObject({ from: 20, to: 21 });
  });
  it('an owner gets 403', async () => {
    const id = await addUser();
    expect((await put(id, { aiAllowance: 5 }, as(id))).status).toBe(403);
  });
  it.each([[{ aiAllowance: -1 }], [{ aiAllowance: 1.5 }], [{ aiAllowance: 100001 }], [{}], [{ aiAllowance: '5' }], [{ aiAllowance: 5, aiCallsUsed: 0 }]])(
    'a bad body %j is 400 Validation failed', async (body) => {
      const id = await addUser();
      const res = await put(id, body);
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
      expect(Array.isArray(res.body.issues)).toBe(true);
    });
  it('an unknown user is 404', async () => {
    expect((await put('ghost', { aiAllowance: 5 })).status).toBe(404);
  });
  it('GET /admin/users carries the allowance and the used count, defaults when missing', async () => {
    const a = await addUser();
    const b = await addUser({ aiAllowance: 7, aiCallsUsed: 3 });
    const res = await request(app).get('/api/v1/admin/users').set(ADMIN());
    expect(res.status).toBe(200);
    const byId = new Map(res.body.map(u => [u._id, u]));
    expect(byId.get(a)).toMatchObject({ aiAllowance: 100, aiCallsUsed: 0 });
    expect(byId.get(b)).toMatchObject({ aiAllowance: 7, aiCallsUsed: 3 });
  });
});

describe('GET /api/v1/ai/usage mine', () => {
  it('has no mine without a token', async () => {
    const res = await request(app).get('/api/v1/ai/usage');
    expect(res.status).toBe(200);
    expect(res.body.mine).toBeUndefined();
  });
  it('gives a signed-in user what is left', async () => {
    const id = await addUser({ aiAllowance: 5, aiCallsUsed: 3 });
    const res = await request(app).get('/api/v1/ai/usage').set(as(id));
    expect(res.body.mine).toEqual({ allowance: 5, used: 3, remaining: 2, unlimited: false });
  });
  it('says unlimited for a platform admin', async () => {
    const id = await addUser();
    const res = await request(app).get('/api/v1/ai/usage').set(as(id, { isPlatformAdmin: true }));
    expect(res.body.mine).toEqual({ allowance: 100, used: 0, remaining: 100, unlimited: true });
  });
});
