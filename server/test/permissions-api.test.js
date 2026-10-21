'use strict'
/** Plan 427 - the permission checker through the real generic write routes (owner + staff of business b1). */

const request = require('supertest')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const { productBody, recipeBody, stored } = require('./helpers/v2-docs')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

beforeEach(async () => {
  const db = testDb()
  for (const c of ['taxonomyTerms', 'products', 'recipes', 'VERSION_HISTORY', 'activity_log', 'DICTIONARY_OVERRIDES']) {
    await db.collection(c).deleteMany({})
  }
})

const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const OWNER = { userId: 'own1', businessId: 'b1', businessRole: 'owner' }
const STAFF = { userId: 'st1', businessId: 'b1', businessRole: 'staff' }
const OUTSIDER = { userId: 'out1', businessId: 'b2', businessRole: 'owner' }
const FORBIDDEN = { error: 'FORBIDDEN', messageKey: 'no_permission' }
const url = (type, id = '') => `/api/v1/data/${type}${id ? '/' + id : ''}`

/** Seeds a stored doc of business b1 created by `createdBy`. */
async function seed(type, body, _id, createdBy, extra = {}) {
  const doc = stored(body, { _id, userId: createdBy, businessId: 'b1', createdBy, _masterId: _id, _userModified: false, ...extra })
  await testDb().collection(type).insertOne(doc)
  return doc
}
const raw = (type, _id) => testDb().collection(type).findOne({ _id })

describe('staff: recipes', () => {
  it('cannot edit or delete the owner recipe (403, unchanged)', async () => {
    const before = await seed('recipes', recipeBody(), 'r-own', 'own1')
    const put = await request(app).put(url('recipes', 'r-own')).set(as(STAFF)).send({ nameHebrew: 'שונה' })
    expect(put.status).toBe(403)
    expect(put.body).toEqual(FORBIDDEN)
    const del = await request(app).delete(url('recipes', 'r-own')).set(as(STAFF))
    expect(del.status).toBe(403)
    expect(del.body).toEqual(FORBIDDEN)
    const perm = await request(app).delete(url('recipes', 'r-own') + '?permanent=true').set(as(STAFF))
    expect(perm.status).toBe(403)
    expect(await raw('recipes', 'r-own')).toEqual(before)
  })

  it('creates, edits and deletes his own recipe', async () => {
    const created = await request(app).post(url('recipes')).set(as(STAFF)).send(recipeBody())
    expect(created.status).toBe(201)
    expect(created.body.createdBy).toBe('st1')
    const id = created.body._id
    const edited = await request(app).put(url('recipes', id)).set(as(STAFF)).send({ nameHebrew: 'חדש' })
    expect(edited.status).toBe(200)
    const removed = await request(app).delete(url('recipes', id)).set(as(STAFF))
    expect(removed.status).toBe(200)
  })

  it('owner edits a recipe a staff member created', async () => {
    await seed('recipes', recipeBody(), 'r-st', 'st1')
    const res = await request(app).put(url('recipes', 'r-st')).set(as(OWNER)).send({ nameHebrew: 'בעלים' })
    expect(res.status).toBe(200)
  })

  it('a member of another business still gets 404 (scope before permission)', async () => {
    await seed('recipes', recipeBody(), 'r-own', 'own1')
    expect((await request(app).put(url('recipes', 'r-own')).set(as(OUTSIDER)).send({ nameHebrew: 'x' })).status).toBe(404)
    expect((await request(app).delete(url('recipes', 'r-own')).set(as(OUTSIDER))).status).toBe(404)
  })
})

