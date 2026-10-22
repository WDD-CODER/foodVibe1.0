'use strict'
/**
 * Plan 477 (ADR 0024) - staff read events only in the stages the owner allowed, plus events they created.
 * Every server route that returns or acts on events applies the rule; owners see everything.
 */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { jerusalemDate } = require('../middleware/usage')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const OWNER = { userId: 'own1', name: 'owner1', businessId: 'b1', businessRole: 'owner' }
const STAFF = { userId: 'st1', name: 'staff1', businessId: 'b1', businessRole: 'staff' }
const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const DAY = 86400000
const soon = jerusalemDate(Date.now() + 3 * DAY)

const event = (_id, createdBy, extra = {}) => ({
  _id, businessId: 'b1', userId: createdBy, createdBy, name: 'event ' + _id, eventType: 'wedding', servingType: 'buffet',
  guestCount: 50, sections: [], schemaVersion: 2, createdAt: Date.now() - DAY, updatedAt: 1, eventDate: soon, ...extra,
})

const EVENTS = [
  event('inq', 'own1', { stage: 'inquiry' }),
  event('ord', 'own1', { stage: 'ordering' }),
  event('legacy', 'own1'), // no stage: counts as inquiry
  event('mine', 'st1', { stage: 'inquiry' }),
  event('trashq', 'own1', { stage: 'quote_sent', deletedAt: Date.now() - DAY, deletedBy: 'own1' }),
]

const ids = res => res.body.map(e => e._id).sort()
const setStages = async stages =>
  testDb().collection('businesses').updateOne({ _id: 'b1' }, stages ? { $set: { staffVisibleStages: stages } } : { $unset: { staffVisibleStages: '' } })

beforeEach(async () => {
  const db = testDb()
  for (const c of ['businesses', 'menuEvents', 'users']) await db.collection(c).deleteMany({})
  await db.collection('businesses').insertOne({
    _id: 'b1', name: 'business 1', ownerId: 'own1', createdAt: Date.now() - 100 * DAY, internal: false, lastSyncedMasterVersion: 0,
    staffVisibleStages: ['ordering', 'execution'],
  })
  await db.collection('menuEvents').insertMany(EVENTS)
})

