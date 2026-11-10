'use strict'
/**
 * Plan 549 (contract C-REQUEST): the one door for customer requests. The generic data API only reads `requests`
 * (writes answer 405 USE_ROUTER); every write, and every status, is made here with the actor from `actorOf`.
 * Plan 550 adds approve and decline to this router.
 */
const { Router } = require('express')
const mongoose = require('mongoose')
const { verifyToken } = require('../middleware/auth')
const { checkStoredDoc } = require('../middleware/validate')
const { dataWriteLimiter } = require('../middleware/write-limit')
const { scopeFilter, stampNew } = require('../utils/business-scope')
const { assertCan } = require('../utils/permissions')
const { actorOf } = require('../utils/actor')
const { newId } = require('../utils/id')
const { newPublicToken } = require('../utils/public-token')
const { upsertClientByPhone, LIVE_UNMERGED } = require('../utils/client-upsert')
const { LIVE } = require('../jobs/purge-deleted')
const { qualify } = require('../generated/schemas/front-desk/qualify')
const {
  REQUEST_STATUSES, manualRequestInputSchema, wantedSchema, requestAnswersSchema,
} = require('../generated/schemas/entities/request.schema')

const TYPE = 'requests'
const router = Router()
const NOT_FOUND = { error: 'Request not found' }
/** Statuses a member may still change what the customer wants in. */
const OPEN = ['new', 'qualified', 'needs_info']
/** Legal member moves (plan 549 P0). Anything else, including every move out of a decided status, is BAD_STATUS. */
const MOVES = {
  new: ['qualified', 'needs_info', 'cancelled'],
  qualified: ['needs_info', 'cancelled'],
  needs_info: ['qualified', 'cancelled'],
}
const NO_KIND_CONFIG = { enabled: false, questions: [], rules: {}, expireAfterHours: 24 }

router.use(dataWriteLimiter)

const db = () => mongoose.connection.db
const scopeOf = req => ({ _id: req.params.id, ...scopeFilter(req), ...LIVE })

async function loadRequest(req, res) {
  const found = await db().collection(TYPE).findOne(scopeOf(req))
  if (!found) res.status(404).json(NOT_FOUND)
  return found
}

/** Zod check of the document as it will be stored; sends the 400 and returns false when invalid. */
function validMerged(res, merged) {
  const check = checkStoredDoc(TYPE, merged)
  if (check.ok) return true
  res.status(400).json({ error: 'Validation failed', issues: check.issues })
  return false
}

function fail(req, res, name, err) {
  req.log.error({ err, event: `requests.${name}.failed` })
  res.status(500).json({ error: 'Server error' })
}

/**
 * Conditional on the status that was read, so two concurrent writes cannot both land (409 STATUS_CHANGED).
 * Sends the response and returns null when the request is gone or has moved.
 */
async function writeConditional(req, res, read, set, push) {
  const result = await db().collection(TYPE).findOneAndUpdate(
    { ...scopeOf(req), status: read.status },
    { $set: set, ...(push && { $push: { statusHistory: push } }) },
    { returnDocument: 'after' },
  )
  if (result) return result
  const still = await db().collection(TYPE).findOne(scopeOf(req), { projection: { _id: 1 } })
  if (still) res.status(409).json({ error: 'STATUS_CHANGED' })
  else res.status(404).json(NOT_FOUND)
  return null
}

const loadProfile = businessId => db().collection('frontDeskProfiles').findOne({ businessId, ...LIVE })

/** Rules check of one request: `{ status, qualification }`. A missing required answer means `needs_info`. */
function runQualify(profile, kind, wanted, answers, now) {
  const answerMap = Object.fromEntries((answers ?? []).map(a => [a.questionKey, a.value]))
  const result = qualify(profile.requestKinds?.[kind] ?? NO_KIND_CONFIG, wanted, answerMap, {
    now, hours: profile.hours, closedDates: profile.closedDates, kind,
  })
  const missing = result.reasons.some(r => r.startsWith('fd_reason_missing_answer'))
  return { status: missing ? 'needs_info' : 'qualified', qualification: { ...result, by: 'rules' } }
}

