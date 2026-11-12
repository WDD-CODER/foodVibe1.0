'use strict'
/**
 * Plan 583 A9: `<work>/REPORT.md` for the Human — totals, chains used, the biggest price changes, every allergen
 * removed, the unresolved list (most used first) and likely duplicates. Reads the work folder only.
 *
 *   node server/scripts/catalog-enrichment/report.js
 */

const fs = require('node:fs')
const { workPath, readJson, runMain } = require('./lib/work-dir')
const { perKgLiterOrUnit } = require('./lib/pricing')

const scale = { gram: '₪/kg', ml: '₪/l', kg: '₪/kg', liter: '₪/l', unit: '₪/unit' }
const cheapest = sources => {
  const v = (sources ?? []).map(s => s.price).filter(x => x > 0)
  return v.length ? Math.min(...v) : null
}
const money = (price, baseUnit) => price === null ? '—' : `${perKgLiterOrUnit(price, baseUnit).toFixed(2)} ${scale[baseUnit] ?? ''}`
const cell = s => String(s ?? '').replace(/\|/g, '/').replace(/\n/g, ' ')

async function main() {
  const ledger = readJson(workPath('ledger.json'))
  const inventory = readJson(workPath('inventory.json'))
  const { chains } = readJson(workPath('candidates.json'))
  const { decisions } = readJson(workPath('decisions.json'))
  const baseOf = new Map(decisions.map(d => [d.id, d.baseUnit]))
  // A unit-switched product (stage C) is shown in its new unit.
  for (const l of ledger.products) if (l.newBaseUnit) baseOf.set(l.id, l.newBaseUnit)
  const audits = ['pilot', 'final', 'rescue'].map(k => [k, readJson(workPath(`audit-${k}.json`), null)])
  const rows = ledger.products
  const priced = rows.filter(r => r.state === 'priced')
  const unresolved = rows.filter(r => r.state === 'unresolved')
  const usage = id => inventory.usage[id] ?? 0
  const totalLines = Object.values(inventory.usage).reduce((a, b) => a + b, 0)
  const pricedLines = priced.reduce((a, r) => a + usage(r.id), 0)
  const byReason = unresolved.reduce((o, r) => ({ ...o, [r.reason]: (o[r.reason] ?? 0) + 1 }), {})
  const topReasons = Object.entries(byReason).sort((a, b) => b[1] - a[1])

  const changes = priced.map(r => {
    const before = cheapest(r.oldSources)
    const after = cheapest(r.newSources)
    const ratio = before ? Math.max(after / before, before / after) : Infinity
    return { r, before, after, ratio }
  }).filter(c => c.before).sort((a, b) => b.ratio - a.ratio).slice(0, 30)

  const removed = priced.flatMap(r => r.oldAllergens.filter(a => !r.newAllergens.includes(a)).map(a => ({ r, a })))
  const byCode = new Map()
  for (const r of priced) for (const c of r.chains) for (const code of c.codes) {
    const key = `${c.chain}:${code}`
    byCode.set(key, [...(byCode.get(key) ?? []), r])
  }
  const sharedPairs = new Map()
  for (const list of byCode.values()) {
    if (list.length < 2) continue
    const key = list.map(r => r.id).sort().join(',')
    sharedPairs.set(key, list)
  }

  const L = []
  L.push('# Catalog enrichment — plan 583', '')
  L.push(`Written ${new Date().toISOString()} from the ledger of ${ledger.writtenAt}. Prices are per base unit without VAT (shown here per kg / liter / unit).`, '')
  L.push('## Totals', '')
  L.push(`- Master products: **${rows.length}**`)
  const renamed = priced.filter(r => r.renamed)
  L.push(`- Priced: **${priced.length}** (${priced.length - renamed.length} matched in 3+ chains, ${renamed.length} renamed to what 2+ chains sell)`)
  L.push(`- Unresolved (unchanged): **${unresolved.length}**`)
  for (const [reason, n] of topReasons.slice(0, 12)) L.push(`  - ${n} × ${cell(reason)}`)
  L.push(`- Recipe and dish product lines now on a priced product: **${pricedLines} of ${totalLines} (${totalLines ? (100 * pricedLines / totalLines).toFixed(1) : 0}%)**`)
  for (const [k, a] of audits) if (a) L.push(`- Audit ${k}: ${a.agree} of ${a.audited} agree (${(a.agreement * 100).toFixed(1)}%)`)
  L.push('', '## Chains used', '', '| Chain | Store | File date | Items |', '| --- | --- | --- | --- |')
  for (const c of chains) L.push(`| ${c.chainNameHebrew} (${c.chain}) | ${c.storeId} | ${c.fileDate} | ${c.items} |`)
  L.push('', `Suppliers: ${Object.entries(ledger.suppliers).map(([c, id]) => `${c} → ${id}`).join(', ')}; created by this run: ${ledger.createdSuppliers.join(', ') || 'none'}.`)
  L.push('', '## The 30 biggest price changes', '', '| Product | Before (cheapest) | After (cheapest) | × |', '| --- | --- | --- | --- |')
  for (const c of changes) L.push(`| ${cell(c.r.name)} | ${money(c.before, baseOf.get(c.r.id))} | ${money(c.after, baseOf.get(c.r.id))} | ${c.ratio.toFixed(1)} |`)
  L.push('', `## Renamed to what the chains sell (${renamed.length}) — Human 2026-11-12`, '')
  L.push('Same product, new clean name; every recipe and dish line that uses it shows the new name.', '')
  L.push('| Old name | New name | Chains | Cheapest | Used in lines |', '| --- | --- | --- | --- | --- |')
  for (const r of [...renamed].sort((a, b) => usage(b.id) - usage(a.id))) {
    L.push(`| ${cell(r.oldName)} | ${cell(r.name)} | ${r.chains.length} | ${money(cheapest(r.newSources), baseOf.get(r.id))} | ${usage(r.id)} |`)
  }
  // Dan 2026-11-12: every chain is kept; the ones far from the others are listed so a misread price can be removed.
  const farRows = priced.filter(r => r.farChains?.length)
  L.push('', `## Far-off chains kept as suppliers (${farRows.length}) — check these prices`, '')
  L.push('| Product | All chain prices (cheapest is used in recipes) | Far |', '| --- | --- | --- |')
  for (const r of farRows) {
    L.push(`| ${cell(r.name)} | ${r.chains.map(c => `${c.chain} ${money(c.price, baseOf.get(r.id) ?? 'unit')}`).join(' · ')} | ${r.farChains.join(', ')} |`)
  }
  L.push('', `## Allergens removed (${removed.length})`, '')
  if (!removed.length) L.push('None.')
  for (const { r, a } of removed) L.push(`- ${cell(r.name)} (${r.id}): **${a}** removed`)
  L.push('', `## Unresolved — most used first (${unresolved.length})`, '', '| Product | Used in lines | Reason |', '| --- | --- | --- |')
  for (const r of [...unresolved].sort((a, b) => usage(b.id) - usage(a.id))) L.push(`| ${cell(r.name)} (${r.id}) | ${usage(r.id)} | ${cell(r.reason)} |`)
  L.push('', '## Likely duplicates — for the Human to decide', '', '### Products that matched the same chain item', '')
  if (!sharedPairs.size) L.push('None.')
  for (const list of sharedPairs.values()) L.push(`- ${list.map(r => `${cell(r.name)} (${r.id})`).join(' · ')}`)
  L.push('', '### Names ending in a number (twins renamed by plan 379 / this run)', '')
  for (const n of inventory.numberSuffixNames) L.push(`- ${cell(n.name)} (${n.id})`)
  fs.writeFileSync(workPath('REPORT.md'), L.join('\n') + '\n', 'utf8')
  const manualCount = writeManualFix(usage)
  writeStageC(usage)
  console.log(`${workPath('REPORT.md')}: ${priced.length} priced (${renamed.length} renamed), ${unresolved.length} unresolved, ${removed.length} allergen(s) removed; MANUAL-FIX.md: ${manualCount}`)
}

