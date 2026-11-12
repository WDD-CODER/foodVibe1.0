'use strict';
/**
 * Plan 566 — the AI usage ledger: one row per real Gemini HTTP call (mocked fetch), the admin
 * totals route and the static "every call site is tagged" check. In-memory Mongo test app.
 */

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');
const { callGemini, resetForTests, DEFAULT_MODELS } = require('../services/gemini-client');
const { _waitForUsageWritesForTests, estimateCostUsd } = require('../services/ai-usage');
const { AI_FEATURES, isAiFeature } = require('../constants/ai-features');
const { AI_PRICES } = require('../constants/ai-prices');

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
  process.env.GEMINI_API_KEY = 'test-key';
  delete process.env.GEMINI_MODELS;
  await testDb().collection('aiUsage').deleteMany({});
  await testDb().collection('GEMINI_USAGE').deleteMany({});
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const fakeLog = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });
const DAILY_429 = {
  error: {
    code: 429,
    message: 'quota',
    details: [{ violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier', quotaValue: '20' }] }],
  },
};
const OK_WITH_USAGE = {
  candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }],
  usageMetadata: { promptTokenCount: 1200, candidatesTokenCount: 300, thoughtsTokenCount: 100, totalTokenCount: 1600 },
};
const call = (log, extra = {}) =>
  callGemini({
    body: { contents: [] },
    timeoutMs: 1000,
    log,
    eventPrefix: 'ai.test',
    usage: { businessId: 'bizA', userId: 'u1', feature: 'parse_text' },
    ...extra,
  });
const rows = async () => {
  await _waitForUsageWritesForTests();
  return testDb().collection('aiUsage').find({}).toArray();
};

describe('the ledger row', () => {
  it('records tokens, cost and day for a successful call', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, OK_WITH_USAGE));
    const log = fakeLog();
    const result = await call(log);
    expect(result.kind).toBe('ok');
    const all = await rows();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      businessId: 'bizA',
      userId: 'u1',
      feature: 'parse_text',
      model: 'gemini-3.1-flash-lite',
      ok: true,
      inputTokens: 1200,
      outputTokens: 400,
      totalTokens: 1600,
      estCostUsd: 0.0009,
    });
    expect(all[0].day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(all[0].day).toBe(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(all[0].at));
    expect(all[0].errorCode).toBeUndefined();
  });

  it('stores exactly the contract fields: no prompt, reply or phone', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, OK_WITH_USAGE));
    await call(fakeLog(), { body: { contents: [{ parts: [{ text: 'secret prompt 0501234567' }] }] } });
    const [row] = await rows();
    const allowed = new Set([
      '_id', 'businessId', 'userId', 'feature', 'model', 'ok', 'errorCode', 'inputTokens', 'outputTokens',
      'totalTokens', 'audioSeconds', 'outcome', 'rejectCode', 'imageCount', 'latencyMs', 'estCostUsd', 'at', 'day',
    ]);
    expect(Object.keys(row).filter(k => !allowed.has(k))).toEqual([]);
    expect(JSON.stringify(row)).not.toContain('secret prompt');
    expect(JSON.stringify(row)).not.toContain('0501234567');
    expect(JSON.stringify(row)).not.toContain('"ok":true}');
  });

  it('counts image parts and uses __platform__ when there is no business', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, OK_WITH_USAGE));
    await call(fakeLog(), {
      usage: { feature: 'receipt_photo' },
      body: { contents: [{ parts: [{ text: 'x' }, { inlineData: { mimeType: 'image/jpeg', data: 'a' } }, { inlineData: { mimeType: 'application/pdf', data: 'b' } }] }] },
    });
    const [row] = await rows();
    expect(row.businessId).toBe('__platform__');
    expect(row.imageCount).toBe(1);
    expect(row.userId).toBeUndefined();
  });

  it('estimateCostUsd: unknown model costs 0 and warns once', () => {
    const log = fakeLog();
    expect(estimateCostUsd('gemini-unknown-x', 1000, 1000, log)).toBe(0);
    expect(estimateCostUsd('gemini-unknown-x', 1000, 1000, log)).toBe(0);
    expect(log.warn).toHaveBeenCalledTimes(1);
    expect(log.warn.mock.calls[0][0].event).toBe('ai.usage.no_price');
  });
});

