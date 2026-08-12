const { Router } = require('express');
const mongoose = require('mongoose');
const { verifyToken, optionalToken } = require('../middleware/auth');
const { ALL_USER_ENTITY_TYPES } = require('../constants/all-user-entity-types');

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
    const docs = await col(req.params.type)
      .find(filter)
      .skip(skip)
      .limit(limit)
      .toArray();
    res.json(docs);
  } catch (err) {
    console.error('[data/query]', err);
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
