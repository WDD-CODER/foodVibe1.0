'use strict'
/** Plan 554 - publicFacts, bulk approve and the staff read-only rule for knowledgeItems. */

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
const OWNER = { userId: 'own1', businessId: 'kb1', businessRole: 'owner' }
const STAFF = { userId: 'st1', businessId: 'kb1', businessRole: 'staff' }
const OWNER2 = { userId: 'own2', businessId: 'kb2', businessRole: 'owner' }
const col = () => testDb().collection('knowledgeItems')

let seq = 0
const item = (extra = {}) => ({
  _id: `k${String(++seq).padStart(4, '0')}`,
  schemaVersion: 2,
  businessId: 'kb1',
  createdBy: 'own1',
  createdAt: 1000 + seq,
  updatedAt: 1000 + seq,
  topic: 'policy',
  question: `שאלה ${seq}?`,
  answer: `תשובה ${seq}`,
  status: 'approved',
  source: 'manual',
  visibility: 'public',
  ...extra,
})

describe('publicFacts', () => {
  it('leaves out drafts, internal, soft-deleted and other businesses', async () => {
    const shown = item()
    await col().insertMany([
      shown,
      item({ status: 'draft' }),
      item({ visibility: 'internal' }),
      item({ deletedAt: 5 }),
      item({ businessId: 'kb2' }),
    ])
    const out = await publicFacts(testDb(), 'kb1')
    expect(out.factIds).toEqual([shown._id])
    expect(out.text).toBe(`[${shown._id}] policy: Q: ${shown.question} | A: ${shown.answer}`)
  })

  it('puts profile facts first, then items by topic order and createdAt, and is deterministic', async () => {
    await testDb().collection('frontDeskProfiles').insertOne({
      _id: 'p1', businessId: 'kb1', displayName: 'קייטרינג', phone: '050', address: 'רחוב 1', serviceArea: 'מרכז',
      hours: [{ days: 'א-ה', time: '9-17' }], closedDates: ['2026-12-25', '2026-12-31'],
    })
    const faq = item({ topic: 'faq', createdAt: 1 })
    const menuLate = item({ topic: 'menu', createdAt: 9, variations: ['מה יש?', 'תפריט?'], answer: 'שורה1\nשורה2' })
    const menuEarly = item({ topic: 'menu', createdAt: 3 })
    await col().insertMany([faq, menuLate, menuEarly])
    const a = await publicFacts(testDb(), 'kb1')
    const b = await publicFacts(testDb(), 'kb1')
    expect(b).toEqual(a)
    const lines = a.text.split('\n')
    expect(lines.slice(0, 6)).toEqual([
      '[profile.displayName] name: קייטרינג',
      '[profile.phone] phone: 050',
      '[profile.address] address: רחוב 1',
      '[profile.serviceArea] service area: מרכז',
      '[profile.hours] opening hours: א-ה 9-17',
      '[profile.closedDates] closed on: 2026-12-25, 2026-12-31',
    ])
    expect(a.factIds.slice(6)).toEqual([menuEarly._id, menuLate._id, faq._id])
    expect(lines[7]).toBe(`[${menuLate._id}] menu: Q: ${menuLate.question} | A: שורה1 שורה2 | also asked: מה יש?; תפריט?`)
  })

  it('with 200 approved items stays within 6,000 characters and cuts at a whole item', async () => {
    const many = Array.from({ length: 200 }, () => item({ answer: 'א'.repeat(300) }))
    await col().insertMany(many)
    const out = await publicFacts(testDb(), 'kb1')
    expect(out.text.length).toBeLessThanOrEqual(6000)
    expect(out.factIds.length).toBeGreaterThan(0)
    expect(out.factIds.length).toBeLessThan(200)
    const lines = out.text.split('\n')
    expect(lines).toHaveLength(out.factIds.length)
    for (const line of lines) expect(line.endsWith('א'.repeat(300))).toBe(true)
    expect(out.factIds).toEqual(many.slice(0, out.factIds.length).map(i => i._id))
  })

  it('returns empty text for a business with nothing', async () => {
    expect(await publicFacts(testDb(), 'nobody')).toEqual({ text: '', factIds: [] })
  })
})

describe('PUT /api/v1/knowledge/approve', () => {
  const put = (body, user = OWNER) => request(app).put('/api/v1/knowledge/approve').set(as(user)).send(body)

  it('approves only the caller business drafts in one request', async () => {
    const mine = item({ status: 'draft' })
    const mine2 = item({ status: 'draft' })
    const already = item({ status: 'approved' })
    const deleted = item({ status: 'draft', deletedAt: 5 })
    const other = item({ status: 'draft', businessId: 'kb2' })
    await col().insertMany([mine, mine2, already, deleted, other])
    const res = await put({ ids: [mine._id, mine2._id, already._id, deleted._id, other._id] })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ approved: 2 })
    expect((await col().findOne({ _id: mine._id })).status).toBe('approved')
    expect((await col().findOne({ _id: deleted._id })).status).toBe('draft')
    expect((await col().findOne({ _id: other._id })).status).toBe('draft')
  })

  it('staff get 403 and nothing changes', async () => {
    const d = item({ status: 'draft' })
    await col().insertOne(d)
    expect((await put({ ids: [d._id] }, STAFF)).status).toBe(403)
    expect((await col().findOne({ _id: d._id })).status).toBe('draft')
  })

  it('more than 200 ids -> 400 TOO_MANY_IDS; none -> 400 NO_IDS', async () => {
    const many = await put({ ids: Array.from({ length: 201 }, (_, i) => `x${i}`) })
    expect(many.status).toBe(400)
    expect(many.body.error).toBe('TOO_MANY_IDS')
    const none = await put({ ids: [] })
    expect(none.status).toBe(400)
    expect(none.body.error).toBe('NO_IDS')
  })
})

describe('generic API', () => {
  const url = (id = '') => `/api/v1/data/knowledgeItems${id ? '/' + id : ''}`
  const body = { topic: 'policy', question: 'חניה?', answer: 'יש', status: 'approved', source: 'manual', visibility: 'public' }

  it('staff POST / PUT / DELETE -> 403, staff GET lists', async () => {
    const created = await request(app).post(url()).set(as(OWNER)).send(body)
    expect(created.status).toBe(201)
    expect((await request(app).post(url()).set(as(STAFF)).send(body)).status).toBe(403)
    expect((await request(app).put(url(created.body._id)).set(as(STAFF)).send({ answer: 'x' })).status).toBe(403)
    expect((await request(app).delete(url(created.body._id)).set(as(STAFF))).status).toBe(403)
    const list = await request(app).get(url()).set(as(STAFF))
    expect(list.status).toBe(200)
    expect(list.body.map(i => i._id)).toContain(created.body._id)
  })

  it('another business does not see the items', async () => {
    await request(app).post(url()).set(as(OWNER)).send(body)
    const list = await request(app).get(url()).set(as(OWNER2))
    expect(list.body).toEqual([])
  })
})
