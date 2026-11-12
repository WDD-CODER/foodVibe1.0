'use strict'
/**
 * Plan 583 C3: apply Dan's action plan (stage C) to the products still unresolved after stage B. Reads
 * `<work>/worklist.json` and the judgment answers in `<work>/stage-c-answers/`, decides one action per row and, with
 * `--write`, writes it. Dry run by default; local only; every product document is checked with parseV2 first.
 *
 *   node server/scripts/catalog-enrichment/apply-worklist.js --target=local [--write]
 *
 * Actions: price (single chain / re-match / rename), switchUnit, zeroCost, merge, delete, manualSupplier, undone; then
 * Dan's product fixes (`dan-input.json` productFixes: base unit, extra purchase options, no price, priced from another product).
 * Writes `<work>/stage-c-ledger.json` and updates `<work>/ledger.json`; then run bump-master-version.js and the
 * dev-guest reset.
 */

const fs = require('node:fs')
const { parseArgs, connectLocal, workPath, readJson, writeJson, runMain, MASTER } = require('./lib/work-dir')
const { masterProducts } = require('./lib/catalog-data')
const { ruleAction, answerAction, danSwitch, unitOptions, groupChains, applyProductFix, withoutFixOptions, SECTION_TITLES } = require('./lib/worklist')
const { pricePerBaseUnit, inBand, perKgLiterOrUnit } = require('./lib/pricing')
const { MAX_RATIO, dropOutliers } = require('./lib/decide')
const { ADDED_BY } = require('./lib/build-docs')
const { renameWork, writeRenames } = require('./lib/renames')
const { parseV2 } = require('../../utils/schema-check')
const { normalizeProductName } = require('../../utils/price-list-import')

const family = u => (u === 'gram' || u === 'kg' ? 'mass' : u === 'ml' || u === 'liter' ? 'volume' : 'count')

function loadAnswers() {
  const dir = workPath('stage-c-answers')
  const out = new Map()
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter(x => x.endsWith('.json')).sort() : []) {
    for (const a of readJson(workPath('stage-c-answers', f))) if (a?.id) out.set(a.id, a)
  }
  return out
}

function chainIndex() {
  const idx = new Map()
  for (const f of fs.readdirSync(workPath('chains')).filter(x => x.endsWith('.json') && x !== 'fetch-status.json')) {
    const c = readJson(workPath('chains', f))
    idx.set(c.chain, new Map(c.items.map(i => [i.code, i])))
  }
  return idx
}

/**
 * Chains whose price is inside the band and no more than MAX_RATIO apart. With 3 or more chains the one farthest from
 * the median is dropped until they fit (as in stage A); two chains that disagree give null (which one is right?).
 */
const withFar = (list, far) => Object.assign(list, { far })

function checkedChains(chains, baseUnit, keepAll = false) {
  const ok = chains.filter(c => inBand(perKgLiterOrUnit(c.price, baseUnit), baseUnit))
  if (!ok.length) return null
  // Dan's rows that keep every chain as its own supplier, however far apart (chat 2026-11-12).
  if (keepAll) return withFar(ok.sort((x, y) => x.price - y.price), ok.length > 1 ? ok.map(c => c.chain) : [])
  // Dan 2026-11-12: every chain is kept as a supplier; the ones far from the others are listed as "far".
  const { list, far } = dropOutliers(ok)
  const v = list.map(c => c.price)
  const farNames = Math.max(...v) / Math.min(...v) > MAX_RATIO ? ok.map(c => c.chain) : far.map(c => c.chain)
  return withFar([...list, ...far].sort((x, y) => x.price - y.price), farNames)
}

function allergenKeys(raw, allowed) {
  const keys = Array.isArray(raw) ? raw.map(a => a.key ?? a) : Object.keys(raw ?? {})
  return [...new Set(keys.filter(k => allowed.has(k)))].sort()
}

/**
 * Section 5 (Dan 2026-11-12): his names and the approved suggestions — link (rename + chain price from the
 * stage-c-5 answers), merge into a row or a product, rename + manual supplier pricing, sub-recipe, delete.
 */
