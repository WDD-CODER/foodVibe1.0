'use strict'
/**
 * Plan 543 (contract C-GUEST, ADR 0030): the public door for people who are not members of a business.
 *
 * Rules for every route added here (plan 555 and later):
 * - No member token is read here. This file never loads the auth middleware and never reads the signed-in user.
 * - The business is resolved by the server from the URL slug (slug -> `frontDeskProfiles`), never from the body.
 * - A guest write stamps `createdBy` with `guestActor('form')` from `server/utils/actor.js` and the resolved `businessId`.
 * - Every write route carries `publicLimiter` (server/middleware/rate-limit.js), `honeypot`
 *   (server/middleware/honeypot.js) and its own input schema, in the plan that adds it.
 * - A guest reads back only what its own token names (`newPublicToken` / `isPublicTokenShape`,
 *   server/utils/public-token.js). The token is a bearer secret and is never logged.
 * - Guest text is stored as plain text and never rendered as HTML.
 */
const { Router } = require('express')

const router = Router()

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

router.get('/health', (_req, res) => res.json({ ok: true }))

// Any other method or path under /api/v1/public answers JSON 404 (never 401, never the SPA's HTML).
router.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }))

module.exports = router
