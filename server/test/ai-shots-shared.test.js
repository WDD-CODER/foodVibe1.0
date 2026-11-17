'use strict';
/** Plan 600 — the shared pool: admin promote/remove, and use in another business's prompt. Plan 618: shared unless private. */

const request = require('supertest');

process.env.GEMINI_API_KEY = 'test-key';
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');
const { resetForTests } = require('../services/gemini-client');
const { draftCloseness } = require('../services/ai-recipe-helpers');

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
    biz('bizShareA', 'Sharing Kitchen'),
    biz('bizPrivateC', 'Private Kitchen', { aiPrivate: true }),
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

  it('GET lists candidates only from businesses that are not private; promoted ones move to shared', async () => {
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

  it('GET recomputes the closeness score from aiDraft and draft; promote copies it (plan 612)', async () => {
    const aiDraft = { ...recipe('fixed soup'), recipe_type: 'preparation', yield_amount: 1000, yield_unit: 'gram' };
    const id = await approvedShot('bizShareA', 'fixed soup', { aiDraft, keptRatio: 1 });
    await approvedShot('bizShareA', 'old soup', { keptRatio: 0.6 });
    await approvedShot('bizShareA', 'bare soup', { keptRatio: undefined });
    const expected = draftCloseness(aiDraft, recipe('fixed soup'));
    expect(expected).toBe(0.5);
    const body = (await list()).body;
    const byName = Object.fromEntries(body.candidates.map(r => [r.nameHebrew, r.keptRatio]));
    expect(byName).toEqual({ 'fixed soup': expected, 'old soup': 0.6, 'bare soup': null });
    const promoted = await promote(id);
    expect(promoted.status).toBe(200);
    expect(promoted.body.keptRatio).toBe(expected);
    expect((await testDb().collection('GEMINI_SHOTS').findOne({ businessId: '__master__' })).keptRatio).toBe(expected);
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

  it('promote: 200 for a business that never touched a switch (plan 618)', async () => {
    const id = await approvedShot('bizNewB', 'new soup');
    const res = await promote(id);
    expect(res.status).toBe(200);
    expect(await testDb().collection('GEMINI_SHOTS').countDocuments({ businessId: '__master__', 'promotedFrom.businessId': 'bizNewB' })).toBe(1);
  });

  it('the retired PUT share-ai-examples answers 404 for owner and staff and deletes nothing (plan 618)', async () => {
    const ok = await approvedShot('bizShareA', 'soup one');
    await promote(ok);
    const staffRes = await request(app).put('/api/v1/business/share-ai-examples').set(auth(staff())).send({ share: false });
    expect(staffRes.status).toBe(404);
    const ownerRes = await request(app).put('/api/v1/business/share-ai-examples').set(auth(owner('ownerShareA', 'bizShareA'))).send({ share: false });
    expect(ownerRes.status).toBe(404);
    expect(await testDb().collection('GEMINI_SHOTS').countDocuments({ businessId: '__master__' })).toBe(1);
    expect(await testDb().collection('GEMINI_SHOTS').countDocuments({ businessId: 'bizShareA' })).toBe(1);
  });

  it('the platform route: aiPrivate true removes only that business promoted copies; false restores and deletes nothing (plan 618)', async () => {
    const a = await approvedShot('bizShareA', 'soup a');
    const b = await approvedShot('bizNewB', 'soup b');
    expect((await promote(a)).status).toBe(200);
    expect((await promote(b)).status).toBe(200);
    const platform = body => request(app).put('/api/v1/admin/businesses/bizShareA/platform').set(auth(adminToken())).send(body);
    const shots = filter => testDb().collection('GEMINI_SHOTS').countDocuments(filter);
    expect((await platform({ aiPrivate: true, reason: 'test reason' })).status).toBe(200);
    expect(await shots({ businessId: '__master__', 'promotedFrom.businessId': 'bizShareA' })).toBe(0);
    expect(await shots({ businessId: '__master__', 'promotedFrom.businessId': 'bizNewB' })).toBe(1);
    expect(await shots({ businessId: 'bizShareA' })).toBe(1);
    expect((await platform({ aiPrivate: false, reason: 'test reason' })).status).toBe(200);
    expect(await shots({ businessId: '__master__' })).toBe(1);
    expect(await shots({ businessId: 'bizShareA' })).toBe(1);
    expect((await testDb().collection('businesses').findOne({ _id: 'bizShareA' })).aiPrivate).toBe(false);
  });
});
