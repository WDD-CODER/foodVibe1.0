---
name: end-session
description: Runs the full session-end pipeline — ship gate, commit, push, session-state snapshot, and todo sync. Target under 2 minutes.
---

# Skill: end-session

**Trigger:** User says "end session", "done", "wrap up", or runs `/end-session`.

> This skill delegates to the `end-of-session-agent`. It is an alias/trigger — do not implement the pipeline here.

## Flow

1. Invoke the `end-of-session-agent` with full session context.
2. The agent handles:
   - Build gate (`[BUILD_COMMAND]`)
   - Commit and push
   - Session-state snapshot
   - Todo sync
3. Report results back to user.

> See `agents/end-of-session-agent.md` for the full pipeline definition.
