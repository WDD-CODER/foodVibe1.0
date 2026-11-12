'use strict'
/** Plan 554 - POST /api/v1/ai/knowledge-import with Gemini mocked by stubbing global fetch. */

const request = require('supertest')

process.env.GEMINI_API_KEY = 'test-key'
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { resetForTests } = require('../services/gemini-client')
const { KNOWLEDGE_IMPORT_PROMPT } = require('../services/knowledge-import-prompt')

let app
let fetchMock

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

beforeEach(async () => {
  resetForTests()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  await testDb().collection('knowledgeItems').deleteMany({})
  await testDb().collection('aiUsage').deleteMany({})
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const jsonResponse = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body })
const reply = items => jsonResponse(200, { candidates: [{ content: { parts: [{ text: JSON.stringify({ items }) }] } }] })

let userSeq = 0
const ownerToken = () => signTestToken({ userId: `kiOwner${++userSeq}`, businessId: 'b554', businessRole: 'owner' })
const staffToken = () => signTestToken({ userId: `kiStaff${++userSeq}`, businessId: 'b554', businessRole: 'staff' })
const post = (body, token = ownerToken()) =>
  request(app).post('/api/v1/ai/knowledge-import').set('Authorization', `Bearer ${token}`).send(body)
const good = i => ({ topic: 'policy', question: `שאלה ${i}`, answer: `תשובה ${i}`, variations: [`ניסוח ${i}`] })

describe('knowledge import', () => {
  it('stores exactly 60 of 75 valid items as drafts of the caller business', async () => {
    fetchMock.mockResolvedValueOnce(reply(Array.from({ length: 75 }, (_, i) => good(i))))
    const res = await post({ text: 'טקסט על העסק' })
    expect(res.status).toBe(201)
    expect(res.body.items).toHaveLength(60)
    expect(res.body.dropped).toBe(0)
    const stored = await testDb().collection('knowledgeItems').find({}).toArray()
    expect(stored).toHaveLength(60)
    for (const d of stored) {
      expect(d).toMatchObject({ status: 'draft', source: 'ai_import', businessId: 'b554', visibility: 'public' })
    }
  })

  it('drops an item that fails the schema and counts it', async () => {
    fetchMock.mockResolvedValueOnce(reply([good(1), { topic: 'nope', question: 'q', answer: 'a' }, { topic: 'faq', question: '', answer: 'a' }, good(2)]))
    const res = await post({ text: 'x' })
    expect(res.status).toBe(201)
    expect(res.body.items).toHaveLength(2)
    expect(res.body.dropped).toBe(2)
  })

  it('answers 400 TEXT_TOO_LONG, TEXT_OR_URL and a private-network URL', async () => {
    const long = await post({ text: 'א'.repeat(20001) })
    expect(long.status).toBe(400)
    expect(long.body.error).toBe('TEXT_TOO_LONG')
    const both = await post({ text: 'x', url: 'https://example.com' })
    expect(both.status).toBe(400)
    expect(both.body.error).toBe('TEXT_OR_URL')
    const neither = await post({})
    expect(neither.body.error).toBe('TEXT_OR_URL')
    const priv = await post({ url: 'http://127.0.0.1/secret' })
    expect(priv.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('staff get 403 and no model call is made', async () => {
    const res = await post({ text: 'x' }, staffToken())
    expect(res.status).toBe(403)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('writes one aiUsage row with feature knowledge_import per Gemini call', async () => {
    fetchMock.mockResolvedValueOnce(reply([good(1)]))
    await post({ text: 'x' })
    const rows = await testDb().collection('aiUsage').find({ feature: 'knowledge_import' }).toArray()
    expect(rows).toHaveLength(1)
  })

  it('the prompt is English (no Hebrew letter)', () => {
    expect(/[֐-׿]/.test(KNOWLEDGE_IMPORT_PROMPT)).toBe(false)
  })
})
