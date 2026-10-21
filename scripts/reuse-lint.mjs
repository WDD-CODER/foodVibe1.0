/**
 * Reuse lint (plan 450, ADR 0024) — warns when a diff adds a new copy of a registered component family.
 * Never blocks: always exit 0 for --diff / --patch. Rules are data in scripts/lib/registry-families.mjs.
 *
 * Usage:
 *   node scripts/reuse-lint.mjs --diff=<base>          added lines since the merge base with <base> (+ untracked files)
 *   node scripts/reuse-lint.mjs --patch=<file.diff>    added lines of a saved unified diff (tests, fixtures)
 *   node scripts/reuse-lint.mjs --check-registry       exit 1 when a path in docs/brain/component-families.md is gone,
 *                                                      or a rule names a family the registry has no heading for
 *   [--registry=<path>]                                 another registry file (tests)
 *
 * Output: one "REUSE: warn <rule> <family> <file>:<line> — <hint>" per hit, or "REUSE: ok".
 */
import { readFileSync, existsSync } from 'fs'
import { execFileSync } from 'child_process'
import { resolve, dirname, join, isAbsolute } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import picomatch from 'picomatch'
import { parseAddedLines } from './lib/invariants.mjs'
import { readRegistryFile, REGISTRY_PATH } from './lib/reuse-check.mjs'
import { REUSE_RULES } from './lib/registry-families.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function git(args) {
  try {
    return execFileSync('git', args, { cwd: repoRoot, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).replace(/\r?\n+$/, '')
  } catch {
    return ''
  }
}

/** Warnings for added lines ([{ file, line, text }]) against the rules. */
export function lintAddedLines(added, rules = REUSE_RULES) {
  const compiled = rules.map((r) => ({
    ...r,
    inFiles: picomatch(r.files, { dot: true }),
    excluded: r.exclude ? picomatch(r.exclude, { dot: true }) : () => false
  }))
  const out = []
  for (const { file, line, text } of added) {
    for (const r of compiled) {
      if (!r.inFiles(file) || r.excluded(file)) continue
      if (r.skip && r.skip.test(text)) continue
      if (r.pattern.test(text)) out.push(`REUSE: warn ${r.id} ${r.family} ${file}:${line} — ${r.hint}`)
    }
  }
  return out
}

/** Registry problems: missing paths (globs need one tracked match) and rule families with no heading. */
export function checkRegistry({ registry, rules = REUSE_RULES, exists, trackedFiles }) {
  const problems = []
  const ids = new Set(registry.families.map((f) => f.id))
  const seen = new Set()
  for (const { path, line } of registry.paths) {
    if (seen.has(path)) continue
    seen.add(path)
    if (path.includes('*')) {
      const match = picomatch(path, { dot: true })
      if (!trackedFiles().some((f) => match(f))) problems.push(`REUSE: registry missing-path ${path} (line ${line}) — no tracked file matches`)
    } else if (!exists(path.replace(/\/$/, ''))) {
      problems.push(`REUSE: registry missing-path ${path} (line ${line})`)
    }
  }
  for (const r of rules) {
    if (!ids.has(r.family)) problems.push(`REUSE: registry unknown-family ${r.family} (rule ${r.id}) — add a "### ${r.family} — …" heading`)
  }
  return problems
}

function addedSince(base) {
  const mergeBase = git(['merge-base', base, 'HEAD']) || base
  const added = parseAddedLines(git(['diff', '-U0', '--no-color', mergeBase]))
  const untracked = git(['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean)
  for (const f of untracked) {
    const abs = join(repoRoot, f)
    let text
    try { text = readFileSync(abs, 'utf8') } catch { continue }
    text.split(/\r?\n/).forEach((t, i) => added.push({ file: f.replace(/\\/g, '/'), line: i + 1, text: t }))
  }
  return added
}

function parseArgs(argv) {
  const out = {}
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue
    const eq = arg.indexOf('=')
    if (eq >= 0) out[arg.slice(2, eq)] = arg.slice(eq + 1)
    else out[arg.slice(2)] = true
  }
  return out
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args['check-registry']) {
    const registry = readRegistryFile(repoRoot, args.registry)
    if (!registry) {
      console.error(`REUSE: registry not found: ${args.registry || REGISTRY_PATH}`)
      process.exit(1)
    }
    let tracked = null
    const problems = checkRegistry({
      registry,
      exists: (p) => existsSync(isAbsolute(p) ? p : join(repoRoot, p)),
      trackedFiles: () => (tracked ??= git(['ls-files']).split('\n').filter(Boolean))
    })
    if (problems.length) {
      for (const p of problems) console.error(p)
      process.exit(1)
    }
    console.log(`REUSE: registry ok (${registry.families.length} families, ${new Set(registry.paths.map((p) => p.path)).size} paths)`)
    process.exit(0)
  }
  let added
  if (args.patch && args.patch !== true) {
    const p = isAbsolute(args.patch) ? args.patch : join(repoRoot, args.patch)
    if (!existsSync(p)) {
      console.error(`REUSE: patch not found: ${args.patch}`)
      process.exit(1)
    }
    added = parseAddedLines(readFileSync(p, 'utf8'))
  } else if (args.diff && args.diff !== true) {
    added = addedSince(args.diff)
  } else {
    console.error('usage: --diff=<base> | --patch=<file.diff> | --check-registry [--registry=<path>]')
    process.exit(1)
  }
  const warnings = lintAddedLines(added)
  console.log(warnings.length ? warnings.join('\n') : 'REUSE: ok')
  process.exit(0)
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main()
