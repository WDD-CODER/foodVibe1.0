'use strict';
/**
 * 0004-drop-registry-collections.js — Plan 321 Phase 3 (P3.5).
 *
 * Drops the v1 single-doc registry collections that migration 0003 exploded into
 * `taxonomyTerms`. Nothing reads them since the client moved to TaxonomyStore (P3.4).
 *
 * Before dropping, it re-runs 0003's planning step over the registries as they are NOW and
 * looks for every term it would produce in `taxonomyTerms` (by kind + key + owner). A term that
 * is missing was either deleted on purpose after 0003 ran, or edited into an old registry after
 * 0003 ran and never carried over — the dry run lists them so the Human can tell which.
 *
 * Modes (all need --target=local|atlas; Atlas also needs --confirm-host=<member host>):
 *   (default)          dry run: registry collections present, their doc counts, missing terms.
 *   --write=yes        drop them. Needs --backup-dir=<fresh db-backup.js snapshot>. Refuses when
 *                      terms are missing unless --accept-missing=yes, and refuses to re-run
 *                      without --force=yes.
 *   --verify=yes       none of the registry collections exists and the marker is stored.
 */

const { parseArgs, connect } = require('./tools/_connect');
const { checkBackup } = require('./0001-v2-schema');
const { buildTerms, EXPLODE } = require('./0003-taxonomy-terms');

const MIGRATION_ID = '0004-drop-registry-collections';
const REGISTRY_COLLECTIONS = Object.keys(EXPLODE);

const termKey = t => `${t.kind}\u0000${t.userId}\u0000${t.key}`;

/**
 * Pure planning step: which registry terms have no matching taxonomy term.
 * @param {Record<string, object[]>} registries  registry collection -> its docs
 * @param {object[]} stored  the current taxonomyTerms docs
 */
function findMissingTerms(registries, stored) {
  const have = new Set(stored.filter(t => !t.deletedAt).map(termKey));
  const { terms } = buildTerms(registries, Date.now());
  return terms.filter(t => !have.has(termKey(t))).map(({ kind, userId, key }) => ({ kind, userId, key }));
}

async function existingRegistries(db) {
  const names = new Set((await db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name));
  return REGISTRY_COLLECTIONS.filter(name => names.has(name));
}

async function plan(db) {
  const present = await existingRegistries(db);
  const registries = {};
  const counts = {};
  // Same filter as 0003's loadRegistries (tombstones excluded).
  for (const coll of REGISTRY_COLLECTIONS) {
    registries[coll] = present.includes(coll)
      ? await db.collection(coll).find({ _userDeleted: { $ne: true } }).toArray()
      : [];
  }
  for (const coll of present) counts[coll] = await db.collection(coll).countDocuments();
  const missing = findMissingTerms(registries, await db.collection('taxonomyTerms').find({}).toArray());
  return { present, counts, missing };
}

function printPlan({ present, counts, missing }) {
  console.log(`Registry collections present: ${present.length} of ${REGISTRY_COLLECTIONS.length}`);
  for (const coll of present) console.log(`  ${coll}: ${counts[coll]} doc(s)`);
  console.log(`Registry terms with no taxonomy term: ${missing.length}`);
  for (const m of missing) console.log(`  MISSING ${m.kind} '${m.key}' owner=${m.userId}`);
}

async function write(db, args, { present, counts, missing }) {
  checkBackup(args);
  if (await db.collection('migrations').findOne({ _id: MIGRATION_ID }) && args.force !== 'yes') {
    throw new Error(`${MIGRATION_ID} was already applied; refusing to re-run without --force=yes`);
  }
  if (missing.length && args['accept-missing'] !== 'yes') {
    throw new Error(`${missing.length} registry term(s) have no taxonomy term; review them, then pass --accept-missing=yes`);
  }
  for (const coll of present) await db.collection(coll).drop();
  await db.collection('migrations').replaceOne(
    { _id: MIGRATION_ID },
    { _id: MIGRATION_ID, appliedAt: new Date(), dropped: counts, missingAccepted: missing.length },
    { upsert: true },
  );
  console.log(`[migrate] dropped ${present.length} collection(s). Now run again with --verify=yes.`);
}

async function verify(db) {
  const present = await existingRegistries(db);
  const marker = await db.collection('migrations').findOne({ _id: MIGRATION_ID });
  for (const coll of present) console.log(`STILL PRESENT ${coll}`);
  if (!marker) console.log(`MISSING marker ${MIGRATION_ID}`);
  if (present.length || !marker) {
    console.log('[verify] FAILED');
    process.exit(1);
  }
  console.log('[verify] OK: no registry collection left; marker stored.');
}

async function main() {
  const args = parseArgs(process.argv, { write: 1, verify: 1, force: 1, 'accept-missing': 1, 'backup-dir': 1 });
  const { client, db } = await connect(args);
  try {
    if (args.verify === 'yes') return await verify(db);
    const result = await plan(db);
    printPlan(result);
    if (args.write === 'yes') await write(db, args, result);
    else console.log('[migrate] DRY RUN — nothing dropped.');
  } finally {
    await client.close();
  }
}

module.exports = { findMissingTerms, REGISTRY_COLLECTIONS };

if (require.main === module) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
