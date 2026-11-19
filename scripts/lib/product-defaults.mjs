/**
 * The project's product defaults: behaviours decided once (docs/project/product-defaults.md, `paths.productDefaults`).
 *
 *   parseContract(text) → { entries: [{ id, status, rule, trigger, words, how, check, card, exceptions }], errors: [] }
 *   ruleData(check) → the diff-rule data of a `check` line (`files: <globs>; trigger: <regex>; evidence: <regex>; in: <globs>`),
 *                     or null for a card or prose check; throws a plain reason for a bad regex or glob
 *   appendProposed({ root, id, rule, trigger, how }) → adds one `proposed` entry (the `propose` command)
 *   addEntry({ root, id, rule, trigger, words, how, check, card, status }) → one full entry, `on` with `turned on` (`add`)
 *   turnOn({ root, id }) → an existing entry becomes `on` with `turned on` (`on`)
 *   addRemark({ root, tag, text, source, branch }) → one remark in docs/brain/remarks/, and the noted / suggest line
 *   triggeredProposed(planText, entries) → the `proposed` entries a plan triggers (a question before the build)
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
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, appendFileSync } from 'node:fs'
import { join, isAbsolute, dirname } from 'node:path'
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
/** A project's own trigger: `applies when: custom` matches a plan by its own `plan words` (required then). */
export const CUSTOM_TRIGGER = 'custom'
const knownTrigger = (t) => t in TRIGGERS || t === CUSTOM_TRIGGER
const FIELDS = ['status', 'rule', 'applies when', 'plan words', 'how', 'check', 'card', 'exceptions', 'turned on']
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
    if (!knownTrigger(f['applies when'])) bad('applies when', `"${f['applies when'] ?? ''}" is not one of ${[...Object.keys(TRIGGERS), CUSTOM_TRIGGER].join(', ')}`)
    else if (f['applies when'] === CUSTOM_TRIGGER && !f['plan words']) bad('plan words', 'required for applies when: custom (a RegExp the plan text is matched against)')
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
      onBy: f['turned on'] ?? '',
    })
  }
  return { entries, errors }
}

export const isCardCheck = (e) => /^card\b/i.test(e.check)

/** The text of the plan the trigger words are matched against. */
export function planBody(planText) {
  return PLAN_SECTIONS.map((h) => sectionBody(planText, h) ?? '').join('\n')
}

const triggers = (body, e) => new RegExp(e.words || TRIGGERS[e.trigger] || '$^', 'i').test(body)

/** The `on` entries a plan triggers. */
export function triggered(planText, entries) {
  const body = planBody(planText)
  return entries.filter((e) => e.status === 'on' && triggers(body, e))
}

/** The `proposed` entries a plan triggers: each is a question for the Human before the plan is built. */
export function triggeredProposed(planText, entries) {
  const body = planBody(planText)
  return entries.filter((e) => e.status === 'proposed' && triggers(body, e))
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
  if (!(trigger in TRIGGERS)) throw new Error(`trigger "${trigger ?? ''}" is not one of ${Object.keys(TRIGGERS).join(', ')} (a custom trigger: use add --trigger custom --words)`)
  const oneLine = String(rule ?? '').replace(/\s+/g, ' ').trim()
  if (!oneLine) throw new Error('rule is empty — pass --rule "<one sentence>"')
  if (parseContract(text).entries.some((e) => e.id === id)) throw new Error(`default "${id}" already exists`)
  const piece = String(how ?? '').replace(/\s+/g, ' ').trim() || '(name the shared piece when it is turned on)'
  const entry = `### ${id}\n\n- status: proposed\n- rule: ${oneLine}\n- applies when: ${trigger}\n- how: ${piece}\n- check: (set when it is turned on — card, or the rule data of a diff check)\n- exceptions: (say where it does not apply)\n`
  writeFileSync(abs, `${text.replace(/\s*$/, '')}\n\n${entry}`)
  return entry
}

const one = (s) => String(s ?? '').replace(/\s+/g, ' ').trim()

/**
 * Writes one full entry (the Human's `default yes`, "make this a default" or `/default`): `status` on, off or proposed;
 * an `on` entry gets `turned on: <by>, <date>`. Creates the contract when it is missing. Throws a plain reason, writing
 * nothing, for a bad id, an id the contract has, an unknown trigger, custom without plan words, or an empty rule or how.
 * Returns the parsed entry.
 */
