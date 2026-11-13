'use strict'
/**
 * Plan 583 A6/A7: turn the judgment answers (`<work>/answers/*.json`, candidate numbers per chain) into
 * `<work>/decisions.json` — per product the accepted item codes per chain, the chain price (median of its accepted
 * items, per base unit, without VAT), the allergens, and the outcome: `priced` (3+ chains within 2.5× and inside the
 * plausibility band) or `unresolved` with a reason. Re-running rebuilds the file from all answers. No database.
 *
 *   node server/scripts/catalog-enrichment/merge-decisions.js
 */

const fs = require('node:fs')
const { workPath, readJson, writeJson, runMain } = require('./lib/work-dir')
const { decideProduct } = require('./lib/decide')

async function main() {
  const { products, chains } = readJson(workPath('candidates.json'))
  const inventory = readJson(workPath('inventory.json'))
  const allowedAllergens = new Set(inventory.allergenKeys.filter(k => k !== 'new'))
  const byId = new Map(products.map(p => [p.id, p]))
  const dir = workPath('answers')
  const answers = new Map()
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter(x => x.endsWith('.json')).sort() : []) {
    for (const a of readJson(workPath('answers', f))) {
      // A later file (a re-match) overrides an earlier answer for the same product.
      if (byId.has(a.id)) answers.set(a.id, { ...a, file: f })
    }
  }
  const decisions = []
  for (const [id, a] of answers) decisions.push(decideProduct(byId.get(id), a, allowedAllergens))
  decisions.sort((x, y) => (byId.get(y.id).usage - byId.get(x.id).usage))
  writeJson(workPath('decisions.json'), { mergedAt: new Date().toISOString(), chains, decisions })
  const priced = decisions.filter(d => d.outcome === 'priced').length
  console.log(`answers: ${answers.size} of ${products.length}; priced: ${priced}; unresolved: ${decisions.length - priced}`)
}

runMain(main)