describe('staff read only the stages the owner allowed', () => {
  it('list: staff get the ordering event and the inquiry they created; the owner gets every live event', async () => {
    const staff = await request(app).get('/api/v1/data/menuEvents').set(as(STAFF))
    expect(staff.status).toBe(200)
    expect(ids(staff)).toEqual(['mine', 'ord'])
    const owner = await request(app).get('/api/v1/data/menuEvents').set(as(OWNER))
    expect(ids(owner)).toEqual(['inq', 'legacy', 'mine', 'ord'])
  })

  it('by id: a hidden event is 404 for staff and 200 for the owner', async () => {
    expect((await request(app).get('/api/v1/data/menuEvents/inq').set(as(STAFF))).status).toBe(404)
    expect((await request(app).get('/api/v1/data/menuEvents/ord').set(as(STAFF))).status).toBe(200)
    expect((await request(app).get('/api/v1/data/menuEvents/mine').set(as(STAFF))).status).toBe(200)
    expect((await request(app).get('/api/v1/data/menuEvents/inq').set(as(OWNER))).status).toBe(200)
  })

  it('a legacy event without a stage is treated as inquiry', async () => {
    expect((await request(app).get('/api/v1/data/menuEvents/legacy').set(as(STAFF))).status).toBe(404)
    await setStages(['inquiry'])
    expect((await request(app).get('/api/v1/data/menuEvents/legacy').set(as(STAFF))).status).toBe(200)
  })

  it('count: staff count only visible events', async () => {
    const staff = await request(app).get('/api/v1/data/menuEvents/count').set(as(STAFF))
    expect(staff.body).toEqual({ count: 2 })
    const owner = await request(app).get('/api/v1/data/menuEvents/count').set(as(OWNER))
    expect(owner.body).toEqual({ count: 4 })
  })

  it('trash: staff never see a hidden event in Trash, the owner does', async () => {
    const staff = await request(app).get('/api/v1/data/menuEvents/trash').set(as(STAFF))
    expect(staff.status).toBe(200)
    expect(ids(staff)).toEqual([])
    const owner = await request(app).get('/api/v1/data/menuEvents/trash').set(as(OWNER))
    expect(ids(owner)).toEqual(['trashq'])
  })

  it('a note on a hidden event: 404 for staff and nothing is stored', async () => {
    const res = await request(app).post('/api/v1/events/inq/notes').set(as(STAFF)).send({ text: 'hello' })
    expect(res.status).toBe(404)
    expect((await testDb().collection('menuEvents').findOne({ _id: 'inq' })).notes).toBeUndefined()
  })

  it('a stage move on a hidden event: 404 for staff and the stage is unchanged', async () => {
    const res = await request(app).put('/api/v1/events/inq/stage').set(as(STAFF)).send({ stage: 'quote_sent' })
    expect(res.status).toBe(404)
    expect((await testDb().collection('menuEvents').findOne({ _id: 'inq' })).stage).toBe('inquiry')
  })

  it('writes by id: a hidden event is not found for staff (edit, delete, bulk delete, restore)', async () => {
    expect((await request(app).put('/api/v1/data/menuEvents/inq').set(as(STAFF)).send({ name: 'x' })).status).toBe(404)
    expect((await request(app).delete('/api/v1/data/menuEvents/inq').set(as(STAFF))).status).toBe(404)
    const bulk = await request(app).delete('/api/v1/data/menuEvents/bulk').set(as(STAFF)).send({ ids: ['inq'] })
    expect(bulk.body).toEqual({ ok: true, deletedCount: 0 })
    expect((await request(app).put('/api/v1/data/menuEvents/trashq/restore').set(as(STAFF))).status).toBe(404)
    const stored = await testDb().collection('menuEvents').findOne({ _id: 'inq' })
    expect(stored).toMatchObject({ name: 'event inq' })
    expect(stored.deletedAt).toBeUndefined()
  })

  it('dashboard: the staff funnel and upcoming list count no hidden event', async () => {
    const staff = await request(app).get('/api/v1/stats/business').set(as(STAFF))
    expect(staff.status).toBe(200)
    const funnel = Object.fromEntries(staff.body.funnel.map(f => [f.stage, f.count]))
    expect(funnel).toMatchObject({ inquiry: 1, quote_sent: 0, ordering: 1 })
    expect(staff.body.upcoming.map(e => e._id).sort()).toEqual(['mine', 'ord'])
    const owner = await request(app).get('/api/v1/stats/business').set(as(OWNER))
    expect(Object.fromEntries(owner.body.funnel.map(f => [f.stage, f.count]))).toMatchObject({ inquiry: 2, ordering: 1 })
  })

  it('no stored list: staff see every event (today\'s behaviour)', async () => {
    await setStages(null)
    const staff = await request(app).get('/api/v1/data/menuEvents').set(as(STAFF))
    expect(ids(staff)).toEqual(['inq', 'legacy', 'mine', 'ord'])
  })

  it('other item types are not filtered for staff', async () => {
    await testDb().collection('recipes').deleteMany({})
    await testDb().collection('recipes').insertOne({ _id: 'r1', businessId: 'b1', createdBy: 'own1', nameHebrew: 'מרק' })
    const res = await request(app).get('/api/v1/data/recipes').set(as(STAFF))
    expect(ids(res)).toEqual(['r1'])
  })
})

describe('PUT /api/v1/business/staff-visible-stages', () => {
  const put = (body, who = OWNER) => request(app).put('/api/v1/business/staff-visible-stages').set(as(who)).send(body)
  const stored = async () => (await testDb().collection('businesses').findOne({ _id: 'b1' })).staffVisibleStages

  it('staff get 403 and the business is unchanged', async () => {
    const res = await put({ stages: ['inquiry'] }, STAFF)
    expect(res.status).toBe(403)
    expect(await stored()).toEqual(['ordering', 'execution'])
  })

  it('the owner saves: stored de-duplicated in pipeline order and returned', async () => {
    const res = await put({ stages: ['execution', 'inquiry', 'execution'] })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ staffVisibleStages: ['inquiry', 'execution'] })
    expect(await stored()).toEqual(['inquiry', 'execution'])
  })

  it('an empty list is allowed (staff then see only their own events)', async () => {
    expect((await put({ stages: [] })).status).toBe(200)
    const staff = await request(app).get('/api/v1/data/menuEvents').set(as(STAFF))
    expect(ids(staff)).toEqual(['mine'])
  })

  it.each([
    ['an unknown stage', { stages: ['inquiry', 'party'] }],
    ['a missing list', {}],
    ['a non-array', { stages: 'inquiry' }],
    ['an extra key', { stages: [], businessId: 'b2' }],
  ])('refuses %s with 400 and keeps the list', async (_label, body) => {
    const res = await put(body)
    expect(res.status).toBe(400)
    expect(await stored()).toEqual(['ordering', 'execution'])
  })

  it('GET /api/v1/business returns the list to any member', async () => {
    const res = await request(app).get('/api/v1/business').set(as(STAFF))
    expect(res.body.staffVisibleStages).toEqual(['ordering', 'execution'])
  })
})
