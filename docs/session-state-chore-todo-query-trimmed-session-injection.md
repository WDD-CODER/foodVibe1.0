# Session State

## Branch
chore/todo-query-trimmed-session-injection

## Date
2026-09-30

## Session Summary
- Shipped Plan 323 (Brief A of a 3-part sequence): added `scripts/todo-query.mjs` (next/open/sweep/mark/append + `--json`) backed by a shared parser extracted to `scripts/lib/todo-parse.mjs` (verified `todo-archive.mjs --dry-run` output byte-identical before/after).
- Trimmed `scripts/session-startup.sh`'s SessionStart injection to Summary/Next Steps/Commit sections capped at 1500 chars (fallback: first 1500 chars), with a `Full file: ... — read only if needed.` pointer.
- Rewired `auto-solve.md`, `sweep-stale-todos.md`, `done.md`, `ship.md` ("On approval" step 1 only), and `save-plan/SKILL.md` to use `todo-query` instead of a full `Read` of `.claude/todo.md`.
- Raised and handed off a policy question mid-session: when should a job need explicit Human validation vs. self-verified computer-checkable evidence? Captured as a proposal, not yet applied — see `validation-gate-only-for-human-judgment.md` project memory and the published handoff artifact (https://claude.ai/artifact/BfdZ32DAEyqAZZDMPTKgwR).
- Discarded pre-existing uncommitted clutter found at session start on this branch's prior state: a corrupted PreCompact dump appended to `.claude/todo.md` (raw transcript JSONL instead of a summary) and 3 stale untracked `docs/session-state-*.md` files — user confirmed discard.

## Files Modified
See commit `5de2fdf4` — 12 files (`.claude/commands/{auto-solve,done,ship,sweep-stale-todos}.md`, `.claude/skills/save-plan/SKILL.md`, `.claude/todo.md`, `package.json`, `plans/323-todo-query-trimmed-session-injection.plan.md`, `scripts/lib/todo-parse.mjs`, `scripts/session-startup.sh`, `scripts/todo-archive.mjs`, `scripts/todo-query.mjs`)

## Commit
5de2fdf4

## PR
N/A yet — feature-complete (Plan 323 Done-when fully met), PR to be proposed next per ship's commit-vs-PR judgment.

## Next Steps
1. Push this branch and open a PR (Brief B1 explicitly requires Brief A to be **merged** before it can start).
2. After merge: start Brief B1 (move `/ship`'s mechanical steps — lane classification, baseline/manifest check, session-state write — and the review diff filter into scripts: `scripts/ship-prep.mjs`, `scripts/write-session-state.mjs`), per the 3-part sequence (A → B1 → B2), one at a time with Human validation between each.
3. Brief B2 (split `.claude/commands/ship.md` into a short core + on-demand `docs/agent/ship-regular.md` / `ship-recovery.md`) waits until B1 is done and validated.
