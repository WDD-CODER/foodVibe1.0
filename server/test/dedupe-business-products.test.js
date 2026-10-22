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
