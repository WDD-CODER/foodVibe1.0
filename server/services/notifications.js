'use strict'
/**
 * Plan 646 (C-NOTIFY): in-app alerts. `createPriceChangeAlerts` writes one alert per recipient per row whose price moved
 * by at least the business threshold (up or down); recipients are the owner and every live consultant grant of that
 * business (staff get none: prices are the owner's). A failure is logged and never fails the caller. Each user keeps
 * at most `KEEP_PER_USER` alerts. Logs carry counts and ids only.
 */

const { newId } = require('../utils/id')
const { notificationSchema, BUSINESS_SETTINGS_DEFAULTS } = require('../generated/schemas/entities')
const logger = require('../logger')

const KEEP_PER_USER = 200

/**
 * @param {import('mongodb').Db} db
 * @param {{ _id: string, ownerId?: string, settings?: object }} business
 * @param {{ productId: string, productName: string, supplierName: string, from: number, to: number, changePct?: number }[]} rows
 * @returns {Promise<number>} how many alerts were written
 */
async function createPriceChangeAlerts(db, business, rows, log = logger) {
  try {
    if (!business?._id || !rows?.length) return 0
    const threshold = { ...BUSINESS_SETTINGS_DEFAULTS, ...(business.settings ?? {}) }.priceRiseAlertPct
    const big = rows.filter(row => typeof row.changePct === 'number' && Math.abs(row.changePct) >= threshold)
    if (!big.length) return 0
    const grants = await db.collection('businessAccess').find({ businessId: business._id, revokedAt: null }, { projection: { userId: 1 } }).toArray()
    const recipients = [...new Set([business.ownerId, ...grants.map(g => g.userId)].filter(Boolean).map(String))]
    if (!recipients.length) return 0
    const now = Date.now()
    const docs = []
    for (const row of big) {
      for (const userId of recipients) {
        const doc = {
          _id: newId(), businessId: business._id, userId, kind: 'price_change', productId: row.productId,
          productName: row.productName, supplierName: row.supplierName, from: row.from, to: row.to,
          changePct: row.changePct, createdAt: now,
        }
        if (notificationSchema.safeParse(doc).success) docs.push(doc)
      }
    }
    if (!docs.length) return 0
    await db.collection('notifications').insertMany(docs, { ordered: false })
    for (const userId of recipients) await trimOld(db, userId)
    return docs.length
  } catch (err) {
    log.error({ err, event: 'notifications.write_failed', businessId: business?._id, rows: rows?.length })
    return 0
  }
}

/** Drops a user's oldest alerts beyond `KEEP_PER_USER`. */
async function trimOld(db, userId) {
  const old = await db.collection('notifications').find({ userId }, { projection: { _id: 1 } })
    .sort({ createdAt: -1, _id: -1 }).skip(KEEP_PER_USER).toArray()
  if (old.length) await db.collection('notifications').deleteMany({ _id: { $in: old.map(d => d._id) } })
}

module.exports = { createPriceChangeAlerts, KEEP_PER_USER }
