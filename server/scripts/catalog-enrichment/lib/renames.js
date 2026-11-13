'use strict'
/**
 * Plan 583 stages B and C: show a product's (new) name on its business copies and on every recipe and dish line that
 * uses it. User-edited copies (`_userModified: true`) keep their name.
 */

const { normalizeProductName } = require('../../../utils/price-list-import')

/**
 * For each `{ id, name }`, its ids (the master and every business copy), the copies that still carry another name,
 * and how many recipe/dish lines still show another name.
 */
async function renameWork(db, targets) {
  const out = { byProduct: [], clones: [], lines: 0 }
  for (const l of targets) {
    const copies = await db.collection('products').find({ _masterId: l.id }).project({ nameHebrew: 1, _userModified: 1 }).toArray()
    const ids = [l.id, ...copies.map(c => c._id)]
    for (const c of copies) if (c._userModified !== true && c.nameHebrew !== l.name) out.clones.push({ _id: c._id, name: l.name })
    for (const col of ['recipes', 'dishes']) {
      const docs = await db.collection(col).find({ 'ingredients.referenceId': { $in: ids } }).project({ ingredients: 1 }).toArray()
      for (const d of docs) out.lines += d.ingredients.filter(x => ids.includes(x.referenceId) && x.nameSnapshot !== l.name).length
    }
    out.byProduct.push({ ids, name: l.name })
  }
  return out
}

async function writeRenames(db, work) {
  for (const c of work.clones) {
    await db.collection('products').updateOne({ _id: c._id }, { $set: { nameHebrew: c.name, nameHebrewNormalized: normalizeProductName(c.name) } })
  }
  for (const r of work.byProduct) {
    for (const col of ['recipes', 'dishes']) {
      await db.collection(col).updateMany(
        { ingredients: { $elemMatch: { referenceId: { $in: r.ids }, nameSnapshot: { $ne: r.name } } } },
        { $set: { 'ingredients.$[line].nameSnapshot': r.name } },
        { arrayFilters: [{ 'line.referenceId': { $in: r.ids } }] }
      )
    }
  }
}

module.exports = { renameWork, writeRenames }
