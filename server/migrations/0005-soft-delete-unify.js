'use strict';
/**
 * 0005-soft-delete-unify.js — plan 407.
 *
 * Moves today's three deletion mechanisms and the per-user arrays onto one model:
 *   1. every TRASH_* doc goes back into its own collection with `deletedAt` (its original delete
 *      time) + `deletedBy` — it shows in Trash exactly as before;
 *   2. every `_userDeleted` tombstone left without a trash copy becomes a purged stub
 *      (`deletedAt` + `purgedAt`, `_masterId` kept) so the login sync never clones it back;
 *   3. recipes/dishes `favoritedBy` → `favorite: true` when the doc's own owner is in it;
 *      `favoritedBy`, `favoritedBy_` and `hiddenBy` are removed everywhere;
 *   4. the TRASH_* collections are dropped once every one of their docs is verified in place.
 *
 * Modes (all need --target=local|atlas; Atlas also needs --confirm-host=<member host>):
 *   (default)       dry run: counts per step, nothing written.
 *   --write=yes     apply. Needs --backup-dir=<fresh db-backup.js snapshot>. Safe to re-run: a
 *                   second run finds nothing left to move and changes nothing.
 *   --db=<scratch>  (local only) run against a scratch copy, e.g. a restored Atlas snapshot — the
 *                   rehearsal; a scratch copy needs no --backup-dir.
 *   --verify=yes    read-only check: 0 TRASH_* collections, 0 tombstones, 0 favoritedBy/hiddenBy.
 */

const { parseArgs, connect } = require('./tools/_connect');
const { checkBackup } = require('./0001-v2-schema');

const MIGRATION_ID = '0005-soft-delete-unify';
const MASTER = '__master__';

/** TRASH_* collection → the collection its docs belong in. */
const TRASH_TARGETS = {
  TRASH_RECIPES: 'recipes',
  TRASH_DISHES: 'dishes',
  TRASH_PRODUCTS: 'products',
  TRASH_EQUIPMENT: 'equipment',
  TRASH_VENUES: 'venues',
  TRASH_MENU_EVENTS: 'menuEvents',
  TRASH_SUPPLIERS: 'suppliers',
};
const ENTITY_COLLECTIONS = [...new Set(Object.values(TRASH_TARGETS))];
const FAVORITE_COLLECTIONS = ['recipes', 'dishes'];
const LEGACY_ARRAY_FIELDS = ['favoritedBy', 'favoritedBy_', 'hiddenBy'];

/**
 * Pure: what to do with one trash doc, given the doc with the same _id in the target collection.
 *   insert   — nothing there: put the trash doc back, stamped deleted
 *   replace  — the user's tombstone is there: the trash copy (full data) replaces it, stamped deleted
 *   stale    — a live doc is there (restored earlier): the trash copy is an old duplicate, dropped
 *   conflict — another owner's doc holds that _id: left in TRASH_* and reported (blocks the drop)
 * @returns {{ action: string, doc?: object }}
 */
function planTrashDoc(trashDoc, current, now) {
  if (current && current.userId !== trashDoc.userId) return { action: 'conflict' };
  if (current && current._userDeleted !== true && current.deletedAt === undefined) return { action: 'stale' };
  if (current && current.deletedAt !== undefined) return { action: 'stale' };

  const { _masterId, _userModified, favoritedBy, favoritedBy_: favoritedByV1, hiddenBy: _hidden, ...rest } = trashDoc;
  // replaceAll() rewrote the trash docs it kept with `_masterId: null`; the tombstone still holds
  // the real link, so it wins when present.
  const masterId = typeof current?._masterId === 'string' ? current._masterId
    : typeof _masterId === 'string' ? _masterId : undefined;
  const doc = {
    ...rest,
    ...(masterId !== undefined && { _masterId: masterId }),
    _userModified: current ? current._userModified === true : _userModified === true,
    deletedAt: typeof trashDoc.deletedAt === 'number' ? trashDoc.deletedAt : now,
    deletedBy: typeof trashDoc.deletedBy === 'string' ? trashDoc.deletedBy : trashDoc.userId,
    // Same favorite rule as the live docs (favoriteUpdate): only the owner's own mark survives.
    ...(favoriteUpdate({ userId: trashDoc.userId, favoritedBy, favoritedBy_: favoritedByV1 }).$set ?? {}),
  };
  for (const k of Object.keys(doc)) if (doc[k] === null) delete doc[k];
  return { action: current ? 'replace' : 'insert', doc };
}

