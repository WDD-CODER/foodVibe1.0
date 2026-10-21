'use strict'
/** Plan 430 (C-USAGE): read helpers over `usageDays` for the Team list (428) and the dashboards (447, 448). */
const { jerusalemDate } = require('../middleware/usage')

/** `Map<userId, epoch ms of the user's latest activity>` for one business. */
async function lastActiveByUser(db, businessId) {
  const rows = await db.collection('usageDays').aggregate([
    { $match: { businessId } },
    { $group: { _id: '$userId', last: { $max: '$lastAt' } } },
  ]).toArray()
  return new Map(rows.map(r => [r._id, r.last]))
}

/** Days in [from, to] (Israel dates) with at least one active user; owner and staff on one day count once. */
async function activeDays(db, { businessId, from, to }) {
  const dates = await db.collection('usageDays').distinct('date', { businessId, date: { $gte: from, $lte: to } })
  return dates.length
}

/** `Map<businessId, active day count>` over [from, to], in one query (platform admin table). */
async function activeDaysByBusiness(db, { from, to }) {
  const rows = await db.collection('usageDays').aggregate([
    { $match: { date: { $gte: from, $lte: to } } },
    { $group: { _id: { businessId: '$businessId', date: '$date' } } },
    { $group: { _id: '$_id.businessId', days: { $sum: 1 } } },
  ]).toArray()
  return new Map(rows.map(r => [r._id, r.days]))
}

/** Sunday-Saturday Israel week containing `date` (`YYYY-MM-DD`, or epoch ms). */
function weekBounds(date) {
  const day = typeof date === 'number' ? jerusalemDate(date) : String(date)
  const base = new Date(day.slice(0, 10) + 'T00:00:00Z')
  const iso = offset => new Date(base.getTime() + offset * 86400000).toISOString().slice(0, 10)
  const dow = base.getUTCDay()
  return { from: iso(-dow), to: iso(6 - dow) }
}

module.exports = { lastActiveByUser, activeDays, activeDaysByBusiness, weekBounds }