/**
 * Stage C: STAGE-C-RESULT.md (what each action did), UNDONE.md (what Dan decides) and MANUAL-SUPPLIER.md (what Dan
 * prices from his own suppliers), all with the worksheet row numbers.
 */
function writeStageC(usage) {
  const stage = readJson(workPath('stage-c-ledger.json'), null)
  if (!stage) return
  const rows = new Map(readJson(workPath('worklist.json')).rows.map(r => [r.id, r]))
  const by = a => stage.entries.filter(e => e.action === a)
  const R = ['# Stage C — Dan\'s action plan, result', '', `Written ${new Date().toISOString()}.`, '',
    '| Action | Rows |', '| --- | --- |']
  for (const a of ['singleChain', 'relink', 'switchUnit', 'merge', 'rename', 'delete', 'zeroCost', 'manualSupplier', 'undone']) R.push(`| ${a} | ${by(a).length} |`)
  R.push('', '## Unit switched', '', '| # | Product | From → to | 1 unit = | Cheapest per new unit | Used in lines |', '| --- | --- | --- | --- | --- | --- |')
  for (const e of by('switchUnit')) {
    const l = e.ledger
    R.push(`| ${e.n} | ${cell(e.name)} | ${l.oldBaseUnit} → ${l.newBaseUnit} | ${l.weight ? `${l.weight} g` : '—'} | ${Math.min(...l.chains.map(c => c.price)).toFixed(4)} ₪ | ${usage(e.id)} |`)
  }
  R.push('', '## Merged into an existing product', '', '| # | Product | Into | Used in lines |', '| --- | --- | --- | --- |')
  for (const e of by('merge')) R.push(`| ${e.n} | ${cell(e.name)} | ${e.into} | ${usage(e.id)} |`)
  R.push('', '## Priced from one chain or re-matched', '', '| # | Product | Chains | Used in lines |', '| --- | --- | --- | --- |')
  for (const e of [...by('singleChain'), ...by('relink'), ...by('rename')]) R.push(`| ${e.n} | ${cell(e.ledger.name)} | ${e.ledger.chains.map(c => c.chain).join(', ')} | ${usage(e.id)} |`)
  R.push('', '## Deleted (test entries)', '')
  for (const e of by('delete')) R.push(`- ${e.n} ${cell(e.name)} (${e.id})`)
  R.push('', '## Price set to 0', '')
  for (const e of by('zeroCost')) R.push(`- ${e.n} ${cell(e.name)} (${e.id})`)
  fs.writeFileSync(workPath('STAGE-C-RESULT.md'), R.join('\n') + '\n', 'utf8')

  const U = ['# UNDONE — for Dan', '', 'Left unchanged on purpose. Grouped by worksheet section; most used first.', '']
  const undone = by('undone').sort((a, b) => a.section - b.section || usage(b.id) - usage(a.id))
  let section = null
  for (const e of undone) {
    if (e.section !== section) {
      section = e.section
      U.push('', `## Section ${section}`, '', '| # | Product | Base unit | Used in lines | Why |', '| --- | --- | --- | --- | --- |')
    }
    U.push(`| ${e.n} | ${cell(e.name)} | ${rows.get(e.id)?.baseUnit ?? ''} | ${usage(e.id)} | ${cell(String(e.ledger.reason).replace(/^UNDONE \(Dan\) [\d.]+: /, ''))} |`)
  }
  fs.writeFileSync(workPath('UNDONE.md'), U.join('\n') + '\n', 'utf8')

  const S = ['# Manual supplier pricing — for Dan', '', 'Supermarkets do not sell these formats (packaging, professional brands, specialty items). Price them from your own suppliers.', '',
    '| # | Product | Base unit | Used in lines |', '| --- | --- | --- | --- |']
  for (const e of by('manualSupplier').sort((a, b) => usage(b.id) - usage(a.id))) S.push(`| ${e.n} | ${cell(e.name)} | ${rows.get(e.id)?.baseUnit ?? ''} | ${usage(e.id)} |`)
  fs.writeFileSync(workPath('MANUAL-SUPPLIER.md'), S.join('\n') + '\n', 'utf8')
}

