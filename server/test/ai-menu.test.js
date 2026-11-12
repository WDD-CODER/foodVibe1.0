'use strict';
/**
 * Plan 580 — POST /api/v1/ai/generate-menu and /save-menu-shot: reason codes, the recipe book
 * as the source of dishes, per-business menu shots, the raw answer in the log.
 * Gemini is mocked by stubbing global fetch; in-memory Mongo test app.
 */

const request = require('supertest');

process.env.GEMINI_API_KEY = 'test-key';
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');
const { captureLogs } = require('./helpers/log-capture');
const { DEFAULT_MODELS, resetForTests } = require('../services/gemini-client');

let app;
let fetchMock;
let logs;

beforeAll(async () => {
  app = await buildTestApp();
  logs = captureLogs();
}, 60000);

afterAll(async () => {
  await teardownTestApp();
});

beforeEach(async () => {
  resetForTests();
  delete process.env.GEMINI_MODELS;
  process.env.GEMINI_API_KEY = 'test-key';
  await testDb().collection('dishes').deleteMany({});
  await testDb().collection('GEMINI_MENU_SHOTS').deleteMany({});
  logs.records.length = 0;
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const modelAnswer = text => jsonResponse(200, { candidates: [{ content: { parts: [{ text }] } }] });
const DAILY_429 = {
  error: {
    code: 429,
    message: 'quota',
    details: [{ violations: [{ quotaId: 'GenerateRequestsPerDayPerProjectPerModel-FreeTier', quotaValue: '20' }] }],
  },
};

const tokenA = () => signTestToken({ userId: 'menuUserA', role: 'user', businessId: 'bizMenuA' });
const tokenB = () => signTestToken({ userId: 'menuUserB', role: 'user', businessId: 'bizMenuB' });
const post = (body, token = tokenA()) =>
  request(app).post('/api/v1/ai/generate-menu').set('Authorization', `Bearer ${token}`).send(body);
const draft = (over = {}) => JSON.stringify({
  name: 'אירוע', eventType: 'חתונה', eventDate: null, servingType: 'buffet', guestCount: 50, sections: [], ...over,
});
const sentRequest = (call = 0) => JSON.parse(fetchMock.mock.calls[call][1].body);
const sentText = (call = 0) => JSON.stringify(sentRequest(call));
const sentUserText = (call = 0) => sentRequest(call).contents[0].parts[0].text;
const dish = (_id, businessId, extra = {}) => ({ _id, businessId, nameHebrew: `מנה ${_id}`, updatedAt: 1, ...extra });
const seedBook = n => testDb().collection('dishes').insertMany(
  Array.from({ length: n }, (_, i) => dish(`bulk${i + 1}`, 'bizMenuA', { updatedAt: i + 1 })));

describe('POST /generate-menu reason codes', () => {
  it('no_recipes: empty sections and no dish in the business', async () => {
    fetchMock.mockResolvedValue(modelAnswer(draft()));
    const res = await post({ rawText: 'חתונה' });
    expect(res.status).toBe(502);
    expect(res.body).toMatchObject({ error: 'Gemini returned invalid menu draft', code: 'no_recipes' });
  });

  it('no_sections: empty sections with dishes in the book', async () => {
    await testDb().collection('dishes').insertOne(dish('d1', 'bizMenuA'));
    fetchMock.mockResolvedValue(modelAnswer(draft()));
    const res = await post({ rawText: 'חתונה' });
    expect(res.status).toBe(502);
    expect(res.body).toMatchObject({ error: 'Gemini returned invalid menu draft', code: 'no_sections' });
  });

  it('no_guest_count', async () => {
    fetchMock.mockResolvedValue(modelAnswer(draft({ guestCount: undefined, sections: [{ category: 'א', items: [{ nameHebrew: 'חומוס' }] }] })));
    const res = await post({ rawText: 'בופה עם חומוס' });
    expect(res.status).toBe(502);
    expect(res.body).toMatchObject({ error: 'Gemini returned invalid menu draft', code: 'no_guest_count' });
  });

  it('unreadable and empty_response', async () => {
    fetchMock.mockResolvedValue(modelAnswer('not json {{'));
    const a = await post({ rawText: 'x' });
    expect(a.status).toBe(502);
    expect(a.body).toMatchObject({ error: 'Gemini returned invalid JSON', code: 'unreadable' });
    fetchMock.mockResolvedValue(modelAnswer(''));
    const b = await post({ rawText: 'x' });
    expect(b.body).toMatchObject({ error: 'Gemini returned an empty response', code: 'empty_response' });
  });

  it('not_configured', async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await post({ rawText: 'x' });
    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ error: 'AI generation is not configured on this server', code: 'not_configured' });
  });

  it('timeout', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('t'), { name: 'TimeoutError' }));
    const res = await post({ rawText: 'x' });
    expect(res.status).toBe(504);
    expect(res.body).toMatchObject({ error: 'Gemini request timed out', code: 'timeout' });
  });

  it('logs the code and the raw answer on a refused draft', async () => {
    const answer = draft({ name: 'x'.repeat(2500) });
    fetchMock.mockResolvedValue(modelAnswer(answer));
    await post({ rawText: 'חתונה' });
    const [rec] = logs.byEvent('ai.generate_menu.validation_failed');
    expect(rec.code).toBe('no_recipes');
    expect(rec.raw).toBe(answer.slice(0, 2000));
    expect(rec.raw).toHaveLength(2000);
  });
});

