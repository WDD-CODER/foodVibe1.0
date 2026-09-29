'use strict';
/**
 * db-restore.js — restore a db-backup.js snapshot into a named SCRATCH database.
 *
 * Never restores over the source database — --db must differ from the source
 * database name embedded in the target URI, or the script refuses to run.
 * This is the second half of the backup/restore drill: prove a snapshot is
 * actually usable as a rollback path before trusting it.
 *
 * Usage:
 *   node server/scripts/db-restore.js --target=local --dir=<snapshot dir> --db=<scratch db name>
 *   node server/scripts/db-restore.js --target=atlas --dir=<snapshot dir> --db=<scratch db name>
 *
 * Prints a per-collection document-count comparison against the snapshot's
 * _manifest.json and exits non-zero on any mismatch.
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
require('node:dns').setServers(['8.8.8.8', '8.8.4.4']);

const { MongoClient } = require('mongodb');
const { EJSON } = require('bson');

function parseArgs(argv) {
  const args = {};
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--target=')) args.target = arg.slice('--target='.length);
    else if (arg.startsWith('--dir=')) args.dir = arg.slice('--dir='.length);
    else if (arg.startsWith('--db=')) args.db = arg.slice('--db='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!['local', 'atlas'].includes(args.target)) throw new Error("--target must be 'local' or 'atlas'");
  if (!args.dir) throw new Error('--dir=<snapshot directory> is required');
  if (!args.db) throw new Error('--db=<scratch database name> is required');
  return args;
}

function sourceDbNameFromUri(uri) {
  const match = uri.match(/\/([^/?]+)(\?|$)/);
  return match ? match[1] : null;
}

async function run({ target, dir, db: scratchDb }) {
  const uri = target === 'atlas' ? process.env.MONGO_URI : process.env.MONGO_LOCAL_URI;
  if (!uri) throw new Error(`${target === 'atlas' ? 'MONGO_URI' : 'MONGO_LOCAL_URI'} is not set in server/.env`);

  const sourceDb = sourceDbNameFromUri(uri);
  if (scratchDb === sourceDb) {
    throw new Error(`Refusing to restore over the source database (${sourceDb}). Pick a different --db name.`);
  }

  const snapshotDir = path.resolve(dir);
  const manifestPath = path.join(snapshotDir, '_manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`No _manifest.json found in ${snapshotDir} — is this a db-backup.js snapshot?`);
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  console.log(`[db-restore] target: ${target}`);
  console.log(`[db-restore] source snapshot: ${snapshotDir} (taken ${manifest.takenAt}, from ${manifest.database})`);
  console.log(`[db-restore] restoring into scratch database: ${scratchDb}`);

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 30000 });
  await client.connect();
  const db = client.db(scratchDb);

  const existing = await db.listCollections().toArray();
  if (existing.length > 0) {
    throw new Error(`Scratch database "${scratchDb}" already has ${existing.length} collection(s) — use a fresh name, or drop it manually first.`);
  }

  let mismatches = 0;
  for (const [name, info] of Object.entries(manifest.collections)) {
    const file = path.join(snapshotDir, `${name}.json`);
    const docs = EJSON.parse(fs.readFileSync(file, 'utf8'));
    if (docs.length > 0) {
      await db.collection(name).insertMany(docs, { ordered: true });
    }
    const restoredCount = await db.collection(name).countDocuments();
    const ok = restoredCount === info.count;
    if (!ok) mismatches++;
    console.log(`  ${name.padEnd(26)} snapshot=${String(info.count).padStart(6)}  restored=${String(restoredCount).padStart(6)}  ${ok ? 'OK' : 'MISMATCH'}`);
  }

  await client.close();

  if (mismatches > 0) {
    console.error(`\n[db-restore] FAILED: ${mismatches} collection(s) mismatched document counts.`);
    process.exit(1);
  }
  console.log(`\n[db-restore] OK: all ${Object.keys(manifest.collections).length} collection(s) match the snapshot manifest.`);
  console.log(`[db-restore] Scratch database "${scratchDb}" left in place for inspection — drop it manually when done.`);
}

run(parseArgs(process.argv)).catch(err => {
  console.error(err.message);
  process.exit(1);
});
