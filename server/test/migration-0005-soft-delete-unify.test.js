'use strict';
/**
 * Plan 407 — migration 0005: TRASH_* back into their collections with deletedAt, tombstones to
 * purged stubs, favoritedBy/hiddenBy to `favorite`, TRASH_* dropped after verify; a second run
 * changes nothing.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app');
const M = require('../migrations/0005-soft-delete-unify');

let backupDir;

beforeAll(async () => {
  await buildTestApp();
  backupDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fv-0005-'));
  fs.writeFileSync(path.join(backupDir, '_manifest.json'), JSON.stringify({ target: 'local', takenAt: new Date().toISOString(), totalDocuments: 1 }));
}, 60000);

afterAll(async () => {
  await teardownTestApp();
  fs.rmSync(backupDir, { recursive: true, force: true });
});

beforeEach(async () => {
  const db = testDb();
  for (const c of await db.listCollections().toArray()) if (c.type === 'collection') await db.collection(c.name).drop();
});

const args = () => ({ target: 'local', 'backup-dir': backupDir });

describe('planTrashDoc (pure)', () => {
  it('inserts a trash doc with nothing in place, keeping its delete time', () => {
    const r = M.planTrashDoc({ _id: 'r1', userId: 'u', nameHebrew: 'x', deletedAt: 100, _masterId: null }, null, 999);
    expect(r).toEqual({ action: 'insert', doc: { _id: 'r1', userId: 'u', nameHebrew: 'x', deletedAt: 100, deletedBy: 'u', _userModified: false } });
  });

  it('replaces a tombstone, taking the real _masterId from it', () => {
    const tomb = { _id: 'r1', userId: 'u', _masterId: 'm1', _userDeleted: true, _userModified: true };
    const r = M.planTrashDoc({ _id: 'r1', userId: 'u', nameHebrew: 'x', deletedAt: 100, _masterId: null }, tomb, 999);
    expect(r.action).toBe('replace');
    expect(r.doc).toMatchObject({ _masterId: 'm1', _userModified: true, nameHebrew: 'x', deletedAt: 100 });
    expect(r.doc._userDeleted).toBeUndefined();
  });

  it('a trash copy loses the legacy arrays too, keeping only the owner favorite', () => {
    const r = M.planTrashDoc({ _id: 'r1', userId: 'u', deletedAt: 1, favoritedBy: ['v', 'u'], hiddenBy: ['v'] }, null, 9);
    expect(r.doc).toEqual({ _id: 'r1', userId: 'u', deletedAt: 1, deletedBy: 'u', _userModified: false, favorite: true });
  });

  it('a live doc in place makes the trash copy stale; another owner is a conflict', () => {
    expect(M.planTrashDoc({ _id: 'r1', userId: 'u' }, { _id: 'r1', userId: 'u', nameHebrew: 'y' }, 1).action).toBe('stale');
    expect(M.planTrashDoc({ _id: 'r1', userId: 'u' }, { _id: 'r1', userId: 'v' }, 1).action).toBe('conflict');
  });

  it('favoriteUpdate keeps only the owner\'s own mark and strips every legacy array', () => {
    expect(M.favoriteUpdate({ userId: 'u', favoritedBy: ['v', 'u'], hiddenBy: [] }))
      .toEqual({ $set: { favorite: true }, $unset: { favoritedBy: '', favoritedBy_: '', hiddenBy: '' } });
    expect(M.favoriteUpdate({ userId: 'u', favoritedBy: ['v'] }).$set).toBeUndefined();
    expect(M.favoriteUpdate({ userId: '__master__', favoritedBy: ['__master__'] }).$set).toBeUndefined();
  });
});

describe('0005 write + verify', () => {
  async function seed(db) {
    await db.collection('TRASH_RECIPES').insertMany([
      { _id: 'r-own', userId: 'u', nameHebrew: 'own', deletedAt: 100 },
      { _id: 'r-clone', userId: 'u', nameHebrew: 'clone', deletedAt: 200, _masterId: null, _userModified: false },
      { _id: 'r-restored', userId: 'u', nameHebrew: 'old copy', deletedAt: 300 },
    ]);
    await db.collection('TRASH_SUPPLIERS').insertOne({ _id: 'm-sup', userId: '__master__', nameHebrew: 'ספק', deletedAt: 400 });
    await db.collection('recipes').insertMany([
      { _id: 'r-clone', userId: 'u', _masterId: 'm1', _userDeleted: true, _userModified: true, schemaVersion: 2 },
      { _id: 'r-restored', userId: 'u', nameHebrew: 'live copy' },
      { _id: 'lonely-tomb', userId: 'u', _masterId: 'm9', _userDeleted: true, _userModified: true, schemaVersion: 2 },
      { _id: 'fav', userId: 'u', nameHebrew: 'f', favoritedBy: ['u'], hiddenBy: [] },
      { _id: 'junk', userId: 'v', nameHebrew: 'j', favoritedBy: ['u'] },
    ]);
  }

  it('moves everything, drops TRASH_*, and a second run is a no-op', async () => {
    const db = testDb();
    await seed(db);
    const now = 5000;
    await M.write(db, args(), await M.plan(db, now), now);

    const recipes = Object.fromEntries((await db.collection('recipes').find({}).toArray()).map(d => [d._id, d]));
    expect(recipes['r-own']).toMatchObject({ nameHebrew: 'own', deletedAt: 100, deletedBy: 'u' });
    expect(recipes['r-clone']).toMatchObject({ nameHebrew: 'clone', _masterId: 'm1', deletedAt: 200, _userModified: true });
    expect(recipes['r-clone']._userDeleted).toBeUndefined();
    expect(recipes['r-restored']).toEqual({ _id: 'r-restored', userId: 'u', nameHebrew: 'live copy' });
    expect(recipes['lonely-tomb']).toEqual({
      _id: 'lonely-tomb', schemaVersion: 2, userId: 'u', _masterId: 'm9', _userModified: true, deletedAt: now, deletedBy: 'u', purgedAt: now,
    });
    expect(recipes.fav).toEqual({ _id: 'fav', userId: 'u', nameHebrew: 'f', favorite: true });
    expect(recipes.junk).toEqual({ _id: 'junk', userId: 'v', nameHebrew: 'j' });
    expect(await db.collection('suppliers').findOne({ _id: 'm-sup' })).toMatchObject({ userId: '__master__', deletedAt: 400 });

    const names = (await db.listCollections().toArray()).map(c => c.name);
    expect(names.filter(n => n.startsWith('TRASH_'))).toEqual([]);

    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await M.verify(db);
    expect(log.mock.calls.flat().join('\n')).toContain('[verify] OK');

    const snapshot = await db.collection('recipes').find({}).sort({ _id: 1 }).toArray();
    const second = await M.plan(db, 9999);
    expect(Object.keys(second.trash)).toEqual([]);
    expect(Object.values(second.tombstones).flat()).toEqual([]);
    expect(Object.values(second.legacyArrays).flat()).toEqual([]);
    await M.write(db, args(), second, 9999);
    expect(await db.collection('recipes').find({}).sort({ _id: 1 }).toArray()).toEqual(snapshot);
    log.mockRestore();
  });

  it('keeps a TRASH_* collection that has an _id conflict, and verify fails', async () => {
    const db = testDb();
    await db.collection('TRASH_DISHES').insertOne({ _id: 'd1', userId: 'u', deletedAt: 1 });
    await db.collection('dishes').insertOne({ _id: 'd1', userId: 'other' });
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await M.write(db, args(), await M.plan(db, 10), 10);
    expect(await db.collection('TRASH_DISHES').countDocuments()).toBe(1);
    await M.verify(db);
    expect(log.mock.calls.flat().join('\n')).toContain('STILL PRESENT TRASH_DISHES');
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
    log.mockRestore();
  });
});
