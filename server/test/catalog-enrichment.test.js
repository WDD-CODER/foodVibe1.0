'use strict'
/**
 * Plan 583: the pure parts of server/scripts/catalog-enrichment (no database, no network).
 */

const fs = require('node:fs')
const path = require('node:path')
const zlib = require('node:zlib')
const { fileText, parsePriceXml } = require('../scripts/catalog-enrichment/lib/price-file')
const { pricePerBaseUnit, withoutVat, inBand, perKgLiterOrUnit, VAT_RATE } = require('../scripts/catalog-enrichment/lib/pricing')
const { normalizeHebrewName, scoreMatch } = require('../scripts/catalog-enrichment/lib/matching')
const { decideProduct, dropOutliers } = require('../scripts/catalog-enrichment/lib/decide')
const { buildDocs, sameContent } = require('../scripts/catalog-enrichment/lib/build-docs')
const { checkCatalog } = require('../scripts/catalog-enrichment/verify-enrichment')
const { assertLocal, LOCAL_ONLY } = require('../scripts/catalog-enrichment/lib/work-dir')

const xml = fs.readFileSync(path.join(__dirname, 'fixtures/catalog-enrichment/price-full.xml'))
const { items } = parsePriceXml(fileText(zlib.gzipSync(xml)))
const item = name => items.find(i => i.name.startsWith(name))

describe('price file', () => {
  it('reads gzip with a BOM, decodes entities and records every item', () => {
    expect(items).toHaveLength(5)
    expect(item('ביצים').manufacturer).toBe('יש מאיר & בנו')
    expect(item('עגבניות').isWeighted).toBe(true)
  })
})

describe('pricePerBaseUnit', () => {
  it('prices a liter pack per ml and per liter', () => {
    expect(pricePerBaseUnit(item('חלב'), 'ml')).toBeCloseTo(0.00712, 6)
    expect(pricePerBaseUnit(item('חלב'), 'liter')).toBeCloseTo(7.12, 6)
  })
  it('prices a weighted item per kilogram', () => {
    expect(pricePerBaseUnit(item('עגבניות'), 'kg')).toBeCloseTo(8.9, 6)
    expect(pricePerBaseUnit(item('עגבניות'), 'gram')).toBeCloseTo(0.0089, 6)
    expect(pricePerBaseUnit(item('עגבניות'), 'unit')).toBeNull()
  })
  it('divides a 6-pack per unit', () => {
    expect(pricePerBaseUnit(item('ביצים'), 'unit')).toBeCloseTo(1.5, 6)
  })
  it('falls back to the 100 g price when the pack size is missing', () => {
    expect(pricePerBaseUnit(item('שוקולד'), 'gram')).toBeCloseTo(0.069, 6)
  })
  it('returns null when the size cannot be read', () => {
    expect(pricePerBaseUnit(item('מגבות'), 'unit')).toBeNull()
  })
})

describe('VAT and band', () => {
  it('removes VAT unless the product is exempt', () => {
    expect(withoutVat(11.8, false)).toBeCloseTo(11.8 / (1 + VAT_RATE), 6)
    expect(withoutVat(8.9, true)).toBe(8.9)
  })
  it('checks per kg / liter and per unit bands', () => {
    expect(inBand(perKgLiterOrUnit(0.0089, 'gram'), 'gram')).toBe(true)
    expect(inBand(perKgLiterOrUnit(5, 'gram'), 'gram')).toBe(false)
    expect(inBand(0.01, 'unit')).toBe(false)
    expect(inBand(1.5, 'unit')).toBe(true)
  })
})

describe('names', () => {
  it('drops niqqud, sizes and brand words', () => {
    expect(normalizeHebrewName('גְּבִינָה לבנה 5% תנובה 250 גרם')).toBe('גבינה לבנה')
  })
  it('ranks the real item above one that only contains the word', () => {
    expect(scoreMatch('בצל צהוב', 'בצל צהוב ארוז')).toBeGreaterThan(scoreMatch('בצל צהוב', 'פרינגלס שמנת בצל'))
    expect(scoreMatch('עגבניה', 'עגבניות')).toBeGreaterThan(0.8)
    expect(scoreMatch('חלב', 'מגבות נייר')).toBe(0)
  })
})

