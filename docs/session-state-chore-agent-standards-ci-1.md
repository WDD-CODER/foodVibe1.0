# Session State

## Branch
chore/agent-standards-ci

## Date
2026-07-12

## Session Summary
- Implemented Brief 7: shared `docs/agent/pr-check-fix-loop.md` (2-round cap, security-scan always surfaces)
- Thin adapters: `/fix-pr-checks` in `.claude/commands/` and `.cursor/commands/`
- Wired ask-only post-PR offer into `/ship`; Cursor has no ship-equivalent (manual `/fix-pr-checks`)
- Checkpoint ship — dry-run Done-when not fully end-to-end; no new PR proposed

## Files Modified
 docs/agent/pr-check-fix-loop.md          | new
 .claude/commands/fix-pr-checks.md        | new
 .cursor/commands/fix-pr-checks.md        | new
 .claude/commands/ship.md                  | post-PR offer
 .claude/commands/commands.md              | registry row
 .claude/commands/_index.md                | index row
 AGENTS.md                                 | trigger row
 sessions/2026-07-12.md                    | Brief 7 handoff

## Commit
6fbcd5b4f33311026428b21834c7fe7213aaa3e3

## PR
N/A (checkpoint; existing PR #150 on branch untouched this ship)

## Next Steps
- Complete Brief 7 dry-run Done-when (lint push→green + fake-secret surface) or mark brief complete after Reviewer sign-off
- Push `6fbcd5b` when ready (`git push`)
- Unrelated dirty `src/app/**` specs / `test-out*.txt` remain unstaged
