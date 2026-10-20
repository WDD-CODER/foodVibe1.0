/**
 * Code QA layer `api` (plan 414) — every user entity's create → read → update → delete → trash → restore path,
 * its validation and its permissions, straight against the QA backend (no browser).
 *
 * Guard: it writes only when `.claude/.qa-env` (written by qa-up.ps1 when it starts the backend) reads `local`
 * and the backend answers on http://localhost:3005. Otherwise the layer is skipped and writes nothing.
 * Every record is named QA-CODE-<DATE>-… and removed before and after the cases.
 * Severity: 500, or a write that should be refused but succeeds → S1 · data lost or wrong → S2 · a status code
 * that differs but has the right effect → S3. A case listed in docs/qa/code-qa-api-cases.md is `accepted`.
 */
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { loginQa } from '../lib/qa-login.mjs'
import { buildCases, aiRoutesOf } from './api-cases.mjs'
import { ENTITY_ORDER, fixtureFor, isCodeQaRecord, loadSchemas, REF_KEYS, TRASH_OF, validateFixture } from './api-fixtures.mjs'
import { loadPageMap } from './common.mjs'
import { runCommand } from './gates.mjs'

export const QA_API = 'http://localhost:3005'
const D = '/api/v1/data'

/** Why the layer may not write ('' = it may). */
export function guardReason(root, api) {
  const envFile = join(root, '.claude', '.qa-env')
  const env = existsSync(envFile) ? readFileSync(envFile, 'utf8').trim() : ''
  if (env !== 'local') return 'not local Mongo'
  if (!/^http:\/\/(localhost|127\.0\.0\.1):3005$/.test(api.replace(/\/$/, ''))) return 'not the QA backend on :3005'
  return ''
}

/** docs/qa/code-qa-api-cases.md: lines `- <case id> — <reason> — <date>` → Map(id → reason). */
export function loadAllowList(root) {
  const file = join(root, 'docs', 'qa', 'code-qa-api-cases.md')
  const out = new Map()
  if (!existsSync(file)) return out
  for (const m of readFileSync(file, 'utf8').matchAll(/^\s*-\s+`?([\w.-]+)`?\s+—\s+(.+?)\s+—\s+(\d{4}-\d{2}-\d{2})\s*$/gm)) out.set(m[1], m[2])
  return out
}

/** The QA page that owns an entity: the auth page whose idType matches, else the first match, else GLOBAL. */
export function pageOfEntity(pageMap, entity) {
  const type = entity === 'dishes' ? 'recipes' : entity
  const pages = pageMap.pages.filter((p) => p.idType === type)
  return (pages.find((p) => p.auth) || pages[0])?.id || 'GLOBAL'
}

/** Outcome of one case: null (passed) or { severity, problem }. */
export function judge(row, res, problem) {
  const okStatus = row.expect.includes(res.status)
  const refusalExpected = row.expect.every((s) => s >= 400)
  if (res.status >= 500 || res.status === 0) return { severity: 'S1', problem: res.status ? `server error ${res.status}` : `no response (${res.error})` }
  if (refusalExpected && res.status < 300) return { severity: 'S1', problem: `accepted with ${res.status}; it should be refused (${row.expect.join('/')})` }
  if (!okStatus && !refusalExpected && res.status >= 400) return { severity: 'S2', problem: `refused with ${res.status}; expected ${row.expect.join('/')}` }
  if (problem) return { severity: 'S2', problem }
  if (!okStatus) return { severity: 'S3', problem: `status ${res.status}; expected ${row.expect.join('/')}` }
  return null
}

function makeClient(api, sessions, counter) {
  return async function call(method, path, { as = 'user', body, headers = {} } = {}) {
    const h = { ...headers }
    if (body !== undefined) h['content-type'] = 'application/json'
    const token = as === 'anon' ? null : sessions[as]?.token
    if (token) h.authorization = `Bearer ${token}`
    if (method !== 'GET') counter.writes++
    try {
      const r = await fetch(`${api}${path}`, { method, headers: h, body: body === undefined ? undefined : JSON.stringify(body) })
      const text = await r.text()
      let json = null
      try { json = text ? JSON.parse(text) : null } catch { json = null }
      return { status: r.status, json }
    } catch (err) {
      return { status: 0, json: null, error: err.message }
    }
  }
}

