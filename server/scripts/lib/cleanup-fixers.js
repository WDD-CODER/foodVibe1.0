'use strict';
/**
 * Plan 403 — the fixers behind server/scripts/cleanup-legacy-data.js, kept apart from the
 * CLI so the tests can run each one against an in-memory database.
 *
 * Every fixer has the same shape: `async (db, opts) => { rows, apply }`.
 *   rows  — what it found: [{ collection, count, note? }] (the dry-run table)
 *   apply — async () => void, writes the fix; only called with --apply
 * Each fixer matches only what is still wrong, so a second run finds 0 (idempotent).
 */

const { ObjectId } = require('mongodb');
const { ALL_USER_ENTITY_TYPES } = require('../../constants/collections');
const { hasSchema, checkDoc } = require('../../utils/schema-check');
const { REGISTRY_COLLECTIONS } = require('../../migrations/0004-drop-registry-collections');
const { TERM_REFERENCES } = require('../../generated/schemas/entities/taxonomy-term.schema');

const MASTER = '__master__';
const isNull = { $type: 'null' };
const EMPTY_NAME = '(empty)';

/** Approved discard list (Human, 2026-10-10 — plan 403 "Approved discard list"). Exact names. */
const DISCARD_ITEMS = {
  recipes: [
    'בדיקה בדיקה 333', 'בדיקה חדש חדש', 'נסיון נוסף', 'Dish 1', 'a1', 'ניסיון חדש באמת 2',
    'ניסיון חדש באמת רק לי 3', 'ניסיון חדש לכולם 1', 'חדש ניסיון 1', 'חדש ניסיון 2', 'חדש ניסיון לכולם',
    'חדש ניסיון עבורי', 'חדש ניסיון רק לי', 'חדש ניסיון רק ליוזר', 'ממש חדש', 'ממש חדש (עותק)', 'אדמין אלרגן', EMPTY_NAME,
  ],
  dishes: ['אלרגן בדיקה', 'אלרגן בדיקה1', EMPTY_NAME],
  products: [
    'AUDIT-quick-test1', 'testdebugfix04', 'testdebugfix06', 'מוצר בדיקה/', 'מוצר בדיקה הוספה',
    'מוצר ניסיון 1', 'מוצר ניסיון 2', 'מוצר ניסיון 3', 'טסט 1', 'ניסיון 1;', 'ניסיון 2',
    'שמיר חדש בדיקה נועם', 'שמיר חדש בדיקה 2', 'חלב שקדים עזים טסט', 'חציל יפני ירוק טסט', 'אלרגן1', EMPTY_NAME,
  ],
  suppliers: ['kjh', 'gsf', 'ss', 'scac', 'א', 'ספק בדיקה 341', 'ספק בדיקה ב 341', EMPTY_NAME],
  venues: ['ccc'],
};

const DISCARD_TERMS = [
  { kind: 'ingredientCategory', key: 'dddd' },
  { kind: 'ingredientCategory', key: 'aaa' },
  { kind: 'allergen', key: 'ccc' },
  { kind: 'label', key: 'new' },
  { kind: 'label', key: 'aaaa' },
  { kind: 'eventType', key: 'חח' },
  { kind: 'sectionCategory', key: 'new' },
];

/** Test accounts by `users.name`, per target. Atlas deletion is also gated by A0b (see fixUsers). */
const DISCARD_USERS = {
  local: ['test1', 'ddd', 'qa369'],
  atlas: ['hhhh', 'dan', 'danw', 'dan11'],
};

const TRASH_OF = { recipes: 'TRASH_RECIPES', dishes: 'TRASH_DISHES', products: 'TRASH_PRODUCTS', venues: 'TRASH_VENUES' };
const HISTORY_TYPE = { recipes: 'recipe', dishes: 'dish', products: 'product' };
const TRASH_COLLECTIONS = ALL_USER_ENTITY_TYPES.filter(n => n.startsWith('TRASH_'));

async function exists(db, name) {
  return (await db.listCollections({ name }, { nameOnly: true }).toArray()).length > 0;
}