const product = {
  id: 'p1', name: 'עגבניה', baseUnit: 'kg',
  chains: {
    a: [{ code: '1', name: 'עגבניות', ppb: 8.9 }],
    b: [{ code: '2', name: 'עגבניות', ppb: 9.9 }, { code: '3', name: 'עגבניות שרי', ppb: 14.9 }],
    c: [{ code: '4', name: 'עגבניות', ppb: 7.9 }],
    d: [{ code: '5', name: 'עגבניות', ppb: 59 }]
  }
}
const allowed = new Set(['gluten', 'milk_solids'])

describe('decideProduct', () => {
  it('prices from 3+ chains, median per chain, keeps the far chain and lists it (Dan 2026-11-12)', () => {
    const d = decideProduct(product, { accept: { a: [1], b: [1, 2], c: [1], d: [1] }, vatExempt: true }, allowed)
    expect(d.outcome).toBe('priced')
    expect(d.far).toEqual(['d'])
    expect(d.chains.map(c => c.chain)).toEqual(['c', 'a', 'b', 'd'])
    expect(d.chains.find(c => c.chain === 'b').price).toBeCloseTo(12.4, 6)
  })
  it('keeps a product unresolved with fewer than 3 chains, with a reason', () => {
    const d = decideProduct(product, { accept: { a: [1] }, note: 'only one chain' }, allowed)
    expect(d.outcome).toBe('unresolved')
    expect(d.reason).toBe('only one chain')
  })
  it('keeps only known allergen keys', () => {
    const d = decideProduct(product, { accept: {}, allergens: { gluten: 'x', mustard: 'y' } }, allowed)
    expect(d.allergens.map(a => a.key)).toEqual(['gluten'])
  })
  it('stops dropping at 3 chains', () => {
    expect(dropOutliers([{ chain: 'a', price: 1 }, { chain: 'b', price: 3 }]).dropped).toEqual([])
  })
})

describe('buildDocs', () => {
  const now = 1000
  const current = {
    products: [
      { _id: 'p1', nameHebrew: 'עגבניה', baseUnit: 'kg', sources: [{ supplierId: 'old', price: 0 }], allergens: ['gluten'], updatedAt: 1 },
      { _id: 'p2', nameHebrew: 'משהו', baseUnit: 'kg', sources: [], allergens: [], updatedAt: 1 }
    ],
    suppliers: [{ _id: 's-shuf', nameHebrew: 'שופרסל' }]
  }
  const merged = {
    chains: [{ chain: 'shufersal', chainNameHebrew: 'שופרסל' }, { chain: 'x', chainNameHebrew: 'איקס' }, { chain: 'y', chainNameHebrew: 'וואי' }],
    decisions: [{
      id: 'p1', name: 'עגבניה', outcome: 'priced', allergens: [],
      chains: [{ chain: 'shufersal', codes: ['1'], price: 8 }, { chain: 'x', codes: ['2'], price: 9 }, { chain: 'y', codes: ['3'], price: 10 }]
    }]
  }
  it('reuses a same-name supplier, creates the others, replaces the sources and lists every product', () => {
    const b = buildDocs(merged, current, now)
    expect(b.suppliers.reuse.shufersal).toBe('s-shuf')
    expect(b.suppliers.create.map(s => s._id)).toEqual(['chain-x', 'chain-y'])
    expect(b.products[0].after.sources.map(s => s.supplierId)).toEqual(['s-shuf', 'chain-x', 'chain-y'])
    expect(b.products[0].after.allergenSource).toBe('llm')
    expect(b.ledger.find(l => l.id === 'p2')).toMatchObject({ state: 'unresolved', reason: 'not judged' })
    expect(b.ledger.find(l => l.id === 'p1').oldAllergens).toEqual(['gluten'])
  })
  it('reports no change when run again on its own output', () => {
    const first = buildDocs(merged, current, now).products[0].after
    const again = buildDocs(merged, { ...current, products: [first, current.products[1]] }, now + 5).products[0]
    expect(sameContent(again.before, again.after)).toBe(true)
  })
})

