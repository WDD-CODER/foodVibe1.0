'use strict';
/**
 * CHARACTERIZATION: current behavior of server/services/sync-master.js — the 4-rule
 * per-document sync that reconciles a user's namespace with __master__ on every
 * login/refresh. Plan 321 Phase 5 replaces this whole copy-per-user model with a
 * shared-master + override read path; these tests are the regression oracle for
 * that change and get rewritten (not silently deleted) when it lands.
 */

const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app');

beforeAll(async () => {
  await buildTestApp();
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

function syncMasterToUser(userId) {
  // Required lazily, after JWT/Mongo env vars are set by buildTestApp() — mirrors
  // how generic.js's route handlers only ever run after the app is built.
  return require('../services/sync-master').syncMasterToUser(userId);
}

describe('syncMasterToUser', () => {
  it('CHARACTERIZATION: Rule 1 — clones a new master item the user has no copy of', async () => {
    await testDb().collection('KITCHEN_UNITS').insertOne({ _id: 'm1', userId: '__master__', nameHebrew: 'גרם' });
    const result = await syncMasterToUser('userA');
    expect(result.inserted).toBe(1);
    const mine = await testDb().collection('KITCHEN_UNITS').findOne({ userId: 'userA' });
    expect(mine).toMatchObject({ _masterId: 'm1', _userModified: false, nameHebrew: 'גרם' });
    expect(mine._id).not.toBe('m1'); // gets its own user-scoped id, not the master id
  });

  it('CHARACTERIZATION: Rule 2 — an unmodified clone is overwritten with the latest master data', async () => {
    await testDb().collection('KITCHEN_UNITS').insertOne({ _id: 'm1', userId: '__master__', nameHebrew: 'גרם v2' });
    await testDb().collection('KITCHEN_UNITS').insertOne({ _id: 'u1', userId: 'userA', _masterId: 'm1', _userModified: false, nameHebrew: 'גרם v1' });
    const result = await syncMasterToUser('userA');
    expect(result.updated).toBe(1);
    const mine = await testDb().collection('KITCHEN_UNITS').findOne({ _id: 'u1' });
    expect(mine.nameHebrew).toBe('גרם v2');
    expect(mine._userModified).toBe(false);
  });

  it('CHARACTERIZATION: Rule 3 — a user-modified clone is never overwritten', async () => {
    await testDb().collection('KITCHEN_UNITS').insertOne({ _id: 'm1', userId: '__master__', nameHebrew: 'master value' });
    await testDb().collection('KITCHEN_UNITS').insertOne({ _id: 'u1', userId: 'userA', _masterId: 'm1', _userModified: true, nameHebrew: 'my edit' });
    const result = await syncMasterToUser('userA');
    expect(result.inserted).toBe(0);
    expect(result.updated).toBe(0);
    const mine = await testDb().collection('KITCHEN_UNITS').findOne({ _id: 'u1' });
    expect(mine.nameHebrew).toBe('my edit');
  });

  it('CHARACTERIZATION: Rule 4 — a master item removed from __master__ is not removed from the user\'s copy', async () => {
    // No master doc at all — simulates "was deleted from master since last sync".
    await testDb().collection('KITCHEN_UNITS').insertOne({ _id: 'u1', userId: 'userA', _masterId: 'm1', _userModified: false, nameHebrew: 'still here' });
    const result = await syncMasterToUser('userA');
    expect(result.inserted).toBe(0);
    expect(result.updated).toBe(0);
    const mine = await testDb().collection('KITCHEN_UNITS').findOne({ _id: 'u1' });
    expect(mine).not.toBeNull();
  });

  it('CHARACTERIZATION: cloning a recipe remaps ingredient referenceId from master product id to the user\'s cloned product id', async () => {
    await testDb().collection('products').insertOne({ _id: 'mp1', userId: '__master__', nameHebrew: 'קמח' });
    await testDb().collection('recipes').insertOne({
      _id: 'mr1', userId: '__master__', nameHebrew: 'לחם',
      ingredients: [{ referenceId: 'mp1', type: 'product', nameSnapshot: 'קמח' }],
    });
    await syncMasterToUser('userA');
    const myProduct = await testDb().collection('products').findOne({ userId: 'userA', _masterId: 'mp1' });
    const myRecipe = await testDb().collection('recipes').findOne({ userId: 'userA', _masterId: 'mr1' });
    expect(myRecipe.ingredients[0].referenceId).toBe(myProduct._id);
  });

  it('CHARACTERIZATION: a sibling sub-recipe cloned in the same run still resolves (order-independent)', async () => {
    // mr1 (main) references mr2 (sub-recipe) as a 'recipe' ingredient. Both are new
    // clones in this same sync run — the pre-pass must allocate both ids up front.
    await testDb().collection('recipes').insertMany([
      { _id: 'mr1', userId: '__master__', nameHebrew: 'תבשיל', ingredients: [{ referenceId: 'mr2', type: 'recipe', nameSnapshot: 'רוטב' }] },
      { _id: 'mr2', userId: '__master__', nameHebrew: 'רוטב' },
    ]);
    await syncMasterToUser('userA');
    const myMain = await testDb().collection('recipes').findOne({ userId: 'userA', _masterId: 'mr1' });
    const mySub = await testDb().collection('recipes').findOne({ userId: 'userA', _masterId: 'mr2' });
    expect(myMain.ingredients[0].referenceId).toBe(mySub._id);
  });

  it('CHARACTERIZATION: products Rule 1 skips cloning a master product whose name collides with an existing user product', async () => {
    await testDb().collection('products').insertMany([
      { _id: 'mp1', userId: '__master__', nameHebrew: 'מלח' },
      { _id: 'up1', userId: 'userA', nameHebrew: 'מלח' }, // user already created one with the same name
    ]);
    const result = await syncMasterToUser('userA');
    expect(result.inserted).toBe(0);
    const mine = await testDb().collection('products').find({ userId: 'userA' }).toArray();
    expect(mine).toHaveLength(1); // still just the user's own — no clone added
  });
});
