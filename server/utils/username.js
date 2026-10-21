'use strict'
/** Plan 428: the one username rule (sign-up and team management): trimmed, 3-20 chars, letters, digits, `_` and `-`. */

const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/

/** True when `name` is a string that passes the username rule. */
function isValidUsername(name) {
  if (typeof name !== 'string') return false
  const trimmed = name.trim()
  return trimmed.length >= 3 && trimmed.length <= 20 && USERNAME_REGEX.test(trimmed)
}

const PBKDF2_FORMAT = /^[0-9a-f]{32}:[0-9a-f]{64}$/

/** True when `value` is a client-hashed password in `salt:hash` hex form. */
function isValidPasswordHash(value) {
  return typeof value === 'string' && PBKDF2_FORMAT.test(value)
}

module.exports = { isValidUsername, isValidPasswordHash }
