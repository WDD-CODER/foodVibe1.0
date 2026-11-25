'use strict'
/** Plan 427 - unit tests for the one permission checker (contract C-PERM). */

const { can, stripMoneyFields, moneyFieldsChanged, valuesAt } = require('../utils/permissions')

const OWNER = { userId: 'o1', businessId: 'b1', businessRole: 'owner' }
const STAFF = { userId: 's1', businessId: 'b1', businessRole: 'staff' }
const ADMIN = { userId: 'a1', businessId: 'b0', businessRole: 'owner', isPlatformAdmin: true }
const ACTIONS = ['create', 'edit', 'delete', 'editMoney', 'changeStage', 'addNote', 'markArrival', 'manageTeam', 'editSettings', 'editTaxonomy', 'editLogistics', 'editFrontDesk']
const own = { businessId: 'b1', createdBy: 'o1' }
const mine = { businessId: 'b1', createdBy: 's1' }

describe('can', () => {
  it('owner may do all 12 actions on a doc of his business', () => {
    for (const a of ACTIONS) expect(can(OWNER, a, { type: 'menuEvents', doc: own })).toEqual({ ok: true })
  })
  it('any role on another business doc is OTHER_BUSINESS', () => {
    for (const u of [OWNER, STAFF]) expect(can(u, 'edit', { doc: { businessId: 'b2' } })).toEqual({ ok: false, reason: 'OTHER_BUSINESS' })
  })
  it('master docs are for the platform admin only', () => {
    const doc = { businessId: '__master__' }
    expect(can(ADMIN, 'edit', { doc })).toEqual({ ok: true })
    expect(can(OWNER, 'edit', { doc })).toEqual({ ok: false, reason: 'MASTER_ONLY' })
    expect(can(STAFF, 'delete', { doc })).toEqual({ ok: false, reason: 'MASTER_ONLY' })
  })
  it('staff create; edit and delete only what they created', () => {
    expect(can(STAFF, 'create', { type: 'recipes' })).toEqual({ ok: true })
    for (const a of ['edit', 'delete']) {
      expect(can(STAFF, a, { doc: mine })).toEqual({ ok: true })
      expect(can(STAFF, a, { doc: own })).toEqual({ ok: false, reason: 'NOT_CREATOR' })
    }
  })
  it('staff never get owner-only actions', () => {
    for (const a of ['editMoney', 'manageTeam', 'editSettings', 'editTaxonomy', 'editLogistics', 'editFrontDesk']) {
      expect(can(STAFF, a, { doc: mine })).toEqual({ ok: false, reason: 'OWNER_ONLY' })
    }
  })
  it('changeStage only on an event staff created; addNote / markArrival on any event of the business', () => {
    expect(can(STAFF, 'changeStage', { type: 'menuEvents', doc: mine })).toEqual({ ok: true })
    expect(can(STAFF, 'changeStage', { type: 'menuEvents', doc: own })).toEqual({ ok: false, reason: 'NOT_CREATOR' })
    expect(can(STAFF, 'changeStage', { type: 'recipes', doc: mine }).ok).toBe(false)
    for (const a of ['addNote', 'markArrival']) {
      expect(can(STAFF, a, { type: 'menuEvents', doc: own })).toEqual({ ok: true })
      expect(can(STAFF, a, { type: 'recipes', doc: own }).ok).toBe(false)
    }
  })
  it('no role, unknown action', () => {
    expect(can({ userId: 'x', businessId: 'b1' }, 'create', {})).toEqual({ ok: false, reason: 'NO_ROLE' })
    expect(can(undefined, 'create', {})).toEqual({ ok: false, reason: 'NO_ROLE' })
    expect(can({ ...OWNER, businessRole: 'boss' }, 'create', {})).toEqual({ ok: false, reason: 'NO_ROLE' })
    expect(can(OWNER, 'fly', {})).toEqual({ ok: false, reason: 'UNKNOWN_ACTION' })
  })
  it('without a doc only the role rules run', () => {
    for (const a of ['manageTeam', 'editSettings']) {
      expect(can(OWNER, a, {})).toEqual({ ok: true })
      expect(can(STAFF, a, {})).toEqual({ ok: false, reason: 'OWNER_ONLY' })
    }
  })
})

