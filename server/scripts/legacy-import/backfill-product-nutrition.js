'use strict';
/**
 * backfill-product-nutrition.js — one-time data repair for the legacy
 * FoodComposer import: the import excluded ALL nutrition data as "placeholder
 * junk" (see commit 9a8aca4). Re-auditing the source found that's only true
 * for a small minority — of the 1,248 source products, only 35 have any
 * nonzero nutrition value at all, and only one of those (cucumber:
 * calories/protein/carb/fat/sodium/cholesterol = 1/2/3/4/5/6, an obviously
 * fake sequential test row) looks fabricated. The rest look like genuinely
 * entered real values (e.g. egg yolk: 322 kcal, 1085mg cholesterol).
 *
 * Re-parses tblProducts from the SQL dump, takes every row with a plausible
 * nonzero nutrition value (excluding the one fake sequential row), and
 * $sets `Product.nutrition_per_100g_` on the matching PRODUCT_LIST docs by
 * `_legacyProductId`. Note: the source also has a `colesterol` (cholesterol)
 * column, but `NutritionPer100g` (src/app/core/models/product.model.ts) has
 * no matching field — cholesterol values are intentionally NOT carried over
 * here rather than growing the model as a side effect of a data-repair script.
 *
 * Runs in two passes, master first (so future syncs to *new* users inherit
 * this automatically), then already-cloned per-user products missing it.
 *
 * Usage:
 *   node server/scripts/legacy-import/backfill-product-nutrition.js [--write=local] [--sql-path=PATH]
 *
 * With no --write flag, this is a dry run: reports what would change, writes
 * nothing. Pass --write=local to apply against MONGO_LOCAL_URI.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
require('node:dns').setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const { readSqlDumpAsUtf8, extractInserts } = require('./lib/sql-parser');

const DEFAULT_SQL_PATH = path.resolve(__dirname, 'source-data', 'fullDATA_utf8.sql');

function parseArgs(argv) {
  const args = {};
  for (const arg of argv.slice(2)) {
    if (arg === '--write=local') args.write = 'local';
    else if (arg.startsWith('--sql-path=')) args.sqlPath = arg.slice('--sql-path='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

/** True for the one obviously-fake sequential test row (1,2,3,4,5,6 — cucumber in the source data). */
function isFakeTestRow(row) {
  return row.calories === 1 && row.protein === 2 && row.carbohydrate === 3 && row.fat === 4 && row.Sodium === 5 && row.colesterol === 6;
}

function buildNutrition(row) {
  const n = {};
  if (row.calories) n.energy_kcal = row.calories;
  if (row.protein) n.protein_g = row.protein;
  if (row.carbohydrate) n.carbs_g = row.carbohydrate;
  if (row.fat) n.fat_g = row.fat;
  // Source Sodium is in mg (e.g. egg yolk: 48 ≈ real-world 48mg/100g); model field is grams.
  if (row.Sodium) n.sodium_g = row.Sodium / 1000;
  return Object.keys(n).length > 0 ? n : null;
}

async function run({ write, sqlPath }) {
  const uri = process.env.MONGO_LOCAL_URI;
  if (!uri) throw new Error('MONGO_LOCAL_URI is not set in server/.env');

  const text = readSqlDumpAsUtf8(sqlPath || DEFAULT_SQL_PATH);
  const productsRaw = extractInserts(text, 'tblProducts');

  const nutritionByLegacyId = new Map(); // legacyProductId -> NutritionPer100g
  let skippedFake = 0;
  for (const row of productsRaw) {
    if (isFakeTestRow(row)) { skippedFake++; continue; }
    const nutrition = buildNutrition(row);
    if (nutrition) nutritionByLegacyId.set(row.product, nutrition);
  }
  console.log(`[backfill-product-nutrition] Source: ${productsRaw.length} products, ${nutritionByLegacyId.size} with plausible nutrition data (${skippedFake} fake test row skipped).`);

  console.log('[backfill-product-nutrition] Connecting to local ...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;

  // ---- Pass 1: __master__ PRODUCT_LIST -----------------------------------
  const masterProducts = await db.collection('PRODUCT_LIST')
    .find({ userId: '__master__', _legacyProductId: { $exists: true }, nutrition_per_100g_: { $exists: false } })
    .project({ _id: 1, _legacyProductId: 1, name_hebrew: 1 })
    .toArray();

  const masterOps = [];
  const masterIdToNutrition = new Map(); // master _id -> nutrition, for the per-user pass below
  for (const p of masterProducts) {
    const nutrition = nutritionByLegacyId.get(p._legacyProductId);
    if (!nutrition) continue;
    masterOps.push({ _id: p._id, nutrition_per_100g_: nutrition });
    masterIdToNutrition.set(String(p._id), nutrition);
  }
  console.log(`[backfill-product-nutrition] __master__: ${write === 'local' ? 'backfilling' : 'would backfill'} ${masterOps.length} product(s).`);

  if (write === 'local' && masterOps.length > 0) {
    await db.collection('PRODUCT_LIST').bulkWrite(
      masterOps.map(op => ({
        updateOne: { filter: { _id: op._id }, update: { $set: { nutrition_per_100g_: op.nutrition_per_100g_ } } },
      })),
      { ordered: false }
    );
  }

  // ---- Pass 2: already-cloned per-user products missing it ---------------
  const userIds = await db.collection('PRODUCT_LIST').distinct('userId', { userId: { $ne: '__master__' }, _masterId: { $ne: null } });
  let totalUserUpdated = 0;

  for (const userId of userIds) {
    const userProducts = await db.collection('PRODUCT_LIST')
      .find({ userId, _masterId: { $ne: null }, nutrition_per_100g_: { $exists: false } })
      .project({ _id: 1, _masterId: 1 })
      .toArray();

    const userOps = [];
    for (const p of userProducts) {
      const nutrition = masterIdToNutrition.get(String(p._masterId));
      if (!nutrition) continue;
      userOps.push({ _id: p._id, nutrition_per_100g_: nutrition });
    }

    if (write === 'local' && userOps.length > 0) {
      await db.collection('PRODUCT_LIST').bulkWrite(
        userOps.map(op => ({
          updateOne: { filter: { _id: op._id }, update: { $set: { nutrition_per_100g_: op.nutrition_per_100g_ } } },
        })),
        { ordered: false }
      );
    }
    if (userOps.length > 0) {
      console.log(`[backfill-product-nutrition]   ${userId}: ${write === 'local' ? 'backfilled' : 'would backfill'} ${userOps.length} product(s).`);
    }
    totalUserUpdated += userOps.length;
  }

  console.log(`\n[backfill-product-nutrition] Total: master ${masterOps.length}, per-user ${totalUserUpdated} product(s) ${write === 'local' ? 'backfilled' : 'would be backfilled'}.`);
  if (write !== 'local') {
    console.log('[backfill-product-nutrition] Dry run — no writes made. Re-run with --write=local to apply.');
  }

  await mongoose.disconnect();
}

const args = parseArgs(process.argv);
run(args).catch(err => {
  console.error(err);
  process.exit(1);
});
