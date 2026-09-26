'use strict';
/**
 * backfill-quantities.js — one-off repair for the null/zero-quantity import
 * bugs fixed in lib/transform.js:
 *   - tblRecipeProducts.quantity was null (or, in the widened fix, literal 0)
 *     for a large share of legacy rows; the real value lives in that row's
 *     Gram/Liter/Unit mirror column, which transform.js now falls back to.
 *   - tblRecipies.finalQuantity (yield_amount_) has the identical bug shape,
 *     falling back to dbTotalGram/dbTotalLiter/dbTotalUnit.
 * This script patches *already-imported* Mongo documents that were written
 * before these fixes, so their amount_/quantity/yield_amount_ fields catch up
 * without re-running the full import.
 *
 * Scope: two passes — __master__ documents first (matched by
 * _legacyRecipeNo, same as verify-against-source.js), then every other
 * user's cloned RECIPE_LIST/DISH_LIST docs (matched back to their master doc
 * via _masterId), skipping any clone with `_userModified: true` (a user's own
 * edit is never overwritten). Only patches ingredients_[i].amount_,
 * prep_items_[i].quantity, and yield_amount_ at points where the current
 * value is 0 and the freshly-parsed SQL source has a non-zero recoverable
 * value — every other field on the document is left untouched.
 *
 * Usage:
 *   node server/scripts/legacy-import/backfill-quantities.js [--sql-path=PATH] [--write=local|atlas] [--verbose]
 *
 * With no --write, this is a dry run: prints exactly what would change and
 * writes nothing.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
require('node:dns').setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const { readSqlDumpAsUtf8, extractInserts } = require('./lib/sql-parser');
const { buildImport } = require('./lib/transform');

const DEFAULT_SQL_PATH = path.resolve(__dirname, 'source-data', 'fullDATA_utf8.sql');

function parseArgs(argv) {
  const args = { verbose: false };
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--sql-path=')) args.sqlPath = arg.slice('--sql-path='.length);
    else if (arg.startsWith('--write=')) args.write = arg.slice('--write='.length);
    else if (arg.startsWith('--target=')) args.previewTarget = arg.slice('--target='.length);
    else if (arg === '--verbose') args.verbose = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.write && !['local', 'atlas'].includes(args.write)) {
    throw new Error(`--write must be 'local' or 'atlas', got '${args.write}'`);
  }
  if (args.previewTarget && !['local', 'atlas'].includes(args.previewTarget)) {
    throw new Error(`--target must be 'local' or 'atlas', got '${args.previewTarget}'`);
  }
  if (args.write && args.previewTarget) {
    throw new Error('--write and --target are mutually exclusive (--write implies its own target)');
  }
  return args;
}

async function run({ sqlPath, write, previewTarget, verbose }) {
  const target = write || previewTarget || 'local';
  const uri = target === 'atlas' ? process.env.MONGO_URI : process.env.MONGO_LOCAL_URI;
  if (!uri) throw new Error(`${target === 'atlas' ? 'MONGO_URI' : 'MONGO_LOCAL_URI'} is not set in server/.env`);

  console.log('[backfill-quantities] Re-parsing SQL dump fresh ...');
  const text = readSqlDumpAsUtf8(sqlPath || DEFAULT_SQL_PATH);
  const raw = {
    suppliersRaw: extractInserts(text, 'tblSuppliers'),
    productsRaw: extractInserts(text, 'tblProducts'),
    recipesRaw: extractInserts(text, 'tblRecipies'),
    recipeProductsRaw: extractInserts(text, 'tblRecipeProducts'),
    instructionsRaw: extractInserts(text, 'tblInstructions'),
  };
  const expected = buildImport(raw, { now: Date.now() });
  const expectedByLegacyNo = new Map(
    [...expected.recipes, ...expected.dishes].map(r => [r._legacyRecipeNo, r])
  );

  console.log(`[backfill-quantities] Connecting to ${target} ...`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;

  const [masterRecipes, masterDishes] = await Promise.all([
    db.collection('RECIPE_LIST').find({ userId: '__master__', _legacyRecipeNo: { $exists: true } }).toArray(),
    db.collection('DISH_LIST').find({ userId: '__master__', _legacyRecipeNo: { $exists: true } }).toArray(),
  ]);

  const counts = { docsPatched: 0, ingredientFieldsPatched: 0, prepItemFieldsPatched: 0, yieldFieldsPatched: 0 };

  /** Compares `doc` against its expected re-derived shape and returns the $set to apply, or null if nothing changed. */
  function computePatch(doc, exp, collName, label) {
    let changed = false;
    const set = {};

    const ingredients = Array.isArray(doc.ingredients_) ? doc.ingredients_.slice() : [];
    if (ingredients.length === (exp.ingredients_ || []).length) {
      for (let i = 0; i < ingredients.length; i++) {
        const cur = ingredients[i];
        const want = exp.ingredients_[i];
        if (cur.amount_ === 0 && want.amount_ !== 0) {
          if (verbose) console.log(`  [${collName}] ${label} ingredient[${i}]: 0 -> ${want.amount_}`);
          ingredients[i] = { ...cur, amount_: want.amount_ };
          changed = true;
          counts.ingredientFieldsPatched++;
        }
      }
      if (changed) set.ingredients_ = ingredients;
    }

    const prepItems = Array.isArray(doc.prep_items_) ? doc.prep_items_.slice() : [];
    let prepChanged = false;
    if (prepItems.length && exp.prep_items_ && prepItems.length === exp.prep_items_.length) {
      for (let i = 0; i < prepItems.length; i++) {
        const cur = prepItems[i];
        const want = exp.prep_items_[i];
        if (cur.quantity === 0 && want.quantity !== 0) {
          if (verbose) console.log(`  [${collName}] ${label} prep_items_[${i}]: 0 -> ${want.quantity}`);
          prepItems[i] = { ...cur, quantity: want.quantity };
          prepChanged = true;
          counts.prepItemFieldsPatched++;
        }
      }
      if (prepChanged) { set.prep_items_ = prepItems; changed = true; }
    }

    if ((doc.yield_amount_ ?? 0) === 0 && exp.yield_amount_ !== 0) {
      if (verbose) console.log(`  [${collName}] ${label} yield_amount_: 0 -> ${exp.yield_amount_}`);
      set.yield_amount_ = exp.yield_amount_;
      changed = true;
      counts.yieldFieldsPatched++;
    }

    return changed ? set : null;
  }

  // ---- Pass 1: __master__ ---------------------------------------------------
  for (const [collName, docs] of [['RECIPE_LIST', masterRecipes], ['DISH_LIST', masterDishes]]) {
    const col = db.collection(collName);
    for (const doc of docs) {
      const exp = expectedByLegacyNo.get(doc._legacyRecipeNo);
      if (!exp) continue;
      const label = `${doc.name_hebrew} (legacyRecipeNo ${doc._legacyRecipeNo})`;
      const set = computePatch(doc, exp, collName, label);
      if (!set) continue;
      counts.docsPatched++;
      console.log(`${write ? 'Patching' : '[dry run] Would patch'}: ${label} [__master__, ${collName}, _id ${doc._id}]`);
      if (write) await col.updateOne({ _id: doc._id }, { $set: set });
    }
  }

  // ---- Pass 2: per-user clones (skip _userModified) -------------------------
  // Re-derives which users have legacy-cloned data fresh on every run — do not
  // assume it's still just dev-guest.
  const masterIdToLegacyNo = new Map(
    [...masterRecipes, ...masterDishes].map(d => [String(d._id), d._legacyRecipeNo])
  );
  const userIds = new Set([
    ...(await db.collection('RECIPE_LIST').distinct('userId', { userId: { $ne: '__master__' }, _masterId: { $ne: null } })),
    ...(await db.collection('DISH_LIST').distinct('userId', { userId: { $ne: '__master__' }, _masterId: { $ne: null } })),
  ]);

  for (const userId of userIds) {
    for (const collName of ['RECIPE_LIST', 'DISH_LIST']) {
      const col = db.collection(collName);
      const userDocs = await col.find({ userId, _masterId: { $ne: null }, _userModified: { $ne: true } }).toArray();
      for (const doc of userDocs) {
        const legacyNo = masterIdToLegacyNo.get(String(doc._masterId));
        if (legacyNo == null) continue;
        const exp = expectedByLegacyNo.get(legacyNo);
        if (!exp) continue;
        const label = `${doc.name_hebrew} (legacyRecipeNo ${legacyNo})`;
        const set = computePatch(doc, exp, collName, label);
        if (!set) continue;
        counts.docsPatched++;
        console.log(`${write ? 'Patching' : '[dry run] Would patch'}: ${label} [${userId}, ${collName}, _id ${doc._id}]`);
        if (write) await col.updateOne({ _id: doc._id }, { $set: set });
      }
    }
  }

  console.log(`\nDocuments ${write ? 'patched' : 'that would be patched'}: ${counts.docsPatched}`);
  console.log(`Ingredient amount_ fields ${write ? 'patched' : 'that would be patched'}: ${counts.ingredientFieldsPatched}`);
  console.log(`Prep item quantity fields ${write ? 'patched' : 'that would be patched'}: ${counts.prepItemFieldsPatched}`);
  console.log(`yield_amount_ fields ${write ? 'patched' : 'that would be patched'}: ${counts.yieldFieldsPatched}`);
  if (!write) console.log('\nDry run — no writes made. Re-run with --write=local or --write=atlas to apply.');

  await mongoose.disconnect();
}

const args = parseArgs(process.argv);
run(args).catch(e => {
  console.error(e);
  process.exit(1);
});
