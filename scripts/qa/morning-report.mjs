#!/usr/bin/env node
/**
 * Nightly QA morning report (plan 422). Reads the QA checkout's logs and code-qa state, writes one short
 * MORNING.md (OK / ATTENTION / BLOCKED + one "Do now" line) and a history line. Read-only on everything else.
 *
 *   node scripts/qa/morning-report.mjs --root=<QA checkout> [--date=YYYY-MM-DD] [--out=<file>|-]
 */
import { execFileSync } from 'child_process'
import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { pathToFileURL } from 'url'

const localDate = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const read = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : null)

function git(root, args) {
  try {
    return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return null
  }
}

/** The night's log lines: `.nightly.log` lines stamped on `date` (00:00 up to the next 00:00). */
export function nightLines(log, date) {
  return (log || '').split(/\r?\n/).filter((l) => l.startsWith(`${date} `))
}

const STEPS = [
  ['up', 'up', /\bqa-up\.ps1 -> exit (\d+)/],
  ['code-qa', 'up', /\bcode-qa -> exit (\d+)/],
  ['merge', 'merge', /\bmerge done \(exit (\d+)\)/],
  ['down', 'down', /\bqa-down\.ps1 -> exit (\d+)/]
]

/** [{ name, exit }] — exit is null when the step left no line that night; the first non-zero exit wins. */
export function stepResults(lines) {
  return STEPS.map(([name, label, re]) => {
    let exit = null
    for (const l of lines) {
      if (!new RegExp(`^\\S+ \\S+ ${label}\\s`).test(l)) continue
      const m = re.exec(l)
      if (m) exit = exit === null || exit === 0 ? Number(m[1]) : exit
    }
    return { name, exit }
  })
}

const SEV = ['S1', 'S2', 'S3', 'S4']

