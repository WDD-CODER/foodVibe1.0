/**
 * The product-defaults contract (paths.productDefaults) and the Human's remarks (docs/brain/remarks/), by command.
 * The procedure that calls these is .claude/skills/product-defaults/SKILL.md (/default).
 *
 *   node scripts/product-defaults.mjs remark  --tag <id> --text "<the Human's words>" [--source chat|card|run]
 *   node scripts/product-defaults.mjs add     --id <id> --rule "<sentence>" --trigger <trigger|custom> [--words "<RegExp>"]
 *                                             --how "<piece>" [--check "<card | files: …>"] [--card "<page · action · result>"]
 *                                             [--exceptions "<where not>"] [--status on|off|proposed]
 *   node scripts/product-defaults.mjs on      --id <id>
 *   node scripts/product-defaults.mjs off     --id <id>
 *   node scripts/product-defaults.mjs list
 *   node scripts/product-defaults.mjs propose --id <id> --rule "<one sentence>" --trigger <trigger> [--how <piece>]
 *
 * remark   records one remark and prints `DEFAULTS: noted <tag> (n of N)`, or at defaults.suggestAfter
 *          `DEFAULTS: suggest <tag> — n times — reply: default yes <tag> | default no <tag>`.
 * add / on write a default `on` only on the Human's own reply ("default yes", "make this a default", /default); an `on`
 *          default with a rule check also gets its existing gaps in the debt baseline (`default.<id>`).
 * propose  appends a `proposed` entry (ignored by every check). Exit 1 on a refusal (nothing written), 2 on bad usage.
 */
import { spawnSync } from 'node:child_process'
import { appendProposed, addEntry, turnOn, turnOff, addRemark, readContract, TRIGGERS, CUSTOM_TRIGGER, CONTRACT_PATH } from './lib/product-defaults.mjs'
import { isEntry } from './kit-checks.mjs'
import { main as debtMain } from './debt-baseline.mjs'

const TRIG = [...Object.keys(TRIGGERS), CUSTOM_TRIGGER].join('|')
const USAGE = [
  'usage: node scripts/product-defaults.mjs remark --tag <id> --text "<the Human\'s words>" [--source chat|card|run]',
  `       node scripts/product-defaults.mjs add --id <id> --rule "<sentence>" --trigger <${TRIG}> [--words "<RegExp>"] --how "<piece>" [--check …] [--card …] [--exceptions …] [--status on|off|proposed]`,
  '       node scripts/product-defaults.mjs on --id <id> [--how "<piece>"] [--check "<files: …>" | --card "<page · action · result>"]',
  '       node scripts/product-defaults.mjs off --id <id>',
  '       node scripts/product-defaults.mjs list',
  `       node scripts/product-defaults.mjs propose --id <id> --rule "<sentence>" --trigger <${Object.keys(TRIGGERS).join('|')}> [--how <piece>]`,
].join('\n')
const ARGS = {
  remark: ['--tag', '--text', '--source', '--branch', '--date'],
  add: ['--id', '--rule', '--trigger', '--words', '--how', '--check', '--card', '--exceptions', '--status', '--date'],
  on: ['--id', '--date', '--how', '--check', '--card'],
  off: ['--id'],
  list: [],
  propose: ['--id', '--rule', '--trigger', '--how'],
}

function parse(rest, known) {
  const o = {}
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i]
    const eq = a.indexOf('=')
    const key = eq > 0 ? a.slice(0, eq) : a
    if (!known.includes(key)) return { error: `unknown argument ${a}` }
    const v = eq > 0 ? a.slice(eq + 1) : rest[++i]
    if (v === undefined) return { error: `${key} needs a value` }
    o[key.slice(2)] = v
  }
  return { o }
}

const branchOf = (root) => {
  const r = spawnSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8' })
  return r.status === 0 && r.stdout.trim() ? r.stdout.trim() : 'main'
}

/** An `on` default with a rule check: its existing gaps join the debt baseline, so only new code is held to it. */
async function baselineFor(entry, root, print) {
  if (!entry?.diff) return 0
  return debtMain(['--add-kind', `default.${entry.id}`], root, print)
}

export async function main(argv = process.argv.slice(2), root = process.cwd(), print = (l) => console.log(l)) {
  const [cmd, ...rest] = argv
  if (!ARGS[cmd]) { print('DEFAULTS: refused — say remark, add, on, off, list or propose'); print(USAGE); return 2 }
  const { o, error } = parse(rest, ARGS[cmd])
  if (error) { print(`DEFAULTS: refused — ${error}`); print(USAGE); return 2 }
  try {
    if (cmd === 'list') {
      const c = readContract(root)
      if (!c) { print(`DEFAULTS: no contract at ${CONTRACT_PATH}`); return 0 }
      for (const e of c.entries) print(`DEFAULTS: ${String(e.status ?? '(no status)').padEnd(8)} ${e.id} — ${e.rule}`)
      for (const e of c.errors) print(`DEFAULTS: bad contract — ${e}`)
      print(`DEFAULTS: ${c.entries.length} defaults, ${c.entries.filter((e) => e.status === 'on').length} on`)
      return c.errors.length ? 1 : 0
    }
    if (cmd === 'remark') {
      if (!o.tag || !o.text) { print('DEFAULTS: refused — remark needs --tag and --text'); print(USAGE); return 2 }
      print(addRemark({ root, tag: o.tag, text: o.text, source: o.source ?? 'chat', branch: o.branch ?? branchOf(root), date: o.date }).line)
      return 0
    }
    if (cmd === 'propose') {
      if (!o.id || !o.rule || !o.trigger) { print('DEFAULTS: refused — say propose with --id, --rule and --trigger'); print(USAGE); return 2 }
      appendProposed({ root, id: o.id, rule: o.rule, trigger: o.trigger, how: o.how })
      print(`DEFAULTS: proposed ${o.id} (status: proposed — only the Human turns it on)`)
      return 0
    }
    if (!o.id) { print(`DEFAULTS: refused — ${cmd} needs --id`); print(USAGE); return 2 }
    if (cmd === 'off') {
      turnOff({ root, id: o.id })
      print(`DEFAULTS: off ${o.id}`)
      return 0
    }
    const entry = cmd === 'on'
      ? turnOn({ root, id: o.id, date: o.date, how: o.how, check: o.check, card: o.card })
      : addEntry({ root, id: o.id, rule: o.rule, trigger: o.trigger, words: o.words, how: o.how, check: o.check, card: o.card, exceptions: o.exceptions, status: o.status ?? 'on', date: o.date })
    print(`DEFAULTS: ${entry.status} ${entry.id} — ${entry.rule}`)
    if (entry.status === 'on') return await baselineFor(entry, root, print) === 0 ? 0 : 1
    return 0
  } catch (e) {
    print(`DEFAULTS: refused — ${e.message}`)
    return 1
  }
}

if (isEntry(import.meta.url)) process.exitCode = await main()
