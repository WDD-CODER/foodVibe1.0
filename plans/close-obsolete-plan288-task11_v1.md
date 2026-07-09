# Plan Contract — close-obsolete-plan288-task11_v1

**Feature:** Close obsolete Plan 288 Task 11 after plan-implementation retirement  
**Author:** Architect (simulated in cutover smoke test)  
**Date:** 2026-07-08  
**Status:** Approved for Contractor Milestone 1 only

## Context
Plan 288 Task 11 in `.claude/todo.md` asked to fix the comprehensive-brief gate in
`.claude/commands/plan-implementation.md`. That command was retired in Phase 2 of
PRD-three-agent-cutover (native Plan Mode). The todo item is now dead weight.

## Milestones

### Milestone 1 — Close obsolete todo + update current-state
**Scope (only these files):**
- `.claude/todo.md` — mark Plan 288 Task 11 `[x]` with note that plan-implementation was retired; archive the Plan 288 section if all tasks are then complete
- `/_shared/current-state.md` — note smoke-test milestone completed

**Out of scope:** Any `src/app/**`, `server/**`, other todo sections.

**Verify:** `Select-String -Path .claude/todo.md -Pattern 'plan-implementation'` returns no unchecked task referencing it; `_shared/current-state.md` mentions the smoke test.

**DoD:**
- [x] Task 11 marked done with retirement note
- [x] Plan 288 section archived or fully `[x]`
- [x] current-state.md updated
- [x] Session handoff written to `/sessions/2026-07-08.md`

## Constraints
- C1: no app code
- C3: Contractor does not commit
