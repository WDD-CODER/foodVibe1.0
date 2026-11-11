'use strict'
/** Plan 550 (A1) - pins what the generic POST /api/v1/data/menuEvents stores for a new event, for an owner and for staff. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER = { userId: 'own1', name: 'בעלים', businessId: 'b1', businessRole: 'owner' }
const STAFF = { userId: 'st1', name: 'עובד', businessId: 'b1', businessRole: 'staff' }

const BODY = {
  name: 'דנה – חתונה',
  clientId: 'c1',
  clientName: 'דנה',
  clientPhone: '0521234567',
  eventDate: '2026-12-24',
  guestCount: 40,
  eventType: 'wedding',
  eventTypeSnapshot: { key: 'wedding', name: 'חתונה', coefficient: 1 },
  servingType: '',
  sections: [],
  stage: 'finished',
  notes: [{ _id: 'x', text: 'x', at: 1, by: 'u', byName: 'u' }],
  planSnapshot: { frozenAt: 5, items: [] },
}

const IGNORED = ['_id', '_masterId', 'createdAt', 'updatedAt']

/** Stored doc minus the volatile fields. */
function pinned(doc) {
  const copy = { ...doc }
  for (const key of IGNORED) delete copy[key]
  copy.stageHistory = doc.stageHistory.map(({ at, ...rest }) => rest)
  return copy
}

async function create(user) {
  const res = await request(app).post('/api/v1/data/menuEvents').set(as(user)).send(BODY)
  expect([res.status, res.body.issues]).toEqual([201, undefined])
  const stored = await testDb().collection('menuEvents').findOne({ _id: res.body._id })
  expect(stored._masterId).toBe(stored._id)
  return pinned(stored)
}

describe('generic POST menuEvents', () => {
  it('owner: stores the inquiry defaults and drops the server fields', async () => {
    expect(await create(OWNER)).toEqual({
      name: 'דנה – חתונה',
      clientId: 'c1',
      clientName: 'דנה',
      clientPhone: '0521234567',
      eventDate: '2026-12-24',
      guestCount: 40,
      eventType: 'wedding',
      eventTypeSnapshot: { key: 'wedding', name: 'חתונה', coefficient: 1 },
      servingType: '',
      sections: [],
      userId: 'own1',
      businessId: 'b1',
      createdBy: 'own1',
      _userModified: false,
      schemaVersion: 2,
      stage: 'inquiry',
      stageHistory: [{ stage: 'inquiry', by: 'own1', byName: 'בעלים' }],
      notes: [],
    })
  })

  it('staff: same defaults, stamped with the staff member', async () => {
    const doc = await create(STAFF)
    expect(doc).toMatchObject({ userId: 'st1', createdBy: 'st1', stage: 'inquiry', notes: [], schemaVersion: 2, _userModified: false })
    expect(doc.stageHistory).toEqual([{ stage: 'inquiry', by: 'st1', byName: 'עובד' }])
    expect(doc).not.toHaveProperty('planSnapshot')
  })
})
