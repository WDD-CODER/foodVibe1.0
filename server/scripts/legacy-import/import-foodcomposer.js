'use strict';
/**
 * import-foodcomposer.js — one-time migration of the legacy FoodComposer
 * (MS SQL Server) product/recipe/dish catalog into FoodVibe's MongoDB
 * master catalog (userId: '__master__').
 *
 * Usage:
 *   node server/scripts/legacy-import/import-foodcomposer.js [options]
 *
 * Options:
 *   --sql-path=PATH     Path to the SQL Server dump (.sql). Defaults to
 *                        c:\coding projects\foodcostdatabase\fullDATA.sql
 *   --samples=N          Sample docs to print per collection in dry-run (default 3)
 *   --apply-dictionary   Merge new unit/category keys into
 *                        public/assets/data/dictionary.json (idempotent —
 *                        only adds missing keys, never overwrites existing ones)
 *   --write=local        Insert into MONGO_LOCAL_URI
 *   --write=atlas        Insert into MONGO_URI (Atlas — live/shared DB)
 *   --force              Skip the idempotency guard (re-run despite a prior import marker)
 *
 * With no --write flag, this is a pure dry run: parses, transforms, prints
 * stats/warnings/samples, and reports what --apply-dictionary would add.
 * No file or database writes happen unless the corresponding flag is passed.
 */

// Node 22+ has a DNS SRV resolution bug on Windows that breaks mongodb+srv://
// (Atlas) lookups — same workaround server/index.js applies at startup.
require('node:dns').setServers(['8.8.8.8', '8.8.4.4']);

const path = require('path');
const fs = require('fs');

const { readSqlDumpAsUtf8, extractInserts } = require('./lib/sql-parser');
const { buildImport } = require('./lib/transform');
const { NEW_UNIT_DICTIONARY_ENTRIES, NEW_CATEGORY_DICTIONARY_ENTRIES, CATEGORY_MASTER_MAP } = require('./lib/mappings');

const DEFAULT_SQL_PATH = 'c:\\coding projects\\foodcostdatabase\\fullDATA.sql';
const DICTIONARY_PATH = path.resolve(__dirname, '..', '..', '..', 'public', 'assets', 'data', 'dictionary.json');

