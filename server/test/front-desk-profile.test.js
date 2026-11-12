'use strict'
/** Plan 548 - the front desk profile through the real generic API: one per business, owner-only, server-owned fields. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { templateFor } = require('../generated/schemas/front-desk-templates')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

beforeEach(async () => {
  await testDb().collection('frontDeskProfiles').deleteMany({})
})

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER = { userId: 'own1', businessId: 'b1', businessRole: 'owner' }
const STAFF = { userId: 'st1', businessId: 'b1', businessRole: 'staff' }
const OWNER2 = { userId: 'own2', businessId: 'b2', businessRole: 'owner' }
const url = (id = '') => `/api/v1/data/frontDeskProfiles${id ? '/' + id : ''}`
const body = (extra = {}) => ({ ...templateFor('catering'), slug: 'my-catering', displayName: 'קייטרינג', ...extra })
const raw = id => testDb().collection('frontDeskProfiles').findOne({ _id: id })

/** A stored profile of business b1 carrying a WhatsApp block (only the server writes one). */
async function seedWithWhatsapp() {
  const created = await request(app).post(url()).set(as(OWNER)).send(body())
  await testDb().collection('frontDeskProfiles').updateOne(
    { _id: created.body._id },
    { $set: { whatsapp: { phoneNumberId: 'PN-123', ownerAlertPhone: '0501112222', ownerAlertOptIn: true } } }
  )
  return created.body._id
}

describe('create and keep server-owned fields', () => {
  it('owner POST gives 201 and a draft even when the body sends status active', async () => {
    const res = await request(app).post(url()).set(as(OWNER)).send(body({ status: 'active', whatsapp: { phoneNumberId: 'X', ownerAlertOptIn: true } }))
    expect(res.status).toBe(201)
    expect(res.body.status).toBe('draft')
    expect(res.body.businessId).toBe('b1')
    expect((await raw(res.body._id)).whatsapp).toBeUndefined()
  })

  it('a later generic PUT sending status or whatsapp leaves both as stored', async () => {
    const id = await seedWithWhatsapp()
    await testDb().collection('frontDeskProfiles').updateOne({ _id: id }, { $set: { status: 'pilot' } })
    const res = await request(app).put(url(id)).set(as(OWNER)).send({
      displayName: 'שם חדש',
      status: 'active',
      whatsapp: { phoneNumberId: 'HACK', ownerAlertOptIn: false },
    })
    expect(res.status).toBe(200)
    expect(res.body.displayName).toBe('שם חדש')
    expect(res.body.status).toBe('pilot')
    const stored = await raw(id)
    expect(stored.status).toBe('pilot')
    expect(stored.whatsapp).toEqual({ phoneNumberId: 'PN-123', ownerAlertPhone: '0501112222', ownerAlertOptIn: true })
  })
})

describe('staff cannot write', () => {
  it('POST, PUT and DELETE answer 403 and store nothing', async () => {
    const post = await request(app).post(url()).set(as(STAFF)).send(body())
    expect(post.status).toBe(403)
    expect(await testDb().collection('frontDeskProfiles').countDocuments()).toBe(0)

    const created = await request(app).post(url()).set(as(OWNER)).send(body())
    const before = await raw(created.body._id)
    expect((await request(app).put(url(created.body._id)).set(as(STAFF)).send({ displayName: 'x' })).status).toBe(403)
    expect((await request(app).delete(url(created.body._id)).set(as(STAFF))).status).toBe(403)
    expect(await raw(created.body._id)).toEqual(before)
  })
})

describe('one per business, one slug per profile', () => {
  it('a second profile in the same business is PROFILE_EXISTS', async () => {
    expect((await request(app).post(url()).set(as(OWNER)).send(body())).status).toBe(201)
    const res = await request(app).post(url()).set(as(OWNER)).send(body({ slug: 'another-slug' }))
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ error: 'PROFILE_EXISTS' })
    expect(await testDb().collection('frontDeskProfiles').countDocuments()).toBe(1)
  })

  it('a slug another business uses is SLUG_TAKEN, on create and on edit', async () => {
    expect((await request(app).post(url()).set(as(OWNER)).send(body())).status).toBe(201)
    const dup = await request(app).post(url()).set(as(OWNER2)).send(body())
    expect(dup.status).toBe(409)
    expect(dup.body).toMatchObject({ error: 'SLUG_TAKEN' })

    const mine = await request(app).post(url()).set(as(OWNER2)).send(body({ slug: 'second-one' }))
    expect(mine.status).toBe(201)
    const put = await request(app).put(url(mine.body._id)).set(as(OWNER2)).send({ slug: 'my-catering' })
    expect(put.status).toBe(409)
    expect(put.body).toMatchObject({ error: 'SLUG_TAKEN' })
  })

  it('slug AB or "has space" is 400', async () => {
    for (const slug of ['AB', 'has space']) {
      const res = await request(app).post(url()).set(as(OWNER)).send(body({ slug }))
      expect(res.status).toBe(400)
    }
    expect(await testDb().collection('frontDeskProfiles').countDocuments()).toBe(0)
  })
})

