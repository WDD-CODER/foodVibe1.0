'use strict';
/**
 * 0001-v2-schema.js — Plan 321 Phase 2b.
 *
 * Copies the 7 entity collections into their v2 names with v2 field names, a
 * `schemaVersion: 2` stamp, and the Human-approved cleanup rules. The OLD collections are
 * never modified or deleted — they are the rollback path.
 *
 *   PRODUCT_LIST -> products       RECIPE_LIST -> recipes     DISH_LIST -> dishes
 *   KITCHEN_SUPPLIERS -> suppliers EQUIPMENT_LIST -> equipment
 *   VENUE_PROFILES -> venues       MENU_EVENT_LIST -> menuEvents
 *
 * Cleanup rules (approved 2026-10-01):
 *   - a `null` value means "no value" -> the key is removed
 *   - missing createdAt -> migration time; missing updatedAt -> createdAt
 *   - missing `sources` on a product -> []
 *   - ingredient / step / source values are only ever RENAMED, never changed
 *
 * Modes (all need --target=local|atlas; Atlas also needs --confirm-host=<member host>):
 *   (default)         dry run: stats, residual violations, samples. Writes nothing.
 *   --write=yes       copy into the v2 collections. Needs --backup-dir=<fresh db-backup.js snapshot>.
 *                     Refuses if any document would still be invalid (unless --skip-invalid=yes),
 *                     if a v2 collection is non-empty, or if already applied (unless --force=yes).
 *   --verify=yes      compare every v1 doc to its v2 copy (ingredients name/amount/unit included).
 *                     Exits non-zero on any mismatch.
 *
 * Usage:
 *   node server/migrations/0001-v2-schema.js --target=local
 *   node server/migrations/0001-v2-schema.js --target=local --write=yes --backup-dir=<dir>
 *   node server/migrations/0001-v2-schema.js --target=local --verify=yes
 */

const fs = require('fs');
const path = require('path');
const { parseArgs, connect } = require('./tools/_connect');
const { parseV2 } = require('../utils/schema-check');
const { tombstoneSchema } = require('../generated/schemas/base.schema');
const { upgradeV1toV2 } = require('../generated/schemas/upgrade/upgrade');
const { COLLECTION_RENAMES } = require('../generated/schemas/field-map.v1-to-v2');

const MIGRATION_ID = '0001-v2-schema';
const BATCH = 500;
const SAMPLES = 3;

function isRecord(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v) && !(v instanceof Date);
}

/** Removes null-valued keys, recursively. Returns the cleaned value and the number removed. */
function stripNulls(value, counter) {
  if (Array.isArray(value)) return value.map(v => stripNulls(v, counter));
  if (!isRecord(value) || value.constructor?.name === 'ObjectId') return value;
  const out = {};
  for (const [k, v] of Object.entries(value)) {
    if (v === null) {
      counter.nulls++;
      continue;
    }
    out[k] = stripNulls(v, counter);
  }
  return out;
}

/** v1 doc -> v2 doc ready to store, plus per-doc notes for the stats. */
function buildV2(type, v1, now) {
  const counter = { nulls: 0 };
  const cleaned = stripNulls(v1, counter);
  const { doc, unmapped } = upgradeV1toV2(type, cleaned);
  const notes = { nulls: counter.nulls, createdAtBackfilled: false, updatedAtBackfilled: false, sourcesDefaulted: false };
  // Deletion tombstones carry no entity data — keep them exactly as upgraded, no timestamps.
  if (tombstoneSchema.safeParse(doc).success) return { doc, unmapped, notes };
  if (doc.createdAt === undefined) {
    doc.createdAt = now;
    notes.createdAtBackfilled = true;
  }
  if (doc.updatedAt === undefined) {
    doc.updatedAt = doc.createdAt;
    notes.updatedAtBackfilled = true;
  }
  if (type === 'PRODUCT_LIST' && doc.sources === undefined) {
    doc.sources = [];
    notes.sourcesDefaulted = true;
  }
  return { doc, unmapped, notes };
}

/** recipe_type_ on a v1 doc must agree with the collection it lives in (G1: collection decides). */
function recipeTypeMismatch(type, v1) {
  const t = v1.recipe_type_;
  if (t === undefined || t === null) return false;
  if (type === 'RECIPE_LIST') return t !== 'preparation';
  if (type === 'DISH_LIST') return t !== 'dish';
  return false;
}

