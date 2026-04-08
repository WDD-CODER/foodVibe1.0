---
name: claude-mem-integration
overview: Add claude-mem as a sixth memory layer to FoodVibe 1.0 — hooks + MCP + skill integration without replacing existing infrastructure
todos: []
isProject: false
---

## Goal
Integrate claude-mem (v12.0.1) as a sixth memory layer into FoodVibe 1.0 via targeted augmentation — add semantic cross-session search through hooks + MCP without replacing any existing infrastructure (breadcrumbs, session handoffs, reflect loop, todo/plans, git-agent).

## Scope
- `.claude/settings.json` — merge claude-mem hooks alongside existing hooks
- `.claude/mcp.json` — create with claude-mem MCP server entry
- `.claude/commands/plan-implementation.md` — add Phase 0 historical context recall
- `.claude/agents/end-of-session-agent.md` — add Phase 1.5 memory enrichment to Phase 11
- `.claude/copilot-instructions.md` — §0 trigger, §0.1 priority hierarchy, §0.2 token budget
- System: Bun + npx claude-mem install (user-executed)

## Out of Scope
- Replacing breadcrumb-navigator, cssLayer, angularComponentStructure, add-recipe, elegant-fix, reflect loop, git-agent, all standards-*.md
- Replacing session-handoff format or todo/plan ledger
- Any Angular/server/frontend code changes

# Atomic Sub-tasks

- [ ] `.claude/settings.json` — merge claude-mem hooks (SessionStart, PostToolUse, Stop, SessionEnd) preserving existing Stop hook
- [ ] `.claude/mcp.json` — create with claude-mem MCP server entry
- [ ] `.claude/commands/plan-implementation.md` — add Phase 0 historical context recall (conditional on claude-mem)
- [ ] `.claude/agents/end-of-session-agent.md` — add Phase 1.5 memory enrichment to Phase 11 (session-handoff is redirect)
- [ ] `.claude/copilot-instructions.md` — add memory search trigger §0, token budget §0.2, priority hierarchy §0.1
- [ ] Provide user with Bun + claude-mem install commands + worker health check

## Constraints
- All claude-mem hooks must be conditional/graceful — existing skills work without the service
- session-handoff/SKILL.md stays as redirect (do not revert)
- No Angular/server code changes

## Done when
- Config files updated; hooks fire in correct order; MCP reachable
- plan-implementation and end-of-session-agent have claude-mem-aware phases
- copilot-instructions.md reflects new memory layer priority
- User can run `npx claude-mem install` to complete system installation