/** Deletes every QA-CODE- record of QA_USER in every entity and trash type; returns the ones left. */
export async function cleanup(call, extra = []) {
  const types = [...[...ENTITY_ORDER].reverse(), ...Object.values(TRASH_OF).filter(Boolean)]
  for (const s of extra) await call('DELETE', `${D}/${s.type}/${s.id}`)
  const left = []
  for (const type of types) {
    const r = await call('GET', `${D}/${type}`)
    const mine = (Array.isArray(r.json) ? r.json : []).filter(isCodeQaRecord)
    for (const doc of mine) {
      const d = await call('DELETE', `${D}/${type}/${encodeURIComponent(doc._id)}`)
      if (d.status >= 300 && d.status !== 404) left.push(`${type}/${doc._id} (${d.status})`)
    }
  }
  // A product delete is refused while a recipe still points at it: one more pass after the recipes are gone.
  for (const type of types) {
    const r = await call('GET', `${D}/${type}`)
    for (const doc of (Array.isArray(r.json) ? r.json : []).filter(isCodeQaRecord)) {
      const d = await call('DELETE', `${D}/${type}/${encodeURIComponent(doc._id)}`)
      if (d.status >= 300 && d.status !== 404 && !left.some((l) => l.startsWith(`${type}/${doc._id}`))) left.push(`${type}/${doc._id} (${d.status})`)
    }
  }
  const remaining = []
  for (const type of types) {
    const r = await call('GET', `${D}/${type}`)
    for (const doc of (Array.isArray(r.json) ? r.json : []).filter(isCodeQaRecord)) remaining.push(`${type}/${doc._id}`)
  }
  return remaining
}

