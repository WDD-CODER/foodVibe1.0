'use strict';
/**
 * Plan 379: pure planning logic of server/scripts/dedupe-master-names.js (no database).
 */

const { planDedupe } = require('../scripts/dedupe-master-names');

const M = '__master__';
const deletes = (plan) => plan.writes.filter((w) => w.op === 'delete').map((w) => `${w.col}/${w._id}`).sort();
const finalDoc = (plan, col, id) => plan.writes.find((w) => w.op === 'replace' && w.col === col && w._id === id)?.doc;

describe('planDedupe', () => {
  it('merges an identical master duplicate and its user clone, repointing references first', () => {
    const plan = planDedupe({
      products: [
        { _id: 'p1', userId: M, nameHebrew: 'טחינה', createdAt: 1 },
        { _id: 'p2', userId: M, nameHebrew: 'טחינה', createdAt: 2 },
        { _id: 'u1', userId: 'A', _masterId: 'p1', nameHebrew: 'טחינה' },
        { _id: 'u2', userId: 'A', _masterId: 'p2', nameHebrew: 'טחינה' },
      ],
      recipes: [
        { _id: 'r1', userId: M, nameHebrew: 'רוטב', ingredients: [{ referenceId: 'p2', type: 'product' }] },
        { _id: 'ur1', userId: 'A', _masterId: 'r1', nameHebrew: 'רוטב', ingredients: [{ referenceId: 'u2', type: 'product' }] },
      ],
    });
    expect(deletes(plan)).toEqual(['products/p2', 'products/u2']);
    expect(finalDoc(plan, 'recipes', 'r1').ingredients[0].referenceId).toBe('p1');
    expect(finalDoc(plan, 'recipes', 'ur1').ingredients[0].referenceId).toBe('u1');
    expect(plan.remaining).toEqual([]);
    expect(plan.danglingRefs).toEqual([]);
  });

  it('a recipe pair that only differed by duplicate product refs becomes identical and merges', () => {
    const plan = planDedupe({
      products: [
        { _id: 'p1', userId: M, nameHebrew: 'טחינה', createdAt: 1 },
        { _id: 'p2', userId: M, nameHebrew: 'טחינה', createdAt: 2 },
      ],
      recipes: [
        { _id: 'r1', userId: M, nameHebrew: 'רוטב', createdAt: 1, ingredients: [{ referenceId: 'p1' }] },
        { _id: 'r2', userId: M, nameHebrew: 'רוטב', createdAt: 2, ingredients: [{ referenceId: 'p2' }] },
      ],
    });
    expect(deletes(plan)).toEqual(['products/p2', 'recipes/r2']);
  });

  it('fills fields only the extra had into the keeper (nutrition on one copy)', () => {
    const nutrition = { energyKcal: 30 };
    const plan = planDedupe({
      products: [
        { _id: 'p1', userId: M, nameHebrew: 'עירית', createdAt: 1 },
        { _id: 'p2', userId: M, nameHebrew: 'עירית', createdAt: 2, nutritionPer100g: nutrition },
        { _id: 'u1', userId: 'A', _masterId: 'p1', nameHebrew: 'עירית' },
      ],
    });
    expect(deletes(plan)).toEqual(['products/p2']);
    expect(finalDoc(plan, 'products', 'p1').nutritionPer100g).toEqual(nutrition);
    expect(finalDoc(plan, 'products', 'u1').nutritionPer100g).toEqual(nutrition);
  });

  it('renames a duplicate whose content really differs, never deletes it', () => {
    const plan = planDedupe({
      products: [
        { _id: 'p1', userId: M, nameHebrew: 'גבינה', createdAt: 1, price: 5 },
        { _id: 'p2', userId: M, nameHebrew: 'גבינה', createdAt: 2, price: 9 },
        { _id: 'u2', userId: 'A', _masterId: 'p2', nameHebrew: 'גבינה' },
      ],
    });
    expect(deletes(plan)).toEqual([]);
    expect(finalDoc(plan, 'products', 'p2').nameHebrew).toBe('גבינה 2');
    expect(finalDoc(plan, 'products', 'u2').nameHebrew).toBe('גבינה 2');
  });

  it('a dish twin of a preparation is renamed with "(מנה)"', () => {
    const plan = planDedupe({
      recipes: [{ _id: 'r1', userId: M, nameHebrew: 'שיפוד', createdAt: 1 }],
      dishes: [{ _id: 'd1', userId: M, nameHebrew: 'שיפוד', createdAt: 2 }],
    });
    expect(finalDoc(plan, 'dishes', 'd1').nameHebrew).toBe('שיפוד (מנה)');
  });

  it('--force-delete merges a differing duplicate by name', () => {
    const plan = planDedupe(
      {
        recipes: [
          { _id: 'r1', userId: M, nameHebrew: 'רוטב', createdAt: 2, steps: ['a'] },
          { _id: 'r2', userId: M, nameHebrew: 'רוטב', createdAt: 1, steps: ['b'] },
        ],
      },
      { forceDelete: ['רוטב'] }
    );
    expect(deletes(plan)).toEqual(['recipes/r1']);
  });

  it('keeps the master that has a user-edited clone, even when it is newer', () => {
    const plan = planDedupe({
      products: [
        { _id: 'p1', userId: M, nameHebrew: 'מלח', createdAt: 1 },
        { _id: 'p2', userId: M, nameHebrew: 'מלח', createdAt: 2 },
        { _id: 'u2', userId: 'A', _masterId: 'p2', _userModified: true, nameHebrew: 'מלח' },
      ],
    });
    expect(deletes(plan)).toEqual(['products/p1']);
  });

  it('never deletes or renames a user-edited clone of a removed master', () => {
    const plan = planDedupe({
      products: [
        { _id: 'p1', userId: M, nameHebrew: 'מלח', createdAt: 1 },
        { _id: 'u1', userId: 'B', _masterId: 'p1', _userModified: true, nameHebrew: 'מלח' },
        { _id: 'p2', userId: M, nameHebrew: 'מלח', createdAt: 2 },
        { _id: 'u2', userId: 'A', _masterId: 'p2', _userModified: true, nameHebrew: 'מלח' },
      ],
    });
    expect(deletes(plan)).toEqual(['products/p2']);
    expect(plan.log.skippedEdited.map((s) => s._id)).toEqual(['u2']);
  });

  it('re-links a user clone to the keeper when the user has no clone of the keeper', () => {
    const plan = planDedupe({
      products: [
        { _id: 'p1', userId: M, nameHebrew: 'מלח', createdAt: 1 },
        { _id: 'p2', userId: M, nameHebrew: 'מלח', createdAt: 2 },
        { _id: 'u2', userId: 'A', _masterId: 'p2', nameHebrew: 'מלח' },
      ],
    });
    expect(deletes(plan)).toEqual(['products/p2']);
    expect(finalDoc(plan, 'products', 'u2')._masterId).toBe('p1');
  });
});
