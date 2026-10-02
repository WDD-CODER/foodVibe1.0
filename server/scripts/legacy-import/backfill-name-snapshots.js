'use strict';
require('../../utils/v1-only-guard')('backfill-name-snapshots.js');
/**
 * backfill-name-snapshots.js — populate `ingredients_[].nameSnapshot` on
 * recipes and dishes that were imported without it.
 *
 * Why this matters more than it looks: PUT /api/v1/data/:type/:id REJECTS any
 * recipe whose linked ingredients lack a nameSnapshot (server/routes/generic.js).
 * The legacy import never wrote one, so every imported recipe was impossible to
 * save from the app — changing a rating, toggling approval, editing anything at
 * all returned 400. The snapshot also exists so a recipe stays readable if the
 * referenced product is later deleted.
 *
 * Names are resolved from Mongo rather than the SQL dump, so this works on any
 * database and on user clones, whose referenceIds point at their own copies.
 *
 * Usage:
 *   node server/scripts/legacy-import/backfill-name-snapshots.js [--target=local|atlas] [--write]
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
require('node:dns').setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');

function parseArgs(argv) {
  const args = { target: 'local' };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--target=')) args.target = a.slice('--target='.length);
    else if (a === '--write') args.write = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!['local', 'atlas'].includes(args.target)) throw new Error("--target must be 'local' or 'atlas'");
  return args;
}

async function run({ target, write }) {
  const uri = target === 'atlas' ? process.env.MONGO_URI : process.env.MONGO_LOCAL_URI;
  if (!uri) throw new Error('Mongo URI not set');

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });
  const db = mongoose.connection.db;
  console.log(`[name-snapshots] target: ${target} (${db.databaseName})`);

  // One name index per scope: a clone's referenceIds point at that user's own
  // products and sub-recipes, not at master's.
  const nameById = new Map();
  for (const coll of ['PRODUCT_LIST', 'RECIPE_LIST', 'DISH_LIST']) {
    for (const d of await db.collection(coll).find({}).project({ _id: 1, name_hebrew: 1 }).toArray()) {
      nameById.set(String(d._id), d.name_hebrew ?? '');
    }
  }
  console.log(`[name-snapshots] name index: ${nameById.size} document(s).`);

  let scanned = 0, docsPatched = 0, linesFilled = 0, unresolved = 0;

  for (const coll of ['RECIPE_LIST', 'DISH_LIST']) {
    const docs = await db.collection(coll)
      .find({ ingredients_: { $elemMatch: { referenceId: { $exists: true }, nameSnapshot: { $exists: false } } } })
      .project({ _id: 1, ingredients_: 1, name_hebrew: 1 })
      .toArray();
    scanned += docs.length;

    const ops = [];
    for (const doc of docs) {
      let changed = false;
      const next = (doc.ingredients_ ?? []).map(ing => {
        if (!ing.referenceId || ing.nameSnapshot) return ing;
        const nm = nameById.get(String(ing.referenceId));
        if (nm == null) { unresolved++; return ing; }
        changed = true;
        linesFilled++;
        return { ...ing, nameSnapshot: nm };
      });
      if (!changed) continue;
      docsPatched++;
      ops.push({ updateOne: { filter: { _id: doc._id }, update: { $set: { ingredients_: next } } } });
    }

    console.log(`[name-snapshots] ${coll}: ${docs.length} doc(s) missing a snapshot, ${write ? 'patching' : 'would patch'} ${ops.length}.`);
    if (write && ops.length) {
      for (let i = 0; i < ops.length; i += 500) {
        await db.collection(coll).bulkWrite(ops.slice(i, i + 500), { ordered: false });
      }
    }
  }

  console.log(`\n[name-snapshots] scanned ${scanned} doc(s); ${write ? 'patched' : 'would patch'} ${docsPatched}, filling ${linesFilled} ingredient line(s).`);
  if (unresolved) console.log(`[name-snapshots] ${unresolved} line(s) reference an id with no document — left without a snapshot.`);
  if (!write) console.log('[name-snapshots] Dry run — nothing changed. Re-run with --write to apply.');

  await mongoose.disconnect();
}

run(parseArgs(process.argv)).catch(e => { console.error(e); process.exit(1); });
