'use strict';
require('../../utils/v1-only-guard')('cost-cross-check.js');
/**
 * cost-cross-check.js — plan 317 §7a. READ-ONLY.
 *
 * The one signal in this migration that does not come from our own code.
 *
 * `tblRecipies.recipePrice` is FoodComposer's own recorded cost for ~857
 * recipes. This script recomputes each recipe's cost from the MIGRATED Mongo
 * data, using the same formulas as src/app/core/services/recipe-cost.service.ts,
 * and compares the two. Everything else we check re-derives expectations from
 * our own transform, so it can only catch drift — never a shared wrong
 * assumption. A recorded price disagreeing by orders of magnitude is a
 * migration error announcing itself from outside.
 *
 * Prices genuinely drift over time, so a spread of ratios around 1 is normal
 * and uninteresting. What matters is CLUSTERING at suspicious constants —
 * 1000x, 0.001x, or a fixed odd factor — which indicates a unit or yield bug
 * rather than inflation.
 *
 * Usage:
 *   node server/scripts/legacy-import/cost-cross-check.js [--target=local|atlas] [--show=N]
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
require('node:dns').setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const { readSqlDumpAsUtf8, extractInserts } = require('./lib/sql-parser');

const SQL_PATH = path.resolve(__dirname, 'source-data', 'fullDATA_utf8.sql');
const MAX_DEPTH = 10;
// Mirrors SYSTEM_UNITS in src/app/core/services/unit-registry.service.ts.
const UNIT_FACTOR = { gram: 1, g: 1, kg: 1000, ml: 1, liter: 1000, l: 1000, unit: 1, dish: 1, portion: 1, bunch: 1 };

function parseArgs(argv) {
  const args = { target: 'local', show: 15 };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--target=')) args.target = a.slice('--target='.length);
    else if (a.startsWith('--show=')) args.show = Number(a.slice('--show='.length));
    else throw new Error(`Unknown argument: ${a}`);
  }
  return args;
}

const factor = u => UNIT_FACTOR[(u ?? '').trim().toLowerCase()] ?? 1;

function effectivePrice(product) {
  const s = product.sources_ ?? [];
  if (!s.length) return 0;
  return s.reduce((min, x) => (x.price != null && x.price < min ? x.price : min), s[0].price ?? 0);
}

/** recipe-cost.service.ts amountInRecipeYieldUnit() */
function amountInYieldUnit(amount, unit, recipe) {
  const convs = recipe.yield_conversions_;
  if (convs?.length) {
    const u = (unit ?? '').trim().toLowerCase();
    const entry = convs.find(c => (c?.unit ?? '').trim().toLowerCase() === u);
    if (entry != null && entry.amount != null && entry.amount > 0) {
      return amount * ((recipe.yield_amount_ ?? 1) / entry.amount);
    }
  }
  const to = factor(recipe.yield_unit_ || 'unit');
  return to === 0 ? amount : (amount * factor(unit)) / to;
}

function buildCostFns(productsById, recipesById) {
  const memo = new Map();

  function recipeCost(recipe, depth) {
    if (depth >= MAX_DEPTH || !recipe) return 0;
    const key = String(recipe._id);
    if (memo.has(key)) return memo.get(key);
    memo.set(key, 0); // cycle guard
    let total = 0;
    for (const ing of recipe.ingredients_ ?? []) total += ingredientCost(ing, depth);
    memo.set(key, total);
    return total;
  }

  function ingredientCost(ing, depth) {
    if (ing.type === 'product') {
      const p = productsById.get(String(ing.referenceId));
      if (!p) return 0;
      const amountBase = (ing.amount_ ?? 0) * factor(ing.unit_);
      const baseFactor = factor(p.base_unit_ || 'gram');
      const normalized = baseFactor === 0 ? amountBase : amountBase / baseFactor;
      return (normalized / (p.yield_factor_ || 1)) * effectivePrice(p);
    }
    if (ing.type === 'recipe') {
      const sub = recipesById.get(String(ing.referenceId));
      if (!sub) return 0;
      const perUnit = recipeCost(sub, depth + 1) / (sub.yield_amount_ || 1);
      return amountInYieldUnit(ing.amount_ ?? 0, ing.unit_, sub) * perUnit;
    }
    return 0;
  }

  return { recipeCost };
}

