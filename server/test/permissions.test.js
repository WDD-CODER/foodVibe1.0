'use strict'
/** Plan 427 - unit tests for the one permission checker (contract C-PERM). */

const { can, stripMoneyFields, moneyFieldsChanged, valuesAt } = require('../utils/permissions')

const OWNER = { userId: 'o1', businessId: 'b1', businessRole: 'owner' }
const STAFF = { userId: 's1', businessId: 'b1', businessRole: 'staff' }
const ADMIN = { userId: 'a1', businessId: 'b0', businessRole: 'owner', isPlatformAdmin: true }
const ACTIONS = ['create', 'edit', 'delete', 'editMoney', 'changeStage', 'addNote', 'markArrival', 'manageTeam', 'editSettings', 'editTaxonomy']
const own = { businessId: 'b1', createdBy: 'o1' }
const mine = { businessId: 'b1', createdBy: 's1' }

describe('can', () => {
  it('owner may do all 10 actions on a doc of his business', () => {
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
    for (const a of ['editMoney', 'manageTeam', 'editSettings', 'editTaxonomy']) {
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
