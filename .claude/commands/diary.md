---
name: diary
description: Write a MemPalace diary entry for the current session — use when skipping session-handoff
---

# /diary — Quick Session Diary Write

Use this when ending a session **without** running `/session-handoff` or "wrap up".
It logs what happened to MemPalace so the next session can recall it.

## Steps

1. **Summarize the session** from conversation context:
   - What was built or changed
   - Key decisions made and why
   - Any blockers or open threads
   - Current status

2. **Write the diary entry** via MemPalace:

```
mempalace_diary_write(
  agent_name="claude",
  topic="session-handoff",
  entry="SESSION:{YYYY-MM-DD}|{what-was-done}|{key-decisions}|{status}"
)
```

Use AAAK compression — concise, entity-coded. Example:
`"SESSION:2026-04-09|migrated.claude-mem→mempalace+wired.19.mcp.tools|decided:mandatory.diary.hook|COMPLETE"`

3. **Confirm to user:**
```
Diary entry written to MemPalace.
Topic: session-handoff
Entry: {entry}
```

## Rules

- **SKIP if MemPalace MCP unavailable** — tell the user and exit cleanly
- Do NOT run build checks, git operations, or techdebt scans — this is diary-only
- Do NOT write a session-handoff.md file — that's only for the full session-handoff agent
- Takes < 10 seconds — no gates, no phases, just write and confirm
