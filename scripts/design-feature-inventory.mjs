/**
 * Design-port lost-feature check (plan 405).
 *
 * Records what a screen can DO — template event bindings, routerLinks, input()/output()/model()
 * declarations, injected services, modal .open( calls, @defer blocks, scrollIntoView / focus()
 * calls, translatePipe keys — from every .ts / .html under the screen's folder (specs skipped),
 * so a design port can prove nothing was dropped.
 *
 * Identity is kind + name (never the line), counted: moving code is fine, deleting the only
 * (click)="save()" — or one of two — is "missing".
 *
 * Usage:
 *   node scripts/design-feature-inventory.mjs --screen <name> --out <file>        save the "before"
 *   node scripts/design-feature-inventory.mjs --screen <name> --compare <file>    check the tree against it
 *   node scripts/design-feature-inventory.mjs --screen <name> --base <ref> --compare-worktree
 *        "before" built from the screen's files at a git ref (no saved file needed)
 *   [--spec <port-spec.md>]  items listed under "## Approved removals" are not reported
 *   [--root <dir>]           repo root (default: this checkout); tests point it at a fixture
 *
 * <name> is the screen folder (dashboard, cook-view, recipe-book …) or its registry name.
 * Exit 0 = FEATURES: ok, 1 = FEATURES: missing, 2 = usage / unknown screen.
 * Node built-ins only (regex over source; no Angular compiler).
 */
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs'
import { execFileSync } from 'child_process'
import { resolve, dirname, join, relative, sep } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(__dirname, '..')
export const REGISTRY_PATH = '_claude-data/design-migration/screens/_registry.md'

