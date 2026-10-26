import { computeEventPlan } from '../engine/event-plan.engine'
import {
  FIXTURE_IDS as ID,
  buildFixtureInput,
  makeEvent,
  makeInput,
  makeRecipe,
  recipeIng
} from '../engine/testing/event-plan.fixture'
import { buildShoppingListTable } from './shopping-list-table.util'

/** Stub translator: a key is its own text, so the specs assert the key that would be shown. */
const t = (key: string): string => key

describe('buildShoppingListTable', () => {
  describe('04.1 fixture', () => {
    const input = buildFixtureInput()
    const table = buildShoppingListTable(computeEventPlan(input), input.products, t)

    it('has one tomato row with the waste-adjusted quantity, crates and line total', () => {
      const tomato = table.rows.filter((r) => r[1] === 'עגבנייה')
      expect(tomato.length).toBe(1)
      expect(tomato[0]).toEqual(['general_group', 'עגבנייה', 18.75, 'ק"ג', '2 ארגז', 93.75, ''])
    })

    it('lists the prep products and leaves the unpriced line total empty', () => {
      const oil = table.rows.find((r) => r[1] === 'שמן זית')
      const lemon = table.rows.find((r) => r[1] === 'לימון')
      expect(oil).toEqual(['general_group', 'שמן זית', 1.6, 'ק"ג', '', 64, ''])
      expect(lemon).toEqual(['general_group', 'לימון', 0.4, 'ק"ג', '', '', ''])
    })

    it('has no row named after the prep', () => {
      expect(table.rows.some((r) => r[1] === 'רוטב')).toBeFalse()
      expect(table.rows.length).toBe(3)
    })

    it('ends with the event food cost, labelled partial', () => {
      expect(table.totalRow[1]).toBe('shopping_total')
      expect(table.totalRow[5]).toBe(157.75)
      expect(table.totalRow[6]).toBe('partial_total')
      expect(table.notes).toEqual([])
    })

    it('has 7 header cells matching the row width', () => {
      expect(table.headerRow.length).toBe(7)
      expect(table.rows.every((r) => r.length === 7)).toBeTrue()
    })
  })

  it('puts an unlinked row in its own group, never merged with the linked product of the same name', () => {
    const input = buildFixtureInput()
    input.recipes
      .find((r) => r._id === ID.pasta)
      ?.ingredients.push({ _id: 'free', amount: 2, unit: 'kg', nameSnapshot: 'עגבנייה' })
    const table = buildShoppingListTable(computeEventPlan(input), input.products, t)
    const named = table.rows.filter((r) => r[1] === 'עגבנייה')
    expect(named.length).toBe(2)
    expect(named.map((r) => r[0])).toEqual(['general_group', 'line_status_unlinked'])
    expect(table.rows[table.rows.length - 1][0]).toBe('line_status_unlinked')
  })

  it('puts a deleted product in the deleted group after the unlinked one', () => {
    const input = buildFixtureInput()
    const pasta = input.recipes.find((r) => r._id === ID.pasta)
    pasta?.ingredients.push({
      _id: 'gone',
      referenceId: 'gone',
      type: 'product',
      amount: 1,
      unit: 'kg',
      nameSnapshot: 'פלפל'
    })
    const table = buildShoppingListTable(computeEventPlan(input), input.products, t)
    expect(table.rows[table.rows.length - 1][0]).toBe('line_status_deleted')
  })

  it('notes a row that could not be converted', () => {
    const input = buildFixtureInput()
    input.recipes
      .find((r) => r._id === ID.pasta)
      ?.ingredients.push({
        _id: 'u',
        referenceId: ID.tomato,
        type: 'product',
        amount: 3,
        unit: 'unit',
        nameSnapshot: 'עגבנייה'
      })
    const table = buildShoppingListTable(computeEventPlan(input), input.products, t)
    const bad = table.rows.find((r) => r[6] === 'line_status_no_conversion')
    expect(bad?.[1]).toBe('עגבנייה')
    expect(bad?.[5]).toBe('')
  })

  it('names the prep of a cycle in the notes and still returns a table', () => {
    const x = makeRecipe({ _id: 'x', nameHebrew: 'X', ingredients: [recipeIng('y', 100, 'gram', 'Y')] })
    const y = makeRecipe({ _id: 'y', nameHebrew: 'Y', ingredients: [recipeIng('x', 100, 'gram', 'X')] })
    const event = makeEvent([{ recipeId: 'x', derivedPortions: 1, recipeType: 'preparation' }])
    const table = buildShoppingListTable(computeEventPlan(makeInput(event, [], [x, y])), [], (k) =>
      k === 'engine_error_cycle' ? 'הכנה מעגלית: {name}' : k
    )
    expect(table.notes.some((n) => n === 'הכנה מעגלית: X' || n === 'הכנה מעגלית: Y')).toBeTrue()
    expect(table.totalRow[6]).toBe('partial_total')
  })
})
