'use strict';
/**
 * migrate-supplier-ids.js
 * One-time fix: remaps supplierIds_ and sources_[].supplierId in cloned products
 * from master supplier IDs to the user's own cloned supplier IDs.
 *
 * Run against local:  NODE_ENV=development node server/scripts/migrate-supplier-ids.js
 * Run against Atlas:  node server/scripts/migrate-supplier-ids.js
 */

const mongoose = require('mongoose');
const path = require('path');
// Use seeder .env — it has the correct Atlas URI
require('dotenv').config({ path: path.join(__dirname, '../../tools/catalog-seeder/.env'), override: true });

const isLocal = process.env.NODE_ENV === 'development';
const uri = isLocal ? process.env.MONGO_LOCAL_URI : process.env.MONGO_URI;

async function run() {
  console.log(`Connecting to ${isLocal ? 'LOCAL' : 'ATLAS'}...`);
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  const users = await db.collection('PRODUCT_LIST')
    .distinct('userId', { userId: { $ne: '__master__' } });

  console.log(`Found ${users.length} users to process`);

  let totalFixed = 0;
  let totalSkipped = 0;

  for (const userId of users) {
    // Build masterSupplierId → userSupplierId map from this user's cloned suppliers
    const userSuppliers = await db.collection('KITCHEN_SUPPLIERS')
      .find({ userId, _masterId: { $ne: null } })
      .toArray();

    if (userSuppliers.length === 0) {
      totalSkipped++;
      continue;
    }

    const supplierIdMap = new Map(
      userSuppliers.map(s => [s._masterId, s._id])
    );

    const masterIds = [...supplierIdMap.keys()];

    // Find this user's products still referencing master supplier IDs
    const broken = await db.collection('PRODUCT_LIST').find({
      userId,
      supplierIds_: { $in: masterIds },
    }).toArray();

    for (const product of broken) {
      const newSupplierIds = product.supplierIds_.map(id => supplierIdMap.get(id) ?? id);
      const newSources = (product.sources_ ?? []).map(s =>
        s.supplierId ? { ...s, supplierId: supplierIdMap.get(s.supplierId) ?? s.supplierId } : s
      );
      await db.collection('PRODUCT_LIST').updateOne(
        { _id: product._id },
        { $set: { supplierIds_: newSupplierIds, sources_: newSources } }
      );
      totalFixed++;
    }

    if (broken.length > 0) {
      console.log(`  ${userId}: fixed ${broken.length} products`);
    }
  }

  console.log(`\nMigration complete.`);
  console.log(`  Fixed:   ${totalFixed} products`);
  console.log(`  Skipped: ${totalSkipped} users (no cloned suppliers)`);
  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
