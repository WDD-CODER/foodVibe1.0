const { Router } = require('express')
const mongoose = require('mongoose')
const { verifyToken, requirePlatformAdmin } = require('../middleware/auth')
const User = require('../models/user.model')
const { ALL_USER_ENTITY_TYPES } = require('../constants/all-user-entity-types')
const { LIVE } = require('../jobs/purge-deleted')
const { jerusalemDate } = require('../middleware/usage')
const { activeDaysByBusiness } = require('../utils/usage-stats')
const { aggregateAiUsage } = require('../services/ai-usage')
const { PRICES_AS_OF } = require('../constants/ai-prices')

const router = Router()

function col(type) {
  return mongoose.connection.db.collection(type)
}

router.get('/users', verifyToken, requirePlatformAdmin, async (req, res) => {
  try {
    const users = await User.find(
      { _id: { $ne: '__master__' } },
      '_id name email role businessId businessRole isPlatformAdmin'
    ).lean()
    const businessIds = [...new Set(users.map(u => u.businessId).filter(Boolean))]
    const businesses = businessIds.length
      ? await col('businesses').find({ _id: { $in: businessIds } }, { projection: { name: 1 } }).toArray()
      : []
    const nameById = new Map(businesses.map(b => [b._id, b.name]))
    res.json(users.map(u => ({
      ...u,
      businessId: u.businessId ?? null,
      businessRole: u.businessRole ?? null,
      isPlatformAdmin: u.isPlatformAdmin === true,
      businessName: nameById.get(u.businessId) ?? null,
    })))
  } catch (err) {
    req.log.error({ err, event: 'admin.users_list.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

// Deleting an owner deletes the whole business (its data, its users, the business); a staff user only themselves.
router.delete('/users/:userId', verifyToken, requirePlatformAdmin, async (req, res) => {
  const { userId } = req.params
  try {
    const target = await User.findById(userId).lean()
    if (!target) return res.status(404).json({ error: 'User not found' })
    if (userId === req.user.userId) {
      return res.status(403).json({ error: 'Cannot delete your own account' })
    }
    if (target.businessId && target.businessId === req.user.businessId) {
      return res.status(403).json({ error: 'Cannot delete your own business' })
    }
    const wholeBusiness = Boolean(target.businessId) && target.businessRole !== 'staff'
    let usersDeleted = 1
    if (wholeBusiness) {
      const { businessId } = target
      await Promise.all(ALL_USER_ENTITY_TYPES.map(t => col(t).deleteMany({ businessId })))
      usersDeleted = (await User.deleteMany({ businessId })).deletedCount
      await col('businesses').deleteOne({ _id: businessId })
    } else {
      // A staff user's items stay with the business. A user that never got a business owns docs by userId only.
      if (!target.businessId) await Promise.all(ALL_USER_ENTITY_TYPES.map(t => col(t).deleteMany({ userId })))
      await User.deleteOne({ _id: userId })
    }
    res.json({ ok: true, deletedBusiness: wholeBusiness, usersDeleted })
  } catch (err) {
    req.log.error({ err, event: 'admin.users_delete.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

const DAY_MS = 86400000

/**
 * Plan 448: one row per business - members, activity and event-pipeline counts, never content.
 * Five grouped queries, no per-business loop. Legacy and deleted events never count.
 */
router.get('/businesses', verifyToken, requirePlatformAdmin, async (req, res) => {
  try {
    const now = Date.now()
    const [businesses, members, usage, activeDays, events] = await Promise.all([
      col('businesses').find({ _id: { $ne: '__master__' } }, { projection: { name: 1, ownerId: 1, createdAt: 1, internal: 1 } }).toArray(),
      col('users').aggregate([
        { $match: { businessId: { $type: 'string' } } },
        { $group: {
          _id: '$businessId',
          ownerName: { $max: { $cond: [{ $eq: ['$businessRole', 'owner'] }, '$name', null] } },
          staffCount: { $sum: { $cond: [{ $and: [{ $eq: ['$businessRole', 'staff'] }, { $eq: [{ $type: '$removedAt' }, 'missing'] }] }, 1, 0] } },
        } },
      ]).toArray(),
      col('usageDays').aggregate([{ $group: { _id: '$businessId', lastActivityAt: { $max: '$lastAt' } } }]).toArray(),
      activeDaysByBusiness(mongoose.connection.db, { from: jerusalemDate(now - 6 * DAY_MS), to: jerusalemDate(now) }),
      col('menuEvents').aggregate([
        { $match: { ...LIVE, legacy: { $ne: true } } },
        { $group: {
          _id: '$businessId',
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $in: ['$stage', ['finished', 'not_closed']] }, 0, 1] } },
          closed: { $sum: { $cond: [{ $ifNull: ['$closedAt', false] }, 1, 0] } },
          finished: { $sum: { $cond: [{ $eq: ['$stage', 'finished'] }, 1, 0] } },
          notClosed: { $sum: { $cond: [{ $eq: ['$stage', 'not_closed'] }, 1, 0] } },
          lastEventDate: { $max: '$eventDate' },
        } },
      ]).toArray(),
    ])
    const memberBy = new Map(members.map(m => [m._id, m]))
    const usageBy = new Map(usage.map(u => [u._id, u.lastActivityAt]))
    const eventsBy = new Map(events.map(e => [e._id, e]))
    const rows = businesses.map((b) => {
      const m = memberBy.get(b._id)
      const e = eventsBy.get(b._id)
      const closed = e?.closed ?? 0
      const notClosed = e?.notClosed ?? 0
      return {
        _id: b._id,
        name: b.name,
        ownerName: m?.ownerName ?? null,
        staffCount: m?.staffCount ?? 0,
        createdAt: b.createdAt ?? null,
        internal: b.internal === true,
        lastActivityAt: usageBy.get(b._id) ?? null,
        activeDays7: activeDays.get(b._id) ?? 0,
        events: { total: e?.total ?? 0, active: e?.active ?? 0, closed, finished: e?.finished ?? 0 },
        closeRate: closed + notClosed > 0 ? closed / (closed + notClosed) : null,
        lastEventDate: e?.lastEventDate ?? null,
      }
    })
    res.json({ rows })
  } catch (err) {
    req.log.error({ err, event: 'admin.businesses_list.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

router.put('/businesses/:id/internal', verifyToken, requirePlatformAdmin, async (req, res) => {
  const { internal } = req.body ?? {}
  if (typeof internal !== 'boolean') return res.status(400).json({ error: 'internal must be a boolean' })
  try {
    const result = await col('businesses').updateOne({ _id: req.params.id }, { $set: { internal } })
    if (!result.matchedCount) return res.status(404).json({ error: 'Business not found' })
    req.log.info({ event: 'admin.business.internal_set', internal })
    res.json({ ok: true, internal })
  } catch (err) {
    req.log.error({ err, event: 'admin.business_internal.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

// Plan 532: the platform admin reads every business's own terms of one allowlisted kind, to learn what to share.
const ADMIN_TERM_KINDS = ['logisticsItem']

router.get('/taxonomy', verifyToken, requirePlatformAdmin, async (req, res) => {
  const { kind } = req.query
  if (typeof kind !== 'string' || !ADMIN_TERM_KINDS.includes(kind)) return res.status(400).json({ error: 'Unsupported kind' })
  try {
    const terms = await col('taxonomyTerms')
      .find(
        { kind, businessId: { $nin: ['__master__', null] }, ...LIVE },
        { projection: { _id: 1, businessId: 1, key: 1, phase: 1, section: 1, answerType: 1, environments: 1, hint: 1, createdAt: 1 } }
      )
      .sort({ key: 1, createdAt: 1 })
      .toArray()
    const businessIds = [...new Set(terms.map(t => t.businessId))]
    const businesses = businessIds.length
      ? await col('businesses').find({ _id: { $in: businessIds } }, { projection: { name: 1 } }).toArray()
      : []
    const nameById = new Map(businesses.map(b => [b._id, b.name]))
    const rows = terms.map(t => ({
      id: t._id,
      businessId: t.businessId,
      businessName: nameById.get(t.businessId) ?? null,
      key: t.key,
      phase: t.phase ?? null,
      section: t.section ?? null,
      answerType: t.answerType ?? null,
      environments: t.environments ?? null,
      hint: t.hint ?? null,
      createdAt: t.createdAt ?? null,
    }))
    res.json({ rows })
  } catch (err) {
    req.log.error({ err, event: 'admin.taxonomy_list.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

/**
 * Plan 566: AI usage ledger totals for the platform admin. Never returns prompts or replies —
 * the ledger holds none. Default range: the current Asia/Jerusalem month.
 */
const AI_GROUP_BY = ['business', 'feature', 'model', 'day']
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/
const AI_CSV_COLUMNS = ['key', 'label', 'calls', 'failedCalls', 'inputTokens', 'outputTokens', 'totalTokens', 'estCostUsd']

function csvCell(value) {
  const text = value == null ? '' : String(value)
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function monthRange(todayStr) {
  const [y, m] = todayStr.split('-').map(Number)
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const mm = String(m).padStart(2, '0')
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, '0')}` }
}

router.get('/ai-usage', verifyToken, requirePlatformAdmin, async (req, res) => {
  try {
    const q = req.query
    const groupBy = q.groupBy === undefined ? 'business' : q.groupBy
    if (!AI_GROUP_BY.includes(groupBy)) return res.status(400).json({ error: 'Bad groupBy', code: 'BAD_GROUP_BY' })
    const month = monthRange(jerusalemDate(Date.now()))
    const from = q.from === undefined ? month.from : q.from
    const to = q.to === undefined ? month.to : q.to
    const spanDays = DAY_RE.test(from) && DAY_RE.test(to) ? (Date.parse(to) - Date.parse(from)) / DAY_MS : NaN
    if (!Number.isFinite(spanDays) || spanDays < 0 || spanDays > 365) {
      return res.status(400).json({ error: 'Bad range', code: 'BAD_RANGE' })
    }
    const businessId = typeof q.businessId === 'string' && q.businessId ? q.businessId : undefined
    const { rows, totals } = await aggregateAiUsage(mongoose.connection.db, { from, to, groupBy, businessId })
    if (q.format === 'csv') {
      const lines = [AI_CSV_COLUMNS.join(',')]
      for (const r of rows) lines.push(AI_CSV_COLUMNS.map(c => csvCell(r[c])).join(','))
      res.set('Content-Type', 'text/csv; charset=utf-8')
      res.set('Content-Disposition', `attachment; filename="ai-usage-${from}-${to}.csv"`)
      return res.send(lines.join('\n') + '\n')
    }
    res.json({ from, to, groupBy, pricesAsOf: PRICES_AS_OF, rows, totals })
  } catch (err) {
    req.log.error({ err, event: 'admin.ai_usage.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
