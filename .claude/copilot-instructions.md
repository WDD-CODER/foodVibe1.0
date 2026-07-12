# Claude Code execution mechanics only

> Tool-agnostic rules live in `/AGENTS.md` — this file is Claude Code execution mechanics only.

## Skill file-path routing

Skills live under `.claude/skills/<name>/SKILL.md`. Slash commands live under `.claude/commands/<name>.md`.
Discoverability: `/skills` → `.claude/commands/skills.md`; `/commands` → `.claude/commands/commands.md`.

## Subagent / MemPalace mechanics

- Invoke agents from `.claude/agents/` only when a command or user explicitly requests that agent.
- Do not invent multi-agent task forces beyond what the active command file specifies.
- Memory / MemPalace tools (if configured) are optional lookup aids — never a substitute for reading `AGENTS.md` and `docs/agent/`.

## Output discipline

- Prefer concise status + file paths over long narration.
- On `/review-it`, report findings only unless Human explicitly asks to fix.
- Preserve active plan name, milestone, Verify command, and unresolved FAILs across compaction.