describe('checkCatalog', () => {
  const sources = [{ supplierId: 's1', price: 0.01 }, { supplierId: 's2', price: 0.012 }, { supplierId: 's3', price: 0.011 }]
  const base = {
    products: [{ _id: 'p1', nameHebrew: 'קמח', baseUnit: 'gram', sources, allergens: ['gluten'] }],
    suppliers: [{ _id: 's1' }, { _id: 's2' }, { _id: 's3' }],
    allergenKeys: ['gluten'],
    ledger: { suppliers: { a: 's1', b: 's2', c: 's3' }, products: [{ id: 'p1', state: 'priced' }] },
    resolving: 10, baseline: 10,
    audits: { pilot: { agreement: 0.95 }, final: { agreement: 0.92 } },
    reportExists: true
  }
  it('returns the schema failures only for documents that do not parse', () => {
    // These bare fixtures are not full v2 documents, so only check 4 may fail.
    const fails = checkCatalog(base)
    expect(fails.every(f => f.startsWith('check 4 '))).toBe(true)
  })
  it('flags a product missing from the ledger, a low audit and a dropped line count', () => {
    const fails = checkCatalog({ ...base, ledger: { ...base.ledger, products: [] }, audits: { pilot: { agreement: 0.5 } }, resolving: 9 })
    expect(fails.some(f => f.startsWith('check 1 '))).toBe(true)
    expect(fails.filter(f => f.startsWith('check 8 '))).toHaveLength(2)
    expect(fails.some(f => f.startsWith('check 7 '))).toBe(true)
  })
  it('flags a priced product with prices too far apart', () => {
    const wide = [{ supplierId: 's1', price: 0.01 }, { supplierId: 's2', price: 0.03 }, { supplierId: 's3', price: 0.011 }]
    const fails = checkCatalog({ ...base, products: [{ ...base.products[0], sources: wide }] })
    expect(fails.some(f => f.startsWith('check 3 '))).toBe(true)
  })
})

describe('local only', () => {
  it('refuses any target but local', () => {
    expect(() => assertLocal('atlas')).toThrow(LOCAL_ONLY)
    expect(() => assertLocal(undefined)).toThrow(LOCAL_ONLY)
    expect(() => assertLocal('local')).not.toThrow()
  })
})

