'use strict';
/**
 * Plan 701 — callGemini({ fallback, deadlineMs }): the front desk moves to the next free model when Google is
 * overloaded. Fetch is stubbed (no Gemini); the ledger is read from the in-memory Mongo of the test app.
 */

process.env.GEMINI_API_KEY = 'test-key';
const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app');
const { DEFAULT_MODELS, callGemini, getModelStatus, resetForTests } = require('../services/gemini-client');
const { _waitForUsageWritesForTests } = require('../services/ai-usage');
const { clearCapCache } = require('../services/ai-cap');

const [A, B, C] = DEFAULT_MODELS;
const DAILY_429 = { error: { details: [{ violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier' }] }] } };
const MINUTE_429 = { error: { message: 'Rate limit', details: [{ violations: [{ quotaId: 'GenerateRequestsPerMinutePerProjectPerModel-FreeTier' }] }] } };
const OK_DATA = { candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] };
const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const busy = () => jsonResponse(503, { error: { message: 'This model is currently experiencing high demand' } });
const timedOut = () => Object.assign(new Error('timed out'), { name: 'TimeoutError' });
const modelOf = c => /models\/([^:]+):generateContent/.exec(c[0])[1];
const fakeLog = () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() });
const events = (log, name) => log.warn.mock.calls.map(c => c[0]).filter(e => e.event === name);

const call = (log, extra = {}) => callGemini({
  body: { contents: [] }, timeoutMs: 1000, log, eventPrefix: 'frontdesk.turn',
  usage: { businessId: 'b_fallback', feature: 'frontdesk_turn' }, ...extra,
});
const ledger = async () => {
  await _waitForUsageWritesForTests();
  return testDb().collection('aiUsage').find({ businessId: 'b_fallback' }).sort({ at: 1 }).toArray();
};

let fetchMock;
beforeAll(async () => { await buildTestApp(); }, 60000);
afterAll(async () => { await teardownTestApp(); });

beforeEach(async () => {
  await _waitForUsageWritesForTests();
  resetForTests();
  clearCapCache();
  process.env.GEMINI_MODELS = [A, B, C].join(',');
  for (const c of ['aiUsage', 'GEMINI_USAGE']) await testDb().collection(c).deleteMany({});
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(async () => {
  await _waitForUsageWritesForTests();
  vi.unstubAllGlobals();
  delete process.env.GEMINI_MODELS;
});

describe('fallback: true', () => {
  it('A 503 then B 200 → ok on B, 2 calls, 2 ledger rows, one fallback log line', async () => {
    fetchMock.mockResolvedValueOnce(busy()).mockResolvedValue(jsonResponse(200, OK_DATA));
    const log = fakeLog();
    const result = await call(log, { fallback: true });
    expect(result).toEqual({ kind: 'ok', model: B, data: OK_DATA });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls.map(modelOf)).toEqual([A, B]);
    expect(String(fetchMock.mock.calls[1][0])).toContain(B);
    expect((await ledger()).map(r => r.model)).toEqual([A, B]);
    const switched = events(log, 'frontdesk.turn.fallback');
    expect(switched).toHaveLength(1);
    expect(switched[0]).toMatchObject({ from: A, to: B, attempt: 1, kind: 'gemini_error', status: 503 });
  });

  it('A timing out then B ok → ok on B', async () => {
    fetchMock.mockRejectedValueOnce(timedOut()).mockResolvedValue(jsonResponse(200, OK_DATA));
    const result = await call(fakeLog(), { fallback: true });
    expect(result).toMatchObject({ kind: 'ok', model: B });
    expect(fetchMock.mock.calls.map(modelOf)).toEqual([A, B]);
  });

  it('A network drop then B ok → ok on B', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNRESET')).mockResolvedValue(jsonResponse(200, OK_DATA));
    expect(await call(fakeLog(), { fallback: true })).toMatchObject({ kind: 'ok', model: B });
  });

  it('A per-minute 429 → B', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(429, MINUTE_429)).mockResolvedValue(jsonResponse(200, OK_DATA));
    expect(await call(fakeLog(), { fallback: true })).toMatchObject({ kind: 'ok', model: B });
    expect(fetchMock.mock.calls.map(modelOf)).toEqual([A, B]);
  });

  it('A daily quota → A marked exhausted and B called', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(429, DAILY_429)).mockResolvedValue(jsonResponse(200, OK_DATA));
    const result = await call(fakeLog(), { fallback: true });
    expect(result).toMatchObject({ kind: 'ok', model: B });
    expect(fetchMock.mock.calls.map(modelOf)).toEqual([A, B]);
    const [statusA] = await getModelStatus([A]);
    expect(statusA.exhausted).toBe(true);
    // The next request starts on B (A is known exhausted).
    const again = await call(fakeLog(), { fallback: true });
    expect(again).toMatchObject({ kind: 'ok', model: B });
    expect(modelOf(fetchMock.mock.calls[2])).toBe(B);
  });

  it('A 400 → no fallback, gemini_error 400 after 1 call', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: { message: 'bad' } }));
    const result = await call(fakeLog(), { fallback: true });
    expect(result).toMatchObject({ kind: 'gemini_error', model: A, status: 400 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('every model 503 → gemini_error 503 after exactly 4 calls, cycling A, B, C, A', async () => {
    fetchMock.mockImplementation(async () => busy());
    const log = fakeLog();
    const result = await call(log, { fallback: true });
    expect(result).toMatchObject({ kind: 'gemini_error', model: A, status: 503 });
    expect(fetchMock.mock.calls.map(modelOf)).toEqual([A, B, C, A]);
    expect(events(log, 'frontdesk.turn.fallback')).toHaveLength(3);
    expect((await ledger())).toHaveLength(4);
  });

  it('a chain of one model → the same model is retried (plan 614)', async () => {
    process.env.GEMINI_MODELS = A;
    fetchMock.mockImplementation(async () => busy());
    const log = fakeLog();
    const result = await call(log, { fallback: true });
    expect(result).toMatchObject({ kind: 'gemini_error', model: A, status: 503 });
    expect(fetchMock.mock.calls.map(modelOf)).toEqual([A, A, A, A]);
    expect(events(log, 'frontdesk.turn.fallback')).toHaveLength(0);
    expect(events(log, 'frontdesk.turn.retry')).toHaveLength(3);
  });

  it('deadlineMs 5000: no call starts with less than 2000 ms left; the last result is returned', async () => {
    const startedAt = Date.now();
    const starts = [];
    fetchMock.mockImplementation(async () => {
      starts.push(Date.now() - startedAt);
      await new Promise(r => setTimeout(r, 1600));
      return busy();
    });
    const result = await call(fakeLog(), { fallback: true, deadlineMs: 5000, timeoutMs: 10000 });
    expect(result).toMatchObject({ kind: 'gemini_error', model: B, status: 503 });
    expect(starts).toHaveLength(2);
    for (const at of starts) expect(5000 - at).toBeGreaterThanOrEqual(2000);
  }, 15000);

  it('deadlineMs cuts the call timeout to the time left', async () => {
    fetchMock.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(init.signal.reason));
    }));
    const startedAt = Date.now();
    const result = await call(fakeLog(), { fallback: true, deadlineMs: 2500, timeoutMs: 60000 });
    expect(result).toEqual({ kind: 'timeout', model: A });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(Date.now() - startedAt).toBeLessThan(10000);
  }, 15000);
});

