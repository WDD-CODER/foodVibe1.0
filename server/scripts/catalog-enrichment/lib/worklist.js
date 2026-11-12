'use strict'
/**
 * Plan 583 stage C (Human 2026-11-12): the sections of Dan's action plan and the pure rules that turn a worklist row
 * plus its judgment answer into one action.
 */

const { withoutVat, median, round6 } = require('./pricing')

const SECTION_TITLES = {
  1: 'Unit does not fit — switch the unit', 2: 'New name already taken — likely duplicate, merge or pick a name',
  3: 'Only one chain sells it — price from that chain?', 4: 'Prices too far apart — pick the right price',
  5: 'Unclear product — rename or delete', 6: 'Not bought from a chain (water, ice…) — price 0 or leave',
  7: 'Kitchen preparation — make it a recipe or price via the raw product',
  8: 'Packaging / non-food — supplier price by hand or delete', 9: 'Professional brand no chain sells — supplier price by hand',
  10: 'Chains sell it but my search missed it — re-match', 11: 'Not sold by the chains — supplier price by hand or replace'
}

/** Section of a stage B decision that is not renamed (the order of the tests matters). */
function sectionOf(d) {
  const r = String(d.reason ?? '').toLowerCase()
  if (d.outcome === 'manual') {
    if (/size|unit|bunch|per unit|pack|weight|sold per|does not fit|piece|head|count/.test(r)) return 1
    if (/already another|duplicate/.test(r)) return 2
    if (/differ|implaus/.test(r)) return 4
    return 3
  }
  if (/unclear|test|vague|cut off|truncat/.test(r)) return 5
  if (/prepar|cooked|soaked|zest|baked|kitchen|leftover|bouquet/.test(r)) return 7
  if (/not bought|water|ice|nitrogen|napkin/.test(r)) return 6
  if (/packag|container|disposable|cleaning|tablet|chemical|wooden|cups|mould|mold|charger|bag size/.test(r)) return 8
  if (/brand|professional/.test(r)) return 9
  if (/not among candidates|no candidates|only (canned|a mixed|mixed|red|regular)/.test(r)) return 10
  return 11
}

/** Section 1 "Switch to": a `unit` product sold by weight → gram; a weighed product sold per bunch/piece → unit. */
function suggestUnit(d) {
  const items = d.items ?? []
  const nulls = items.filter(x => x.item.ppb === null).length
  if (d.baseUnit === 'unit') return 'gram (sold by weight)'
  const text = `${d.reason ?? ''} ${items.map(x => x.item.name).join(' ')}`
  if (/bunch|צרור|per unit|count|head|ראש/.test(text) || (items.length && nulls >= items.length / 2)) return 'unit (bunch / piece / egg)'
  return '?'
}

const SECTION_3_UNDONE = new Set(['3.33', '3.49', '3.53', '3.79'])
const SECTION_5_DELETE = new Set(['5.32', '5.33', '5.34', '5.36', '5.37', '5.39', '5.41'])

/** Price per base unit of one chain: the median of the accepted items' per-base-unit prices, without VAT. */
function chainPrice(items, vatExempt) {
  const v = items.map(i => i.ppb).filter(x => typeof x === 'number' && x > 0)
  return v.length ? round6(withoutVat(median(v), vatExempt)) : null
}

/**
 * Rule-only sections (3, 4, 5, 6, 7, 8, 9, 11) → an action. Sections 1, 2 and 10 need a judgment answer.
 * @returns {{ type: string, ... }}
 */
function ruleAction(row) {
  const s = row.section
  if (s === 3) {
    if (SECTION_3_UNDONE.has(row.n)) return { type: 'undone', why: 'Dan picks the variant' }
    const byChain = new Map()
    for (const it of row.items) byChain.set(it.chain, [...(byChain.get(it.chain) ?? []), it])
    const chains = [...byChain.entries()].map(([chain, items]) => ({ chain, price: chainPrice(items, row.vatExempt), codes: items.map(i => i.code) }))
      .filter(c => c.price !== null)
    if (!chains.length) return { type: 'undone', why: 'no item with a price per base unit' }
    return { type: 'price', chains, singleChain: true }
  }
  if (s === 4 || s === 7) return { type: 'undone', why: s === 4 ? 'Dan picks the realistic price' : 'Dan maps it to its raw product or a sub-recipe' }
  if (s === 5) return SECTION_5_DELETE.has(row.n) ? { type: 'delete', why: 'test entry' } : { type: 'undone', why: 'Dan renames or deletes it' }
  if (s === 6) return { type: 'zeroCost', why: 'not bought from a chain' }
  if (s === 8 || s === 9 || s === 11) return { type: 'manualSupplier', why: 'manual supplier pricing' }
  return null
}

