'use strict'
/**
 * Plan 430 (C-USAGE): one `usageDays` document per user per Israel day, written after the response is sent.
 * Called from `attachUser` once the token is verified; anonymous and business-less tokens are never recorded.
 */
const mongoose = require('mongoose')
const { logger } = require('../logger')
const { SYSTEM_TYPES } = require('../utils/permissions')

const READ_THROTTLE_MS = 60 * 1000
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/** Calls that are bookkeeping, AI quota or platform admin rather than kitchen data: never counted as writes. */
const NOT_BUSINESS_WRITE_PREFIXES = [
  '/api/v1/auth',
  '/api/v1/log',
  '/api/v1/ai',
  '/api/v1/admin',
  ...SYSTEM_TYPES.map(t => `/api/v1/data/${t}`),
]

const dateFormat_ = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit',
})

const lastUpdate_ = new Map()

/** Israel calendar date `YYYY-MM-DD` for an epoch-ms instant. */
function jerusalemDate(ms) {
  return dateFormat_.format(ms)
}

function isCountedWrite(req) {
  if (!WRITE_METHODS.has(req.method)) return false
  const url = req.originalUrl || ''
  return !NOT_BUSINESS_WRITE_PREFIXES.some(prefix => url === prefix || url.startsWith(prefix + '/') || url.startsWith(prefix + '?'))
}

async function writeUsage(userId, businessId, write) {
  const now = Date.now()
  const date = jerusalemDate(now)
  await mongoose.connection.db.collection('usageDays').updateOne(
    { _id: `${userId}:${date}` },
    {
      $setOnInsert: { userId, businessId, date, firstAt: now },
      $set: { lastAt: now },
      $inc: { writeCount: write ? 1 : 0 },
    },
    { upsert: true }
  )
}

/** Fire-and-forget: registers a `finish` listener, so the response is never delayed and errors never reach the caller. */
function recordUsage(req, res) {
  const userId = req.user?.userId
  const businessId = req.user?.businessId
  if (!userId || !businessId) return
  res.once('finish', () => {
    try {
      const write = isCountedWrite(req) && res.statusCode < 400
      const last = lastUpdate_.get(userId)
      if (!write && last !== undefined && Date.now() - last < READ_THROTTLE_MS) return
      lastUpdate_.set(userId, Date.now())
      writeUsage(userId, businessId, write).catch(err => {
        logger.warn({ err, event: 'usage.record.failed' })
      })
    } catch (err) {
      logger.warn({ err, event: 'usage.record.failed' })
    }
  })
}

/** Tests only. */
function _resetUsageThrottle() {
  lastUpdate_.clear()
}

module.exports = { recordUsage, jerusalemDate, isCountedWrite, NOT_BUSINESS_WRITE_PREFIXES, _resetUsageThrottle }
