'use strict';
/**
 * Plan 321 Phase 3 (P3.3) — taxonomyTerms through the generic data API:
 * read master ∪ own, no clone-lineage fields, schema-enforced writes, and a term that is
 * still used by the caller's documents can't be deleted or re-keyed (Human, 2026-10-05: block).
 */

const request = require('supertest');
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');
const { productBody, recipeBody, stored } = require('./helpers/v2-docs');

let app;

beforeAll(async () => {
  app = await buildTestApp();
}, 60000);

afterAll(async () => {
  await teardownTestApp();
});

beforeEach(async () => {
  const db = testDb();
  for (const c of ['taxonomyTerms', 'products', 'recipes', 'dishes', 'menuEvents']) await db.collection(c).deleteMany({});
});

const URL = '/api/v1/data/taxonomyTerms';
const tokenA = () => signTestToken({ userId: 'userA', role: 'user' });
const auth = req => req.set('Authorization', `Bearer ${tokenA()}`);

const term = (userId, kind, key, extra = {}) => ({
  _id: `${kind}:${userId}:${key}`, schemaVersion: 2, userId, createdAt: 1, updatedAt: 1, sortOrder: 0, kind, key, ...extra,
});

describe('reads', () => {
  it('a signed-in user gets master terms plus their own, never another user\'s', async () => {
    await testDb().collection('taxonomyTerms').insertMany([
      term('__master__', 'allergen', 'nuts'),
      term('userA', 'allergen', 'lupin'),
      term('userB', 'allergen', 'celery'),
    ]);
    const res = await auth(request(app).get(URL));
    expect(res.status).toBe(200);
    expect(res.body.map(t => t.key).sort()).toEqual(['lupin', 'nuts']);
  });

  it('anonymous gets master terms only', async () => {
    await testDb().collection('taxonomyTerms').insertMany([term('__master__', 'allergen', 'nuts'), term('userA', 'allergen', 'lupin')]);
    const res = await request(app).get(URL);
    expect(res.body.map(t => t.key)).toEqual(['nuts']);
  });

  it('GET by id can read a master term', async () => {
    await testDb().collection('taxonomyTerms').insertOne(term('__master__', 'allergen', 'nuts'));
    const res = await auth(request(app).get(`${URL}/allergen:__master__:nuts`));
    expect(res.status).toBe(200);
    expect(res.body.key).toBe('nuts');
  });
});

describe('writes', () => {
  it('POST stores a valid term without _masterId/_userModified', async () => {
    const res = await auth(request(app).post(URL)).send({ kind: 'label', key: 'kids', color: '#F59E0B', sortOrder: 0 });
    expect(res.status).toBe(201);
    const doc = await testDb().collection('taxonomyTerms').findOne({ _id: res.body._id });
    expect(doc).toMatchObject({ userId: 'userA', kind: 'label', key: 'kids', schemaVersion: 2 });
    expect(doc._masterId).toBeUndefined();
    expect(doc._userModified).toBeUndefined();
  });

  it('POST rejects an invalid term (label without color)', async () => {
    const res = await auth(request(app).post(URL)).send({ kind: 'label', key: 'kids', sortOrder: 0 });
    expect(res.status).toBe(400);
  });

  it('POST with a query-operator key is a 400, never reaches the master lookup', async () => {
    await testDb().collection('taxonomyTerms').insertOne(term('__master__', 'allergen', 'nuts'));
    const res = await auth(request(app).post(URL)).send({ kind: 'allergen', key: { $ne: null }, sortOrder: 0 });
    expect(res.status).toBe(400);
  });

  it('POST rejects a key master already has for that kind', async () => {
    await testDb().collection('taxonomyTerms').insertOne(term('__master__', 'allergen', 'nuts'));
    const res = await auth(request(app).post(URL)).send({ kind: 'allergen', key: 'nuts', sortOrder: 0 });
    expect(res.status).toBe(409);
  });

  it('POST of the same own term twice hits the unique index', async () => {
    await auth(request(app).post(URL)).send({ kind: 'allergen', key: 'lupin', sortOrder: 0 });
    const res = await auth(request(app).post(URL)).send({ kind: 'allergen', key: 'lupin', sortOrder: 1 });
    expect(res.status).toBe(409);
  });

  it('PUT updates an own term without adding _userModified, and cannot change kind', async () => {
    await testDb().collection('taxonomyTerms').insertOne(term('userA', 'course', 'brunch', { color: '#3B82F6' }));
    const ok = await auth(request(app).put(`${URL}/course:userA:brunch`)).send({ color: '#10B981' });
    expect(ok.status).toBe(200);
    expect(ok.body.color).toBe('#10B981');
    expect(ok.body._userModified).toBeUndefined();
    const bad = await auth(request(app).put(`${URL}/course:userA:brunch`)).send({ kind: 'label' });
    expect(bad.status).toBe(400);
  });

  it('a user cannot edit or delete a master term', async () => {
    await testDb().collection('taxonomyTerms').insertOne(term('__master__', 'allergen', 'nuts'));
    expect((await auth(request(app).put(`${URL}/allergen:__master__:nuts`)).send({ sortOrder: 3 })).status).toBe(404);
    expect((await auth(request(app).delete(`${URL}/allergen:__master__:nuts`))).status).toBe(404);
  });
});

