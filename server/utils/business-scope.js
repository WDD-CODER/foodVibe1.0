'use strict'
/**
 * Plan 424 (contract C-SCOPE): the one place that knows how an item is scoped to a business.
 * Plan 424 only wires `stampNew`; plan 425 switches reads/writes to `scopeFilter` / `readScope`.
 */

const MASTER_BUSINESS_ID = '__master__'
const TAXONOMY = 'taxonomyTerms'

/** Filter that keeps a query inside the caller's business. Anonymous callers see only the master catalog. */
function scopeFilter(req) {
  if (!req.user) return { businessId: MASTER_BUSINESS_ID }
  if (!req.user.businessId) throw new Error('NO_BUSINESS_IN_TOKEN')
  return { businessId: req.user.businessId }
}

/** Read filter: taxonomy terms are the master's plus the business's own; everything else is the business only. */
function readScope(req, type) {
  if (type === TAXONOMY && req.user) {
    const filter = scopeFilter(req)
    return { businessId: { $in: [filter.businessId, MASTER_BUSINESS_ID] } }
  }
  return scopeFilter(req)
}

/** Returns `doc` with the business, the creator and a numeric `createdAt` stamped on it. */
function stampNew(req, doc) {
  return {
    ...doc,
    ...(req.user?.businessId && { businessId: req.user.businessId }),
    createdBy: req.user.userId,
    createdAt: typeof doc.createdAt === 'number' ? doc.createdAt : Date.now()
  }
}

module.exports = { MASTER_BUSINESS_ID, scopeFilter, readScope, stampNew }
