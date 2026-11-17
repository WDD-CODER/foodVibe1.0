/**
 * The product-defaults contract by hand: offer a repeated requirement as a default.
 *
 *   node scripts/product-defaults.mjs propose --id <id> --rule "<one sentence>" --trigger <trigger> [--how <piece>]
 *
 * Appends one `### <id>` entry with `status: proposed` to the contract (paths.productDefaults). Only the Human turns a
 * default on, so this never writes `on`; a proposed default is ignored by every check. Refuses (exit 1, nothing written) a
 * duplicate id, an unknown trigger, a bad id or an empty rule; exit 2 for bad usage.
 */
import { appendProposed, TRIGGERS } from './lib/product-defaults.mjs'
import { isEntry } from './kit-checks.mjs'

const USAGE = `usage: node scripts/product-defaults.mjs propose --id <id> --rule "<sentence>" --trigger <${Object.keys(TRIGGERS).join('|')}> [--how <piece>]`

export function main(argv = process.argv.slice(2), root = process.cwd(), print = (l) => console.log(l)) {
  const [cmd, ...rest] = argv
  const o = {}
  const known = ['--id', '--rule', '--trigger', '--how']
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]
    const eq = a.indexOf('=')
    const key = eq > 0 ? a.slice(0, eq) : a
    if (!known.includes(key)) { print(`DEFAULTS: refused — unknown argument ${a}`); print(USAGE); return 2 }
    const v = eq > 0 ? a.slice(eq + 1) : rest[++i]
    if (v === undefined) { print(`DEFAULTS: refused — ${key} needs a value`); print(USAGE); return 2 }
    o[key.slice(2)] = v
  }
  if (cmd !== 'propose' || !o.id || !o.rule || !o.trigger) {
    print('DEFAULTS: refused — say propose with --id, --rule and --trigger')
    print(USAGE)
    return 2
  }
  try {
    appendProposed({ root, id: o.id, rule: o.rule, trigger: o.trigger, how: o.how })
  } catch (e) {
    print(`DEFAULTS: refused — ${e.message}`)
    return 1
  }
  print(`DEFAULTS: proposed ${o.id} (status: proposed — only the Human turns it on)`)
  return 0
}

if (isEntry(import.meta.url)) process.exitCode = main()
