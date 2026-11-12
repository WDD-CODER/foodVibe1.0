'use strict'
/** Plan 554 - knowledge items: publicFacts, bulk approve, owner-only writes. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { publicFacts } = require('../services/knowledge')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

beforeEach(async () => {
  await testDb().collection('knowledgeItems').deleteMany({})
  await testDb().collection('frontDeskProfiles').deleteMany({})
})

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER = { userId: 'own1', businessId: 'b1', businessRole: 'owner' }
const STAFF = { userId: 'st1', businessId: 'b1', businessRole: 'staff' }
const OWNER2 = { userId: 'own2', businessId: 'b2', businessRole: 'owner' }
const col = () => testDb().collection('knowledgeItems')

let seq = 0
const item = (extra = {}) => ({
  _id: `k${String(++seq).padStart(4, '0')}`,
  schemaVersion: 2,
  businessId: 'b1',
  createdBy: 'own1',
  createdAt: 1000 + seq,
  updatedAt: 1000 + seq,
  topic: 'policy',
  question: `שאלה ${seq}`,
  answer: `תשובה ${seq}`,
  status: 'approved',
  source: 'manual',
  visibility: 'public',
  ...extra,
})

describe('publicFacts', () => {
  it('leaves out drafts, internal, deleted and other businesses', async () => {
    const ok = item()
    await col().insertMany([
      ok,
      item({ status: 'draft' }),
      item({ visibility: 'internal' }),
      item({ deletedAt: 5 }),
      item({ businessId: 'b2' }),
    ])
    const out = await publicFacts(testDb(), 'b1')
    expect(out.factIds).toEqual([ok._id])
    expect(out.text).toBe(`[${ok._id}] policy: Q: ${ok.question} | A: ${ok.answer}`)
  })

  it('puts profile facts first, then items by topic order, then createdAt', async () => {
    await testDb().collection('frontDeskProfiles').insertOne({
      _id: 'p1', businessId: 'b1', displayName: 'קייטרינג', phone: '050', address: 'רחוב 1', serviceArea: 'מרכז',
      hours: [{ days: 'א-ה', time: '09:00-17:00' }], closedDates: ['2026-12-25', '2026-12-31'],
    })
    const faq = item({ topic: 'faq', createdAt: 1 })
    const hours = item({ topic: 'hours', createdAt: 9, variations: ['מתי פתוח?', 'שעות?'] })
    const policyA = item({ topic: 'policy', createdAt: 2 })
    const policyB = item({ topic: 'policy', createdAt: 3 })
    await col().insertMany([faq, policyB, hours, policyA])
    const out = await publicFacts(testDb(), 'b1')
    const lines = out.text.split('\n')
    expect(lines.slice(0, 6)).toEqual([
      '[profile.displayName] name: קייטרינג',
      '[profile.phone] phone: 050',
      '[profile.address] address: רחוב 1',
      '[profile.serviceArea] service area: מרכז',
      '[profile.hours] opening hours: א-ה 09:00-17:00',
      '[profile.closedDates] closed on: 2026-12-25, 2026-12-31',
    ])
    expect(lines[6]).toContain(`[${hours._id}] hours:`)
    expect(lines[6]).toContain(' | also asked: מתי פתוח?; שעות?')
    expect(out.factIds.slice(6)).toEqual([hours._id, policyA._id, policyB._id, faq._id])
  })

  it('turns line breaks into one space and is stable across calls', async () => {
    await col().insertOne(item({ answer: 'שורה א\nשורה ב' }))
    const first = await publicFacts(testDb(), 'b1')
    expect(first.text).toContain('A: שורה א שורה ב')
    expect(await publicFacts(testDb(), 'b1')).toEqual(first)
  })

  it('stops at a whole item within 6,000 characters with 200 approved items', async () => {
    const docs = Array.from({ length: 200 }, (_, i) => item({ createdAt: i, answer: 'ת'.repeat(300) }))
    await col().insertMany(docs)
    const out = await publicFacts(testDb(), 'b1')
    expect(out.text.length).toBeLessThanOrEqual(6000)
    expect(out.factIds.length).toBeGreaterThan(0)
    expect(out.factIds.length).toBeLessThan(200)
    const lines = out.text.split('\n')
    expect(lines).toHaveLength(out.factIds.length)
    for (const line of lines) expect(line.endsWith('ת'.repeat(300))).toBe(true)
  })

  it('returns empty text when there is nothing', async () => {
    expect(await publicFacts(testDb(), 'b1')).toEqual({ text: '', factIds: [] })
  })
})

describe('PUT /api/v1/knowledge/approve', () => {
  const approve = (ids, user = OWNER) => request(app).put('/api/v1/knowledge/approve').set(as(user)).send({ ids })

  it('approves only the caller business drafts, in one request', async () => {
    const mine = [item({ status: 'draft' }), item({ status: 'draft' })]
    const other = item({ status: 'draft', businessId: 'b2' })
    const already = item({ status: 'approved' })
    const deleted = item({ status: 'draft', deletedAt: 3 })
    await col().insertMany([...mine, other, already, deleted])
    const res = await approve([...mine, other, already, deleted].map(d => d._id))
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ approved: 2 })
    expect((await col().findOne({ _id: mine[0]._id })).status).toBe('approved')
    expect((await col().findOne({ _id: other._id })).status).toBe('draft')
    expect((await col().findOne({ _id: deleted._id })).status).toBe('draft')
  })

  it('staff get 403 and nothing changes', async () => {
    const d = item({ status: 'draft' })
    await col().insertOne(d)
    expect((await approve([d._id], STAFF)).status).toBe(403)
    expect((await col().findOne({ _id: d._id })).status).toBe('draft')
  })

  it('more than 200 ids is 400 TOO_MANY_IDS, none is 400 NO_IDS', async () => {
    const res = await approve(Array.from({ length: 201 }, (_, i) => `x${i}`))
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('TOO_MANY_IDS')
    const none = await approve([])
    expect(none.status).toBe(400)
    expect(none.body.error).toBe('NO_IDS')
  })
})

describe('generic API: owner writes, staff read', () => {
  const url = (id = '') => `/api/v1/data/knowledgeItems${id ? '/' + id : ''}`
  const body = { topic: 'policy', question: 'האם יש חניה?', answer: 'יש', status: 'approved', source: 'manual', visibility: 'public' }

  it('staff POST / PUT / DELETE answer 403, staff GET lists', async () => {
    const created = await request(app).post(url()).set(as(OWNER)).send(body)
    expect(created.status).toBe(201)
    const id = created.body._id
    expect((await request(app).post(url()).set(as(STAFF)).send(body)).status).toBe(403)
    expect((await request(app).put(url(id)).set(as(STAFF)).send({ answer: 'x' })).status).toBe(403)
    expect((await request(app).delete(url(id)).set(as(STAFF))).status).toBe(403)
    const list = await request(app).get(url()).set(as(STAFF))
    expect(list.status).toBe(200)
    expect(list.body.map(d => d._id)).toContain(id)
  })

  it('another business never sees the item', async () => {
    await request(app).post(url()).set(as(OWNER)).send(body)
    const list = await request(app).get(url()).set(as(OWNER2))
    expect(list.body).toEqual([])
  })
})
