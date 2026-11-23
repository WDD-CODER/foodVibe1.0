'use strict'
/**
 * Plan 549 (contract C-REQUEST): the one door for a booking's status. The generic data API only reads `bookings`
 * (writes answer 405 USE_ROUTER). Plan 550 adds GET /day; a booking is created when a request is approved (requests.js).
 */
const { Router } = require('express')
const mongoose = require('mongoose')
const { verifyToken } = require('../middleware/auth')
const { requireModule, businessModules } = require('../middleware/require-module')
const { checkStoredDoc } = require('../middleware/validate')
const { dataWriteLimiter } = require('../middleware/write-limit')
const { scopeFilter } = require('../utils/business-scope')
const { assertCan } = require('../utils/permissions')
const { actorOf } = require('../utils/actor')
const { LIVE } = require('../jobs/purge-deleted')
const { BOOKING_STATUSES } = require('../generated/schemas/entities/booking.schema')
const { NAME_MAX_LENGTH } = require('../generated/schemas/base.schema')
const { jerusalemEpoch } = require('../generated/schemas/front-desk/local-time')
const { dayAvailability } = require('../generated/schemas/front-desk/table-engine')
const { newId } = require('../utils/id')
const { newPublicToken } = require('../utils/public-token')
const { upsertClientByPhone } = require('../utils/client-upsert')
const holds = require('../services/table-holds')
const tb = require('../services/table-bookings')

const TYPE = 'bookings'
const router = Router()
const NOT_FOUND = { error: 'Booking not found' }

router.use(dataWriteLimiter)

const db = () => mongoose.connection.db
const scopeOf = req => ({ _id: req.params.id, ...scopeFilter(req), ...LIVE })

function fail(req, res, name, err) {
  req.log.error({ err, event: `bookings.${name}.failed` })
  res.status(500).json({ error: 'Server error' })
}

const COVERING = ['confirmed', 'seated', 'finished']

// Plan 668: table bookings. Input checks by hand, in the style of this file.
const HOUR_MS = 3600000
const DAY_MS = 86400000
const bad = res => res.status(400).json({ error: 'BAD_REQUEST_INPUT' })
const isDate = v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
const isTime = v => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v)
const isParty = v => Number.isInteger(v) && v >= 1 && v <= 30
const isKey = v => typeof v === 'string' && /^[a-z0-9]{6,12}$/.test(v)
const isKeys = v => Array.isArray(v) && v.length >= 1 && v.length <= 4 && v.every(isKey)
const isGuest = g => !!g && typeof g === 'object' && typeof g.name === 'string' && g.name.length >= 1 && g.name.length <= NAME_MAX_LENGTH
  && typeof g.phone === 'string' && g.phone.length >= 7 && g.phone.length <= 30
const noTable = (res, r) => res.status(409).json({ error: 'NO_TABLE', reason: r.reason, alternatives: r.alternatives })
const tablesCtx = async req => ({
  ...(await tb.loadTableContext(db(), scopeFilter(req).businessId)), businessId: scopeFilter(req).businessId, actor: actorOf(req),
})

/** Answers the two errors a table write may throw; true when it answered. */
function answered(res, err) {
  if (err?.code === 'BAD_CLIENT' || err?.code === 'INVALID_DOC') {
    res.status(400).json({ error: err.code === 'BAD_CLIENT' ? 'BAD_CLIENT' : 'Validation failed', issues: err.issues })
    return true
  }
  return false
}

// GET /api/v1/bookings/availability?date=&partySize=&area= -> { slots: [{ time, available }] }
router.get('/availability', verifyToken, requireModule('frontdesk'), requireModule('tables'), async (req, res) => {
  try {
    const { date, partySize, area } = req.query
    const party = Number(partySize)
    if (!isDate(date) || !isParty(party) || (area !== undefined && !isKey(area))) return bad(res)
    if (!assertCan(req, res, 'manageRequests', { type: TYPE })) return
    const ctx = await tablesCtx(req)
    if (!ctx.plan || !ctx.profile) return res.json({ slots: [] })
    const from = jerusalemEpoch(date, '00:00')
    const day = await holds.holdsOf(db(), ctx.businessId, from - 6 * HOUR_MS, from + DAY_MS + 6 * HOUR_MS)
    const slots = dayAvailability(ctx.plan, ctx.profile, day, { date, partySize: party, areaKey: area, onlineOnly: false, now: Date.now() })
    res.json({ slots })
  } catch (err) {
    fail(req, res, 'availability', err)
  }
})

