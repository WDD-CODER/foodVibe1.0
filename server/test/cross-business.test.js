'use strict'
/**
 * Plan 425 — tenant isolation (INV-1 / INV-2): no data route returns or changes another business's
 * data, whatever the type; owner and staff of one business share one copy; a token without a
 * business is refused; anonymous callers only ever see the master catalog.
 */

const request = require('supertest')
const jwt = require('jsonwebtoken')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const {
  productBody, recipeBody, supplierBody, equipmentBody, venueBody, menuEventBody, stored,
} = require('./helpers/v2-docs')
const { ALL_USER_ENTITY_TYPES } = require('../constants/all-user-entity-types')
const { SEARCHABLE_ENTITY_TYPES } = require('../constants/searchable-entity-types')
const { SOFT_DELETE_TYPES } = require('../constants/collections')

let app

beforeAll(async () => {
  app = await buildTestApp()
}, 60000)

afterAll(async () => {
  await teardownTestApp()
})

beforeEach(async () => {
  const db = testDb()
  for (const c of await db.listCollections().toArray()) if (c.type === 'collection') await db.collection(c.name).deleteMany({})
})

const X = { userId: 'userX', role: 'user', businessId: 'biz_X', businessRole: 'owner' }
const X_STAFF = { userId: 'staffX', role: 'user', businessId: 'biz_X', businessRole: 'staff' }
const Y = { userId: 'userY', role: 'user', businessId: 'biz_Y', businessRole: 'owner' }
const as = user => ({ Authorization: `Bearer ${signTestToken(user)}` })
const url = (type, rest = '') => `/api/v1/data/${type}${rest}`

// A valid POST body per type. VERSION_HISTORY / activity_log / DICTIONARY_OVERRIDES have no v2 schema yet.
const BODY = {
  products: () => productBody({ nameHebrew: 'תפוח X' }),
  recipes: () => recipeBody({ nameHebrew: 'רוטב X' }),
  dishes: () => recipeBody({ nameHebrew: 'מנה X' }),
  suppliers: () => supplierBody({ nameHebrew: 'ספק X' }),
  equipment: () => equipmentBody({ nameHebrew: 'סיר X' }),
  venues: () => venueBody({ nameHebrew: 'אולם X' }),
  menuEvents: () => menuEventBody({ name: 'אירוע X' }),
  taxonomyTerms: () => ({ kind: 'allergen', key: 'lupinx', sortOrder: 0 }),
  VERSION_HISTORY: () => ({ entityType: 'recipes', entityId: 'entity-X', note: 'x' }),
  activity_log: () => ({ action: 'x', at: 1 }),
  DICTIONARY_OVERRIDES: () => ({ items: { a: 'b' } }),
}

it('covers every type of ALL_USER_ENTITY_TYPES', () => {
  expect(Object.keys(BODY).sort()).toEqual([...ALL_USER_ENTITY_TYPES].sort())
})

