/**
 * Merge guard — `node scripts/lib/guard.mjs merge`, a Bash PreToolUse hook.
 *
 * A `gh pr merge` runs only when both hold:
 *   1. the Human's own latest chat message says yes — `merge it`, `merge <n>` / `merge #<n>`, just `merge`, or
 *      `/ship … merge` — or any Human message of the session says "merges pre-approved";
 *   2. every check on the PR passed (`gh pr checks <pr> --json name,bucket`: each bucket pass or skipping).
 * Otherwise it is refused with one `MERGE_GUARD:` line and no dialog. What it cannot read (no transcript, a transcript
 * format it does not know, gh failing, a PR with no checks) falls back to the permission dialog (`ask`): a failure never
 * merges and never blocks forever. With the yes and green checks, a merge chained to another command (only a leading
 * `cd <plain path> &&` is accepted) is refused with a "rerun it plain" line instead of a dialog.
 *
 * A Human message is a transcript entry of `type: "user"` with `origin.kind: "human"` (or a typed slash command), never
 * `isMeta`, never a `tool_result`. Reminders, notifications, agent messages and pasted text inside it are removed before
 * matching, so only words the Human typed count.
 *
 * Output: one JSON decision on stdout in both formats (Cursor `permission`, Claude Code `hookSpecificOutput`); no
 * output for a command that is not a merge. Exit code is always 0. KIT_GH_BIN (tests) replaces the gh binary.
 */
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

const VALUE_FLAGS = new Set(['-R', '--repo', '-b', '--body', '-F', '--body-file', '-t', '--subject', '-A', '--author-email', '--match-head-commit'])

/** Shell words of one simple command (quotes kept together, quotes removed). */
function words(part) {
  const out = []
  const re = /"((?:[^"\\]|\\.)*)"|'([^']*)'|(\S+)/g
  let m
  while ((m = re.exec(part))) out.push(m[1] ?? m[2] ?? m[3])
  return out
}

/** Every `gh pr merge` in a command line: [{ selector, pr, repo, auto }]. */
export function mergeTargets(command) {
  const found = []
  for (const part of String(command || '').split(/&&|\|\||;|\||\r?\n/)) {
    let w = words(part.trim())
    // Leading `env [-u NAME] [NAME=value]` and `NAME=value` prefixes.
    if (w[0] === 'env') {
      w = w.slice(1)
      while (w.length && (w[0] === '-u' || /^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0]))) w = w.slice(w[0] === '-u' ? 2 : 1)
    }
    while (w.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(w[0])) w = w.slice(1)
    if (!w.length || !/(^|[\\/])gh(\.exe)?$/i.test(w[0]) || w[1] !== 'pr' || w[2] !== 'merge') continue
    let selector = null
    let repo = null
    let auto = false
    for (let i = 3; i < w.length; i++) {
      const a = w[i]
      if (a === '-R' || a === '--repo') repo = w[++i] ?? null
      else if (a.startsWith('--repo=')) repo = a.slice(7)
      else if (VALUE_FLAGS.has(a)) i++
      else if (a === '--auto') auto = true
      else if (!a.startsWith('-') && selector === null) selector = a
    }
    const pr = selector && /^#?\d+$/.test(selector) ? Number(selector.replace('#', '')) : selector && /\/pull\/(\d+)/.test(selector) ? Number(selector.match(/\/pull\/(\d+)/)[1]) : null
    found.push({ selector, pr, repo, auto })
  }
  return found
}

const textOf = (content) =>
  typeof content === 'string' ? content : Array.isArray(content) ? content.filter((b) => b && b.type === 'text').map((b) => b.text || '').join('\n') : ''

/**
 * The texts of the Human's own messages, oldest first, or null when the transcript is in a format the guard cannot
 * read (no entry carries an origin and none is a typed slash command).
 */
