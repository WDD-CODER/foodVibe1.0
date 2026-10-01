'use strict';
/**
 * Plan 321 Phase 2a — upgradeV1toV2 + v2 schema fixtures (anonymized shapes taken from the
 * live-data inventory). The upgrade is total: every key is renamed, explicitly dropped, or
 * reported in `unmapped`.
 */

const { upgradeV1toV2 } = require('../generated/schemas/upgrade/upgrade');
const { checkDoc } = require('../utils/schema-check');

const V1_PRODUCT = {
  _id: 'p1',
  userId: 'u1',
  _masterId: 'p1',
  _userModified: false,
  name_hebrew: 'עגבניה',
  base_unit_: 'kg',
  sources_: [{ supplierId: 's1', price: 12.5 }],
  purchase_options_: [{ unit_symbol_: 'kg', conversion_rate_: 1 }],
  categories_: ['veg'],
  yield_factor_: 1,
  allergens_: [],
  min_stock_level_: 0,
  expiry_days_default_: 5,
  addedAt_: 1700000000000,
  updatedAt: '2025-01-02T03:04:05.000Z',
  buy_price_global_: 9,
  supplierIds_: ['s1'],
  nutrition_per_100g: { energy_kcal: 18, protein_g: 0.9 },
}

const V1_RECIPE = {
  _id: 'r1',
  userId: 'u1',
  name_hebrew: 'רוטב',
  ingredients_: [{ _id: 'i1', referenceId: 'p1', type: 'product', amount_: 2, unit_: 'kg', nameSnapshot: 'עגבניה' }],
  steps_: [{ order_: 1, instruction_: 'מערבבים', labor_time_minutes_: 5 }],
  yield_amount_: 3,
  yield_unit_: 'kg',
  default_station_: 'cold',
  is_approved_: false,
  labels_: ['vegan'],
  course_: 'main',
  addedAt_: 1700000000000,
  updatedAt_: 1700000001000,
  logistics_: { baseline_: [{ equipment_id_: 'e1', quantity_: 1, phase_: 'prep', is_critical_: true }] },
}

describe('upgradeV1toV2', () => {
  it('renames, converts and drops product fields; adds schemaVersion', () => {
    const { doc, unmapped } = upgradeV1toV2('PRODUCT_LIST', V1_PRODUCT)
    expect(unmapped).toEqual([])
    expect(doc).toMatchObject({
      _id: 'p1',
      ownerId: 'u1',
      masterId: 'p1',
      userModified: false,
      nameHebrew: 'עגבניה',
      baseUnit: 'kg',
      createdAt: 1700000000000,
      updatedAt: Date.parse('2025-01-02T03:04:05.000Z'),
      schemaVersion: 2,
      nutritionPer100g: { energyKcal: 18, proteinG: 0.9 },
    })
    expect(doc).not.toHaveProperty('buy_price_global_')
    expect(doc).not.toHaveProperty('supplierIds_')
  })

  it('maps nested recipe keys and drops recipe_type_ (the collection says which it is)', () => {
    const doc = upgradeV1toV2('RECIPE_LIST', { ...V1_RECIPE, recipe_type_: 'preparation' }).doc
    expect(doc).not.toHaveProperty('kind')
    expect(doc).not.toHaveProperty('recipe_type_')
    expect(doc.ingredients[0]).toMatchObject({ amount: 2, unit: 'kg' })
    expect(doc.logistics.baseline[0]).toMatchObject({ equipmentId: 'e1', isCritical: true })
  })

  it('renames menu item recipe type preparation -> recipe', () => {
    const { doc } = upgradeV1toV2('MENU_EVENT_LIST', {
      _id: 'm1', userId: 'u1', name_: 'x', event_type_: 't', serving_type_: 's', guest_count_: 1,
      sections_: [{ _id: 's1', name_: 'a', sort_order_: 0, items_: [{ recipe_id_: 'r', recipe_type_: 'preparation', predicted_take_rate_: 1, derived_portions_: 1 }] }],
    })
    expect(doc.sections[0].items[0].recipeType).toBe('recipe')
  })

  it('reports every key the field map does not cover (never silently drops)', () => {
    const { unmapped } = upgradeV1toV2('PRODUCT_LIST', {
      ...V1_PRODUCT,
      stray_field: 1,
      sources_: [{ supplierId: 's1', price: 1, weird: true }],
    })
    expect(unmapped.sort()).toEqual(['sources_[].weird', 'stray_field'])
  })

  it('returns collections without a v2 schema untouched', () => {
    const doc = { _id: 'x', items: ['a'] }
    expect(upgradeV1toV2('KITCHEN_UNITS', doc)).toEqual({ doc, unmapped: [] })
  })
})

describe('checkDoc (v2 schema, observe semantics)', () => {
  it('accepts a complete v1 product once upgraded', () => {
    const { unmapped, issues } = checkDoc('PRODUCT_LIST', V1_PRODUCT)
    expect(unmapped).toEqual([])
    expect(issues).toEqual([])
  })

  it('accepts a complete v1 recipe once upgraded', () => {
    const { unmapped, issues } = checkDoc('RECIPE_LIST', V1_RECIPE)
    expect(unmapped).toEqual([])
    expect(issues).toEqual([])
  })

  it('flags nulls and missing required fields instead of loosening the schema', () => {
    const { issues } = checkDoc('RECIPE_LIST', { ...V1_RECIPE, logistics_: null, addedAt_: undefined })
    const paths = issues.map(i => i.path)
    expect(paths).toContain('logistics')
    expect(paths).toContain('createdAt')
  })
})
