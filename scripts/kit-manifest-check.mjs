/**
 * Kit manifest checker — proves every workflow file is classified exactly once
 * and every brain lesson has a triage verdict. See
 * plans/328-workflow-kit-extraction-phase-1-audit-manifest.plan.md.
 *
 * Usage:
 *   node scripts/kit-manifest-check.mjs             # inventory vs manifest.json
 *   node scripts/kit-manifest-check.mjs --lessons   # brain lessons vs lessons-triage.md
 *   node scripts/kit-manifest-check.mjs --list      # print unclassified paths (one per line)
 *
 * Node built-ins only. Exit 0 = ok, exit 1 = failures (printed, one per line).
 * Reusable for drift detection in later phases: pass --root <dir> and
 * --manifest <file> to point it at another checkout.
 */
import { readFileSync, readdirSync, existsSync, statSync } from 'fs'
import { resolve, dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const flagValue = (name) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : null
}
const repoRoot = resolve(flagValue('--root') ?? join(__dirname, '..'))
const manifestPath = resolve(flagValue('--manifest') ?? join(repoRoot, 'docs/workflow-kit/manifest.json'))
const triagePath = resolve(flagValue('--triage') ?? join(repoRoot, 'docs/workflow-kit/lessons-triage.md'))

const ROOT_FILES = [
  'AGENTS.md', 'CLAUDE.md', 'README_WORKFLOW.md', '.mcp.json', '.lintstagedrc.mjs',
  '.editorconfig', '.prettierrc.json', 'eslint.config.mjs', 'knip.json', '.gitleaksignore',
  '.gitattributes', '.gitignore', '.nvmrc', 'package.json', 'server/package.json',
  '.claude/settings.json', '.cursor/mcp.json',
]
const ROOT_DIRS = [
  '.claude/commands', '.claude/skills', '.claude/agents', '.claude/references',
  '.claude/instructions', '.claude/prompts', '.claude/workflows',
  '.cursor/rules', '.cursor/commands',
  'scripts', 'docs/agent', 'docs/brain', '_shared',
  '.husky', ['.github', 'workflows'].join('/'), '.vscode',
]
const TIERS = new Set(['core', 'pack:angular', 'pack:node-express', 'layer:cursor', 'template', 'project'])
const ACTIONS = new Set(['copy', 'parameterize', 'split', 'skeleton', 'stay'])
const VERDICTS = new Set(['transfer', 'generalize', 'stay'])
const DESTINATIONS = new Set(['core', 'pack:angular', 'pack:node-express'])
const SCANNED_TIERS = new Set(['core', 'layer:cursor'])