describe('plan 631: consultant', () => {
  const CONSULTANT = { userId: 'c1', businessId: 'b1', businessRole: 'consultant', homeBusinessId: 'b9', acting: 'consultant' }
  const { ACTIONS: ALL, CONSULTANT_DENIED } = require('../utils/permissions')

  it('may do 11 actions on a doc of the business he acts in, including someone else\'s and money', () => {
    const allowed = ALL.filter(a => a !== 'manageTeam' && a !== 'editSettings')
    expect(allowed).toHaveLength(11)
    for (const a of allowed) {
      expect(can(CONSULTANT, a, { type: 'menuEvents', doc: own })).toEqual({ ok: true })
      expect(can(CONSULTANT, a, { type: 'clients' })).toEqual({ ok: true })
    }
  })
  it('is refused manageTeam and editSettings with CONSULTANT_DENIED, with or without a doc', () => {
    expect([...CONSULTANT_DENIED].sort()).toEqual(['editSettings', 'manageTeam'])
    for (const a of ['manageTeam', 'editSettings']) {
      expect(can(CONSULTANT, a, {})).toEqual({ ok: false, reason: 'CONSULTANT_DENIED' })
      expect(can(CONSULTANT, a, { type: 'businesses', doc: own })).toEqual({ ok: false, reason: 'CONSULTANT_DENIED' })
    }
  })
  it('is refused a document of another business and a master document', () => {
    expect(can(CONSULTANT, 'edit', { doc: { businessId: 'b9' } })).toEqual({ ok: false, reason: 'OTHER_BUSINESS' })
    expect(can(CONSULTANT, 'edit', { doc: { businessId: 'b2' } })).toEqual({ ok: false, reason: 'OTHER_BUSINESS' })
    expect(can(CONSULTANT, 'edit', { doc: { businessId: '__master__' } })).toEqual({ ok: false, reason: 'MASTER_ONLY' })
  })
})

describe('plan 724: dish analysis types', () => {
  const { staffProjection, LOCKED_TAXONOMY_KINDS } = require('../utils/permissions')
  const TYPES = ['menuDishes', 'dishSalesMonths', 'dishSalesAliases']

  it('staff may not create, edit or delete them; owner and consultant may', () => {
    const CONSULTANT = { userId: 'c1', businessId: 'b1', businessRole: 'consultant', homeBusinessId: 'b9', acting: 'consultant' }
    for (const type of TYPES) {
      for (const a of ['create', 'edit', 'delete']) {
        expect(can(STAFF, a, { type, doc: mine })).toEqual({ ok: false, reason: 'OWNER_ONLY_TYPE' })
        expect(can(OWNER, a, { type, doc: own })).toEqual({ ok: true })
        expect(can(CONSULTANT, a, { type, doc: own })).toEqual({ ok: true })
      }
    }
  })
  it('a staff read hides every non-base field', () => {
    expect(staffProjection('menuDishes')).toMatchObject({ name: 0, priceWithVat: 0, typedCost: 0 })
    expect(staffProjection('dishSalesMonths')).toMatchObject({ rows: 0, month: 0, frozen: 0 })
    expect(staffProjection('dishSalesAliases')).toMatchObject({ name: 0, nameKey: 0 })
    expect(staffProjection('menuDishes')._id).toBeUndefined()
  })
  it('the own return reasons are an owner-only taxonomy kind', () => {
    expect(LOCKED_TAXONOMY_KINDS).toContain('dishReturnReason')
    expect(can(STAFF, 'editTaxonomy', { type: 'taxonomyTerms' })).toEqual({ ok: false, reason: 'OWNER_ONLY' })
  })
})

