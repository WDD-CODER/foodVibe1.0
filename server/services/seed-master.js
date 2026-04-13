/**
 * Auto-seeds master data on server boot.
 *
 * Reads demo JSON files from public/assets/data/ and inserts them as
 * userId: '__master__' documents. Idempotent — skips if master data
 * already exists (checks PRODUCT_LIST for any __master__ doc).
 *
 * Called once from server/index.js after MongoDB connects.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { CLONEABLE_TYPES } = require('../constants/cloneable-types');

const ASSETS_DIR = path.resolve(__dirname, '..', '..', 'public', 'assets', 'data');

function makeId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < length; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

/**
 * Maps demo JSON filenames to their entity-type collection names.
 * Only types that have a demo JSON file are seeded.
 */
const DEMO_FILE_MAP = {
  PRODUCT_LIST:             'demo-products.json',
  RECIPE_LIST:              'demo-recipes.json',
  DISH_LIST:                'demo-dishes.json',
  KITCHEN_SUPPLIERS:        'demo-suppliers.json',
  EQUIPMENT_LIST:           'demo-equipment.json',
  VENUE_PROFILES:           'demo-venues.json',
  KITCHEN_PREPARATIONS:     'demo-kitchen-preparations.json',
  KITCHEN_LABELS:           'demo-labels.json',
  MENU_SECTION_CATEGORIES:  'demo-section-categories.json',
  MENU_EVENT_LIST:          'demo-menu-events.json',
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

/**
 * Seeds master data from demo JSON files into MongoDB.
 * Idempotent — skips entirely if any __master__ doc exists in PRODUCT_LIST.
 *
 * @returns {Promise<number>} total documents seeded (0 if skipped)
 */
async function seedMasterData() {
  const db = mongoose.connection.db;

  // Idempotency check: if master products already exist, skip
  const existing = await db.collection('PRODUCT_LIST').findOne({ userId: '__master__' });
  if (existing) {
    console.log('[seed-master] Master data already exists — skipping.');
    return 0;
  }

  console.log('[seed-master] No master data found — seeding from demo JSON files...');
  console.log('[seed-master] Assets dir:', ASSETS_DIR);
  console.log('[seed-master] Assets dir exists:', fs.existsSync(ASSETS_DIR));
  let totalSeeded = 0;

  // Pass 1: build an originalId → newMasterId map for PRODUCT_LIST so that
  // RECIPE_LIST / DISH_LIST ingredient referenceIds can be remapped in Pass 2.
  const productIdMap = new Map(); // originalId → newMasterId

  for (const entityType of CLONEABLE_TYPES) {
    const filename = DEMO_FILE_MAP[entityType];
    if (!filename) continue;

    const entities = readDemoFile(filename);
    if (entities.length === 0) continue;

    const docs = entities.map(entity => {
      // Always generate a fresh _id to avoid collisions with any existing user data.
      const newId = makeId();
      if (entityType === 'PRODUCT_LIST') {
        productIdMap.set(String(entity._id), newId);
      }

      const doc = {
        ...entity,
        _id: newId,
        userId: '__master__',
        _masterId: null,
        _userModified: false,
      };

      // Remap ingredient referenceIds so they point to the new master product IDs
      if ((entityType === 'RECIPE_LIST' || entityType === 'DISH_LIST') && Array.isArray(doc.ingredients_)) {
        doc.ingredients_ = doc.ingredients_.map(ing => {
          if (!ing.referenceId) return ing;
          const remapped = productIdMap.get(String(ing.referenceId));
          return remapped ? { ...ing, referenceId: remapped } : ing;
        });
      }

      // Normalized name for product collision detection
      if (entityType === 'PRODUCT_LIST' && doc.name_hebrew) {
        doc.name_hebrew_normalized = (doc.name_hebrew || '').trim().replace(/\s+/g, ' ').toLowerCase();
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
