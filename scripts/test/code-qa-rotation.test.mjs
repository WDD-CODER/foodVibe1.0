import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cpSync, mkdirSync, mkdtempSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { planChecks } from '../qa/code-qa/plan-checks.mjs'
import { applyReview, codeReviewExtras, emptyLedger, ingest, parseReview, pick, pickOrder } from '../qa/code-qa/rotation.mjs'

const FIX = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'code-qa', 'rotation')
const PAGES = Array.from({ length: 19 }, (_, i) => `PG${String.fromCharCode(65 + i)}`)

const review = (page, status, checks = [], commit = 'abc1234') => ({
  page, commit, status, checksDone: checks.map((c) => c.id), checks
})
const day = (n) => new Date(Date.UTC(2026, 9, 1 + n)).toISOString().slice(0, 10)

test('plan checks: every **PAGE-..** mark and the Responsive line become PAGE-C01.. in order', () => {
  const pages = planChecks([
    '## 18. REDIR — redirects (D only)',
    '**REDIR-01** `/` → `/dashboard`. **REDIR-02** `/command-center` → metadata.',
    '**REDIR-03 [M]** old equipment urls',
    'Responsive [T, M]: chips wrap',
    '## Order of execution',
    '**REDIR-99** not in a page section'
  ].join('\n'))
  assert.deepEqual(pages.REDIR.map((c) => [c.id, c.planId]), [['REDIR-C01', 'REDIR-01'], ['REDIR-C02', 'REDIR-02'], ['REDIR-C03', 'REDIR-03'], ['REDIR-C04', 'responsive']])
  assert.match(pages.REDIR[0].text, /^`\/` → `\/dashboard`\.$/)
})

test('a partial page is first the next night, with its done checks listed', () => {
  let l = emptyLedger()
  l = applyReview(l, review('PGC', 'partial', [{ id: 'PGC-C01', mark: 'code-verified' }, { id: 'PGC-C02', mark: 'suspect' }]), day(0), 'a', '1')
  assert.equal(pickOrder(l, PAGES)[0], 'PGC')
  assert.deepEqual(l.pages.PGC.checksDone, ['PGC-C01', 'PGC-C02'])
  l = applyReview(l, review('PGC', 'partial', [{ id: 'PGC-C03', mark: 'unknown' }]), day(1), 'b', '2')
  assert.deepEqual(l.pages.PGC.checksDone, ['PGC-C01', 'PGC-C02', 'PGC-C03'], 'a resumed review adds to the done checks')
  l = applyReview(l, review('PGC', 'done', [{ id: 'PGC-C04', mark: 'code-verified' }]), day(2), 'c', '3')
  assert.equal(l.pages.PGC.status, 'done')
  assert.deepEqual(l.pages.PGC.checksDone, [])
  assert.equal(l.pages.PGC.marks['PGC-C02'], 'suspect', 'marks of the whole cycle are kept')
})

test('never-reviewed pages come before reviewed ones, in plan order', () => {
  let l = emptyLedger()
  l = applyReview(l, review('PGA', 'done'), day(0), 'a', '1')
  const order = pickOrder(l, PAGES)
  assert.equal(order[0], 'PGB')
  assert.equal(order.at(-1), 'PGA')
})

test('among reviewed pages the oldest review is first; changed files only break ties', () => {
  let l = emptyLedger()
  l = applyReview(l, review('PGA', 'done'), day(2), 'a', '1')
  l = applyReview(l, review('PGB', 'done'), day(1), 'b', '1')
  l = applyReview(l, review('PGC', 'done'), day(1), 'c', '1')
  const only = ['PGA', 'PGB', 'PGC']
  assert.deepEqual(pickOrder(l, only, (id) => (id === 'PGA' ? 50 : 0)), ['PGB', 'PGC', 'PGA'], 'age beats changes')
  assert.deepEqual(pickOrder(l, only, (id) => (id === 'PGC' ? 3 : 0)), ['PGC', 'PGB', 'PGA'], 'changes break the tie')
})

test('30 nights, one page changed every day: every page is reviewed and no gap exceeds the cycle + 1', () => {
  const perNight = 4
  const cycle = Math.ceil(PAGES.length / perNight)
  let l = emptyLedger()
  const reviewed = Object.fromEntries(PAGES.map((p) => [p, []]))
  for (let n = 0; n < 30; n++) {
    const busy = 'PGA'
    const order = pickOrder(l, PAGES, (id) => (id === busy ? 10 : 0))
    // The agent finishes `perNight` pages and gets half way through the next one.
    order.slice(0, perNight + 1).forEach((id, i) => {
      const status = i < perNight ? 'done' : 'partial'
      l = applyReview(l, review(id, status, [{ id: `${id}-C01`, mark: 'code-verified' }]), day(n), `${day(n)}/${id}`, `${n}`)
      reviewed[id].push(n)
    })
  }
  for (const p of PAGES) {
    assert.ok(reviewed[p].length > 0, `${p} never reviewed`)
    const gaps = reviewed[p].slice(1).map((d, i) => d - reviewed[p][i])
    assert.ok(Math.max(0, ...gaps) <= cycle + 1, `${p} gap ${Math.max(...gaps)} > ${cycle + 1}`)
  }
  assert.ok(reviewed.PGA.length <= Math.ceil(30 / cycle) + 2, 'the busy page is not reviewed more than its share')
})

