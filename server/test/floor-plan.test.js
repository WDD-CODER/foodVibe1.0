'use strict'
/** Plan 664 - /api/v1/floor-plan: first read, save and read, who, refusals, the in-use refusal. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { clearModuleCache } = require('../middleware/require-module')
const { captureLogs } = require('./helpers/log-capture')

let app
let logs

beforeAll(async () => {
  app = await buildTestApp()
  logs = captureLogs()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER = { userId: 'own1', name: 'בעלים', businessId: 'fp1', businessRole: 'owner' }
const STAFF = { userId: 'st1', name: 'עובד', businessId: 'fp1', businessRole: 'staff' }
const OTHER = { userId: 'own2', name: 'אחר', businessId: 'fp2', businessRole: 'owner' }
const NOMOD = { userId: 'own3', name: 'ללא', businessId: 'fp3', businessRole: 'owner' }
const HOUR = 3_600_000
const URL = '/api/v1/floor-plan'
const plans = () => testDb().collection('floorPlans')
const put = (user, body) => request(app).put(URL).set(as(user)).send(body)
const get = user => request(app).get(URL).set(as(user))

const table = (key, number, extra = {}) => ({
  key, number, areaKey: 'areaaa01', shape: 'square', minSeats: 2, maxSeats: 4,
  x: 0, y: 0, w: 2, h: 2, turned: false, active: true, online: true, ...extra,
})
const body = (over = {}) => ({
  grid: { cols: 24, rows: 16 },
  areas: [
    { key: 'areaaa01', name: 'בפנים', order: 0 },
    { key: 'areaaa02', name: 'בחוץ', order: 1 },
    { key: 'areaaa03', name: 'בר', order: 2 },
  ],
  tables: [
    table('tblaaa01', '1', { x: 0 }),
    table('tblaaa02', '2', { x: 3 }),
    table('tblaaa03', '3', { x: 6, areaKey: 'areaaa02' }),
    table('tblaaa04', '4', { x: 9, areaKey: 'areaaa03', shape: 'round' }),
  ],
  joins: [{ key: 'joinaa01', tableKeys: ['tblaaa01', 'tblaaa02'], minSeats: 3, maxSeats: 8, online: false }],
  ...over,
})

beforeEach(async () => {
  const db = testDb()
  for (const c of ['floorPlans', 'bookings', 'businesses']) await db.collection(c).deleteMany({})
  const on = modules => ({ modules, name: 'b', ownerId: 'x', createdAt: 1 })
  await db.collection('businesses').insertMany([
    { _id: 'fp1', ...on(['frontdesk', 'tables']) },
    { _id: 'fp2', ...on(['frontdesk', 'tables']) },
    { _id: 'fp3', ...on(['frontdesk']) },
  ])
  clearModuleCache()
})

describe('first read', () => {
  it('answers { plan: null } to owner and staff and inserts nothing', async () => {
    for (const u of [OWNER, STAFF]) {
      const res = await get(u)
      expect(res.status).toBe(200)
      expect(res.body).toEqual({ plan: null })
    }
    expect(await plans().countDocuments({})).toBe(0)
  })
})

describe('save and read', () => {
  it('stores the first plan, reads it, keeps identity on the second save', async () => {
    const first = await put(OWNER, body())
    expect(first.status).toBe(200)
    const p = first.body.plan
    expect(p).toMatchObject({ schemaVersion: 2, businessId: 'fp1', createdBy: 'own1' })
    expect(p._id).toBeTruthy()
    expect(p.createdAt).toBe(p.updatedAt)
    expect((await get(STAFF)).body.plan).toEqual(p)

    await new Promise(r => setTimeout(r, 5))
    const second = await put(OWNER, { ...body(), joins: [] })
    expect(second.status).toBe(200)
    expect(second.body.plan).toMatchObject({ _id: p._id, createdAt: p.createdAt, createdBy: 'own1' })
    expect(second.body.plan.updatedAt).toBeGreaterThan(p.updatedAt)
    expect(await plans().countDocuments({ businessId: 'fp1' })).toBe(1)
  })

  it('ignores _id, businessId and unknown top-level keys in the body', async () => {
    const first = await put(OWNER, body())
    const res = await put(OWNER, { ...body(), _id: 'evil', businessId: 'fp2', extra: 1 })
    expect(res.status).toBe(200)
    expect(res.body.plan._id).toBe(first.body.plan._id)
    expect(res.body.plan.businessId).toBe('fp1')
    expect(res.body.plan.extra).toBeUndefined()
    expect(await plans().countDocuments({ businessId: 'fp2' })).toBe(0)
  })

  it('answers 400 BAD_REQUEST_INPUT when one of the four parts is missing', async () => {
    const { joins, ...rest } = body()
    const res = await put(OWNER, rest)
    expect(res.status).toBe(400)
    expect(res.body).toEqual({ error: 'BAD_REQUEST_INPUT' })
  })

  it('logs counts only, never a number or an area name', async () => {
    await put(OWNER, body())
    await put(OWNER, body({ tables: [table('tblaaa01', '77'), table('tblaaa02', '77')] }))
    const saved = logs.byEvent('floor_plan.saved')
    const refused = logs.byEvent('floor_plan.refused')
    expect(saved.at(-1)).toMatchObject({ tables: 4, joins: 1, areas: 3, first: true })
    expect(refused.at(-1)).toMatchObject({ reason: 'check' })
    const text = JSON.stringify([...saved, ...refused])
    expect(text).not.toContain('בפנים')
    expect(text).not.toContain('"77"')
  })
})

describe('who', () => {
  it('staff reads but cannot replace', async () => {
    await put(OWNER, body())
    const before = await plans().findOne({ businessId: 'fp1' })
    expect((await put(STAFF, { ...body(), joins: [] })).status).toBe(403)
    expect((await get(STAFF)).status).toBe(200)
    expect(await plans().findOne({ businessId: 'fp1' })).toEqual(before)
  })

  it('keeps each business its own plan', async () => {
    const mine = await put(OWNER, body())
    expect((await get(OTHER)).body).toEqual({ plan: null })
    const theirs = await put(OTHER, body())
    expect(theirs.status).toBe(200)
    expect(theirs.body.plan._id).not.toBe(mine.body.plan._id)
    expect((await get(OWNER)).body.plan).toEqual(mine.body.plan)
  })

  it('answers MODULE_OFF without the tables module and 401 without a token', async () => {
    for (const res of [await get(NOMOD), await put(NOMOD, body())]) {
      expect(res.status).toBe(403)
      expect(res.body).toEqual({ error: 'MODULE_OFF', module: 'tables' })
    }
    expect((await request(app).get(URL)).status).toBe(401)
    expect((await request(app).put(URL).send(body())).status).toBe(401)
  })
})

describe('refusals', () => {
  const dupArea = () => body({ areas: [{ key: 'areaaa01', name: 'א', order: 0 }, { key: 'areaaa01', name: 'ב', order: 1 }], tables: [], joins: [] })
  const tables = (...t) => body({ tables: t, joins: [] })
  it.each([
    ['duplicate_key', () => tables(table('tblaaa01', '1'), table('tblaaa01', '2'))],
    ['duplicate_number', () => tables(table('tblaaa01', '1'), table('tblaaa02', '1'))],
    ['duplicate_area', dupArea],
    ['area_missing', () => tables(table('tblaaa01', '1', { areaKey: 'nonearea' }))],
    ['join_table_missing', () => body({ joins: [{ key: 'joinaa01', tableKeys: ['tblaaa01', 'tblnone1'], minSeats: 1, maxSeats: 2, online: false }] })],
    ['join_repeated_table', () => body({ joins: [{ key: 'joinaa01', tableKeys: ['tblaaa01', 'tblaaa01'], minSeats: 1, maxSeats: 2, online: false }] })],
    ['join_mixed_areas', () => body({ joins: [{ key: 'joinaa01', tableKeys: ['tblaaa01', 'tblaaa03'], minSeats: 1, maxSeats: 2, online: false }] })],
    ['duplicate_join', () => body({ joins: [body().joins[0], body().joins[0]] })],
    ['outside_grid', () => tables(table('tblaaa01', '1', { x: 22, w: 3 }))],
    ['outside_grid', () => tables(table('tblaaa01', '1', { x: 23, y: 0, w: 1, h: 2, turned: true }))],
  ])('%s answers 400 BAD_FLOOR_PLAN and writes nothing', async (code, make) => {
    const res = await put(OWNER, make())
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('BAD_FLOOR_PLAN')
    expect(res.body.issues.map(i => i.code)).toEqual([code])
    expect(await plans().countDocuments({})).toBe(0)
  })

  it('a table at x 9 w 2 on a 10-column grid is outside', async () => {
    const res = await put(OWNER, body({ grid: { cols: 10, rows: 10 }, tables: [table('tblaaa01', '1', { x: 9 })], joins: [] }))
    expect(res.body.issues).toEqual([{ code: 'outside_grid', key: 'tblaaa01' }])
  })

  it('answers 400 Validation failed for a schema break', async () => {
    const bad = [
      body({ tables: [table('tblaaa01', '1', { minSeats: 5, maxSeats: 2 })], joins: [] }),
      body({ tables: Array.from({ length: 201 }, (_, i) => table('tbl' + String(i).padStart(4, '0'), String(i))), joins: [] }),
      body({ grid: { cols: 9, rows: 16 } }),
    ]
    for (const b of bad) {
      const res = await put(OWNER, b)
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('Validation failed')
    }
    expect(await plans().countDocuments({})).toBe(0)
  })

  it('allows two tables on the same cells', async () => {
    const res = await put(OWNER, body({ tables: [table('tblaaa01', '1'), table('tblaaa02', '2')], joins: [] }))
    expect(res.status).toBe(200)
  })
})

describe('in use', () => {
  const seed = (id, status, tableKeys, endAt = Date.now() + HOUR, extra = {}) =>
    testDb().collection('bookings').insertOne({
      _id: id, schemaVersion: 2, businessId: 'fp1', createdBy: 'own1', createdAt: 1, updatedAt: 1,
      kind: 'table', status, source: 'request', date: '2026-12-01', time: '19:00', startAt: endAt - 90 * 60000, endAt,
      durationMinutes: 90, partySize: 4, clientId: 'c1', guestName: 'דנה', guestPhone: '0521234567', tableKeys,
      statusHistory: [], publicToken: 'B'.repeat(32), ...extra,
    })
  const without = key => body({ tables: body().tables.filter(t => t.key !== key), joins: [] })

  beforeEach(async () => {
    expect((await put(OWNER, body())).status).toBe(200)
  })

  it.each(['confirmed', 'seated'])('refuses to drop a table a %s booking holds', async status => {
    await seed('bk1', status, ['tblaaa01'])
    const before = await plans().findOne({ businessId: 'fp1' })
    const res = await put(OWNER, without('tblaaa01'))
    expect(res.status).toBe(409)
    expect(res.body).toEqual({
      error: 'TABLE_IN_USE',
      bookings: [{ _id: 'bk1', date: '2026-12-01', time: '19:00', partySize: 4, tableKeys: ['tblaaa01'] }],
    })
    expect(JSON.stringify(res.body)).not.toMatch(/דנה|0521234567/)
    expect(await plans().findOne({ businessId: 'fp1' })).toEqual(before)
  })

  it('lets a held table stay with active false', async () => {
    await seed('bk1', 'confirmed', ['tblaaa01'])
    const b = body({ joins: [] })
    b.tables[0].active = false
    expect((await put(OWNER, b)).status).toBe(200)
  })

  it.each(['finished', 'cancelled', 'no_show'])('a %s booking does not block', async status => {
    await seed('bk1', status, ['tblaaa01'])
    expect((await put(OWNER, without('tblaaa01'))).status).toBe(200)
  })

  it('a booking that ended does not block', async () => {
    await seed('bk1', 'confirmed', ['tblaaa01'], Date.now() - HOUR)
    expect((await put(OWNER, without('tblaaa01'))).status).toBe(200)
  })

  it('a test booking blocks too, and another business booking does not', async () => {
    await seed('bk1', 'confirmed', ['tblaaa01'], Date.now() + HOUR, { test: true })
    await seed('bk2', 'confirmed', ['tblaaa02'], Date.now() + HOUR, { businessId: 'fp2', publicToken: 'C'.repeat(32) })
    const res = await put(OWNER, body({ tables: body().tables.filter(t => t.key !== 'tblaaa01').concat(), joins: [] }))
    expect(res.status).toBe(409)
    expect(res.body.bookings.map(b => b._id)).toEqual(['bk1'])
  })

  it('a booking on a join blocks dropping the join, until another join has the same tables', async () => {
    await seed('bk1', 'confirmed', ['tblaaa02', 'tblaaa01'])
    const dropped = await put(OWNER, body({ joins: [] }))
    expect(dropped.status).toBe(409)
    expect(dropped.body.error).toBe('TABLE_IN_USE')
    const renamed = body()
    renamed.joins[0].key = 'joinaa02'
    expect((await put(OWNER, renamed)).status).toBe(200)
  })
})
