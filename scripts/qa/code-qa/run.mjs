#!/usr/bin/env node
/**
 * Code QA (plan 413) — the deterministic night run, no AI. Layers in order:
 *   gates   build, lint, unit and server tests (a failed build ends the run: BLOCKED.md)
 *   static  translation keys, untranslated text, physical CSS, routes, page map — no server
 *   api     CRUD, trash, validation and permission cases straight against the QA backend (plan 414;
 *           local Mongo only, every record removed)
 *   sweep   Playwright over every page × D/T/M on the QA stack, plus the e2e flows
 * Writes bugs/qa-runs/code-qa/<DATE>/pre-qa.{md,json}, known.json and latest.md (findings.mjs).
 *
 * Usage: node scripts/qa/code-qa/run.mjs [--layers=gates,static,api,sweep] [--date=YYYY-MM-DD]
 *          [--deadline=HH:MM] [--nightly] [--e2e=all] [--app=http://localhost:4205] [--api=http://localhost:3005]
 *   --nightly   deadline 02:40 unless given, and every CODE-QA line also goes to bugs/qa-runs/.nightly.log;
 *               also ingests yesterday's code reviews first and writes tonight's review queue last (plan 415)
 *   --deadline  the running layer stops at that time (marked partial), later layers are skipped, reports
 *               are still written. A time earlier than now means tomorrow.
 * Exit: 0 run complete (findings or not) · 2 blocked by a failed build · 1 usage or internal error.
 */
import { execFileSync, spawn } from 'child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join, resolve } from 'path'
import { pathToFileURL } from 'url'
import { loginQa, storageStateOf } from '../lib/qa-login.mjs'
import { localDate, loadPageMap, nightlyLog, outRoot, repoRoot } from './common.mjs'
import { BREAKPOINTS, dedupe, LAYER_ORDER, normalizeFinding, redact, writeReports } from './findings.mjs'
import { runGates } from './gates.mjs'
import { runStatic } from './static-checks.mjs'
import { runApi } from './api-layer.mjs'
import { codeReviewExtras, ingest, loadLedger, pick } from './rotation.mjs'

// --- args ----------------------------------------------------------------------

export function parseArgs(argv) {
  const opts = { layers: ['gates', 'static', 'api', 'sweep'], nightly: false, date: localDate(), deadline: null, e2e: '', app: 'http://localhost:4205', api: 'http://localhost:3005' }
  for (const a of argv) {
    const [k, v = ''] = a.replace(/^--/, '').split(/=(.*)/s)
    if (k === 'layers') opts.layers = v.split(',').map((s) => s.trim()).filter(Boolean)
    else if (k === 'nightly') opts.nightly = true
    else if (k === 'date') opts.date = v
    else if (k === 'deadline') opts.deadline = v
    else if (k === 'e2e') opts.e2e = v
    else if (k === 'app') opts.app = v.replace(/\/$/, '')
    else if (k === 'api') opts.api = v.replace(/\/$/, '')
    else throw new Error(`unknown option ${a}`)
  }
  if (opts.nightly && !opts.deadline) opts.deadline = '02:40'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(opts.date)) throw new Error('--date must be YYYY-MM-DD')
  if (opts.deadline && !/^\d{1,2}:\d{2}$/.test(opts.deadline)) throw new Error('--deadline must be HH:MM')
  return opts
}

/** The calendar day before YYYY-MM-DD. */
export function previousDate(date) {
  const d = new Date(`${date}T12:00:00`)
  d.setDate(d.getDate() - 1)
  return localDate(d)
}

/** ms epoch of the next HH:MM after `now`. */
export function deadlineAt(hhmm, now = new Date()) {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(now)
  d.setHours(h, m, 0, 0)
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1)
  return d.getTime()
}

// --- sweep layer ----------------------------------------------------------------------

const E2E_PAGE = { 'cook-view': 'COOK', 'product-crud': 'INVF', 'recipe-creation': 'RBD', 'recipe-edit': 'RBD' }

/** Fills :id from the first record of the page's idType; routes without one are NO-DATA. */
export async function resolveRoutes(pageMap, fetchFirstId) {
  const routes = []
  const noData = []
  const cache = new Map()
  for (const p of pageMap.pages) {
    for (const route of p.routes) {
      if (!route.includes(':id')) { routes.push({ page: p.id, route, url: route }); continue }
      if (!cache.has(p.idType)) cache.set(p.idType, p.idType ? await fetchFirstId(p.idType).catch(() => null) : null)
      const id = cache.get(p.idType)
      if (id) routes.push({ page: p.id, route, url: route.replace(':id', encodeURIComponent(id)) })
      else noData.push(`${p.id} ${route}`)
    }
  }
  return { routes, noData }
}

