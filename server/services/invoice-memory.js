'use strict'
/**
 * Plan 627 (C-ALIAS): the invoice name memory. Every approved invoice teaches two memories:
 *  - the business's own (`invoiceAliases` with a `productId`): the name this supplier prints -> my product;
 *  - the shared one (`invoiceAliases` with `businessId: '__master__'` + `supplierProfiles`): the name -> the product of
 *    the shared catalog, only when the business may teach (`mayLearnFrom`).
 * Neither shared shape holds a price, a quantity, a date of purchase or a business identity outside `contributors`
 * (which no route returns). This file never requires `business.js` (that file requires this one).
 */
const { newId } = require('../utils/id')
const { normalizeProductName } = require('../utils/price-list-import')
const { MASTER_BUSINESS_ID } = require('../utils/business-scope')
const { LIVE } = require('../jobs/purge-deleted')
const { mayLearnFrom } = require('../utils/ai-learning')

const MAX_CONTRIBUTORS = 200
const MAX_NAMES = 10

/** Adds `value` to a list field once, never past `limit` entries (`<field>.<limit-1>` must not exist). */
const guardedAdd = (collection, filter, field, value, limit, now) => collection.updateOne(
  { ...filter, [field]: { $ne: value }, [`${field}.${limit - 1}`]: { $exists: false } },
  { $addToSet: { [field]: value }, $set: { lastAt: now } },
)

async function learnFromApply(db, business, { supplierKey, supplierName, vatIncluded, lines }) {
  if (!supplierKey) return { own: 0, shared: 0 }
  const byKey = new Map()
  for (const line of lines ?? []) {
    const nameKey = normalizeProductName(line?.printedName)
    if (!line?.productId || !nameKey) continue
    byKey.delete(nameKey) // the last line of a name wins
    byKey.set(nameKey, { ...line, nameKey })
  }
  if (byKey.size === 0) return { own: 0, shared: 0 }
  const businessId = String(business._id)
  const now = Date.now()
  const entries = [...byKey.values()]

  await db.collection('invoiceAliases').bulkWrite(entries.map(entry => {
    const set = { printedName: entry.printedName, productId: entry.productId, lastAt: now }
    const update = { $set: set, $inc: { hits: 1 }, $setOnInsert: { _id: newId() } }
    if (typeof entry.unit === 'string' && entry.unit) set.unit = entry.unit
    else update.$unset = { unit: '' }
    return { updateOne: { filter: { businessId, supplierKey, nameKey: entry.nameKey }, update, upsert: true } }
  }), { ordered: false })
  const result = { own: entries.length, shared: 0 }

  if (!mayLearnFrom(business)) return result

  const mine = await db.collection('products')
    .find({ _id: { $in: entries.map(e => e.productId) }, businessId, ...LIVE }, { projection: { _masterId: 1 } }).toArray()
  const masterOf = new Map(mine.filter(p => p._masterId && p._masterId !== p._id).map(p => [p._id, String(p._masterId)]))
  const masters = masterOf.size
    ? await db.collection('products')
      .find({ _id: { $in: [...new Set(masterOf.values())] }, businessId: MASTER_BUSINESS_ID, ...LIVE }, { projection: { _id: 1 } }).toArray()
    : []
  const liveMasters = new Set(masters.map(m => String(m._id)))
  const aliases = db.collection('invoiceAliases')
  for (const entry of entries) {
    const masterProductId = masterOf.get(entry.productId)
    if (!masterProductId || !liveMasters.has(masterProductId)) continue
    const key = { businessId: MASTER_BUSINESS_ID, supplierKey, nameKey: entry.nameKey, masterProductId }
    await aliases.updateOne(key, {
      $set: { printedName: entry.printedName, lastAt: now },
      $inc: { hits: 1 },
      $setOnInsert: { _id: newId(), contributors: [] },
    }, { upsert: true })
    await guardedAdd(aliases, key, 'contributors', businessId, MAX_CONTRIBUTORS, now)
    result.shared += 1
  }

  const profiles = db.collection('supplierProfiles')
  const inc = { invoices: 1 }
  const setOnInsert = { names: [], contributors: [] }
  if (vatIncluded === true) { inc.vatIncludedYes = 1; setOnInsert.vatIncludedNo = 0 }
  else if (vatIncluded === false) { inc.vatIncludedNo = 1; setOnInsert.vatIncludedYes = 0 }
  else { setOnInsert.vatIncludedYes = 0; setOnInsert.vatIncludedNo = 0 }
  await profiles.updateOne({ _id: supplierKey }, { $inc: inc, $set: { lastAt: now }, $setOnInsert: setOnInsert }, { upsert: true })
  await guardedAdd(profiles, { _id: supplierKey }, 'contributors', businessId, MAX_CONTRIBUTORS, now)
  const name = typeof supplierName === 'string' ? supplierName.trim().slice(0, 200) : ''
  if (name) await guardedAdd(profiles, { _id: supplierKey }, 'names', name, MAX_NAMES, now)
  return result
}

