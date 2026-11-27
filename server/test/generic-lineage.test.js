'use strict'
/**
 * Plan 771 — the generic POST / PUT stamp clone lineage (`_masterId`, `_userModified`) on the `cloneable` collections
 * of server/constants/collections.js and on no other, so a new collection needs no edit to server/routes/generic.js.
 */

const fs = require('fs')
const path = require('path')
const Module = require('module')
const request = require('supertest')
const { z } = require('zod')
const { buildTestApp, teardownTestApp, signTestToken, testDb } = require('./helpers/app')
const {
  productBody, recipeBody, supplierBody, equipmentBody, venueBody, menuEventBody,
} = require('./helpers/v2-docs')

/** A collection that exists only here: added to COLLECTIONS (and given its strict schema), named in no route. */
const NEW_TYPE = 'lineageProbes'

/** Loads constants/collections.js with one more COLLECTIONS entry, so every derived list is built from it. */
function addToCollections(entry) {
  const file = require.resolve('../constants/collections')
  const source = fs.readFileSync(file, 'utf8')
  const marker = 'const COLLECTIONS = ['
  if (!source.includes(marker)) throw new Error(`"${marker}" not found in ${file}`)
  const loaded = new Module(file)
  loaded.filename = file
  loaded.paths = Module._nodeModulePaths(path.dirname(file))
  loaded._compile(source.replace(marker, `${marker}\n  ${JSON.stringify(entry)},`), file)
  loaded.loaded = true
  require.cache[file] = loaded
}

// Both run before anything requires the app: the route reads these at load time.
addToCollections({ name: NEW_TYPE, userData: true, cloneable: false, backup: false, searchable: false, softDelete: false })
const { baseDocShape } = require('../generated/schemas/base.schema')
const { SCHEMA_BY_COLLECTION } = require('../generated/schemas/entities')
SCHEMA_BY_COLLECTION[NEW_TYPE] = z.strictObject({ ...baseDocShape, title: z.string() })

const { CLONEABLE_TYPES, ALL_USER_ENTITY_TYPES } = require('../constants/collections')
const { MODULE_KEYS } = require('../generated/schemas/modules')
const { clearModuleCache } = require('../middleware/require-module')

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
  await db.collection('businesses').insertOne({ _id: 'biz_X', name: 'X', ownerId: 'userX', createdAt: 1, internal: false, modules: [...MODULE_KEYS] })
  clearModuleCache()
})

const OWNER = { userId: 'userX', role: 'user', businessId: 'biz_X', businessRole: 'owner' }
const auth = () => ({ Authorization: `Bearer ${signTestToken(OWNER)}` })
const url = (type, rest = '') => `/api/v1/data/${type}${rest}`
const storedDoc = (type, id) => testDb().collection(type).findOne({ _id: id })
/** What a client might send to forge lineage: the server drops both on every type. */
const FORGED = { _masterId: 'someone-else', _userModified: true }

/** POSTs `body` and returns the stored doc. */
async function create(type, body) {
  const res = await request(app).post(url(type)).set(auth()).send({ ...body, ...FORGED })
  expect(res.body.issues).toBeUndefined()
  expect(res.status).toBe(201)
  return storedDoc(type, res.body._id)
}

/** PUTs the stored doc back with `changes` and returns what is stored afterwards. */
async function update(type, doc, changes) {
  const res = await request(app).put(url(type, `/${doc._id}`)).set(auth()).send({ ...doc, ...changes })
  expect(res.body.issues).toBeUndefined()
  expect(res.status).toBe(200)
  return storedDoc(type, doc._id)
}

const CLONEABLE_BODY = {
  suppliers: () => supplierBody(),
  products: () => productBody(),
  recipes: () => recipeBody(),
  dishes: () => recipeBody({ nameHebrew: 'מנה' }),
  equipment: () => equipmentBody(),
  venues: () => venueBody(),
  menuEvents: () => menuEventBody(),
}

it('has a body for every type of CLONEABLE_TYPES', () => {
  expect(Object.keys(CLONEABLE_BODY).sort()).toEqual([...CLONEABLE_TYPES].sort())
})

describe.each(CLONEABLE_TYPES)('cloneable %s', type => {
  it('a generic POST self-links the doc and a PUT marks it user-modified', async () => {
    const created = await create(type, CLONEABLE_BODY[type]())
    expect(created._masterId).toBe(created._id)
    expect(created._userModified).toBe(false)

    const updated = await update(type, created, FORGED)
    expect(updated._masterId).toBe(created._id)
    expect(updated._userModified).toBe(true)
  })
})

const NON_CLONEABLE = {
  knowledgeItems: {
    body: { topic: 'policy', question: 'חניה?', answer: 'יש', status: 'approved', source: 'manual', visibility: 'public' },
    changes: { answer: 'אין' },
  },
  clients: { body: { name: 'לקוח', phone: '050-111 2222' }, changes: { name: 'לקוח ב' } },
  taxonomyTerms: { body: { kind: 'allergen', key: 'lupinx', sortOrder: 0 }, changes: { sortOrder: 1 } },
  frontDeskProfiles: {
    body: { businessType: 'other', slug: 'lineage-x', displayName: 'עסק', hours: [], requestKinds: {}, assistant: { level: 0, tone: 'warm' } },
    changes: { displayName: 'עסק ב' },
  },
  [NEW_TYPE]: { body: { title: 'a' }, changes: { title: 'b' } },
}

it('the probe collection is a non-cloneable user collection that exists only in COLLECTIONS', () => {
  expect(ALL_USER_ENTITY_TYPES).toContain(NEW_TYPE)
  expect(CLONEABLE_TYPES).not.toContain(NEW_TYPE)
  expect(fs.readFileSync(require.resolve('../routes/generic'), 'utf8')).not.toContain(NEW_TYPE)
})

describe.each(Object.keys(NON_CLONEABLE))('non-cloneable %s', type => {
  it('a generic POST and PUT store neither lineage field', async () => {
    const { body, changes } = NON_CLONEABLE[type]
    const created = await create(type, body)
    expect(created).not.toHaveProperty('_masterId')
    expect(created).not.toHaveProperty('_userModified')

    const updated = await update(type, created, { ...changes, ...FORGED })
    expect(updated).toMatchObject(changes)
    expect(updated).not.toHaveProperty('_masterId')
    expect(updated).not.toHaveProperty('_userModified')
  })
})
