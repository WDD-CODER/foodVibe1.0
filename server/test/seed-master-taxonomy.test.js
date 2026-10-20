'use strict';
/**
 * Plan 321 Phase 3 — a fresh database gets the default shared taxonomy terms once (the client
 * no longer seeds per-user registries); a database that already has master terms is untouched.
 */

const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app');
const { parseV2 } = require('../utils/schema-check');

let seedMasterTaxonomy;

beforeAll(async () => {
  await buildTestApp();
  ({ seedMasterTaxonomy } = require('../services/seed-master'));
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
