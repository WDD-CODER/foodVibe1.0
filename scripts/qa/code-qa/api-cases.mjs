/**
 * Code QA api layer (plan 414) — the cases. Each case is a row
 *   { id, entity, kind, method, path, as, body?, headers?, expect: [status…], check?, after?, skip? }
 * `path` / `body` may be functions of the run context `ctx` (ids created by earlier rows), so the rows are
 * built up front and run in order by api-layer.mjs. `as` is 'user' (QA_USER), 'user2' (QA_USER2) or 'anon'.
 * `check(res, ctx)` returns a problem string or '' — a problem means data was lost or wrong (S2).
 * `after(res, ctx)` stores what later rows need.
 *
 * Kinds: crud · trash · validation · auth · ai. Severity is decided by api-layer.mjs from the outcome.
 */
import { fixtureFor, nameField, SEARCHABLE } from './api-fixtures.mjs'

const D = '/api/v1/data'
const FAKE_ID = '000000000000000000000000'

/** '' when every field of `fixture` is in `doc` with the same value, else the first differing field. */
export function compareFields(fixture, doc) {
  if (!doc || typeof doc !== 'object') return 'no document in the response'
  for (const [k, v] of Object.entries(fixture)) {
    if (JSON.stringify(doc[k]) !== JSON.stringify(v)) {
      return `field "${k}" sent ${JSON.stringify(v).slice(0, 80)}, got ${JSON.stringify(doc[k])?.slice(0, 80) ?? 'nothing'}`
    }
  }
  return ''
}

const has = (list, id) => Array.isArray(list) && list.some((d) => d && d._id === id)

/** The rows for one entity. `subject` is ctx.ids[entity]; refs come from ctx.ids too. */
export function entityCases(entity, date, { hasUser2 = true } = {}) {
  const name = nameField(entity)
  const fx = (ctx) => fixtureFor(entity, date, ctx.refs)
  const id = (ctx) => ctx.ids[entity]
  const rows = []
  const add = (row) => rows.push({ entity, ...row, id: `${entity}.${row.kind}.${row.id}` })

  // 1. CRUD
  add({ kind: 'crud', id: 'count-before', method: 'GET', path: `${D}/${entity}/count`, as: 'user', expect: [200],
    after: (res, ctx) => { ctx.counts[entity] = res.json?.count } })
  add({ kind: 'crud', id: 'create', method: 'POST', path: `${D}/${entity}`, as: 'user', body: fx, expect: [201],
    check: (res, ctx) => compareFields(fx(ctx), res.json),
    after: (res, ctx) => { if (res.json?._id) ctx.ids[entity] = res.json._id } })
  add({ kind: 'crud', id: 'read', method: 'GET', path: (ctx) => `${D}/${entity}/${id(ctx)}`, as: 'user', expect: [200],
    check: (res, ctx) => compareFields(fx(ctx), res.json) })
  add({ kind: 'crud', id: 'update', method: 'PUT', path: (ctx) => `${D}/${entity}/${id(ctx)}`, as: 'user',
    body: (ctx) => ({ [name]: `${fx(ctx)[name]}-edited` }), expect: [200] })
  add({ kind: 'crud', id: 'read-after-update', method: 'GET', path: (ctx) => `${D}/${entity}/${id(ctx)}`, as: 'user', expect: [200],
    check: (res, ctx) => compareFields({ ...fx(ctx), [name]: `${fx(ctx)[name]}-edited` }, res.json),
    after: (res, ctx) => { if (res.json?._id) ctx.docs[entity] = res.json } })
  add({ kind: 'crud', id: 'list', method: 'GET', path: `${D}/${entity}`, as: 'user', expect: [200],
    check: (res, ctx) => (has(res.json, id(ctx)) ? '' : 'the new record is not in the list') })
  if (SEARCHABLE.has(entity)) {
    add({ kind: 'crud', id: 'search', method: 'GET', path: (ctx) => `${D}/${entity}/search?q=${encodeURIComponent(fx(ctx)[name])}&limit=5`, as: 'user', expect: [200],
      check: (res, ctx) => (has(res.json, id(ctx)) ? '' : 'search by name does not find the new record') })
  }
  add({ kind: 'crud', id: 'count-after', method: 'GET', path: `${D}/${entity}/count`, as: 'user', expect: [200],
    check: (res, ctx) => (typeof ctx.counts[entity] === 'number' && res.json?.count !== ctx.counts[entity] + 1
      ? `count went from ${ctx.counts[entity]} to ${res.json?.count}, expected +1` : '') })

  // 4. Auth on the record (before it moves to the trash)
  add({ kind: 'auth', id: 'post-no-token', method: 'POST', path: `${D}/${entity}`, as: 'anon', body: fx, expect: [401],
    after: (res, ctx) => { if (res.status < 300 && res.json?._id) ctx.strays.push({ type: entity, id: res.json._id }) } })
  add({ kind: 'auth', id: 'put-no-token', method: 'PUT', path: (ctx) => `${D}/${entity}/${id(ctx)}`, as: 'anon', body: (ctx) => ({ [name]: `${fx(ctx)[name]}-anon` }), expect: [401] })
  add({ kind: 'auth', id: 'delete-no-token', method: 'DELETE', path: (ctx) => `${D}/${entity}/${id(ctx)}`, as: 'anon', expect: [401] })
  const noUser2 = hasUser2 ? undefined : 'QA_USER2 / QA_PASS2 not set'
  add({ kind: 'auth', id: 'put-other-user', method: 'PUT', path: (ctx) => `${D}/${entity}/${id(ctx)}`, as: 'user2', skip: noUser2,
    body: (ctx) => ({ [name]: `${fx(ctx)[name]}-user2` }), expect: [403, 404] })
  add({ kind: 'auth', id: 'delete-other-user', method: 'DELETE', path: (ctx) => `${D}/${entity}/${id(ctx)}`, as: 'user2', skip: noUser2, expect: [403, 404] })
  add({ kind: 'auth', id: 'unchanged-after-other-user', method: 'GET', path: (ctx) => `${D}/${entity}/${id(ctx)}`, as: 'user', skip: noUser2, expect: [200],
    check: (res, ctx) => compareFields({ [name]: `${fx(ctx)[name]}-edited` }, res.json) })

  // 3. Validation — a write the server wrongly accepts is remembered so cleanup removes it.
  const stray = (res, ctx) => { if (res.status < 300 && res.json?._id) ctx.strays.push({ type: entity, id: res.json._id }) }
  add({ kind: 'validation', id: 'missing-required', method: 'POST', path: `${D}/${entity}`, as: 'user', expect: [400], after: stray,
    body: (ctx) => { const { [name]: _n, ...rest } = fx(ctx); return rest } })
  add({ kind: 'validation', id: 'wrong-type', method: 'POST', path: `${D}/${entity}`, as: 'user', expect: [400], after: stray,
    body: (ctx) => ({ ...fx(ctx), [name]: 12345 }) })
  add({ kind: 'validation', id: 'huge-string', method: 'POST', path: `${D}/${entity}`, as: 'user', expect: [400], after: stray,
    body: (ctx) => ({ ...fx(ctx), [name]: `${fx(ctx)[name]}-huge-${'x'.repeat(200_000)}` }) })

  // 2. Trash (plan 407) — the app's own path: delete stamps deletedAt, restore unsets it.
  const trash = `${D}/${entity}/trash`
  add({ kind: 'trash', id: 'delete', method: 'DELETE', path: (ctx) => `${D}/${entity}/${id(ctx)}`, as: 'user', expect: [200] })
  add({ kind: 'trash', id: 'gone-from-list', method: 'GET', path: `${D}/${entity}`, as: 'user', expect: [200],
    check: (res, ctx) => (has(res.json, id(ctx)) ? 'the deleted record is still in the list' : '') })
  add({ kind: 'trash', id: 'in-trash', method: 'GET', path: trash, as: 'user', expect: [200],
    check: (res, ctx) => (has(res.json, id(ctx)) ? '' : 'the deleted record is not in the Trash') })
  add({ kind: 'trash', id: 'restore', method: 'PUT', path: (ctx) => `${D}/${entity}/${id(ctx)}/restore`, as: 'user', expect: [200] })
  add({ kind: 'trash', id: 'restored-intact', method: 'GET', path: (ctx) => `${D}/${entity}/${id(ctx)}`, as: 'user', expect: [200],
    check: (res, ctx) => compareFields({ ...fx(ctx), [name]: `${fx(ctx)[name]}-edited` }, res.json) })
  add({ kind: 'trash', id: 'gone-from-trash', method: 'GET', path: trash, as: 'user', expect: [200],
    check: (res, ctx) => (has(res.json, id(ctx)) ? 'the restored record is still in the Trash' : '') })
  return rows
}

