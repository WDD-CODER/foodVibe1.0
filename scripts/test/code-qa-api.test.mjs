import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { aiRoutesOf, buildCases, compareFields, entityCases, globalCases, writeCount } from '../qa/code-qa/api-cases.mjs'
import { ENTITY_ORDER, fixtureFor, isCodeQaRecord, loadSchemas, nameField, validateFixture } from '../qa/code-qa/api-fixtures.mjs'
import { guardReason, judge, loadAllowList, pageOfEntity, runApi } from '../qa/code-qa/api-layer.mjs'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const FIX = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'code-qa')
const DATE = '2026-10-20'
const refs = { supplier: 's1', equipment: 'e1', refProduct: 'p1', recipe: 'r1', dish: 'd1' }

/** A checkout with only .claude/.qa-env (or none). */
function rootWith(env) {
  const dir = mkdtempSync(join(tmpdir(), 'fv-api-'))
  if (env !== undefined) {
    mkdirSync(join(dir, '.claude'), { recursive: true })
    writeFileSync(join(dir, '.claude', '.qa-env'), `${env}\n`)
  }
  return dir
}

test('every fixture is named QA-CODE-<DATE>- and links to the records before it', () => {
  for (const e of ENTITY_ORDER) {
    const f = fixtureFor(e, DATE, refs)
    assert.match(f[nameField(e)], new RegExp(`^QA-CODE-${DATE}-${e}-subject$`))
    assert.ok(isCodeQaRecord(f))
  }
  assert.equal(fixtureFor('products', DATE, refs).sources[0].supplierId, 's1')
  assert.equal(fixtureFor('recipes', DATE, refs).ingredients[0].referenceId, 'p1')
  assert.equal(fixtureFor('dishes', DATE, refs).ingredients[0].referenceId, 'r1')
  assert.equal(fixtureFor('venues', DATE, refs).availableInfrastructure[0].equipmentId, 'e1')
  assert.equal(fixtureFor('menuEvents', DATE, refs).sections[0].items[0].recipeId, 'd1')
  assert.equal(isCodeQaRecord({ nameHebrew: 'עגבניות' }), false)
})

test('every fixture parses with the shared schemas', { skip: !loadSchemas(repo) && 'npm run build:schemas first' }, () => {
  const schemas = loadSchemas(repo)
  for (const e of ENTITY_ORDER) {
    for (const tag of ['subject', 'ref']) assert.deepEqual(validateFixture(schemas, e, fixtureFor(e, DATE, refs, tag)), [], `${e} ${tag}`)
  }
  assert.notDeepEqual(validateFixture(schemas, 'products', { ...fixtureFor('products', DATE, refs), nameHebrew: 1 }), [])
})

test('the case builder covers CRUD, trash, validation and auth for every entity, with unique ids', () => {
  const rows = buildCases(ENTITY_ORDER, DATE, { aiRoutes: [{ method: 'POST', path: '/generate' }] })
  const ids = rows.map((r) => r.id)
  assert.equal(new Set(ids).size, ids.length)
  for (const e of ENTITY_ORDER) {
    const kinds = new Set(rows.filter((r) => r.entity === e).map((r) => r.kind))
    assert.deepEqual([...kinds].sort(), ['auth', 'crud', 'trash', 'validation'], e)
  }
  assert.ok(ids.includes('products.crud.search'))
  assert.ok(!ids.includes('suppliers.crud.search'))
  // Plan 407: every entity has a Trash with restore.
  for (const e of ENTITY_ORDER) assert.ok(ids.includes(`${e}.trash.restore`) && ids.includes(`${e}.trash.in-trash`), e)
  assert.ok(ids.includes('global.ai.post-generate'))
  assert.ok(writeCount(rows) <= 300, `writes ${writeCount(rows)}`)
})

test('without QA_USER2 the cross-user cases are marked skipped, the rest still run', () => {
  const rows = entityCases('products', DATE, { hasUser2: false })
  const skipped = rows.filter((r) => r.skip).map((r) => r.id)
  assert.deepEqual(skipped, ['products.auth.put-other-user', 'products.auth.delete-other-user', 'products.auth.unchanged-after-other-user'])
  assert.ok(rows.filter((r) => !r.skip).length > 15)
})

