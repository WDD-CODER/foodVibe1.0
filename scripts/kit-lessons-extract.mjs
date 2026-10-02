/**
 * Kit lessons extractor — lands the brain lessons triaged in
 * docs/workflow-kit/lessons-triage.md into the kit repo. See
 * plans/331-workflow-kit-extraction-phase-3-stack-packs.plan.md (C5).
 *
 * Usage:
 *   node scripts/kit-lessons-extract.mjs [--kit <dir>]          # write (overwrites generated files)
 *   node scripts/kit-lessons-extract.mjs [--kit <dir>] --check  # report only, writes nothing
 *
 * transfer   = the entry (gotcha section) or file (ADR, pattern) is copied as-is.
 * generalize = a short draft entry is written from the triage draft column, marked `status: draft`.
 * stay       = not shipped.
 * Destinations: core -> core/docs/brain/**, pack:<x> -> packs/<x>/docs/brain/**.
 * Gotcha entries from one source file are grouped into one kit file of the same name.
 * Node built-ins only. Exit 0 = ok, 1 = problems. Never writes inside this repo.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname, join, basename } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const flagValue = (name) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : null
}
const repoRoot = resolve(join(__dirname, '..'))
const kitRoot = resolve(flagValue('--kit') ?? join(repoRoot, '..', 'ai-workflow-kit'))
const checkOnly = argv.includes('--check')

const DEST = { core: 'core', 'pack:angular': 'packs/angular', 'pack:node-express': 'packs/node-express' }
const MOJIBAKE = [['â€”', '—'], ['â€“', '–'], ['â†’', '→'], ['â€˜', '‘'], ['â€™', '’'], ['â€œ', '“'], ['â€¦', '…'], ['âœ“', '✓']]
const fixEncoding = (text) => MOJIBAKE.reduce((s, [bad, good]) => s.split(bad).join(good), text)
// Project-specific strings inside shipped lessons become config placeholders. Packs keep their stack names.
const ph = (key) => `{{${key}}}`
function localize(text, destKey) {
  let out = text
    .replace(/foodvibe[-_]db[-_]backups/gi, `${ph('project.name')}-db-backups`)
    .replace(/FoodVibe\s*1\.0|foodvibe/gi, ph('project.name'))
    .replace(/\bHebrew\b/g, ph('project.uiLocale'))
    .replace(/(?:public\/assets\/data\/)?dictionary\.json/g, ph('project.i18nFile'))
    .replace(/\b300[0-3]\b/g, ph('slots.bePorts'))
    .replace(/\b420[0-3]\b/g, ph('slots.fePorts'))
    .replace(/gstack(?:\s*`?\/browse`?)?/gi, ph('tools.browser'))
  if (destKey === 'core') {
    out = out
      .replace(/(?:npx )?ng build\b/g, `npm run ${ph('commands.build')}`)
      .replace(/angular(?: \d+)?/gi, ph('stack.name'))
  }
  return out
}
const stripAnchor =(title) => title.replace(/\s*<a id="[^"]*"><\/a>\s*$/, '').trim()

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, '|'))
}

const rows = []
for (const line of readFileSync(join(repoRoot, 'docs/workflow-kit/lessons-triage.md'), 'utf8').split(/\r?\n/)) {
  if (!line.trim().startsWith('|')) continue
  const c = splitRow(line)
  if (c.length < 5 || c[0] === 'source' || /^-+$/.test(c[0].replace(/[:\s]/g, ''))) continue
  rows.push({ source: c[0], title: c[1], verdict: c[2], dest: c[3], draft: c[4] })
}

// Section text of one `## title` entry in a gotcha file (heading line through the line before the next `## `).
const sectionCache = new Map()
function section(source, title) {
  if (!sectionCache.has(source)) {
    const lines = readFileSync(join(repoRoot, source), 'utf8').replace(/\r\n/g, '\n').split('\n')
    const sections = new Map()
    let cur = null
    for (const l of lines) {
      const m = /^## (.+?)\s*$/.exec(l)
      if (m) {
        cur = { title: stripAnchor(m[1]), lines: [l.replace(/\s*<a id="[^"]*"><\/a>\s*$/, '')] }
        sections.set(cur.title, cur)
      } else if (cur) cur.lines.push(l)
    }
    sectionCache.set(source, sections)
  }
  const s = sectionCache.get(source).get(title)
  return s ? s.lines.join('\n').replace(/\s+$/, '') : null
}

const destKeyOf = (kitPath) => (kitPath.startsWith('core/') ? 'core' : 'pack')
const out = new Map() // kit-relative path -> content
const problems = []
const counts = { transfer: 0, generalize: 0, stay: 0 }

const gotchaFiles = new Map() // kit path -> { header, entries[] }
for (const r of rows) {
  counts[r.verdict]++
  if (r.verdict === 'stay') continue
  const base = DEST[r.dest]
  if (!base) {
    problems.push(`bad destination "${r.dest}": ${r.source} ${r.title}`)
    continue
  }
  const kitPath = `${base}/${r.source}`
  const isGotcha = r.source.startsWith('docs/brain/gotchas/')
  if (isGotcha) {
    let body
    if (r.verdict === 'transfer') {
      body = section(r.source, r.title)
      if (body == null) {
        problems.push(`source section not found: ${r.source} — ${r.title}`)
        continue
      }
    } else {
      body = `## ${r.title}\n\n**Status:** draft — generalized from a project lesson; review before relying on it.\n\n${r.draft}`
    }
    if (!gotchaFiles.has(kitPath)) gotchaFiles.set(kitPath, { title: basename(r.source, '.md'), entries: [] })
    gotchaFiles.get(kitPath).entries.push({ title: r.title, body })
    continue
  }
  if (r.verdict === 'transfer') {
    const src = join(repoRoot, r.source)
    if (!existsSync(src)) {
      problems.push(`source file not found: ${r.source}`)
      continue
    }
    out.set(kitPath, readFileSync(src, 'utf8'))
  } else {
    const kind = r.source.includes('/decisions/') ? 'decision' : 'pattern'
    const head = kind === 'decision' ? '# ' : '# '
    out.set(
      kitPath,
      `${head}${r.title.replace(/^\d{4}\.\s*/, '')}\n\n**Status:** draft — generalized from a project ${kind}; review before relying on it.\n\n${r.draft}\n`,
    )
  }
}
for (const [path, g] of gotchaFiles) {
  const header = `# ${g.title} gotchas\n\n`
  out.set(path, header + g.entries.map((e) => e.body).join('\n\n---\n\n') + '\n')
}

