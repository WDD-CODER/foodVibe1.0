'use strict'
/**
 * Plan 583: one product's judgment answer → its decision (pure).
 */

const { withoutVat, median, inBand, perKgLiterOrUnit, round6 } = require('./pricing')

const MAX_RATIO = 2.5
const MIN_CHAINS = 3

/**
 * Drops the chain farthest (in log scale) from the median while the highest price is more than MAX_RATIO × the
 * lowest and at least MIN_CHAINS would remain.
 */
function dropOutliers(prices) {
  let list = [...prices]
  const dropped = []
  const far = []
  while (list.length >= MIN_CHAINS) {
    const values = list.map(c => c.price)
    if (Math.max(...values) / Math.min(...values) <= MAX_RATIO) break
    const mid = median(values)
    list.sort((a, b) => Math.abs(Math.log(b.price / mid)) - Math.abs(Math.log(a.price / mid)))
    const out = list.shift()
    dropped.push(out.chain)
    far.push(out)
  }
  return { list, dropped, far }
}

/**
 * @param {{ id, name, baseUnit, chains: Record<string, Array<{ code, name, ppb }>> }} product candidates entry
 * @param {{ accept?: Record<string, number[]>, vatExempt?: boolean, allergens?: Record<string, string>, note?: string }} answer
 * @param {Set<string>} allowedAllergens
 */
function decideProduct(product, answer, allowedAllergens) {
  const vatExempt = answer.vatExempt === true
  const chains = []
  const rejected = []
  for (const [chain, nums] of Object.entries(answer.accept ?? {})) {
    const cands = product.chains[chain] ?? []
    const items = (Array.isArray(nums) ? nums : []).map(n => cands[n - 1]).filter(i => i && typeof i.ppb === 'number')
    if (!items.length) continue
    const price = round6(withoutVat(median(items.map(i => i.ppb)), vatExempt))
    const entry = { chain, codes: items.map(i => i.code), names: items.map(i => i.name), price }
    if (!inBand(perKgLiterOrUnit(price, product.baseUnit), product.baseUnit)) rejected.push({ ...entry, why: 'outside band' })
    else chains.push(entry)
  }
  const { list, dropped, far } = dropOutliers(chains)
  const allergens = Object.entries(answer.allergens ?? {})
    .filter(([k]) => allowedAllergens.has(k))
    .map(([key, reason]) => ({ key, reason: String(reason ?? '') }))
  const base = { id: product.id, name: product.name, baseUnit: product.baseUnit, vatExempt, allergens, file: answer.file }
  if (list.length >= MIN_CHAINS) {
    // Dan 2026-11-12: a chain far from the others is still kept as its own supplier and listed as "far" in the report.
    return { ...base, outcome: 'priced', chains: [...list, ...far].sort((a, b) => a.price - b.price), far: far.map(c => c.chain), dropped, rejected }
  }
  const reason = answer.note
    || (chains.length + rejected.length === 0 ? 'no chain item matched'
      : dropped.length ? `chain prices differ more than ${MAX_RATIO}x` : `matched in only ${list.length} chain(s)`)
  return { ...base, outcome: 'unresolved', reason, chains: list, dropped, rejected }
}

const RESCUE_MIN_CHAINS = 2
/** A pack size in a name ("250 גרם", "1 ליטר", "6 יח"); a fat % such as "32%" is fine. */
const PACK_SIZE = /\d+(?:[.,]\d+)?\s*(?:גרם|גר'|גר|ג'|ק"ג|ק״ג|קג|קילו|מ"ל|מ״ל|מל|ליטר|ל'|יח'|יח|יחידות|x|X)(?![א-ת])/

/**
 * Stage B (Human 2026-11-12): a rescue answer → `renamed` (2+ chains, same price rules, a clean new name that is
 * free), `manual` (the right items exist but cannot be priced automatically — for the hand-fix list) or `unresolved`.
 * @param {Set<string>} takenNames normalized names of every other master product
 */
function decideRescue(product, answer, allowedAllergens, takenNames, normalize) {
  const decided = decideProduct(product, answer, allowedAllergens)
  const listed = Object.entries(answer.accept ?? {}).flatMap(([chain, nums]) =>
    (Array.isArray(nums) ? nums : []).map(n => ({ chain, item: (product.chains[chain] ?? [])[n - 1] })).filter(x => x.item))
  const base = {
    id: product.id, name: product.name, baseUnit: product.baseUnit, usage: product.usage, vatExempt: decided.vatExempt,
    allergens: decided.allergens, file: answer.file, note: String(answer.note ?? ''), items: listed
  }
  if (answer.outcome === 'unresolved' || (!listed.length && answer.outcome !== 'manual')) {
    return { ...base, outcome: 'unresolved', reason: base.note || 'no usable substitute' }
  }
  const newName = String(answer.newName ?? '').trim().replace(/\s+/g, ' ')
  const manual = why => ({ ...base, outcome: 'manual', reason: why })
  if (answer.outcome === 'manual') return manual(base.note || 'needs a hand fix')
  if (!newName) return manual('no new name given')
  if (PACK_SIZE.test(newName)) return manual(`new name "${newName}" contains a pack size`)
  if (normalize(newName) !== normalize(product.name) && takenNames.has(normalize(newName))) {
    return manual(`new name "${newName}" is already another product's name (likely duplicate)`)
  }
  const chains = decided.chains
  // dropOutliers only works down to 3 chains, so two chains far apart are checked here.
  const prices = chains.map(c => c.price)
  // Dan 2026-11-12: two chains far apart are both kept as suppliers; the product is listed as "far apart".
  // Only for exactly two chains: with 3+ chains dropOutliers already named the far one(s) in decided.far.
  const farApart = chains.length === RESCUE_MIN_CHAINS && Math.max(...prices) / Math.min(...prices) > MAX_RATIO
  if (chains.length < RESCUE_MIN_CHAINS) {
    const why = decided.dropped.length ? `chain prices differ more than ${MAX_RATIO}x` : `only ${chains.length} chain(s) priced`
    return manual(why)
  }
  return { ...base, outcome: 'renamed', newName, chains: [...chains].sort((a, b) => a.price - b.price), far: farApart ? chains.map(c => c.chain) : (decided.far ?? []), dropped: decided.dropped, rejected: decided.rejected }
}

module.exports = { decideProduct, decideRescue, dropOutliers, MAX_RATIO, MIN_CHAINS, RESCUE_MIN_CHAINS }
