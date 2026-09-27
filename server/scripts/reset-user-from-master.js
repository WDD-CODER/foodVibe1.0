'use strict';
/**
 * reset-user-from-master.js — discard a user's cloned data so it is rebuilt
 * from __master__ on their next login.
 *
 * Why this exists: sync-master's Rule 3 skips any clone flagged
 * `_userModified: true`, so a user who once opened and saved a recipe keeps
 * their copy forever — including when that copy is carrying a migration bug
 * they never chose. Repair scripts correctly refuse to overwrite those docs.
 * This script is the deliberate way out: throw the clones away entirely and
 * let Rule 1 re-create them from corrected master data.
 *
 * It deletes the user's documents, NOT the user record, and resets
 * `lastSyncedMasterVersion` to 0 so the version gate in routes/auth.js cannot
 * skip the resync. Master data is never touched.
 *
 * Destructive: any genuine per-user work is lost. Intended for disposable
 * development accounts. Take a backup first (server/scripts/db-backup.js).
 *
 * Usage:
 *   node server/scripts/reset-user-from-master.js --user=dev-guest [--target=local|atlas] [--write]
 *   node server/scripts/reset-user-from-master.js --all-non-master [--target=local] [--write]
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
require('node:dns').setServers(['8.8.8.8', '8.8.4.4']);

const mongoose = require('mongoose');
const { ALL_USER_ENTITY_TYPES } = require('../constants/all-user-entity-types');

function parseArgs(argv) {
  const args = { target: 'local' };
  for (const a of argv.slice(2)) {
    if (a.startsWith('--user=')) args.user = a.slice('--user='.length);
    else if (a === '--all-non-master') args.allNonMaster = true;
    else if (a === '--orphans') args.orphans = true;
    else if (a.startsWith('--target=')) args.target = a.slice('--target='.length);
    else if (a === '--write') args.write = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.user && !args.allNonMaster && !args.orphans) throw new Error('Pass --user=<id>, --orphans, or --all-non-master');
  if (!['local', 'atlas'].includes(args.target)) throw new Error("--target must be 'local' or 'atlas'");
  return args;
}

async function run({ user, allNonMaster, orphans, target, write }) {
  const uri = target === 'atlas' ? process.env.MONGO_URI : process.env.MONGO_LOCAL_URI;
  if (!uri) throw new Error('Mongo URI not set');

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });
  const db = mongoose.connection.db;
  console.log(`[reset-user] target: ${target} (${db.databaseName})`);

  let userIds;
  if (orphans) {
    // Data whose owning account no longer exists. The admin delete route does
    // cascade correctly, so these come from accounts removed out-of-band
    // (straight in Mongo/Compass), which the route can never catch. Nothing
    // here is recoverable by a resync — the user is gone.
    const live = new Set(
      (await db.collection('users').find({}).project({ _id: 1 }).toArray()).map(u => String(u._id))
    );
    const seen = new Set();
    for (const t of ALL_USER_ENTITY_TYPES) {
      let ids = [];
      try { ids = await db.collection(t).distinct('userId'); } catch { /* collection may not exist */ }
      for (const id of ids) if (id && id !== '__master__' && !live.has(id)) seen.add(id);
    }
    userIds = [...seen];
    console.log(`[reset-user] live accounts: ${[...live].join(', ') || '(none)'}`);
    if (!userIds.length) {
      console.log('[reset-user] no orphaned data found — nothing to do.');
      await mongoose.disconnect();
      return;
    }
  } else if (allNonMaster) {
    const seen = new Set();
    for (const t of ALL_USER_ENTITY_TYPES) {
      let ids = [];
      try { ids = await db.collection(t).distinct('userId'); } catch { /* collection may not exist */ }
      for (const id of ids) if (id && id !== '__master__') seen.add(id);
    }
    userIds = [...seen];
  } else {
    userIds = [user];
  }
  console.log(`[reset-user] accounts: ${userIds.join(', ')}`);

  let grandTotal = 0;
  for (const uid of userIds) {
    let userTotal = 0;
    const perColl = [];
    for (const t of ALL_USER_ENTITY_TYPES) {
      let n = 0;
      try { n = await db.collection(t).countDocuments({ userId: uid }); } catch { continue; }
      if (!n) continue;
      perColl.push(`${t}:${n}`);
      userTotal += n;
      if (write) await db.collection(t).deleteMany({ userId: uid });
    }
    grandTotal += userTotal;
    console.log(`  ${uid.padEnd(14)} ${String(userTotal).padStart(6)} doc(s)  ${perColl.join(' ')}`);

    if (write) {
      // Clear the version gate in routes/auth.js, otherwise the next login
      // short-circuits the resync and the user is left with nothing.
      const res = await db.collection('users').updateOne({ _id: uid }, { $set: { lastSyncedMasterVersion: 0 } });
      console.log(`  ${''.padEnd(14)} user record ${res.matchedCount ? 'reset (lastSyncedMasterVersion=0)' : 'NOT FOUND — will be re-created on next guest login'}`);
    }
  }

  console.log(`\n[reset-user] ${write ? 'deleted' : 'would delete'} ${grandTotal} document(s) across ${userIds.length} account(s).`);
  if (!write) console.log('[reset-user] Dry run — nothing changed. Re-run with --write to apply.');
  else console.log('[reset-user] Sign in again to trigger sync-master Rule 1 and rebuild clones from master.');

  await mongoose.disconnect();
}

run(parseArgs(process.argv)).catch(e => { console.error(e.message); process.exit(1); });
