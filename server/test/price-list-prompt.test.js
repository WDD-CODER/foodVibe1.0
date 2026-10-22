'use strict';
/**
 * Plan 464 — POST /api/v1/ai/parse-price-list: the prompt sent to Gemini and the cleaning of a messy list.
 * Gemini is mocked by stubbing global fetch. This proves the prompt text and the plumbing, not that the real
 * model follows the prompt (that is the human card in docs/mvp/runs/464.md).
 */

const request = require('supertest');

process.env.GEMINI_API_KEY = 'test-key';
const { buildTestApp, teardownTestApp, signTestToken } = require('./helpers/app');
const { resetForTests } = require('../services/gemini-client');
const { PRICE_LIST_SYSTEM_PROMPT } = require('../routes/ai');
const { FAILING_LINE, MESSY_TEXT, MODEL_REPLY, EXPECTED_ROWS } = require('./fixtures/price-list-messy');

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

let userSeq = 0;
const ownerToken = () => signTestToken({ userId: `priceOwner${++userSeq}`, name: 'owner', businessId: 'b464', businessRole: 'owner' });
const post = (rawText, token = ownerToken()) =>
  request(app).post('/api/v1/ai/parse-price-list').set('Authorization', `Bearer ${token}`).send({ rawText });

describe('POST /parse-price-list prompt and messy text', () => {
  it('exports a prompt with the order-independence rules and the failing example', () => {
    expect(PRICE_LIST_SYSTEM_PROMPT).toContain('ORDER DOES NOT MATTER');
    expect(PRICE_LIST_SYSTEM_PROMPT).toContain('עולה');
    expect(PRICE_LIST_SYSTEM_PROMPT).toContain(FAILING_LINE);
  });

  it('sends that prompt to Gemini and returns exactly the expected rows for the messy text', async () => {
    fetchMock.mockResolvedValue(modelAnswer(MODEL_REPLY));
    const res = await post(MESSY_TEXT);
    expect(res.status).toBe(200);

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent.system_instruction.parts[0].text).toContain(FAILING_LINE);
    expect(sent.contents[0].parts[0].text).toBe(MESSY_TEXT);

    expect(res.body.truncated).toBe(false);
    expect(res.body.rows).toEqual(EXPECTED_ROWS);
    expect(res.body.rows[0]).toEqual(expect.objectContaining({ name: 'עגבניה ניסיון', baseUnit: 'kg', price: 50, purchaseUnit: null }));
    expect(res.body.rows.some((r) => r.name.includes('שלום'))).toBe(false);
  });

  it('keeps a pack word the model returned (never dropped by the cleaner)', async () => {
    fetchMock.mockResolvedValue(modelAnswer(MODEL_REPLY));
    const res = await post(MESSY_TEXT);
    expect(res.body.rows.filter((r) => r.purchaseUnit).map((r) => [r.purchaseUnit, r.purchaseQty])).toEqual([
      ['ארגז', 10],
      ['קרטון', 24],
    ]);
  });

  it('staff still get 403 and Gemini is not called', async () => {
    const res = await post(MESSY_TEXT, signTestToken({ userId: 'priceStaff', name: 'staff', businessId: 'b464', businessRole: 'staff' }));
    expect(res.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('an unreadable reply gives 502', async () => {
    fetchMock.mockResolvedValue(modelAnswer('this is not json at all'));
    const res = await post(MESSY_TEXT);
    expect(res.status).toBe(502);
  });
});
