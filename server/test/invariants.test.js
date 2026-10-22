'use strict';
/**
 * Architecture invariants (docs/brain/invariants.md, plan 387). One describe per
 * enforceable invariant; every test name starts with its INV-n so CI output names the
 * broken rule. Changing what these assert means changing an invariant — that needs the
 * Human's "approve arch change INV-n" and a superseding ADR, never a quiet test edit.
 *
 * Plan 425 made INV-1 / INV-2 real (business-scoped reads and writes). Plan 427 added the owner/staff
 * permission rule (server/utils/permissions.js).
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
const STAFF_A = { userId: 'staffA', role: 'user', businessId: 'b_userA', businessRole: 'staff' };
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
      expect(created.body).toMatchObject({ userId: 'userA', businessId: 'b_userA', createdBy: 'userA' });

      const id = created.body._id;
      const edited = await request(app).put(`/api/v1/data/${type}/${id}`).set(as(USER_A)).send(edit);
      expect(edited.status).toBe(200);
      expect(edited.body).toMatchObject(edit);

      const removed = await request(app).delete(`/api/v1/data/${type}/${id}`).set(as(USER_A));
      expect(removed.status).toBe(200);
    });

    it(`INV-1 ${type}: a user can't edit or delete another user's item (404)`, async () => {
      const theirs = await seed(type, 'userB', 'theirs');

      const edited = await request(app).put(`/api/v1/data/${type}/theirs`).set(as(USER_A)).send(edit);
      expect(edited.status).toBe(404);
      const removed = await request(app).delete(`/api/v1/data/${type}/theirs`).set(as(USER_A));
      expect(removed.status).toBe(404);

      // X's stored doc is exactly what was seeded: nothing edited, nothing stamped as deleted.
      const still = await testDb().collection(type).findOne({ _id: 'theirs' });
      expect(still).toEqual(theirs);
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

  it('INV-1 staff of a business read the owner item and see the owner edit', async () => {
    await seed('products', 'userA', 'shared-by-owner');
    const list = await request(app).get('/api/v1/data/products').set(as(STAFF_A));
    expect(list.body.map((d) => d._id)).toEqual(['shared-by-owner']);

    const edited = await request(app).put('/api/v1/data/products/shared-by-owner').set(as(USER_A)).send({ nameHebrew: 'אגס' });
    expect(edited.status).toBe(200);
    const seen = await request(app).get('/api/v1/data/products/shared-by-owner').set(as(STAFF_A));
    expect(seen.body.nameHebrew).toBe('אגס');
  });

  it(`INV-1 the platform admin edits a shared ${MASTER} term, and a business owner who is not one cannot`, async () => {
    await seed('taxonomyTerms', MASTER, 'shared');
    const denied = await request(app).put('/api/v1/data/taxonomyTerms/shared').set(as({ userId: 'userA', role: 'admin', isPlatformAdmin: false })).send({ sortOrder: 9 });
    expect(denied.status).toBe(404);
    expect((await testDb().collection('taxonomyTerms').findOne({ _id: 'shared' })).sortOrder).toBe(0);
  });

  describe('INV-1 staff', () => {
    const pricedBody = () => productBody({ sources: [{ supplierId: 's1', price: 5 }] });
    const seedStaff = async (type, body, _id, createdBy) =>
      testDb().collection(type).insertOne(stored(body, { _id, userId: createdBy, businessId: 'b_userA', createdBy, _masterId: _id, _userModified: false }));

    it('INV-1 staff edits his own item', async () => {
      await seedStaff('recipes', recipeBody(), 'mine', 'staffA');
      const res = await request(app).put('/api/v1/data/recipes/mine').set(as(STAFF_A)).send({ nameHebrew: 'שלי' });
      expect(res.status).toBe(200);
    });

    it("INV-1 staff can't edit or delete the owner's item (403, unchanged)", async () => {
      await seedStaff('recipes', recipeBody(), 'owners', 'userA');
      const before = await testDb().collection('recipes').findOne({ _id: 'owners' });
      const edited = await request(app).put('/api/v1/data/recipes/owners').set(as(STAFF_A)).send({ nameHebrew: 'שלי' });
      const removed = await request(app).delete('/api/v1/data/recipes/owners').set(as(STAFF_A));
      expect([edited.status, removed.status]).toEqual([403, 403]);
      expect(edited.body).toEqual({ error: 'FORBIDDEN', messageKey: 'no_permission' });
      expect(await testDb().collection('recipes').findOne({ _id: 'owners' })).toEqual(before);
    });

    // Plan 477 (ADR 0024): the one exception to "members read all of their business's items".
    it('INV-1 staff read events only in the stages the owner allowed, plus events they created', async () => {
      const db = testDb();
      await db.collection('businesses').deleteMany({ _id: 'b_userA' });
      await db.collection('businesses').insertOne({ _id: 'b_userA', name: 'A', ownerId: 'userA', createdAt: 1, internal: false, lastSyncedMasterVersion: 0, staffVisibleStages: ['ordering'] });
      await seedStaff('menuEvents', menuEventBody({ stage: 'inquiry' }), 'hidden', 'userA');
      await seedStaff('menuEvents', menuEventBody({ stage: 'ordering' }), 'shown', 'userA');
      await seedStaff('menuEvents', menuEventBody({ stage: 'inquiry' }), 'own', 'staffA');
      const staff = await request(app).get('/api/v1/data/menuEvents').set(as(STAFF_A));
      expect(staff.body.map((e) => e._id).sort()).toEqual(['own', 'shown']);
      expect((await request(app).get('/api/v1/data/menuEvents/hidden').set(as(STAFF_A))).status).toBe(404);
      const owner = await request(app).get('/api/v1/data/menuEvents').set(as(USER_A));
      expect(owner.body.map((e) => e._id).sort()).toEqual(['hidden', 'own', 'shown']);
      await db.collection('businesses').deleteMany({ _id: 'b_userA' });
    });

    it("INV-1 staff can't change a product price, the owner can", async () => {
      await seedStaff('products', pricedBody(), 'p1', 'staffA');
      const staff = await request(app).put('/api/v1/data/products/p1').set(as(STAFF_A)).send({ sources: [{ supplierId: 's1', price: 9 }] });
      expect(staff.status).toBe(403);
      expect((await testDb().collection('products').findOne({ _id: 'p1' })).sources[0].price).toBe(5);
      const owner = await request(app).put('/api/v1/data/products/p1').set(as(USER_A)).send({ sources: [{ supplierId: 's1', price: 9 }] });
      expect(owner.status).toBe(200);
      expect(owner.body.sources[0].price).toBe(9);
    });
  });
});

describe('INV-2 Tenancy', () => {
  it('INV-2 a business never reads another business items; its own term is invisible to others while master terms reach both', async () => {
    await seed('products', 'userB', 'theirs');
    const products = await request(app).get('/api/v1/data/products').set(as(USER_A));
    expect(products.body).toEqual([]);

    await seed('taxonomyTerms', MASTER, 'master-term');
    await testDb().collection('taxonomyTerms').insertOne(stored({ kind: 'allergen', key: 'mine', sortOrder: 1 }, { _id: 'a-term', userId: 'userA' }));
    const keys = async (user) => (await request(app).get('/api/v1/data/taxonomyTerms').set(as(user))).body.map((t) => t._id).sort();
    expect(await keys(USER_A)).toEqual(['a-term', 'master-term']);
    expect(await keys({ userId: 'userB', role: 'user' })).toEqual(['master-term']);
  });

  it('INV-2 a new business gets the full master copy stamped with its businessId; a master update reaches it; its own changes and deletions are never overwritten', async () => {
    const { cloneMasterDataToBusiness } = require('../services/clone-master');
    const { syncMasterToBusiness } = require('../services/sync-master');
    const db = testDb();
    await db.collection('recipes').insertMany([
      stored(recipeBody({ nameHebrew: 'אחד' }), { _id: 'm1', userId: MASTER, _masterId: 'm1', _userModified: false }),
      stored(recipeBody({ nameHebrew: 'שניים' }), { _id: 'm2', userId: MASTER, _masterId: 'm2', _userModified: false }),
      stored(recipeBody({ nameHebrew: 'שלושה' }), { _id: 'm3', userId: MASTER, _masterId: 'm3', _userModified: false }),
    ]);
    expect(await cloneMasterDataToBusiness('bNew', { createdBy: 'newOwner' })).toBe(3);
    const copy = await db.collection('recipes').find({ businessId: 'bNew' }).toArray();
    expect(copy).toHaveLength(3);
    for (const doc of copy) expect(doc).toMatchObject({ businessId: 'bNew', createdBy: 'newOwner', _userModified: false });

    // The business edits one copy and deletes another.
    const byMaster = (id) => copy.find((d) => d._masterId === id);
    await db.collection('recipes').updateOne({ _id: byMaster('m2')._id }, { $set: { nameHebrew: 'שלי', _userModified: true } });
    await db.collection('recipes').updateOne({ _id: byMaster('m3')._id }, { $set: { deletedAt: 5, deletedBy: 'newOwner' } });
    // Master changes all three.
    await db.collection('recipes').updateMany({ businessId: MASTER }, { $set: { nameHebrew: 'חדש' } });

    const result = await syncMasterToBusiness('bNew', { createdBy: 'newOwner' });
    expect(result).toEqual({ inserted: 0, updated: 1 });
    const after = (id) => db.collection('recipes').findOne({ _id: byMaster(id)._id });
    expect((await after('m1')).nameHebrew).toBe('חדש'); // master update reached the business
    expect((await after('m2')).nameHebrew).toBe('שלי'); // business edit kept
    expect((await after('m3')).nameHebrew).toBe('שלושה'); // deleted copy untouched
    expect(await db.collection('recipes').countDocuments({ businessId: 'bNew' })).toBe(3); // nothing re-cloned
  });
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
