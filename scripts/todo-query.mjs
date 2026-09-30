/**
 * Todo query — shared by Claude Code and Cursor.
 *
 * Answers targeted questions about `.claude/todo.md` without reading the
 * whole file into context. Do not Read .claude/todo.md in full.
 *
 * Usage:
 *   node scripts/todo-query.mjs next
 *   node scripts/todo-query.mjs open [--plan NNN]
 *   node scripts/todo-query.mjs sweep
 *   node scripts/todo-query.mjs mark --line N[,N…]
 *   node scripts/todo-query.mjs append --from <file>
 *   (add --json to next / open / sweep)
 *
 * Exit: 0 on success, 1 when the file is missing, no sections parse, or
 * `mark` is asked to flip a line that isn't currently `[ ]`.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { execFileSync } from 'child_process'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'
import {
  isTodoFooterLine,
  splitPlanSections,
  isDeferredBlocked,
  checkboxStats,
  isFullyDone
} from './lib/todo-parse.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')
const TODO_PATH = join(repoRoot, '.claude', 'todo.md')

function fail(message) {
  console.error(`TODO_QUERY: ${message}`)
  process.exit(1)
}

function parseArgs(argv) {
  const out = { _: [] }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg.startsWith('--')) {
      const key = arg.slice(2)
      const next = argv[i + 1]
      if (next !== undefined && !next.startsWith('--')) {
        out[key] = next
        i++
      } else {
        out[key] = true
      }
    } else {
      out._.push(arg)
    }
  }
  return out
}

const argv = process.argv.slice(2)
const subcommand = argv[0]
const args = parseArgs(argv.slice(1))
const asJson = Boolean(args.json)

function readTodo() {
  if (!existsSync(TODO_PATH)) fail('missing .claude/todo.md')
  const raw = readFileSync(TODO_PATH, 'utf8')
  const eol = raw.includes('\r\n') ? '\r\n' : '\n'
  return { raw, eol }
}

function planPathFromHeading(heading) {
  const m = heading.match(/\(([^)]+\.plan\.md)\)/)
  return m ? m[1] : null
}

function planNumberFromHeading(heading) {
  const m = heading.match(/^### Plans?\s+(\d+)/)
  return m ? m[1] : null
}

/** Absolute 1-based line numbers of `- [ ]` items inside a parsed section. */
function openItemLines(section) {
  const chunkLines = section.full.split(/\r?\n/)
  const items = []
  chunkLines.forEach((line, k) => {
    if (/\[ \]/.test(line)) {
      items.push({ line: section.start + k + 1, text: line.trim() })
    }
  })
  return items
}

function cmdNext() {
  const { raw } = readTodo()
  const { sections } = splitPlanSections(raw)
  if (!sections.length) fail('no ### Plan sections parsed from .claude/todo.md')

  const target = sections.find(s => checkboxStats(s.full).open > 0)
  if (!target) {
    if (asJson) {
      console.log(JSON.stringify({ found: false }, null, 2))
    } else {
      console.log('TODO_QUERY: no open plan sections')
    }
    return
  }

  const items = openItemLines(target)
  const result = {
    found: true,
    heading: target.heading,
    plan: planPathFromHeading(target.heading),
    items
  }

  if (asJson) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  console.log(target.heading)
  if (result.plan) console.log(`  plan: ${result.plan}`)
  for (const item of items) {
    console.log(`  ${item.line}: ${item.text}`)
  }
}

function cmdOpen() {
  const { raw } = readTodo()
  const { sections } = splitPlanSections(raw)
  if (!sections.length) fail('no ### Plan sections parsed from .claude/todo.md')

  let scoped = sections
  if (args.plan) {
    scoped = sections.filter(s => planNumberFromHeading(s.heading) === String(args.plan))
    if (!scoped.length) fail(`no section found for --plan ${args.plan}`)
  }

  const result = scoped
    .map(s => ({ heading: s.heading, plan: planPathFromHeading(s.heading), items: openItemLines(s) }))
    .filter(s => s.items.length)

  if (asJson) {
    console.log(JSON.stringify(result, null, 2))
    return
  }

  if (!result.length) {
    console.log('TODO_QUERY: no open items')
    return
  }

  for (const s of result) {
    console.log(s.heading)
    for (const item of s.items) {
      console.log(`  ${item.line}: ${item.text}`)
    }
  }
}

