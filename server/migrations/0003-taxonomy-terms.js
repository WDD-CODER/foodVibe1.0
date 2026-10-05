'use strict';
/**
 * 0003-taxonomy-terms.js — Plan 321 Phase 3 (P3.2).
 *
 * Explodes the single-doc registries (`{ items }`, `{ units }`, `{ categories, preparations }`)
 * into one `taxonomyTerms` doc per term. Registry order becomes `sortOrder`.
 *
 * - Master registries (`userId: '__master__'`) become master terms, all of them.
 * - A user's registry copy contributes ONLY the keys master doesn't have (the per-user copies are
 *   an artifact of the clone model). A user term that exists in master but carries different
 *   data (color, triggers, gram rate, fields, category) is REPORTED, not migrated.
 * - Near-duplicate keys inside one kind (same key after lowercasing and dropping `_ - space`)
 *   are REPORTED, never merged — merging is a Phase 4 decision.
 * - The old registry collections are left untouched (dropped in P3.5 after verify + smoke).
 *
 * `_id` is `${kind}:${userId}:${key}`, so re-running the write is idempotent.
 *
 * Modes (all need --target=local|atlas; Atlas also needs --confirm-host=<member host>):
 *   (default)       dry run: counts, dropped/differing user terms, near-duplicates, invalid terms.
 *   --write=yes     upsert terms + unique index. Needs --backup-dir=<fresh db-backup.js snapshot>.
 *   --verify=yes    every term is valid and every master registry entry has its term.
 */

const { parseArgs, connect } = require('./tools/_connect');
const { parseV2 } = require('../utils/schema-check');
const { checkBackup } = require('./0001-v2-schema');

const MIGRATION_ID = '0003-taxonomy-terms';
const TARGET = 'taxonomyTerms';
const MASTER = '__master__';

/** Kind-specific fields (compared when a user term shadows a master term). */
const EXTRA_FIELDS = ['color', 'autoTriggers', 'gramRate', 'fields', 'categoryKey'];

const strings = (items, kind) =>
  (Array.isArray(items) ? items : []).map(key => ({ kind, key: typeof key === 'string' ? key.trim() : key }));

const keyed = (items, kind, pick) =>
  (Array.isArray(items) ? items : []).map(it => ({ kind, key: typeof it?.key === 'string' ? it.key.trim() : it?.key, ...pick(it ?? {}) }));

const defined = obj => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));

/** One registry doc -> its terms (without base fields), in registry order. */
const EXPLODE = {
  KITCHEN_CATEGORIES: doc => strings(doc.items, 'ingredientCategory'),
  KITCHEN_ALLERGENS: doc => strings(doc.items, 'allergen'),
  KITCHEN_LABELS: doc => keyed(doc.items, 'label', it => defined({ color: it.color, autoTriggers: it.autoTriggers })),
  KITCHEN_COURSES: doc => keyed(doc.items, 'course', it => defined({ color: it.color })),
  MENU_TYPES: doc => keyed(doc.items, 'menuType', it => defined({ fields: it.fields })),
  MENU_EVENT_TYPES: doc => strings(doc.items, 'eventType'),
  MENU_SECTION_CATEGORIES: doc => strings(doc.items, 'sectionCategory'),
  EQUIPMENT_CUSTOM_CATEGORIES: doc => strings(doc.items, 'equipmentCategory'),
  KITCHEN_UNITS: doc =>
    Object.entries(doc.units && typeof doc.units === 'object' ? doc.units : {}).map(([key, gramRate]) => ({ kind: 'unit', key, gramRate })),
  KITCHEN_PREPARATIONS: doc => [
    ...strings(doc.categories, 'prepCategory'),
    // defined(): an uncategorized preparation omits categoryKey (undefined would be stored as null).
    ...(Array.isArray(doc.preparations) ? doc.preparations : []).map(p => defined({
      kind: 'preparation',
      key: typeof p?.name === 'string' ? p.name.trim() : p?.name,
      categoryKey: typeof p?.category === 'string' && p.category.trim() !== '' ? p.category.trim() : undefined,
    })),
  ],
};

const termId = (kind, userId, key) => `${kind}:${userId}:${key}`;

const content = doc => {
  const { _id, createdAt, updatedAt, ...rest } = doc;
  return JSON.stringify(rest);
};

/**
 * An owner can hold several docs in one registry (repeated seeding left up to 15 master copies).
 * The app reads only the first one returned (`registries[0]`), so that one is the live registry.
 * Extra copies are skipped; the ones whose content differs from the live doc are reported.
 */
