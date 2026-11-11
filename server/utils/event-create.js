'use strict'
/**
 * Plan 550 (map delta 6): the one copy of what a brand-new event looks like when the server stores it.
 * The generic POST (`server/routes/generic.js`) and the request approve route (`server/routes/requests.js`) both build
 * their `menuEvents` doc here, so the inquiry defaults cannot drift between the two.
 */
const { EVENT_SERVER_FIELDS } = require('../generated/schemas/entities/event-stage')

/** Plan 442: `body` without the event fields only the server writes (stage, history, notes ...). */
function withoutServerEventFields(body) {
  const copy = { ...body }
  for (const key of EVENT_SERVER_FIELDS) delete copy[key]
  return copy
}

/**
 * Plan 446: the planning snapshot a client may send with a save. Only a stored snapshot that is not frozen is
 * replaced, and a client never sets `frozenAt` (the events router freezes). `stored` is the doc being updated, or
 * null on a create (a new event has no plan to snapshot yet).
 */
function withSavedSnapshot(body, stored) {
  if (!('planSnapshot' in body)) return body
  const { planSnapshot, ...rest } = body
  if (!stored || stored.planSnapshot?.frozenAt !== undefined) return rest
  if (!planSnapshot || typeof planSnapshot !== 'object') return rest
  const { frozenAt: _ignored, ...content } = planSnapshot
  return { ...rest, planSnapshot: content }
}

/**
 * The doc to insert for a new event: the body without the server fields, stamped with the actor and the business,
 * lineage, schema version, and the inquiry stage with its first history entry and no notes.
 * @param {object} body what the caller wants stored (a numeric `createdAt` is kept, as a restored doc keeps its own)
 * @param {{ actor: { userId: string, name: string }, businessId?: string, _id: string, now: number }} ctx
 */
function buildNewEventDoc(body, { actor, businessId, _id, now }) {
  const safe = withSavedSnapshot(withoutServerEventFields(body), null)
  return {
    ...safe,
    _id,
    userId: actor.userId,
    ...(businessId && { businessId }),
    createdBy: actor.userId,
    _masterId: _id,
    _userModified: false,
    schemaVersion: 2,
    createdAt: typeof safe.createdAt === 'number' ? safe.createdAt : now,
    updatedAt: now,
    stage: 'inquiry',
    stageHistory: [{ stage: 'inquiry', at: now, by: actor.userId, byName: actor.name }],
    notes: [],
  }
}

module.exports = { buildNewEventDoc, withoutServerEventFields, withSavedSnapshot }
