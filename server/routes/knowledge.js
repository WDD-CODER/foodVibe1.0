'use strict'
/**
 * Plan 554 (INV-1, INV-3): bulk approve of knowledge drafts in one request. The generic data API has no partial bulk
 * update; this is the one door. Only the caller's business's live `draft` items change.
 */
const { Router } = require('express')
const mongoose = require('mongoose')
const { verifyToken } = require('../middleware/auth')
const { dataWriteLimiter } = require('../middleware/write-limit')
const { badRequest } = require('../middleware/validate')
const { scopeFilter } = require('../utils/business-scope')
const { assertCan } = require('../utils/permissions')

const TYPE = 'knowledgeItems'
const MAX_IDS = 200
const router = Router()

router.put('/approve', verifyToken, dataWriteLimiter, async (req, res) => {
  if (!assertCan(req, res, 'edit', { type: TYPE })) return
  const ids = req.body?.ids
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every(id => typeof id === 'string' && id)) {
    return badRequest(res, 'NO_IDS')
  }
  if (ids.length > MAX_IDS) return badRequest(res, 'TOO_MANY_IDS', { max: MAX_IDS })
  try {
    const result = await mongoose.connection.db.collection(TYPE).updateMany(
      { _id: { $in: ids }, ...scopeFilter(req), status: 'draft', deletedAt: { $exists: false } },
      { $set: { status: 'approved', updatedAt: Date.now() } }
    )
    req.log.info({ event: 'knowledge.approve', approved: result.modifiedCount })
    return res.json({ approved: result.modifiedCount })
  } catch (err) {
    req.log.error({ err, event: 'knowledge.approve.failed' })
    return res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
