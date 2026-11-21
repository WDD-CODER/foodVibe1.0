'use strict';
/** Plan 485 — the local product dedupe: which copy is kept, and how supplier prices merge. */

const { planGroups, mergeSources } = require('../scripts/dedupe-business-products');

describe('dedupe-business-products', () => {
  it('keeps the copy most recipe lines use, then an edited one, then the oldest', () => {
    const products = [
      { _id: 'a', nameHebrew: 'מלפפון', createdAt: 1 },
      { _id: 'b', nameHebrew: ' מלפפון ', createdAt: 2 },
      { _id: 'c', nameHebrew: 'מלפפון', createdAt: 3, _userModified: true },
      { _id: 'd', nameHebrew: 'בצל', createdAt: 1 },
    ];
    expect(planGroups(products, new Map([['b', 2]])).map(p => [p.keeper._id, p.losers.map(l => l._id)])).toEqual([['b', ['c', 'a']]]);
    expect(planGroups(products, new Map())[0].keeper._id).toBe('c');
    expect(planGroups(products.map(p => ({ ...p, _userModified: false })), new Map())[0].keeper._id).toBe('a');
  });

  it('merges supplier prices: one per supplier, the latest wins', () => {
    const merged = mergeSources([
      [{ supplierId: 's1', price: 5, addedAt: 1 }],
      [{ supplierId: 's1', price: 7, addedAt: 9 }, { supplierId: 's2', price: 3, addedAt: 2 }],
    ]);
    expect(merged).toEqual([{ supplierId: 's1', price: 7, addedAt: 9 }, { supplierId: 's2', price: 3, addedAt: 2 }]);
  });
});

describe('plan 648 — doubles from the master sync', () => {
  const { spawnSync } = require('node:child_process');
  const path = require('node:path');
  const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app');
  const { dedupeBusiness } = require('../scripts/dedupe-business-products');
  const names = ['פטרוזיליה', 'בצל', 'קמח'];

  beforeAll(async () => { await buildTestApp(); }, 60000);
  afterAll(async () => { await teardownTestApp(); });

  async function seed() {
    const db = testDb();
    for (const c of ['products', 'recipes', 'stockCounts', 'priceHistory']) await db.collection(c).deleteMany({});
    // The unique index would refuse the doubles: drop it for the seed (the sync, not the index, made them).
    await db.collection('products').dropIndex('product_business_master_unique').catch(() => {});
    const docs = [];
    names.forEach((name, i) => {
      docs.push({ _id: `old${i}`, businessId: 'bD', nameHebrew: name, _masterId: `m${i}`, createdAt: 1 });
      docs.push({ _id: `new${i}`, businessId: 'bD', nameHebrew: name, _masterId: `m${i}`, createdAt: 2 });
    });
    await db.collection('products').insertMany(docs);
    await db.collection('recipes').insertOne({ _id: 'r1', businessId: 'bD', ingredients: [{ referenceId: 'new0' }] });
    await db.collection('stockCounts').insertOne({ _id: 's1', businessId: 'bD', lines: [{ productId: 'new1', quantity: 2 }] });
    await db.collection('priceHistory').insertOne({ _id: 'h1', businessId: 'bD', productId: 'new2', at: 1 });
  }

  it('dry run reports three pairs and writes nothing; --write repoints references and deletes the other copy', async () => {
    await seed();
    const db = testDb();
    const lines = [];
    const dry = await dedupeBusiness(db, 'bD', { write: false, log: (l) => lines.push(l) });
    expect(dry).toMatchObject({ groups: 3, removed: 3 });
    expect(lines.filter((l) => l.includes('keep new'))).toHaveLength(3); // the referenced copy is kept
    expect(await db.collection('products').countDocuments({ businessId: 'bD' })).toBe(6);
    expect((await db.collection('recipes').findOne({ _id: 'r1' })).ingredients[0].referenceId).toBe('new0');

    await dedupeBusiness(db, 'bD', { write: true, log: () => {} });
    const left = await db.collection('products').find({ businessId: 'bD' }).toArray();
    expect(left.map((p) => p._id).sort()).toEqual(['new0', 'new1', 'new2']);
    expect((await db.collection('stockCounts').findOne({ _id: 's1' })).lines[0].productId).toBe('new1');
    expect((await db.collection('priceHistory').findOne({ _id: 'h1' })).productId).toBe('new2');
  });

  it('keeps the older copy when nothing references either', async () => {
    await seed();
    const db = testDb();
    await db.collection('recipes').deleteMany({});
    await db.collection('stockCounts').deleteMany({});
    await db.collection('priceHistory').deleteMany({});
    await dedupeBusiness(db, 'bD', { write: true, log: () => {} });
    expect((await db.collection('products').find({ businessId: 'bD' }).toArray()).map((p) => p._id).sort()).toEqual(['old0', 'old1', 'old2']);
  });

  it('refuses a target other than local without --confirm-remote (exit 1)', () => {
    const script = path.join(__dirname, '..', 'scripts', 'dedupe-business-products.js');
    const res = spawnSync(process.execPath, [script, '--target=atlas', '--confirm-host=x'], { encoding: 'utf8' });
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('--confirm-remote');
  });
});
