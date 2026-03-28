const { Router } = require('express');
const mongoose = require('mongoose');
const { verifyToken } = require('../middleware/auth');

const router = Router();

// All routes require a valid JWT — reads are not public.
router.use(verifyToken);

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
// Returns all documents in the collection as an array.
// Mirrors StorageService.query().
// ---------------------------------------------------------------------------
router.get('/:type', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 500, 1000);
    const skip = parseInt(req.query.skip) || 0;
    const docs = await col(req.params.type).find({}).skip(skip).limit(limit).toArray();
    res.json(docs);
  } catch (err) {
    console.error('[data/query]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/data/:type/:id
// Returns one document by _id.
// Mirrors StorageService.get().
// ---------------------------------------------------------------------------
router.get('/:type/:id', async (req, res) => {
  try {
    const doc = await col(req.params.type).findOne({ _id: req.params.id });
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
// Inserts a new document. _id must be present in the request body.
// Mirrors StorageService.post() and appendExisting().
// ---------------------------------------------------------------------------
router.post('/:type', async (req, res) => {
  try {
    const entity = req.body;
    if (!entity._id) {
      return res.status(400).json({ error: '_id is required in the request body' });
    }
    await col(req.params.type).insertOne(entity);
    res.status(201).json(entity);
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
// Replaces one document by _id.
// Mirrors StorageService.put().
// ---------------------------------------------------------------------------
router.put('/:type/:id', async (req, res) => {
  try {
    const result = await col(req.params.type).findOneAndReplace(
      { _id: req.params.id },
      req.body,
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
// Replaces the entire collection — deleteMany + insertMany.
// Body must be an array of entity objects. Each must have _id.
// Mirrors StorageService.replaceAll().
// ---------------------------------------------------------------------------
router.put('/:type', async (req, res) => {
  try {
    if (req.headers['x-confirm-replace'] !== 'true') {
      return res.status(400).json({ error: 'X-Confirm-Replace: true header is required for bulk replace' });
    }
    const entities = req.body;
    if (!Array.isArray(entities)) {
      return res.status(400).json({ error: 'Body must be an array of entity objects' });
    }

    await col(req.params.type).deleteMany({});

    if (entities.length > 0) {
      // Ensure every entity has a string _id before inserting.
      const docs = entities.map(e => e._id ? e : { ...e, _id: makeId() });
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
// Removes one document. Mirrors StorageService.remove().
// ---------------------------------------------------------------------------
router.delete('/:type/:id', async (req, res) => {
  try {
    const result = await col(req.params.type).deleteOne({ _id: req.params.id });
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
