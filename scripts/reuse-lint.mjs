/**
 * Reuse lint: copies of a registered component family, as a ratchet.
 *
 *   node scripts/reuse-lint.mjs --diff=<base>       the added lines that look like a copy of a family; exit 1 when a
 *                                                   `reuse-copy.<family>` count rose above paths.debtBaseline
 *   node scripts/reuse-lint.mjs --check-registry    exit 1 when a path in the registry is gone, or a rule names a family
 *                                                   the registry has no heading for   [--registry=<path>]
 *
 * Rules are data in the project's scripts/lib/registry-families.mjs (the seed explains the shape). An old copy never blocks
 * (it is in the baseline); a new one does. Output: "REUSE: copy <rule> <family> <file>:<line> — <hint>", then
 * "REUSE: ok" or "REUSE: fail (...)".
 */
import { existsSync } from 'node:fs'
import { resolve, dirname, join, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'
import { addedItems } from './lib/diff-items.mjs'
import { normalizeCounts, readBaseline, compare } from './lib/debt-baseline.mjs'
import { readRegistryFile, REGISTRY_PATH } from './lib/registry.mjs'
import { loadRules, lintAddedLines, countCopies, checkRegistry, projectFiles } from './lib/checks/reuse-copies.mjs'
import { CHECKS_CONFIG, isEntry } from './kit-checks.mjs'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

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

export async function main(argv = process.argv.slice(2), root = repoRoot, print = (l) => console.log(l)) {
  const args = parseArgs(argv)
  try {
    if (args['check-registry']) {
      const registry = readRegistryFile(root, args.registry)
      if (!registry) {
        print(`REUSE: registry not found: ${args.registry || REGISTRY_PATH}`)
        return 1
      }
      const { rules } = await loadRules(root)
      let files = null
      const problems = checkRegistry({
        registry,
        rules,
        exists: (p) => existsSync(isAbsolute(p) ? p : join(root, p)),
        files: () => (files ??= projectFiles(root)),
      })
      for (const p of problems) print(p)
      if (!problems.length) print(`REUSE: registry ok (${registry.families.length} families, ${new Set(registry.paths.map((p) => p.path)).size} paths)`)
      return problems.length ? 1 : 0
    }
    if (args.diff && args.diff !== true) {
      const { found, rules } = await loadRules(root)
      if (!found) {
        print('REUSE: ok (no scripts/lib/registry-families.mjs — no rules)')
        return 0
      }
      let items
      try {
        items = addedItems({ root, base: String(args.diff) })
      } catch (e) {
        print(`REUSE: bad base ${args.diff} — ${e.message}`)
        return 1
      }
      for (const w of lintAddedLines(items.lines, rules)) print(`REUSE: copy ${w.rule} ${w.family} ${w.file}:${w.line} — ${w.hint}`)
      const current = normalizeCounts(countCopies(root, rules))
      const baseline = readBaseline(root, CHECKS_CONFIG.debtBaseline)
      const raised = compare(current, baseline).raised.filter((r) => r.kind.startsWith('reuse-copy.'))
      for (const r of raised) print(`REUSE: debt ${r.kind} ${r.old} → ${r.now} — new in ${r.files.join(', ') || '(no single file)'}; use the family's shared piece`)
      print(raised.length ? `REUSE: fail (${raised.length} families gained a copy)` : 'REUSE: ok')
      return raised.length ? 1 : 0
    }
  } catch (e) {
    print(`REUSE: error — ${e.message}`)
    return 1
  }
  print('usage: --diff=<base> | --check-registry [--registry=<path>]')
  return 1
}

if (isEntry(import.meta.url)) process.exitCode = await main()
