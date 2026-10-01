'use strict';
/**
 * 0002-trash-and-history.js — Plan 321 Phase 2b (P2b.1d).
 *
 * TRASH_* and VERSION_HISTORY keep their names, but hold whole v1-shaped entities (trash docs,
 * `snapshot` of a history entry). After the cutover, restoring them would POST v1 fields to a
 * strict v2 endpoint and fail, so they are upgraded IN PLACE with the same upgrade + cleanup as
 * 0001. Idempotent: docs already at schemaVersion 2 are skipped. The trash `deletedAt` and the
 * history-entry envelope (entityType/entityId/entityName/versionAt/changes) are untouched.
 *
 * Modes (all need --target=local|atlas; Atlas also needs --confirm-host=<member host>):
 *   (default)       dry run: counts + any doc that would still be invalid. Writes nothing.
 *   --write=yes     replace docs in place. Needs --backup-dir=<fresh db-backup.js snapshot>.
 *   --verify=yes    every trash doc / history snapshot is v2 and valid. Exits non-zero otherwise.
 */

const { parseArgs, connect } = require('./tools/_connect');
const { parseV2 } = require('../utils/schema-check');
const { buildV2, checkBackup } = require('./0001-v2-schema');

const MIGRATION_ID = '0002-trash-and-history';

const TRASH = {
  TRASH_RECIPES: 'RECIPE_LIST',
  TRASH_DISHES: 'DISH_LIST',
  TRASH_PRODUCTS: 'PRODUCT_LIST',
  TRASH_EQUIPMENT: 'EQUIPMENT_LIST',
  TRASH_VENUES: 'VENUE_PROFILES',
  TRASH_MENU_EVENTS: 'MENU_EVENT_LIST',
};
const HISTORY_TYPE = { recipe: 'RECIPE_LIST', dish: 'DISH_LIST', product: 'PRODUCT_LIST' };

/** Upgrades one stored entity (v1 -> v2). Returns { doc } or { skip } / { invalid }. */
function upgradeEntity(v1Type, entity, now, ownerId) {
  if (!entity || typeof entity !== 'object') return { skip: true };
  if (entity.schemaVersion === 2) return { skip: true };
  const { deletedAt, ...rest } = entity;
  const { doc } = buildV2(v1Type, rest, now);
  if (doc.userId === undefined && ownerId) doc.userId = ownerId; // snapshot lacked it; the history entry owns it
  const parsed = parseV2(v1Type, doc);
  if (!parsed.success) return { invalid: parsed.issues.map(i => `${i.path || '(root)'} :: ${i.message}`) };
  return { doc: deletedAt === undefined ? doc : { ...doc, deletedAt } };
}

async function plan(db, now) {
  const changes = [];
  const problems = [];
  const counts = {};
  for (const [coll, v1Type] of Object.entries(TRASH)) {
    counts[coll] = { total: 0, upgrade: 0 };
    for (const d of await db.collection(coll).find({}).toArray()) {
      counts[coll].total++;
      const r = upgradeEntity(v1Type, d, now, d.userId);
      if (r.invalid) problems.push({ coll, id: d._id, issues: r.invalid });
      else if (r.doc) { counts[coll].upgrade++; changes.push({ coll, id: d._id, set: r.doc }); }
    }
  }
  counts.VERSION_HISTORY = { total: 0, upgrade: 0 };
  for (const d of await db.collection('VERSION_HISTORY').find({}).toArray()) {
    counts.VERSION_HISTORY.total++;
    const v1Type = HISTORY_TYPE[d.entityType];
    if (!v1Type) { problems.push({ coll: 'VERSION_HISTORY', id: d._id, issues: [`unknown entityType ${d.entityType}`] }); continue; }
    const r = upgradeEntity(v1Type, d.snapshot, now, d.userId);
    if (r.invalid) problems.push({ coll: 'VERSION_HISTORY', id: d._id, issues: r.invalid });
    else if (r.doc) { counts.VERSION_HISTORY.upgrade++; changes.push({ coll: 'VERSION_HISTORY', id: d._id, patch: { snapshot: r.doc } }); }
  }
  return { changes, problems, counts };
}

function report({ counts, problems }) {
  for (const [coll, c] of Object.entries(counts)) console.log(`${coll}: ${c.total} docs, ${c.upgrade} to upgrade`);
  for (const p of problems) console.log(`INVALID ${p.coll} ${p.id}: ${p.issues.join('; ')}`);
  console.log(`\n[migrate] ${problems.length} invalid doc(s)`);
}

async function write(db, args, { changes, problems }) {
  checkBackup(args);
  const markers = db.collection('migrations');
  if (problems.length && args['skip-invalid'] !== 'yes') {
    throw new Error(`${problems.length} doc(s) would be invalid; resolve or pass --skip-invalid=yes (they stay v1-shaped)`);
  }
  for (const c of changes) {
    const coll = db.collection(c.coll);
    if (c.set) await coll.replaceOne({ _id: c.id }, c.set);
    else await coll.updateOne({ _id: c.id }, { $set: c.patch });
  }
  await markers.replaceOne(
    { _id: MIGRATION_ID },
    { _id: MIGRATION_ID, appliedAt: new Date(), upgraded: changes.length },
    { upsert: true },
  );
  console.log(`[migrate] upgraded ${changes.length} doc(s) in place. Now run again with --verify=yes.`);
}

async function verify(db) {
  let bad = 0;
  for (const [coll, v1Type] of Object.entries(TRASH)) {
    for (const d of await db.collection(coll).find({}).toArray()) {
      const { deletedAt, ...rest } = d;
      if (!parseV2(v1Type, rest).success) { console.log(`NOT V2 ${coll} ${d._id}`); bad++; }
    }
  }
  for (const d of await db.collection('VERSION_HISTORY').find({}).toArray()) {
    const v1Type = HISTORY_TYPE[d.entityType];
    if (!v1Type || !parseV2(v1Type, d.snapshot).success) { console.log(`NOT V2 VERSION_HISTORY ${d._id}`); bad++; }
  }
  if (bad) { console.log(`[verify] FAILED: ${bad} doc(s)`); process.exit(1); }
  console.log('[verify] OK: every trash doc and history snapshot is a valid v2 entity.');
}

async function main() {
  const args = parseArgs(process.argv, { write: 1, verify: 1, 'skip-invalid': 1, 'backup-dir': 1 });
  const { client, db } = await connect(args);
  try {
    if (args.verify === 'yes') return await verify(db);
    const result = await plan(db, Date.now());
    report(result);
    if (args.write === 'yes') await write(db, args, result);
    else console.log('[migrate] DRY RUN — nothing written.');
  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
