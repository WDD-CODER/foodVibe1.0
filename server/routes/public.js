'use strict'
/**
 * Plan 543 (contract C-GUEST, ADR 0030): the public door for people who are not members of a business.
 * Plan 555 (C-PUBLIC): the request form's four routes.
 *
 * Rules for every route added here (plan 555 and later):
 * - No member token is read here. This file never loads the auth middleware and never reads the signed-in user.
 * - The business is resolved by the server from the URL slug (slug -> `frontDeskProfiles`), never from the body.
 * - A guest write stamps `createdBy` with `guestActor('form')` from `server/utils/actor.js` and the resolved `businessId`.
 * - Every write route carries `publicLimiter` (server/middleware/rate-limit.js), `honeypot`
 *   (server/middleware/honeypot.js) and its own input schema, in the plan that adds it.
 * - A guest reads back only what its own token names (`newPublicToken` / `isPublicTokenShape`,
 *   server/utils/public-token.js). The token is a bearer secret and is never logged.
 * - Guest text is stored as plain text and never rendered as HTML.
 * - Every query is scoped with `guestScope(businessId)`; logs carry the request id and the slug only.
 * - Plan 669 (C-PUBAVAIL): with the `tables` module the door also answers the free times of a day
 *   (`GET /:slug/availability`, own read limiter), confirms a table in the same call when the owner chose automatic
 *   confirmation, and lets the guest confirm arrival or cancel before the cutoff. No answer shows a table, a name
 *   or a count; every table the guest gets comes from `assign` and a claimed hold (INV-7).
 */
const { Router } = require('express')
const mongoose = require('mongoose')
const { publicLimiter, publicReadLimiter } = require('../middleware/rate-limit')
const { businessModules } = require('../middleware/require-module')
const { checkStoredDoc } = require('../middleware/validate')
const { LIVE } = require('../jobs/purge-deleted')
const { honeypot } = require('../middleware/honeypot')
const { guestScope } = require('../utils/business-scope')
const { guestActor } = require('../utils/actor')
const { isPublicTokenShape } = require('../utils/public-token')
const { loadPublicProfile, isPublic, publicView } = require('../utils/public-profile')
const { createRequest, runQualify } = require('../utils/request-create')
const { newId } = require('../utils/id')
const { newPublicToken } = require('../utils/public-token')
const tb = require('../services/table-bookings')
const holds = require('../services/table-holds')
const { tableServiceOf } = require('../generated/schemas/front-desk/table-service')
const { jerusalemEpoch } = require('../generated/schemas/front-desk/local-time')
const { turnFor, assign, alternatives, dayAvailability } = require('../generated/schemas/front-desk/table-engine')
const { expireDue } = require('../utils/request-expiry')
const { publicRequestSchema } = require('../generated/schemas/public/public-request.schema')

const router = Router()

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

router.get('/health', (_req, res) => res.json({ ok: true }))

const db = () => mongoose.connection.db
const HOUR_MS = 3600000
const DAY_MS = 86400000
const KEY = /^[a-z0-9]{6,12}$/
const tablesOn = async profile => (await businessModules(profile.businessId)).includes('tables')
const CANCELLABLE = ['new', 'qualified', 'needs_info']
/** Decline reasons a guest may see (never the member's free text; nothing for `other`). */
const PUBLIC_DECLINE_REASONS = ['full', 'date_taken', 'out_of_area', 'below_minimum']
const ANSWER_CHECKS = {
  number: v => v.trim() !== '' && Number.isFinite(Number(v)),
  date: v => /^\d{4}-\d{2}-\d{2}$/.test(v),
  time: v => /^\d{2}:\d{2}$/.test(v),
}

/** First 8 characters of the request id, upper case, without dashes (C-PUBLIC contract extension). */
const referenceOf = request => String(request._id).replace(/-/g, '').slice(0, 8).toUpperCase()

const issuesOf = error => error.issues.map(i => ({ path: i.path.join('.'), code: i.code, message: i.message }))