/** Cases that belong to no entity: unknown type, admin routes, AI routes without a token. */
export function globalCases(aiRoutes) {
  const rows = [
    { entity: null, kind: 'validation', id: 'global.validation.unknown-type', method: 'POST', path: `${D}/notAType`, as: 'user', body: { nameHebrew: 'QA-CODE-x' }, expect: [400, 403, 404] },
    { entity: null, kind: 'auth', id: 'global.auth.admin-users', method: 'GET', path: '/api/v1/admin/users', as: 'user', expect: [403] },
    // A fake id: requireAdmin answers before the handler looks the record up, and nothing real can be pushed.
    { entity: null, kind: 'auth', id: 'global.auth.push-to-master', method: 'PUT', path: `${D}/products/${FAKE_ID}/push-to-master`, as: 'user', body: {}, expect: [403] }
  ]
  for (const r of aiRoutes) {
    rows.push({ entity: null, kind: 'ai', id: `global.ai.${r.method.toLowerCase()}-${r.path.replace(/^\//, '').replace(/\W+/g, '-')}`,
      method: r.method, path: `/api/v1/ai${r.path}`, as: 'anon', body: r.method === 'GET' ? undefined : {}, expect: [401] })
  }
  return rows
}

/** Routes of server/routes/ai.js that need a token: [{ method, path }]. */
export function aiRoutesOf(source) {
  const out = []
  for (const m of source.matchAll(/router\.(get|post|put|delete)\(\s*'([^']+)'\s*,\s*([^)]*?)(?:async|\()/g)) {
    if (/verifyToken/.test(m[3])) out.push({ method: m[1].toUpperCase(), path: m[2] })
  }
  return out
}

/** Every row of a run, in order: entities in ENTITY_ORDER, then the global rows. */
export function buildCases(entities, date, opts = {}) {
  return [...entities.flatMap((e) => entityCases(e, date, opts)), ...globalCases(opts.aiRoutes || [])]
}

/** True when the rows of a run make at most `max` write calls (cleanup excluded). */
export const writeCount = (rows) => rows.filter((r) => r.method !== 'GET' && !r.skip).length
