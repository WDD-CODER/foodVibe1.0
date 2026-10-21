'use strict';
/**
 * Behavior of server/services/sync-master.js — the per-document sync that reconciles a business
 * with __master__ on every login/refresh. Plan 425: it runs once per BUSINESS (its members share
 * one copy), not once per user.
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app');

let app;

beforeAll(async () => {
  app = await buildTestApp();
}, 60000);

afterAll(async () => {
  await teardownTestApp();
});

beforeEach(async () => {
  const db = testDb();
  const collections = await db.listCollections().toArray();
  await Promise.all(
    collections
      .filter(c => c.type === 'collection')
      .map(c => db.collection(c.name).deleteMany({}))
  );
});

const M = { userId: '__master__', businessId: '__master__', createdBy: '__master__' };
const mine = (extra = {}) => ({ userId: 'ownerA', businessId: 'bA', createdBy: 'ownerA', ...extra });

function syncMasterToBusiness(businessId = 'bA', createdBy = 'ownerA') {
  // Required lazily, after JWT/Mongo env vars are set by buildTestApp() — mirrors
  // how generic.js's route handlers only ever run after the app is built.
  return require('../services/sync-master').syncMasterToBusiness(businessId, { createdBy });
}

describe('syncMasterToBusiness', () => {
  it('Rule 1 — clones a new master item the business has no copy of, stamped with the businessId', async () => {
    await testDb().collection('venues').insertOne({ _id: 'm1', ...M, nameHebrew: 'גרם' });
    const result = await syncMasterToBusiness();
    expect(result.inserted).toBe(1);
    const clone = await testDb().collection('venues').findOne({ businessId: 'bA' });
    expect(clone).toMatchObject({ _masterId: 'm1', _userModified: false, nameHebrew: 'גרם', createdBy: 'ownerA', userId: 'ownerA' });
    expect(clone._id).not.toBe('m1'); // gets its own business-scoped id, not the master id
  });

  it('a new business gets the full master copy of every cloneable type, stamped with its businessId', async () => {
    const db = testDb();
    await db.collection('venues').insertOne({ _id: 'mv', ...M, nameHebrew: 'אולם' });
    await db.collection('products').insertOne({ _id: 'mp', ...M, nameHebrew: 'קמח' });
    await db.collection('suppliers').insertOne({ _id: 'ms', ...M, nameHebrew: 'ספק' });
    const { cloneMasterDataToBusiness } = require('../services/clone-master');
    expect(await cloneMasterDataToBusiness('bNew', { createdBy: 'newOwner' })).toBe(3);
    for (const type of ['venues', 'products', 'suppliers']) {
      const docs = await db.collection(type).find({ businessId: 'bNew' }).toArray();
      expect(docs).toHaveLength(1);
      expect(docs[0]).toMatchObject({ createdBy: 'newOwner', _userModified: false });
    }
    expect(await db.collection('venues').countDocuments({ businessId: '__master__' })).toBe(1);
  });

  it('Rule 2 — an unmodified clone is overwritten with the latest master data, so a master change reaches the business', async () => {
    await testDb().collection('venues').insertOne({ _id: 'm1', ...M, nameHebrew: 'גרם v2' });
    await testDb().collection('venues').insertOne({ _id: 'u1', ...mine(), _masterId: 'm1', _userModified: false, nameHebrew: 'גרם v1' });
    const result = await syncMasterToBusiness();
    expect(result.updated).toBe(1);
    const doc = await testDb().collection('venues').findOne({ _id: 'u1' });
    expect(doc.nameHebrew).toBe('גרם v2');
    expect(doc._userModified).toBe(false);
  });

  it('plan 403: a master recipe without logistics never gives the clone logistics: null (Rule 1 and Rule 2)', async () => {
    await testDb().collection('recipes').insertMany([
      { _id: 'm1', ...M, nameHebrew: 'רוטב חדש', ingredients: [] },
      { _id: 'm2', ...M, nameHebrew: 'רוטב ישן', ingredients: [] },
      { _id: 'u2', ...mine(), _masterId: 'm2', _userModified: false, nameHebrew: 'רוטב ישן', ingredients: [] },
    ]);
    await syncMasterToBusiness();
    const docs = await testDb().collection('recipes').find({ businessId: 'bA' }).toArray();
    expect(docs).toHaveLength(2);
    for (const doc of docs) expect('logistics' in doc).toBe(false);
  });

  it('Rule 3 — a business-modified item is never overwritten', async () => {
    await testDb().collection('venues').insertOne({ _id: 'm1', ...M, nameHebrew: 'master value' });
    await testDb().collection('venues').insertOne({ _id: 'u1', ...mine(), _masterId: 'm1', _userModified: true, nameHebrew: 'my edit' });
    const result = await syncMasterToBusiness();
    expect(result.inserted).toBe(0);
    expect(result.updated).toBe(0);
    expect((await testDb().collection('venues').findOne({ _id: 'u1' })).nameHebrew).toBe('my edit');
  });

  it('Rule 4 — a master item removed from __master__ is not removed from the business copy', async () => {
    // No master doc at all — simulates "was deleted from master since last sync".
    await testDb().collection('venues').insertOne({ _id: 'u1', ...mine(), _masterId: 'm1', _userModified: false, nameHebrew: 'still here' });
    const result = await syncMasterToBusiness();
    expect(result.inserted).toBe(0);
    expect(result.updated).toBe(0);
    expect(await testDb().collection('venues').findOne({ _id: 'u1' })).not.toBeNull();
  });

  it('Rule 5 — a business-deleted item (in Trash or purged to a stub) is never overwritten or re-cloned', async () => {
    await testDb().collection('venues').insertMany([
      { _id: 'm1', ...M, nameHebrew: 'master one v2' },
      { _id: 'm2', ...M, nameHebrew: 'master two' },
      { _id: 'u1', ...mine(), _masterId: 'm1', _userModified: false, nameHebrew: 'trashed', deletedAt: 5, deletedBy: 'ownerA' },
      { _id: 'u2', schemaVersion: 2, businessId: 'bA', _masterId: 'm2', _userModified: true, deletedAt: 5, purgedAt: 6 },
    ]);
    const result = await syncMasterToBusiness();
    expect(result).toEqual({ inserted: 0, updated: 0 });
    expect((await testDb().collection('venues').findOne({ _id: 'u1' })).nameHebrew).toBe('trashed');
    expect(await testDb().collection('venues').countDocuments({ businessId: 'bA' })).toBe(2);
  });

  it('never touches another business', async () => {
    await testDb().collection('venues').insertOne({ _id: 'm1', ...M, nameHebrew: 'גרם v2' });
    await testDb().collection('venues').insertOne({
      _id: 'x1', userId: 'ownerB', businessId: 'bB', createdBy: 'ownerB', _masterId: 'm1', _userModified: false, nameHebrew: 'v1',
    });
    await syncMasterToBusiness();
    expect((await testDb().collection('venues').findOne({ _id: 'x1' })).nameHebrew).toBe('v1');
  });

  it('cloning a recipe remaps ingredient referenceId from master product id to the business\'s cloned product id', async () => {
    await testDb().collection('products').insertOne({ _id: 'mp1', ...M, nameHebrew: 'קמח' });
    await testDb().collection('recipes').insertOne({
      _id: 'mr1', ...M, nameHebrew: 'לחם',
      ingredients: [{ referenceId: 'mp1', type: 'product', nameSnapshot: 'קמח' }],
    });
    await syncMasterToBusiness();
    const myProduct = await testDb().collection('products').findOne({ businessId: 'bA', _masterId: 'mp1' });
    const myRecipe = await testDb().collection('recipes').findOne({ businessId: 'bA', _masterId: 'mr1' });
    expect(myRecipe.ingredients[0].referenceId).toBe(myProduct._id);
  });

  it('a sibling sub-recipe cloned in the same run still resolves (order-independent)', async () => {
    // mr1 (main) references mr2 (sub-recipe) as a 'recipe' ingredient. Both are new
    // clones in this same sync run — the pre-pass must allocate both ids up front.
    await testDb().collection('recipes').insertMany([
      { _id: 'mr1', ...M, nameHebrew: 'תבשיל', ingredients: [{ referenceId: 'mr2', type: 'recipe', nameSnapshot: 'רוטב' }] },
      { _id: 'mr2', ...M, nameHebrew: 'רוטב' },
    ]);
    await syncMasterToBusiness();
    const main = await testDb().collection('recipes').findOne({ businessId: 'bA', _masterId: 'mr1' });
    const sub = await testDb().collection('recipes').findOne({ businessId: 'bA', _masterId: 'mr2' });
    expect(main.ingredients[0].referenceId).toBe(sub._id);
  });

  it('products Rule 1 skips cloning a master product whose name collides with an existing business product', async () => {
    await testDb().collection('products').insertMany([
      { _id: 'mp1', ...M, nameHebrew: 'מלח' },
      { _id: 'up1', ...mine(), nameHebrew: 'מלח' }, // the business already created one with the same name
    ]);
    const result = await syncMasterToBusiness();
    expect(result.inserted).toBe(0);
    expect(await testDb().collection('products').countDocuments({ businessId: 'bA' })).toBe(1);
  });

  it('two members of one business share one copy: syncing for the second member adds nothing', async () => {
    await testDb().collection('venues').insertOne({ _id: 'm1', ...M, nameHebrew: 'גרם' });
    expect((await syncMasterToBusiness()).inserted).toBe(1);
    // The second member signs in: the business is the same, so the copy already exists.
    expect((await syncMasterToBusiness()).inserted).toBe(0);
    expect(await testDb().collection('venues').countDocuments({ businessId: 'bA' })).toBe(1);
  });
});

describe('refresh sync gate (businesses.lastSyncedMasterVersion)', () => {
  const refreshAs = userId => {
    const cookie = jwt.sign({ userId }, 'test-refresh-secret');
    return request(app).post('/api/v1/auth/refresh').set('Cookie', [`fv_refresh_${process.env.PORT || 3000}=${cookie}`]);
  };
  const waitFor = async (fn) => {
    for (let i = 0; i < 40; i++) {
      if (await fn()) return true;
      await new Promise(r => setTimeout(r, 50));
    }
    return false;
  };

  async function seed(lastSyncedMasterVersion) {
    const db = testDb();
    await db.collection('users').insertMany([
      { _id: 'ownerA', name: 'ownerA', email: 'a@x.com', businessId: 'bA', businessRole: 'owner' },
      { _id: 'staffA', name: 'staffA', email: 's@x.com', businessId: 'bA', businessRole: 'staff', lastSyncedMasterVersion: 0 },
    ]);
    await db.collection('businesses').insertOne({
      _id: 'bA', name: 'A', ownerId: 'ownerA', createdAt: 1, internal: false, lastSyncedMasterVersion,
    });
    await db.collection('venues').insertOne({ _id: 'm1', ...M, nameHebrew: 'גרם' });
  }

  it('a stale business version syncs once on refresh and records the master version on the business', async () => {
    const { bumpMasterVersion } = require('../services/master-version');
    const version = await bumpMasterVersion();
    await seed(0);
    const res = await refreshAs('staffA');
    expect(res.status).toBe(200);
    expect(await waitFor(async () => (await testDb().collection('venues').countDocuments({ businessId: 'bA' })) === 1)).toBe(true);
    expect(await waitFor(async () => (await testDb().collection('businesses').findOne({ _id: 'bA' })).lastSyncedMasterVersion === version)).toBe(true);
    const clone = await testDb().collection('venues').findOne({ businessId: 'bA' });
    expect(clone.createdBy).toBe('ownerA'); // stamped with the business owner, whoever triggered the sync
  });

  it('a business already at the current version is not synced again (even if the user\'s own version is stale)', async () => {
    const { bumpMasterVersion } = require('../services/master-version');
    const version = await bumpMasterVersion();
    await seed(version);
    const res = await refreshAs('staffA');
    expect(res.status).toBe(200);
    await new Promise(r => setTimeout(r, 400));
    expect(await testDb().collection('venues').countDocuments({ businessId: 'bA' })).toBe(0);
  });
});
