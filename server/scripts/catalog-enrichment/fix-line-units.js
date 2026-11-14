'use strict'
/**
 * Plan 583 (Dan 2026-11-12): recipe/dish lines whose amount was written in grams but whose unit says kg / liter /
 * unit. Same amount, corrected unit, on the master line and on the same line of every business copy (`_masterId` +
 * the line `_id`) that still carries the old amount and unit. Products are never changed here.
 *
 * Input: `<work>/suspect-lines.json` (numbered 1..n as in SUSPECT-LINES.md) and `<work>/line-unit-fixes.json`
 * ({ fix: { "<n>": "gram" | "ml" }, keep: { "<n>": "<why>" }, extra: [later lines with their own fixUnit] }). Dry run by default: prints every line and writes
 * `<work>/LINE-FIX-DRY-RUN.md`. With `--write`: backs up every touched document to `<work>/line-fix-backup-<ts>.json`
 * first, then writes. `--restore=<backup file>` puts the backed-up documents back. Local only.
 *
 *   node server/scripts/catalog-enrichment/fix-line-units.js --target=local [--write | --restore=<file>]
 */

const fs = require('node:fs')
const { parseV2 } = require('../../utils/schema-check')
const { parseArgs, connectLocal, workPath, readJson, writeJson, runMain } = require('./lib/work-dir')

const F = { gram: 1, kg: 1000, ml: 1, liter: 1000 }
const fam = u => (u === 'gram' || u === 'kg' ? 'mass' : u === 'ml' || u === 'liter' ? 'volume' : u === 'unit' ? 'count' : 'custom')

/** The engine's toBase (src/app/core/engine/units.ts): same unit, a purchase option, then within a family. */
function toBase(amount, unit, p) {
  const base = p.baseUnit || 'gram'
  if (unit === base) return amount
  const o = (p.purchaseOptions || []).find(x => (x.unitSymbol || '').trim() === (unit || '').trim())
  if (o) return o.conversionRate > 0 ? amount * o.conversionRate : null
  if ((fam(unit) === 'mass' || fam(unit) === 'volume') && fam(unit) === fam(base)) return amount * F[unit] / F[base]
  return null
}
const cheapest = p => {
  const v = (p?.sources || []).map(s => s.price).filter(x => x > 0)
  return v.length ? Math.min(...v) : null
}
function lineCost(amount, unit, p) {
  if (!p) return null
  const q = toBase(amount, unit, p)
  const pr = cheapest(p)
  return q != null && pr != null ? q * pr : null
}

function backupProductsMap() {
  const dir = fs.readdirSync(workPath()).filter(d => d.startsWith('backup-')).sort().pop()
  const { EJSON } = require('mongoose').mongo.BSON
  const docs = EJSON.parse(fs.readFileSync(workPath(dir, 'products.json'), 'utf8'), { relaxed: true })
  return new Map(docs.filter(d => d.businessId === '__master__').map(d => [d._id, d]))
}

