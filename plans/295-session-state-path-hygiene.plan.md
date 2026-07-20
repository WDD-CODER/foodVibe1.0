# Plan 295 — Session State Path Hygiene

## Goal

Stop `.claude/.session-state-path` and PPID-keyed `docs/session-state-*-*.md`
files from remaining dirty after every `/ship` / merge, which blocks
`gh pr merge --delete-branch` local checkout and creates perpetual uncommitted noise.

## Author / role

Human-directed (Cursor). Contractor executes; one milestone then STOP for validation.

## Problem

1. `scripts/session-startup.sh` rewrites **tracked** `.claude/.session-state-path` on
   every SessionStart → permanent dirty tree.
2. `/ship` Phase 5 writes session-state **after** commit/push → handoff file left
   uncommitted.
3. SAVE_PATH uses `branch-PPID`, which is process-local and should not be a repo artifact.

## Decisions (locked)

- **Untrack + gitignore** `.claude/.session-state-path` (local pointer only).
- **Stable SAVE_PATH:** `docs/session-state-${BRANCH}.md` (no PPID). Parallel windows
  may overwrite the same branch file (acceptable); override via `SESSION_STATE_PATH`.
- **Gitignore** legacy PPID-keyed pattern `docs/session-state-*-[0-9]*.md` so they are
  not re-added; leave historically tracked files alone (no mass delete this plan).
- **Ship:** after commit, before push — write session-state, stage, amend into the
  ship commit (`--no-edit`), then push. No orphan dirty Phase 5.

## Non-goals

- Not deleting historical `docs/session-state-*.md` from git history.
- Not changing MongoDB / local DB tooling.
- Not deleting `todo-archive.legacy.md` (separate Human cleanup).

## Milestone 1 — Ignore pointer, stable path, ship amend-before-push

**Files:**
- `.gitignore`
- `scripts/session-startup.sh`
- `.claude/commands/ship.md`
- `scripts/handoff-check.sh` (if path logic assumes PPID)
- `.claude/todo.md` + plan ledger

**Atomic Sub-tasks:**
- [x] `.gitignore` — ignore `.claude/.session-state-path` and `docs/session-state-*-[0-9]*.md`
- [x] `git rm --cached .claude/.session-state-path` (keep local file)
- [x] `scripts/session-startup.sh` — SAVE_PATH = `docs/session-state-${BRANCH}.md`
- [x] `.claude/commands/ship.md` — Phase 5 runs after commit, before push: write →
      stage → amend `--no-edit` → then push
- [x] Align `scripts/handoff-check.sh` with branch-canonical path if needed

**Verify:** After SessionStart simulation, `.session-state-path` is ignored by git;
  `git status` does not show it when only the pointer changes. Ship text orders
  amend-before-push.

## Atomic Sub-tasks (ledger)

- [x] M1 gitignore + untrack pointer + stable SAVE_PATH + ship Phase 5 amend-before-push
