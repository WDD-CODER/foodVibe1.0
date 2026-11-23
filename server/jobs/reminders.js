'use strict'
/**
 * Plan 676 (C-JOBS): the reminder job. One reminder per booking of today, at the business's `reminderHour`, through
 * the one sender. A booking is claimed (`remindedAt`) before the send, so two runs never send twice. Counts only.
 */
const { LIVE } = require('./purge-deleted')
const { businessModules } = require('../middleware/require-module')
const { sendOut } = require('../services/outbound')
const { tableServiceOf } = require('../generated/schemas/front-desk/table-service')
const { jerusalemDateTime, jerusalemEpoch } = require('../generated/schemas/front-desk/local-time')
const { templateMessage } = require('../generated/schemas/front-desk/message-templates')

const BATCH = 200

/**
 * Claims and sends the reminder of one booking. `conversation` is given by the simulator's clock; the job looks it up.
 * Answers `'sent'`, `'noConversation'`, `'ALREADY'` or the refusal's reason (`DO_NOT_CONTACT`, `NOT_LIVE`, ...).
 */
async function remindOne(db, booking, now, { conversation } = {}) {
  const claim = await db.collection('bookings').updateOne(
    { _id: booking._id, businessId: booking.businessId, remindedAt: { $exists: false }, status: 'confirmed' },
    { $set: { remindedAt: now } },
  )
  if (!claim.modifiedCount) return 'ALREADY'
  const conv = conversation ?? await db.collection('conversations').findOne({
    businessId: booking.businessId, clientId: booking.clientId, liveKey: { $exists: true },
  })
  if (!conv) return 'noConversation'
  const msg = templateMessage('booking_reminder', { name: booking.guestName, time: booking.time, partySize: booking.partySize }, booking.publicToken)
  const { buttons, ...template } = msg
  const sent = await sendOut(db, conv, { kind: 'template', template, buttons }, 'server', { now })
  return sent.ok ? 'sent' : sent.reason
}

async function run(db, now) {
  const counts = { sent: 0, noConversation: 0, refused: 0 }
  const today = jerusalemDateTime(now).date
  const rows = await db.collection('bookings').find({
    kind: 'table', date: today, status: 'confirmed', tableKeys: { $exists: true }, remindedAt: { $exists: false },
    test: { $ne: true }, ...LIVE,
  }).sort({ startAt: 1 }).limit(BATCH).toArray()
  const gates = new Map()
  const gateOf = businessId => {
    if (!gates.has(businessId)) {
      gates.set(businessId, (async () => {
        const modules = await businessModules(businessId)
        if (!modules.includes('tables')) return false
        const profile = await db.collection('frontDeskProfiles').findOne({ businessId, ...LIVE })
        return now >= jerusalemEpoch(today, tableServiceOf(profile).reminderHour)
      })())
    }
    return gates.get(businessId)
  }
  for (const booking of rows) {
    if (!(await gateOf(booking.businessId))) continue
    const r = await remindOne(db, booking, now)
    if (r === 'ALREADY') continue
    if (r === 'sent') counts.sent++
    else if (r === 'noConversation') counts.noConversation++
    else counts.refused++
  }
  return counts
}

module.exports = { run, remindOne }
