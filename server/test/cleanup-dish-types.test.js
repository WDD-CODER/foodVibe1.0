'use strict';
/**
 * Plan 376 — dish-type cleanup: the pure mapping, then the whole plan on an in-memory DB
 * (dry run counts, apply remaps docs + terms, second run finds 0).
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const { MAPPING, mapCourse, droppedKeys, planCleanup } = require('../scripts/cleanup-dish-types');
const { recipeBody, stored } = require('./helpers/v2-docs');

/** The 63 values seeded before plan 376 (server/services/seed-master.js DEFAULT_COURSES at 2793859b). */
const OLD_COURSES = [
  'amuse_bouche', 'bakery', 'bread_focaccia_savory_baking', 'cakes_cookies_tarts', 'charcuterie_meat_mass_meat_preps',
  'conversions_and_techniques', 'dan_and_adi_cooking_from_the_orchard', 'dan_and_adi_dishes_from_the_orchard', 'desserts',
  'fermentation_curing_pickling', 'fish_shellfish_sauce', 'foams_hot_cold', 'general_preps', 'grains_side_dish',
  'ideas_dishes', 'ideas_preparations', 'jams_sweet_preps_syrup', 'legume_side_dish', 'main_dish_chicken',
  'main_dish_fish', 'main_dish_meat', 'main_dish_vegetarian', 'main_seafood', 'meat_sauce', 'oils_and_infusions',
  'pasta_dish', 'pasta_prep', 'pastry_sweets', 'pork_dish', 'powders_spice_mixes_dry_preps', 'pre_dessert',
  'salad_sauce', 'salads', 'salads_fresh_side_dish', 'salty_baking_doughs', 'sauces_cold_hot_savory', 'side_dish',
  'sorbet_ice_cream_granita', 'soups', 'soups_stocks_cooking_liquids', 'soups_up', 'special_for_boss',
  'special_main_for_boss', 'special_starter_for_boss', 'spreads_dips_salty_creams', 'starch_side_dish', 'starter',
  'starter_chicken', 'starter_fish', 'starter_meat', 'starter_seafood', 'starter_vegetarian', 'stews_cookery',
  'sweet_baking_doughs', 'sweet_creams_custards_mousse', 'sweet_sauce', 'trash_category', 'vegetable_side_dish',
  'vegetables_snacks_add_ons', 'vinaigrettes_mayonnaise_emulsion', 'גלייז', 'סלט', 'רוטב',
];

describe('MAPPING', () => {
  it('covers every old value exactly once, plus the new main_dish', () => {
    const all = [...MAPPING.keep, ...droppedKeys()];
    expect(new Set(all).size).toBe(all.length);
    expect([...all].sort()).toEqual([...OLD_COURSES, 'main_dish'].sort());
  });

  it('merges only into kept keys', () => {
    for (const target of [...Object.values(MAPPING.merge), ...Object.values(MAPPING.mergeInDishes)]) {
      expect(MAPPING.keep).toContain(target);
    }
  });
});

describe('mapCourse', () => {
  it('keeps approved keys, including preparation categories', () => {
    expect(mapCourse('starter', 'recipes')).toEqual({ next: 'starter', action: 'keep' });
    expect(mapCourse('meat_sauce', 'recipes')).toEqual({ next: 'meat_sauce', action: 'keep' });
    expect(mapCourse('soups_stocks_cooking_liquids', 'recipes')).toEqual({ next: 'soups_stocks_cooking_liquids', action: 'keep' });
  });

  it('merges in both collections', () => {
    expect(mapCourse('סלט', 'recipes')).toEqual({ next: 'salads', action: 'merge' });
    expect(mapCourse('special_main_for_boss', 'dishes')).toEqual({ next: 'main_dish', action: 'merge' });
  });

  it('merges dessert values on dishes only and keeps them on recipes', () => {
    expect(mapCourse('cakes_cookies_tarts', 'dishes')).toEqual({ next: 'desserts', action: 'merge' });
    expect(mapCourse('cakes_cookies_tarts', 'recipes')).toEqual({ next: 'cakes_cookies_tarts', action: 'keep' });
    expect(mapCourse('stews_cookery', 'recipes')).toEqual({ next: 'stews_cookery', action: 'keep' });
  });

  it('clears removed values', () => {
    expect(mapCourse('trash_category', 'dishes')).toEqual({ next: '', action: 'remove' });
  });

  it('leaves unknown and empty values alone', () => {
    expect(mapCourse('my_own_type', 'dishes')).toEqual({ next: 'my_own_type', action: 'unknown' });
    expect(mapCourse('', 'dishes')).toEqual({ next: '', action: 'none' });
    expect(mapCourse(undefined, 'recipes')).toEqual({ next: undefined, action: 'none' });
  });
});

