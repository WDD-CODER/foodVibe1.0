# CLAUDE.md — FoodVibe 1.0

@AGENTS.md

## Claude Code–only addendum

- **Branch guard:** `scripts/branch-guard.sh` runs on Edit/Write via `.claude/settings.json` PreToolUse — blocks writes on `main`.
- **Session hooks:** SessionStart runs `scripts/session-startup.sh`; PostToolUse runs the session-manifest hook.
- **Subagents:** Prefer project agents under `.claude/agents/` when a command explicitly invokes them. Do not invent orchestration beyond the command file.
- **"Yes chef!" gate:** When a Claude Code session gate requires it, start responses with `Yes chef!` / `No chef!`. Cursor has no equivalent requirement from this file.
