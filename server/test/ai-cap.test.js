'use strict';
/** Plan 617 — the monthly AI cap per business (C-AICAP): capState, the callGemini refusal, the route answer. */

const mongoose = require('mongoose');
const request = require('supertest');
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');
const { callGemini, resetForTests } = require('../services/gemini-client');
const { _waitForUsageWritesForTests } = require('../services/ai-usage');
const { capState, monthTokensByBusiness, clearCapCache } = require('../services/ai-cap');
const { jerusalemDate } = require('../middleware/usage');

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
  const db = testDb();
  for (const c of ['aiUsage', 'GEMINI_USAGE', 'businesses']) await db.collection(c).deleteMany({});
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const OK = { candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }], usageMetadata: { totalTokenCount: 10 } };
const fakeLog = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });
const row = (businessId, day, totalTokens) => ({ businessId, day, totalTokens, feature: 'parse_text', ok: true, at: 1 });
const setCap = (cap, id = 'bCap') => testDb().collection('businesses').insertOne({ _id: id, name: id, ownerId: 'o', createdAt: 1, ...(cap === undefined ? {} : { aiMonthlyTokenCap: cap }) });
const today = () => jerusalemDate(Date.now());
const call = (log, usage = { businessId: 'bCap', feature: 'parse_text' }) =>
  callGemini({ body: { contents: [] }, timeoutMs: 1000, log, eventPrefix: 'ai.test', usage });
const ledger = async () => {
  await _waitForUsageWritesForTests();
  return testDb().collection('aiUsage').find({}).toArray();
};

describe('capState', () => {
  const NOW = Date.parse('2026-11-15T10:00:00Z');
  it('counts this month, sums to the cap and flags over', async () => {
    await setCap(1000);
    await testDb().collection('aiUsage').insertMany([row('bCap', '2026-11-03', 600), row('bCap', '2026-11-10', 400)]);
    expect(await capState(testDb(), 'bCap', NOW)).toEqual({ cap: 1000, used: 1000, over: true });
  });
  it('is not over at 999, ignores other months and other businesses', async () => {
    await setCap(1000);
    await testDb().collection('aiUsage').insertMany([
      row('bCap', '2026-11-03', 600), row('bCap', '2026-11-10', 399),
      row('bCap', '2026-10-31', 5000), row('other', '2026-11-05', 5000),
    ]);
    expect(await capState(testDb(), 'bCap', NOW)).toEqual({ cap: 1000, used: 999, over: false });
  });
  it('uses the Israel month: 22:30 UTC on 30 Nov is already December', async () => {
    await setCap(1000);
    await testDb().collection('aiUsage').insertMany([row('bCap', '2026-11-30', 700), row('bCap', '2026-12-01', 50)]);
    expect(await capState(testDb(), 'bCap', Date.parse('2026-11-30T22:30:00Z'))).toEqual({ cap: 1000, used: 50, over: false });
  });
  it('no cap stored gives cap null and never over', async () => {
    await setCap(undefined);
    await testDb().collection('aiUsage').insertOne(row('bCap', '2026-11-03', 777));
    expect(await capState(testDb(), 'bCap', NOW)).toEqual({ cap: null, used: 777, over: false });
  });
  it('cap 0 is over with no row at all', async () => {
    await setCap(0);
    expect(await capState(testDb(), 'bCap', NOW)).toEqual({ cap: 0, used: 0, over: true });
  });
  it('caches for 60 s and re-reads after clearCapCache', async () => {
    await setCap(1000);
    const db = testDb();
    const spy = vi.spyOn(db, 'collection');
    await capState(db, 'bCap', NOW);
    const first = spy.mock.calls.length;
    expect(first).toBeGreaterThan(0);
    await capState(db, 'bCap', NOW);
    expect(spy.mock.calls.length).toBe(first);
    clearCapCache('bCap');
    await capState(db, 'bCap', NOW);
    expect(spy.mock.calls.length).toBe(first * 2);
  });
  it('monthTokensByBusiness groups by business', async () => {
    await testDb().collection('aiUsage').insertMany([row('a', '2026-11-03', 5), row('a', '2026-11-04', 6), row('b', '2026-11-04', 1), row('a', '2026-10-04', 99)]);
    const m = await monthTokensByBusiness(testDb(), NOW);
    expect(m.get('a')).toBe(11);
    expect(m.get('b')).toBe(1);
  });
});

describe('callGemini', () => {
  it('refuses a business over its cap: no fetch, one zero-token row', async () => {
    await setCap(100);
    await testDb().collection('aiUsage').insertOne(row('bCap', today(), 100));
    const log = fakeLog();
    const res = await call(log);
    expect(res.kind).toBe('business_cap');
    expect(fetchMock).toHaveBeenCalledTimes(0);
    const rows = (await ledger()).filter(r => r.errorCode === 'business_cap');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ ok: false, inputTokens: 0, outputTokens: 0, totalTokens: 0, businessId: 'bCap', feature: 'parse_text' });
  });
  it('lets a business under its cap through', async () => {
    await setCap(100);
    fetchMock.mockResolvedValue(jsonResponse(200, OK));
    const res = await call(fakeLog());
    expect(res.kind).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const rows = await ledger();
    expect(rows).toHaveLength(1);
    expect(rows[0].ok).toBe(true);
  });
  it.each([[undefined], ['__platform__']])('reads no business for businessId %s', async (businessId) => {
    const spy = vi.spyOn(mongoose.connection.db, 'collection');
    fetchMock.mockResolvedValue(jsonResponse(200, OK));
    const res = await call(fakeLog(), { businessId, feature: 'parse_text' });
    expect(res.kind).toBe('ok');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls.filter(c => c[0] === 'businesses')).toHaveLength(0);
  });
  it('still throws without a feature', async () => {
    await expect(call(fakeLog(), { businessId: 'bCap' })).rejects.toThrow('callGemini: usage.feature required');
  });
  it('a failed cap read lets the call go on and logs it', async () => {
    vi.spyOn(mongoose.connection.db, 'collection').mockImplementation(() => { throw new Error('boom'); });
    fetchMock.mockResolvedValue(jsonResponse(200, OK));
    const log = fakeLog();
    const res = await call(log);
    expect(res.kind).toBe('ok');
    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ event: 'ai.cap.check_failed' }));
  });
});

describe('route', () => {
  const OWNER = { userId: 'ownerCap', name: 'O', businessId: 'bCap', businessRole: 'owner' };
  const as = () => ({ Authorization: `Bearer ${signTestToken(OWNER)}` });
  beforeEach(async () => {
    await setCap(10);
    await testDb().collection('aiUsage').insertOne(row('bCap', today(), 10));
  });
  it.each([
    ['/api/v1/ai/parse-text', { rawText: '2 eggs' }],
    ['/api/v1/ai/generate', { prompt: 'a soup' }],
  ])('POST %s answers 429 ai_monthly_cap_reached', async (url, body) => {
    const res = await request(app).post(url).set(as()).send(body);
    expect(res.status).toBe(429);
    expect(res.body).toEqual({ error: 'ai_monthly_cap_reached', code: 'ai_monthly_cap_reached' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
