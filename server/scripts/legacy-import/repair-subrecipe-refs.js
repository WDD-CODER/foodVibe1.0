'use strict';
/**
 * repair-subrecipe-refs.js — one-time data repair for the sync-master.js bug
 * fixed alongside this script: ingredient lines of `type: 'recipe'` (a
 * sub-recipe/preparation used as a component of another recipe/dish) were
 * never remapped from master-scoped ids to user-scoped ids when a user's
 * account synced/cloned master data. Every RECIPE_LIST/DISH_LIST doc already
 * cloned before that fix landed can still carry dangling master-scoped
 * `referenceId`s on its `type: 'recipe'` ingredient lines.
 *
 * For every non-`__master__` user, builds that user's own master→user id map
 * (via `_masterId` linkage, spanning both RECIPE_LIST and DISH_LIST — a
 * sub-recipe can live in either) and remaps any `type: 'recipe'` ingredient
 * line whose `referenceId` doesn't match one of the user's own doc ids.
 *
 * Usage:
 *   node server/scripts/legacy-import/repair-subrecipe-refs.js [--write=local]
 *
 * With no --write flag, this is a dry run: reports what would change per user,
 * writes nothing. Pass --write=local to apply the fix against MONGO_LOCAL_URI.
 * (Atlas repair is a deliberate separate step — not wired up here.)
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
// Node 22+ DNS SRV resolution bug on Windows breaks mongodb+srv:// lookups —
// same workaround server/index.js and the import script apply at startup.
require('node:dns').setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');

function parseArgs(argv) {
  const args = {};
  for (const arg of argv.slice(2)) {
    if (arg === '--write=local') args.write = 'local';
    else throw new Error(`Unknown argument: ${arg} (only --write=local is supported)`);
  }
  return args;
}

async function run({ write }) {
  const uri = process.env.MONGO_LOCAL_URI;
  if (!uri) throw new Error('MONGO_LOCAL_URI is not set in server/.env');

  console.log(`[repair-subrecipe-refs] Connecting to local ...`);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;

  const legacyUserIds = new Set([
    ...(await db.collection('RECIPE_LIST').distinct('userId', { userId: { $ne: '__master__' }, _legacyImport: true })),
    ...(await db.collection('DISH_LIST').distinct('userId', { userId: { $ne: '__master__' }, _legacyImport: true })),
  ]);

  console.log(`[repair-subrecipe-refs] Users with legacy-imported clones: ${legacyUserIds.size}`);

  let totalFixed = 0;
  let totalStillBroken = 0;

  for (const userId of legacyUserIds) {
    const [userRecipes, userDishes] = await Promise.all([
      db.collection('RECIPE_LIST').find({ userId }).toArray(),
      db.collection('DISH_LIST').find({ userId }).toArray(),
    ]);

    const recipeIdMap = new Map(
      [...userRecipes, ...userDishes]
        .filter(d => d._masterId != null)
        .map(d => [String(d._masterId), String(d._id)])
    );
    const ownIds = new Set([...userRecipes, ...userDishes].map(d => String(d._id)));

    let fixed = 0;
    let stillBroken = 0;
    const updates = []; // { collection, _id, ingredients_ }

    for (const [collection, docs] of [['RECIPE_LIST', userRecipes], ['DISH_LIST', userDishes]]) {
      for (const doc of docs) {
        if (!Array.isArray(doc.ingredients_) || doc.ingredients_.length === 0) continue;
        let changed = false;
        const newIngredients = doc.ingredients_.map(ing => {
          if (ing.type !== 'recipe' || !ing.referenceId) return ing;
          if (ownIds.has(String(ing.referenceId))) return ing; // already correct
          const remapped = recipeIdMap.get(String(ing.referenceId));
          if (remapped) {
            changed = true;
            fixed++;
            return { ...ing, referenceId: remapped };
          }
          stillBroken++;
          return ing;
        });
        if (changed) {
          updates.push({ collection, _id: doc._id, ingredients_: newIngredients });
        }
      }
    }

    if (write === 'local' && updates.length > 0) {
      const byCollection = new Map();
      for (const u of updates) {
        if (!byCollection.has(u.collection)) byCollection.set(u.collection, []);
        byCollection.get(u.collection).push(u);
      }
      for (const [collection, ops] of byCollection) {
        await db.collection(collection).bulkWrite(
          ops.map(op => ({
            updateOne: { filter: { _id: op._id }, update: { $set: { ingredients_: op.ingredients_ } } },
          })),
          { ordered: false }
        );
      }
    }

    if (fixed > 0 || stillBroken > 0) {
      console.log(
        `[repair-subrecipe-refs]   ${userId}: ${write === 'local' ? 'fixed' : 'would fix'} ${fixed} ingredient line(s) across ${updates.length} doc(s)` +
        (stillBroken > 0 ? ` — ${stillBroken} still unresolved (no matching doc in user's own collections)` : '')
      );
    }

    totalFixed += fixed;
    totalStillBroken += stillBroken;
  }

  console.log(`\n[repair-subrecipe-refs] Total: ${write === 'local' ? 'fixed' : 'would fix'} ${totalFixed}, still unresolved ${totalStillBroken}.`);
  if (write !== 'local') {
    console.log('[repair-subrecipe-refs] Dry run — no writes made. Re-run with --write=local to apply.');
  }

  await mongoose.disconnect();
}

const args = parseArgs(process.argv);
run(args).catch(err => {
  console.error(err);
  process.exit(1);
});
