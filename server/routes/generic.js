const { Router } = require('express');
const Entity = require('../models/entity.model');
const { verifyToken } = require('../middleware/auth');

const router = Router();

// All routes require a valid JWT — reads are not public.
router.use(verifyToken);

// ---------------------------------------------------------------------------
// GET /api/data/:type
// Returns all entities of a given type as an array of their data objects.
// Mirrors StorageService.query().
// ---------------------------------------------------------------------------
router.get('/:type', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 500, 1000);
    const skip = parseInt(req.query.skip) || 0;
    const docs = await Entity.find({ entityType: req.params.type }).skip(skip).limit(limit).lean();
    res.json(docs.map(d => d.data));
  } catch (err) {
    console.error('[data/query]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/data/:type/:id
// Returns one entity by _id.
// Mirrors StorageService.get().
// ---------------------------------------------------------------------------
router.get('/:type/:id', async (req, res) => {
  try {
    const doc = await Entity.findOne({ _id: req.params.id, entityType: req.params.type }).lean();
    if (!doc) {
      return res.status(404).json({ error: `Cannot get, Item ${req.params.id} of type: ${req.params.type} does not exist` });
    }
    res.json(doc.data);
  } catch (err) {
    console.error('[data/get]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/data/:type
// Creates or appends an entity. _id must be present in the request body —
// Angular's makeId() assigns it before the request is sent (both for new
// entities via StorageService.post() and for appendExisting()).
// Mirrors StorageService.post() and appendExisting().
// ---------------------------------------------------------------------------
router.post('/:type', async (req, res) => {
  try {
    const entityData = req.body;
    if (!entityData._id) {
      return res.status(400).json({ error: '_id is required in the request body' });
    }

    const doc = await Entity.create({
      _id: entityData._id,
      entityType: req.params.type,
      data: entityData,
    });

    res.status(201).json(doc.data);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Entity already exists' });
    }
    console.error('[data/post]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/data/:type/:id
// Updates one entity's data. Mirrors StorageService.put().
// ---------------------------------------------------------------------------
router.put('/:type/:id', async (req, res) => {
  try {
    const doc = await Entity.findOneAndUpdate(
      { _id: req.params.id, entityType: req.params.type },
      { data: req.body },
      { new: true }
    ).lean();

    if (!doc) {
      return res.status(404).json({ error: `Cannot update, product ${req.params.id} does not exist` });
    }

    res.json(doc.data);
  } catch (err) {
    console.error('[data/put]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /api/data/:type  (no id segment)
// Replaces the entire collection for a given entity type.
// Body must be an array of entity objects.
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

    await Entity.deleteMany({ entityType: req.params.type });

    if (entities.length > 0) {
      const docs = entities.map(e => ({ _id: e._id, entityType: req.params.type, data: e }));
      await Entity.insertMany(docs, { ordered: false });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('[data/replaceAll]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /api/data/:type/:id
// Removes one entity. Mirrors StorageService.remove().
// ---------------------------------------------------------------------------
router.delete('/:type/:id', async (req, res) => {
  try {
    const doc = await Entity.findOneAndDelete({ _id: req.params.id, entityType: req.params.type });
    if (!doc) {
      return res.status(404).json({ error: `Cannot remove, product ${req.params.id} of type: ${req.params.type} does not exist` });
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[data/delete]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
