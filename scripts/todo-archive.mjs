/**
 * Todo archive volume rotation — shared by Claude Code and Cursor.
 *
 * Moves fully-done plan sections from `.claude/todo.md` into numbered
 * `.claude/todo-archive/NNN.md` volumes (max 300 lines each).
 *
 * Usage:
 *   node scripts/todo-archive.mjs              # archive all-[x] from todo.md
 *   node scripts/todo-archive.mjs --dry-run    # report only
 *   node scripts/todo-archive.mjs --migrate    # split legacy todo-archive.md
 *   node scripts/todo-archive.mjs --migrate --dry-run
 *   node scripts/todo-archive.mjs --migrate-only --migrate
 *   node scripts/todo-archive.mjs --json
 *
 * Exit: 0 always (advisory tooling). Prints summary to stdout.
 */
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  existsSync,
  renameSync
} from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')

const MAX_LINES = 300
const TODO_PATH = join(repoRoot, '.claude', 'todo.md')
const ARCHIVE_DIR = join(repoRoot, '.claude', 'todo-archive')
const LEGACY_ARCHIVE = join(repoRoot, '.claude', 'todo-archive.md')
const LEGACY_BAK = join(repoRoot, '.claude', 'todo-archive.legacy.md')

const args = Object.fromEntries(
  process.argv.slice(2).map(arg => {
    const m = arg.match(/^--([^=]+)(?:=(.*))?$/)
    if (!m) return [arg, true]
    return [m[1], m[2] ?? true]
  })
)

const dryRun = Boolean(args['dry-run'])
const doMigrate = Boolean(args.migrate)
const migrateOnly = Boolean(args['migrate-only'])
const asJson = Boolean(args.json)

function ensureArchiveDir() {
  if (!existsSync(ARCHIVE_DIR)) mkdirSync(ARCHIVE_DIR, { recursive: true })
}

function listVolumes() {
  if (!existsSync(ARCHIVE_DIR)) return []
  return readdirSync(ARCHIVE_DIR)
    .filter(name => /^\d{3}\.md$/.test(name))
    .map(name => ({
      name,
      n: Number(name.slice(0, 3)),
      path: join(ARCHIVE_DIR, name)
    }))
    .sort((a, b) => a.n - b.n)
}

function padVol(n) {
  return `${String(n).padStart(3, '0')}.md`
}

function volumeHeader(n) {
  const pad = String(n).padStart(3, '0')
  return [
    `# Todo Archive Volume ${pad}`,
    '',
    `Moved from todo.md. Max ${MAX_LINES} lines per volume.`,
    '',
    '---',
    '',
    '## Done',
    ''
  ].join('\n')
}

function lineCount(text) {
  if (!text) return 0
  return text.split(/\r?\n/).length
}

/**
 * todo.md footers only — not archive container `## Done` (which sits above plans).
 * Matches `## Plan Index`, `## Where things live`, or `## Done` + stub phrase.
 */
