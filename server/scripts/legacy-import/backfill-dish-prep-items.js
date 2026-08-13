'use strict';
/**
 * backfill-dish-prep-items.js — one-time data repair for the legacy
 * FoodComposer import: transform.js never derived `prep_items_`/
 * `prep_categories_` (the "mise en place" fields the recipe-builder dish
 * workflow UI actually reads — see `RecipeFormService.getPrepRowsFromRecipe()`)
 * for imported dishes, even though many of them do carry sub-recipe
 * (`type: 'recipe'`) ingredient lines under the hood.
 *
 * For every DISH_LIST doc missing `prep_items_`, derives it (and the grouped
 * `prep_categories_` view) from that doc's own `ingredients_` entries of
 * `type: 'recipe'`: `preparation_name` = the referenced sub-recipe/dish's
 * `name_hebrew`, `quantity`/`unit` from the ingredient line, `category_name`
 * = the sub-recipe's first label translated via dictionary.json's `general`
 * map (fallback: a single generic bucket, `"הכנות"`).
 *
 * Runs in two passes, in this order (so preparation names always resolve at
 * the scope being written):
 *   1. `__master__` DISH_LIST — so future syncs to *new* users inherit this
 *      automatically (Rule 1 clone spreads whatever fields exist on master).
 *   2. Already-cloned per-user DISH_LIST docs — run this *after*
 *      repair-subrecipe-refs.js so each user's ingredient refs are valid.
 *
 * Usage:
 *   node server/scripts/legacy-import/backfill-dish-prep-items.js [--write=local]
 *
 * With no --write flag, this is a dry run: reports what would change, writes
 * nothing. Pass --write=local to apply against MONGO_LOCAL_URI.
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
require('node:dns').setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');

const DICTIONARY_PATH = path.resolve(__dirname, '..', '..', '..', 'public', 'assets', 'data', 'dictionary.json');
const FALLBACK_CATEGORY = 'הכנות';

function parseArgs(argv) {
  const args = {};
  for (const arg of argv.slice(2)) {
    if (arg === '--write=local') args.write = 'local';
    else throw new Error(`Unknown argument: ${arg} (only --write=local is supported)`);
  }
  return args;
}

function loadLabelHebrewMap() {
  const dict = JSON.parse(fs.readFileSync(DICTIONARY_PATH, 'utf8'));
  return dict.general || {};
}

/**
 * Derives { prep_items_, prep_categories_ } for a dish from its own
 * ingredients_, resolving sub-recipe names/labels via `lookupSubRecipe`.
 * Returns null if the dish has no type:'recipe' ingredient lines (nothing to
 * derive — legitimately no mise-en-place, not a bug).
 */
function derivePrepFields(dish, lookupSubRecipe, labelHebrew, warn) {
  const subRecipeIngredients = (dish.ingredients_ || []).filter(ing => ing.type === 'recipe' && ing.referenceId);
  if (subRecipeIngredients.length === 0) return null;

  const prepItems = [];
  for (const ing of subRecipeIngredients) {
    const sub = lookupSubRecipe(ing.referenceId);
    if (!sub) {
      warn(`${dish.name_hebrew} (${dish._id}): sub-recipe ${ing.referenceId} not found — skipping this prep item`);
      continue;
    }
    const labelKey = sub.labels_ && sub.labels_[0];
    const category_name = (labelKey && labelHebrew[labelKey]) || FALLBACK_CATEGORY;
    prepItems.push({
      preparation_name: sub.name_hebrew,
      category_name,
      quantity: ing.amount_ ?? 1,
      unit: ing.unit_ || 'unit',
    });
  }
  if (prepItems.length === 0) return null;

  const byCategory = new Map();
  for (const item of prepItems) {
    const list = byCategory.get(item.category_name) ?? [];
    list.push({ item_name: item.preparation_name, unit: item.unit, quantity: item.quantity });
    byCategory.set(item.category_name, list);
  }
  const prepCategories = Array.from(byCategory.entries()).map(([category_name, items]) => ({ category_name, items }));

  return { prep_items_: prepItems, prep_categories_: prepCategories };
}

