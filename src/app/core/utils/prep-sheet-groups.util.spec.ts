import { computeEventPlan } from '../engine/event-plan.engine'
import type { EventPlan, EventPlanInput, PrepLine } from '../engine/event-plan.types'
import { FIXTURE_IDS as ID, FIXTURE_SUPPLIERS, buildFixtureInput } from '../engine/testing/event-plan.fixture'
import type { Recipe } from '@models/recipe.model'
import {
  buildPrepSheetGroups,
  buildSupplierSheetGroups,
  prepSheetMetaLine,
  prepSheetTableRows
} from './prep-sheet-groups.util'
import { buildSupplierOrders } from './supplier-orders.util'

const TEXTS: Record<string, string> = {
  general_group: 'כללי',
  cold_prep: 'הכנות קרות',
  prep_sheets_no_preps: 'אין הכנות במנה זו',
  prep_sheets_col_prep: 'הכנה',
  prep_sheets_col_product: 'מוצר',
  prep_sheets_col_qty: 'כמות',
  prep_sheets_col_unit: 'יחידה',
  prep_sheets_col_note: 'הערה',
  prep_sheets_col_purchase: 'יחידות רכש',
  prep_sheets_for_dish: 'למנה',
  no_supplier: 'ללא ספק',
  unit_short_unit: 'יח׳',
  kg: 'ק"ג'
}
const t = (key: string): string => TEXTS[key] ?? key

function withStations(salad: string, pasta = '', sauce = ''): { input: EventPlanInput; plan: EventPlan } {
  const input = buildFixtureInput()
  const set = (id: string, station: string): void => {
    const r = input.recipes.find((x) => x._id === id) as Recipe
    r.defaultStation = station
  }
  set(ID.salad, salad)
  set(ID.pasta, pasta)
  set(ID.sauce, sauce)
  return { input, plan: computeEventPlan(input) }
}

function recipesById(input: EventPlanInput): Map<string, Recipe> {
  return new Map(input.recipes.map((r) => [r._id, r]))
}

describe('buildPrepSheetGroups (04.1 fixture)', () => {
  it('by station: one group "קר" with the sauce row, no "כללי" group', () => {
    const { input, plan } = withStations('קר')
    const groups = buildPrepSheetGroups(plan, input.event, recipesById(input), 'by_station', t, ['חם', 'קר'])
    expect(groups.map((g) => g.title)).toEqual(['קר'])
    expect(groups[0].rows).toEqual([{ name: 'רוטב', qty: 2, unit: 'kg', forDishes: ['סלט'] }])
  })

  it('a prep with its own station still lands under the serving dish station', () => {
    const { input, plan } = withStations('קר', '', 'חם')
    const groups = buildPrepSheetGroups(plan, input.event, recipesById(input), 'by_station', t, ['חם', 'קר'])
    expect(groups.map((g) => g.title)).toEqual(['קר'])
  })

  it('two dishes in one station using the same prep give one summed row listing both dishes', () => {
    const { input, plan } = withStations('קר', 'קר')
    const extra: PrepLine = { ...plan.prepLines[0], dishId: ID.pasta, qty: 1, station: 'קר' }
    const merged: EventPlan = { ...plan, prepLines: [...plan.prepLines, extra] }
    const groups = buildPrepSheetGroups(merged, input.event, recipesById(input), 'by_station', t, ['קר'])
    expect(groups.length).toBe(1)
    expect(groups[0].rows.length).toBe(1)
    expect(groups[0].rows[0].qty).toBe(3)
    expect(groups[0].rows[0].forDishes).toEqual(['סלט', 'פסטה'])
  })

  it('orders stations by the list, unknown ones after, "כללי" last', () => {
    const { input, plan } = withStations('')
    const lines: PrepLine[] = ['קר', '', 'חם', 'גריל'].map((station, i) => ({
      prepId: `p${i}`,
      name: `הכנה ${i}`,
      qty: 1,
      unit: 'unit',
      dishId: ID.salad,
      station,
      category: '',
      source: 'prep'
    }))
    const groups = buildPrepSheetGroups(
      { ...plan, prepLines: lines },
      input.event,
      recipesById(input),
      'by_station',
      t,
      ['חם', 'קר']
    )
    expect(groups.map((g) => g.title)).toEqual(['חם', 'קר', 'גריל', 'כללי'])
  })

  it('by dish: סלט has the sauce row, פסטה is kept with the empty text', () => {
    const { input, plan } = withStations('קר')
    const groups = buildPrepSheetGroups(plan, input.event, recipesById(input), 'by_dish', t)
    expect(groups.map((g) => g.title)).toEqual(['סלט', 'פסטה'])
    expect(groups[0].rows.map((r) => r.name)).toEqual(['רוטב'])
    expect(groups[0].emptyText).toBeUndefined()
    expect(groups[1].rows).toEqual([])
    expect(groups[1].emptyText).toBe('אין הכנות במנה זו')
  })

  it('by category: a mise row groups under its translated category, no category under "כללי"', () => {
    const { input, plan } = withStations('קר')
    const mise: PrepLine = {
      prepId: 'mise:חיתוך',
      name: 'חיתוך',
      qty: 3,
      unit: 'unit',
      dishId: ID.salad,
      station: 'קר',
      category: 'cold_prep',
      source: 'mise'
    }
    const groups = buildPrepSheetGroups(
      { ...plan, prepLines: [...plan.prepLines, mise] },
      input.event,
      recipesById(input),
      'by_category',
      t
    )
    expect(groups.map((g) => g.title)).toEqual(['הכנות קרות', 'כללי'])
    expect(groups[0].rows[0].name).toBe('חיתוך')
    expect(groups[1].rows[0].name).toBe('רוטב')
  })

  it('keeps notes and sorts rows alphabetically', () => {
    const { input, plan } = withStations('קר')
    const lines: PrepLine[] = [
      { ...plan.prepLines[0], prepId: 'b', name: 'ב', note: 'דק' },
      { ...plan.prepLines[0], prepId: 'a', name: 'א' }
    ]
    const groups = buildPrepSheetGroups(
      { ...plan, prepLines: lines },
      input.event,
      recipesById(input),
      'by_station',
      t,
      ['קר']
    )
    expect(groups[0].rows.map((r) => r.name)).toEqual(['א', 'ב'])
    expect(groups[0].rows[1].note).toBe('דק')
  })

  it('an empty plan gives no station or category groups', () => {
    const { input, plan } = withStations('קר')
    const empty = { ...plan, prepLines: [] }
    expect(buildPrepSheetGroups(empty, input.event, recipesById(input), 'by_station', t)).toEqual([])
    expect(buildPrepSheetGroups(empty, input.event, recipesById(input), 'by_category', t)).toEqual([])
  })
})

