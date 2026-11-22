'use strict'
/** Plan 667 - PUT /api/v1/floor-plan/confirm-mode: one field of the profile, owner only, module `tables`. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { clearModuleCache } = require('../middleware/require-module')
const { tableServiceOf } = require('../generated/schemas/front-desk/table-service')
const { checkStoredDoc } = require('../middleware/validate')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER = { userId: 'own1', name: 'בעלים', businessId: 'cm1', businessRole: 'owner' }
const STAFF = { userId: 'st1', name: 'עובד', businessId: 'cm1', businessRole: 'staff' }
const NOMOD = { userId: 'own3', name: 'ללא', businessId: 'cm3', businessRole: 'owner' }
const NOPROFILE = { userId: 'own4', name: 'אין', businessId: 'cm4', businessRole: 'owner' }
const URL = '/api/v1/floor-plan/confirm-mode'
const profiles = () => testDb().collection('frontDeskProfiles')
const put = (user, body) => request(app).put(URL).set(as(user)).send(body)

const profile = (id, businessId, extra = {}) => ({
  _id: id, schemaVersion: 2, businessId, createdBy: 'own1', createdAt: 1, updatedAt: 1,
  businessType: 'restaurant', slug: `place-${businessId}`, displayName: 'מקום', hours: [],
  requestKinds: { table: { enabled: true, questions: [], rules: {}, expireAfterHours: 24, defaultDurationMinutes: 90 } },
  assistant: { level: 0, tone: 'warm' }, status: 'draft', ...extra,
})

const STORED = {
  confirmMode: 'manual', autoMaxParty: 4, slotMinutes: 30,
  turnMinutes: [{ maxParty: 4, minutes: 60 }, { maxParty: 30, minutes: 150 }],
  lastSeatingBeforeCloseMinutes: 45, bufferMinutes: 10, holdMinutes: 20, autoNoShow: true,
  reminderHour: '09:30', cancellationCutoffHours: 5,
}

beforeEach(async () => {
  const db = testDb()
  for (const c of ['frontDeskProfiles', 'businesses']) await db.collection(c).deleteMany({})
  const on = modules => ({ modules, name: 'b', ownerId: 'x', createdAt: 1 })
  await db.collection('businesses').insertMany([
    { _id: 'cm1', ...on(['frontdesk', 'tables']) },
    { _id: 'cm2', ...on(['frontdesk', 'tables']) },
    { _id: 'cm3', ...on(['frontdesk']) },
    { _id: 'cm4', ...on(['frontdesk', 'tables']) },
  ])
  clearModuleCache()
})

describe('confirm-mode', () => {
  it('a profile with no tableService gets the whole settings object over the defaults', async () => {
    await profiles().insertOne(profile('p1', 'cm1'))
    const before = await profiles().findOne({ _id: 'p1' })
    const res = await put(OWNER, { confirmMode: 'auto' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ confirmMode: 'auto' })
    const after = await profiles().findOne({ _id: 'p1' })
    expect(after.tableService).toEqual({ ...tableServiceOf(before), confirmMode: 'auto' })
    expect(after.updatedAt).toBeGreaterThan(1)
    expect(checkStoredDoc('frontDeskProfiles', after).ok).toBe(true)
  })

  it('a profile with stored settings changes only confirmMode and updatedAt', async () => {
    await profiles().insertOne(profile('p1', 'cm1', { tableService: STORED }))
    const before = await profiles().findOne({ _id: 'p1' })
    const res = await put(OWNER, { confirmMode: 'auto' })
    expect(res.status).toBe(200)
    const after = await profiles().findOne({ _id: 'p1' })
    expect(after.tableService).toEqual({ ...STORED, confirmMode: 'auto' })
    const strip = ({ updatedAt, tableService, ...rest }) => rest
    expect(strip(after)).toEqual(strip(before))
    expect(checkStoredDoc('frontDeskProfiles', after).ok).toBe(true)
    const back = await put(OWNER, { confirmMode: 'manual' })
    expect(back.body).toEqual({ confirmMode: 'manual' })
    expect((await profiles().findOne({ _id: 'p1' })).tableService).toEqual(STORED)
  })

  it('staff get 403 and nothing changes', async () => {
    await profiles().insertOne(profile('p1', 'cm1'))
    const before = await profiles().findOne({ _id: 'p1' })
    const res = await put(STAFF, { confirmMode: 'auto' })
    expect(res.status).toBe(403)
    expect(await profiles().findOne({ _id: 'p1' })).toEqual(before)
  })

  it('a business without the tables module gets 403 MODULE_OFF', async () => {
    await profiles().insertOne(profile('p3', 'cm3'))
    const res = await put(NOMOD, { confirmMode: 'auto' })
    expect(res.status).toBe(403)
    expect(res.body).toEqual({ error: 'MODULE_OFF', module: 'tables' })
    expect((await profiles().findOne({ _id: 'p3' })).tableService).toBeUndefined()
  })

  it('a bad or empty body gets 400 BAD_REQUEST_INPUT', async () => {
    await profiles().insertOne(profile('p1', 'cm1'))
    for (const body of [{ confirmMode: 'maybe' }, {}]) {
      const res = await put(OWNER, body)
      expect(res.status).toBe(400)
      expect(res.body).toEqual({ error: 'BAD_REQUEST_INPUT' })
    }
    expect((await profiles().findOne({ _id: 'p1' })).tableService).toBeUndefined()
  })

  it('a business with no profile gets 404 NO_PROFILE', async () => {
    const res = await put(NOPROFILE, { confirmMode: 'auto' })
    expect(res.status).toBe(404)
    expect(res.body).toEqual({ error: 'NO_PROFILE' })
  })

  it('never touches another business', async () => {
    await profiles().insertMany([profile('p1', 'cm1'), profile('p2', 'cm2')])
    const other = await profiles().findOne({ _id: 'p2' })
    expect((await put(OWNER, { confirmMode: 'auto' })).status).toBe(200)
    expect(await profiles().findOne({ _id: 'p2' })).toEqual(other)
  })
})
