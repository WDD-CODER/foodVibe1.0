'use strict'
/**
 * Plan 583 B2: turn the rescue answers (`<work>/rescue-answers/*.json`) into `<work>/rescue-decisions.json`:
 * per unresolved product `renamed` (new clean name, 2+ chain prices), `manual` (for MANUAL-FIX.md) or `unresolved`.
 * Two renamed products may not take the same new name; the less used one goes to `manual`. No database.
 *
 *   node server/scripts/catalog-enrichment/merge-rescue.js
 */

const fs = require('node:fs')
const { workPath, readJson, writeJson, runMain } = require('./lib/work-dir')
const { decideRescue } = require('./lib/decide')
const { normalizeProductName } = require('../../utils/price-list-import')

async function main() {
  const rescue = readJson(workPath('candidates-rescue.json'))
  const all = readJson(workPath('candidates.json')).products
  const inventory = readJson(workPath('inventory.json'))
  const allowed = new Set(inventory.allergenKeys.filter(k => k !== 'new'))
  const byId = new Map(rescue.products.map(p => [p.id, p]))
  const answers = new Map()
  const dir = workPath('rescue-answers')
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter(x => x.endsWith('.json')).sort() : []) {
    for (const a of readJson(workPath('rescue-answers', f))) if (byId.has(a.id)) answers.set(a.id, { ...a, file: f })
  }
  const decisions = []
  const claimed = new Map()
  const ordered = [...answers.values()].sort((a, b) => byId.get(b.id).usage - byId.get(a.id).usage)
  for (const a of ordered) {
    const p = byId.get(a.id)
    const taken = new Set(all.filter(x => x.id !== p.id).map(x => normalizeProductName(x.name)))
    for (const [name, id] of claimed) if (id !== p.id) taken.add(name)
    const d = decideRescue(p, a, allowed, taken, normalizeProductName)
    if (d.outcome === 'renamed') claimed.set(normalizeProductName(d.newName), p.id)
    decisions.push(d)
  }
  writeJson(workPath('rescue-decisions.json'), { mergedAt: new Date().toISOString(), chains: rescue.chains, decisions })
  const count = decisions.reduce((o, d) => ({ ...o, [d.outcome]: (o[d.outcome] ?? 0) + 1 }), {})
  console.log(`rescue answers: ${answers.size} of ${rescue.products.length}; ${JSON.stringify(count)}`)
}

runMain(main)