function parseArgs(argv) {
  const args = { samples: 3 };
  for (const arg of argv.slice(2)) {
    if (arg === '--apply-dictionary') args.applyDictionary = true;
    else if (arg === '--force') args.force = true;
    else if (arg.startsWith('--sql-path=')) args.sqlPath = arg.slice('--sql-path='.length);
    else if (arg.startsWith('--samples=')) args.samples = Number(arg.slice('--samples='.length));
    else if (arg.startsWith('--write=')) args.write = arg.slice('--write='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.write && !['local', 'atlas'].includes(args.write)) {
    throw new Error(`--write must be 'local' or 'atlas', got '${args.write}'`);
  }
  return args;
}

/**
 * Reads existing __master__ docs from the given target's Mongo so buildImport
 * can dedupe against them (see transform.js comment — sync-master.js silently
 * skips cloning any master doc whose name collides with one a user already has,
 * so a name-colliding duplicate would be permanently uncloneable).
 * Returns empty maps/set (with a warning) if the target is unreachable — dedup
 * against pre-existing master data is then best-effort, not guaranteed.
 */
async function fetchExistingMasterRefs(target) {
  const mongoose = require('mongoose');
  require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
  const uri = target === 'atlas' ? process.env.MONGO_URI : process.env.MONGO_LOCAL_URI;
  const empty = { existingProductIdByName: new Map(), existingSupplierIdByName: new Map(), existingRecipeDishNames: new Set() };
  if (!uri) return empty;

  let conn;
  try {
    conn = await mongoose.createConnection(uri, { serverSelectionTimeoutMS: 8000 }).asPromise();
    const db = conn.db;
    const [products, suppliers, recipes, dishes] = await Promise.all([
      db.collection('PRODUCT_LIST').find({ userId: '__master__' }).project({ _id: 1, name_hebrew: 1 }).toArray(),
      db.collection('KITCHEN_SUPPLIERS').find({ userId: '__master__' }).project({ _id: 1, name_hebrew: 1 }).toArray(),
      db.collection('RECIPE_LIST').find({ userId: '__master__' }).project({ name_hebrew: 1 }).toArray(),
      db.collection('DISH_LIST').find({ userId: '__master__' }).project({ name_hebrew: 1 }).toArray(),
    ]);
    await conn.close();
    return {
      existingProductIdByName: new Map(products.map(p => [(p.name_hebrew || '').trim(), p._id]).filter(([n]) => n)),
      existingSupplierIdByName: new Map(suppliers.map(s => [(s.name_hebrew || '').trim(), s._id]).filter(([n]) => n)),
      existingRecipeDishNames: new Set([...recipes, ...dishes].map(d => (d.name_hebrew || '').trim()).filter(Boolean)),
    };
  } catch (err) {
    console.warn(`[import] WARNING: could not read existing master data from ${target} (${err.message}) — name-collision dedup against it is skipped.`);
    if (conn) await conn.close().catch(() => {});
    return empty;
  }
}

function loadRawTables(sqlPath) {
  console.log(`[import] Reading ${sqlPath} ...`);
  const text = readSqlDumpAsUtf8(sqlPath);
  const tables = {
    suppliersRaw: extractInserts(text, 'tblSuppliers'),
    productsRaw: extractInserts(text, 'tblProducts'),
    recipesRaw: extractInserts(text, 'tblRecipies'),
    recipeProductsRaw: extractInserts(text, 'tblRecipeProducts'),
    instructionsRaw: extractInserts(text, 'tblInstructions'),
  };
  console.log('[import] Parsed row counts:', Object.fromEntries(
    Object.entries(tables).map(([k, v]) => [k, v.length])
  ));
  return tables;
}

/** Category ids actually referenced by parsed recipes, cross-checked against CATEGORY_MASTER_MAP. */
function findUnmappedCategoryIds(recipesRaw) {
  const used = new Set(recipesRaw.map(r => r.categoryId).filter(id => id != null));
  return [...used].filter(id => !(id in CATEGORY_MASTER_MAP)).sort((a, b) => a - b);
}

function printDryRunReport(result, samples) {
  console.log('\n=== Stats ===');
  console.table(result.stats);

  if (result.warnings.length) {
    console.log(`\n=== Warnings (${result.warnings.length}) ===`);
    const shown = result.warnings.slice(0, 40);
    shown.forEach(w => console.log(' -', w));
    if (result.warnings.length > shown.length) {
      console.log(`  ... and ${result.warnings.length - shown.length} more`);
    }
  } else {
    console.log('\n=== Warnings: none ===');
  }

  for (const [label, docs] of [
    ['Suppliers', result.suppliers],
    ['Products', result.products],
    ['Recipes (preparations)', result.recipes],
    ['Dishes', result.dishes],
  ]) {
    console.log(`\n=== ${label}: ${docs.length} — ${samples} sample(s) ===`);
    console.log(JSON.stringify(docs.slice(0, samples), null, 2));
  }
}

function computeDictionaryDiff() {
  const existing = JSON.parse(fs.readFileSync(DICTIONARY_PATH, 'utf8'));
  const newUnits = Object.entries(NEW_UNIT_DICTIONARY_ENTRIES)
    .filter(([k]) => !(k in (existing.units || {})));
  const newCategories = Object.entries(NEW_CATEGORY_DICTIONARY_ENTRIES)
    .filter(([k]) => !(k in (existing.categories || {})));
  const newLabels = Object.values(CATEGORY_MASTER_MAP)
    .filter(c => c.key && c.hebrew && !(c.key in (existing.general || {})))
    .map(c => [c.key, c.hebrew])
    // dedupe (a key could appear once; guard anyway since safety > cleverness here)
    .filter((entry, idx, arr) => arr.findIndex(e => e[0] === entry[0]) === idx);

  return { existing, newUnits, newCategories, newLabels };
}

function applyDictionary() {
  const { existing, newUnits, newCategories, newLabels } = computeDictionaryDiff();
  if (!newUnits.length && !newCategories.length && !newLabels.length) {
    console.log('[dictionary] Nothing to add — already up to date.');
    return;
  }
  existing.units = { ...existing.units, ...Object.fromEntries(newUnits) };
  existing.categories = { ...existing.categories, ...Object.fromEntries(newCategories) };
  existing.general = { ...existing.general, ...Object.fromEntries(newLabels) };
  fs.writeFileSync(DICTIONARY_PATH, JSON.stringify(existing, null, 2) + '\n', 'utf8');
  console.log(`[dictionary] Added ${newUnits.length} unit key(s), ${newCategories.length} category key(s), ${newLabels.length} label key(s).`);
}

async function writeToMongo(target, result, { force }) {
  const mongoose = require('mongoose');
  require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });

  const uri = target === 'atlas' ? process.env.MONGO_URI : process.env.MONGO_LOCAL_URI;
  if (!uri) throw new Error(`${target === 'atlas' ? 'MONGO_URI' : 'MONGO_LOCAL_URI'} is not set in server/.env`);

  console.log(`[import] Connecting to ${target.toUpperCase()} ...`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;

  if (!force) {
    const existing = await db.collection('PRODUCT_LIST').findOne({ userId: '__master__', _legacyImport: true });
    if (existing) {
      await mongoose.disconnect();
      throw new Error(
        `[import] A previous legacy import already exists in ${target} (found _legacyImport marker in PRODUCT_LIST). ` +
        `Pass --force to re-run anyway (will not deduplicate).`
      );
    }
  }

  const collections = [
    ['KITCHEN_SUPPLIERS', result.suppliers],
    ['PRODUCT_LIST', result.products],
    ['RECIPE_LIST', result.recipes],
    ['DISH_LIST', result.dishes],
  ];

  for (const [name, docs] of collections) {
    if (!docs.length) continue;
    try {
      const res = await db.collection(name).insertMany(docs, { ordered: false });
      console.log(`[import] [${target}] ${name}: inserted ${res.insertedCount}/${docs.length}`);
    } catch (err) {
      const inserted = err.result?.insertedCount ?? err.insertedDocs?.length ?? 0;
      console.error(`[import] [${target}] ${name}: ERROR after ${inserted}/${docs.length} inserted — ${err.message}`);
      throw err;
    }
  }

  await mongoose.disconnect();
  console.log(`[import] [${target}] Done.`);
}

