import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { spawnSync } from 'child_process'
import { dirname } from 'path'
import { fileURLToPath } from 'url'
import { main, report } from '../qa/morning-report.mjs'

const DATE = '2026-10-21'
const GOOD_LOG = [
  `${DATE} 00:00:01 up    start (root X)`,
  `${DATE} 00:00:05 up    git merge --ff-only origin/main -> exit 1`,
  `${DATE} 00:01:10 up    qa-up.ps1 -> exit 0`,
  `${DATE} 00:02:00 up    code-qa -> exit 0`,
  `${DATE} 02:45:04 merge done (exit 0)`,
  `${DATE} 07:30:07 down  qa-down.ps1 -> exit 0`
]

const finding = (id, severity, extra = {}) => ({ id, fp: id, severity, page: 'INV', title: `title ${id}`, status: 'open', firstSeen: '2026-10-01', ...extra })

/** Builds a QA folder under a temp dir (bugs/ is gitignored, so fixtures are written at run time). */
function qaFolder({ log = GOOD_LOG, findings = [], due = 0, skipped = 0, reviews = 0, ui = true, blockedReview = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'fv-morning-'))
  const runs = join(root, 'bugs', 'qa-runs')
  const night = join(runs, 'code-qa', DATE)
  mkdirSync(night, { recursive: true })
  writeFileSync(join(runs, '.nightly.log'), log.join('\n') + '\n')
  writeFileSync(join(runs, 'code-qa', 'known.json'), JSON.stringify({ version: 1, findings: Object.fromEntries(findings.map((f) => [f.fp, f])) }))
  const q = ['# Code review queue', '']
  for (let i = 1; i <= due; i++) q.push(`## ${i}. PG${i} — page`, '')
  if (skipped) q.push('## Skipped (no code change since last review)', ...Array.from({ length: skipped }, (_, i) => `- SK${String.fromCharCode(65 + i)} — last reviewed 2026-10-10 at abc`))
  writeFileSync(join(night, 'queue.md'), q.join('\n'))
  for (let i = 0; i < reviews; i++) writeFileSync(join(night, `review-PG${String.fromCharCode(65 + i)}.md`), 'Page: PGA\n')
  if (blockedReview) writeFileSync(join(night, 'BLOCKED-review.md'), 'no queue\n')
  writeFileSync(join(runs, 'INDEX.md'), ['# QA runs index', '| Run | Status | Note |', '|---|---|---|', ...(ui ? [`| ${DATE}-a | DONE | scope all |`] : [])].join('\n'))
  return root
}

test('a failed step gives BLOCKED and Do now names the step', () => {
  const log = GOOD_LOG.map((l) => l.replace('qa-up.ps1 -> exit 0', 'qa-up.ps1 -> exit 3'))
  const r = report({ root: qaFolder({ log, due: 2, reviews: 2 }), date: DATE })
  assert.equal(r.status, 'BLOCKED')
  assert.match(r.text, /^Status: BLOCKED$/m)
  assert.match(r.text, /^Do now: fix the night: up exited 3$/m)
})

test('a failed git fast-forward alone does not block (QA continues on the current tree)', () => {
  const r = report({ root: qaFolder({ due: 1, reviews: 1 }), date: DATE })
  assert.equal(r.status, 'OK')
})

test('a new S2 gives ATTENTION and the finding is listed; S3 is a count only', () => {
  const findings = [finding('CODE-AI-012', 'S2', { firstSeen: DATE }), finding('CODE-AI-013', 'S3', { firstSeen: DATE }), finding('CODE-AI-001', 'S2')]
  const r = report({ root: qaFolder({ findings, due: 1, reviews: 1 }), date: DATE })
  assert.equal(r.status, 'ATTENTION')
  assert.match(r.text, /^Do now: plan a fix for 1 new S1\/S2 findings \(CODE-AI-012\)$/m)
  assert.match(r.text, /^- CODE-AI-012 · S2 · INV · title CODE-AI-012$/m)
  assert.doesNotMatch(r.text, /^- CODE-AI-013/m)
  assert.match(r.text, /plus 1 S3\/S4/)
  assert.match(r.text, /open S1 0 · S2 2 · S3 1 · S4 0/)
})

test('nothing new gives OK and "Do now: nothing"', () => {
  const r = report({ root: qaFolder({ findings: [finding('CODE-AI-001', 'S3')], due: 1, reviews: 1, skipped: 3 }), date: DATE })
  assert.equal(r.status, 'OK')
  assert.match(r.text, /^Do now: nothing — no new S1\/S2 findings$/m)
  assert.match(r.text, /3 skipped/)
  assert.match(r.row, /\| 3 \|$/)
})

