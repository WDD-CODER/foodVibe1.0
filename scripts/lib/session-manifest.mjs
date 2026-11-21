// PostToolUse: records an edited file to .claude/sessions/<branch>/manifest.txt (once) and refreshes a claimed slot's
// heartbeat. Was session-manifest-hook.py; now node, so a machine with no Python (a service account) still works.
// Never throws and never blocks: any problem is a silent no-op.
import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { join, normalize, relative } from 'node:path'
import { spawnSync } from 'node:child_process'

const gitOut = (cwd, ...args) => {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 4000, windowsHide: true })
  return r.status === 0 ? String(r.stdout).trim() : ''
}
const stamp = (d) => d.toISOString().replace(/\.\d+Z$/, 'Z')

/** Returns the repo-relative path recorded (or already recorded), or null when nothing was recorded. */
export function recordManifest(rawInput, cwd = process.cwd()) {
  try {
    const data = JSON.parse(rawInput)
    const ti = data.tool_input || data
    const filePath = ti && typeof ti.file_path === 'string' ? ti.file_path : ''
    if (!filePath) return null
    const repoRoot = gitOut(cwd, 'rev-parse', '--show-toplevel')
    if (!repoRoot) return null
    const root = normalize(repoRoot)
    const rel = relative(root, normalize(filePath)).replace(/\\/g, '/')
    if (rel.startsWith('..')) return null
    const branch = gitOut(cwd, 'branch', '--show-current')
    if (!branch) return null
    const dir = join(root, '.claude', 'sessions', branch)
    mkdirSync(dir, { recursive: true })
    const manifest = join(dir, 'manifest.txt')
    const existing = existsSync(manifest) ? new Set(readFileSync(manifest, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) : new Set()
    if (!existing.has(rel)) appendFileSync(manifest, `${rel}\n`)
    const lock = join(root, '.claude', '.session-lock')
    if (existsSync(lock)) {
      const now = new Date()
      let claimed = stamp(now)
      try {
        claimed = JSON.parse(readFileSync(lock, 'utf8')).claimed_at || claimed
      } catch {}
      writeFileSync(lock, JSON.stringify({ claimed_at: claimed, heartbeat: stamp(now), heartbeat_epoch: Math.floor(now.getTime() / 1000) }))
    }
    return rel
  } catch {
    return null
  }
}