describe('reads never carry the WhatsApp routing id', () => {
  it('owner and staff, list and by id', async () => {
    const id = await seedWithWhatsapp()
    for (const user of [OWNER, STAFF]) {
      const list = await request(app).get(url()).set(as(user))
      expect(list.status).toBe(200)
      expect(list.body).toHaveLength(1)
      expect(list.body[0].whatsapp).toEqual({ ownerAlertPhone: '0501112222', ownerAlertOptIn: true })
      const one = await request(app).get(url(id)).set(as(user))
      expect(one.status).toBe(200)
      expect(JSON.stringify(one.body)).not.toContain('phoneNumberId')
      expect(JSON.stringify(list.body)).not.toContain('PN-123')
    }
  })

  it('a PUT answer does not carry it either', async () => {
    const id = await seedWithWhatsapp()
    const res = await request(app).put(url(id)).set(as(OWNER)).send({ displayName: 'חדש' })
    expect(res.status).toBe(200)
    expect(JSON.stringify(res.body)).not.toContain('phoneNumberId')
  })
})

describe('plan 556: template questions for catering and private chef', () => {
  const { qualify } = require('../generated/schemas/front-desk/qualify')
  const questions = (type, kind) => templateFor(type).requestKinds[kind].questions
  const byKey = (type, kind, key) => questions(type, kind).find(q => q.key === key)

  it('private chef and catering events ask a kashrut question and an optional start time', () => {
    for (const type of ['private_chef', 'catering']) {
      expect(byKey(type, 'event', 'kashrut')).toMatchObject({ label: 'fd_q_kashrut', required: false })
      expect(byKey(type, 'event', 'time')).toMatchObject({ type: 'time', required: false })
      expect(questions(type, 'event').length).toBeLessThanOrEqual(12)
    }
  })

  it('catering events ask the dietary question the private chef already asks', () => {
    expect(byKey('catering', 'event', 'dietary')).toEqual(byKey('private_chef', 'event', 'dietary'))
  })

  it('the catering venue question is required, so a request without it needs more information', () => {
    expect(byKey('catering', 'event', 'location')).toMatchObject({ label: 'fd_q_venue', required: true })
    const kind = templateFor('catering').requestKinds.event
    const out = qualify(kind, { date: '2030-01-01', partySize: 50, eventTypeKey: 'wedding' }, {}, { kind: 'event' })
    expect(out.reasons).toContain('fd_reason_missing_answer|q=location')
  })

  it('the catering event-type question works for a business with no event types', () => {
    const kind = templateFor('catering').requestKinds.event
    expect(byKey('catering', 'event', 'event_type').options).toEqual([])
    const without = qualify(kind, { date: '2030-01-01', partySize: 50, location: 'תל אביב' }, {}, { kind: 'event' })
    expect(without.reasons).toContain('fd_reason_missing_answer|q=event_type')
    const given = qualify(kind, { date: '2030-01-01', partySize: 50, eventTypeKey: 'wedding', location: 'תל אביב' }, {}, { kind: 'event' })
    expect(given.reasons.some(r => r.includes('event_type'))).toBe(false)
  })
})

describe('plan 556: a request expires at the earlier of its expiry and its requested start', () => {
  const { expireDue } = require('../utils/request-expiry')
  const { jerusalemDate } = require('../middleware/usage')
  const DAY = 86_400_000

  const seedRequest = (id, wanted, createdAt, status = 'new') =>
    testDb().collection('requests').insertOne({
      _id: id, schemaVersion: 2, businessId: 'b1', createdBy: 'o', createdAt, updatedAt: createdAt, kind: 'table', status, channel: 'manual',
      clientId: 'c1', guestName: 'דנה', guestPhone: '0521234567', wanted, answers: [],
      statusHistory: [{ status, at: createdAt, by: 'o', byName: '', via: 'member' }], publicToken: id.padEnd(32, 'x'),
    })

  it('a short-notice restaurant request is expired once its own time has passed, though it is younger than 4 hours', async () => {
    const now = Date.now()
    await testDb().collection('requests').deleteMany({})
    await testDb().collection('frontDeskProfiles').insertOne({
      _id: 'p556', schemaVersion: 2, businessId: 'b1', createdBy: 'o', createdAt: 1, updatedAt: 1,
      ...templateFor('restaurant'), slug: 'place-556', displayName: 'מקום',
    })
    expect(templateFor('restaurant').requestKinds.table.expireAfterHours).toBe(4)
    await seedRequest('past', { date: jerusalemDate(now - 2 * DAY), time: '12:00', partySize: 2 }, now - 3_600_000)
    await seedRequest('future', { date: jerusalemDate(now + 5 * DAY), time: '12:00', partySize: 2 }, now - 3_600_000)
    await seedRequest('qualified_past', { date: jerusalemDate(now - 2 * DAY), time: '12:00', partySize: 2 }, now - 3_600_000, 'qualified')
    const count = await expireDue(testDb(), 'b1', now)
    expect(count).toBe(1)
    const status = async id => (await testDb().collection('requests').findOne({ _id: id })).status
    expect(await status('past')).toBe('expired')
    expect(await status('future')).toBe('new')
    expect(await status('qualified_past')).toBe('qualified')
    await testDb().collection('requests').deleteMany({})
    await testDb().collection('frontDeskProfiles').deleteMany({})
  })
})
