/**
 * Dev-only script: promotes dev-guest documents to __master__ in local MongoDB.
 *
 * Run once after switching to a local DB so that new user signups
 * receive a full cloned starter-kit (recipes, products, dishes, etc.).
 *
 * Usage:
 *   node scripts/promote-guest-to-master.js --confirm
 *
 * Safe to re-run — uses upsert so it won't duplicate existing master docs.
 */

'use strict';

if (!process.argv.includes('--confirm')) {
  console.error('[promote] ERROR: --confirm flag required.');
  console.error('[promote] Usage: node scripts/promote-guest-to-master.js --confirm');
  process.exit(1);
}

const path = require('path');
const root = path.resolve(__dirname, '..');
require(path.join(root, 'server/node_modules/dotenv')).config({ path: path.join(root, 'server/.env') });
const mongoose = require(path.join(root, 'server/node_modules/mongoose'));
const { CLONEABLE_TYPES } = require(path.join(root, 'server/constants/cloneable-types'));

const GUEST_ID = 'dev-guest';

async function run() {
  const uri = process.argv.includes('--local')
    ? process.env.MONGO_LOCAL_URI
    : process.env.MONGO_URI;
  await mongoose.connect(uri);
  console.log('[promote] Connected:', uri);

  const db = mongoose.connection.db;
  let totalPromoted = 0;

  for (const entityType of CLONEABLE_TYPES) {
    const col = db.collection(entityType);
    const guestDocs = await col.find({ userId: GUEST_ID }).toArray();

    if (guestDocs.length === 0) {
      console.log(`[promote]   ${entityType}: no guest docs, skipping`);
      continue;
    }

    let promoted = 0;
    for (const doc of guestDocs) {
      const { _id, userId: _u, _masterId: _m, _userModified: _um, ...rest } = doc;
      await col.updateOne(
        { _id },
        { $setOnInsert: { _id, ...rest, userId: '__master__', _masterId: null, _userModified: false } },
        { upsert: true }
      );
      promoted++;
    }

    console.log(`[promote]   ${entityType}: ${promoted} docs promoted`);
    totalPromoted += promoted;
  }

  console.log(`[promote] Done. Total promoted: ${totalPromoted}`);
  await mongoose.disconnect();
}

run().catch(err => {
  console.error('[promote] Fatal:', err.message);
  process.exit(1);
});
