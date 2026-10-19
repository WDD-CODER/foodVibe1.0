'use strict';
/**
 * Plans 395 + 412 — tests for the Gemini model chain (mocked fetch, no Gemini); the admin route
 * tests at the end use the in-memory Mongo test app.
 */

const {
  DEFAULT_MODELS,
  MODEL_DAILY_BUDGETS,
  callGemini,
  getChainSettings,
  getModelStatus,
  isDailyQuota,
  isVisionModel,
  modelCatalog,
  modelChain,
  nextResetAt,
  quotaDayKey,
  summarizeBudget,
  resetForTests,
  setChainSettingsForTests,
  validateChainSettings,
} = require('../services/gemini-client');

const DAILY_429 = {
  error: {
    code: 429,
    message: 'You exceeded your current quota',
    details: [{ violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier', quotaValue: '20' }] }],
  },
};
const MINUTE_429 = {
  error: {
    code: 429,
    message: 'Rate limit',
    details: [{ violations: [{ quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier', quotaValue: '15' }] }],
  },
};
const OK_DATA = { candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] };

function jsonResponse(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

/** Model name a mocked fetch call was made to. */
function modelOf(call) {
  return /models\/([^:]+):generateContent/.exec(call[0])[1];
}

function fakeLog() {
  return { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

const call = (log, extra = {}) =>
  callGemini({ body: { contents: [] }, timeoutMs: 1000, log, eventPrefix: 'ai.test', ...extra });

let fetchMock;

beforeEach(() => {
  resetForTests();
  delete process.env.GEMINI_MODELS;
  process.env.GEMINI_API_KEY = 'test-key';
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('model chain', () => {
  it('uses the default order when GEMINI_MODELS is unset', () => {
    expect(modelChain()).toEqual(DEFAULT_MODELS);
    expect(DEFAULT_MODELS[0]).toBe('gemini-3.1-flash-lite');
    expect(modelCatalog()).toEqual(DEFAULT_MODELS);
  });

  it('DEFAULT_MODELS is sorted by MODEL_DAILY_BUDGETS descending (ties allowed; unknown budgets last)', () => {
    const budgets = DEFAULT_MODELS.map(m => MODEL_DAILY_BUDGETS[m] ?? null);
    const firstUnknown = budgets.indexOf(null);
    const known = firstUnknown === -1 ? budgets : budgets.slice(0, firstUnknown);
    if (firstUnknown !== -1) expect(budgets.slice(firstUnknown).every(b => b === null)).toBe(true);
    for (let i = 1; i < known.length; i++) expect(known[i]).toBeLessThanOrEqual(known[i - 1]);
    expect(Object.keys(MODEL_DAILY_BUDGETS).every(m => DEFAULT_MODELS.includes(m))).toBe(true);
  });

  it('GEMINI_MODELS overrides the order', async () => {
    process.env.GEMINI_MODELS = ' gemini-3.6-flash , gemini-2.5-flash ';
    expect(modelChain()).toEqual(['gemini-3.6-flash', 'gemini-2.5-flash']);
    fetchMock.mockResolvedValue(jsonResponse(200, OK_DATA));
    const result = await call(fakeLog());
    expect(result.model).toBe('gemini-3.6-flash');
  });

  it('calls the first model and returns its data', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, OK_DATA));
    const result = await call(fakeLog());
    expect(result).toEqual({ kind: 'ok', model: DEFAULT_MODELS[0], data: OK_DATA });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(modelOf(fetchMock.mock.calls[0])).toBe(DEFAULT_MODELS[0]);
  });
});

describe('daily quota — one call, the user decides the switch', () => {
  it('a daily-quota 429 stops after that one call and names the next model', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(429, DAILY_429)).mockResolvedValue(jsonResponse(200, OK_DATA));
    const log = fakeLog();

    const result = await call(log);
    expect(result).toMatchObject({ kind: 'model_exhausted', model: DEFAULT_MODELS[0], nextModel: DEFAULT_MODELS[1] });
    expect(typeof result.resetAt).toBe('string');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const exhausted = log.warn.mock.calls.map(c => c[0]).find(e => e.event === 'ai.model.exhausted');
    expect(exhausted).toMatchObject({ model: DEFAULT_MODELS[0], nextModel: DEFAULT_MODELS[1] });

    // Without a choice, the next request is refused with no Gemini call at all.
    const again = await call(log);
    expect(again).toMatchObject({ kind: 'model_exhausted', model: DEFAULT_MODELS[0], nextModel: DEFAULT_MODELS[1] });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // The user switches: one call, on the model they picked.
    const switched = await call(log, { model: DEFAULT_MODELS[1] });
    expect(switched).toMatchObject({ kind: 'ok', model: DEFAULT_MODELS[1] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(modelOf(fetchMock.mock.calls[1])).toBe(DEFAULT_MODELS[1]);

    const status = await getModelStatus();
    expect(status[0]).toMatchObject({ name: DEFAULT_MODELS[0], exhausted: true, remaining: 0 });
    expect(status[0].resetAt).toBe(result.resetAt);
    const budget1 = MODEL_DAILY_BUDGETS[DEFAULT_MODELS[1]];
    expect(status[1]).toEqual({
      name: DEFAULT_MODELS[1], exhausted: false, resetAt: null, dailyBudget: budget1, used: 0, remaining: budget1,
    });
  });

  it('never more than one Gemini call per request, even when every model is out', async () => {
    fetchMock.mockResolvedValue(jsonResponse(429, DAILY_429));
    for (const model of DEFAULT_MODELS) {
      const before = fetchMock.mock.calls.length;
      await call(fakeLog(), { model });
      expect(fetchMock.mock.calls.length - before).toBe(1);
    }
    const last = await call(fakeLog());
    expect(last.kind).toBe('all_exhausted');
    expect(typeof last.resetAt).toBe('string');
    expect(fetchMock).toHaveBeenCalledTimes(DEFAULT_MODELS.length);
  });

  it('a catalog model the chain has switched off is ignored in favour of the chain first', async () => {
    process.env.GEMINI_MODELS = 'gemini-3.1-flash-lite';
    fetchMock.mockResolvedValue(jsonResponse(200, OK_DATA));
    const result = await call(fakeLog(), { model: 'gemini-2.5-flash' });
    expect(result.model).toBe('gemini-3.1-flash-lite');
  });

  it('a model comes back after its reset time', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-09T12:00:00Z'));
    fetchMock.mockResolvedValueOnce(jsonResponse(429, DAILY_429)).mockResolvedValue(jsonResponse(200, OK_DATA));
    expect((await call(fakeLog())).kind).toBe('model_exhausted');

    vi.setSystemTime(new Date('2026-10-10T08:00:01Z')); // past midnight in Los Angeles (PDT, UTC-7)
    const result = await call(fakeLog());
    expect(result).toMatchObject({ kind: 'ok', model: DEFAULT_MODELS[0] });
  });
});

describe('other failures return on the model tried', () => {
  it('per-minute 429 returns on the model tried', async () => {
    fetchMock.mockResolvedValue(jsonResponse(429, MINUTE_429));
    const result = await call(fakeLog());
    expect(result).toEqual({ kind: 'gemini_error', model: DEFAULT_MODELS[0], status: 429, message: 'Rate limit' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('5xx returns on the model tried', async () => {
    fetchMock.mockResolvedValue(jsonResponse(503, { error: { message: 'overloaded' } }));
    const result = await call(fakeLog());
    expect(result).toEqual({ kind: 'gemini_error', model: DEFAULT_MODELS[0], status: 503, message: 'overloaded' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('timeout returns on the model tried', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('timed out'), { name: 'TimeoutError' }));
    const result = await call(fakeLog());
    expect(result).toEqual({ kind: 'timeout', model: DEFAULT_MODELS[0] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('network error returns on the model tried', async () => {
    fetchMock.mockRejectedValue(new Error('ECONNRESET'));
    const result = await call(fakeLog());
    expect(result).toEqual({ kind: 'network', model: DEFAULT_MODELS[0] });
  });
});

describe('vision', () => {
  it('every kept model accepts inline images (gemini-3-flash-preview included)', () => {
    expect(DEFAULT_MODELS.filter(m => !isVisionModel(m))).toEqual([]);
    expect(isVisionModel('gemini-3-flash-preview')).toBe(true);
    expect(isVisionModel('gemma-4-31b-it')).toBe(false);
  });

  it('needsVision still calls the chain first', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, OK_DATA));
    const result = await call(fakeLog(), { needsVision: true });
    expect(result.model).toBe(DEFAULT_MODELS[0]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('removed models (plan 412)', () => {
  it('a saved chain naming gemini-3.7-flash skips it, flags it removed, and never calls it', async () => {
    setChainSettingsForTests([
      { name: 'gemini-3.7-flash', enabled: true },
      { name: 'gemini-2.5-flash', enabled: true },
    ]);
    expect(modelChain()).toEqual(['gemini-2.5-flash']);
    const settings = await getChainSettings();
    expect(settings.find(m => m.name === 'gemini-3.7-flash')).toMatchObject({ removed: true, enabled: false });
    expect(settings.filter(m => !m.removed).map(m => m.name).sort()).toEqual([...DEFAULT_MODELS].sort());
    fetchMock.mockResolvedValue(jsonResponse(200, OK_DATA));
    expect((await call(fakeLog())).model).toBe('gemini-2.5-flash');
    expect(fetchMock.mock.calls.map(modelOf)).not.toContain('gemini-3.7-flash');
  });

  it('a saved chain with only removed models falls back to the base chain', () => {
    setChainSettingsForTests([{ name: 'gemini-3.7-flash', enabled: true }]);
    expect(modelChain()).toEqual(DEFAULT_MODELS);
  });

  it('GEMINI_MODELS naming gemini-3.5-flash skips it, flags it removed, and never calls it', async () => {
    process.env.GEMINI_MODELS = 'gemini-3.5-flash,gemini-3.6-flash';
    expect(modelChain()).toEqual(['gemini-3.6-flash']);
    const settings = await getChainSettings();
    expect(settings.find(m => m.name === 'gemini-3.5-flash')).toMatchObject({ removed: true, enabled: false });
    fetchMock.mockResolvedValue(jsonResponse(200, OK_DATA));
    expect((await call(fakeLog())).model).toBe('gemini-3.6-flash');
    expect(fetchMock.mock.calls.map(modelOf)).not.toContain('gemini-3.5-flash');
  });

  it('GEMINI_MODELS with only removed names falls back to DEFAULT_MODELS', () => {
    process.env.GEMINI_MODELS = 'gemini-3.5-flash';
    expect(modelChain()).toEqual(DEFAULT_MODELS);
  });

  it('an explicit request for a removed model is refused without a call', async () => {
    const log = fakeLog();
    const result = await call(log, { model: 'gemini-3.7-flash' });
    expect(result).toEqual({ kind: 'model_removed', model: 'gemini-3.7-flash' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(log.warn.mock.calls.map(c => c[0].event)).toContain('ai.test.model_removed');
  });

  it('getModelStatus (usage) lists only kept models', async () => {
    setChainSettingsForTests([{ name: 'gemini-3.7-flash', enabled: true }, { name: 'gemini-3.8-flash', enabled: true }]);
    expect((await getModelStatus()).map(m => m.name)).toEqual(['gemini-3.8-flash']);
  });
});

describe('helpers', () => {
  it('summarizeBudget sums known budgets; an exhausted model counts as fully used', () => {
    const models = [
      { name: 'a', dailyBudget: 500, remaining: 480 },
      { name: 'b', dailyBudget: 20, remaining: 0 },
      { name: 'c', dailyBudget: null, remaining: null },
    ];
    expect(summarizeBudget(models)).toEqual({ budget: 520, used: 40, remaining: 480 });
  });

  it('quotaDayKey is the calendar date in Los Angeles', () => {
    expect(quotaDayKey(new Date('2026-10-10T03:00:00Z'))).toBe('2026-10-09');
    expect(quotaDayKey(new Date('2026-10-10T07:00:00Z'))).toBe('2026-10-10');
  });

  it('isDailyQuota tells a per-day quota from a per-minute one', () => {
    expect(isDailyQuota(DAILY_429)).toBe(true);
    expect(isDailyQuota(MINUTE_429)).toBe(false);
    expect(isDailyQuota({})).toBe(false);
  });

  it('nextResetAt is the next midnight in Los Angeles', () => {
    // PDT (UTC-7): midnight = 07:00Z
    expect(nextResetAt(new Date('2026-10-09T12:00:00Z')).toISOString()).toBe('2026-10-10T07:00:00.000Z');
    // Still Oct 9 in LA at 03:00Z on Oct 10
    expect(nextResetAt(new Date('2026-10-10T03:00:00Z')).toISOString()).toBe('2026-10-10T07:00:00.000Z');
    // PST (UTC-8): midnight = 08:00Z
    expect(nextResetAt(new Date('2026-12-01T20:00:00Z')).toISOString()).toBe('2026-12-02T08:00:00.000Z');
    // DST ends Nov 1 2026: the evening before is PDT, the next midnight is in PST
    expect(nextResetAt(new Date('2026-10-31T20:00:00Z')).toISOString()).toBe('2026-11-01T07:00:00.000Z');
    expect(nextResetAt(new Date('2026-11-01T12:00:00Z')).toISOString()).toBe('2026-11-02T08:00:00.000Z');
  });
});

describe('admin chain settings', () => {
  it('GEMINI_MODELS sets the chain when no admin settings are saved', () => {
    process.env.GEMINI_MODELS = 'gemini-3.6-flash';
    expect(modelChain()).toEqual(['gemini-3.6-flash']);
  });

  it('the admin order and on/off decide the chain', async () => {
    setChainSettingsForTests([
      { name: 'gemini-3.6-flash', enabled: true },
      { name: 'gemini-3.1-flash-lite', enabled: false },
      { name: 'gemini-2.5-flash', enabled: true },
    ]);
    expect(modelChain()).toEqual(['gemini-3.6-flash', 'gemini-2.5-flash']);
    fetchMock.mockResolvedValue(jsonResponse(200, OK_DATA));
    expect((await call(fakeLog())).model).toBe('gemini-3.6-flash');
  });

  it('validateChainSettings rejects bad lists', () => {
    expect(validateChainSettings('x')).toBe('models must be an array');
    expect(validateChainSettings([{ name: 'gemini-3.6-flash' }])).toMatch(/boolean/);
    expect(validateChainSettings([{ name: 'not-a-model', enabled: true }])).toBe('removed model');
    expect(validateChainSettings([{ name: 'gemini-3.7-flash', enabled: true }])).toBe('removed model');
    expect(validateChainSettings([
      { name: 'gemini-3.6-flash', enabled: true },
      { name: 'gemini-3.6-flash', enabled: false },
    ])).toBe('duplicate model');
    expect(validateChainSettings([{ name: 'gemini-3.6-flash', enabled: false }])).toBe('at least one model must stay on');
    expect(validateChainSettings([{ name: 'gemini-3.6-flash', enabled: true }])).toBeNull();
    // A removed model sent back switched off (the admin screen lists it) is accepted and dropped.
    expect(validateChainSettings([
      { name: 'gemini-3.6-flash', enabled: true },
      { name: 'gemini-3.7-flash', enabled: false },
    ])).toBeNull();
  });
});

describe('GET / PUT / DELETE /api/v1/ai/models (admin)', () => {
  const request = require('supertest');
  const { buildTestApp, teardownTestApp, signTestToken } = require('./helpers/app');
  const admin = () => `Bearer ${signTestToken({ userId: 'admin1', role: 'admin' })}`;
  const user = () => `Bearer ${signTestToken({ userId: 'user1', role: 'user' })}`;
  let app;

  beforeAll(async () => {
    app = await buildTestApp();
  }, 60000);

  afterAll(async () => {
    await teardownTestApp();
  });

  it('a regular user gets 403', async () => {
    const res = await request(app).get('/api/v1/ai/models').set('Authorization', user());
    expect(res.status).toBe(403);
  });

  it('admin reads, saves, and resets the chain; /usage follows it', async () => {
    const list = await request(app).get('/api/v1/ai/models').set('Authorization', admin());
    expect(list.status).toBe(200);
    expect(list.body.models.map(m => m.name)).toEqual(DEFAULT_MODELS);
    expect(list.body.models.every(m => m.enabled && !m.removed)).toBe(true);

    const bad = await request(app).put('/api/v1/ai/models').set('Authorization', admin())
      .send({ models: [{ name: 'gemini-3.6-flash', enabled: false }] });
    expect(bad.status).toBe(400);

    const saved = await request(app).put('/api/v1/ai/models').set('Authorization', admin())
      .send({ models: [{ name: 'gemini-3.6-flash', enabled: true }, { name: 'gemini-3.1-flash-lite', enabled: false }] });
    expect(saved.status).toBe(200);
    expect(saved.body.models[0]).toMatchObject({ name: 'gemini-3.6-flash', enabled: true });
    expect(saved.body.models.filter(m => m.enabled).map(m => m.name)).toEqual(['gemini-3.6-flash']);

    resetForTests(); // a restart: the saved chain comes back from Mongo
    const usage = await request(app).get('/api/v1/ai/usage');
    expect(usage.body.models.map(m => m.name)).toEqual(['gemini-3.6-flash']);
    expect(usage.body.budget).toBe(MODEL_DAILY_BUDGETS['gemini-3.6-flash']);

    const reset = await request(app).delete('/api/v1/ai/models').set('Authorization', admin());
    expect(reset.status).toBe(200);
    expect(reset.body.models.filter(m => m.enabled).map(m => m.name)).toEqual(DEFAULT_MODELS);
  });

  it('an old saved chain shows removed models as removed; usage lists only kept ones; saving drops them', async () => {
    const mongoose = require('mongoose');
    await mongoose.connection.db.collection('GEMINI_USAGE').updateOne(
      { _id: 'chain-settings' },
      { $set: { models: [{ name: 'gemini-3.7-flash', enabled: true }, { name: 'gemini-3.8-flash', enabled: true }] } },
      { upsert: true },
    );
    resetForTests();

    const list = await request(app).get('/api/v1/ai/models').set('Authorization', admin());
    expect(list.body.models.find(m => m.name === 'gemini-3.7-flash')).toMatchObject({ removed: true, enabled: false });
    const usage = await request(app).get('/api/v1/ai/usage');
    expect(usage.body.models.map(m => m.name)).toEqual(['gemini-3.8-flash']);

    // The admin screen sends the whole list back, removed entry included (off): saved without it.
    const saved = await request(app).put('/api/v1/ai/models').set('Authorization', admin())
      .send({ models: list.body.models.map(m => ({ name: m.name, enabled: m.enabled })) });
    expect(saved.status).toBe(200);
    expect(saved.body.models.some(m => m.removed)).toBe(false);

    const enabledRemoved = await request(app).put('/api/v1/ai/models').set('Authorization', admin())
      .send({ models: [{ name: 'gemini-3.7-flash', enabled: true }, { name: 'gemini-3.8-flash', enabled: true }] });
    expect(enabledRemoved.status).toBe(400);

    await request(app).delete('/api/v1/ai/models').set('Authorization', admin());
  });
});
