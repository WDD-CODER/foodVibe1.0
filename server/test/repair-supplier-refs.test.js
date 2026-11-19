'use strict';
/** Plan 649 — repair-supplier-refs: dry run lists, --write applies exactly that, prices never change. */

const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app');
const { parseArgs, repairBusiness } = require('../scripts/repair-supplier-refs');

beforeAll(async () => { await buildTestApp(); }, 60000);
afterAll(async () => { await teardownTestApp(); });

async function seed() {
  const db = testDb();
  for (const c of ['products', 'suppliers']) await db.collection(c).deleteMany({});
  await db.collection('suppliers').insertMany([
    { _id: 'ms1', businessId: '__master__', nameHebrew: 'ווילד בייקרי' },
    { _id: 'ownA', businessId: 'bR', _masterId: 'ms1', nameHebrew: 'ווילד בייקרי' },
    { _id: 'ownB', businessId: 'bR', _masterId: 'zzz', nameHebrew: ' ספק שמות ' },
    { _id: 'foreignC', businessId: 'bOther', _masterId: 'foreignC', nameHebrew: 'ספק שמות' },
    { _id: 'foreignD', businessId: 'bOther', _masterId: 'foreignD', nameHebrew: 'לא קיים אצלי' },
  ]);
  await db.collection('products').insertMany([
    { _id: 'p1', businessId: 'bR', nameHebrew: 'לחם', sources: [{ supplierId: 'ms1', price: 11, addedAt: 1 }, { supplierId: 'ownB', price: 12, addedAt: 1 }] },
    { _id: 'p2', businessId: 'bR', nameHebrew: 'חלב', sources: [{ supplierId: 'foreignC', price: 5, addedAt: 1 }, { supplierId: 'gone', price: 6, addedAt: 1 }, { supplierId: 'foreignD', price: 7, addedAt: 1 }] },
    { _id: 'p3', businessId: 'bR', nameHebrew: 'ביצים', sources: [{ supplierId: '', price: 9, addedAt: 1 }, { supplierId: 'ownA', price: 4, addedAt: 1 }] },
  ]);
}

describe('repair-supplier-refs', () => {
  it('--target other than local needs --confirm-remote', () => {
    expect(() => parseArgs(['node', 's', '--target=atlas'])).toThrow(/confirm-remote/);
    expect(parseArgs(['node', 's', '--target=atlas', '--confirm-remote']).target).toBe('atlas');
    expect(parseArgs(['node', 's', '--target=local']).write).toBe(false);
    const run = spawnSync(process.execPath, [path.join(__dirname, '../scripts/repair-supplier-refs.js'), '--target=atlas'], { encoding: 'utf8' });
    expect(run.status).toBe(1);
    expect(run.stderr).toMatch(/confirm-remote/);
  });

  it('dry run lists foreign, unknown and empty sources with their fix and writes nothing', async () => {
    await seed();
    const db = testDb();
    const lines = [];
    const s = await repairBusiness(db, 'bR', { write: false, log: (l) => lines.push(l) });
    expect(s).toMatchObject({ products: 3, foreign: 3, unknown: 1, empty: 1, mapped: 2, cleared: 2 });
    expect(lines.some((l) => l.includes('map by _masterId ownA'))).toBe(true);
    expect(lines.some((l) => l.includes('map by name ownB'))).toBe(true);
    expect(lines.filter((l) => l.includes('→ clear'))).toHaveLength(2);
    expect((await db.collection('products').findOne({ _id: 'p2' })).sources[0].supplierId).toBe('foreignC');
  });

  it('--write applies exactly that and never touches a price', async () => {
    await seed();
    const db = testDb();
    await repairBusiness(db, 'bR', { write: true, log: () => {} });
    const p1 = await db.collection('products').findOne({ _id: 'p1' });
    // ms1 → ownA by _masterId; ownB already is the business's own
    expect(p1.sources.map((s) => [s.supplierId, s.price])).toEqual([['ownA', 11], ['ownB', 12]]);
    const p2 = await db.collection('products').findOne({ _id: 'p2' });
    expect(p2.sources.map((s) => [s.supplierId, s.price])).toEqual([['ownB', 5], ['', 6], ['', 7]]);
    const p3 = await db.collection('products').findOne({ _id: 'p3' });
    expect(p3.sources.map((s) => [s.supplierId, s.price])).toEqual([['', 9], ['ownA', 4]]);
  });
});
