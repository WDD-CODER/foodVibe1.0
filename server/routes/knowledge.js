'use strict'
/** Plan 554 (C-KB): bulk approve of knowledge drafts in one request. The rest of the CRUD is the generic data API. */
const { Router } = require('express')
const mongoose = require('mongoose')
const { verifyToken } = require('../middleware/auth')
const { dataWriteLimiter } = require('../middleware/write-limit')
const { scopeFilter } = require('../utils/business-scope')
const { assertCan } = require('../utils/permissions')
const { LIVE } = require('../jobs/purge-deleted')

const TYPE = 'knowledgeItems'
const MAX_IDS = 200
const router = Router()

// PUT /api/v1/knowledge/approve  { ids } -> { approved: n }
router.put('/approve', verifyToken, dataWriteLimiter, async (req, res) => {
  try {
    if (!assertCan(req, res, 'edit', { type: TYPE })) return
    const ids = req.body?.ids
    if (!Array.isArray(ids) || ids.length === 0 || !ids.every(id => typeof id === 'string' && id)) {
      return res.status(400).json({ error: 'NO_IDS' })
    }
    if (ids.length > MAX_IDS) return res.status(400).json({ error: 'TOO_MANY_IDS', max: MAX_IDS })
    const result = await mongoose.connection.db.collection(TYPE).updateMany(
      { _id: { $in: ids }, ...scopeFilter(req), status: 'draft', ...LIVE },
      { $set: { status: 'approved', updatedAt: Date.now() } }
    )
    res.json({ approved: result.modifiedCount })
  } catch (err) {
    req.log.error({ err, event: 'knowledge.approve.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
