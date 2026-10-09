'use strict';
/**
 * Plan 395 — tests for the Gemini model chain (mocked fetch, no Gemini); the admin route
 * tests at the end use the in-memory Mongo test app.
 */

const {
  DEFAULT_MODELS,
  MODEL_DAILY_BUDGETS,
  callGemini,
  getModelStatus,
  isDailyQuota,
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
    expect(DEFAULT_MODELS.every(m => m in MODEL_DAILY_BUDGETS)).toBe(true);
  });

  it('GEMINI_MODELS overrides the order', async () => {
    process.env.GEMINI_MODELS = ' gemini-3.5-flash , gemini-2.5-flash ';
    expect(modelChain()).toEqual(['gemini-3.5-flash', 'gemini-2.5-flash']);
    fetchMock.mockResolvedValue(jsonResponse(200, OK_DATA));
    const result = await call(fakeLog());
    expect(result.model).toBe('gemini-3.5-flash');
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

  it('a model the chain does not allow is ignored in favour of the chain first', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, OK_DATA));
    const result = await call(fakeLog(), { model: 'not-a-model' });
    expect(result.model).toBe(DEFAULT_MODELS[0]);
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
  it('needsVision skips models outside the vision set', async () => {
    process.env.GEMINI_MODELS = 'gemma-4-31b-it,gemini-3.1-flash-lite';
    fetchMock.mockResolvedValue(jsonResponse(200, OK_DATA));
    const result = await call(fakeLog(), { needsVision: true });
    expect(result.model).toBe('gemini-3.1-flash-lite');
    expect(fetchMock).toHaveBeenCalledTimes(1);
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
    process.env.GEMINI_MODELS = 'gemini-3.5-flash';
    expect(modelChain()).toEqual(['gemini-3.5-flash']);
  });

  it('the admin order and on/off decide the chain', async () => {
    setChainSettingsForTests([
      { name: 'gemini-3.5-flash', enabled: true },
      { name: 'gemini-3.1-flash-lite', enabled: false },
      { name: 'gemini-2.5-flash', enabled: true },
    ]);
    expect(modelChain()).toEqual(['gemini-3.5-flash', 'gemini-2.5-flash']);
    fetchMock.mockResolvedValue(jsonResponse(200, OK_DATA));
    expect((await call(fakeLog())).model).toBe('gemini-3.5-flash');
  });

  it('validateChainSettings rejects bad lists', () => {
    expect(validateChainSettings('x')).toBe('models must be an array');
    expect(validateChainSettings([{ name: 'gemini-3.5-flash' }])).toMatch(/boolean/);
    expect(validateChainSettings([{ name: 'not-a-model', enabled: true }])).toBe('unknown model');
    expect(validateChainSettings([
      { name: 'gemini-3.5-flash', enabled: true },
      { name: 'gemini-3.5-flash', enabled: false },
    ])).toBe('duplicate model');
    expect(validateChainSettings([{ name: 'gemini-3.5-flash', enabled: false }])).toBe('at least one model must stay on');
    expect(validateChainSettings([{ name: 'gemini-3.5-flash', enabled: true }])).toBeNull();
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
    expect(list.body.models.every(m => m.enabled)).toBe(true);

    const bad = await request(app).put('/api/v1/ai/models').set('Authorization', admin())
      .send({ models: [{ name: 'gemini-3.5-flash', enabled: false }] });
    expect(bad.status).toBe(400);

    const saved = await request(app).put('/api/v1/ai/models').set('Authorization', admin())
      .send({ models: [{ name: 'gemini-3.5-flash', enabled: true }, { name: 'gemini-3.1-flash-lite', enabled: false }] });
    expect(saved.status).toBe(200);
    expect(saved.body.models[0]).toMatchObject({ name: 'gemini-3.5-flash', enabled: true });
    expect(saved.body.models.filter(m => m.enabled).map(m => m.name)).toEqual(['gemini-3.5-flash']);

    resetForTests(); // a restart: the saved chain comes back from Mongo
    const usage = await request(app).get('/api/v1/ai/usage');
    expect(usage.body.models.map(m => m.name)).toEqual(['gemini-3.5-flash']);
    expect(usage.body.budget).toBe(MODEL_DAILY_BUDGETS['gemini-3.5-flash']);

    const reset = await request(app).delete('/api/v1/ai/models').set('Authorization', admin());
    expect(reset.status).toBe(200);
    expect(reset.body.models.filter(m => m.enabled).map(m => m.name)).toEqual(DEFAULT_MODELS);
  });
});
