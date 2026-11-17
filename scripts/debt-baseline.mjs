/**
 * The debt baseline by hand: show the counts, or lower the baseline after a branch removed debt.
 *
 *   node scripts/debt-baseline.mjs --show [--config <json file>]
 *   node scripts/debt-baseline.mjs --lower [--config <json file>]
 *   node scripts/debt-baseline.mjs --add-kind <kind> [--config <json file>]
 *
 * --show   prints `DEBT: <kind> <baseline> → <now>` per kind (from every check's counts(), scripts/lib/checks/)
 * --lower  rewrites the kinds whose count fell to their current counts; refuses (exit 1, writes nothing) while any kind
 *          rose. It never raises a count and never adds a kind.
 * --add-kind  records a kind the baseline does not have yet at its current count (a default being turned on: its
 *          existing gaps must not read as a rise from zero); refuses a kind the baseline already has.
 * The baseline file is paths.debtBaseline (default docs/project/debt-baseline.json); scripts/lib/debt-baseline.mjs has
 * its shape.
 */
import { loadChecks, loadConfig, collectCounts, isEntry } from './kit-checks.mjs'
import { readBaseline, writeBaseline, compare, lowered, withKind } from './lib/debt-baseline.mjs'

export async function main(argv = process.argv.slice(2), root = process.cwd(), print = (l) => console.log(l)) {
  const ai = argv.indexOf('--add-kind')
  const kind = ai >= 0 ? argv[ai + 1] : null
  const mode = ai >= 0 ? 'add' : argv.includes('--lower') ? 'lower' : argv.includes('--show') ? 'show' : null
  const ci = argv.indexOf('--config')
  const bad = argv.filter((a, i) => !['--lower', '--show', '--config', '--add-kind'].includes(a) && !(ci >= 0 && i === ci + 1) && !(ai >= 0 && i === ai + 1))
  if (!mode || bad.length || (ci >= 0 && !argv[ci + 1]) || (ai >= 0 && (!kind || kind.startsWith('--')))) {
    print(`DEBT: refused — ${bad.length ? `unknown argument ${bad[0]}` : 'say --show, --lower or --add-kind <kind>'}`)
    print('usage: node scripts/debt-baseline.mjs --show | --lower | --add-kind <kind> [--config <json file>]')
    return 2
  }
  try {
    const config = loadConfig(root, ci >= 0 ? argv[ci + 1] : null)
    const checks = await loadChecks()
    const ctx = { root, base: null, plan: null, planText: null, items: null, config, note: (t) => print(`DEBT: note — ${t}`) }
    const current = await collectCounts(checks, ctx)
    const baseline = readBaseline(root, config.debtBaseline)
    if (mode === 'show') {
      const kinds = [...new Set([...Object.keys(current), ...Object.keys(baseline.counts)])].sort()
      for (const k of kinds) print(`DEBT: ${k} ${baseline.counts[k]?.total ?? 0} → ${current[k]?.total ?? 0}`)
      print(`DEBT: ${kinds.length} kinds in ${config.debtBaseline}`)
      return compare(current, baseline).raised.length ? 1 : 0
    }
    if (mode === 'add') {
      const { counts, added } = withKind(current, baseline, kind)
      writeBaseline(root, config.debtBaseline, counts)
      print(`DEBT: added ${added.kind} at ${added.now}`)
      return 0
    }
    const { counts, changed } = lowered(current, baseline)
    if (!changed.length) {
      print('DEBT: nothing fell — baseline unchanged')
      return 0
    }
    writeBaseline(root, config.debtBaseline, counts)
    for (const c of changed) print(`DEBT: lowered ${c.kind} ${c.old} → ${c.now}`)
    return 0
  } catch (e) {
    print(`DEBT: ${e.message}`)
    return 1
  }
}

if (isEntry(import.meta.url)) process.exitCode = await main()
