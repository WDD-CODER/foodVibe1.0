'use strict'
/**
 * Plan 583 A1: measure the master catalog as it is (read-only). Writes `<work>/inventory.json` and prints a summary.
 *
 *   node server/scripts/catalog-enrichment/inventory.js --target=local
 */

const { normalizeProductName } = require('../../utils/price-list-import')
const { parseArgs, connectLocal, workPath, writeJson, readJson, runMain } = require('./lib/work-dir')
const { masterProducts, masterSuppliers, masterTermKeys, productLineUsage, usageWithClones } = require('./lib/catalog-data')

async function main() {
  const args = parseArgs(process.argv)
  const { client, db } = await connectLocal(args.target)
  try {
    const products = await masterProducts(db)
    const ids = new Set(products.map(p => p._id))
    const groups = new Map()
    for (const p of products) {
      const key = normalizeProductName(p.nameHebrew)
      groups.set(key, [...(groups.get(key) ?? []), p._id])
    }
    const { resolving } = await productLineUsage(db, ids)
    const usage = await usageWithClones(db, ids)
    const baseUnits = {}
    for (const p of products) baseUnits[p.baseUnit] = (baseUnits[p.baseUnit] ?? 0) + 1

    const file = workPath('inventory.json')
    // The resolving-line baseline of criterion 7 is the first measurement; later runs keep it.
    const first = readJson(file, null)
    const inventory = {
      measuredAt: new Date().toISOString(),
      masterProducts: products.length,
      masterSuppliers: (await masterSuppliers(db)).length,
      noPositivePrice: products.filter(p => !(p.sources ?? []).some(s => s.price > 0)).length,
      noAllergens: products.filter(p => !(p.allergens ?? []).length).length,
      duplicateNameGroups: [...groups.entries()].filter(([, v]) => v.length > 1).map(([name, v]) => ({ name, ids: v })),
      numberSuffixNames: products.filter(p => / \d+$/.test(String(p.nameHebrew).trim())).map(p => ({ id: p._id, name: p.nameHebrew })),
      resolvingProductLines: resolving,
      resolvingProductLinesBaseline: first?.resolvingProductLinesBaseline ?? resolving,
      baseUnits,
      allergenKeys: await masterTermKeys(db, 'allergen'),
      categoryKeys: await masterTermKeys(db, 'ingredientCategory'),
      usage: Object.fromEntries(products.map(p => [p._id, usage.get(p._id) ?? 0]))
    }
    writeJson(file, inventory)
    console.log(`master products: ${inventory.masterProducts}`)
    console.log(`master suppliers: ${inventory.masterSuppliers}`)
    console.log(`no positive price: ${inventory.noPositivePrice}`)
    console.log(`no allergens: ${inventory.noAllergens}`)
    console.log(`exact-name duplicate groups: ${inventory.duplicateNameGroups.length}`)
    console.log(`names ending in a number: ${inventory.numberSuffixNames.length}`)
    console.log(`resolving product lines: ${resolving} (baseline ${inventory.resolvingProductLinesBaseline})`)
    console.log(`base units: ${JSON.stringify(baseUnits)}`)
    console.log(`allergen keys: ${inventory.allergenKeys.join(', ')}`)
    console.log(`category keys: ${inventory.categoryKeys.join(', ')}`)
    console.log(`products used in a recipe or dish: ${[...usage.values()].filter(n => n > 0).length}`)
    console.log(`written: ${file}`)
  } finally {
    await client.close()
  }
}

runMain(main)