// ---------------------------------------------------------------------------
// F1 — stored `logistics: null` (schema 400 on every PUT; breaks trash/version restore).
// ---------------------------------------------------------------------------
async function fixNullLogistics(db) {
  const targets = [
    ...['recipes', 'dishes', 'TRASH_RECIPES', 'TRASH_DISHES'].map(c => ({ collection: c, path: 'logistics' })),
    { collection: 'VERSION_HISTORY', path: 'snapshot.logistics' },
  ];
  const rows = [];
  for (const t of targets) {
    rows.push({ ...t, count: await db.collection(t.collection).countDocuments({ [t.path]: isNull }) });
  }
  return {
    rows: rows.map(({ collection, path, count }) => ({ collection, count, note: path })),
    apply: async () => {
      for (const t of targets) await db.collection(t.collection).updateMany({ [t.path]: isNull }, { $unset: { [t.path]: '' } });
    },
  };
}

// ---------------------------------------------------------------------------
// F2 — `_masterId: null` in TRASH_* (the schema has `_masterId` as an optional string).
// ---------------------------------------------------------------------------
async function fixNullMasterIdInTrash(db) {
  const rows = [];
  for (const collection of TRASH_COLLECTIONS) {
    rows.push({ collection, count: await db.collection(collection).countDocuments({ _masterId: isNull }) });
  }
  return {
    rows,
    apply: async () => {
      for (const collection of TRASH_COLLECTIONS) {
        await db.collection(collection).updateMany({ _masterId: isNull }, { $unset: { _masterId: '' } });
      }
    },
  };
}

// ---------------------------------------------------------------------------
// F3 — missing (or null) createdAt / updatedAt on schema-checked collections.
// createdAt = an ObjectId _id's time, else updatedAt, else now; updatedAt = createdAt.
// ---------------------------------------------------------------------------
function backfillTimes(doc, now) {
  const fromId = doc._id instanceof ObjectId ? doc._id.getTimestamp().getTime() : null;
  const createdAt = typeof doc.createdAt === 'number' ? doc.createdAt
    : fromId ?? (typeof doc.updatedAt === 'number' ? doc.updatedAt : now);
  const updatedAt = typeof doc.updatedAt === 'number' ? doc.updatedAt : createdAt;
  return { createdAt, updatedAt };
}

async function fixMissingTimestamps(db, { now = Date.now() } = {}) {
  const filter = { _userDeleted: { $ne: true }, $or: [{ createdAt: null }, { updatedAt: null }] };
  const found = [];
  for (const collection of ALL_USER_ENTITY_TYPES.filter(hasSchema)) {
    const docs = await db.collection(collection).find(filter).project({ _id: 1, createdAt: 1, updatedAt: 1 }).toArray();
    found.push({ collection, docs });
  }
  return {
    rows: found.map(({ collection, docs }) => ({ collection, count: docs.length })),
    apply: async () => {
      for (const { collection, docs } of found) {
        if (!docs.length) continue;
        await db.collection(collection).bulkWrite(docs.map(d => ({
          updateOne: { filter: { _id: d._id }, update: { $set: backfillTimes(d, now) } },
        })));
      }
    },
  };
}

// ---------------------------------------------------------------------------
// F4 — logistics.baseline[] entries whose equipmentId matches no equipment doc (any owner).
// ---------------------------------------------------------------------------
async function fixDanglingEquipment(db) {
  const known = new Set((await db.collection('equipment').find({}).project({ _id: 1 }).toArray()).map(e => String(e._id)));
  const found = [];
  for (const collection of ['recipes', 'dishes']) {
    const docs = await db.collection(collection)
      .find({ 'logistics.baseline.equipmentId': { $exists: true } })
      .project({ _id: 1, 'logistics.baseline': 1 }).toArray();
    const fixes = [];
    let entries = 0;
    for (const d of docs) {
      const keep = d.logistics.baseline.filter(b => known.has(String(b.equipmentId)));
      if (keep.length === d.logistics.baseline.length) continue;
      entries += d.logistics.baseline.length - keep.length;
      fixes.push({ _id: d._id, keep });
    }
    found.push({ collection, fixes, entries });
  }
  return {
    rows: found.map(({ collection, fixes, entries }) => ({ collection, count: fixes.length, note: `${entries} entr(ies)` })),
    apply: async () => {
      for (const { collection, fixes } of found) {
        if (!fixes.length) continue;
        await db.collection(collection).bulkWrite(fixes.map(f => ({
          updateOne: { filter: { _id: f._id }, update: { $set: { 'logistics.baseline': f.keep } } },
        })));
      }
    },
  };
}