describe('stage B rescue (Human 2026-11-12)', () => {
  const { decideRescue } = require('../scripts/catalog-enrichment/lib/decide')
  const { applyRescue } = require('../scripts/catalog-enrichment/lib/build-docs')
  const { normalizeProductName } = require('../utils/price-list-import')
  const pepper = {
    id: 'w1', name: 'פלפל לבן', baseUnit: 'gram', usage: 9,
    chains: {
      a: [{ code: '1', name: 'פלפל לבן טחון', ppb: 0.1 }],
      b: [{ code: '2', name: 'פלפל לבן טחון', ppb: 0.12 }],
      c: [{ code: '3', name: 'לחמניות 6', ppb: null }]
    }
  }
  const rescue = (answer, taken = new Set()) => decideRescue(pepper, answer, new Set(['gluten']), taken, normalizeProductName)

  it('renames from 2 chains with a clean name', () => {
    const d = rescue({ outcome: 'rename', newName: 'פלפל לבן טחון', accept: { a: [1], b: [1] } })
    expect(d.outcome).toBe('renamed')
    expect(d.chains).toHaveLength(2)
  })
  it('sends one chain, a pack size in the name or a taken name to the hand-fix list', () => {
    expect(rescue({ outcome: 'rename', newName: 'פלפל לבן טחון', accept: { a: [1] } }).outcome).toBe('manual')
    expect(rescue({ outcome: 'rename', newName: 'פלפל לבן טחון 100 גרם', accept: { a: [1], b: [1] } }).outcome).toBe('manual')
    expect(rescue({ outcome: 'rename', newName: 'פלפל לבן טחון', accept: { a: [1], b: [1] } }, new Set(['פלפל לבן טחון'])).outcome).toBe('manual')
  })
  it('keeps an item whose size does not fit for the hand-fix list without pricing it', () => {
    const d = rescue({ outcome: 'manual', accept: { c: [1] }, note: 'sold as a pack' })
    expect(d.outcome).toBe('manual')
    expect(d.items[0].item.ppb).toBeNull()
  })
  it('allows a fat % in the new name', () => {
    const d = rescue({ outcome: 'rename', newName: 'פלפל לבן 5%', accept: { a: [1], b: [1] } })
    expect(d.outcome).toBe('renamed')
  })
  it('applies a rename: new name, sources and a renamed priced ledger entry', () => {
    const before = { _id: 'w1', nameHebrew: 'פלפל לבן', baseUnit: 'gram', sources: [], allergens: [], updatedAt: 1 }
    const built = { products: [], suppliers: { reuse: { a: 'sa', b: 'sb' } }, ledger: [{ id: 'w1', state: 'unresolved', reason: 'x' }] }
    const d = rescue({ outcome: 'rename', newName: 'פלפל לבן טחון', accept: { a: [1], b: [1] } })
    applyRescue(built, { decisions: [d] }, { products: [before] }, 5)
    expect(built.products[0].after.nameHebrew).toBe('פלפל לבן טחון')
    expect(built.products[0].after.sources.map(s => s.supplierId)).toEqual(['sa', 'sb'])
    expect(built.ledger[0]).toMatchObject({ state: 'priced', renamed: true, oldName: 'פלפל לבן' })
  })
})

describe('stage B rescue spread', () => {
  const { decideRescue } = require('../scripts/catalog-enrichment/lib/decide')
  const { normalizeProductName } = require('../utils/price-list-import')
  it('keeps two chains more than 2.5x apart and marks them far apart (Dan 2026-11-12)', () => {
    const lime = { id: 'l1', name: 'ליים', baseUnit: 'gram', usage: 1,
      chains: { a: [{ code: '1', name: 'ליים', ppb: 0.0109 }], b: [{ code: '2', name: 'ליים', ppb: 0.0469 }] } }
    const d = decideRescue(lime, { outcome: 'rename', newName: 'ליים', accept: { a: [1], b: [1] }, vatExempt: true }, new Set(), new Set(), normalizeProductName)
    expect(d.outcome).toBe('renamed')
    expect(d.far).toEqual(['a', 'b'])
  })
})

describe('stage C (Dan 2026-11-12)', () => {
  const { ruleAction, answerAction, unitOptions } = require('../scripts/catalog-enrichment/lib/worklist')
  const row = (section, n, extra = {}) => ({ section, n, id: 'x', items: [], vatExempt: false, allergens: [], lineUnits: {}, ...extra })
  it('follows the action plan for the rule-only sections', () => {
    expect(ruleAction(row(3, '3.33')).type).toBe('undone')
    expect(ruleAction(row(3, '3.1', { items: [{ chain: 'a', code: '1', ppb: 0.118 }] }))).toMatchObject({ type: 'price', singleChain: true })
    expect(ruleAction(row(4, '4.1')).type).toBe('undone')
    expect(ruleAction(row(5, '5.32')).type).toBe('delete')
    expect(ruleAction(row(5, '5.1')).type).toBe('undone')
    expect(ruleAction(row(6, '6.1')).type).toBe('zeroCost')
    expect(ruleAction(row(7, '7.1')).type).toBe('undone')
    for (const s of [8, 9, 11]) expect(ruleAction(row(s, `${s}.1`)).type).toBe('manualSupplier')
    expect(ruleAction(row(1, '1.1'))).toBeNull()
  })
  it('switches a bunch product to unit with a gram option from the weight in the data', () => {
    const r = row(1, '1.1', { lineUnits: { gram: 10, unit: 2 } })
    const act = answerAction(r, { action: 'switch', newBaseUnit: 'unit', items: [{ chain: 'a', code: '1', pieces: 1 }], gramsPerUnit: 70, vatExempt: true },
      () => ({ price: 3.9 }))
    expect(act).toMatchObject({ type: 'switchUnit', newBaseUnit: 'unit', weight: 70 })
    expect(act.chains[0].price).toBeCloseTo(3.9, 6)
    expect(unitOptions('unit', r.lineUnits, 70)).toEqual([{ unitSymbol: 'gram', conversionRate: 0.014286 }])
  })
  it('needs a weight when recipe lines use the other unit family', () => {
    expect(unitOptions('unit', { gram: 3 }, null)).toBeNull()
    expect(unitOptions('unit', { unit: 3 }, null)).toEqual([])
    expect(unitOptions('gram', { unit: 3 }, 5)).toEqual([{ unitSymbol: 'unit', conversionRate: 5 }])
  })
})

