'use strict';
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function run() {
  const uri = process.env.MONGO_LOCAL_URI;
  console.log('Connecting to local...');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;

  // All master supplier IDs
  const masterSuppliers = await db.collection('KITCHEN_SUPPLIERS')
    .find({ userId: '__master__' }).toArray();
  const masterIds = masterSuppliers.map(s => s._id);
  console.log('Master supplier IDs:', masterIds.length);

  const users = await db.collection('PRODUCT_LIST')
    .distinct('userId', { userId: { $ne: '__master__' } });

  let totalFixed = 0;
  for (const userId of users) {
    const userSuppliers = await db.collection('KITCHEN_SUPPLIERS')
      .find({ userId, _masterId: { $ne: null } }).toArray();
    if (userSuppliers.length === 0) continue;

    const idMap = new Map(userSuppliers.map(s => [s._masterId, s._id]));
    const broken = await db.collection('PRODUCT_LIST').find({
      userId,
      supplierIds_: { $in: masterIds },
    }).toArray();

    for (const p of broken) {
      const newIds = p.supplierIds_.map(id => idMap.get(id) ?? id);
      const newSources = (p.sources_ ?? []).map(s =>
        s.supplierId ? { ...s, supplierId: idMap.get(s.supplierId) ?? s.supplierId } : s
      );
      await db.collection('PRODUCT_LIST').updateOne(
        { _id: p._id },
        { $set: { supplierIds_: newIds, sources_: newSources } }
      );
    }
    if (broken.length > 0) {
      console.log(`  ${userId}: fixed ${broken.length}`);
      totalFixed += broken.length;
    }
  }

  console.log('Total fixed:', totalFixed);

  const remaining = await db.collection('PRODUCT_LIST').countDocuments({
    userId: { $ne: '__master__' },
    supplierIds_: { $in: masterIds },
  });
  console.log('Remaining (non-master):', remaining);

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
