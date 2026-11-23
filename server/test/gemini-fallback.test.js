'use strict';
/**
 * Plan 701 — callGemini({ fallback, deadlineMs }): the front desk moves to the next free model of the chain when
 * Google is overloaded. fetch is stubbed; the ledger is read from aiUsage (in-memory Mongo test app). Without
 * `fallback` the one-model behaviour of plans 395 / 614 is unchanged.
 */

const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app');
const { DEFAULT_MODELS, callGemini, resetForTests } = require('../services/gemini-client');
const { _waitForUsageWritesForTests } = require('../services/ai-usage');

const [A, B, C] = DEFAULT_MODELS;

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
const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const modelOf = c => /models\/([^:]+):generateContent/.exec(c[0])[1];
const fakeLog = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });

let fetchMock;
let seq = 0;
let businessId;

const call = (log, extra = {}) => callGemini({
  body: { contents: [] }, timeoutMs: 1000, log, eventPrefix: 'frontdesk.turn',
  usage: { businessId, feature: 'frontdesk_turn' }, ...extra,
});
const fb = (log, extra = {}) => call(log, { fallback: true, ...extra });
const models = () => fetchMock.mock.calls.map(modelOf);

beforeAll(async () => {
  await buildTestApp();
}, 60000);

afterAll(async () => {
  await teardownTestApp();
});

beforeEach(async () => {
  await testDb().collection('GEMINI_USAGE').deleteMany({});
  resetForTests();
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.GEMINI_MODELS = [A, B, C].join(',');
  businessId = `b_fallback${++seq}`;
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(async () => {
  await _waitForUsageWritesForTests();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete process.env.GEMINI_MODELS;
});

describe('fallback: true', () => {
  it('a 503 on A goes to B in the same request, with two ledger rows and one fallback log', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(503, { error: { message: 'busy' } })).mockResolvedValue(jsonResponse(200, OK_DATA));
    const log = fakeLog();
    const result = await fb(log);
    expect(result).toMatchObject({ kind: 'ok', model: B });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain(`models/${B}:generateContent`);
    await _waitForUsageWritesForTests();
    const rows = await testDb().collection('aiUsage').find({ businessId }).toArray();
    expect(rows.map(r => r.model).sort()).toEqual([A, B].sort());
    const fallbacks = log.warn.mock.calls.map(c => c[0]).filter(e => e.event === 'frontdesk.turn.fallback');
    expect(fallbacks).toHaveLength(1);
    expect(fallbacks[0]).toMatchObject({ from: A, to: B });
  });

  it('a timeout on A goes to B', async () => {
    const timeout = Object.assign(new Error('t'), { name: 'TimeoutError' });
    fetchMock.mockRejectedValueOnce(timeout).mockResolvedValue(jsonResponse(200, OK_DATA));
    const result = await fb(fakeLog());
    expect(result).toMatchObject({ kind: 'ok', model: B });
    expect(models()).toEqual([A, B]);
  });

  it('a per-minute 429 goes to B', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(429, MINUTE_429)).mockResolvedValue(jsonResponse(200, OK_DATA));
    const result = await fb(fakeLog());
    expect(result).toMatchObject({ kind: 'ok', model: B });
    expect(models()).toEqual([A, B]);
  });

  it('a daily-quota 429 marks A exhausted and calls B', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(429, DAILY_429)).mockResolvedValue(jsonResponse(200, OK_DATA));
    const result = await fb(fakeLog());
    expect(result).toMatchObject({ kind: 'ok', model: B });
    expect(models()).toEqual([A, B]);
    // A stays exhausted: the next request starts on B.
    fetchMock.mockClear();
    fetchMock.mockResolvedValue(jsonResponse(200, OK_DATA));
    const again = await fb(fakeLog(), { model: undefined });
    expect(again).toMatchObject({ kind: 'ok', model: B });
  });

  it('a 400 does not fall back', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: { message: 'bad' } }));
    const result = await fb(fakeLog());
    expect(result).toMatchObject({ kind: 'gemini_error', status: 400 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('every model busy: 4 calls cycling A, B, C, A, then the 503', async () => {
    fetchMock.mockResolvedValue(jsonResponse(503, { error: { message: 'busy' } }));
    const result = await fb(fakeLog());
    expect(result).toMatchObject({ kind: 'gemini_error', status: 503 });
    expect(models()).toEqual([A, B, C, A]);
  });

  it('a chain of one model retries the same model', async () => {
    process.env.GEMINI_MODELS = A;
    resetForTests();
    fetchMock.mockResolvedValueOnce(jsonResponse(503, {})).mockResolvedValue(jsonResponse(200, OK_DATA));
    const result = await fb(fakeLog());
    expect(result).toMatchObject({ kind: 'ok', model: A });
    expect(models()).toEqual([A, A]);
  });

  it('deadlineMs: no call starts with less than 2000 ms left', async () => {
    const t0 = Date.now();
    let clock = 0;
    vi.spyOn(Date, 'now').mockImplementation(() => t0 + clock);
    const timeouts = [];
    fetchMock.mockImplementation(async () => {
      clock += 2500;
      return jsonResponse(503, { error: { message: 'busy' } });
    });
    const spy = vi.spyOn(AbortSignal, 'timeout').mockImplementation(ms => { timeouts.push(ms); return new AbortController().signal; });
    const result = await fb(fakeLog(), { deadlineMs: 5000 });
    spy.mockRestore();
    expect(result).toMatchObject({ kind: 'gemini_error', status: 503 });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(timeouts).toEqual([1000, 1000]);
  });
});

describe('without fallback (the default path)', () => {
  it('a 503 retries the same model only', async () => {
    fetchMock.mockResolvedValue(jsonResponse(503, {}));
    const result = await call(fakeLog());
    expect(result).toMatchObject({ kind: 'gemini_error', status: 503 });
    expect(models()).toEqual([A, A, A, A]);
  });

  it('a timeout ends the request at once', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('t'), { name: 'TimeoutError' }));
    const result = await call(fakeLog());
    expect(result).toMatchObject({ kind: 'timeout', model: A });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a daily quota stops after one call', async () => {
    fetchMock.mockResolvedValue(jsonResponse(429, DAILY_429));
    const result = await call(fakeLog());
    expect(result).toMatchObject({ kind: 'model_exhausted', model: A, nextModel: B });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
