'use strict'
/** Plan 477 - the staff stage rule: the Mongo filter and the in-memory check must agree on the same events. */

const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app')
const { eventFilter, isEventVisible, visibleStagesFor, withEventVisibility } = require('../utils/event-visibility')

beforeAll(async () => {
  await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const STAFF_ID = 'st1'
const FIXTURES = [
  { _id: 'e1', stage: 'inquiry', createdBy: 'own1' },
  { _id: 'e2', stage: 'quote_sent', createdBy: 'own1' },
  { _id: 'e3', stage: 'ordering', createdBy: 'own1' },
  { _id: 'e4', stage: 'execution', createdBy: 'own1' },
  { _id: 'e5', stage: 'finished', createdBy: 'own1' },
  { _id: 'e6', createdBy: 'own1' }, // legacy: no stage = inquiry
  { _id: 'e7', stage: 'inquiry', createdBy: STAFF_ID }, // the staff member's own
  { _id: 'e8', stage: 'not_closed', createdBy: 'other' },
].map(e => ({ businessId: 'b1', name: e._id, ...e }))

const LISTS = [
  ['ordering + execution', ['ordering', 'execution']],
  ['inquiry only', ['inquiry']],
  ['none', []],
  ['all', ['inquiry', 'quote_sent', 'deposit_paid', 'ordering', 'execution', 'post_production', 'finished', 'not_closed']],
]

beforeEach(async () => {
  const db = testDb()
  for (const c of ['menuEvents', 'businesses']) await db.collection(c).deleteMany({})
  await db.collection('menuEvents').insertMany(FIXTURES)
})

const idsByFilter = async filter =>
  (await testDb().collection('menuEvents').find({ $and: [{ businessId: 'b1' }, filter] }).toArray()).map(e => e._id).sort()

describe('eventFilter and isEventVisible', () => {
  it.each(LISTS)('agree on the eight fixtures (%s)', async (_label, stages) => {
    const inMemory = FIXTURES.filter(e => isEventVisible(stages, STAFF_ID, e)).map(e => e._id).sort()
    expect(await idsByFilter(eventFilter(stages, STAFF_ID))).toEqual(inMemory)
  })

  it('ordering + execution: the visible stages, plus the event the staff member created', () => {
    const visible = FIXTURES.filter(e => isEventVisible(['ordering', 'execution'], STAFF_ID, e)).map(e => e._id)
    expect(visible).toEqual(['e3', 'e4', 'e7'])
  })

  it('a legacy event without a stage counts as inquiry', () => {
    const legacy = FIXTURES.find(e => e._id === 'e6')
    expect(isEventVisible(['inquiry'], 'someone', legacy)).toBe(true)
    expect(isEventVisible(['ordering'], 'someone', legacy)).toBe(false)
  })

  it('no list = every event', async () => {
    expect(eventFilter(null, STAFF_ID)).toEqual({})
    expect(FIXTURES.every(e => isEventVisible(null, STAFF_ID, e))).toBe(true)
  })
})

describe('visibleStagesFor and withEventVisibility', () => {
  const req = user => ({ user })
  const STAFF = { userId: STAFF_ID, businessId: 'b1', businessRole: 'staff' }
  const OWNER = { userId: 'own1', businessId: 'b1', businessRole: 'owner' }

  it('only staff of a business with a stored list get a list', async () => {
    await testDb().collection('businesses').insertOne({ _id: 'b1', staffVisibleStages: ['ordering'] })
    expect(await visibleStagesFor(req(STAFF))).toEqual(['ordering'])
    expect(await visibleStagesFor(req(OWNER))).toBeNull()
    expect(await visibleStagesFor(req(undefined))).toBeNull()
    expect(await visibleStagesFor(req({ ...STAFF, businessId: 'b9' }))).toBeNull()
  })

  it('no stored list = null (every stage)', async () => {
    await testDb().collection('businesses').insertOne({ _id: 'b1' })
    expect(await visibleStagesFor(req(STAFF))).toBeNull()
  })

  it('narrows only menuEvents filters', async () => {
    await testDb().collection('businesses').insertOne({ _id: 'b1', staffVisibleStages: ['ordering'] })
    const base = { businessId: 'b1' }
    expect(await withEventVisibility(req(STAFF), 'recipes', base)).toBe(base)
    expect(await withEventVisibility(req(OWNER), 'menuEvents', base)).toBe(base)
    expect(await withEventVisibility(req(STAFF), 'menuEvents', base)).toEqual({ $and: [base, eventFilter(['ordering'], STAFF_ID)] })
  })
})
