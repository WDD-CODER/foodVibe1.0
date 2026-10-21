import { computeEventPricing, toPricingCache, toPricingEvent, type PricingEvent } from './event-pricing'
import { formatMoney, formatPct1 } from './rounding'
import type { MenuEvent } from '@models/menu-event.model'

const plan = { eventFoodCost: 4000, partial: false }
const settings = { profitTargetPct: 25, safetyMarginPct: 10 }
const event = (extra: Partial<PricingEvent> = {}): PricingEvent => ({
  guestCount: 50,
  extraCosts: { amount: 1000 },
  items: [],
  ...extra
})

describe('computeEventPricing (spec 03.2)', () => {
  it('price 200: meets the target', () => {
    const r = computeEventPricing(plan, event({ pricePerGuest: 200 }), settings)
    expect(r.revenue).toBe(10000)
    expect(r.profit).toBe(5000)
    expect(r.profitPct).toBe(50)
    expect(r.profitPerGuest).toBe(100)
    expect(r.meetsTarget).toBe(true)
    expect(formatMoney(r.minPricePerGuest)).toBe('₪133.33')
    expect(r.safetyMarginAmount).toBe(1000)
    expect(r.revenueIsComputed).toBe(false)
    expect(r.shortfallPerGuest).toBe(0)
  })

  it('price 120: falls short', () => {
    const r = computeEventPricing(plan, event({ pricePerGuest: 120 }), settings)
    expect(r.revenue).toBe(6000)
    expect(r.profit).toBe(1000)
    expect(formatPct1(r.profitPct as number)).toBe('16.7%')
    expect(r.meetsTarget).toBe(false)
    expect(formatMoney(r.shortfallPerGuest)).toBe('₪13.33')
  })

  it('an event target of 15 turns the verdict green and leaves the settings alone', () => {
    const own = { ...settings }
    const r = computeEventPricing(plan, event({ pricePerGuest: 120, targetsOverride: { profitTargetPct: 15 } }), own)
    expect(r.meetsTarget).toBe(true)
    expect(own.profitTargetPct).toBe(25)
  })

  it('empty price: revenue is the sum of sell price times portions', () => {
    const r = computeEventPricing(
      plan,
      event({
        items: [
          { sellPrice: 50, portions: 100 },
          { sellPrice: 20, portions: 50 }
        ]
      }),
      settings
    )
    expect(r.revenue).toBe(6000)
    expect(r.revenueIsComputed).toBe(true)
    expect(r.pricePerGuest).toBe(120)
  })

  it('price 0: revenue 0 and no profit %', () => {
    const r = computeEventPricing(plan, event({ pricePerGuest: 0 }), settings)
    expect(r.revenue).toBe(0)
    expect(r.profitPct).toBeNull()
    expect(r.meetsTarget).toBe(false)
  })

  it('carries a partial plan', () => {
    const r = computeEventPricing({ eventFoodCost: 4000, partial: true }, event({ pricePerGuest: 200 }), settings)
    expect(r.partial).toBe(true)
  })

  it('no guests: per-guest numbers are 0', () => {
    const r = computeEventPricing(plan, event({ guestCount: 0, pricePerGuest: 200 }), settings)
    expect(r.pricePerGuest).toBe(0)
    expect(r.minPricePerGuest).toBe(0)
    expect(r.profitPerGuest).toBe(0)
  })
})

describe('toPricingEvent / toPricingCache', () => {
  it('maps items by section id and index', () => {
    const e = {
      guestCount: 10,
      pricePerGuest: 90,
      sections: [
        {
          _id: 's1',
          name: '',
          sortOrder: 1,
          items: [
            { recipeId: 'a', recipeType: 'dish', derivedPortions: 0, sellPrice: 12 },
            { recipeId: 'b', recipeType: 'dish', derivedPortions: 0 }
          ]
        }
      ]
    } as MenuEvent
    const out = toPricingEvent(e, new Map([['s1|0', { portions: 7 }]]))
    expect(out.pricePerGuest).toBe(90)
    expect(out.items).toEqual([
      { sellPrice: 12, portions: 7 },
      { sellPrice: undefined, portions: 0 }
    ])
  })

  it('cache holds exactly the stored fields', () => {
    const r = computeEventPricing(plan, event({ pricePerGuest: 200 }), settings)
    expect(toPricingCache(r, 99)).toEqual({
      foodCost: 4000,
      revenue: 10000,
      profit: 5000,
      profitPct: 50,
      partial: false,
      computedAt: 99
    })
  })
})
