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
 */
const { Router } = require('express')
const mongoose = require('mongoose')
const { publicLimiter } = require('../middleware/rate-limit')
const { honeypot } = require('../middleware/honeypot')
const { guestScope } = require('../utils/business-scope')
const { guestActor } = require('../utils/actor')
const { isPublicTokenShape } = require('../utils/public-token')
const { loadPublicProfile, isPublic, publicView } = require('../utils/public-profile')
const { createRequest } = require('../utils/request-create')
const { expireDue } = require('../utils/request-expiry')
const { publicRequestSchema } = require('../generated/schemas/public/public-request.schema')

const router = Router()

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

router.get('/health', (_req, res) => res.json({ ok: true }))

const db = () => mongoose.connection.db
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
    if (booking) view.booking = { date: booking.date, time: booking.time, partySize: booking.partySize, status: booking.status }
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
    res.json(publicView(profile))
  } catch (err) {
    fail(req, res, 'profile', err)
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

    let created
    try {
      created = await createRequest(
        db(),
        profile.businessId,
        profile,
        { kind, guestName, guestPhone, wanted, answers: checked.answers },
        { channel: 'public_form', actor: guestActor('form'), via: 'guest', source: 'public_form', consentTerms: Date.now() },
      )
    } catch (err) {
      if (err?.code === 'BAD_CLIENT' || err?.code === 'INVALID_DOC') {
        return res.status(400).json({ error: 'BAD_REQUEST_INPUT', issues: err.issues ?? [] })
      }
      throw err
    }
    req.log.info({ event: 'public.request.created', slug: req.params.slug, kind, status: created.request.status })
    res.status(201).json({ reference: referenceOf(created.request), token: created.request.publicToken })
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

// Any other method or path under /api/v1/public answers JSON 404 (never 401, never the SPA's HTML).
router.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }))

module.exports = router
