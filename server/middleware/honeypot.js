'use strict'
/**
 * Plan 543 (C-GUEST): the honeypot for public forms. The page renders a hidden `website` field that a
 * person never fills; a bot that fills it gets a silent 201 `{ ok: true }` and nothing is written.
 * The body is never logged.
 */
function honeypot(req, res, next) {
  const website = req.body?.website
  if (typeof website === 'string' && website.length > 0) {
    res.status(201).json({ ok: true })
    return
  }
  next()
}

module.exports = { honeypot }
