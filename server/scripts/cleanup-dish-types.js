'use strict';
/**
 * cleanup-dish-types.js — Plan 376. Trims the dish-type list (taxonomyTerms, kind 'course') to the
 * mapping Dandan approved on 2026-10-10 and remaps every recipe's and dish's `course` so no
 * document points at a dropped key.
 *
 * Per owner (every userId, including __master__):
 *   1. recipes / dishes: `course` mapped by mapCourse() — merged keys move to their target,
 *      removed keys become '' (Q4 a). The dessert categories merge into desserts on dishes
 *      only; recipes (preparations) keep them. `updatedAt` is bumped; `_userModified` is left alone.
 *   2. taxonomyTerms: course terms for merged / removed keys are deleted (after step 1, so no
 *      term in use is deleted); kept keys missing from master are added to master.
 * TRASH_* and VERSION_HISTORY snapshots are not touched (the client shows "ללא" for them).
 *
 * DRY RUN by default: prints a count per old value per collection. Nothing is written without
 * --write=true, which also needs --backup=<db-backup.js snapshot dir> of the same target, < 24h old.
 * Idempotent: after --write, a second dry run prints 0 changes.
 *
 * Usage:
 *   node server/scripts/cleanup-dish-types.js --target=local
 *   node server/scripts/cleanup-dish-types.js --target=local --write=true --backup=<snapshot dir>
 *   node server/scripts/cleanup-dish-types.js --target=atlas --confirm-host=<member host> [--write=true --backup=...]
 */

const fs = require('fs');
const path = require('path');

const MASTER = '__master__';
const TAXONOMY = 'taxonomyTerms';
/** Dish types have no color (plan 375); the taxonomyTerms schema still requires one. */
const COURSE_NEUTRAL_COLOR = '#78716C';
const REPORT_DIR = path.resolve(__dirname, '..', '..', '.claude', 'reports', 'dish-types-cleanup');

/** Approved by Dandan 2026-10-10: preparation categories, dessert categories, stews_cookery and soups_stocks_cooking_liquids stay. */
const MAPPING = {
  keep: [
    'amuse_bouche', 'starter', 'starter_chicken', 'starter_fish', 'starter_meat', 'starter_seafood',
    'starter_vegetarian', 'main_dish', 'main_dish_chicken', 'main_dish_fish', 'main_dish_meat',
    'main_dish_vegetarian', 'main_seafood', 'pork_dish', 'pasta_dish', 'soups', 'soups_stocks_cooking_liquids',
    'salads', 'side_dish', 'grains_side_dish', 'legume_side_dish', 'starch_side_dish', 'vegetable_side_dish',
    'pre_dessert', 'desserts', 'stews_cookery',
    // dessert categories: kept for preparations, merged into desserts on dishes (MAPPING.mergeInDishes)
    'cakes_cookies_tarts', 'pastry_sweets', 'sorbet_ice_cream_granita', 'sweet_creams_custards_mousse',
    // preparation categories — kept as dish types (Dandan, 2026-10-10)
    'general_preps', 'pasta_prep', 'charcuterie_meat_mass_meat_preps', 'powders_spice_mixes_dry_preps',
    'jams_sweet_preps_syrup', 'oils_and_infusions', 'fermentation_curing_pickling', 'salty_baking_doughs',
    'sweet_baking_doughs', 'vinaigrettes_mayonnaise_emulsion', 'foams_hot_cold', 'fish_shellfish_sauce',
    'meat_sauce', 'salad_sauce', 'sweet_sauce', 'sauces_cold_hot_savory', 'רוטב', 'גלייז',
    'spreads_dips_salty_creams', 'bread_focaccia_savory_baking', 'vegetables_snacks_add_ons',
  ],
  merge: {
    salads_fresh_side_dish: 'salads',
    'סלט': 'salads',
    special_starter_for_boss: 'starter',
    special_main_for_boss: 'main_dish',
  },
  /** Kept dish types that are merged in `dishes` only; `recipes` (preparations) keep them. */
  mergeInDishes: {
    cakes_cookies_tarts: 'desserts',
    pastry_sweets: 'desserts',
    sorbet_ice_cream_granita: 'desserts',
    sweet_creams_custards_mousse: 'desserts',
  },
  remove: [
    'trash_category', 'ideas_dishes', 'ideas_preparations', 'conversions_and_techniques',
    'dan_and_adi_cooking_from_the_orchard', 'dan_and_adi_dishes_from_the_orchard', 'special_for_boss',
    'soups_up', 'bakery',
  ],
};

