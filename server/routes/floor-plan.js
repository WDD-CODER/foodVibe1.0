'use strict'
/**
 * Plan 664 (C-FLOOR): the business's one floor plan. GET answers it (or null), PUT replaces it whole after the schema
 * check, the shared cross-field check and the in-use refusal. Plan 667 adds the hold routes to this router.
 */
const { Router } = require('express')
const mongoose = require('mongoose')
const { verifyToken } = require('../middleware/auth')
const { requireModule } = require('../middleware/require-module')
const { checkStoredDoc } = require('../middleware/validate')
const { dataWriteLimiter } = require('../middleware/write-limit')
const { scopeFilter } = require('../utils/business-scope')
const { assertCan } = require('../utils/permissions')
const { actorOf } = require('../utils/actor')
const { newId } = require('../utils/id')
const { LIVE } = require('../jobs/purge-deleted')
const { tableServiceOf } = require('../generated/schemas/front-desk/table-service')
const { checkFloorPlan } = require('../generated/schemas/front-desk/floor-plan-check')

const TYPE = 'floorPlans'
const router = Router()
router.use(dataWriteLimiter)

const db = () => mongoose.connection.db

function fail(req, res, name, err) {
  req.log.error({ err, event: `floor_plan.${name}.failed` })
  res.status(500).json({ error: 'Server error' })
}

const counts = p => ({ tables: p.tables.length, joins: p.joins.length, areas: p.areas.length })
const setKey = keys => [...keys].sort().join('|')

/** Bookings that still hold a table the new plan no longer has, or a set of tables no join of it offers. */
async function blockingBookings(businessId, plan, now) {
  const tableKeys = new Set(plan.tables.map(t => t.key))
  const joinSets = new Set(plan.joins.map(j => setKey(j.tableKeys)))
  const rows = await mongoose.connection.db.collection('bookings')
    .find({ businessId, status: { $in: ['confirmed', 'seated'] }, endAt: { $gt: now }, 'tableKeys.0': { $exists: true } })
    .sort({ startAt: 1 })
    .toArray()
  return rows
    .filter(b => b.tableKeys.some(k => !tableKeys.has(k)) || (b.tableKeys.length > 1 && !joinSets.has(setKey(b.tableKeys))))
    .slice(0, 50)
    .map(b => ({ _id: b._id, date: b.date, time: b.time, partySize: b.partySize, tableKeys: b.tableKeys }))
}

// GET /api/v1/floor-plan -> { plan }  (plan is null until the owner saves one; nothing is inserted)
router.get('/', verifyToken, requireModule('tables'), async (req, res) => {
  try {
    if (!assertCan(req, res, 'manageRequests', { type: TYPE })) return
    const plan = await db().collection(TYPE).findOne(scopeFilter(req))
    res.json({ plan: plan ?? null })
  } catch (err) {
    fail(req, res, 'get', err)
  }
})

// PUT /api/v1/floor-plan  { grid, areas, tables, joins } -> { plan }
router.put('/', verifyToken, requireModule('tables'), async (req, res) => {
  try {
    if (!assertCan(req, res, 'editFrontDesk', { type: TYPE })) return
    const { grid, areas, tables, joins } = req.body ?? {}
    if (!grid || typeof grid !== 'object' || !Array.isArray(areas) || !Array.isArray(tables) || !Array.isArray(joins)) {
      return res.status(400).json({ error: 'BAD_REQUEST_INPUT' })
    }
    const scope = scopeFilter(req)
    const stored = await db().collection(TYPE).findOne(scope)
    const now = Date.now()
    const actor = actorOf(req)
    const doc = stored
      ? { ...stored, grid, areas, tables, joins, updatedAt: now }
      : {
          _id: newId(), schemaVersion: 2, businessId: scope.businessId, createdBy: actor.userId, userId: actor.userId,
          createdAt: now, updatedAt: now, grid, areas, tables, joins,
        }
    const check = checkStoredDoc(TYPE, doc)
    if (!check.ok) {
      req.log.info({ event: 'floor_plan.refused', reason: 'validation' })
      return res.status(400).json({ error: 'Validation failed', issues: check.issues })
    }
    const issues = checkFloorPlan(doc)
    if (issues.length) {
      req.log.info({ event: 'floor_plan.refused', reason: 'check', ...counts(doc) })
      return res.status(400).json({ error: 'BAD_FLOOR_PLAN', issues })
    }
    const bookings = await blockingBookings(scope.businessId, doc, now)
    if (bookings.length) {
      req.log.info({ event: 'floor_plan.refused', reason: 'in_use', ...counts(doc) })
      return res.status(409).json({ error: 'TABLE_IN_USE', bookings })
    }
    if (stored) {
      await db().collection(TYPE).findOneAndReplace({ _id: stored._id, businessId: stored.businessId }, doc)
    } else {
      try {
        await db().collection(TYPE).insertOne(doc)
      } catch (err) {
        if (err.code === 11000) return res.status(409).json({ error: 'PLAN_CHANGED' })
        throw err
      }
    }
    req.log.info({ event: 'floor_plan.saved', ...counts(doc), first: !stored })
    res.json({ plan: doc })
  } catch (err) {
    fail(req, res, 'save', err)
  }
})

// PUT /api/v1/floor-plan/confirm-mode  { confirmMode } -> { confirmMode }  (plan 667: the one-button switch of D3)
router.put('/confirm-mode', verifyToken, requireModule('tables'), async (req, res) => {
  try {
    const confirmMode = req.body?.confirmMode
    if (confirmMode !== 'auto' && confirmMode !== 'manual') return res.status(400).json({ error: 'BAD_REQUEST_INPUT' })
    const profile = await db().collection('frontDeskProfiles').findOne({ ...scopeFilter(req), ...LIVE })
    if (!profile) return res.status(404).json({ error: 'NO_PROFILE' })
    if (!assertCan(req, res, 'editFrontDesk', { type: 'frontDeskProfiles', doc: profile })) return
    const tableService = { ...tableServiceOf(profile), confirmMode }
    const updatedAt = Date.now()
    const check = checkStoredDoc('frontDeskProfiles', { ...profile, tableService, updatedAt })
    if (!check.ok) return res.status(400).json({ error: 'Validation failed', issues: check.issues })
    await db().collection('frontDeskProfiles').updateOne(
      { _id: profile._id, businessId: profile.businessId },
      { $set: { tableService, updatedAt } }
    )
    req.log.info({ event: 'floor_plan.confirm_mode.changed', to: confirmMode })
    res.json({ confirmMode })
  } catch (err) {
    fail(req, res, 'confirm_mode', err)
  }
})

module.exports = router
