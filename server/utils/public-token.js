'use strict'
/**
 * Plan 543 (C-GUEST): the read-back token a guest gets for its own request or booking.
 * 24 random bytes, base64url = 32 characters. It is a bearer secret: never log it.
 */
const crypto = require('node:crypto')

const TOKEN_SHAPE = /^[A-Za-z0-9_-]{32}$/

/** A new unguessable token (32 base64url characters). */
function newPublicToken() {
  return crypto.randomBytes(24).toString('base64url')
}

/** True when `s` has a token's shape; lets a token route answer 404 before any database read. */
function isPublicTokenShape(s) {
  return typeof s === 'string' && TOKEN_SHAPE.test(s)
}

module.exports = { newPublicToken, isPublicTokenShape }
