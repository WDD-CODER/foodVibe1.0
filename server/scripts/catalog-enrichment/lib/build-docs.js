'use strict'
/**
 * Plan 583 A8: decisions → the master supplier documents and the changed master product documents (pure).
 */

const { MASTER } = require('./work-dir')
const { normalizeProductName } = require('../../../utils/price-list-import')

const ADDED_BY = 'catalog-enrichment-583'

/** Stable id for a chain supplier this plan creates: the same chain always gets the same id. */
const supplierIdFor = chain => `chain-${chain}`

function supplierDoc(chain, chainNameHebrew, now) {
  return {
    _id: supplierIdFor(chain), schemaVersion: 2, userId: MASTER, businessId: MASTER, createdBy: MASTER,
    createdAt: now, updatedAt: now, nameHebrew: chainNameHebrew, deliveryDays: [], minOrderMov: 0, leadTimeDays: 0
  }
}

/**
 * @param {{ chains: Array<{ chain, chainNameHebrew }>, decisions: Array }} merged decisions.json
 * @param {{ products: Array, suppliers: Array }} current master documents
 * @returns {{ suppliers: { create: Array, reuse: Record<string, string> }, products: Array<{ before, after }> ,
 *   ledger: Array }}
 */
function buildDocs(merged, current, now) {
  const chainName = new Map(merged.chains.map(c => [c.chain, c.chainNameHebrew]))
  const existingByName = new Map(current.suppliers.map(s => [normalizeProductName(s.nameHebrew), s]))
  const priced = merged.decisions.filter(d => d.outcome === 'priced')
  const usedChains = [...new Set(priced.flatMap(d => d.chains.map(c => c.chain)))].sort()
  const supplierOf = {}
  const create = []
  for (const chain of usedChains) {
    const name = chainName.get(chain) ?? chain
    const existing = existingByName.get(normalizeProductName(name))
    if (existing) supplierOf[chain] = existing._id
    else {
      const doc = supplierDoc(chain, name, now)
      supplierOf[chain] = doc._id
      create.push(doc)
    }
  }
  const productsById = new Map(current.products.map(p => [p._id, p]))
  const products = []
  const ledger = []
  for (const d of merged.decisions) {
    const before = productsById.get(d.id)
    if (!before) continue
    if (d.outcome !== 'priced') {
      ledger.push({ id: d.id, name: d.name, state: 'unresolved', reason: d.reason })
      continue
    }
    const sources = d.chains.map(c => ({ supplierId: supplierOf[c.chain], price: c.price, addedBy: ADDED_BY, addedAt: now }))
    const allergens = [...new Set(d.allergens.map(a => a.key))].sort()
    const after = { ...before, sources, allergens, allergenSource: 'llm', updatedAt: now }
    if (sameContent(before, after)) after.updatedAt = before.updatedAt
    products.push({ before, after })
    ledger.push({
      id: d.id, name: d.name, state: 'priced', vatExempt: d.vatExempt,
      oldSources: before.sources ?? [], newSources: sources,
      oldAllergens: before.allergens ?? [], newAllergens: allergens,
      chains: d.chains.map(c => ({ chain: c.chain, codes: c.codes, price: c.price })),
      ...(d.far?.length ? { farChains: d.far } : {})
    })
  }
  // Products without any answer are unresolved too: the ledger names every master product.
  const decided = new Set(merged.decisions.map(d => d.id))
  for (const p of current.products) {
    if (!decided.has(p._id)) ledger.push({ id: p._id, name: p.nameHebrew, state: 'unresolved', reason: 'not judged' })
  }
  return { suppliers: { create, reuse: supplierOf }, products, ledger }
}

/**
 * Stage B (Human 2026-11-12): fold `rescue-decisions.json` into a buildDocs result. A `renamed` product gets its new
 * name, its chain sources and allergens and becomes `priced` + `renamed: true` in the ledger; a `manual` one stays
 * unresolved with a "hand fix" reason. Mutates and returns `built`.
 */
function applyRescue(built, rescue, current, now) {
  const byId = new Map(current.products.map(p => [p._id, p]))
  const ledger = new Map(built.ledger.map(l => [l.id, l]))
  for (const d of rescue.decisions) {
    const before = byId.get(d.id)
    const entry = ledger.get(d.id)
    if (!before || !entry || entry.state === 'priced') continue
    if (d.outcome === 'manual') {
      entry.reason = `hand fix: ${d.reason}`
      continue
    }
    if (d.outcome !== 'renamed') continue
    const sources = d.chains.map(c => {
      const supplierId = built.suppliers.reuse[c.chain]
      if (!supplierId) throw new Error(`no supplier for chain ${c.chain}`)
      return { supplierId, price: c.price, addedBy: ADDED_BY, addedAt: now }
    })
    const allergens = [...new Set(d.allergens.map(a => a.key))].sort()
    const after = {
      ...before, nameHebrew: d.newName, nameHebrewNormalized: normalizeProductName(d.newName), sources, allergens,
      allergenSource: 'llm', updatedAt: now
    }
    if (sameContent(before, after)) after.updatedAt = before.updatedAt
    built.products.push({ before, after })
    ledger.set(d.id, {
      id: d.id, name: d.newName, oldName: before.nameHebrew, state: 'priced', renamed: true, vatExempt: d.vatExempt,
      oldSources: before.sources ?? [], newSources: sources, oldAllergens: before.allergens ?? [], newAllergens: allergens,
      chains: d.chains.map(c => ({ chain: c.chain, codes: c.codes, price: c.price })),
      ...(d.far?.length ? { farChains: d.far } : {})
    })
  }
  built.ledger = [...ledger.values()]
  return built
}

/** Equal ignoring `updatedAt` and the `addedAt` of sources (a re-run must report 0 changes). */
function sameContent(a, b) {
  const strip = d => JSON.stringify({
    ...d, updatedAt: 0, sources: (d.sources ?? []).map(s => ({ supplierId: s.supplierId, price: s.price, addedBy: s.addedBy }))
  })
  return strip(a) === strip(b)
}

module.exports = { buildDocs, applyRescue, sameContent, supplierIdFor, ADDED_BY }
