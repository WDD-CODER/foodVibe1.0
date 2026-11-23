'use strict'
/** Plan 676 (C-JOBS): waiting-list entries of an earlier date that are still `waiting` or `notified` become `expired`. */
const { jerusalemDateTime } = require('../generated/schemas/front-desk/local-time')

async function run(db, now) {
  const today = jerusalemDateTime(now).date
  const r = await db.collection('waitlistEntries').updateMany(
    { status: { $in: ['waiting', 'notified'] }, date: { $lt: today } },
    { $set: { status: 'expired', updatedAt: now } },
  )
  return { expired: r.modifiedCount }
}

module.exports = { run }
