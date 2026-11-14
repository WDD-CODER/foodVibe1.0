'use strict';
/** Plan 600 — the shared pool: opt-in, admin promote/remove, and use in another business's prompt. */

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

const biz = (_id, name, extra = {}) => ({ _id, name, ownerId: `owner-${_id}`, createdAt: 1, internal: false, lastSyncedMasterVersion: 0, ...extra });

beforeEach(async () => {
  resetForTests();
  delete process.env.GEMINI_MODELS;
  process.env.GEMINI_API_KEY = 'test-key';
  await testDb().collection('GEMINI_SHOTS').deleteMany({});
  await testDb().collection('businesses').deleteMany({});
  await testDb().collection('businesses').insertMany([
    biz('bizShareA', 'Sharing Kitchen', { shareAiExamples: true }),
    biz('bizPrivateC', 'Private Kitchen'),
    biz('bizNewB', 'New Kitchen'),
  ]);
  fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(recipe('soup')) }] } }] }) }));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const owner = (id, businessId) => signTestToken({ userId: id, role: 'user', businessId });
const staff = () => signTestToken({ userId: 'shareStaff', role: 'user', businessId: 'bizShareA', businessRole: 'staff' });
const adminToken = () => signTestToken({ userId: 'platAdmin', role: 'admin', businessId: 'b_platAdmin' });
const auth = token => ({ Authorization: `Bearer ${token}` });
const recipe = name => ({
  nameHebrew: name, recipe_type: 'dish', yield_amount: 4, yield_unit: 'portion',
  ingredients: [{ name: 'water', amount: 100, unit: 'gram' }], steps: ['boil'],
});
const approvedShot = async (businessId, prompt, extra = {}) => {
  const { insertedId } = await testDb().collection('GEMINI_SHOTS').insertOne({
    businessId, prompt, draft: recipe(prompt), status: 'approved', source: 'text', keptRatio: 0.8, createdAt: new Date(), ...extra,
  });
  return String(insertedId);
};
const list = () => request(app).get('/api/v1/admin/ai-shots').set(auth(adminToken()));
const promote = (id, token = adminToken()) => request(app).post(`/api/v1/admin/ai-shots/${id}/promote`).set(auth(token));
const generate = token => request(app).post('/api/v1/ai/generate').set(auth(token)).send({ prompt: 'soup' });

describe('shared recipe AI examples', () => {
  it('a promoted shot reaches a business with no examples of its own', async () => {
    const id = await approvedShot('bizShareA', 'SHARED-SOUP soup');
    expect((await promote(id)).status).toBe(200);
    await generate(owner('ownerNewB', 'bizNewB'));
    expect(String(fetchMock.mock.calls[0][1].body)).toContain('SHARED-SOUP');
  });

  it('promote: 403 for a non-admin, 409 not_shared, 409 already_shared, 404 unknown', async () => {
    const ok = await approvedShot('bizShareA', 'soup one');
    const priv = await approvedShot('bizPrivateC', 'soup two');
    expect((await promote(ok, owner('ownerShareA', 'bizShareA'))).status).toBe(403);
    const notShared = await promote(priv);
    expect(notShared.status).toBe(409);
    expect(notShared.body.code).toBe('not_shared');
    expect((await promote(ok)).status).toBe(200);
    const again = await promote(ok);
    expect(again.status).toBe(409);
    expect(again.body.code).toBe('already_shared');
    expect((await promote('0'.repeat(24))).status).toBe(404);
  });

  it('GET lists candidates only from opted-in businesses; promoted ones move to shared', async () => {
    const ok = await approvedShot('bizShareA', 'soup one');
    await approvedShot('bizPrivateC', 'soup two');
    await approvedShot('bizShareA', 'pending soup', { status: 'pending' });
    let body = (await list()).body;
    expect(body.candidates.map(r => r.nameHebrew)).toEqual(['soup one']);
    expect(body.candidates[0]).toMatchObject({ businessName: 'Sharing Kitchen', keptRatio: 0.8, ingredientCount: 1 });
    expect(body.shared).toEqual([]);
    expect((await promote(ok)).status).toBe(200);
    body = (await list()).body;
    expect(body.candidates).toEqual([]);
    expect(body.shared.map(r => r.nameHebrew)).toEqual(['soup one']);
    expect(body.shared[0].businessName).toBeUndefined();
    expect((await request(app).get('/api/v1/admin/ai-shots').set(auth(owner('ownerShareA', 'bizShareA')))).status).toBe(403);
  });

  it('DELETE removes the shared copy only', async () => {
    const ok = await approvedShot('bizShareA', 'soup one');
    const row = (await promote(ok)).body;
    const del = await request(app).delete(`/api/v1/admin/ai-shots/shared/${row._id}`).set(auth(adminToken()));
    expect(del.status).toBe(200);
    expect(await testDb().collection('GEMINI_SHOTS').countDocuments({ businessId: '__master__' })).toBe(0);
    expect(await testDb().collection('GEMINI_SHOTS').countDocuments({ businessId: 'bizShareA' })).toBe(1);
    const again = await request(app).delete(`/api/v1/admin/ai-shots/shared/${ok}`).set(auth(adminToken()));
    expect(again.status).toBe(404);
  });

  it('PUT share-ai-examples: off by the owner removes the copies; staff get 403', async () => {
    const ok = await approvedShot('bizShareA', 'soup one');
    await promote(ok);
    const staffRes = await request(app).put('/api/v1/business/share-ai-examples').set(auth(staff())).send({ share: false });
    expect(staffRes.status).toBe(403);
    expect(await testDb().collection('GEMINI_SHOTS').countDocuments({ businessId: '__master__' })).toBe(1);
    const bad = await request(app).put('/api/v1/business/share-ai-examples').set(auth(owner('ownerShareA', 'bizShareA'))).send({ share: 'x' });
    expect(bad.status).toBe(400);
    const res = await request(app).put('/api/v1/business/share-ai-examples').set(auth(owner('ownerShareA', 'bizShareA'))).send({ share: false });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ shareAiExamples: false });
    expect(await testDb().collection('GEMINI_SHOTS').countDocuments({ businessId: '__master__' })).toBe(0);
    expect((await testDb().collection('businesses').findOne({ _id: 'bizShareA' })).shareAiExamples).toBe(false);
  });
});
