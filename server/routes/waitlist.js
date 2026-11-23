'use strict'
/**
 * Plan 673 (C-WAIT, R11): the waiting list of table service at `/api/v1/waitlist`. The only writer of `waitlistEntries`.
 * Every write is a status move: `waiting` -> `notified` -> `seated` | `left`. `seat` claims the entry first, then creates the
 * walk-in booking through the one walk-in function, and puts the entry back when the booking is refused.
 * Log lines carry an event name, the entry id, the party size and a code, never a name or a phone.
 */
const { Router } = require('express')
const mongoose = require('mongoose')
const { z } = require('zod')
const { verifyToken } = require('../middleware/auth')
const { requireModule } = require('../middleware/require-module')
const { dataWriteLimiter } = require('../middleware/write-limit')
const { scopeFilter } = require('../utils/business-scope')
const { assertCan } = require('../utils/permissions')
const { actorOf } = require('../utils/actor')
const { newId } = require('../utils/id')
const { LIVE } = require('../jobs/purge-deleted')
const { jerusalemEpoch } = require('../generated/schemas/front-desk/local-time')
const tb = require('../services/table-bookings')

const TYPE = 'waitlistEntries'
const HOUR_MS = 3600000
const router = Router()
const db = () => mongoose.connection.db
const scopeOf = req => ({ _id: req.params.id, ...scopeFilter(req), ...LIVE })
const gate = [verifyToken, requireModule('frontdesk'), requireModule('tables')]

const keyField = z.string().regex(/^[a-z0-9]{6,12}$/)
const addBody = z.strictObject({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  guestName: z.string().trim().min(1).max(80),
  guestPhone: z.string().max(30),
  partySize: z.number().int().min(1).max(30),
  areaKey: keyField.optional(),
  quotedMinutes: z.number().int().min(0).max(240).optional(),
})
const seatBody = z.strictObject({ tableKeys: z.array(keyField).min(1).max(4) })

const bad = res => res.status(400).json({ error: 'BAD_REQUEST_INPUT' })

function fail(req, res, name, err) {
  req.log.error({ err, event: `waitlist.${name}.failed` })
  res.status(500).json({ error: 'Server error' })
}

/** True when `date` is today in Jerusalem, with a 30-hour window so a list that runs past midnight still takes a party. */
function isToday(date, now) {
  const start = jerusalemEpoch(date, '00:00')
  return start <= now && now < start + 30 * HOUR_MS
}

/** One conditional update: the entry moves only if it still holds the status that was read. The updated entry or null. */
async function move(req, entry, set) {
  const r = await db().collection(TYPE).findOneAndUpdate(
    { _id: entry._id, ...scopeFilter(req), status: entry.status },
    { $set: set },
    { returnDocument: 'after' },
  )
  return r && Object.prototype.hasOwnProperty.call(r, 'value') ? r.value : r
}

/** Reads the entry and checks its status; answers 404 / 409 itself and returns null when it did. */
async function load(req, res, allowed) {
  if (!assertCan(req, res, 'manageRequests', { type: TYPE })) return null
  const entry = await db().collection(TYPE).findOne(scopeOf(req))
  if (!entry) {
    res.status(404).json({ error: 'Entry not found' })
    return null
  }
  if (!allowed.includes(entry.status)) {
    req.log.info({ event: 'waitlist.refused', id: entry._id, partySize: entry.partySize, code: 'BAD_STATUS' })
    res.status(409).json({ error: 'BAD_STATUS' })
    return null
  }
  return entry
}

const changed = (req, res, entry) => {
  req.log.info({ event: 'waitlist.refused', id: entry._id, partySize: entry.partySize, code: 'STATUS_CHANGED' })
  return res.status(409).json({ error: 'STATUS_CHANGED' })
}

router.use(dataWriteLimiter)

// GET /api/v1/waitlist?date=YYYY-MM-DD -> { entries, now }
router.get('/', ...gate, async (req, res) => {
  try {
    if (!assertCan(req, res, 'manageRequests', { type: TYPE })) return
    const { date } = req.query
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'BAD_DATE' })
    const entries = await db().collection(TYPE).find({ ...scopeFilter(req), ...LIVE, date }).sort({ joinedAt: 1 }).toArray()
    res.json({ entries, now: Date.now() })
  } catch (err) {
    fail(req, res, 'list', err)
  }
})

