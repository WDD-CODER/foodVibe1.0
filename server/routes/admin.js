const { Router } = require('express')
const mongoose = require('mongoose')
const { verifyToken, requirePlatformAdmin } = require('../middleware/auth')
const User = require('../models/user.model')
const { ALL_USER_ENTITY_TYPES } = require('../constants/all-user-entity-types')
const { LIVE } = require('../jobs/purge-deleted')
const { jerusalemDate } = require('../middleware/usage')
const { activeDaysByBusiness } = require('../utils/usage-stats')
const { frontDeskSetup } = require('../services/front-desk-setup')
const { actorOf } = require('../utils/actor')
const { platformUpdateSchema, modulesOf, MODULE_KEYS } = require('../generated/schemas/modules')
const { clearModuleCache } = require('../middleware/require-module')
const { monthTokensByBusiness, clearCapCache } = require('../services/ai-cap')
const { frontDeskAdminUpdateSchema } = require('../generated/schemas/front-desk-admin.schema')
const { aggregateAiUsage } = require('../services/ai-usage')
const { PRICES_AS_OF } = require('../constants/ai-prices')

const { frontDeskStats, parseRange } = require('../services/frontdesk-stats')

const { containsInjectionPattern, scanRecipeDraftForInjection, draftCloseness } = require('../services/ai-recipe-helpers')
const { MASTER_BUSINESS_ID } = require('../utils/business-scope')
const { mayLearnFrom } = require('../utils/ai-learning')
const { setAiPrivate, deleteBusinessServerData, eraseLearnedData } = require('../services/business')

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
    // Plan 639: only the exact string 'true' also erases what was learned from the business; staff deletes ignore it.
    const eraseLearned = wholeBusiness && req.query.eraseLearned === 'true'
    let eraseCounts
    let usersDeleted = 1
    if (wholeBusiness) {
      const { businessId } = target
      try {
        const business = await col('businesses').findOne({ _id: businessId })
        if (business) {
          if (eraseLearned) eraseCounts = await eraseLearnedData(mongoose.connection.db, businessId)
          await deleteBusinessServerData(mongoose.connection.db, business, req.log)
        }
      } catch (err) {
        req.log.error({ err, event: 'admin.users_delete.extras_failed', businessId })
      }
      await Promise.all(ALL_USER_ENTITY_TYPES.map(t => col(t).deleteMany({ businessId })))
      usersDeleted = (await User.deleteMany({ businessId })).deletedCount
      await col('businesses').deleteOne({ _id: businessId })
    } else {
      // A staff user's items stay with the business. A user that never got a business owns docs by userId only.
      if (!target.businessId) await Promise.all(ALL_USER_ENTITY_TYPES.map(t => col(t).deleteMany({ userId })))
      await User.deleteOne({ _id: userId })
    }
    req.log.info({ event: 'admin.users_delete', deletedBusiness: wholeBusiness, eraseLearned, ...(eraseCounts && { counts: eraseCounts }) })
    res.json({ ok: true, deletedBusiness: wholeBusiness, usersDeleted })
  } catch (err) {
    req.log.error({ err, event: 'admin.users_delete.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

const DAY_MS = 86400000

/**
 * Plan 448: one row per business - members, activity and event-pipeline counts, never content.
 * Six grouped queries; the front desk checklist runs only for businesses that have a profile (plan 556). Legacy and deleted events never count.
 */
router.get('/businesses', verifyToken, requirePlatformAdmin, async (req, res) => {
  try {
    const now = Date.now()
    const [businesses, members, usage, activeDays, events, profiles, tokens] = await Promise.all([
      col('businesses').find({ _id: { $ne: '__master__' } }, { projection: { name: 1, ownerId: 1, createdAt: 1, internal: 1, modules: 1, aiPrivate: 1, aiMonthlyTokenCap: 1 } }).toArray(),
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
      col('frontDeskProfiles').find({ ...LIVE }).toArray(),
      monthTokensByBusiness(mongoose.connection.db, now),
    ])
    const profileBy = new Map(profiles.map(p => [p.businessId, p]))
    const frontDeskBy = new Map()
    for (const [businessId, profile] of profileBy) {
      const setup = await frontDeskSetup(mongoose.connection.db, businessId, profile)
      const row = { status: profile.status, done: setup.done, total: setup.total }
      // Plan 557: the assistant level the platform admin raised; left out at 0 (the default), the page shows it as 0.
      if (typeof profile.assistant?.level === 'number' && profile.assistant.level > 0) row.assistantLevel = profile.assistant.level
      frontDeskBy.set(businessId, row)
    }
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
        modules: modulesOf(b),
        aiPrivate: b.aiPrivate === true,
        aiMonthlyTokenCap: b.aiMonthlyTokenCap ?? null,
        aiTokensThisMonth: tokens.get(b._id) ?? 0,
        lastActivityAt: usageBy.get(b._id) ?? null,
        activeDays7: activeDays.get(b._id) ?? 0,
        events: { total: e?.total ?? 0, active: e?.active ?? 0, closed, finished: e?.finished ?? 0 },
        closeRate: closed + notClosed > 0 ? closed / (closed + notClosed) : null,
        lastEventDate: e?.lastEventDate ?? null,
        frontDesk: frontDeskBy.get(b._id) ?? null,
      }
    })
    res.json({ rows })
  } catch (err) {
    req.log.error({ err, event: 'admin.businesses_list.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

const FD_CSV_HEADER = ['businessId', 'name', 'requests', 'afterHoursPct', 'approved', 'declined', 'medianMinutesToDecision', 'noShowRatePct', 'eventsFromRequests']

/** Plan 559: the front desk numbers per business (default last 30 days); `format=csv` downloads them. Names and numbers only. */
router.get('/frontdesk-stats', verifyToken, requirePlatformAdmin, async (req, res) => {
  try {
    const range = parseRange(req.query, 30)
    if (!range) return res.status(400).json({ error: 'Invalid range' })
    const businesses = await col('businesses').find({ _id: { $ne: '__master__' } }, { projection: { name: 1, baseline: 1 } }).toArray()
    const rows = []
    for (const b of businesses) {
      const s = await frontDeskStats(mongoose.connection.db, b._id, range, b)
      rows.push({
        businessId: b._id,
        name: b.name,
        requests: s.requests.total,
        afterHoursPct: s.afterHoursPct,
        approved: s.outcomes.approved,
        declined: s.outcomes.declined,
        medianMinutesToDecision: s.medianMinutesToDecision,
        noShowRatePct: s.bookings.noShowRatePct,
        eventsFromRequests: s.eventsFromRequests.count,
      })
    }
    if (req.query.format === 'csv') {
      const lines = [FD_CSV_HEADER.join(','), ...rows.map(r => FD_CSV_HEADER.map(k => csvCell(r[k])).join(','))]
      return sendCsv(res, `frontdesk-${range.from}-${range.to}.csv`, lines)
    }
    res.json({ from: range.from, to: range.to, rows })
  } catch (err) {
    req.log.error({ err, event: 'admin.frontdesk_stats.failed' })
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

// Plan 557: the platform admin moves one business's front desk (status, assistant level, plan) and the reason is kept.
router.put('/businesses/:id/front-desk', verifyToken, requirePlatformAdmin, async (req, res) => {
  const parsed = frontDeskAdminUpdateSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: parsed.error.issues.map(i => ({ path: i.path.join('.'), code: i.code, message: i.message }))
    })
  }
  const { status, assistantLevel, plan, reason } = parsed.data
  try {
    const business = await col('businesses').findOne({ _id: req.params.id }, { projection: { _id: 1 } })
    if (!business) return res.status(404).json({ error: 'Business not found' })
    const profile = await col('frontDeskProfiles').findOne({ businessId: req.params.id, ...LIVE })
    if (!profile) return res.status(404).json({ error: 'NO_PROFILE' })
    const now = Date.now()
    const actor = actorOf(req)
    const row = { at: now, by: actor.userId, byName: String(actor.name).slice(0, 80), reason }
    const $set = { updatedAt: now }
    if (status !== undefined) { $set.status = status; row.status = status }
    if (assistantLevel !== undefined) { $set['assistant.level'] = assistantLevel; row.assistantLevel = assistantLevel }
    if (plan !== undefined) row.plan = plan
    await col('frontDeskProfiles').updateOne(
      { _id: profile._id },
      { $set, $push: { adminHistory: { $each: [row], $slice: -50 } } }
    )
    if (plan !== undefined) await col('businesses').updateOne({ _id: req.params.id }, { $set: { frontDeskPlan: plan } })
    const changed = Object.keys(row).filter(k => !['at', 'by', 'byName', 'reason'].includes(k))
    req.log.info({ event: 'admin.front_desk.updated', businessId: req.params.id, changed })
    res.json({
      ok: true,
      status: status ?? profile.status,
      assistantLevel: assistantLevel ?? profile.assistant?.level ?? 0,
      plan: plan ?? null
    })
  } catch (err) {
    req.log.error({ err, event: 'admin.front_desk.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

// Plan 638: the entries of a history row — only the fields that were sent and differ from the stored value (strings).
function platformChangesOf(before, { modules, aiMonthlyTokenCap, aiPrivate }) {
  const changes = []
  if (modules !== undefined) {
    const from = modulesOf(before).join(',')
    const to = MODULE_KEYS.filter(k => modules.includes(k)).join(',')
    if (from !== to) changes.push({ field: 'modules', from, to })
  }
  if (aiMonthlyTokenCap !== undefined) {
    const from = before.aiMonthlyTokenCap == null ? '' : String(before.aiMonthlyTokenCap)
    const to = aiMonthlyTokenCap === null ? '' : String(aiMonthlyTokenCap)
    if (from !== to) changes.push({ field: 'aiMonthlyTokenCap', from, to })
  }
  if (aiPrivate !== undefined) {
    const from = String(before.aiPrivate === true)
    const to = String(aiPrivate)
    if (from !== to) changes.push({ field: 'aiPrivate', from, to })
  }
  return changes
}

// Plan 638: the platform admin reads one business's change history, newest first.
router.get('/businesses/:id/platform-history', verifyToken, requirePlatformAdmin, async (req, res) => {
  try {
    const business = await col('businesses').findOne({ _id: req.params.id }, { projection: { platformHistory: 1 } })
    if (!business) return res.status(404).json({ error: 'Business not found' })
    res.json({ rows: [...(business.platformHistory ?? [])].reverse() })
  } catch (err) {
    req.log.error({ err, event: 'admin.platform_history.failed', businessId: req.params.id })
    res.status(500).json({ error: 'Server error' })
  }
})

// Plan 616: the platform admin sets one business's modules, AI token cap and private flag, and the reason is kept.
router.put('/businesses/:id/platform', verifyToken, requirePlatformAdmin, async (req, res) => {
  const parsed = platformUpdateSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Validation failed',
      issues: parsed.error.issues.map(i => ({ path: i.path.join('.'), code: i.code, message: i.message }))
    })
  }
  const { modules, aiMonthlyTokenCap, aiPrivate, reason } = parsed.data
  try {
    const before = await col('businesses').findOne({ _id: req.params.id })
    if (!before) return res.status(404).json({ error: 'Business not found' })
    const actor = actorOf(req)
    const $set = {}
    const $unset = {}
    const changed = []
    if (modules !== undefined) { $set.modules = MODULE_KEYS.filter(k => modules.includes(k)); changed.push('modules') }
    if (aiMonthlyTokenCap !== undefined) {
      if (aiMonthlyTokenCap === null) $unset.aiMonthlyTokenCap = ''
      else $set.aiMonthlyTokenCap = aiMonthlyTokenCap
      changed.push('aiMonthlyTokenCap')
    }
    // Plan 639 (C-LEARN): private only stops learning from now on; erasing what was learned is POST .../erase-learned.
    if (aiPrivate !== undefined) {
      const priv = await setAiPrivate(req.params.id, aiPrivate)
      if (!priv.matchedCount) return res.status(404).json({ error: 'Business not found' })
      changed.push('aiPrivate')
    }
    const row = { at: Date.now(), by: actor.userId, byName: String(actor.name).slice(0, 80), reason, changed, changes: platformChangesOf(before, { modules, aiMonthlyTokenCap, aiPrivate }) }
    const update = { $push: { platformHistory: { $each: [row], $slice: -50 } } }
    if (Object.keys($set).length) update.$set = $set
    if (Object.keys($unset).length) update.$unset = $unset
    const after = await col('businesses').findOneAndUpdate({ _id: req.params.id }, update, { returnDocument: 'after' })
    if (!after) return res.status(404).json({ error: 'Business not found' })
    clearModuleCache(req.params.id)
    if (aiMonthlyTokenCap !== undefined) clearCapCache(req.params.id)
    req.log.info({ event: 'admin.platform.updated', businessId: req.params.id, changed })
    res.json({
      ok: true,
      modules: modulesOf(after),
      aiMonthlyTokenCap: after.aiMonthlyTokenCap ?? null,
      aiPrivate: after.aiPrivate === true
    })
  } catch (err) {
    req.log.error({ err, event: 'admin.platform.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

// Plan 639 (C-LEARN): the platform admin erases what was learned from one business, on its request; the reason is kept.
router.post('/businesses/:id/erase-learned', verifyToken, requirePlatformAdmin, async (req, res) => {
  const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : ''
  if (reason.length < 1 || reason.length > 300) return res.status(400).json({ error: 'Validation failed' })
  const businessId = req.params.id
  try {
    const business = await col('businesses').findOne({ _id: businessId }, { projection: { _id: 1 } })
    if (!business) return res.status(404).json({ error: 'Business not found' })
    const counts = await eraseLearnedData(mongoose.connection.db, businessId)
    const actor = actorOf(req)
    const row = {
      at: Date.now(), by: actor.userId, byName: String(actor.name).slice(0, 80), reason,
      changed: ['learnedData'], changes: [{ field: 'learnedData', from: '', to: 'erased' }]
    }
    await col('businesses').updateOne({ _id: businessId }, { $push: { platformHistory: { $each: [row], $slice: -50 } } })
    req.log.info({ event: 'admin.learned_data.erased', businessId, counts })
    res.json({ ok: true, counts })
  } catch (err) {
    req.log.error({ err, event: 'admin.learned_data.erase_failed', businessId })
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
        { kind, businessId: { $nin: ['__master__', null] }, foldedAt: { $exists: false }, ...LIVE },
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

/** Plan 596: send a CSV Excel reads as UTF-8 (BOM first, CRLF rows, final CRLF), like src/app/core/utils/csv.util.ts. */
function sendCsv(res, filename, lines) {
  res.set('Content-Type', 'text/csv; charset=utf-8')
  res.set('Content-Disposition', `attachment; filename="${filename}"`)
  return res.send('\uFEFF' + lines.join('\r\n') + '\r\n')
}

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
      return sendCsv(res, `ai-usage-${from}-${to}.csv`, lines)
    }
    res.json({ from, to, groupBy, pricesAsOf: PRICES_AS_OF, rows, totals })
  } catch (err) {
    req.log.error({ err, event: 'admin.ai_usage.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

// Plan 600 — the shared pool of recipe AI examples the platform admin curates.
const AI_SHOT_CANDIDATES_CAP = 100
const AI_SHOT_SHARED_CAP = 200
const OBJECT_ID_RE = /^[0-9a-f]{24}$/

function shotsCol() {
  return col('GEMINI_SHOTS')
}

// Plan 612: recomputed from aiDraft and draft when both are stored, so shots saved before the
// closeness score show it too; otherwise the stored number (or null).
function shotScore(doc) {
  if (doc.aiDraft && typeof doc.aiDraft === 'object' && doc.draft && typeof doc.draft === 'object') {
    return draftCloseness(doc.aiDraft, doc.draft)
  }
  return typeof doc.keptRatio === 'number' ? doc.keptRatio : null
}

function aiShotRow(doc, businessName) {
  return {
    _id: String(doc._id),
    nameHebrew: doc.draft?.nameHebrew ?? '',
    prompt: String(doc.prompt ?? '').slice(0, 200),
    ingredientCount: Array.isArray(doc.draft?.ingredients) ? doc.draft.ingredients.length : 0,
    keptRatio: shotScore(doc),
    source: doc.source,
    createdAt: doc.createdAt,
    ...(businessName !== undefined && { businessName })
  }
}

router.get('/ai-shots', verifyToken, requirePlatformAdmin, async (req, res) => {
  try {
    // Plan 618 (C-LEARN): every business that is not private offers its approved examples.
    const businesses = await col('businesses').find({ _id: { $ne: MASTER_BUSINESS_ID } }, { projection: { name: 1, aiPrivate: 1 } }).toArray()
    const sharing = businesses.filter(mayLearnFrom)
    const nameById = new Map(sharing.map(b => [String(b._id), b.name]))
    const shared = await shotsCol().find({ businessId: MASTER_BUSINESS_ID }).sort({ createdAt: -1 }).limit(AI_SHOT_SHARED_CAP).toArray()
    const promoted = new Set(shared.map(d => d.promotedFrom?.shotId).filter(Boolean))
    const pool = nameById.size
      ? await shotsCol().find({ status: 'approved', businessId: { $in: [...nameById.keys()] } }).sort({ createdAt: -1 }).toArray()
      : []
    const candidates = pool.filter(d => !promoted.has(String(d._id))).slice(0, AI_SHOT_CANDIDATES_CAP)
    res.json({
      candidates: candidates.map(d => aiShotRow(d, nameById.get(String(d.businessId)))),
      shared: shared.map(d => aiShotRow(d))
    })
  } catch (err) {
    req.log.error({ err, event: 'admin.ai_shots_list.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/ai-shots/:id/promote', verifyToken, requirePlatformAdmin, async (req, res) => {
  try {
    const id = req.params.id
    if (!OBJECT_ID_RE.test(id)) return res.status(404).json({ error: 'Shot not found' })
    const shot = await shotsCol().findOne({ _id: new mongoose.Types.ObjectId(id), status: 'approved', businessId: { $ne: MASTER_BUSINESS_ID } })
    if (!shot) return res.status(404).json({ error: 'Shot not found' })
    const business = await col('businesses').findOne({ _id: shot.businessId }, { projection: { aiPrivate: 1 } })
    if (!business || !mayLearnFrom(business)) return res.status(409).json({ error: 'Business is private', code: 'not_shared' })
    if (await shotsCol().findOne({ businessId: MASTER_BUSINESS_ID, 'promotedFrom.shotId': id })) {
      return res.status(409).json({ error: 'Already shared', code: 'already_shared' })
    }
    if (containsInjectionPattern(shot.prompt) || scanRecipeDraftForInjection(shot.draft)) {
      req.log.warn({ event: 'admin.ai_shots.injection_rejected' })
      return res.status(400).json({ error: 'content rejected — instruction-like text is not allowed' })
    }
    const copy = {
      businessId: MASTER_BUSINESS_ID,
      prompt: shot.prompt,
      draft: shot.draft,
      source: shot.source,
      keptRatio: shotScore(shot),
      status: 'approved',
      promotedFrom: { businessId: shot.businessId, shotId: id },
      promotedBy: req.user.userId,
      createdAt: new Date()
    }
    const { insertedId } = await shotsCol().insertOne(copy)
    const stale = await shotsCol().find({ businessId: MASTER_BUSINESS_ID }).sort({ createdAt: -1 }).skip(AI_SHOT_SHARED_CAP).project({ _id: 1 }).toArray()
    if (stale.length) await shotsCol().deleteMany({ _id: { $in: stale.map(d => d._id) } })
    req.log.info({ event: 'admin.ai_shots.promoted' })
    res.json(aiShotRow({ ...copy, _id: insertedId }))
  } catch (err) {
    req.log.error({ err, event: 'admin.ai_shots.promote_failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/ai-shots/shared/:id', verifyToken, requirePlatformAdmin, async (req, res) => {
  try {
    const id = req.params.id
    if (!OBJECT_ID_RE.test(id)) return res.status(404).json({ error: 'Shot not found' })
    const result = await shotsCol().deleteOne({ _id: new mongoose.Types.ObjectId(id), businessId: MASTER_BUSINESS_ID })
    if (!result.deletedCount) return res.status(404).json({ error: 'Shot not found' })
    req.log.info({ event: 'admin.ai_shots.removed' })
    res.json({ removed: true })
  } catch (err) {
    req.log.error({ err, event: 'admin.ai_shots.remove_failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
