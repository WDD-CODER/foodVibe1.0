'use strict'
/** Plan 575 - the demo business: its data's shape and links, the money formula, the dashboard numbers, the second run, local only. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { buildDemoData } = require('../scripts/lib/demo-data')
const { parseArgs, seedDemoBusiness } = require('../scripts/seed-demo-business')
const { parseV2 } = require('../utils/schema-check')

let app

beforeAll(async () => {
  app = await buildTestApp()
  await require('../services/seed-master').seedMasterData()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const NOW = Date.UTC(2026, 10, 12, 9, 0, 0)
const data = buildDemoData({ now: NOW, ownerId: 'demo_owner', businessId: 'demo_business' })
const round2 = n => Math.round(n * 100) / 100
const COLLECTIONS = ['suppliers', 'products', 'recipes', 'dishes', 'venues', 'clients', 'menuEvents']
const HASH = 'a'.repeat(32) + ':' + 'b'.repeat(64)

describe('buildDemoData', () => {
  it.each(['2026-11-12T21:21:00Z', '2026-03-28T21:30:00Z', '2026-10-25T00:30:00Z'])('makes 21 different usage days, ending today in Jerusalem, at %s', iso => {
    const now = Date.parse(iso)
    const days = buildDemoData({ now, ownerId: 'demo_owner', businessId: 'demo_business' }).usageDays
    const dates = days.map(u => u.date)
    expect(days).toHaveLength(21)
    expect(new Set(dates).size).toBe(21)
    expect(dates[0]).toBe(require('../middleware/usage').jerusalemDate(now))
  })

  it('returns the planned counts and every document passes its schema', () => {
    expect(Object.fromEntries(Object.entries(data).filter(([k]) => k !== 'baseline').map(([k, v]) => [k, v.length]))).toEqual({
      suppliers: 4, products: 30, recipes: 6, dishes: 10, venues: 2, clients: 6, menuEvents: 7, usageDays: 21,
    })
    for (const name of COLLECTIONS) {
      for (const doc of data[name]) {
        const result = parseV2(name, doc)
        expect({ name, id: doc._id, issues: result.issues }).toEqual({ name, id: doc._id, issues: [] })
      }
    }
  })

  it('links products to suppliers and lines and events to seeded documents', () => {
    const ids = new Set([...data.suppliers, ...data.products, ...data.recipes, ...data.dishes].map(d => d._id))
    const suppliers = new Set(data.suppliers.map(s => s._id))
    for (const p of data.products) {
      expect(p.sources.length).toBeGreaterThanOrEqual(1)
      for (const s of p.sources) { expect(s.price).toBeGreaterThan(0); expect(suppliers.has(s.supplierId)).toBe(true) }
    }
    expect(data.products.filter(p => p.sources.length > 1).length).toBeGreaterThanOrEqual(3)
    expect(data.products.filter(p => p.purchaseOptions.length > 0).length).toBeGreaterThanOrEqual(4)
    expect(new Set(data.products.map(p => p.nameHebrew)).size).toBe(30)
    for (const r of [...data.recipes, ...data.dishes]) {
      expect(r.ingredients.length).toBeGreaterThanOrEqual(3)
      expect(r.ingredients.length).toBeLessThanOrEqual(7)
      for (const line of r.ingredients) expect(ids.has(line.referenceId)).toBe(true)
    }
    expect([...data.recipes, ...data.dishes].filter(r => r.isApproved)).toHaveLength(12)
    for (const e of data.menuEvents) {
      for (const section of e.sections) for (const item of section.items) expect(ids.has(item.recipeId)).toBe(true)
    }
  })

  it('gives the events their stages, money and closing', () => {
    expect(data.menuEvents.map(e => e.stage)).toEqual(['inquiry', 'quote_sent', 'deposit_paid', 'ordering', 'finished', 'finished', 'not_closed'])
    const dishCost = new Map()
    const productPrice = new Map(data.products.map(p => [p._id, Math.min(...p.sources.map(s => s.price))]))
    const recipeById = new Map([...data.recipes, ...data.dishes].map(r => [r._id, r]))
    const cost = (doc) => doc.ingredients.reduce((sum, l) => sum + (l.type === 'recipe'
      ? l.amount * cost(recipeById.get(l.referenceId)) / recipeById.get(l.referenceId).yieldAmount
      : l.amount * productPrice.get(l.referenceId)), 0)
    for (const e of data.menuEvents) {
      expect(e.guestCount).toBeGreaterThanOrEqual(40)
      expect(e.guestCount).toBeLessThanOrEqual(220)
      expect(e.sections.length).toBeGreaterThanOrEqual(2)
      const food = e.sections.flatMap(s => s.items).reduce((sum, i) => {
        if (!dishCost.has(i.recipeId)) dishCost.set(i.recipeId, cost(recipeById.get(i.recipeId)) / recipeById.get(i.recipeId).yieldAmount)
        return sum + i.derivedPortions * dishCost.get(i.recipeId)
      }, 0)
      const extra = e.extraCosts.amount
      const revenue = e.pricePerGuest * e.guestCount
      expect(e.pricing.foodCost).toBeCloseTo(food, 1)
      expect(e.pricing.revenue).toBeCloseTo(revenue, 2)
      expect(e.pricing.profit).toBeCloseTo(round2(revenue - e.pricing.foodCost - extra), 2)
      expect(e.pricing.profitPct).toBe(round2((e.pricing.profit / e.pricing.revenue) * 100))
      expect(e.pricing.profitPct).toBeGreaterThan(15)
      const age = (NOW - e.createdAt) / 86400000
      expect(age).toBeGreaterThanOrEqual(5)
      expect(age).toBeLessThanOrEqual(80)
    }
    const [, , deposit, ordering, doneA, doneB, lost] = data.menuEvents
    expect(deposit.eventDate).toBe('2026-11-17')
    expect(ordering.eventDate).toBe('2026-11-23')
    for (const e of [deposit, ordering, doneA, doneB]) expect(e.closedAt).toBeGreaterThan(0)
    expect(lost.notClosedReason).toBe('price')
    expect(lost.notClosedAt).toBeGreaterThan(0)
    for (const e of [ordering, doneA, doneB]) expect(e.planSnapshot.plannedRevenue).toBe(e.pricing.revenue)
    for (const e of [doneA, doneB]) {
      expect(e.closing.finishedAt).toBeGreaterThan(0)
      expect(e.closing.actualRevenue).toBe(e.planSnapshot.plannedRevenue)
    }
    const spent = e => e.closing.suppliers.reduce((s, r) => s + r.actualPaid, 0) / e.closing.suppliers.reduce((s, r) => s + r.planned, 0)
    expect(spent(doneA)).toBeCloseTo(0.96, 2)
    expect(spent(doneB)).toBeCloseTo(1.09, 2)
  })
})

describe('seedDemoBusiness', () => {
  const quiet = () => vi.spyOn(console, 'log').mockImplementation(() => {})

  it('writes nothing without write', async () => {
    const log = quiet()
    const result = await seedDemoBusiness(testDb(), { write: false, now: Date.now() })
    log.mockRestore()
    expect(result.inserted).toBe(0)
    expect(await testDb().collection('menuEvents').countDocuments({ businessId: 'demo_business' })).toBe(0)
    expect(await testDb().collection('users').countDocuments({ _id: 'demo_owner' })).toBe(0)
  })

  it('inserts the business once, feeds the dashboard, and a second run adds nothing', async () => {
    const log = quiet()
    const first = await seedDemoBusiness(testDb(), { write: true, now: Date.now(), passwordHash: HASH })
    expect(first.inserted).toBe(4 + 30 + 6 + 10 + 2 + 6 + 7 + 21 + 2)
    expect((await testDb().collection('businesses').findOne({ _id: 'demo_business' })).internal).toBe(true)
    const owner = await testDb().collection('users').findOne({ _id: 'demo_owner' })
    expect(owner).toMatchObject({ name: 'demo_chef', email: 'demo@foodco.invalid', businessId: 'demo_business', businessRole: 'owner' })

    const token = signTestToken({ userId: 'demo_owner', businessId: 'demo_business', businessRole: 'owner' })
    const res = await request(app).get('/api/v1/stats/business?period=all').set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.cards.inquiries.value).toBe(7)
    expect(res.body.cards.closed.value).toBe(4)

    log.mockClear()
    const second = await seedDemoBusiness(testDb(), { write: true, now: Date.now(), passwordHash: HASH })
    expect(second.inserted).toBe(0)
    expect(log.mock.calls.map(c => c[0])).toContain('already seeded')
    expect(await testDb().collection('products').countDocuments({ businessId: 'demo_business' })).toBe(30)
    log.mockRestore()
  })
})

describe('parseArgs', () => {
  it('is local only', () => {
    expect(parseArgs(['node', 's', '--target=local', '--db=scratch_demo', '--write'])).toEqual({ write: true, target: 'local', db: 'scratch_demo' })
    expect(() => parseArgs(['node', 's', '--target=atlas'])).toThrow('demo seed is local only')
    expect(() => parseArgs(['node', 's', '--target=local', '--confirm-host=x'])).toThrow('demo seed is local only')
    expect(() => parseArgs(['node', 's', '--target=local', '--nope'])).toThrow('Unknown argument')
  })
})