// Case-sensitive on purpose where the word is also plain English (Render, Express, Atlas).
const COUPLING = [
  ['angular', /Angular|\bng\s+(?:build|serve|test|lint|e2e|generate)\b|\bscss\b|\bsignals?\(|\bsignals only\b/gi],
  ['stack', /\bExpress\b|\bMongo(?:DB|ose)?\b|\bAtlas\b|\bRender\b/g],
  ['product', /FoodVibe|\bHebrew\b|dictionary\.json/gi],
  ['machine', /C:[\\/]+coding projects|\bdanwe\b|C:[\\/]+Program Files[\\/]+Git/gi],
  ['ports', /\b420[0-3N]\b|\b300[0-3N]\b|\b42\dN\b|\b30\dN\b/g],
  ['slots', /-wt-(?:\d|N)\b|\bwt-(?:\d|N)\b/g],
  ['browser', /gstack|\/browse\b/gi],
  // Beyond the plan's minimum list: app-layout paths are coupling too (found by line-by-line read).
  ['layout', /\bsrc\/(?:app|styles|environments)[\w./*-]*|\bserver\/[\w./*-]*|\bpublic\/assets[\w./*-]*|\bapp\.(?:routes|config)\.ts\b/g],
]

const norm = (p) => p.replace(/\\/g, '/')
const globToRegExp = (glob) =>
  new RegExp(
    '^' +
      norm(glob)
        .replace(/[.+^${}()|[\]]/g, '\\$&')
        .replace(/\*\*/g, '\u0000')
        .replace(/\*/g, '[^/]*')
        .replace(/\u0000/g, '.*') +
      '$',
  )

function walk(rel) {
  const abs = join(repoRoot, rel)
  if (!existsSync(abs)) return []
  const out = []
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const childRel = `${rel}/${entry.name}`
    if (entry.isDirectory()) out.push(...walk(childRel))
    else out.push(childRel)
  }
  return out
}

function inventory(excludedGlobs) {
  const excluded = excludedGlobs.map(globToRegExp)
  const files = new Set()
  for (const f of ROOT_FILES) if (existsSync(join(repoRoot, f))) files.add(f)
  for (const d of ROOT_DIRS) for (const f of walk(d)) files.add(f)
  return [...files].filter((f) => !excluded.some((re) => re.test(f))).sort()
}

function readJson(path) {
  if (!existsSync(path)) {
    console.error(`KIT_MANIFEST: FAIL — missing ${path}`)
    process.exit(1)
  }
  return JSON.parse(readFileSync(path, 'utf8'))
}

function couplingHits(rel) {
  const abs = join(repoRoot, rel)
  if (!existsSync(abs) || !statSync(abs).isFile()) return []
  const text = readFileSync(abs, 'utf8')
  const hits = new Set()
  for (const [, re] of COUPLING) {
    for (const m of text.matchAll(re)) hits.add(m[0].toLowerCase())
  }
  return [...hits].sort()
}

function checkManifest() {
  const manifest = existsSync(manifestPath) ? readJson(manifestPath) : { excluded: [], entries: [] }
  const excludedGlobs = (manifest.excluded ?? []).map((e) => e.path)
  const entries = manifest.entries ?? []
  const problems = []

  const seen = new Map()
  let duplicates = 0
  for (const e of entries) {
    seen.set(e.path, (seen.get(e.path) ?? 0) + 1)
  }
  for (const [path, n] of seen) {
    if (n > 1) {
      duplicates += n - 1
      problems.push(`duplicate: ${path} (${n} entries)`)
    }
  }

  const files = inventory(excludedGlobs)
  const classified = new Set(entries.map((e) => e.path))
  const unclassified = files.filter((f) => !classified.has(f))
  if (argv.includes('--list')) {
    for (const f of unclassified) console.log(f)
    return
  }
  for (const f of unclassified) problems.push(`unclassified: ${f}`)
  for (const e of entries) {
    if (!files.includes(e.path)) problems.push(`not-in-inventory-or-missing-on-disk: ${e.path}`)
    if (!TIERS.has(e.tier)) problems.push(`bad tier "${e.tier}": ${e.path}`)
    if (!ACTIONS.has(e.action)) problems.push(`bad action "${e.action}": ${e.path}`)
    for (const k of ['params', 'refs']) {
      if (!Array.isArray(e[k])) problems.push(`${k} must be an array: ${e.path}`)
    }
    if (typeof e.notes !== 'string') problems.push(`notes must be a string: ${e.path}`)
  }

  let unhandled = 0
  for (const e of entries) {
    if (!SCANNED_TIERS.has(e.tier)) continue
    const hits = couplingHits(e.path)
    if (hits.length === 0) continue
    const recorded = new Set(
      (e.params ?? []).flatMap((p) => (p.strings ?? []).map((s) => String(s).toLowerCase())),
    )
    const handledAction = e.action === 'parameterize' || e.action === 'split'
    const missing = hits.filter((h) => !recorded.has(h))
    if (!handledAction) {
      unhandled++
      problems.push(`unhandled-coupling: ${e.path} is ${e.tier}/${e.action} but contains: ${hits.join(', ')}`)
    } else if (missing.length > 0) {
      unhandled++
      problems.push(`unrecorded-coupling-strings: ${e.path} missing in params[].strings: ${missing.join(', ')}`)
    }
  }

  if (problems.length > 0) {
    console.error(problems.join('\n'))
    console.error(
      `KIT_MANIFEST: FAIL — ${entries.length - duplicates} classified, ${unclassified.length} unclassified, ${duplicates} duplicates, ${unhandled} unhandled-coupling (${problems.length} problems)`,
    )
    process.exit(1)
  }
  console.log(
    `KIT_MANIFEST: ok — ${entries.length} classified, 0 unclassified, 0 duplicates, 0 unhandled-coupling`,
  )
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, '|'))
}

function checkLessons() {
  const problems = []
  const rows = []
  if (existsSync(triagePath)) {
    for (const line of readFileSync(triagePath, 'utf8').split(/\r?\n/)) {
      if (!line.trim().startsWith('|')) continue
      const cells = splitRow(line)
      if (cells.length < 5 || /^-+$/.test(cells[0].replace(/[:\s]/g, '')) || cells[0] === 'source') continue
      rows.push(cells)
    }
  }

  const expected = []
  for (const f of walk('docs/brain/gotchas').filter((p) => p.endsWith('.md'))) {
    for (const line of readFileSync(join(repoRoot, f), 'utf8').split(/\r?\n/)) {
      const m = /^## (.+?)\s*$/.exec(line)
      // Trailing `<a id="..."></a>` anchors are not part of the title.
      if (m) expected.push({ path: f, title: m[1].replace(/\s*<a id="[^"]*"><\/a>$/, '') })
    }
  }
  for (const f of walk('docs/brain/decisions')) {
    if (f.endsWith('.md') && !f.endsWith('_TEMPLATE.md')) expected.push({ path: f, title: null })
  }
  for (const f of walk('docs/brain/patterns')) {
    if (f.endsWith('.md') && !f.endsWith('_TEMPLATE.md')) expected.push({ path: f, title: null })
  }

  for (const r of rows) {
    const [, , verdict, dest, draft] = r
    if (!VERDICTS.has(verdict)) problems.push(`bad verdict "${verdict}": ${r[0]} ${r[1]}`)
    if (!DESTINATIONS.has(dest) && verdict !== 'stay') problems.push(`bad destination "${dest}": ${r[0]} ${r[1]}`)
    if (verdict === 'generalize' && !draft) problems.push(`generalize without draft lesson: ${r[0]} ${r[1]}`)
  }

  let missing = 0
  for (const x of expected) {
    const hit = rows.find((r) => r[0] === x.path && (x.title === null || r[1] === x.title))
    if (!hit) {
      missing++
      problems.push(`missing triage row: ${x.path}${x.title ? ` — ${x.title}` : ''}`)
    }
  }

  if (problems.length > 0) {
    console.error(problems.join('\n'))
    console.error(`KIT_LESSONS: FAIL — ${expected.length - missing} entries triaged, ${missing} missing (${problems.length} problems)`)
    process.exit(1)
  }
  console.log(`KIT_LESSONS: ok — ${expected.length} entries triaged, 0 missing`)
}

if (argv.includes('--lessons')) checkLessons()
else checkManifest()