function liveDocs(coll, docs, report) {
  const live = new Map(); // userId -> first doc
  for (const doc of docs) {
    const first = live.get(doc.userId);
    if (!first) { live.set(doc.userId, doc); continue; }
    report.extraDocs.push({ coll, owner: doc.userId, id: String(doc._id), differs: content(doc) !== content(first) });
  }
  return [...live.values()];
}
const normalize = key => String(key).toLowerCase().replace(/[\s_-]+/g, '');
const sameExtras = (a, b) => EXTRA_FIELDS.every(f => JSON.stringify(a[f]) === JSON.stringify(b[f]));

/**
 * Pure planning step: registry docs -> term docs + report.
 * @param {Record<string, object[]>} registries  v1 collection name -> its docs
 */
function buildTerms(registries, now) {
  const terms = [];
  const report = { dropped: [], differs: [], duplicates: [], invalid: [], skipped: [], nearDuplicates: [], extraDocs: [] };
  const masterByKind = new Map(); // `${kind}:${key}` -> raw master term

  const toDoc = (raw, userId, sortOrder) => ({
    _id: termId(raw.kind, userId, raw.key),
    schemaVersion: 2,
    userId,
    createdAt: now,
    updatedAt: now,
    sortOrder,
    ...raw,
  });

  const emit = (coll, doc, raws) => {
    const seen = new Set();
    const order = new Map(); // per-kind sortOrder counter
    for (const raw of raws) {
      if (typeof raw.key !== 'string' || raw.key === '') {
        report.invalid.push({ coll, owner: doc.userId, key: raw.key, issues: ['empty or non-string key'] });
        continue;
      }
      const id = termId(raw.kind, doc.userId, raw.key);
      if (seen.has(id)) { report.duplicates.push({ coll, owner: doc.userId, kind: raw.kind, key: raw.key }); continue; }
      seen.add(id);
      const sortOrder = order.get(raw.kind) ?? 0;
      order.set(raw.kind, sortOrder + 1);
      const term = toDoc(raw, doc.userId, sortOrder);
      const parsed = parseV2(TARGET, term);
      if (!parsed.success) {
        report.invalid.push({ coll, owner: doc.userId, key: raw.key, issues: parsed.issues.map(i => `${i.path || '(root)'} :: ${i.message}`) });
        continue;
      }
      terms.push(term);
    }
  };

  // Master first, so user copies can be compared against it.
  for (const [coll, docs] of Object.entries(registries)) {
    for (const doc of liveDocs(coll, docs.filter(d => d.userId === MASTER), report)) {
      const raws = EXPLODE[coll](doc);
      for (const raw of raws) masterByKind.set(`${raw.kind}:${raw.key}`, raw);
      emit(coll, doc, raws);
    }
  }

  for (const [coll, docs] of Object.entries(registries)) {
    for (const doc of docs.filter(d => d.userId !== MASTER && (typeof d.userId !== 'string' || d.userId === ''))) {
      report.skipped.push({ coll, id: doc._id, reason: 'no userId' });
    }
    const owned = docs.filter(d => d.userId !== MASTER && typeof d.userId === 'string' && d.userId !== '');
    for (const doc of liveDocs(coll, owned, report)) {
      const own = [];
      for (const raw of EXPLODE[coll](doc)) {
        const master = masterByKind.get(`${raw.kind}:${raw.key}`);
        if (!master) { own.push(raw); continue; }
        if (sameExtras(raw, master)) report.dropped.push({ owner: doc.userId, kind: raw.kind, key: raw.key });
        else report.differs.push({ owner: doc.userId, kind: raw.kind, key: raw.key, user: raw, master });
      }
      emit(coll, doc, own);
    }
  }

  // Near-duplicates within one kind and one owner scope (master + that user's own terms).
  const groups = new Map();
  for (const t of terms) {
    const g = `${t.kind}|${t.userId}|${normalize(t.key)}`;
    groups.set(g, [...(groups.get(g) ?? []), t.key]);
    if (t.userId !== MASTER) {
      const m = `${t.kind}|${MASTER}|${normalize(t.key)}`;
      if (groups.has(m)) report.nearDuplicates.push({ kind: t.kind, owner: t.userId, keys: [...groups.get(m), t.key] });
    }
  }
  for (const [g, keys] of groups) if (keys.length > 1) report.nearDuplicates.push({ kind: g.split('|')[0], owner: g.split('|')[1], keys });

  return { terms, report };
}

async function loadRegistries(db) {
  const registries = {};
  // Same filter and order as GET /api/v1/data/:type (no sort; tombstones excluded), so the first doc per owner is the one the app reads.
  for (const coll of Object.keys(EXPLODE)) registries[coll] = await db.collection(coll).find({ _userDeleted: { $ne: true } }).toArray();
  return registries;
}

