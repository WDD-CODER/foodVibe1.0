---
name: worktree-setup
description: On-demand provisioning of a git worktree for isolated multi-agent or parallel work. NOT automatic — invoke only when explicitly needed.
---

# Worktree Setup — foodVibe 1.0

## When to Use

- Team Leader is orchestrating parallel agent streams on independent tasks
- User explicitly requests an isolated worktree (`/worktree-setup`)
- NOT triggered automatically at session start or on every task

> **Note:** For simple focused fixes, working directly on a feature branch is faster. A worktree is only worth the `npm install` overhead when true parallel isolation is needed.

---

## Execute in this exact order — do not skip steps

### Step 1 — Prune stale refs (always first)

```bash
git worktree prune
```

Clears stale references to previously deleted folders. Without this, `git worktree add` may error with "branch already checked out" or "folder already exists".

---

### Step 2 — Create the worktree (one level above the repo root)

```bash
git worktree add ../worktree-<descriptive-branch-name> -b <branch-name>
```

Examples: `../worktree-feat-recipe-search`, `../worktree-fix-unit-conversion`

Creating at `../` prevents recursive file system indexing by the IDE.

---

### Step 3 — Copy environment variables

```bash
[ -f .env ] && cp .env ../worktree-<branch-name>/.env
```

`.env` is git-ignored and does NOT carry over automatically. Without this, Angular services and backend connections fail silently.

---

### Step 4 — Install dependencies

```bash
cd ../worktree-<branch-name> && npm install
```

`node_modules` does not carry over. Must install before running any `ng` or `npm` commands.

*(Optional: `pnpm install` uses hard links and costs near-zero extra disk space per worktree — worth it if running 3+ worktrees regularly.)*

---

### Step 5 — Assign a port

**Context:** `netstat -ano -p tcp` on Windows scans TCP only (faster than full `-ano`). Each call can take 3–5 seconds — cap attempts at 5 to avoid long waits.

1. Count existing worktrees (excluding main repo):
   ```bash
   git worktree list | grep -v "$(git rev-parse --show-toplevel)" | wc -l
   ```
2. Candidate port = `4200 + count` (first worktree → 4201, second → 4202, etc.)
3. For up to **5 consecutive attempts**, check if the port is free on Windows:
   ```bash
   netstat -ano -p tcp | findstr ":<PORT> " | findstr LISTENING
   ```
   - Empty output → port is free. Proceed.
   - Output found → port is occupied. Increment PORT by 1 and retry.
4. If all 5 candidates are occupied → **stop**. Output:
   > "All candidate ports (X through X+4) are in use. Close unused dev servers or specify a port manually, then re-run `/worktree-setup`."
   Do not continue past this point.
5. Write the assigned port:
   ```bash
   echo <PORT> > ../worktree-<branch-name>/.worktree-port
   ```
6. Tell the user:
   > "Worktree ready on branch `<branch>`. Dev server port: `<PORT>`. Start with: `ng serve --port <PORT>`"

---

### Step 6 — Verify artifact excludes

`.playwright-mcp/` and `.ui-inspector/` are already covered by `.gitignore` — no action needed.
This step is a reminder only: confirm those entries are present if `.gitignore` was recently reset or replaced.

---

## End State

Worktree at `../worktree-<branch-name>` is ready:
- Branch checked out
- `.env` copied
- `node_modules` installed
- Port recorded in `.worktree-port`
- User informed of the port and start command

When done with the worktree, use `/worktree-session-end` (ship it / done) to commit, merge, and clean up.