// ---------------------------------------------------------------------------
// F5 — drop the v1 registry collections migration 0004 dropped, when they came back empty.
// A non-empty one is reported, never dropped.
// ---------------------------------------------------------------------------
async function fixEmptyRegistryCollections(db) {
  const rows = [];
  const drop = [];
  for (const collection of REGISTRY_COLLECTIONS) {
    if (!await exists(db, collection)) continue;
    const docs = await db.collection(collection).countDocuments();
    const indexes = (await db.collection(collection).indexes()).map(i => i.name).join(',');
    if (docs === 0) drop.push(collection);
    rows.push({ collection, count: docs === 0 ? 1 : 0, note: docs === 0 ? `empty, indexes: ${indexes}` : `NOT EMPTY (${docs} docs) — left alone` });
  }
  return {
    rows,
    apply: async () => {
      for (const collection of drop) {
        if (await db.collection(collection).countDocuments() === 0) await db.collection(collection).drop();
      }
    },
  };
}

// ---------------------------------------------------------------------------
// F6 — approved test items, by exact name + collection, master and every user copy, plus
// their TRASH_* copies and VERSION_HISTORY entries. Refuses while a doc that stays still
// points at one of them (it would be left with a dangling reference).
// ---------------------------------------------------------------------------
function nameFilter(names) {
  const exact = names.filter(n => n !== EMPTY_NAME);
  const or = [{ nameHebrew: { $in: exact } }];
  // Tombstones carry no name, so `$type: 'string'` keeps them out of the (empty) match.
  if (names.includes(EMPTY_NAME)) or.push({ nameHebrew: { $type: 'string', $regex: /^\s*$/ }, _userDeleted: { $ne: true } });
  return { $or: or };
}

/** One query path per TERM_REFERENCES entry (`categories[]` -> `categories`). */
const termPaths = kind => Object.entries(TERM_REFERENCES[kind] ?? {})
  .flatMap(([collection, paths]) => paths.map(p => ({ collection, path: p.replace(/\[\]$/, '') })));

