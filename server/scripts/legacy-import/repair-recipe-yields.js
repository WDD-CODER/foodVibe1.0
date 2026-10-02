'use strict';
require('../../utils/v1-only-guard')('repair-recipe-yields.js');
/**
 * repair-recipe-yields.js — rewrites `yield_amount_`/`yield_unit_`/
 * `yield_conversions_` on already-imported recipes and dishes to match the
 * multi-measure derivation in `lib/transform.js` (plan 315).
 *
 * The original import kept only one yield measure and put the dish count alone
 * in `yield_conversions_`. That broke two things at once:
 *   1. Every other measure the old FoodComposer recorded (grams, millilitres,
 *      unit count) was dropped, so a parent recipe could not draw on a
 *      sub-recipe by weight when its yield was expressed in portions.
 *   2. `yield_conversions_[0]` is, by the recipe-builder's own convention, the
 *      PRIMARY yield — `toRecipe()` writes row 0 back into yield_amount_/
 *      yield_unit_ on save. With the dish count sitting there, opening and
 *      saving such a recipe silently replaced its real yield with the portion
 *      count, and a parent's cost line then inflated by the yield ratio.
 *
 * Source of truth: re-parses the SQL dump fresh and runs the real
 * `buildImport()` — the same function the import and `verify-against-source.js`
 * use — so this can never drift from what a fresh import would produce.
 *
 * Runs in two passes:
 *   1. `__master__` RECIPE_LIST + DISH_LIST, matched by `_legacyRecipeNo`.
 *   2. Every non-master user's clones, matched back to their corrected master
 *      doc via `_masterId`. Clones marked `_userModified: true` are skipped —
 *      this replaces a yield outright, so without that guard it would discard
 *      a yield the user set by hand.
 *
 * Usage:
 *   node server/scripts/legacy-import/repair-recipe-yields.js [--write=local] [--sql-path=PATH] [--verbose]
 *
 * With no --write flag this is a dry run: reports what would change, writes
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
    else if (arg === '--write=atlas') args.write = 'atlas';
    else if (arg.startsWith('--target=')) args.target = arg.slice('--target='.length);
    else if (arg === '--verbose') args.verbose = true;
    else if (arg.startsWith('--sql-path=')) args.sqlPath = arg.slice('--sql-path='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function sameJson(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

function yieldFieldsOf(doc) {
  return {
    yield_amount_: doc.yield_amount_,
    yield_unit_: doc.yield_unit_,
    yield_conversions_: doc.yield_conversions_ ?? [],
    // Without this the recipe-builder's header effect auto-syncs the yield to
    // the gross sum of the ingredient weights on open, discarding the recorded
    // net figure. See lib/transform.js for the full reasoning.
    neto_confirmed_: doc.neto_confirmed_ ?? false,
  };
}

function differs(actual, expected) {
  return actual.yield_amount_ !== expected.yield_amount_
    || actual.yield_unit_ !== expected.yield_unit_
    || actual.neto_confirmed_ !== expected.neto_confirmed_
    || !sameJson(actual.yield_conversions_, expected.yield_conversions_);
}

async function run({ write, target: args_target, sqlPath, verbose }) {
  const target = write || args_target || 'local';
  const uri = target === 'atlas' ? process.env.MONGO_URI : process.env.MONGO_LOCAL_URI;
  if (!uri) throw new Error(`${target === 'atlas' ? 'MONGO_URI' : 'MONGO_LOCAL_URI'} is not set in server/.env`);

  console.log('[repair-recipe-yields] Re-parsing SQL dump fresh ...');
  const text = readSqlDumpAsUtf8(sqlPath || DEFAULT_SQL_PATH);
  const expected = buildImport({
    suppliersRaw: extractInserts(text, 'tblSuppliers'),
    productsRaw: extractInserts(text, 'tblProducts'),
    recipesRaw: extractInserts(text, 'tblRecipies'),
    recipeProductsRaw: extractInserts(text, 'tblRecipeProducts'),
    instructionsRaw: extractInserts(text, 'tblInstructions'),
  }, { now: Date.now() });

  const expectedByLegacyNo = new Map(
    [...expected.recipes, ...expected.dishes].map(r => [r._legacyRecipeNo, r])
  );
  console.log(`[repair-recipe-yields] Expected: ${expected.recipes.length} recipes, ${expected.dishes.length} dishes.`);

  console.log('[repair-recipe-yields] Connecting ...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const db = mongoose.connection.db;

  const stats = { amountChanged: 0, unitChanged: 0, convGained: 0, dishAmountChanged: 0 };

  // ---- Pass 1: __master__ --------------------------------------------------
  const correctedByMasterId = new Map(); // master _id -> expected yield fields
  let masterOps = 0;

  for (const collName of ['RECIPE_LIST', 'DISH_LIST']) {
    const col = db.collection(collName);
    const docs = await col
      .find({ userId: '__master__', _legacyRecipeNo: { $exists: true } })
      .project({ _id: 1, name_hebrew: 1, _legacyRecipeNo: 1, yield_amount_: 1, yield_unit_: 1, yield_conversions_: 1, neto_confirmed_: 1 })
      .toArray();

    const ops = [];
    for (const doc of docs) {
      const exp = expectedByLegacyNo.get(doc._legacyRecipeNo);
      if (!exp) continue;
      const want = yieldFieldsOf(exp);
      correctedByMasterId.set(String(doc._id), want);

      const have = yieldFieldsOf(doc);
      if (!differs(have, want)) continue;

      if (have.yield_amount_ !== want.yield_amount_) {
        stats.amountChanged++;
        if (collName === 'DISH_LIST') stats.dishAmountChanged++;
      }
      if (have.yield_unit_ !== want.yield_unit_) stats.unitChanged++;
      if ((want.yield_conversions_?.length ?? 0) > (have.yield_conversions_?.length ?? 0)) stats.convGained++;

      if (verbose) {
        console.log(`  [${collName}] ${doc.name_hebrew} (${doc._legacyRecipeNo}): ` +
          `${have.yield_amount_} ${have.yield_unit_} -> ${want.yield_amount_} ${want.yield_unit_} ` +
          `| conv ${JSON.stringify(have.yield_conversions_)} -> ${JSON.stringify(want.yield_conversions_)}`);
      }
      ops.push({ _id: doc._id, ...want });
    }

    console.log(`[repair-recipe-yields] __master__ ${collName}: ${docs.length} legacy doc(s), ${write ? 'correcting' : 'would correct'} ${ops.length}.`);
    masterOps += ops.length;

    if (write && ops.length > 0) {
      await col.bulkWrite(
        ops.map(op => ({
          updateOne: {
            filter: { _id: op._id },
            update: { $set: { yield_amount_: op.yield_amount_, yield_unit_: op.yield_unit_, yield_conversions_: op.yield_conversions_, neto_confirmed_: op.neto_confirmed_ } },
          },
        })),
        { ordered: false }
      );
    }
  }

  // ---- Pass 2: per-user clones (skip _userModified) ------------------------
  let userOpsTotal = 0;
  const perUser = new Map();

  for (const collName of ['RECIPE_LIST', 'DISH_LIST']) {
    const col = db.collection(collName);
    const userIds = await col.distinct('userId', { userId: { $ne: '__master__' }, _masterId: { $ne: null } });

    for (const userId of userIds) {
      const docs = await col
        .find({ userId, _masterId: { $ne: null }, _userModified: { $ne: true } })
        .project({ _id: 1, _masterId: 1, yield_amount_: 1, yield_unit_: 1, yield_conversions_: 1, neto_confirmed_: 1 })
        .toArray();

      const ops = [];
      for (const doc of docs) {
        const want = correctedByMasterId.get(String(doc._masterId));
        if (!want) continue;
        if (!differs(yieldFieldsOf(doc), want)) continue;
        ops.push({ _id: doc._id, ...want });
      }

      if (write && ops.length > 0) {
        await col.bulkWrite(
          ops.map(op => ({
            updateOne: {
              filter: { _id: op._id },
              update: { $set: { yield_amount_: op.yield_amount_, yield_unit_: op.yield_unit_, yield_conversions_: op.yield_conversions_, neto_confirmed_: op.neto_confirmed_ } },
            },
          })),
          { ordered: false }
        );
      }
      if (ops.length > 0) {
        perUser.set(userId, (perUser.get(userId) ?? 0) + ops.length);
        userOpsTotal += ops.length;
      }
    }
  }

  for (const [userId, n] of perUser) {
    console.log(`[repair-recipe-yields]   ${userId}: ${write ? 'corrected' : 'would correct'} ${n} doc(s).`);
  }

  console.log(`\n[repair-recipe-yields] Master docs ${write ? 'corrected' : 'to correct'}: ${masterOps}`);
  console.log(`[repair-recipe-yields] Per-user docs ${write ? 'corrected' : 'to correct'}: ${userOpsTotal}`);
  console.log(`[repair-recipe-yields]   yield_amount_ changed (master): ${stats.amountChanged}  — of which dishes: ${stats.dishAmountChanged}`);
  console.log(`[repair-recipe-yields]   yield_unit_ changed (master):   ${stats.unitChanged}`);
  console.log(`[repair-recipe-yields]   gained selectable unit(s):      ${stats.convGained}`);

  const orphan = expected.warnings.filter(w => /matches no total column/.test(w));
  console.log(`\n[repair-recipe-yields] finalQuantity dropped in favour of dbTotalGram: ${orphan.length} row(s)`);
  for (const w of orphan) console.log('  ' + w);

  if (!write) {
    console.log('\n[repair-recipe-yields] Dry run — no writes made. Re-run with --write=local to apply.');
  }

  await mongoose.disconnect();
}

const args = parseArgs(process.argv);
run(args).catch(err => {
  console.error(err);
  process.exit(1);
});