describe('failures write one row with ok:false', () => {
  it('http 500', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { error: { message: 'boom' } }));
    expect((await call(fakeLog())).kind).toBe('gemini_error');
    const all = await rows();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ ok: false, errorCode: 'http_500', inputTokens: 0 });
  });

  it('timeout', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('t'), { name: 'TimeoutError' }));
    expect((await call(fakeLog())).kind).toBe('timeout');
    const all = await rows();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ ok: false, errorCode: 'timeout' });
  });

  it('network error', async () => {
    fetchMock.mockRejectedValue(new Error('down'));
    expect((await call(fakeLog())).kind).toBe('network');
    const all = await rows();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ ok: false, errorCode: 'network' });
  });

  it('daily-quota 429', async () => {
    fetchMock.mockResolvedValue(jsonResponse(429, DAILY_429));
    expect((await call(fakeLog())).kind).toBe('model_exhausted');
    const all = await rows();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ ok: false, errorCode: 'quota' });
  });

  it('unreadable body', async () => {
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => { throw new Error('bad json'); } });
    expect((await call(fakeLog())).kind).toBe('gemini_error');
    const all = await rows();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ ok: false, errorCode: 'unreadable' });
  });
});

describe('no HTTP call, no row', () => {
  it('model_removed writes nothing', async () => {
    expect((await call(fakeLog(), { model: 'gemini-3.7-flash' })).kind).toBe('model_removed');
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await rows()).toHaveLength(0);
  });

  it('a known-exhausted model and all_exhausted write only the row of the call that learned it', async () => {
    process.env.GEMINI_MODELS = 'gemini-3.1-flash-lite';
    fetchMock.mockResolvedValue(jsonResponse(429, DAILY_429));
    expect((await call(fakeLog())).kind).toBe('all_exhausted');
    expect(await rows()).toHaveLength(1);
    expect((await call(fakeLog())).kind).toBe('all_exhausted');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await rows()).toHaveLength(1);
  });

  it('a known-exhausted model with a next one writes nothing for the refused call', async () => {
    fetchMock.mockResolvedValue(jsonResponse(429, DAILY_429));
    expect((await call(fakeLog())).kind).toBe('model_exhausted');
    expect(await rows()).toHaveLength(1);
    // same model requested explicitly while known-exhausted: refused with no HTTP call
    expect((await call(fakeLog(), { model: DEFAULT_MODELS[0] })).kind).toBe('model_exhausted');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await rows()).toHaveLength(1);
  });
});

describe('metering never breaks the call', () => {
  it('a failed insert keeps the result and logs ai.usage.write_failed', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, OK_WITH_USAGE));
    const spy = vi.spyOn(testDb().collection('aiUsage').constructor.prototype, 'insertOne').mockRejectedValue(new Error('disk full'));
    const log = fakeLog();
    try {
      const result = await call(log);
      expect(result).toEqual({ kind: 'ok', model: 'gemini-3.1-flash-lite', data: OK_WITH_USAGE });
      await _waitForUsageWritesForTests();
    } finally {
      spy.mockRestore();
    }
    const warn = log.warn.mock.calls.map(c => c[0]).find(e => e.event === 'ai.usage.write_failed');
    expect(warn).toEqual({ event: 'ai.usage.write_failed', feature: 'parse_text', model: 'gemini-3.1-flash-lite' });
    expect(await rows()).toHaveLength(0);
  });
});

