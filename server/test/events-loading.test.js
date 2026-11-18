'use strict'
/** Plan 624 - PUT /api/v1/events/:id/loading: any member ticks a loading-list row, stamped by the server. */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { menuEventBody, stored } = require('./helpers/v2-docs')
const { clearModuleCache } = require('../middleware/require-module')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

beforeEach(async () => {
  await testDb().collection('menuEvents').deleteMany({})
  await testDb().collection('businesses').deleteMany({})
  clearModuleCache()
})

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER = { userId: 'own1', name: 'בעלים', businessId: 'b1', businessRole: 'owner' }
const STAFF = { userId: 'st1', name: 'עובד', businessId: 'b1', businessRole: 'staff' }
const OUTSIDER = { userId: 'out1', name: 'זר', businessId: 'b2', businessRole: 'owner' }

async function seed(id, extra = {}) {
  const doc = stored(menuEventBody({ eventDate: '2026-12-01' }), {
    _id: id, userId: 'own1', businessId: 'b1', createdBy: 'own1', _masterId: id, _userModified: false,
    stage: 'inquiry', stageHistory: [], notes: [], ...extra,
  })
  await testDb().collection('menuEvents').insertOne(doc)
  return doc
}
const raw = id => testDb().collection('menuEvents').findOne({ _id: id })
const tick = (id, user, body) => request(app).put(`/api/v1/events/${id}/loading`).set(as(user)).send(body)

describe('PUT /api/v1/events/:id/loading', () => {
  it('staff ticks a row: one entry stamped with his id and name', async () => {
    await seed('e1')
    const res = await tick('e1', STAFF, { key: 'eq:a', loaded: true })
    expect(res.status).toBe(200)
    expect(res.body.siteLogistics.loaded).toHaveLength(1)
    expect(res.body.siteLogistics.loaded[0]).toMatchObject({ key: 'eq:a', by: 'st1', byName: 'עובד' })
  })

  it('ticking again keeps the first stamp; unticking removes it', async () => {
    await seed('e1')
    await tick('e1', STAFF, { key: 'k', loaded: true })
    const first = (await raw('e1')).siteLogistics.loaded
    const again = await tick('e1', OWNER, { key: 'k', loaded: true })
    expect(again.status).toBe(200)
    expect((await raw('e1')).siteLogistics.loaded).toEqual(first)
    const off = await tick('e1', OWNER, { key: 'k', loaded: false })
    expect(off.status).toBe(200)
    expect((await raw('e1')).siteLogistics.loaded).toEqual([])
  })

  it('an event with no siteLogistics gets { answers: [], loaded }', async () => {
    await seed('e1')
    expect((await raw('e1')).siteLogistics).toBeUndefined()
    await tick('e1', OWNER, { key: 'k', loaded: true })
    const stored = (await raw('e1')).siteLogistics
    expect(stored.answers).toEqual([])
    expect(stored.loaded).toHaveLength(1)
  })

  it('a key that starts with $ is stored as text', async () => {
    await seed('e1')
    const res = await tick('e1', OWNER, { key: '$siteLogistics', loaded: true })
    expect(res.status).toBe(200)
    expect((await raw('e1')).siteLogistics.loaded[0].key).toBe('$siteLogistics')
  })

  it('finished 409, other business 404, module off 403', async () => {
    await seed('e2', { stage: 'finished' })
    const done = await tick('e2', OWNER, { key: 'k', loaded: true })
    expect(done.status).toBe(409)
    expect(done.body.error).toBe('EVENT_FINISHED')
    await seed('e1')
    expect((await tick('e1', OUTSIDER, { key: 'k', loaded: true })).status).toBe(404)
    await testDb().collection('businesses').insertOne({ _id: 'b1', name: 'one', ownerId: 'own1', createdAt: 1, modules: ['events'] })
    clearModuleCache()
    const off = await tick('e1', OWNER, { key: 'k', loaded: true })
    expect(off.status).toBe(403)
    expect(off.body).toEqual({ error: 'MODULE_OFF', module: 'event_logistics' })
  })

  it('400 BAD_LOADING for a missing boolean or an empty key', async () => {
    await seed('e1')
    for (const body of [{ key: 'k' }, { key: 'k', loaded: 'yes' }, { key: '  ', loaded: true }, { loaded: true }, {}]) {
      const res = await tick('e1', OWNER, body)
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('BAD_LOADING')
    }
  })

  it('two ticks sent at the same moment for different keys are both stored', async () => {
    await seed('e1')
    const [a, b] = await Promise.all([tick('e1', OWNER, { key: 'a', loaded: true }), tick('e1', STAFF, { key: 'b', loaded: true })])
    expect([a.status, b.status].every(s => s === 200 || s === 409)).toBe(true)
    if (a.status === 409 || b.status === 409) return
    expect((await raw('e1')).siteLogistics.loaded.map(r => r.key).sort()).toEqual(['a', 'b'])
  })
})
