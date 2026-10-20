'use strict';
/**
 * 0006-business-tenant.js — plan 424 (spec 01.1, first of 424 -> 425 -> 426).
 *
 * Gives every existing user a business and stamps every existing item with it:
 *   1. a `businesses` doc "העסק של <username>" per user without a `businessId`; the user becomes its
 *      owner (`businessRole: 'owner'`, `isPlatformAdmin` true only for `role: 'admin'`, `createdAt`);
 *   2. every doc in every `ALL_USER_ENTITY_TYPES` collection gets `businessId` (its owner's business;
 *      '__master__' for master docs) and `createdBy` (= its `userId`; '__master__' for master docs).
 * The `__global__` DICTIONARY_OVERRIDES doc is left alone. Docs whose `userId` matches no user are
 * orphans: reported, never changed. Reads and writes still filter by `userId` after this migration
 * (plan 425 switches them), so the new fields are inert until then.
 *
 * Modes (all need --target=local|atlas; Atlas also needs --confirm-host=<member host>):
 *   (default)       dry run: what would be created and stamped, nothing written.
 *   --write=yes     apply. Needs --backup-dir=<fresh db-backup.js snapshot>. Idempotent: a second run
 *                   creates 0 businesses and stamps 0 docs.
 *   --db=<scratch>  (local only) run against a scratch copy, e.g. a restored Atlas snapshot — the
 *                   rehearsal; a scratch copy needs no --backup-dir.
 *   --verify=yes    read-only: every user has a business, no non-orphan doc misses a field, and per
 *                   user and collection the count by userId equals the count by businessId.
 *
 * Rollback: the new fields and the `businesses` collection are unread while the app still scopes by
 * `userId`, so leaving them is safe. A full undo = restore the snapshot taken before --write=yes.
 */

const { parseArgs, connect } = require('./tools/_connect');
const { checkBackup } = require('./0001-v2-schema');
const { ALL_USER_ENTITY_TYPES } = require('../constants/all-user-entity-types');
const { newId } = require('../utils/id');

const MIGRATION_ID = '0006-business-tenant';
const MASTER = '__master__';
const GLOBAL = '__global__';

/** Pure: the business document for one user. */
function businessDocFor(user, now, id) {
  return {
    _id: id,
    name: 'העסק של ' + user.name,
    ownerId: user._id,
    createdAt: now,
    internal: false,
    lastSyncedMasterVersion: user.lastSyncedMasterVersion ?? 0,
  };
}

/** Pure: the user fields that make them the owner of their business. */
function userBusinessFields(user, businessId, now) {
  return {
    businessId,
    businessRole: 'owner',
    isPlatformAdmin: user.role === 'admin',
    createdAt: user.createdAt ?? now,
  };
}

/**
 * Pure: who an item with this `userId` belongs to.
 * @param {string} userId
 * @param {Map<string, string>} businessByUser  userId -> businessId
 * @returns {{ businessId: string, createdBy: string } | 'skip' | 'orphan'}
 */
function ownerOf(userId, businessByUser) {
  if (userId === MASTER) return { businessId: MASTER, createdBy: MASTER };
  if (userId === GLOBAL) return 'skip';
  const businessId = businessByUser.get(userId);
  return businessId ? { businessId, createdBy: userId } : 'orphan';
}

const usersCol = db => db.collection('users');

async function loadBusinessMap(db) {
  const users = await usersCol(db).find({ _id: { $ne: MASTER } }).toArray();
  return { users, businessByUser: new Map(users.filter(u => u.businessId).map(u => [u._id, u.businessId])) };
}

async function plan(db, now) {
  const { users, businessByUser } = await loadBusinessMap(db);
  const toCreate = users.filter(u => !u.businessId).map(user => ({ user, businessId: newId() }));
  for (const c of toCreate) businessByUser.set(c.user._id, c.businessId);

  const collections = {};
  for (const coll of ALL_USER_ENTITY_TYPES) {
    const groups = await db.collection(coll).aggregate([
      {
        $group: {
          _id: '$userId',
          docs: { $sum: 1 },
          noBusiness: { $sum: { $cond: [{ $eq: [{ $type: '$businessId' }, 'missing'] }, 1, 0] } },
          noCreator: { $sum: { $cond: [{ $eq: [{ $type: '$createdBy' }, 'missing'] }, 1, 0] } },
        },
      },
    ]).toArray();
    const r = { businessMissing: 0, masterBusiness: 0, createdByMissing: 0, orphans: [], owners: [] };
    for (const g of groups) {
      const owner = ownerOf(g._id, businessByUser);
      if (owner === 'skip') continue;
      if (owner === 'orphan') {
        r.orphans.push({ userId: g._id, docs: g.docs });
        continue;
      }
      r.businessMissing += g.noBusiness;
      r.createdByMissing += g.noCreator;
      if (g._id === MASTER) r.masterBusiness += g.noBusiness;
      if (g.noBusiness || g.noCreator) r.owners.push(g._id);
    }
    collections[coll] = r;
  }
  return { toCreate, businessByUser, collections, now };
}

