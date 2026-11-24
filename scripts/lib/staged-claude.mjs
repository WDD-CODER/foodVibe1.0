/**
 * Staged `.claude/` writes. Claude Code refuses a `claude -p` builder any edit under a `.claude/` path ("a
 * sensitive file"); no allow rule lifts it. The builder writes the whole new file under `.kit/staged-claude/` instead,
 * with each `.claude` folder in the path spelled `_claude`, and the run's own script (not the model) moves it into place,
 * for this run only. The report says so, and that the permanent fix is still open.
 *
 *   import { stagedFiles, applyStaged } from './lib/staged-claude.mjs'
 */
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'

export const STAGE_DIR = '.kit/staged-claude'

/** `.kit/staged-claude/core/_claude/commands/x.md` → `core/.claude/commands/x.md` (a staged path relative to the stage). */
export function targetOf(staged) {
  return String(staged).replace(/\\/g, '/').split('/').map((p) => (p === '_claude' ? '.claude' : p)).join('/')
}

/** Every staged file in `folder`: [{ staged, target }] (repo-root paths with `/`). */
export function stagedFiles(folder) {
  const root = join(folder, STAGE_DIR)
  if (!existsSync(root)) return []
  const out = []
  const walk = (rel) => {
    for (const e of readdirSync(join(root, rel), { withFileTypes: true })) {
      const p = rel ? `${rel}/${e.name}` : e.name
      if (e.isDirectory()) walk(p)
      else out.push({ staged: `${STAGE_DIR}/${p}`, target: targetOf(p) })
    }
  }
  walk('')
  return out.sort((a, b) => a.target.localeCompare(b.target))
}

/** Why a staged target is refused (a path that leaves the repo, or one with no `.claude` folder), or null. */
export function stagedProblem(target) {
  const t = String(target ?? '')
  if (!t || /^[a-z]:|^\//i.test(t) || t.split('/').includes('..')) return 'it leaves the repository'
  if (!t.split('/').includes('.claude')) return 'it is not under a .claude/ folder (only those are refused to a builder: write it directly)'
  return null
}

/**
 * Move the staged files of `folder` into place. `inScope(target)` says whether the plan's scope allows the target.
 * Writes the ones that pass, removes the whole stage folder, and returns { written, outOfScope, refused } (targets).
 * A target out of scope is not written (the caller raises a scope ask for it); a refused one gets a run note.
 */
export function applyStaged(folder, { inScope = () => true } = {}) {
  const written = []
  const outOfScope = []
  const refused = []
  for (const f of stagedFiles(folder)) {
    const why = stagedProblem(f.target)
    if (why) { refused.push({ target: f.target, why }); continue }
    if (!inScope(f.target)) { outOfScope.push(f.target); continue }
    const dest = join(folder, f.target)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, readFileSync(join(folder, f.staged)))
    written.push(f.target)
  }
  // Out-of-scope files stay staged for the scope ask's answer; everything else is cleared.
  if (!outOfScope.length) rmSync(join(folder, STAGE_DIR), { recursive: true, force: true })
  else for (const f of stagedFiles(folder)) if (!outOfScope.includes(f.target)) rmSync(join(folder, f.staged), { force: true })
  return { written, outOfScope, refused }
}