async function run({ write }) {
  const uri = process.env.MONGO_LOCAL_URI;
  if (!uri) throw new Error('MONGO_LOCAL_URI is not set in server/.env');

  const labelHebrew = loadLabelHebrewMap();

  console.log('[backfill-dish-prep-items] Connecting to local ...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;

  const missingPrep = { $or: [{ prep_items_: { $exists: false } }, { prep_items_: { $size: 0 } }] };

  // ---- Pass 1: __master__ DISH_LIST -------------------------------------
  const [masterDishes, masterRecipes, masterDishesAll] = await Promise.all([
    db.collection('DISH_LIST').find({ userId: '__master__', ...missingPrep }).toArray(),
    db.collection('RECIPE_LIST').find({ userId: '__master__' }).project({ _id: 1, name_hebrew: 1, labels_: 1 }).toArray(),
    db.collection('DISH_LIST').find({ userId: '__master__' }).project({ _id: 1, name_hebrew: 1, labels_: 1 }).toArray(),
  ]);
  const masterById = new Map([...masterRecipes, ...masterDishesAll].map(d => [String(d._id), d]));
  const lookupMaster = id => masterById.get(String(id));

  let masterUpdated = 0;
  let masterSkippedWarnings = 0;
  const masterOps = [];
  for (const dish of masterDishes) {
    const fields = derivePrepFields(dish, lookupMaster, labelHebrew, msg => {
      masterSkippedWarnings++;
      if (masterSkippedWarnings <= 20) console.log(`[backfill-dish-prep-items]   [master] ${msg}`);
    });
    if (fields) {
      masterOps.push({ _id: dish._id, ...fields });
      masterUpdated++;
    }
  }
  console.log(`[backfill-dish-prep-items] __master__: ${masterDishes.length} dish(es) missing prep_items_, ${write === 'local' ? 'backfilling' : 'would backfill'} ${masterUpdated}${masterSkippedWarnings ? `, ${masterSkippedWarnings} unresolved sub-recipe ingredient line(s) skipped` : ''}`);

  if (write === 'local' && masterOps.length > 0) {
    await db.collection('DISH_LIST').bulkWrite(
      masterOps.map(op => ({
        updateOne: { filter: { _id: op._id }, update: { $set: { prep_items_: op.prep_items_, prep_categories_: op.prep_categories_ } } },
      })),
      { ordered: false }
    );
  }

  // ---- Pass 2: already-cloned per-user DISH_LIST -------------------------
  const legacyUserIds = await db.collection('DISH_LIST').distinct('userId', { userId: { $ne: '__master__' }, _legacyImport: true });
  console.log(`[backfill-dish-prep-items] Users with legacy-imported dish clones: ${legacyUserIds.length}`);

  let totalUserUpdated = 0;
  let totalUserSkipped = 0;

  for (const userId of legacyUserIds) {
    const [userDishesMissing, userRecipes, userDishesAll] = await Promise.all([
      db.collection('DISH_LIST').find({ userId, ...missingPrep }).toArray(),
      db.collection('RECIPE_LIST').find({ userId }).project({ _id: 1, name_hebrew: 1, labels_: 1 }).toArray(),
      db.collection('DISH_LIST').find({ userId }).project({ _id: 1, name_hebrew: 1, labels_: 1 }).toArray(),
    ]);
    const userById = new Map([...userRecipes, ...userDishesAll].map(d => [String(d._id), d]));
    const lookupUser = id => userById.get(String(id));

    let userUpdated = 0;
    let userSkipped = 0;
    const userOps = [];
    for (const dish of userDishesMissing) {
      const fields = derivePrepFields(dish, lookupUser, labelHebrew, () => { userSkipped++; });
      if (fields) {
        userOps.push({ _id: dish._id, ...fields });
        userUpdated++;
      }
    }

    if (write === 'local' && userOps.length > 0) {
      await db.collection('DISH_LIST').bulkWrite(
        userOps.map(op => ({
          updateOne: { filter: { _id: op._id }, update: { $set: { prep_items_: op.prep_items_, prep_categories_: op.prep_categories_ } } },
        })),
        { ordered: false }
      );
    }

    if (userUpdated > 0 || userSkipped > 0) {
      console.log(
        `[backfill-dish-prep-items]   ${userId}: ${userDishesMissing.length} dish(es) missing prep_items_, ${write === 'local' ? 'backfilled' : 'would backfill'} ${userUpdated}` +
        (userSkipped > 0 ? ` — ${userSkipped} unresolved sub-recipe ingredient line(s) skipped` : '')
      );
    }
    totalUserUpdated += userUpdated;
    totalUserSkipped += userSkipped;
  }

  console.log(`\n[backfill-dish-prep-items] Total: master ${masterUpdated}, per-user ${totalUserUpdated} dish(es) ${write === 'local' ? 'backfilled' : 'would be backfilled'}.`);
  if (write !== 'local') {
    console.log('[backfill-dish-prep-items] Dry run — no writes made. Re-run with --write=local to apply.');
  }

  await mongoose.disconnect();
}

const args = parseArgs(process.argv);
run(args).catch(err => {
  console.error(err);
  process.exit(1);
});
