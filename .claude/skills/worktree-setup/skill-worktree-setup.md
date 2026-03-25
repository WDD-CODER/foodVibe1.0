---
name: worktree-setup
description: On-demand provisioning of a git worktree for isolated multi-agent or parallel work in foodVibe 1.0. NOT automatic — invoke only when explicitly needed.
---

# Skill: worktree-setup

**Trigger:** User says "setup worktree", "new worktree", or Team Leader orchestrates parallel task execution.
**Standard:** Follows Section 0 (Worktree Detection) and Section 6 (Git & Workflow) of the Master Instructions.

> **Not automatic.** Only invoke on explicit user request or Team Leader orchestration.

---

## Phase 1: Destination Audit `[Procedural — Haiku/Composer (Fast/Flash)]`

**Prune First:** Run `git worktree prune` to clear stale refs.

**Path Resolution:** Identify the target directory outside the main repo (e.g., `../foodVibe-wt-<feature>`).

**Conflict Check:** Ensure the target path doesn't already exist or contain a stale git link.

**Port Allocation:** Identify the next available port starting from 4201. Check with Windows `netstat -ano -p tcp | findstr ":<PORT>"`. Retry up to 5 candidates. Hard stop if all 5 are occupied.

---

## Phase 2: Worktree Creation `[Procedural — Haiku/Composer (Fast/Flash)]`

**Git Command:** `git worktree add -b feat/<name> <path> main`

**Dependencies:** Run `npm install` to ensure the worktree is runnable.

**Metadata Write:** Create `.worktree-root` pointing back to the main repository. Write `.worktree-port` with the assigned port.

**Env Copy:** Copy `.env` to the new worktree (silent skip if `.env` is missing).

---

## Phase 3: Environment Initialization `[High Reasoning — Sonnet/Gemini 1.5 Pro]`

**Context Transfer:** Copy relevant active `plans/` entries or `.claude/todo.md` state for the sub-task.

**Breadcrumb Sync:** Run `update-docs` (Section 0) within the new worktree to activate navigation maps.

---

## Completion Gate

Output: `"Worktree created at [path] on port [port]. Branch feat/[name] is active and linked."`

Update the main repo's `.claude/todo.md` to reflect the task is now active in a worktree.

---

## Cursor Tip
> Setting up a worktree is pure automation. Always use Composer 2.0 (Fast/Flash) for Phases 1 & 2.
> Reserve Gemini 1.5 Pro for Phase 3 only — ensuring the worktree has the correct logic context and todo state.
> Credit-saver: ~67% of this skill (Phases 1 + 2) is Flash-eligible.
