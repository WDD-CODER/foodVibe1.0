---
name: worktree-setup
description: On-demand provisioning of a git worktree for isolated multi-agent or parallel work. NOT automatic — invoke only when explicitly needed.
---

# Skill: worktree-setup
**Model Guidance:** Use Haiku/Flash for Phases 1 and 2. Use Sonnet for Phase 3 only.

**Trigger:** User says "setup worktree", "new worktree", or Team Leader orchestrates parallel task execution.

> **Not automatic.** Only invoke on explicit user request or Team Leader orchestration.

**Worktree Rules (inline — no guide read required):**
- Target directory must be outside the main repo: `../<project>-wt-<feature>`
- Branch naming: `feat/<name>` — always branch from `main`
- Port allocation: start at 4201, retry up to 5 candidates, hard stop if all occupied
- Always write `.worktree-root` (points to main repo) and `.worktree-port` (assigned port)
- Copy `.env` silently — skip without error if missing
- Never run `git checkout main` from inside a worktree

---

## Phase 1: Destination Audit 

**Prune First:** Run `git worktree prune` to clear stale refs before anything else.

**Path Resolution:** Identify the target directory outside the main repo (`../<project>-wt-<feature>`).

**Conflict Check:** Ensure the target path doesn't already exist or contain a stale git link.

**Port Allocation:** Find next available port starting from 4201.
```bash
netstat -ano -p tcp | findstr ":<PORT>"
```
Retry up to 5 candidates. Hard stop if all 5 are occupied — report to user.

---

## Phase 2: Worktree Creation 

**Git Command:**
```bash
git worktree add -b feat/<name> <path> main
```

**Dependencies:** Run `npm install` inside the new worktree to ensure it is runnable.

**Metadata Write:** Create `.worktree-root` pointing to the main repository path. Write `.worktree-port` with the assigned port number.

**Env Copy:** Copy `.env` to the new worktree root — silent skip if `.env` is missing.

---

## Phase 3: Environment Initialization 

**Context Transfer:** Copy relevant active `plans/` entries and current `.claude/todo.md` state for the sub-task into the worktree.

**Breadcrumb Sync:** Run `update-docs` skill within the new worktree to activate navigation maps.

**Todo Update:** Mark the task as active in the main repo's `.claude/todo.md` with the worktree path noted.

---

## Completion Gate

Output: `"Worktree created at [path] on port [port]. Branch feat/[name] is active and linked."`

Update the main repo's `.claude/todo.md` to reflect the task is now active in the worktree.

---

## Cursor Tip
> Setting up a worktree is pure automation. Always use Composer 2.0 (Fast/Flash) for Phases 1 & 2.
> Reserve Gemini 1.5 Pro for Phase 3 only — ensuring the worktree has the correct logic context and todo state.
> Credit-saver: ~67% of this skill (Phases 1 + 2) is Flash-eligible.