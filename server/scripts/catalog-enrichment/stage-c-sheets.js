'use strict'
/**
 * Plan 583 C2: the judgment sheets for the sections that need one — 1 (unit switch), 2 (name taken) and 10
 * (re-match) — written to `<work>/sheets/stage-c-<section>.txt` from `<work>/worklist.json`. No database.
 *
 *   node server/scripts/catalog-enrichment/stage-c-sheets.js
 */

const fs = require('node:fs')
const { workPath, readJson, runMain } = require('./lib/work-dir')
const { normalizeProductName } = require('../../utils/price-list-import')

async function main() {
  const { rows } = readJson(workPath('worklist.json'))
  const all = readJson(workPath('candidates.json')).products
  const ledger = readJson(workPath('ledger.json'))
  const state = new Map(ledger.products.map(l => [l.id, l]))
  const byName = new Map()
  for (const p of all) {
    const l = state.get(p.id)
    byName.set(normalizeProductName(l?.renamed ? l.name : p.name), { ...p, name: l?.renamed ? l.name : p.name, state: l?.state })
  }
  const units = u => Object.entries(u).map(([k, n]) => `${k}×${n}`).join(', ') || '-'
  const item = (it, i) => `    ${i + 1}. [${it.chain}] code ${it.code} | ${it.name} | ${it.maker || '-'} | pack ${it.size} | shelf ${it.shelf} ₪`
  for (const section of [1, 2, 10]) {
    const L = []
    for (const r of rows.filter(x => x.section === section)) {
      L.push(`### ${r.n} | ${r.id} | ${r.name} | base unit now ${r.baseUnit} | recipe lines by unit: ${units(r.lineUnits)} | why: ${r.reason}`)
      if (section === 1) L.push(`  suggested switch: ${r.switchTo}`)
      if (section === 2) {
        const taken = (/"([^"]+)" is already/.exec(r.reason) ?? [])[1]
        const other = taken ? byName.get(normalizeProductName(taken)) : null
        L.push(other
          ? `  existing product with that name: ${other.id} | ${other.name} | base unit ${other.baseUnit} | ${other.state ?? 'unresolved'}`
          : '  existing product with that name: (not found)')
      }
      r.items.forEach((it, i) => L.push(item(it, i)))
    }
    const file = workPath('sheets', `stage-c-${section}.txt`)
    fs.writeFileSync(file, L.join('\n') + '\n', 'utf8')
    console.log(`${file}: ${rows.filter(x => x.section === section).length} rows`)
  }
}

runMain(main)
