# /ship — Fast Session End

Closes the current session in under 2 minutes. 4 phases only.

**Alias for**: `end-of-session-agent` (4-phase mode)

## Execution

Invoke the `end-of-session-agent` via the Agent tool:

```
Agent(
  subagent_type: "end-of-session-agent",
  description: "Run 4-phase ship pipeline",
  prompt: "Run the 4-phase /ship pipeline. Repo root: C:\\foodCo\\foodVibe1.0. Build gate → commit → session-state → todo sync."
)
```

## What /ship does

| Phase | Action | Blocks on failure? |
|-------|--------|--------------------|
| 1 | Build verification (`ng build`) | Yes |
| 2 | git-agent commit + push (with user approval) | No |
| 3 | Write session-state.md | No |
| 4 | Sync todo.md | No |

## What /ship does NOT do (use on-demand commands)

| Skipped | On-demand alternative |
|---------|-----------------------|
| Techdebt scan | `/techdebt` |
| Breadcrumb / doc refresh | `/docs-refresh` |
| Session evaluation vs brief | Read `.claude/sessions/{id}/brief.md` |
| MemPalace diary write | `mempalace_diary_write()` manually |
| Plan archive | Rename `.plan.md` → `.done.plan.md` |

## Aliases (work identically, deprecated — remove 2026-04-28)

- `/end-session` → `.claude/skills/end-session/SKILL.md`
- `/session-handoff` → `.claude/skills/session-handoff/SKILL.md`