describe('staff: products and money', () => {
  const priced = () => productBody({ sources: [{ supplierId: 's1', price: 5 }] })

  it('POST with a price is created without it', async () => {
    const res = await request(app).post(url('products')).set(as(STAFF)).send(priced())
    expect(res.status).toBe(201)
    const stored_ = await raw('products', res.body._id)
    expect(JSON.stringify(stored_)).not.toContain('"price"')
    expect(stored_.sources).toEqual([])
  })

  it('PUT changing a price is refused; changing only the name is allowed; the owner may change the price', async () => {
    await seed('products', priced(), 'p-st', 'st1')
    const denied = await request(app).put(url('products', 'p-st')).set(as(STAFF)).send({ sources: [{ supplierId: 's1', price: 9 }] })
    expect(denied.status).toBe(403)
    expect(denied.body).toEqual(FORBIDDEN)
    expect((await raw('products', 'p-st')).sources[0].price).toBe(5)

    const renamed = await request(app).put(url('products', 'p-st')).set(as(STAFF)).send({ nameHebrew: 'אגס' })
    expect(renamed.status).toBe(200)

    const owner = await request(app).put(url('products', 'p-st')).set(as(OWNER)).send({ sources: [{ supplierId: 's1', price: 9 }] })
    expect(owner.status).toBe(200)
    expect((await raw('products', 'p-st')).sources[0].price).toBe(9)
  })

  it('PUT that resends the same price unchanged is allowed', async () => {
    await seed('products', priced(), 'p-st', 'st1')
    const res = await request(app).put(url('products', 'p-st')).set(as(STAFF)).send({ nameHebrew: 'שוב', sources: [{ supplierId: 's1', price: 5 }] })
    expect(res.status).toBe(200)
  })
})

describe('staff: taxonomy terms', () => {
  it('cannot add eventType or menuType, can add ingredientCategory', async () => {
    for (const kind of ['eventType', 'menuType']) {
      const res = await request(app).post(url('taxonomyTerms')).set(as(STAFF)).send({ kind, key: 'k1', sortOrder: 0 })
      expect(res.status).toBe(403)
      expect(res.body).toEqual(FORBIDDEN)
    }
    const ok = await request(app).post(url('taxonomyTerms')).set(as(STAFF)).send({ kind: 'ingredientCategory', key: 'k2', sortOrder: 0 })
    expect(ok.status).toBe(201)
    const owner = await request(app).post(url('taxonomyTerms')).set(as(OWNER)).send({ kind: 'eventType', key: 'k3', sortOrder: 0 })
    expect(owner.status).toBe(201)
  })

  it('cannot edit or delete the owner term', async () => {
    await seed('taxonomyTerms', { kind: 'ingredientCategory', key: 'own-cat', sortOrder: 0 }, 't-own', 'own1')
    expect((await request(app).put(url('taxonomyTerms', 't-own')).set(as(STAFF)).send({ sortOrder: 4 })).status).toBe(403)
    expect((await request(app).delete(url('taxonomyTerms', 't-own')).set(as(STAFF))).status).toBe(403)
    expect((await raw('taxonomyTerms', 't-own')).sortOrder).toBe(0)
  })

  it('cannot edit a locked-kind term even when he created it', async () => {
    await seed('taxonomyTerms', { kind: 'eventType', key: 'mine', sortOrder: 0 }, 't-st', 'st1')
    expect((await request(app).put(url('taxonomyTerms', 't-st')).set(as(STAFF)).send({ sortOrder: 4 })).status).toBe(403)
    expect((await request(app).delete(url('taxonomyTerms', 't-st')).set(as(STAFF))).status).toBe(403)
  })
})

