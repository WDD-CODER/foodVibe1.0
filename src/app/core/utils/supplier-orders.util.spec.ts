import { computeEventPlan } from '../engine/event-plan.engine'
import type { EventPlan, RawLine } from '../engine/event-plan.types'
import { FIXTURE_IDS as ID, FIXTURE_SUPPLIERS, buildFixtureInput } from '../engine/testing/event-plan.fixture'
import type { Supplier } from '@models/supplier.model'
import type { Product } from '@models/product.model'
import {
  buildAllOrdersMessage,
  buildOrderMessage,
  buildSupplierOrders,
  cheaperElsewhere,
  toWhatsAppPhone,
  type OrderHeader
} from './supplier-orders.util'

const RLM = '\u200F'

const TEXTS: Record<string, string> = {
  no_supplier: 'ללא ספק',
  order_msg_title: 'הזמנה – {business}',
  order_msg_event: 'לאירוע: {event}',
  order_msg_thanks: 'תודה!',
  unit_short_unit: "יח'",
  kg: 'ק"ג',
  gram: 'גרם',
  liter: 'ליטר',
  ml: 'מ"ל'
}
const t = (key: string): string => TEXTS[key] ?? key

const header: OrderHeader = { business: 'מטבח בדיקה', eventName: 'אירוע בדיקה', eventDate: '2026-11-20' }

function fixtureOrders(suppliers: Supplier[] = FIXTURE_SUPPLIERS) {
  const input = buildFixtureInput()
  const plan = computeEventPlan(input)
  const productsById = new Map(input.products.map((p) => [p._id, p]))
  const suppliersById = new Map(suppliers.map((s) => [s._id, s]))
  return { plan, orders: buildSupplierOrders(plan, productsById, suppliersById, t) }
}

function rawLine(partial: Partial<RawLine>): RawLine {
  return {
    productId: null,
    name: 'x',
    unit: 'kg',
    netQty: 1,
    buyQty: 1,
    supplierId: null,
    lineCost: null,
    dishIds: [],
    status: 'ok',
    ...partial
  }
}

describe('buildSupplierOrders (04.1 fixture)', () => {
  it('puts tomato and olive oil on the cheaper supplier and has no card for the dearer one', () => {
    const { orders } = fixtureOrders()
    const veg = orders.cards.find((c) => c.name === 'ירקן')
    expect(veg?.lines.map((l) => l.name)).toEqual(['עגבנייה', 'שמן זית'])
    expect(orders.cards.find((c) => c.name === 'ספק א')).toBeUndefined()
  })

  it('totals the supplier card', () => {
    const veg = fixtureOrders().orders.cards.find((c) => c.name === 'ירקן')
    expect(veg?.total).toBeCloseTo(157.75, 9)
    expect(veg?.partial).toBeFalse()
    expect(veg?.phone).toBe('052-7654321')
  })

  it('holds the unpriced lemon on the last "no supplier" card, marked partial', () => {
    const { cards } = fixtureOrders().orders
    const last = cards[cards.length - 1]
    expect(last.supplierId).toBeNull()
    expect(last.name).toBe('ללא ספק')
    expect(last.lines.map((l) => l.name)).toEqual(['לימון'])
    expect(last.partial).toBeTrue()
    expect(last.phone).toBeNull()
  })

  it('sums the cards to the event food cost', () => {
    const { plan, orders } = fixtureOrders()
    const sum = orders.cards.reduce((s, c) => s + c.total, 0)
    expect(sum).toBeCloseTo(plan.eventFoodCost, 9)
  })

  it('sends an unlinked, a no_conversion and a deleted line to review, never to a card', () => {
    const plan: EventPlan = {
      rawLines: [
        rawLine({ name: 'a', status: 'unlinked' }),
        rawLine({ name: 'b', status: 'no_conversion', supplierId: ID.supplierB }),
        rawLine({ name: 'c', status: 'deleted' }),
        rawLine({ name: 'd', supplierId: ID.supplierB, lineCost: 5 })
      ],
      prepLines: [],
      dishCosts: [],
      eventFoodCost: 5,
      partial: true,
      missing: [],
      errors: []
    }
    const orders = buildSupplierOrders(plan, new Map(), new Map(FIXTURE_SUPPLIERS.map((s) => [s._id, s])), t)
    expect(orders.review.map((l) => l.name)).toEqual(['a', 'b', 'c'])
    expect(orders.cards.length).toBe(1)
    expect(orders.cards[0].lines.map((l) => l.name)).toEqual(['d'])
  })

  it('uses phone2 when phone is empty, and a mobile phone2 over a landline phone', () => {
    const base = FIXTURE_SUPPLIERS[1]
    const empty = fixtureOrders([{ ...base, phone: '', phone2: '050-1112222' }]).orders.cards[0]
    expect(empty.phone).toBe('050-1112222')
    const landline = fixtureOrders([{ ...base, phone: '03-1234567', phone2: '050-1112222' }]).orders.cards[0]
    expect(landline.phone).toBe('050-1112222')
    const onlyLandline = fixtureOrders([{ ...base, phone: '03-1234567', phone2: undefined }]).orders.cards[0]
    expect(onlyLandline.phone).toBe('03-1234567')
  })

  it('treats a supplier id that no longer exists as "no supplier"', () => {
    const { orders } = fixtureOrders([])
    expect(orders.cards.length).toBe(1)
    expect(orders.cards[0].supplierId).toBeNull()
    expect(orders.cards[0].lines.length).toBe(3)
  })
})