async function resolveNames(db, businessId, { supplierKey, names }) {
  const keyOf = names.map(name => normalizeProductName(name))
  const keys = [...new Set(keyOf.filter(Boolean))]
  if (!keys.length) return []
  const found = new Map() // nameKey -> { productId, source }

  const own = await db.collection('invoiceAliases').find({ businessId, supplierKey, nameKey: { $in: keys }, productId: { $exists: true } }).toArray()
  if (own.length) {
    const live = new Set((await db.collection('products')
      .find({ _id: { $in: own.map(a => a.productId) }, businessId, ...LIVE }, { projection: { _id: 1 } }).toArray()).map(p => p._id))
    for (const alias of own) if (live.has(alias.productId)) found.set(alias.nameKey, { productId: alias.productId, source: 'own' })
  }

  const open = keys.filter(k => !found.has(k))
  if (open.length) {
    const shared = await db.collection('invoiceAliases')
      .find({ businessId: MASTER_BUSINESS_ID, supplierKey, nameKey: { $in: open } }).toArray()
    const picked = new Map()
    for (const row of shared) {
      const best = picked.get(row.nameKey)
      const size = (row.contributors ?? []).length
      const bestSize = best ? (best.contributors ?? []).length : -1
      if (!best || size > bestSize || (size === bestSize && row.lastAt > best.lastAt)) picked.set(row.nameKey, row)
    }
    if (picked.size) {
      const copies = await db.collection('products')
        .find({ businessId, _masterId: { $in: [...new Set([...picked.values()].map(r => r.masterProductId))] }, ...LIVE }, { projection: { _id: 1, _masterId: 1 } })
        .sort({ _id: 1 }).toArray()
      const copyOf = new Map()
      for (const copy of copies) if (!copyOf.has(String(copy._masterId))) copyOf.set(String(copy._masterId), copy._id)
      for (const [nameKey, row] of picked) {
        const productId = copyOf.get(row.masterProductId)
        if (productId) found.set(nameKey, { productId, source: 'shared' })
      }
    }
  }

  const matches = []
  keyOf.forEach((key, i) => {
    const hit = key && found.get(key)
    if (hit) matches.push({ i, productId: hit.productId, source: hit.source })
  })
  return matches
}

/** Pulls a business out of every shared `contributors` list and deletes the rows left empty. Own aliases stay. */
async function forgetBusiness(db, businessId) {
  const id = String(businessId)
  const aliases = db.collection('invoiceAliases')
  const profiles = db.collection('supplierProfiles')
  const aliasesPulled = (await aliases.updateMany({ businessId: MASTER_BUSINESS_ID, contributors: id }, { $pull: { contributors: id } })).modifiedCount
  const aliasesDeleted = (await aliases.deleteMany({ businessId: MASTER_BUSINESS_ID, contributors: { $size: 0 } })).deletedCount
  const profilesPulled = (await profiles.updateMany({ contributors: id }, { $pull: { contributors: id } })).modifiedCount
  const profilesDeleted = (await profiles.deleteMany({ contributors: { $size: 0 } })).deletedCount
  return { aliasesPulled, aliasesDeleted, profilesPulled, profilesDeleted }
}

module.exports = { learnFromApply, resolveNames, forgetBusiness }
