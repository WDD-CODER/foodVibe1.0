'use strict';
require('../../utils/v1-only-guard')('audit-against-spec.js');
/**
 * audit-against-spec.js — measures live Mongo against plan 317's specification.
 *
 * READ-ONLY. Never writes.
 *
 * Why this exists rather than extending verify-against-source.js: that script
 * builds its expectations by calling the very `buildImport()` it is auditing,
 * so it can only ever detect drift between the transform and the database —
 * never a wrong assumption inside the transform itself. That blind spot let
 * three real bugs (fabricated dish mise-en-place, collapsed multi-measure
 * yields, a dish count sitting in the primary-yield slot) sit behind a clean
 * "0 mismatches" report.
 *
 * So this file deliberately does NOT import lib/transform.js. Every
 * expectation below is re-derived from the SQL dump according to
 * plans/317-sql-to-mongo-migration-spec.md. When the two disagree, that
 * disagreement is the finding.
 *
 * Usage:
 *   node server/scripts/legacy-import/audit-against-spec.js [--target=local|atlas] [--verbose]
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
require('node:dns').setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const { readSqlDumpAsUtf8, extractInserts } = require('./lib/sql-parser');

const SQL_PATH = path.resolve(__dirname, 'source-data', 'fullDATA_utf8.sql');
const MEASURE_UNIT = { 1: 'kg', 2: 'gram', 3: 'liter', 4: 'ml', 5: 'unit', 7: 'bunch' };
const MAX_NUTRITION_MG = 100000; // >100% by mass is impossible — spec §7

const nz = v => v != null && v !== 0;
const clean = s => (s == null ? '' : String(s).trim());

function parseArgs(argv) {
  const args = { target: 'local' };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--target=')) args.target = a.slice('--target='.length);
    else if (a === '--verbose') args.verbose = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!['local', 'atlas'].includes(args.target)) throw new Error("--target must be 'local' or 'atlas'");
  return args;
}

// ---- Independent derivations, straight from the spec -----------------------

/** Spec §4: every recorded measure, primary first. Never consults measureUnit. */
function expectedYield(row) {
  const measures = [];
  if (nz(row.dbTotalGram)) measures.push({ amount: row.dbTotalGram, unit: 'gram' });
  if (nz(row.dbTotalLiter)) measures.push({ amount: row.dbTotalLiter, unit: 'ml' });
  if (nz(row.dbTotalUnit)) measures.push({ amount: row.dbTotalUnit, unit: 'unit' });
  if (nz(row.noOfDishes)) measures.push({ amount: row.noOfDishes, unit: 'dish' });

  let primary;
  if (row.RecipeOrDish === 2) primary = measures.find(m => m.unit === 'dish');
  if (!primary && nz(row.finalQuantity)) {
    primary = measures.find(m => m.amount === row.finalQuantity);
    if (!primary) {
      const gram = measures.find(m => m.unit === 'gram');
      if (gram) primary = gram;
      else { primary = { amount: row.finalQuantity, unit: 'gram' }; measures.unshift(primary); }
    }
  }
  if (!primary) primary = measures[0];
  if (!primary) primary = { amount: 0, unit: 'gram' };

  return {
    amount: primary.amount,
    unit: primary.unit,
    conversions: [primary, ...measures.filter(m => m !== primary)],
    netoConfirmed: primary.amount > 0,
  };
}

/** Spec §5: quantity is absent when null OR zero; then fall back to the mirrors. */
function expectedAmount(ing) {
  return nz(ing.quantity) ? ing.quantity : (ing.Gram ?? ing.Liter ?? ing.Unit ?? ing.quantity ?? 0);
}