async function run({ target, show }) {
  const uri = target === 'atlas' ? process.env.MONGO_URI : process.env.MONGO_LOCAL_URI;
  if (!uri) throw new Error('Mongo URI not set');

  const recipesRaw = extractInserts(readSqlDumpAsUtf8(SQL_PATH), 'tblRecipies');
  const recordedByNo = new Map(
    recipesRaw.filter(r => r.recipePrice != null && r.recipePrice !== 0).map(r => [r.recipeNo, r.recipePrice])
  );

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });
  const db = mongoose.connection.db;

  const products = await db.collection('PRODUCT_LIST').find({ userId: '__master__' }).toArray();
  const recipes = await db.collection('RECIPE_LIST').find({ userId: '__master__' }).toArray();
  const dishes = await db.collection('DISH_LIST').find({ userId: '__master__' }).toArray();

  const productsById = new Map(products.map(p => [String(p._id), p]));
  const recipesById = new Map([...recipes, ...dishes].map(r => [String(r._id), r]));
  const { recipeCost } = buildCostFns(productsById, recipesById);

  const rows = [];
  for (const doc of [...recipes, ...dishes]) {
    const recorded = recordedByNo.get(doc._legacyRecipeNo);
    if (recorded == null) continue;
    const computed = recipeCost(doc, 0);
    rows.push({ no: doc._legacyRecipeNo, name: doc.name_hebrew, recorded, computed, ratio: computed / recorded });
  }

  const zero = rows.filter(r => r.computed === 0);
  const nonZero = rows.filter(r => r.computed > 0).sort((a, b) => a.ratio - b.ratio);

  console.log(`[cost-cross-check] target: ${target}`);
  console.log(`recipes with a recorded FoodComposer price : ${recordedByNo.size}`);
  console.log(`  of those, found in Mongo                 : ${rows.length}`);
  console.log(`  computed cost is 0 (no price data)       : ${zero.length}`);
  console.log(`  comparable                               : ${nonZero.length}`);

  if (nonZero.length) {
    const rs = nonZero.map(r => r.ratio);
    const q = p => rs[Math.min(rs.length - 1, Math.floor(rs.length * p))];
    console.log('\nratio = computed / recorded');
    console.log(`  min ${rs[0].toFixed(4)}   p10 ${q(0.1).toFixed(3)}   p25 ${q(0.25).toFixed(3)}   median ${q(0.5).toFixed(3)}   p75 ${q(0.75).toFixed(3)}   p90 ${q(0.9).toFixed(3)}   max ${rs[rs.length - 1].toFixed(1)}`);

    const buckets = [
      ['< 0.001  (1000x too cheap)', r => r < 0.001],
      ['0.001 - 0.01', r => r >= 0.001 && r < 0.01],
      ['0.01 - 0.1', r => r >= 0.01 && r < 0.1],
      ['0.1 - 0.5', r => r >= 0.1 && r < 0.5],
      ['0.5 - 2    (plausible)', r => r >= 0.5 && r < 2],
      ['2 - 10', r => r >= 2 && r < 10],
      ['10 - 100', r => r >= 10 && r < 100],
      ['100 - 1000', r => r >= 100 && r < 1000],
      ['>= 1000  (1000x too dear)', r => r >= 1000],
    ];
    console.log('\ndistribution');
    for (const [label, test] of buckets) {
      const n = rs.filter(test).length;
      if (n) console.log(`  ${label.padEnd(28)} ${String(n).padStart(4)}  ${'#'.repeat(Math.ceil((n / rs.length) * 40))}`);
    }

    console.log(`\nworst ${show} — computed far BELOW recorded`);
    for (const r of nonZero.slice(0, show)) {
      console.log(`  #${String(r.no).padStart(4)}  ratio ${r.ratio.toFixed(5).padStart(11)}  recorded ${r.recorded.toFixed(2).padStart(10)}  computed ${r.computed.toFixed(2).padStart(10)}`);
    }
    console.log(`\nworst ${show} — computed far ABOVE recorded`);
    for (const r of nonZero.slice(-show).reverse()) {
      console.log(`  #${String(r.no).padStart(4)}  ratio ${r.ratio.toFixed(2).padStart(11)}  recorded ${r.recorded.toFixed(2).padStart(10)}  computed ${r.computed.toFixed(2).padStart(10)}`);
    }
  }

  await mongoose.disconnect();
}

run(parseArgs(process.argv)).catch(e => { console.error(e); process.exit(1); });
