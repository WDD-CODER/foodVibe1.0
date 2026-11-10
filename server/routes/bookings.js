'use strict'
/**
 * Plan 549 (contract C-REQUEST): the one door for a booking's status. The generic data API only reads `bookings`
 * (writes answer 405 USE_ROUTER). Plan 550 adds GET /day and creates bookings when a request is approved.
 */
const { Router } = require('express')
const mongoose = require('mongoose')
const { verifyToken } = require('../middleware/auth')
const { checkStoredDoc } = require('../middleware/validate')
const { dataWriteLimiter } = require('../middleware/write-limit')
const { scopeFilter } = require('../utils/business-scope')
const { assertCan } = require('../utils/permissions')
const { actorOf } = require('../utils/actor')
const { LIVE } = require('../jobs/purge-deleted')
const { BOOKING_STATUSES } = require('../generated/schemas/entities/booking.schema')

const TYPE = 'bookings'
const router = Router()
const NOT_FOUND = { error: 'Booking not found' }
/** Legal member moves (Wave 1); `no_show` is also refused before the booking's start. */
const MOVES = {
  confirmed: ['seated', 'no_show', 'cancelled'],
  seated: ['finished', 'cancelled'],
}

router.use(dataWriteLimiter)

const db = () => mongoose.connection.db
const scopeOf = req => ({ _id: req.params.id, ...scopeFilter(req), ...LIVE })

function fail(req, res, name, err) {
  req.log.error({ err, event: `bookings.${name}.failed` })
  res.status(500).json({ error: 'Server error' })
}

// PUT /api/v1/bookings/:id/status  { status, note? }
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status, note } = req.body ?? {}
    if (!BOOKING_STATUSES.includes(status) || (note !== undefined && (typeof note !== 'string' || note.length > 500))) {
      return res.status(400).json({ error: 'BAD_REQUEST_INPUT' })
    }
    const current = await db().collection(TYPE).findOne(scopeOf(req))
    if (!current) return res.status(404).json(NOT_FOUND)
    if (!assertCan(req, res, 'manageRequests', { type: TYPE, doc: current })) return
    const now = Date.now()
    if (!(MOVES[current.status] ?? []).includes(status) || (status === 'no_show' && now < current.startAt)) {
      return res.status(409).json({ error: 'BAD_STATUS' })
    }
    const actor = actorOf(req)
    const entry = { status, at: now, by: actor.userId, byName: actor.name, via: 'member', ...(note && { note }) }
    const check = checkStoredDoc(TYPE, { ...current, status, updatedAt: now, statusHistory: [...current.statusHistory, entry] })
    if (!check.ok) return res.status(400).json({ error: 'Validation failed', issues: check.issues })
    // Conditional on the status that was read, so two concurrent moves cannot both write.
    const result = await db().collection(TYPE).findOneAndUpdate(
      { ...scopeOf(req), status: current.status },
      { $set: { status, updatedAt: now }, $push: { statusHistory: entry } },
      { returnDocument: 'after' },
    )
    if (!result) {
      const still = await db().collection(TYPE).findOne(scopeOf(req), { projection: { _id: 1 } })
      return still ? res.status(409).json({ error: 'STATUS_CHANGED' }) : res.status(404).json(NOT_FOUND)
    }
    if (status === 'no_show') {
      await db().collection('clients').updateOne(
        { _id: current.clientId, businessId: current.businessId },
        { $inc: { 'counters.noShows': 1 }, $set: { updatedAt: now } },
      )
    }
    req.log.info({ event: 'bookings.status.changed', from: current.status, to: status })
    res.json(result)
  } catch (err) {
    fail(req, res, 'status', err)
  }
})

module.exports = router