/** Pure: a leftover `_userDeleted` tombstone as a purged stub. */
function tombstoneToStub(tomb, now) {
  return {
    _id: tomb._id,
    schemaVersion: 2,
    userId: tomb.userId,
    ...(typeof tomb._masterId === 'string' && { _masterId: tomb._masterId }),
    _userModified: true,
    deletedAt: now,
    deletedBy: tomb.userId,
    purgedAt: now,
  };
}

/** Pure: the $set/$unset that moves one recipe/dish off the legacy per-user arrays. */
function favoriteUpdate(doc) {
  const favs = [...(Array.isArray(doc.favoritedBy) ? doc.favoritedBy : []), ...(Array.isArray(doc.favoritedBy_) ? doc.favoritedBy_ : [])];
  const mine = doc.userId !== MASTER && favs.includes(doc.userId);
  return {
    ...(mine && { $set: { favorite: true } }),
    $unset: Object.fromEntries(LEGACY_ARRAY_FIELDS.map(f => [f, ''])),
  };
}

async function presentTrash(db) {
  const names = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name));
  return Object.keys(TRASH_TARGETS).filter(n => names.has(n));
}

const legacyArrayFilter = { $or: LEGACY_ARRAY_FIELDS.map(f => ({ [f]: { $exists: true } })) };

async function plan(db, now) {
  const trash = {};
  for (const name of await presentTrash(db)) {
    const target = db.collection(TRASH_TARGETS[name]);
    const docs = await db.collection(name).find({}).toArray();
    const current = new Map((await target.find({ _id: { $in: docs.map(d => d._id) } }).toArray()).map(d => [String(d._id), d]));
    trash[name] = docs.map(d => ({ trashDoc: d, ...planTrashDoc(d, current.get(String(d._id)), now) }));
  }
  const replaced = new Set(Object.values(trash).flat().filter(p => p.action === 'replace').map(p => `${p.doc.userId}:${p.doc._id}`));
  const tombstones = {};
  const legacyArrays = {};
  for (const coll of ENTITY_COLLECTIONS) {
    const tombs = await db.collection(coll).find({ _userDeleted: true }).toArray();
    tombstones[coll] = tombs.filter(t => !replaced.has(`${t.userId}:${t._id}`));
    legacyArrays[coll] = await db.collection(coll).find(legacyArrayFilter, { projection: { userId: 1, favoritedBy: 1, favoritedBy_: 1, hiddenBy: 1 } }).toArray();
  }
  return { trash, tombstones, legacyArrays };
}

function printPlan({ trash, tombstones, legacyArrays }) {
  const count = (list, action) => list.filter(p => p.action === action).length;
  console.log('TRASH_* → own collection (insert · replace tombstone · stale duplicate · conflict):');
  if (!Object.keys(trash).length) console.log('  (no TRASH_* collection left)');
  for (const [name, list] of Object.entries(trash)) {
    console.log(`  ${name.padEnd(18)} ${list.length} doc(s): ${count(list, 'insert')} · ${count(list, 'replace')} · ${count(list, 'stale')} · ${count(list, 'conflict')}`);
    for (const p of list.filter(x => x.action === 'conflict')) console.log(`    CONFLICT ${p.trashDoc._id} (${p.trashDoc.userId}) — another owner holds this _id`);
  }
  console.log('Tombstones → purged stubs:');
  for (const [coll, list] of Object.entries(tombstones)) if (list.length) console.log(`  ${coll}: ${list.length}`);
  console.log('favoritedBy / hiddenBy removed (→ favorite: true for the owner):');
  for (const [coll, list] of Object.entries(legacyArrays)) {
    if (!list.length) continue;
    const favorites = FAVORITE_COLLECTIONS.includes(coll) ? list.filter(d => favoriteUpdate(d).$set).length : 0;
    console.log(`  ${coll}: ${list.length} doc(s), ${favorites} become favorite`);
  }
}