function printPlan({ toCreate, collections }) {
  console.log(`[migrate] users without a business: ${toCreate.length}  → businesses to create: ${toCreate.length}`);
  for (const { user } of toCreate) {
    console.log(`[migrate]   ${user._id} → "העסק של ${user.name}"  isPlatformAdmin=${user.role === 'admin'}`);
  }
  for (const [coll, r] of Object.entries(collections)) {
    const orphanDocs = r.orphans.reduce((n, o) => n + o.docs, 0);
    console.log(`[migrate] ${coll}: businessId missing ${r.businessMissing} (master ${r.masterBusiness}) · createdBy missing ${r.createdByMissing} · orphans ${orphanDocs}`);
    for (const o of r.orphans) console.log(`[migrate]   ORPHAN ${coll} userId=${o.userId} docs=${o.docs}`);
  }
}

async function write(db, args, result, now) {
  if (args.db === undefined) checkBackup(args);
  const { toCreate, businessByUser, collections } = result;

  for (const { user, businessId } of toCreate) {
    await db.collection('businesses').insertOne(businessDocFor(user, now, businessId));
    await usersCol(db).updateOne({ _id: user._id }, { $set: userBusinessFields(user, businessId, now) });
  }

  let stamped = 0;
  for (const [coll, r] of Object.entries(collections)) {
    if (!r.businessMissing && !r.createdByMissing) continue;
    const col = db.collection(coll);
    for (const userId of r.owners) {
      const owner = ownerOf(userId, businessByUser);
      if (typeof owner === 'string') continue;
      const a = await col.updateMany({ userId, businessId: { $exists: false } }, { $set: { businessId: owner.businessId } });
      const b = await col.updateMany({ userId, createdBy: { $exists: false } }, { $set: { createdBy: owner.createdBy } });
      stamped += Math.max(a.modifiedCount, b.modifiedCount);
    }
  }

  await db.collection('migrations').updateOne(
    { _id: MIGRATION_ID },
    { $set: { lastRunAt: new Date() }, $inc: { runs: 1 } },
    { upsert: true },
  );
  console.log(`[migrate] done: ${toCreate.length} businesses created, ${stamped} docs stamped. Now run again with --verify=yes.`);
}

async function verify(db) {
  const { users, businessByUser } = await loadBusinessMap(db);
  let failed = false;
  for (const u of users) {
    if (!u.businessId) {
      console.log(`MISSING business for user ${u._id}`);
      failed = true;
    } else if (!await db.collection('businesses').findOne({ _id: u.businessId })) {
      console.log(`MISSING businesses doc ${u.businessId} for user ${u._id}`);
      failed = true;
    }
  }
  const owners = [...users.map(u => u._id), MASTER];
  for (const coll of ALL_USER_ENTITY_TYPES) {
    const col = db.collection(coll);
    for (const userId of owners) {
      const owner = ownerOf(userId, businessByUser);
      if (typeof owner === 'string') continue;
      const byUser = await col.countDocuments({ userId });
      if (!byUser) continue;
      const byBusiness = await col.countDocuments({ userId, businessId: owner.businessId, createdBy: { $exists: true } });
      const ok = byUser === byBusiness;
      if (!ok) failed = true;
      console.log(`${ok ? 'ok' : 'MISMATCH'} ${userId} ${coll} byUser=${byUser} byBusiness=${byBusiness}`);
    }
    const known = new Set([...owners, GLOBAL]);
    const strays = await col.aggregate([{ $match: { userId: { $nin: [...known] } } }, { $group: { _id: '$userId', docs: { $sum: 1 } } }]).toArray();
    for (const s of strays) console.log(`ORPHAN ${coll} userId=${s._id} docs=${s.docs}`);
  }
  if (!await db.collection('migrations').findOne({ _id: MIGRATION_ID })) {
    console.log(`MISSING marker ${MIGRATION_ID}`);
    failed = true;
  }
  if (failed) {
    console.log('[verify] FAILED');
    process.exitCode = 1;
    return;
  }
  console.log('[verify] OK: every user has a business; every item carries businessId + createdBy; counts match.');
}

async function main() {
  const args = parseArgs(process.argv, { write: 1, verify: 1, 'backup-dir': 1 });
  const { client, db } = await connect(args);
  try {
    if (args.verify === 'yes') return await verify(db);
    const now = Date.now();
    const result = await plan(db, now);
    printPlan(result);
    if (args.write === 'yes') await write(db, args, result, now);
    else console.log('[migrate] DRY RUN — nothing written.');
  } finally {
    await client.close();
  }
}

module.exports = { businessDocFor, userBusinessFields, ownerOf, plan, write, verify, MIGRATION_ID };

if (require.main === module) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