let landed = 0
for (const [path, content] of out) {
  const dest = join(kitRoot, path)
  const text = localize(fixEncoding(content), destKeyOf(path))
  if (!checkOnly) {
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, text, 'utf8')
  }
  if (!existsSync(dest)) problems.push(`missing: ${path}`)
  else if (readFileSync(dest, 'utf8') !== text) problems.push(`out-of-date: ${path}`)
  else landed++
}

// Every shipped row must be findable in its destination.
let shipped = 0
let found = 0
for (const r of rows) {
  if (r.verdict === 'stay' || !DEST[r.dest]) continue
  shipped++
  const dest = join(kitRoot, DEST[r.dest], r.source)
  if (!existsSync(dest)) continue
  if (r.source.startsWith('docs/brain/gotchas/')) {
    if (readFileSync(dest, 'utf8').includes(`## ${localize(r.title, r.dest)}`)) found++
  } else found++
}

if (problems.length > 0 || found !== shipped) {
  console.error(problems.join('\n'))
  console.error(`KIT_LESSONS_EXTRACT: FAIL — ${found}/${shipped} shipped entries found, ${problems.length} problems`)
  process.exit(1)
}
console.log(
  `KIT_LESSONS_EXTRACT: ok — ${counts.transfer} transfer + ${counts.generalize} generalize landed, ${counts.stay} stay skipped, 0 missing (${landed} kit files)`,
)