export function addEntry({ root, id, rule, trigger, words = '', how, check = '', card = '', exceptions = '', status = 'on', by = 'the Human', date, path = CONTRACT_PATH }) {
  const abs = isAbsolute(path) ? path : join(root, path)
  const text = existsSync(abs) ? readFileSync(abs, 'utf8') : '# Product defaults\n'
  if (!/^[a-z0-9][a-z0-9-]*$/.test(String(id ?? ''))) throw new Error(`id "${id ?? ''}" — use lower-case words joined with -`)
  if (!STATUSES.includes(status)) throw new Error(`status "${status}" is not one of ${STATUSES.join(', ')}`)
  if (!knownTrigger(trigger)) throw new Error(`trigger "${trigger ?? ''}" is not one of ${[...Object.keys(TRIGGERS), CUSTOM_TRIGGER].join(', ')}`)
  if (trigger === CUSTOM_TRIGGER && !one(words)) throw new Error('a custom trigger needs --words "<RegExp the plan text is matched against>"')
  if (!one(rule)) throw new Error('rule is empty — pass --rule "<one sentence>"')
  if (!one(how)) throw new Error('how is empty — pass --how "<the shared piece or file that does it>"')
  if (status === 'on' && !one(check) && !one(card)) throw new Error('an on default needs --check "<files: …>" or --card "<page · action · result>"')
  if (parseContract(text).entries.some((e) => e.id === id)) throw new Error(`default "${id}" already exists`)
  const lines = [`### ${id}`, '', `- status: ${status}`, `- rule: ${one(rule)}`, `- applies when: ${trigger}`]
  if (one(words)) lines.push(`- plan words: ${one(words)}`)
  lines.push(`- how: ${one(how)}`, `- check: ${one(check) || (one(card) ? 'card' : '(set the card or the rule data of a diff check)')}`)
  if (one(card)) lines.push(`- card: ${one(card)}`)
  lines.push(`- exceptions: ${one(exceptions) || '(say where it does not apply)'}`)
  if (status === 'on') lines.push(`- turned on: ${one(by)}, ${date ?? new Date().toISOString().slice(0, 10)}`)
  const next = `${text.replace(/\s*$/, '')}\n\n${lines.join('\n')}\n`
  const parsed = parseContract(next)
  const bad = parsed.errors.filter((e) => e.startsWith(`${id}:`))
  if (bad.length) throw new Error(bad.join('; '))
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, next)
  return parsed.entries.find((e) => e.id === id)
}

/**
 * Turns an existing entry on (the Human's yes): its `status` line becomes `on` and a `turned on: <by>, <date>` line is set.
 * Refuses an unknown id or an entry already on, and touches no other entry. Returns the parsed entry.
 */
export function turnOn({ root, id, by = 'the Human', date, how = '', check = '', card = '', path = CONTRACT_PATH }) {
  const stamp = `${one(by)}, ${date ?? new Date().toISOString().slice(0, 10)}`
  return editEntry({ root, id, path, want: 'on', set: { how, check: one(check) || (one(card) ? 'card' : ''), card, 'turned on': stamp } })
}

/** Turns an existing entry off (the Human's `default off` / `default no` to a proposed one). Refuses an unknown id. */
export function turnOff({ root, id, path = CONTRACT_PATH }) {
  return editEntry({ root, id, path, want: 'off', set: {} })
}