async function fixTestItems(db, { ignoreUserIds = [] } = {}) {
  const found = {};
  const rows = [];
  const doomed = {};
  for (const [collection, names] of Object.entries(DISCARD_ITEMS)) {
    const filter = nameFilter(names);
    const live = await db.collection(collection).find(filter).project({ _id: 1, nameHebrew: 1, userId: 1 }).toArray();
    const trash = TRASH_OF[collection]
      ? await db.collection(TRASH_OF[collection]).find(filter).project({ _id: 1 }).toArray()
      : [];
    const ids = [...live, ...trash].map(d => d._id);
    const history = HISTORY_TYPE[collection]
      ? await db.collection('VERSION_HISTORY').find({
        entityType: HISTORY_TYPE[collection],
        $or: [{ entityId: { $in: ids.map(String) } }, { 'snapshot.nameHebrew': { $in: names.filter(n => n !== EMPTY_NAME) } }],
      }).project({ _id: 1 }).toArray()
      : [];
    found[collection] = { live, trash, history };
    doomed[collection] = live.map(d => d._id);
    rows.push({ collection, count: live.length, note: `+${trash.length} trash, +${history.length} history` });
  }

  const terms = [];
  for (const t of DISCARD_TERMS) {
    terms.push(...await db.collection('taxonomyTerms').find(t).project({ _id: 1, userId: 1, kind: 1, key: 1 }).toArray());
  }
  rows.push({ collection: 'taxonomyTerms', count: terms.length, note: DISCARD_TERMS.map(t => `${t.kind}:${t.key}`).join(' ') });

  // Referrers that stay behind: a recipe/dish ingredient, a menu item, a product source, or a
  // term key still stored on a document. Docs that are themselves deleted (on the list, or
  // owned by a test user F7 removes) don't count.
  const staying = collection => ({
    _id: { $nin: doomed[collection] ?? [] },
    userId: { $nin: ignoreUserIds },
    _userDeleted: { $ne: true },
  });
  const recipeIds = [...doomed.recipes, ...doomed.dishes].map(String);
  const refChecks = [
    { collection: 'recipes', path: 'ingredients.referenceId', values: [...doomed.products.map(String), ...recipeIds] },
    { collection: 'dishes', path: 'ingredients.referenceId', values: [...doomed.products.map(String), ...recipeIds] },
    { collection: 'menuEvents', path: 'sections.items.recipeId', values: recipeIds },
    { collection: 'products', path: 'sources.supplierId', values: doomed.suppliers.map(String) },
  ];
  const blockers = [];
  for (const r of refChecks) {
    if (!r.values.length) continue;
    const docs = await db.collection(r.collection).find({ [r.path]: { $in: r.values }, ...staying(r.collection) })
      .project({ nameHebrew: 1, userId: 1 }).toArray();
    for (const d of docs) blockers.push(`${r.collection} '${d.nameHebrew}' (${d.userId}) uses a test item via ${r.path}`);
  }
  for (const term of terms) {
    for (const { collection, path } of termPaths(term.kind)) {
      const owner = term.userId === MASTER ? {} : { userId: term.userId };
      const users = await db.collection(collection).find({ $and: [staying(collection), owner, { [path]: term.key }] })
        .project({ nameHebrew: 1, userId: 1 }).toArray();
      for (const d of users) blockers.push(`term ${term.kind}:'${term.key}' (${term.userId}) still on ${collection} '${d.nameHebrew}' (${d.userId}) via ${path}`);
    }
  }

  return {
    rows,
    blockers,
    touchesMaster: Object.values(found).some(f => f.live.some(d => d.userId === MASTER)),
    apply: async () => {
      if (blockers.length) throw new Error(`F6 refused: ${blockers.length} doc(s) that stay still point at a test item`);
      for (const [collection, f] of Object.entries(found)) {
        if (f.live.length) await db.collection(collection).deleteMany({ _id: { $in: f.live.map(d => d._id) } });
        if (f.trash.length) await db.collection(TRASH_OF[collection]).deleteMany({ _id: { $in: f.trash.map(d => d._id) } });
        if (f.history.length) await db.collection('VERSION_HISTORY').deleteMany({ _id: { $in: f.history.map(d => d._id) } });
      }
      if (terms.length) await db.collection('taxonomyTerms').deleteMany({ _id: { $in: terms.map(t => t._id) } });
    },
  };
}

// ---------------------------------------------------------------------------
// F7 — approved test users and every doc carrying their userId.
// On Atlas the list is every account, so it also needs `allowAtlasUsers` (A0b: the Human's
// real account exists and is admin) and refuses unless an admin outside the list remains.
// ---------------------------------------------------------------------------
async function fixTestUsers(db, { target, allowAtlasUsers = false } = {}) {
  const names = DISCARD_USERS[target] ?? [];
  const users = await db.collection('users').find({ name: { $in: names } }).project({ _id: 1, name: 1, role: 1 }).toArray();
  const ids = users.map(u => String(u._id));
  const rows = [{ collection: 'users', count: users.length, note: users.map(u => `${u.name}${u.role === 'admin' ? '(admin)' : ''}`).join(' ') }];
  for (const collection of ALL_USER_ENTITY_TYPES) {
    const n = ids.length ? await db.collection(collection).countDocuments({ userId: { $in: ids } }) : 0;
    if (n) rows.push({ collection, count: n, note: 'owned by test users' });
  }
  const adminsLeft = await db.collection('users').countDocuments({ role: 'admin', name: { $nin: names } });
  const blockers = [];
  if (target === 'atlas' && users.length && !allowAtlasUsers) blockers.push('Atlas users: pass --allow-atlas-users only after A0b (real admin account confirmed)');
  if (target === 'atlas' && users.length && adminsLeft === 0) blockers.push('Atlas users: no admin would remain — run --promote-admin=<name> first (A0b)');
  return {
    rows,
    blockers,
    userIds: ids,
    apply: async () => {
      if (blockers.length) throw new Error(`F7 refused: ${blockers.join('; ')}`);
      if (!ids.length) return;
      for (const collection of ALL_USER_ENTITY_TYPES) await db.collection(collection).deleteMany({ userId: { $in: ids } });
      await db.collection('users').deleteMany({ _id: { $in: users.map(u => u._id) } });
    },
  };
}

