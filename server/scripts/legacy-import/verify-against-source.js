'use strict';
/**
 * verify-against-source.js — read-only, re-runnable audit of the legacy
 * FoodComposer→Mongo import (plan 300). Re-parses fullDATA.sql fresh on every
 * run (no drift from a stale snapshot) via the same `buildImport()` the real
 * import and its repair scripts use, then diffs the result against the
 * current `__master__` Mongo data (or a given user's cloned copies) by
 * `_legacyProductId`/`_legacyRecipeNo`. Never writes anything — no --write
 * flag exists.
 *
 * What it checks, per legacy-numbered row:
 *   - Products: name, base unit, whether a price/source was captured,
 *     whether plausible nutrition data exists (recomputed from tblProducts
 *     the same way backfill-product-nutrition.js does — transform.js itself
 *     never carries nutrition, that's intentionally backfill-only).
 *   - Recipes/dishes: ingredients_ line-by-line — count, type
 *     (product/recipe), resolved ingredient name, amount_, unit_ — compared
 *     by position (both sides are sorted by the source recipeLine order).
 *     Note: referenceId values themselves are NOT compared — every run
 *     allocates fresh ids on the "expected" side, so only resolved names are
 *     meaningful.
 *   - Dishes: prep_items_ count + each item's preparation_name/quantity/unit,
 *     same positional comparison.
 *
 * Usage:
 *   node server/scripts/legacy-import/verify-against-source.js [--sql-path=PATH] [--user=<userId>] [--verbose]
 *
 * With no --user, compares against __master__. With --user=<userId>, walks
 * that user's own RECIPE_LIST/DISH_LIST/PRODUCT_LIST docs back to the
 * __master__ doc via _masterId and diffs the user's copy instead.
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
    else if (arg.startsWith('--user=')) args.user = arg.slice('--user='.length);
    else if (arg === '--verbose') args.verbose = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

/** True for the one obviously-fake sequential test row (cucumber: 1,2,3,4,5,6). */
function isFakeTestRow(row) {
  return row.calories === 1 && row.protein === 2 && row.carbohydrate === 3 && row.fat === 4 && row.Sodium === 5 && row.colesterol === 6;
}

function hasPlausibleNutrition(row) {
  if (isFakeTestRow(row)) return false;
  return !!(row.calories || row.protein || row.carbohydrate || row.fat || row.Sodium);
}

/** Diff two positional arrays with a per-index comparator; returns a list of mismatch strings. */
function diffByIndex(expected, actual, describe, compare) {
  const mismatches = [];
  const n = Math.max(expected.length, actual.length);
  if (expected.length !== actual.length) {
    mismatches.push(`count mismatch: expected ${expected.length}, actual ${actual.length}`);
  }
  for (let i = 0; i < n; i++) {
    const e = expected[i];
    const a = actual[i];
    if (!e || !a) continue; // already reported as a count mismatch above
    const diff = compare(e, a);
    if (diff) mismatches.push(`${describe(i)}: ${diff}`);
  }
  return mismatches;
}