describe('static checks', () => {
  it('every default model has a price', () => {
    for (const m of DEFAULT_MODELS) expect(AI_PRICES[m], m).toBeTruthy();
  });

  it('AI_FEATURES has 19 keys', () => {
    expect(AI_FEATURES).toHaveLength(19);
    expect(isAiFeature('recipe_generate')).toBe(true);
    expect(isAiFeature('nope')).toBe(false);
  });

  it('every callGemini call site in routes/ai.js passes a usage.feature from AI_FEATURES', () => {
    const src = fs.readFileSync(path.join(__dirname, '../routes/ai.js'), 'utf8');
    const sites = src.match(/await callGemini\(\{\r?\n|await callGeminiForRecipeWithRetry\(requestBody, \{/g) ?? [];
    const features = [...src.matchAll(/usage: \{ [^}]*feature: '(\w+)' \}/g)].map(m => m[1]);
    expect(sites).toHaveLength(13);
    expect(features).toHaveLength(13);
    for (const f of features) expect(isAiFeature(f), f).toBe(true);
  });
});

describe('POST /generate retry', () => {
  it('an invalid first reply and a valid second write two recipe_generate rows', async () => {
    const recipe = {
      nameHebrew: 'מתכון',
      recipe_type: 'dish',
      yield_amount: 4,
      yield_unit: 'portion',
      ingredients: [{ name: 'עגבנייה', amount: 100, unit: 'gram' }],
      steps: ['לערבב'],
    };
    const wrap = text => jsonResponse(200, { candidates: [{ content: { parts: [{ text }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5, totalTokenCount: 15 } });
    fetchMock.mockResolvedValueOnce(wrap('not json {{')).mockResolvedValueOnce(wrap(JSON.stringify(recipe)));
    const token = signTestToken({ userId: 'genUser1', name: 'gen', businessId: 'bizGen', businessRole: 'owner' });
    const res = await request(app).post('/api/v1/ai/generate').set('Authorization', `Bearer ${token}`).send({ prompt: 'מרק עגבניות' });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const all = await rows();
    expect(all).toHaveLength(2);
    expect(all.every(r => r.feature === 'recipe_generate' && r.businessId === 'bizGen' && r.userId === 'genUser1')).toBe(true);
    expect(all.map(r => r.outcome).sort()).toEqual(['accepted', 'rejected']);
    expect(all.find(r => r.outcome === 'rejected').rejectCode).toBe('retried');
  });
});

describe('plan 580 - outcome on the row', () => {
  const menuToken = () => signTestToken({ userId: 'outUser1', name: 'o', businessId: 'bizOut', businessRole: 'owner' });
  const menuPost = () => request(app).post('/api/v1/ai/generate-menu').set('Authorization', `Bearer ${menuToken()}`).send({ rawText: 'x' });

  it('a successful call has outcome accepted', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, OK_WITH_USAGE));
    await call(fakeLog());
    expect((await rows())[0].outcome).toBe('accepted');
  });

  it('a refused menu draft marks the row rejected with its code', async () => {
    const answer = JSON.stringify({ name: 'a', servingType: 'buffet', guestCount: 5, sections: [] });
    fetchMock.mockResolvedValue(jsonResponse(200, { candidates: [{ content: { parts: [{ text: answer }] } }] }));
    const res = await menuPost();
    expect(res.status).toBe(502);
    const all = await rows();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ ok: true, outcome: 'rejected', rejectCode: 'no_recipes' });
  });

  it('a call that failed at Gemini gets no outcome', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { error: { message: 'boom' } }));
    await call(fakeLog());
    expect((await rows())[0].outcome).toBeUndefined();
  });
});