/**
 * Sections 1, 2 and 10: a judgment answer → an action. `findItem(chain, code)` returns the chain item (or the row's
 * own candidate) so prices are always computed from the price files, never from the answer.
 */
function answerAction(row, answer, findItem) {
  if (!answer) return { type: 'undone', why: 'no judgment answer' }
  const why = String(answer.why ?? '')
  if (answer.action === 'undone') return { type: 'undone', why: why || 'judged undone' }
  if (row.section === 1 && answer.action === 'switch') {
    const unit = answer.newBaseUnit
    if (unit !== 'unit' && unit !== 'gram') return { type: 'undone', why: `unsupported unit ${unit}` }
    const per = []
    for (const a of answer.items ?? []) {
      const it = findItem(a.chain, a.code)
      const count = unit === 'unit' ? Number(a.pieces) : Number(a.grams)
      if (!it || !(it.price > 0 || it.shelf > 0) || !(count > 0)) continue
      const shelf = it.price ?? it.shelf
      per.push({ chain: a.chain, code: a.code, ppb: shelf / count })
    }
    const chains = groupChains(per, answer.vatExempt === true)
    if (!chains.length) return { type: 'undone', why: 'no priced item for the new unit' }
    const weight = Number(unit === 'unit' ? answer.gramsPerUnit : answer.gramsPerPiece)
    return { type: 'switchUnit', newBaseUnit: unit, chains, weight: weight > 0 ? weight : null, weightFrom: answer.weightFrom ?? null,
      allergens: answer.allergens ?? {}, vatExempt: answer.vatExempt === true }
  }
  if (row.section === 2 && answer.action === 'merge') return { type: 'merge', why }
  if (row.section === 2 && answer.action === 'rename') {
    const chains = groupChains(row.items.filter(i => typeof i.ppb === 'number').map(i => ({ chain: i.chain, code: i.code, ppb: i.ppb })), row.vatExempt === true)
    if (!chains.length || !String(answer.newName ?? '').trim()) return { type: 'undone', why: 'rename without a price or a name' }
    return { type: 'price', chains, newName: String(answer.newName).trim().replace(/\s+/g, ' '), allergens: answer.allergens ?? null }
  }
  if (row.section === 10 && answer.action === 'link') {
    return { type: 'link', items: (answer.items ?? []).filter(a => a.chain && a.code), vatExempt: answer.vatExempt === true, allergens: answer.allergens ?? {} }
  }
  return { type: 'undone', why: `unexpected answer ${answer.action}` }
}

/** Per-item prices (VAT included) → per-chain medians without VAT. */
function groupChains(per, vatExempt) {
  const byChain = new Map()
  for (const p of per) byChain.set(p.chain, [...(byChain.get(p.chain) ?? []), p])
  return [...byChain.entries()].map(([chain, list]) => ({
    chain, codes: list.map(x => x.code), price: round6(withoutVat(median(list.map(x => x.ppb)), vatExempt))
  })).filter(c => c.price > 0)
}

/**
 * Section 1: the purchase options a unit switch needs so the recipe lines in the other unit family keep converting.
 * New base `unit` + lines in gram/kg/ml/liter → options per gram/kg/ml/liter from grams per unit (1 ml ≈ 1 g);
 * new base `gram` + lines in `unit` → an option `unit` = grams per piece. Returns null when a needed weight is missing.
 */
