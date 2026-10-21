'use strict'
/** Plan 424: creates a user's business — the only place a `businesses` document is written at runtime. */

const mongoose = require('mongoose')
const { newId } = require('../utils/id')
const User = require('../models/user.model')
const { businessSchema } = require('../generated/schemas/entities')
const { getMasterVersion } = require('./master-version')

const col = () => mongoose.connection.db.collection('businesses')

/** The default name of a user's business. */
const defaultBusinessName = name => `העסק של ${name}`

/** Creates the business for `user` and makes them its owner. Returns the business document. */
async function createBusinessFor(user, { name, now = Date.now(), masterVersion } = {}) {
  const doc = businessSchema.parse({
    _id: newId(),
    name: name ?? defaultBusinessName(user.name),
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
  // A business already owned by this user (a crashed or concurrent earlier call): adopt it, never add a second.
  const owned = await col().findOne({ ownerId: String(user._id) })
  if (owned) {
    const set = { businessId: owned._id, businessRole: 'owner' }
    if (!user.createdAt) set.createdAt = Date.now()
    await User.updateOne({ _id: user._id }, { $set: set })
    Object.assign(user, set)
    return owned._id
  }
  return (await createBusinessFor(user))._id
}

/** The `businesses` document, or null. */
async function getBusiness(id) {
  return id ? col().findOne({ _id: String(id) }) : null
}

/** Records the master version a business has been synced to (the refresh sync gate). */
async function setBusinessSyncedVersion(id, version) {
  await col().updateOne({ _id: String(id) }, { $set: { lastSyncedMasterVersion: version } })
}

/** Plan 429: replaces the business's settings (already validated by the route). Returns the update result. */
async function setBusinessSettings(id, settings) {
  return col().updateOne({ _id: String(id) }, { $set: { settings } })
}

/** Plan 431: replaces the business's opening baseline (already validated by the route). */
async function setBusinessBaseline(id, baseline) {
  return col().updateOne({ _id: String(id) }, { $set: { baseline } })
}

module.exports = { setBusinessSettings, setBusinessBaseline, createBusinessFor, ensureBusinessForUser, defaultBusinessName, getBusiness, setBusinessSyncedVersion }
