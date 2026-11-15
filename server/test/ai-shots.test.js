'use strict';
/**
 * Plan 582 — recipe AI examples (GEMINI_SHOTS) stay inside their business:
 * stamped businessId, per-business read, per-business prune.
 * Gemini and the page fetch are mocked by stubbing global fetch; in-memory Mongo test app.
 */

const request = require('supertest');

process.env.GEMINI_API_KEY = 'test-key';
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');
const { resetForTests } = require('../services/gemini-client');

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
  delete process.env.GEMINI_MODELS;
  process.env.GEMINI_API_KEY = 'test-key';
  await testDb().collection('GEMINI_SHOTS').deleteMany({});
  fetchMock = vi.fn(async url => {
    if (String(url).startsWith('http://93.184.216.34')) {
      return { ok: true, status: 200, text: async () => '<html><body>soup page</body></html>' };
    }
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(recipe('מרק')) }] } }] }) };
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const tokenA = () => signTestToken({ userId: 'shotUserA', role: 'user', businessId: 'bizShotA' });
const tokenB = () => signTestToken({ userId: 'shotUserB', role: 'user', businessId: 'bizShotB' });
const auth = token => ({ Authorization: `Bearer ${token}` });
const recipe = name => ({
  nameHebrew: name,
  recipe_type: 'dish',
  yield_amount: 4,
  yield_unit: 'portion',
  ingredients: [{ name: 'מים', amount: 100, unit: 'gram' }],
  steps: ['לבשל'],
});
// Plan 600: an approved shot is a pending one confirmed after the recipe is saved. Resolves to the pending POST's response.
const saveShotVia = async (token, prompt) => {
  const shotKey = `key-${prompt}`.padEnd(8, '_');
  const res = await request(app).post('/api/v1/ai/shots').set(auth(token))
    .send({ prompt, draft: recipe('מרק'), status: 'pending', source: 'text', shotKey });
  if (res.status === 200) {
    await request(app).post('/api/v1/ai/shots/confirm').set(auth(token))
      .send({ shotKey, draft: recipe('מרק'), recipeId: 'r1' });
  }
  return res;
};
const generate = token =>
  request(app).post('/api/v1/ai/generate').set(auth(token)).send({ prompt: 'soup' });
const generateFromUrl = token =>
  request(app).post('/api/v1/ai/generate-from-url').set(auth(token)).send({ url: 'http://93.184.216.34/recipe' });
const geminiBodies = () =>
  fetchMock.mock.calls.filter(c => !String(c[0]).startsWith('http://93.184.216.34')).map(c => String(c[1].body));
const shotsOf = businessId => testDb().collection('GEMINI_SHOTS').find({ businessId }).toArray();

describe('recipe shots per business', () => {
  it('generate: business B never sees A\'s shot; A does; an unscoped shot goes to neither', async () => {
    expect((await saveShotVia(tokenA(), 'SHOT-A-ONLY soup')).status).toBe(200);
    await testDb().collection('GEMINI_SHOTS').insertOne({
      prompt: 'SHOT-LEGACY soup', draft: recipe('מרק'), status: 'approved', source: 'text', createdAt: new Date(),
    });

    await generate(tokenB());
    await generate(tokenA());
    const bodies = geminiBodies();
    expect(bodies).toHaveLength(2);
    const [forB, forA] = bodies;
    expect(forB).not.toContain('SHOT-A-ONLY');
    expect(forB).not.toContain('SHOT-LEGACY');
    expect(forA).toContain('SHOT-A-ONLY');
    expect(forA).not.toContain('SHOT-LEGACY');
  });

  it('generate-from-url: business B sends no A shot', async () => {
    await saveShotVia(tokenA(), 'SHOT-A-ONLY soup');
    await generateFromUrl(tokenA());
    expect(geminiBodies()[0]).toContain('SHOT-A-ONLY');
    fetchMock.mockClear();
    await generateFromUrl(tokenB());
    const bodies = geminiBodies();
    expect(bodies[0]).toContain('soup page');
    expect(bodies[0]).not.toContain('SHOT-A-ONLY');
  });

  it('prune counts per business', async () => {
    const col = testDb().collection('GEMINI_SHOTS');
    await col.insertMany(Array.from({ length: 50 }, (_, i) => ({
      businessId: 'bizShotA', prompt: `a${i}`, draft: recipe('מרק'), status: 'approved', source: 'text',
      createdAt: new Date(1000 + i),
    })));
    expect((await saveShotVia(tokenB(), 'b-one')).status).toBe(200);
    expect(await shotsOf('bizShotA')).toHaveLength(50);
    expect(await shotsOf('bizShotB')).toHaveLength(1);

    expect((await saveShotVia(tokenA(), 'a-new')).status).toBe(200);
    const aDocs = await shotsOf('bizShotA');
    expect(aDocs).toHaveLength(50);
    expect(aDocs.map(d => d.prompt)).not.toContain('a0');
    expect(aDocs.map(d => d.prompt)).toContain('a1');
    expect(await shotsOf('bizShotB')).toHaveLength(1);
  });

  it('a saved shot carries the caller\'s businessId and userId', async () => {
    await saveShotVia(tokenA(), 'stamp me');
    const doc = await testDb().collection('GEMINI_SHOTS').findOne({ prompt: 'stamp me' });
    expect(doc.businessId).toBe('bizShotA');
    expect(doc.userId).toBe('shotUserA');
  });
});
