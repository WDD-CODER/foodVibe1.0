'use strict'
/**
 * Plan 616 (C-MODULES): the one place that says whether a business has a part of the product.
 * Runs after verifyToken (never a second one: it would count usage twice); it only refuses, never grants.
 */
const { getBusiness } = require('../services/business')
const { modulesOf, MODULE_OF_TYPE } = require('../generated/schemas/modules')
const { verifyAccessToken } = require('./auth')

const CACHE_MS = 30000
const cache = new Map()

/** The modules a business has; a business without a document (or without a stored list) gets the defaults. Cached 30 s. */
async function businessModules(businessId) {
  const key = String(businessId)
  const hit = cache.get(key)
  if (hit && hit.until > Date.now()) return hit.modules
  const modules = modulesOf(await getBusiness(key))
  cache.set(key, { modules, until: Date.now() + CACHE_MS })
  return modules
}

/** One business's entry, or every entry when called with nothing. */
function clearModuleCache(businessId) {
  if (businessId === undefined) cache.clear()
  else cache.delete(String(businessId))
}

/** Answers 403 MODULE_OFF unless the business has any one of the keys; returns true when the caller may go on. */
async function allow(req, res, businessId, keys) {
  try {
    const have = await businessModules(businessId)
    if (keys.some(k => have.includes(k))) return true
    req.log?.info({ event: 'module.off', module: keys[0] })
    res.status(403).json({ error: 'MODULE_OFF', module: keys[0] })
    return false
  } catch (err) {
    req.log?.error({ err, event: 'module.check.failed' })
    res.status(500).json({ error: 'Server error' })
    return false
  }
}

const listOf = key => (Array.isArray(key) ? key : [key])

/** Middleware (after verifyToken): any one of the keys is enough. */
function requireModule(key) {
  const keys = listOf(key)
  return async (req, res, next) => {
    if (await allow(req, res, req.user.businessId, keys)) next()
  }
}

/** The same test on the consultant's own (home) business (C-ACCESS). */
function requireHomeModule(key) {
  const keys = listOf(key)
  return async (req, res, next) => {
    if (await allow(req, res, req.user.homeBusinessId ?? req.user.businessId, keys)) next()
  }
}

/** Generic router: gates by `:type`. No token or a bad one falls through to the route's own answer. */
async function requireModuleForType(req, res, next) {
  const keys = MODULE_OF_TYPE[req.params.type]
  if (!keys) return next()
  const payload = verifyAccessToken(req)
  if (!payload || !payload.businessId) return next()
  if (await allow(req, res, payload.businessId, [...keys])) next()
}

module.exports = { businessModules, clearModuleCache, requireModule, requireHomeModule, requireModuleForType }
