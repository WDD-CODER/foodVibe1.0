---
name: preflight
description: Pre-flight environment check — dev server, MongoDB, branch, gstack binary
---

# Preflight Check

**Skill:** preflight
Run before any workflow that touches dev server / browser / database.

## Checks

1. **Dev server reachable:** `curl -s -o /dev/null -w "%{http_code}" http://localhost:$(cat .worktree-port 2>/dev/null || echo 4200)` returns `200`
2. **MongoDB reachable:** `mongosh --eval "db.runCommand({ping:1})" --quiet` returns ok
3. **Current branch != main:** `git branch --show-current` is not `"main"`
4. **(visual workflows only) gstack binary present:** `ls ~/.claude/skills/gstack/browse/dist/browse`

## Output

Single line per check: `OK` | `FAIL: <reason>`

On any `FAIL` → return non-zero. Calling workflow aborts.
