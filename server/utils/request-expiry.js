'use strict'
/**
 * Plan 549: lazy expiry of stale requests (the pattern of server/jobs/purge-deleted.js: runs on read, no scheduler).
 * A `new` or `needs_info` request older than its kind's `expireAfterHours` becomes `expired`; a `qualified` one waits
 * for a member's answer and never expires here.
 * Plan 556: a request also expires when the time it asked for has passed (the earlier of `expireAfterHours` and its requested
 * start), so a short-notice request is never left waiting after its own time.
 */
const { LIVE } = require('../jobs/purge-deleted')
const { logger } = require('../logger')
const { jerusalemEpoch } = require('../generated/schemas/front-desk/local-time')
const { jerusalemDate } = require('../middleware/usage')

const HOUR_MS = 3_600_000
const EXPIRING = ['new', 'needs_info']
const DAY_MS = 86_400_000

/** Expires the open requests whose requested date and time (Jerusalem) are already past; a date without a time counts from 23:59. */
async function expirePastStart(requests, businessId, now) {
  const candidates = await requests.find(
    { businessId, status: { $in: EXPIRING }, 'wanted.date': { $lte: jerusalemDate(now + DAY_MS) } },
    { projection: { _id: 1, wanted: 1 } }
  ).toArray()
  const past = candidates.filter(r => jerusalemEpoch(r.wanted.date, r.wanted.time ?? '23:59') <= now).map(r => r._id)
  if (!past.length) return 0
  const res = await requests.updateMany(
    { businessId, _id: { $in: past }, status: { $in: EXPIRING } },
    {
      $set: { status: 'expired', updatedAt: now },
      $push: { statusHistory: { status: 'expired', at: now, by: 'server', byName: '', via: 'server' } },
    }
  )
  return res.modifiedCount
}

/**
 * Expires the due requests of one business. Returns how many were expired (0 when the business has no profile).
 * @param {import('mongodb').Db} db
 */
async function expireDue(db, businessId, now) {
  const profile = await db.collection('frontDeskProfiles').findOne({ businessId, ...LIVE }, { projection: { requestKinds: 1 } })
  if (!profile) return 0
  const requests = db.collection('requests')
  let count = 0
  for (const [kind, config] of Object.entries(profile.requestKinds ?? {})) {
    const hours = config?.expireAfterHours
    if (typeof hours !== 'number' || !(hours > 0)) continue
    const res = await requests.updateMany(
      { businessId, kind, status: { $in: EXPIRING }, createdAt: { $lte: now - hours * HOUR_MS } },
      {
        $set: { status: 'expired', updatedAt: now },
        $push: { statusHistory: { status: 'expired', at: now, by: 'server', byName: '', via: 'server' } },
      }
    )
    count += res.modifiedCount
  }
  count += await expirePastStart(requests, businessId, now)
  if (count > 0) logger.info({ event: 'requests.expired', count })
  return count
}

module.exports = { expireDue }
