import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { dedupe, fingerprint, loadKnown, mergeKnown, normalizeFinding, redact, renderLatest, writeReports } from '../qa/code-qa/findings.mjs'
import { collapseBreakpoints, deadlineAt, e2eResults, parseArgs, resolveRoutes } from '../qa/code-qa/run.mjs'

const raw = (over = {}) => ({
  check: 'G1', page: 'INV', bp: 'M', locator: 'document', severity: 'S2', type: 'VISUAL',
  title: 'horizontal page scroll', where: '/inventory/list at M', actual: 'the page is 12px wider', ...over
})
const runOf = (date, layers) => ({ date, run: `code-qa-${date}`, startedAt: `${date}T00:00:00Z`, finishedAt: `${date}T00:30:00Z`, layers })
const sweep = (findings, status = 'ok', coveredPages = ['INV', 'DASH']) =>
  ({ status, coverage: 'SWEEP: 2 routes × 3 breakpoints', coveredPages, findings: dedupe(findings.map((f) => normalizeFinding('sweep', f))) })

test('fingerprints are stable: the same finding gives the same fp, text and line numbers do not count', () => {
  const a = normalizeFinding('sweep', raw())
  const b = normalizeFinding('sweep', raw({ title: 'other words', where: 'src/x.html:99', actual: '30px' }))
  assert.equal(a.fp, b.fp)
  assert.match(a.fp, /^[0-9a-f]{12}$/)
  assert.equal(a.fp, fingerprint({ layer: 'sweep', check: 'G1', page: 'INV', bp: 'M', locator: 'document' }))
  assert.notEqual(a.fp, normalizeFinding('sweep', raw({ bp: 'T' })).fp)
  assert.notEqual(a.fp, normalizeFinding('static', raw()).fp)
})

test('a finding seen twice in one run is kept once with a count', () => {
  const list = dedupe([raw(), raw(), raw({ locator: 'other' })].map((f) => normalizeFinding('sweep', f)))
  assert.equal(list.length, 2)
  assert.equal(list[0].count, 2)
})

test('a finding seen before is merged, not duplicated, and keeps its ID', () => {
  const k1 = mergeKnown(loadKnown('/nonexistent'), runOf('2026-10-19', { sweep: sweep([raw()]) }))
  const r2 = runOf('2026-10-20', { sweep: sweep([raw(), raw({ check: 'G4', locator: 'key:menu' })]) })
  const k2 = mergeKnown(k1, r2)
  const all = Object.values(k2.findings)
  assert.equal(all.length, 2)
  const g1 = all.find((k) => k.check === 'G1')
  assert.equal(g1.id, 'CODE-SWEEP-001')
  assert.equal(g1.firstSeen, '2026-10-19')
  assert.equal(g1.lastSeen, '2026-10-20')
  assert.equal(all.find((k) => k.check === 'G4').id, 'CODE-SWEEP-002')
  assert.deepEqual(r2.layers.sweep.findings.map((f) => f.id), ['CODE-SWEEP-001', 'CODE-SWEEP-002'])
})

test('a finding not seen again becomes gone only when its layer covered its page', () => {
  const k1 = mergeKnown(loadKnown('/nonexistent'), runOf('2026-10-19', { sweep: sweep([raw(), raw({ page: 'RB' })], 'ok', ['INV', 'RB']) }))
  const k2 = mergeKnown(k1, runOf('2026-10-20', { sweep: sweep([], 'partial', ['INV']) }))
  const byPage = Object.fromEntries(Object.values(k2.findings).map((k) => [k.page, k.status]))
  assert.deepEqual(byPage, { INV: 'gone', RB: 'open' })
  const k3 = mergeKnown(k2, runOf('2026-10-21', { static: { status: 'ok', coveredPages: '*', findings: [] } }))
  assert.equal(Object.values(k3.findings).find((k) => k.page === 'RB').status, 'open', 'another layer never closes it')
  const k4 = mergeKnown(k3, runOf('2026-10-22', { sweep: sweep([raw()], 'ok', ['INV']) }))
  assert.equal(Object.values(k4.findings).find((k) => k.page === 'INV').status, 'open', 'a gone finding can come back')
})

