const { Router } = require('express')
const mongoose = require('mongoose')
const { verifyToken, requireAdmin } = require('../middleware/auth')
const User = require('../models/user.model')
const { ALL_USER_ENTITY_TYPES } = require('../constants/all-user-entity-types')

const router = Router()

function col(type) {
  return mongoose.connection.db.collection(type)
}

router.get('/users', verifyToken, requireAdmin, async (_req, res) => {
  try {
    const users = await User.find({ _id: { $ne: '__master__' } }, '_id name email role').lean()
    res.json(users)
  } catch (err) {
    console.error('[admin/users GET]', err)
    res.status(500).json({ error: 'Server error' })
  }
})

router.delete('/users/:userId', verifyToken, requireAdmin, async (req, res) => {
  const { userId } = req.params
  if (userId === req.user.userId) {
    return res.status(403).json({ error: 'Cannot delete your own account' })
  }
  try {
    await Promise.all(ALL_USER_ENTITY_TYPES.map(t => col(t).deleteMany({ userId })))
    await User.deleteOne({ _id: userId })
    res.json({ ok: true, collectionsCleared: ALL_USER_ENTITY_TYPES.length })
  } catch (err) {
    console.error('[admin/users DELETE]', err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