/** Stage B: MANUAL-FIX.md — every product that needs a hand fix, with the items, sizes and prices to fix it. */
function writeManualFix(usage) {
  const rescue = readJson(workPath('rescue-decisions.json'), null)
  const names = new Map(readJson(workPath('candidates.json')).chains.map(c => [c.chain, c.chainNameHebrew]))
  const manual = (rescue?.decisions ?? []).filter(d => d.outcome === 'manual').sort((a, b) => usage(b.id) - usage(a.id))
  const M = ['# Products to fix by hand — plan 583 stage B', '',
    'Each product below has the right item in the chains, but it could not be priced automatically (the pack does not',
    "fit the product's unit, only one chain sells it, or the new name is taken). Everything needed is here: open the",
    'product in the app and set the supplier price from the line you trust. Shelf prices include VAT (18%), except fresh',
    'produce.', '']
  for (const d of manual) {
    M.push(`## ${d.name} (${d.id}) — base unit ${d.baseUnit} — used in ${usage(d.id)} lines`, '', `Why: ${d.reason}`, '')
    M.push('| Chain | Item | Maker | Pack | Shelf ₪ | Per base unit (incl. VAT) |', '| --- | --- | --- | --- | --- | --- |')
    for (const { chain, item } of d.items) {
      const per = item.ppb === null ? 'does not fit — work out by hand' : item.ppb.toFixed(4)
      M.push(`| ${names.get(chain) ?? chain} | ${cell(item.name)} | ${cell(item.maker)} | ${cell(item.size)} | ${item.shelf} | ${per} |`)
    }
    M.push('')
  }
  if (!manual.length) M.push('None.')
  fs.writeFileSync(workPath('MANUAL-FIX.md'), M.join('\n') + '\n', 'utf8')
  return manual.length
}

runMain(main)
