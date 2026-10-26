'use strict';
/**
 * 0007-coefficients.js — plan 440 (spec 03.1, double coefficient).
 *
 * Lays the data for "how much food an event needs":
 *   1. every `eventType` / `menuType` term without a `coefficient` gets one (shared defaults; 1 for any other key);
 *   2. master gets the five default event types and the new serving type `chef_plated_front` when it lacks them;
 *      a business's own term with the same kind + key as such a master term is folded into the master one (deleted);
 *   3. every menu event gets `eventTypeSnapshot` / `servingTypeSnapshot` with coefficient 1 (so its portions do
 *      not move) and every item gets `portionsPerDiner` (= its `servingPortions`, else 1) — trashed events too;
 *   4. `course` terms lose the stored `color` (plan 438 stopped writing it; spec 02.1).
 * The "portions change" list is a report only: events whose recomputed portions differ from the stored
 * `derivedPortions` (plan 441 switches the screens to the new formula).
 *
 * Modes (all need --target=local|atlas; Atlas also needs --confirm-host=<member host>):
 *   (default)       dry run: counts per step, nothing written.
 *   --write=yes     apply. Needs --backup-dir=<fresh db-backup.js snapshot>. Idempotent: a second run changes 0.
 *   --db=<scratch>  (local only) run against a scratch copy, e.g. a restored Atlas snapshot — the rehearsal;
 *                   a scratch copy needs no --backup-dir.
 *   --verify=yes    read-only: nothing is missing any more; exit 1 on any miss.
 *
 * Rollback: every change is additive except the folds and the color unset. To undo, restore `taxonomyTerms` and
 * `menuEvents` from the --backup-dir snapshot (`server/scripts/db-restore.js` into a scratch DB, then the Human
 * copies the two collections back). Code before plan 441 ignores the new fields, so leaving them is also safe.
 */

const fs = require('fs');
const path = require('path');
const { parseArgs, connect } = require('./tools/_connect');
const { checkBackup } = require('./0001-v2-schema');

const MIGRATION_ID = '0007-coefficients';
const MASTER = '__master__';

const SERVING_COEFFICIENTS = {
  plated_course: 1, plated: 1, table: 1, buffet_family: 1.1, cocktail_passed: 3, chef_plated_front: 2,
};
const EVENT_TYPE_SEED = [['עסקי', 1.1], ['פרטי', 1.15], ['חתונה', 1.2], ['מסיבה', 1.1], ['כנסים', 0.9]];
const NEW_SERVING_SEED = [{ key: 'chef_plated_front', coefficient: 2, fields: ['sell_price', 'food_cost_money', 'serving_portions'] }];
const COEFFICIENT_KINDS = ['eventType', 'menuType'];

const termId = (kind, userId, key) => `${kind}:${userId}:${key}`;
const seedKey = (kind, key) => `${kind}:${key}`;

/** Every default master term this migration guarantees, as { kind, key, coefficient, fields? }. */
function seedTerms() {
  return [
    ...EVENT_TYPE_SEED.map(([key, coefficient]) => ({ kind: 'eventType', key, coefficient })),
    ...NEW_SERVING_SEED.map(s => ({ kind: 'menuType', key: s.key, coefficient: s.coefficient, fields: s.fields })),
  ];
}

/** Pure: the coefficient a term of this kind + key starts with (the shared default, else 1). */
function seedCoefficient(kind, key) {
  if (kind === 'menuType') return SERVING_COEFFICIENTS[key] ?? 1;
  if (kind === 'eventType') return (EVENT_TYPE_SEED.find(([k]) => k === key) ?? [key, 1])[1];
  return 1;
}

/** Pure: the update that gives an eventType / menuType term its coefficient, or null when it has one. */
function termPatch(term) {
  if (!COEFFICIENT_KINDS.includes(term.kind) || term.coefficient !== undefined) return null;
  return { $set: { coefficient: seedCoefficient(term.kind, term.key) } };
}

/**
 * Pure: the master terms to insert (the five event types and `chef_plated_front`) that master does not have yet.
 * @param {Set<string>} existingMasterKeys  `${kind}:${key}` of the master terms already there
 * @param {number} now
 * @param {Record<string, number>} [maxSortByKind]  highest master `sortOrder` per kind (new ones go after it)
 */
function masterSeedDocs(existingMasterKeys, now, maxSortByKind = {}) {
  const next = { ...maxSortByKind };
  const docs = [];
  for (const seed of seedTerms()) {
    if (existingMasterKeys.has(seedKey(seed.kind, seed.key))) continue;
    const sortOrder = (next[seed.kind] ?? -1) + 1;
    next[seed.kind] = sortOrder;
    docs.push({
      _id: termId(seed.kind, MASTER, seed.key),
      schemaVersion: 2,
      userId: MASTER,
      businessId: MASTER,
      createdBy: MASTER,
      createdAt: now,
      updatedAt: now,
      kind: seed.kind,
      key: seed.key,
      sortOrder,
      coefficient: seed.coefficient,
      ...(seed.fields ? { fields: seed.fields } : {}),
    });
  }
  return docs;
}

