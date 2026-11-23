'use strict'
/**
 * Plan 676 (C-JOBS, detail 2): a hold row carries no time, so a hold whose booking does not exist is removed only when
 * two ticks in a row both found it orphaned (a crash between the claim and the booking write). The previous tick's
 * candidates live in memory; a restart delays the sweep by one tick.
 */
const LIMIT = 2000
let previous = new Set()

function resetOrphanHoldsForTest() { previous = new Set() }

async function orphansOf(db, ids) {
  if (!ids.length) return []
  const found = await db.collection('bookings').find({ _id: { $in: ids } }, { projection: { _id: 1 } }).toArray()
  const exist = new Set(found.map(b => b._id))
  return ids.filter(id => !exist.has(id))
}

async function run(db) {
  const ids = (await db.collection('tableHolds').aggregate([
    { $group: { _id: '$bookingId' } }, { $limit: LIMIT },
  ]).toArray()).map(r => r._id)
  const current = new Set(await orphansOf(db, ids))
  const due = [...current].filter(id => previous.has(id))
  previous = current
  let removed = 0
  if (due.length) {
    const still = await orphansOf(db, due)
    if (still.length) removed = (await db.collection('tableHolds').deleteMany({ bookingId: { $in: still } })).deletedCount
  }
  return { removed }
}

module.exports = { run, resetOrphanHoldsForTest }
