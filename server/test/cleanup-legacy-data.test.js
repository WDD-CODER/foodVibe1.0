'use strict';
/**
 * Plan 403 — each cleanup fixer on an in-memory DB: the dry run counts, apply fixes it,
 * a second run finds 0 (idempotent).
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const F = require('../scripts/lib/cleanup-fixers');
const { recipeBody, productBody, stored } = require('./helpers/v2-docs');

let mongod;
let client;
let db;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  client = new MongoClient(mongod.getUri());
  await client.connect();
  db = client.db('cleanup_test');
}, 60000);

afterAll(async () => {
  await client?.close();
  await mongod?.stop();
});

beforeEach(async () => {
  await db.dropDatabase();
});

const total = r => r.rows.reduce((n, row) => n + row.count, 0);

/** dry run → apply → dry run again; returns the first run's total. */
async function runTwice(fixer, opts) {
  const first = await fixer(db, opts);
  const before = total(first);
  await first.apply();
  expect(total(await fixer(db, opts))).toBe(0);
  return before;
}

describe('F1 logistics: null', () => {
  it('unsets the null in live, trash and version-history docs only', async () => {
    await db.collection('recipes').insertMany([
      stored(recipeBody(), { _id: 'r1', userId: 'u', logistics: null }),
      stored(recipeBody(), { _id: 'r2', userId: 'u', logistics: { baseline: [] } }),
      stored(recipeBody(), { _id: 'r3', userId: 'u' }),
    ]);
    await db.collection('TRASH_DISHES').insertOne({ _id: 't1', userId: 'u', logistics: null });
    await db.collection('VERSION_HISTORY').insertOne({ _id: 'v1', userId: 'u', snapshot: { logistics: null } });
    expect(await runTwice(F.fixNullLogistics)).toBe(3);
    const r1 = await db.collection('recipes').findOne({ _id: 'r1' });
    expect('logistics' in r1).toBe(false);
    expect((await db.collection('recipes').findOne({ _id: 'r2' })).logistics).toEqual({ baseline: [] });
    expect('logistics' in (await db.collection('VERSION_HISTORY').findOne({ _id: 'v1' })).snapshot).toBe(false);
  });
});

describe('F2 _masterId: null in trash', () => {
  it('unsets it, leaves a real _masterId', async () => {
    await db.collection('TRASH_RECIPES').insertMany([
      { _id: 't1', userId: 'u', _masterId: null },
      { _id: 't2', userId: 'u', _masterId: 'm1' },
    ]);
    expect(await runTwice(F.fixNullMasterIdInTrash)).toBe(1);
    expect((await db.collection('TRASH_RECIPES').findOne({ _id: 't2' }))._masterId).toBe('m1');
  });
});

describe('F3 missing timestamps', () => {
  it('backfills from updatedAt, else now; leaves tombstones alone', async () => {
    const { createdAt: _c, updatedAt: _u, ...noTimes } = stored(productBody(), { _id: 'p1', userId: 'u' });
    await db.collection('products').insertMany([
      noTimes,
      { ...noTimes, _id: 'p2', updatedAt: 500 },
      { _id: 'p3', userId: 'u', schemaVersion: 2, _userDeleted: true },
    ]);
    expect(await runTwice(F.fixMissingTimestamps, { now: 1234 })).toBe(2);
    expect(await db.collection('products').findOne({ _id: 'p1' })).toMatchObject({ createdAt: 1234, updatedAt: 1234 });
    expect(await db.collection('products').findOne({ _id: 'p2' })).toMatchObject({ createdAt: 500, updatedAt: 500 });
    expect('createdAt' in await db.collection('products').findOne({ _id: 'p3' })).toBe(false);
  });
});

describe('F4 baseline equipment that does not exist', () => {
  it('drops only the dangling entries', async () => {
    await db.collection('equipment').insertOne({ _id: 'e1', userId: 'u' });
    const entry = id => ({ equipmentId: id, quantity: 1, phase: 'prep', isCritical: false });
    await db.collection('dishes').insertOne(stored(recipeBody(), {
      _id: 'd1', userId: 'u', logistics: { baseline: [entry('e1'), entry('eq_001'), entry('eq_002')] },
    }));
    expect(await runTwice(F.fixDanglingEquipment)).toBe(1);
    expect((await db.collection('dishes').findOne({ _id: 'd1' })).logistics.baseline.map(b => b.equipmentId)).toEqual(['e1']);
  });
});

describe('F5 empty v1 registry collections', () => {
  it('drops an empty one, never a non-empty one', async () => {
    await db.createCollection('KITCHEN_UNITS');
    await db.collection('MENU_TYPES').insertOne({ _id: 'default', userId: '__master__' });
    const first = await F.fixEmptyRegistryCollections(db);
    expect(total(first)).toBe(1);
    await first.apply();
    const names = (await db.listCollections().toArray()).map(c => c.name);
    expect(names).not.toContain('KITCHEN_UNITS');
    expect(names).toContain('MENU_TYPES');
    expect(total(await F.fixEmptyRegistryCollections(db))).toBe(0);
  });
});