test('findings gone that night are listed under Fixed', () => {
  const findings = [finding('CODE-API-001', 'S1', { status: 'gone', goneSince: DATE, page: 'SUPF' })]
  const r = report({ root: qaFolder({ findings, due: 1, reviews: 1 }), date: DATE })
  assert.match(r.text, /^## Fixed\n- CODE-API-001 · S1 · SUPF · title CODE-API-001$/m)
  assert.match(r.text, /fixed 1/)
})

test('due pages and no review file gives BLOCKED "Code QA agent did not run"; nothing due is fine', () => {
  const r = report({ root: qaFolder({ due: 4, reviews: 0 }), date: DATE })
  assert.equal(r.status, 'BLOCKED')
  assert.match(r.text, /Do now: fix the night: Code QA agent did not run/)
  assert.equal(report({ root: qaFolder({ due: 0, skipped: 5, reviews: 0 }), date: DATE }).status, 'OK')
})

test('BLOCKED-review.md gives BLOCKED; a night with no UI run row gives ATTENTION', () => {
  assert.equal(report({ root: qaFolder({ due: 1, reviews: 1, blockedReview: true }), date: DATE }).status, 'BLOCKED')
  const r = report({ root: qaFolder({ due: 1, reviews: 1, ui: false }), date: DATE })
  assert.equal(r.status, 'ATTENTION')
  assert.match(r.text, /UI run did not run/)
})

test('the CLI writes MORNING.md and one history line per date (rerun replaces it); --out=- writes nothing', () => {
  const root = qaFolder({ due: 1, reviews: 1 })
  assert.equal(main([`--root=${root}`, `--date=${DATE}`]), 0)
  assert.equal(main([`--root=${root}`, `--date=${DATE}`]), 0)
  const runs = join(root, 'bugs', 'qa-runs')
  assert.match(readFileSync(join(runs, 'MORNING.md'), 'utf8'), /^# QA morning report — 2026-10-21$/m)
  const hist = readFileSync(join(runs, 'morning-history.md'), 'utf8').split('\n').filter((l) => l.startsWith(`| ${DATE} |`))
  assert.equal(hist.length, 1)
})

const BRIEF = join(dirname(fileURLToPath(import.meta.url)), '..', 'qa', 'morning-brief.mjs')
const runBrief = (cwd, root) => spawnSync(process.execPath, [BRIEF], { cwd, env: { ...process.env, FOODVIBE_QA_ROOT: root }, encoding: 'utf8' })
const todayMd = () => `# QA morning report — ${localToday()}\nStatus: ATTENTION\nDo now: plan a fix for 1 new S1/S2 findings (CODE-AI-012)\n`
const localToday = () => {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

test('morning-brief prints one JSON object with systemMessage and additionalContext from a fresh report', () => {
  const qa = mkdtempSync(join(tmpdir(), 'fv-brief-qa-'))
  mkdirSync(join(qa, 'bugs', 'qa-runs'), { recursive: true })
  writeFileSync(join(qa, 'bugs', 'qa-runs', 'MORNING.md'), todayMd())
  const r = runBrief(mkdtempSync(join(tmpdir(), 'fv-brief-cwd-')), qa)
  assert.equal(r.status, 0)
  const out = JSON.parse(r.stdout)
  assert.equal(out.systemMessage, `QA ${localToday()}: ATTENTION — plan a fix for 1 new S1/S2 findings (CODE-AI-012)`)
  assert.equal(out.hookSpecificOutput.hookEventName, 'SessionStart')
  assert.equal(out.hookSpecificOutput.additionalContext, todayMd())
})

test('morning-brief is silent in a Worker slot, when the report is missing, and when it is older than yesterday', () => {
  const qa = mkdtempSync(join(tmpdir(), 'fv-brief-qa-'))
  mkdirSync(join(qa, 'bugs', 'qa-runs'), { recursive: true })
  const cwd = mkdtempSync(join(tmpdir(), 'fv-brief-cwd-'))
  assert.deepEqual([runBrief(cwd, qa).status, runBrief(cwd, qa).stdout], [0, ''], 'missing report')
  writeFileSync(join(qa, 'bugs', 'qa-runs', 'MORNING.md'), '# QA morning report — 2020-01-01\nStatus: OK\nDo now: nothing\n')
  assert.deepEqual([runBrief(cwd, qa).status, runBrief(cwd, qa).stdout], [0, ''], 'stale report')
  writeFileSync(join(qa, 'bugs', 'qa-runs', 'MORNING.md'), todayMd())
  writeFileSync(join(cwd, '.worktree-root'), '')
  assert.deepEqual([runBrief(cwd, qa).status, runBrief(cwd, qa).stdout], [0, ''], 'Worker slot')
})
