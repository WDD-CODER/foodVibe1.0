'use strict'
/**
 * Plan 543 (contract C-ACTOR): the one place a server stamp takes its actor from.
 * Every stamp (`createdBy`, `statusHistory[].by/byName`, `decisionLog.decidedBy`) uses `actorOf(req)`;
 * no router reads `req.user` for a stamp directly, so a later "act in business" mode is a one-place change.
 * A guest (non-member) write stamps `guestActor(channel)` instead (C-GUEST, ADR 0030).
 */

/** The signed-in member who made the change: `{ userId, name }`. */
function actorOf(req) {
  return { userId: req.user.userId, name: req.user.name ?? '' }
}

const GUEST_CHANNELS = { form: 'public:form', whatsapp: 'public:whatsapp' }

/** The `createdBy` stamp of a guest write: `'public:form'` or `'public:whatsapp'`. */
function guestActor(channel) {
  if (!Object.prototype.hasOwnProperty.call(GUEST_CHANNELS, channel)) throw new Error('unknown guest channel')
  return GUEST_CHANNELS[channel]
}

module.exports = { actorOf, guestActor }
