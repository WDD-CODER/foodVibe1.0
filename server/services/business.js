'use strict'
/** Plan 424: creates a user's business — the only place a `businesses` document is written at runtime. */

const mongoose = require('mongoose')
const { newId } = require('../utils/id')
const User = require('../models/user.model')
const { businessSchema } = require('../generated/schemas/entities')
const { getMasterVersion } = require('./master-version')

const col = () => mongoose.connection.db.collection('businesses')

/** Creates the business for `user` and makes them its owner. Returns the business document. */
async function createBusinessFor(user, { name, now = Date.now(), masterVersion } = {}) {
  const doc = businessSchema.parse({
    _id: newId(),
    name: name ?? `העסק של ${user.name}`,
    ownerId: String(user._id),
    createdAt: now,
    internal: false,
    lastSyncedMasterVersion: masterVersion ?? await getMasterVersion()
  })
  await col().insertOne(doc)
  const set = { businessId: doc._id, businessRole: 'owner' }
  if (!user.createdAt) set.createdAt = now
  await User.updateOne({ _id: user._id }, { $set: set })
  Object.assign(user, set)
  return doc
}

/** Returns the user's business id, creating the business first when they have none. */
async function ensureBusinessForUser(user) {
  if (user.businessId) return user.businessId
  return (await createBusinessFor(user, { name: `העסק של ${user.name}` }))._id
}

module.exports = { createBusinessFor, ensureBusinessForUser }
