/**
 * Auto-seeds master data on server boot.
 *
 * Seeds the shared master taxonomy terms and the default kitchen stations.
 * Idempotent: each step skips when its master documents already exist.
 * (Plan 431: the old read of demo JSON files was dead code and is gone.)
 *
 * Called once from server/index.js after MongoDB connects.
 */

'use strict';

const mongoose = require('mongoose');
const { newId: makeId } = require('../utils/id');
const { logger } = require('../logger');

// ---------------------------------------------------------------------------
// Plan 321 Phase 3 — default shared taxonomy terms. Before Phase 3 the client seeded these
// into each user's own registry docs on first load; terms are now shared (master ∪ own), so
// a fresh database gets them once, as master terms. Same values the client used to seed.
// ---------------------------------------------------------------------------
/** Plan 376: real dish types only (Dandan, 2026-10-10). Same list as MAPPING.keep in scripts/cleanup-dish-types.js. */
const DEFAULT_COURSES = [
  'amuse_bouche', 'bread_focaccia_savory_baking', 'cakes_cookies_tarts', 'charcuterie_meat_mass_meat_preps',
  'desserts', 'fermentation_curing_pickling', 'fish_shellfish_sauce', 'foams_hot_cold', 'general_preps',
  'grains_side_dish', 'jams_sweet_preps_syrup', 'legume_side_dish', 'main_dish', 'main_dish_chicken',
  'main_dish_fish', 'main_dish_meat', 'main_dish_vegetarian', 'main_seafood', 'meat_sauce', 'oils_and_infusions',
  'pasta_dish', 'pasta_prep', 'pastry_sweets', 'pork_dish', 'powders_spice_mixes_dry_preps', 'pre_dessert',
  'salad_sauce', 'salads', 'salty_baking_doughs', 'sauces_cold_hot_savory', 'side_dish', 'sorbet_ice_cream_granita',
  'soups', 'soups_stocks_cooking_liquids', 'spreads_dips_salty_creams', 'starch_side_dish', 'starter',
  'starter_chicken', 'starter_fish', 'starter_meat', 'starter_seafood', 'starter_vegetarian', 'stews_cookery',
  'sweet_baking_doughs', 'sweet_creams_custards_mousse', 'sweet_sauce', 'vegetable_side_dish',
  'vegetables_snacks_add_ons', 'vinaigrettes_mayonnaise_emulsion', 'גלייז', 'רוטב',
];
const DEFAULT_DISH_FIELDS = ['sell_price', 'food_cost_money', 'serving_portions'];
const EVENT_TYPE_KEYS = ['עסקי', 'פרטי', 'חתונה', 'מסיבה', 'כנסים'];
const SYSTEM_UNITS = {
  kg: 1000, liter: 1000, gram: 1, ml: 1, unit: 1, dish: 1, tablespoon: 15, teaspoon: 5, cup: 240, pinch: 1, portion: 1,
};

/** The default master registries, in the v1 registry shape migration 0003 explodes into terms. */
function defaultMasterRegistries() {
  const master = fields => [{ _id: 'default', userId: '__master__', businessId: '__master__', createdBy: '__master__', ...fields }];
  return {
    KITCHEN_CATEGORIES: master({ items: ['vegetables', 'dairy', 'meat', 'dry', 'fish', 'spices'] }),
    KITCHEN_ALLERGENS: master({
      items: ['gluten', 'eggs', 'peanuts', 'nuts', 'soy', 'milk_solids', 'sesame', 'fish', 'shellfish', 'seafood'],
    }),
    KITCHEN_LABELS: [],
    KITCHEN_COURSES: master({
      items: DEFAULT_COURSES.map(key => ({ key })),
    }),
    MENU_TYPES: master({
      items: [
        { key: 'buffet_family', fields: DEFAULT_DISH_FIELDS },
        { key: 'plated_course', fields: DEFAULT_DISH_FIELDS },
        { key: 'cocktail_passed', fields: ['food_cost_pct', 'serving_portions_pct'] },
        { key: 'chef_plated_front', fields: DEFAULT_DISH_FIELDS },
      ],
    }),
    // Plan 440: the five default event types, keyed by their Hebrew names (the coefficients come from migration 0007).
    MENU_EVENT_TYPES: master({ items: EVENT_TYPE_KEYS }),
    MENU_SECTION_CATEGORIES: master({
      items: ['Amuse-Bouche', 'Appetizers', 'Soups', 'Salads', 'Main Course', 'Sides', 'Desserts', 'Beverages'],
    }),
    EQUIPMENT_CUSTOM_CATEGORIES: [],
    KITCHEN_UNITS: master({ units: SYSTEM_UNITS }),
    KITCHEN_PREPARATIONS: [],
  };
}

/**
 * Seeds the default shared taxonomy terms when there are no master terms yet (a fresh
 * database). Live databases got theirs from migration 0003, so this is a no-op there.
 * @returns {Promise<number>} terms seeded (0 if skipped)
 */
async function seedMasterTaxonomy() {
  const db = mongoose.connection.db;
  if (await db.collection('taxonomyTerms').findOne({ businessId: '__master__' })) return 0;
  // Required lazily: the migration module pulls in the generated schemas.
  const { buildTerms } = require('../migrations/0003-taxonomy-terms');
  const { termPatch } = require('../migrations/0007-coefficients');
  const { terms } = buildTerms(defaultMasterRegistries(), Date.now());
  // Plan 440: every seeded eventType / menuType term carries its coefficient (same table as migration 0007).
  const stamped = terms.map(t => ({ ...t, ...termPatch(t)?.$set, businessId: '__master__', createdBy: '__master__' }));
  await db.collection('taxonomyTerms').insertMany(stamped, { ordered: false });
  logger.info({ event: 'seed.master.taxonomy_seeded', count: terms.length });
  return terms.length;
}

/** Plan 436: the default kitchen stations, keyed by their Hebrew names. */
const DEFAULT_STATIONS = ['חם', 'קר', 'מאפה', 'קינוחים', 'הגשה'];

/**
 * Plan 436: inserts the five default master `station` terms when no master station term exists
 * (fresh and live databases alike). Idempotent. Never touches an existing document.
 * @returns {Promise<number>} terms inserted (0 if skipped)
 */
async function ensureDefaultStations() {
  const col = mongoose.connection.db.collection('taxonomyTerms');
  if (await col.findOne({ kind: 'station', businessId: '__master__' })) return 0;
  const now = Date.now();
  const terms = DEFAULT_STATIONS.map((key, sortOrder) => ({
    _id: makeId(),
    schemaVersion: 2,
    kind: 'station',
    key,
    sortOrder,
    userId: '__master__',
    businessId: '__master__',
    createdBy: '__master__',
    createdAt: now,
    updatedAt: now,
  }));
  await col.insertMany(terms, { ordered: false });
  logger.info({ event: 'seed.master.stations_seeded', count: terms.length });
  return terms.length;
}

/**
 * Seeds the master taxonomy terms and default stations. Idempotent.
 *
 * @returns {Promise<number>} total documents seeded (0 if nothing was missing)
 */
async function seedMasterData() {
  const seeded = (await seedMasterTaxonomy()) + (await ensureDefaultStations());
  logger.info({ event: 'seed.master.done', totalSeeded: seeded });
  return seeded;
}

module.exports = { seedMasterData, seedMasterTaxonomy, ensureDefaultStations };
