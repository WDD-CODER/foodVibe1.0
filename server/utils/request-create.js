'use strict'
/**
 * Plan 555: the one creation path of a customer request. The manual route (`POST /api/v1/requests`, a member typing a
 * phone request) and the public route (`POST /api/v1/public/:slug/requests`, a guest) both call `createRequest`, so
 * stamps, the rules check and the client counters cannot drift. Moved out of `routes/requests.js` unchanged (plan 549).
 *
 * `actor` is a member `{ userId, name }` (`actorOf(req)`) or a guest string (`guestActor('form')`); the business comes
 * from the caller (token or server-resolved slug), never from the input.
 * Failures are thrown as `Error` with `code`: `CLIENT_NOT_FOUND`, `BAD_CLIENT` (+ `issues`), `INVALID_DOC` (+ `issues`).
 */
const { checkStoredDoc } = require('../middleware/validate')
const { newId } = require('./id')
const { newPublicToken } = require('./public-token')
const { upsertClientByPhone, LIVE_UNMERGED } = require('./client-upsert')
const { LIVE } = require('../jobs/purge-deleted')
const { qualify } = require('../generated/schemas/front-desk/qualify')

const NO_KIND_CONFIG = { enabled: false, questions: [], rules: {}, expireAfterHours: 24 }

/** Rules check of one request: `{ status, qualification }`. A missing required answer means `needs_info`. */
function runQualify(profile, kind, wanted, answers, now) {
  const answerMap = Object.fromEntries((answers ?? []).map(a => [a.questionKey, a.value]))
  const result = qualify(profile.requestKinds?.[kind] ?? NO_KIND_CONFIG, wanted, answerMap, {
    now, hours: profile.hours, closedDates: profile.closedDates, kind,
  })
  const missing = result.reasons.some(r => r.startsWith('fd_reason_missing_answer'))
  return { status: missing ? 'needs_info' : 'qualified', qualification: { ...result, by: 'rules' } }
}

const fail = (code, issues) => Object.assign(new Error(code), { code, ...(issues && { issues }) })

/**
 * @param {object} input `{ kind, clientId?, guestName?, guestPhone?, wanted, answers }`
 * @param {object} opts `{ channel, actor, via, source = 'manual', consentTerms? }`
 * @returns {Promise<{ request: object, client: object }>}
 */
async function createRequest(db, businessId, profile, input, { channel, actor, via, source = 'manual', consentTerms }) {
  const member = actor && typeof actor === 'object'
  const actorId = member ? actor.userId : actor
  const actorName = member ? actor.name : ''

  let client
  if (input.clientId) {
    client = await db.collection('clients').findOne({ _id: input.clientId, businessId, ...LIVE, ...LIVE_UNMERGED })
    if (!client) throw fail('CLIENT_NOT_FOUND')
  } else {
    try {
      const found = await upsertClientByPhone(db, businessId, { name: input.guestName, phone: input.guestPhone, source, actor })
      client = found.client
      if (found.created && consentTerms) {
        await db.collection('clients').updateOne({ _id: client._id, businessId }, { $set: { 'consent.terms': consentTerms } })
      }
    } catch (err) {
      if (err?.code === 'BAD_CLIENT') throw fail('BAD_CLIENT', err.issues ?? [])
      throw err
    }
  }

  const now = Date.now()
  const { status, qualification } = runQualify(profile, input.kind, input.wanted, input.answers, now)
  const doc = {
    _id: newId(),
    schemaVersion: 2,
    ...(member && { userId: actorId }),
    businessId,
    createdBy: actorId,
    createdAt: now,
    updatedAt: now,
    kind: input.kind,
    status,
    channel,
    clientId: client._id,
    guestName: client.name,
    guestPhone: client.phone,
    wanted: input.wanted,
    answers: input.answers,
    qualification,
    statusHistory: [{ status, at: now, by: actorId, byName: actorName, via }],
    publicToken: newPublicToken(),
  }
  const check = checkStoredDoc('requests', doc)
  if (!check.ok) throw fail('INVALID_DOC', check.issues)
  await db.collection('requests').insertOne(doc)

  const clients = db.collection('clients')
  await clients.updateOne(
    { _id: client._id, businessId },
    { $inc: { 'counters.requests': 1 }, $set: { lastContactAt: now, updatedAt: now } },
  )
  await clients.updateOne(
    { _id: client._id, businessId, $or: [{ kinds: { $exists: false } }, { kinds: { $size: 0 } }] },
    { $set: { kinds: ['lead'] } },
  )
  return { request: doc, client }
}

module.exports = { createRequest, runQualify }
