---
name: github-sync
description: Pulls recent GitHub activity and syncs the local branch at session start or after time away — runs once per calendar day.
---

# Skill: github-sync

**Trigger:** Session start or after time away. **Once-per-day gate:** Check `notes/github-sync/<today-date>.md` first — if it exists, skip and print `✓ GitHub sync already ran today`. Only run if missing.
**Standard:** Follows Section 0 (Session Start) of the Master Instructions.

---

## Phase 1: Environment Audit `[Procedural — Haiku/Composer (Fast/Flash)]`

**Status Check:** Run `git status` and `git fetch`.

**Conflict Check:** Identify if local changes conflict with remote `main` or active `feat/` branch.

**Worktree Detection:** Identify if operating in a worktree; verify `.worktree-port` and `.worktree-root`.

---

## Phase 2: Synchronization `[Procedural — Haiku/Composer (Fast/Flash)]`

**Pull / Rebase:** Execute `git pull --rebase` for clean history.

**Stash Management:** If uncommitted changes exist: `git stash` → sync → `git stash pop`.

**Branch Cleanup:** Identify merged local branches safe to delete.

---

## Phase 3: Session Intelligence `[High Reasoning — Sonnet/Gemini 1.5 Pro]`

**Daily Log Audit:** Read latest `notes/session-handoffs/` and `notes/github-sync/` files. Summarize the "State of the Project" for the current session.

**GitHub Context:** Read open PRs via MCP (`mcp__github__list_pull_requests`) → fallback to `gh pr list`. Surface any pending reviews or CI failures.

**Todo Alignment:** Verify `.claude/todo.md` matches the current branch state.

---

## Completion Gate

Output: `"GitHub sync complete. Remote changes merged. Local branch is up to date."`

Save sync log to `notes/github-sync/<today-date>.md`.

---

## Cursor Tip
> Git syncing is a utility task. Always use Composer 2.0 (Fast/Flash) for Phases 1 & 2.
> Reserve Gemini 1.5 Pro for Phase 3 only — the morning state-of-project analysis.
> Credit-saver: ~67% of this skill (Phases 1 + 2) is Flash-eligible.
