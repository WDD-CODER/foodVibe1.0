'use strict'
/**
 * Plan 662 (C-REGISTRY-R): the Restaurant program's registered collections, module gate, indexes, empty routers,
 * permission action and business delete. No behaviour is asserted beyond the registry: later plans fill the routers
 * and must not break this file.
 */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { clearModuleCache } = require('../middleware/require-module')
const { ALL_USER_ENTITY_TYPES } = require('../constants/collections')
const { can } = require('../utils/permissions')
const { deleteBusinessServerData } = require('../services/business')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

const business = (id, extra = {}) => ({ _id: id, name: id, ownerId: 'own_' + id, createdAt: 1, internal: false, lastSyncedMasterVersion: 0, ...extra })
const ALL_SIX = ['events', 'event_logistics', 'frontdesk', 'ai_create', 'consultant_diag', 'tables']

beforeEach(async () => {
  const db = testDb()
  for (const c of await db.listCollections().toArray()) if (c.type === 'collection') await db.collection(c.name).deleteMany({})
  await db.collection('businesses').insertMany([
    business('bTables', { modules: ['frontdesk', 'tables'] }),
    business('bOnlyTables', { modules: ['tables'] }),
    business('bNoList'),
    business('bAll', { modules: ALL_SIX }),
  ])
  clearModuleCache()
})

const ownerOf = businessId => ({ userId: 'own_' + businessId, name: 'owner', businessId, businessRole: 'owner' })
const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const data = type => `/api/v1/data/${type}`
const READABLE = ['floorPlans', 'waitlistEntries']

describe.each(READABLE)('%s: generic API, gated by module tables', type => {
  it('answers 200 [] to the owner of a business with frontdesk and tables', async () => {
    const res = await request(app).get(data(type)).set(as(ownerOf('bTables')))
    expect(res.status).toBe(200)
    expect(res.body).toEqual([])
  })

  it.each(['bOnlyTables', 'bNoList'])('answers 403 MODULE_OFF for %s', async businessId => {
    const res = await request(app).get(data(type)).set(as(ownerOf(businessId)))
    expect(res.status).toBe(403)
    expect(res.body.error).toBe('MODULE_OFF')
  })

  it('generic POST, PUT and DELETE answer 405 USE_ROUTER', async () => {
    const owner = as(ownerOf('bTables'))
    const post = await request(app).post(data(type)).set(owner).send({})
    const put = await request(app).put(`${data(type)}/x1`).set(owner).send({})
    const del = await request(app).delete(`${data(type)}/x1`).set(owner)
    for (const res of [post, put, del]) {
      expect(res.status).toBe(405)
      expect(res.body.error).toBe('USE_ROUTER')
    }
  })
})

describe('server-only collections', () => {
  it.each(['tableHolds', 'conversations', 'messages'])('a generic GET of %s answers 403', async type => {
    const res = await request(app).get(data(type)).set(as(ownerOf('bAll')))
    expect(res.status).toBe(403)
  })
})