// ---------------------------------------------------------------------------
// Report only (plan rows 5–6): dangling ingredient and menu references. No write.
// ---------------------------------------------------------------------------
async function reportDanglingRefs(db) {
  const idsOf = async c => new Set((await db.collection(c).find({}).project({ _id: 1 }).toArray()).map(d => String(d._id)));
  const products = await idsOf('products');
  const recipes = new Set([...await idsOf('recipes'), ...await idsOf('dishes')]);
  const lines = [];
  for (const collection of ['recipes', 'dishes']) {
    const docs = await db.collection(collection).find({ 'ingredients.referenceId': { $exists: true }, _userDeleted: { $ne: true } })
      .project({ nameHebrew: 1, userId: 1, ingredients: 1 }).toArray();
    for (const d of docs) {
      for (const ing of d.ingredients ?? []) {
        if (!ing.referenceId) continue;
        const pool = ing.type === 'recipe' ? recipes : ing.type === 'product' ? products : new Set([...products, ...recipes]);
        if (!pool.has(String(ing.referenceId))) lines.push(`${collection} · '${d.nameHebrew}' · ${d.userId} · ingredient ${ing.referenceId} (${ing.nameSnapshot ?? '?'})`);
      }
    }
  }
  const events = await db.collection('menuEvents').find({ 'sections.items.recipeId': { $exists: true }, _userDeleted: { $ne: true } })
    .project({ nameHebrew: 1, name: 1, userId: 1, sections: 1 }).toArray();
  for (const e of events) {
    for (const s of e.sections ?? []) {
      for (const item of s.items ?? []) {
        if (item.recipeId && !recipes.has(String(item.recipeId))) lines.push(`menuEvents · '${e.nameHebrew ?? e.name ?? e._id}' · ${e.userId} · recipeId ${item.recipeId}`);
      }
    }
  }
  return lines;
}

/** P1 — the full schema check (same as validate-all): invalid docs per schema-checked collection. */
async function schemaSummary(db) {
  const out = [];
  for (const collection of ALL_USER_ENTITY_TYPES.filter(hasSchema)) {
    const docs = await db.collection(collection).find({}).toArray();
    out.push({ collection, docs: docs.length, invalid: docs.filter(d => checkDoc(collection, d).issues.length).length });
  }
  return out;
}

/** A0b — make the Human's real account an admin. Returns false when no such user exists. */
async function promoteAdmin(db, name) {
  const r = await db.collection('users').updateOne({ name }, { $set: { role: 'admin' } });
  return r.matchedCount === 1;
}

/** Fixers in apply order: users first (removes their docs), then items, then shape fixes. */
const FIXERS = [
  { id: 'F7', title: 'test users + their docs', run: fixTestUsers },
  { id: 'F6', title: 'approved test items', run: fixTestItems },
  { id: 'F1', title: 'logistics: null', run: fixNullLogistics },
  { id: 'F2', title: '_masterId: null in trash', run: fixNullMasterIdInTrash },
  { id: 'F3', title: 'missing createdAt/updatedAt', run: fixMissingTimestamps },
  { id: 'F4', title: 'baseline equipment that does not exist', run: fixDanglingEquipment },
  { id: 'F5', title: 'empty v1 registry collections', run: fixEmptyRegistryCollections },
];

module.exports = {
  FIXERS, DISCARD_ITEMS, DISCARD_TERMS, DISCARD_USERS,
  fixNullLogistics, fixNullMasterIdInTrash, fixMissingTimestamps, fixDanglingEquipment,
  fixEmptyRegistryCollections, fixTestItems, fixTestUsers, reportDanglingRefs, schemaSummary, promoteAdmin,
};
