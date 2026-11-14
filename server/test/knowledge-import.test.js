'use strict'
/** Plan 554 - POST /api/v1/ai/knowledge-import with Gemini mocked by a stubbed global fetch. */

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
const modelAnswer = text => jsonResponse(200, { candidates: [{ content: { parts: [{ text }] } }] })
const reply = items => modelAnswer(JSON.stringify({ items }))
const good = n => ({ topic: 'faq', question: `שאלה ${n}?`, answer: `תשובה ${n}`, variations: ['עוד ניסוח'] })

let seq = 0
const ownerToken = () => signTestToken({ userId: `kiOwner${++seq}`, name: 'o', businessId: 'kib1', businessRole: 'owner' })
const staffToken = () => signTestToken({ userId: `kiStaff${++seq}`, name: 's', businessId: 'kib1', businessRole: 'staff' })
const post = (body, token = ownerToken()) =>
  request(app).post('/api/v1/ai/knowledge-import').set('Authorization', `Bearer ${token}`).send(body)

describe('knowledge import', () => {
  it('stores 60 of 75 valid items as drafts of the caller business and counts invalid ones', async () => {
    const items = [...Array.from({ length: 75 }, (_, i) => good(i)), { topic: 'nope', question: 'x', answer: 'y' }]
    fetchMock.mockResolvedValueOnce(reply(items))
    const res = await post({ text: 'טקסט על העסק' })
    expect(res.status).toBe(201)
    expect(res.body.items).toHaveLength(60)
    expect(res.body.dropped).toBe(1)
    const stored = await testDb().collection('knowledgeItems').find({}).toArray()
    expect(stored).toHaveLength(60)
    for (const s of stored) {
      expect(s).toEqual(expect.objectContaining({ status: 'draft', source: 'ai_import', visibility: 'public', businessId: 'kib1' }))
    }
  })

  it('meters one aiUsage row with feature knowledge_import per Gemini call', async () => {
    fetchMock.mockResolvedValueOnce(reply([good(1)]))
    await post({ text: 'טקסט' })
    await require('../services/ai-usage')._waitForUsageWritesForTests()
    const rows = await testDb().collection('aiUsage').find({}).toArray()
    expect(rows).toHaveLength(1)
    expect(rows[0].feature).toBe('knowledge_import')
  })

  it('text over 20,000 characters -> 400 TEXT_TOO_LONG', async () => {
    const res = await post({ text: 'א'.repeat(20001) })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('TEXT_TOO_LONG')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('both or neither of text / url -> 400 TEXT_OR_URL', async () => {
    const both = await post({ text: 'x', url: 'https://example.com' })
    expect(both.status).toBe(400)
    expect(both.body.error).toBe('TEXT_OR_URL')
    const neither = await post({})
    expect(neither.status).toBe(400)
    expect(neither.body.error).toBe('TEXT_OR_URL')
  })

  it('a private-network url -> 400', async () => {
    const res = await post({ url: 'http://127.0.0.1/secret' })
    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  describe('redirects and internal addresses (plan 595)', () => {
    const redirect = location => ({ ok: false, status: 302, headers: { get: h => (h.toLowerCase() === 'location' ? location : null) } })
    const page = { ok: true, status: 200, text: async () => '<html><body>about our restaurant</body></html>' }

    it('a redirect to 127.0.0.1 -> 400 and the internal address is never fetched', async () => {
      fetchMock.mockResolvedValueOnce(redirect('http://127.0.0.1/'))
      const res = await post({ url: 'http://93.184.216.34/start' })
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('url resolves to a disallowed address')
      expect(fetchMock.mock.calls.map(c => String(c[0]))).toEqual(['http://93.184.216.34/start'])
    })

    it('a redirect to another public page is followed and imported', async () => {
      fetchMock.mockResolvedValueOnce(redirect('http://93.184.216.35/about'))
      fetchMock.mockResolvedValueOnce(page)
      fetchMock.mockResolvedValueOnce(reply([good(1)]))
      const res = await post({ url: 'http://93.184.216.34/start' })
      expect(res.status).toBe(201)
      expect(String(fetchMock.mock.calls[1][0])).toBe('http://93.184.216.35/about')
    })

    it('more than 5 redirects -> 502', async () => {
      fetchMock.mockResolvedValue(redirect('http://93.184.216.35/again'))
      const res = await post({ url: 'http://93.184.216.34/start' })
      expect(res.status).toBe(502)
      expect(res.body.error).toBe('Could not fetch the provided URL')
    })

    it.each(['http://0.0.0.0/', 'http://100.64.0.1/', 'http://[::ffff:127.0.0.1]/'])('%s -> 400', async url => {
      const res = await post({ url })
      expect(res.status).toBe(400)
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  it('staff -> 403 and nothing is called', async () => {
    const res = await post({ text: 'x' }, staffToken())
    expect(res.status).toBe(403)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('the import prompt has no Hebrew letter', () => {
    expect(/[֐-׿]/.test(KNOWLEDGE_IMPORT_PROMPT)).toBe(false)
  })
})
