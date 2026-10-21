'use strict'
/** Plan 447 (spec 07.2): the dashboard's numbers, computed on the server and scoped to the caller's business. */
const { Router } = require('express')
const mongoose = require('mongoose')
const { verifyToken } = require('../middleware/auth')
const { scopeFilter } = require('../utils/business-scope')
const { can } = require('../utils/permissions')
const { jerusalemDate } = require('../middleware/usage')
const { getBusiness } = require('../services/business')
const { PERIODS, UPCOMING_DAYS, periodBounds, eventsPipeline, usagePipeline, shapeStats } = require('../services/business-stats')

const router = Router()
const DAY_MS = 86400000

// GET /api/v1/stats/business?period=30|90|all — owner: cards + funnel + upcoming; staff: funnel + upcoming only.
router.get('/business', verifyToken, async (req, res) => {
  try {
    const period = req.query.period === undefined ? '30' : String(req.query.period)
    if (!PERIODS.includes(period)) return res.status(400).json({ error: 'Invalid period' })
    const business = await getBusiness(req.user.businessId)
    if (!business) return res.status(404).json({ error: 'Business not found' })

    const scope = scopeFilter(req)
    const now = Date.now()
    const bounds = periodBounds(period, now, business.createdAt)
    const todayIL = jerusalemDate(now)
    const plus14IL = jerusalemDate(now + UPCOMING_DAYS * DAY_MS)
    const isOwner = can(req.user, 'editMoney', { type: 'menuEvents' }).ok

    const db = mongoose.connection.db
    const [[facet], usage] = await Promise.all([
      db.collection('menuEvents').aggregate(eventsPipeline(scope, bounds, todayIL, plus14IL, now)).toArray(),
      isOwner ? db.collection('usageDays').aggregate(usagePipeline(scope, bounds, todayIL)).toArray() : Promise.resolve([]),
    ])
    res.json(shapeStats(facet ?? {}, usage, business, isOwner, period, bounds))
  } catch (err) {
    req.log.error({ err, event: 'stats.business.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
