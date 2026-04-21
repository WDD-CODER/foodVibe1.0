/**
 * Pushes all __master__ documents from local MongoDB to Atlas.
 *
 * Reads every userId: '__master__' doc from MONGO_LOCAL_URI and upserts
 * them into MONGO_URI (Atlas). Existing master docs in Atlas are overwritten
 * only if the local version differs. User-scoped docs are never touched.
 *
 * Usage:
 *   node scripts/push-master-to-atlas.js --confirm
 *
 * Safe to re-run — uses upsert by _id, so no duplicates are created.
 */

'use strict';

if (!process.argv.includes('--confirm')) {
  console.error('[push-master] ERROR: --confirm flag required.');
  console.error('[push-master] Usage: node scripts/push-master-to-atlas.js --confirm');
  process.exit(1);
}

const path = require('path');
const root = path.resolve(__dirname, '..');
require(path.join(root, 'server/node_modules/dotenv')).config({ path: path.join(root, 'server/.env') });
const mongoose = require(path.join(root, 'server/node_modules/mongoose'));
const { CLONEABLE_TYPES } = require(path.join(root, 'server/constants/cloneable-types'));

const LOCAL_URI = process.env.MONGO_LOCAL_URI;
// Prefer the direct URI (bypasses SRV DNS which fails on some machines) — falls back to SRV URI
const ATLAS_URI = process.env.MONGO_ATLAS_DIRECT_URI || process.env.MONGO_URI;

if (!LOCAL_URI || !ATLAS_URI) {
  console.error('[push-master] Missing MONGO_LOCAL_URI or MONGO_URI in server/.env');
  process.exit(1);
}

async function run() {
  // Two separate connections
  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
  console.log('[push-master] Connected to local:', LOCAL_URI.replace(/:\/\/.*@/, '://***@'));

  const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
  console.log('[push-master] Connected to Atlas:', ATLAS_URI.replace(/:\/\/.*@/, '://***@'));

  const localDb = localConn.db;
  const atlasDb = atlasConn.db;

  let totalPushed = 0;
  let totalSkipped = 0;

  for (const entityType of CLONEABLE_TYPES) {
    const localCol = localDb.collection(entityType);
    const atlasCol = atlasDb.collection(entityType);

    const masterDocs = await localCol.find({ userId: '__master__' }).toArray();

    if (masterDocs.length === 0) {
      console.log(`[push-master]   ${entityType}: no local master docs, skipping`);
      totalSkipped++;
      continue;
    }

    const ops = masterDocs.map(doc => ({
      replaceOne: {
        filter: { _id: doc._id },
        replacement: doc,
        upsert: true,
      },
    }));

    await atlasCol.bulkWrite(ops, { ordered: false });
    console.log(`[push-master]   ${entityType}: ${masterDocs.length} docs pushed to Atlas`);
    totalPushed += masterDocs.length;
  }

  console.log(`\n[push-master] Done. ${totalPushed} docs pushed, ${totalSkipped} collections skipped (no local master).`);

  await localConn.close();
  await atlasConn.close();
}

run().catch(err => {
  console.error('[push-master] Fatal:', err.message);
  process.exit(1);
});
