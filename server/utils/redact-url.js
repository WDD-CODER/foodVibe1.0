'use strict'
/**
 * Plan 555: masks a guest's read-back token in a URL before it is logged.
 * `/api/v1/public/<slug>/requests/<token>[/cancel]` and `/book/<slug>/r/<token>` become `…/:token`.
 * The token is a bearer secret (C-GUEST); the rest of the URL is kept so the log stays useful.
 */
const PATTERNS = [
  /(\/api\/v1\/public\/[^/?#]+\/requests\/)[^/?#]+/,
  /(\/book\/[^/?#]+\/r\/)[^/?#]+/,
]

/** @param {unknown} url */
function redactUrl(url) {
  if (typeof url !== 'string') return url
  return PATTERNS.reduce((acc, re) => acc.replace(re, '$1:token'), url)
}

module.exports = { redactUrl }