export function humanMessages(transcriptText) {
  if (typeof transcriptText !== 'string') return null
  const out = []
  let known = false
  for (const line of transcriptText.split(/\r?\n/)) {
    if (!line.trim()) continue
    let e
    try {
      e = JSON.parse(line)
    } catch {
      continue
    }
    if (e.origin) known = true
    if (e.type !== 'user' || e.isMeta) continue
    const c = e.message?.content
    if (Array.isArray(c) && c.some((b) => b && b.type === 'tool_result')) continue
    const text = textOf(c)
    const slash = !e.origin && /^\s*<command-name>\//.test(text)
    if (slash) known = true
    if (e.origin ? e.origin.kind !== 'human' : !slash) continue
    out.push(text)
  }
  return known ? out : null
}

const INJECTED = /<(system-reminder|task-notification|agent-message|pasted_content|local-command-stdout|local-command-caveat)\b[^>]*>[\s\S]*?<\/\1[^>]*>/gi
const clean = (t) => String(t).replace(INJECTED, ' ')

/** Did the Human say yes to merging PR `pr`? `texts` are the Human's messages, oldest first. */
export function humanYes(texts, pr) {
  const all = texts.map(clean)
  if (all.some((t) => /\bmerges?\s+(are\s+)?pre-?approved\b/i.test(t))) return true
  const last = all.at(-1)
  if (last === undefined) return false
  if (/\b(don'?t|do not|never|not|no)\s+merge\b/i.test(last)) return false
  if (/<command-name>\/ship<\/command-name>[\s\S]*<command-args>[^<]*\bmerge\b/i.test(last)) return true
  if (/<command-name>/.test(last)) return false
  if (/\bmerge\s+it\b/i.test(last) || /^\s*merge\s*[.!]?\s*$/i.test(last)) return true
  return pr != null && new RegExp(`\\bmerge\\s+#?${pr}\\b`, 'i').test(last)
}

/** gh pr checks rows → { ok: true, count } | { ok: false, name, bucket } | { ok: null } (no checks). */
export function checksVerdict(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return { ok: null }
  const bad = rows.find((r) => r.bucket !== 'pass' && r.bucket !== 'skipping')
  return bad ? { ok: false, name: bad.name, bucket: bad.bucket } : { ok: true, count: rows.length }
}

const ask = (reason) => ({ decision: 'ask', reason: `MERGE_GUARD: ${reason} — asking instead` })

/**
 * The decision for one hook input: { decision: 'allow' | 'deny' | 'ask', reason } or null (not a merge).
 * `gh(args)` returns { status, stdout, stderr }.
 */
export function decide({ input, transcriptText, gh }) {
  if (input?.tool_name && input.tool_name !== 'Bash') return null
  const targets = mergeTargets(input?.tool_input?.command)
  if (!targets.length) return null
  const texts = humanMessages(transcriptText)
  if (!texts) return ask('cannot read this session\'s transcript')
  let first = null
  for (const t of targets) {
    const repoArgs = t.repo ? ['-R', t.repo] : []
    let pr = t.pr
    if (pr == null) {
      const v = gh(['pr', 'view', ...(t.selector ? [t.selector] : []), ...repoArgs, '--json', 'number', '-q', '.number'])
      pr = v.status === 0 && /^\d+$/.test(String(v.stdout).trim()) ? Number(String(v.stdout).trim()) : null
      if (pr == null) return ask('cannot find the pull request number')
    }
    if (!humanYes(texts, pr)) return { decision: 'deny', reason: `MERGE_GUARD: no merge yes from the Human in this session for PR ${pr} — the Human replies \`merge it\` (or \`merge ${pr}\`) first` }
    const c = gh(['pr', 'checks', String(pr), ...repoArgs, '--json', 'name,bucket'])
    let parsed
    try {
      parsed = JSON.parse(String(c.stdout || ''))
    } catch {
      return ask(`cannot read the checks of PR ${pr}${c.stderr ? ` (${String(c.stderr).trim().split('\n')[0]})` : ''}`)
    }
    const v = checksVerdict(parsed)
    if (v.ok === null) return ask(`PR ${pr} reports no checks`)
    if (!v.ok) return { decision: 'deny', reason: `MERGE_GUARD: PR ${pr} check ${v.name} is ${v.bucket} — merge after every check passed` }
    first ??= { decision: 'allow', reason: `MERGE_GUARD: Human yes + ${v.count} checks passed on PR ${pr}` }
  }
  // An allow approves the whole Bash command: only one plain `gh pr merge` may get it (a leading `cd <plain path> &&`
  // is harmless and dropped first). Anything else chained, piped, substituted or redirected is refused with a line
  // that tells the agent to rerun the merge on its own — never the dialog: the Human already said yes.
  if (first && !singleSimpleCommand(stripLeadingCd(input.tool_input.command))) {
    const n = targets[0].pr ?? ''
    return { decision: 'deny', reason: `MERGE_GUARD: run \`gh pr merge ${n}\` on its own (it is chained, substituted or redirected) — rerun it plain` }
  }
  return first
}

/**
 * Drops leading `cd <path> &&` parts whose path is one plain word or one quoted string with no `$`, backtick, `\`,
 * `;|&<>()` or newline in it. Anything else is left as it is (singleSimpleCommand then rejects it).
 */
export function stripLeadingCd(command) {
  let s = String(command || '').trim()
  const CD = /^cd[ \t]+("[^"$`\\;|&<>()\r\n]*"|'[^'$`\\;|&<>()\r\n]*'|[^\s"'$`\\;|&<>()]+)[ \t]*&&[ \t]*/
  for (let m = s.match(CD); m; m = s.match(CD)) s = s.slice(m[0].length)
  return s
}

/** True when `command` is one simple command: no ; & | < > ( ) newline or backtick outside quotes, no $( anywhere. */
export function singleSimpleCommand(command) {
  const s = String(command || '').trim()
  let q = null
  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (q === "'") {
      if (c === "'") q = null
      continue
    }
    if (c === '\\') {
      i++
      continue
    }
    if (c === '$' && s[i + 1] === '(') return false
    if (c === '`') return false
    if (q === '"') {
      if (c === '"') q = null
      continue
    }
    if (c === '"' || c === "'") q = c
    else if (/[;&|<>()\r\n]/.test(c)) return false
  }
  return q === null
}

function emit({ decision, reason }) {
  const esc = JSON.stringify(reason || '')
  process.stdout.write(`{"permission":"${decision}","agent_message":${esc},"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"${decision}","permissionDecisionReason":${esc}}}\n`)
}

function readStdin(ms) {
  return new Promise((done) => {
    let buf = ''
    const t = setTimeout(() => done(buf), ms)
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', (d) => (buf += d))
    process.stdin.on('end', () => {
      clearTimeout(t)
      done(buf)
    })
  })
}

/** The hook: read the input, decide, print. Any error falls back to the dialog. */
export async function runMergeGuard() {
  let result = null
  try {
    const input = JSON.parse((await readStdin(2000)) || '{}')
    if (!mergeTargets(input?.tool_input?.command).length) return
    let transcriptText = null
    try {
      if (input.transcript_path) transcriptText = readFileSync(input.transcript_path, 'utf8')
    } catch {}
    const bin = process.env.KIT_GH_BIN || 'gh'
    const gh = (args) => {
      const [cmd, pre] = /\.m?js$/i.test(bin) ? [process.execPath, [bin]] : [bin, []]
      const r = spawnSync(cmd, [...pre, ...args], { cwd: input.cwd || process.cwd(), encoding: 'utf8', timeout: 12000, windowsHide: true })
      return { status: r.status, stdout: r.stdout || '', stderr: r.stderr || (r.error ? String(r.error.message) : '') }
    }
    result = decide({ input, transcriptText, gh })
  } catch (e) {
    result = ask(`could not check this merge (${e.message})`)
  }
  if (result) emit(result)
}
