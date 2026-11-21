// The plan-name rule for an Edit/Write of plans/*.plan.md (was plan-write-guard.sh's own logic; now node, so a hook
// needs no Git Bash start and no extra process). Same verdicts and messages as the shell script had.
// A new plan's file name stays short; a new plan with name-similar plans is refused unless .claude/.plan-write-ack
// names it (the ack is consumed); an existing plan is always allowed. Unreadable input is allowed (fail open).
import { existsSync, readFileSync, unlinkSync } from 'node:fs'
import { isAbsolute } from 'node:path'

export const MAX_PLAN_NAME = 100
const allow = (msg = '') => ({ decision: 'allow', msg })
const deny = (msg) => ({ decision: 'deny', msg })

/** The path an Edit/Write/MultiEdit input names ('' when none); falls back to a plans/…plan.md text in the raw input. */
export function editPath(raw) {
  let path = ''
  try {
    const d = JSON.parse(raw)
    const ti = d.tool_input || d.input || d
    if (ti && typeof ti === 'object' && !Array.isArray(ti)) {
      path = ti.file_path || ti.path || ti.filePath || ''
      if (!path && Array.isArray(ti.edits) && ti.edits.length) path = ti.edits[0].file_path || ti.edits[0].path || ''
    }
  } catch {}
  if (!path) {
    const m = String(raw).match(/plans[\/\\][\w.\/\\-]+\.plan\.md/)
    path = m ? m[0] : ''
  }
  return String(path)
}

/** `similarity(rel)` returns the text of scripts/plan-name-similarity.mjs for that plan path. */
export function editPlanDecision(input, repo, similarity) {
  if (!String(input || '').trim()) return allow()
  const file = editPath(input)
  const norm = file.replace(/\\/g, '/')
  if (!/plans\/.+\.plan\.md$/.test(norm)) return allow()
  const abs = isAbsolute(file) || /^[A-Za-z]:/.test(file) ? file : `${repo}/${file}`
  const absNorm = abs.replace(/\\/g, '/')
  const name = norm.slice(norm.lastIndexOf('/') + 1)
  if (!existsSync(abs) && name.length > MAX_PLAN_NAME) {
    return deny(`PLAN_WRITE_GUARD: the plan file name is ${name.length} characters; keep it at ${MAX_PLAN_NAME} or fewer (NNN-<short-slug>.plan.md). The H1 title can stay long. Long paths break a Windows clone of the repo (260-character limit).`)
  }
  const ackFile = `${repo}/.claude/.plan-write-ack`
  if (existsSync(ackFile)) {
    let ack = ''
    try {
      ack = readFileSync(ackFile, 'utf8').replace(/[\r\n]/g, '').replace(/\\/g, '/')
    } catch {}
    if (ack && (absNorm.endsWith(ack) || ack.includes(norm) || norm.endsWith(ack))) {
      try {
        unlinkSync(ackFile)
      } catch {}
      return allow(`PLAN_WRITE_GUARD: ack consumed - write allowed for ${norm}`)
    }
  }
  if (existsSync(abs)) return allow(`PLAN_WRITE_GUARD: editing existing plan ${norm} - keep Atomic Sub-tasks in sync with .claude/todo.md`)
  const m = norm.match(/(plans\/.*\.plan\.md)/)
  const rel = m ? m[1] : norm
  const out = similarity(rel) || ''
  if (out.includes('no similar plans')) return allow('PLAN_WRITE_GUARD: no similar plans - new file OK. Prefer save-plan skill (ledger sync).')
  if (out.includes('similar plan')) {
    return deny(`PLAN_WRITE_GUARD: blocked new plan write - similar plan(s) exist. Run: node scripts/plan-name-similarity.mjs --file=${rel} then ask Human: rewrite existing / save as new / cancel. On save-as-new: write the relative path to .claude/.plan-write-ack then retry Write. On rewrite: Edit the existing plan path instead.\n${out}`)
  }
  return allow('PLAN_WRITE_GUARD: could not run similarity check - follow .claude/skills/save-plan/SKILL.md before writing plans/')
}