function isTodoFooterLine(lines, i) {
  if (/^## Plan Index\b/.test(lines[i])) return true
  if (/^## Where things live\b/.test(lines[i])) return true
  if (!/^## Done\s*$/.test(lines[i])) return false
  for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
    if (/Completed entries are in/i.test(lines[j])) return true
    if (/Completed plan sections live in/i.test(lines[j])) return true
    if (/^### Plan\b/.test(lines[j])) return false
    if (/^## /.test(lines[j])) return false
  }
  return false
}

/**
 * Split markdown into `### Plan …` sections.
 * Stops the last section before todo.md footers (`## Done` stub / `## Plan Index`).
 */
function splitPlanSections(text) {
  const lines = text.split(/\r?\n/)
  const sectionStarts = []
  for (let i = 0; i < lines.length; i++) {
    if (/^### Plan\b/.test(lines[i])) sectionStarts.push(i)
  }

  if (!sectionStarts.length) {
    return { preamble: text, sections: [], lines, sectionStarts, footerStart: lines.length }
  }

  let footerStart = lines.length
  for (let i = sectionStarts[0]; i < lines.length; i++) {
    if (isTodoFooterLine(lines, i)) {
      footerStart = i
      break
    }
  }

  const sections = []
  for (let s = 0; s < sectionStarts.length; s++) {
    const start = sectionStarts[s]
    let end = s + 1 < sectionStarts.length ? sectionStarts[s + 1] : footerStart
    if (end > footerStart) end = footerStart

    const chunk = lines.slice(start, end)
    while (chunk.length && /^\s*$/.test(chunk[chunk.length - 1])) chunk.pop()
    while (chunk.length > 1 && /^---\s*$/.test(chunk[chunk.length - 1])) {
      chunk.pop()
      while (chunk.length && /^\s*$/.test(chunk[chunk.length - 1])) chunk.pop()
    }

    sections.push({
      heading: chunk[0] || '',
      full: chunk.join('\n'),
      start,
      end
    })
  }

  return {
    preamble: lines.slice(0, sectionStarts[0]).join('\n'),
    sections,
    lines,
    sectionStarts,
    footerStart
  }
}

function isDeferredBlocked(sectionText) {
  return (
    /\(deferred\)/i.test(sectionText) ||
    /\(skipped\)/i.test(sectionText) ||
    /\[~\]/.test(sectionText)
  )
}

function checkboxStats(sectionText) {
  const open = (sectionText.match(/^- \[ \]/gm) || []).length
  const done = (sectionText.match(/^- \[x\]/gim) || []).length
  return { open, done }
}

function isFullyDone(sectionText) {
  const { open, done } = checkboxStats(sectionText)
  return open === 0 && done > 0 && !isDeferredBlocked(sectionText)
}

function findArchiveCandidates(todoText) {
  const { sections } = splitPlanSections(todoText)
  return sections.filter(s => isFullyDone(s.full))
}

/**
 * Pack blocks into volumes. Returns written metadata.
 * Single oversized blocks still land in their own volume (never dropped).
 */
function appendBlocksToVolumes(blocks, { dryRun: dry, startN = null }) {
  ensureArchiveDir()
  const results = []
  const volumes = listVolumes()

  let n = startN != null
    ? startN
    : volumes.length
      ? volumes[volumes.length - 1].n
      : 0
  let path = n ? join(ARCHIVE_DIR, padVol(n)) : null
  let text = path && existsSync(path)
    ? readFileSync(path, 'utf8').replace(/\s*$/, '')
    : ''

  function startNewVolume() {
    n = n ? n + 1 : 1
    path = join(ARCHIVE_DIR, padVol(n))
    text = volumeHeader(n).replace(/\s*$/, '')
  }

  function headerOnlyLines(volN) {
    return lineCount(volumeHeader(volN))
  }

  for (const block of blocks) {
    const piece = String(block).replace(/^\s+|\s+$/g, '')
    if (!piece) continue

    if (!path) startNewVolume()

    const addition = `\n\n${piece}\n\n---`
    let candidate = `${text}${addition}\n`
    let lines = lineCount(candidate)

    if (lines > MAX_LINES && lineCount(text) > headerOnlyLines(n)) {
      if (!dry) writeFileSync(path, `${text}\n`, 'utf8')
      startNewVolume()
      candidate = `${text}\n\n${piece}\n\n---\n`
      lines = lineCount(candidate)
    }

    if (!dry) writeFileSync(path, candidate, 'utf8')
    text = candidate.replace(/\s*$/, '')
    results.push({
      volume: padVol(n),
      heading: piece.split(/\r?\n/)[0],
      linesAfter: lines
    })
  }

  return results
}

function removeSectionsFromTodo(todoText, headingsToRemove) {
  const removeSet = new Set(headingsToRemove)
  const { sections, lines, sectionStarts, footerStart } = splitPlanSections(todoText)

  if (!sectionStarts.length) return todoText

  const preambleLines = lines.slice(0, sectionStarts[0])
  const footer = lines.slice(footerStart)
  const kept = sections.filter(sec => !removeSet.has(sec.heading)).map(sec => sec.full)

  let pre = preambleLines.join('\n').replace(/\s*$/, '')
  if (pre && !/\n---\s*$/.test(pre) && !/^---\s*$/.test(pre)) {
    pre += '\n\n---'
  }

  const middle = kept.length
    ? kept.map(s => s.replace(/\s*$/, '')).join('\n\n---\n\n')
    : ''

  const foot = footer.join('\n').replace(/^\s+/, '')
  const parts = []
  if (pre) parts.push(pre)
  if (middle) parts.push(middle)
  if (foot) parts.push(foot.startsWith('##') ? foot : foot)

  let out = parts.join('\n\n')
  out = out.replace(/\n{3,}/g, '\n\n')
  if (!out.endsWith('\n')) out += '\n'
  return out
}

function migrateLegacy({ dryRun: dry }) {
  if (!existsSync(LEGACY_ARCHIVE)) {
    return {
      ok: true,
      message: 'No legacy .claude/todo-archive.md to migrate',
      volumes: 0,
      blocks: 0,
      volumeFiles: []
    }
  }

  const existing = listVolumes()
  if (existing.length) {
    return {
      ok: false,
      message: `Refuse migrate: ${existing.length} volume(s) already under todo-archive/`,
      volumes: existing.length,
      blocks: 0,
      volumeFiles: []
    }
  }

  const legacy = readFileSync(LEGACY_ARCHIVE, 'utf8')
  const { sections } = splitPlanSections(legacy)
  const blocks = sections.map(s => s.full)

  if (!blocks.length) {
    return {
      ok: true,
      message: 'Legacy archive has no ### Plan sections',
      volumes: 0,
      blocks: 0,
      volumeFiles: []
    }
  }

  const written = appendBlocksToVolumes(blocks, { dryRun: dry, startN: 0 })

  // Summarize unique volumes + final line counts
  const byVol = new Map()
  for (const w of written) {
    byVol.set(w.volume, w.linesAfter)
  }
  const volumeFiles = [...byVol.entries()].map(([file, lines]) => ({ file, lines }))

  if (!dry) {
    if (!existsSync(LEGACY_BAK)) renameSync(LEGACY_ARCHIVE, LEGACY_BAK)
  }

  return {
    ok: true,
    message: dry
      ? `Would migrate ${blocks.length} plan sections into ${volumeFiles.length} volume(s)`
      : `Migrated ${blocks.length} plan sections into ${volumeFiles.length} volume(s); legacy renamed to todo-archive.legacy.md`,
    volumes: volumeFiles.length,
    blocks: blocks.length,
    volumeFiles
  }
}

function archiveFromTodo({ dryRun: dry }) {
  if (!existsSync(TODO_PATH)) {
    return { ok: false, message: 'Missing .claude/todo.md', moved: [] }
  }

  const todoText = readFileSync(TODO_PATH, 'utf8')
  const candidates = findArchiveCandidates(todoText)

  if (!candidates.length) {
    return { ok: true, message: 'No all-[x] plan sections to archive', moved: [] }
  }

  const blocks = candidates.map(c => c.full)
  const written = appendBlocksToVolumes(blocks, { dryRun: dry })

  if (!dry) {
    const headings = candidates.map(c => c.heading)
    writeFileSync(TODO_PATH, removeSectionsFromTodo(todoText, headings), 'utf8')
  }

  return {
    ok: true,
    message: dry
      ? `Would archive ${candidates.length} plan section(s)`
      : `Archived ${candidates.length} plan section(s) from todo.md`,
    moved: candidates.map((c, i) => ({
      heading: c.heading,
      volume: written[i]?.volume ?? null,
      items: checkboxStats(c.full).done
    }))
  }
}

const report = {
  dryRun,
  migrate: null,
  archive: null
}

if (doMigrate) {
  report.migrate = migrateLegacy({ dryRun })
}

if (!(doMigrate && migrateOnly)) {
  report.archive = archiveFromTodo({ dryRun })
}

if (asJson) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log(`TODO_ARCHIVE: ${dryRun ? 'dry-run' : 'apply'}`)
  if (report.migrate) {
    console.log(`  migrate: ${report.migrate.message}`)
    for (const v of report.migrate.volumeFiles || []) {
      console.log(`    - ${v.file} (~${v.lines} lines)`)
    }
  }
  if (report.archive) {
    console.log(`  archive: ${report.archive.message}`)
    for (const m of report.archive.moved || []) {
      const title = m.heading.length > 100 ? `${m.heading.slice(0, 97)}...` : m.heading
      console.log(`    - ${title} → ${m.volume || '(pending)'} (${m.items} items)`)
    }
  }
}

process.exit(0)