describe('buildOrderMessage', () => {
  it('writes the exact message for the supplier card', () => {
    const veg = fixtureOrders().orders.cards.find((c) => c.name === 'ירקן')
    if (!veg) throw new Error('no card')
    expect(buildOrderMessage(header, veg, t)).toBe(
      `${RLM}הזמנה – מטבח בדיקה\n${RLM}לאירוע: אירוע בדיקה · 20.11.2026\n\n` +
        `${RLM}עגבנייה – 18.75 ק"ג (2 ארגז)\n${RLM}שמן זית – 1.6 ק"ג\n\n${RLM}תודה!`
    )
  })

  it('leaves the date out when the event has none', () => {
    const veg = fixtureOrders().orders.cards[0]
    const message = buildOrderMessage({ ...header, eventDate: undefined }, veg, t)
    expect(message.split('\n')[1]).toBe(`${RLM}לאירוע: אירוע בדיקה`)
  })

  it('uses the short unit word for a unit-based line', () => {
    const card = fixtureOrders().orders.cards[0]
    const line = rawLine({ name: 'ביצה', unit: 'unit', buyQty: 12.2 })
    const message = buildOrderMessage(header, { ...card, lines: [line] }, t)
    expect(message).toContain(`${RLM}ביצה – 13 יח'`)
  })
})

describe('buildAllOrdersMessage', () => {
  const { orders } = fixtureOrders()
  const message = buildAllOrdersMessage(header, orders.cards, t)

  it('writes the header, each supplier block separated by an empty line, then the thanks', () => {
    expect(message).toBe(
      `${RLM}הזמנה – מטבח בדיקה\n${RLM}לאירוע: אירוע בדיקה · 20.11.2026\n\n` +
        `${RLM}ירקן\n${RLM}עגבנייה – 18.75 ק"ג (2 ארגז)\n${RLM}שמן זית – 1.6 ק"ג\n\n` +
        `${RLM}ללא ספק\n${RLM}לימון – 0.4 ק"ג\n\n${RLM}תודה!`
    )
  })

  it('has the supplier first, "no supplier" last, and no empty line carrying an RLM', () => {
    expect(message.indexOf('ירקן')).toBeLessThan(message.indexOf('ללא ספק'))
    expect(message).not.toContain(`\n${RLM}\n`)
  })

  it('leaves the review lines out', () => {
    const plan: EventPlan = {
      rawLines: [
        rawLine({ name: 'נבדק', status: 'unlinked' }),
        rawLine({ name: 'd', supplierId: ID.supplierB, lineCost: 5 })
      ],
      prepLines: [],
      dishCosts: [],
      eventFoodCost: 5,
      partial: true,
      missing: [],
      errors: []
    }
    const built = buildSupplierOrders(plan, new Map(), new Map(FIXTURE_SUPPLIERS.map((s) => [s._id, s])), t)
    expect(built.review.length).toBe(1)
    expect(buildAllOrdersMessage(header, built.cards, t)).not.toContain('נבדק')
  })
})

