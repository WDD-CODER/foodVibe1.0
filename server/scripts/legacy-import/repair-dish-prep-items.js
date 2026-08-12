'use strict';
/**
 * repair-dish-prep-items.js — corrects `prep_items_`/`prep_categories_` for
 * already-imported dishes to match the fixed derivation in `lib/transform.js`
 * (plan 300 Finding 5): a dish's מיזאנפלס list must include every ingredient
 * line — sub-recipes AND plain products — not just sub-recipe components.
 * `backfill-dish-prep-items.js` (the earlier repair, still correct for what it
 * did) only filled in dishes that had NO prep_items_ at all, using the old
 * sub-recipe-only rule; this script REPLACES prep_items_/prep_categories_ on
 * every already-imported dish, regardless of whether it already has data, so
 * previously-backfilled dishes get corrected too, not just previously-blank ones.
 *
 * Source of truth: re-parses the SQL dump fresh and runs the real `buildImport()`
 * — the exact same function the real import and `verify-against-source.js` use —
 * so this can never drift from what a fresh import would produce. No hand-rolled
 * re-derivation from already-migrated Mongo data (avoids double-transformation risk).
 *
 * Runs in two passes:
 *   1. `__master__` DISH_LIST — matched by `_legacyRecipeNo`, `$set` from the
 *      freshly-built expected doc's prep_items_/prep_categories_.
 *   2. Every non-master user's DISH_LIST clones (`_masterId` matching a
 *      corrected master doc) — copies the corrected master's prep_items_/
 *      prep_categories_ onto the user's own copy, so already-cloned per-user
 *      data is corrected too, not just master (which by itself would only fix
 *      future syncs).
 *
 * Usage:
 *   node server/scripts/legacy-import/repair-dish-prep-items.js [--write=local] [--sql-path=PATH]
 *
 * With no --write flag, this is a dry run: reports what would change, writes
 * nothing. Pass --write=local to apply against MONGO_LOCAL_URI.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
require('node:dns').setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const { readSqlDumpAsUtf8, extractInserts } = require('./lib/sql-parser');
const { buildImport } = require('./lib/transform');

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

function sameArrayJson(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

async function run({ write, sqlPath }) {
  const uri = process.env.MONGO_LOCAL_URI;
  if (!uri) throw new Error('MONGO_LOCAL_URI is not set in server/.env');

  console.log('[repair-dish-prep-items] Re-parsing SQL dump fresh ...');
  const text = readSqlDumpAsUtf8(sqlPath || DEFAULT_SQL_PATH);
  const raw = {
    suppliersRaw: extractInserts(text, 'tblSuppliers'),
    productsRaw: extractInserts(text, 'tblProducts'),
    recipesRaw: extractInserts(text, 'tblRecipies'),
    recipeProductsRaw: extractInserts(text, 'tblRecipeProducts'),
    instructionsRaw: extractInserts(text, 'tblInstructions'),
  };
  const expected = buildImport(raw, { now: Date.now() });
  const expectedByLegacyNo = new Map(expected.dishes.map(d => [d._legacyRecipeNo, d]));
  console.log(`[repair-dish-prep-items] Expected: ${expected.dishes.length} dishes from source.`);

  console.log('[repair-dish-prep-items] Connecting to local ...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;

  // ---- Pass 1: __master__ DISH_LIST --------------------------------------
  const masterDishes = await db.collection('DISH_LIST')
    .find({ userId: '__master__', _legacyRecipeNo: { $exists: true } })
    .project({ _id: 1, name_hebrew: 1, _legacyRecipeNo: 1, prep_items_: 1, prep_categories_: 1 })
    .toArray();

  const masterOps = [];
  const correctedByMasterId = new Map(); // master _id -> { prep_items_, prep_categories_ }
  for (const dish of masterDishes) {
    const exp = expectedByLegacyNo.get(dish._legacyRecipeNo);
    if (!exp) continue;
    const fields = { prep_items_: exp.prep_items_ ?? [], prep_categories_: exp.prep_categories_ ?? [] };
    correctedByMasterId.set(String(dish._id), fields);
    if (sameArrayJson(dish.prep_items_, fields.prep_items_) && sameArrayJson(dish.prep_categories_, fields.prep_categories_)) continue;
    masterOps.push({ _id: dish._id, ...fields });
  }
  console.log(`[repair-dish-prep-items] __master__: ${masterDishes.length} legacy dish(es), ${write === 'local' ? 'correcting' : 'would correct'} ${masterOps.length}.`);

  if (write === 'local' && masterOps.length > 0) {
    await db.collection('DISH_LIST').bulkWrite(
      masterOps.map(op => ({
        updateOne: { filter: { _id: op._id }, update: { $set: { prep_items_: op.prep_items_, prep_categories_: op.prep_categories_ } } },
      })),
      { ordered: false }
    );
  }

  // ---- Pass 2: already-cloned per-user DISH_LIST -------------------------
  const userIds = await db.collection('DISH_LIST').distinct('userId', { userId: { $ne: '__master__' }, _masterId: { $ne: null } });
  console.log(`[repair-dish-prep-items] Users with dish clones: ${userIds.length}`);

  let totalUserCorrected = 0;
  for (const userId of userIds) {
    const userDishes = await db.collection('DISH_LIST')
      .find({ userId, _masterId: { $ne: null } })
      .project({ _id: 1, _masterId: 1, prep_items_: 1, prep_categories_: 1 })
      .toArray();

    const userOps = [];
    for (const dish of userDishes) {
      const fields = correctedByMasterId.get(String(dish._masterId));
      if (!fields) continue;
      if (sameArrayJson(dish.prep_items_, fields.prep_items_) && sameArrayJson(dish.prep_categories_, fields.prep_categories_)) continue;
      userOps.push({ _id: dish._id, ...fields });
    }

    if (write === 'local' && userOps.length > 0) {
      await db.collection('DISH_LIST').bulkWrite(
        userOps.map(op => ({
          updateOne: { filter: { _id: op._id }, update: { $set: { prep_items_: op.prep_items_, prep_categories_: op.prep_categories_ } } },
        })),
        { ordered: false }
      );
    }
    if (userOps.length > 0) {
      console.log(`[repair-dish-prep-items]   ${userId}: ${write === 'local' ? 'corrected' : 'would correct'} ${userOps.length} of ${userDishes.length} dish(es).`);
    }
    totalUserCorrected += userOps.length;
  }

  console.log(`\n[repair-dish-prep-items] Total: master ${masterOps.length}, per-user ${totalUserCorrected} dish(es) ${write === 'local' ? 'corrected' : 'would be corrected'}.`);
  if (write !== 'local') {
    console.log('[repair-dish-prep-items] Dry run — no writes made. Re-run with --write=local to apply.');
  }

  await mongoose.disconnect();
}

const args = parseArgs(process.argv);
run(args).catch(err => {
  console.error(err);
  process.exit(1);
});