describe('indexes', () => {
  const names = async col => (await testDb().collection(col).indexes()).map(i => i.name)

  it('the eight indexes exist by name', async () => {
    expect(await names('floorPlans')).toContain('floor_plans_business_unique')
    expect(await names('tableHolds')).toEqual(expect.arrayContaining(['table_holds_cell_unique', 'table_holds_booking']))
    expect(await names('waitlistEntries')).toContain('waitlist_business_date_status')
    expect(await names('conversations')).toEqual(expect.arrayContaining(['conversations_live_key_unique', 'conversations_business_last']))
    expect(await names('messages')).toEqual(expect.arrayContaining(['messages_provider_unique', 'messages_conversation_at']))
  })

  it('two holds of one business, table and cell collide; a hold differing in one of the three does not', async () => {
    const col = testDb().collection('tableHolds')
    const hold = (id, extra = {}) => ({ _id: id, businessId: 'b1', tableKey: 'tbl001', cell: 100, bookingId: 'bk' + id, ...extra })
    await col.insertOne(hold('h1'))
    await expect(col.insertOne(hold('h2'))).rejects.toMatchObject({ code: 11000 })
    await col.insertOne(hold('h3', { businessId: 'b2' }))
    await col.insertOne(hold('h4', { tableKey: 'tbl002' }))
    await col.insertOne(hold('h5', { cell: 101 }))
    expect(await col.countDocuments()).toBe(4)
  })

  it('two floor plans of one business collide; a raw row without a grid does not', async () => {
    const col = testDb().collection('floorPlans')
    const grid = { cols: 20, rows: 15 }
    await col.insertOne({ _id: 'fp1', businessId: 'b1', grid })
    await expect(col.insertOne({ _id: 'fp2', businessId: 'b1', grid })).rejects.toMatchObject({ code: 11000 })
    await col.insertOne({ _id: 'fp3', businessId: 'b2', grid })
    await col.insertOne({ _id: 'fp4', businessId: 'b1' })
  })

  it('two live conversations with one liveKey collide; one without liveKey beside them does not', async () => {
    const col = testDb().collection('conversations')
    await col.insertOne({ _id: 'c1', businessId: 'b1', liveKey: 'sim:972501234567', status: 'bot' })
    await expect(col.insertOne({ _id: 'c2', businessId: 'b1', liveKey: 'sim:972501234567', status: 'bot' })).rejects.toMatchObject({ code: 11000 })
    await col.insertOne({ _id: 'c3', businessId: 'b1', status: 'closed' })
    await col.insertOne({ _id: 'c4', businessId: 'b1', status: 'closed' })
  })

  it('two messages with one business and providerMessageId collide', async () => {
    const col = testDb().collection('messages')
    await col.insertOne({ _id: 'm1', businessId: 'b1', providerMessageId: 'wamid.1' })
    await expect(col.insertOne({ _id: 'm2', businessId: 'b1', providerMessageId: 'wamid.1' })).rejects.toMatchObject({ code: 11000 })
    await col.insertOne({ _id: 'm3', businessId: 'b2', providerMessageId: 'wamid.1' })
  })
})

describe('registry probe', () => {
  const MOUNTS = ['/api/v1/floor-plan', '/api/v1/waitlist', '/api/v1/conversations', '/api/v1/sim']

  it.each(MOUNTS)('GET %s/__registry_probe__ answers 404', async mount => {
    const res = await request(app).get(`${mount}/__registry_probe__`).set(as(ownerOf('bAll')))
    expect(res.status).toBe(404)
  })

  it('each of the four router modules loads on its own and exports a router function', () => {
    for (const p of ['floor-plan', 'waitlist', 'conversations', 'sim']) {
      expect(typeof require(`../routes/${p}`), p).toBe('function')
    }
  })
})

describe('permission and business delete', () => {
  it('manageConversations is allowed for an owner and for staff; a made-up action is UNKNOWN_ACTION', () => {
    expect(can({ userId: 'o', businessId: 'b1', businessRole: 'owner' }, 'manageConversations')).toEqual({ ok: true })
    expect(can({ userId: 's', businessId: 'b1', businessRole: 'staff' }, 'manageConversations')).toEqual({ ok: true })
    expect(can({ userId: 'o', businessId: 'b1', businessRole: 'owner' }, 'manageEverything')).toEqual({ ok: false, reason: 'UNKNOWN_ACTION' })
  })

  it('floorPlans is owner-only to write: staff are refused, the owner is not', () => {
    const staff = { userId: 's', businessId: 'b1', businessRole: 'staff' }
    for (const action of ['create', 'edit', 'delete']) {
      expect(can(staff, action, { type: 'floorPlans' })).toEqual({ ok: false, reason: 'OWNER_ONLY_TYPE' })
    }
    expect(can({ userId: 'o', businessId: 'b1', businessRole: 'owner' }, 'edit', { type: 'floorPlans' })).toEqual({ ok: true })
  })

  it('deleteBusinessServerData removes the business rows of tableHolds, conversations and messages, and no other business rows', async () => {
    const db = testDb()
    for (const name of ['tableHolds', 'conversations', 'messages']) {
      await db.collection(name).insertMany([{ _id: name + '-a', businessId: 'bTables' }, { _id: name + '-b', businessId: 'bAll' }])
    }
    const counts = await deleteBusinessServerData(db, await db.collection('businesses').findOne({ _id: 'bTables' }))
    for (const name of ['tableHolds', 'conversations', 'messages']) {
      expect(await db.collection(name).countDocuments({ businessId: 'bTables' }), name).toBe(0)
      expect(await db.collection(name).countDocuments({ businessId: 'bAll' }), name).toBe(1)
      expect(counts[name], name).toBe(1)
    }
  })

  it('ALL_USER_ENTITY_TYPES (the list the admin delete route clears) contains floorPlans and waitlistEntries', () => {
    expect(ALL_USER_ENTITY_TYPES).toEqual(expect.arrayContaining(READABLE))
  })
})