/**
 * Pure: the business-own terms that are now the same term as a master seed term (same kind + key) — deleted
 * in the write, listed in the dry run.
 * @param {object[]} ownTerms  non-master eventType / menuType terms
 * @param {Set<string>} masterSeedKeys  `${kind}:${key}` of the seed terms master has (or is about to get)
 */
function foldTargets(ownTerms, masterSeedKeys) {
  return ownTerms.filter(t => masterSeedKeys.has(seedKey(t.kind, t.key)));
}

/** Pure: the `$set` for an event missing snapshots / `portionsPerDiner`, or null when nothing is missing. */
function eventPatch(event, labels) {
  const set = {};
  const snapshot = (key) => ({ key, name: labels[key] ?? key, coefficient: 1 });
  if (typeof event.eventType === 'string' && event.eventType !== '' && event.eventTypeSnapshot === undefined) {
    set.eventTypeSnapshot = snapshot(event.eventType);
  }
  if (typeof event.servingType === 'string' && event.servingType !== '' && event.servingTypeSnapshot === undefined) {
    set.servingTypeSnapshot = snapshot(event.servingType);
  }
  (event.sections ?? []).forEach((section, si) => {
    (section.items ?? []).forEach((item, ii) => {
      if (item.portionsPerDiner === undefined) set[`sections.${si}.items.${ii}.portionsPerDiner`] = item.servingPortions ?? 1;
    });
  });
  return Object.keys(set).length ? { $set: set } : null;
}

const round6 = n => Math.round(Number((n * 1e6).toPrecision(15))) / 1e6;

/** Pure: items whose recomputed portions (ceil(round6(portionsPerDiner × guests))) differ from the stored derivedPortions. */
function portionsChange(event) {
  const guests = Math.max(0, event.guestCount ?? 0);
  const out = [];
  for (const section of event.sections ?? []) {
    for (const item of section.items ?? []) {
      const perDiner = item.portionsPerDiner ?? item.servingPortions ?? 1;
      const recomputed = Math.ceil(round6(perDiner * guests));
      const stored = item.derivedPortions ?? 0;
      if (recomputed !== stored) {
        out.push({ _id: event._id, name: event.name, businessId: event.businessId, section: section.name, recipeId: item.recipeId, stored, recomputed });
      }
    }
  }
  return out;
}

/** Pure: removes the stored color of a dish type (`course` term), or null. */
function courseColorPatch(term) {
  return term.kind === 'course' && term.color !== undefined ? { $unset: { color: '' } } : null;
}

/** Every dictionary group flattened to key → Hebrew (the `general` group wins on a clash). */
function loadLabels() {
  const file = path.resolve(__dirname, '..', '..', 'public', 'assets', 'data', 'dictionary.json');
  const dict = JSON.parse(fs.readFileSync(file, 'utf8'));
  const labels = {};
  for (const [group, entries] of Object.entries(dict)) {
    if (group !== 'general' && entries && typeof entries === 'object') Object.assign(labels, entries);
  }
  Object.assign(labels, dict.general ?? {});
  return labels;
}

async function plan(db, now, labels = loadLabels()) {
  const terms = db.collection('taxonomyTerms');
  const masterTerms = await terms.find({ userId: MASTER, kind: { $in: COEFFICIENT_KINDS } }).toArray();
  const ownTerms = await terms.find({ userId: { $ne: MASTER }, kind: { $in: COEFFICIENT_KINDS } }).toArray();
  const maxSortByKind = {};
  for (const t of masterTerms) maxSortByKind[t.kind] = Math.max(maxSortByKind[t.kind] ?? -1, t.sortOrder ?? 0);

  const existingKeys = new Set(masterTerms.map(t => seedKey(t.kind, t.key)));
  const inserts = masterSeedDocs(existingKeys, now, maxSortByKind);
  const masterSeedKeys = new Set(seedTerms().map(s => seedKey(s.kind, s.key)));
  const folds = foldTargets(ownTerms, masterSeedKeys);
  const foldIds = new Set(folds.map(t => t._id));

  const termPatches = [...masterTerms, ...ownTerms.filter(t => !foldIds.has(t._id))]
    .map(t => ({ term: t, patch: termPatch(t) }))
    .filter(x => x.patch);

  const colorPatches = (await terms.find({ kind: 'course', color: { $exists: true } }).toArray())
    .map(t => ({ term: t, patch: courseColorPatch(t) }))
    .filter(x => x.patch);

  const eventPatches = [];
  const changes = [];
  for (const event of await db.collection('menuEvents').find({ purgedAt: { $exists: false } }).toArray()) {
    const patch = eventPatch(event, labels);
    if (patch) eventPatches.push({ event, patch });
    changes.push(...portionsChange(event));
  }
  return { inserts, folds, termPatches, colorPatches, eventPatches, changes, now };
}