// POST /api/v1/bookings  { clientId | guest: { name, phone }, date, time, partySize, areaKey?, tableKeys?, notes? }
router.post('/', verifyToken, requireModule('frontdesk'), requireModule('tables'), async (req, res) => {
  try {
    const { clientId, guest, date, time, partySize, areaKey, tableKeys, notes } = req.body ?? {}
    if ((clientId === undefined) === (guest === undefined)) return bad(res)
    if ((clientId !== undefined && (typeof clientId !== 'string' || !clientId)) || (guest !== undefined && !isGuest(guest))) return bad(res)
    if (!isDate(date) || !isTime(time) || !isParty(partySize)) return bad(res)
    if ((areaKey !== undefined && !isKey(areaKey)) || (tableKeys !== undefined && !isKeys(tableKeys))) return bad(res)
    if (notes !== undefined && (typeof notes !== 'string' || notes.length > 1000)) return bad(res)
    if (!assertCan(req, res, 'manageRequests', { type: TYPE })) return
    if (tableKeys && !assertCan(req, res, 'editFrontDesk', { type: TYPE })) return
    const ctx = await tablesCtx(req)
    if (tableKeys && !tb.checkTables(ctx.plan, tableKeys)) return res.status(400).json({ error: 'BAD_TABLES' })
    let client
    if (guest) {
      client = (await upsertClientByPhone(db(), ctx.businessId, { name: guest.name, phone: guest.phone, source: 'manual', actor: ctx.actor })).client
    } else {
      client = await db().collection('clients').findOne({ _id: clientId, businessId: ctx.businessId, ...LIVE, mergedInto: { $exists: false } })
      if (!client) return res.status(404).json({ error: 'CLIENT_NOT_FOUND' })
    }
    const now = Date.now()
    const doc = {
      _id: newId(), schemaVersion: 2, userId: ctx.actor.userId, businessId: ctx.businessId, createdBy: ctx.actor.userId,
      createdAt: now, updatedAt: now, kind: 'table', status: 'confirmed', source: 'phone', clientId: client._id,
      guestName: client.name ?? '', guestPhone: client.phone ?? '', ...(notes && { notes }),
      statusHistory: [{ status: 'confirmed', at: now, by: ctx.actor.userId, byName: ctx.actor.name, via: 'member' }],
      publicToken: newPublicToken(),
    }
    const r = await tb.bookTable(db(), { doc, ctx, date, time, partySize, areaKey, onlineOnly: false, tableKeys, now })
    if (!r.ok) {
      req.log.info({ event: 'bookings.no_table', reason: r.reason, source: 'phone' })
      return noTable(res, r)
    }
    await tb.countBooking(db(), ctx.businessId, client._id, now)
    req.log.info({ event: 'bookings.created', source: 'phone', partySize, tables: r.booking.tableKeys.length, override: !!r.booking.override })
    res.status(201).json(r.booking)
  } catch (err) {
    if (answered(res, err)) return
    fail(req, res, 'create', err)
  }
})

// POST /api/v1/bookings/walk-in  { partySize, tableKeys, guest? } -> a seated booking from now
router.post('/walk-in', verifyToken, requireModule('frontdesk'), requireModule('tables'), async (req, res) => {
  try {
    const { partySize, tableKeys, guest } = req.body ?? {}
    if (!isParty(partySize) || !isKeys(tableKeys) || (guest !== undefined && !isGuest(guest))) return bad(res)
    if (!assertCan(req, res, 'manageRequests', { type: TYPE })) return
    const ctx = await tablesCtx(req)
    if (!tb.checkTables(ctx.plan, tableKeys)) return res.status(400).json({ error: 'BAD_TABLES' })
    const r = await tb.createWalkIn(db(), ctx, { partySize, tableKeys, guest })
    if (!r.ok) {
      req.log.info({ event: 'bookings.no_table', reason: r.reason, source: 'walk_in' })
      return noTable(res, r)
    }
    req.log.info({ event: 'bookings.walk_in', partySize, tables: tableKeys.length, override: !!r.booking.override, guest: !!guest })
    res.status(201).json(r.booking)
  } catch (err) {
    if (answered(res, err)) return
    fail(req, res, 'walk_in', err)
  }
})

