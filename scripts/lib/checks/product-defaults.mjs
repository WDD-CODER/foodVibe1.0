// A changed file that triggers an `on` product default but shows no evidence of it (docs/project/product-defaults.md,
// `check:` rule data → scripts/lib/diff-rules.mjs). A finding is `default <id> <file>:<line> — use <how>`.
// counts() = the whole-tree gaps `default.<id>` per file, so existing gaps sit in the debt baseline and only shrink.
// A default that is `off` or `proposed`, a `check: card` default and a default with no rule data are never checked here.
// No contract file = nothing runs (a note). A contract that does not parse fails the check naming the entry.
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { readContract } from '../product-defaults.mjs'
import { runRules } from '../diff-rules.mjs'

export const id = 'product-defaults'

/** The diff rules of the `on` defaults that carry rule data, or null (no contract). */
function rulesOf(ctx) {
  const contract = readContract(ctx.root)
  if (!contract) {
    ctx.note?.('no product-defaults contract — the defaults check skipped')
    return null
  }
  if (contract.errors.length) throw new Error(`bad product-defaults contract — ${contract.errors.join('; ')}`)
  return contract.entries
    .filter((e) => e.status === 'on' && e.diff)
    .map((e) => ({ id: `default ${e.id}`, key: e.id, files: e.diff.files, exclude: e.diff.exclude, trigger: e.diff.trigger, evidence: e.diff.evidence, in: e.diff.in, hint: `use ${e.how}` }))
}

export function run(ctx) {
  const rules = rulesOf(ctx)
  if (!rules?.length || !ctx.items) return []
  return runRules({ root: ctx.root, items: ctx.items, rules })
}

export function counts(ctx) {
  const rules = rulesOf(ctx)
  if (!rules?.length) return {}
  const r = spawnSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: ctx.root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, windowsHide: true })
  const paths = String(r.stdout ?? '').split('\n').map((x) => x.trim()).filter((p) => p && existsSync(join(ctx.root, p)))
  const items = { files: paths.map((path) => ({ path, status: 'added' })), lines: [] }
  const out = {}
  for (const rule of rules) {
    for (const f of runRules({ root: ctx.root, items, rules: [rule], list: () => paths })) {
      const kind = `default.${rule.key}`
      out[kind] ??= {}
      out[kind][f.file] = (out[kind][f.file] ?? 0) + 1
    }
  }
  return out
}