/** Spec §3: nutrition in mg/100g; reject the physically impossible. */
function expectedNutrition(row) {
  const n = {};
  const put = (k, v) => { if (nz(v) && v < MAX_NUTRITION_MG) n[k] = v; };
  put('energy_kcal', row.calories);
  put('protein_g', row.protein);
  put('carbs_g', row.carbohydrate);
  put('fat_g', row.fat);
  if (nz(row.Sodium) && row.Sodium < MAX_NUTRITION_MG) n.sodium_g = row.Sodium / 1000;
  return Object.keys(n).length ? n : null;
}

function sameConversions(a, b) {
  const norm = x => JSON.stringify((x ?? []).map(c => [c.amount, c.unit]));
  return norm(a) === norm(b);
}

// ---------------------------------------------------------------------------

async function run({ target, verbose }) {
  const uri = target === 'atlas' ? process.env.MONGO_URI : process.env.MONGO_LOCAL_URI;
  if (!uri) throw new Error(`${target === 'atlas' ? 'MONGO_URI' : 'MONGO_LOCAL_URI'} is not set`);

  const text = readSqlDumpAsUtf8(SQL_PATH);
  const recipesRaw = extractInserts(text, 'tblRecipies');
  const productsRaw = extractInserts(text, 'tblProducts');
  const suppliersRaw = extractInserts(text, 'tblSuppliers');
  const ingredientsRaw = extractInserts(text, 'tblRecipeProducts');
  const instructionsRaw = extractInserts(text, 'tblInstructions');
  const categoriesRaw = extractInserts(text, 'tblCategoryMaster');
  const controlRaw = extractInserts(text, 'tblControl');

  const ingByRecipe = new Map();
  for (const r of ingredientsRaw) {
    if (!ingByRecipe.has(r.recipeNo)) ingByRecipe.set(r.recipeNo, []);
    ingByRecipe.get(r.recipeNo).push(r);
  }
  const stepsByRecipe = new Map();
  for (const r of instructionsRaw) {
    if (!stepsByRecipe.has(r.recipeNo)) stepsByRecipe.set(r.recipeNo, []);
    stepsByRecipe.get(r.recipeNo).push(r);
  }

  console.log(`[audit] target: ${target}`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });
  const db = mongoose.connection.db;
  console.log(`[audit] database: ${db.databaseName}\n`);

  const findings = [];
  const add = (entity, issue, count, sample) => findings.push({ entity, issue, count, sample });

  // ---- Recipes & dishes ---------------------------------------------------
  const masterRecipes = await db.collection('RECIPE_LIST').find({ userId: '__master__', _legacyRecipeNo: { $exists: true } }).toArray();
  const masterDishes = await db.collection('DISH_LIST').find({ userId: '__master__', _legacyRecipeNo: { $exists: true } }).toArray();
  const byNo = new Map();
  for (const d of masterRecipes) byNo.set(d._legacyRecipeNo, { doc: d, coll: 'RECIPE_LIST' });
  for (const d of masterDishes) byNo.set(d._legacyRecipeNo, { doc: d, coll: 'DISH_LIST' });

  let missing = [], wrongColl = [], yieldAmt = [], yieldUnit = [], yieldConv = [], netoMiss = [];
  let ingCount = [], ingAmt = [], stepCount = [], prepWrong = [], prepMissing = [];
  const sourceRecipeNos = new Set(recipesRaw.map(r => r.recipeNo));
  let unresolvableLines = 0;
  const recipesWithUnresolvable = new Set();

  for (const row of recipesRaw) {
    const hit = byNo.get(row.recipeNo);
    if (!hit) { missing.push(row.recipeNo); continue; }
    const { doc, coll } = hit;
    const isDish = row.RecipeOrDish === 2;
    if (isDish !== (coll === 'DISH_LIST')) wrongColl.push(row.recipeNo);

    const exp = expectedYield(row);
    if (doc.yield_amount_ !== exp.amount) yieldAmt.push({ no: row.recipeNo, exp: exp.amount, act: doc.yield_amount_ });
    if (doc.yield_unit_ !== exp.unit) yieldUnit.push({ no: row.recipeNo, exp: exp.unit, act: doc.yield_unit_ });
    if (!sameConversions(exp.conversions, doc.yield_conversions_)) {
      yieldConv.push({ no: row.recipeNo, exp: exp.conversions.length, act: (doc.yield_conversions_ ?? []).length });
    }
    if (exp.netoConfirmed && doc.neto_confirmed_ !== true) netoMiss.push(row.recipeNo);

    // Ingredients. A source line that references nothing (product = 0) or a
    // sub-recipe id absent from tblRecipies cannot be migrated — it is broken
    // in the source, not lost in transit. Those are excluded from the expected
    // count and reported separately, so a real drop stays visible.
    const srcIngAll = (ingByRecipe.get(row.recipeNo) ?? []).slice().sort((a, b) => a.recipeLine - b.recipeLine);
    const srcIng = srcIngAll.filter(r => r.product && !(r.productType === 1 && !sourceRecipeNos.has(r.product)));
    unresolvableLines += srcIngAll.length - srcIng.length;
    if (srcIngAll.length !== srcIng.length) recipesWithUnresolvable.add(row.recipeNo);
    const actIng = doc.ingredients_ ?? [];
    if (srcIng.length !== actIng.length) {
      ingCount.push({ no: row.recipeNo, exp: srcIng.length, act: actIng.length });
    } else {
      for (let i = 0; i < srcIng.length; i++) {
        const e = expectedAmount(srcIng[i]);
        if (actIng[i].amount_ !== e) { ingAmt.push({ no: row.recipeNo, i, exp: e, act: actIng[i].amount_ }); break; }
      }
    }

    // steps
    const srcSteps = stepsByRecipe.get(row.recipeNo) ?? [];
    if ((doc.steps_ ?? []).length !== srcSteps.length) {
      stepCount.push({ no: row.recipeNo, exp: srcSteps.length, act: (doc.steps_ ?? []).length });
    }

    // dish mise-en-place — spec §4/plan 314: one row per non-empty instruction line
    if (isDish) {
      const expPrep = [];
      for (const s of srcSteps.slice().sort((a, b) => a.stepNo - b.stepNo)) {
        for (const line of String(s.stepDescription ?? '').split(/\r\n|\r|\n/)) {
          const nm = line.trim();
          if (nm) expPrep.push(nm);
        }
      }
      const actPrep = (doc.prep_items_ ?? []).map(p => p.preparation_name);
      if (expPrep.length !== actPrep.length) {
        (expPrep.length && !actPrep.length ? prepMissing : prepWrong).push({ no: row.recipeNo, exp: expPrep.length, act: actPrep.length });
      } else if (expPrep.some((n, i) => n !== actPrep[i])) {
        prepWrong.push({ no: row.recipeNo, exp: expPrep.length, act: actPrep.length, mismatch: true });
      }
    }
  }

  if (missing.length) add('recipes/dishes', 'missing from Mongo entirely', missing.length, missing.slice(0, 5).join(', '));
  if (wrongColl.length) add('recipes/dishes', 'in the wrong collection for its type', wrongColl.length, wrongColl.slice(0, 5).join(', '));
  if (yieldAmt.length) add('yield', 'yield_amount_ differs from spec', yieldAmt.length, yieldAmt.slice(0, 3).map(x => `#${x.no} exp ${x.exp} act ${x.act}`).join(' | '));
  if (yieldUnit.length) add('yield', 'yield_unit_ differs from spec', yieldUnit.length, yieldUnit.slice(0, 3).map(x => `#${x.no} exp ${x.exp} act ${x.act}`).join(' | '));
  if (yieldConv.length) add('yield', 'yield_conversions_ differs from spec', yieldConv.length, yieldConv.slice(0, 3).map(x => `#${x.no} exp ${x.exp} entries act ${x.act}`).join(' | '));
  if (netoMiss.length) add('yield', 'neto_confirmed_ not set on a real yield', netoMiss.length, netoMiss.slice(0, 5).join(', '));
  if (ingCount.length) add('ingredients', 'ingredient count differs from source', ingCount.length, ingCount.slice(0, 3).map(x => `#${x.no} exp ${x.exp} act ${x.act}`).join(' | '));
  if (ingAmt.length) add('ingredients', 'ingredient amount differs from spec', ingAmt.length, ingAmt.slice(0, 3).map(x => `#${x.no}[${x.i}] exp ${x.exp} act ${x.act}`).join(' | '));
  if (stepCount.length) add('steps', 'step count differs from source', stepCount.length, stepCount.slice(0, 3).map(x => `#${x.no} exp ${x.exp} act ${x.act}`).join(' | '));
  if (prepMissing.length) add('dish mise-en-place', 'EMPTY but source has checklist rows', prepMissing.length, prepMissing.slice(0, 5).map(x => `#${x.no} exp ${x.exp}`).join(', '));
  if (prepWrong.length) add('dish mise-en-place', 'differs from the source checklist', prepWrong.length, prepWrong.slice(0, 3).map(x => `#${x.no} exp ${x.exp} act ${x.act}`).join(' | '));

  // ---- Products -----------------------------------------------------------
  const masterProducts = await db.collection('PRODUCT_LIST').find({ userId: '__master__', _legacyProductId: { $exists: true } }).toArray();
  const prodById = new Map(masterProducts.map(p => [p._legacyProductId, p]));
  // A legacy product whose name already exists in the seeded catalogue is
  // deliberately not duplicated — the import reuses the seeded document and
  // ingredient lines resolve to it. Absent-by-id is therefore only a real
  // finding when no same-name product exists either.
  const prodByName = new Map(
    (await db.collection('PRODUCT_LIST').find({ userId: '__master__' }).project({ name_hebrew: 1 }).toArray())
      .map(d => [clean(d.name_hebrew), d])
  );
  let pMissing = [], nameReused = 0, nutMissing = [], nutExtra = [], cholMissing = [], sodiumRejected = [];

  for (const row of productsRaw) {
    const doc = prodById.get(row.product);
    if (!doc) {
      if (prodByName.has(clean(row.productName))) nameReused++;
      else pMissing.push(row.product);
      continue;
    }
    const expN = expectedNutrition(row);
    const actN = doc.nutrition_per_100g;
    if (expN && !actN) nutMissing.push(row.product);
    if (!expN && actN) nutExtra.push(row.product);
    if (nz(row.Sodium) && row.Sodium >= MAX_NUTRITION_MG) sodiumRejected.push(`${row.product} (${clean(row.productName)}) = ${row.Sodium}`);
    if (nz(row.colesterol) && doc.nutrition_per_100g?.cholesterol_mg == null) cholMissing.push(row.product);
  }
  if (pMissing.length) add('products', 'MISSING — no doc by id and none by name either', pMissing.length, pMissing.slice(0, 5).join(', '));
  if (nutMissing.length) add('products', 'source has nutrition, Mongo has none', nutMissing.length, nutMissing.slice(0, 5).join(', '));
  if (nutExtra.length) add('products', 'Mongo has nutrition the source does not', nutExtra.length, nutExtra.slice(0, 5).join(', '));
  if (cholMissing.length) add('products', 'cholesterol not migrated (spec §3, new field)', cholMissing.length, cholMissing.join(', '));
  if (sodiumRejected.length) add('products', 'sodium rejected as impossible (>100% mass) — expected', sodiumRejected.length, sodiumRejected.join(' | '));

  // ---- Suppliers ----------------------------------------------------------
  const masterSuppliers = await db.collection('KITCHEN_SUPPLIERS').find({ userId: '__master__', _legacySupplierCode: { $exists: true } }).toArray();
  const supByCode = new Map(masterSuppliers.map(s => [s._legacySupplierCode, s]));
  let sMissing = [], phoneMissing = [], phone2Missing = [];
  for (const row of suppliersRaw) {
    const doc = supByCode.get(row.supplierCode);
    if (!doc) { sMissing.push(row.supplierCode); continue; }
    if (clean(row.phone1) && !clean(doc.phone_)) phoneMissing.push(row.supplierCode);
    if (clean(row.phone2) && !clean(doc.phone2_)) phone2Missing.push(row.supplierCode);
  }
  if (sMissing.length) add('suppliers', 'missing from Mongo entirely', sMissing.length, sMissing.join(', '));
  if (phoneMissing.length) add('suppliers', 'phone_ not migrated', phoneMissing.length, phoneMissing.join(', '));
  if (phone2Missing.length) add('suppliers', 'phone2_ not migrated', phone2Missing.length, phone2Missing.join(', '));

  // ---- Categories & global config (spec §8, §9) ---------------------------
  // Category images were dropped from scope on 2026-09-27 — the legacy
  // categories live on recipes as bare `labels_` strings and are not
  // registered anywhere, so there is no entity to hang an image on. Not a
  // finding; recorded so the absence is not rediscovered as a gap.
  void categoriesRaw;
  const ctrl = controlRaw[0];
  if (ctrl) {
    const meta = await db.collection('MASTER_META').findOne({ _id: 'legacy-config' });
    const hasCfg = meta && (meta.laborCost != null || meta.vatPercent != null);
    if (!hasCfg) add('global config', 'tblControl not migrated (spec §8)', 1, `laborCost=${ctrl.laborCost}, vatPercent=${ctrl.vatPercent}`);
  }

  // ---- §7a cost cross-check ----------------------------------------------
  const priced = recipesRaw.filter(r => nz(r.recipePrice));
  add('cost cross-check', 'recipes with a recorded FoodComposer price (spec §7a signal)', priced.length, 'compare against computed cost once data is correct');

  // ---- Report -------------------------------------------------------------
  console.log('SOURCE'.padEnd(26), 'rows');
  console.log('  recipes+dishes'.padEnd(26), recipesRaw.length);
  console.log('  products'.padEnd(26), productsRaw.length);
  console.log('  suppliers'.padEnd(26), suppliersRaw.length);
  console.log('  ingredient lines'.padEnd(26), ingredientsRaw.length);
  console.log('  instruction rows'.padEnd(26), instructionsRaw.length);
  console.log('\nMONGO (__master__ legacy)');
  console.log('  RECIPE_LIST'.padEnd(26), masterRecipes.length);
  console.log('  DISH_LIST'.padEnd(26), masterDishes.length);
  console.log('  PRODUCT_LIST'.padEnd(26), masterProducts.length);
  console.log('  KITCHEN_SUPPLIERS'.padEnd(26), masterSuppliers.length);

  console.log('\nEXPLAINED — source-side, not migration defects');
  console.log(`  ${String(nameReused).padStart(6)}  products reused an existing same-name doc instead of duplicating`);
  console.log(`  ${String(unresolvableLines).padStart(6)}  ingredient lines unresolvable in the SOURCE (product=0, or sub-recipe absent)`);
  console.log(`  ${String(recipesWithUnresolvable.size).padStart(6)}  recipes affected by those lines`);

  console.log('\n' + '='.repeat(78));
  console.log('FINDINGS vs plan 317 spec');
  console.log('='.repeat(78));
  if (!findings.length) {
    console.log('\n  none — Mongo matches the spec.\n');
  } else {
    let entity = null;
    for (const f of findings) {
      if (f.entity !== entity) { entity = f.entity; console.log(`\n[${entity}]`); }
      console.log(`  ${String(f.count).padStart(6)}  ${f.issue}`);
      if (f.sample) console.log(`          e.g. ${f.sample}`);
    }
    console.log('');
  }

  await mongoose.disconnect();
}

run(parseArgs(process.argv)).catch(e => { console.error(e); process.exit(1); });
