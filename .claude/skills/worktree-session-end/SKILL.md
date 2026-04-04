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

- `A` — Merge PR → then remove worktree via /exit (see Phase 3)
- `B` — Keep worktree open (no cleanup)
- `X` — Cancel

---

## Phase 3: Cleanup (only if A selected)

> **CRITICAL:** Never run `git worktree remove`, `rm -rf`, or any programmatic directory deletion on the active worktree. The only safe removal path is `/exit → Remove worktree` in the Claude Code UI. Attempting removal from inside the worktree always fails with a fatal Git error.

> **Why we can't delete the remote branch here:** The worktree is still checked out on this branch — `git push origin --delete` will be blocked. Instead, write a breadcrumb for the main session to pick up.

1. Kill dev server by port: read `.worktree-port`, then `netstat -ano` + `taskkill /PID <pid> /F`
2. `git -C <mainRepoPath> pull origin main`
3. **Write cleanup breadcrumb** — append the worktree branch name to `<mainRepoPath>/.worktree-cleanup`:
   ```
   worktree-<name>
   ```
   One branch name per line. Create the file if it doesn't exist.
4. Tell the user: "✓ Merged. To remove the worktree, type `/exit` in Claude Code, then choose **Remove worktree** from the menu. Do not close the terminal first."
