'use strict';
/**
 * Plan 321 Phase 3 — a fresh database gets the default shared taxonomy terms once (the client
 * no longer seeds per-user registries); a database that already has master terms is untouched.
 */

const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app');
const { parseV2 } = require('../utils/schema-check');

let seedMasterTaxonomy;
let ensureDefaultStations;

beforeAll(async () => {
  await buildTestApp();
  ({ seedMasterTaxonomy, ensureDefaultStations } = require('../services/seed-master'));
}, 60000);

afterAll(async () => {
  await teardownTestApp();
});

beforeEach(async () => {
  await testDb().collection('taxonomyTerms').deleteMany({});
});

it('seeds valid default master terms for the core kinds on an empty database', async () => {
  const seeded = await seedMasterTaxonomy();
  const terms = await testDb().collection('taxonomyTerms').find({}).toArray();
  expect(seeded).toBe(terms.length);
  expect(terms.every(t => t.userId === '__master__')).toBe(true);
  expect(terms.every(t => parseV2('taxonomyTerms', t).success)).toBe(true);
  const kinds = new Set(terms.map(t => t.kind));
  for (const k of ['ingredientCategory', 'allergen', 'course', 'menuType', 'sectionCategory', 'unit']) expect(kinds.has(k)).toBe(true);
  expect(terms.find(t => t.kind === 'unit' && t.key === 'kg').gramRate).toBe(1000);
});

it('seeds dish types without a color (plan 438)', async () => {
  await seedMasterTaxonomy();
  const courses = await testDb().collection('taxonomyTerms').find({ kind: 'course' }).toArray();
  expect(courses.length).toBeGreaterThan(0);
  expect(courses.some(t => 'color' in t)).toBe(false);
});

it('seeds the five event types and four serving types with their coefficients (plan 440)', async () => {
  await seedMasterTaxonomy();
  const coefficients = async kind => Object.fromEntries(
    (await testDb().collection('taxonomyTerms').find({ kind }).toArray()).map(t => [t.key, t.coefficient])
  );
  expect(await coefficients('eventType')).toEqual({ 'עסקי': 1.1, 'פרטי': 1.15, 'חתונה': 1.2, 'מסיבה': 1.1, 'כנסים': 0.9 });
  expect(await coefficients('menuType')).toEqual({ plated_course: 1, buffet_family: 1.1, cocktail_passed: 3, chef_plated_front: 2 });
});

it('is a no-op once master terms exist', async () => {
  await seedMasterTaxonomy();
  const before = await testDb().collection('taxonomyTerms').countDocuments();
  expect(await seedMasterTaxonomy()).toBe(0);
  expect(await testDb().collection('taxonomyTerms').countDocuments()).toBe(before);
});

describe('ensureDefaultStations (plan 436)', () => {
  const stations = () => testDb().collection('taxonomyTerms').find({ kind: 'station' }).sort({ sortOrder: 1 }).toArray();

  it('inserts the five master stations when master terms exist but no station', async () => {
    await seedMasterTaxonomy();
    expect(await stations()).toHaveLength(0);
    expect(await ensureDefaultStations()).toBe(5);
    const terms = await stations();
    expect(terms.map(t => t.key)).toEqual(['חם', 'קר', 'מאפה', 'קינוחים', 'הגשה']);
    expect(terms.map(t => t.sortOrder)).toEqual([0, 1, 2, 3, 4]);
    expect(terms.every(t => t.businessId === '__master__' && parseV2('taxonomyTerms', t).success)).toBe(true);
  });

  it('inserts 0 on a second run', async () => {
    await ensureDefaultStations();
    expect(await ensureDefaultStations()).toBe(0);
    expect(await stations()).toHaveLength(5);
  });

  it('inserts 0 when any master station term already exists', async () => {
    await ensureDefaultStations();
    await testDb().collection('taxonomyTerms').deleteMany({ kind: 'station', key: { $ne: 'חם' } });
    expect(await ensureDefaultStations()).toBe(0);
    expect(await stations()).toHaveLength(1);
  });
});

describe('seedMasterData (plan 431)', () => {
  it('seeds the master taxonomy on an empty database and logs no seed.master.file_skipped', async () => {
    const { logger } = require('../logger');
    const spy = vi.spyOn(logger, 'warn');
    await testDb().collection('taxonomyTerms').deleteMany({});
    const { seedMasterData } = require('../services/seed-master');
    const seeded = await seedMasterData();
    const terms = await testDb().collection('taxonomyTerms').countDocuments({ businessId: '__master__' });
    expect(seeded).toBeGreaterThan(0);
    expect(terms).toBe(seeded);
    expect(spy.mock.calls.some(([arg]) => arg?.event === 'seed.master.file_skipped')).toBe(false);
    spy.mockRestore();
  });
});