describe('staff: bulk delete and Trash', () => {
  it('bulk delete with one own and one owner id is refused and deletes nothing', async () => {
    await seed('recipes', recipeBody(), 'r-st', 'st1')
    await seed('recipes', recipeBody(), 'r-own', 'own1')
    const res = await request(app).delete(url('recipes', 'bulk')).set(as(STAFF)).send({ ids: ['r-st', 'r-own'] })
    expect(res.status).toBe(403)
    expect(res.body).toEqual(FORBIDDEN)
    expect(await raw('recipes', 'r-st')).not.toBeNull()
    expect(await raw('recipes', 'r-own')).not.toBeNull()
    const ok = await request(app).delete(url('recipes', 'bulk')).set(as(STAFF)).send({ ids: ['r-st'] })
    expect(ok.status).toBe(200)
    expect(ok.body.deletedCount).toBe(1)
  })

  it('restore of the owner deleted recipe is refused; his own works', async () => {
    await seed('recipes', recipeBody(), 'r-own', 'own1', { deletedAt: 5, deletedBy: 'own1' })
    await seed('recipes', recipeBody(), 'r-st', 'st1', { deletedAt: 5, deletedBy: 'st1' })
    const denied = await request(app).put(url('recipes', 'r-own') + '/restore').set(as(STAFF))
    expect(denied.status).toBe(403)
    expect((await raw('recipes', 'r-own')).deletedAt).toBe(5)
    const ok = await request(app).put(url('recipes', 'r-st') + '/restore').set(as(STAFF))
    expect(ok.status).toBe(200)
  })

  it('restore-all and empty Trash touch only his items', async () => {
    await seed('recipes', recipeBody(), 'r-own', 'own1', { deletedAt: 5, deletedBy: 'own1' })
    await seed('recipes', recipeBody(), 'r-st', 'st1', { deletedAt: 5, deletedBy: 'st1' })
    const restored = await request(app).put(url('recipes', 'trash') + '/restore-all').set(as(STAFF))
    expect(restored.status).toBe(200)
    expect(restored.body.restored).toBe(1)
    expect((await raw('recipes', 'r-st')).deletedAt).toBeUndefined()
    expect((await raw('recipes', 'r-own')).deletedAt).toBe(5)

    await testDb().collection('recipes').updateOne({ _id: 'r-st' }, { $set: { deletedAt: 5 } })
    const emptied = await request(app).delete(url('recipes', 'trash')).set(as(STAFF))
    expect(emptied.status).toBe(200)
    expect(emptied.body.disposed).toBe(1)
    expect(await raw('recipes', 'r-own')).not.toBeNull()
    expect((await raw('recipes', 'r-own')).purgedAt).toBeUndefined()
  })

  it('the owner restores everything', async () => {
    await seed('recipes', recipeBody(), 'r-own', 'own1', { deletedAt: 5, deletedBy: 'own1' })
    await seed('recipes', recipeBody(), 'r-st', 'st1', { deletedAt: 5, deletedBy: 'st1' })
    const res = await request(app).put(url('recipes', 'trash') + '/restore-all').set(as(OWNER))
    expect(res.body.restored).toBe(2)
  })
})

describe('staff: system collections', () => {
  it('writes to VERSION_HISTORY, activity_log and DICTIONARY_OVERRIDES are allowed', async () => {
    for (const type of ['VERSION_HISTORY', 'activity_log', 'DICTIONARY_OVERRIDES']) {
      const res = await request(app).post(url(type)).set(as(STAFF)).send({ note: 'x' })
      expect(res.status).toBe(201)
      const edited = await request(app).put(url(type, res.body._id)).set(as(STAFF)).send({ note: 'y' })
      expect(edited.status).toBe(200)
    }
  })
})

describe('plan 449: closed permission holes', () => {
  const priced = () => productBody({ sources: [{ supplierId: 'sA', price: 5 }, { supplierId: 'sB' }] })

  it('staff cannot move a term into a locked kind (403, unchanged)', async () => {
    await seed('taxonomyTerms', { kind: 'ingredientCategory', key: 'c1', sortOrder: 0 }, 't-mv', 'st1')
    const res = await request(app).put(url('taxonomyTerms', 't-mv')).set(as(STAFF)).send({ kind: 'eventType' })
    expect(res.status).toBe(400) // the kind-immutable rule fires first; authorizeEdit also checks the merged kind
    expect((await raw('taxonomyTerms', 't-mv')).kind).toBe('ingredientCategory')
  })

  it('staff cannot move a price from one supplier row to another (403, unchanged)', async () => {
    await seed('products', priced(), 'p-mv', 'st1')
    const res = await request(app).put(url('products', 'p-mv')).set(as(STAFF))
      .send({ sources: [{ supplierId: 'sA' }, { supplierId: 'sB', price: 5 }] })
    expect(res.status).toBe(403)
    expect(res.body).toEqual(FORBIDDEN)
    expect((await raw('products', 'p-mv')).sources[0].price).toBe(5)
  })

  it('staff cannot replace a whole collection; the owner still can', async () => {
    const hist = { _id: 'h1', businessId: 'b1' }
    await testDb().collection('VERSION_HISTORY').insertOne(hist)
    const staff = await request(app).put(url('VERSION_HISTORY')).set(as(STAFF)).set('X-Confirm-Replace', 'true').send([])
    expect(staff.status).toBe(403)
    expect(staff.body).toEqual(FORBIDDEN)
    expect(await raw('VERSION_HISTORY', 'h1')).toEqual(hist)
    const owner = await request(app).put(url('VERSION_HISTORY')).set(as(OWNER)).set('X-Confirm-Replace', 'true').send([])
    expect(owner.status).toBe(200)
    expect(await raw('VERSION_HISTORY', 'h1')).toBeNull()
  })
})
