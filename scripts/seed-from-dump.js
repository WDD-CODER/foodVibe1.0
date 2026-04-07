/**
 * One-time seed script: imports a migration-dump.json into MongoDB Atlas.
 *
 * Usage: node scripts/seed-from-dump.js <path-to-dump.json> --confirm-seed
 *
 * SECURITY WARNING: migration-dump.json may contain sensitive data.
 * - NEVER commit migration-dump.json to git (it is in .gitignore)
 * - NEVER run this script in production without the --confirm-seed flag
 * - Delete migration-dump.json from your local machine after seeding
 */

// Production guard — prevent accidental overwrite of live data
if (process.env.NODE_ENV === 'production') {
  console.error('[seed] ERROR: Seed script is blocked in production (NODE_ENV=production).');
  console.error('[seed] If you genuinely need to re-seed, unset NODE_ENV first and run locally with a VPN.');
  process.exit(1);
}

// Explicit confirmation flag required
if (!process.argv.includes('--confirm-seed')) {
  console.error('[seed] ERROR: --confirm-seed flag is required.');
  console.error('[seed] Usage: node scripts/seed-from-dump.js <dump-file> --confirm-seed');
  console.error('[seed] This flag confirms you understand the script will upsert all records from the dump.');
  process.exit(1);
}

require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const fs = require('fs');

const dumpFile = process.argv.find(a => a.endsWith('.json'));
if (!dumpFile) {
  console.error('[seed] ERROR: No .json dump file specified.');
  process.exit(1);
}

const dump = JSON.parse(fs.readFileSync(dumpFile, 'utf8'));

// Optional --collections=PRODUCT_LIST,KITCHEN_UNITS filter
const collectionsArg = process.argv.find(a => a.startsWith('--collections='))?.split('=')[1];
const allowedCollections = collectionsArg ? new Set(collectionsArg.split(',').map(s => s.trim())) : null;
if (allowedCollections) {
  console.log(`[seed] Restricted to collections: ${[...allowedCollections].join(', ')}`);
}

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('[seed] Connected to MongoDB.');

  const db = mongoose.connection.db;

  const entriesToSeed = Object.entries(dump).filter(([entityType]) => {
    if (allowedCollections && !allowedCollections.has(entityType)) {
      console.log(`[seed] Skipping ${entityType} (not in --collections allowlist)`);
      return false;
    }
    return true;
  });

  // Safety check: record pre-seed counts and abort if any collection shrinks
  const preCounts = {};
  for (const [entityType] of entriesToSeed) {
    preCounts[entityType] = await db.collection(entityType).countDocuments();
  }

  for (const [entityType, items] of entriesToSeed) {
    const arr = Array.isArray(items) ? items : [items];
    const col = db.collection(entityType);

    for (const item of arr) {
      await col.updateOne(
        { _id: item._id },
        {
          $setOnInsert: {
            ...item,
            userId: '__master__',
            _masterId: null,
            _userModified: false,
          },
        },
        { upsert: true }
      );
    }

    const postCount = await col.countDocuments();
    if (postCount < preCounts[entityType]) {
      console.error(`[seed] ABORT: ${entityType} shrank from ${preCounts[entityType]} → ${postCount}. No further collections will be seeded.`);
      await mongoose.disconnect();
      process.exit(1);
    }
    console.log(`[seed] Seeded ${arr.length} × ${entityType} (collection: ${preCounts[entityType]} → ${postCount})`);
  }

  await mongoose.disconnect();
  console.log('[seed] Done. Connection closed.');
}

seed().catch(err => {
  console.error('[seed] Fatal error:', err.message);
  process.exit(1);
});