function tryExecFile(cmd, cmdArgs) {
  try {
    return execFileSync(cmd, cmdArgs, { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}

function hasGh() {
  try {
    execFileSync('gh', ['--version'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function cmdSweep() {
  const { raw } = readTodo()
  const { sections } = splitPlanSections(raw)
  if (!sections.length) fail('no ### Plan sections parsed from .claude/todo.md')

  const candidates = sections.filter(s => isFullyDone(s.full))
  const deferred = sections.filter(s => isDeferredBlocked(s.full) && checkboxStats(s.full).open === 0)
  const ghAvailable = hasGh()

  const results = candidates.map(s => {
    const num = planNumberFromHeading(s.heading)
    const gitHits = num ? tryExecFile('git', ['log', '--oneline', '-i', `--grep=${num}`]) : ''
    const prHits = num && ghAvailable ? tryExecFile('gh', ['pr', 'list', '--state', 'merged', '--search', num]) : ''
    const verified = Boolean(gitHits || prHits)
    return {
      heading: s.heading,
      plan: planPathFromHeading(s.heading),
      status: verified ? 'verified' : 'unverifiable',
      gitHits: gitHits ? gitHits.split('\n').length : 0,
      prHits: prHits ? prHits.split('\n').length : 0
    }
  })

  if (asJson) {
    console.log(JSON.stringify({ ghAvailable, deferredSkipped: deferred.length, results }, null, 2))
    return
  }

  if (!results.length) {
    console.log('TODO_QUERY: no all-[x] sections to sweep')
    if (deferred.length) console.log(`  (${deferred.length} deferred section(s) excluded)`)
    return
  }

  for (const r of results) {
    console.log(`${r.status.toUpperCase()}: ${r.heading}`)
  }
  if (deferred.length) console.log(`(${deferred.length} deferred section(s) excluded)`)
}

function cmdMark() {
  if (!args.line) fail('mark requires --line N[,N…]')
  const { raw, eol } = readTodo()
  const lines = raw.split(/\r?\n/)
  const targets = String(args.line)
    .split(',')
    .map(s => Number(s.trim()))

  for (const n of targets) {
    if (!Number.isInteger(n) || n < 1 || n > lines.length || !/\[ \]/.test(lines[n - 1])) {
      fail(`line ${n} does not currently contain "[ ]" — refusing whole call, no changes made`)
    }
  }

  const changed = []
  for (const n of targets) {
    const idx = n - 1
    lines[idx] = lines[idx].replace('[ ]', '[x]')
    changed.push({ line: n, text: lines[idx].trim() })
  }

  writeFileSync(TODO_PATH, lines.join(eol), 'utf8')

  if (asJson) {
    console.log(JSON.stringify({ changed }, null, 2))
    return
  }
  console.log('TODO_QUERY: marked')
  for (const c of changed) console.log(`  ${c.line}: ${c.text}`)
}

function cmdAppend() {
  if (!args.from) fail('append requires --from <file>')
  if (!existsSync(args.from)) fail(`file not found: ${args.from}`)

  const { raw, eol } = readTodo()
  const lines = raw.split(/\r?\n/)

  let footerStart = lines.length
  for (let i = 0; i < lines.length; i++) {
    if (isTodoFooterLine(lines, i)) {
      footerStart = i
      break
    }
  }

  const newSection = readFileSync(args.from, 'utf8').replace(/\s+$/, '').split(/\r?\n/)
  const before = lines.slice(0, footerStart)
  while (before.length && /^\s*$/.test(before[before.length - 1])) before.pop()
  const after = lines.slice(footerStart)

  const out = [...before, '', ...newSection, '', ...after].join(eol)
  writeFileSync(TODO_PATH, out, 'utf8')

  console.log(`TODO_QUERY: appended ${newSection[0] || '(section)'}`)
}

switch (subcommand) {
  case 'next':
    cmdNext()
    break
  case 'open':
    cmdOpen()
    break
  case 'sweep':
    cmdSweep()
    break
  case 'mark':
    cmdMark()
    break
  case 'append':
    cmdAppend()
    break
  default:
    fail(`unknown subcommand "${subcommand ?? ''}" — expected next | open | sweep | mark | append`)
}
