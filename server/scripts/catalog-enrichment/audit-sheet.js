'use strict'
/**
 * Plan 583 A6/A9: the sheet a fresh-context auditor reads — per decided `priced` product only its name, base unit,
 * and the accepted item names and prices per chain. Nothing about how they were chosen. No database.
 *
 *   node server/scripts/catalog-enrichment/audit-sheet.js --kind=pilot --ids-from=sheets/pilot-0000.txt
 *   node server/scripts/catalog-enrichment/audit-sheet.js --kind=final --sample=100
 *
 * Writes `<work>/audit-<kind>-sheet.txt`. The auditor writes `<work>/audit-<kind>.json`:
 *   [{ "id": "...", "verdict": "agree" | "disagree", "why": "..." }]
 * `--score` reads that file back, prints the agreement and records it in the same file.
 */

const fs = require('node:fs')
const crypto = require('node:crypto')
const { workPath, readJson, writeJson, runMain } = require('./lib/work-dir')
const { perKgLiterOrUnit } = require('./lib/pricing')

const arg = (name, fallback) => {
  const a = process.argv.find(x => x.startsWith(`--${name}=`))
  return a ? a.slice(name.length + 3) : fallback
}
const scaleLabel = { gram: 'per kg', ml: 'per liter', kg: 'per kg', liter: 'per liter', unit: 'per unit' }

/** Deterministic sample: the products whose id hashes lowest. */
const sampleOf = (decisions, n) => [...decisions]
  .sort((a, b) => crypto.createHash('sha1').update(a.id).digest('hex').localeCompare(crypto.createHash('sha1').update(b.id).digest('hex')))
  .slice(0, n)

async function main() {
  const kind = arg('kind', 'pilot')
  const auditFile = workPath(`audit-${kind}.json`)
  // Stage B: the rescue audit reads the renamed products and shows old → new name.
  const { decisions } = readJson(workPath(kind === 'rescue' ? 'rescue-decisions.json' : 'decisions.json'))
  const priced = decisions.filter(d => d.outcome === (kind === 'rescue' ? 'renamed' : 'priced'))
  if (process.argv.includes('--score')) {
    const audit = readJson(auditFile)
    const rows = Array.isArray(audit) ? audit : audit.rows
    const agree = rows.filter(r => r.verdict === 'agree').length
    const agreement = rows.length ? agree / rows.length : 0
    writeJson(auditFile, { kind, scoredAt: new Date().toISOString(), audited: rows.length, agree, agreement, rows })
    console.log(`audit ${kind}: ${agree}/${rows.length} agree = ${(agreement * 100).toFixed(1)}%`)
    for (const r of rows.filter(x => x.verdict !== 'agree')) console.log(`  disagree ${r.id}: ${r.why ?? ''}`)
    return
  }
  let chosen
  const idsFrom = arg('ids-from', null)
  if (idsFrom) {
    const ids = new Set([...fs.readFileSync(workPath(idsFrom), 'utf8').matchAll(/^### (\S+)/gm)].map(m => m[1]))
    chosen = priced.filter(d => ids.has(d.id))
  } else {
    chosen = sampleOf(priced, Number(arg('sample', 100)))
  }
  const lines = []
  for (const d of chosen) {
    const title = d.newName ? `${d.name} → renamed to: ${d.newName}` : d.name
    lines.push(`### ${d.id} | ${title} | base ${d.baseUnit}${d.vatExempt ? ' | fresh produce: VAT-exempt in Israel, so the shelf price is already the price without VAT' : ''}`)
    for (const c of d.chains) {
      lines.push(`  ${c.chain}: ${perKgLiterOrUnit(c.price, d.baseUnit).toFixed(2)} ILS ${scaleLabel[d.baseUnit]} (no VAT) ← ${c.names.join(' ; ')}`)
    }
  }
  const file = workPath(`audit-${kind}-sheet.txt`)
  fs.writeFileSync(file, lines.join('\n') + '\n', 'utf8')
  console.log(`${file}: ${chosen.length} products`)
}

runMain(main)