describe('delete is blocked while the term is used', () => {
  it('blocks deleting a category used by an own product, and lists it', async () => {
    await testDb().collection('taxonomyTerms').insertOne(term('userA', 'ingredientCategory', 'herbs'));
    await testDb().collection('products').insertOne(stored(productBody({ categories: ['herbs'] }), { _id: 'p1', userId: 'userA' }));
    const res = await auth(request(app).delete(`${URL}/ingredientCategory:userA:herbs`));
    expect(res.status).toBe(409);
    expect(res.body.referencedBy).toEqual([{ type: 'products', _id: 'p1', name: 'תפוח', userId: 'userA' }]);
    expect(await testDb().collection('taxonomyTerms').countDocuments()).toBe(1);
  });

  it('blocks deleting a unit used deep inside a recipe ingredient', async () => {
    await testDb().collection('taxonomyTerms').insertOne(term('userA', 'unit', 'crate', { gramRate: 5000 }));
    await testDb().collection('recipes').insertOne(stored(
      recipeBody({ ingredients: [{ _id: 'i1', referenceId: 'p1', amount: 1, unit: 'crate', nameSnapshot: 'x' }] }),
      { _id: 'r1', userId: 'userA' },
    ));
    const res = await auth(request(app).delete(`${URL}/unit:userA:crate`));
    expect(res.status).toBe(409);
    expect(res.body.referencedBy[0]).toMatchObject({ type: 'recipes', _id: 'r1' });
  });

  it('another user\'s use of the same key does not block', async () => {
    await testDb().collection('taxonomyTerms').insertOne(term('userA', 'ingredientCategory', 'herbs'));
    await testDb().collection('products').insertOne(stored(productBody({ categories: ['herbs'] }), { _id: 'p2', userId: 'userB' }));
    const res = await auth(request(app).delete(`${URL}/ingredientCategory:userA:herbs`));
    expect(res.status).toBe(200);
    expect(await testDb().collection('taxonomyTerms').countDocuments()).toBe(0);
  });

  it('bulk delete is blocked when any of the terms is used', async () => {
    await testDb().collection('taxonomyTerms').insertMany([term('userA', 'eventType', 'wedding'), term('userA', 'eventType', 'brit')]);
    await testDb().collection('menuEvents').insertOne({ _id: 'e1', userId: 'userA', name: 'x', eventType: 'wedding' });
    const res = await auth(request(app).delete(`${URL}/bulk`)).send({ ids: ['eventType:userA:wedding', 'eventType:userA:brit'] });
    expect(res.status).toBe(409);
    expect(await testDb().collection('taxonomyTerms').countDocuments()).toBe(2);
  });
});

