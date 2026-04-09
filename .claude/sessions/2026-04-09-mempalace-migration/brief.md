## Goal
Migrate FoodVibe 1.0 from claude-mem to MemPalace as the 6th memory layer, removing all claude-mem artifacts and installing MemPalace in its place.

## Scope
- `.claude/settings.json` (project + global) — remove claude-mem hooks
- `.claude/mcp.json` — replace claude-mem MCP entry with MemPalace
- `.claude/copilot-instructions.md` — update §0, §0.1, §0.2
- `.claude/skills/session-handoff/SKILL.md` — add Phase 1.5 memory enrichment
- `.claude/commands/plan-implementation.md` — add Phase 0 historical recall
- System-level: claude-mem binary, Bun, uv, QMD, ChromaDB (conditional), `~/.claude-mem/` data dir
- `notes/claude-mem-integration-brief.md` — remove after migration

## Out of Scope
- breadcrumbs, reflect loop, git-agent, cssLayer, angularComponentStructure, standards files
- Any Angular app source code
- todo.md / plan files / session handoffs

## Success Criteria
- [ ] All claude-mem artifacts removed from system and project config
- [ ] No process on port 37777
- [ ] MemPalace CLI installed and responding
- [ ] Palace initialized and mined with FoodVibe codebase + session handoffs + plan files
- [ ] MCP server registered and 19 tools discoverable by Claude Code
- [ ] mempalace_search and mempalace_kg_query return results
- [ ] Session handoff writes diary entry to MemPalace
- [ ] New session discovers previous session's memories via MCP
- [ ] 3 skill files updated with graceful "if available" memory hooks

## Session ID
2026-04-09-mempalace-migration