describe("Dan's product fixes (2026-11-12)", () => {
  const { applyProductFix, withoutFixOptions } = require('../scripts/catalog-enrichment/lib/worklist')
  const lettuce = { _id: 'x', baseUnit: 'gram', purchaseOptions: [{ unitSymbol: 'unit', conversionRate: 400 }], sources: [{ supplierId: 's', price: 0.04 }] }
  const leaf = { options: [{ unitSymbol: 'leaf', conversionRate: 30 }] }

  it('adds an option once, keeps the others, and is idempotent', () => {
    const once = applyProductFix(lettuce, leaf)
    expect(once.purchaseOptions).toEqual([{ unitSymbol: 'unit', conversionRate: 400 }, { unitSymbol: 'leaf', conversionRate: 30 }])
    expect(applyProductFix(once, leaf)).toEqual(once)
    expect(lettuce.purchaseOptions).toHaveLength(1)
  })

  it('sets the base unit and removes prices without dropping the supplier', () => {
    const out = applyProductFix(lettuce, { baseUnit: 'kg', noPrice: true })
    expect(out.baseUnit).toBe('kg')
    expect(out.sources).toEqual([{ supplierId: 's', price: 0 }])
  })

  it('strips the fix options so stage C still recognises its own', () => {
    expect(withoutFixOptions(applyProductFix(lettuce, leaf).purchaseOptions, leaf)).toEqual(lettuce.purchaseOptions)
    expect(withoutFixOptions(lettuce.purchaseOptions, undefined)).toEqual(lettuce.purchaseOptions)
  })
})

describe('review fixes (ship 2026-11-12)', () => {
  it('keeps a Hebrew word that starts like a unit after a number', () => {
    expect(normalizeHebrewName('3 מלפפונים')).toBe('מלפפונים')
    expect(normalizeHebrewName('5 לחמניות')).toBe('לחמניות')
    expect(normalizeHebrewName('100 גרעינים')).toBe('גרעינים')
    expect(normalizeHebrewName('עגבניות 250 גרם')).toBe('עגבניות')
    expect(normalizeHebrewName('Milk 1 ליטר')).toBe('milk')
  })

  it('names only the outlier as far when 3+ chains are priced (rescue)', () => {
    const { decideRescue } = require('../scripts/catalog-enrichment/lib/decide')
    const item = ppb => [{ code: String(ppb), name: 'x', ppb }]
    const product = { id: 'p', name: 'מוצר', baseUnit: 'gram', chains: { a: item(0.010), b: item(0.011), c: item(0.012), d: item(0.050) } }
    const answer = { outcome: 'renamed', newName: 'מוצר נקי', vatExempt: true, accept: { a: [1], b: [1], c: [1], d: [1] } }
    const r = decideRescue(product, answer, new Set(), new Set(), s => s)
    expect(r.outcome).toBe('renamed')
    expect(r.far).toEqual(['d'])
  })
})