// PUT /api/v1/bookings/:id/tables  { tableKeys }
router.put('/:id/tables', verifyToken, requireModule('frontdesk'), requireModule('tables'), async (req, res) => {
  try {
    const { tableKeys } = req.body ?? {}
    if (!isKeys(tableKeys)) return bad(res)
    const current = await db().collection(TYPE).findOne(scopeOf(req))
    if (!current) return res.status(404).json(NOT_FOUND)
    if (!assertCan(req, res, 'manageRequests', { type: TYPE, doc: current })) return
    if (current.kind !== 'table' || !['confirmed', 'seated'].includes(current.status)) return res.status(409).json({ error: 'BAD_STATUS' })
    const ctx = await tablesCtx(req)
    if (!tb.checkTables(ctx.plan, tableKeys)) return res.status(400).json({ error: 'BAD_TABLES' })
    const now = Date.now()
    const override = tb.overrideOf(ctx.plan, current.partySize, tableKeys)
    const areaKey = ctx.plan.tables.find(t => t.key === tableKeys[0]).areaKey
    const { override: _old, ...rest } = current
    const check = checkStoredDoc(TYPE, { ...rest, tableKeys, areaKey, updatedAt: now, ...(override && { override: true }) })
    if (!check.ok) return res.status(400).json({ error: 'Validation failed', issues: check.issues })
    const holdEnd = current.endAt + ctx.service.bufferMinutes * 60000
    const from = current.status === 'seated' ? Math.min(Math.max(current.startAt, now), holdEnd - holds.CELL_MS) : current.startAt
    const moved = await holds.move(db(), current, tableKeys, from, holdEnd)
    if (!moved.ok) {
      req.log.info({ event: 'bookings.no_table', reason: 'full', source: 'move' })
      return noTable(res, { reason: 'full', alternatives: [] })
    }
    try {
      const done = await db().collection(TYPE).findOneAndUpdate(
        { ...scopeOf(req), status: current.status },
        { $set: { tableKeys, areaKey, updatedAt: now, ...(override && { override: true }) }, ...(!override && { $unset: { override: '' } }) },
        { returnDocument: 'after' },
      )
      if (!done) throw Object.assign(new Error('STATUS_CHANGED'), { code: 'STATUS_CHANGED' })
      req.log.info({ event: 'bookings.moved', tables: tableKeys.length, override })
      res.json(done)
    } catch (err) {
      if (current.tableKeys?.length) await holds.move(db(), current, current.tableKeys, from, holdEnd)
      else await holds.release(db(), current.businessId, current._id)
      if (err.code === 'STATUS_CHANGED') return res.status(409).json({ error: 'STATUS_CHANGED' })
      throw err
    }
  } catch (err) {
    fail(req, res, 'tables', err)
  }
})