describe('planCleanup on a database', () => {
  let mongod;
  let client;
  let db;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    client = new MongoClient(mongod.getUri());
    await client.connect();
    db = client.db('dish_types_test');
  }, 60000);

  afterAll(async () => {
    await client?.close();
    await mongod?.stop();
  });

  const term = (userId, key, sortOrder) => ({
    _id: `course:${userId}:${key}`, schemaVersion: 2, userId, createdAt: 1, updatedAt: 1, kind: 'course', key, sortOrder, color: '#78716C',
  });

  it('remaps documents, drops terms, adds main_dish, and is idempotent', async () => {
    await db.collection('taxonomyTerms').insertMany([
      ...MAPPING.keep.filter(k => k !== 'main_dish').map((k, i) => term('__master__', k, i)),
      term('__master__', 'trash_category', 90),
      term('u1', 'special_main_for_boss', 0),
      term('u1', 'my_own_type', 1),
    ]);
    await db.collection('recipes').insertMany([
      stored(recipeBody(), { _id: 'r1', userId: 'u1', course: 'pastry_sweets', _userModified: true }),
      stored(recipeBody(), { _id: 'r2', userId: 'u1', course: 'meat_sauce' }),
      stored(recipeBody(), { _id: 'r3', userId: '__master__', course: 'סלט' }),
    ]);
    await db.collection('dishes').insertMany([
      stored(recipeBody(), { _id: 'd1', userId: 'u1', course: 'pastry_sweets' }),
      stored(recipeBody(), { _id: 'd2', userId: 'u1', course: 'special_main_for_boss' }),
      stored(recipeBody(), { _id: 'd3', userId: 'u1', course: 'my_own_type' }),
      stored(recipeBody(), { _id: 'd4', userId: 'u1', course: 'trash_category' }),
    ]);

    const plan = await planCleanup(db, MAPPING, 5000);
    expect(plan.docChanges).toHaveLength(4);
    expect(plan.termDeletes.map(t => t._id).sort()).toEqual(['course:__master__:trash_category', 'course:u1:special_main_for_boss']);
    expect(plan.termAdds.map(t => t.key)).toEqual(['main_dish']);
    expect(plan.unknown).toEqual({ 'dishes:my_own_type': 1 });
    await plan.apply();

    const course = async (c, id) => (await db.collection(c).findOne({ _id: id })).course;
    expect(await course('recipes', 'r1')).toBe('pastry_sweets');
    expect(await course('recipes', 'r2')).toBe('meat_sauce');
    expect(await course('recipes', 'r3')).toBe('salads');
    expect(await course('dishes', 'd1')).toBe('desserts');
    expect(await course('dishes', 'd2')).toBe('main_dish');
    expect(await course('dishes', 'd3')).toBe('my_own_type');
    expect(await course('dishes', 'd4')).toBe('');
    const r1 = await db.collection('recipes').findOne({ _id: 'r1' });
    expect(r1.updatedAt).toBe(1);
    const d1 = await db.collection('dishes').findOne({ _id: 'd1' });
    expect(d1.updatedAt).toBe(5000);
    expect(r1._userModified).toBe(true);

    const masterKeys = (await db.collection('taxonomyTerms').find({ kind: 'course', userId: '__master__' }).toArray()).map(t => t.key);
    expect(masterKeys.sort()).toEqual([...MAPPING.keep].sort());
    expect(await db.collection('taxonomyTerms').findOne({ _id: 'course:u1:my_own_type' })).not.toBeNull();
    expect((await db.collection('MASTER_META').findOne({ _id: 'version' })).lastModified).toBe(5000);

    const again = await planCleanup(db);
    expect(again.docChanges).toHaveLength(0);
    expect(again.termDeletes).toHaveLength(0);
    expect(again.termAdds).toHaveLength(0);
  });
});
