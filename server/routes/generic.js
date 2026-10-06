const { Router } = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');
const { verifyToken, optionalToken, requireAdmin } = require('../middleware/auth');
const { ALL_USER_ENTITY_TYPES } = require('../constants/all-user-entity-types');
const { SEARCHABLE_ENTITY_TYPES } = require('../constants/searchable-entity-types');
const { bumpMasterVersion } = require('../services/master-version');
const { newId: makeId } = require('../utils/id');
const { hasSchema: hasV2Schema } = require('../utils/schema-check');
const { checkStoredDoc } = require('../middleware/validate');
const { TERM_REFERENCES } = require('../generated/schemas/entities');

const router = Router();

// Write routes (POST/PUT/DELETE) require a valid JWT. Reads are public.

// Plan 321 Phase 1 — moderate rate limit on writes (POST/PUT/DELETE); reads (GET) are
// skipped since master-catalog/search reads are meant to be cheap and frequent.
// Plan 385 — the bucket is per user (verified JWT), not per IP, so users behind one IP
// don't share a budget; anonymous writes fall back to the IP. DATA_WRITE_LIMIT_MAX sets
// the budget (default 1000); 0 turns the limiter off. Never gate this on NODE_ENV —
// `npm run dev` runs as NODE_ENV=production.
const DATA_WRITE_LIMIT_MAX = Number(process.env.DATA_WRITE_LIMIT_MAX ?? 1000);

/** Bucket key: `user:<id>` for a verified Bearer token, else the IPv6-safe IP key. */
function writeLimitKey(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (token) {
    try {
      const { userId } = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      if (userId) return `user:${userId}`;
    } catch {
      // Invalid/expired token: verifyToken rejects the write anyway; bucket it by IP.
    }
  }
  return ipKeyGenerator(req.ip);
}

if (DATA_WRITE_LIMIT_MAX > 0) {
  const dataWriteLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: DATA_WRITE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: writeLimitKey,
    skip: (req) => req.method === 'GET',
    message: { error: 'Too many requests, please try again later' },
  });
  router.use(dataWriteLimiter);
}

// Only known user-data entity types may be read/written through the generic data API.
// Everything else (auth's signed-users-db/users, ai.js's GEMINI_SHOTS/GEMINI_USAGE,
// or any arbitrary string) is rejected — prevents ad-hoc collection creation.
const ALLOWED_ENTITY_TYPES = new Set(ALL_USER_ENTITY_TYPES);
router.use('/:type', (req, res, next) => {
  if (!ALLOWED_ENTITY_TYPES.has(req.params.type)) {
    return res.status(403).json({ error: 'Access to this entity type is not permitted' });
  }
  next();
});

/**
 * Returns the native MongoDB collection for the given entity type.
 * Each entity type (products, recipes, etc.) gets its own collection.
 * Documents are stored flat — no entityType wrapper, no data wrapper.
 */
function col(type) {
  return mongoose.connection.db.collection(type);
}

// ---------------------------------------------------------------------------
// Plan 321 Phase 3 — taxonomyTerms (one doc per category/label/unit/... term).
// Read live as master ∪ own: master terms are shared, a user's own docs hold only
// the terms they added. Only an admin edits shared terms (Human, 2026-10-05): POST
// with `shared: true` creates one, PUT/DELETE by id reach master terms for admins.
// Terms carry no clone-lineage fields (_masterId/_userModified) — the strict schema
// rejects them.
// ---------------------------------------------------------------------------
const TAXONOMY = 'taxonomyTerms';
const MASTER = '__master__';
const isAdmin = req => req.user?.role === 'admin';

/** userId filter for reads: taxonomy terms include master's; everything else is own-only. */
function readOwner(type, userId) {
  return type === TAXONOMY && userId !== MASTER ? { $in: [userId, MASTER] } : userId;
}

/** userId filter for writes to a term: own terms, plus master's for an admin. */
function termWriteOwner(req) {
  return isAdmin(req) ? { $in: [req.user.userId, MASTER] } : req.user.userId;
}

/** Owners whose documents a term's key reaches: everyone for a shared term, else its owner. */
const termScope = term => (term.userId === MASTER ? { $exists: true } : term.userId);

/** Splits a TERM_REFERENCES path: `labels[]` -> { field: 'labels', isList: true }. */
const refPath = p => ({ field: p.replace(/\[\]$/, ''), isList: p.endsWith('[]') });

/**
 * Documents in the term's scope that still use its key (TERM_REFERENCES), up to `limit`.
 * Deleting a used term is blocked (Human, 2026-10-05) so no document is left pointing at a
 * key that no longer exists.
 */
async function findTermReferences(term, limit = 5) {
  const refs = [];
  for (const [type, paths] of Object.entries(TERM_REFERENCES[term.kind] ?? {})) {
    if (!paths.length || refs.length >= limit) continue;
    const docs = await col(type)
      .find(
        { userId: termScope(term), _userDeleted: { $ne: true }, $or: paths.map(p => ({ [refPath(p).field]: term.key })) },
        { projection: { nameHebrew: 1, name: 1, userId: 1 } }
      )
      .limit(limit - refs.length)
      .toArray();
    for (const d of docs) refs.push({ type, _id: d._id, name: d.nameHebrew ?? d.name ?? d._id, userId: d.userId });
  }
  return refs;
}

/**
 * Renames `term.key` -> `newKey` in every document of the term's scope (TERM_REFERENCES), so
 * re-keying never strands a document on the old key. Paths: `a[]` = array of keys, `a` = one
 * key, `a.b` / `a.b.c` = one key inside (nested) arrays of objects.
 */
async function renameTermEverywhere(term, newKey) {
  for (const [type, paths] of Object.entries(TERM_REFERENCES[term.kind] ?? {})) {
    for (const p of paths) {
      const { field, isList } = refPath(p);
      const filter = { userId: termScope(term), [field]: term.key };
      const parts = field.split('.');
      if (isList) {
        await col(type).updateMany(filter, { $set: { [`${field}.$[k]`]: newKey } }, { arrayFilters: [{ k: term.key }] });
      } else if (parts.length === 1) {
        await col(type).updateMany(filter, { $set: { [field]: newKey } });
      } else {
        const leaf = parts.pop();
        const target = `${parts.map((s, i) => (i === parts.length - 1 ? `${s}.$[k]` : `${s}.$[]`)).join('.')}.${leaf}`;
        await col(type).updateMany(filter, { $set: { [target]: newKey } }, { arrayFilters: [{ [`k.${leaf}`]: term.key }] });
      }
    }
  }
}