function unitOptions(newBaseUnit, lineUnits, weight) {
  const used = Object.keys(lineUnits ?? {})
  const perGram = { gram: 1, kg: 1000, ml: 1, liter: 1000 }
  if (newBaseUnit === 'unit') {
    const need = used.filter(u => u in perGram)
    if (!need.length) return []
    if (!(weight > 0)) return null
    return need.map(u => ({ unitSymbol: u, conversionRate: round6(perGram[u] / weight) }))
  }
  if (newBaseUnit === 'gram') {
    if (!used.includes('unit')) return []
    if (!(weight > 0)) return null
    return [{ unitSymbol: 'unit', conversionRate: weight }]
  }
  return null
}

/**
 * Section 1 with Dan's numbers (chat 2026-11-12): `weight` grams per one piece / bunch / pack, `packCount` pieces in a
 * pack the chain lists as one unit. Each accepted item's pack is read from the chain data; the new unit is the
 * row's `Switch to`. Returns a switchUnit action, or null when no item can be priced.
 */
function danSwitch(row, weight, packCount, fullItem) {
  const { unitOf } = require('./pricing')
  const newBaseUnit = String(row.switchTo ?? '').startsWith('gram') || (String(row.switchTo).startsWith('?') && row.baseUnit === 'unit') ? 'gram' : 'unit'
  const per = []
  for (const it of row.items) {
    const full = fullItem(it.chain, it.code) ?? {}
    const shelf = full.price ?? it.shelf
    if (!(shelf > 0)) continue
    const u = full.isWeighted ? ['mass', 1000] : unitOf(full.unit)
    const q = full.isWeighted ? 1 : Number(full.quantity)
    let grams = null
    let pieces = null
    // A count pack listed as "1 unit" often says its count in the name ("ביצים ארוזות 18יח").
    const named = Number((/(\d+)\s*יח/.exec(full.name ?? it.name) ?? [])[1])
    if (u && u[0] !== 'count' && q > 0) grams = q * u[1]
    else if (u && u[0] === 'count' && q > 1) pieces = q
    else if (named > 1) pieces = named
    else if (packCount) pieces = packCount
    else if (u && u[0] === 'count') pieces = 1
    else if (newBaseUnit === 'unit') pieces = 1 // an unstated pack of a bunch/piece product: one bunch or piece
    else continue // an unstated pack cannot give grams
    if (newBaseUnit === 'unit') {
      const n = pieces ?? grams / weight
      if (n > 0) per.push({ chain: it.chain, code: it.code, ppb: shelf / n })
    } else {
      const g = grams ?? pieces * weight
      if (g > 0) per.push({ chain: it.chain, code: it.code, ppb: shelf / g })
    }
  }
  const chains = groupChains(per, row.vatExempt === true)
  if (!chains.length) return null
  return { type: 'switchUnit', newBaseUnit, chains, weight, weightFrom: 'Dan 2026-11-12', allergens: row.allergens ?? [], vatExempt: row.vatExempt === true }
}

/**
 * Dan's product fixes (chat 2026-11-12, after the recipe-line unit check): `baseUnit` sets the base unit (the stored
 * price already means that unit), `options` adds or replaces purchase options by unit symbol, `noPrice` sets every
 * source price to 0. Pure and idempotent.
 */
function applyProductFix(doc, fix) {
  let out = { ...doc }
  if (fix.baseUnit) out.baseUnit = fix.baseUnit
  if (Array.isArray(fix.options) && fix.options.length) {
    const symbols = new Set(fix.options.map(o => o.unitSymbol))
    out.purchaseOptions = [...(out.purchaseOptions ?? []).filter(o => !symbols.has(o.unitSymbol)), ...fix.options.map(o => ({ ...o }))]
  }
  if (fix.noPrice) out.sources = (out.sources ?? []).map(s => ({ ...s, price: 0 }))
  return out
}

/** Purchase options without the ones a product fix adds (so a stage C re-run still recognises its own options). */
function withoutFixOptions(options, fix) {
  const symbols = new Set((fix?.options ?? []).map(o => o.unitSymbol))
  return (options ?? []).filter(o => !symbols.has(o.unitSymbol))
}

module.exports = {
  danSwitch, applyProductFix, withoutFixOptions,
  SECTION_TITLES, sectionOf, suggestUnit, ruleAction, answerAction, unitOptions, groupChains, chainPrice,
  SECTION_3_UNDONE, SECTION_5_DELETE
}