describe('buildSupplierSheetGroups', () => {
  it('one group per card, rows product · qty · unit · purchase, no prices', () => {
    const input = buildFixtureInput()
    const plan = computeEventPlan(input)
    const suppliers = new Map(FIXTURE_SUPPLIERS.map((s) => [s._id, s]))
    const orders = buildSupplierOrders(plan, new Map(), suppliers, t)
    const groups = buildSupplierSheetGroups(orders, t)
    expect(groups.map((g) => g.title)).toEqual(['ירקן', 'ללא ספק'])
    const veg = groups[0]
    expect(veg.columns).toBe('supplier')
    expect(veg.rows.map((r) => r.name)).toEqual(['עגבנייה', 'שמן זית'])
    expect(veg.rows[0].purchase).toBeTruthy()
    const table = prepSheetTableRows(veg, t)
    expect(table[0]).toEqual(['מוצר', 'כמות', 'יחידה', 'יחידות רכש'])
    expect(table.flat().some((c) => typeof c === 'string' && c.includes('₪'))).toBeFalse()
  })
})

describe('prepSheetTableRows', () => {
  it('writes header + one row per group row with the "למנה" text and the note', () => {
    const { input, plan } = withStations('קר')
    const [group] = buildPrepSheetGroups(plan, input.event, recipesById(input), 'by_station', t, ['קר'])
    expect(prepSheetTableRows(group, t)).toEqual([
      ['הכנה', 'כמות', 'יחידה', 'למנה', 'הערה'],
      ['רוטב', 2, 'ק"ג', 'סלט', '']
    ])
  })

  it('by-dish groups have no "למנה" column', () => {
    const { input, plan } = withStations('קר')
    const [group] = buildPrepSheetGroups(plan, input.event, recipesById(input), 'by_dish', t)
    expect(prepSheetTableRows(group, t)[0]).toEqual(['הכנה', 'כמות', 'יחידה', 'הערה'])
  })

  it('meta line: name, dd.mm.yyyy date, guests, serving type', () => {
    const { input } = withStations('קר')
    const event = { ...input.event, name: 'חתונה', eventDate: '2026-10-21', guestCount: 80, servingType: 'buffet' }
    const texts: Record<string, string> = { prep_sheets_guests: '{n} סועדים', buffet: 'בופה' }
    expect(prepSheetMetaLine(event as typeof input.event, (k) => texts[k] ?? k)).toBe(
      'חתונה · 21.10.2026 · 80 סועדים · בופה'
    )
  })
})
