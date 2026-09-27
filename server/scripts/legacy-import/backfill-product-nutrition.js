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
 * $sets `Product.nutrition_per_100g` on the matching PRODUCT_LIST docs by
 * `_legacyProductId`. (This script originally wrote the field as
 * `nutrition_per_100g_` — trailing underscore — which the Product model and
 * every UI consumer never read; that run's already-written docs are migrated
 * to the correct field name by the cleanup step at the end of this script.)
 * Cholesterol IS carried over as of plan 317, into the new
 * `nutrition_per_100g.cholesterol_mg` field (the source column is misspelled
 * `colesterol`). It was excluded originally only because the model had no
 * field for it; the Human has since asked for every real value to migrate, so
 * the field was added deliberately rather than as a script side effect.
 *
 * Nutrition values at or above 100,000 mg/100g are rejected as impossible —
 * more than 100% of the mass they sit in. One row trips it (see MAX_NUTRITION_MG).
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
    else if (arg === '--write=atlas') args.write = 'atlas';
    else if (arg.startsWith('--target=')) args.target = arg.slice('--target='.length);
    else if (arg.startsWith('--sql-path=')) args.sqlPath = arg.slice('--sql-path='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

/** True for the one obviously-fake sequential test row (1,2,3,4,5,6 — cucumber in the source data). */
function isFakeTestRow(row) {
  return row.calories === 1 && row.protein === 2 && row.carbohydrate === 3 && row.fat === 4 && row.Sodium === 5 && row.colesterol === 6;
}

// A nutrient cannot exceed the mass it sits in: >100,000 mg per 100g is more
// than 100% by weight. Exactly one row trips this — אבקת אפיה (baking powder)
// at 158,000 mg sodium, where real baking powder is ~11,000, so it reads as a
// 10x entry error. Plan 317 §7: reject the impossible value, keep the rest.
// The other 22 sodium readings check out against real-world figures (egg yolk
// 48mg exactly, wakame 872 vs ~870), so the column itself is sound.
const MAX_NUTRITION_MG = 100000;

function buildNutrition(row, onRejected) {
  const n = {};
  if (row.calories) n.energy_kcal = row.calories;
  if (row.protein) n.protein_g = row.protein;
  if (row.carbohydrate) n.carbs_g = row.carbohydrate;
  if (row.fat) n.fat_g = row.fat;
  // Source Sodium is in mg (e.g. egg yolk: 48 ≈ real-world 48mg/100g); model field is grams.
  if (row.Sodium) {
    if (row.Sodium >= MAX_NUTRITION_MG) onRejected?.(`product ${row.product} (${row.productName}): sodium ${row.Sodium} mg/100g exceeds 100% by mass — rejected`);
    else n.sodium_g = row.Sodium / 1000;
  }
  // Source column is misspelled `colesterol`; already in mg/100g, and the model
  // field keeps mg rather than converting, since that is how cholesterol is
  // conventionally read on a label.
  if (row.colesterol) {
    if (row.colesterol >= MAX_NUTRITION_MG) onRejected?.(`product ${row.product} (${row.productName}): cholesterol ${row.colesterol} mg/100g exceeds 100% by mass — rejected`);
    else n.cholesterol_mg = row.colesterol;
  }
  return Object.keys(n).length > 0 ? n : null;
}

async function run({ write, target: args_target, sqlPath }) {
  const target = write || args_target || 'local';
  const uri = target === 'atlas' ? process.env.MONGO_URI : process.env.MONGO_LOCAL_URI;
  if (!uri) throw new Error(`${target === 'atlas' ? 'MONGO_URI' : 'MONGO_LOCAL_URI'} is not set in server/.env`);

  const text = readSqlDumpAsUtf8(sqlPath || DEFAULT_SQL_PATH);
  const productsRaw = extractInserts(text, 'tblProducts');

  const nutritionByLegacyId = new Map(); // legacyProductId -> NutritionPer100g
  const rejected = [];
  let skippedFake = 0;
  for (const row of productsRaw) {
    if (isFakeTestRow(row)) { skippedFake++; continue; }
    const nutrition = buildNutrition(row, msg => rejected.push(msg));
    if (nutrition) nutritionByLegacyId.set(row.product, nutrition);
  }
  console.log(`[backfill-product-nutrition] Source: ${productsRaw.length} products, ${nutritionByLegacyId.size} with plausible nutrition data (${skippedFake} fake test row skipped).`);
  const withChol = [...nutritionByLegacyId.values()].filter(n => n.cholesterol_mg != null).length;
  console.log(`[backfill-product-nutrition] of those, ${withChol} carry cholesterol_mg.`);
  if (rejected.length) {
    console.log(`[backfill-product-nutrition] ${rejected.length} value(s) rejected as physically impossible:`);
    for (const r of rejected) console.log(`  - ${r}`);
  }

  console.log('[backfill-product-nutrition] Connecting ...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;

  // ---- Pass 1: __master__ PRODUCT_LIST -----------------------------------
  const masterProducts = await db.collection('PRODUCT_LIST')
    .find({ userId: '__master__', _legacyProductId: { $exists: true } })
    .project({ _id: 1, _legacyProductId: 1, name_hebrew: 1 })
    .toArray();

  const masterOps = [];
  const masterIdToNutrition = new Map(); // master _id -> nutrition, for the per-user pass below
  for (const p of masterProducts) {
    const nutrition = nutritionByLegacyId.get(p._legacyProductId);
    if (!nutrition) continue;
    masterOps.push({ _id: p._id, nutrition_per_100g: nutrition });
    masterIdToNutrition.set(String(p._id), nutrition);
  }
  console.log(`[backfill-product-nutrition] __master__: ${write ? 'backfilling' : 'would backfill'} ${masterOps.length} product(s).`);

  if (write && masterOps.length > 0) {
    await db.collection('PRODUCT_LIST').bulkWrite(
      masterOps.map(op => ({
        updateOne: { filter: { _id: op._id }, update: { $set: { nutrition_per_100g: op.nutrition_per_100g } } },
      })),
      { ordered: false }
    );
  }

  // ---- Pass 2: already-cloned per-user products missing it ---------------
  const userIds = await db.collection('PRODUCT_LIST').distinct('userId', { userId: { $ne: '__master__' }, _masterId: { $ne: null } });
  let totalUserUpdated = 0;

  for (const userId of userIds) {
    const userProducts = await db.collection('PRODUCT_LIST')
      .find({ userId, _masterId: { $ne: null } })
      .project({ _id: 1, _masterId: 1 })
      .toArray();

    const userOps = [];
    for (const p of userProducts) {
      const nutrition = masterIdToNutrition.get(String(p._masterId));
      if (!nutrition) continue;
      userOps.push({ _id: p._id, nutrition_per_100g: nutrition });
    }

    if (write && userOps.length > 0) {
      await db.collection('PRODUCT_LIST').bulkWrite(
        userOps.map(op => ({
          updateOne: { filter: { _id: op._id }, update: { $set: { nutrition_per_100g: op.nutrition_per_100g } } },
        })),
        { ordered: false }
      );
    }
    if (userOps.length > 0) {
      console.log(`[backfill-product-nutrition]   ${userId}: ${write ? 'backfilled' : 'would backfill'} ${userOps.length} product(s).`);
    }
    totalUserUpdated += userOps.length;
  }

  console.log(`\n[backfill-product-nutrition] Total: master ${masterOps.length}, per-user ${totalUserUpdated} product(s) ${write ? 'backfilled' : 'would be backfilled'}.`);
  if (!write) {
    console.log('[backfill-product-nutrition] Dry run — no writes made. Re-run with --write=local to apply.');
  }

  // ---- Cleanup: remove the stale wrong-named field from a prior run -------
  // (this script originally wrote `nutrition_per_100g_`, which nothing reads —
  // now that the correctly-named field is (re)populated above, drop the dead one.)
  const staleFilter = { nutrition_per_100g_: { $exists: true } };
  const staleCount = await db.collection('PRODUCT_LIST').countDocuments(staleFilter);
  console.log(`[backfill-product-nutrition] Stale 'nutrition_per_100g_' field present on ${staleCount} doc(s) — ${write ? 'removing' : 'would remove'}.`);
  if (write && staleCount > 0) {
    await db.collection('PRODUCT_LIST').updateMany(staleFilter, { $unset: { nutrition_per_100g_: '' } });
  }

  await mongoose.disconnect();
}

const args = parseArgs(process.argv);
run(args).catch(err => {
  console.error(err);
  process.exit(1);
});
