'use strict'
/** Plan 373 (Human 2026-11-23): the venue address from a saved spot, through Nominatim — mocked, never the network. */

const request = require('supertest')

process.env.GEMINI_API_KEY = 'test-key'
const { buildTestApp, teardownTestApp, signTestToken } = require('./helpers/app')
const geocode = require('../routes/geocode')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

beforeEach(() => {
  geocode._resetGeocodeThrottle()
})

afterEach(() => {
  vi.restoreAllMocks()
})

const as = { Authorization: `Bearer ${signTestToken({ userId: 'u1', name: 'owner', businessId: 'b1', businessRole: 'owner' })}` }

function mockNominatim(body, ok = true) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok, status: ok ? 200 : 503, json: async () => body })
}

describe('GET /api/v1/geocode/reverse', () => {
  it('answers a short Hebrew address and sends only the two numbers', async () => {
    const spy = mockNominatim({ address: { road: 'דיזנגוף', house_number: '50', city: 'תל אביב-יפו' } })
    const res = await request(app).get('/api/v1/geocode/reverse?lat=32.0779&lng=34.7741').set(as)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ address: 'דיזנגוף 50, תל אביב-יפו' })
    const [url, init] = spy.mock.calls[0]
    expect(url).toBe('https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&accept-language=he&lat=32.0779&lon=34.7741')
    expect(init.headers['User-Agent']).toMatch(/^FoodVibe\//)
  })

  it('falls back to the display name when the parts are missing', async () => {
    mockNominatim({ address: {}, display_name: 'פארק הירקון, תל אביב' })
    const res = await request(app).get('/api/v1/geocode/reverse?lat=32.1&lng=34.8').set(as)
    expect(res.body).toEqual({ address: 'פארק הירקון, תל אביב' })
  })

  it('answers address null when the service fails or throws, never an error', async () => {
    mockNominatim({}, false)
    expect((await request(app).get('/api/v1/geocode/reverse?lat=1&lng=2').set(as)).body).toEqual({ address: null })
    geocode._resetGeocodeThrottle()
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('timeout'))
    const res = await request(app).get('/api/v1/geocode/reverse?lat=1&lng=2').set(as)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ address: null })
  })

  it('refuses bad coordinates and an anonymous caller', async () => {
    const spy = mockNominatim({})
    expect((await request(app).get('/api/v1/geocode/reverse?lat=91&lng=2').set(as)).status).toBe(400)
    expect((await request(app).get('/api/v1/geocode/reverse?lat=abc&lng=2').set(as)).status).toBe(400)
    expect((await request(app).get('/api/v1/geocode/reverse?lat=1&lng=2')).status).toBe(401)
    expect(spy).not.toHaveBeenCalled()
  })
})
