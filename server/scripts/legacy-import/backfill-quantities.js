'use strict';
/**
 * backfill-quantities.js — one-off repair for the null-quantity import bug
 * fixed in lib/transform.js (tblRecipeProducts.quantity was null for ~2.3%
 * of legacy rows; the real value lives in that row's Gram/Liter/Unit mirror
 * column, which transform.js now falls back to). This script patches the
 * *already-imported* __master__ Mongo documents that were written before the
 * fix, so their amount_/quantity fields catch up without re-running the full
 * import.
 *
 * Scope: only userId: '__master__' documents (never touches user-cloned
 * copies — those are per-user customizations and may have already been
 * edited away from the broken default). Matched by _legacyRecipeNo, same as
 * verify-against-source.js. Only patches ingredients_[i].amount_ and (for
 * dishes) prep_items_[i].quantity at indices where the current value is 0
 * and the freshly-parsed SQL source has a non-zero recoverable value —
 * every other field on the document is left untouched.
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

  let docsPatched = 0;
  let ingredientFieldsPatched = 0;
  let prepItemFieldsPatched = 0;

  for (const [collName, docs] of [['RECIPE_LIST', masterRecipes], ['DISH_LIST', masterDishes]]) {
    const col = db.collection(collName);
    for (const doc of docs) {
      const exp = expectedByLegacyNo.get(doc._legacyRecipeNo);
      if (!exp) continue;

      let changed = false;
      const ingredients = Array.isArray(doc.ingredients_) ? doc.ingredients_.slice() : [];
      if (ingredients.length === (exp.ingredients_ || []).length) {
        for (let i = 0; i < ingredients.length; i++) {
          const cur = ingredients[i];
          const want = exp.ingredients_[i];
          if (cur.amount_ === 0 && want.amount_ !== 0) {
            if (verbose) console.log(`  [${collName}] ${doc.name_hebrew} (legacyRecipeNo ${doc._legacyRecipeNo}) ingredient[${i}]: 0 -> ${want.amount_}`);
            ingredients[i] = { ...cur, amount_: want.amount_ };
            changed = true;
            ingredientFieldsPatched++;
          }
        }
      }

      const prepItems = Array.isArray(doc.prep_items_) ? doc.prep_items_.slice() : [];
      if (prepItems.length && exp.prep_items_ && prepItems.length === exp.prep_items_.length) {
        for (let i = 0; i < prepItems.length; i++) {
          const cur = prepItems[i];
          const want = exp.prep_items_[i];
          if (cur.quantity === 0 && want.quantity !== 0) {
            if (verbose) console.log(`  [${collName}] ${doc.name_hebrew} (legacyRecipeNo ${doc._legacyRecipeNo}) prep_items_[${i}]: 0 -> ${want.quantity}`);
            prepItems[i] = { ...cur, quantity: want.quantity };
            changed = true;
            prepItemFieldsPatched++;
          }
        }
      }

      if (!changed) continue;
      docsPatched++;
      console.log(`${write ? 'Patching' : '[dry run] Would patch'}: ${doc.name_hebrew} (${collName}, legacyRecipeNo ${doc._legacyRecipeNo}, _id ${doc._id})`);
      if (write) {
        const set = { ingredients_: ingredients };
        if (prepItems.length) set.prep_items_ = prepItems;
        await col.updateOne({ _id: doc._id }, { $set: set });
      }
    }
  }

  console.log(`\nDocuments ${write ? 'patched' : 'that would be patched'}: ${docsPatched}`);
  console.log(`Ingredient amount_ fields ${write ? 'patched' : 'that would be patched'}: ${ingredientFieldsPatched}`);
  console.log(`Prep item quantity fields ${write ? 'patched' : 'that would be patched'}: ${prepItemFieldsPatched}`);
  if (!write) console.log('\nDry run — no writes made. Re-run with --write=local or --write=atlas to apply.');

  await mongoose.disconnect();
}

const args = parseArgs(process.argv);
run(args).catch(e => {
  console.error(e);
  process.exit(1);
});
