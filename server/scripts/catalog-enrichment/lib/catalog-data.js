'use strict'
/**
 * Plan 583: read-only queries over the master catalog shared by inventory, candidates, apply and verify.
 */

const { MASTER } = require('./work-dir')

const live = { businessId: MASTER, deletedAt: { $exists: false } }

async function masterProducts(db) {
  return db.collection('products').find(live).toArray()
}

async function masterSuppliers(db) {
  return db.collection('suppliers').find(live).toArray()
}

async function masterTermKeys(db, kind) {
  const terms = await db.collection('taxonomyTerms').find({ ...live, kind }).project({ key: 1 }).toArray()
  return terms.map(t => t.key).filter(k => typeof k === 'string')
}

/**
 * Product ingredient lines across every recipe and dish: per referenced id, the number of lines, and the number of
 * lines whose reference is one of `masterIds` (criterion 7).
 */
async function productLineUsage(db, masterIds) {
  const usage = new Map()
  let resolving = 0
  for (const col of ['recipes', 'dishes']) {
    const cursor = db.collection(col).find({ deletedAt: { $exists: false } }).project({ ingredients: 1 })
    for await (const doc of cursor) {
      for (const line of Array.isArray(doc.ingredients) ? doc.ingredients : []) {
        if (line?.type !== 'product' || typeof line.referenceId !== 'string') continue
        if (!masterIds.has(line.referenceId)) continue
        resolving++
        usage.set(line.referenceId, (usage.get(line.referenceId) ?? 0) + 1)
      }
    }
  }
  return { usage, resolving }
}

/**
 * Lines that use a master product through a business's clone count for that master product too: a clone's `_masterId`
 * maps back to it. Returns master id → total lines (direct + through clones).
 */
async function usageWithClones(db, masterIds) {
  const cloneToMaster = new Map()
  const clones = db.collection('products').find({ _masterId: { $in: [...masterIds] } }).project({ _masterId: 1 })
  for await (const c of clones) cloneToMaster.set(c._id, c._masterId)
  const total = new Map()
  for (const col of ['recipes', 'dishes']) {
    const cursor = db.collection(col).find({ deletedAt: { $exists: false } }).project({ ingredients: 1 })
    for await (const doc of cursor) {
      for (const line of Array.isArray(doc.ingredients) ? doc.ingredients : []) {
        if (line?.type !== 'product' || typeof line.referenceId !== 'string') continue
        const id = masterIds.has(line.referenceId) ? line.referenceId : cloneToMaster.get(line.referenceId)
        if (id) total.set(id, (total.get(id) ?? 0) + 1)
      }
    }
  }
  return total
}

module.exports = { live, masterProducts, masterSuppliers, masterTermKeys, productLineUsage, usageWithClones }