test('applying the same review twice changes nothing; an older review never rolls a page back', () => {
  let l = applyReview(emptyLedger(), review('PGA', 'done', [{ id: 'PGA-C01', mark: 'suspect' }]), day(3), 'x', 's1')
  const again = applyReview(l, review('PGA', 'done', [{ id: 'PGA-C01', mark: 'suspect' }]), day(3), 'x', 's1')
  assert.deepEqual(again, l)
  const old = applyReview(l, review('PGA', 'partial'), day(1), 'old', 's0')
  assert.equal(old.pages.PGA.status, 'done')
  assert.equal(old.pages.PGA.lastReviewed, day(3))
})

test('review header and ### lines are parsed; malformed files are refused', () => {
  const r = parseReview(readFileSync(join(FIX, 'reviews', 'review-RB.md'), 'utf8'))
  assert.equal(r.page, 'RB')
  assert.equal(r.status, 'partial')
  assert.deepEqual(r.checks.map((c) => `${c.id} ${c.mark} ${c.severity}`), ['RB-C01 code-verified S3', 'RB-C02 suspect S2', 'RB-C03 unknown S3'])
  assert.deepEqual(r.checksDone, ['RB-C01', 'RB-C02', 'RB-C03'])
  assert.match(parseReview('no header').error, /Page/)
  assert.match(parseReview('Page: RB\nStatus: maybe').error, /Status/)
})

test('pick writes queue.md; ingest updates ledger.json and latest.md, twice gives the same result', () => {
  const root = mkdtempSync(join(tmpdir(), 'fv-rot-'))
  cpSync(join(FIX, 'repo'), root, { recursive: true })
  // Review files live outside the fixture repo: bugs/qa-runs/code-qa/ is gitignored at any depth.
  const night = join(root, 'bugs', 'qa-runs', 'code-qa', '2026-10-20')
  mkdirSync(night, { recursive: true })
  cpSync(join(FIX, 'reviews'), night, { recursive: true })
  const { file, order } = pick({ root, date: '2026-10-20' })
  const queue = readFileSync(file, 'utf8')
  assert.equal(order[0], 'DASH', 'never-reviewed pages in plan order')
  assert.match(queue, /^STOP_AT: 02:40$/m)
  assert.match(queue, /## 1\. DASH — לוח בקרה/)
  assert.match(queue, /- DASH-C01 — DASH-01 — /)
  ingest({ root, date: '2026-10-20' })
  const ledger1 = readFileSync(join(root, 'bugs', 'qa-runs', 'code-qa', 'ledger.json'), 'utf8')
  const latest1 = readFileSync(join(root, 'bugs', 'qa-runs', 'code-qa', 'latest.md'), 'utf8')
  assert.match(latest1, /CODE-AI-001` · S2 · any bp · save has no error message/)
  assert.match(latest1, /Code review: 2026-10-20 \(partial\)/)
  assert.match(latest1, /RB-C02 suspect/)
  ingest({ root, date: '2026-10-20' })
  assert.equal(readFileSync(join(root, 'bugs', 'qa-runs', 'code-qa', 'ledger.json'), 'utf8'), ledger1)
  const latest2 = readFileSync(join(root, 'bugs', 'qa-runs', 'code-qa', 'latest.md'), 'utf8')
  assert.equal(latest2.replace(/^Generated:.*$/m, ''), latest1.replace(/^Generated:.*$/m, ''))
  const second = pick({ root, date: '2026-10-21' })
  assert.equal(second.order[0], 'RB', 'the partial page resumes first')
  assert.match(readFileSync(second.file, 'utf8'), /Already done: RB-C01, RB-C02, RB-C03/)
})

test('code review blocks list the marks per page', () => {
  const l = applyReview(emptyLedger(), review('PGA', 'done', [{ id: 'PGA-C01', mark: 'suspect' }, { id: 'PGA-C02', mark: 'unknown' }]), day(0), 'x', '1')
  assert.deepEqual(codeReviewExtras(l).PGA, [
    `Code review: ${day(0)} (done) · commit abc1234 · suspect 1 · unknown 1 · verified 0`,
    '  PGA-C01 suspect · PGA-C02 unknown'
  ])
})