/** 409 body for a term that is still used. */
function termInUse(term, refs) {
  return {
    error: `Term '${term.key}' is still used and cannot be removed`,
    kind: term.kind,
    key: term.key,
    referencedBy: refs,
  };
}

/** A user may not add or re-key an own term onto a key master already has for that kind. */
async function masterHasTerm(kind, key) {
  return Boolean(await col(TAXONOMY).findOne({ userId: MASTER, kind, key }, { projection: { _id: 1 } }));
}

// ---------------------------------------------------------------------------
// GET /api/v1/data/:type
// Authenticated → returns the user's own documents.
// Anonymous (no token) → returns __master__ documents (shared/public data).
// Optional ?filterEntityType=&filterEntityId= narrow the find (e.g. VERSION_HISTORY).
// ---------------------------------------------------------------------------
router.get('/:type', optionalToken, async (req, res) => {
  // 1c perf instrumentation — a `debug` event (LOG_LEVEL=debug; the default outside
  // production). JSON.stringify-ing the response purely to measure its size is real CPU on
  // a 0.1-shared-CPU Render instance, so it only runs when debug is enabled.
  const perfLog = req.log.isLevelEnabled('debug');
  try {
    const userId = req.user ? req.user.userId : '__master__';
    // Was capped at 500 (max 1000) — safe when no account had more than a few hundred
    // docs per collection. The legacy FoodComposer import (plan 300) pushed real
    // accounts past that (products/recipes/dishes now run 1,000-1,500+ docs
    // for an imported account), and the client never sends ?limit= for a full-collection
    // load — so every list fetch was silently truncated, not just for the importing user.
    // Raised well above current real-world collection sizes; still bounded (not
    // unlimited) to keep a ceiling on worst-case response size/memory for a single
    // request. gzip compression (see index.js) keeps the wire cost of a large response
    // low. Proper server-side search/pagination (so full-collection loads aren't needed
    // at all for most UI) is tracked separately — see plan 301.
    const limit = Math.min(parseInt(req.query.limit) || 20000, 20000);
    const skip = parseInt(req.query.skip) || 0;
    const filter = { userId: readOwner(req.params.type, userId), _userDeleted: { $ne: true } };
    if (req.query.filterEntityType) {
      filter.entityType = String(req.query.filterEntityType);
    }
    if (req.query.filterEntityId) {
      filter.entityId = String(req.query.filterEntityId);
    }
    const findStart = perfLog ? Date.now() : 0;
    const docs = await col(req.params.type)
      .find(filter)
      .skip(skip)
      .limit(limit)
      .toArray();
    if (perfLog) {
      const mongoMs = Date.now() - findStart;
      const serializeStart = Date.now();
      // Pre-compression byte count — what actually went over the wire before
      // compression() shrinks it is invisible to the response's content-length.
      const bytes = Buffer.byteLength(JSON.stringify(docs));
      const serializeMs = Date.now() - serializeStart;
      req.log.debug({ event: 'data.query.perf', type: req.params.type, docs: docs.length, bytes, mongoMs, serializeMs });
    }
    res.json(docs);
  } catch (err) {
    req.log.error({ err, event: 'data.query.failed' });
    res.status(500).json({ error: 'Server error' });
  }
});

// Lean field projection per searchable type — only what the typeahead components
// actually render/consume (ingredient-search.component.ts, recipe-book-list.component.ts's
// filteredProductsForIngredientSearch_) rides along; not the full document. See plan 301.
const SEARCH_PROJECTIONS = {
  products: { _id: 1, nameHebrew: 1, baseUnit: 1, purchaseOptions: 1 },
  recipes: { _id: 1, nameHebrew: 1, yieldUnit: 1 },
  dishes: { _id: 1, nameHebrew: 1, yieldUnit: 1 },
};

