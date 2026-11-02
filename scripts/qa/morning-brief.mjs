#!/usr/bin/env node
/**
 * SessionStart hook (plan 422): shows the nightly QA morning report's status line when Claude Code starts in the
 * main folder. Silent (exit 0, no output) in Worker slots (cwd has .worktree-root), when the report is missing or
 * older than yesterday, and on any error — it never blocks a session.
 *
 * QA folder: env FOODVIBE_QA_ROOT, default C:/dev/foodVibe-qa.
 */
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const DAY = 86400000
const localDate = (d) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** The hook output object for `md`, or null when it is not fresh (dated today or yesterday). */
export function briefFor(md, now = new Date()) {
  const date = /^# QA morning report — (\d{4}-\d{2}-\d{2})/m.exec(md)?.[1]
  if (!date || date < localDate(new Date(now.getTime() - DAY))) return null
  const status = /^Status:\s*(.+)$/m.exec(md)?.[1]?.trim()
  const doNow = /^Do now:\s*(.+)$/m.exec(md)?.[1]?.trim()
  if (!status || !doNow) return null
  return {
    systemMessage: `QA ${date}: ${status} — ${doNow}`,
    hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: md }
  }
}

export function main({ cwd = process.cwd(), env = process.env, now = new Date() } = {}) {
  try {
    if (existsSync(join(cwd, '.worktree-root'))) return null
    const file = join(env.FOODVIBE_QA_ROOT || 'C:/dev/foodVibe-qa', 'bugs', 'qa-runs', 'MORNING.md')
    if (!existsSync(file)) return null
    return briefFor(readFileSync(file, 'utf8'), now)
  } catch {
    return null
  }
}

if (process.argv[1] && import.meta.url.toLowerCase().endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop().toLowerCase())) {
  const out = main()
  if (out) process.stdout.write(JSON.stringify(out))
  process.exit(0)
}
