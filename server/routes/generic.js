const { Router } = require('express');
const mongoose = require('mongoose');
const { verifyToken, optionalToken } = require('../middleware/auth');
const { ALL_USER_ENTITY_TYPES } = require('../constants/all-user-entity-types');
const { SEARCHABLE_ENTITY_TYPES } = require('../constants/searchable-entity-types');
const { bumpMasterVersion } = require('../services/master-version');

const router = Router();

// Write routes (POST/PUT/DELETE) require a valid JWT. Reads are public.

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
 * Each entity type (PRODUCT_LIST, RECIPE_LIST, etc.) gets its own collection.
 * Documents are stored flat — no entityType wrapper, no data wrapper.
 */
function col(type) {
  return mongoose.connection.db.collection(type);
}

/** Ensures a string _id exists on the entity, generating one if missing. */
function makeId(length = 5) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < length; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

// ---------------------------------------------------------------------------
// GET /api/v1/data/:type
// Authenticated → returns the user's own documents.
// Anonymous (no token) → returns __master__ documents (shared/public data).
// Optional ?filterEntityType=&filterEntityId= narrow the find (e.g. VERSION_HISTORY).
// ---------------------------------------------------------------------------
router.get('/:type', optionalToken, async (req, res) => {
  // 1c perf instrumentation — opt-in via PERF_LOG=1. JSON.stringify-ing the response
  // purely to measure its size is real CPU on a 0.1-shared-CPU Render instance, so it
  // stays off by default rather than running on every request in production.
  const perfLog = process.env.PERF_LOG === '1';
  try {
    const userId = req.user ? req.user.userId : '__master__';
    // Was capped at 500 (max 1000) — safe when no account had more than a few hundred
    // docs per collection. The legacy FoodComposer import (plan 300) pushed real
    // accounts past that (PRODUCT_LIST/RECIPE_LIST/DISH_LIST now run 1,000-1,500+ docs
    // for an imported account), and the client never sends ?limit= for a full-collection
    // load — so every list fetch was silently truncated, not just for the importing user.
    // Raised well above current real-world collection sizes; still bounded (not
    // unlimited) to keep a ceiling on worst-case response size/memory for a single
    // request. gzip compression (see index.js) keeps the wire cost of a large response
    // low. Proper server-side search/pagination (so full-collection loads aren't needed
    // at all for most UI) is tracked separately — see plan 301.
    const limit = Math.min(parseInt(req.query.limit) || 20000, 20000);
    const skip = parseInt(req.query.skip) || 0;
    const filter = { userId, _userDeleted: { $ne: true } };
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
      // compression() shrinks it is invisible to :res[content-length] (see index.js).
      const bytes = Buffer.byteLength(JSON.stringify(docs));
      const serializeMs = Date.now() - serializeStart;
      console.log(`[data/query] ${req.params.type} docs=${docs.length} bytes=${bytes} mongo=${mongoMs}ms serialize=${serializeMs}ms`);
    }
    res.json(docs);
  } catch (err) {
    console.error('[data/query]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Lean field projection per searchable type — only what the typeahead components
// actually render/consume (ingredient-search.component.ts, recipe-book-list.component.ts's
// filteredProductsForIngredientSearch_) rides along; not the full document. See plan 301.
const SEARCH_PROJECTIONS = {
  PRODUCT_LIST: { _id: 1, name_hebrew: 1, base_unit_: 1, purchase_options_: 1 },
  RECIPE_LIST: { _id: 1, name_hebrew: 1, yield_unit_: 1 },
  DISH_LIST: { _id: 1, name_hebrew: 1, yield_unit_: 1 },
};

/** Escapes regex metacharacters so a raw query is safe to anchor into a RegExp. */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ---------------------------------------------------------------------------
// GET /api/v1/data/:type/search?q=&limit=
// Case-insensitive prefix match on name_hebrew, restricted to SEARCHABLE_ENTITY_TYPES
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
        { userId, _userDeleted: { $ne: true }, name_hebrew: regex },
        { projection: SEARCH_PROJECTIONS[req.params.type] }
      )
      .limit(limit)
      .toArray();
    res.json(docs);
  } catch (err) {
    console.error('[data/search]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/data/:type/count?filter=lowStock|unapproved
// Lightweight count so dashboard stats don't need the full collection loaded
// (plan 301, Milestone 3). Mirrors kitchen-state.service.ts's lowStockProducts_
// (min_stock_level_ > 0) and dashboard-overview.component.ts's unapprovedCount_
// (is_approved_ !== true) filters exactly, so a future client switch-over can't drift.
// Must be registered before GET /:type/:id so "count" is never swallowed as an :id.
// ---------------------------------------------------------------------------
router.get('/:type/count', optionalToken, async (req, res) => {
  try {
    const userId = req.user ? req.user.userId : '__master__';
    const filter = { userId, _userDeleted: { $ne: true } };
    const filterName = req.query.filter;
    if (filterName === 'lowStock') {
      if (req.params.type !== 'PRODUCT_LIST') {
        return res.status(400).json({ error: 'filter=lowStock is only valid for PRODUCT_LIST' });
      }
      filter.min_stock_level_ = { $gt: 0 };
    } else if (filterName === 'unapproved') {
      if (req.params.type !== 'RECIPE_LIST' && req.params.type !== 'DISH_LIST') {
        return res.status(400).json({ error: 'filter=unapproved is only valid for RECIPE_LIST or DISH_LIST' });
      }
      filter.is_approved_ = { $ne: true };
    } else if (filterName) {
      return res.status(400).json({ error: `Unknown filter: ${filterName}` });
    }
    const count = await col(req.params.type).countDocuments(filter);
    res.json({ count });
  } catch (err) {
    console.error('[data/count]', err);
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
      userId,
      _userDeleted: { $ne: true },
    });
    if (!doc) {
      return res.status(404).json({ error: `Cannot get, Item ${req.params.id} of type: ${req.params.type} does not exist` });
    }
    res.json(doc);
  } catch (err) {
    console.error('[data/get]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/v1/data/:type
// Inserts a new document stamped with the authenticated user's id.
//
// For PRODUCT_LIST: performs name-based collision detection against __master__.
// If a master product with the same name exists, merges the new source data
// into the existing product (silent merge) instead of creating a duplicate.
//
// For all types: also inserts a copy under userId: '__master__' so additions
// propagate to all users on next sync/login.
// ---------------------------------------------------------------------------
router.post('/:type', verifyToken, async (req, res) => {
  try {
    const entity = req.body;
    if (!entity._id) {
      return res.status(400).json({ error: '_id is required in the request body' });
    }

    const entityType = req.params.type;
    const { userId: _u, _masterId: _m, _userModified: _um, ...safeEntity } = entity;

    const doc = {
      ...safeEntity,
      userId: req.user.userId,
      _masterId: safeEntity._id,
      _userModified: false,
    };

    await col(entityType).insertOne(doc);
    res.status(201).json(doc);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Entity already exists' });
    }
    console.error('[data/post]', err);
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
    if (req.params.type === 'RECIPE_LIST' || req.params.type === 'DISH_LIST') {
      const ings = req.body.ingredients_ ?? [];
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

    const result = await col(req.params.type).findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId, _userDeleted: { $ne: true } },
      { $set: { ...safeBody, _userModified: true } },
      { returnDocument: 'after' }
    );
    if (!result) {
      return res.status(404).json({ error: `Cannot update, item ${req.params.id} does not exist` });
    }
    res.json(result);
  } catch (err) {
    console.error('[data/put]', err);
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
const PUSHABLE_TYPES = new Set(['RECIPE_LIST', 'DISH_LIST', 'PRODUCT_LIST', 'KITCHEN_SUPPLIERS', 'EQUIPMENT_LIST']);

router.put('/:type/:id/push-to-master', verifyToken, async (req, res) => {
  try {
    if (!PUSHABLE_TYPES.has(req.params.type)) {
      return res.status(400).json({ error: `Type ${req.params.type} cannot be pushed to master` });
    }
    const existing = await col(req.params.type).findOne({
      _id: req.params.id,
      userId: req.user.userId,
      _userDeleted: { $ne: true },
    });
    if (!existing) {
      return res.status(404).json({ error: `Cannot push, item ${req.params.id} does not exist` });
    }
    // _masterId / referenceId are read back out of Mongo, but they originally
    // entered through a client-supplied body (POST's `_id`, PUT's `ingredients_`),
    // neither of which type-checks them. An object like { $ne: null } stored there
    // earlier would become a query *operator* rather than a value below — so
    // require plain strings before using either one in a selector.
    if (typeof existing._masterId !== 'string') {
      return res.status(400).json({ error: 'This item has no linked master recipe to update' });
    }

    // Reverse-remap ingredient referenceIds: this user's clone points at their own
    // product/sub-recipe ids — the master doc needs the corresponding master ids.
    // Best-effort: if a referenced doc has no _masterId (user's own custom item,
    // never itself pushed to master), leave the referenceId as-is.
    const ingredients = Array.isArray(existing.ingredients_) ? existing.ingredients_ : [];
    const ingredients_ = await Promise.all(
      ingredients.map(async (ing) => {
        if (typeof ing.referenceId !== 'string' || !ing.referenceId) return ing;
        const lookupTypes = ing.type === 'recipe' ? ['RECIPE_LIST', 'DISH_LIST'] : ['PRODUCT_LIST'];
        for (const t of lookupTypes) {
          const ref = await col(t).findOne(
            { _id: ing.referenceId, userId: req.user.userId },
            { projection: { _masterId: 1 } }
          );
          if (ref) {
            return { ...ing, referenceId: typeof ref._masterId === 'string' ? ref._masterId : ing.referenceId };
          }
        }
        return ing;
      })
    );

    const { userId: _u, _masterId: _m, _userModified: _um, _id: _i, ...safeBody } = existing;
    await col(req.params.type).updateOne(
      { _id: existing._masterId, userId: '__master__' },
      { $set: { ...safeBody, ingredients_ } }
    );

    // Clear the caller's own _userModified flag. A normal PUT sets it to true,
    // and sync-master's Rule 3 then skips that clone forever — so without this
    // the user would publish their change to everyone and simultaneously opt
    // themselves out of every future master update. Their copy already matches
    // master, so letting Rule 2 manage it again is both safe and correct.
    await col(req.params.type).updateOne(
      { _id: req.params.id, userId: req.user.userId },
      { $set: { _userModified: false } }
    );

    await bumpMasterVersion();
    res.json({ ok: true });
  } catch (err) {
    console.error('[data/push-to-master]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

/**
 * Runs deleteMany + insertMany as one atomic unit for the given userId/docs.
 * Prefers a real Mongo transaction (works whenever the deployment is a replica set —
 * Atlas always is). Standalone Mongo (common in local dev) rejects transactions with
 * error code 20 ("Transaction numbers are only allowed on a replica set member or
 * mongos"); on that specific error we fall back to a pending-flag swap: insert the new
 * docs first (flagged), delete the old (unflagged) docs, then clear the flag. A crash
 * mid-fallback can leave a stray _pendingReplace flag or a brief duplicate window, but
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
  if (docs.length > 0) {
    await col(type).insertMany(
      docs.map(d => ({ ...d, _pendingReplace: true })),
      { ordered: true }
    );
  }
  await col(type).deleteMany({ userId, _pendingReplace: { $ne: true } });
  if (docs.length > 0) {
    await col(type).updateMany({ userId, _pendingReplace: true }, { $unset: { _pendingReplace: '' } });
  }
}

// ---------------------------------------------------------------------------
// PUT /api/v1/data/:type  (no id segment)
// Replaces the entire collection for the authenticated user — deleteMany + insertMany,
// run atomically via replaceCollection() so a mid-request failure/crash can never leave
// the user with a partially-deleted or empty collection.
// Body must be an array of entity objects. Each must have _id.
// ---------------------------------------------------------------------------
router.put('/:type', verifyToken, async (req, res) => {
  try {
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
      console.error('[data/replaceAll] transaction aborted', txErr);
      return res.status(500).json({ error: 'Replace failed, no changes were made' });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[data/replaceAll]', err);
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

    const result = await col(req.params.type).deleteMany({
      _id: { $in: ids },
      userId: req.user.userId,
    });

    res.json({ ok: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error('[data/deleteBulk]', err);
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
    // Prevents orphaned ingredient referenceIds in RECIPE_LIST and DISH_LIST.
    if (req.params.type === 'PRODUCT_LIST') {
      const recipeRef = await col('RECIPE_LIST').findOne({
        userId: req.user.userId,
        'ingredients_.referenceId': req.params.id,
        _userDeleted: { $ne: true },
      });
      const dishRef = !recipeRef && await col('DISH_LIST').findOne({
        userId: req.user.userId,
        'ingredients_.referenceId': req.params.id,
        _userDeleted: { $ne: true },
      });
      if (recipeRef || dishRef) {
        const ref = recipeRef || dishRef;
        return res.status(409).json({
          error: 'Product is used in one or more recipes',
          referencedBy: ref.name_hebrew || ref._id,
        });
      }
    }

    const existing = await col(req.params.type).findOne({
      _id: req.params.id,
      userId: req.user.userId,
    });
    if (!existing) {
      return res.status(404).json({ error: `Cannot remove, item ${req.params.id} of type: ${req.params.type} does not exist` });
    }

    const isMasterClone = existing._masterId && existing._masterId !== existing._id;

    if (isMasterClone) {
      // Tombstone: preserve lineage so sync doesn't re-clone this item on next login.
      // _userModified: true ensures syncMasterToUser Rule 3 treats this as user-wins.
      await col(req.params.type).replaceOne(
        { _id: req.params.id, userId: req.user.userId },
        { _id: req.params.id, userId: req.user.userId, _masterId: existing._masterId, _userDeleted: true, _userModified: true }
      );
    } else {
      // Hard delete: user-originated item or legacy (no _masterId / self-referential)
      await col(req.params.type).deleteOne({ _id: req.params.id, userId: req.user.userId });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[data/delete]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
