/**
 * Auto-seeds master data on server boot.
 *
 * Reads demo JSON files from public/assets/data/ and inserts them as
 * userId: '__master__' documents. Idempotent — skips if master data
 * already exists (checks products for any __master__ doc).
 *
 * Called once from server/index.js after MongoDB connects.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { CLONEABLE_TYPES } = require('../constants/cloneable-types');
const { newId: makeId } = require('../utils/id');
const { logger } = require('../logger');

const ASSETS_DIR = path.resolve(__dirname, '..', '..', 'public', 'assets', 'data');

/**
 * Maps demo JSON filenames to their entity-type collection names.
 * Only types that have a demo JSON file are seeded.
 */
const DEMO_FILE_MAP = {
  products:             'demo-products.json',
  recipes:              'demo-recipes.json',
  dishes:                'demo-dishes.json',
  suppliers:        'demo-suppliers.json',
  equipment:           'demo-equipment.json',
  venues:           'demo-venues.json',
  menuEvents:          'demo-menu-events.json',
};

/**
 * Reads a demo JSON file and returns parsed array, or [] if missing/invalid.
 */
function readDemoFile(filename) {
  const filePath = path.join(ASSETS_DIR, filename);
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      logger.warn({ event: 'seed.master.file_skipped', filename, reason: 'not an array' });
      return [];
    }
    return parsed;
  } catch (err) {
    logger.warn({ event: 'seed.master.file_skipped', filename, err });
    return [];
  }
}

const { upgradeV1toV2 } = require('../generated/schemas/upgrade/upgrade');
const { COLLECTION_RENAMES } = require('../generated/schemas/field-map.v1-to-v2');

/** v1-shaped demo entity -> v2 document (timestamps default to now, like the migration). */
function upgradeDemoEntity(entityType, entity) {
  const legacyName = Object.keys(COLLECTION_RENAMES).find(k => COLLECTION_RENAMES[k] === entityType);
  if (!legacyName) return entity;
  const { doc } = upgradeV1toV2(legacyName, entity);
  const now = Date.now();
  if (doc.createdAt === undefined) doc.createdAt = now;
  if (doc.updatedAt === undefined) doc.updatedAt = doc.createdAt;
  return doc;
}

