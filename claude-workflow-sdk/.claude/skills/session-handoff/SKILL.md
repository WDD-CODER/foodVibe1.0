---
name: session-handoff
description: Writes a session-state snapshot capturing current branch, progress, and exact resume instruction so the next session can continue without context loss.
---

# Skill: session-handoff

**Trigger:** Invoked by `pre-compact-reminder.sh`, `/checkpoint`, or manually when context pressure is high.

## What to capture

1. **Branch** — current branch name and worktree path (if in a worktree)
2. **Session summary** — what was accomplished this session (bullet list)
3. **Progress checkpoint** — DONE items and TODO items with task numbers
4. **Working directory** — absolute paths for SDK target and project root
5. **Next steps** — exact resume instruction the next session can copy-paste
6. **Commit status** — what is committed vs. still in progress

## File location

Write to: `.claude/docs/session-state-[branch-name]-[N].md`

Read `.claude/.session-state-path` for the injected path if available.

## Output

`"Session state written to [path]. Next session resume instruction included."`