/** Checks the guest's answers against the profile's questions: `{ answers }` (with labels) or `{ error, issues }`. */
function checkAnswers(config, sent) {
  const byKey = new Map((config.questions ?? []).map(q => [q.key, q]))
  const issues = []
  const answers = []
  sent.forEach((a, i) => {
    const q = byKey.get(a.questionKey)
    if (!q) {
      issues.push({ path: `answers.${i}.questionKey`, code: 'UNKNOWN_QUESTION', message: 'unknown question' })
      return
    }
    const ok = q.type === 'choice' ? (q.options ?? []).includes(a.value) : (ANSWER_CHECKS[q.type]?.(a.value) ?? true)
    if (!ok) {
      issues.push({ path: `answers.${i}.value`, code: 'invalid_value', message: `not a valid ${q.type}` })
      return
    }
    answers.push({ questionKey: q.key, label: q.label, value: a.value })
  })
  if (issues.some(x => x.code === 'UNKNOWN_QUESTION')) return { error: 'UNKNOWN_QUESTION', issues }
  if (issues.length) return { error: 'BAD_REQUEST_INPUT', issues }
  return { answers }
}

/** What a guest may read about its own request. No phone, no answers, no decline text. */
async function guestView(request, profile) {
  const tables = request.status === 'approved' && request.outcome?.type === 'booking' && (await tablesOn(profile))
  const view = {
    reference: referenceOf(request),
    kind: request.kind,
    status: request.status,
    wanted: request.wanted,
    guestName: request.guestName,
    createdAt: request.createdAt,
    displayName: profile.displayName,
    ...(profile.phone && { phone: profile.phone }),
  }
  if (request.status === 'approved' && request.outcome?.type === 'booking') {
    const booking = await db().collection('bookings').findOne({ _id: request.outcome.id, ...guestScope(profile.businessId) })
    if (booking) {
      view.booking = { date: booking.date, time: booking.time, partySize: booking.partySize, status: booking.status }
      if (tables) {
        const cutoff = tableServiceOf(profile).cancellationCutoffHours * HOUR_MS
        view.booking.guestConfirmed = booking.guestConfirmedAt !== undefined
        view.booking.canCancel = booking.status === 'confirmed' && Date.now() < booking.startAt - cutoff
      }
    }
  }
  if (request.status === 'approved' && request.outcome?.type === 'menuEvent') view.eventOpened = true
  if (request.status === 'declined' && PUBLIC_DECLINE_REASONS.includes(request.decline?.reason)) {
    view.declineReason = request.decline.reason
  }
  return view
}

/** The request of this token inside the profile's business, or null. */
async function findByToken(profile, token) {
  await expireDue(db(), profile.businessId, Date.now())
  return db().collection('requests').findOne({ publicToken: token, ...guestScope(profile.businessId), deletedAt: { $exists: false } })
}

const fail = (req, res, name, err) => {
  req.log.error({ err, event: `public.${name}.failed`, slug: req.params.slug })
  res.status(500).json({ error: 'Server error' })
}

// GET /api/v1/public/:slug
router.get('/:slug', async (req, res) => {
  try {
    const profile = await loadPublicProfile(db(), req.params.slug)
    if (!profile) return res.status(404).json({ error: 'NOT_FOUND' })
    if (!isPublic(profile)) return res.json({ available: false, displayName: profile.displayName })
    const view = publicView(profile)
    if (await tablesOn(profile)) {
      const plan = await db().collection('floorPlans').findOne({ ...guestScope(profile.businessId), ...LIVE })
      const bookable = new Set((plan?.tables ?? []).filter(t => t.active && t.online).map(t => t.areaKey))
      const areas = (plan?.areas ?? []).filter(a => bookable.has(a.key)).sort((a, b) => a.order - b.order).map(a => ({ key: a.key, name: a.name }))
      if (areas.length) view.tableBooking = { areas }
    }
    res.json(view)
  } catch (err) {
    fail(req, res, 'profile', err)
  }
})

const validDate = d => {
  if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false
  const at = new Date(`${d}T00:00:00Z`)
  return !Number.isNaN(at.getTime()) && at.toISOString().startsWith(d)
}
/** The date `n` days after `date`, from the Jerusalem noon of `date` (no daylight-saving drift). */
const dayAfter = (date, n) => tb.wallOf(jerusalemEpoch(date, '12:00') + n * DAY_MS).date

