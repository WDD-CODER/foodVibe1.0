# agent.md — Claude Code preflight

> Tool-agnostic rules live in `/AGENTS.md`. This file is Claude Code preflight/command mechanics only.

## Preflight

1. Read `/AGENTS.md` (hard rules + skill triggers + standards index).
2. Load the relevant `docs/agent/*.md` file(s) for the task surface.
3. If a slash command is active, follow that command file under `.claude/commands/` literally.
4. Run skill files listed in `AGENTS.md` when their trigger matches — do not skip.

## Command mechanics

- Slash commands are the execution entry points. Do not re-route through retired persona orchestration.
- Git prep uses `.claude/agents/git-agent.md` (prep only unless Human overrides).
- Session end / ship uses `.claude/commands/ship.md`.