// ---------------------------------------------------------------------------
// Plan 321 Phase 3 — default shared taxonomy terms. Before Phase 3 the client seeded these
// into each user's own registry docs on first load; terms are now shared (master ∪ own), so
// a fresh database gets them once, as master terms. Same values the client used to seed.
// ---------------------------------------------------------------------------
const LABEL_COLOR_PALETTE = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899',
  '#14B8A6', '#F97316', '#6366F1', '#84CC16', '#06B6D4', '#78716C',
];
const DEFAULT_COURSES = [
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
const DEFAULT_DISH_FIELDS = ['sell_price', 'food_cost_money', 'serving_portions'];
const SYSTEM_UNITS = {
  kg: 1000, liter: 1000, gram: 1, ml: 1, unit: 1, dish: 1, tablespoon: 15, teaspoon: 5, cup: 240, pinch: 1, portion: 1,
};

/** The default master registries, in the v1 registry shape migration 0003 explodes into terms. */
function defaultMasterRegistries() {
  const master = fields => [{ _id: 'default', userId: '__master__', ...fields }];
  return {
    KITCHEN_CATEGORIES: master({ items: ['vegetables', 'dairy', 'meat', 'dry', 'fish', 'spices'] }),
    KITCHEN_ALLERGENS: master({
      items: ['gluten', 'eggs', 'peanuts', 'nuts', 'soy', 'milk_solids', 'sesame', 'fish', 'shellfish', 'seafood'],
    }),
    KITCHEN_LABELS: [],
    KITCHEN_COURSES: master({
      items: DEFAULT_COURSES.map((key, i) => ({ key, color: LABEL_COLOR_PALETTE[i % LABEL_COLOR_PALETTE.length] })),
    }),
    MENU_TYPES: master({
      items: [
        { key: 'buffet_family', fields: DEFAULT_DISH_FIELDS },
        { key: 'plated_course', fields: DEFAULT_DISH_FIELDS },
        { key: 'cocktail_passed', fields: ['food_cost_pct', 'serving_portions_pct'] },
      ],
    }),
    MENU_EVENT_TYPES: [],
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
  if (await db.collection('taxonomyTerms').findOne({ userId: '__master__' })) return 0;
  // Required lazily: the migration module pulls in the generated schemas.
  const { buildTerms } = require('../migrations/0003-taxonomy-terms');
  const { terms } = buildTerms(defaultMasterRegistries(), Date.now());
  await db.collection('taxonomyTerms').insertMany(terms, { ordered: false });
  logger.info({ event: 'seed.master.taxonomy_seeded', count: terms.length });
  return terms.length;
}

/**
 * Seeds master data from demo JSON files into MongoDB.
 * Idempotent — skips entirely if any __master__ doc exists in products.
 *
 * @returns {Promise<number>} total documents seeded (0 if skipped)
 */
async function seedMasterData() {
  const db = mongoose.connection.db;

  // Ordering guard: products must appear before recipes/dishes so the
  // productIdMap is fully built before ingredient referenceIds are remapped.
  const _pidx = CLONEABLE_TYPES.indexOf('products');
  const _ridx = CLONEABLE_TYPES.indexOf('recipes');
  const _didx = CLONEABLE_TYPES.indexOf('dishes');
  if (_pidx === -1 || _ridx === -1 || _pidx > _ridx || (_didx !== -1 && _pidx > _didx)) {
    throw new Error('[seed-master] CLONEABLE_TYPES ordering violation: products must precede recipes and dishes');
  }

  // Idempotency check: if master products already exist, skip
  const existing = await db.collection('products').findOne({ userId: '__master__' });
  if (existing) {
    logger.info({ event: 'seed.master.skipped' }, 'master data already exists');
    return seedMasterTaxonomy();
  }

  logger.info({ event: 'seed.master.begin', assetsDir: ASSETS_DIR, assetsDirExists: fs.existsSync(ASSETS_DIR) }, 'no master data found — seeding from demo JSON files');
  let totalSeeded = 0;

  // Pass 1: build an originalId → newMasterId map for products so that
  // recipes / dishes ingredient referenceIds can be remapped in Pass 2.
  const productIdMap = new Map(); // originalId → newMasterId

  for (const entityType of CLONEABLE_TYPES) {
    const filename = DEMO_FILE_MAP[entityType];
    if (!filename) continue;

    const entities = readDemoFile(filename);
    if (entities.length === 0) continue;

    const docs = entities.map(entity => {
      // Always generate a fresh _id to avoid collisions with any existing user data.
      const newId = makeId();
      if (entityType === 'products') {
        productIdMap.set(String(entity._id), newId);
      }

      // Demo JSON files are still v1-shaped — upgrade each to the v2 document shape.
      const upgraded = upgradeDemoEntity(entityType, entity);
      const doc = {
        ...upgraded,
        _id: newId,
        userId: '__master__',
        _masterId: null,
        _userModified: false,
      };

      // Remap ingredient referenceIds so they point to the new master product IDs
      if ((entityType === 'recipes' || entityType === 'dishes') && Array.isArray(doc.ingredients)) {
        doc.ingredients = doc.ingredients.map(ing => {
          if (!ing.referenceId) return ing;
          const remapped = productIdMap.get(String(ing.referenceId));
          return remapped ? { ...ing, referenceId: remapped } : ing;
        });
      }

      // Normalized name for product collision detection
      if (entityType === 'products' && doc.nameHebrew) {
        doc.nameHebrewNormalized = (doc.nameHebrew || '').trim().replace(/\s+/g, ' ').toLowerCase();
      }

      return doc;
    });

    try {
      await db.collection(entityType).insertMany(docs, { ordered: false });
      totalSeeded += docs.length;
      logger.info({ event: 'seed.master.collection_seeded', entityType, inserted: docs.length });
    } catch (err) {
      if (err.code === 11000) {
        const inserted = err.result?.insertedCount ?? 0;
        totalSeeded += inserted;
        logger.info({ event: 'seed.master.collection_seeded', entityType, inserted, duplicatesSkipped: docs.length - inserted });
      } else {
        logger.error({ err, event: 'seed.master.collection_failed', entityType });
      }
    }
  }

  totalSeeded += await seedMasterTaxonomy();
  logger.info({ event: 'seed.master.done', totalSeeded });
  return totalSeeded;
}

module.exports = { seedMasterData, seedMasterTaxonomy };
