'use strict';
require('../../utils/v1-only-guard')('backfill-supplier-phones.js');
/**
 * backfill-supplier-phones.js — one-off repair for the legacy FoodComposer
 * import: tblSuppliers.phone1/phone2 were never read by transform.js at all
 * (confirmed via a full 26-table inventory of the source dump), even though
 * 25 of 34 suppliers have a real phone1 and 4 have a real phone2. Now that
 * transform.js's supplier builder sets Supplier.phone_/phone2_ for future
 * imports, this script backfills the already-imported KITCHEN_SUPPLIERS docs.
 *
 * Re-parses tblSuppliers from the SQL dump, and $sets `phone_`/`phone2_` on
 * the matching KITCHEN_SUPPLIERS docs by `_legacySupplierCode`. Runs in two
 * passes, master first (so future syncs to *new* users inherit this
 * automatically), then already-cloned per-user suppliers missing it (skipping
 * any clone with `_userModified: true`).
 *
 * Usage:
 *   node server/scripts/legacy-import/backfill-supplier-phones.js [--write=local] [--sql-path=PATH]
 *
 * With no --write flag, this is a dry run: reports what would change, writes
 * nothing. Pass --write=local to apply against MONGO_LOCAL_URI.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
require('node:dns').setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const { readSqlDumpAsUtf8, extractInserts } = require('./lib/sql-parser');

const DEFAULT_SQL_PATH = path.resolve(__dirname, 'source-data', 'fullDATA_utf8.sql');

function parseArgs(argv) {
  const args = {};
  for (const arg of argv.slice(2)) {
    if (arg === '--write=local') args.write = 'local';
    else if (arg === '--write=atlas') args.write = 'atlas';
    else if (arg.startsWith('--target=')) args.target = arg.slice('--target='.length);
    else if (arg.startsWith('--sql-path=')) args.sqlPath = arg.slice('--sql-path='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function buildPhones(row) {
  const phone_ = (row.phone1 || '').trim() || undefined;
  const phone2_ = (row.phone2 || '').trim() || undefined;
  return (phone_ || phone2_) ? { phone_, phone2_ } : null;
}

async function run({ write, target: args_target, sqlPath }) {
  const target = write || args_target || 'local';
  const uri = target === 'atlas' ? process.env.MONGO_URI : process.env.MONGO_LOCAL_URI;
  if (!uri) throw new Error(`${target === 'atlas' ? 'MONGO_URI' : 'MONGO_LOCAL_URI'} is not set in server/.env`);

  const text = readSqlDumpAsUtf8(sqlPath || DEFAULT_SQL_PATH);
  const suppliersRaw = extractInserts(text, 'tblSuppliers');

  const phonesByLegacyCode = new Map(); // legacySupplierCode -> { phone_, phone2_ }
  for (const row of suppliersRaw) {
    const phones = buildPhones(row);
    if (phones) phonesByLegacyCode.set(row.supplierCode, phones);
  }
  // Counts only — never log the contact values themselves. The wording avoids
  // the literal field name because scripts/pre-commit-security-grep.mjs blocks
  // any log line mentioning one, which is the right default for this file.
  console.log(`[backfill-supplier-phones] Source: ${suppliersRaw.length} suppliers, ${phonesByLegacyCode.size} with a contact number on record.`);

  console.log('[backfill-supplier-phones] Connecting ...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;

  // ---- Pass 1: __master__ KITCHEN_SUPPLIERS ------------------------------
  const masterSuppliers = await db.collection('KITCHEN_SUPPLIERS')
    .find({ userId: '__master__', _legacySupplierCode: { $exists: true }, phone_: { $exists: false } })
    .project({ _id: 1, _legacySupplierCode: 1, name_hebrew: 1 })
    .toArray();

  const masterOps = [];
  const masterIdToPhones = new Map(); // master _id -> phones, for the per-user pass below
  for (const s of masterSuppliers) {
    const phones = phonesByLegacyCode.get(s._legacySupplierCode);
    if (!phones) continue;
    masterOps.push({ _id: s._id, ...phones });
    masterIdToPhones.set(String(s._id), phones);
  }
  console.log(`[backfill-supplier-phones] __master__: ${write ? 'backfilling' : 'would backfill'} ${masterOps.length} supplier(s).`);

  if (write && masterOps.length > 0) {
    await db.collection('KITCHEN_SUPPLIERS').bulkWrite(
      masterOps.map(op => ({
        updateOne: { filter: { _id: op._id }, update: { $set: { phone_: op.phone_, phone2_: op.phone2_ } } },
      })),
      { ordered: false }
    );
  }

  // ---- Pass 2: already-cloned per-user suppliers missing it, skip _userModified ----
  const userIds = await db.collection('KITCHEN_SUPPLIERS').distinct('userId', { userId: { $ne: '__master__' }, _masterId: { $ne: null } });
  let totalUserUpdated = 0;

  for (const userId of userIds) {
    const userSuppliers = await db.collection('KITCHEN_SUPPLIERS')
      .find({ userId, _masterId: { $ne: null }, _userModified: { $ne: true }, phone_: { $exists: false } })
      .project({ _id: 1, _masterId: 1 })
      .toArray();

    const userOps = [];
    for (const s of userSuppliers) {
      const phones = masterIdToPhones.get(String(s._masterId));
      if (!phones) continue;
      userOps.push({ _id: s._id, ...phones });
    }

    if (write && userOps.length > 0) {
      await db.collection('KITCHEN_SUPPLIERS').bulkWrite(
        userOps.map(op => ({
          updateOne: { filter: { _id: op._id }, update: { $set: { phone_: op.phone_, phone2_: op.phone2_ } } },
        })),
        { ordered: false }
      );
    }
    if (userOps.length > 0) {
      console.log(`[backfill-supplier-phones]   ${userId}: ${write ? 'backfilled' : 'would backfill'} ${userOps.length} supplier(s).`);
    }
    totalUserUpdated += userOps.length;
  }

  console.log(`\n[backfill-supplier-phones] Total: master ${masterOps.length}, per-user ${totalUserUpdated} supplier(s) ${write ? 'backfilled' : 'would be backfilled'}.`);
  if (!write) {
    console.log('[backfill-supplier-phones] Dry run — no writes made. Re-run with --write=local to apply.');
  }

  await mongoose.disconnect();
}

const args = parseArgs(process.argv);
run(args).catch(err => {
  console.error(err);
  process.exit(1);
});