function printPlan(r) {
  console.log(`[migrate] master terms to insert: ${r.inserts.length}${r.inserts.map(d => ` ${d.kind}:${d.key}(${d.coefficient})`).join('')}`);
  console.log(`[migrate] own terms folded into master (deleted): ${r.folds.length}`);
  for (const t of r.folds) console.log(`[migrate]   FOLD ${t.kind}:${t.key} business=${t.businessId ?? t.userId}`);
  console.log(`[migrate] terms to give a coefficient: ${r.termPatches.length}`);
  for (const { term, patch } of r.termPatches) console.log(`[migrate]   ${term.kind}:${term.key} owner=${term.userId} → ${patch.$set.coefficient}`);
  console.log(`[migrate] dish types losing their color: ${r.colorPatches.length}`);
  console.log(`[migrate] events to patch (snapshots / portionsPerDiner): ${r.eventPatches.length}`);
  console.log(`[migrate] portions change (report only, ${r.changes.length} items):`);
  for (const c of r.changes) console.log(`[migrate]   ${c._id} "${c.name}" business=${c.businessId ?? '-'} · ${c.section} · ${c.recipeId}: stored ${c.stored} → recomputed ${c.recomputed}`);
}

async function write(db, args, result, now) {
  if (args.db === undefined) checkBackup(args);
  const terms = db.collection('taxonomyTerms');
  // Re-reads inside the write: insert only what is still missing, so a crashed run can be repeated.
  const masterKeys = new Set((await terms.find({ userId: MASTER, kind: { $in: COEFFICIENT_KINDS } }).toArray()).map(t => seedKey(t.kind, t.key)));
  for (const doc of result.inserts) {
    if (!masterKeys.has(seedKey(doc.kind, doc.key))) await terms.insertOne(doc);
  }
  if (result.folds.length) await terms.deleteMany({ _id: { $in: result.folds.map(t => t._id) } });
  for (const { term, patch } of result.termPatches) {
    await terms.updateOne({ _id: term._id, coefficient: { $exists: false } }, { $set: { ...patch.$set, updatedAt: now } });
  }
  for (const { term, patch } of result.colorPatches) {
    await terms.updateOne({ _id: term._id }, { $unset: patch.$unset, $set: { updatedAt: now } });
  }
  const events = db.collection('menuEvents');
  for (const { event, patch } of result.eventPatches) {
    await events.updateOne({ _id: event._id }, { $set: { ...patch.$set, updatedAt: now } });
  }
  await db.collection('migrations').updateOne(
    { _id: MIGRATION_ID },
    { $set: { lastRunAt: new Date() }, $inc: { runs: 1 } },
    { upsert: true },
  );
  console.log(`[migrate] done: ${result.inserts.length} inserted, ${result.folds.length} folded, ${result.termPatches.length} coefficients, ${result.colorPatches.length} colors removed, ${result.eventPatches.length} events patched. Now run again with --verify=yes.`);
}

async function verify(db) {
  const terms = db.collection('taxonomyTerms');
  const events = db.collection('menuEvents');
  const checks = [
    ['eventType/menuType terms without coefficient', await terms.countDocuments({ kind: { $in: COEFFICIENT_KINDS }, coefficient: { $exists: false } })],
    ['events with an eventType and no eventTypeSnapshot', await events.countDocuments({ purgedAt: { $exists: false }, eventType: { $nin: [null, ''], $exists: true }, eventTypeSnapshot: { $exists: false } })],
    ['events with a servingType and no servingTypeSnapshot', await events.countDocuments({ purgedAt: { $exists: false }, servingType: { $nin: [null, ''], $exists: true }, servingTypeSnapshot: { $exists: false } })],
    ['events with an item without portionsPerDiner', await events.countDocuments({ purgedAt: { $exists: false }, sections: { $elemMatch: { items: { $elemMatch: { portionsPerDiner: { $exists: false } } } } } })],
    ['dish types (course) with a color', await terms.countDocuments({ kind: 'course', color: { $exists: true } })],
  ];
  let failed = false;
  for (const [label, n] of checks) {
    if (n) failed = true;
    console.log(`${n ? 'FAIL' : 'ok'} ${label}: ${n}`);
  }
  const masterKeys = new Set((await terms.find({ userId: MASTER, kind: { $in: COEFFICIENT_KINDS } }).toArray()).map(t => seedKey(t.kind, t.key)));
  for (const s of seedTerms()) {
    const has = masterKeys.has(seedKey(s.kind, s.key));
    if (!has) failed = true;
    console.log(`${has ? 'ok' : 'FAIL'} master has ${s.kind}:${s.key}`);
  }
  if (!await db.collection('migrations').findOne({ _id: MIGRATION_ID })) {
    console.log(`FAIL missing marker ${MIGRATION_ID}`);
    failed = true;
  }
  if (failed) {
    console.log('[verify] FAILED');
    process.exitCode = 1;
    return;
  }
  console.log('[verify] OK: every type has its coefficient, every event its snapshots and portionsPerDiner, master has the six default terms.');
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

module.exports = {
  SERVING_COEFFICIENTS, EVENT_TYPE_SEED, NEW_SERVING_SEED,
  seedCoefficient, termPatch, masterSeedDocs, foldTargets, eventPatch, portionsChange, courseColorPatch,
  loadLabels, plan, write, verify, MIGRATION_ID,
};

if (require.main === module) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