describe('re-key renames the key in the documents that use it', () => {
  it('an own term: renames in the owner\'s docs only (array, scalar and nested paths)', async () => {
    const db = testDb();
    await db.collection('taxonomyTerms').insertMany([
      term('userA', 'label', 'kids', { color: '#F59E0B' }),
      term('userA', 'unit', 'crate', { gramRate: 5000 }),
    ]);
    await db.collection('dishes').insertMany([
      stored(recipeBody({ labels: ['kids', 'spicy'] }), { _id: 'd1', userId: 'userA' }),
      stored(recipeBody({ labels: ['kids'] }), { _id: 'd2', userId: 'userB' }),
    ]);
    await db.collection('recipes').insertOne(stored(recipeBody({
      yieldUnit: 'crate',
      ingredients: [{ _id: 'i1', amount: 1, unit: 'crate' }, { _id: 'i2', amount: 1, unit: 'kg' }],
      prepCategories: [{ categoryName: 'c', items: [{ itemName: 'x', unit: 'crate' }] }],
    }), { _id: 'r1', userId: 'userA' }));

    expect((await auth(request(app).put(`${URL}/label:userA:kids`)).send({ key: 'children' })).status).toBe(200);
    expect((await auth(request(app).put(`${URL}/unit:userA:crate`)).send({ key: 'box' })).status).toBe(200);

    expect((await db.collection('dishes').findOne({ _id: 'd1' })).labels).toEqual(['children', 'spicy']);
    expect((await db.collection('dishes').findOne({ _id: 'd2' })).labels).toEqual(['kids']);
    const r1 = await db.collection('recipes').findOne({ _id: 'r1' });
    expect(r1.yieldUnit).toBe('box');
    expect(r1.ingredients.map(i => i.unit)).toEqual(['box', 'kg']);
    expect(r1.prepCategories[0].items[0].unit).toBe('box');
  });

  it('re-keying an own term onto a key master has is a 409', async () => {
    await testDb().collection('taxonomyTerms').insertMany([term('__master__', 'allergen', 'nuts'), term('userA', 'allergen', 'lupin')]);
    expect((await auth(request(app).put(`${URL}/allergen:userA:lupin`)).send({ key: 'nuts' })).status).toBe(409);
  });
});

describe('shared terms are admin-only (Human, 2026-10-05)', () => {
  const admin = req => req.set('Authorization', `Bearer ${signTestToken({ userId: 'boss', role: 'admin' })}`);

  it('a regular user cannot add a shared term', async () => {
    const res = await auth(request(app).post(URL)).send({ kind: 'allergen', key: 'lupin', sortOrder: 0, shared: true });
    expect(res.status).toBe(403);
  });

  it('an admin adds a shared term, which folds users\' own same-key terms', async () => {
    await testDb().collection('taxonomyTerms').insertOne(term('userA', 'allergen', 'lupin'));
    const res = await admin(request(app).post(URL)).send({ kind: 'allergen', key: 'lupin', sortOrder: 0, shared: true });
    expect(res.status).toBe(201);
    expect(res.body.userId).toBe('__master__');
    const all = await testDb().collection('taxonomyTerms').find({}).toArray();
    expect(all.map(t => t.userId)).toEqual(['__master__']);
  });

  it('an admin re-keys a shared term: every user\'s docs follow', async () => {
    const db = testDb();
    await db.collection('taxonomyTerms').insertOne(term('__master__', 'ingredientCategory', 'veg'));
    await db.collection('products').insertMany([
      stored(productBody({ categories: ['veg'] }), { _id: 'p1', userId: 'userA' }),
      stored(productBody({ categories: ['veg', 'dry'] }), { _id: 'p2', userId: 'userB' }),
    ]);
    const res = await admin(request(app).put(`${URL}/ingredientCategory:__master__:veg`)).send({ key: 'vegetables' });
    expect(res.status).toBe(200);
    expect((await db.collection('products').findOne({ _id: 'p1' })).categories).toEqual(['vegetables']);
    expect((await db.collection('products').findOne({ _id: 'p2' })).categories).toEqual(['vegetables', 'dry']);
  });

  it('an admin cannot delete a shared term any user still uses; can once unused', async () => {
    const db = testDb();
    await db.collection('taxonomyTerms').insertOne(term('__master__', 'allergen', 'nuts'));
    await db.collection('products').insertOne(stored(productBody({ allergens: ['nuts'] }), { _id: 'p9', userId: 'userB' }));
    const blocked = await admin(request(app).delete(`${URL}/allergen:__master__:nuts`));
    expect(blocked.status).toBe(409);
    expect(blocked.body.referencedBy[0]).toMatchObject({ _id: 'p9', userId: 'userB' });
    await db.collection('products').deleteMany({});
    expect((await admin(request(app).delete(`${URL}/allergen:__master__:nuts`))).status).toBe(200);
    expect(await db.collection('taxonomyTerms').countDocuments()).toBe(0);
  });
});

describe('`shared` is only meaningful for taxonomy terms', () => {
  it('a product body with a `shared` field is stored as the caller\'s own doc, not master', async () => {
    const res = await auth(request(app).post('/api/v1/data/products')).send({ ...productBody(), shared: true });
    // The strict product schema rejects the unknown field; it must never become a master doc or a 403.
    expect(res.status).toBe(400);
    expect(await testDb().collection('products').countDocuments({ userId: '__master__' })).toBe(0);
  });
});