// GET /api/v1/public/:slug/availability?date=&partySize=&area=  (plan 669, C-PUBAVAIL)
router.get('/:slug/availability', publicReadLimiter, async (req, res) => {
  try {
    const { date, partySize: size, area } = req.query
    const partySize = typeof size === 'string' && /^\d{1,2}$/.test(size) ? Number(size) : 0
    if (!validDate(date) || partySize < 1 || partySize > 30 || (area !== undefined && !(typeof area === 'string' && KEY.test(area)))) {
      return res.status(400).json({ error: 'BAD_REQUEST_INPUT' })
    }
    const profile = await loadPublicProfile(db(), req.params.slug)
    if (!profile || !isPublic(profile) || !(await tablesOn(profile))) return res.status(404).json({ error: 'NOT_FOUND' })
    const ctx = await tb.loadTableContext(db(), profile.businessId)
    if (!ctx.plan) return res.json({ slots: [] })
    const now = Date.now()
    const from = jerusalemEpoch(date, '00:00')
    const all = await holds.holdsOf(db(), profile.businessId, from - 6 * HOUR_MS, from + 16 * DAY_MS)
    const ask = { partySize, areaKey: area, onlineOnly: true, now }
    const slots = dayAvailability(ctx.plan, ctx.profile, all, { date, ...ask })
    if (slots.some(s => s.available)) return res.json({ slots })
    const maxLead = profile.requestKinds?.table?.rules?.maxLeadDays
    for (let i = 1; i <= 14; i++) {
      const next = dayAfter(date, i)
      if (maxLead !== undefined && jerusalemEpoch(next, '00:00') > now + maxLead * DAY_MS) break
      const hit = dayAvailability(ctx.plan, ctx.profile, all, { date: next, ...ask }).find(s => s.available)
      if (hit) return res.json({ slots, next: { date: next, time: hit.time } })
    }
    res.json({ slots })
  } catch (err) {
    fail(req, res, 'availability', err)
  }
})

