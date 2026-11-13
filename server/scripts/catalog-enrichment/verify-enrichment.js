'use strict'
/**
 * Plan 583 A10: one command that says whether the master catalog is in the state the plan promises. Read-only.
 * Exit 0 with a last line `CATALOG_ENRICHMENT: PASS`, or exit 1 with one line per failed check.
 *
 *   node server/scripts/catalog-enrichment/verify-enrichment.js --target=local
 */

const fs = require('node:fs')
const { parseArgs, connectLocal, workPath, readJson, runMain } = require('./lib/work-dir')
const { masterProducts, masterSuppliers, masterTermKeys, productLineUsage } = require('./lib/catalog-data')
const { normalizeProductName } = require('../../utils/price-list-import')
const { parseV2 } = require('../../utils/schema-check')
const { inBand, perKgLiterOrUnit } = require('./lib/pricing')
const { MAX_RATIO, RESCUE_MIN_CHAINS } = require('./lib/decide')

const MIN_AGREEMENT = 0.9

/** Pure: every check over plain data → failure lines (empty when all pass). */
function checkCatalog({ products, suppliers, allergenKeys, ledger, resolving, baseline, audits, reportExists, staleLines = 0, unconvertible = [] }) {
  const fails = []
  const add = (n, msg) => fails.push(`check ${n} failed: ${msg}`)
  const entries = new Map((ledger?.products ?? []).map(l => [l.id, l]))

  // 1. every product in the ledger
  const missing = products.filter(p => !entries.has(p._id))
  const badState = products.filter(p => {
    const l = entries.get(p._id)
    return l && !(l.state === 'priced' || l.state === 'zeroCost' || (l.state === 'unresolved' && String(l.reason ?? '').trim()))
  })
  if (!ledger) add(1, 'ledger.json is missing')
  else if (missing.length || badState.length) add(1, `${missing.length} product(s) missing from the ledger, ${badState.length} without a valid state or reason (e.g. ${[...missing, ...badState].slice(0, 3).map(p => p._id).join(', ')})`)

  // 2. priced products: 3+ distinct real chain suppliers, positive prices (2+ for a product renamed in stage B,
  //    Human 2026-11-12)
  const liveSupplierIds = new Set(suppliers.map(s => s._id))
  const planSuppliers = new Set(Object.values(ledger?.suppliers ?? {}))
  const pricedIds = new Set([...entries.values()].filter(l => l.state === 'priced').map(l => l.id))
  const priced = products.filter(p => pricedIds.has(p._id))
  const bad2 = priced.filter(p => {
    const s = p.sources ?? []
    const ids = new Set(s.map(x => x.supplierId))
    // Stage C (Dan 2026-11-12): single-chain prices, re-matches and unit switches need 1 chain; a section 7 price derived
    // from a raw product keeps that product's supplier.
    const e = entries.get(p._id)
    const min = e?.stageC ? 1 : e?.renamed ? RESCUE_MIN_CHAINS : 3
    return s.length < min || ids.size !== s.length || s.some(x => !(x.price > 0) || (!e?.derived && !planSuppliers.has(x.supplierId)) || !liveSupplierIds.has(x.supplierId))
  })
  if (bad2.length) add(2, `${bad2.length} priced product(s) without enough distinct positive chain sources (3, or 2 when renamed) (e.g. ${bad2.slice(0, 3).map(p => p._id).join(', ')})`)

  // 3. spread and plausibility
  const bad3 = priced.filter(p => {
    const v = (p.sources ?? []).map(s => s.price).filter(x => x > 0)
    if (!v.length) return true
    // Dan's keep-every-chain products skip the spread rule; the plausibility band still holds.
    const e = entries.get(p._id)
    const spread = e?.keepAllChains || e?.farChains?.length ? false : Math.max(...v) / Math.min(...v) > MAX_RATIO
    return spread || v.some(x => !inBand(perKgLiterOrUnit(x, p.baseUnit), p.baseUnit))
  })
  if (bad3.length) add(3, `${bad3.length} priced product(s) with prices more than ${MAX_RATIO}x apart or outside the band (e.g. ${bad3.slice(0, 3).map(p => p._id).join(', ')})`)

  // 4. schema
  const bad4 = [
    ...products.filter(p => !parseV2('products', p).success).map(p => `products/${p._id}`),
    ...suppliers.filter(s => !parseV2('suppliers', s).success).map(s => `suppliers/${s._id}`)
  ]
  if (bad4.length) add(4, `${bad4.length} master document(s) fail parseV2 (e.g. ${bad4.slice(0, 3).join(', ')})`)

  // 5. allergen keys
  const keys = new Set(allergenKeys)
  const bad5 = products.filter(p => (p.allergens ?? []).some(a => !keys.has(a)))
  if (bad5.length) add(5, `${bad5.length} product(s) carry an allergen that is not a master allergen term (e.g. ${bad5.slice(0, 3).map(p => p._id).join(', ')})`)

  // 6. unique names
  const seen = new Map()
  const dupes = []
  for (const p of products) {
    const k = normalizeProductName(p.nameHebrew)
    if (seen.has(k)) dupes.push(`${seen.get(k)}/${p._id}`)
    else seen.set(k, p._id)
  }
  if (dupes.length) add(6, `${dupes.length} duplicate name(s) (e.g. ${dupes.slice(0, 3).join(', ')})`)

  // 7. recipe and dish lines still resolve
  if (!(resolving >= baseline)) add(7, `resolving product lines ${resolving} < baseline ${baseline}`)

  // 8. audits
  const renamedCount = [...entries.values()].filter(l => l.renamed).length
  const stageCCount = [...entries.values()].filter(l => l.stageC && (l.unitSwitched || !l.singleChain || l.renamed)).length
  for (const kind of ['pilot', 'final', ...(renamedCount ? ['rescue'] : []), ...(stageCCount ? ['stage-c'] : [])]) {
    const a = audits[kind]
    if (!a || typeof a.agreement !== 'number') add(8, `audit-${kind}.json is missing or not scored`)
    else if (a.agreement < MIN_AGREEMENT) add(8, `audit-${kind} agreement ${(a.agreement * 100).toFixed(1)}% < 90%`)
  }

  // 9. report
  if (!reportExists) add(9, 'REPORT.md is missing')

  // 11. every recipe and dish line of a unit-switched product still converts to its base unit
  if (unconvertible.length) add(11, `${unconvertible.length} line unit(s) of unit-switched products do not convert (e.g. ${unconvertible.slice(0, 3).join(', ')})`)

  // 10. every recipe and dish line that uses a renamed product shows its new name
  if (staleLines > 0) add(10, `${staleLines} recipe/dish line(s) still show a renamed product's old name`)
  return fails
}