describe('toWhatsAppPhone', () => {
  it('turns Israeli mobile numbers into WhatsApp numbers', () => {
    expect(toWhatsAppPhone('050-1234567')).toBe('972501234567')
    expect(toWhatsAppPhone('+972 52 765 4321')).toBe('972527654321')
  })

  it('rejects a landline, an empty and a missing number', () => {
    expect(toWhatsAppPhone('03-1234567')).toBeNull()
    expect(toWhatsAppPhone('')).toBeNull()
    expect(toWhatsAppPhone(undefined)).toBeNull()
  })
})

describe('cheaperElsewhere (plan 510)', () => {
  const suppliers: Supplier[] = [
    { _id: 'david', nameHebrew: 'דוד' } as Supplier,
    { _id: 'grocery', nameHebrew: 'מכולת' } as Supplier
  ]
  const suppliersById = new Map(suppliers.map((s) => [s._id, s]))
  const onion = {
    _id: 'onion',
    nameHebrew: 'בצל',
    baseUnit: 'kg',
    sources: [
      { supplierId: 'david', price: 4 },
      { supplierId: 'grocery', price: 5 }
    ],
    preferredSupplierId: 'grocery'
  } as Product
  const salt = {
    _id: 'salt',
    nameHebrew: 'מלח',
    baseUnit: 'kg',
    sources: [{ supplierId: 'grocery', price: 2 }]
  } as Product
  const productsById = new Map([onion, salt].map((p) => [p._id, p]))
  const plan = {
    rawLines: [
      rawLine({ productId: 'onion', name: 'בצל', buyQty: 3, supplierId: 'grocery', lineCost: 15 }),
      rawLine({ productId: 'salt', name: 'מלח', buyQty: 1, supplierId: 'grocery', lineCost: 2 })
    ]
  } as EventPlan

  it('gives the cheaper supplier, its price and the saving per line, and the card total', () => {
    const card = buildSupplierOrders(plan, productsById, suppliersById, t).cards[0]
    expect(card.name).toBe('מכולת')
    const savings = cheaperElsewhere(card, productsById, suppliersById)
    expect(card.lines.map((l) => l.name)).toEqual(['בצל', 'מלח'])
    expect(savings.lines).toEqual([{ supplierId: 'david', name: 'דוד', price: 4, saving: 3 }, null])
    expect(savings.total).toBe(3)
  })

  it('has no hint when the line is already bought at the cheapest supplier', () => {
    const cheap = { ...onion, preferredSupplierId: undefined }
    const byId = new Map([[cheap._id, cheap]])
    const davidPlan = {
      rawLines: [rawLine({ productId: 'onion', name: 'בצל', buyQty: 3, supplierId: 'david' })]
    } as EventPlan
    const card = buildSupplierOrders(davidPlan, byId, suppliersById, t).cards[0]
    expect(cheaperElsewhere(card, byId, suppliersById)).toEqual({ lines: [null], total: 0 })
  })

  it('ignores a cheaper supplier that no longer exists', () => {
    const onlyGrocery = new Map([['grocery', suppliersById.get('grocery') as Supplier]])
    const card = buildSupplierOrders(plan, productsById, onlyGrocery, t).cards[0]
    expect(cheaperElsewhere(card, productsById, onlyGrocery).total).toBe(0)
  })

  it('the engine puts a chosen supplier line on that supplier card', () => {
    const input = buildFixtureInput()
    const first = input.products.find((p) => (p.sources ?? []).filter((s) => s.price > 0 && s.supplierId).length > 1)
    expect(first).toBeDefined()
    const dear = [...(first as Product).sources]
      .filter((s) => s.supplierId && s.price > 0)
      .sort((a, b) => b.price - a.price)[0]
    const products = input.products.map((p) => (p === first ? { ...p, preferredSupplierId: dear.supplierId } : p))
    const plan2 = computeEventPlan({ ...input, products })
    const line = plan2.rawLines.find((l) => l.productId === (first as Product)._id)
    expect(line?.supplierId).toBe(dear.supplierId)
  })
})
