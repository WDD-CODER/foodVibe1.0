'use strict'
/**
 * Plan 583 A5: per master product, the 5 best-scoring items of each chain with their price per base unit
 * (shelf price, VAT included) → `<work>/candidates.json`, products ordered by recipe usage (most used first).
 * Read-only on the database.
 *
 *   node server/scripts/catalog-enrichment/build-candidates.js --target=local
 * Stage B (rescue): --only-unresolved --per-chain=8 --out=candidates-rescue.json — only the products decisions.json left
 * unresolved, with more items per chain.
 */

const fs = require('node:fs')
const { parseArgs, connectLocal, workPath, writeJson, readJson, runMain } = require('./lib/work-dir')
const { masterProducts } = require('./lib/catalog-data')
const { normalizeHebrewName, scoreMatch, tokens } = require('./lib/matching')
const { pricePerBaseUnit, round6 } = require('./lib/pricing')

const DEFAULT_PER_CHAIN = 5
const MIN_SCORE = 0.3

/** First three letters of a word: a cheap key that keeps Hebrew prefix/suffix variants together. */
const keysOf = word => {
  const w = word.length > 3 && 'הובלמשכ'.includes(word[0]) ? [word, word.slice(1)] : [word]
  return w.map(x => x.slice(0, 3))
}

function indexChain(items) {
  const unique = new Map()
  for (const it of items) if (!unique.has(it.code || it.name)) unique.set(it.code || it.name, it)
  const list = [...unique.values()]
  const index = new Map()
  list.forEach((it, i) => {
    for (const t of tokens(normalizeHebrewName(it.name, { manufacturer: it.manufacturer }))) {
      for (const k of keysOf(t)) {
        if (!index.has(k)) index.set(k, new Set())
        index.get(k).add(i)
      }
    }
  })
  return { list, index }
}

const sizeText = it => it.isWeighted ? 'weighted/kg' : `${it.quantity ?? '?'} ${it.unit || it.unitOfMeasure || ''}`.trim()

async function main() {
  const args = parseArgs(process.argv, ['only-unresolved', 'per-chain', 'out'])
  const PER_CHAIN = Number(args['per-chain'] ?? DEFAULT_PER_CHAIN)
  const outName = typeof args.out === 'string' ? args.out : 'candidates.json'
  const chainFiles = fs.readdirSync(workPath('chains')).filter(f => f.endsWith('.json') && f !== 'fetch-status.json')
  const chains = chainFiles.map(f => readJson(workPath('chains', f))).map(c => ({ ...c, ...indexChain(c.items) }))
  const inventory = readJson(workPath('inventory.json'))
  const { client, db } = await connectLocal(args.target)
  let products
  try {
    products = await masterProducts(db)
  } finally {
    await client.close()
  }
  if (args['only-unresolved']) {
    const { decisions } = readJson(workPath('decisions.json'))
    const open = new Set(decisions.filter(d => d.outcome !== 'priced').map(d => d.id))
    products = products.filter(p => open.has(p._id))
  }
  products.sort((a, b) => (inventory.usage[b._id] ?? 0) - (inventory.usage[a._id] ?? 0) || a._id.localeCompare(b._id))

  const out = []
  for (const p of products) {
    const pTokens = tokens(normalizeHebrewName(p.nameHebrew))
    const entry = {
      id: p._id, name: p.nameHebrew, baseUnit: p.baseUnit, categories: p.categories ?? [], allergens: p.allergens ?? [],
      usage: inventory.usage[p._id] ?? 0,
      currentPrice: Math.min(...(p.sources ?? []).map(s => s.price).filter(x => x > 0), Infinity),
      chains: {}
    }
    if (!Number.isFinite(entry.currentPrice)) entry.currentPrice = null
    for (const c of chains) {
      const seen = new Set()
      for (const t of pTokens) for (const k of keysOf(t)) for (const i of c.index.get(k) ?? []) seen.add(i)
      const scored = []
      for (const i of seen) {
        const it = c.list[i]
        const score = scoreMatch(p.nameHebrew, it.name)
        if (score < MIN_SCORE) continue
        const ppb = pricePerBaseUnit(it, p.baseUnit)
        // Stage B keeps items whose size does not fit the base unit: they feed the hand-fix list.
        if (ppb === null && !args['only-unresolved']) continue
        scored.push({ code: it.code, name: it.name, maker: it.manufacturer, size: sizeText(it), shelf: it.price, ppb: ppb === null ? null : round6(ppb), score })
      }
      scored.sort((a, b) => b.score - a.score || (a.ppb ?? Infinity) - (b.ppb ?? Infinity))
      entry.chains[c.chain] = scored.slice(0, PER_CHAIN)
    }
    out.push(entry)
  }
  const file = workPath(outName)
  writeJson(file, {
    builtAt: new Date().toISOString(),
    chains: chains.map(c => ({ chain: c.chain, chainNameHebrew: c.chainNameHebrew, storeId: c.storeId, fileName: c.fileName, fileDate: c.fileDate, items: c.list.length })),
    products: out
  })
  const withAny = out.filter(e => Object.values(e.chains).filter(v => v.length).length >= 3).length
  console.log(`products: ${out.length}; with candidates in 3+ chains: ${withAny}`)
  console.log(`written: ${file}`)
}

runMain(main)
