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
