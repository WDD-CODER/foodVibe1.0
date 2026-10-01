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
  KITCHEN_PREPARATIONS:     'demo-kitchen-preparations.json',
  KITCHEN_LABELS:           'demo-labels.json',
  MENU_SECTION_CATEGORIES:  'demo-section-categories.json',
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
      console.warn(`[seed-master]   ${filename}: not an array — skipping`);
      return [];
    }
    return parsed;
  } catch (err) {
    console.warn(`[seed-master]   ${filename}: could not read (${err.message}) — skipping`);
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
    console.log('[seed-master] Master data already exists — skipping.');
    return 0;
  }

  console.log('[seed-master] No master data found — seeding from demo JSON files...');
  console.log('[seed-master] Assets dir:', ASSETS_DIR);
  console.log('[seed-master] Assets dir exists:', fs.existsSync(ASSETS_DIR));
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
      console.log(`[seed-master]   ${entityType}: ${docs.length} docs seeded`);
    } catch (err) {
      if (err.code === 11000) {
        const inserted = err.result?.insertedCount ?? 0;
        totalSeeded += inserted;
        console.log(`[seed-master]   ${entityType}: ${inserted} docs seeded (${docs.length - inserted} duplicates skipped)`);
      } else {
        console.error(`[seed-master]   ${entityType}: ERROR —`, err.message);
      }
    }
  }

  console.log(`[seed-master] Done. Total seeded: ${totalSeeded}`);
  return totalSeeded;
}

module.exports = { seedMasterData };