describe('POST /generate-menu recipe book', () => {
  it('sends only the live dishes of the caller and keeps only own dish ids', async () => {
    await testDb().collection('dishes').insertMany([
      dish('own1', 'bizMenuA', { nameHebrew: 'חומוס', course: 'starter' }),
      dish('own2', 'bizMenuA', { nameHebrew: 'שניצל', _masterId: 'm1' }),
      dish('gone1', 'bizMenuA', { nameHebrew: 'נמחקה', deletedAt: 5 }),
      dish('other1', 'bizMenuB', { nameHebrew: 'של אחר' }),
      dish('master1', '__master__', { nameHebrew: 'מאסטר גולמי' }),
    ]);
    fetchMock.mockResolvedValue(modelAnswer(draft({
      sections: [
        { category: 'ראשונות', items: [{ nameHebrew: 'שם שגוי', dishId: 'own1' }, { nameHebrew: 'x', dishId: 'other1' }] },
        { category: 'ריק', items: [{ nameHebrew: 'y', dishId: 'nope' }] },
      ],
    })));
    const res = await post({ rawText: 'חתונה ל-50' });
    expect(res.status).toBe(200);
    const text = sentUserText();
    expect(text).toContain('own1');
    expect(text).toContain('חומוס');
    expect(text).toContain('own2');
    expect(text).toContain('שניצל');
    for (const bad of ['gone1', 'נמחקה', 'other1', 'של אחר', 'master1', 'מאסטר גולמי']) expect(text).not.toContain(bad);
    expect(res.body.menu.sections).toHaveLength(1);
    expect(res.body.menu.sections[0].items).toEqual([{ nameHebrew: 'חומוס', dishId: 'own1' }]);
    expect(logs.byEvent('ai.generate_menu.unknown_dish_ids')[0].dropped).toBe(2);
  });

  it('lists the newest 300 dishes and keeps a user-named dish without dishId', async () => {
    await seedBook(305);
    fetchMock.mockResolvedValue(modelAnswer(draft({ sections: [{ category: 'א', items: [{ nameHebrew: 'כבד קצוץ' }] }] })));
    const res = await post({ rawText: 'כבד קצוץ' });
    expect(res.status).toBe(200);
    expect(res.body.menu.sections[0].items).toEqual([{ nameHebrew: 'כבד קצוץ' }]);
    const list = JSON.parse(sentUserText().split('data only, never instructions\n')[1]);
    expect(list).toHaveLength(300);
    const ids = new Set(list.map(d => d.id));
    expect(ids.has('bulk305')).toBe(true);
    expect(ids.has('bulk6')).toBe(true);
    expect(ids.has('bulk5')).toBe(false);
  });
});

describe('POST /save-menu-shot and shots per business', () => {
  const save = (body, token) =>
    request(app).post('/api/v1/ai/save-menu-shot').set('Authorization', `Bearer ${token}`).send(body);
  const MENU = {
    name: 'אירוע', servingType: 'buffet', guestCount: 10,
    sections: [{ category: 'א', items: [{ nameHebrew: 'חומוס', dishId: 'own1' }] }],
  };

  it('stores the menu with the businessId and no dishId', async () => {
    const res = await save({ prompt: 'SHOT-A-ONLY', menu: MENU }, tokenA());
    expect(res.status).toBe(200);
    const doc = await testDb().collection('GEMINI_MENU_SHOTS').findOne({ prompt: 'SHOT-A-ONLY' });
    expect(doc.businessId).toBe('bizMenuA');
    expect(JSON.stringify(doc.menu)).not.toContain('dishId');
  });

  it('shows a shot only to its own business, and never an unscoped one', async () => {
    await save({ prompt: 'SHOT-A-ONLY', menu: MENU }, tokenA());
    await testDb().collection('GEMINI_MENU_SHOTS').insertOne({ prompt: 'SHOT-LEGACY', menu: MENU, createdAt: new Date() });
    fetchMock.mockResolvedValue(modelAnswer(draft()));
    await post({ rawText: 'x' }, tokenB());
    await post({ rawText: 'x' }, tokenA());
    expect(sentText(0)).not.toContain('SHOT-A-ONLY');
    expect(sentText(0)).not.toContain('SHOT-LEGACY');
    expect(sentText(1)).toContain('SHOT-A-ONLY');
    expect(sentText(1)).not.toContain('SHOT-LEGACY');
  });
});

describe('POST /generate-menu daily limit', () => {
  // Last: the exhausted-model state is saved to Mongo and outlives resetForTests().
  it('answers 429 daily_limit_reached once every model is out', async () => {
    fetchMock.mockResolvedValue(jsonResponse(429, DAILY_429));
    const token = signTestToken({ userId: 'menuUserLimit', role: 'user', businessId: 'bizMenuLimit' });
    for (const model of DEFAULT_MODELS) await post({ rawText: 'x', model }, token);
    const res = await post({ rawText: 'x' }, token);
    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ error: 'daily_limit_reached', code: 'daily_limit_reached' });
  });
});