describe('F6 approved test items', () => {
  it('deletes by exact name in master and user copies, with trash, history and terms', async () => {
    await db.collection('recipes').insertMany([
      stored(recipeBody({ nameHebrew: 'ממש חדש' }), { _id: 'r1', userId: '__master__' }),
      stored(recipeBody({ nameHebrew: 'ממש חדש' }), { _id: 'r2', userId: 'u', _masterId: 'r1' }),
      stored(recipeBody({ nameHebrew: '  ' }), { _id: 'r3', userId: 'u' }),
      stored(recipeBody({ nameHebrew: 'ממש חדש (עותק) נוסף' }), { _id: 'keep1', userId: 'u' }),
      stored(recipeBody({ nameHebrew: 'בצק פסטה קלאסי טסט' }), { _id: 'keep2', userId: 'u' }),
      { _id: 'tomb', userId: 'u', schemaVersion: 2, _userDeleted: true },
    ]);
    await db.collection('TRASH_RECIPES').insertOne({ _id: 'tr1', userId: 'u', nameHebrew: 'a1' });
    await db.collection('VERSION_HISTORY').insertOne({ _id: 'vh1', userId: 'u', entityType: 'recipe', entityId: 'r2' });
    await db.collection('taxonomyTerms').insertMany([
      { _id: 'k1', userId: 'u', kind: 'label', key: 'aaaa' },
      { _id: 'k2', userId: 'u', kind: 'label', key: 'aaaa-real' },
    ]);
    const first = await F.fixTestItems(db);
    expect(first.blockers).toEqual([]);
    expect(first.touchesMaster).toBe(true);
    await first.apply();
    expect((await db.collection('recipes').find({}).toArray()).map(d => d._id).sort()).toEqual(['keep1', 'keep2', 'tomb']);
    expect(await db.collection('TRASH_RECIPES').countDocuments()).toBe(0);
    expect(await db.collection('VERSION_HISTORY').countDocuments()).toBe(0);
    expect((await db.collection('taxonomyTerms').find({}).toArray()).map(t => t._id)).toEqual(['k2']);
    expect(total(await F.fixTestItems(db))).toBe(0);
  });

  it('refuses while a doc that stays uses a test product', async () => {
    await db.collection('products').insertOne(stored(productBody({ nameHebrew: 'טסט 1' }), { _id: 'p1', userId: 'u' }));
    await db.collection('recipes').insertOne(stored(recipeBody({
      nameHebrew: 'רוטב אמיתי',
      ingredients: [{ _id: 'i1', referenceId: 'p1', nameSnapshot: 'טסט 1', amount: 1, unit: 'kg' }],
    }), { _id: 'real', userId: 'u' }));
    const first = await F.fixTestItems(db);
    expect(first.blockers).toHaveLength(1);
    await expect(first.apply()).rejects.toThrow(/F6 refused/);
    expect(await db.collection('products').countDocuments()).toBe(1);
    // ...unless that referrer belongs to a test user F7 removes first.
    expect((await F.fixTestItems(db, { ignoreUserIds: ['u'] })).blockers).toEqual([]);
  });
});

describe('F7 test users', () => {
  it('local: deletes the user and every doc with their userId', async () => {
    await db.collection('users').insertMany([
      { _id: 'u-test', name: 'test1', role: 'user' },
      { _id: 'u-real', name: 'danwe', role: 'admin' },
    ]);
    await db.collection('recipes').insertMany([{ _id: 'a', userId: 'u-test' }, { _id: 'b', userId: 'u-real' }]);
    await db.collection('taxonomyTerms').insertOne({ _id: 't', userId: 'u-test', kind: 'label', key: 'x' });
    expect(await runTwice(F.fixTestUsers, { target: 'local' })).toBe(3);
    expect((await db.collection('users').find({}).toArray()).map(u => u.name)).toEqual(['danwe']);
    expect((await db.collection('recipes').find({}).toArray()).map(d => d._id)).toEqual(['b']);
  });

  it('atlas: refuses without --allow-atlas-users and without an admin left (A0b)', async () => {
    await db.collection('users').insertMany([
      { _id: 'h', name: 'hhhh', role: 'admin' },
      { _id: 'd', name: 'dan', role: 'user' },
    ]);
    const noFlag = await F.fixTestUsers(db, { target: 'atlas' });
    expect(noFlag.blockers).toHaveLength(2);
    await expect(noFlag.apply()).rejects.toThrow(/F7 refused/);

    await db.collection('users').insertOne({ _id: 'real', name: 'chef', role: 'user' });
    expect(await F.promoteAdmin(db, 'chef')).toBe(true);
    const ready = await F.fixTestUsers(db, { target: 'atlas', allowAtlasUsers: true });
    expect(ready.blockers).toEqual([]);
    await ready.apply();
    expect((await db.collection('users').find({}).toArray()).map(u => u.name)).toEqual(['chef']);
  });
});

describe('reports', () => {
  it('lists dangling ingredient and menu references without writing', async () => {
    await db.collection('recipes').insertOne(stored(recipeBody({
      nameHebrew: 'רוטב',
      ingredients: [{ _id: 'i1', referenceId: 'gone', nameSnapshot: 'x', amount: 1, unit: 'kg' }],
    }), { _id: 'r1', userId: 'u' }));
    await db.collection('menuEvents').insertOne({ _id: 'm1', userId: 'u', nameHebrew: 'אירוע', sections: [{ items: [{ recipeId: 'r1' }, { recipeId: 'nope' }] }] });
    const lines = await F.reportDanglingRefs(db);
    expect(lines).toHaveLength(2);
    expect(lines.join('\n')).toMatch(/gone[\s\S]*nope/);
  });

  it('schemaSummary counts a stored logistics: null as invalid', async () => {
    await db.collection('recipes').insertMany([
      stored(recipeBody(), { _id: 'r1', userId: 'u', logistics: null }),
      stored(recipeBody(), { _id: 'r2', userId: 'u' }),
    ]);
    expect((await F.schemaSummary(db)).find(s => s.collection === 'recipes')).toEqual({ collection: 'recipes', docs: 2, invalid: 1 });
  });
});
