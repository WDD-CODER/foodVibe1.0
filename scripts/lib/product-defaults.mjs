/**
 * The project's product defaults: behaviours decided once (docs/project/product-defaults.md, `paths.productDefaults`).
 *
 *   parseContract(text) → { entries: [{ id, status, rule, trigger, words, how, check, card, exceptions }], errors: [] }
 *   ruleData(check) → the diff-rule data of a `check` line (`files: <globs>; trigger: <regex>; evidence: <regex>; in: <globs>`),
 *                     or null for a card or prose check; throws a plain reason for a bad regex or glob
 *   appendProposed({ root, id, rule, trigger, how }) → adds one `proposed` entry (the `propose` command)
 *   triggered(planText, entries) → the `on` entries whose plan words match the plan's Problem Statement, Functional
 *                                  Requirements or Atomic Sub-tasks
 *   runDefaultsCheck({ args, repoRoot }) → exit code of `node scripts/scope-check.mjs --defaults --plan=<p>`
 *
 * One `### <id>` section per default, one `- field: value` line per field (status, rule, applies when, plan words, how,
 * check, card, exceptions). A plan answers each triggered default under `## Defaults`:
 *   - <id> — applies — how: <piece>
 *   - <id> — exception — why: <one line>
 * Output: DEFAULTS: ok | missing | bad | card missing | skipped (no contract); one line per problem, exit 1 on a problem;
 * every exception row is printed as `DEFAULTS: exception <id> — <why>`.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, isAbsolute } from 'node:path'
import { sectionBody, sectionRows } from './plan-sections.mjs'
import { matcher } from './diff-items.mjs'

export const CONTRACT_PATH = "_shared/product-defaults.md" || 'docs/project/product-defaults.md'
export const STATUSES = ['proposed', 'on', 'off']
/** The trigger words and the RegExp source each one matches in a plan, unless the entry sets its own `plan words`. */
export const TRIGGERS = {
  'editable-form': '\\b(forms?|editors?|edit(?:able)? (?:page|screen|view|dialog))\\b',
  'write-endpoint': '\\b(write endpoints?|endpoints?|api routes?|mutations?)\\b',
  'list': '\\b(lists?|tables?|grids?)\\b',
  'destructive-action': '\\b(delete|deletes|deleting|remove|destroy|discard|purge)\\b',
  'screen': '\\b(screens?|pages?|views?|routes?)\\b',
}
const FIELDS = ['status', 'rule', 'applies when', 'plan words', 'how', 'check', 'card', 'exceptions']
const PLAN_SECTIONS = ['Problem Statement', 'Functional Requirements', 'Atomic Sub-tasks']
const PLACEHOLDER_RE = /^\[.*\]$|^<.*>$|^$/

const RULE_KEYS = ['files', 'trigger', 'evidence', 'in', 'exclude']
const globList = (v) => String(v ?? '').split(',').map((g) => g.trim()).filter(Boolean)

/** The rule data of a `check` value, { files, trigger, evidence, in, exclude }, or null when it is a card or prose. */
export function ruleData(check) {
  const text = String(check ?? '').trim()
  if (!/^files\s*:/i.test(text)) return null
  const parts = text.split(new RegExp(`;\\s*(?=(?:${RULE_KEYS.join('|')})\\s*:)`, 'i'))
  const f = {}
  for (const p of parts) {
    const m = p.match(/^([a-z]+)\s*:\s*([\s\S]*)$/i)
    if (!m || !RULE_KEYS.includes(m[1].toLowerCase())) throw new Error(`"${p.slice(0, 30)}" is not one of ${RULE_KEYS.join(', ')}`)
    f[m[1].toLowerCase()] = m[2].trim()
  }
  for (const k of ['files', 'trigger', 'evidence']) if (!f[k]) throw new Error(`${k} missing`)
  for (const k of ['trigger', 'evidence']) {
    try { new RegExp(f[k].replaceAll('{stem}', 'x'), 'm') } catch { throw new Error(`${k} "${f[k]}" is not a valid RegExp`) }
  }
  const out = { files: globList(f.files), trigger: f.trigger, evidence: f.evidence, in: globList(f.in), exclude: globList(f.exclude) }
  for (const k of ['files', 'in', 'exclude']) {
    for (const g of out[k]) {
      try { matcher(g) } catch { throw new Error(`${k} "${g}" is not a valid glob`) }
    }
  }
  return out
}