const lineAt = (text, index) => text.slice(0, index).split('\n').length
const firstCall = (expr) => expr.match(/([A-Za-z_$][\w$]*)\s*\(/)?.[1] ?? expr.trim().replace(/\s+/g, ' ')

/** Each rule: [kind, regex over the file, (match) => name]. */
const HTML_RULES = [
  ['event', /(?<!\[)\(([A-Za-z][\w.-]*)\)\s*=\s*"([^"]*)"/g, m => `${m[1]}=${firstCall(m[2])}`],
  ['routerLink', /\[?routerLink\]?\s*=\s*"([^"]*)"/g, m => m[1].trim()],
  ['defer', /@defer\b\s*(\([^)]*\))?/g, m => (m[1] ?? '').replace(/\s+/g, ' ').trim() || '(idle)'],
  ['i18n', /['"]([\w.-]+)['"]\s*\|\s*translatePipe/g, m => m[1]],
]
const TS_RULES = [
  ['input', /(\w+)\s*=\s*input(?:\.required)?\s*[<(]/g, m => m[1]],
  ['output', /(\w+)\s*=\s*output\s*[<(]/g, m => m[1]],
  ['model', /(\w+)\s*=\s*model(?:\.required)?\s*[<(]/g, m => m[1]],
  ['inject', /\binject\(\s*([A-Za-z_$][\w$]*)/g, m => m[1]],
  ['open', /([\w$]+)\s*\.open\(\s*([A-Za-z_$][\w$]*)?/g, m => `${m[1]}.open(${m[2] ?? ''})`],
  ['scrollIntoView', /([\w$]+)\??\s*\.scrollIntoView\(/g, m => m[1]],
  ['focus', /([\w$]+)\??\s*\.focus\(\s*[{)]/g, m => m[1]],
  ['i18n', /\btranslate(?:Pipe)?\.transform\(\s*['"]([\w.-]+)['"]/g, m => m[1]],
]

/** @param {{ path: string, text: string }[]} files → [{ kind, name, file, line }] */
export function extractFeatures(files) {
  const out = []
  for (const { path, text } of files) {
    const rules = path.endsWith('.html') ? HTML_RULES : TS_RULES
    for (const [kind, re, name] of rules) {
      for (const m of text.matchAll(re)) out.push({ kind, name: name(m), file: path, line: lineAt(text, m.index) })
    }
  }
  return out
}

const key = f => `${f.kind} ${f.name}`

/** Items under "## Approved removals" in a port-spec: one `- <kind> <name>` bullet each (backticks optional). */
export function parseApprovedRemovals(specText) {
  const section = specText.match(/^## Approved removals\s*\n([\s\S]*?)(?=^## |(?![\s\S]))/m)?.[1] ?? ''
  return new Set(section.split('\n')
    .map(l => l.match(/^\s*[-*]\s+`?([^`]+?)`?\s*(?:—.*)?$/)?.[1]?.trim())
    .filter(Boolean))
}

/** Before items whose kind+name occurs fewer times after. Approved keys are skipped. */
export function compareInventories(before, after, approved = new Set()) {
  const left = new Map()
  for (const f of after) left.set(key(f), (left.get(key(f)) ?? 0) + 1)
  const missing = []
  for (const f of before) {
    const n = left.get(key(f)) ?? 0
    if (n > 0) left.set(key(f), n - 1)
    else if (!approved.has(key(f))) missing.push(f)
  }
  return missing
}

/** Screen → Angular folder, from the registry table (folder name or registry Screen name). */
export function screenPath(screen, registryText) {
  const want = screen.toLowerCase().replace(/[\s_]+/g, '-')
  for (const line of registryText.split('\n')) {
    const cells = line.split('|').map(c => c.trim())
    const path = cells[3]?.match(/`(src\/app\/pages\/[^`]+?)\/?`/)?.[1]
    if (!path) continue
    const folder = path.split('/').pop()
    const name = cells[2].toLowerCase().replace(/\s*\(.*\)\s*/g, '').replace(/[\s_]+/g, '-')
    if (want === folder || want === name) return path
  }
  return null
}

const isSource = p => /\.(ts|html)$/.test(p) && !p.endsWith('.spec.ts')

function worktreeFiles(root, path) {
  const abs = join(root, path)
  if (!existsSync(abs)) return []
  const walk = d => readdirSync(d).flatMap(n => {
    const p = join(d, n)
    return statSync(p).isDirectory() ? walk(p) : [p]
  })
  return walk(abs)
    .map(p => relative(root, p).split(sep).join('/'))
    .filter(isSource)
    .map(p => ({ path: p, text: readFileSync(join(root, p), 'utf8') }))
}

function refFiles(root, ref, path) {
  if (ref.startsWith('-')) throw new Error(`not a git ref: ${ref}`)
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  return git(['ls-tree', '-r', '--name-only', ref, '--', path]).split('\n').filter(isSource)
    .map(p => ({ path: p, text: git(['show', `${ref}:${p}`]) }))
}

function printMissing(missing, total) {
  if (!missing.length) {
    console.log(`FEATURES: ok (${total})`)
    return 0
  }
  console.log('FEATURES: missing')
  for (const f of missing) console.log(`  - ${f.kind} ${f.name}  (was ${f.file}:${f.line})`)
  return 1
}

export function main(argv, { root = REPO_ROOT } = {}) {
  const flag = n => {
    const i = argv.indexOf(n)
    return i >= 0 ? argv[i + 1] : null
  }
  root = resolve(flag('--root') ?? root)
  const screen = flag('--screen')
  if (!screen) {
    console.error('usage: --screen <name> (--out <file> | --compare <file> | --base <ref> --compare-worktree) [--spec <file>]')
    return 2
  }
  const regFile = join(root, REGISTRY_PATH)
  const path = existsSync(regFile) ? screenPath(screen, readFileSync(regFile, 'utf8')) : null
  if (!path) {
    console.error(`unknown screen '${screen}' — not in ${REGISTRY_PATH}`)
    return 2
  }
  const now = extractFeatures(worktreeFiles(root, path))
  const spec = flag('--spec')
  const approved = spec ? parseApprovedRemovals(readFileSync(spec, 'utf8')) : new Set()

  const out = flag('--out')
  if (out) {
    writeFileSync(out, JSON.stringify({ screen, path, features: now }, null, 2) + '\n')
    console.log(`FEATURES: saved ${now.length} item(s) from ${path} → ${out}`)
    return 0
  }
  const compare = flag('--compare')
  if (compare) {
    const before = JSON.parse(readFileSync(compare, 'utf8')).features
    return printMissing(compareInventories(before, now, approved), before.length)
  }
  const base = flag('--base')
  if (base && argv.includes('--compare-worktree')) {
    const before = extractFeatures(refFiles(root, base, path))
    return printMissing(compareInventories(before, now, approved), before.length)
  }
  console.error('one of --out, --compare, or --base <ref> --compare-worktree is required')
  return 2
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main(process.argv.slice(2)))
}