export async function runApi({ root, opts, signal, date, log = () => {} }) {
  const started = Date.now()
  const skipped = (why) => ({ status: 'skipped', statusLine: `skipped (${why})`, durationMs: Date.now() - started, coverage: `none — ${why}`, coveredPages: [], note: why, findings: [] })
  const why = guardReason(root, opts.api)
  if (why) return skipped(why)

  let schemas = loadSchemas(root)
  if (!schemas) {
    await runCommand('npm run build:schemas', { cwd: root, timeoutMs: 5 * 60_000, signal })
    schemas = loadSchemas(root)
  }
  if (!schemas) return { ...skipped('shared schemas are not built (npm run build:schemas)'), status: 'fail' }

  const sessions = {}
  try {
    sessions.user = await loginQa({ api: opts.api, root })
  } catch (err) {
    return { ...skipped(`cannot sign in as QA_USER: ${err.message}`), status: 'fail' }
  }
  let user2Note = ''
  try {
    sessions.user2 = await loginQa({ api: opts.api, root, userKey: 'QA_USER2', passKey: 'QA_PASS2' })
  } catch (err) {
    user2Note = `cross-user cases skipped: ${err.message}`
  }

  const counter = { writes: 0 }
  const call = makeClient(opts.api, sessions, counter)
  const pageMap = loadPageMap(root)
  const allow = loadAllowList(root)
  const findings = []
  const finding = (row, page, severity, problem, res, path) => findings.push({
    check: row.kind, page, bp: '-', locator: row.id, severity, type: 'API',
    title: `${row.id}: ${problem}`, where: `${row.method} ${path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|\b[0-9a-f]{24}\b/gi, ':id').replace(/\?q=[^&]*/, '?q=…')}`,
    expected: `status ${row.expect.join('/')}${row.check ? ' and the data intact' : ''}`,
    actual: `status ${res.status}${res.json?.error ? ` — ${String(res.json.error).slice(0, 120)}` : ''}`
  })

  // Fixtures must be valid, or every failure below would be the fixture's fault.
  for (const e of ENTITY_ORDER) {
    for (const tag of ['subject', 'ref']) {
      const issues = validateFixture(schemas, e, fixtureFor(e, date, { supplier: 's', equipment: 'e', refProduct: 'p', recipe: 'r', dish: 'd' }, tag))
      if (issues.length) return { ...skipped(`fixture ${e} does not match shared/schemas: ${issues[0]}`), status: 'fail' }
    }
  }

  const before = await cleanup(call)
  if (before.length) log(`api: ${before.length} leftover QA-CODE records could not be removed before the run`)

  // Reference records the subjects point at.
  const ctx = { refs: {}, ids: {}, docs: {}, counts: {}, trash: {}, strays: [] }
  for (const [entity, key] of Object.entries(REF_KEYS)) {
    const r = await call('POST', `${D}/${entity}`, { body: fixtureFor(entity, date, ctx.refs, 'ref') })
    if (r.status !== 201 || !r.json?._id) {
      await cleanup(call)
      return { ...skipped(`cannot create the ${entity} reference record (status ${r.status})`), status: 'fail' }
    }
    ctx.refs[key] = r.json._id
  }

  const aiSource = readFileSync(join(root, 'server', 'routes', 'ai.js'), 'utf8')
  const rows = buildCases(ENTITY_ORDER, date, { hasUser2: Boolean(sessions.user2), aiRoutes: aiRoutesOf(aiSource) })
  const stats = { run: 0, failed: 0, accepted: 0, skipped: 0 }
  const brokenEntities = new Set()
  for (const row of rows) {
    if (signal?.aborted) break
    if (row.skip) { stats.skipped++; continue }
    // A subject that was never created makes the rest of its rows meaningless.
    if (row.entity && brokenEntities.has(row.entity)) { stats.skipped++; continue }
    const path = typeof row.path === 'function' ? row.path(ctx) : row.path
    const body = typeof row.body === 'function' ? row.body(ctx) : row.body
    const res = await call(row.method, path, { as: row.as, body, headers: row.headers })
    stats.run++
    const problem = row.check && res.status < 300 ? row.check(res, ctx) : ''
    row.after?.(res, ctx)
    if (row.entity && row.kind === 'crud' && /\.create$/.test(row.id) && !ctx.ids[row.entity]) brokenEntities.add(row.entity)
    const verdict = judge(row, res, problem)
    if (!verdict) continue
    if (allow.has(row.id)) { stats.accepted++; continue }
    stats.failed++
    finding(row, row.entity ? pageOfEntity(pageMap, row.entity) : 'GLOBAL', verdict.severity, verdict.problem, res, path)
  }

  const left = await cleanup(call, ctx.strays)
  if (left.length) {
    findings.push({
      check: 'cleanup', page: 'GLOBAL', bp: '-', locator: 'api.cleanup', severity: 'S2', type: 'API',
      title: `api cleanup left ${left.length} QA-CODE record(s)`, where: 'QA_USER data',
      expected: 'no QA-CODE- record after the run', actual: left.slice(0, 10).join(', ')
    })
  }
  const perEntity = Math.max(...ENTITY_ORDER.map((e) => rows.filter((r) => r.entity === e).length))
  const coveredPages = signal?.aborted ? [] : [...new Set(ENTITY_ORDER.map((e) => pageOfEntity(pageMap, e)).concat('GLOBAL'))]
  log(`api: writes: ${counter.writes}`)
  return {
    status: signal?.aborted ? 'partial' : 'ok',
    durationMs: Date.now() - started,
    coverage: [
      `${ENTITY_ORDER.length} entities × ${perEntity} cases`,
      `${rows.length} rows: ${stats.run} run · ${stats.failed} failed · ${stats.accepted} accepted · ${stats.skipped} skipped`,
      `writes: ${counter.writes}`,
      user2Note || 'cross-user: on'
    ].join(' · '),
    coveredPages,
    findings
  }
}
