'use strict'
/**
 * Plan 631 (C-ACCESS, ADR 0032): the one place that decides which business a session is in.
 * A user has one home business (`users.businessId`); he may also hold live grants (`businessAccess`) into other
 * businesses, and the platform admin may enter any business. `resolveSession` picks the active one; `stillActing`
 * re-checks an acting token on every request. The grant routes (`server/routes/access.js`) hold no query of their own.
 * `businessAccess` is server-only: never cloned, synced or reachable through the generic API.
 */

const mongoose = require('mongoose')
const User = require('../models/user.model')
const { getBusiness } = require('./business')
const { MASTER_BUSINESS_ID } = require('../utils/business-scope')

const grants = () => mongoose.connection.db.collection('businessAccess')
const businesses = () => mongoose.connection.db.collection('businesses')

/** A live grant has no `revokedAt`; `revokedAt: null` matches an absent value and uses the unique index. */
const LIVE_GRANT = { revokedAt: null }

let actingChecks = 0

/** The live `businessAccess` row of this user in this business, or null. */
async function liveGrant(userId, businessId) {
  if (!userId || !businessId) return null
  return grants().findOne({ userId: String(userId), businessId: String(businessId), ...LIVE_GRANT })
}

const homeOf = user => ({ businessId: user.businessId ?? null, businessRole: user.businessRole ?? null })

async function clearActive(user) {
  await User.updateOne({ _id: user._id }, { $set: { activeBusinessId: null } })
  user.activeBusinessId = null
}

/**
 * Where a session of `user` is: `{ businessId, businessRole, acting? }`.
 * (1) no active business, or it is home → home, no read; (2) the business does not exist → home;
 * (3) a live grant → consultant; (4) a platform admin → owner, `acting: 'platform'`; (5) anything else → home.
 * Cases (2) and (5) also clear the stored `activeBusinessId`.
 */
async function resolveSession(user) {
  const active = user.activeBusinessId
  if (!active || active === user.businessId) return homeOf(user)
  if (active === MASTER_BUSINESS_ID || !(await getBusiness(active))) {
    await clearActive(user)
    return homeOf(user)
  }
  if (await liveGrant(user._id, active)) return { businessId: active, businessRole: 'consultant', acting: 'consultant' }
  if (user.isPlatformAdmin === true) return { businessId: active, businessRole: 'owner', acting: 'platform' }
  await clearActive(user)
  return homeOf(user)
}

/** How `user` may enter `businessId`: `'consultant'`, `'platform'` or null. Writes nothing. */
async function canEnter(user, businessId) {
  if (!businessId || businessId === MASTER_BUSINESS_ID) return null
  if (!(await getBusiness(businessId))) return null
  if (await liveGrant(user._id, businessId)) return 'consultant'
  if (user.isPlatformAdmin === true) return 'platform'
  return null
}

/** True while an acting token may still act: one indexed read. A home token never reaches here. */
async function stillActing(payload) {
  actingChecks += 1
  if (payload?.acting === 'consultant') return !!(await liveGrant(payload.userId, payload.businessId))
  if (payload?.acting === 'platform') {
    const user = await User.findById(String(payload.userId), { isPlatformAdmin: 1, removedAt: 1 }).lean()
    return !!user && user.isPlatformAdmin === true && !user.removedAt
  }
  return false
}

/** The businesses `userId` may enter, home first, then live grants by name: `[{ businessId, name, role }]`. */
async function listEnterable(userId, { homeBusinessId, homeRole } = {}) {
  const rows = []
  const home = homeBusinessId ? await getBusiness(homeBusinessId) : null
  if (home) rows.push({ businessId: home._id, name: home.name ?? '', role: homeRole ?? null })
  const live = await grants().find({ userId: String(userId), ...LIVE_GRANT }, { projection: { businessId: 1 } }).toArray()
  const ids = live.map(g => g.businessId).filter(id => id !== homeBusinessId)
  if (!ids.length) return rows
  const found = await businesses().find({ _id: { $in: ids } }, { projection: { name: 1 } }).toArray()
  const granted = found
    .map(b => ({ businessId: b._id, name: b.name ?? '', role: 'consultant' }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return [...rows, ...granted]
}

/** Inserts a new live grant row (no `revokedAt`). The caller checked the row's schema. */
async function createGrant(row) {
  await grants().insertOne(row)
  return row
}

/** The live grant with this id, or null. */
async function liveGrantById(id) {
  return grants().findOne({ _id: String(id), ...LIVE_GRANT })
}

/** Ends a live grant; true when one was ended. */
async function removeGrant(id, revokedBy, now = Date.now()) {
  const res = await grants().updateOne({ _id: String(id), ...LIVE_GRANT }, { $set: { revokedAt: now, revokedBy: String(revokedBy) } })
  return res.modifiedCount === 1
}

/** The live grants of a business, newest first, with the user's name: `[{ _id, name, grantedAt }]`. */
async function grantsOfBusiness(businessId) {
  const live = await grants().find({ businessId: String(businessId), ...LIVE_GRANT }).sort({ grantedAt: -1 }).toArray()
  if (!live.length) return []
  const users = await User.find({ _id: { $in: live.map(g => g.userId) } }, { name: 1, removedName: 1 }).lean()
  const byId = new Map(users.map(u => [String(u._id), u]))
  return live
    .filter(g => byId.has(g.userId))
    .map(g => {
      const u = byId.get(g.userId)
      return { _id: g._id, name: u.removedName ?? u.name, grantedAt: g.grantedAt }
    })
}

/** Tests only: how many acting re-checks ran. */
function _actingChecksForTests() {
  return actingChecks
}

/** Tests only. */
function _resetActingChecksForTests() {
  actingChecks = 0
}

module.exports = {
  liveGrant, resolveSession, canEnter, stillActing, listEnterable,
  createGrant, liveGrantById, removeGrant, grantsOfBusiness,
  _actingChecksForTests, _resetActingChecksForTests,
}