// POST /api/v1/public/:slug/requests
router.post('/:slug/requests', publicLimiter, honeypot, async (req, res) => {
  try {
    const parsed = publicRequestSchema.safeParse(req.body ?? {})
    if (!parsed.success) return res.status(400).json({ error: 'BAD_REQUEST_INPUT', issues: issuesOf(parsed.error) })
    const profile = await loadPublicProfile(db(), req.params.slug)
    if (!profile) return res.status(404).json({ error: 'NOT_FOUND' })
    if (!isPublic(profile)) return res.status(403).json({ error: 'NOT_AVAILABLE' })
    const { kind, guestName, guestPhone, wanted, answers: sent } = parsed.data
    const config = profile.requestKinds?.[kind]
    if (!config?.enabled) return res.status(400).json({ error: 'KIND_DISABLED' })
    const checked = checkAnswers(config, sent)
    if (checked.error) return res.status(400).json({ error: checked.error, issues: checked.issues })

    const { areaKey } = parsed.data
    const tableAsk = kind === 'table' && wanted.date && wanted.time && wanted.partySize && (await tablesOn(profile))
    let answers = checked.answers
    let confirm
    if (tableAsk) {
      const ctx = await tb.loadTableContext(db(), profile.businessId)
      const area = areaKey === undefined ? undefined : ctx.plan?.areas.find(a => a.key === areaKey)
      if (areaKey !== undefined && !area) return res.status(400).json({ error: 'BAD_REQUEST_INPUT', issues: [] })
      const { date, time, partySize } = wanted
      const now = Date.now()
      const ask = { date, time, partySize, areaKey, onlineOnly: true, now }
      const startAt = jerusalemEpoch(date, time)
      const holdEnd = startAt + (turnFor(ctx.service, partySize) + ctx.service.bufferMinutes) * 60000
      const taken = await holds.holdsOf(db(), profile.businessId, startAt - 6 * HOUR_MS, holdEnd + 6 * HOUR_MS)
      const dry = assign(ctx.plan, ctx.profile, taken, ask)
      const noTable = async () => {
        const from = jerusalemEpoch(date, '00:00')
        const range = await holds.holdsOf(db(), profile.businessId, from - 6 * HOUR_MS, from + 16 * DAY_MS)
        const byDate = Object.fromEntries(Array.from({ length: 15 }, (_, i) => [dayAfter(date, i), range]))
        req.log.info({ event: 'public.request.no_table', slug: req.params.slug })
        return res.status(409).json({ error: 'NO_TABLE', alternatives: alternatives(ctx.plan, ctx.profile, byDate, ask) })
      }
      if (!dry.ok && dry.reason === 'full') return await noTable()
      if (area) answers = [...answers.filter(a => a.questionKey !== 'seating'), { questionKey: 'seating', label: 'fd_q_seating', value: area.name }]
      const q = runQualify(profile, kind, wanted, answers, now)
      if (dry.ok && ctx.service.confirmMode === 'auto' && partySize <= ctx.service.autoMaxParty && q.status === 'qualified' && q.qualification.verdict === 'fit') {
        confirm = { ctx, now, noTable }
      }
    }
    const input = { kind, guestName, guestPhone, wanted, answers }
    const opts = { channel: 'public_form', actor: guestActor('form'), via: 'guest', source: 'public_form', consentTerms: Date.now() }
    const badInput = err => (err?.code === 'BAD_CLIENT' || err?.code === 'INVALID_DOC') && res.status(400).json({ error: 'BAD_REQUEST_INPUT', issues: err.issues ?? [] })

    if (confirm) {
      const { ctx, now } = confirm
      const { date, time, partySize } = wanted
      const bookingId = newId()
      const r = await tb.reserveTable(db(), {
        booking: { _id: bookingId, businessId: profile.businessId }, ctx, date, time, partySize, areaKey, onlineOnly: true, now,
      })
      if (!r.ok) return await confirm.noTable()
      let created
      try {
        created = await createRequest(db(), profile.businessId, profile, input, { ...opts, approvedBooking: { id: bookingId, at: now } })
      } catch (err) {
        await holds.release(db(), profile.businessId, bookingId)
        if (badInput(err)) return
        throw err
      }
      const { request, client } = created
      const doc = {
        _id: bookingId, schemaVersion: 2, businessId: profile.businessId, createdBy: guestActor('form'), createdAt: now, updatedAt: now,
        kind: 'table', status: 'confirmed', source: 'request', date, time, startAt: r.startAt, endAt: r.endAt,
        durationMinutes: r.durationMinutes, partySize, tableKeys: r.tableKeys, ...(r.areaKey && { areaKey: r.areaKey }),
        clientId: client._id, guestName: request.guestName, guestPhone: request.guestPhone, requestId: request._id,
        statusHistory: [{ status: 'confirmed', at: now, by: 'server', byName: '', via: 'server' }], publicToken: newPublicToken(),
      }
      try {
        const check = checkStoredDoc('bookings', doc)
        if (!check.ok) throw new Error('INVALID_DOC')
        await db().collection('bookings').insertOne(doc)
      } catch (err) {
        await holds.release(db(), profile.businessId, bookingId)
        await db().collection('requests').updateOne(
          { _id: request._id, ...guestScope(profile.businessId) },
          { $set: { status: 'qualified', updatedAt: Date.now() }, $unset: { outcome: '' }, $pop: { statusHistory: 1 } },
        )
        req.log.error({ err, event: 'public.request.autoconfirm_failed', slug: req.params.slug })
        req.log.info({ event: 'public.request.created', slug: req.params.slug, kind, status: 'qualified', confirmed: false })
        return res.status(201).json({ reference: referenceOf(request), token: request.publicToken, confirmed: false })
      }
      await tb.countBooking(db(), profile.businessId, client._id, now)
      req.log.info({ event: 'public.request.created', slug: req.params.slug, kind, status: 'approved', confirmed: true })
      return res.status(201).json({ reference: referenceOf(request), token: request.publicToken, confirmed: true, booking: { date, time, partySize } })
    }

    let created
    try {
      created = await createRequest(db(), profile.businessId, profile, input, opts)
    } catch (err) {
      if (badInput(err)) return
      throw err
    }
    req.log.info({ event: 'public.request.created', slug: req.params.slug, kind, status: created.request.status, ...(tableAsk && { confirmed: false }) })
    res.status(201).json({ reference: referenceOf(created.request), token: created.request.publicToken, ...(tableAsk && { confirmed: false }) })
  } catch (err) {
    fail(req, res, 'request', err)
  }
})

// GET /api/v1/public/:slug/requests/:token  (a malformed token answers 404 before any database read)
router.get('/:slug/requests/:token', async (req, res) => {
  try {
    if (!isPublicTokenShape(req.params.token)) return res.status(404).json({ error: 'NOT_FOUND' })
    const profile = await loadPublicProfile(db(), req.params.slug)
    if (!profile) return res.status(404).json({ error: 'NOT_FOUND' })
    const request = await findByToken(profile, req.params.token)
    if (!request) return res.status(404).json({ error: 'NOT_FOUND' })
    res.json(await guestView(request, profile))
  } catch (err) {
    fail(req, res, 'status', err)
  }
})

