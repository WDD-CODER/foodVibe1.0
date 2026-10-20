'use strict'
/** Plan 425: the caller's business. Owner-only sub-routes (settings, baseline, team) arrive with plans 427-431. */
const { Router } = require('express')
const { verifyToken } = require('../middleware/auth')
const { getBusiness } = require('../services/business')

const router = Router()

// GET /api/v1/business — the business document of the signed-in user, as stored. Any member may read it.
router.get('/', verifyToken, async (req, res) => {
  try {
    const business = await getBusiness(req.user.businessId)
    if (!business) return res.status(404).json({ error: 'Business not found' })
    res.json(business)
  } catch (err) {
    req.log.error({ err, event: 'business.get.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