function section5Action(row, s5, rows, answer) {
  if (s5.delete?.includes(row.n)) return { type: 'delete', why: 'not used; Dan deletes it' }
  if (s5.subRecipe?.includes(row.n)) return { type: 'undone', why: 'sub-recipe — belongs in the recipe book (Dan)' }
  if (s5.manual?.includes(row.n)) return { type: 'manualSupplier', why: 'manual supplier pricing (Dan)' }
  if (s5.renameManual?.[row.n]) return { type: 'renameManual', newName: s5.renameManual[row.n] }
  if (s5.mergeIntoId?.[row.n]) return { type: 'merge', intoId: s5.mergeIntoId[row.n], why: 'Dan' }
  if (s5.mergeIntoRow?.[row.n]) {
    const into = rows.find(r => r.n === s5.mergeIntoRow[row.n])
    return into ? { type: 'merge', intoId: into.id, why: `same as ${into.n} (Dan)` } : { type: 'undone', why: 'merge target row not found' }
  }
  if (s5.link?.[row.n]) {
    // No chain sells it: the new name still applies, and the price comes from Dan's own supplier.
    if (answer?.action !== 'link' || !(answer.items ?? []).length) {
      return s5.link[row.n] === row.name ? { type: 'manualSupplier', why: 'no chain sells it (Dan)' } : { type: 'renameManual', newName: s5.link[row.n] }
    }
    const newName = s5.link[row.n] === row.name ? undefined : s5.link[row.n]
    return { type: 'link', items: answer.items, vatExempt: answer.vatExempt === true, allergens: answer.allergens ?? {}, newName }
  }
  return { type: 'undone', why: 'Dan renames or deletes it' }
}

/**
 * Section 7 (Dan 2026-11-12, SECTION-7-PROPOSAL.md approved): D merges, B price 0, A price from the raw product's
 * cheapest price ÷ yield (zest charged with the whole fruit), the two rows Dan leaves, and C (sub-recipes) undone.
 */
function section7Action(row, s7, proposal, rows, byId) {
  if (s7.merge?.[row.n]) {
    const into = rows.find(r => r.n === s7.merge[row.n])
    return into ? { type: 'merge', intoId: into.id, why: `duplicate of ${into.n}` } : { type: 'undone', why: 'merge target row not found' }
  }
  if (s7.zeroCost?.includes(row.n)) return { type: 'zeroCost', why: 'by-product (Dan)' }
  if (s7.leave?.includes(row.n)) return { type: 'undone', why: 'already has a price; Dan leaves it' }
  const pr = proposal.get(row.n)
  if (!pr?.raw?.id) return { type: 'undone', why: 'sub-recipe — belongs in the recipe book (Dan)' }
  const m = /^([\d.]+)\/(kg-or-l|kg|unit|liter)/.exec(String(pr.price ?? ''))
  const p = byId.get(row.id)
  if (!m || !p) return { type: 'undone', why: 'proposal price unreadable' }
  const value = Number(m[1])
  const perBase = m[2] === 'unit'
    ? (p.baseUnit === 'unit' ? value : null)
    : (p.baseUnit === 'gram' || p.baseUnit === 'ml' ? value / 1000 : p.baseUnit === 'kg' || p.baseUnit === 'liter' ? value : null)
  if (!(perBase > 0)) return { type: 'undone', why: `proposal price per ${m[2]} does not fit base unit ${p.baseUnit}` }
  return { type: 'derived', rawId: pr.raw.id, yield: pr.yield, price: Math.round(perBase * 1e6) / 1e6 }
}

