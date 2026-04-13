const { Router } = require('express');
const mongoose = require('mongoose');
const { verifyToken, optionalToken } = require('../middleware/auth');

const router = Router();

// Write routes (POST/PUT/DELETE) require a valid JWT. Reads are public.

// The auth entity type is managed exclusively by the auth router.
// Block direct access via the generic data API.
const BLOCKED_ENTITY_TYPES = new Set(['signed-users-db', 'users']);
router.use('/:type', (req, res, next) => {
  if (BLOCKED_ENTITY_TYPES.has(req.params.type)) {
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
// ---------------------------------------------------------------------------
router.get('/:type', optionalToken, async (req, res) => {
  try {
    const userId = req.user ? req.user.userId : '__master__';
    const limit = Math.min(parseInt(req.query.limit) || 500, 1000);
    const skip = parseInt(req.query.skip) || 0;
    const docs = await col(req.params.type)
      .find({ userId })
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

    // --- PRODUCT_LIST: name-based collision detection (silent merge) ---
    if (entityType === 'PRODUCT_LIST' && safeEntity.name_hebrew) {
      const normalized = (safeEntity.name_hebrew || '').trim().replace(/\s+/g, ' ').toLowerCase();
      const existingMaster = await col(entityType).findOne({
        userId: '__master__',
        name_hebrew_normalized: normalized,
      });

      if (existingMaster) {
        // Merge: push new source data into the existing master product
        const newSource = {
          supplierId: (safeEntity.sources_ && safeEntity.sources_[0]?.supplierId) || '',
          price: (safeEntity.sources_ && safeEntity.sources_[0]?.price) || safeEntity.buy_price_global_ || 0,
          addedBy: req.user.userId,
          addedAt: Date.now(),
        };

        // Only push if this supplier isn't already in sources_
        const alreadyHasSupplier = (existingMaster.sources_ || []).some(
          s => s.supplierId && s.supplierId === newSource.supplierId
        );
        if (!alreadyHasSupplier && (newSource.supplierId || newSource.price > 0)) {
          await col(entityType).updateOne(
            { _id: existingMaster._id, userId: '__master__' },
            { $push: { sources_: newSource } }
          );
        }

        // Upsert in user's namespace with the SAME _id as master (stable referenceId)
        const userDoc = {
          ...existingMaster,
          userId: req.user.userId,
          _masterId: String(existingMaster._id),
          _userModified: false,
        };
        delete userDoc._id;
        await col(entityType).updateOne(
          { _id: existingMaster._id, userId: req.user.userId },
          { $setOnInsert: { _id: existingMaster._id, ...userDoc } },
          { upsert: true }
        );

        // Return the master product with its original _id (merged, not duplicated)
        const merged = await col(entityType).findOne({ _id: existingMaster._id, userId: req.user.userId });
        return res.status(200).json({ ...merged, _merged: true });
      }
    }

    // --- Standard insert (no collision) ---
    const doc = {
      ...safeEntity,
      userId: req.user.userId,
      _masterId: null,
      _userModified: false,
    };

    // Compute normalized name for future collision detection
    if (entityType === 'PRODUCT_LIST' && doc.name_hebrew) {
      doc.name_hebrew_normalized = (doc.name_hebrew || '').trim().replace(/\s+/g, ' ').toLowerCase();
    }

    await col(entityType).insertOne(doc);

    // Also insert a copy under __master__ for shared visibility
    const masterCopy = { ...doc };
    delete masterCopy.userId;
    delete masterCopy._masterId;
    delete masterCopy._userModified;
    const masterId = makeId();
    try {
      await col(entityType).insertOne({
        ...masterCopy,
        _id: masterId,
        userId: '__master__',
        _masterId: null,
        _userModified: false,
      });
      // Update user's doc with _masterId pointing to the master copy
      await col(entityType).updateOne(
        { _id: doc._id, userId: req.user.userId },
        { $set: { _masterId: masterId } }
      );
    } catch (masterErr) {
      // Non-critical: if master copy fails (e.g. race condition), user's doc still exists
      if (masterErr.code !== 11000) {
        console.error('[data/post] master copy failed:', masterErr.message);
      }
    }

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
    // Destructure reserved fields out of req.body — client must not override them.
    const { userId: _, _masterId: __, _userModified: ___, ...safeBody } = req.body;

    const result = await col(req.params.type).findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
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
// PUT /api/v1/data/:type  (no id segment)
// Replaces the entire collection for the authenticated user — deleteMany + insertMany.
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

    // Only delete the authenticated user's documents — never touch master or other users.
    await col(req.params.type).deleteMany({ userId: req.user.userId });

    if (entities.length > 0) {
      // After deleting the user's docs, find which incoming _ids still exist in the
      // collection (owned by other users). Those must get fresh ids to avoid E11000.
      const incomingIds = entities.map(e => e._id).filter(Boolean);
      const stillTaken = incomingIds.length > 0
        ? new Set(
            (await col(req.params.type)
              .find({ _id: { $in: incomingIds } }, { projection: { _id: 1 } })
              .toArray()).map(d => d._id)
          )
        : new Set();

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
      await col(req.params.type).insertMany(docs, { ordered: false });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[data/replaceAll]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/data/:type/:id
// Removes one document, scoped to the authenticated user.
// ---------------------------------------------------------------------------
router.delete('/:type/:id', verifyToken, async (req, res) => {
  try {
    const result = await col(req.params.type).deleteOne({
      _id: req.params.id,
      userId: req.user.userId,
    });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: `Cannot remove, item ${req.params.id} of type: ${req.params.type} does not exist` });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[data/delete]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