// POST /api/v1/requests  { kind, clientId? | guestName + guestPhone, wanted, answers? }  (a phone request, typed by a member)
router.post('/', verifyToken, async (req, res) => {
  try {
    const parsed = manualRequestInputSchema.safeParse(req.body ?? {})
    if (!parsed.success) {
      return res.status(400).json({
        error: 'BAD_REQUEST_INPUT',
        issues: parsed.error.issues.map(i => ({ path: i.path.join('.'), code: i.code, message: i.message })),
      })
    }
    if (!assertCan(req, res, 'manageRequests', { type: TYPE })) return
    const input = parsed.data
    const { businessId } = scopeFilter(req)
    const actor = actorOf(req)
    const profile = await loadProfile(businessId)
    if (!profile) return res.status(409).json({ error: 'NO_PROFILE' })

    let client
    if (input.clientId) {
      client = await db().collection('clients').findOne({ _id: input.clientId, businessId, ...LIVE, ...LIVE_UNMERGED })
      if (!client) return res.status(404).json({ error: 'CLIENT_NOT_FOUND' })
    } else {
      try {
        client = (await upsertClientByPhone(db(), businessId, {
          name: input.guestName, phone: input.guestPhone, source: 'manual', actor,
        })).client
      } catch (err) {
        if (err?.code === 'BAD_CLIENT') return res.status(400).json({ error: 'BAD_REQUEST_INPUT', issues: err.issues ?? [] })
        throw err
      }
    }

    const now = Date.now()
    const { status, qualification } = runQualify(profile, input.kind, input.wanted, input.answers, now)
    const doc = stampNew(req, {
      _id: newId(),
      schemaVersion: 2,
      userId: actor.userId,
      updatedAt: now,
      kind: input.kind,
      status,
      channel: 'manual',
      clientId: client._id,
      guestName: client.name,
      guestPhone: client.phone,
      wanted: input.wanted,
      answers: input.answers,
      qualification,
      statusHistory: [{ status, at: now, by: actor.userId, byName: actor.name, via: 'member' }],
      publicToken: newPublicToken(),
    })
    if (!validMerged(res, doc)) return
    await db().collection(TYPE).insertOne(doc)

    const clients = db().collection('clients')
    await clients.updateOne(
      { _id: client._id, businessId },
      { $inc: { 'counters.requests': 1 }, $set: { lastContactAt: now, updatedAt: now } },
    )
    await clients.updateOne(
      { _id: client._id, businessId, $or: [{ kinds: { $exists: false } }, { kinds: { $size: 0 } }] },
      { $set: { kinds: ['lead'] } },
    )
    req.log.info({ event: 'requests.created', kind: doc.kind, status, channel: doc.channel })
    res.status(201).json(doc)
  } catch (err) {
    fail(req, res, 'create', err)
  }
})

// PUT /api/v1/requests/:id/status  { status, note? }
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status, note } = req.body ?? {}
    if (!REQUEST_STATUSES.includes(status) || (note !== undefined && (typeof note !== 'string' || note.length > 500))) {
      return res.status(400).json({ error: 'BAD_REQUEST_INPUT' })
    }
    const current = await loadRequest(req, res)
    if (!current) return
    if (!assertCan(req, res, 'manageRequests', { type: TYPE, doc: current })) return
    if (!(MOVES[current.status] ?? []).includes(status)) return res.status(409).json({ error: 'BAD_STATUS' })
    const now = Date.now()
    const actor = actorOf(req)
    const entry = { status, at: now, by: actor.userId, byName: actor.name, via: 'member', ...(note && { note }) }
    if (!validMerged(res, { ...current, status, updatedAt: now, statusHistory: [...current.statusHistory, entry] })) return
    const result = await writeConditional(req, res, current, { status, updatedAt: now }, entry)
    if (!result) return
    req.log.info({ event: 'requests.status.changed', from: current.status, to: status })
    res.json(result)
  } catch (err) {
    fail(req, res, 'status', err)
  }
})

// PUT /api/v1/requests/:id/wanted  { wanted, answers? }
router.put('/:id/wanted', verifyToken, async (req, res) => {
  try {
    const wanted = wantedSchema.safeParse(req.body?.wanted)
    const answers = req.body?.answers === undefined ? { success: true, data: undefined } : requestAnswersSchema.safeParse(req.body.answers)
    if (!wanted.success || !answers.success) return res.status(400).json({ error: 'BAD_REQUEST_INPUT' })
    const current = await loadRequest(req, res)
    if (!current) return
    if (!assertCan(req, res, 'manageRequests', { type: TYPE, doc: current })) return
    if (!OPEN.includes(current.status)) return res.status(409).json({ error: 'ALREADY_DECIDED' })
    const profile = await loadProfile(current.businessId)
    if (!profile) return res.status(409).json({ error: 'NO_PROFILE' })

    const now = Date.now()
    const nextAnswers = answers.data ?? current.answers
    const { status, qualification } = runQualify(profile, current.kind, wanted.data, nextAnswers, now)
    const changed = status !== current.status
    const actor = actorOf(req)
    const entry = { status, at: now, by: actor.userId, byName: actor.name, via: 'member' }
    const set = { wanted: wanted.data, answers: nextAnswers, qualification, status, updatedAt: now }
    const merged = { ...current, ...set, statusHistory: changed ? [...current.statusHistory, entry] : current.statusHistory }
    if (!validMerged(res, merged)) return
    const result = await writeConditional(req, res, current, set, changed ? entry : undefined)
    if (!result) return
    req.log.info({ event: 'requests.wanted.updated', kind: current.kind, status })
    res.json(result)
  } catch (err) {
    fail(req, res, 'wanted', err)
  }
})

module.exports = router
