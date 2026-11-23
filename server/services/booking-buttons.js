'use strict'
/**
 * Plan 676 (C-CONV, details 3 and 4): the Confirm and Cancel taps of the reminder. A tap is accepted only for a booking
 * of the conversation's own business and client, found by its `publicToken`. No model call; logs carry ids only.
 */
const { LIVE } = require('../jobs/purge-deleted')
const { sendOut } = require('./outbound')
const { moveBookingStatus } = require('./table-bookings')
const { tableServiceOf } = require('../generated/schemas/front-desk/table-service')
const { templateMessage } = require('../generated/schemas/front-desk/message-templates')

const HOUR_MS = 3600000

const template = (name, values) => {
  const { buttons, ...t } = templateMessage(name, values)
  return { kind: 'template', template: t, ...(buttons && { buttons }) }
}

/** One conditional update: the conversation moves from `bot` to `human` so a person answers. */
async function toHuman(db, conversation, at) {
  await db.collection('conversations').updateOne(
    { _id: conversation._id, businessId: conversation.businessId, status: 'bot' },
    { $set: { status: 'human', updatedAt: at } },
  )
}

const bookingOf = (db, conversation, token) => token
  ? db.collection('bookings').findOne({
    businessId: conversation.businessId, clientId: conversation.clientId, publicToken: token, kind: 'table', ...LIVE,
  })
  : null

async function confirm(db, { conversation, token, at }) {
  const booking = await bookingOf(db, conversation, token)
  if (!booking || booking.status !== 'confirmed') return toHuman(db, conversation, at)
  const r = await db.collection('bookings').updateOne(
    { _id: booking._id, businessId: booking.businessId, guestConfirmedAt: { $exists: false } },
    { $set: { guestConfirmedAt: at, updatedAt: at } },
  )
  if (!r.modifiedCount) return
  await sendOut(db, conversation, template('booking_confirmed', {
    name: booking.guestName, date: booking.date, time: booking.time, partySize: booking.partySize,
  }), 'server', { now: at })
}

async function cancel(db, { conversation, token, at }) {
  const booking = await bookingOf(db, conversation, token)
  if (!booking || booking.status !== 'confirmed') return toHuman(db, conversation, at)
  const profile = await db.collection('frontDeskProfiles').findOne({ businessId: booking.businessId, ...LIVE })
  const { cancellationCutoffHours } = tableServiceOf(profile)
  if (at >= booking.startAt - cancellationCutoffHours * HOUR_MS) return toHuman(db, conversation, at)
  const moved = await moveBookingStatus(db, {
    businessId: booking.businessId, id: booking._id, status: 'cancelled', by: 'guest', byName: '', via: 'guest', now: at,
  })
  if (!moved.ok) return toHuman(db, conversation, at)
  await sendOut(db, conversation, template('booking_cancelled', {
    name: booking.guestName, date: booking.date, time: booking.time,
  }), 'server', { now: at })
}

function registerBookingButtons(registerButton) {
  registerButton('CONFIRM', confirm)
  registerButton('CANCEL', cancel)
}

module.exports = { registerBookingButtons }
