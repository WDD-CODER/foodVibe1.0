'use strict';
/**
 * reset-user-from-master.js — discard a business's cloned data so it is rebuilt
 * from __master__ on its members' next login (plan 425: data belongs to a business, not a user).
 *
 * Why this exists: sync-master's Rule 3 skips any clone flagged
 * `_userModified: true`, so a business that once opened and saved a recipe keeps
 * its copy forever — including when that copy is carrying a migration bug
 * nobody chose. Repair scripts correctly refuse to overwrite those docs.
 * This script is the deliberate way out: throw the clones away entirely and
 * let Rule 1 re-create them from corrected master data.
 *
 * It deletes the business's documents, NOT the user records or the business doc, and resets
 * `businesses.lastSyncedMasterVersion` to 0 so the version gate in routes/auth.js cannot
 * skip the resync. Master data is never touched.
 *
 * Destructive: any genuine per-business work is lost. Intended for disposable
 * development accounts. Take a backup first (server/scripts/db-backup.js).
 *
 * Usage:
 *   node server/scripts/reset-user-from-master.js --user=dev-guest [--target=local|atlas] [--write]
 *   node server/scripts/reset-user-from-master.js --business=<businessId> [--target=local] [--write]
 *   node server/scripts/reset-user-from-master.js --all-non-master [--target=local] [--write]
 *   node server/scripts/reset-user-from-master.js --orphans [--target=local] [--write]
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
    else if (a.startsWith('--business=')) args.business = a.slice('--business='.length);
    else if (a === '--all-non-master') args.allNonMaster = true;
    else if (a === '--orphans') args.orphans = true;
    else if (a.startsWith('--target=')) args.target = a.slice('--target='.length);
    else if (a === '--write') args.write = true;
    else throw new Error(`Unknown argument: ${a}`);
  }
  if (!args.user && !args.business && !args.allNonMaster && !args.orphans) throw new Error('Pass --user=<id>, --business=<id>, --orphans, or --all-non-master');
  if (!['local', 'atlas'].includes(args.target)) throw new Error("--target must be 'local' or 'atlas'");
  return args;
}

async function run({ user, business, allNonMaster, orphans, target, write }) {
  const uri = target === 'atlas' ? process.env.MONGO_URI : process.env.MONGO_LOCAL_URI;
  if (!uri) throw new Error('Mongo URI not set');

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });
  const db = mongoose.connection.db;
  console.log(`[reset-user] target: ${target} (${db.databaseName})`);

  const distinctBusinesses = async () => {
    const seen = new Set();
    for (const t of ALL_USER_ENTITY_TYPES) {
      let ids = [];
      try { ids = await db.collection(t).distinct('businessId'); } catch { /* collection may not exist */ }
      for (const id of ids) if (id && id !== '__master__') seen.add(id);
    }
    return seen;
  };

  let businessIds;
  if (orphans) {
    // Data whose business no longer exists. The admin delete route cascades correctly, so these come
    // from businesses removed out-of-band (straight in Mongo/Compass), which the route can never catch.
    // Nothing here is recoverable by a resync — the business is gone.
    const live = new Set(
      (await db.collection('businesses').find({}).project({ _id: 1 }).toArray()).map(b => String(b._id))
    );
    businessIds = [...(await distinctBusinesses())].filter(id => !live.has(id));
    console.log(`[reset-user] live businesses: ${[...live].join(', ') || '(none)'}`);
    if (!businessIds.length) {
      console.log('[reset-user] no orphaned data found — nothing to do.');
      await mongoose.disconnect();
      return;
    }
  } else if (allNonMaster) {
    businessIds = [...(await distinctBusinesses())];
  } else if (business) {
    businessIds = [business];
  } else {
    const u = await db.collection('users').findOne({ _id: user });
    if (!u) throw new Error(`User ${user} not found`);
    if (!u.businessId) throw new Error(`User ${user} has no business — run migration 0006 or sign in once`);
    businessIds = [u.businessId];
  }
  console.log(`[reset-user] businesses: ${businessIds.join(', ')}`);

  let grandTotal = 0;
  for (const bid of businessIds) {
    let total = 0;
    const perColl = [];
    for (const t of ALL_USER_ENTITY_TYPES) {
      let n = 0;
      try { n = await db.collection(t).countDocuments({ businessId: bid }); } catch { continue; }
      if (!n) continue;
      perColl.push(`${t}:${n}`);
      total += n;
      if (write) await db.collection(t).deleteMany({ businessId: bid });
    }
    grandTotal += total;
    console.log(`  ${bid.padEnd(14)} ${String(total).padStart(6)} doc(s)  ${perColl.join(' ')}`);

    if (write) {
      // Clear the version gate in routes/auth.js, otherwise the next refresh short-circuits the
      // resync and the business is left with nothing (login always syncs, refresh does not).
      const res = await db.collection('businesses').updateOne({ _id: bid }, { $set: { lastSyncedMasterVersion: 0 } });
      console.log(`  ${''.padEnd(14)} business record ${res.matchedCount ? 'reset (lastSyncedMasterVersion=0)' : 'NOT FOUND — nothing to reset'}`);
    }
  }

  console.log(`
[reset-user] ${write ? 'deleted' : 'would delete'} ${grandTotal} document(s) across ${businessIds.length} business(es).`);
  if (!write) console.log('[reset-user] Dry run — nothing changed. Re-run with --write to apply.');
  else console.log('[reset-user] Sign in again to trigger sync-master Rule 1 and rebuild the copies from master.');

  await mongoose.disconnect();
}

run(parseArgs(process.argv)).catch(e => { console.error(e.message); process.exit(1); });
