const { Router } = require('express')
const mongoose = require('mongoose')
const { verifyToken, requirePlatformAdmin } = require('../middleware/auth')
const User = require('../models/user.model')
const { ALL_USER_ENTITY_TYPES } = require('../constants/all-user-entity-types')

const router = Router()

function col(type) {
  return mongoose.connection.db.collection(type)
}

router.get('/users', verifyToken, requirePlatformAdmin, async (req, res) => {
  try {
    const users = await User.find(
      { _id: { $ne: '__master__' } },
      '_id name email role businessId businessRole isPlatformAdmin'
    ).lean()
    const businessIds = [...new Set(users.map(u => u.businessId).filter(Boolean))]
    const businesses = businessIds.length
      ? await col('businesses').find({ _id: { $in: businessIds } }, { projection: { name: 1 } }).toArray()
      : []
    const nameById = new Map(businesses.map(b => [b._id, b.name]))
    res.json(users.map(u => ({
      ...u,
      businessId: u.businessId ?? null,
      businessRole: u.businessRole ?? null,
      isPlatformAdmin: u.isPlatformAdmin === true,
      businessName: nameById.get(u.businessId) ?? null,
    })))
  } catch (err) {
    req.log.error({ err, event: 'admin.users_list.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

// Deleting an owner deletes the whole business (its data, its users, the business); a staff user only themselves.
router.delete('/users/:userId', verifyToken, requirePlatformAdmin, async (req, res) => {
  const { userId } = req.params
  try {
    const target = await User.findById(userId).lean()
    if (!target) return res.status(404).json({ error: 'User not found' })
    if (userId === req.user.userId) {
      return res.status(403).json({ error: 'Cannot delete your own account' })
    }
    if (target.businessId && target.businessId === req.user.businessId) {
      return res.status(403).json({ error: 'Cannot delete your own business' })
    }
    const wholeBusiness = Boolean(target.businessId) && target.businessRole !== 'staff'
    let usersDeleted = 1
    if (wholeBusiness) {
      const { businessId } = target
      await Promise.all(ALL_USER_ENTITY_TYPES.map(t => col(t).deleteMany({ businessId })))
      usersDeleted = (await User.deleteMany({ businessId })).deletedCount
      await col('businesses').deleteOne({ _id: businessId })
    } else {
      // A staff user's items stay with the business. A user that never got a business owns docs by userId only.
      if (!target.businessId) await Promise.all(ALL_USER_ENTITY_TYPES.map(t => col(t).deleteMany({ userId })))
      await User.deleteOne({ _id: userId })
    }
    res.json({ ok: true, deletedBusiness: wholeBusiness, usersDeleted })
  } catch (err) {
    req.log.error({ err, event: 'admin.users_delete.failed' })
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
