'use strict'
/** Plan 424: creates a user's business — the only place a `businesses` document is written at runtime. */

const mongoose = require('mongoose')
const { newId } = require('../utils/id')
const User = require('../models/user.model')
const { businessSchema, EVENT_STAGES } = require('../generated/schemas/entities')
const { getMasterVersion } = require('./master-version')
const { MASTER_BUSINESS_ID } = require('../utils/business-scope')
const { mayLearnFrom } = require('../utils/ai-learning')
const { deleteStoredFile } = require('./file-store')

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

/**
 * Plan 618 (C-LEARN): the platform admin marks a business private (or shared again). Turning private on deletes the
 * business's promoted copies in the shared examples pool; turning it off restores nothing.
 */
async function setAiPrivate(id, value) {
  const aiPrivate = value === true
  const result = await col().updateOne({ _id: String(id) }, { $set: { aiPrivate } })
  let removed = 0
  if (result.matchedCount && aiPrivate) {
    const del = await mongoose.connection.db.collection('GEMINI_SHOTS')
      .deleteMany({ businessId: MASTER_BUSINESS_ID, 'promotedFrom.businessId': String(id) })
    removed = del.deletedCount
    await require('./invoice-memory').forgetBusiness(mongoose.connection.db, String(id))
  }
  return { matchedCount: result.matchedCount, aiPrivate, removed }
}

/**
 * Plan 619 (C-LEARN): removes the server-only records of a business that is being deleted. `business` is the
 * `businesses` document read before the delete. Always: its stored files, price history, own name memory and access
 * grants. Not private: the shared supplier brain and promoted examples stay, drafts are reduced to numbers.
 * Private: promoted copies and drafts go too. Returns counts; never logs content.
 */
async function deleteBusinessServerData(db, business, log) {
  const businessId = String(business._id)
  const files = await db.collection('storedFiles').find({ businessId }).toArray()
  let filesLeft = 0
  for (const file of files) {
    if (!(await deleteStoredFile(file))) filesLeft += 1
  }
  const counts = { files: files.length, filesLeft }
  for (const name of ['storedFiles', 'priceHistory', 'invoiceAliases', 'businessAccess']) {
    counts[name] = (await db.collection(name).deleteMany({ businessId })).deletedCount
  }
  if (filesLeft > 0) log?.warn?.({ event: 'business.delete.files_left', businessId, count: filesLeft })
  if (mayLearnFrom(business)) {
    const stripped = await db.collection('aiDrafts')
      .updateMany({ businessId }, { $unset: { input: '', aiDraft: '', saved: '', userId: '', subject: '' } })
    counts.draftsStripped = stripped.modifiedCount
  } else {
    counts.promoted = (await db.collection('GEMINI_SHOTS')
      .deleteMany({ businessId: MASTER_BUSINESS_ID, 'promotedFrom.businessId': businessId })).deletedCount
    counts.drafts = (await db.collection('aiDrafts').deleteMany({ businessId })).deletedCount
    await require('./invoice-memory').forgetBusiness(db, businessId)
  }
  return counts
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

module.exports = { deleteBusinessServerData, setAiPrivate,setHiddenLogisticsKeys, setStaffVisibleStages, setBusinessName, setBusinessSettings, setBusinessBaseline, createBusinessFor, ensureBusinessForUser, defaultBusinessName, getBusiness, setBusinessSyncedVersion }