describe.each(ALL_USER_ENTITY_TYPES)('%s: business Y cannot reach business X', type => {
  let id
  let before

  beforeEach(async () => {
    const created = await request(app).post(url(type)).set(as(X)).send(BODY[type]())
    expect(created.status).toBe(201)
    id = created.body._id
    expect(created.body).toMatchObject({ businessId: 'biz_X', createdBy: 'userX' })
    before = await testDb().collection(type).findOne({ _id: id })
  })

  const unchanged = async () => expect(await testDb().collection(type).findOne({ _id: id })).toEqual(before)

  it('is in no list, and GET / PUT / DELETE by id answer 404', async () => {
    const list = await request(app).get(url(type)).set(as(Y))
    expect(list.status).toBe(200)
    expect(list.body.map(d => d._id)).not.toContain(id)

    expect((await request(app).get(url(type, `/${id}`)).set(as(Y))).status).toBe(404)
    expect((await request(app).put(url(type, `/${id}`)).set(as(Y)).send({ note: 'hacked' })).status).toBe(404)
    expect((await request(app).delete(url(type, `/${id}`)).set(as(Y))).status).toBe(404)
    expect((await request(app).delete(url(type, `/${id}?permanent=true`)).set(as(Y))).status).toBe(404)
    await unchanged()
  })

  it('DELETE /bulk deletes nothing', async () => {
    const res = await request(app).delete(url(type, '/bulk')).set(as(Y)).send({ ids: [id] })
    if (res.status === 200) expect(res.body.deletedCount).toBe(0)
    else expect(res.status).toBe(404)
    await unchanged()
  })

  if (SEARCHABLE_ENTITY_TYPES.includes(type)) {
    it('/search returns nothing of X\'s and /count counts only Y\'s', async () => {
      const search = await request(app).get(url(type, '/search?q=' + encodeURIComponent(BODY[type]().nameHebrew.slice(0, 2)))).set(as(Y))
      expect(search.status).toBe(200)
      expect(search.body).toEqual([])
      const own = await request(app).post(url(type)).set(as(Y)).send(BODY[type]())
      expect(own.status).toBe(201)
      const mine = await request(app).get(url(type, '/search?q=' + encodeURIComponent(BODY[type]().nameHebrew.slice(0, 2)))).set(as(Y))
      expect(mine.body.map(d => d._id)).toEqual([own.body._id])
      const count = await request(app).get(url(type, '/count')).set(as(Y))
      expect(count.body).toEqual({ count: 1 })
      expect((await request(app).get(url(type, '/count')).set(as(X))).body).toEqual({ count: 1 })
      await unchanged()
    })
  }

  if (SOFT_DELETE_TYPES.includes(type)) {
    it('X\'s deleted item is not in Y\'s Trash; restore, restore-all and empty-trash leave it untouched', async () => {
      expect((await request(app).delete(url(type, `/${id}`)).set(as(X))).status).toBe(200)
      before = await testDb().collection(type).findOne({ _id: id })
      expect(before.deletedAt).toBeDefined()

      const trash = await request(app).get(url(type, '/trash')).set(as(Y))
      expect(trash.status).toBe(200)
      expect(trash.body).toEqual([])
      expect((await request(app).put(url(type, `/${id}/restore`)).set(as(Y))).status).toBe(404)
      const restoreAll = await request(app).put(url(type, '/trash/restore-all')).set(as(Y))
      expect(restoreAll.body.restored).toBe(0)
      const empty = await request(app).delete(url(type, '/trash')).set(as(Y))
      expect(empty.body.disposed).toBe(0)
      await unchanged()

      // X still sees it in its own Trash.
      const own = await request(app).get(url(type, '/trash')).set(as(X))
      expect(own.body.map(d => d._id)).toEqual([id])
    })
  }

  if (type === 'VERSION_HISTORY') {
    it('?filterEntityId= of X\'s entity returns [] to Y', async () => {
      const mine = await request(app).get(url(type, '?filterEntityType=recipes&filterEntityId=entity-X')).set(as(X))
      expect(mine.body.map(d => d._id)).toEqual([id])
      const theirs = await request(app).get(url(type, '?filterEntityType=recipes&filterEntityId=entity-X')).set(as(Y))
      expect(theirs.body).toEqual([])
      await unchanged()
    })
  }
})

describe('owner and staff of one business share one copy', () => {
  it('staff lists the owner\'s product; the owner edits it; staff\'s GET by id returns the edit', async () => {
    const created = await request(app).post(url('products')).set(as(X)).send(productBody({ nameHebrew: 'חומוס' }))
    expect(created.status).toBe(201)
    const id = created.body._id

    const list = await request(app).get(url('products')).set(as(X_STAFF))
    expect(list.body.map(d => d._id)).toEqual([id])

    const edit = await request(app).put(url('products', `/${id}`)).set(as(X)).send({ nameHebrew: 'חומוס גרגירים' })
    expect(edit.status).toBe(200)
    const seen = await request(app).get(url('products', `/${id}`)).set(as(X_STAFF))
    expect(seen.status).toBe(200)
    expect(seen.body.nameHebrew).toBe('חומוס גרגירים')
  })

  it('a staff member\'s new item is stamped with the business and with the staff member as creator', async () => {
    const created = await request(app).post(url('products')).set(as(X_STAFF)).send(productBody())
    expect(created.body).toMatchObject({ businessId: 'biz_X', createdBy: 'staffX' })
    const ownerList = await request(app).get(url('products')).set(as(X))
    expect(ownerList.body.map(d => d._id)).toEqual([created.body._id])
  })
})