function printReport({ terms, report }, registries) {
  for (const [coll, docs] of Object.entries(registries)) {
    const masters = docs.filter(d => d.userId === MASTER).length;
    console.log(`${coll}: ${docs.length} doc(s) (${masters} master)`);
  }
  const byKind = {};
  for (const t of terms) {
    byKind[t.kind] = byKind[t.kind] ?? { master: 0, user: 0 };
    byKind[t.kind][t.userId === MASTER ? 'master' : 'user']++;
  }
  console.log('\nTerms to write by kind:');
  for (const [kind, c] of Object.entries(byKind)) console.log(`  ${kind}: ${c.master} master, ${c.user} user-only`);
  const differingExtras = report.extraDocs.filter(e => e.differs);
  console.log(`\nExtra registry docs skipped (only the first doc per owner is live): ${report.extraDocs.length}, ${differingExtras.length} with different content`);
  for (const e of differingExtras) console.log(`  EXTRA-DIFFERS ${e.coll} owner=${e.owner} doc=${e.id}`);
  console.log(`User copies of master terms dropped (identical): ${report.dropped.length}`);
  console.log(`User copies that DIFFER from master (not migrated, review): ${report.differs.length}`);
  for (const d of report.differs) console.log(`  DIFFERS ${d.kind} '${d.key}' user=${d.owner}: user ${JSON.stringify(d.user)} vs master ${JSON.stringify(d.master)}`);
  for (const d of report.duplicates) console.log(`  DUPLICATE ${d.coll} ${d.kind} '${d.key}' owner=${d.owner} (kept first)`);
  for (const s of report.skipped) console.log(`  SKIPPED ${s.coll} ${s.id}: ${s.reason}`);
  console.log(`Near-duplicate key groups (report only, see .claude/reports/label-audit/report.md): ${report.nearDuplicates.length}`);
  for (const n of report.nearDuplicates) console.log(`  NEAR ${n.kind} owner=${n.owner}: ${n.keys.join(' | ')}`);
  for (const i of report.invalid) console.log(`  INVALID ${i.coll} owner=${i.owner} '${i.key}': ${i.issues.join('; ')}`);
  console.log(`\n[migrate] ${terms.length} term(s), ${report.invalid.length} invalid`);
}

async function write(db, args, { terms, report }) {
  checkBackup(args);
  if (report.invalid.length && args['skip-invalid'] !== 'yes') {
    throw new Error(`${report.invalid.length} term(s) are invalid; resolve or pass --skip-invalid=yes (they are left out)`);
  }
  const coll = db.collection(TARGET);
  for (const t of terms) await coll.replaceOne({ _id: t._id }, t, { upsert: true });
  await coll.createIndex({ kind: 1, key: 1, userId: 1 }, { unique: true, name: 'kind_key_user_unique' });
  await coll.createIndex({ userId: 1, kind: 1, sortOrder: 1 }, { name: 'user_kind_order' });
  await db.collection('migrations').replaceOne(
    { _id: MIGRATION_ID },
    { _id: MIGRATION_ID, appliedAt: new Date(), terms: terms.length, differs: report.differs.length },
    { upsert: true },
  );
  console.log(`[migrate] wrote ${terms.length} term(s) to ${TARGET}. Now run again with --verify=yes.`);
}

async function verify(db) {
  let bad = 0;
  const stored = await db.collection(TARGET).find({}).toArray();
  const ids = new Set(stored.map(t => t._id));
  for (const t of stored) if (!parseV2(TARGET, t).success) { console.log(`INVALID ${t._id}`); bad++; }
  const { terms } = buildTerms(await loadRegistries(db), Date.now());
  for (const t of terms.filter(x => x.userId === MASTER)) if (!ids.has(t._id)) { console.log(`MISSING ${t._id}`); bad++; }
  const indexes = await db.collection(TARGET).indexes();
  if (!indexes.some(i => i.name === 'kind_key_user_unique')) { console.log('MISSING unique index kind_key_user_unique'); bad++; }
  if (bad) { console.log(`[verify] FAILED: ${bad} problem(s)`); process.exit(1); }
  console.log(`[verify] OK: ${stored.length} valid term(s); every master registry entry has its term.`);
}

async function main() {
  const args = parseArgs(process.argv, { write: 1, verify: 1, 'skip-invalid': 1, 'backup-dir': 1 });
  const { client, db } = await connect(args);
  try {
    if (args.verify === 'yes') return await verify(db);
    const registries = await loadRegistries(db);
    const result = buildTerms(registries, Date.now());
    printReport(result, registries);
    if (args.write === 'yes') await write(db, args, result);
    else console.log('[migrate] DRY RUN — nothing written.');
  } finally {
    await client.close();
  }
}

module.exports = { buildTerms, EXPLODE };

if (require.main === module) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
