'use strict';
/**
 * Plan 407 — one soft-delete model: delete stamps deletedAt/deletedBy, Trash lists it, restore
 * unsets it, the 30-day purge removes it for good (a stub for a master clone), and per-user state
 * (the favorite mark) never reaches another user.
 */

const request = require('supertest');
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app');
const { recipeBody, stored } = require('./helpers/v2-docs');

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
  await Promise.all(collections.filter(c => c.type === 'collection').map(c => db.collection(c.name).deleteMany({})));
});

const DAY = 24 * 60 * 60 * 1000;
const tokenA = () => signTestToken({ userId: 'userA', role: 'user' });
const tokenB = () => signTestToken({ userId: 'userB', role: 'user' });
const tokenAdmin = () => signTestToken({ userId: 'userA', role: 'admin' });
const auth = (req, token = tokenA()) => req.set('Authorization', `Bearer ${token}`);
const recipes = () => testDb().collection('recipes');
const lazy = mod => require(mod);

describe('Trash routes', () => {
  it('delete → listed in Trash, gone from the list → restore brings it back', async () => {
    await recipes().insertOne(stored(recipeBody({ nameHebrew: 'מרק' }), { _id: 'r1', userId: 'userA' }));

    expect((await auth(request(app).delete('/api/v1/data/recipes/r1'))).status).toBe(200);
    expect((await auth(request(app).get('/api/v1/data/recipes'))).body).toEqual([]);
    const trash = await auth(request(app).get('/api/v1/data/recipes/trash'));
    expect(trash.status).toBe(200);
    expect(trash.body.map(d => d._id)).toEqual(['r1']);
    expect(typeof trash.body[0].deletedAt).toBe('number');

    const restored = await auth(request(app).put('/api/v1/data/recipes/r1/restore'));
    expect(restored.status).toBe(200);
    expect(restored.body.deletedAt).toBeUndefined();
    expect(restored.body.deletedBy).toBeUndefined();
    expect((await auth(request(app).get('/api/v1/data/recipes'))).body.map(d => d._id)).toEqual(['r1']);
    expect((await auth(request(app).get('/api/v1/data/recipes/trash'))).body).toEqual([]);
  });

  it('a restored doc can be edited again (passes the schema)', async () => {
    await recipes().insertOne(stored(recipeBody(), { _id: 'r1', userId: 'userA', deletedAt: 5, deletedBy: 'userA' }));
    await auth(request(app).put('/api/v1/data/recipes/r1/restore'));
    const res = await auth(request(app).put('/api/v1/data/recipes/r1')).send(recipeBody({ nameHebrew: 'חדש' }));
    expect(res.status).toBe(200);
  });

  it('Trash shows only the caller\'s deleted docs, never stubs', async () => {
    await recipes().insertMany([
      stored(recipeBody(), { _id: 'a1', userId: 'userA', deletedAt: Date.now() }),
      stored(recipeBody(), { _id: 'a2', userId: 'userA' }),
      { _id: 'a3', schemaVersion: 2, userId: 'userA', _masterId: 'm3', deletedAt: Date.now(), purgedAt: Date.now() },
      stored(recipeBody(), { _id: 'b1', userId: 'userB', deletedAt: Date.now() }),
    ]);
    const res = await auth(request(app).get('/api/v1/data/recipes/trash'));
    expect(res.body.map(d => d._id)).toEqual(['a1']);
  });

  it('restore of another user\'s doc, or a live one, is a 404', async () => {
    await recipes().insertMany([
      stored(recipeBody(), { _id: 'b1', userId: 'userB', deletedAt: 5 }),
      stored(recipeBody(), { _id: 'a1', userId: 'userA' }),
    ]);
    expect((await auth(request(app).put('/api/v1/data/recipes/b1/restore'))).status).toBe(404);
    expect((await auth(request(app).put('/api/v1/data/recipes/a1/restore'))).status).toBe(404);
  });

  it('restore-all and empty Trash act on the caller\'s Trash only', async () => {
    const now = Date.now();
    await recipes().insertMany([
      stored(recipeBody(), { _id: 'a1', userId: 'userA', deletedAt: now }),
      stored(recipeBody(), { _id: 'a2', userId: 'userA', deletedAt: now, _masterId: 'm2' }),
      stored(recipeBody(), { _id: 'b1', userId: 'userB', deletedAt: now }),
    ]);
    const all = await auth(request(app).put('/api/v1/data/recipes/trash/restore-all'));
    expect(all.body).toEqual({ ok: true, restored: 2 });
    expect(await recipes().countDocuments({ deletedAt: { $exists: true } })).toBe(1);

    await recipes().updateMany({ userId: 'userA' }, { $set: { deletedAt: now } });
    const empty = await auth(request(app).delete('/api/v1/data/recipes/trash'));
    expect(empty.body).toEqual({ ok: true, disposed: 2 });
    expect(await recipes().findOne({ _id: 'a1' })).toBeNull();
    expect(await recipes().findOne({ _id: 'a2' })).toMatchObject({ _masterId: 'm2', purgedAt: expect.any(Number) });
    expect(await recipes().findOne({ _id: 'b1' })).toMatchObject({ deletedAt: now });
  });

  it('a type without Trash is rejected', async () => {
    expect((await auth(request(app).get('/api/v1/data/VERSION_HISTORY/trash'))).status).toBe(400);
  });
});

