'use strict';
/**
 * Plan 463 — POST /api/v1/ai/match-product-names. Gemini is mocked by stubbing global fetch
 * (the way gemini-client.test.js does); the app runs on the in-memory Mongo test app.
 */

const request = require('supertest');

process.env.GEMINI_API_KEY = 'test-key';
const { buildTestApp, teardownTestApp, signTestToken } = require('./helpers/app');
const { DEFAULT_MODELS, resetForTests } = require('../services/gemini-client');

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
const DAILY_429 = {
  error: {
    code: 429,
    message: 'You exceeded your current quota',
    details: [{ violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier', quotaValue: '20' }] }],
  },
};

const BODY = {
  names: [
    { name: 'פטרוזליה', unit: 'unit' },
    { name: 'שום יבש', unit: 'gram' },
  ],
  products: [
    { name: 'מלח', unit: 'kg' },
    { name: 'פטרוזיליה', unit: 'kg' },
  ],
};

let userSeq = 0;
const post = (body, token = signTestToken({ userId: `matchUser${++userSeq}`, role: 'user' })) =>
  request(app).post('/api/v1/ai/match-product-names').set('Authorization', `Bearer ${token}`).send(body);

describe('POST /match-product-names', () => {
  it('requires a token', async () => {
    const res = await request(app).post('/api/v1/ai/match-product-names').send(BODY);
    expect(res.status).toBe(401);
  });

  it('maps a valid answer to matches and drops nulls', async () => {
    fetchMock.mockResolvedValue(modelAnswer('{"matches":[{"i":0,"product":1},{"i":1,"product":null}]}'));
    const res = await post(BODY);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ matches: [{ i: 0, product: 1 }] });
  });

  it('accepts a fenced answer', async () => {
    fetchMock.mockResolvedValue(modelAnswer('```json\n{"matches":[{"i":0,"product":1}]}\n```'));
    const res = await post(BODY);
    expect(res.body.matches).toEqual([{ i: 0, product: 1 }]);
  });

  it('drops out-of-range and repeated positions', async () => {
    fetchMock.mockResolvedValue(
      modelAnswer('{"matches":[{"i":0,"product":1},{"i":0,"product":0},{"i":5,"product":0},{"i":1,"product":9}]}')
    );
    const res = await post(BODY);
    expect(res.status).toBe(200);
    expect(res.body.matches).toEqual([{ i: 0, product: 1 }]);
  });

  // Plan 490 — options when the model cannot tell which product a name means.
  const BODY_8 = {
    names: [
      { name: 'salt', unit: 'gram' },
      { name: 'פטרוזליה', unit: 'unit' },
    ],
    products: Array.from({ length: 8 }, (_, n) => ({ name: `מוצר ${n}`, unit: 'kg' })),
  };

  it('keeps an options list on an entry without a product', async () => {
    fetchMock.mockResolvedValue(modelAnswer('{"matches":[{"i":0,"product":null,"options":[1,2]}]}'));
    const res = await post(BODY_8);
    expect(res.status).toBe(200);
    expect(res.body.matches).toEqual([{ i: 0, product: null, options: [1, 2] }]);
  });

  it('drops out-of-range, repeated and over-5 options but keeps the rest of the answer', async () => {
    fetchMock.mockResolvedValue(
      modelAnswer('{"matches":[{"i":0,"product":null,"options":[-1,0,0,8,1,2,3,4,5,6]},{"i":1,"product":7}]}')
    );
    const res = await post(BODY_8);
    expect(res.status).toBe(200);
    expect(res.body.matches).toEqual([
      { i: 0, product: null, options: [0, 1, 2, 3, 4] },
      { i: 1, product: 7 },
    ]);
  });

  it('keeps the other links when one name lists 7 options', async () => {
    fetchMock.mockResolvedValue(
      modelAnswer('{"matches":[{"i":0,"product":null,"options":[0,1,2,3,4,5,6]},{"i":1,"product":3}]}')
    );
    const res = await post(BODY_8);
    expect(res.status).toBe(200);
    expect(res.body.matches[0].options).toHaveLength(5);
    expect(res.body.matches[1]).toEqual({ i: 1, product: 3 });
  });

  it('drops an entry with product null and no (valid) options', async () => {
    fetchMock.mockResolvedValue(
      modelAnswer('{"matches":[{"i":0,"product":null},{"i":1,"product":null,"options":[99,-2]}]}')
    );
    const res = await post(BODY_8);
    expect(res.status).toBe(200);
    expect(res.body.matches).toEqual([]);
  });

  it('keeps the product and drops options when an entry has both', async () => {
    fetchMock.mockResolvedValue(modelAnswer('{"matches":[{"i":0,"product":2,"options":[1,3]}]}'));
    const res = await post(BODY_8);
    expect(res.body.matches).toEqual([{ i: 0, product: 2 }]);
  });

  it('tells the model names may be in any language and how to give options', async () => {
    fetchMock.mockResolvedValue(modelAnswer('{"matches":[]}'));
    await post(BODY_8);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    const prompt = sent.system_instruction.parts[0].text;
    expect(prompt).toContain('any language');
    expect(prompt).toContain('options');
  });

  it.each([
    ['empty names', { ...BODY, names: [] }],
    ['no products', { ...BODY, products: [] }],
    ['more than 200 names', { ...BODY, names: Array.from({ length: 201 }, (_, n) => ({ name: `n${n}`, unit: '' })) }],
    ['more than 1000 products', { ...BODY, products: Array.from({ length: 1001 }, (_, n) => ({ name: `p${n}`, unit: '' })) }],
    ['a name that is not text', { ...BODY, names: [{ name: 5, unit: '' }] }],
  ])('rejects %s with 400', async (_label, body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('INVALID_REQUEST');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends only names and units to Gemini', async () => {
    fetchMock.mockResolvedValue(modelAnswer('{"matches":[]}'));
    await post({ ...BODY, products: [{ name: 'מלח', unit: 'kg', _id: 'secret-id', price: 12 }] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    const text = JSON.stringify(sent);
    expect(text).toContain('פטרוזליה');
    expect(text).toContain('מלח');
    expect(text).toContain('kg');
    expect(text).not.toContain('secret-id');
    expect(text).not.toContain('price');
    expect(sent.generationConfig.temperature).toBe(0);
  });

  it('answers 502 when the model text is not JSON', async () => {
    fetchMock.mockResolvedValue(modelAnswer('sorry, I cannot help'));
    const res = await post(BODY);
    expect(res.status).toBe(502);
  });

  it('answers 502 when the JSON has the wrong shape', async () => {
    fetchMock.mockResolvedValue(modelAnswer('{"matches":"none"}'));
    const res = await post(BODY);
    expect(res.status).toBe(502);
  });

  // Last: the exhausted-model state is saved to Mongo and outlives resetForTests().
  it('answers 429 model_exhausted, then daily_limit_reached once every model is out', async () => {
    fetchMock.mockResolvedValue(jsonResponse(429, DAILY_429));
    const first = await post({ ...BODY, model: DEFAULT_MODELS[0] });
    expect(first.status).toBe(429);
    expect(first.body.error).toBe('model_exhausted');
    for (const model of DEFAULT_MODELS.slice(1)) await post({ ...BODY, model });
    const res = await post(BODY);
    expect(res.status).toBe(429);
    expect(res.body.error).toBe('daily_limit_reached');
  });
});
