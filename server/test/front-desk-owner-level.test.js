'use strict'
/** Plan 734 - the owner switches the assistant between drafts only (0) and answering guests alone (1). */
const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { clearModuleCache } = require('../middleware/require-module')
const { templateFor } = require('../generated/schemas/front-desk-templates')
const { logger } = require('../logger')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const ADMIN = { userId: 'boss', name: 'Dandan', role: 'admin', businessId: 'bBoss', businessRole: 'owner', isPlatformAdmin: true }
const OWNER = { userId: 'own1', name: 'בעלים', businessId: 'b1', businessRole: 'owner' }
const STAFF = { userId: 'st1', name: 'עובד', businessId: 'b1', businessRole: 'staff' }
const col = name => testDb().collection(name)
const URL = '/api/v1/business/front-desk/assistant-level'
const put = (body, user = OWNER) => request(app).put(URL).set(as(user)).send(body)
const profile = () => col('frontDeskProfiles').findOne({ businessId: 'b1' })
const setProfile = set => col('frontDeskProfiles').updateOne({ businessId: 'b1' }, { $set: set })

beforeEach(async () => {
  for (const c of ['frontDeskProfiles', 'businesses', 'clients', 'requests', 'bookings']) await col(c).deleteMany({})
  await col('businesses').insertMany([
    { _id: 'b1', name: 'עסק', ownerId: 'own1', modules: ['frontdesk'] },
    { _id: 'b2', name: 'ללא פרופיל', ownerId: 'own2', modules: ['frontdesk'] },
    { _id: 'bOff', name: 'בלי מודול', ownerId: 'ownOff', modules: [] },
  ])
  clearModuleCache()
  const created = await request(app).post('/api/v1/data/frontDeskProfiles').set(as(OWNER))
    .send({ ...templateFor('catering'), slug: 'my-catering', displayName: 'קייטרינג' })
  expect(created.status).toBe(201)
  await setProfile({ status: 'pilot' })
})

describe('PUT /business/front-desk/assistant-level', () => {
  it('the owner switches up and down and each switch is one history row', async () => {
    const res = await put({ level: 1 })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ level: 1 })
    let p = await profile()
    expect(p.assistant.level).toBe(1)
    expect(p.levelHistory).toHaveLength(1)
    expect(p.levelHistory[0]).toMatchObject({ by: 'own1', byName: 'בעלים', from: 0, to: 1 })
    expect(typeof p.levelHistory[0].at).toBe('number')
    expect(p.adminHistory ?? []).toHaveLength(0)
    expect((await put({ level: 0 })).status).toBe(200)
    p = await profile()
    expect(p.assistant.level).toBe(0)
    expect(p.levelHistory).toHaveLength(2)
    expect(p.levelHistory[1]).toMatchObject({ from: 1, to: 0 })
  })

  it('refuses staff and a bad body, and changes nothing', async () => {
    const res = await put({ level: 1 }, STAFF)
    expect(res.status).toBe(403)
    expect(res.body.error).toBe('FORBIDDEN')
    for (const bad of [{ level: 2 }, { level: '1' }, {}, { level: 1, extra: true }]) {
      const r = await put(bad)
      expect(r.status).toBe(400)
      expect(r.body.error).toBe('BAD_REQUEST_INPUT')
    }
    const p = await profile()
    expect(p.assistant.level).toBe(0)
    expect(p.levelHistory).toBeUndefined()
  })

  it('404 with no profile, 403 MODULE_OFF without the module', async () => {
    const r404 = await put({ level: 1 }, { userId: 'own2', businessId: 'b2', businessRole: 'owner' })
    expect(r404.status).toBe(404)
    expect(r404.body.error).toBe('NO_PROFILE')
    const off = await put({ level: 1 }, { userId: 'ownOff', businessId: 'bOff', businessRole: 'owner' })
    expect(off.status).toBe(403)
    expect(off.body.error).toBe('MODULE_OFF')
  })

  it('a draft or suspended front desk cannot be raised, but can be lowered', async () => {
    for (const status of ['draft', 'suspended']) {
      await setProfile({ status })
      const r = await put({ level: 1 })
      expect(r.status).toBe(409)
      expect(r.body.error).toBe('LEVEL_LOCKED')
      expect((await profile()).assistant.level).toBe(0)
    }
    await setProfile({ status: 'suspended', 'assistant.level': 1 })
    expect((await put({ level: 0 })).status).toBe(200)
    expect((await profile()).assistant.level).toBe(0)
  })

  it('a reserved level 2 is not moved by the owner; the same level writes no row', async () => {
    await setProfile({ 'assistant.level': 2 })
    for (const level of [0, 1]) {
      const r = await put({ level })
      expect(r.status).toBe(409)
      expect(r.body.error).toBe('LEVEL_RESERVED')
    }
    expect((await profile()).assistant.level).toBe(2)
    await setProfile({ 'assistant.level': 0 })
    const same = await put({ level: 0 })
    expect(same.status).toBe(200)
    expect((await profile()).levelHistory).toBeUndefined()
  })

  it('a client PUT cannot write levelHistory or the level; the admin route still works', async () => {
    expect((await put({ level: 1 })).status).toBe(200)
    const p = await profile()
    const sent = { ...p, assistant: { ...p.assistant, level: 0 }, levelHistory: [] }
    const res = await request(app).put(`/api/v1/data/frontDeskProfiles/${p._id}`).set(as(OWNER)).send(sent)
    expect(res.status).toBe(200)
    const after = await profile()
    expect(after.assistant.level).toBe(1)
    expect(after.levelHistory).toHaveLength(1)
    const admin = await request(app).put('/api/v1/admin/businesses/b1/front-desk').set(as(ADMIN)).send({ assistantLevel: 0, reason: 'pause' })
    expect(admin.status).toBe(200)
    const last = await profile()
    expect(last.assistant.level).toBe(0)
    expect(last.adminHistory).toHaveLength(1)
    expect(last.levelHistory).toHaveLength(1)
  })

  it('logs one changed line with the levels and no user name', async () => {
    const lines = []
    const realChild = logger.child.bind(logger)
    // Wrap every child so its `info` also records the first argument; the real logger still does the rest.
    const wrap = real => new Proxy(real, {
      get: (target, prop) => {
        if (prop === 'child') return (...a) => wrap(target.child(...a))
        if (prop === 'info') return (...a) => { lines.push(a[0]); return target.info(...a) }
        const v = target[prop]
        return typeof v === 'function' ? v.bind(target) : v
      },
    })
    const spy = vi.spyOn(logger, 'child').mockImplementation((...a) => wrap(realChild(...a)))
    try {
      expect((await put({ level: 1 })).status).toBe(200)
    } finally {
      spy.mockRestore()
    }
    // A wrapped child can be wrapped again by a nested `child()`, so the same object may be seen twice: count objects.
    const changed = [...new Set(lines)].filter(l => l && l.event === 'business.assistant_level.changed')
    expect(changed).toEqual([{ event: 'business.assistant_level.changed', from: 0, to: 1 }])
  })
})