describe('purgeExpired (30 days from the original delete date)', () => {
  it('removes only docs deleted more than 30 days ago; a master clone becomes a stub', async () => {
    const now = Date.now();
    await recipes().insertMany([
      stored(recipeBody(), { _id: 'old-own', userId: 'userA', deletedAt: now - 31 * DAY }),
      stored(recipeBody(), { _id: 'old-clone', userId: 'userA', _masterId: 'm1', deletedAt: now - 31 * DAY, deletedBy: 'userA' }),
      stored(recipeBody(), { _id: 'young', userId: 'userA', deletedAt: now - 29 * DAY }),
      stored(recipeBody(), { _id: 'live', userId: 'userA' }),
    ]);
    const { purgeExpired } = lazy('../jobs/purge-deleted');
    const counts = await purgeExpired(testDb(), { now });
    expect(counts.recipes).toBe(2);
    expect(await recipes().findOne({ _id: 'old-own' })).toBeNull();
    const stub = await recipes().findOne({ _id: 'old-clone' });
    expect(stub).toEqual({
      _id: 'old-clone', schemaVersion: 2, userId: 'userA', _masterId: 'm1', _userModified: true,
      deletedAt: now - 31 * DAY, deletedBy: 'userA', purgedAt: now,
    });
    expect(await recipes().findOne({ _id: 'young' })).not.toBeNull();
    expect(await recipes().findOne({ _id: 'live' })).not.toBeNull();
    // A second run finds nothing more to do.
    expect((await purgeExpired(testDb(), { now })).recipes).toBe(0);
  });

  it('the stub passes the stored-doc schema check', async () => {
    const { toStub } = lazy('../jobs/purge-deleted');
    const { checkStoredDoc } = lazy('../middleware/validate');
    const stub = toStub({ _id: 'x', userId: 'u', _masterId: 'm', deletedAt: 1 }, 2);
    expect(checkStoredDoc('recipes', stub).ok).toBe(true);
  });

  it('opening Trash runs the purge for that user', async () => {
    await recipes().insertOne(stored(recipeBody(), { _id: 'old', userId: 'userA', deletedAt: Date.now() - 40 * DAY }));
    const res = await auth(request(app).get('/api/v1/data/recipes/trash'));
    expect(res.body).toEqual([]);
    expect(await recipes().findOne({ _id: 'old' })).toBeNull();
  });
});

