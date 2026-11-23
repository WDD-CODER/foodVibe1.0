'use strict'
/**
 * Plan 676 (C-JOBS): the automatic no-show, only where the owner switched `autoNoShow` on. The move goes through
 * `moveBookingStatus`, the one writer of a booking's status. Counts only.
 */
const { LIVE } = require('./purge-deleted')
const { businessModules } = require('../middleware/require-module')
const { moveBookingStatus } = require('../services/table-bookings')
const { tableServiceOf } = require('../generated/schemas/front-desk/table-service')

const BATCH = 200
const MIN_MS = 60000
const HOUR_MS = 3600000

/** Moves one booking to `no_show` as the server; true when it moved. */
async function markOne(db, booking, now) {
  const r = await moveBookingStatus(db, {
    businessId: booking.businessId, id: booking._id, status: 'no_show', by: 'server', byName: '', via: 'server', now,
  })
  return r.ok
}

async function run(db, now) {
  const counts = { marked: 0 }
  const rows = await db.collection('bookings').find({
    kind: 'table', status: 'confirmed', tableKeys: { $exists: true }, test: { $ne: true }, ...LIVE,
    startAt: { $gte: now - 12 * HOUR_MS, $lte: now - 5 * MIN_MS },
  }).limit(BATCH).toArray()
  const gates = new Map()
  const holdOf = businessId => {
    if (!gates.has(businessId)) {
      gates.set(businessId, (async () => {
        if (!(await businessModules(businessId)).includes('tables')) return null
        const service = tableServiceOf(await db.collection('frontDeskProfiles').findOne({ businessId, ...LIVE }))
        return service.autoNoShow ? service.holdMinutes : null
      })())
    }
    return gates.get(businessId)
  }
  for (const booking of rows) {
    const hold = await holdOf(booking.businessId)
    if (hold === null || now <= booking.startAt + hold * MIN_MS) continue
    if (await markOne(db, booking, now)) counts.marked++
  }
  return counts
}

module.exports = { run, markOne }