describe('plan 549: manageRequests', () => {
  it('any member of the business may, with or without a doc; another business and no role may not', () => {
    for (const u of [OWNER, STAFF]) {
      expect(can(u, 'manageRequests', { type: 'requests' })).toEqual({ ok: true })
      expect(can(u, 'manageRequests', { type: 'bookings', doc: { businessId: 'b1', createdBy: 'someone-else' } })).toEqual({ ok: true })
    }
    expect(can(STAFF, 'manageRequests', { type: 'requests', doc: { businessId: 'b2' } })).toEqual({ ok: false, reason: 'OTHER_BUSINESS' })
    expect(can({ userId: 'x', businessId: 'b1' }, 'manageRequests', { type: 'requests' })).toEqual({ ok: false, reason: 'NO_ROLE' })
  })
})

describe('plan 548: front desk profiles', () => {
  it('editFrontDesk is owner-only', () => {
    expect(can(OWNER, 'editFrontDesk', { type: 'frontDeskProfiles', doc: own })).toEqual({ ok: true })
    expect(can(STAFF, 'editFrontDesk', { type: 'frontDeskProfiles', doc: mine })).toEqual({ ok: false, reason: 'OWNER_ONLY' })
  })
  it('staff may not create, edit or delete a profile, even their own', () => {
    for (const a of ['create', 'edit', 'delete']) {
      expect(can(STAFF, a, { type: 'frontDeskProfiles', doc: mine })).toEqual({ ok: false, reason: 'OWNER_ONLY_TYPE' })
    }
  })
})

describe('plan 519: editLogistics', () => {
  const ctx = { type: 'menuEvents', doc: own }
  it('owner ok, staff denied, other business denied, platform admin ok on a master doc', () => {
    expect(can(OWNER, 'editLogistics', ctx)).toEqual({ ok: true })
    expect(can(STAFF, 'editLogistics', ctx)).toEqual({ ok: false, reason: 'OWNER_ONLY' })
    expect(can(OWNER, 'editLogistics', { type: 'menuEvents', doc: { businessId: 'b2' } })).toEqual({ ok: false, reason: 'OTHER_BUSINESS' })
    expect(can(ADMIN, 'editLogistics', { type: 'menuEvents', doc: { businessId: '__master__' } })).toEqual({ ok: true })
  })
})

describe('money fields', () => {
  it('valuesAt walks arrays and nested paths', () => {
    expect(valuesAt({ a: { b: [{ c: 1 }, {}, { c: 2 }] } }, 'a.b[].c')).toEqual([1, 2])
    expect(valuesAt({ a: 1 }, 'a')).toEqual([1])
    expect(valuesAt({}, 'a[].b')).toEqual([])
  })
  it('stripMoneyFields removes prices and keeps the rest', () => {
    const body = { sources: [{ supplierId: 's1', price: 5 }], purchaseOptions: [{ unitSymbol: 'box', conversionRate: 10, priceOverride: 30 }] }
    expect(stripMoneyFields('products', body)).toEqual({ sources: [{ supplierId: 's1' }], purchaseOptions: [{ unitSymbol: 'box', conversionRate: 10 }] })
    expect(body.sources[0].price).toBe(5)
    expect(stripMoneyFields('recipes', { a: 1 })).toEqual({ a: 1 })
    expect(stripMoneyFields('menuEvents', { pricePerGuest: 1, closing: { actualRevenue: 2, notes: 'x' } })).toEqual({ closing: { notes: 'x' } })
  })
  it('moneyFieldsChanged', () => {
    const before = { nameHebrew: 'a', sources: [{ supplierId: 's1', price: 5 }] }
    expect(moneyFieldsChanged('products', before, { ...before, sources: [{ supplierId: 's1', price: 6 }] })).toBe(true)
    expect(moneyFieldsChanged('products', before, { ...before, sources: [] })).toBe(true)
    expect(moneyFieldsChanged('products', { sources: [{ supplierId: 's1' }] }, { sources: [{ supplierId: 's1', price: 1 }] })).toBe(true)
    expect(moneyFieldsChanged('products', before, { ...before, nameHebrew: 'b' })).toBe(false)
    expect(moneyFieldsChanged('products', before, { ...before, sources: [...before.sources, { supplierId: 's2' }] })).toBe(false)
    expect(moneyFieldsChanged('menuEvents', { pricePerGuest: 200 }, { pricePerGuest: 210 })).toBe(true)
  })
})