test('reports never carry a token', () => {
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ4In0.c2lnbmF0dXJlLXZhbHVl'
  const text = redact(`Authorization: Bearer ${jwt} · fv_token=${jwt} · Cookie fv_refresh_3005=abc.def; Path=/`)
  assert.doesNotMatch(text, /eyJ|abc\.def/)
  const f = normalizeFinding('sweep', raw({ actual: `header authorization=Bearer ${jwt}` }))
  assert.doesNotMatch(f.actual, /eyJ/)
})

test('running twice writes the same open findings and no duplicate fingerprints', () => {
  const base = mkdtempSync(join(tmpdir(), 'fv-codeqa-'))
  const mk = () => runOf('2026-10-19', { sweep: sweep([raw(), raw({ check: 'G4', locator: 'key:menu' })]) })
  writeReports(base, mk())
  const first = readFileSync(join(base, 'latest.md'), 'utf8')
  writeReports(base, mk())
  const second = readFileSync(join(base, 'latest.md'), 'utf8')
  const fps = (s) => [...s.matchAll(/fp `([0-9a-f]{12})`/g)].map((m) => m[1])
  assert.equal(fps(second).length, 2)
  assert.equal(new Set(fps(second)).size, fps(second).length)
  assert.deepEqual(fps(first), fps(second))
  assert.match(readFileSync(join(base, '2026-10-19', 'pre-qa.md'), 'utf8'), /## sweep\nStatus: ok · 2 findings · 0 s\nCoverage: SWEEP: 2 routes × 3 breakpoints/)
  assert.equal(JSON.parse(readFileSync(join(base, '2026-10-19', 'pre-qa.json'), 'utf8')).layers.sweep.findings.length, 2)
})

test('latest.md lists PRE-CHECKED per page and breakpoint', () => {
  const run = { ...runOf('2026-10-19', { sweep: sweep([]) }), preChecked: [{ page: 'INV', bp: 'D', checks: ['G1', 'G4', 'G8'] }, { page: 'INV', bp: 'M', checks: ['G1', 'G4', 'G5', 'G8'] }] }
  const md = renderLatest(run, { findings: {} })
  assert.match(md, /\| INV \| G1 G4 G8 \| — \| G1 G4 G5 G8 \|/)
  assert.match(md, /^Generated: 2026-10-19T00:30:00Z/m)
})

test('run.mjs: args, deadline, NO-DATA routes and e2e report parsing', async () => {
  assert.deepEqual(parseArgs(['--layers=static,sweep', '--nightly']).layers, ['static', 'sweep'])
  assert.equal(parseArgs(['--nightly']).deadline, '02:40')
  assert.throws(() => parseArgs(['--bogus']), /unknown option/)
  const now = new Date(2026, 9, 19, 23, 0)
  assert.equal(new Date(deadlineAt('02:40', now)).getDate(), 20)
  assert.equal(new Date(deadlineAt('23:30', now)).getDate(), 19)
  const map = { pages: [
    { id: 'A', routes: ['/a', '/a/:id'], idType: 'products' },
    { id: 'B', routes: ['/b/:id'], idType: 'venues' }
  ] }
  const { routes, noData } = await resolveRoutes(map, async (type) => (type === 'products' ? 'p1' : null))
  assert.deepEqual(routes.map((r) => r.url), ['/a', '/a/p1'])
  assert.deepEqual(noData, ['B /b/:id'])
  const report = { suites: [{ file: 'cook-view.spec.ts', suites: [{ specs: [
    { title: 'ok', tests: [{ results: [{ status: 'passed' }] }] },
    { title: 'bad', tests: [{ results: [{ status: 'failed', error: { message: '\u001b[31mTimeout\u001b[39m' } }] }] }
  ] }] }] }
  const r = e2eResults(report)
  assert.deepEqual(r.counts, { passed: 1, failed: 1, skipped: 0 })
  assert.deepEqual(r.failed, [{ file: 'cook-view.spec.ts', title: 'bad', error: 'Timeout' }])
})

test('sweep: screen-size-free checks fold into one finding per page, G1/G5 stay per breakpoint', () => {
  const f = (check, bp) => ({ check, page: 'INV', bp, locator: check === 'axe' ? 'axe:label' : 'document', where: `/inventory/list at ${bp} 1366×768` })
  const out = collapseBreakpoints([f('axe', 'D'), f('axe', 'T'), f('axe', 'M'), f('G1', 'T'), f('G1', 'M')])
  assert.deepEqual(out.map((x) => `${x.check} ${x.bp}`), ['axe -', 'G1 T', 'G1 M'])
  assert.equal(out[0].where, '/inventory/list · seen at D T M')
})
