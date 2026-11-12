'use strict'
/**
 * Plan 583 A8: apply `<work>/decisions.json` to the local master catalog. Dry run by default: prints
 * `changes: <n>` and a before/after sample. With `--write` it writes the chain suppliers and the priced products and
 * `<work>/ledger.json` (every master product: `priced` or `unresolved` + reason, old and new sources and allergens).
 * Every document is checked with parseV2 first; any failure stops the run before a write. Local only.
 *
 *   node server/scripts/catalog-enrichment/apply-enrichment.js --target=local [--write]
 * then: node server/scripts/bump-master-version.js
 *       node server/scripts/reset-user-from-master.js --user=dev-guest --target=local --write
 */

const { parseArgs, connectLocal, workPath, readJson, writeJson, runMain } = require('./lib/work-dir')
const { masterProducts, masterSuppliers } = require('./lib/catalog-data')
const fs = require('node:fs')
const path = require('node:path')
const { buildDocs, applyRescue, sameContent, ADDED_BY } = require('./lib/build-docs')
const { renameWork, writeRenames } = require('./lib/renames')
const { parseV2 } = require('../../utils/schema-check')

/** The master products of the A1 backup (`--backup=<dir>`, default: the newest `<work>/backup-*`). */
function backupProducts(dirArg) {
  const dir = typeof dirArg === 'string' ? dirArg
    : fs.readdirSync(workPath()).filter(d => d.startsWith('backup-')).sort().map(d => workPath(d)).pop()
  if (!dir) throw new Error('no backup folder found in the work folder')
  const { EJSON } = require('mongoose').mongo.BSON
  const docs = EJSON.parse(fs.readFileSync(path.join(dir, 'products.json'), 'utf8'), { relaxed: true })
  return new Map(docs.filter(d => d.businessId === '__master__').map(d => [d._id, d]))
}