async function main() {
  const args = parseArgs(process.argv);
  const sqlPath = args.sqlPath || DEFAULT_SQL_PATH;

  const unmapped = (() => {
    const text = readSqlDumpAsUtf8(sqlPath);
    const recipesRaw = extractInserts(text, 'tblRecipies');
    return findUnmappedCategoryIds(recipesRaw);
  })();
  if (unmapped.length) {
    console.warn(`[import] WARNING: categoryId(s) used by recipes but missing from CATEGORY_MASTER_MAP: ${unmapped.join(', ')}`);
  }

  const raw = loadRawTables(sqlPath);

  const dedupTarget = args.write || 'local'; // dry run previews against local as a best-effort reference
  console.log(`[import] Checking existing __master__ data on ${dedupTarget} for name-collision dedup ...`);
  const existingRefs = await fetchExistingMasterRefs(dedupTarget);
  console.log(`[import] Existing master: ${existingRefs.existingProductIdByName.size} product name(s), ${existingRefs.existingSupplierIdByName.size} supplier name(s), ${existingRefs.existingRecipeDishNames.size} recipe/dish name(s).`);

  const result = buildImport(raw, { now: Date.now(), ...existingRefs });

  const { newUnits, newCategories, newLabels } = computeDictionaryDiff();
  console.log(`\n[dictionary] Would add: ${newUnits.length} unit key(s), ${newCategories.length} category key(s), ${newLabels.length} label key(s).`);

  if (!args.write) {
    printDryRunReport(result, args.samples);
  }

  if (args.applyDictionary) {
    applyDictionary();
  }

  if (args.write) {
    await writeToMongo(args.write, result, { force: !!args.force });
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
