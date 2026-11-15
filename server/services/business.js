'use strict'
/** Plan 424: creates a user's business — the only place a `businesses` document is written at runtime. */

const mongoose = require('mongoose')
const { newId } = require('../utils/id')
const User = require('../models/user.model')
const { businessSchema, EVENT_STAGES } = require('../generated/schemas/entities')
const { getMasterVersion } = require('./master-version')
const { MASTER_BUSINESS_ID } = require('../utils/business-scope')

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

/** Plan 472: renames the business (already validated by the route). Returns the update result. */
async function setBusinessName(id, name) {
  return col().updateOne({ _id: String(id) }, { $set: { name } })
}

/** Plan 431: replaces the business's opening baseline (already validated by the route). */
async function setBusinessBaseline(id, baseline) {
  return col().updateOne({ _id: String(id) }, { $set: { baseline } })
}

/** Plan 477: stores the stages staff may see (already validated by the route), de-duplicated, in pipeline order. */
async function setStaffVisibleStages(id, stages) {
  const staffVisibleStages = EVENT_STAGES.filter(stage => stages.includes(stage))
  const result = await col().updateOne({ _id: String(id) }, { $set: { staffVisibleStages } })
  return { matchedCount: result.matchedCount, staffVisibleStages }
}

/** Plan 600: sets the owner's consent to share AI examples; turning it off also deletes this business's shared copies. */
async function setShareAiExamples(id, share) {
  const result = await col().updateOne({ _id: String(id) }, { $set: { shareAiExamples: share } })
  let removed = 0
  if (result.matchedCount && !share) {
    const del = await mongoose.connection.db.collection('GEMINI_SHOTS')
      .deleteMany({ businessId: MASTER_BUSINESS_ID, 'promotedFrom.businessId': String(id) })
    removed = del.deletedCount
  }
  return { matchedCount: result.matchedCount, shareAiExamples: share, removed }
}

/** Plan 579: replaces the business's hidden logistics keys; a key already listed keeps its `at`, a new one gets now. */
async function setHiddenLogisticsKeys(id, keys, now = Date.now()) {
  const business = await col().findOne({ _id: String(id) }, { projection: { hiddenLogisticsKeys: 1 } })
  if (!business) return { matchedCount: 0, hiddenLogisticsKeys: [] }
  const old = new Map((business.hiddenLogisticsKeys ?? []).map(e => [e.key, e.at]))
  const hiddenLogisticsKeys = [...new Set(keys.map(k => k.trim()).filter(Boolean))].map(key => ({ key, at: old.get(key) ?? now }))
  const result = await col().updateOne({ _id: String(id) }, { $set: { hiddenLogisticsKeys } })
  return { matchedCount: result.matchedCount, hiddenLogisticsKeys }
}

module.exports = { setShareAiExamples, setHiddenLogisticsKeys, setStaffVisibleStages, setBusinessName, setBusinessSettings, setBusinessBaseline, createBusinessFor, ensureBusinessForUser, defaultBusinessName, getBusiness, setBusinessSyncedVersion }
