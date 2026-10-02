'use strict';
require('../../utils/v1-only-guard')('backfill-legacy-config.js');
/**
 * backfill-legacy-config.js — plan 317 §8.
 *
 * `tblControl` is a single-row table that was written off as dead during the
 * original migration. It is not: it holds the old system's real operating
 * settings, laborCost 30 and vatPercent 16. This writes them to a dedicated
 * MASTER_META document rather than merging into the version document, which
 * exists for a different purpose.
 *
 * Store-only — no UI consumes these yet, per the Human's scope decision.
 *
 * Category images (`tblCategoryMaster.imageURL`, 32 rows) were considered
 * alongside this and then DROPPED from scope by the Human on 2026-09-27: the
 * legacy categories live on recipes as plain `labels_` strings and are not
 * registered in KITCHEN_LABELS, so there was nothing to attach an image to,
 * and registering 38 category keys alongside 11 dietary tags was not wanted.
 *
 * Usage:
 *   node server/scripts/legacy-import/backfill-legacy-config.js [--target=local|atlas] [--write]
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '..', '.env') });
require('node:dns').setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const { readSqlDumpAsUtf8, extractInserts } = require('./lib/sql-parser');

const SQL_PATH = path.resolve(__dirname, 'source-data', 'fullDATA_utf8.sql');

function parseArgs(argv) {
  const args = { target: 'local' };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--target=')) args.target = a.slice('--target='.length);
    else if (a === '--write') args.write = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!['local', 'atlas'].includes(args.target)) throw new Error("--target must be 'local' or 'atlas'");
  return args;
}

async function run({ target, write }) {
  const uri = target === 'atlas' ? process.env.MONGO_URI : process.env.MONGO_LOCAL_URI;
  if (!uri) throw new Error('Mongo URI not set');

  const control = extractInserts(readSqlDumpAsUtf8(SQL_PATH), 'tblControl')[0];
  if (!control) {
    console.log('[legacy-config] tblControl has no rows — nothing to migrate.');
    return;
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });
  const db = mongoose.connection.db;
  console.log(`[legacy-config] target: ${target} (${db.databaseName})`);

  const cfg = {
    _id: 'legacy-config',
    laborCost: control.laborCost ?? null,
    vatPercent: control.vatPercent ?? null,
    sourceName: (control.name || '').trim() || null,
    _legacyImport: true,
  };

  const existing = await db.collection('MASTER_META').findOne({ _id: cfg._id });
  console.log(`[legacy-config] ${write ? 'writing' : 'would write'} MASTER_META/legacy-config`);
  console.log(`  laborCost  : ${cfg.laborCost}${existing ? `  (was ${existing.laborCost})` : ''}`);
  console.log(`  vatPercent : ${cfg.vatPercent}${existing ? `  (was ${existing.vatPercent})` : ''}`);
  console.log(`  sourceName : ${cfg.sourceName}`);

  if (write) {
    await db.collection('MASTER_META').updateOne({ _id: cfg._id }, { $set: cfg }, { upsert: true });
    console.log('[legacy-config] written.');
  } else {
    console.log('\n[legacy-config] Dry run — nothing changed. Re-run with --write to apply.');
  }

  await mongoose.disconnect();
}

run(parseArgs(process.argv)).catch(e => { console.error(e); process.exit(1); });