async function main() {
  const args = parseArgs(process.argv)
  const { rows } = readJson(workPath('worklist.json'))
  const answers = loadAnswers()
  // Dan's numbers for section 1 (chat 2026-11-12): weights, pack counts and the rows he sent elsewhere.
  const dan = readJson(workPath('dan-input.json'), { weights: {}, packCounts: {}, manualSupplier: [], handFix: [] })
  const rescueRenamed = new Set(readJson(workPath('rescue-decisions.json')).decisions.filter(d => d.outcome === 'renamed').map(d => d.id))
  const proposal = new Map(readJson(workPath('section-7-proposal.json'), []).map(r => [r.n, r]))
  const chains = chainIndex()
  const ledger = readJson(workPath('ledger.json'))
  const supplierOf = ledger.suppliers
  const allowed = new Set(readJson(workPath('inventory.json')).allergenKeys.filter(k => k !== 'new'))
  const { client, db } = await connectLocal(args.target)
  try {
    const products = await masterProducts(db)
    const byId = new Map(products.map(p => [p._id, p]))
    const byName = new Map(products.map(p => [normalizeProductName(p.nameHebrew), p]))
    const now = Date.now()
    const entries = []
    // Dan's product fixes by product id (dan-input.json productFixes) and the options stage C wrote last time.
    const fixes = dan.productFixes ?? {}
    const previousOptions = new Map((readJson(workPath('stage-c-ledger.json'), { entries: [] }).entries ?? [])
      .filter(e => e.ledger?.options).map(e => [e.id, JSON.stringify(e.ledger.options)]))
    const writes = { products: [], deletes: [], merges: [] }
    const renameTargets = []
    const sourcesOf = list => list.map(c => {
      if (!supplierOf[c.chain]) throw new Error(`no supplier for chain ${c.chain}`)
      return { supplierId: supplierOf[c.chain], price: c.price, addedBy: ADDED_BY, addedAt: now }
    })
    for (const row of rows) {
      const p = byId.get(row.id)
      const base = { id: row.id, n: row.n, section: row.section, name: row.name }
      const undone = why => entries.push({ ...base, action: 'undone', handled: false, ledger: { id: row.id, name: row.name, state: 'unresolved', reason: `UNDONE (Dan) ${row.n}: ${why}` } })
      if (!p) { entries.push({ ...base, action: 'gone', handled: true, ledger: null }); continue }
      // A product the stage B rescue now prices (e.g. two far-apart chains kept, Dan 2026-11-12) is no longer stage C's.
      if (rescueRenamed.has(row.id)) { entries.push({ ...base, action: 'rescue', handled: false, ledger: null }); continue }
      const find = (chain, code) => chains.get(chain)?.get(code) ?? row.items.find(i => i.chain === chain && i.code === code)
      let act = ruleAction(row) ?? answerAction(row, answers.get(row.id), find)
      if (row.section === 7 && dan.section7) act = section7Action(row, dan.section7, proposal, rows, byId)
      if (row.section === 5 && dan.section5) act = section5Action(row, dan.section5, rows, answers.get(row.id))
      if (row.section === 1 && act.type === 'undone') {
        if (dan.manualSupplier.includes(row.n)) act = { type: 'manualSupplier', why: 'packaging (Dan)' }
        else if (dan.handFix.includes(row.n)) act = { type: 'undone', why: 'hand fix: already sold in its own unit or the pack is unclear (Dan)' }
        else if (dan.weights[row.n]) act = danSwitch(row, dan.weights[row.n], dan.packCounts[row.n], (chain, code) => chains.get(chain)?.get(code)) ?? { type: 'undone', why: 'no item could be priced with the given weight' }
      }
      // A product Dan prices from another product (e.g. a yolk at the price of one egg).
      const fix = fixes[row.id]
      if (fix?.derivedFrom) {
        const raw = byId.get(fix.derivedFrom)
        const rawPrice = Math.min(...(raw?.sources ?? []).map(s => s.price).filter(x => x > 0))
        act = Number.isFinite(rawPrice) ? { type: 'derived', rawId: fix.derivedFrom, yield: fix.yield ?? 1, price: Math.round(rawPrice / (fix.yield ?? 1) * 1e6) / 1e6 }
          : { type: 'undone', why: 'the product it is priced from has no price' }
      }
      if (act.type === 'link') {
        const per = act.items.map(a => {
          const it = chains.get(a.chain)?.get(a.code)
          // `pieces`: how many base units one pack holds (e.g. sticks in a box), given with the answer.
          const ppb = !it ? null : a.pieces > 0 && p.baseUnit === 'unit' ? it.price / a.pieces : pricePerBaseUnit(it, p.baseUnit)
          return ppb ? { chain: a.chain, code: a.code, ppb } : null
        }).filter(Boolean)
        act = { type: 'price', chains: groupChains(per, act.vatExempt), allergens: act.allergens, relinked: true, newName: act.newName }
      }
      if (act.type === 'renameManual') {
        const after = { ...p, nameHebrew: act.newName, nameHebrewNormalized: normalizeProductName(act.newName), updatedAt: now }
        writes.products.push({ before: p, after })
        renameTargets.push({ id: p._id, name: act.newName })
        entries.push({ ...base, action: 'renameManual', handled: false,
          ledger: { id: p._id, name: act.newName, oldName: p.nameHebrew, renamed: true, state: 'unresolved', reason: 'manual supplier pricing (renamed by Dan)' } })
        continue
      }
      if (act.type === 'undone') { undone(act.why); continue }
      if (act.type === 'manualSupplier') {
        entries.push({ ...base, action: 'manualSupplier', handled: false, ledger: { id: row.id, name: row.name, state: 'unresolved', reason: `manual supplier pricing (${SECTION_TITLES[row.section].split(' —')[0]})` } })
        continue
      }
      if (act.type === 'derived') {
        const raw = byId.get(act.rawId)
        const rawSource = raw ? [...(raw.sources ?? [])].filter(s => s.price > 0).sort((x, y) => x.price - y.price)[0] : null
        if (!rawSource || !inBand(perKgLiterOrUnit(act.price, p.baseUnit), p.baseUnit)) { undone('raw product has no price, or the derived price is outside the band'); continue }
        const sources = [{ supplierId: rawSource.supplierId, price: act.price, addedBy: ADDED_BY, addedAt: now }]
        const after = { ...p, sources, updatedAt: now }
        writes.products.push({ before: p, after })
        entries.push({ ...base, action: 'derived', handled: true,
          ledger: { id: p._id, name: p.nameHebrew, state: 'priced', stageC: true, derived: true, singleChain: true, derivedFrom: act.rawId,
            yield: act.yield, oldSources: p.sources ?? [], newSources: sources, oldAllergens: p.allergens ?? [], newAllergens: p.allergens ?? [],
            chains: [{ chain: 'derived', codes: [], price: act.price }] } })
        continue
      }
      if (act.type === 'price') {
        const list = checkedChains(act.chains, p.baseUnit)
        if (!list) { undone('prices outside the band or too far apart'); continue }
        const name = act.newName ?? p.nameHebrew
        if (act.newName && byName.has(normalizeProductName(name)) && byName.get(normalizeProductName(name))._id !== p._id) { undone(`new name "${name}" is taken`); continue }
        const allergens = act.allergens ? allergenKeys(act.allergens, allowed) : allergenKeys(row.allergens, allowed)
        const after = { ...p, nameHebrew: name, nameHebrewNormalized: normalizeProductName(name), sources: sourcesOf(list), allergens, allergenSource: 'llm', updatedAt: now }
        writes.products.push({ before: p, after })
        if (act.newName) renameTargets.push({ id: p._id, name })
        entries.push({ ...base, action: act.relinked ? 'relink' : act.newName ? 'rename' : 'singleChain', handled: true,
          ledger: { id: p._id, name, ...(act.newName ? { oldName: p.nameHebrew, renamed: true } : {}), state: 'priced', stageC: true,
            singleChain: list.length === 1, oldSources: p.sources ?? [], newSources: after.sources, oldAllergens: p.allergens ?? [],
            newAllergens: allergens, chains: list.map(c => ({ chain: c.chain, codes: c.codes, price: c.price })), ...(list.far?.length ? { farChains: list.far } : {}) } })
        continue
      }
      if (act.type === 'switchUnit') {
        // A legacy option that only restates the old base unit ("1 unit = 1", a price override from the old import) is
        // replaced by the conversions below; any other option needs a hand conversion.
        // On a re-run the product already carries the options this action writes; that counts as done, not as a hand case.
        const options = unitOptions(act.newBaseUnit, row.lineUnits, act.weight)
        if (options === null) { undone('no weight per unit in the data'); continue }
        // Options this stage wrote on an earlier run (e.g. before Dan changed a weight) are replaced too.
        const current = JSON.stringify(withoutFixOptions(p.purchaseOptions, fixes[p._id]))
        const already = current === JSON.stringify(options) || current === previousOptions.get(p._id)
        const trivial = (p.purchaseOptions ?? []).every(o => o.unitSymbol === row.baseUnit && o.conversionRate === 1 && !o.uom)
        if (!already && !trivial) { undone('has purchase options to convert by hand'); continue }
        const keepAll = (dan.keepAllChains ?? []).includes(row.n)
        const list = checkedChains(act.chains, act.newBaseUnit, keepAll)
        if (!list) { undone('prices per new unit outside the band or too far apart'); continue }
        const allergens = allergenKeys(act.allergens, allowed)
        const after = { ...p, baseUnit: act.newBaseUnit, purchaseOptions: options, sources: sourcesOf(list), allergens, allergenSource: 'llm', updatedAt: now }
        writes.products.push({ before: p, after })
        entries.push({ ...base, action: 'switchUnit', handled: true,
          ledger: { id: p._id, name: p.nameHebrew, state: 'priced', stageC: true, unitSwitched: true, ...(keepAll ? { keepAllChains: true } : {}), oldBaseUnit: row.baseUnit,
            newBaseUnit: act.newBaseUnit, weight: act.weight, weightFrom: act.weightFrom, options, singleChain: list.length === 1,
            oldSources: p.sources ?? [], newSources: after.sources, oldAllergens: p.allergens ?? [], newAllergens: allergens,
            chains: list.map(c => ({ chain: c.chain, codes: c.codes, price: c.price })), ...(list.far?.length ? { farChains: list.far } : {}) } })
        continue
      }
      if (act.type === 'zeroCost') {
        const after = { ...p, sources: (p.sources ?? []).map(s => ({ ...s, price: 0 })), updatedAt: now }
        writes.products.push({ before: p, after })
        entries.push({ ...base, action: 'zeroCost', handled: true, ledger: { id: p._id, name: p.nameHebrew, state: 'zeroCost', reason: 'not bought from a chain — price 0 (Dan)' } })
        continue
      }
      if (act.type === 'delete') {
        writes.deletes.push(p._id)
        entries.push({ ...base, action: 'delete', handled: true, ledger: null })
        continue
      }
      if (act.type === 'merge') {
        const taken = (/"([^"]+)" is already/.exec(row.reason) ?? [])[1]
        const keeper = act.intoId ? byId.get(act.intoId) : taken ? byName.get(normalizeProductName(taken)) : null
        if (!keeper || keeper._id === p._id) { undone('merge target not found'); continue }
        if (family(keeper.baseUnit) !== family(p.baseUnit)) { undone(`merge target ${keeper.nameHebrew} is measured in ${keeper.baseUnit}`); continue }
        writes.merges.push({ from: p._id, into: keeper._id, intoName: keeper.nameHebrew })
        entries.push({ ...base, action: 'merge', into: keeper._id, handled: true, ledger: null })
        continue
      }
      undone(`unknown action ${act.type}`)
    }

    // Merges: lines that use the duplicate (or a business copy of it) move to the kept product (or that business's copy).
    const mergePlan = []
    for (const m of writes.merges) {
      const copies = await db.collection('products').find({ _masterId: m.from }).project({ businessId: 1 }).toArray()
      const keeperCopies = await db.collection('products').find({ _masterId: m.into }).project({ businessId: 1, nameHebrew: 1 }).toArray()
      const keeperIn = new Map(keeperCopies.map(c => [c.businessId, c]))
      const map = new Map([[m.from, { id: m.into, name: m.intoName }]])
      const stuck = []
      for (const c of copies) {
        const k = keeperIn.get(c.businessId)
        if (k) map.set(c._id, { id: k._id, name: k.nameHebrew })
        else stuck.push(c._id)
      }
      // A business that uses the duplicate but has no copy of the kept product cannot be repointed: leave the whole
      // merge undone instead of merging half of it.
      const stuckLines = stuck.length
        ? await db.collection('recipes').countDocuments({ 'ingredients.referenceId': { $in: stuck } }) +
          await db.collection('dishes').countDocuments({ 'ingredients.referenceId': { $in: stuck } })
        : 0
      if (stuckLines > 0) {
        const entry = entries.find(e => e.id === m.from)
        Object.assign(entry, { action: 'undone', handled: false,
          ledger: { id: m.from, name: entry.name, state: 'unresolved', reason: `UNDONE (Dan) ${entry.n}: ${stuckLines} recipe(s) in businesses without "${m.intoName}" use it — merge by hand` } })
        continue
      }
      const keptName = renameTargets.find(t => t.id === m.into)?.name
      if (keptName) for (const [k, v] of map) map.set(k, { ...v, name: v.id === m.into ? keptName : v.name })
      mergePlan.push({ ...m, map, stuck, copies: copies.map(c => c._id) })
    }

    for (const [id, fix] of Object.entries(fixes)) {
      const w = writes.products.find(x => x.after._id === id)
      if (w) w.after = applyProductFix(w.after, fix)
      else if (byId.has(id)) writes.products.push({ before: byId.get(id), after: { ...applyProductFix(byId.get(id), fix), updatedAt: now } })
      const e = entries.find(x => x.id === id)
      if (e?.ledger && fix.why) e.ledger.danFix = fix.why
    }
    const changed = writes.products.filter(w => JSON.stringify({ ...w.before, updatedAt: 0, sources: (w.before.sources ?? []).map(s => [s.supplierId, s.price]) }) !==
      JSON.stringify({ ...w.after, updatedAt: 0, sources: (w.after.sources ?? []).map(s => [s.supplierId, s.price]) }))
    const problems = changed.map(w => [w.after._id, parseV2('products', w.after)]).filter(([, r]) => !r.success)
    if (problems.length) {
      for (const [id, r] of problems.slice(0, 10)) console.log(`parseV2: ${id} ${JSON.stringify(r.issues)}`)
      throw new Error(`${problems.length} product(s) fail parseV2 — nothing written`)
    }
    const renames = await renameWork(db, renameTargets)
    const count = entries.reduce((o, e) => ({ ...o, [e.action]: (o[e.action] ?? 0) + 1 }), {})
    console.log(`actions: ${JSON.stringify(count)}`)
    console.log(`product writes: ${changed.length}; deletes: ${writes.deletes.length}; merges: ${mergePlan.length}; rename lines: ${renames.lines}`)
    for (const w of changed.slice(0, 3)) {
      console.log(`sample ${w.after._id} ${w.after.nameHebrew}: ${w.before.baseUnit} → ${w.after.baseUnit}; sources ${JSON.stringify(w.after.sources.map(s => [s.supplierId, s.price]))}; options ${JSON.stringify(w.after.purchaseOptions)}`)
    }
    const pending = changed.length + writes.deletes.length + mergePlan.length + renames.lines + renames.clones.length
    console.log(`changes: ${pending}`)
    // The planned actions, for the stage C audit sheet (audit-sheet.js --kind=stage-c).
    writeJson(workPath('stage-c-plan.json'), { plannedAt: new Date().toISOString(), entries, merges: mergePlan.map(m => ({ from: m.from, into: m.into, intoName: m.intoName, stuck: m.stuck.length })) })
    if (!args.write) {
      console.log('[dry run] nothing written. Re-run with --write to apply.')
      return
    }
    for (const w of changed) await db.collection('products').replaceOne({ _id: w.after._id, businessId: MASTER }, w.after)
    await writeRenames(db, renames)
    for (const m of mergePlan) {
      const ids = [...m.map.keys()]
      for (const col of ['recipes', 'dishes']) {
        const docs = await db.collection(col).find({ 'ingredients.referenceId': { $in: ids } }).toArray()
        for (const d of docs) {
          const ingredients = d.ingredients.map(x => m.map.has(x.referenceId) ? { ...x, referenceId: m.map.get(x.referenceId).id, nameSnapshot: m.map.get(x.referenceId).name } : x)
          await db.collection(col).updateOne({ _id: d._id }, { $set: { ingredients } })
        }
      }
      // The duplicate goes only when nothing uses it any more (a copy in a business without the kept product stays).
      const left = await db.collection('recipes').countDocuments({ 'ingredients.referenceId': { $in: [m.from, ...m.stuck] } }) +
        await db.collection('dishes').countDocuments({ 'ingredients.referenceId': { $in: [m.from, ...m.stuck] } })
      const entry = entries.find(e => e.id === m.from)
      if (left === 0) {
        await db.collection('products').updateMany({ _id: { $in: [m.from, ...m.copies] } }, { $set: { deletedAt: now, deletedBy: ADDED_BY } })
        entry.merged = true
      } else {
        entry.merged = false
        entry.handled = false
        entry.action = 'undone'
        entry.ledger = { id: m.from, name: entry.name, state: 'unresolved', reason: `UNDONE (Dan) ${entry.n}: merged lines moved, ${left} line(s) in businesses without "${m.intoName}" still use it` }
      }
    }
    for (const id of writes.deletes) {
      await db.collection('products').updateMany({ $or: [{ _id: id }, { _masterId: id }] }, { $set: { deletedAt: now, deletedBy: ADDED_BY } })
    }
    writeJson(workPath('stage-c-ledger.json'), { writtenAt: new Date().toISOString(), entries })
    const byIdEntry = new Map(entries.filter(e => e.ledger).map(e => [e.id, e.ledger]))
    // (rescue entries have no ledger: the stage B entry stays)
    const gone = new Set(entries.filter(e => ['gone', 'delete', 'merge'].includes(e.action)).map(e => e.id))
    ledger.products = ledger.products.filter(l => !gone.has(l.id)).map(l => byIdEntry.get(l.id) ?? l)
    ledger.renamedEver = [...new Set([...(ledger.renamedEver ?? []), ...renameTargets.map(t => t.id)])].sort()
    ledger.stageCWrittenAt = new Date().toISOString()
    writeJson(workPath('ledger.json'), ledger)
    console.log(`[write] ${changed.length} product(s), ${writes.deletes.length} delete(s), ${mergePlan.filter(m => entries.find(e => e.id === m.from).merged).length} merge(s); stage-c-ledger.json written`)
  } finally {
    await client.close()
  }
}

runMain(main)
