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
  for (const c of ['taxonomyTerms', 'products', 'recipes', 'dishes', 'menuEvents', 'clients', 'knowledgeItems']) await db.collection(c).deleteMany({});
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
  // Plan 512: owner-only to write (staff create -> 403); no clone lineage, like taxonomyTerms.
  { type: 'clients', body: () => ({ name: 'דנה', phone: '050-123 4567' }), edit: { notes: 'x' }, ownerOnly: true },
  // Plan 554: owner-only to write; no clone lineage.
  { type: 'knowledgeItems', body: () => ({ topic: 'policy', question: 'חניה?', answer: 'יש', status: 'approved', source: 'manual', visibility: 'public' }), edit: { answer: 'אין' }, ownerOnly: true },
];

// Collections whose documents carry no `_masterId` / `_userModified`.
const NO_LINEAGE = ['taxonomyTerms', 'clients', 'knowledgeItems'];

// A stored doc owned by `userId`, inserted straight into Mongo.
async function seed(type, userId, _id) {
  const body = COLLECTIONS.find((c) => c.type === type).body();
  const doc = NO_LINEAGE.includes(type)
    ? stored(type === 'clients' ? { ...body, phoneNormalized: '0501234567' } : body, { _id, userId })
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

    it('INV-1 staff cannot create an owner-only item (403, nothing stored)', async () => {
      for (const { type, body } of COLLECTIONS.filter((c) => c.ownerOnly)) {
        const res = await request(app).post(`/api/v1/data/${type}`).set(as(STAFF_A)).send(body());
        expect(res.status).toBe(403);
        expect(await testDb().collection(type).countDocuments()).toBe(0);
      }
    });

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

    // Plan 477 (ADR 0026): the one exception to "members read all of their business's items".
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

// Plan 543 (ADR 0030): a non-member writes only through the public door, which never reads a member token.
describe('INV-1 guest door', () => {
  it('INV-1 guest door: public.js never reads a member token', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.join(__dirname, '..', 'routes', 'public.js'), 'utf8');
    for (const word of ['verifyToken', 'verifyAccessToken', 'decodeAccessToken', 'req.user', 'recordUsage']) {
      expect(source, `public.js must not contain ${word}`).not.toContain(word);
    }
  });

  it('INV-1 guest door: a member token gives nothing extra on /api/v1/public', async () => {
    const anonymous = await request(app).get('/api/v1/public/health');
    const member = await request(app).get('/api/v1/public/health').set(as(USER_A));
    expect(member.status).toBe(anonymous.status);
    expect(member.body).toEqual(anonymous.body);
    expect(member.headers['cache-control']).toBe(anonymous.headers['cache-control']);
  });
});