// POST /api/v1/waitlist -> 201 the entry
router.post('/', ...gate, async (req, res) => {
  try {
    if (!assertCan(req, res, 'manageRequests', { type: TYPE })) return
    const parsed = addBody.safeParse(req.body ?? {})
    if (!parsed.success) return bad(res)
    const now = Date.now()
    if (!isToday(parsed.data.date, now)) return res.status(400).json({ error: 'BAD_DATE' })
    const actor = actorOf(req)
    const { businessId } = scopeFilter(req)
    const entry = {
      _id: newId(), schemaVersion: 2, userId: actor.userId, businessId, createdBy: actor.userId, createdAt: now, updatedAt: now,
      ...parsed.data, status: 'waiting', joinedAt: now,
    }
    await db().collection(TYPE).insertOne(entry)
    req.log.info({ event: 'waitlist.added', id: entry._id, partySize: entry.partySize })
    res.status(201).json(entry)
  } catch (err) {
    fail(req, res, 'add', err)
  }
})

// PUT /api/v1/waitlist/:id/notify: only stamps; the message itself is sent by the conversation channel (plans 675/676)
router.put('/:id/notify', ...gate, async (req, res) => {
  try {
    const entry = await load(req, res, ['waiting'])
    if (!entry) return
    const now = Date.now()
    const next = await move(req, entry, { status: 'notified', notifiedAt: now, updatedAt: now })
    if (!next) return changed(req, res, entry)
    req.log.info({ event: 'waitlist.notified', id: entry._id, partySize: entry.partySize })
    res.json(next)
  } catch (err) {
    fail(req, res, 'notify', err)
  }
})

// PUT /api/v1/waitlist/:id/left
router.put('/:id/left', ...gate, async (req, res) => {
  try {
    const entry = await load(req, res, ['waiting', 'notified'])
    if (!entry) return
    const next = await move(req, entry, { status: 'left', updatedAt: Date.now() })
    if (!next) return changed(req, res, entry)
    req.log.info({ event: 'waitlist.left', id: entry._id, partySize: entry.partySize })
    res.json(next)
  } catch (err) {
    fail(req, res, 'left', err)
  }
})

// PUT /api/v1/waitlist/:id/seat  { tableKeys }: claim the entry, create the walk-in booking, link it
router.put('/:id/seat', ...gate, async (req, res) => {
  try {
    const parsed = seatBody.safeParse(req.body ?? {})
    if (!parsed.success) return bad(res)
    const { tableKeys } = parsed.data
    const entry = await load(req, res, ['waiting', 'notified'])
    if (!entry) return
    const claimed = await move(req, entry, { status: 'seated', updatedAt: Date.now() })
    if (!claimed) return changed(req, res, entry)
    const putBack = () => db().collection(TYPE).updateOne(
      { _id: entry._id, ...scopeFilter(req) },
      { $set: { status: entry.status, updatedAt: Date.now() }, $unset: { bookingId: '' } },
    )
    const refuse = async (status, body, code) => {
      await putBack()
      req.log.info({ event: 'waitlist.refused', id: entry._id, partySize: entry.partySize, code })
      return res.status(status).json(body)
    }
    try {
      const { businessId } = scopeFilter(req)
      const ctx = { ...(await tb.loadTableContext(db(), businessId)), businessId, actor: actorOf(req) }
      if (!tb.checkTables(ctx.plan, tableKeys)) return await refuse(400, { error: 'BAD_TABLES' }, 'BAD_TABLES')
      const who = entry.guestPhone ? { guest: { name: entry.guestName, phone: entry.guestPhone } } : { name: entry.guestName }
      const r = await tb.createWalkIn(db(), ctx, { partySize: entry.partySize, tableKeys, ...who })
      if (!r.ok) return await refuse(409, { error: r.code, reason: r.reason, alternatives: r.alternatives }, r.code)
      await db().collection(TYPE).updateOne(
        { _id: entry._id, ...scopeFilter(req) },
        { $set: { bookingId: r.booking._id, updatedAt: Date.now() } },
      )
      req.log.info({ event: 'waitlist.seated', id: entry._id, partySize: entry.partySize, tables: tableKeys.length })
      res.json({ ...claimed, bookingId: r.booking._id })
    } catch (err) {
      await putBack()
      if (err?.code === 'BAD_CLIENT' || err?.code === 'INVALID_DOC') {
        req.log.info({ event: 'waitlist.refused', id: entry._id, partySize: entry.partySize, code: err.code })
        return res.status(400).json({ error: err.code === 'BAD_CLIENT' ? 'BAD_CLIENT' : 'Validation failed', issues: err.issues })
      }
      throw err
    }
  } catch (err) {
    fail(req, res, 'seat', err)
  }
})

module.exports = router
