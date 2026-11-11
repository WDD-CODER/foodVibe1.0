'use strict'
/**
 * Plan 549: lazy expiry of stale requests (the pattern of server/jobs/purge-deleted.js: runs on read, no scheduler).
 * A `new` or `needs_info` request older than its kind's `expireAfterHours` becomes `expired`; a `qualified` one waits
 * for a member's answer and never expires here.
 */
const { LIVE } = require('../jobs/purge-deleted')
const { logger } = require('../logger')

const HOUR_MS = 3_600_000
const EXPIRING = ['new', 'needs_info']

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
  if (count > 0) logger.info({ event: 'requests.expired', count })
  return count
}

module.exports = { expireDue }