/** { entries, errors } — a refusal names the entry and the field. */
export function parseContract(text) {
  const entries = []
  const errors = []
  const parts = String(text).split(/^###\s+/m).slice(1)
  for (const part of parts) {
    const [head, ...lines] = part.split(/\r?\n/)
    const id = head.trim()
    const f = {}
    for (const raw of lines) {
      const m = raw.match(/^[-*]\s+([A-Za-z][A-Za-z ]*?)\s*:\s*(.*)$/)
      if (!m) continue
      const key = m[1].trim().toLowerCase()
      if (!FIELDS.includes(key)) {
        errors.push(`${id}: unknown field "${m[1].trim()}"`)
        continue
      }
      f[key] = m[2].trim()
    }
    const bad = (field, why) => errors.push(`${id}: ${field} — ${why}`)
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) { errors.push(`${id || '(no id)'}: id — use lower-case words joined with -`); continue }
    if (!STATUSES.includes(f.status)) bad('status', `"${f.status ?? ''}" is not one of ${STATUSES.join(', ')}`)
    if (!(f.rule ?? '').trim()) bad('rule', 'missing')
    if (!(f['applies when'] in TRIGGERS)) bad('applies when', `"${f['applies when'] ?? ''}" is not one of ${Object.keys(TRIGGERS).join(', ')}`)
    if (f['plan words']) {
      try { new RegExp(f['plan words'], 'i') } catch { bad('plan words', `"${f['plan words']}" is not a valid RegExp`) }
    }
    if (!(f.how ?? '').trim()) bad('how', 'missing')
    if (!(f.check ?? '').trim()) bad('check', 'missing (card, or the rule data of a diff check)')
    if (/^card\b/i.test(f.check ?? '') && !(f.card ?? '').trim()) bad('card', 'missing — a "check: card" default needs the card wording')
    let diff = null
    try { diff = ruleData(f.check) } catch (e) { bad('check', e.message) }
    entries.push({
      id,
      diff,
      status: f.status,
      rule: f.rule ?? '',
      trigger: f['applies when'],
      words: f['plan words'] || '',
      how: f.how ?? '',
      check: f.check ?? '',
      card: f.card ?? '',
      exceptions: f.exceptions ?? '',
    })
  }
  return { entries, errors }
}

export const isCardCheck = (e) => /^card\b/i.test(e.check)

/** The text of the plan the trigger words are matched against. */
export function planBody(planText) {
  return PLAN_SECTIONS.map((h) => sectionBody(planText, h) ?? '').join('\n')
}

/** The `on` entries a plan triggers. */
export function triggered(planText, entries) {
  const body = planBody(planText)
  return entries.filter((e) => e.status === 'on' && new RegExp(e.words || TRIGGERS[e.trigger] || '$^', 'i').test(body))
}

/** The `on` entries, for the inventory: `<id> — <rule> — <piece>`. */
export function onLines(entries) {
  return entries.filter((e) => e.status === 'on').map((e) => `${e.id} — ${e.rule} — ${e.how}`)
}

/** The contract at a repo path: null when the file is missing, else { entries, errors }. */
export function readContract(root, path = CONTRACT_PATH) {
  const abs = isAbsolute(path) ? path : join(root, path)
  return existsSync(abs) ? parseContract(readFileSync(abs, 'utf8')) : null
}

/**
 * Appends one `proposed` entry to the contract at `root` (never `on`). Throws a plain reason, writing nothing, for a missing
 * contract, a bad id, an unknown trigger, an empty rule or an id the contract already has.
 */
export function appendProposed({ root, id, rule, trigger, how = '', path = CONTRACT_PATH }) {
  const abs = isAbsolute(path) ? path : join(root, path)
  if (!existsSync(abs)) throw new Error(`no contract at ${path} — nothing to add to`)
  const text = readFileSync(abs, 'utf8')
  if (!/^[a-z0-9][a-z0-9-]*$/.test(String(id ?? ''))) throw new Error(`id "${id ?? ''}" — use lower-case words joined with -`)
  if (!(trigger in TRIGGERS)) throw new Error(`trigger "${trigger ?? ''}" is not one of ${Object.keys(TRIGGERS).join(', ')}`)
  const oneLine = String(rule ?? '').replace(/\s+/g, ' ').trim()
  if (!oneLine) throw new Error('rule is empty — pass --rule "<one sentence>"')
  if (parseContract(text).entries.some((e) => e.id === id)) throw new Error(`default "${id}" already exists`)
  const piece = String(how ?? '').replace(/\s+/g, ' ').trim() || '(name the shared piece when it is turned on)'
  const entry = `### ${id}\n\n- status: proposed\n- rule: ${oneLine}\n- applies when: ${trigger}\n- how: ${piece}\n- check: (set when it is turned on — card, or the rule data of a diff check)\n- exceptions: (say where it does not apply)\n`
  writeFileSync(abs, `${text.replace(/\s*$/, '')}\n\n${entry}`)
  return entry
}

