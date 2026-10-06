'use strict';
/**
 * Architecture invariants (docs/brain/invariants.md, plan 387). One describe per
 * enforceable invariant; every test name starts with its INV-n so CI output names the
 * broken rule. Changing what these assert means changing an invariant — that needs the
 * Human's "approve arch change INV-n" and a superseding ADR, never a quiet test edit.
 *
 * The it.todo cases wait for plan 386 (canWrite + remove/rename for me); turn them into
 * real tests when it merges.
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

const MASTER = '__master__';
const as = (user) => ({ Authorization: `Bearer ${signTestToken(user)}` });
const USER_A = { userId: 'userA', role: 'user' };
const ADMIN = { userId: 'admin1', role: 'admin' };

function menuEventBody(overrides = {}) {
  return {
    name: 'חתונה',
    eventType: 'wedding',
    servingType: 'buffet',
    guestCount: 100,
    sections: [],
    financialTargets: { targetFoodCostPct: 30 },
    performanceTags: { foodCostPct: 0, primaryServingStyle: 'buffet' },
    ...overrides,
  };
}

// Each collection: a valid POST body, and a PUT body that changes something visible.
const COLLECTIONS = [
  { type: 'products', body: () => productBody(), edit: { nameHebrew: 'אגס' } },
  { type: 'recipes', body: () => recipeBody(), edit: { nameHebrew: 'מרק' } },
  { type: 'dishes', body: () => recipeBody(), edit: { nameHebrew: 'שניצל' } },
  { type: 'menuEvents', body: () => menuEventBody(), edit: { name: 'בר מצווה' } },
  { type: 'taxonomyTerms', body: () => ({ kind: 'allergen', key: 'lupin', sortOrder: 0 }), edit: { sortOrder: 5 } },
];

// A stored doc owned by `userId`, inserted straight into Mongo.
async function seed(type, userId, _id) {
  const body = COLLECTIONS.find((c) => c.type === type).body();
  const doc = type === 'taxonomyTerms'
    ? stored(body, { _id, userId })
    : stored(body, { _id, userId, _masterId: _id, _userModified: false });
  await testDb().collection(type).insertOne(doc);
  return doc;
}

describe('INV-1 Ownership', () => {
  for (const { type, body, edit } of COLLECTIONS) {
    it(`INV-1 ${type}: a user creates, edits and deletes his own item`, async () => {
      const created = await request(app).post(`/api/v1/data/${type}`).set(as(USER_A)).send(body());
      expect(created.status).toBe(201);
      expect(created.body.userId).toBe('userA');

      const id = created.body._id;
      const edited = await request(app).put(`/api/v1/data/${type}/${id}`).set(as(USER_A)).send(edit);
      expect(edited.status).toBe(200);
      expect(edited.body).toMatchObject(edit);

      const removed = await request(app).delete(`/api/v1/data/${type}/${id}`).set(as(USER_A));
      expect(removed.status).toBe(200);
    });

    it(`INV-1 ${type}: a user can't edit or delete another user's item (404)`, async () => {
      await seed(type, 'userB', 'theirs');

      const edited = await request(app).put(`/api/v1/data/${type}/theirs`).set(as(USER_A)).send(edit);
      expect(edited.status).toBe(404);
      const removed = await request(app).delete(`/api/v1/data/${type}/theirs`).set(as(USER_A));
      expect(removed.status).toBe(404);

      const still = await testDb().collection(type).findOne({ _id: 'theirs' });
      expect(still.userId).toBe('userB');
      expect(still._userDeleted).toBeUndefined();
    });

    it(`INV-1 ${type}: a regular user can't edit a shared ${MASTER} item (403/404)`, async () => {
      await seed(type, MASTER, 'shared');
      const res = await request(app).put(`/api/v1/data/${type}/shared`).set(as(USER_A)).send(edit);
      expect([403, 404]).toContain(res.status);
    });
  }

  it(`INV-1 taxonomyTerms: the admin edits a shared ${MASTER} term`, async () => {
    await seed('taxonomyTerms', MASTER, 'shared');
    const res = await request(app).put('/api/v1/data/taxonomyTerms/shared').set(as(ADMIN)).send({ sortOrder: 7 });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ userId: MASTER, sortOrder: 7 });
  });

  for (const type of ['products', 'recipes', 'dishes', 'menuEvents']) {
    it.todo(`INV-1 ${type}: the admin edits a shared ${MASTER} item (needs plan 386 canWrite)`);
  }
});

describe('INV-2 Tenancy', () => {
  it.todo('INV-2 a user removes a shared term for himself only; another user still reads it (needs plan 386)');
  it.todo('INV-2 a user renames a shared term for himself only; another user still reads the original name (needs plan 386)');
});

describe('INV-4 One schema package, server validates every write', () => {
  it('INV-4 an invalid recipe POST is rejected with 400 Validation failed', async () => {
    const res = await request(app)
      .post('/api/v1/data/recipes')
      .set(as(USER_A))
      .send(recipeBody({ yieldAmount: 'lots' }));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(await testDb().collection('recipes').countDocuments()).toBe(0);
  });

  it('INV-4 an invalid recipe PUT is rejected with 400 Validation failed', async () => {
    await testDb().collection('recipes').insertOne(stored(recipeBody(), { _id: 'r1', userId: 'userA', _masterId: 'r1', _userModified: false }));
    const res = await request(app).put('/api/v1/data/recipes/r1').set(as(USER_A)).send({ yieldAmount: 'lots' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('INV-4 a recipe PUT with a non-array ingredients is a 400, not a server crash', async () => {
    await testDb().collection('recipes').insertOne(stored(recipeBody(), { _id: 'r1', userId: 'userA', _masterId: 'r1', _userModified: false }));
    const res = await request(app).put('/api/v1/data/recipes/r1').set(as(USER_A)).send({ ingredients: 'none' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });
});
