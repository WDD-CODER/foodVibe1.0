---
name: worktree-session-end
description: Closes a worktree branch session for foodVibe 1.0 — commits, pushes, creates PR, merges, and removes the worktree cleanly. Strictly for worktree feature branches. Hard stop on main.
---

# Skill: worktree-session-end

**Trigger:** User says "wrap up", "done", "handoff", or "ship" inside a git worktree.
**Standard:** Read '.claude/standards-git.md' for branching and workflow rules. Session end routing is self-contained in this skill.

> **Hard Guard:** If `git rev-parse --git-dir` returns `.git` (main repo) → redirect to `session-handoff` immediately. This skill is worktree-only.

> **Worktree Boundary Rule:** Never run `git checkout main` from inside a worktree. All PR creation and merges must use `git -C <mainRepoPath>` from the root repository path.

---

## Phase 1: Worktree State Audit `[Procedural — Haiku/Composer (Fast/Flash)]`

**Status Check:** Run `git status` to identify uncommitted changes.

**Todo Sync:** Ensure all completed tasks in `.claude/todo.md` are marked `[x]`.

**Verification:** Confirm `.worktree-root` is present for correct parent repo linkage.

**Early Exit:** If no uncommitted changes and no unpushed commits → report clean state, ask intent (keep open / remove).

---

## Phase 2: Summary & Handoff `[High Reasoning — Sonnet/Gemini 1.5 Pro]`

**Unified Ship Plan:** Present a single gate — user selects one:
- `A` — Full pipeline: commit → push → PR → merge → cleanup
- `Skip merge` — Push and PR only, keep worktree open
- `Keep worktree` — Commit and push only
- `X` — Cancel

**Delta Report:** Summarize architectural changes and logic implemented this session.

**Next Steps:** Define the next task to bring the feature to "Done."

---

## Phase 3: Automated Chain `[Procedural — Haiku/Composer (Fast/Flash)]`

Execute the path selected in Phase 2. No further prompts unless CI fails.

**Step 1 — Commit & Push:** Run spec and security gates. On CI FAIL → ask "merge anyway? Y/N".

**Step 2 — Create PR:** Via `git -C <mainRepoPath>` — never from inside the worktree.

**Step 3 — Merge:** Via `git -C <mainRepoPath> merge` or `gh pr merge`.

**Step 4 — Sync Main:** `git -C <mainRepoPath> pull origin main`.

**Step 5 — Cleanup:** Kill dev server by port (Windows: `netstat -ano` + `taskkill`). Remove worktree: `git worktree remove <path>`.

---

## Completion Gate

Output: `"Worktree session ended. Branch feat/[name] [Pushed/Updated]. Worktree [Removed/Retained]."`

Return user context to main repository root.

---

## Cursor Tip
> Use Composer 2.0 (Fast/Flash) for Phase 1 and Phase 3 (git/filesystem operations).
> Reserve Gemini 1.5 Pro for Phase 2 only — the handoff narrative and sync strategy decision.
> Credit-saver: ~67% of this skill is procedural (Phases 1 + 3).