const norm = (s) => String(s).replace(/`/g, '').replace(/\s+/g, ' ').trim().toLowerCase()

/** True when a `[human]` line of the plan holds the card wording. */
function hasCardItem(planText, card) {
  const want = norm(card)
  return String(planText).split(/\r?\n/).some((l) => /\[human\]/i.test(l) && norm(l).includes(want))
}

/** Reads the `## Defaults` rows: [{ id, kind: 'applies' | 'exception' | '', how, why }] and the lines the rows broke. */
export function defaultsRows(planText) {
  const s = sectionRows(planText, 'Defaults', ['id', 'kind', 'how', 'why'])
  const rows = []
  const problems = s.errors.slice()
  for (const r of s.rows) {
    if (r.none) continue
    let id = r.id.replace(/`/g, '').trim()
    let kind = r.kind.replace(/`/g, '').trim().toLowerCase()
    const m = id.match(/^(\S+)\s+—\s+(\S+)$/)
    if (m) { id = m[1]; kind ||= m[2].toLowerCase() }
    rows.push({ id, kind, how: r.how, why: r.why })
  }
  return { present: s.present, rows, problems }
}

/** The gate. Returns { ok, lines }. */
export function checkPlanDefaults({ planText, contract }) {
  if (!contract) return { ok: true, lines: ['DEFAULTS: skipped (no contract)'] }
  if (contract.errors.length) return { ok: false, lines: contract.errors.map((e) => `DEFAULTS: bad contract — ${e}`) }
  const byId = new Map(contract.entries.map((e) => [e.id, e]))
  const { rows, problems: sectionProblems } = defaultsRows(planText)
  const bad = sectionProblems.map((p) => `  ${p}`)
  const exceptions = []
  const missing = []
  const cards = []
  const seen = new Map()
  for (const r of rows) {
    if (!byId.has(r.id)) { bad.push(`  unknown default "${r.id}" — not a ### heading in the contract`); continue }
    if (r.kind !== 'applies' && r.kind !== 'exception') { bad.push(`  ${r.id}: the row must say "applies" or "exception"`); continue }
    seen.set(r.id, r)
    if (r.kind === 'exception') {
      if (PLACEHOLDER_RE.test(r.why)) bad.push(`  ${r.id}: an exception row needs "why: <one line>"`)
      else exceptions.push(`DEFAULTS: exception ${r.id} — ${r.why}`)
    }
  }
  for (const e of triggered(planText, contract.entries)) {
    const row = seen.get(e.id)
    if (!row) missing.push(`DEFAULTS: missing ${e.id} — the plan triggers it (${e.trigger}); add "- ${e.id} — applies — how: ${e.how}" or "- ${e.id} — exception — why: <one line>" under ## Defaults`)
    else if (row.kind === 'applies' && isCardCheck(e) && !hasCardItem(planText, e.card)) cards.push(`DEFAULTS: card missing — add: [human] ${e.card}\n  (${e.id})`)
  }
  const problems = [...(bad.length ? ['DEFAULTS: bad', ...bad] : []), ...missing, ...cards]
  if (problems.length) return { ok: false, lines: [...problems, ...exceptions] }
  return { ok: true, lines: ['DEFAULTS: ok', ...exceptions] }
}

/** CLI entry for `scope-check.mjs --defaults --plan=<p> [--contract=<path>]`. Prints, returns the exit code. */
export function runDefaultsCheck({ args, repoRoot }) {
  if (!args.plan || args.plan === true) {
    console.error('SCOPE_CHECK: --defaults needs --plan=<path>')
    return 1
  }
  const planPath = String(args.plan).replace(/\\/g, '/')
  const planAbs = isAbsolute(planPath) ? planPath : join(repoRoot, planPath)
  if (!existsSync(planAbs)) {
    console.error(`SCOPE_CHECK: plan not found: ${planPath}`)
    return 1
  }
  const contract = readContract(repoRoot, args.contract && args.contract !== true ? String(args.contract) : CONTRACT_PATH)
  const r = checkPlanDefaults({ planText: readFileSync(planAbs, 'utf8'), contract })
  for (const l of r.lines) console.log(l)
  return r.ok ? 0 : 1
}