/**
 * The new `course` for one document.
 * @param {string|undefined|null} value stored course
 * @param {'recipes'|'dishes'} collection
 * @returns {{ next: string|undefined|null, action: 'none'|'keep'|'merge'|'remove'|'unknown' }}
 */
function mapCourse(value, collection, mapping = MAPPING) {
  if (value === undefined || value === null || value === '') return { next: value, action: 'none' };
  if (collection === 'dishes' && value in mapping.mergeInDishes) return { next: mapping.mergeInDishes[value], action: 'merge' };
  if (mapping.keep.includes(value)) return { next: value, action: 'keep' };
  if (value in mapping.merge) return { next: mapping.merge[value], action: 'merge' };
  if (mapping.remove.includes(value)) return { next: '', action: 'remove' };
  // A user's own dish type, or a value not in the approved table: left as is, listed in the report.
  return { next: value, action: 'unknown' };
}

/** Course keys whose terms are deleted. */
function droppedKeys(mapping = MAPPING) {
  return [...Object.keys(mapping.merge), ...mapping.remove];
}

/**
 * Plans every change without writing. `apply()` performs them.
 * @param {import('mongodb').Db} db
 */
async function planCleanup(db, mapping = MAPPING, now = Date.now()) {
  const docChanges = [];
  const unknown = {};
  for (const collection of ['recipes', 'dishes']) {
    const docs = await db
      .collection(collection)
      .find({ course: { $exists: true, $nin: ['', null] }, _userDeleted: { $ne: true } }, { projection: { course: 1, userId: 1, nameHebrew: 1 } })
      .toArray();
    for (const d of docs) {
      const { next, action } = mapCourse(d.course, collection, mapping);
      if (action === 'unknown') {
        const k = `${collection}:${d.course}`;
        unknown[k] = (unknown[k] ?? 0) + 1;
      }
      if (next === d.course) continue;
      docChanges.push({ collection, _id: d._id, userId: d.userId, name: d.nameHebrew ?? null, from: d.course, to: next, action });
    }
  }

  const dropped = droppedKeys(mapping);
  const termDeletes = await db
    .collection(TAXONOMY)
    .find({ kind: 'course', key: { $in: dropped } }, { projection: { _id: 1, userId: 1, key: 1 } })
    .toArray();

  const masterTerms = await db.collection(TAXONOMY).find({ kind: 'course', userId: MASTER }, { projection: { key: 1, sortOrder: 1 } }).toArray();
  const masterKeys = new Set(masterTerms.map(t => t.key));
  let nextOrder = masterTerms.reduce((m, t) => Math.max(m, t.sortOrder ?? 0), -1) + 1;
  const termAdds = mapping.keep
    .filter(key => !masterKeys.has(key))
    .map(key => ({
      _id: `course:${MASTER}:${key}`,
      schemaVersion: 2,
      userId: MASTER,
      createdAt: now,
      updatedAt: now,
      kind: 'course',
      key,
      sortOrder: nextOrder++,
      color: COURSE_NEUTRAL_COLOR,
    }));

  async function apply() {
    for (const c of docChanges) {
      await db.collection(c.collection).updateOne({ _id: c._id, course: c.from }, { $set: { course: c.to, updatedAt: now } });
    }
    // Terms after documents: a term must never be deleted while a document still uses it.
    if (termDeletes.length) await db.collection(TAXONOMY).deleteMany({ _id: { $in: termDeletes.map(t => t._id) } });
    for (const t of termAdds) await db.collection(TAXONOMY).replaceOne({ _id: t._id }, t, { upsert: true });
    const masterTouched =
      termAdds.length > 0 || termDeletes.some(t => t.userId === MASTER) || docChanges.some(c => c.userId === MASTER);
    if (masterTouched) {
      // Same write as services/master-version.js bumpMasterVersion(), which needs mongoose; this script uses the driver.
      await db.collection('MASTER_META').updateOne({ _id: 'version' }, { $set: { lastModified: now } }, { upsert: true });
    }
    return { masterTouched };
  }

  return { docChanges, termDeletes, termAdds, unknown, apply };
}

