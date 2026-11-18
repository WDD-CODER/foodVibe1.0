'use strict';
/**
 * Plan 558 — retention. Personal data is kept only as long as needed. Lazy, like server/jobs/purge-deleted.js:
 * runs on a read of requests / bookings for the caller's own business, at most once per business per 24 hours.
 * Plan 619: also deletes stored files (voice recordings) past their `deleteAfter`.
 * Never touches decisionLog (no personal fields), clients or menuEvents.
 */
const { logger } = require('../logger');
const { deleteStoredFile } = require('../services/file-store');

const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION = Object.freeze({ requestsDays: 730, bookingsDays: 730, messagesDays: 365, voiceFilesDays: 730 });
const FINAL_STATUSES = ['approved', 'declined', 'cancelled', 'expired'];

const lastRun = new Map();

/** Test helper: forgets the throttle. */
function resetRetentionThrottle() {
  lastRun.clear();
}

/**
 * Deletes the over-age requests (final status, from their last change), bookings (by `startAt`) and messages of one business.
 * Returns the counts, or null when the 24-hour throttle skipped the run.
 * @param {import('mongodb').Db} db
 */
async function purgeRetained(db, businessId, now) {
  if (!businessId) return null;
  const prev = lastRun.get(businessId);
  if (prev !== undefined && now - prev < DAY_MS) return null;
  lastRun.set(businessId, now);

  const requests = await db.collection('requests').deleteMany({
    businessId,
    status: { $in: FINAL_STATUSES },
    $expr: { $lt: [{ $ifNull: ['$updatedAt', '$createdAt'] }, now - RETENTION.requestsDays * DAY_MS] },
  });
  const bookings = await db.collection('bookings').deleteMany({ businessId, startAt: { $lt: now - RETENTION.bookingsDays * DAY_MS } });
  const messages = await db.collection('messages').deleteMany({ businessId, at: { $lt: now - RETENTION.messagesDays * DAY_MS } });
  // Plan 619: stored files whose `deleteAfter` has passed (voice recordings; an invoice file never saved). The provider asset goes first.
  let files = 0;
  const dueFiles = await db.collection('storedFiles').find({ businessId, deleteAfter: { $lt: now } }).limit(50).toArray();
  for (const file of dueFiles) {
    if (await deleteStoredFile(file)) files += 1;
  }
  const counts = { requests: requests.deletedCount, bookings: bookings.deletedCount, messages: messages.deletedCount, files };
  if (counts.requests > 0 || counts.bookings > 0 || counts.messages > 0 || counts.files > 0) logger.info({ event: 'retention.purged', ...counts });
  return counts;
}

module.exports = { RETENTION, purgeRetained, resetRetentionThrottle };
