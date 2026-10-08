# Session Handoff Setup — How to Use

## The two files that matter

| File | Purpose |
|------|---------|
| `docs/session-state.md` | Rolling handoff — updated at session end, auto-loaded at session start |
| `.claude/sessions/YYYY-MM-DD-HHMM-slug.md` | Mid-task snapshot — written by `/checkpoint` when context is getting full |

## When context is running out (mid-session)

1. Run `/checkpoint` in the Claude Code prompt
2. Claude writes a timestamped file to `.claude/sessions/` and prints a resume prompt
3. Copy the resume prompt
4. Start a new Claude Code session and paste it

## At session end (normal flow)

Ask Claude: *"Update session-state.md and wrap up."*  
The `handoff-check.sh` hook validates the file has a commit hash, summary, and next steps before the session closes.

## Starting a fresh session

Nothing to do manually — `session-startup.sh` auto-loads `docs/session-state.md` into context at session start. Claude will know where you left off.

## To resume from a mid-task checkpoint

```
/resume .claude/sessions/2026-04-13-1430-your-slug.md
```

Claude reads the file, shows you a 3-line summary (Goal / Current step / Next action), and waits for your "go" before doing anything.

## Where files live

- Scripts: `scripts/context-monitor.sh`, `pre-compact-reminder.sh`, `session-startup.sh`, `handoff-check.sh`
- Hooks config: `.claude/settings.json` → `hooks` section
- Checkpoint skill: `.claude/skills/context-management/SKILL.md`
- Archive old checkpoints: `.claude/sessions/archive/`