/** Per old value per collection: how many documents change. */
function countSummary(docChanges) {
  const rows = {};
  for (const c of docChanges) {
    const k = `${c.collection.padEnd(8)} ${c.from} → ${c.to === '' ? "'' (ללא)" : c.to}`;
    rows[k] = (rows[k] ?? 0) + 1;
  }
  return Object.entries(rows).sort(([a], [b]) => a.localeCompare(b));
}

/** --write=true needs a db-backup.js snapshot of the same target, taken in the last 24h. */
function checkBackup(args) {
  const dir = args.backup;
  if (!dir) throw new Error('--write=true needs --backup=<snapshot dir from server/scripts/db-backup.js>');
  const manifestPath = path.join(dir, '_manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error(`No _manifest.json in ${dir}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const ageH = (Date.now() - Date.parse(manifest.takenAt)) / 36e5;
  if (manifest.target !== args.target) throw new Error(`Backup is for target '${manifest.target}', not '${args.target}'`);
  if (!(ageH >= 0 && ageH < 24)) throw new Error(`Backup is ${ageH.toFixed(1)}h old; take a fresh one (< 24h)`);
  console.log(`[dish-types] backup OK: ${dir} (taken ${manifest.takenAt})`);
}

async function main() {
  const { parseArgs, connect } = require('../migrations/tools/_connect');
  const args = parseArgs(process.argv, { write: true, backup: true });
  if (args.write !== undefined && args.write !== 'true') throw new Error("--write must be 'true' (omit it for a dry run)");
  const write = args.write === 'true';
  if (write) checkBackup(args);

  const { client, db } = await connect(args);
  try {
    const plan = await planCleanup(db);
    console.log(`\nDocuments whose course changes: ${plan.docChanges.length}`);
    for (const [row, n] of countSummary(plan.docChanges)) console.log(`  ${String(n).padStart(5)}  ${row}`);
    const owners = new Set(plan.docChanges.map(c => c.userId));
    console.log(`  (across ${owners.size} owner${owners.size === 1 ? '' : 's'})`);
    console.log(`\nCourse terms to delete: ${plan.termDeletes.length}`);
    for (const t of plan.termDeletes) console.log(`  ${t.userId}  ${t.key}`);
    console.log(`Master course terms to add: ${plan.termAdds.length}${plan.termAdds.length ? ` (${plan.termAdds.map(t => t.key).join(', ')})` : ''}`);
    const unknown = Object.entries(plan.unknown);
    if (unknown.length) {
      console.log('\nLeft as is — values not in the approved table (own dish types?):');
      for (const [k, n] of unknown) console.log(`  ${String(n).padStart(5)}  ${k}`);
    }

    if (!write) {
      console.log('\n[dish-types] DRY RUN — nothing written.');
      return;
    }
    const { masterTouched } = await plan.apply();
    fs.mkdirSync(REPORT_DIR, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const logPath = path.join(REPORT_DIR, `${args.target}-${stamp}.json`);
    fs.writeFileSync(
      logPath,
      JSON.stringify({ target: args.target, at: new Date().toISOString(), backup: args.backup, mapping: MAPPING, docChanges: plan.docChanges, termDeletes: plan.termDeletes, termAdds: plan.termAdds, unknown: plan.unknown }, null, 2)
    );
    console.log(`\n[dish-types] WRITTEN. Mutation log: ${logPath}${masterTouched ? ' · master version bumped' : ''}`);
  } finally {
    await client.close();
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { MAPPING, mapCourse, droppedKeys, planCleanup, countSummary };
