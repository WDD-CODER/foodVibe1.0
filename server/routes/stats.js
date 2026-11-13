'use strict'
/** Plan 447 (spec 07.2): the dashboard's numbers, computed on the server and scoped to the caller's business. */
const { Router } = require('express')
const mongoose = require('mongoose')
const { verifyToken, isPlatformAdmin } = require('../middleware/auth')
const { scopeFilter } = require('../utils/business-scope')
const { can } = require('../utils/permissions')
const { jerusalemDate } = require('../middleware/usage')
const { getBusiness } = require('../services/business')
const { withEventVisibility } = require('../utils/event-visibility')
const { PERIODS, UPCOMING_DAYS, periodBounds, eventsPipeline, usagePipeline, shapeStats } = require('../services/business-stats')

const { buildReport } = require('../services/business-report')
const { REPORT_MONTHS, REPORT_DEFAULT_MONTHS } = require('../constants/report')

const { frontDeskStats, parseRange } = require('../services/frontdesk-stats')

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
    // Plan 477: staff count only the events they may see; the usage numbers keep the plain business scope.
    const eventScope = await withEventVisibility(req, 'menuEvents', scope)
    const now = Date.now()
    const bounds = periodBounds(period, now, business.createdAt)
    const todayIL = jerusalemDate(now)
    const plus14IL = jerusalemDate(now + UPCOMING_DAYS * DAY_MS)
    const isOwner = can(req.user, 'editMoney', { type: 'menuEvents' }).ok

    const db = mongoose.connection.db
    const [[facet], usage] = await Promise.all([
      db.collection('menuEvents').aggregate(eventsPipeline(eventScope, bounds, todayIL, plus14IL, now)).toArray(),
      isOwner ? db.collection('usageDays').aggregate(usagePipeline(scope, bounds, todayIL)).toArray() : Promise.resolve([]),
    ])
    res.json(shapeStats(facet ?? {}, usage, business, isOwner, period, bounds))
  } catch (err) {
    req.log.error({ err, event: 'stats.business.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

// Plan 568: GET /api/v1/stats/report?months=3|6|12[&businessId=] — owner of the business, or the platform admin with businessId.
router.get('/report', verifyToken, async (req, res) => {
  try {
    const admin = isPlatformAdmin(req)
    const wanted = req.query.businessId
    if (wanted !== undefined && !admin) return res.status(403).json({ error: 'Owner only' })
    if (wanted === undefined && !can(req.user, 'editMoney', { type: 'menuEvents' }).ok) return res.status(403).json({ error: 'Owner only' })
    const months = req.query.months === undefined ? REPORT_DEFAULT_MONTHS : Number(req.query.months)
    if (!REPORT_MONTHS.includes(months)) return res.status(400).json({ error: 'Invalid months' })
    const business = await getBusiness(wanted === undefined ? req.user.businessId : String(wanted))
    if (!business) return res.status(404).json({ error: 'Business not found' })
    res.json(await buildReport(mongoose.connection.db, business, months))
  } catch (err) {
    req.log.error({ err, event: 'stats.report.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

// Plan 559: GET /api/v1/stats/frontdesk?from&to[&businessId=] — the front desk numbers; default the last 7 Israel days.
router.get('/frontdesk', verifyToken, async (req, res) => {
  try {
    const admin = isPlatformAdmin(req)
    const wanted = req.query.businessId
    if (wanted !== undefined && !admin) return res.status(403).json({ error: 'Owner only' })
    if (wanted === undefined && !can(req.user, 'editMoney', { type: 'menuEvents' }).ok) return res.status(403).json({ error: 'Owner only' })
    const range = parseRange(req.query, 7)
    if (!range) return res.status(400).json({ error: 'Invalid range' })
    const business = await getBusiness(wanted === undefined ? req.user.businessId : String(wanted))
    if (!business) return res.status(404).json({ error: 'Business not found' })
    res.json(await frontDeskStats(mongoose.connection.db, business._id, range, business))
  } catch (err) {
    req.log.error({ err, event: 'stats.frontdesk.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
