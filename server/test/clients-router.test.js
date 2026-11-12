'use strict'
/** Plan 551 - POST /api/v1/clients/:id/merge, PUT /:id/do-not-contact and the merged-client restore refusal. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { stored } = require('./helpers/v2-docs')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

beforeEach(async () => {
  const db = testDb()
  for (const c of ['clients', 'menuEvents', 'requests', 'bookings']) await db.collection(c).deleteMany({})
  try { await db.collection('conversations').drop() } catch { /* not there */ }
})

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER = { userId: 'own1', name: 'owner', businessId: 'b1', businessRole: 'owner' }
const STAFF = { userId: 'st1', name: 'staff', businessId: 'b1', businessRole: 'staff' }
const OUTSIDER = { userId: 'out1', name: 'outsider', businessId: 'b2', businessRole: 'owner' }

async function seedClient(_id, extra = {}, businessId = 'b1') {
  const doc = stored(
    { name: `client ${_id}`, phone: '050-123 4567', phoneNormalized: '0501234567', clientType: 'private', ...extra },
    { _id, userId: 'own1', businessId, createdBy: 'own1' },
  )
  await testDb().collection('clients').insertOne(doc)
  return doc
}
const raw = id => testDb().collection('clients').findOne({ _id: id })
const merge = (user, id, intoId) => request(app).post(`/api/v1/clients/${id}/merge`).set(as(user)).send({ intoId })
const dnc = (user, id, body) => request(app).put(`/api/v1/clients/${id}/do-not-contact`).set(as(user)).send(body)

describe('POST /:id/merge', () => {
  it('re-keys events, requests and bookings of the business only; a missing conversations collection is a no-op', async () => {
    await seedClient('A', { liveKey: '501234567', phoneKey: '501234567' })
    await seedClient('B', { phone: '052-999 8888', phoneNormalized: '0529998888' })
    const db = testDb()
    await db.collection('menuEvents').insertMany([
      { _id: 'e1', businessId: 'b1', clientId: 'A', clientName: 'old' },
      { _id: 'e2', businessId: 'b2', clientId: 'A' },
    ])
    await db.collection('requests').insertOne({ _id: 'r1', businessId: 'b1', clientId: 'A' })
    await db.collection('bookings').insertOne({ _id: 'k1', businessId: 'b1', clientId: 'A' })
    const res = await merge(OWNER, 'A', 'B')
    expect(res.status).toBe(200)
    expect(res.body.moved).toEqual({ menuEvents: 1, requests: 1, bookings: 1, conversations: 0 })
    expect(res.body.client._id).toBe('B')
    expect(await db.collection('menuEvents').findOne({ _id: 'e1' })).toMatchObject({ clientId: 'B', clientName: 'old' })
    expect((await db.collection('menuEvents').findOne({ _id: 'e2' })).clientId).toBe('A')
    expect((await db.collection('requests').findOne({ _id: 'r1' })).clientId).toBe('B')
    expect((await db.collection('bookings').findOne({ _id: 'k1' })).clientId).toBe('B')
  })

  it('re-keys conversations when the collection exists', async () => {
    await seedClient('A')
    await seedClient('B')
    await testDb().collection('conversations').insertOne({ _id: 'v1', businessId: 'b1', clientId: 'A' })
    const res = await merge(OWNER, 'A', 'B')
    expect(res.body.moved.conversations).toBe(1)
  })

  it('stamps A and folds A into B: sums, unions, first / last, notes, liveKey', async () => {
    await seedClient('A', {
      liveKey: '501234567', counters: { events: 2, requests: 1 }, kinds: ['diner', 'lead'], tags: ['vip', 'x'],
      firstSeenAt: 100, lastContactAt: 500, notes: 'from A',
    })
    await seedClient('B', {
      counters: { events: 1, bookings: 4 }, kinds: ['event_client', 'diner'], tags: ['y', 'vip'],
      firstSeenAt: 200, lastContactAt: 300, notes: 'from B',
    })
    const res = await merge(OWNER, 'A', 'B')
    expect(res.status).toBe(200)
    const a = await raw('A')
    expect(a.mergedInto).toBe('B')
    expect(a.deletedAt).toEqual(expect.any(Number))
    expect(a.deletedBy).toBe('own1')
    expect(a).not.toHaveProperty('liveKey')
    const b = await raw('B')
    expect(b.counters).toEqual({ events: 3, requests: 1, bookings: 4 })
    expect(b.kinds).toEqual(['event_client', 'diner', 'lead'])
    expect(b.tags).toEqual(['y', 'vip', 'x'])
    expect(b.firstSeenAt).toBe(100)
    expect(b.lastContactAt).toBe(500)
    expect(b.notes).toBe('from B\n\nfrom A')
  })

  it('caps kinds at 3, tags at 12 and notes at 2000', async () => {
    const many = Array.from({ length: 10 }, (_, i) => `a${i}`)
    await seedClient('A', { kinds: ['lead'], tags: many, notes: 'x'.repeat(1500) })
    await seedClient('B', { kinds: ['diner', 'event_client'], tags: ['b1', 'b2', 'b3', 'b4'], notes: 'y'.repeat(1500) })
    await merge(OWNER, 'A', 'B')
    const b = await raw('B')
    expect(b.kinds).toHaveLength(3)
    expect(b.tags).toHaveLength(12)
    expect(b.tags.slice(0, 4)).toEqual(['b1', 'b2', 'b3', 'b4'])
    expect(b.notes).toHaveLength(2000)
  })

  it('does not repeat the notes of A when B already contains them', async () => {
    await seedClient('A', { notes: 'same' })
    await seedClient('B', { notes: 'before same after' })
    await merge(OWNER, 'A', 'B')
    expect((await raw('B')).notes).toBe('before same after')
  })

  it('staff -> 403 and nothing changes', async () => {
    const a = await seedClient('A')
    const b = await seedClient('B')
    const res = await merge(STAFF, 'A', 'B')
    expect(res.status).toBe(403)
    expect(await raw('A')).toEqual(a)
    expect(await raw('B')).toEqual(b)
  })

  it('A = B -> 400 SAME_CLIENT', async () => {
    await seedClient('A')
    const res = await merge(OWNER, 'A', 'A')
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('SAME_CLIENT')
  })

  it('A already merged -> 409 ALREADY_MERGED', async () => {
    await seedClient('A', { mergedInto: 'Z', deletedAt: 1 })
    await seedClient('B')
    const res = await merge(OWNER, 'A', 'B')
    expect(res.status).toBe(409)
    expect(res.body.error).toBe('ALREADY_MERGED')
  })

  it('B in Trash or merged -> 409 TARGET_NOT_LIVE', async () => {
    await seedClient('A')
    await seedClient('T', { deletedAt: 1 })
    await seedClient('M', { mergedInto: 'Z', deletedAt: 1 })
    for (const id of ['T', 'M']) {
      const res = await merge(OWNER, 'A', id)
      expect(res.status).toBe(409)
      expect(res.body.error).toBe('TARGET_NOT_LIVE')
    }
  })

  it('an id of another business -> 404 and nothing moves', async () => {
    await seedClient('A')
    await seedClient('O', {}, 'b2')
    expect((await merge(OWNER, 'A', 'O')).status).toBe(404)
    expect((await merge(OWNER, 'O', 'A')).status).toBe(404)
    expect((await merge(OUTSIDER, 'A', 'O')).status).toBe(404)
    expect((await raw('A')).mergedInto).toBeUndefined()
  })
})