// Plan 631 (ADR 0032): a consultant with a live grant, and the platform admin acting in a business.
describe('INV-1 consultant and acting admin', () => {
  const CONSULTANT = { userId: 'consultX', name: 'consultX', businessId: 'b_userA', businessRole: 'consultant', homeBusinessId: 'b_consultX', acting: 'consultant' };
  const BUSINESS_A = { _id: 'b_userA', name: 'A', ownerId: 'userA', createdAt: 1, internal: false, lastSyncedMasterVersion: 0, settings: { targetFoodCostPct: 30 } };

  beforeEach(async () => {
    const db = testDb();
    for (const c of ['businessAccess', 'users', 'businesses']) await db.collection(c).deleteMany({});
    await db.collection('businesses').insertOne(BUSINESS_A);
    await db.collection('users').insertMany([
      { _id: 'consultX', name: 'consultX', email: 'c@x.com', businessId: 'b_consultX', businessRole: 'owner', removedAt: null },
      { _id: 'admin1', name: 'admin1', email: 'a@x.com', businessId: 'b_admin1', businessRole: 'owner', isPlatformAdmin: true, removedAt: null },
    ]);
    await db.collection('businessAccess').insertOne({ _id: 'gA', userId: 'consultX', businessId: 'b_userA', role: 'consultant', grantedBy: 'admin1', grantedByName: 'admin1', grantedAt: 1 });
  });

  it('INV-1 consultant: lists and creates recipes in the business he has a grant for, stamped with his own id', async () => {
    await seed('recipes', 'userA', 'aRecipe');
    const list = await request(app).get('/api/v1/data/recipes').set(as(CONSULTANT));
    expect(list.status).toBe(200);
    expect(list.body.map((r) => r._id)).toEqual(['aRecipe']);
    const created = await request(app).post('/api/v1/data/recipes').set(as(CONSULTANT)).send(recipeBody());
    expect(created.status).toBe(201);
    const doc = await testDb().collection('recipes').findOne({ _id: created.body._id });
    expect(doc).toMatchObject({ businessId: 'b_userA', createdBy: 'consultX' });
  });

  it("INV-1 consultant: 403 on the business's team and settings, and the business document is unchanged", async () => {
    const team = await request(app).get('/api/v1/business/team').set(as(CONSULTANT));
    expect(team.status).toBe(403);
    const settings = await request(app).put('/api/v1/business/settings').set(as(CONSULTANT)).send({ targetFoodCostPct: 10 });
    expect(settings.status).toBe(403);
    expect(await testDb().collection('businesses').findOne({ _id: 'b_userA' })).toEqual(BUSINESS_A);
  });

  it('INV-1 consultant: a forged acting token for a business without a grant gets 401 and reads nothing', async () => {
    await seed('recipes', 'userC', 'cRecipe');
    const res = await request(app).get('/api/v1/data/recipes').set(as({ ...CONSULTANT, businessId: 'b_userC' }));
    expect(res.status).toBe(401);
    expect(res.body).not.toEqual(expect.arrayContaining([expect.objectContaining({ _id: 'cRecipe' })]));
  });

  it('INV-1 consultant: after the grant is removed the very next request answers 401 ACCESS_ENDED', async () => {
    expect((await request(app).get('/api/v1/data/recipes').set(as(CONSULTANT))).status).toBe(200);
    await testDb().collection('businessAccess').updateOne({ _id: 'gA' }, { $set: { revokedAt: Date.now(), revokedBy: 'userA' } });
    const res = await request(app).get('/api/v1/data/recipes').set(as(CONSULTANT));
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'ACCESS_ENDED' });
  });

  it("INV-1 platform admin acting: edits a business's product price; a non-admin with acting platform gets 401", async () => {
    await testDb().collection('products').insertOne(stored(productBody({ sources: [{ supplierId: 's1', price: 5 }] }), { _id: 'pA', userId: 'userA', _masterId: 'pA', _userModified: false }));
    const ADMIN_ACTING = { userId: 'admin1', name: 'admin1', businessId: 'b_userA', businessRole: 'owner', isPlatformAdmin: true, homeBusinessId: 'b_admin1', acting: 'platform' };
    const res = await request(app).put('/api/v1/data/products/pA').set(as(ADMIN_ACTING)).send({ sources: [{ supplierId: 's1', price: 9 }] });
    expect(res.status).toBe(200);
    expect((await testDb().collection('products').findOne({ _id: 'pA' })).sources[0].price).toBe(9);
    const fake = { ...ADMIN_ACTING, userId: 'consultX', isPlatformAdmin: false };
    expect((await request(app).get('/api/v1/data/products').set(as(fake))).status).toBe(401);
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

describe('INV-7 The engine and the hold decide a table', () => {
  const { clearModuleCache } = require('../middleware/require-module');
  const { ROOM, profileWith, tableKeyOf } = require('../generated/schemas/testing/table-engine-fixtures');
  const { wallOf } = require('../services/table-bookings');
  const { claim } = require('../services/table-holds');
  const OWNER = { userId: 'own7', name: 'Owner', businessId: 'b7', businessRole: 'owner' };
  const DATE = wallOf(Date.now() + 2 * 86400000).date;

  beforeEach(async () => {
    const db = testDb();
    for (const c of ['businesses', 'frontDeskProfiles', 'floorPlans', 'bookings', 'tableHolds', 'clients']) await db.collection(c).deleteMany({});
    await db.collection('businesses').insertOne({ _id: 'b7', name: 'seven', ownerId: 'own7', createdAt: 1, modules: ['frontdesk', 'tables'] });
    clearModuleCache();
    await db.collection('frontDeskProfiles').insertOne({ ...profileWith(), _id: 'p7', businessId: 'b7' });
    await db.collection('floorPlans').insertOne({ ...ROOM, _id: 'fp7', businessId: 'b7' });
  });

  it('INV-7 twenty concurrent creates for one table give one booking', async () => {
    const send = () => request(app).post('/api/v1/bookings').set(as(OWNER))
      .send({ guest: { name: 'Dana', phone: '0521234567' }, date: DATE, time: '20:00', partySize: 2, tableKeys: [tableKeyOf(1)] });
    const results = await Promise.all(Array.from({ length: 20 }, send));
    expect(results.filter(r => r.status === 201)).toHaveLength(1);
    expect(results.filter(r => r.status === 409 && r.body.error === 'NO_TABLE')).toHaveLength(19);
    expect(await testDb().collection('bookings').countDocuments({})).toBe(1);
  });

  it('INV-7 a direct second claim over an overlapping time returns ok: false', async () => {
    const start = Date.UTC(2031, 0, 1, 20, 0);
    const first = await claim(testDb(), { _id: 'k1', businessId: 'b7' }, [tableKeyOf(1)], start, start + 90 * 60000);
    const second = await claim(testDb(), { _id: 'k2', businessId: 'b7' }, [tableKeyOf(1)], start + 75 * 60000, start + 135 * 60000);
    expect([first, second]).toEqual([{ ok: true }, { ok: false }]);
    expect(await testDb().collection('tableHolds').countDocuments({ bookingId: 'k2' })).toBe(0);
  });
});
