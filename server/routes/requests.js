'use strict'
/**
 * Plan 549 (contract C-REQUEST): the one door for customer requests. The generic data API only reads `requests`
 * (writes answer 405 USE_ROUTER); every write, and every status, is made here with the actor from `actorOf`.
 * Plan 550 adds approve, decline and the decision log (approve / decline / ask) to this router.
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
const { expireDue } = require('../utils/request-expiry')
const { buildNewEventDoc } = require('../utils/event-create')
const { newNote } = require('../utils/event-stage')
const { jerusalemEpoch } = require('../generated/schemas/front-desk/local-time')
const { qualify } = require('../generated/schemas/front-desk/qualify')
const {
  REQUEST_STATUSES, DECLINE_REASONS, manualRequestInputSchema, wantedSchema, requestAnswersSchema,
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
const NOTE_MAX = 2000
const DEFAULT_DURATION_MINUTES = 60
const NEEDS_PARTY = ['table', 'tasting']
const NEW_KIND = { event: 'event_client', tasting: 'event_client', consultation: 'event_client', table: 'diner' }
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

/**
 * Plan 550: one decision-log row. Ids, enums and numbers only: never the guest's name, phone or any free text.
 * `editedFields` are `wanted` keys. Written after the decision is stored.
 */
async function writeDecision(req, request, action, editedFields, now) {
  const actor = actorOf(req)
  const doc = {
    _id: newId(),
    schemaVersion: 2,
    businessId: request.businessId,
    createdBy: actor.userId,
    createdAt: now,
    updatedAt: now,
    requestId: request._id,
    ...(request.suggested?.action && { suggestion: request.suggested.action }),
    ...(request.qualification?.verdict && { verdict: request.qualification.verdict }),
    decidedAction: action,
    decidedBy: actor.userId,
    editedFields,
    secondsToDecision: Math.max(0, Math.round((now - request.createdAt) / 1000)),
    at: now,
  }
  const check = checkStoredDoc('decisionLog', doc)
  if (!check.ok) throw new Error('decisionLog row failed validation')
  await db().collection('decisionLog').insertOne(doc)
}

/** One line `label: value` per stored answer, cut to the note limit; '' when there are none. */
const answersSummary = answers => (answers ?? []).map(a => `${a.label}: ${a.value}`).join('\n').slice(0, NOTE_MAX)

/** The event a request becomes (map delta 6): the shared builder plus the answers as the first note. */
function eventOutcome(request, wanted, ctx) {
  const name = [request.guestName, wanted.eventTypeKey, wanted.date].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  const doc = buildNewEventDoc({
    name,
    clientId: request.clientId,
    clientName: request.guestName,
    clientPhone: request.guestPhone,
    ...(wanted.date && { eventDate: wanted.date }),
    guestCount: wanted.partySize ?? 0,
    eventType: wanted.eventTypeKey ?? '',
    servingType: '',
    sections: [],
  }, ctx)
  const summary = answersSummary(request.answers)
  if (summary) {
    const made = newNote(summary, ctx.actor, ctx.now, newId())
    if (made.ok) doc.notes = [made.note]
  }
  return doc
}

/** The booking a request becomes, or `{ missing: [...] }` when the date, time or party size is not there. */
function bookingOutcome(request, wanted, profile, ctx) {
  const partySize = wanted.partySize ?? (request.kind === 'consultation' ? 1 : undefined)
  const missing = [
    ...(wanted.date ? [] : ['date']),
    ...(wanted.time ? [] : ['time']),
    ...(partySize || !NEEDS_PARTY.includes(request.kind) ? [] : ['partySize']),
  ]
  if (missing.length) return { missing }
  const durationMinutes = profile?.requestKinds?.[request.kind]?.defaultDurationMinutes ?? DEFAULT_DURATION_MINUTES
  const startAt = jerusalemEpoch(wanted.date, wanted.time)
  return {
    doc: {
      _id: ctx._id,
      schemaVersion: 2,
      userId: ctx.actor.userId,
      businessId: ctx.businessId,
      createdBy: ctx.actor.userId,
      createdAt: ctx.now,
      updatedAt: ctx.now,
      kind: request.kind,
      status: 'confirmed',
      source: 'request',
      date: wanted.date,
      time: wanted.time,
      startAt,
      endAt: startAt + durationMinutes * 60000,
      durationMinutes,
      partySize: partySize ?? 1,
      clientId: request.clientId,
      guestName: request.guestName,
      guestPhone: request.guestPhone,
      requestId: request._id,
      statusHistory: [{ status: 'confirmed', at: ctx.now, by: ctx.actor.userId, byName: ctx.actor.name, via: 'member' }],
      publicToken: newPublicToken(),
    },
  }
}