async function run({ sqlPath, user, verbose }) {
  const uri = process.env.MONGO_LOCAL_URI;
  if (!uri) throw new Error('MONGO_LOCAL_URI is not set in server/.env');

  console.log('[verify-against-source] Re-parsing SQL dump fresh ...');
  const text = readSqlDumpAsUtf8(sqlPath || DEFAULT_SQL_PATH);
  const raw = {
    suppliersRaw: extractInserts(text, 'tblSuppliers'),
    productsRaw: extractInserts(text, 'tblProducts'),
    recipesRaw: extractInserts(text, 'tblRecipies'),
    recipeProductsRaw: extractInserts(text, 'tblRecipeProducts'),
    instructionsRaw: extractInserts(text, 'tblInstructions'),
  };
  const expected = buildImport(raw, { now: Date.now() });

  // Expected-side id -> name resolver (ids are fresh per-run, only useful within this run).
  const expectedNameById = new Map();
  for (const p of expected.products) expectedNameById.set(p._id, p.name_hebrew);
  for (const r of expected.recipes) expectedNameById.set(r._id, r.name_hebrew);
  for (const d of expected.dishes) expectedNameById.set(d._id, d.name_hebrew);

  const expectedProductByLegacyId = new Map(expected.products.map(p => [p._legacyProductId, p]));
  const expectedRecipeDishByLegacyNo = new Map(
    [...expected.recipes, ...expected.dishes].map(r => [r._legacyRecipeNo, r])
  );
  const expectedSupplierByLegacyCode = new Map(expected.suppliers.map(s => [s._legacySupplierCode, s]));
  const nutritionByLegacyId = new Map(raw.productsRaw.filter(hasPlausibleNutrition).map(row => [row.product, true]));

  console.log(`[verify-against-source] Expected: ${expected.suppliers.length} suppliers, ${expected.products.length} products, ${expected.recipes.length} recipes, ${expected.dishes.length} dishes.`);

  console.log('[verify-against-source] Connecting to local ...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;

  const scopeLabel = user ? `user "${user}"` : '__master__';
  console.log(`[verify-against-source] Comparing against ${scopeLabel} ...\n`);

  const [allMasterProducts, masterRecipes, masterDishes, allMasterSuppliers] = await Promise.all([
    db.collection('PRODUCT_LIST').find({ userId: '__master__' }).toArray(),
    db.collection('RECIPE_LIST').find({ userId: '__master__', _legacyRecipeNo: { $exists: true } }).toArray(),
    db.collection('DISH_LIST').find({ userId: '__master__', _legacyRecipeNo: { $exists: true } }).toArray(),
    db.collection('KITCHEN_SUPPLIERS').find({ userId: '__master__' }).toArray(),
  ]);
  const masterSuppliers = allMasterSuppliers.filter(s => s._legacySupplierCode != null);
  const masterSupplierByName = new Map(allMasterSuppliers.map(s => [s.name_hebrew, s]));
  const masterProducts = allMasterProducts.filter(p => p._legacyProductId != null);
  // Name -> master product doc, for the "collided with a pre-existing master product at
  // import time" case (see plan 300's completeness audit — accepted, not a bug): those
  // products never got a _legacyProductId, so they're invisible to the legacy-id lookup
  // above but are exactly what the SQL ingredient lines actually resolve to.
  const masterProductByName = new Map(allMasterProducts.map(p => [p.name_hebrew, p]));

  let actualProducts = masterProducts;
  let actualRecipesDishes = [...masterRecipes, ...masterDishes];
  // All docs actually resolvable in the scope being checked (for ingredient-name resolution)
  // — every master product (legacy-tagged or not), not just the legacy-tagged subset.
  let actualNameById = new Map([...allMasterProducts, ...actualRecipesDishes].map(d => [String(d._id), d.name_hebrew]));
  let actualSuppliers = masterSuppliers;

  if (user) {
    const masterIdToLegacyProductId = new Map(masterProducts.map(p => [String(p._id), p._legacyProductId]));
    const masterIdToLegacyRecipeNo = new Map([...masterRecipes, ...masterDishes].map(r => [String(r._id), r._legacyRecipeNo]));
    const masterIdToLegacySupplierCode = new Map(masterSuppliers.map(s => [String(s._id), s._legacySupplierCode]));

    const [userProducts, userRecipes, userDishes, userSuppliers] = await Promise.all([
      db.collection('PRODUCT_LIST').find({ userId: user, _masterId: { $ne: null } }).toArray(),
      db.collection('RECIPE_LIST').find({ userId: user, _masterId: { $ne: null } }).toArray(),
      db.collection('DISH_LIST').find({ userId: user, _masterId: { $ne: null } }).toArray(),
      db.collection('KITCHEN_SUPPLIERS').find({ userId: user, _masterId: { $ne: null } }).toArray(),
    ]);

    // Re-key user docs by the legacy id/no so they line up with `expected*ByLegacy*`.
    actualProducts = userProducts
      .filter(p => masterIdToLegacyProductId.has(String(p._masterId)))
      .map(p => ({ ...p, _legacyProductId: masterIdToLegacyProductId.get(String(p._masterId)) }));
    actualRecipesDishes = [...userRecipes, ...userDishes]
      .filter(r => masterIdToLegacyRecipeNo.has(String(r._masterId)))
      .map(r => ({ ...r, _legacyRecipeNo: masterIdToLegacyRecipeNo.get(String(r._masterId)) }));
    actualSuppliers = userSuppliers
      .filter(s => masterIdToLegacySupplierCode.has(String(s._masterId)))
      .map(s => ({ ...s, _legacySupplierCode: masterIdToLegacySupplierCode.get(String(s._masterId)) }));
    actualNameById = new Map([...userProducts, ...userRecipes, ...userDishes].map(d => [String(d._id), d.name_hebrew]));
  }

  const actualProductByLegacyId = new Map(actualProducts.map(p => [p._legacyProductId, p]));
  const actualRecipeDishByLegacyNo = new Map(actualRecipesDishes.map(r => [r._legacyRecipeNo, r]));
  const actualSupplierByLegacyCode = new Map(actualSuppliers.map(s => [s._legacySupplierCode, s]));

  const report = { missingProducts: [], missingRecipesDishes: [], missingSuppliers: [], productMismatches: [], recipeDishMismatches: [], supplierMismatches: [], collisionInfo: [] };

  const legacySupplierCodesWithDedicatedMasterDoc = new Set(masterSuppliers.map(s => s._legacySupplierCode));
  // ---- Suppliers ------------------------------------------------------------
  for (const [legacyCode, exp] of expectedSupplierByLegacyCode) {
    if (!legacySupplierCodesWithDedicatedMasterDoc.has(legacyCode)) {
      const collided = masterSupplierByName.get(exp.name_hebrew);
      if (collided) {
        report.collisionInfo.push(`legacySupplierCode ${legacyCode} (${exp.name_hebrew}): resolved via pre-existing master supplier name collision, not a dedicated legacy row — OK`);
        continue;
      }
    }
    const act = actualSupplierByLegacyCode.get(legacyCode);
    if (!act) {
      report.missingSuppliers.push(`legacySupplierCode ${legacyCode} (${exp.name_hebrew}): not found in ${scopeLabel}`);
      continue;
    }
    if (act.name_hebrew !== exp.name_hebrew) {
      report.supplierMismatches.push(`${exp.name_hebrew} (legacySupplierCode ${legacyCode}): name: expected "${exp.name_hebrew}", actual "${act.name_hebrew}"`);
    }
  }

  const legacyIdsWithDedicatedMasterDoc = new Set(masterProducts.map(p => p._legacyProductId));

  // ---- Products -----------------------------------------------------------
  for (const [legacyId, exp] of expectedProductByLegacyId) {
    // No dedicated __master__ product carries this legacy id — check whether it
    // collided with a pre-existing master product by name at import time (accepted
    // behavior, see plan 300 completeness audit). That product's own
    // base_unit_/price/nutrition are deliberately left as-is (the whole point of the
    // dedup is not to touch existing master data), so beyond confirming the name
    // resolves, there's nothing meaningful left to diff — for either __master__ or a
    // user's clone of it.
    if (!legacyIdsWithDedicatedMasterDoc.has(legacyId)) {
      const collided = masterProductByName.get(exp.name_hebrew);
      if (collided) {
        report.collisionInfo.push(`legacyProductId ${legacyId} (${exp.name_hebrew}): resolved via pre-existing master product name collision, not a dedicated legacy row — OK`);
        continue;
      }
    }
    const act = actualProductByLegacyId.get(legacyId);
    if (!act) {
      report.missingProducts.push(`legacyProductId ${legacyId} (${exp.name_hebrew}): not found in ${scopeLabel}`);
      continue;
    }
    const issues = [];
    if (act.name_hebrew !== exp.name_hebrew) issues.push(`name: expected "${exp.name_hebrew}", actual "${act.name_hebrew}"`);
    if (act.base_unit_ !== exp.base_unit_) issues.push(`base_unit_: expected "${exp.base_unit_}", actual "${act.base_unit_}"`);
    const expectedHasSource = exp.sources_.length > 0;
    const actualHasSource = (act.sources_ ?? []).length > 0;
    if (expectedHasSource !== actualHasSource) issues.push(`source presence: expected ${expectedHasSource}, actual ${actualHasSource}`);
    const expectedNutrition = nutritionByLegacyId.has(legacyId);
    const actualNutrition = act.nutrition_per_100g_ != null;
    if (expectedNutrition !== actualNutrition) issues.push(`nutrition presence: expected ${expectedNutrition}, actual ${actualNutrition}`);
    if (issues.length) report.productMismatches.push(`${exp.name_hebrew} (legacyProductId ${legacyId}): ${issues.join('; ')}`);
  }

  // ---- Recipes / Dishes -----------------------------------------------------
  for (const [legacyNo, exp] of expectedRecipeDishByLegacyNo) {
    const act = actualRecipeDishByLegacyNo.get(legacyNo);
    if (!act) {
      report.missingRecipesDishes.push(`legacyRecipeNo ${legacyNo} (${exp.name_hebrew}): not found in ${scopeLabel}`);
      continue;
    }
    const issues = [];
    if (act.name_hebrew !== exp.name_hebrew) issues.push(`name: expected "${exp.name_hebrew}", actual "${act.name_hebrew}"`);

    const expIngredients = exp.ingredients_ ?? [];
    const actIngredients = act.ingredients_ ?? [];
    const ingredientDiffs = diffByIndex(
      expIngredients,
      actIngredients,
      i => `ingredient[${i}]`,
      (e, a) => {
        const parts = [];
        if (e.type !== a.type) parts.push(`type: expected ${e.type}, actual ${a.type}`);
        const expName = expectedNameById.get(e.referenceId) ?? '<unresolved-expected>';
        const actName = actualNameById.get(String(a.referenceId)) ?? '<unresolved-actual>';
        if (expName !== actName) parts.push(`name: expected "${expName}", actual "${actName}"`);
        if (e.amount_ !== a.amount_) parts.push(`amount_: expected ${e.amount_}, actual ${a.amount_}`);
        if (e.unit_ !== a.unit_) parts.push(`unit_: expected "${e.unit_}", actual "${a.unit_}"`);
        return parts.length ? parts.join(', ') : null;
      }
    );
    issues.push(...ingredientDiffs);

    if (exp.prep_items_?.length || act.prep_items_?.length) {
      const expPrep = exp.prep_items_ ?? [];
      const actPrep = act.prep_items_ ?? [];
      const prepDiffs = diffByIndex(
        expPrep,
        actPrep,
        i => `prep_items_[${i}]`,
        (e, a) => {
          const parts = [];
          if (e.preparation_name !== a.preparation_name) parts.push(`preparation_name: expected "${e.preparation_name}", actual "${a.preparation_name}"`);
          if (e.quantity !== a.quantity) parts.push(`quantity: expected ${e.quantity}, actual ${a.quantity}`);
          if (e.unit !== a.unit) parts.push(`unit: expected "${e.unit}", actual "${a.unit}"`);
          return parts.length ? parts.join(', ') : null;
        }
      );
      issues.push(...prepDiffs);
    }

    // Instructions/steps — same positional comparison. Source instruction rows
    // (tblInstructions) can be one long step or many short ones per recipe; transform.js
    // preserves them 1:1 in source order, so a count mismatch here means steps were
    // genuinely dropped, not just differently split.
    const expSteps = exp.steps_ ?? [];
    const actSteps = act.steps_ ?? [];
    if (expSteps.length || actSteps.length) {
      const stepDiffs = diffByIndex(
        expSteps,
        actSteps,
        i => `steps_[${i}]`,
        (e, a) => {
          const parts = [];
          if ((e.instruction_ ?? '') !== (a.instruction_ ?? '')) parts.push(`instruction_: expected "${e.instruction_}", actual "${a.instruction_}"`);
          if ((e.labor_time_minutes_ ?? 0) !== (a.labor_time_minutes_ ?? 0)) parts.push(`labor_time_minutes_: expected ${e.labor_time_minutes_}, actual ${a.labor_time_minutes_}`);
          return parts.length ? parts.join(', ') : null;
        }
      );
      issues.push(...stepDiffs);
    }

    if (issues.length) report.recipeDishMismatches.push({ name: exp.name_hebrew, legacyNo, issues });
  }

  // ---- Report ---------------------------------------------------------------
  const totalMismatches =
    report.missingProducts.length + report.missingRecipesDishes.length + report.missingSuppliers.length +
    report.productMismatches.length + report.recipeDishMismatches.length + report.supplierMismatches.length;

  console.log(`Missing suppliers:       ${report.missingSuppliers.length}`);
  console.log(`Missing products:        ${report.missingProducts.length}`);
  console.log(`Missing recipes/dishes:  ${report.missingRecipesDishes.length}`);
  console.log(`Supplier mismatches:     ${report.supplierMismatches.length}`);
  console.log(`Product mismatches:      ${report.productMismatches.length}`);
  console.log(`Recipe/dish mismatches:  ${report.recipeDishMismatches.length}`);
  if (report.collisionInfo.length) console.log(`(name-collision reuse, OK, informational: ${report.collisionInfo.length})`);
  console.log(`\nTotal: ${totalMismatches} mismatch categories against ${scopeLabel}.`);

  if (totalMismatches > 0) {
    console.log('\n--- details ---');
    for (const line of report.missingSuppliers) console.log(`[missing supplier] ${line}`);
    for (const line of report.supplierMismatches) console.log(`[supplier mismatch] ${line}`);
    for (const line of report.missingProducts) console.log(`[missing product] ${line}`);
    for (const line of report.missingRecipesDishes) console.log(`[missing recipe/dish] ${line}`);
    for (const line of report.productMismatches) console.log(`[product mismatch] ${line}`);
    for (const m of report.recipeDishMismatches) {
      console.log(`[recipe/dish mismatch] ${m.name} (legacyRecipeNo ${m.legacyNo}):`);
      const toShow = verbose ? m.issues : m.issues.slice(0, 5);
      for (const issue of toShow) console.log(`    - ${issue}`);
      if (!verbose && m.issues.length > 5) console.log(`    ... ${m.issues.length - 5} more (re-run with --verbose to see all)`);
    }
  }

  await mongoose.disconnect();
  process.exit(totalMismatches > 0 ? 1 : 0);
}

const args = parseArgs(process.argv);
run(args).catch(err => {
  console.error(err);
  process.exit(1);
});