/** Escapes regex metacharacters so a raw query is safe to anchor into a RegExp. */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// GET /api/v1/data/:type/search?q=&limit=
// Case-insensitive prefix match on nameHebrew, restricted to SEARCHABLE_ENTITY_TYPES
// and returning only the lean projection above — the point is a tiny response
// regardless of collection size (plan 301, Milestone 1). Must be registered before
// GET /:type/:id so "search" is never swallowed as an :id.
// Mirrors filterOptionsByStartsWith's client-side semantics: Hebrew queries have no
// case, so a plain (case-sensitive) anchored regex stays index-friendly; a Latin query
// adds the 'i' flag for case-insensitive matching (Mongo can't use the index for that
// case, but Latin queries are the rare path here).
// ---------------------------------------------------------------------------
router.get('/:type/search', optionalToken, async (req, res) => {
  try {
    if (!SEARCHABLE_ENTITY_TYPES.includes(req.params.type)) {
      return res.status(403).json({ error: 'Search is not available for this entity type' });
    }
    const q = String(req.query.q || '').trim();
    if (!q) return res.json([]);

    const limit = Math.min(Math.max(parseInt(req.query.limit) || 25, 1), 50);
    const userId = req.user ? req.user.userId : '__master__';
    const isLatin = /[a-zA-Z]/.test(q);
    const regex = new RegExp('^' + escapeRegex(q), isLatin ? 'i' : '');

    const docs = await col(req.params.type)
      .find(
        { userId, _userDeleted: { $ne: true }, nameHebrew: regex },
        { projection: SEARCH_PROJECTIONS[req.params.type] }
      )
      .limit(limit)
      .toArray();
    res.json(docs);
  } catch (err) {
    req.log.error({ err, event: 'data.search.failed' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/data/:type/count?filter=lowStock|unapproved
// Lightweight count so dashboard stats don't need the full collection loaded
// (plan 301, Milestone 3). Mirrors kitchen-state.service.ts's lowStockProducts_
// (minStockLevel > 0) and dashboard-overview.component.ts's unapprovedCount_
// (isApproved !== true) filters exactly, so a future client switch-over can't drift.
// Must be registered before GET /:type/:id so "count" is never swallowed as an :id.
// ---------------------------------------------------------------------------
router.get('/:type/count', optionalToken, async (req, res) => {
  try {
    const userId = req.user ? req.user.userId : '__master__';
    const filter = { userId, _userDeleted: { $ne: true } };
    const filterName = req.query.filter;
    if (filterName === 'lowStock') {
      if (req.params.type !== 'products') {
        return res.status(400).json({ error: 'filter=lowStock is only valid for products' });
      }
      filter.minStockLevel = { $gt: 0 };
    } else if (filterName === 'unapproved') {
      if (req.params.type !== 'recipes' && req.params.type !== 'dishes') {
        return res.status(400).json({ error: 'filter=unapproved is only valid for recipes or dishes' });
      }
      filter.isApproved = { $ne: true };
    } else if (filterName) {
      return res.status(400).json({ error: `Unknown filter: ${filterName}` });
    }
    const count = await col(req.params.type).countDocuments(filter);
    res.json({ count });
  } catch (err) {
    req.log.error({ err, event: 'data.count.failed' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/data/DICTIONARY_OVERRIDES/global
// Plan 322 M4 — see the matching PUT route further below for the full comment.
// Defined here, BEFORE the generic `GET /:type/:id` below, which would otherwise
// treat "global" as an :id and swallow this route (same Express route-ordering
// hazard documented at registry-rename-master further down).
// ---------------------------------------------------------------------------
router.get('/DICTIONARY_OVERRIDES/global', verifyToken, async (req, res) => {
  try {
    const doc = await col('DICTIONARY_OVERRIDES').findOne({ userId: '__global__' });
    res.json({ items: doc?.items ?? {} });
  } catch (err) {
    req.log.error({ err, event: 'data.dictionary_global_get.failed' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/data/:type/:id
// Authenticated → returns one document by _id scoped to the user.
// Anonymous → returns one document by _id from __master__.
// ---------------------------------------------------------------------------
router.get('/:type/:id', optionalToken, async (req, res) => {
  try {
    const userId = req.user ? req.user.userId : '__master__';
    const doc = await col(req.params.type).findOne({
      _id: req.params.id,
      userId: readOwner(req.params.type, userId),
      _userDeleted: { $ne: true },
    });
    if (!doc) {
      return res.status(404).json({ error: `Cannot get, Item ${req.params.id} of type: ${req.params.type} does not exist` });
    }
    res.json(doc);
  } catch (err) {
    req.log.error({ err, event: 'data.get.failed' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/v1/data/:type
// Inserts a new document stamped with the authenticated user's id.
//
// The server generates `_id` when the body omits one (Plan 321 Phase 1 —
// HttpStorageAdapter.post() no longer sends a client-picked id for a genuinely
// new entity; use the `_id` on the returned doc, not one picked beforehand).
// A client-supplied `_id` IS still honored when present — HttpStorageAdapter's
// appendExisting() (trash restore, and anything re-appending a doc that must
// keep its original id/references) relies on this and posts through this same
// route. Existing ids are never rewritten either way.
// ---------------------------------------------------------------------------
router.post('/:type', verifyToken, async (req, res) => {
  try {
    const entityType = req.params.type;
    const { _id: clientId, userId: _u, _masterId: _m, _userModified: _um, ...body } = req.body;
    const _id = typeof clientId === 'string' && clientId ? clientId : makeId();
    // Taxonomy terms: `shared: true` (admin only) creates a master term instead of an own one.
    let shared = false;
    let safeEntity = body;
    if (entityType === TAXONOMY) ({ shared = false, ...safeEntity } = body);
    if (shared && !isAdmin(req)) return res.status(403).json({ error: 'Only an admin can add a shared term' });

    const now = Date.now();
    const doc = {
      ...safeEntity,
      _id,
      userId: shared ? MASTER : req.user.userId,
      ...(entityType !== TAXONOMY && { _masterId: _id, _userModified: false }),
      ...(hasV2Schema(entityType) && {
        schemaVersion: 2,
        // A restored/re-appended doc keeps its original createdAt; a brand-new one gets now.
        createdAt: typeof safeEntity.createdAt === 'number' ? safeEntity.createdAt : now,
        updatedAt: now,
      }),
    };

    const check = checkStoredDoc(entityType, doc);
    if (!check.ok) return res.status(400).json({ error: 'Validation failed', issues: check.issues });

    // After validation, so kind/key are known plain strings before they reach a query.
    if (entityType === TAXONOMY && !shared && await masterHasTerm(doc.kind, doc.key)) {
      return res.status(409).json({ error: 'This term already exists for everyone', kind: doc.kind, key: doc.key });
    }

    await col(entityType).insertOne(doc);
    // A new shared term covers users' own terms with the same key — fold them into it.
    if (entityType === TAXONOMY && shared) {
      await col(TAXONOMY).deleteMany({ kind: doc.kind, key: doc.key, userId: { $ne: MASTER } });
    }
    res.status(201).json(doc);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Entity already exists' });
    }
    req.log.error({ err, event: 'data.post.failed' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/v1/data/:type/registry-rename-master
//
// Plan 322: renames a key in-place inside __master__'s own metadata registry
// doc (KITCHEN_LABELS/COURSES items are {key,...} objects; CATEGORIES/ALLERGENS
// items are plain strings), then bumps the master version. Only corrects the
// template for future signups and this caller's own already-cascaded copy —
// it does NOT retroactively rename the key in other existing users' own
// registries or their recipes/products, same limitation push-to-master below
// already has for recipes (Rule 3 / additive-only sync).
//
// Defined BEFORE the generic `PUT /:type/:id` route below — Express matches
// top-to-bottom, and `/:type/:id` would otherwise swallow this by treating
// "registry-rename-master" as the :id.
//
// DELIBERATELY OPEN TO ANY SIGNED-IN USER, same tradeoff and same "Human has
// accepted this for the current single-operator phase" as push-to-master
// below — the client UI is what gates this behind an admin-only prompt
// (metadata-manager.page.component.ts's onRenameMetadata). To lock it down
// here too, uncomment:
//
//   if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
//
// ---------------------------------------------------------------------------
const REGISTRY_RENAME_PUSHABLE_TYPES = new Set(['KITCHEN_LABELS', 'KITCHEN_COURSES', 'KITCHEN_CATEGORIES', 'KITCHEN_ALLERGENS']);
const REGISTRY_OBJECT_ITEM_TYPES = new Set(['KITCHEN_LABELS', 'KITCHEN_COURSES']);

router.put('/:type/registry-rename-master', verifyToken, requireAdmin, async (req, res) => {
  try {
    if (!REGISTRY_RENAME_PUSHABLE_TYPES.has(req.params.type)) {
      return res.status(400).json({ error: `Type ${req.params.type} has no master registry to rename` });
    }
    const { oldKey, newKey, itemData } = req.body || {};
    if (typeof oldKey !== 'string' || typeof newKey !== 'string' || !oldKey.trim() || !newKey.trim()) {
      return res.status(400).json({ error: 'oldKey and newKey are required strings' });
    }
    const isObjectType = REGISTRY_OBJECT_ITEM_TYPES.has(req.params.type);
    const result = isObjectType
      ? await col(req.params.type).updateOne(
          { userId: '__master__', 'items.key': oldKey },
          { $set: { 'items.$.key': newKey } }
        )
      : await col(req.params.type).updateOne(
          { userId: '__master__' },
          { $set: { 'items.$[elem]': newKey } },
          { arrayFilters: [{ elem: oldKey }] }
        );
    // 2026-09-30 fix: `oldKey` not found in master is the COMMON case, not an edge case — it's
    // every label/course/category/allergen an admin created themselves and is now pushing to
    // everyone for the first time. Rather than 404 (which silently discarded the whole "save for
    // everyone" choice — the admin's own copy still saved, but nothing ever reached master),
    // add it as a new master entry instead, guarding against a duplicate if `newKey` is
    // somehow already there.
    if (result.matchedCount === 0) {
      const already = isObjectType
        ? await col(req.params.type).findOne({ userId: '__master__', 'items.key': newKey })
        : await col(req.params.type).findOne({ userId: '__master__', items: newKey });
      if (!already) {
        const newItem = isObjectType
          ? req.params.type === 'KITCHEN_LABELS'
            ? { key: newKey, color: itemData?.color || '#78716C', autoTriggers: itemData?.autoTriggers ?? [] }
            : { key: newKey, color: itemData?.color || '#78716C' }
          : newKey;
        await col(req.params.type).updateOne(
          { userId: '__master__' },
          { $push: { items: newItem } },
          { upsert: true }
        );
      }
    }
    await bumpMasterVersion();
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err, event: 'data.registry_rename_master.failed' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/v1/data/:type/registry-delete-master
//
// Plan 322 M10. Mirror of registry-rename-master above, for DELETE. Removes
// `key` from __master__'s own registry doc (labels/courses/categories/
// allergens only), then — Human-explicitly-requested, 2026-09-30, dev-only,
// same class of cross-user exception as purge-ingredient-everywhere further
// down — ALSO strips this key from every OTHER user's own recipes/dishes/
// products, not just the shared registry template. Unlike products (which
// get a fresh _id per user clone, needing a _masterId-based two-hop lookup),
// a label/course/category/allergen key IS the shared identifier across every
// user's own registry doc verbatim, so this is a single direct bulk update,
// no per-user resolution needed.
//
// Defined BEFORE the generic `PUT /:type/:id` route below for the same
// Express route-ordering reason as registry-rename-master above.
// ---------------------------------------------------------------------------
router.put('/:type/registry-delete-master', verifyToken, requireAdmin, async (req, res) => {
  try {
    if (!REGISTRY_RENAME_PUSHABLE_TYPES.has(req.params.type)) {
      return res.status(400).json({ error: `Type ${req.params.type} has no master registry to delete from` });
    }
    const { key } = req.body || {};
    if (typeof key !== 'string' || !key.trim()) {
      return res.status(400).json({ error: 'key is required' });
    }

    const isObjectType = REGISTRY_OBJECT_ITEM_TYPES.has(req.params.type);
    await col(req.params.type).updateOne(
      { userId: '__master__' },
      isObjectType ? { $pull: { items: { key } } } : { $pull: { items: key } }
    );
    await bumpMasterVersion();

    if (req.params.type === 'KITCHEN_LABELS') {
      await Promise.all(
        ['recipes', 'dishes'].map((t) =>
          col(t).updateMany({ userId: { $ne: '__master__' } }, { $pull: { labels: key, autoLabels: key } })
        )
      );
    } else if (req.params.type === 'KITCHEN_COURSES') {
      await Promise.all(
        ['recipes', 'dishes'].map((t) =>
          col(t).updateMany({ userId: { $ne: '__master__' }, course: key }, { $set: { course: '' } })
        )
      );
    } else if (req.params.type === 'KITCHEN_CATEGORIES') {
      await col('products').updateMany({ userId: { $ne: '__master__' } }, { $pull: { categories: key } });
    } else if (req.params.type === 'KITCHEN_ALLERGENS') {
      await col('products').updateMany({ userId: { $ne: '__master__' } }, { $pull: { allergens: key } });
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err, event: 'data.registry_delete_master.failed' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/v1/data/DICTIONARY_OVERRIDES/global
//
// Plan 322 M4: the shared Hebrew-dictionary override layer every client merges
// in at runtime (dictionary.json base -> this global doc -> the caller's own
// personal DICTIONARY_OVERRIDES doc, read through the normal GET /:type route).
// Stored as a single doc under the reserved pseudo-user '__global__', same
// idiom as '__master__' elsewhere in this file — but unlike '__master__' (a
// signup-time clone template), this doc is read live by every request, so a
// write here reaches every existing user immediately, not just future signups.
// The matching GET is defined earlier, above, next to GET /:type/:id — Express
// route-ordering requires it there (see that route's own comment).
//
// Defined BEFORE the generic `PUT /:type/:id` route below for the same
// Express route-ordering reason as registry-rename-master above.
// ---------------------------------------------------------------------------
router.put('/DICTIONARY_OVERRIDES/global', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const { key, hebrewLabel } = req.body || {};
    if (typeof key !== 'string' || typeof hebrewLabel !== 'string' || !key.trim() || !hebrewLabel.trim()) {
      return res.status(400).json({ error: 'key and hebrewLabel are required strings' });
    }
    const normalizedKey = key.trim().toLowerCase();
    await col('DICTIONARY_OVERRIDES').updateOne(
      { userId: '__global__' },
      { $set: { [`items.${normalizedKey}`]: hebrewLabel.trim() } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err, event: 'data.dictionary_global_put.failed' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/v1/data/:type/:id
// Updates one document. Preserves userId, _masterId; sets _userModified: true.
// Strips reserved fields from req.body to prevent userId/master spoofing.
// ---------------------------------------------------------------------------
router.put('/:type/:id', verifyToken, async (req, res) => {
  try {
    // A2: nameSnapshot enforcement — every linked ingredient must carry a nameSnapshot
    // so the recipe remains readable if the product is later deleted or the DB is reset.
    if (req.params.type === 'recipes' || req.params.type === 'dishes') {
      // A non-array `ingredients` is left to the schema check below (400 Validation failed).
      const ings = Array.isArray(req.body.ingredients) ? req.body.ingredients : [];
      const orphan = ings.find(ing => ing.referenceId && !ing.nameSnapshot);
      if (orphan) {
        return res.status(400).json({
          error: 'Each linked ingredient must have a nameSnapshot',
          referenceId: orphan.referenceId,
        });
      }
    }

    // Destructure reserved fields out of req.body — client must not override them.
    const { userId: _, _masterId: __, _userModified: ___, ...safeBody } = req.body;

    const isTerm = req.params.type === TAXONOMY;
    const filter = { _id: req.params.id, userId: isTerm ? termWriteOwner(req) : req.user.userId, _userDeleted: { $ne: true } };
    const stamps = {
      ...(hasV2Schema(req.params.type) && { schemaVersion: 2, updatedAt: Date.now() }),
      ...(!isTerm && { _userModified: true }),
    };
    // createdAt is server-owned: a client PUT never rewrites it.
    const { createdAt: _ca, ...updatable } = safeBody;
    let rekeyed = null;
    if (hasV2Schema(req.params.type)) {
      const current = await col(req.params.type).findOne(filter);
      if (!current) {
        return res.status(404).json({ error: `Cannot update, item ${req.params.id} does not exist` });
      }
      if (isTerm && updatable.kind !== undefined && updatable.kind !== current.kind) {
        return res.status(400).json({ error: "A term's kind cannot change" });
      }
      const check = checkStoredDoc(req.params.type, { ...current, ...updatable, ...stamps });
      if (!check.ok) return res.status(400).json({ error: 'Validation failed', issues: check.issues });
      // After validation, so the new key is a known plain string before it reaches a query.
      if (isTerm && updatable.key !== undefined && updatable.key !== current.key) {
        if (current.userId !== MASTER && await masterHasTerm(current.kind, updatable.key)) {
          return res.status(409).json({ error: 'This term already exists for everyone', kind: current.kind, key: updatable.key });
        }
        rekeyed = current;
      }
    }

    const result = await col(req.params.type).findOneAndUpdate(
      filter,
      { $set: { ...updatable, ...stamps } },
      { returnDocument: 'after' }
    );
    if (!result) {
      return res.status(404).json({ error: `Cannot update, item ${req.params.id} does not exist` });
    }
    // Re-keyed term: carry the new key into every document that used the old one (the
    // owner's own, or everyone's for a shared term), and fold users' own same-key terms.
    if (rekeyed) {
      await renameTermEverywhere(rekeyed, result.key);
      if (rekeyed.userId === MASTER) {
        await col(TAXONOMY).deleteMany({ kind: result.kind, key: result.key, userId: { $ne: MASTER } });
      }
    }
    res.json(result);
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Entity already exists' });
    req.log.error({ err, event: 'data.put.failed' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/v1/data/:type/:id/push-to-master
//
// Pushes the calling user's own saved copy onto its linked __master__
// document, then bumps the master version so every other user picks it up on
// next login/refresh via syncMasterToUser.
//
// DELIBERATELY OPEN TO ANY SIGNED-IN USER. An automated security review flags
// this as privilege escalation, and it is: any authenticated account can
// rewrite the shared catalogue for everyone. The Human has accepted that
// explicitly for the current single-operator development phase, on condition
// the UI always confirms "this changes it for everybody" before calling it.
// To lock it down later, uncomment the guard below — that is the whole change.
//
//   if (req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' })
//
// ---------------------------------------------------------------------------

// Only entities that are actually cloned from master can be pushed back to it.
// Without this, :type is attacker-controlled and reaches col() unchecked.
const PUSHABLE_TYPES = new Set(['recipes', 'dishes', 'products', 'suppliers', 'equipment']);

// Plan 322 M9: pushes one doc to __master__, recursively pushing along any
// referenced recipes/dishes/products ingredient that has never
// itself been pushed — otherwise a recipe pushed to everyone could arrive
// for other users with an ingredient row pointing at a referenceId that only
// ever existed in the pushing user's own account (a brand-new product they
// never separately pushed). `visited` guards against a circular sub-recipe
// reference recursing forever; a doc already in it is left as-is rather than
// re-pushed. Returns the resolved __master__ _id, or null if the doc isn't
// the caller's own (or doesn't exist) — callers treat null as "leave as-is".
class MasterNameTakenError extends Error {
  constructor(name) {
    super(`The shared library already has an item named "${name}"`);
    this.nameHebrew = name;
  }
}

async function pushDocToMasterRecursive(type, id, userId, visited) {
  const key = `${type}:${id}`;
  if (visited.has(key)) return null;
  visited.add(key);

  const existing = await col(type).findOne({ _id: id, userId, _userDeleted: { $ne: true } });
  if (!existing) return null;
  if (typeof existing._masterId !== 'string') return null;

  // Only recipes/dishes have ingredients. Writing the field onto a product/supplier/equipment
  // master copy made the strict v2 schema reject every later PUT on it and on all its clones.
  const hasIngredients = type === 'recipes' || type === 'dishes';
  const sourceIngredients = hasIngredients && Array.isArray(existing.ingredients) ? existing.ingredients : [];
  const ingredients = await Promise.all(
    sourceIngredients.map(async (ing) => {
      if (typeof ing.referenceId !== 'string' || !ing.referenceId) return ing;
      const lookupTypes = ing.type === 'recipe' ? ['recipes', 'dishes'] : ['products'];
      for (const t of lookupTypes) {
        const ref = await col(t).findOne(
          { _id: ing.referenceId, userId },
          { projection: { _masterId: 1, _id: 1 } }
        );
        if (!ref) continue;
        if (typeof ref._masterId === 'string' && ref._masterId !== ref._id) {
          // Already linked to a real, previously-pushed master doc.
          return { ...ing, referenceId: ref._masterId };
        }
        // Never pushed (self-linked or missing _masterId) — push it now so the
        // master copy doesn't end up with a referenceId nobody else can resolve.
        const pushedId = await pushDocToMasterRecursive(t, ref._id, userId, visited);
        return { ...ing, referenceId: pushedId ?? ing.referenceId };
      }
      return ing;
    })
  );

  const { userId: _u, _masterId: _m, _userModified: _um, _id: _i, ...safeBody } = existing;
  const ingredientsField = hasIngredients ? { ingredients } : {};
  // 2026-09-30 fix (take 2): every new doc self-links (_masterId = its own _id, see POST
  // above). A naive upsert with that same _id fails — `_id` is uniquely indexed across the
  // WHOLE collection regardless of userId, and that exact _id is already taken by the
  // caller's own document. The first push for a self-linked doc must INSERT the master copy
  // under a FRESH _id, then re-point the caller's own _masterId at it (same shape a
  // clone-at-signup doc already has: _id and _masterId differing, _masterId pointing at the
  // real shared document). Only a doc that was already itself cloned FROM an existing master
  // item (_masterId !== _id) can go straight to update.
  const isFirstPush = existing._masterId === existing._id;
  let resolvedMasterId = existing._masterId;
  if (isFirstPush) {
    // Plan 379: master must never hold two docs under one name — every user gets a clone of
    // each, and recipes/dishes share one name namespace, so a duplicate blocks saving either.
    const name = typeof existing.nameHebrew === 'string' ? existing.nameHebrew.trim() : '';
    if (name) {
      const namespace = hasIngredients ? ['recipes', 'dishes'] : [type];
      for (const t of namespace) {
        const twin = await col(t).findOne({ userId: '__master__', nameHebrew: name }, { projection: { _id: 1 } });
        if (twin) throw new MasterNameTakenError(name);
      }
    }
    resolvedMasterId = makeId();
    await col(type).insertOne({
      ...safeBody,
      ...ingredientsField,
      _id: resolvedMasterId,
      userId: '__master__',
      _masterId: resolvedMasterId,
      _userModified: false
    });
  } else {
    const result = await col(type).updateOne(
      { _id: resolvedMasterId, userId: '__master__' },
      { $set: { ...safeBody, ...ingredientsField } }
    );
    if (result.matchedCount === 0) return null;
  }

  // Re-point the caller's own doc at the (possibly newly-created) master _id and clear
  // _userModified. A normal PUT sets _userModified true, and sync-master's Rule 3 then skips
  // that clone forever — so without this the user would publish their change to everyone and
  // simultaneously opt themselves out of every future master update. Their copy already
  // matches master, so letting Rule 2 manage it again is both safe and correct.
  await col(type).updateOne({ _id: id, userId }, { $set: { _masterId: resolvedMasterId, _userModified: false } });

  return resolvedMasterId;
}

router.put('/:type/:id/push-to-master', verifyToken, requireAdmin, async (req, res) => {
  try {
    if (!PUSHABLE_TYPES.has(req.params.type)) {
      return res.status(400).json({ error: `Type ${req.params.type} cannot be pushed to master` });
    }
    // _masterId / referenceId are read back out of Mongo, but they originally
    // entered through a client-supplied body (POST's `_id`, PUT's `ingredients`),
    // neither of which type-checks them. An object like { $ne: null } stored there
    // earlier would become a query *operator* rather than a value below — so
    // require plain strings before using either one in a selector. Checked once
    // up front here (pushDocToMasterRecursive re-checks internally too, for the
    // recursive calls it makes on referenced products/sub-recipes).
    const preCheck = await col(req.params.type).findOne(
      { _id: req.params.id, userId: req.user.userId, _userDeleted: { $ne: true } },
      { projection: { _masterId: 1 } }
    );
    if (!preCheck) {
      return res.status(404).json({ error: `Cannot push, item ${req.params.id} does not exist` });
    }
    if (typeof preCheck._masterId !== 'string') {
      return res.status(400).json({ error: 'This item has no linked master recipe to update' });
    }

    const resolvedMasterId = await pushDocToMasterRecursive(
      req.params.type,
      req.params.id,
      req.user.userId,
      new Set()
    );
    if (!resolvedMasterId) {
      return res.status(404).json({ error: 'Linked master document no longer exists' });
    }

    await bumpMasterVersion();
    res.json({ ok: true, masterId: resolvedMasterId });
  } catch (err) {
    if (err instanceof MasterNameTakenError) {
      return res.status(409).json({ error: err.message, nameHebrew: err.nameHebrew });
    }
    req.log.error({ err, event: 'data.push_to_master.failed' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/v1/data/:type/:id/delete-from-master
//
// Mirror of push-to-master for the delete path (Plan 322 M6). Removes the
// __master__ copy linked to the caller's own doc (via _masterId) so future/
// unsynced signups stop receiving it. Does NOT touch other users' already-
// cloned copies of this recipe/dish, and does NOT delete the caller's own
// doc either — that still goes through the normal DELETE /:type/:id route;
// this is only the "also retire it from the shared list" half of the choice.
// Recipes/dishes only (categories/allergens/etc. have no per-item trash
// concept the way recipes/dishes do). Same open-to-any-signed-in-user
// tradeoff as push-to-master, for the same reason.
// ---------------------------------------------------------------------------
const DELETABLE_FROM_MASTER_TYPES = new Set(['recipes', 'dishes', 'products']);
const MASTER_TRASH_KEY = { recipes: 'TRASH_RECIPES', dishes: 'TRASH_DISHES', products: 'TRASH_PRODUCTS' };

router.put('/:type/:id/delete-from-master', verifyToken, requireAdmin, async (req, res) => {
  try {
    if (!DELETABLE_FROM_MASTER_TYPES.has(req.params.type)) {
      return res.status(400).json({ error: `Type ${req.params.type} cannot be removed from master` });
    }
    const existing = await col(req.params.type).findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });
    if (!existing) {
      return res.status(404).json({ error: `Item ${req.params.id} not found` });
    }
    if (typeof existing._masterId !== 'string') {
      return res.status(400).json({ error: 'This item has no linked master copy to remove' });
    }

    const masterDoc = await col(req.params.type).findOne({ _id: existing._masterId, userId: '__master__' });
    if (masterDoc) {
      const trashKey = MASTER_TRASH_KEY[req.params.type];
      await col(trashKey).insertOne({ ...masterDoc, deletedAt: Date.now() });
      await col(req.params.type).deleteOne({ _id: existing._masterId, userId: '__master__' });
      await bumpMasterVersion();
    }
    // masterDoc already gone (e.g. removed by a previous call) — treat as success, nothing to do.

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err, event: 'data.delete_from_master.failed' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/v1/data/:type/:id/purge-ingredient-everywhere
//
// Plan 322 M8. products only. Explicitly Human-requested, dev-only,
// higher-risk than delete-from-master above: strips this product's ingredient
// line out of every OTHER user's own recipes/dishes docs, not just the
// shared __master__ copy. Nothing else in this codebase reaches into another
// user's own documents from one user's action — this is a deliberate,
// explicitly-requested exception for local development use, not a general
// pattern to reuse elsewhere.
//
// Each user's own product clone gets its OWN _id at signup (clone-master.js
// generates a fresh _id per user, linked back via _masterId) — so "the same
// product" across users is identified by _masterId, and each affected user's
// recipes/dishes are pulled using THAT user's own product _id, never the
// caller's _id directly.
// ---------------------------------------------------------------------------
const PURGE_EVERYWHERE_TYPES = new Set(['products']);

router.put('/:type/:id/purge-ingredient-everywhere', verifyToken, requireAdmin, async (req, res) => {
  try {
    if (!PURGE_EVERYWHERE_TYPES.has(req.params.type)) {
      return res.status(400).json({ error: `Type ${req.params.type} does not support purge-ingredient-everywhere` });
    }
    const existing = await col(req.params.type).findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });
    if (!existing) {
      return res.status(404).json({ error: `Item ${req.params.id} not found` });
    }
    if (typeof existing._masterId !== 'string') {
      // Nothing shared to trace other users' clones back to — nothing to purge.
      return res.json({ ok: true, usersAffected: 0 });
    }

    const otherClones = await col('products')
      .find({ _masterId: existing._masterId, userId: { $nin: ['__master__', req.user.userId] } })
      .project({ _id: 1, userId: 1 })
      .toArray();

    await Promise.all(
      otherClones.flatMap((clone) =>
        ['recipes', 'dishes'].map((ingredientType) =>
          col(ingredientType).updateMany(
            { userId: clone.userId, 'ingredients.referenceId': clone._id },
            { $pull: { ingredients: { referenceId: clone._id } } }
          )
        )
      )
    );

    res.json({ ok: true, usersAffected: otherClones.length });
  } catch (err) {
    req.log.error({ err, event: 'data.purge_ingredient_everywhere.failed' });
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Runs deleteMany + insertMany as one atomic unit for the given userId/docs.
 * Prefers a real Mongo transaction (works whenever the deployment is a replica set —
 * Atlas always is). Standalone Mongo (common in local dev) rejects transactions with
 * error code 20 ("Transaction numbers are only allowed on a replica set member or
 * mongos"); on that specific error we fall back to an upsert-then-delete swap: upsert the new
 * docs by _id, then delete the user's docs not in the set. A crash
 * mid-fallback can leave a brief window where deleted docs are still present, but
 * it never leaves the user with an empty collection.
 */
async function replaceCollection(type, userId, docs) {
  let session;
  try {
    session = await mongoose.connection.startSession();
  } catch (err) {
    return replaceCollectionFallback(type, userId, docs);
  }
  try {
    await session.withTransaction(async () => {
      await col(type).deleteMany({ userId }, { session });
      if (docs.length > 0) {
        await col(type).insertMany(docs, { ordered: true, session });
      }
    });
  } catch (err) {
    const isStandalone = err.code === 20 || /replica set|mongos/i.test(err.message || '');
    if (isStandalone) {
      return replaceCollectionFallback(type, userId, docs);
    }
    throw err;
  } finally {
    await session.endSession();
  }
}

async function replaceCollectionFallback(type, userId, docs) {
  // No transactions (standalone Mongo): upsert every incoming doc by _id first (re-inserting a
  // doc that is being kept would hit a duplicate key), then drop the user's docs not in the set.
  if (docs.length > 0) {
    await col(type).bulkWrite(
      docs.map(d => ({ replaceOne: { filter: { _id: d._id }, replacement: d, upsert: true } })),
      { ordered: true }
    );
  }
  await col(type).deleteMany({ userId, _id: { $nin: docs.map(d => d._id) } });
}

// ---------------------------------------------------------------------------
// PUT /api/v1/data/:type  (no id segment)
// Replaces the entire collection for the authenticated user — deleteMany + insertMany,
// run atomically via replaceCollection() so a mid-request failure/crash can never leave
// the user with a partially-deleted or empty collection.
// Body must be an array of entity objects. Each must have _id.
//
// Restricted (Plan 321 Phase 1) to the specific collections that actually still need
// atomic whole-collection replace today: the one remaining single-doc-array registry
// (KITCHEN_PREPARATIONS — the rest move to TaxonomyStore in Phase 3) and TRASH_*/
// VERSION_HISTORY clear-all/restore-all/trim flows. Every real entity-data collection
// (products, recipes, ...) must go through per-document POST/PUT/DELETE —
// wiping a user's whole catalog in one call was never an intended use of this route.
// ---------------------------------------------------------------------------
const REPLACEABLE_TYPES = new Set([
  'KITCHEN_PREPARATIONS',
  'TRASH_RECIPES', 'TRASH_DISHES', 'TRASH_PRODUCTS', 'TRASH_EQUIPMENT', 'TRASH_VENUES', 'TRASH_MENU_EVENTS',
  'VERSION_HISTORY',
]);

router.put('/:type', verifyToken, async (req, res) => {
  try {
    if (!REPLACEABLE_TYPES.has(req.params.type)) {
      return res.status(400).json({ error: `Whole-collection replace is not permitted for ${req.params.type}` });
    }
    if (req.headers['x-confirm-replace'] !== 'true') {
      return res.status(400).json({ error: 'X-Confirm-Replace: true header is required for bulk replace' });
    }
    const entities = req.body;
    if (!Array.isArray(entities)) {
      return res.status(400).json({ error: 'Body must be an array of entity objects' });
    }

    const incomingIds = entities.length > 0
      ? entities.map(e => e._id).filter(Boolean)
      : [];

    // Conflict query runs before any delete — no race with the eventual deleteMany.
    const conflictDocs = incomingIds.length > 0
      ? await col(req.params.type)
          .find(
            { _id: { $in: incomingIds }, userId: { $ne: req.user.userId } },
            { projection: { _id: 1 } }
          )
          .toArray()
      : [];

    const stillTaken = new Set(conflictDocs.map(d => d._id));

    const docs = entities.map(e => {
      const { userId: _u, _masterId: _m, _userModified: _um, ...safeEntity } = e;
      return {
        ...safeEntity,
        _id: stillTaken.has(safeEntity._id) ? makeId() : (safeEntity._id || makeId()),
        userId: req.user.userId,
        _masterId: null,
        _userModified: false,
      };
    });

    try {
      await replaceCollection(req.params.type, req.user.userId, docs);
    } catch (txErr) {
      req.log.error({ err: txErr, event: 'data.replace_all.tx_aborted' });
      return res.status(500).json({ error: 'Replace failed, no changes were made' });
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err, event: 'data.replace_all.failed' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/data/:type/bulk
// Removes many documents by _id, scoped to the authenticated user.
// Body: { ids: string[] }. Must be registered before /:type/:id so "bulk" is not an id.
// ---------------------------------------------------------------------------
router.delete('/:type/bulk', verifyToken, async (req, res) => {
  try {
    const ids = req.body && req.body.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Body must include a non-empty ids array' });
    }
    if (!ids.every(id => typeof id === 'string' && id.length > 0)) {
      return res.status(400).json({ error: 'Each id must be a non-empty string' });
    }

    if (req.params.type === TAXONOMY) {
      const terms = await col(TAXONOMY).find({ _id: { $in: ids }, userId: req.user.userId }).toArray();
      for (const term of terms) {
        const refs = await findTermReferences(term);
        if (refs.length) return res.status(409).json(termInUse(term, refs));
      }
    }

    const result = await col(req.params.type).deleteMany({
      _id: { $in: ids },
      userId: req.user.userId,
    });

    res.json({ ok: true, deletedCount: result.deletedCount });
  } catch (err) {
    req.log.error({ err, event: 'data.delete_bulk.failed' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/data/:type/:id
// Removes one document, scoped to the authenticated user.
// ---------------------------------------------------------------------------
router.delete('/:type/:id', verifyToken, async (req, res) => {
  try {
    // A1: referential integrity — block product delete if any recipe/dish uses it.
    // Prevents orphaned ingredient referenceIds in recipes and dishes.
    if (req.params.type === 'products') {
      const recipeRef = await col('recipes').findOne({
        userId: req.user.userId,
        'ingredients.referenceId': req.params.id,
        _userDeleted: { $ne: true },
      });
      const dishRef = !recipeRef && await col('dishes').findOne({
        userId: req.user.userId,
        'ingredients.referenceId': req.params.id,
        _userDeleted: { $ne: true },
      });
      if (recipeRef || dishRef) {
        const ref = recipeRef || dishRef;
        return res.status(409).json({
          error: 'Product is used in one or more recipes',
          referencedBy: ref.nameHebrew || ref._id,
        });
      }
    }

    const existing = await col(req.params.type).findOne({
      _id: req.params.id,
      userId: req.params.type === TAXONOMY ? termWriteOwner(req) : req.user.userId,
    });
    if (!existing) {
      return res.status(404).json({ error: `Cannot remove, item ${req.params.id} of type: ${req.params.type} does not exist` });
    }

    // Plan 321 Phase 3: a term still used (own docs, or anyone's for a shared term) can't be deleted.
    if (req.params.type === TAXONOMY) {
      const refs = await findTermReferences(existing);
      if (refs.length) return res.status(409).json(termInUse(existing, refs));
      await col(TAXONOMY).deleteOne({ _id: existing._id, userId: existing.userId });
      return res.json({ ok: true });
    }

    const isMasterClone = existing._masterId && existing._masterId !== existing._id;

    if (isMasterClone) {
      // Tombstone: preserve lineage so sync doesn't re-clone this item on next login.
      // _userModified: true ensures syncMasterToUser Rule 3 treats this as user-wins.
      await col(req.params.type).replaceOne(
        { _id: req.params.id, userId: req.user.userId },
        {
          _id: req.params.id, userId: req.user.userId, _masterId: existing._masterId, _userDeleted: true, _userModified: true,
          ...(hasV2Schema(req.params.type) && { schemaVersion: 2 }),
        }
      );
    } else {
      // Hard delete: user-originated item or legacy (no _masterId / self-referential)
      await col(req.params.type).deleteOne({ _id: req.params.id, userId: req.user.userId });
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err, event: 'data.delete.failed' });
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
