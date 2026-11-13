'use strict'
/**
 * Plan 551 (INV-1, INV-3): the one door for the two client actions the generic data API must not do.
 * POST /:id/merge folds a duplicate client into another one (re-keys every collection that points at it and stamps
 * both clients, in one request); PUT /:id/do-not-contact sets or clears the R-02 flag. `mergedInto` and
 * `doNotContact` are server-owned: the generic API drops them from every client write.
 */
const { Router } = require('express')
const mongoose = require('mongoose')
const { verifyToken } = require('../middleware/auth')
const { dataWriteLimiter } = require('../middleware/write-limit')
const { scopeFilter } = require('../utils/business-scope')
const { assertCan, staffProjection } = require('../utils/permissions')
const { actorOf } = require('../utils/actor')

const TYPE = 'clients'
const REKEYED = ['menuEvents', 'requests', 'bookings', 'conversations']
const NOTES_MAX = 2000
const KINDS_MAX = 3
const TAGS_MAX = 12
const REASON_MAX = 200
const NOT_FOUND = { error: 'Client not found' }
const router = Router()

router.use(verifyToken)
router.use(dataWriteLimiter)

const db = () => mongoose.connection.db
const clients = () => db().collection(TYPE)

function fail(req, res, name, err) {
  req.log.error({ err, event: `clients.${name}.failed` })
  res.status(500).json({ error: 'Server error' })
}

/** Sums the counters per key. */
function sumCounters(a = {}, b = {}) {
  const out = {}
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) out[key] = (a[key] ?? 0) + (b[key] ?? 0)
  return out
}

/** `first` then the items of `second` it lacks, capped. */
const union = (first = [], second = [], max) => [...new Set([...first, ...second])].slice(0, max)

const earliest = (x, y) => (x == null ? y : y == null ? x : Math.min(x, y))
const latest = (x, y) => (x == null ? y : y == null ? x : Math.max(x, y))

/** B's notes, plus A's after a blank line when B's do not already contain them; cut to the schema's cap. */
function mergeNotes(into, from) {
  if (!from) return into
  if (!into) return from.slice(0, NOTES_MAX)
  if (into.includes(from)) return into
  return `${into}\n\n${from}`.slice(0, NOTES_MAX)
}

/** The fields B takes from A. */
function mergedFields(b, a, now) {
  const set = {
    counters: sumCounters(b.counters, a.counters),
    kinds: union(b.kinds, a.kinds, KINDS_MAX),
    tags: union(b.tags, a.tags, TAGS_MAX),
    updatedAt: now,
  }
  const first = earliest(b.firstSeenAt, a.firstSeenAt)
  const last = latest(b.lastContactAt, a.lastContactAt)
  if (first != null) set.firstSeenAt = first
  if (last != null) set.lastContactAt = last
  const notes = mergeNotes(b.notes, a.notes)
  if (notes) set.notes = notes
  return set
}

// POST /api/v1/clients/:id/merge  { intoId }
router.post('/:id/merge', async (req, res) => {
  try {
    const intoId = typeof req.body?.intoId === 'string' ? req.body.intoId : ''
    const scope = scopeFilter(req)
    const [a, b] = await Promise.all([
      clients().findOne({ _id: req.params.id, ...scope }),
      intoId ? clients().findOne({ _id: intoId, ...scope }) : null,
    ])
    if (!a || !b) return res.status(404).json(NOT_FOUND)
    if (!assertCan(req, res, 'edit', { type: TYPE, doc: a })) return
    if (!assertCan(req, res, 'edit', { type: TYPE, doc: b })) return
    if (a._id === b._id) return res.status(400).json({ error: 'SAME_CLIENT' })
    if (a.mergedInto || a.deletedAt) return res.status(409).json({ error: 'ALREADY_MERGED' })
    if (b.mergedInto || b.deletedAt) return res.status(409).json({ error: 'TARGET_NOT_LIVE' })

    const now = Date.now()
    // Re-key first: a retry after a crash finds nothing left to move and goes on to the two stamps.
    const existing = new Set((await db().listCollections({}, { nameOnly: true }).toArray()).map(c => c.name))
    const moved = {}
    for (const name of REKEYED) {
      moved[name] = 0
      if (!existing.has(name)) continue
      const r = await db().collection(name).updateMany(
        { ...scope, clientId: a._id },
        { $set: { clientId: b._id, updatedAt: now } },
      )
      moved[name] = r.modifiedCount
    }
    const merged = await clients().findOneAndUpdate(
      { _id: b._id, ...scope },
      { $set: mergedFields(b, a, now) },
      { returnDocument: 'after' },
    )
    // `liveKey` goes with the merge, so B keeps the one live slot for the phone (plan 545).
    const stamped = await clients().updateOne(
      { _id: a._id, ...scope, mergedInto: { $exists: false } },
      { $set: { mergedInto: b._id, deletedAt: now, deletedBy: actorOf(req).userId, updatedAt: now }, $unset: { liveKey: '' } },
    )
    if (stamped.modifiedCount === 0) return res.status(409).json({ error: 'ALREADY_MERGED' })
    req.log.info({ event: 'clients.merged', businessId: scope.businessId, fromId: a._id, intoId: b._id, moved })
    res.json({ ok: true, client: merged, moved })
  } catch (err) {
    fail(req, res, 'merge', err)
  }
})

// PUT /api/v1/clients/:id/do-not-contact  { on, reason? }
router.put('/:id/do-not-contact', async (req, res) => {
  try {
    const { on } = req.body ?? {}
    if (typeof on !== 'boolean') return res.status(400).json({ error: 'BAD_BODY' })
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : ''
    if (on && !reason) return res.status(400).json({ error: 'REASON_REQUIRED' })
    if (reason.length > REASON_MAX) return res.status(400).json({ error: 'REASON_TOO_LONG' })
    const scope = { _id: req.params.id, ...scopeFilter(req) }
    const doc = await clients().findOne({ ...scope, deletedAt: { $exists: false } })
    if (!doc) return res.status(404).json(NOT_FOUND)
    const allowed = on
      ? assertCan(req, res, 'manageRequests', { type: TYPE, doc })
      : assertCan(req, res, 'edit', { type: TYPE, doc })
    if (!allowed) return
    const now = Date.now()
    const update = on
      ? { $set: { doNotContact: { at: now, reason, via: 'member' }, updatedAt: now } }
      : { $unset: { doNotContact: '' }, $set: { updatedAt: now } }
    const projection = req.user.businessRole === 'staff' ? staffProjection(TYPE) || undefined : undefined
    const saved = await clients().findOneAndUpdate(scope, update, { returnDocument: 'after', projection })
    req.log.info({ event: 'clients.do_not_contact', userId: req.user.userId, on })
    res.json(saved)
  } catch (err) {
    fail(req, res, 'do_not_contact', err)
  }
})

module.exports = router