/** Lines (master or business copy references) that still show another name than the renamed product's. */
async function staleRenamedLines(db, renamed) {
  let stale = 0
  for (const l of renamed) {
    const copies = await db.collection('products').find({ _masterId: l.id }).project({ _id: 1 }).toArray()
    const ids = [l.id, ...copies.map(c => c._id)]
    for (const col of ['recipes', 'dishes']) {
      const docs = await db.collection(col).find({ 'ingredients.referenceId': { $in: ids } }).project({ ingredients: 1 }).toArray()
      for (const d of docs) stale += d.ingredients.filter(x => ids.includes(x.referenceId) && x.nameSnapshot !== l.name).length
    }
  }
  return stale
}

/** Lines of unit-switched products whose unit is neither the base unit, a purchase option, nor the same family. */
async function unconvertibleLines(db, products, ledgerNow) {
  const family = u => (['gram', 'kg'].includes(u) ? 'mass' : ['ml', 'liter'].includes(u) ? 'volume' : u)
  const out = []
  for (const l of ledgerNow.products.filter(x => x.unitSwitched)) {
    const p = products.find(x => x._id === l.id)
    if (!p) continue
    const ok = new Set([p.baseUnit, ...(p.purchaseOptions ?? []).map(o => o.unitSymbol)])
    const copies = await db.collection('products').find({ _masterId: l.id }).project({ _id: 1 }).toArray()
    const ids = [l.id, ...copies.map(c => c._id)]
    const seen = new Set()
    for (const col of ['recipes', 'dishes']) {
      const docs = await db.collection(col).find({ 'ingredients.referenceId': { $in: ids } }).project({ ingredients: 1 }).toArray()
      for (const d of docs) for (const x of d.ingredients) {
        if (!ids.includes(x.referenceId) || ok.has(x.unit) || family(x.unit) === family(p.baseUnit)) continue
        seen.add(x.unit)
      }
    }
    for (const u of seen) out.push(`${l.id}:${u}`)
  }
  return out
}

async function main() {
  const args = parseArgs(process.argv)
  const { client, db } = await connectLocal(args.target)
  let data
  try {
    const products = await masterProducts(db)
    const { resolving } = await productLineUsage(db, new Set(products.map(p => p._id)))
    // Renamed products show their new name; a product renamed earlier and reverted shows its current name again.
    const ledgerNow = readJson(workPath('ledger.json'), { products: [] })
    const nameNow = new Map(products.map(p => [p._id, p.nameHebrew]))
    const renamedIds = new Set(ledgerNow.products.filter(l => l.renamed).map(l => l.id))
    const renamed = [
      ...ledgerNow.products.filter(l => l.renamed),
      ...(ledgerNow.renamedEver ?? []).filter(id => !renamedIds.has(id) && nameNow.has(id)).map(id => ({ id, name: nameNow.get(id) }))
    ]
    data = {
      products, suppliers: await masterSuppliers(db), allergenKeys: await masterTermKeys(db, 'allergen'), resolving,
      staleLines: await staleRenamedLines(db, renamed),
      unconvertible: await unconvertibleLines(db, products, ledgerNow)
    }
  } finally {
    await client.close()
  }
  const inventory = readJson(workPath('inventory.json'))
  const fails = checkCatalog({
    ...data,
    ledger: readJson(workPath('ledger.json'), null),
    baseline: inventory.resolvingProductLinesBaseline,
    audits: {
      pilot: readJson(workPath('audit-pilot.json'), null), final: readJson(workPath('audit-final.json'), null),
      rescue: readJson(workPath('audit-rescue.json'), null),
      'stage-c': readJson(workPath('audit-stage-c.json'), null)
    },
    reportExists: fs.existsSync(workPath('REPORT.md'))
  })
  const ledger = readJson(workPath('ledger.json'), { products: [] })
  const priced = ledger.products.filter(l => l.state === 'priced').length
  console.log(`master products: ${data.products.length}; priced: ${priced}; unresolved: ${ledger.products.length - priced}; resolving lines: ${data.resolving}`)
  for (const f of fails) console.log(f)
  if (fails.length) {
    console.log(`CATALOG_ENRICHMENT: FAIL (${fails.length} check(s))`)
    process.exit(1)
  }
  console.log('CATALOG_ENRICHMENT: PASS (11 checks)')
}

if (require.main === module) runMain(main)

module.exports = { checkCatalog }
