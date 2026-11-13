'use strict'
/**
 * Plan 583 C1: group the products still unresolved after stage B into the 11 sections of Dan's action plan, with a
 * stable row number (s.n, most used first), and write `<work>/UNRESOLVED-SECTIONS.md` (for Dan) and
 * `<work>/worklist.json` (for the stage C judgment and apply). Reads the database only for the units recipe lines use.
 *
 *   node server/scripts/catalog-enrichment/worksheet.js --target=local
 */

const fs = require('node:fs')
const { parseArgs, connectLocal, workPath, readJson, writeJson, runMain } = require('./lib/work-dir')
const { sectionOf, SECTION_TITLES, suggestUnit } = require('./lib/worklist')

async function lineUnits(db, ids) {
  const copies = await db.collection('products').find({ _masterId: { $in: [...ids] } }).project({ _masterId: 1 }).toArray()
  const toMaster = new Map(copies.map(c => [c._id, c._masterId]))
  const units = new Map()
  for (const col of ['recipes', 'dishes']) {
    for await (const d of db.collection(col).find({}).project({ ingredients: 1 })) {
      for (const x of d.ingredients ?? []) {
        if (x?.type !== 'product') continue
        const id = ids.has(x.referenceId) ? x.referenceId : toMaster.get(x.referenceId)
        if (!id) continue
        const m = units.get(id) ?? {}
        m[x.unit] = (m[x.unit] ?? 0) + 1
        units.set(id, m)
      }
    }
  }
  return units
}

async function main() {
  const args = parseArgs(process.argv)
  const names = new Map(readJson(workPath('candidates.json')).chains.map(c => [c.chain, c.chainNameHebrew]))
  const { decisions } = readJson(workPath('rescue-decisions.json'))
  const open = decisions.filter(d => d.outcome !== 'renamed')
  const { client, db } = await connectLocal(args.target)
  let units
  try {
    units = await lineUnits(db, new Set(open.map(d => d.id)))
  } finally {
    await client.close()
  }
  const groups = {}
  for (const d of open) (groups[sectionOf(d)] ??= []).push(d)
  const rows = []
  const L = ['# Unresolved products — worksheet by section', '',
    'Same products as REPORT.md "Unresolved", grouped by what they need. Most used first. Base unit = what the product is measured in today.', '']
  for (const s of Object.keys(groups).map(Number).sort((a, b) => a - b)) {
    const list = groups[s].sort((a, b) => b.usage - a.usage || a.id.localeCompare(b.id))
    L.push(`## ${s}. ${SECTION_TITLES[s]} (${list.length})`, '')
    L.push(s === 1
      ? '| # | Product | Base unit now | Switch to | Used in lines | Why | Items found (chain · item · pack · shelf ₪) |'
      : '| # | Product | Base unit | Used in lines | Why | Items found (chain · item · pack · shelf ₪) |')
    L.push(s === 1 ? '| --- | --- | --- | --- | --- | --- | --- |' : '| --- | --- | --- | --- | --- | --- |')
    list.forEach((d, i) => {
      const n = `${s}.${i + 1}`
      const switchTo = s === 1 ? suggestUnit(d) : null
      rows.push({ n, section: s, id: d.id, name: d.name, baseUnit: d.baseUnit, usage: d.usage, reason: d.reason ?? '',
        vatExempt: d.vatExempt, allergens: d.allergens, switchTo, lineUnits: units.get(d.id) ?? {},
        items: (d.items ?? []).map(x => ({ chain: x.chain, ...x.item })) })
      const items = (d.items ?? []).slice(0, 4).map(x => `${names.get(x.chain) ?? x.chain} · ${x.item.name} · ${x.item.size} · ${x.item.shelf}`).join('<br>') || '—'
      const why = String(d.reason ?? '').replace(/\|/g, '/').replace(/^hand fix: /, '')
      L.push(s === 1
        ? `| ${n} | ${d.name} | ${d.baseUnit} | ${switchTo} | ${d.usage} | ${why} | ${items} |`
        : `| ${n} | ${d.name} | ${d.baseUnit} | ${d.usage} | ${why} | ${items} |`)
    })
    L.push('')
  }
  fs.writeFileSync(workPath('UNRESOLVED-SECTIONS.md'), L.join('\n'), 'utf8')
  writeJson(workPath('worklist.json'), { builtAt: new Date().toISOString(), rows })
  const counts = rows.reduce((o, r) => ({ ...o, [r.section]: (o[r.section] ?? 0) + 1 }), {})
  console.log(`rows: ${rows.length}; per section: ${JSON.stringify(counts)}`)
}

runMain(main)
