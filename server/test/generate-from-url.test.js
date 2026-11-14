'use strict'
/** Plan 595 - POST /api/v1/ai/generate-from-url refuses a redirect to an internal address. */

const request = require('supertest')

process.env.GEMINI_API_KEY = 'test-key'
const { buildTestApp, teardownTestApp, signTestToken } = require('./helpers/app')
const { resetForTests } = require('../services/gemini-client')

let app
let fetchMock

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

beforeEach(() => {
  resetForTests()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const token = () => signTestToken({ userId: 'gfuUser', role: 'user', businessId: 'bizGfu' })
const post = url =>
  request(app).post('/api/v1/ai/generate-from-url').set('Authorization', `Bearer ${token()}`).send({ url })

describe('generate-from-url redirects (plan 595)', () => {
  it('a redirect to 127.0.0.1 -> 400 and the internal address is never fetched', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 302, headers: { get: () => 'http://127.0.0.1/' } })
    const res = await post('http://93.184.216.34/recipe')
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('url resolves to a disallowed address')
    expect(fetchMock.mock.calls.map(c => String(c[0]))).toEqual(['http://93.184.216.34/recipe'])
  })
})
