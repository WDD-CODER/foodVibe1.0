'use strict'
/**
 * Plan 477 (ADR 0024, INV-1): the one rule that decides which events a staff member may read.
 * The owner picks the stages staff see (`businesses.staffVisibleStages`, absent = every stage). A staff member
 * reads an event when its stage is in that list (an event with no stage counts as `inquiry`) or when he created it.
 * Owners, platform-admin routes and every other item type are untouched.
 * The rule has two forms that must agree: a Mongo filter (lists, counts, by-id lookups) and an in-memory check.
 */

const { getBusiness } = require('../services/business')

const EVENTS = 'menuEvents'
const LEGACY_STAGE = 'inquiry'

/** The stages this caller may see, or null when no rule applies (no user, not staff, no business, no stored list). */
async function visibleStagesFor(req) {
  const user = req.user
  if (!user || user.businessRole !== 'staff' || !user.businessId) return null
  const business = await getBusiness(user.businessId)
  return Array.isArray(business?.staffVisibleStages) ? business.staffVisibleStages : null
}

/** Mongo filter for the rule; `{}` when `stages` is null. `stage: null` matches a missing (legacy) stage. */
function eventFilter(stages, userId) {
  if (!stages) return {}
  return {
    $or: [
      { stage: { $in: stages } },
      ...(stages.includes(LEGACY_STAGE) ? [{ stage: null }] : []),
      ...(userId ? [{ createdBy: userId }] : []),
    ],
  }
}

/** The same rule on one loaded event. */
function isEventVisible(stages, userId, event) {
  if (!stages) return true
  if (!event) return false
  if (userId && event.createdBy === userId) return true
  return stages.includes(event.stage ?? LEGACY_STAGE)
}

/** `filter` narrowed by the rule when `type` is menuEvents and the caller is staff with a stored list; else unchanged. */
async function withEventVisibility(req, type, filter) {
  if (type !== EVENTS) return filter
  const stages = await visibleStagesFor(req)
  if (!stages) return filter
  return { $and: [filter, eventFilter(stages, req.user.userId)] }
}

module.exports = { visibleStagesFor, eventFilter, isEventVisible, withEventVisibility }