describe('without fallback (unchanged)', () => {
  it('A 503 every time → 4 calls on A only', async () => {
    fetchMock.mockImplementation(async () => busy());
    const result = await call(fakeLog());
    expect(result).toMatchObject({ kind: 'gemini_error', model: A, status: 503 });
    expect(fetchMock.mock.calls.map(modelOf)).toEqual([A, A, A, A]);
  });

  it('A 503 then 200 → ok on A', async () => {
    fetchMock.mockResolvedValueOnce(busy()).mockResolvedValue(jsonResponse(200, OK_DATA));
    expect(await call(fakeLog())).toMatchObject({ kind: 'ok', model: A });
    expect(fetchMock.mock.calls.map(modelOf)).toEqual([A, A]);
  });

  it('A timeout → returns after 1 call on A', async () => {
    fetchMock.mockRejectedValueOnce(timedOut()).mockResolvedValue(jsonResponse(200, OK_DATA));
    expect(await call(fakeLog())).toEqual({ kind: 'timeout', model: A });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('A per-minute 429 then 200 → ok on A', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(429, MINUTE_429)).mockResolvedValue(jsonResponse(200, OK_DATA));
    expect(await call(fakeLog())).toMatchObject({ kind: 'ok', model: A });
  });

  it('A daily quota → model_exhausted naming B, 1 call', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(429, DAILY_429)).mockResolvedValue(jsonResponse(200, OK_DATA));
    expect(await call(fakeLog())).toMatchObject({ kind: 'model_exhausted', model: A, nextModel: B });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('A 400 → 1 call on A', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, {}));
    expect(await call(fakeLog())).toMatchObject({ kind: 'gemini_error', model: A, status: 400 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
