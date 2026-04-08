## Goal
Create the unified end-of-session agent and migrate all session-closing workflows to use it as a single deterministic pipeline.

## Scope
- `.claude/agents/end-of-session-agent.md` (new — core agent file)
- `.claude/copilot-instructions.md` (trigger routing, agent table)
- `.claude/skills/session-handoff/SKILL.md` (redirect stub)
- `.claude/skills/worktree-session-end/SKILL.md` (agent-managed note)
- `.claude/commands/auto-solve.md` (invoke reference)
- `.claude/agents/git-agent.md` (reference update)
- `.claude/skills/github-sync/SKILL.md` (path update)
- `.claude/skills/quick-chat/SKILL.md` (reference update)
- `.claude/commands/validate-agent-refs.md` (inventory update)
- `.cursor/rules/session-end.mdc` (Cursor rule update)
- `agent.md` (lifecycle index, preflight checklist)
- `memory/feedback_ship_on_main_redirect.md` (memory update)

## Out of Scope
- `.claude/reflect/auto-reflect.ps1` (remains as-is per brief)
- `/plan-implementation` and `/brief` commands (created in previous session)
- git-agent internals
- Application code

## Success Criteria
- [x] Agent file exists at `.claude/agents/end-of-session-agent.md`
- [x] Agent encodes all 14 phases from the specification brief
- [x] All user confirmation gates are defined (mid-session, commit, plan archive, report)
- [x] Existing trigger phrases route to the agent (copilot-instructions.md updated)
- [x] session-handoff/SKILL.md converted to redirect stub
- [x] worktree-session-end/SKILL.md marked as agent-managed
- [x] All downstream references updated (git-agent, auto-solve, github-sync, quick-chat, validate-agent-refs, Cursor rule, agent.md)
- [x] Memory updated to reflect new agent

## Session ID
2026-04-08-end-of-session-agent
