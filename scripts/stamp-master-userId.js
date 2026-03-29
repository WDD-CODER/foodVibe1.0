/**
 * One-time migration: stamps all existing entity documents with
 * userId: '__master__', _masterId: null, _userModified: false.
 *
 * Run ONCE after deploying Brief 1. All documents present at run-time
 * become the master starter-kit data that new users clone on signup.
 *
 * Usage:
 *   node scripts/stamp-master-userId.js --confirm-stamp
 *
 * Requires: MONGO_URI set in server/.env (or environment).
 * Blocked:  NODE_ENV=production (run locally against Atlas).
 */

if (process.env.NODE_ENV === 'production') {
  console.error('[stamp] ERROR: Blocked in production (NODE_ENV=production).');
  console.error('[stamp] Unset NODE_ENV and run locally while pointing at the Atlas URI.');
  process.exit(1);
}

if (!process.argv.includes('--confirm-stamp')) {
  console.error('[stamp] ERROR: --confirm-stamp flag is required.');
  console.error('[stamp] Usage: node scripts/stamp-master-userId.js --confirm-stamp');
  console.error('[stamp] This flag confirms you understand every document will be stamped userId: "__master__".');
  process.exit(1);
}

require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const { CLONEABLE_TYPES } = require('./server/constants/cloneable-types');

async function stamp() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('[stamp] ERROR: MONGO_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
  console.log('[stamp] Connected to MongoDB.');

  const db = mongoose.connection.db;
  let totalUpdated = 0;

  for (const entityType of CLONEABLE_TYPES) {
    const col = db.collection(entityType);
    const result = await col.updateMany(
      {},
      { $set: { userId: '__master__', _masterId: null, _userModified: false } }
    );
    console.log(`[stamp] ${entityType}: updated ${result.modifiedCount} documents`);
    totalUpdated += result.modifiedCount;
  }

  console.log(`[stamp] Done. Total documents stamped: ${totalUpdated}`);
  await mongoose.disconnect();
}

stamp().catch(err => {
  console.error('[stamp] Fatal error:', err.message);
  process.exit(1);
});
