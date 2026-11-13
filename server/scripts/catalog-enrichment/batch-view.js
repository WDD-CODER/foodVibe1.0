'use strict'
/**
 * Plan 583 A6/A7: write the judgment sheets — the candidates of a range of products as short text, one file per
 * batch of 40, for the person (or agent) deciding the matches. No database.
 *
 *   node server/scripts/catalog-enrichment/batch-view.js --from=0 --to=50 [--size=40] [--prefix=pilot] [--source=candidates-rescue.json]
 *
 * Writes `<work>/sheets/<prefix>-<nnn>.txt`. Each candidate has a number; an answer names the numbers it accepts.
 */

const { workPath, readJson, runMain } = require('./lib/work-dir')
const fs = require('node:fs')
const path = require('node:path')

const arg = (name, fallback) => {
  const a = process.argv.find(x => x.startsWith(`--${name}=`))
  return a ? a.slice(name.length + 3) : fallback
}

const scaleLabel = { gram: 'per kg', ml: 'per liter', kg: 'per kg', liter: 'per liter', unit: 'per unit' }
const shown = (ppb, baseUnit) => ppb === null ? 'SIZE DOES NOT FIT BASE UNIT' : (baseUnit === 'gram' || baseUnit === 'ml' ? ppb * 1000 : ppb).toFixed(2)

function sheet(products) {
  const lines = []
  for (const p of products) {
    lines.push(`### ${p.id} | ${p.name} | base ${p.baseUnit} | categories ${p.categories.join(',') || '-'} | allergens now ${p.allergens.join(',') || '-'} | used ${p.usage}`)
    for (const [chain, cands] of Object.entries(p.chains)) {
      if (!cands.length) { lines.push(`  ${chain}: (none)`); continue }
      cands.forEach((c, i) => {
        lines.push(`  ${chain} ${i + 1}: ${c.name} | ${c.maker || '-'} | ${c.size} | shelf ${c.shelf} | ${shown(c.ppb, p.baseUnit)}${c.ppb === null ? '' : ' ' + scaleLabel[p.baseUnit]}`)
      })
    }
  }
  return lines.join('\n') + '\n'
}

async function main() {
  const from = Number(arg('from', 0))
  const to = Number(arg('to', from + 40))
  const size = Number(arg('size', 40))
  const prefix = arg('prefix', 'batch')
  const { products } = readJson(workPath(arg('source', 'candidates.json')))
  const dir = workPath('sheets')
  fs.mkdirSync(dir, { recursive: true })
  for (let start = from; start < Math.min(to, products.length); start += size) {
    const part = products.slice(start, Math.min(start + size, to))
    const file = path.join(dir, `${prefix}-${String(start).padStart(4, '0')}.txt`)
    fs.writeFileSync(file, sheet(part), 'utf8')
    console.log(`${file} (${part.length} products)`)
  }
}

runMain(main)