describe('tokens and anonymous callers', () => {
  it('a token without businessId is refused with 401 on a data route', async () => {
    const token = jwt.sign({ userId: 'userX', name: 'x' }, 'test-access-secret')
    for (const [method, path] of [['get', url('products')], ['post', url('products')], ['get', url('taxonomyTerms')]]) {
      const res = await request(app)[method](path).set('Authorization', `Bearer ${token}`).send(productBody())
      expect(res.status).toBe(401)
    }
  })

  it('anonymous GET /products returns only businessId __master__ docs', async () => {
    await testDb().collection('products').insertMany([
      stored(productBody({ nameHebrew: 'משותף' }), { _id: 'm1', userId: '__master__' }),
      stored(productBody({ nameHebrew: 'של X' }), { _id: 'x1', userId: 'userX', businessId: 'biz_X' }),
    ])
    const res = await request(app).get(url('products'))
    expect(res.status).toBe(200)
    expect(res.body.map(d => d._id)).toEqual(['m1'])
    expect(res.body.every(d => d.businessId === '__master__')).toBe(true)
    expect((await request(app).get(url('products', '/x1'))).status).toBe(404)
  })
})

describe('"for everyone" actions are platform-admin only and re-keyed by business', () => {
  it('a business owner cannot push to master, delete from master or purge an ingredient everywhere', async () => {
    const created = await request(app).post(url('products')).set(as(X)).send(productBody())
    const id = created.body._id
    for (const action of ['push-to-master', 'delete-from-master', 'purge-ingredient-everywhere']) {
      const res = await request(app).put(url('products', `/${id}/${action}`)).set(as(X))
      expect(res.status).toBe(403)
    }
    expect(await testDb().collection('products').countDocuments({ businessId: '__master__' })).toBe(0)
  })

  it('PUT /DICTIONARY_OVERRIDES/global needs isPlatformAdmin, not the legacy role', async () => {
    const body = { key: 'k', hebrewLabel: 'ל' }
    const roleOnly = await request(app).put(url('DICTIONARY_OVERRIDES', '/global')).set(as({ ...X, role: 'admin', isPlatformAdmin: false })).send(body)
    expect(roleOnly.status).toBe(403)
    const admin = await request(app).put(url('DICTIONARY_OVERRIDES', '/global')).set(as({ ...X, isPlatformAdmin: true })).send(body)
    expect(admin.status).toBe(200)
  })

  it('purge-ingredient-everywhere strips the line from other businesses only, using each business\'s own product id', async () => {
    const db = testDb()
    await db.collection('products').insertMany([
      stored(productBody(), { _id: 'adminP', userId: 'adm', businessId: 'biz_adm', _masterId: 'm1' }),
      stored(productBody(), { _id: 'xP', userId: 'userX', businessId: 'biz_X', _masterId: 'm1' }),
      stored(productBody(), { _id: 'yP', userId: 'userY', businessId: 'biz_Y', _masterId: 'm1' }),
    ])
    const line = referenceId => ({ referenceId, type: 'product', nameSnapshot: 'p', amount: 1, unit: 'kg' })
    await db.collection('recipes').insertMany([
      stored(recipeBody({ ingredients: [line('adminP')] }), { _id: 'ra', userId: 'adm', businessId: 'biz_adm' }),
      stored(recipeBody({ ingredients: [line('xP')] }), { _id: 'rx', userId: 'userX', businessId: 'biz_X' }),
      stored(recipeBody({ ingredients: [line('yP')] }), { _id: 'ry', userId: 'userY', businessId: 'biz_Y' }),
    ])
    const res = await request(app).put(url('products', '/adminP/purge-ingredient-everywhere')).set(as({ userId: 'adm', role: 'admin', businessId: 'biz_adm' }))
    expect(res.status).toBe(200)
    expect(res.body.usersAffected).toBe(2)
    const left = async _id => (await db.collection('recipes').findOne({ _id })).ingredients.length
    expect(await left('rx')).toBe(0)
    expect(await left('ry')).toBe(0)
    expect(await left('ra')).toBe(1)
  })
})