describe('master sync with deleted docs', () => {
  const sync = userId => lazy('../services/sync-master').syncMasterToUser(userId);

  it('never re-clones a master item whose clone the user deleted or purged', async () => {
    await testDb().collection('venues').insertMany([
      { _id: 'm1', userId: '__master__', nameHebrew: 'א' },
      { _id: 'm2', userId: '__master__', nameHebrew: 'ב' },
      { _id: 'c1', userId: 'userA', _masterId: 'm1', _userModified: false, nameHebrew: 'א', deletedAt: 1 },
      { _id: 'c2', userId: 'userA', _masterId: 'm2', deletedAt: 1, purgedAt: 2 },
    ]);
    const result = await sync('userA');
    expect(result.inserted).toBe(0);
    expect(await testDb().collection('venues').countDocuments({ userId: 'userA' })).toBe(2);
  });

  it('does not refresh a deleted clone from master (it stays as the user left it)', async () => {
    await testDb().collection('venues').insertMany([
      { _id: 'm1', userId: '__master__', nameHebrew: 'חדש' },
      { _id: 'c1', userId: 'userA', _masterId: 'm1', _userModified: false, nameHebrew: 'ישן', deletedAt: 1 },
    ]);
    await sync('userA');
    expect((await testDb().collection('venues').findOne({ _id: 'c1' })).nameHebrew).toBe('ישן');
  });

  it('skips a master item deleted from master (sync and signup clone)', async () => {
    await testDb().collection('venues').insertOne({ _id: 'm1', userId: '__master__', nameHebrew: 'א', deletedAt: 1 });
    expect((await sync('userA')).inserted).toBe(0);
    const { cloneMasterDataToUser } = lazy('../services/clone-master');
    expect(await cloneMasterDataToUser('userB')).toBe(0);
  });

  it('delete-from-master soft-deletes the master doc', async () => {
    await recipes().insertMany([
      stored(recipeBody({ nameHebrew: 'משותף' }), { _id: 'm1', userId: '__master__' }),
      stored(recipeBody({ nameHebrew: 'משותף' }), { _id: 'a1', userId: 'userA', _masterId: 'm1' }),
    ]);
    const res = await auth(request(app).put('/api/v1/data/recipes/a1/delete-from-master'), tokenAdmin());
    expect(res.status).toBe(200);
    expect(await recipes().findOne({ _id: 'm1' })).toMatchObject({ nameHebrew: 'משותף', deletedBy: 'userA' });
    expect((await request(app).get('/api/v1/data/recipes')).body).toEqual([]);
  });
});

describe('favorites are per user (plan 407)', () => {
  it('user A\'s favorite mark never reaches user B through push-to-master + sync', async () => {
    await recipes().insertMany([
      stored(recipeBody({ nameHebrew: 'משותף' }), { _id: 'm1', userId: '__master__', _masterId: 'm1' }),
      stored(recipeBody({ nameHebrew: 'משותף', favorite: true }), { _id: 'a1', userId: 'userA', _masterId: 'm1', _userModified: true }),
      stored(recipeBody({ nameHebrew: 'משותף' }), { _id: 'b1', userId: 'userB', _masterId: 'm1', _userModified: false }),
    ]);
    const push = await auth(request(app).put('/api/v1/data/recipes/a1/push-to-master'), tokenAdmin());
    expect(push.status).toBe(200);
    expect((await recipes().findOne({ _id: 'm1' })).favorite).toBeUndefined();

    await lazy('../services/sync-master').syncMasterToUser('userB');
    const bList = await auth(request(app).get('/api/v1/data/recipes'), tokenB());
    expect(bList.body.map(r => r.favorite)).toEqual([undefined]);
    expect((await recipes().findOne({ _id: 'a1' })).favorite).toBe(true);
  });

  it('the old favoritedBy / hiddenBy arrays are rejected by the schema', async () => {
    await recipes().insertOne(stored(recipeBody(), { _id: 'a1', userId: 'userA' }));
    const res = await auth(request(app).put('/api/v1/data/recipes/a1')).send(recipeBody({ favoritedBy: ['userA'] }));
    expect(res.status).toBe(400);
  });
});