function runPlaywright(root, project, env, signal) {
  const cmd = `npx playwright test -c playwright.qa.config.ts --project=${project}`
  return new Promise((done) => {
    const child = spawn(cmd, { cwd: root, shell: true, env: { ...process.env, ...env, FORCE_COLOR: '0' } })
    let out = ''
    const add = (b) => { out = (out + b.toString()).slice(-100_000) }
    child.stdout.on('data', add)
    child.stderr.on('data', add)
    const kill = () => {
      if (process.platform === 'win32') spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'])
      else child.kill('SIGKILL')
    }
    signal?.addEventListener('abort', kill, { once: true })
    child.on('close', (code) => done({ code: code ?? 1, out }))
    child.on('error', (err) => done({ code: 1, out: out + String(err) }))
  })
}

/** Failed tests of a Playwright JSON report as [{ file, title, error }] plus counts. */
export function e2eResults(report) {
  const failed = []
  const counts = { passed: 0, failed: 0, skipped: 0 }
  const visit = (suite, file) => {
    const f = suite.file || file
    for (const spec of suite.specs || []) {
      for (const t of spec.tests || []) {
        const last = (t.results || []).at(-1)
        const status = last?.status || t.status || 'skipped'
        if (status === 'passed') counts.passed++
        else if (status === 'skipped') counts.skipped++
        else {
          counts.failed++
          failed.push({ file: f, title: spec.title, error: (last?.error?.message || last?.errors?.[0]?.message || status).replace(/\x1b\[[0-9;]*m/g, '') })
        }
      }
    }
    for (const s of suite.suites || []) visit(s, f)
  }
  for (const s of report.suites || []) visit(s, s.file)
  return { failed, counts }
}

/** Checks whose defect does not depend on the screen size: one finding per page, the breakpoints seen in `where`. */
const BP_FREE = new Set(['axe', 'G8', 'G4', 'img', 'dir'])

/** Folds BP_FREE findings of one page into one (bp '-'); G1 and G5 stay per breakpoint. Mutates `findings`. */
export function collapseBreakpoints(findings) {
  const byKey = new Map()
  const out = []
  for (const f of findings) {
    if (!BP_FREE.has(f.check)) { out.push(f); continue }
    const key = `${f.check}|${f.page}|${f.locator}`
    const seen = byKey.get(key)
    if (seen) { if (!seen.bps.includes(f.bp)) seen.bps.push(f.bp); continue }
    const merged = { ...f, bps: [f.bp] }
    byKey.set(key, merged)
    out.push(merged)
  }
  for (const f of out) {
    if (!f.bps) continue
    f.where = `${(f.where || '').replace(/ at [DTM] \d+×\d+/, '')} · seen at ${f.bps.join(' ')}`
    f.bp = '-'
    delete f.bps
  }
  findings.splice(0, findings.length, ...out)
  return findings
}

async function runSweep({ root, opts, signal, date }) {
  const started = Date.now()
  const pageMap = loadPageMap(root)
  let session
  try {
    session = await loginQa({ api: opts.api, root })
  } catch (err) {
    return { status: 'fail', durationMs: Date.now() - started, coverage: 'none — cannot sign in as QA_USER', coveredPages: [], note: err.message, findings: [] }
  }
  const fetchFirstId = async (type) => {
    const r = await fetch(`${opts.api}/api/v1/data/${type}?limit=1`, { headers: { authorization: `Bearer ${session.token}` } })
    if (!r.ok) return null
    const docs = await r.json()
    return Array.isArray(docs) && docs[0]?._id ? String(docs[0]._id) : null
  }
  const { routes, noData } = await resolveRoutes(pageMap, fetchFirstId)

  const tmp = mkdtempSync(join(tmpdir(), 'fv-code-qa-'))
  const dayDir = join(outRoot(root), date)
  const shotsDir = join(dayDir, 'shots')
  const outFile = join(dayDir, 'sweep.jsonl')
  mkdirSync(shotsDir, { recursive: true })
  rmSync(outFile, { force: true })
  writeFileSync(join(tmp, 'routes.json'), JSON.stringify(routes))
  writeFileSync(join(tmp, 'storage.json'), JSON.stringify(storageStateOf(session)))
  const env = {
    QA_CODE_APP: opts.app,
    QA_CODE_SESSION: JSON.stringify({ token: session.token, user: session.user }),
    QA_CODE_ROUTES: join(tmp, 'routes.json'),
    QA_CODE_OUT: outFile,
    QA_CODE_SHOTS: shotsDir,
    QA_CODE_SHOTS_REL: `bugs/qa-runs/code-qa/${date}/shots`,
    QA_CODE_STORAGE: join(tmp, 'storage.json'),
    QA_CODE_PW_JSON: join(tmp, 'e2e.json'),
    QA_CODE_E2E: opts.e2e
  }
  const findings = []
  let e2eLine = 'e2e: not run (deadline)'
  try {
    await runPlaywright(root, 'sweep', env, signal)
    if (!signal?.aborted) {
      const r = await runPlaywright(root, 'e2e', env, signal)
      if (existsSync(env.QA_CODE_PW_JSON)) {
        const { failed, counts } = e2eResults(JSON.parse(readFileSync(env.QA_CODE_PW_JSON, 'utf8')))
        e2eLine = `e2e: ${counts.passed} passed · ${counts.failed} failed · ${counts.skipped} skipped`
        for (const f of failed) {
          const spec = f.file.replace(/^.*[\\/]/, '').replace(/\.spec\.ts$/, '')
          findings.push({
            check: 'e2e', page: E2E_PAGE[spec] || 'GLOBAL', bp: 'D', locator: `e2e:${spec} › ${f.title}`, severity: 'S2', type: 'FUNC',
            title: `e2e flow fails: ${spec} › ${f.title}`, where: `e2e/${spec}.spec.ts on ${opts.app}`,
            expected: 'the flow passes', actual: redact(f.error.split('\n')[0]).slice(0, 200), detail: redact(f.error).split('\n').slice(0, 30).join('\n')
          })
        }
      } else e2eLine = `e2e: no report (playwright exit ${r.code})`
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }

  const lines = existsSync(outFile) ? readFileSync(outFile, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : []
  // Raw page text (console lines) is never kept unredacted: pre-qa.json holds the redacted findings.
  rmSync(outFile, { force: true })
  const shots = []
  const done = new Map() // page|bp → [ok, …]
  for (const line of lines) {
    const key = `${line.page}|${line.bp}`
    if (!done.has(key)) done.set(key, [])
    done.get(key).push({ route: line.route, ok: line.ok })
    if (line.shot) shots.push(line.shot)
    if (!line.ok) {
      findings.push({
        check: 'load', page: line.page, bp: line.bp, locator: `route:${line.route}`, severity: 'S2', type: 'FUNC',
        title: `sweep could not check ${line.route}`, where: line.url, actual: redact(line.error)
      })
    }
    for (const f of line.findings) findings.push({ ...f, page: line.page, bp: line.bp, evidence: line.shot })
  }
  collapseBreakpoints(findings)
  const routesOf = (page) => routes.filter((r) => r.page === page).map((r) => r.route)
  const fullyDone = (page, bp) => {
    const got = done.get(`${page}|${bp}`) || []
    return routesOf(page).every((route) => got.some((g) => g.route === route && g.ok))
  }
  const pagesWithRoutes = [...new Set(routes.map((r) => r.page))]
  const coveredPages = pagesWithRoutes.filter((p) => BREAKPOINTS.every((bp) => fullyDone(p, bp)))
  const preChecked = []
  for (const page of pagesWithRoutes) {
    for (const bp of BREAKPOINTS) {
      if (fullyDone(page, bp)) preChecked.push({ page, bp, checks: bp === 'M' ? ['G1', 'G4', 'G5', 'G8'] : ['G1', 'G4', 'G8'] })
    }
  }
  const expected = routes.length * BREAKPOINTS.length
  const partial = signal?.aborted || lines.length < expected
  const failedLoads = lines.filter((l) => !l.ok).length
  return {
    status: partial ? 'partial' : 'ok',
    durationMs: Date.now() - started,
    coverage: [
      `SWEEP: ${routes.length} routes × 3 breakpoints`,
      `${lines.length}/${expected} loads done${failedLoads ? ` (${failedLoads} failed)` : ''}`,
      noData.length ? `NO-DATA: ${noData.join(', ')}` : 'NO-DATA: none',
      e2eLine
    ].join(' · '),
    coveredPages,
    preChecked,
    shots: shots.sort(),
    findings
  }
}

// --- orchestrator -----------------------------------------------------------------------

/** Layer registry: name → async ({ root, opts, signal, date, log }) => layer result. Later plans add layers. */
export const LAYERS = {
  gates: ({ root, signal, date, log }) => runGates({ root, signal, log, blockedDir: join(outRoot(root), date) }),
  static: ({ root }) => runStatic({ root }),
  api: (ctx) => runApi(ctx),
  sweep: (ctx) => runSweep(ctx)
}

function commitOf(root) {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  } catch {
    return '?'
  }
}

export async function main(argv = process.argv.slice(2), { root = repoRoot, layers = LAYERS } = {}) {
  let opts
  try {
    opts = parseArgs(argv)
  } catch (err) {
    console.error(`CODE-QA: ${err.message}`)
    return 1
  }
  const unknown = opts.layers.filter((l) => !layers[l])
  if (unknown.length) {
    console.error(`CODE-QA: unknown layer(s) ${unknown.join(', ')} — known: ${Object.keys(layers).join(', ')}`)
    return 1
  }
  const say = (msg) => {
    console.log(`CODE-QA: ${msg}`)
    if (opts.nightly) nightlyLog(root, `CODE-QA: ${msg}`)
  }
  const controller = new AbortController()
  let timer = null
  if (opts.deadline) {
    const at = deadlineAt(opts.deadline)
    timer = setTimeout(() => controller.abort(), at - Date.now())
    say(`start ${opts.date} layers=${opts.layers.join(',')} deadline ${new Date(at).toLocaleString('sv-SE').slice(0, 16)}`)
  } else say(`start ${opts.date} layers=${opts.layers.join(',')}`)

  // Plan 415: yesterday's code reviews in before tonight's reports (the 02:45 merge may have missed some).
  if (opts.nightly) {
    try {
      const r = ingest({ root, date: previousDate(opts.date), log: say })
      say(`ingest ${previousDate(opts.date)}: ${r.reviews} review(s), ${r.findings} suspect finding(s)`)
    } catch (err) {
      say(`ingest failed: ${redact(err.message)}`)
    }
  }

  const run = { run: `code-qa-${opts.date}`, date: opts.date, commit: commitOf(root), startedAt: new Date().toISOString(), layers: {} }
  const order = [...opts.layers].sort((a, b) => (LAYER_ORDER.indexOf(a) + 1 || 99) - (LAYER_ORDER.indexOf(b) + 1 || 99))
  for (const name of order) {
    if (run.blocked || controller.signal.aborted) {
      run.layers[name] = { status: 'skipped', durationMs: 0, coverage: 'none', coveredPages: [], note: run.blocked ? 'blocked by a failed build' : 'deadline reached', findings: [] }
      say(`${name} skipped 0 findings`)
      continue
    }
    let result
    try {
      result = await layers[name]({ root, opts, signal: controller.signal, date: opts.date, log: (m) => say(`  ${m}`) })
    } catch (err) {
      result = { status: 'fail', durationMs: 0, coverage: 'none', coveredPages: [], note: `layer crashed: ${redact(err.message)}`, findings: [] }
    }
    if (controller.signal.aborted && result.status === 'ok') result.status = 'partial'
    const { preChecked, shots, blocked, ...rest } = result
    rest.findings = dedupe((rest.findings || []).map((f) => normalizeFinding(name, f)))
    run.layers[name] = rest
    if (preChecked) run.preChecked = preChecked
    if (shots) run.shots = shots
    if (blocked) run.blocked = blocked
    // A layer may word its own status (api: `skipped (not local Mongo)`).
    say(`${name} ${rest.statusLine || `${rest.status} ${rest.findings.length} findings`}`)
  }
  if (timer) clearTimeout(timer)
  run.finishedAt = new Date().toISOString()
  const base = outRoot(root)
  const pageMap = existsSync(join(root, 'docs', 'qa', 'code-qa-pages.json')) ? loadPageMap(root) : { pages: [] }
  const extras = codeReviewExtras(loadLedger(join(base, 'ledger.json')))
  const known = writeReports(base, run, { pageOrder: ['GLOBAL', ...pageMap.pages.map((p) => p.id)], pageExtras: extras })
  const open = Object.values(known.findings).filter((k) => k.status === 'open').length
  say(`done ${open} open findings — bugs/qa-runs/code-qa/latest.md`)
  if (opts.nightly) {
    try {
      const q = pick({ root, date: opts.date })
      say(`queue ${opts.date}: ${q.order.slice(0, 5).join(' ')}${q.order.length > 5 ? ' …' : ''}`)
    } catch (err) {
      say(`queue failed: ${redact(err.message)}`)
    }
  }
  return run.blocked ? 2 : 0
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href.toLowerCase() === import.meta.url.toLowerCase()
if (isMain) main().then((code) => process.exit(code), (err) => { console.error(err); process.exit(1) })
