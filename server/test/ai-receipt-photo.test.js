'use strict';
/**
 * Plan 465 — POST /api/v1/ai/parse-receipt-photo and the pure `normalizeReceiptRows`.
 * Gemini is mocked by stubbing global fetch (as in gemini-client.test.js). This proves the plumbing and the
 * price rules, not that the real model reads a real Hebrew receipt (that is a human card in docs/mvp/runs/465.md).
 */

const request = require('supertest');

process.env.GEMINI_API_KEY = 'test-key';
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');
const { resetForTests, isVisionModel, getUsageCount } = require('../services/gemini-client');
const { normalizeReceiptRows } = require('../utils/price-list-import');

// The AI usage counters (the shared Gemini budget and the per-day usage rows) are the only thing a call may touch.
const USAGE_COLLECTIONS = ['GEMINI_USAGE', 'usageDays'];

let app;
let fetchMock;

beforeAll(async () => {
  app = await buildTestApp();
}, 60000);

afterAll(async () => {
  await teardownTestApp();
});

beforeEach(() => {
  resetForTests();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const modelAnswer = (text) => jsonResponse(200, { candidates: [{ content: { parts: [{ text }] } }] });
const reply = (rows) => modelAnswer(JSON.stringify({ rows }));

let userSeq = 0;
const ownerToken = () => signTestToken({ userId: `receiptOwner${++userSeq}`, name: 'owner', businessId: 'b465', businessRole: 'owner' });
const staffToken = () => signTestToken({ userId: `receiptStaff${++userSeq}`, name: 'staff', businessId: 'b465', businessRole: 'staff' });
const post = (body, token = ownerToken()) =>
  request(app).post('/api/v1/ai/parse-receipt-photo').set('Authorization', `Bearer ${token}`).send(body);
const photo = (extra = {}) => ({ imageBase64: 'aGVsbG8=', mimeType: 'image/jpeg', ...extra });

describe('normalizeReceiptRows', () => {
  const one = (line) => normalizeReceiptRows({ rows: [{ name: 'עגבניות', unit: 'kg', ...line }] }).rows[0];

  it('quantity 2 + unit price 5 + total 10 -> price 5', () => {
    expect(one({ quantity: 2, unitPrice: 5, lineTotal: 10 })).toEqual(expect.objectContaining({ price: 5, needsReview: false }));
  });

  it('quantity 2.35 kg + total 14.1 and no unit price -> price 6', () => {
    expect(one({ quantity: 2.35, lineTotal: 14.1 })).toEqual(expect.objectContaining({ price: 6, baseUnit: 'kg', needsReview: false }));
  });

  it('unit price 5 + quantity 3 + total 20 disagree -> price 6.6667 and needsReview', () => {
    expect(one({ quantity: 3, unitPrice: 5, lineTotal: 20 })).toEqual(expect.objectContaining({ price: 6.6667, needsReview: true }));
  });

  it('a printed unit price and total within 5% keep the unit price', () => {
    expect(one({ quantity: 3, unitPrice: 5, lineTotal: 15.5 })).toEqual(expect.objectContaining({ price: 5, needsReview: false }));
  });

  it('total 12 and no quantity -> price 12 and needsReview', () => {
    expect(one({ lineTotal: 12 })).toEqual(expect.objectContaining({ price: 12, needsReview: true }));
  });

  it('a unit price alone is taken as is; no number at all gives no price and needsReview', () => {
    expect(one({ unitPrice: 7 })).toEqual(expect.objectContaining({ price: 7, needsReview: false }));
    expect(one({})).toEqual(expect.objectContaining({ price: null, needsReview: true }));
  });

  it('a line without a name is dropped; a number given as text is read', () => {
    const { rows } = normalizeReceiptRows({ rows: [{ unitPrice: 3 }, { name: '  ', unitPrice: 3 }, { name: 'בצל', unitPrice: '4.5' }] });
    expect(rows.map((r) => [r.name, r.price])).toEqual([['בצל', 4.5]]);
  });

  it('250 lines -> 200 rows and truncated', () => {
    const rows = Array.from({ length: 250 }, (_, i) => ({ name: `מוצר ${i}`, unitPrice: 1 }));
    const result = normalizeReceiptRows({ rows });
    expect(result.rows).toHaveLength(200);
    expect(result.truncated).toBe(true);
  });

  it('is safe on a payload without rows', () => {
    expect(normalizeReceiptRows({})).toEqual({ rows: [], truncated: false });
    expect(normalizeReceiptRows(null)).toEqual({ rows: [], truncated: false });
  });
});

describe('POST /parse-receipt-photo — input and permissions', () => {
  it('requires a token', async () => {
    const res = await request(app).post('/api/v1/ai/parse-receipt-photo').send(photo());
    expect(res.status).toBe(401);
  });

  it('staff get 403, Gemini is not called and the usage count does not move', async () => {
    const before = await getUsageCount();
    const res = await post(photo(), staffToken());
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await getUsageCount()).toBe(before);
  });

  it('missing image -> 400', async () => {
    const res = await post({ mimeType: 'image/jpeg' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_REQUEST');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(['application/pdf', 'image/gif'])('mime %s -> 400 with no Gemini call', async (mimeType) => {
    const res = await post(photo({ mimeType }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('base64 longer than 1,800,000 characters -> 400 IMAGE_TOO_LARGE with no Gemini call', async () => {
    const res = await post(photo({ imageBase64: 'A'.repeat(1_800_001) }));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('IMAGE_TOO_LARGE');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('POST /parse-receipt-photo — reading the photo', () => {
  it('sends the photo as inlineData to a vision model, and returns cleaned per-unit rows', async () => {
    fetchMock.mockResolvedValue(reply([
      { name: 'עגבניות', quantity: 2, unit: 'kg', unitPrice: 5, lineTotal: 10, category: null },
      { name: 'מלפפון', quantity: 2.35, unit: 'kg', unitPrice: null, lineTotal: 14.1, category: null },
      { name: 'בצל', quantity: 3, unit: 'kg', unitPrice: 5, lineTotal: 20, category: null },
      { name: 'שמן', quantity: null, unit: null, unitPrice: null, lineTotal: 12, category: null },
      { name: '', quantity: 1, unit: 'unit', unitPrice: 3, lineTotal: 3, category: null },
    ]));
    const res = await post(photo({ imageBase64: 'cmVjZWlwdA==', mimeType: 'image/png', knownCategories: ['dairy'] }));
    expect(res.status).toBe(200);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(isVisionModel(/models\/([^:]+):generateContent/.exec(url)[1])).toBe(true);
    const sent = JSON.parse(init.body);
    const parts = sent.contents[0].parts;
    expect(parts.find((p) => p.inlineData)).toEqual({ inlineData: { mimeType: 'image/png', data: 'cmVjZWlwdA==' } });
    expect(sent.system_instruction.parts[0].text).toContain('dairy');

    expect(res.body.truncated).toBe(false);
    expect(res.body.rows.map((r) => [r.name, r.price, r.needsReview])).toEqual([
      ['עגבניות', 5, false],
      ['מלפפון', 6, false],
      ['בצל', 6.6667, true],
      ['שמן', 12, true],
    ]);
  });

  it('a reply of 250 lines -> 200 rows and truncated: true', async () => {
    fetchMock.mockResolvedValue(reply(Array.from({ length: 250 }, (_, i) => ({ name: `מוצר ${i}`, unitPrice: 2 }))));
    const res = await post(photo());
    expect(res.status).toBe(200);
    expect(res.body.rows).toHaveLength(200);
    expect(res.body.truncated).toBe(true);
  });

  it('an empty reply gives 200 with no rows', async () => {
    fetchMock.mockResolvedValue(modelAnswer(''));
    const res = await post(photo());
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ rows: [], truncated: false });
  });

  it('unreadable model text -> 502', async () => {
    fetchMock.mockResolvedValue(modelAnswer('this is not json at all'));
    const res = await post(photo());
    expect(res.status).toBe(502);
  });

  it('stores nothing: only the AI usage counter changes', async () => {
    const snapshot = async () => {
      const out = {};
      for (const { name } of await testDb().listCollections().toArray()) {
        out[name] = await testDb().collection(name).countDocuments();
      }
      return out;
    };
    fetchMock.mockResolvedValue(reply([{ name: 'עגבניות', unitPrice: 5 }]));
    const before = await snapshot();
    const res = await post(photo());
    expect(res.status).toBe(200);
    const after = await snapshot();
    const changed = Object.keys({ ...before, ...after }).filter((name) => (before[name] ?? 0) !== (after[name] ?? 0));
    expect(changed.filter((name) => !USAGE_COLLECTIONS.includes(name))).toEqual([]);
  });

  // Last on purpose: it leaves the model's daily quota exhausted in the in-memory database.
  it('a daily quota 429 reaches the browser as 429', async () => {
    const daily = {
      error: {
        code: 429,
        message: 'quota',
        details: [{ violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier', quotaValue: '20' }] }],
      },
    };
    fetchMock.mockResolvedValue(jsonResponse(429, daily));
    const res = await post(photo());
    expect(res.status).toBe(429);
  });
});