// PUT /api/v1/bookings/:id/when  { date?, time?, partySize?, tableKeys? }
router.put('/:id/when', verifyToken, requireModule('frontdesk'), requireModule('tables'), async (req, res) => {
  try {
    const { date, time, partySize, tableKeys } = req.body ?? {}
    if ([date, time, partySize, tableKeys].every(v => v === undefined)) return bad(res)
    if ((date !== undefined && !isDate(date)) || (time !== undefined && !isTime(time)) || (partySize !== undefined && !isParty(partySize))) return bad(res)
    if (tableKeys !== undefined && !isKeys(tableKeys)) return bad(res)
    const current = await db().collection(TYPE).findOne(scopeOf(req))
    if (!current) return res.status(404).json(NOT_FOUND)
    if (!assertCan(req, res, 'manageRequests', { type: TYPE, doc: current })) return
    if (tableKeys && !assertCan(req, res, 'editFrontDesk', { type: TYPE })) return
    if (current.kind !== 'table' || current.status !== 'confirmed') return res.status(409).json({ error: 'BAD_STATUS' })
    const ctx = await tablesCtx(req)
    if (tableKeys && !tb.checkTables(ctx.plan, tableKeys)) return res.status(400).json({ error: 'BAD_TABLES' })
    const r = await tb.rebookTable(db(), {
      current, ctx, date, time, partySize, tableKeys, now: Date.now(),
      update: async change => {
        const w = await db().collection(TYPE).updateOne({ ...scopeOf(req), status: 'confirmed' }, change)
        if (!w.matchedCount) throw Object.assign(new Error('STATUS_CHANGED'), { code: 'STATUS_CHANGED' })
      },
    })
    if (!r.ok) {
      req.log.info({ event: 'bookings.no_table', reason: r.reason, source: 'change' })
      return noTable(res, r)
    }
    req.log.info({ event: 'bookings.changed', partySize: r.set.partySize, tables: r.set.tableKeys.length, override: !!r.override })
    res.json(await db().collection(TYPE).findOne(scopeOf(req)))
  } catch (err) {
    if (err?.code === 'STATUS_CHANGED') return res.status(409).json({ error: 'STATUS_CHANGED' })
    if (answered(res, err)) return
    fail(req, res, 'when', err)
  }
})

// GET /api/v1/bookings/day?date=YYYY-MM-DD -> { bookings, coversByHour }  (Wave 1 manual stand-in for availability)
router.get('/day', verifyToken, requireModule('frontdesk'), async (req, res) => {
  try {
    const { date } = req.query
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'BAD_DATE' })
    if (!assertCan(req, res, 'manageRequests', { type: TYPE })) return
    const bookings = await db().collection(TYPE)
      .find({ ...scopeFilter(req), ...LIVE, date, status: { $ne: 'cancelled' } })
      .sort({ startAt: 1 })
      .toArray()
    const coversByHour = {}
    for (const b of bookings) {
      if (!COVERING.includes(b.status)) continue
      const hour = b.time.slice(0, 2)
      coversByHour[hour] = (coversByHour[hour] ?? 0) + b.partySize
    }
    const businessId = scopeFilter(req).businessId
    if (!(await businessModules(businessId)).includes('tables')) return res.json({ bookings, coversByHour })
    const from = jerusalemEpoch(date, '00:00')
    const to = jerusalemEpoch(tb.wallOf(from + 36 * HOUR_MS).date, '06:00')
    const rows = await holds.rowsOf(db(), businessId, from, to)
    const unassigned = bookings
      .filter(b => b.kind === 'table' && ['confirmed', 'seated'].includes(b.status) && !b.tableKeys?.length)
      .map(b => b._id)
    res.json({ bookings, coversByHour, holds: holds.rangesOf(rows), unassigned, now: Date.now() })
  } catch (err) {
    fail(req, res, 'day', err)
  }
})

// PUT /api/v1/bookings/:id/status  { status, note? }
router.put('/:id/status', verifyToken, requireModule('frontdesk'), async (req, res) => {
  try {
    const { status, note } = req.body ?? {}
    if (!BOOKING_STATUSES.includes(status) || (note !== undefined && (typeof note !== 'string' || note.length > 500))) {
      return res.status(400).json({ error: 'BAD_REQUEST_INPUT' })
    }
    const current = await db().collection(TYPE).findOne(scopeOf(req))
    if (!current) return res.status(404).json(NOT_FOUND)
    if (!assertCan(req, res, 'manageRequests', { type: TYPE, doc: current })) return
    const actor = actorOf(req)
    const r = await tb.moveBookingStatus(db(), {
      businessId: current.businessId, id: current._id, status, by: actor.userId, byName: actor.name, via: 'member', note, now: Date.now(),
    })
    if (!r.ok) {
      if (r.code === 'INVALID') return res.status(400).json({ error: 'Validation failed', issues: r.issues })
      if (r.code === 'NOT_FOUND') return res.status(404).json(NOT_FOUND)
      return res.status(409).json({ error: r.code })
    }
    const result = r.booking
    req.log.info({ event: 'bookings.status.changed', from: r.from, to: status })
    res.json(result)
  } catch (err) {
    fail(req, res, 'status', err)
  }
})

module.exports = router