async function write(db, args, result, now) {
  if (args.db === undefined) checkBackup(args);
  const { trash, tombstones, legacyArrays } = result;

  for (const [name, list] of Object.entries(trash)) {
    const target = db.collection(TRASH_TARGETS[name]);
    for (const p of list) {
      if (p.action === 'insert') await target.insertOne(p.doc);
      if (p.action === 'replace') await target.replaceOne({ _id: p.doc._id, userId: p.doc.userId }, p.doc);
    }
  }
  for (const [coll, list] of Object.entries(tombstones)) {
    for (const t of list) await db.collection(coll).replaceOne({ _id: t._id, userId: t.userId }, tombstoneToStub(t, now));
  }
  for (const [coll, list] of Object.entries(legacyArrays)) {
    for (const d of list) await db.collection(coll).updateOne({ _id: d._id, userId: d.userId }, favoriteUpdate(d));
  }

  // Drop a TRASH_* collection only when each of its docs is now in place (or was a stale copy).
  const dropped = [];
  for (const [name, list] of Object.entries(trash)) {
    if (list.some(p => p.action === 'conflict')) {
      console.log(`[migrate] KEPT ${name}: it has conflicts`);
      continue;
    }
    const target = db.collection(TRASH_TARGETS[name]);
    const moved = list.filter(p => p.action !== 'stale');
    const inPlace = await target.countDocuments({ _id: { $in: moved.map(p => p.doc._id) }, deletedAt: { $exists: true } });
    if (inPlace !== moved.length) {
      console.log(`[migrate] KEPT ${name}: ${inPlace} of ${moved.length} doc(s) verified in ${TRASH_TARGETS[name]}`);
      continue;
    }
    await db.collection(name).drop();
    dropped.push(name);
  }

  await db.collection('migrations').replaceOne(
    { _id: MIGRATION_ID },
    {
      _id: MIGRATION_ID,
      appliedAt: new Date(),
      trash: Object.fromEntries(Object.entries(trash).map(([n, l]) => [n, l.length])),
      tombstones: Object.fromEntries(Object.entries(tombstones).map(([c, l]) => [c, l.length])),
      legacyArrays: Object.fromEntries(Object.entries(legacyArrays).map(([c, l]) => [c, l.length])),
      dropped,
    },
    { upsert: true },
  );
  console.log(`[migrate] done; dropped ${dropped.length} TRASH_* collection(s). Now run again with --verify=yes.`);
}

async function verify(db) {
  const problems = [];
  for (const name of await presentTrash(db)) problems.push(`STILL PRESENT ${name}`);
  for (const coll of ENTITY_COLLECTIONS) {
    const tombs = await db.collection(coll).countDocuments({ _userDeleted: true });
    const arrays = await db.collection(coll).countDocuments(legacyArrayFilter);
    if (tombs) problems.push(`${coll}: ${tombs} _userDeleted tombstone(s)`);
    if (arrays) problems.push(`${coll}: ${arrays} doc(s) with favoritedBy/hiddenBy`);
  }
  if (!await db.collection('migrations').findOne({ _id: MIGRATION_ID })) problems.push(`MISSING marker ${MIGRATION_ID}`);
  for (const p of problems) console.log(p);
  if (problems.length) {
    console.log('[verify] FAILED');
    process.exitCode = 1;
    return;
  }
  console.log('[verify] OK: 0 TRASH_* collections, 0 tombstones, 0 favoritedBy/hiddenBy; marker stored.');
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

module.exports = { planTrashDoc, tombstoneToStub, favoriteUpdate, plan, write, verify, TRASH_TARGETS };

if (require.main === module) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
