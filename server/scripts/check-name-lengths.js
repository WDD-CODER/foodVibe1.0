'use strict';
/**
 * check-name-lengths.js — read-only: does any saved item already have a name over the limit?
 *
 * Plan 417 limits every entity's own name to NAME_MAX_LENGTH (200) characters in shared/schemas. An item
 * saved before that with a longer name could no longer be edited, so run this before the limit ships.
 * Prints one line per entity and trash collection; exits 1 when any collection is over the limit.
 *
 * Usage:
 *   node server/scripts/check-name-lengths.js --target=local
 *   node server/scripts/check-name-lengths.js --target=atlas
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env'), quiet: true });
require('node:dns').setServers(['8.8.8.8', '8.8.4.4']);

const { MongoClient } = require('mongodb');

/** Same value as NAME_MAX_LENGTH in shared/schemas/base.schema.ts. */
const LIMIT = 200;

const COLLECTIONS = [
  'suppliers', 'products', 'recipes', 'dishes', 'equipment', 'venues', 'menuEvents',
  'TRASH_SUPPLIERS', 'TRASH_PRODUCTS', 'TRASH_RECIPES', 'TRASH_DISHES', 'TRASH_EQUIPMENT', 'TRASH_VENUES',
  'TRASH_MENU_EVENTS',
];

/** Length of a field when it is a string, else 0. */
const len = field => ({ $cond: [{ $eq: [{ $type: field }, 'string'] }, { $strLenCP: field }, 0] });

async function main() {
  const target = (process.argv.find(a => a.startsWith('--target=')) || '').split('=')[1];
  if (target !== 'local' && target !== 'atlas') {
    console.error('Usage: node server/scripts/check-name-lengths.js --target=local|atlas');
    process.exit(2);
  }
  const uri = target === 'local' ? process.env.MONGO_LOCAL_URI : process.env.MONGO_URI;
  if (!uri) {
    console.error(`${target === 'local' ? 'MONGO_LOCAL_URI' : 'MONGO_URI'} is not set in server/.env`);
    process.exit(2);
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  await client.connect();
  let over = 0;
  try {
    const db = client.db();
    for (const name of COLLECTIONS) {
      const [row] = await db.collection(name).aggregate([
        { $project: { longest: { $max: [len('$nameHebrew'), len('$nameEnglish'), len('$name')] } } },
        { $group: { _id: null, items: { $sum: 1 }, longest: { $max: '$longest' }, over: { $sum: { $cond: [{ $gt: ['$longest', LIMIT] }, 1, 0] } } } },
      ]).toArray();
      const { items = 0, longest = 0, over: k = 0 } = row || {};
      over += k;
      console.log(`${name}: ${items} items, longest ${longest}, over limit ${k}`);
    }
  } finally {
    await client.close();
  }
  console.log(over ? `NAME_LENGTH: ${over} item(s) over ${LIMIT} characters` : `NAME_LENGTH: ok (limit ${LIMIT})`);
  process.exit(over ? 1 : 0);
}

main().catch(err => {
  // Never print the connection string.
  console.error('NAME_LENGTH: failed —', String(err.message).replace(/mongodb(\+srv)?:\/\/\S+/g, '<uri>'));
  process.exit(2);
});