async function main() {
  const args = parseArgs(process.argv, ['backup', 'revert-names'])
  const merged = readJson(workPath('decisions.json'))
  const { client, db } = await connectLocal(args.target)
  try {
    const current = { products: await masterProducts(db), suppliers: await masterSuppliers(db) }
    const now = Date.now()
    const built = buildDocs(merged, current, now)
    const rescue = readJson(workPath('rescue-decisions.json'), null)
    if (rescue) applyRescue(built, rescue, current, now)
    // Stage C (apply-worklist.js) owns the products it handled: their documents are left as stage C wrote them and
    // their ledger entries come from stage-c-ledger.json.
    const stageC = readJson(workPath('stage-c-ledger.json'), null)
    const stageEntries = new Map((stageC?.entries ?? []).map(e => [e.id, e]))
    if (stageEntries.size) {
      built.products = built.products.filter(p => !stageEntries.get(p.after._id)?.handled)
      built.ledger = built.ledger.map(l => (l.renamed ? null : stageEntries.get(l.id)?.ledger) ?? l)
    }
    const changed = built.products.filter(p => !sameContent(p.before, p.after))
    // A product renamed by an earlier run and no longer renamed (e.g. moved to the hand-fix list) gets its original
    // name back on its business copies and recipe lines too. `renamedEver` in the ledger remembers every rename;
    // `--revert-names=a,b` adds ids from a run made before that list existed.
    const previousLedger = readJson(workPath('ledger.json'), { products: [] })
    const renamedNow = new Set(built.ledger.filter(l => l.renamed).map(l => l.id))
    const extra = typeof args['revert-names'] === 'string' ? args['revert-names'].split(',').filter(Boolean) : []
    const renamedEver = new Set([...(previousLedger.renamedEver ?? []), ...previousLedger.products.filter(l => l.renamed).map(l => l.id), ...extra, ...renamedNow])
    const reverted = [...renamedEver].filter(id => !renamedNow.has(id))
    const originalNames = reverted.length ? backupProducts(args.backup) : new Map()
    const renames = await renameWork(db, [
      ...built.ledger.filter(l => l.renamed),
      ...reverted.filter(id => originalNames.has(id)).map(id => ({ id, name: originalNames.get(id).nameHebrew }))
    ])
    // A product this plan priced earlier and that is now unresolved (e.g. after the final audit) goes back to its
    // backup copy, so an unresolved product ends exactly as it was before the plan.
    const unresolvedIds = new Set(built.ledger.filter(l => l.state === 'unresolved').map(l => l.id))
    const toRestore = current.products.filter(p => unresolvedIds.has(p._id) && (p.sources ?? []).some(s => s.addedBy === ADDED_BY))
    if (toRestore.length) {
      const backup = backupProducts(args.backup)
      for (const p of toRestore) {
        const original = backup.get(p._id)
        if (!original) throw new Error(`no backup copy of product ${p._id} — pass --backup=<backup folder>`)
        changed.push({ before: p, after: original })
      }
    }
    const problems = []
    for (const s of built.suppliers.create) {
      const r = parseV2('suppliers', s)
      if (!r.success) problems.push(`supplier ${s._id}: ${JSON.stringify(r.issues)}`)
    }
    for (const { after } of [...built.products, ...changed]) {
      const r = parseV2('products', after)
      if (!r.success) problems.push(`product ${after._id}: ${JSON.stringify(r.issues)}`)
    }
    if (problems.length) {
      for (const p of problems.slice(0, 20)) console.log(`parseV2: ${p}`)
      throw new Error(`${problems.length} document(s) fail parseV2 — nothing written`)
    }
    const counts = built.ledger.reduce((o, l) => ({ ...o, [l.state]: (o[l.state] ?? 0) + 1 }), {})
    console.log(`suppliers to create: ${built.suppliers.create.length} (${built.suppliers.create.map(s => s.nameHebrew).join(', ') || '-'})`)
    console.log(`chain → supplier: ${JSON.stringify(built.suppliers.reuse)}`)
    console.log(`ledger: ${JSON.stringify(counts)}`)
    for (const { before, after } of changed.slice(0, 3)) {
      console.log(`sample ${after._id} ${after.nameHebrew}:`)
      console.log(`  before sources ${JSON.stringify((before.sources ?? []).map(s => [s.supplierId, s.price]))} allergens ${JSON.stringify(before.allergens)}`)
      console.log(`  after  sources ${JSON.stringify(after.sources.map(s => [s.supplierId, s.price]))} allergens ${JSON.stringify(after.allergens)}`)
    }
    console.log(`renamed: ${built.ledger.filter(l => l.renamed).length}; recipe/dish lines to rename: ${renames.lines}; business copies to rename: ${renames.clones.length}`)
    console.log(`changes: ${built.suppliers.create.length + changed.length + renames.lines + renames.clones.length}`)
    if (!args.write) {
      console.log('[dry run] nothing written. Re-run with --write to apply.')
      return
    }
    for (const s of built.suppliers.create) await db.collection('suppliers').replaceOne({ _id: s._id }, s, { upsert: true })
    for (const { after } of changed) await db.collection('products').replaceOne({ _id: after._id, businessId: after.businessId }, after)
    await writeRenames(db, renames)
    // "Old" in the ledger means before this plan: on a re-run the current documents already carry the new values.
    const original = backupProducts(args.backup)
    for (const l of built.ledger) {
      const o = original.get(l.id)
      if (o && l.state === 'priced') Object.assign(l, { oldSources: o.sources ?? [], oldAllergens: o.allergens ?? [] })
      if (o && l.renamed) l.oldName = o.nameHebrew
    }
    const previous = readJson(workPath('ledger.json'), { createdSuppliers: [] })
    writeJson(workPath('ledger.json'), {
      writtenAt: new Date().toISOString(), suppliers: built.suppliers.reuse,
      createdSuppliers: [...new Set([...previous.createdSuppliers, ...built.suppliers.create.map(s => s._id)])].sort(),
      renamedEver: [...renamedEver].sort(),
      products: built.ledger
    })
    console.log(`[write] ${built.suppliers.create.length} supplier(s), ${changed.length} product(s) written; ledger ${workPath('ledger.json')}`)
  } finally {
    await client.close()
  }
}

runMain(main)