// POST /api/v1/requests/:id/approve  { wanted?, note? }  - one call: claim, create the event or booking, update the client, log
router.post('/:id/approve', verifyToken, async (req, res) => {
  try {
    const { note } = req.body ?? {}
    const overrides = wantedSchema.safeParse(req.body?.wanted ?? {})
    if (!overrides.success || (note !== undefined && (typeof note !== 'string' || note.length > 500))) {
      return res.status(400).json({ error: 'BAD_REQUEST_INPUT' })
    }
    if (!assertCan(req, res, 'manageRequests', { type: TYPE })) return
    const { businessId } = scopeFilter(req)
    const now = Date.now()
    await expireDue(db(), businessId, now)
    const current = await loadRequest(req, res)
    if (!current) return
    if (!assertCan(req, res, 'manageRequests', { type: TYPE, doc: current })) return
    if (!OPEN.includes(current.status)) return res.status(409).json({ error: 'ALREADY_DECIDED' })

    const wanted = { ...current.wanted, ...overrides.data }
    const editedFields = Object.keys(overrides.data).filter(k => JSON.stringify(overrides.data[k]) !== JSON.stringify(current.wanted?.[k]))
    const actor = actorOf(req)
    const outcomeId = newId()
    const ctx = { actor, businessId: current.businessId, _id: outcomeId, now }
    const isEvent = current.kind === 'event'
    const outcomeType = isEvent ? 'menuEvent' : 'booking'
    const outcomeCollection = isEvent ? 'menuEvents' : 'bookings'

    // The outcome is built and checked before the claim, so a bad one never touches the request.
    let outcome
    if (isEvent) {
      outcome = eventOutcome(current, wanted, ctx)
    } else {
      const built = bookingOutcome(current, wanted, await loadProfile(current.businessId), ctx)
      if (built.missing) return res.status(400).json({ error: 'MISSING_BOOKING_FIELDS', fields: built.missing })
      outcome = built.doc
    }
    const check = checkStoredDoc(outcomeCollection, outcome)
    if (!check.ok) return res.status(400).json({ error: 'Validation failed', issues: check.issues })

    const entry = { status: 'approved', at: now, by: actor.userId, byName: actor.name, via: 'member', ...(note && { note }) }
    const requestOutcome = { type: outcomeType, id: outcomeId }
    const after = { ...current, status: 'approved', wanted, updatedAt: now, outcome: requestOutcome, statusHistory: [...current.statusHistory, entry] }
    if (!validMerged(res, after)) return

    // Claim: only one concurrent approve (or decline) can move the request out of the status that was read.
    const claimed = await db().collection(TYPE).findOneAndUpdate(
      { ...scopeOf(req), status: current.status },
      { $set: { status: 'approved', wanted, updatedAt: now, outcome: requestOutcome }, $push: { statusHistory: entry } },
      { returnDocument: 'after' },
    )
    if (!claimed) return res.status(409).json({ error: 'ALREADY_DECIDED' })

    try {
      await db().collection(outcomeCollection).insertOne(outcome)
    } catch (err) {
      // No transactions: undo the claim (only while it is still ours), then answer the error.
      await db().collection(TYPE).updateOne(
        { ...scopeOf(req), status: 'approved', 'outcome.id': outcomeId },
        { $set: { status: current.status, wanted: current.wanted, updatedAt: current.updatedAt }, $unset: { outcome: '' }, $pop: { statusHistory: 1 } },
      )
      return fail(req, res, 'approve', err)
    }

    const clients = db().collection('clients')
    const client = await clients.findOne({ _id: current.clientId, businessId: current.businessId })
    if (client) {
      const kinds = [...new Set([...(client.kinds ?? []).filter(k => k !== 'lead'), NEW_KIND[current.kind]])].slice(-3)
      await clients.updateOne(
        { _id: client._id, businessId: current.businessId },
        { $set: { kinds, lastContactAt: now, updatedAt: now }, $inc: { [isEvent ? 'counters.events' : 'counters.bookings']: 1 } },
      )
    }
    await writeDecision(req, current, 'approve', editedFields, now)
    req.log.info({ event: 'requests.approved', kind: current.kind, outcomeType })
    res.json({ request: claimed, outcome })
  } catch (err) {
    fail(req, res, 'approve', err)
  }
})

// POST /api/v1/requests/:id/decline  { reason, text? }
router.post('/:id/decline', verifyToken, async (req, res) => {
  try {
    const { reason, text } = req.body ?? {}
    if (!DECLINE_REASONS.includes(reason)) return res.status(400).json({ error: 'BAD_REASON' })
    if (text !== undefined && (typeof text !== 'string' || text.length > 500)) return res.status(400).json({ error: 'BAD_REQUEST_INPUT' })
    if (!assertCan(req, res, 'manageRequests', { type: TYPE })) return
    const now = Date.now()
    await expireDue(db(), scopeFilter(req).businessId, now)
    const current = await loadRequest(req, res)
    if (!current) return
    if (!assertCan(req, res, 'manageRequests', { type: TYPE, doc: current })) return
    if (!OPEN.includes(current.status)) return res.status(409).json({ error: 'ALREADY_DECIDED' })
    const actor = actorOf(req)
    const entry = { status: 'declined', at: now, by: actor.userId, byName: actor.name, via: 'member', ...(text && { note: text }) }
    const decline = { reason, ...(text && { text }), at: now, by: actor.userId }
    if (!validMerged(res, { ...current, status: 'declined', decline, updatedAt: now, statusHistory: [...current.statusHistory, entry] })) return
    const result = await db().collection(TYPE).findOneAndUpdate(
      { ...scopeOf(req), status: current.status },
      { $set: { status: 'declined', decline, updatedAt: now }, $push: { statusHistory: entry } },
      { returnDocument: 'after' },
    )
    if (!result) return res.status(409).json({ error: 'ALREADY_DECIDED' })
    await writeDecision(req, current, 'decline', [], now)
    req.log.info({ event: 'requests.declined', kind: current.kind, reason })
    res.json(result)
  } catch (err) {
    fail(req, res, 'decline', err)
  }
})

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
    if (status === 'needs_info') await writeDecision(req, current, 'ask', [], now)
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