const isPlaceholder = (v) => !one(v) || /^\(/.test(one(v))

/**
 * Rewrites one `### <id>` section only (bounded by the next `###`): its status becomes `want`, and each non-empty `set`
 * field replaces or adds that field. An `on` result must name a real `how` and a card or rule `check`, not the
 * placeholder `propose` writes. Writes nothing on a refusal. Returns the parsed entry.
 */
function editEntry({ root, id, path, want, set }) {
  const abs = isAbsolute(path) ? path : join(root, path)
  if (!existsSync(abs)) throw new Error(`no contract at ${path}`)
  const text = readFileSync(abs, 'utf8')
  const e = parseContract(text).entries.find((x) => x.id === id)
  if (!e) throw new Error(`no default "${id}" in ${path}`)
  if (e.status === want) throw new Error(`default "${id}" is already ${want}`)
  const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(^###\\s+${esc}[ \\t]*\\r?\\n)([\\s\\S]*?)(?=^###\\s|(?![\\s\\S]))`, 'm')
  const m = re.exec(text)
  if (!m || !/^[-*]\s+status\s*:/m.test(m[2])) throw new Error(`default "${id}" has no status line — fix the entry by hand first`)
  let b = m[2].replace(/^[-*]\s+status\s*:.*$/m, `- status: ${want}`)
  for (const [k, v] of Object.entries(set)) {
    if (!one(v)) continue
    const line = new RegExp(`^[-*]\\s+${k}\\s*:.*$`, 'mg')
    // A field written twice (a card line and a rule line) keeps one: the new value.
    b = line.test(b) ? b.replace(line, '\u0000').replace('\u0000', `- ${k}: ${one(v)}`).replace(/^\u0000\r?\n?/gm, '') : `${b.replace(/\s*$/, '')}\n- ${k}: ${one(v)}\n\n`
  }
  const next = `${text.slice(0, m.index)}${m[1]}${b}${text.slice(m.index + m[0].length)}`.replace(/\n{3,}/g, '\n\n').replace(/\s*$/, '\n')
  const after = parseContract(next)
  const got = after.entries.find((x) => x.id === id)
  const bad = after.errors.filter((x) => x.startsWith(`${id}:`))
  if (bad.length) throw new Error(bad.join('; '))
  if (want === 'on' && (isPlaceholder(got.how) || isPlaceholder(got.check))) {
    throw new Error(`default "${id}" needs a real how and check before it is on — pass --how "<piece>" and --check "<files: …>" or --card "<page · action · result>"`)
  }
  writeFileSync(abs, next)
  return got
}

// ---- remarks: the Human's repeated corrections, kept in the brain (docs/brain/remarks/) --------------------------------
export const REMARKS_DIR = 'docs/brain/remarks'
/** How many times the same remark comes back before it is offered as a default (defaults.suggestAfter). */
export const SUGGEST_AFTER = Number(2) || 2
const slug = (s) => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'main'

/** Every remark in the folder: [{ date, branch, tag, text, source }] (a line that does not parse is skipped). */
export function readRemarks(root, dir = REMARKS_DIR) {
  const abs = join(root, dir)
  if (!existsSync(abs)) return []
  const out = []
  for (const f of readdirSync(abs).filter((n) => n.endsWith('.jsonl')).sort()) {
    for (const line of readFileSync(join(abs, f), 'utf8').split(/\r?\n/)) {
      if (!line.trim()) continue
      try { const r = JSON.parse(line); if (r && typeof r.tag === 'string') out.push(r) } catch { /* a broken line is skipped */ }
    }
  }
  return out
}

/**
 * Records one remark in `docs/brain/remarks/<date>-<branch>.jsonl` (one file per branch and day, so parallel slots never
 * edit the same file) and returns the line to print: `noted` below the threshold, `suggest` at or above it, `known`
 * when the contract already has a default with this id (on, proposed or off: asked once, never again).
 */
export function addRemark({ root, tag, text, source = 'chat', branch = 'main', date, threshold = SUGGEST_AFTER, dir = REMARKS_DIR, path = CONTRACT_PATH }) {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(String(tag ?? ''))) throw new Error(`tag "${tag ?? ''}" — use lower-case words joined with - (it becomes the default's id)`)
  if (!one(text)) throw new Error('text is empty — pass --text "<the Human\'s words>"')
  const day = date ?? new Date().toISOString().slice(0, 10)
  const abs = join(root, dir)
  mkdirSync(abs, { recursive: true })
  appendFileSync(join(abs, `${day}-${slug(branch)}.jsonl`), `${JSON.stringify({ date: day, branch, tag, text: one(text).slice(0, 400), source })}\n`)
  const count = readRemarks(root, dir).filter((r) => r.tag === tag).length
  const known = readContract(root, path)?.entries.find((e) => e.id === tag)
  if (known) return { count, kind: 'known', line: `DEFAULTS: noted ${tag} — already a default (${known.status}); not asked again` }
  if (count >= threshold) return { count, kind: 'suggest', line: `DEFAULTS: suggest ${tag} — ${count} times — reply: default yes ${tag} | default no ${tag}` }
  return { count, kind: 'noted', line: `DEFAULTS: noted ${tag} (${count} of ${threshold})` }
}

/**
 * A run's `behaviour:` decisions that repeat: two or more whose text matches the same trigger's words. Returns
 * [{ tag, trigger, count, rule }] — `rule` is the first decision's text, `tag` the remark tag (`run-<trigger>`).
 */
export function repeatedBehaviours(texts, known = []) {
  const skip = new Set(known)
  const groups = new Map()
  for (const t of texts ?? []) {
    const m = /^\s*behaviour:\s*([\s\S]+)$/i.exec(String(t))
    if (!m) continue
    const trigger = Object.keys(TRIGGERS).find((k) => new RegExp(TRIGGERS[k], 'i').test(m[1]))
    if (!trigger) continue
    if (!groups.has(trigger)) groups.set(trigger, [])
    groups.get(trigger).push(one(m[1]))
  }
  // A tag the contract already has (on, proposed or off) is never offered again.
  return [...groups].filter(([trigger, l]) => l.length >= 2 && !skip.has(`run-${trigger}`)).map(([trigger, l]) => ({ tag: `run-${trigger}`, trigger, count: l.length, rule: l[0].slice(0, 200) }))
}

/** The `proposed` defaults a plan triggers that its `## Defaults` does not answer: one readiness problem each. */
export function unansweredProposed(planText, contract) {
  if (!contract || contract.errors.length) return []
  const answered = new Set(defaultsRows(planText).rows.map((r) => r.id))
  return triggeredProposed(planText, contract.entries).filter((e) => !answered.has(e.id))
    .map((e) => `proposed ${e.id} triggered — answer: default yes ${e.id} | default no ${e.id} (${e.rule})`)
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