describe('plan 449: money signature is keyed by row', () => {
  const doc = sources => ({ sources, purchaseOptions: [] })
  it('detects a price moved to another supplier or swapped between rows', () => {
    const before = doc([{ supplierId: 'a', price: 5 }, { supplierId: 'b', price: 0 }])
    expect(moneyFieldsChanged('products', before, doc([{ supplierId: 'a' }, { supplierId: 'b', price: 5 }]))).toBe(true)
    const two = doc([{ supplierId: 'a', price: 5 }, { supplierId: 'b', price: 7 }])
    expect(moneyFieldsChanged('products', two, doc([{ supplierId: 'a', price: 7 }, { supplierId: 'b', price: 5 }]))).toBe(true)
  })
  it('treats 0, null and absent as the same, and ignores row order', () => {
    const before = doc([{ supplierId: 'a', price: 5 }, { supplierId: 'b', price: 0 }])
    expect(moneyFieldsChanged('products', before, doc([{ supplierId: 'b', price: null }, { supplierId: 'a', price: 5 }]))).toBe(false)
    expect(moneyFieldsChanged('products', before, doc([{ supplierId: 'a', price: 5 }, { supplierId: 'b' }]))).toBe(false)
  })
})

describe('plan 536 supplier choice is a money field', () => {
  const l = (id, extra = {}) => ({ _id: id, referenceId: 'p' + id, amount: 1, unit: 'kg', ...extra })
  it('setting, changing and clearing a recipe line supplier is a money change', () => {
    const before = { ingredients: [l('a'), l('b', { supplierId: 's1' })] }
    expect(moneyFieldsChanged('recipes', before, { ingredients: [l('a', { supplierId: 's1' }), l('b', { supplierId: 's1' })] })).toBe(true)
    expect(moneyFieldsChanged('recipes', before, { ingredients: [l('a'), l('b', { supplierId: 's2' })] })).toBe(true)
    expect(moneyFieldsChanged('recipes', before, { ingredients: [l('a'), l('b')] })).toBe(true)
    expect(moneyFieldsChanged('dishes', before, { ingredients: [l('a'), l('b')] })).toBe(true)
  })
  it('reordering lines or editing an amount is not a money change', () => {
    const before = { ingredients: [l('a', { supplierId: 's1' }), l('b', { supplierId: 's2' })] }
    expect(moneyFieldsChanged('recipes', before, { ingredients: [l('b', { supplierId: 's2' }), l('a', { supplierId: 's1' })] })).toBe(false)
    expect(moneyFieldsChanged('recipes', before, { ingredients: [l('a', { supplierId: 's1', amount: 9 }), l('b', { supplierId: 's2' })] })).toBe(false)
  })
  it('supplierMoves on an event is a money field', () => {
    const mv = { productId: 'p', fromSupplierId: 'a', toSupplierId: 'b' }
    expect(moneyFieldsChanged('menuEvents', { name: 'x' }, { name: 'x', supplierMoves: [mv] })).toBe(true)
    expect(moneyFieldsChanged('menuEvents', { supplierMoves: [mv] }, { supplierMoves: [] })).toBe(true)
    expect(moneyFieldsChanged('menuEvents', { supplierMoves: [mv] }, { supplierMoves: [mv] })).toBe(false)
  })
  it('a staff-created recipe or event is stored without them', () => {
    expect(stripMoneyFields('recipes', { ingredients: [l('a', { supplierId: 's1' })] })).toEqual({ ingredients: [l('a')] })
    expect(stripMoneyFields('menuEvents', { name: 'x', supplierMoves: [{ productId: 'p', fromSupplierId: 'a', toSupplierId: 'b' }] })).toEqual({ name: 'x' })
  })
})
