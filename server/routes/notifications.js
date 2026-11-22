'use strict'
/**
 * Plan 646 (C-NOTIFY): GET /api/v1/notifications?limit=50 -> { rows, unread }; POST /:id/read; POST /read-all.
 * Every query is scoped to `req.user.userId`; an alert of a business other than the user's home business is shown only
 * while his consultant grant there is live. Log lines carry counts and ids only.
 */
const { Router } = require('express')
const mongoose = require('mongoose')
const { verifyToken } = require('../middleware/auth')

const router = Router()
const col = name => mongoose.connection.db.collection(name)

/** The business ids whose alerts this user may read: home + live grants. */
async function readableBusinesses(req) {
  const home = req.user.homeBusinessId ?? req.user.businessId
  const live = await col('businessAccess').find({ userId: String(req.user.userId), revokedAt: null }, { projection: { businessId: 1 } }).toArray()
  return [...new Set([home, ...live.map(g => g.businessId)].filter(Boolean))]
}

router.get('/', verifyToken, async (req, res) => {
  try {
    const raw = req.query.limit
    const limit = raw === undefined ? 50 : (typeof raw === 'string' && /^\d+$/.test(raw) ? Number(raw) : NaN)
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) return res.status(400).json({ error: 'BAD_LIMIT' })
    const userId = String(req.user.userId)
    const scope = { userId, businessId: { $in: await readableBusinesses(req) } }
    const [rows, unread] = await Promise.all([
      col('notifications').find(scope).sort({ createdAt: -1, _id: -1 }).limit(limit).toArray(),
      col('notifications').countDocuments({ ...scope, readAt: { $exists: false } }),
    ])
    const ids = [...new Set(rows.map(row => row.businessId))]
    const found = ids.length ? await col('businesses').find({ _id: { $in: ids } }, { projection: { name: 1 } }).toArray() : []
    const names = new Map(found.map(b => [b._id, b.name ?? '']))
    res.json({ rows: rows.map(row => ({ ...row, businessName: names.get(row.businessId) ?? '' })), unread })
  } catch (err) {
    req.log.error({ err, event: 'notifications.list.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/read-all', verifyToken, async (req, res) => {
  try {
    const result = await col('notifications').updateMany({ userId: String(req.user.userId), readAt: { $exists: false } }, { $set: { readAt: Date.now() } })
    res.json({ marked: result.modifiedCount })
  } catch (err) {
    req.log.error({ err, event: 'notifications.read_all.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/:id/read', verifyToken, async (req, res) => {
  try {
    const result = await col('notifications').updateOne({ _id: String(req.params.id), userId: String(req.user.userId) }, { $set: { readAt: Date.now() } })
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Not found' })
    res.json({ ok: true })
  } catch (err) {
    req.log.error({ err, event: 'notifications.read.failed', id: req.params.id })
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
