'use strict'
/** Plan 724: the dish analysis store through /api/v1/data/<type>: roles, module gate, server-owned fields, 409s, indexes. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { menuDishBody, dishMonthBody, dishAliasBody } = require('./helpers/v2-docs')
const { clearModuleCache } = require('../middleware/require-module')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const A = 'b_restaurant'
const C = 'b_consult'
const B_OFF = 'b_caterer'
const db = c => testDb().collection(c)
const OWNER = { userId: 'ownerA', name: 'owner', businessId: A, businessRole: 'owner' }
const STAFF = { userId: 'cook', name: 'cook', businessId: A, businessRole: 'staff' }
const CONSULTANT = { userId: 'consult', name: 'consult', businessId: A, businessRole: 'consultant', homeBusinessId: C, acting: 'consultant' }
const OFF_OWNER = { userId: 'ownerOff', name: 'off', businessId: B_OFF, businessRole: 'owner' }
const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const url = (type, rest = '') => `/api/v1/data/${type}${rest}`
const TYPES = ['menuDishes', 'dishSalesMonths', 'dishSalesAliases']
const BODY = {
  menuDishes: () => menuDishBody({ name: 'שניצל', priceWithVat: 118, costSource: 'typed', typedCost: 20 }),
  dishSalesMonths: () => dishMonthBody({ rows: [{ menuDishId: 'd1', nameSnapshot: 'שניצל', sold: 5, returned: 1, returnReasons: [], source: 'typed', netSales: 400 }] }),
  dishSalesAliases: () => dishAliasBody({ name: 'שניצל גדול', action: 'dish', menuDishId: 'd1', portionFactor: 2 }),
}
const CHANGE = { menuDishes: { name: 'שניצל מיוחד' }, dishSalesMonths: { note: 'הערה' }, dishSalesAliases: { portionFactor: 1.5 } }

beforeEach(async () => {
  for (const c of await testDb().listCollections().toArray()) if (c.type === 'collection') await db(c.name).deleteMany({})
  const modules = ['events', 'event_logistics', 'frontdesk', 'ai_create', 'dish_analysis']
  await db('businesses').insertMany([
    { _id: A, name: 'מסעדה', ownerId: 'ownerA', createdAt: 1, internal: false, lastSyncedMasterVersion: 0, modules },
    { _id: C, name: 'משרד', ownerId: 'consult', createdAt: 2, internal: false, lastSyncedMasterVersion: 0 },
    { _id: B_OFF, name: 'קייטרינג', ownerId: 'ownerOff', createdAt: 3, internal: false, lastSyncedMasterVersion: 0 },
  ])
  await db('users').insertMany([
    { _id: 'ownerA', name: 'owner', email: 'o@x.com', businessId: A, businessRole: 'owner', removedAt: null },
    { _id: 'consult', name: 'consult', email: 'c@x.com', businessId: C, businessRole: 'owner', removedAt: null },
  ])
  await db('businessAccess').insertOne({ _id: 'g1', userId: 'consult', businessId: A, role: 'consultant', grantedBy: 'boss', grantedByName: 'boss', grantedAt: 1 })
  clearModuleCache()
})

describe.each([['owner', OWNER], ['acting consultant', CONSULTANT]])('%s', (_label, user) => {
  it.each(TYPES)('creates, reads, changes and deletes %s', async type => {
    const created = await request(app).post(url(type)).set(as(user)).send(BODY[type]())
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({ businessId: A })
    const id = created.body._id

    const list = await request(app).get(url(type)).set(as(user))
    expect(list.status).toBe(200)
    expect(list.body.map(d => d._id)).toEqual([id])
    expect((await request(app).get(url(type, `/${id}`)).set(as(user))).body._id).toBe(id)

    const put = await request(app).put(url(type, `/${id}`)).set(as(user)).send(CHANGE[type])
    expect(put.status).toBe(200)
    expect(put.body).toMatchObject(CHANGE[type])

    expect((await request(app).delete(url(type, `/${id}`)).set(as(user))).status).toBe(200)
    expect(await db(type).findOne({ _id: id })).toBeNull()
  })
})

describe('staff', () => {
  it.each(TYPES)('gets 403 on every write of %s and reads base fields only', async type => {
    const made = await request(app).post(url(type)).set(as(OWNER)).send(BODY[type]())
    expect(made.status).toBe(201)
    const id = made.body._id

    expect((await request(app).post(url(type)).set(as(STAFF)).send(BODY[type]())).status).toBe(403)
    expect((await request(app).put(url(type, `/${id}`)).set(as(STAFF)).send(CHANGE[type])).status).toBe(403)
    expect((await request(app).delete(url(type, `/${id}`)).set(as(STAFF))).status).toBe(403)

    const read = await request(app).get(url(type)).set(as(STAFF))
    expect(read.status).toBe(200)
    expect(read.body).toHaveLength(1)
    for (const hidden of ['name', 'priceWithVat', 'typedCost', 'rows', 'month', 'nameKey', 'portionFactor']) {
      expect(read.body[0]).not.toHaveProperty(hidden)
    }
    expect(read.body[0]).toMatchObject({ _id: id, businessId: A })
  })
})

describe('module off', () => {
  it.each(TYPES)('answers 403 MODULE_OFF on every call of %s', async type => {
    for (const res of [
      await request(app).get(url(type)).set(as(OFF_OWNER)),
      await request(app).post(url(type)).set(as(OFF_OWNER)).send(BODY[type]()),
      await request(app).put(url(type, '/x')).set(as(OFF_OWNER)).send(CHANGE[type]),
      await request(app).delete(url(type, '/x')).set(as(OFF_OWNER)),
    ]) {
      expect(res.status).toBe(403)
      expect(res.body).toMatchObject({ error: 'MODULE_OFF', module: 'dish_analysis' })
    }
  })
})

describe('server-owned fields', () => {
  const frozen = { at: 1, vatRatePct: 18, dealerType: 'murshe', dishes: [] }

  it('a month drops closedAt, frozen and skipped sent by a client and keeps stored values through a PUT', async () => {
    const made = await request(app).post(url('dishSalesMonths')).set(as(OWNER)).send({
      ...BODY.dishSalesMonths(), closedAt: 99, closedBy: 'me', frozen, skipped: [{ name: 'x', units: 1 }],
    })
    expect(made.status).toBe(201)
    for (const key of ['closedAt', 'closedBy', 'frozen', 'skipped']) expect(made.body).not.toHaveProperty(key)

    // Stored by the server (the later month close): a PUT of the open month must keep them.
    await db('dishSalesMonths').updateOne({ _id: made.body._id }, { $set: { skipped: [{ name: 'מים', units: 3 }], frozen } })
    const put = await request(app).put(url('dishSalesMonths', `/${made.body._id}`)).set(as(OWNER)).send({ note: 'x', skipped: [], frozen: { ...frozen, vatRatePct: 1 } })
    expect(put.status).toBe(200)
    const stored = await db('dishSalesMonths').findOne({ _id: made.body._id })
    expect(stored.skipped).toEqual([{ name: 'מים', units: 3 }])
    expect(stored.frozen).toEqual(frozen)
    expect(stored.note).toBe('x')
  })

  it('an alias drops hits, lastSeenAt and nameKey sent by a client; the key is the normalised name', async () => {
    const made = await request(app).post(url('dishSalesAliases')).set(as(OWNER)).send({
      ...BODY.dishSalesAliases(), name: '  Schnitzel   BIG ', nameKey: 'forged', hits: 50, lastSeenAt: 5,
    })
    expect(made.status).toBe(201)
    expect(made.body).toMatchObject({ nameKey: 'schnitzel big', hits: 0 })
    expect(made.body).not.toHaveProperty('lastSeenAt')

    await db('dishSalesAliases').updateOne({ _id: made.body._id }, { $set: { hits: 7, lastSeenAt: 11 } })
    const put = await request(app).put(url('dishSalesAliases', `/${made.body._id}`)).set(as(OWNER)).send({ hits: 0, lastSeenAt: 1, nameKey: 'zzz', name: 'Other  Name' })
    expect(put.status).toBe(200)
    const stored = await db('dishSalesAliases').findOne({ _id: made.body._id })
    expect(stored).toMatchObject({ hits: 7, lastSeenAt: 11, nameKey: 'other name', name: 'Other  Name' })
  })
})

describe('refusals', () => {
  it('a PUT or DELETE of a closed month answers 409 MONTH_CLOSED and changes nothing', async () => {
    const made = await request(app).post(url('dishSalesMonths')).set(as(OWNER)).send(BODY.dishSalesMonths())
    await db('dishSalesMonths').updateOne({ _id: made.body._id }, { $set: { closedAt: 5, closedBy: 'ownerA' } })
    const put = await request(app).put(url('dishSalesMonths', `/${made.body._id}`)).set(as(OWNER)).send({ note: 'late' })
    expect(put.status).toBe(409)
    expect(put.body).toEqual({ error: 'MONTH_CLOSED', messageKey: 'dish_month_closed' })
    const del = await request(app).delete(url('dishSalesMonths', `/${made.body._id}`)).set(as(OWNER))
    expect(del.status).toBe(409)
    expect(del.body.error).toBe('MONTH_CLOSED')
    const stored = await db('dishSalesMonths').findOne({ _id: made.body._id })
    expect(stored.note).toBeUndefined()
  })

  it('a second month with the same month answers 409 MONTH_EXISTS; another business may use it', async () => {
    expect((await request(app).post(url('dishSalesMonths')).set(as(OWNER)).send(BODY.dishSalesMonths())).status).toBe(201)
    const dup = await request(app).post(url('dishSalesMonths')).set(as(OWNER)).send(BODY.dishSalesMonths())
    expect(dup.status).toBe(409)
    expect(dup.body).toEqual({ error: 'MONTH_EXISTS', messageKey: 'dish_month_exists' })
  })

  it('a second alias differing only in case and spaces answers 409 ALIAS_EXISTS, on create and on rename', async () => {
    expect((await request(app).post(url('dishSalesAliases')).set(as(OWNER)).send(dishAliasBody({ name: 'Schnitzel Big' }))).status).toBe(201)
    const dup = await request(app).post(url('dishSalesAliases')).set(as(OWNER)).send(dishAliasBody({ name: ' schnitzel   big ' }))
    expect(dup.status).toBe(409)
    expect(dup.body).toEqual({ error: 'ALIAS_EXISTS', messageKey: 'dish_alias_exists' })

    const other = await request(app).post(url('dishSalesAliases')).set(as(OWNER)).send(dishAliasBody({ name: 'Soup' }))
    const rename = await request(app).put(url('dishSalesAliases', `/${other.body._id}`)).set(as(OWNER)).send({ name: 'SCHNITZEL BIG' })
    expect(rename.status).toBe(409)
    expect(rename.body.error).toBe('ALIAS_EXISTS')
  })

  it('an invalid body answers 400', async () => {
    const res = await request(app).post(url('dishSalesMonths')).set(as(OWNER)).send(dishMonthBody({ month: '2026-13' }))
    expect(res.status).toBe(400)
  })
})

describe('taxonomy', () => {
  it('a course used by a menu dish cannot be deleted and is re-keyed with it; own return reasons likewise', async () => {
    const course = await request(app).post(url('taxonomyTerms')).set(as(OWNER)).send({ kind: 'course', key: 'עיקרית', sortOrder: 0 })
    expect(course.status).toBe(201)
    const dish = await request(app).post(url('menuDishes')).set(as(OWNER)).send(menuDishBody({ course: 'עיקרית' }))
    expect((await request(app).delete(url('taxonomyTerms', `/${course.body._id}`)).set(as(OWNER))).status).toBe(409)
    expect((await request(app).put(url('taxonomyTerms', `/${course.body._id}`)).set(as(OWNER)).send({ key: 'מנה עיקרית' })).status).toBe(200)
    expect((await db('menuDishes').findOne({ _id: dish.body._id })).course).toBe('מנה עיקרית')

    const reason = await request(app).post(url('taxonomyTerms')).set(as(OWNER)).send({ kind: 'dishReturnReason', key: 'נשפך', sortOrder: 0 })
    expect(reason.status).toBe(201)
    const month = await request(app).post(url('dishSalesMonths')).set(as(OWNER)).send(dishMonthBody({
      rows: [{ menuDishId: 'd1', nameSnapshot: 'x', sold: 5, returned: 2, returnReasons: [{ reason: 'נשפך', count: 1 }], source: 'typed' }],
    }))
    expect(month.status).toBe(201)
    expect((await request(app).delete(url('taxonomyTerms', `/${reason.body._id}`)).set(as(OWNER))).status).toBe(409)
    expect((await request(app).put(url('taxonomyTerms', `/${reason.body._id}`)).set(as(OWNER)).send({ key: 'נשפך בטעות' })).status).toBe(200)
    expect((await db('dishSalesMonths').findOne({ _id: month.body._id })).rows[0].returnReasons[0].reason).toBe('נשפך בטעות')
  })

  it('staff may not add an own return reason', async () => {
    const res = await request(app).post(url('taxonomyTerms')).set(as(STAFF)).send({ kind: 'dishReturnReason', key: 'נשפך', sortOrder: 0 })
    expect(res.status).toBe(403)
  })
})

describe('indexes', () => {
  it('the four named indexes exist after connectDb', async () => {
    const names = async col => (await db(col).indexes()).map(i => i.name)
    expect(await names('menuDishes')).toContain('menu_dishes_business_active')
    expect(await names('dishSalesMonths')).toContain('dish_sales_months_business_month')
    expect(await names('dishSalesAliases')).toEqual(expect.arrayContaining(['dish_sales_aliases_business_key', 'dish_sales_aliases_business_dish']))
  })
})