test('rows resolve their paths and bodies from the run context', () => {
  const ctx = { refs, ids: { products: 'P9' }, docs: { products: { _id: 'P9', nameHebrew: 'x' } }, counts: { products: 4 }, strays: [] }
  const rows = Object.fromEntries(entityCases('products', DATE).map((r) => [r.id, r]))
  assert.equal(rows['products.crud.read'].path(ctx), '/api/v1/data/products/P9')
  assert.equal(rows['products.validation.missing-required'].body(ctx).nameHebrew, undefined)
  assert.equal(rows['products.validation.wrong-type'].body(ctx).nameHebrew, 12345)
  assert.ok(rows['products.validation.huge-string'].body(ctx).nameHebrew.length > 200_000)
  assert.equal(rows['products.trash.restore'].path(ctx), '/api/v1/data/products/P9/restore')
  assert.equal(rows['products.crud.count-after'].check({ json: { count: 5 } }, ctx), '')
  assert.match(rows['products.crud.count-after'].check({ json: { count: 4 } }, ctx), /expected \+1/)
  rows['products.validation.wrong-type'].after({ status: 201, json: { _id: 'stray' } }, ctx)
  assert.deepEqual(ctx.strays, [{ type: 'products', id: 'stray' }])
})

test('compareFields reports the first field that did not survive the round trip', () => {
  assert.equal(compareFields({ a: 1, b: [1, 2] }, { a: 1, b: [1, 2], extra: true }), '')
  assert.match(compareFields({ a: 1, b: [1, 2] }, { a: 1, b: [2] }), /field "b"/)
  assert.match(compareFields({ a: 1 }, null), /no document/)
})

test('severity: 500 and wrongly accepted writes are S1, lost data S2, an odd status with the right effect S3', () => {
  const create = { expect: [201] }
  const refuse = { expect: [400] }
  assert.equal(judge(create, { status: 201 }, ''), null)
  assert.equal(judge(create, { status: 500 }, '').severity, 'S1')
  assert.equal(judge(refuse, { status: 201 }, '').severity, 'S1')
  assert.equal(judge(create, { status: 201 }, 'field "x" lost').severity, 'S2')
  assert.equal(judge(create, { status: 400 }, '').severity, 'S2')
  assert.equal(judge(create, { status: 200 }, '').severity, 'S3')
  assert.equal(judge(refuse, { status: 422 }, '').severity, 'S3')
  assert.equal(judge(refuse, { status: 0, error: 'ECONNREFUSED' }, '').severity, 'S1')
})

test('the guard writes only to the local QA database on :3005', () => {
  assert.equal(guardReason(rootWith('local'), 'http://localhost:3005'), '')
  assert.equal(guardReason(rootWith('remote'), 'http://localhost:3005'), 'not local Mongo')
  assert.equal(guardReason(rootWith(undefined), 'http://localhost:3005'), 'not local Mongo')
  assert.equal(guardReason(rootWith('local'), 'http://localhost:3000'), 'not the QA backend on :3005')
})

test('with .qa-env remote the layer is skipped and makes no call', async () => {
  const realFetch = globalThis.fetch
  let calls = 0
  globalThis.fetch = async () => { calls++; throw new Error('no network in this test') }
  try {
    const r = await runApi({ root: rootWith('remote'), opts: { api: 'http://localhost:3005' }, date: DATE })
    assert.equal(r.status, 'skipped')
    assert.equal(r.statusLine, 'skipped (not local Mongo)')
    assert.equal(calls, 0)
  } finally {
    globalThis.fetch = realFetch
  }
})

test('allow-list lines and AI route discovery', () => {
  const allow = loadAllowList(join(FIX, 'api'))
  assert.equal(allow.get('products.validation.huge-string'), 'no length limit on names yet')
  assert.equal(allow.size, 1)
  const routes = aiRoutesOf("router.get('/usage', async (_req, res) => {\nrouter.post('/generate', verifyToken, aiLimiter, async (req, res) => {\nrouter.put('/models', verifyToken, requireAdmin, async (req, res) => {")
  assert.deepEqual(routes, [{ method: 'POST', path: '/generate' }, { method: 'PUT', path: '/models' }])
  assert.ok(aiRoutesOf(readFileSync(join(repo, 'server', 'routes', 'ai.js'), 'utf8')).length >= 10)
  assert.equal(globalCases(routes).filter((r) => r.kind === 'ai').every((r) => r.as === 'anon' && r.expect[0] === 401), true)
})

test('findings go to the page that owns the entity', () => {
  const map = { pages: [{ id: 'VEND', idType: 'venues', auth: false }, { id: 'VENF', idType: 'venues', auth: true }, { id: 'RBD', idType: 'recipes', auth: true }] }
  assert.equal(pageOfEntity(map, 'venues'), 'VENF')
  assert.equal(pageOfEntity(map, 'dishes'), 'RBD')
  assert.equal(pageOfEntity(map, 'suppliers'), 'GLOBAL')
})
