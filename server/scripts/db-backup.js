'use strict';
/**
 * db-backup.js — full JSON snapshot of a target database.
 *
 * Written because `mongodump` is not installed on this machine and the Atlas
 * cluster is on a free tier, which has no point-in-time restore. Before any
 * destructive data operation (a legacy re-import, a bulk repair), take one of
 * these — it is the only way back.
 *
 * Dumps every collection to one JSON file each, using Extended JSON so types
 * (dates, ObjectIds, Decimal128) survive a round trip. Output is written
 * OUTSIDE the repo by default: a snapshot contains real user data and must
 * never be committed.
 *
 * Usage:
 *   node server/scripts/db-backup.js --target=local [--out=DIR]
 *   node server/scripts/db-backup.js --target=atlas [--out=DIR]
 *
 * Restore a single collection with:
 *   node server/scripts/db-restore.js --target=local --file=DIR/RECIPE_LIST.json
 * (or hand the files to mongoimport --jsonArray once the tools are installed).
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
require('node:dns').setServers(['8.8.8.8', '8.8.4.4']);

const { MongoClient } = require('mongodb');
const { EJSON } = require('bson');

const DEFAULT_OUT_ROOT = path.resolve(__dirname, '..', '..', '..', 'foodvibe-db-backups');

function parseArgs(argv) {
  const args = {};
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--target=')) args.target = arg.slice('--target='.length);
    else if (arg.startsWith('--out=')) args.out = arg.slice('--out='.length);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!['local', 'atlas'].includes(args.target)) {
    throw new Error("--target must be 'local' or 'atlas'");
  }
  return args;
}

async function run({ target, out }) {
  const uri = target === 'atlas' ? process.env.MONGO_URI : process.env.MONGO_LOCAL_URI;
  if (!uri) throw new Error(`${target === 'atlas' ? 'MONGO_URI' : 'MONGO_LOCAL_URI'} is not set in server/.env`);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outDir = path.resolve(out || path.join(DEFAULT_OUT_ROOT, `${target}-${stamp}`));

  const repoRoot = path.resolve(__dirname, '..', '..');
  if (outDir.startsWith(repoRoot + path.sep)) {
    throw new Error(`Refusing to write a snapshot inside the repo (${outDir}) — it contains real data.`);
  }

  console.log(`[db-backup] target: ${target}`);
  console.log(`[db-backup] output: ${outDir}`);

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 30000 });
  await client.connect();
  const db = client.db();
  console.log(`[db-backup] database: ${db.databaseName}`);

  fs.mkdirSync(outDir, { recursive: true });

  const collections = (await db.listCollections().toArray()).map(c => c.name).sort();
  const manifest = { target, database: db.databaseName, takenAt: new Date().toISOString(), collections: {} };
  let grandTotal = 0;

  for (const name of collections) {
    const docs = await db.collection(name).find({}).toArray();
    const file = path.join(outDir, `${name}.json`);
    fs.writeFileSync(file, EJSON.stringify(docs, null, 2), 'utf8');
    const bytes = fs.statSync(file).size;
    manifest.collections[name] = { count: docs.length, bytes };
    grandTotal += docs.length;
    console.log(`  ${name.padEnd(26)} ${String(docs.length).padStart(6)} docs  ${(bytes / 1024 / 1024).toFixed(2)} MB`);
  }

  manifest.totalDocuments = grandTotal;
  fs.writeFileSync(path.join(outDir, '_manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`\n[db-backup] ${collections.length} collection(s), ${grandTotal} document(s) written.`);
  console.log(`[db-backup] Snapshot: ${outDir}`);

  await client.close();
}

run(parseArgs(process.argv)).catch(err => {
  console.error(err.message);
  process.exit(1);
});