describe('PUT /:id/do-not-contact', () => {
  it('staff sets it with a reason; the answer is trimmed to the staff fields', async () => {
    await seedClient('A', { email: 'a@b.co' })
    const res = await dnc(STAFF, 'A', { on: true, reason: '  asked  ' })
    expect(res.status).toBe(200)
    expect(res.body).not.toHaveProperty('email')
    expect(res.body).not.toHaveProperty('doNotContact')
    expect((await raw('A')).doNotContact).toEqual({ at: expect.any(Number), reason: 'asked', via: 'member' })
  })

  it('on without a reason -> 400 REASON_REQUIRED', async () => {
    await seedClient('A')
    const res = await dnc(OWNER, 'A', { on: true, reason: '   ' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('REASON_REQUIRED')
  })

  it('staff cannot clear it; the owner can', async () => {
    await seedClient('A', { doNotContact: { at: 1, reason: 'r', via: 'member' } })
    expect((await dnc(STAFF, 'A', { on: false })).status).toBe(403)
    expect((await raw('A')).doNotContact).toBeDefined()
    const res = await dnc(OWNER, 'A', { on: false })
    expect(res.status).toBe(200)
    expect((await raw('A')).doNotContact).toBeUndefined()
  })

  it('another business -> 404', async () => {
    await seedClient('A')
    expect((await dnc(OUTSIDER, 'A', { on: true, reason: 'x' })).status).toBe(404)
  })

  it('a generic PUT with doNotContact still changes nothing', async () => {
    await seedClient('A')
    await request(app).put('/api/v1/data/clients/A').set(as(OWNER)).send({ doNotContact: { at: 1, reason: 'r', via: 'member' } })
    expect((await raw('A')).doNotContact).toBeUndefined()
  })
})

describe('restore of a merged client', () => {
  it('PUT /restore -> 409 CLIENT_MERGED and it stays in Trash', async () => {
    await seedClient('A', { mergedInto: 'B', deletedAt: 5 })
    const res = await request(app).put('/api/v1/data/clients/A/restore').set(as(OWNER))
    expect(res.status).toBe(409)
    expect(res.body).toEqual({ error: 'CLIENT_MERGED', messageKey: 'client_merged_restore', mergedInto: 'B' })
    expect((await raw('A')).deletedAt).toBe(5)
  })

  it('restore-all leaves it in Trash and lists it in skipped', async () => {
    await seedClient('A', { mergedInto: 'B', deletedAt: 5 })
    const res = await request(app).put('/api/v1/data/clients/trash/restore-all').set(as(OWNER))
    expect(res.status).toBe(200)
    expect(res.body.restored).toBe(0)
    expect(res.body.skipped.map(s => s._id)).toEqual(['A'])
    expect((await raw('A')).deletedAt).toBe(5)
  })
})