async function main() {
  const args = parseArgs(process.argv, ['restore'])
  const { client, db } = await connectLocal(args.target)
  try {
    if (typeof args.restore === 'string') {
      const saved = require('mongoose').mongo.BSON.EJSON.parse(fs.readFileSync(args.restore, 'utf8'))
      for (const d of saved.docs) await db.collection(d.col).replaceOne({ _id: d.doc._id }, d.doc)
      console.log(`[restore] ${saved.docs.length} document(s) put back from ${args.restore}`)
      return
    }
    const rows = readJson(workPath('suspect-lines.json'))
    const plan = readJson(workPath('line-unit-fixes.json'))
    const products = new Map((await db.collection('products').find({ businessId: '__master__' }).toArray()).map(p => [p._id, p]))
    const before = backupProductsMap()
    const out = []
    const touched = new Map() // `${col}/${_id}` → { col, doc, lines: [{ lineId, unit }] }
    const touch = (col, doc, lineId, unit) => {
      const k = `${col}/${doc._id}`
      if (!touched.has(k)) touched.set(k, { col, doc, lines: [] })
      touched.get(k).lines.push({ lineId, unit })
    }
    // The numbered rows of SUSPECT-LINES.md, then Dan's later lines (`extra`: { n, col, recipeId, lineId, amount, unit, fixUnit, ... }).
    const items = [...rows.map((r, i) => ({ ...r, n: String(i + 1), fixUnit: plan.fix?.[String(i + 1)], keepWhy: plan.keep?.[String(i + 1)] })), ...(plan.extra ?? [])]
    for (const r of items) {
      const { n, fixUnit, keepWhy } = r
      const master = await db.collection(r.col).findOne({ _id: r.recipeId })
      const line = master?.ingredients?.find(x => x._id === r.lineId)
      const p = products.get(r.productId)
      const row = { n, recipe: r.recipe, product: r.product, amount: r.amount, unit: r.unit, fixUnit: fixUnit ?? null,
        costNow: lineCost(r.amount, r.unit, p), costPrePlan: lineCost(r.amount, r.unit, before.get(r.productId)), copies: 0, copiesDiffer: 0 }
      if (!fixUnit) {
        out.push({ ...row, state: 'skipped', why: keepWhy ?? 'not in the fix list' })
        continue
      }
      if (!line || line.amount !== r.amount || line.unit !== r.unit) {
        out.push({ ...row, state: line?.unit === fixUnit && line.amount === r.amount ? 'already' : 'changed', why: line ? `line is now ${line.amount} ${line.unit}` : 'line not found' })
        continue
      }
      row.costNew = lineCost(r.amount, fixUnit, p)
      touch(r.col, master, r.lineId, fixUnit)
      const copies = await db.collection(r.col).find({ _masterId: r.recipeId }).toArray()
      for (const c of copies) {
        const cl = c.ingredients?.find(x => x._id === r.lineId)
        if (cl && cl.amount === r.amount && cl.unit === r.unit) {
          row.copies++
          touch(r.col, c, r.lineId, fixUnit)
        } else if (cl) row.copiesDiffer++
      }
      out.push({ ...row, state: 'apply' })
    }
    const money = v => (v == null ? 'no cost' : `${v.toFixed(v < 10 ? 2 : 0)} ₪`)
    const L = [`# Line unit fix — ${args.write ? 'written' : 'dry run'} ${new Date().toISOString()}`, '']
    const count = s => out.filter(r => r.state === s).length
    L.push(`apply ${count('apply')} · skipped ${count('skipped')} · already fixed ${count('already')} · changed since the list ${count('changed')} · documents ${touched.size} (master + business copies)`, '')
    for (const r of out) {
      const head = `${r.n}. ${r.recipe} — ${r.product}`
      if (r.state === 'apply') {
        L.push(`${head}: ${r.amount} ${r.unit} (${money(r.costNow)}) → ${r.amount} ${r.fixUnit} (${money(r.costNew)}) · before the plan ${money(r.costPrePlan)} · copies ${r.copies}${r.copiesDiffer ? `, ${r.copiesDiffer} copy line(s) edited by the business — left` : ''}`)
      } else L.push(`${head}: ${r.amount} ${r.unit} — ${r.state.toUpperCase()}: ${r.why}`)
    }
    fs.writeFileSync(workPath('LINE-FIX-DRY-RUN.md'), L.join('\n') + '\n')
    for (const l of L) console.log(l)
    // Every edited document is checked with parseV2; a document that passed before and fails after stops the run.
    const fixed = t => ({ ...t.doc, updatedAt: Date.now(), ingredients: t.doc.ingredients.map(x => {
      const fix = t.lines.find(l => l.lineId === x._id)
      return fix ? { ...x, unit: fix.unit } : x
    }) })
    const broken = [...touched.values()].filter(t => parseV2(t.col, t.doc).success && !parseV2(t.col, fixed(t)).success)
    console.log(`parseV2: ${broken.length} document(s) newly failing`)
    if (broken.length) throw new Error(`parseV2 fails after the fix: ${broken.slice(0, 5).map(t => t.doc._id).join(', ')} — nothing written`)
    if (!args.write) {
      console.log(`[dry run] nothing written; ${workPath('LINE-FIX-DRY-RUN.md')}`)
      return
    }
    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFile = workPath(`line-fix-backup-${stamp}.json`)
    // EJSON keeps Date and other BSON types exact for --restore.
    fs.writeFileSync(backupFile, require('mongoose').mongo.BSON.EJSON.stringify({ writtenAt: new Date().toISOString(), docs: [...touched.values()].map(t => ({ col: t.col, doc: t.doc })) }))
    for (const col of ['recipes', 'dishes']) {
      const ops = [...touched.values()].filter(t => t.col === col)
        .map(t => ({ updateOne: { filter: { _id: t.doc._id }, update: { $set: { ingredients: fixed(t).ingredients, updatedAt: Date.now() } } } }))
      if (ops.length) await db.collection(col).bulkWrite(ops, { ordered: true })
    }
    writeJson(workPath(`line-fix-ledger-${stamp}.json`), { writtenAt: new Date().toISOString(), backup: backupFile, rows: out })
    console.log(`[write] ${touched.size} document(s) written; backup ${backupFile}`)
  } finally {
    await client.close()
  }
}

module.exports = { toBase, lineCost }
if (require.main === module) runMain(main)
