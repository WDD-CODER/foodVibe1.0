---
name: worktree-session-end
description: Closes a worktree session — handles cleanup only. Commits, PRs, and merges are delegated to git-agent.
---

# Skill: worktree-session-end

**Trigger:** "wrap up", "done", "handoff", or "ship" inside a git worktree.

> **Hard Guard:** If `git rev-parse --git-dir` returns `.git` (main repo) → redirect to `session-handoff` immediately. This skill is worktree-only.

> **Worktree Boundary:** Never run `git checkout main` from inside a worktree. All PR/merge operations use `git -C <mainRepoPath>`.

---

## Phase 1: State Check

Run `git status`.

- **Dirty (uncommitted changes)** → invoke git-agent for commit/push/PR. Do not duplicate that logic here.
- **Clean but unpushed commits** → invoke git-agent to push and create PR.
- **Clean + no unpushed commits** → skip to Phase 2.

---

## Phase 2: User Intent

Present options:

- `A` — Merge PR + remove worktree
- `B` — Keep worktree open (no cleanup)
- `X` — Cancel

---

## Phase 3: Cleanup (only if A selected)

1. Kill dev server by port: read `.worktree-port`, then `netstat -ano` + `taskkill /PID <pid> /F`
2. `git -C <mainRepoPath> pull origin main`
3. Output: `"Type /exit → select 'Remove worktree' to complete cleanup. Claude Code handles the directory removal safely after exiting."`
4. Report: `"Ready to exit. Run /exit → Remove worktree to complete cleanup."`
