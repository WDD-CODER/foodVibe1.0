'use strict';
/** Plan 679 (C-AIKEY): keyFor returns the environment key today, and callGemini sends what keyFor returned. */
const { buildTestApp, teardownTestApp } = require('./helpers/app');
const { keyFor } = require('../services/ai-key');
const { callGemini, resetForTests } = require('../services/gemini-client');

beforeAll(async () => { await buildTestApp(); }, 60000);
afterAll(async () => { await teardownTestApp(); });

afterEach(() => { vi.unstubAllGlobals(); });

describe('keyFor', () => {
  it('returns the environment key for a business and for none', () => {
    process.env.GEMINI_API_KEY = 'key-one';
    expect(keyFor('b1')).toBe('key-one');
    expect(keyFor(undefined)).toBe('key-one');
  });

  it('callGemini with a businessId sends the key keyFor returned', async () => {
    resetForTests();
    process.env.GEMINI_API_KEY = 'key-two';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '{}' }] } }] }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const r = await callGemini({
      body: { contents: [] }, timeoutMs: 1000, log, eventPrefix: 'ai.test', usage: { businessId: 'b1', feature: 'parse_text' },
    });
    expect(r.kind).toBe('ok');
    const [url, init] = fetchMock.mock.calls[0];
    const seen = String(url) + JSON.stringify(init.headers ?? {});
    expect(seen).toContain('key-two');
  });
});