function checkBackup(args) {
  const dir = args['backup-dir'];
  if (!dir) throw new Error('--write=yes needs --backup-dir=<snapshot dir from server/scripts/db-backup.js>');
  const manifestPath = path.join(dir, '_manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error(`No _manifest.json in ${dir}`);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const ageH = (Date.now() - Date.parse(manifest.takenAt)) / 36e5;
  if (manifest.target !== args.target) throw new Error(`Backup is for target '${manifest.target}', not '${args.target}'`);
  if (!(ageH >= 0 && ageH < 24)) throw new Error(`Backup is ${ageH.toFixed(1)}h old; take a fresh one (< 24h)`);
  console.log(`[migrate] backup OK: ${dir} (${manifest.totalDocuments} docs, taken ${manifest.takenAt})`);
}

async function plan(db, now) {
  const result = {};
  for (const [oldName, newName] of Object.entries(COLLECTION_RENAMES)) {
    const docs = await db.collection(oldName).find({}).toArray();
    const stats = {
      newName, source: docs.length, nulls: 0, createdAtBackfilled: 0, updatedAtBackfilled: 0,
      sourcesDefaulted: 0, typeMismatch: 0, unmapped: new Map(), invalid: 0, violations: new Map(),
      samples: [],
    };
    const out = [];
    const bad = [];
    for (const v1 of docs) {
      const { doc, unmapped, notes } = buildV2(oldName, v1, now);
      stats.nulls += notes.nulls;
      if (notes.createdAtBackfilled) stats.createdAtBackfilled++;
      if (notes.updatedAtBackfilled) stats.updatedAtBackfilled++;
      if (notes.sourcesDefaulted) stats.sourcesDefaulted++;
      if (recipeTypeMismatch(oldName, v1)) stats.typeMismatch++;
      for (const u of unmapped) stats.unmapped.set(u, (stats.unmapped.get(u) || 0) + 1);
      const parsed = parseV2(oldName, doc);
      if (parsed.success) {
        out.push(doc);
        if (stats.samples.length < SAMPLES) stats.samples.push(doc._id);
      } else {
        stats.invalid++;
        bad.push(v1._id);
        for (const i of parsed.issues) {
          const key = `${i.path || '(root)'} :: ${i.message}`;
          stats.violations.set(key, (stats.violations.get(key) || 0) + 1);
        }
      }
    }
    result[oldName] = { stats, out, bad };
  }
  return result;
}

function printReport(result) {
  let invalidTotal = 0;
  for (const [oldName, { stats }] of Object.entries(result)) {
    invalidTotal += stats.invalid;
    console.log(`\n== ${oldName} -> ${stats.newName}: ${stats.source} source docs, ${stats.source - stats.invalid} valid, ${stats.invalid} invalid`);
    console.log(`   nulls stripped: ${stats.nulls} | createdAt backfilled: ${stats.createdAtBackfilled} | updatedAt backfilled: ${stats.updatedAtBackfilled}` +
      (oldName === 'PRODUCT_LIST' ? ` | sources defaulted to []: ${stats.sourcesDefaulted}` : ''));
    if (stats.typeMismatch) console.log(`   WARNING recipe_type_ disagrees with the collection on ${stats.typeMismatch} doc(s) (collection wins)`);
    for (const [k, n] of [...stats.unmapped].sort()) console.log(`   UNMAPPED ${k} x${n}`);
    for (const [k, n] of [...stats.violations].sort((a, b) => b[1] - a[1])) console.log(`   INVALID x${n} ${k}`);
    if (stats.samples.length) console.log(`   sample ids: ${stats.samples.join(', ')}`);
  }
  console.log(`\n[migrate] ${invalidTotal} invalid doc(s) in total`);
  return invalidTotal;
}

async function write(db, args, result) {
  checkBackup(args);
  const markers = db.collection('migrations');
  if (await markers.findOne({ _id: MIGRATION_ID }) && args.force !== 'yes') {
    throw new Error(`${MIGRATION_ID} was already applied; refusing to re-run without --force=yes`);
  }
  const invalid = Object.values(result).reduce((n, r) => n + r.stats.invalid, 0);
  if (invalid && args['skip-invalid'] !== 'yes') {
    throw new Error(`${invalid} doc(s) would be invalid; fix the data/schema or pass --skip-invalid=yes (they stay only in the old collections)`);
  }
  const unmapped = Object.values(result).flatMap(r => [...r.stats.unmapped.keys()]);
  if (unmapped.length && args['allow-unmapped'] !== 'yes') {
    throw new Error(`Unmapped v1 key(s) would be dropped from the v2 copy: ${[...new Set(unmapped)].join(', ')}. Map them in shared/schemas/field-map.v1-to-v2.ts, or pass --allow-unmapped=yes to drop them on purpose`);
  }
  for (const { stats } of Object.values(result)) {
    const existing = await db.collection(stats.newName).countDocuments();
    if (existing && args.force !== 'yes') throw new Error(`${stats.newName} already has ${existing} doc(s); refusing (use --force=yes to wipe the v2 copy)`);
  }
  const written = {};
  for (const { stats, out } of Object.values(result)) {
    const target = db.collection(stats.newName);
    if (args.force === 'yes') await target.deleteMany({});
    for (let i = 0; i < out.length; i += BATCH) {
      await target.insertMany(out.slice(i, i + BATCH), { ordered: false });
    }
    written[stats.newName] = out.length;
    console.log(`[migrate] wrote ${out.length} -> ${stats.newName}`);
  }
  await markers.replaceOne({ _id: MIGRATION_ID }, { _id: MIGRATION_ID, appliedAt: new Date(), stats: written }, { upsert: true });
  console.log(`[migrate] marker stored. Now run again with --verify=yes.`);
}

const ING_KEYS = (i) => [i.referenceId ?? null, i.nameSnapshot ?? null, i.amount_ ?? i.amount ?? null, i.unit_ ?? i.unit ?? null].join('|');

async function verify(db, result) {
  let problems = 0;
  for (const [oldName, { stats, out, bad }] of Object.entries(result)) {
    const target = db.collection(stats.newName);
    const count = await target.countDocuments();
    const expected = out.length;
    if (count !== expected) {
      console.log(`MISMATCH ${stats.newName}: ${count} docs, expected ${expected}`);
      problems++;
    }
    const v2ById = new Map((await target.find({}).toArray()).map(d => [d._id, d]));
    const v1Docs = await db.collection(oldName).find({}).toArray();
    const skip = new Set(bad);
    for (const v1 of v1Docs) {
      if (skip.has(v1._id)) continue;
      const v2 = v2ById.get(v1._id);
      if (!v2) { console.log(`MISSING ${stats.newName} ${v1._id}`); problems++; continue; }
      if (v2.schemaVersion !== 2) { console.log(`BAD VERSION ${stats.newName} ${v1._id}`); problems++; }
      if (oldName === 'RECIPE_LIST' || oldName === 'DISH_LIST') {
        const a = (v1.ingredients_ || []).map(ING_KEYS).join(';');
        const b = (v2.ingredients || []).map(ING_KEYS).join(';');
        if (a !== b) { console.log(`INGREDIENTS DIFFER ${stats.newName} ${v1._id}`); problems++; }
        if ((v1.steps_ || []).length !== (v2.steps || []).length) { console.log(`STEPS DIFFER ${stats.newName} ${v1._id}`); problems++; }
        if (v1.name_hebrew !== v2.nameHebrew) { console.log(`NAME DIFFERS ${stats.newName} ${v1._id}`); problems++; }
      } else if (oldName === 'PRODUCT_LIST') {
        if ((v1.sources_ || []).length !== (v2.sources || []).length) { console.log(`SOURCES DIFFER ${stats.newName} ${v1._id}`); problems++; }
        if (v1.name_hebrew !== v2.nameHebrew) { console.log(`NAME DIFFERS ${stats.newName} ${v1._id}`); problems++; }
      }
    }
    console.log(`[verify] ${stats.newName}: ${count} docs checked`);
  }
  if (problems) {
    console.log(`\n[verify] FAILED: ${problems} problem(s)`);
    process.exit(1);
  }
  console.log('\n[verify] OK: counts match and every recipe/dish ingredient (reference, name, amount, unit) is identical.');
}

async function main() {
  const args = parseArgs(process.argv, { write: 1, verify: 1, force: 1, 'skip-invalid': 1, 'backup-dir': 1, 'allow-unmapped': 1 });
  const { client, db } = await connect(args);
  try {
    const result = await plan(db, Date.now());
    if (args.verify === 'yes') return await verify(db, result);
    const invalid = printReport(result);
    if (args.write === 'yes') await write(db, args, result);
    else console.log(`\n[migrate] DRY RUN — nothing written. ${invalid ? 'Resolve the invalid docs above before --write.' : 'Ready for --write once you approve.'}`);
  } finally {
    await client.close();
  }
}

module.exports = { buildV2, checkBackup };

if (require.main === module) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
