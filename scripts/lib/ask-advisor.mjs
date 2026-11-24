/**
 * The run's advisor: plain rules, no model call, that answer a low-risk ask so the run goes on, and the
 * weakened-test flag for the report. The Human validates at the end, before the merge into main; every advisor answer is
 * listed in the report's "Decided without you" section with how to undo it. A `humanOnly` ask is never answered here.
 *
 *   import { adviseAsk, advisorOff, weakenedTest } from './lib/ask-advisor.mjs'
 */

/** At most this many paths the advisor adds to one plan's scope in one run; the next scope ask goes to the Human. */
export const ADVISOR_MAX_PATHS = 5

/** A plan opts out with an `Advisor: off` line (its `## Execution Mode`, or anywhere in the plan). */
export function advisorOff(planText) {
  return /^\s*(?:[-*]\s*)?Advisor:\s*off\b/im.test(String(planText ?? ''))
}

// Paths the advisor never grants: secrets, dependencies, CI and hooks, migrations, other plans, the Human's decisions.
const DENY = [
  [/(^|\/)\.env(\.|$)/i, 'an environment file'],
  [/(^|\/)package\.json$/i, 'package.json (dependencies)'],
  [/(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|npm-shrinkwrap\.json)$/i, 'a lockfile'],
  [/^\.github\//i, 'a CI workflow'],
  [/^\.husky\//i, 'a git hook'],
  [/(^|\/)migrations?\//i, 'a database migration'],
  [/^plans\//i, 'a plan file'],
  [/^docs\/brain\/(invariants\.md|human-decisions\.md|decisions\/)/i, 'an architecture rule or a Human decision'],
]
/** Why the advisor will not add `path` to a plan's scope, or null when it may. */
export function scopePathProblem(path, { isSensitive = () => false } = {}) {
  const p = String(path ?? '').trim().replace(/\\/g, '/')
  if (!p) return 'an empty path'
  if (/^[a-z]:|^\//i.test(p) || p.split('/').includes('..')) return 'outside the repository'
  // A glob could reach a denied file (`docs/brain/*.md` covers the invariants): only named files are granted.
  if (/[*?[\]{}]/.test(p)) return 'a glob (only named files are granted)'
  for (const [re, why] of DENY) if (re.test(p)) return why
  if (isSensitive(p)) return 'a sensitive path'
  return null
}

const optionStarting = (ask, prefix) => (Array.isArray(ask.options) ? ask.options : []).find((o) => String(o).toLowerCase().startsWith(prefix))
const PARK = 'park: leave the plan parked for the Human to replan'

/**
 * The advisor's answer to one ask, or null (the Human answers). `paths`: the project paths the scope ask names;
 * `granted`: paths the advisor already added to this plan in this run; `used`: { technical, review } advisor answers this
 * plan already got in this run; `off`: the plan or the run turned the advisor off.
 * Returns { option, why, undo } — `option` is written as the answer, exactly like a Human's.
 */
export function adviseAsk(ask, { paths = [], granted = 0, used = {}, off = false, isSensitive = () => false } = {}) {
  if (!ask || off || ask.humanOnly) return null
  if (ask.kind === 'scope') {
    const list = [...new Set(paths.map((p) => String(p).trim().replace(/\\/g, '/')).filter(Boolean))]
    if (!list.length) return null
    for (const p of list) if (scopePathProblem(p, { isSensitive })) return null
    if (granted + list.length > ADVISOR_MAX_PATHS) return null
    return {
      option: `approved: ${list.join(', ')}`,
      why: `scope: ${list.length} path(s) inside the repo, none sensitive (${granted + list.length} of ${ADVISOR_MAX_PATHS} for this plan)`,
      undo: `before merge it: on the run branch, git checkout origin/main -- ${list.join(' ')} (drops the plan's change to ${list.length === 1 ? 'that file' : 'those files'}), commit, push`,
    }
  }
  if (ask.kind === 'technical') {
    // INV-1 (ADR 0016): once the judgment-tier builder has failed, the plan stops for the Human — no third builder.
    const c = ask.context ?? {}
    if (c.escalated === true || c.tier === 'judgment' || /needs the Human|fix rounds used/i.test(String(c.reason ?? ''))) {
      return { option: optionStarting(ask, 'park:') ?? PARK, why: 'technical: the judgment-tier builder already failed — INV-1: no third builder, parked for the Human', undo: 'replan it, or answer with a new approach and relaunch the run' }
    }
    if ((used.technical ?? 0) >= 1) return { option: optionStarting(ask, 'park:') ?? PARK, why: 'technical: the advisor already gave this plan its one retry in this run — parked', undo: 'replan it, or answer with a new approach and relaunch the run' }
    return { option: optionStarting(ask, 'retry:') ?? 'retry: a fresh judgment-tier builder with the hand-off and this answer', why: 'technical: one retry on the judgment tier with the hand-off', undo: 'nothing to undo: the retry is checked by the same gate and review; a second failure parks' }
  }
  if (ask.kind === 'review') {
    if ((used.review ?? 0) >= 1) return { option: optionStarting(ask, 'park:') ?? PARK, why: 'review: the review could not run again — parked', undo: 'run /review-it on the park branch, or relaunch the run' }
    return { option: optionStarting(ask, 'review again:') ?? 'review again: the gate and the review run again on the saved commits', why: 'review: one more gate and review on the same commits', undo: 'nothing to undo: no code changes' }
  }
  if (ask.kind === 'environment') {
    // A setup problem the run already tried to heal: one retry when the ask offers one, then park. Parking stops only
    // this plan; the rest of the run goes on. Something only the Human can supply (a login in .env) has no retry: park.
    const retry = optionStarting(ask, 'retry:')
    if (retry && (used.environment ?? 0) < 1) return { option: retry, why: "environment: one retry after the run's own repair", undo: 'nothing to undo: the retry is checked by the same gate; a second failure parks' }
    return { option: optionStarting(ask, 'park:') ?? PARK, why: retry ? 'environment: the same setup problem came back after the retry — parked' : 'environment: nothing the run can retry (a setup only the Human can give) — parked, the rest of the run goes on', undo: 'fix the setup (the ask names it), then relaunch the run' }
  }
  return null
}

/** The report groups of "Decided without you", in report order, matched on a row's kind. */
const GROUPS = [
  ['questions up front', /readiness/],
  ['scope', /scope/],
  ['retry or park', /technical|review/],
  ['environment', /environment/],
  ['written a different way', /written a different way|plan file copied/],
  ['tests that check less', /test changed/],
]
const groupOf = (kind) => (GROUPS.find(([, re]) => re.test(String(kind ?? ''))) ?? ['other'])[0]

/**
 * The report's "## Decided without you" lines from status.selfDecided ({ plan, kind, what, why, undo }), grouped by
 * kind: one line per decision, its reason and how to undo it; a run that decided nothing says so.
 */
export function selfDecidedSection(rows) {
  const list = Array.isArray(rows) ? rows : []
  const out = ['## Decided without you', '']
  if (!list.length) return [...out, 'none — every question in this run went to the Human, or none came up.']
  out.push(`${list.length} decision(s) the run made itself. Read them before \`merge it\`; each says how to undo it.`)
  for (const name of [...GROUPS.map(([n]) => n), 'other']) {
    const group = list.filter((r) => groupOf(r.kind) === name)
    if (!group.length) continue
    out.push('', `### ${name[0].toUpperCase()}${name.slice(1)} (${group.length})`, '')
    for (const r of group) {
      out.push(`- plan ${r.plan || '—'} · ${r.kind}: ${r.what}`)
      if (r.why) out.push(`  - why: ${r.why}`)
      if (r.undo) out.push(`  - undo: ${r.undo}`)
    }
  }
  return out
}

/** The checks in a test file's text: `assert…(`, `expect(`, `t.assert…(`, `should.` calls. */
export function assertionCount(text) {
  return (String(text ?? '').match(/\b(?:assert(?:\.\w+)?|expect|t\.assert(?:\.\w+)?)\s*\(|\.should\./g) ?? []).length
}
const SKIP_RE = /\b(?:it|test|describe)\.(?:skip|only|todo)\s*\(|\bx(?:it|describe)\s*\(|\{\s*(?:skip|todo)\s*:\s*true/g
/**
 * An existing test the plan made weaker: fewer checks than before, or a skip/only/todo it added. Returns
 * { before, after, added } (added: the new skip-like markers) or null.
 */
export function weakenedTest(beforeText, afterText) {
  const before = assertionCount(beforeText)
  const after = assertionCount(afterText)
  const count = (t) => (String(t ?? '').match(SKIP_RE) ?? []).length
  const added = Math.max(0, count(afterText) - count(beforeText))
  return after < before || added ? { before, after, added } : null
}