// POST /api/v1/public/:slug/requests/:token/cancel
router.post('/:slug/requests/:token/cancel', publicLimiter, async (req, res) => {
  try {
    if (!isPublicTokenShape(req.params.token)) return res.status(404).json({ error: 'NOT_FOUND' })
    const profile = await loadPublicProfile(db(), req.params.slug)
    if (!profile) return res.status(404).json({ error: 'NOT_FOUND' })
    const request = await findByToken(profile, req.params.token)
    if (!request) return res.status(404).json({ error: 'NOT_FOUND' })
    const now = Date.now()
    const entry = { status: 'cancelled', at: now, by: guestActor('form'), byName: '', via: 'guest' }
    if (request.status === 'approved' && request.outcome?.type === 'booking' && (await tablesOn(profile))) {
      const scope = guestScope(profile.businessId)
      const booking = await db().collection('bookings').findOne({ _id: request.outcome.id, ...scope })
      if (!booking || booking.status !== 'confirmed') return res.status(409).json({ error: 'ALREADY_DECIDED' })
      if (now >= booking.startAt - tableServiceOf(profile).cancellationCutoffHours * HOUR_MS) return res.status(409).json({ error: 'TOO_LATE' })
      const moved = await db().collection('bookings').findOneAndUpdate(
        { _id: booking._id, ...scope, status: 'confirmed' },
        { $set: { status: 'cancelled', updatedAt: now }, $push: { statusHistory: entry } },
      )
      if (!moved) return res.status(409).json({ error: 'ALREADY_DECIDED' })
      await holds.release(db(), profile.businessId, booking._id, now)
      const done = await db().collection('requests').findOneAndUpdate(
        { _id: request._id, ...scope, status: 'approved' },
        { $set: { status: 'cancelled', updatedAt: now }, $push: { statusHistory: entry } },
        { returnDocument: 'after' },
      )
      req.log.info({ event: 'public.booking.cancelled', slug: req.params.slug })
      return res.json(await guestView(done ?? request, profile))
    }
    const updated = await db().collection('requests').findOneAndUpdate(
      { _id: request._id, ...guestScope(profile.businessId), status: { $in: CANCELLABLE } },
      { $set: { status: 'cancelled', updatedAt: now }, $push: { statusHistory: entry } },
      { returnDocument: 'after' },
    )
    if (!updated) return res.status(409).json({ error: 'ALREADY_DECIDED' })
    req.log.info({ event: 'public.request.cancelled', slug: req.params.slug })
    res.json(await guestView(updated, profile))
  } catch (err) {
    fail(req, res, 'cancel', err)
  }
})

// POST /api/v1/public/:slug/requests/:token/confirm  (plan 669: "we are coming"; only with the tables module)
router.post('/:slug/requests/:token/confirm', publicLimiter, async (req, res) => {
  try {
    if (!isPublicTokenShape(req.params.token)) return res.status(404).json({ error: 'NOT_FOUND' })
    const profile = await loadPublicProfile(db(), req.params.slug)
    if (!profile || !(await tablesOn(profile))) return res.status(404).json({ error: 'NOT_FOUND' })
    const request = await findByToken(profile, req.params.token)
    if (!request) return res.status(404).json({ error: 'NOT_FOUND' })
    const scope = guestScope(profile.businessId)
    const booking = request.status === 'approved' && request.outcome?.type === 'booking'
      ? await db().collection('bookings').findOne({ _id: request.outcome.id, ...scope })
      : null
    if (booking?.status !== 'confirmed') return res.status(409).json({ error: 'ALREADY_DECIDED' })
    const now = Date.now()
    await db().collection('bookings').updateOne(
      { _id: booking._id, ...scope, status: 'confirmed', guestConfirmedAt: { $exists: false } },
      { $set: { guestConfirmedAt: now, updatedAt: now } },
    )
    req.log.info({ event: 'public.booking.confirmed', slug: req.params.slug })
    res.json(await guestView(request, profile))
  } catch (err) {
    fail(req, res, 'confirm', err)
  }
})

// Any other method or path under /api/v1/public answers JSON 404 (never 401, never the SPA's HTML).
router.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }))

module.exports = router
