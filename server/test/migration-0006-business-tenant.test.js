'use strict'
/**
 * Plan 424 — migration 0006: a business per user, businessId + createdBy on every item, idempotent,
 * verify read-only.
 */

const { buildTestApp, teardownTestApp, testDb } = require('./helpers/app')
const M = require('../migrations/0006-business-tenant')
const { ALL_USER_ENTITY_TYPES } = require('../constants/all-user-entity-types')

beforeAll(async () => {
  await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

beforeEach(async () => {
  const db = testDb()
  for (const c of await db.listCollections().toArray()) if (c.type === 'collection') await db.collection(c.name).drop()
})

const args = () => ({ target: 'local', db: 'scratch' })
const silently = async fn => {
  const log = console.log
  const lines = []
  console.log = (...a) => lines.push(a.join(' '))
  try {
    await fn()
  } finally {
    console.log = log
  }
  return lines
}

async function seed() {
  const db = testDb()
  await db.collection('users').insertMany([
    { _id: 'u1', name: 'anna', role: 'admin' },
    { _id: 'u2', name: 'ben', role: 'user', createdAt: 42 },
  ])
  await db.collection('recipes').insertMany([
    { _id: 'r1', userId: 'u1' }, { _id: 'r2', userId: 'u1' }, { _id: 'r3', userId: 'u2' },
    { _id: 'rm', userId: '__master__' },
    { _id: 'ro', userId: 'ghost' },
    { _id: 'rs', userId: 'u2', deletedAt: 1, purgedAt: 1 },
  ])
  await db.collection('taxonomyTerms').insertMany([{ _id: 't1', userId: 'u1' }, { _id: 'tm', userId: '__master__' }])
  await db.collection('DICTIONARY_OVERRIDES').insertOne({ _id: 'g', userId: '__global__' })
}

async function run(extra = {}) {
  const db = testDb()
  const now = Date.now()
  const result = await M.plan(db, now)
  await M.write(db, { ...args(), ...extra }, result, now)
}

describe('pure functions', () => {
  it('businessDocFor / userBusinessFields', () => {
    expect(M.businessDocFor({ _id: 'u', name: 'dan', lastSyncedMasterVersion: 5 }, 10, 'b')).toEqual({
      _id: 'b', name: 'העסק של dan', ownerId: 'u', createdAt: 10, internal: false, lastSyncedMasterVersion: 5,
    })
    expect(M.userBusinessFields({ role: 'admin' }, 'b', 10)).toEqual({ businessId: 'b', businessRole: 'owner', isPlatformAdmin: true, createdAt: 10 })
    expect(M.userBusinessFields({ role: 'user', createdAt: 3 }, 'b', 10)).toMatchObject({ isPlatformAdmin: false, createdAt: 3 })
  })

  it('ownerOf', () => {
    const map = new Map([['u1', 'b1']])
    expect(M.ownerOf('u1', map)).toEqual({ businessId: 'b1', createdBy: 'u1' })
    expect(M.ownerOf('__master__', map)).toEqual({ businessId: '__master__', createdBy: '__master__' })
    expect(M.ownerOf('__global__', map)).toBe('skip')
    expect(M.ownerOf('ghost', map)).toBe('orphan')
  })
})

describe('write', () => {
  it('creates a business per user and stamps every item', async () => {
    await seed()
    await run()
    const db = testDb()
    const anna = await db.collection('users').findOne({ _id: 'u1' })
    const ben = await db.collection('users').findOne({ _id: 'u2' })
    expect(anna).toMatchObject({ businessRole: 'owner', isPlatformAdmin: true })
    expect(ben).toMatchObject({ businessRole: 'owner', isPlatformAdmin: false, createdAt: 42 })
    expect(await db.collection('businesses').findOne({ _id: anna.businessId })).toMatchObject({ name: 'העסק של anna', ownerId: 'u1' })
    expect(await db.collection('businesses').findOne({ _id: ben.businessId })).toMatchObject({ name: 'העסק של ben', ownerId: 'u2' })

    expect(await db.collection('recipes').findOne({ _id: 'r1' })).toMatchObject({ businessId: anna.businessId, createdBy: 'u1' })
    expect(await db.collection('recipes').findOne({ _id: 'r3' })).toMatchObject({ businessId: ben.businessId, createdBy: 'u2' })
    expect(await db.collection('recipes').findOne({ _id: 'rs' })).toMatchObject({ businessId: ben.businessId, createdBy: 'u2' })
    expect(await db.collection('recipes').findOne({ _id: 'rm' })).toMatchObject({ businessId: '__master__', createdBy: '__master__' })
    expect(await db.collection('taxonomyTerms').findOne({ _id: 'tm' })).toMatchObject({ businessId: '__master__' })

    const orphan = await db.collection('recipes').findOne({ _id: 'ro' })
    expect(orphan.businessId).toBeUndefined()
    expect(orphan.createdBy).toBeUndefined()
    const global = await db.collection('DICTIONARY_OVERRIDES').findOne({ _id: 'g' })
    expect(global.businessId).toBeUndefined()
  })

  it('a second write changes nothing', async () => {
    await seed()
    await run()
    const db = testDb()
    const before = await db.collection('businesses').countDocuments()
    const lines = await silently(() => run())
    expect(await db.collection('businesses').countDocuments()).toBe(before)
    expect(lines.join('\n')).toContain('0 businesses created, 0 docs stamped')
  })

  it('dry-run output reports the orphan and writes nothing', async () => {
    await seed()
    const db = testDb()
    const result = await M.plan(db, Date.now())
    expect(result.toCreate).toHaveLength(2)
    expect(result.collections.recipes.orphans).toEqual([{ userId: 'ghost', docs: 1 }])
    expect(await db.collection('businesses').countDocuments()).toBe(0)
  })

  it('a non-scratch write needs a backup', async () => {
    await seed()
    const db = testDb()
    const result = await M.plan(db, Date.now())
    await expect(M.write(db, { target: 'local' }, result, Date.now())).rejects.toThrow('--backup-dir')
  })
})

describe('stamped docs stay valid', () => {
  it('a purged stub carrying businessId + createdBy still passes tombstoneSchema', () => {
    const { tombstoneSchema } = require('../generated/schemas/base.schema')
    const stub = { _id: 's', schemaVersion: 2, userId: 'u', _masterId: 'm', deletedAt: 1, purgedAt: 1, businessId: 'b', createdBy: 'u' }
    expect(tombstoneSchema.safeParse(stub).success).toBe(true)
  })

  it('a real user item copied with the master author gets createdBy = its userId', async () => {
    await seed()
    await testDb().collection('recipes').updateOne({ _id: 'r1' }, { $set: { createdBy: 'dev-guest' } })
    await run()
    const r1 = await testDb().collection('recipes').findOne({ _id: 'r1' })
    expect(r1.createdBy).toBe('u1')
    expect(r1.businessId).toBeTruthy()
  })

  it('a master doc keeps the createdBy it already has (push-to-master pusher)', async () => {
    await seed()
    await testDb().collection('recipes').updateOne({ _id: 'rm' }, { $set: { createdBy: 'u1' } })
    await run()
    expect((await testDb().collection('recipes').findOne({ _id: 'rm' })).createdBy).toBe('u1')
  })

  it('a re-run after a business was inserted without the user update creates no new business', async () => {
    await seed()
    await testDb().collection('businesses').insertOne({ _id: 'half', name: 'x', ownerId: 'u1', createdAt: 1, internal: false, lastSyncedMasterVersion: 0 })
    await run()
    const db = testDb()
    expect((await db.collection('users').findOne({ _id: 'u1' })).businessId).toBe('half')
    expect(await db.collection('businesses').countDocuments({ ownerId: 'u1' })).toBe(1)
    expect(await db.collection('businesses').countDocuments()).toBe(2)
  })
})

describe('verify', () => {
  it('passes after write with matching counts, and is read-only', async () => {
    await seed()
    await run()
    const db = testDb()
    const snapshot = JSON.stringify(await db.collection('recipes').find({}).sort({ _id: 1 }).toArray())
    process.exitCode = undefined
    const lines = await silently(() => M.verify(db))
    expect(process.exitCode).toBeUndefined()
    expect(lines.some(l => l.startsWith('ORPHAN recipes userId=ghost docs=1'))).toBe(true)
    for (const coll of ALL_USER_ENTITY_TYPES) {
      for (const l of lines.filter(x => x.includes(` ${coll} byUser=`))) expect(l.startsWith('ok ')).toBe(true)
    }
    expect(lines.some(l => l.startsWith('ok u1 recipes byUser=2 byBusiness=2'))).toBe(true)
    expect(JSON.stringify(await db.collection('recipes').find({}).sort({ _id: 1 }).toArray())).toBe(snapshot)
  })

  it('fails when an item is missing its fields', async () => {
    await seed()
    await run()
    const db = testDb()
    await db.collection('recipes').insertOne({ _id: 'late', userId: 'u1' })
    process.exitCode = undefined
    const lines = await silently(() => M.verify(db))
    expect(process.exitCode).toBe(1)
    expect(lines.some(l => l.startsWith('MISMATCH u1 recipes'))).toBe(true)
    process.exitCode = undefined
  })
})