describe('GET /api/v1/admin/ai-usage', () => {
  const adminToken = () => signTestToken({ userId: 'platAdmin1', role: 'admin', name: 'admin', businessId: 'bizAdmin' });
  const ownerToken = () => signTestToken({ userId: 'someOwner1', name: 'o', businessId: 'bizA', businessRole: 'owner' });
  const get = (qs, token = adminToken()) => request(app).get(`/api/v1/admin/ai-usage${qs}`).set('Authorization', `Bearer ${token}`);

  async function seed() {
    const base = { ok: true, model: 'gemini-3.1-flash-lite', latencyMs: 10, at: 1 };
    await testDb().collection('businesses').insertMany([{ _id: 'bizA', name: 'Alpha' }, { _id: 'bizB', name: 'Beta' }]);
    await testDb().collection('aiUsage').insertMany([
      { ...base, businessId: 'bizA', feature: 'parse_text', inputTokens: 100, outputTokens: 50, totalTokens: 150, estCostUsd: 0.1, day: '2026-11-02' },
      { ...base, businessId: 'bizA', feature: 'recipe_generate', ok: false, inputTokens: 0, outputTokens: 0, totalTokens: 0, estCostUsd: 0, day: '2026-11-03' },
      { ...base, businessId: 'bizB', feature: 'parse_text', inputTokens: 200, outputTokens: 100, totalTokens: 300, estCostUsd: 0.2, day: '2026-11-03' },
      { ...base, businessId: 'bizB', feature: 'parse_text', inputTokens: 5, outputTokens: 5, totalTokens: 10, estCostUsd: 0.5, day: '2026-12-20' },
    ]);
  }

  beforeEach(async () => {
    await testDb().collection('businesses').deleteMany({ _id: { $in: ['bizA', 'bizB'] } });
    await seed();
  });

  it('groups by business with labels and totals', async () => {
    const res = await get('?from=2026-11-01&to=2026-11-30&groupBy=business');
    expect(res.status).toBe(200);
    expect(res.body.pricesAsOf).toBe('2026-11-10');
    const byKey = Object.fromEntries(res.body.rows.map(r => [r.key, r]));
    expect(byKey.bizA).toMatchObject({ label: 'Alpha', calls: 2, failedCalls: 1, totalTokens: 150, estCostUsd: 0.1 });
    expect(byKey.bizB).toMatchObject({ label: 'Beta', calls: 1, totalTokens: 300, estCostUsd: 0.2 });
    expect(res.body.totals).toMatchObject({ calls: 3, failedCalls: 1, inputTokens: 300, outputTokens: 150, totalTokens: 450, estCostUsd: 0.3 });
  });

  it('counts rejected answers as failed and splits failures by reason', async () => {
    const base = { ok: true, model: 'gemini-3.1-flash-lite', latencyMs: 10, at: 1, inputTokens: 0, outputTokens: 0, totalTokens: 0, estCostUsd: 0, day: '2026-11-05', businessId: 'bizC', feature: 'menu_generate' };
    await testDb().collection('aiUsage').insertMany([
      { ...base, outcome: 'rejected', rejectCode: 'no_sections' },
      { ...base, outcome: 'rejected', rejectCode: 'no_sections' },
      { ...base, ok: false, errorCode: 'timeout' },
      { ...base },
    ]);
    const res = await get('?from=2026-11-05&to=2026-11-05&groupBy=business');
    const row = res.body.rows.find(r => r.key === 'bizC');
    expect(row).toMatchObject({ calls: 4, failedCalls: 3, failures: { no_sections: 2, timeout: 1 } });
    expect(res.body.totals.failures).toBeUndefined();
  });

  it('groups by feature, model and day; drills into one business', async () => {
    const byFeature = await get('?from=2026-11-01&to=2026-11-30&groupBy=feature');
    expect(byFeature.body.rows.find(r => r.key === 'parse_text')).toMatchObject({ calls: 2 });
    const drill = await get('?from=2026-11-01&to=2026-11-30&groupBy=feature&businessId=bizA');
    expect(drill.body.rows.map(r => r.key).sort()).toEqual(['parse_text', 'recipe_generate']);
    expect(drill.body.totals.calls).toBe(2);
    const byModel = await get('?from=2026-11-01&to=2026-12-31&groupBy=model');
    expect(byModel.body.rows).toHaveLength(1);
    expect(byModel.body.rows[0].calls).toBe(4);
    const byDay = await get('?from=2026-11-01&to=2026-11-30&groupBy=day');
    expect(byDay.body.rows.map(r => r.key).sort()).toEqual(['2026-11-02', '2026-11-03']);
  });

  it('rejects bad groupBy and bad ranges', async () => {
    const g = await get('?groupBy=nope');
    expect(g.status).toBe(400);
    expect(g.body.code).toBe('BAD_GROUP_BY');
    const r1 = await get('?from=2026-11-30&to=2026-11-01');
    expect(r1.body.code).toBe('BAD_RANGE');
    const r2 = await get('?from=2024-01-01&to=2026-01-01');
    expect(r2.status).toBe(400);
    expect(r2.body.code).toBe('BAD_RANGE');
    const r3 = await get('?from=garbage&to=2026-01-01');
    expect(r3.body.code).toBe('BAD_RANGE');
  });

  it('defaults to the current month', async () => {
    const res = await get('');
    expect(res.status).toBe(200);
    expect(res.body.from).toMatch(/^\d{4}-\d{2}-01$/);
    expect(res.body.groupBy).toBe('business');
  });

  it('is platform-admin only', async () => {
    expect((await get('', ownerToken())).status).toBe(403);
    expect((await request(app).get('/api/v1/admin/ai-usage')).status).toBe(401);
  });

  it('format=csv returns text/csv with a header row', async () => {
    const res = await get('?from=2026-11-01&to=2026-11-30&groupBy=business&format=csv');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/^text\/csv; charset=utf-8/);
    expect(res.headers['content-disposition']).toContain('ai-usage-2026-11-01-2026-11-30.csv');
    const lines = res.text.trim().split('\n');
    expect(lines[0]).toBe('key,label,calls,failedCalls,inputTokens,outputTokens,totalTokens,estCostUsd');
    expect(lines).toHaveLength(3);
  });
});
