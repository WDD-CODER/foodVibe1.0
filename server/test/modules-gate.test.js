'use strict'
/** Plan 616 — the module gate: 403 MODULE_OFF on every covered route of a business without the module. */

const request = require('supertest')
const jwt = require('jsonwebtoken')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { clearModuleCache, requireModule, requireHomeModule, businessModules } = require('../middleware/require-module')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const user = (id, extra = {}) => ({ userId: 'u_' + id, businessId: id, businessRole: 'owner', ...extra })
const setModules = async (id, modules) => {
  await testDb().collection('businesses').updateOne({ _id: id }, { $set: { modules } }, { upsert: true })
  clearModuleCache()
}
const offBody = module => ({ error: 'MODULE_OFF', module })
const expectOff = (res, module) => {
  expect(res.status).toBe(403)
  expect(res.body).toEqual(offBody(module))
}
const expectOn = res => {
  expect(res.body?.error).not.toBe('MODULE_OFF')
}

let fetchMock

beforeEach(async () => {
  const db = testDb()
  for (const c of ['businesses', 'frontDeskProfiles', 'requests', 'menuEvents', 'venues']) await db.collection(c).deleteMany({})
  await db.collection('businesses').insertMany([
    { _id: 'bOff', name: 'off', ownerId: 'u_bOff', createdAt: 1, modules: [] },
    { _id: 'bAll', name: 'all', ownerId: 'u_bAll', createdAt: 1 },
    { _id: 'bEv', name: 'ev', ownerId: 'u_bEv', createdAt: 1, modules: ['events'] },
    { _id: 'bEvLog', name: 'evlog', ownerId: 'u_bEvLog', createdAt: 1, modules: ['events', 'event_logistics'] },
    { _id: 'bFd', name: 'fd', ownerId: 'u_bFd', createdAt: 1, modules: ['frontdesk'] },
  ])
  clearModuleCache()
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const OFF = user('bOff')
const ALL = user('bAll')

describe('events', () => {
  it('PUT /events/:id/stage', async () => {
    const url = '/api/v1/events/e1/stage'
    expectOff(await request(app).put(url).set(as(OFF)).send({ stage: 'inquiry' }), 'events')
    expectOn(await request(app).put(url).set(as(ALL)).send({ stage: 'inquiry' }))
  })

  it.each(['menuEvents', 'venues'])('generic GET %s', async type => {
    expectOff(await request(app).get(`/api/v1/data/${type}`).set(as(OFF)), 'events')
    const ok = await request(app).get(`/api/v1/data/${type}`).set(as(ALL))
    expect(ok.status).toBe(200)
  })

  it('generic POST of a venue', async () => {
    const body = { _id: 'v1', name: 'Hall' }
    expectOff(await request(app).post('/api/v1/data/venues').set(as(OFF)).send(body), 'events')
    expectOn(await request(app).post('/api/v1/data/venues').set(as(ALL)).send(body))
  })
})

describe('menu_design (plan 764)', () => {
  const url = '/api/v1/data/menuDesigns'

  it('is off for a business with the defaults and on once the module is stored', async () => {
    expectOff(await request(app).get(url).set(as(ALL)), 'menu_design')
    expectOff(await request(app).post(url).set(as(ALL)).send({ name: 'x' }), 'menu_design')
    await setModules('bAll', ['menu_design'])
    expect((await request(app).get(url).set(as(ALL))).status).toBe(200)
  })
})

describe('event_logistics', () => {
  it('PUT /events/:id/logistics needs event_logistics, which needs events', async () => {
    const url = '/api/v1/events/e1/logistics'
    expectOff(await request(app).put(url).set(as(user('bEv'))).send({}), 'event_logistics')
    expectOff(await request(app).put(url).set(as(OFF)).send({}), 'event_logistics')
    expectOn(await request(app).put(url).set(as(user('bEvLog'))).send({}))
    await setModules('bFd', ['event_logistics'])
    expectOff(await request(app).put(url).set(as(user('bFd'))).send({}), 'event_logistics')
  })
})

describe('frontdesk', () => {
  const routes = [
    ['post', '/api/v1/requests', { kind: 'event' }],
    ['get', '/api/v1/bookings/day?date=2026-01-01'],
    ['put', '/api/v1/knowledge/approve', { ids: ['x'] }],
    ['get', '/api/v1/data/requests'],
    ['get', '/api/v1/data/bookings'],
    ['get', '/api/v1/data/frontDeskProfiles'],
    ['get', '/api/v1/data/knowledgeItems'],
    ['post', '/api/v1/business/front-desk-intake', {}],
    ['post', '/api/v1/ai/knowledge-import', { text: 'x' }],
    ['get', '/api/v1/stats/frontdesk'],
  ]
  it.each(routes)('%s %s', async (method, url, body) => {
    expectOff(await request(app)[method](url).set(as(OFF)).send(body), 'frontdesk')
    expectOn(await request(app)[method](url).set(as(ALL)).send(body))
    expectOff(await request(app)[method](url).set(as(user('bEv'))).send(body), 'frontdesk')
  })

  it('the platform admin reads another business with ?businessId= even when his own has none', async () => {
    await setModules('bBoss', [])
    const admin = { userId: 'boss', role: 'admin', businessId: 'bBoss', isPlatformAdmin: true }
    expectOn(await request(app).get('/api/v1/stats/frontdesk?businessId=bAll').set(as(admin)))
    expectOff(await request(app).get('/api/v1/stats/frontdesk').set(as(admin)), 'frontdesk')
  })
})

describe('the public router', () => {
  const profile = { _id: 'p1', businessId: 'bOff', slug: 'cafe', status: 'active', displayName: 'Cafe', requestKinds: {} }

  it('answers 200 with frontdesk and 404 without it, and writes nothing', async () => {
    await testDb().collection('frontDeskProfiles').insertOne(profile)
    const miss = await request(app).get('/api/v1/public/cafe')
    expect(miss.status).toBe(404)
    expect(miss.body).toEqual({ error: 'NOT_FOUND' })
    const post = await request(app).post('/api/v1/public/cafe/requests').send({ kind: 'table', guestName: 'Dana Cohen', guestPhone: '0501234567', wanted: { partySize: 4 }, answers: [], consentTerms: true })
    expect(post.status).toBe(404)
    expect(await testDb().collection('requests').countDocuments({})).toBe(0)
    await setModules('bOff', ['frontdesk'])
    const hit = await request(app).get('/api/v1/public/cafe')
    expect(hit.status).toBe(200)
    expect(hit.body.displayName).toBe('Cafe')
  })
})

describe('clients (events or frontdesk)', () => {
  it.each([
    ['get', '/api/v1/data/clients'],
    ['put', '/api/v1/clients/c1/do-not-contact'],
  ])('%s %s', async (method, url) => {
    const body = { on: true, reason: 'x' }
    expectOff(await request(app)[method](url).set(as(OFF)).send(body), 'events')
    expectOn(await request(app)[method](url).set(as(user('bEv'))).send(body))
    expectOn(await request(app)[method](url).set(as(user('bFd'))).send(body))
  })
})

describe('ai_create', () => {
  const routes = ['generate', 'parse-text', 'generate-from-url', 'generate-from-image', 'patch-recipe', 'generate-menu',
    'patch-menu', 'generate-product', 'patch-product', 'generate-product-from-image', 'shots', 'shots/confirm', 'save-menu-shot']
  it.each(routes)('POST /ai/%s is refused and never reaches the model', async route => {
    expectOff(await request(app).post(`/api/v1/ai/${route}`).set(as(OFF)).send({}), 'ai_create')
    expect(fetchMock).not.toHaveBeenCalled()
  })
  it('knowledge-import is gated by frontdesk and not by ai_create', async () => {
    await setModules('bOff', ['ai_create'])
    expectOff(await request(app).post('/api/v1/ai/knowledge-import').set(as(OFF)).send({ text: 'x' }), 'frontdesk')
  })
})

describe('consultant_diag', () => {
  const run = (mw, req) => new Promise(resolve => {
    const res = { status: code => ({ json: body => resolve({ code, body }) }) }
    req.log = { info() {}, error() {} }
    mw(req, res, () => resolve('next'))
  })
  it('requireHomeModule tests the home business, not the active one', async () => {
    await setModules('bHome', ['consultant_diag'])
    await setModules('bActive', [])
    expect(await run(requireHomeModule('consultant_diag'), { user: { businessId: 'bActive', homeBusinessId: 'bHome' } })).toBe('next')
    const refused = await run(requireHomeModule('consultant_diag'), { user: { businessId: 'bHome', homeBusinessId: 'bActive' } })
    expect(refused).toEqual({ code: 403, body: offBody('consultant_diag') })
  })
})

describe('never gated', () => {
  it.each(['products', 'suppliers', 'equipment', 'recipes', 'dishes', 'taxonomyTerms'])('generic GET %s', async type => {
    expectOn(await request(app).get(`/api/v1/data/${type}`).set(as(OFF)))
  })
  it.each([
    ['get', '/api/v1/business'],
    ['get', '/api/v1/stats/business'],
    ['get', '/api/v1/stats/report'],
    ['post', '/api/v1/product-import/apply'],
    ['post', '/api/v1/ai/parse-price-list'],
    ['post', '/api/v1/ai/parse-receipt-photo'],
    ['post', '/api/v1/ai/match-product-names'],
  ])('%s %s', async (method, url) => {
    expectOn(await request(app)[method](url).set(as(OFF)).send({}))
  })
  it('the platform admin with no modules still reaches /admin/businesses, but not menuEvents', async () => {
    await setModules('bBoss', [])
    const admin = { userId: 'boss', role: 'admin', businessId: 'bBoss', isPlatformAdmin: true }
    expect((await request(app).get('/api/v1/admin/businesses').set(as(admin))).status).toBe(200)
    expectOff(await request(app).get('/api/v1/data/menuEvents').set(as(admin)), 'events')
  })
})

describe('defaults, anonymous and bad tokens', () => {
  it('a token with no business document passes every gated route', async () => {
    const ghost = user('bGhost')
    expect((await request(app).get('/api/v1/data/menuEvents').set(as(ghost))).status).toBe(200)
    expect((await request(app).get('/api/v1/data/requests').set(as(ghost))).status).toBe(200)
  })
  it('a business with no modules field passes', async () => {
    expect((await request(app).get('/api/v1/data/venues').set(as(ALL))).status).toBe(200)
  })
  it('an anonymous read of venues still returns the master list', async () => {
    await testDb().collection('venues').insertOne({ _id: 'mv', businessId: '__master__', name: 'Master hall' })
    const res = await request(app).get('/api/v1/data/venues')
    expect(res.status).toBe(200)
    expect(JSON.stringify(res.body)).toContain('Master hall')
  })
  it('an expired token answers 401, not 403', async () => {
    const token = jwt.sign({ userId: 'x', businessId: 'bOff', businessRole: 'owner', exp: Math.floor(Date.now() / 1000) - 60 }, 'test-access-secret')
    const res = await request(app).get('/api/v1/data/menuEvents').set({ Authorization: `Bearer ${token}` })
    expect(res.status).toBe(401)
  })
})

describe('cache and logging', () => {
  it('keeps the old list for 30 seconds and follows the change after clearModuleCache()', async () => {
    expect(await businessModules('bAll')).toContain('events')
    await testDb().collection('businesses').updateOne({ _id: 'bAll' }, { $set: { modules: [] } })
    expect(await businessModules('bAll')).toContain('events')
    expectOn(await request(app).get('/api/v1/data/venues').set(as(ALL)))
    clearModuleCache()
    expect(await businessModules('bAll')).toEqual([])
    expectOff(await request(app).get('/api/v1/data/venues').set(as(ALL)), 'events')
  })
  it('a refused call logs at info only', async () => {
    const log = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    const res = { status: () => ({ json: () => {} }) }
    await requireModule('events')({ user: { businessId: 'bOff' }, log }, res, () => {})
    expect(log.info).toHaveBeenCalledWith({ event: 'module.off', module: 'events' })
    expect(log.warn).not.toHaveBeenCalled()
    expect(log.error).not.toHaveBeenCalled()
  })
})
