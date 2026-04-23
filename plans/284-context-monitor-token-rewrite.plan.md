---
name: Context Monitor Token Rewrite
overview: Replace byte-based context-monitor.sh with token-based context-monitor.py; add /context-override command; fix parallel-session safety; improve pre-compact and startup hooks.
isProject: false
---

# Goal
Rewrite the context-monitor hook to measure actual token usage from the transcript (not file bytes), scale to any model's context window, and support a /context-override command that lets the user bypass the 73% hard stop.

# Atomic Sub-tasks

- [x] Task 1: Create `.claude/config/model-context-windows.json` — model → context-window map
- [ ] Task 2: Create `scripts/context-monitor.py` — token-based, session-scoped, 3-tier warnings, override support
- [ ] Task 3: Create `.claude/commands/context-override.md` — slash command to suppress warnings 30 min
- [ ] Task 4: Simplify `scripts/pre-compact-reminder.sh` — remove baseline block, add SESSION SAVE TARGET reference and Post-Compact Resume instruction
- [ ] Task 5: Update `scripts/session-startup.sh` — add post-compact resume reminder line
- [ ] Task 6: Update `.claude/settings.json` — swap .sh → .py in PostToolUse hook

# Constraints / Rules

- Do NOT modify tool-failure-hook.ps1 or any other PostToolUse entry
- Do NOT remove /tmp/claude-compact-baseline from disk if it exists
- Silent on failure — any parse error must exit 0 (never block tool execution)
- Session-scoped tmp files — every /tmp/ file must include <session_id>
- Python 3 stdlib only (json, os, sys, time, pathlib)
- hookSpecificOutput format: {"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": "..."}}
- session_id derived from transcript_path basename (not env var)

# Done When

- 40% context emits soft warning once, then quiet
- 60% emits alert once
- 73% emits hard stop with /context-override instructions
- /context-override silences hook for 30 minutes within that session
- Switching models mid-session reflected immediately
- Unknown model triggers exactly one stderr line
- No spurious warnings after /compact or auto-compact
- CLI displayed percentage and hook percentage agree within ±2%
