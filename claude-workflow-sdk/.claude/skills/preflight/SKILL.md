---
name: preflight
description: Pre-flight environment check — dev server, database (if applicable), branch, gstack binary
---

# Preflight Check

**Skill:** preflight
Run before any workflow that touches dev server / browser / database.

## Checks

1. **Dev server reachable:** `curl -s -o /dev/null -w "%{http_code}" http://localhost:$(cat .worktree-port 2>/dev/null || echo [DEV_PORT])` returns `200`
2. **Database reachable (if project uses one):** Run project-appropriate health check command. For MongoDB: `mongosh --eval "db.runCommand({ping:1})" --quiet`. For other databases, adapt accordingly. Skip if project has no database.
3. **Current branch != main:** `git branch --show-current` is not `"main"`
4. **(visual workflows only) gstack binary present:** `ls ~/.claude/skills/gstack/browse/dist/browse`

## Output

Single line per check: `OK` | `FAIL: <reason>`

On any `FAIL` → return non-zero. Calling workflow aborts.

> **Note:** The database check in step 2 is project-specific. After running `/init-repo`, update this file to match your project's database health check command, or remove step 2 if the project has no database.