function reviewState(root, date) {
  const dir = join(root, 'bugs', 'qa-runs', 'code-qa', date)
  const queue = read(join(dir, 'queue.md'))
  const files = existsSync(dir) ? readdirSync(dir) : []
  const reviews = files.filter((f) => /^review-[A-Z]+\.md$/.test(f)).length
  const blocked = files.includes('BLOCKED-review.md')
  if (queue === null) return { queue: false, due: 0, skipped: 0, reviews, blocked }
  const skipIdx = queue.search(/^## Skipped/m)
  const head = skipIdx < 0 ? queue : queue.slice(0, skipIdx)
  const tail = skipIdx < 0 ? '' : queue.slice(skipIdx)
  return {
    queue: true,
    due: (head.match(/^## \d+\./gm) || []).length,
    skipped: (tail.match(/^- [A-Z]+ — /gm) || []).length,
    reviews,
    blocked
  }
}

function codeState(root) {
  const head = git(root, ['rev-parse', '--short', 'HEAD'])
  const origin = git(root, ['rev-parse', '--short', 'origin/main'])
  const behind = !!(head && origin && head !== origin && git(root, ['merge-base', '--is-ancestor', head, 'origin/main']) !== null)
  return { head: head || '?', behind }
}

function findingsState(root, date) {
  let known = { findings: {} }
  try { known = JSON.parse(read(join(root, 'bugs', 'qa-runs', 'code-qa', 'known.json')) || '{"findings":{}}') } catch { /* unreadable: treated as empty */ }
  const all = Object.values(known.findings || {})
  const fmt = (k) => ({ id: k.id, severity: k.severity, page: k.page, title: k.title })
  const byId = (a, b) => a.id.localeCompare(b.id)
  const open = Object.fromEntries(SEV.map((s) => [s, all.filter((k) => k.status === 'open' && k.severity === s).length]))
  return {
    added: all.filter((k) => k.firstSeen === date).map(fmt).sort(byId),
    fixed: all.filter((k) => k.goneSince === date).map(fmt).sort(byId),
    open
  }
}

function uiRun(root, date) {
  const index = read(join(root, 'bugs', 'qa-runs', 'INDEX.md'))
  if (!index) return null
  for (const l of index.split(/\r?\n/)) {
    const cells = l.split('|').map((c) => c.trim())
    if (cells.length >= 4 && cells[1].startsWith(date)) return { run: cells[1], status: cells[2], note: cells[3] }
  }
  return null
}

/** Report model + markdown from already-read inputs. */
export function buildReport({ date, steps, code, review, findings, ui, nightLogEmpty }) {
  const failed = steps.find((s) => s.exit !== null && s.exit !== 0)
  let blocked = null
  if (nightLogEmpty) blocked = 'no log lines for this night — the nightly tasks did not run'
  else if (failed) blocked = `${failed.name} step failed (exit ${failed.exit})`
  else if (review.blocked) blocked = 'Code QA agent wrote BLOCKED-review.md'
  else if (review.queue && review.due > 0 && review.reviews === 0) blocked = 'Code QA agent did not run (due pages, no review files)'
  const newHigh = findings.added.filter((f) => f.severity === 'S1' || f.severity === 'S2')
  let status = 'OK'
  let doNow = 'nothing — no new S1/S2 findings'
  if (blocked) {
    status = 'BLOCKED'
    doNow = `fix the night: ${failed ? `${failed.name} exited ${failed.exit}` : blocked}`
  } else if (newHigh.length) {
    status = 'ATTENTION'
    doNow = `plan a fix for ${newHigh.length} new S1/S2 findings (${newHigh.map((f) => f.id).join(', ')})`
  } else if (code.behind) {
    status = 'ATTENTION'
    doNow = 'check why the 00:00 pull did not fast-forward'
  } else if (!ui) {
    status = 'ATTENTION'
    doNow = 'check why the UI run did not run'
  }
  const stepText = failed
    ? `step ${failed.name} FAILED (exit ${failed.exit})`
    : nightLogEmpty ? 'steps missing'
      : steps.every((s) => s.exit === 0) ? 'steps ok' : `steps ${steps.map((s) => `${s.name} ${s.exit === null ? '?' : s.exit}`).join(' ')}`
  const reviewText = !review.queue ? 'code review: no queue' : `code review ${review.due} pages due (${review.reviews} reviewed), ${review.skipped} skipped`
  const bySev = SEV.map((s) => [s, findings.added.filter((f) => f.severity === s).length]).filter(([, n]) => n)
  const line = (f) => `- ${f.id} · ${f.severity} · ${f.page} · ${f.title}`
  const out = [
    `# QA morning report — ${date}`,
    `Status: ${status}`,
    `Do now: ${doNow}`,
    `Night: ${stepText} · code ${code.head} (${code.behind ? 'QA ran on old code' : 'up to date'}) · ${reviewText} · UI run ${ui ? `${ui.run} ${ui.status}` : 'did not run'}`,
    `Findings: new ${findings.added.length}${bySev.length ? ` (${bySev.map(([s, n]) => `${s} ${n}`).join(', ')})` : ''} · fixed ${findings.fixed.length} · open ${SEV.map((s) => `${s} ${findings.open[s]}`).join(' · ')}`,
    '',
    '## New',
    ...(newHigh.length ? newHigh.map(line) : ['- none (S1/S2)']),
    ...(findings.added.length > newHigh.length ? [`- plus ${findings.added.length - newHigh.length} S3/S4`] : []),
    '## Fixed',
    ...(findings.fixed.length ? findings.fixed.slice(0, 10).map(line) : ['- none']),
    ...(findings.fixed.length > 10 ? [`- plus ${findings.fixed.length - 10} more`] : []),
    ...(ui ? ['## UI run', `- ${ui.run} · ${ui.status} · ${ui.note}`] : []),
    '## Where to look',
    '- bugs/qa-runs/code-qa/latest.md · bugs/qa-runs/<run>/report.md · bugs/qa-runs/.nightly.log',
    ''
  ]
  return { status, doNow, text: out.join('\n') }
}

export function report({ root, date = localDate() }) {
  const lines = nightLines(read(join(root, 'bugs', 'qa-runs', '.nightly.log')), date)
  const findings = findingsState(root, date)
  const review = reviewState(root, date)
  const built = buildReport({
    date, steps: stepResults(lines), code: codeState(root), review,
    findings, ui: uiRun(root, date), nightLogEmpty: lines.length === 0
  })
  const row = `| ${date} | ${built.status} | ${findings.added.length} | ${findings.fixed.length} | ${SEV.map((s) => findings.open[s]).join('/')} | ${review.skipped} |`
  return { ...built, row }
}

export function main(argv = process.argv.slice(2)) {
  const opt = Object.fromEntries(argv.map((a) => a.replace(/^--/, '').split(/=(.*)/s).slice(0, 2)))
  if (!opt.root) { console.error('usage: morning-report.mjs --root=<QA checkout> [--date=YYYY-MM-DD] [--out=<file>|-]'); return 1 }
  const root = resolve(opt.root)
  const date = opt.date || localDate()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { console.error('--date must be YYYY-MM-DD'); return 1 }
  const r = report({ root, date })
  if (opt.out === '-') { process.stdout.write(r.text); return 0 }
  const runs = join(root, 'bugs', 'qa-runs')
  const out = opt.out || join(runs, 'MORNING.md')
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, r.text, 'utf8')
  if (!opt.out) {
    const hist = join(runs, 'morning-history.md')
    const old = read(hist)
    if (old === null) {
      writeFileSync(hist, `# QA morning history\n| date | status | new | fixed | open S1/S2/S3/S4 | skipped pages |\n|---|---|---|---|---|---|\n${r.row}\n`, 'utf8')
    } else if (old.split(/\r?\n/).some((l) => l.startsWith(`| ${date} |`))) {
      writeFileSync(hist, old.split(/\r?\n/).map((l) => (l.startsWith(`| ${date} |`) ? r.row : l)).join('\n'), 'utf8')
    } else appendFileSync(hist, (old.endsWith('\n') ? '' : '\n') + r.row + '\n', 'utf8')
  }
  console.log(`QA morning report ${date}: ${r.status} — ${r.doNow}`)
  return 0
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href.toLowerCase() === import.meta.url.toLowerCase()
if (isMain) process.exit(main())
