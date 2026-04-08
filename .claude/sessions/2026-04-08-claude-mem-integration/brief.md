## Goal
Integrate claude-mem (v12.0.1) as a sixth memory layer into FoodVibe 1.0 via targeted augmentation — add semantic cross-session search through hooks + MCP without replacing any existing infrastructure (breadcrumbs, session handoffs, reflect loop, todo/plans, git-agent).

## Scope
- `.claude/settings.json` — merge claude-mem hooks (SessionStart, PostToolUse, Stop, SessionEnd) alongside existing hooks
- `.claude/mcp.json` — add claude-mem MCP server entry
- `.claude/skills/session-handoff/SKILL.md` — add Phase 1.5 memory enrichment step
- `.claude/skills/plan-implementation.md` — add Phase 0 historical context recall step
- `.claude/copilot-instructions.md` — add §0 memory search trigger, §0.2 token budget note, §0.1 priority hierarchy update
- System install: Bun runtime + `npx claude-mem install` (worker on port 37777)

## Out of Scope
- Replacing or modifying: breadcrumb-navigator, cssLayer, angularComponentStructure, add-recipe, elegant-fix, reflect loop, git-agent, all standards-*.md
- Replacing session-handoff format (markdown stays primary)
- Replacing todo.md / plan ledger
- Any Angular/server/frontend code changes

## Success Criteria
- [ ] Bun installed and `claude-mem install` completes without errors
- [ ] Worker health check passes: `curl http://localhost:37777/api/health`
- [ ] `.claude/settings.json` hooks merged — existing hooks preserved, claude-mem hooks added
- [ ] `.claude/mcp.json` contains claude-mem MCP server entry
- [ ] `plan-implementation.md` Phase 0 memory recall step added
- [ ] `session-handoff/SKILL.md` Phase 1.5 enrichment step added
- [ ] `copilot-instructions.md` updated with memory search trigger + token budget + priority hierarchy
- [ ] No existing skill or hook is broken after integration

## Session ID
2026-04-08-claude-mem-integration
