# Plan 195 — Agent System Refactor 2.0

## Problem
The agent configuration system grew organically and accumulated three categories of problems:
1. **Overly automated processes** that fire on every session but are only needed occasionally (worktree provisioning, UI inspector auto-invocation)
2. **Duplicate content** spread across multiple files (skill triggers defined in copilot-instructions.md AND agent.md; commit logic in both commit-to-github AND end-session)
3. **Dual-tool blindness** — Claude Code and Cursor receive the same instructions even for features only one tool can execute (subagents, worktree management, memory)

## Decisions
- Worktree provisioning: strip from CLAUDE.md, on-demand skill only
- UI Inspector: opt-in only (team-leader/qa-engineer/explicit request), never auto-triggered
- Tech debt scan: once per task (agent.md step 5.5), removed from commit-to-github Phase 0
- end-session renamed to worktree-session-end (strictly for worktree branches; hard stop on main)
- agent.md becomes a lightweight index — skill triggers live only in copilot-instructions.md §0
- CLAUDE.md mandatory gate split: Claude Code (files already in context) vs Cursor (must read)
- Cursor .mdc files upgraded from pointer stubs to self-contained embedded rules

## Technical Amendments (from pre-execution review)
- **HMR Build Sync**: ui-inspector Step 0 gets a 2-stage guard: networkidle THEN unconditional 2000ms wait. networkidle alone fires before Angular's post-module-load DOM patch.
- **Windows netstat**: worktree-setup port check uses `netstat -ano -p tcp` (TCP only = faster), capped at 5 attempts. Hard stop with message if all 5 are occupied — no infinite loop.
- **Worktree git boundary**: worktree-session-end cannot delegate `git checkout main` to commit-to-github (fatal in worktrees — branch locked in main repo). Delegation boundary = after `git push`. PR creation, merge, sync, and cleanup stay in worktree-session-end running from mainRepoPath.

## Atomic Sub-tasks

### Phase 1 — CLAUDE.md + agent.md
- [ ] CLAUDE.md: strip Branch Gate + Worktree Provisioning; split mandatory gate for CC vs Cursor
- [ ] agent.md: remove Skills section (duplicate triggers), remove steps 4.2/4.5, remove port/worktreeRoot block, remove opt-out phrases, simplify step 7 branch check

### Phase 2 — worktree-setup On-Demand Skill
- [ ] Create `.claude/skills/worktree-setup/SKILL.md` (6-step, with TCP-only netstat, 5-attempt cap)

### Phase 3 — Workflow Skills
- [ ] Create `.claude/skills/worktree-session-end/SKILL.md` (from end-session + main guard + delegation boundary)
- [ ] Overwrite `.claude/skills/end-session/SKILL.md` with deprecation redirect
- [ ] `.claude/skills/commit-to-github/SKILL.md`: remove Phase 0 Step 1 (tech debt), renumber remaining steps

### Phase 4 — UI Inspector Opt-In
- [ ] `.claude/copilot-instructions.md`: remove 4 UI inspector trigger bullets, add opt-in bullet, update session routing (end-session → worktree-session-end)
- [ ] `.claude/agents/ui-inspector.md`: Step 0 — add 2000ms buffer after networkidle
- [ ] `.claude/agents/team-leader.md`: add UI inspector invocation capability
- [ ] `.claude/agents/qa-engineer.md`: add UI inspector invocation capability

### Phase 6 — Dual-Tool Tagging in copilot-instructions.md
- [ ] Add `[CC]` / `[SHARED]` scope tags to every trigger in §0
- [ ] Add tool scope header explaining the tagging system
- [ ] Tag §0.3 Agent Personas as CC-only

### Phase 7 — Cursor .mdc Upgrades
- [ ] `scss-styling-must-use-cssLayer.mdc`: embed cssLayer rules, change to glob (`src/**/*.scss`)
- [ ] `lucide-icons-must-register-in-app-config.mdc`: embed the rule inline
- [ ] `session-end.mdc`: minor cleanup (confirm no worktree references)

### Phase 8 — New Cursor .mdc Files
- [ ] `.cursor/rules/core-angular.mdc`: always-apply Angular 19 + TS core rules
- [ ] `.cursor/rules/angular-component-structure.mdc`: glob `src/**/*.component.ts`, CRDUL structure
- [ ] `.cursor/rules/translation.mdc`: always-apply Hebrew translation rules
- [ ] `.cursor/rules/security.mdc`: glob auth-sensitive files, auth + security rules

### Phase 9 — validate-agent-refs
- [ ] Update expected inventory (add worktree-setup, worktree-session-end; remove end-session; add new Cursor .mdc files)

## Files Changed
| File | Action |
|------|--------|
| `CLAUDE.md` | Rewrite |
| `agent.md` | Rewrite |
| `.claude/skills/worktree-setup/SKILL.md` | NEW |
| `.claude/skills/worktree-session-end/SKILL.md` | NEW |
| `.claude/skills/end-session/SKILL.md` | Deprecation stub |
| `.claude/skills/commit-to-github/SKILL.md` | Edit (remove Phase 0 tech debt) |
| `.claude/copilot-instructions.md` | Edit (UI inspector, routing, tagging) |
| `.claude/agents/ui-inspector.md` | Edit (HMR stability guard) |
| `.claude/agents/team-leader.md` | Edit (add UI inspector capability) |
| `.claude/agents/qa-engineer.md` | Edit (add UI inspector capability) |
| `.claude/commands/validate-agent-refs.md` | Edit (inventory update) |
| `.cursor/rules/scss-styling-must-use-cssLayer.mdc` | Upgrade (embed + glob) |
| `.cursor/rules/lucide-icons-must-register-in-app-config.mdc` | Upgrade (embed rule) |
| `.cursor/rules/session-end.mdc` | Cleanup |
| `.cursor/rules/core-angular.mdc` | NEW |
| `.cursor/rules/angular-component-structure.mdc` | NEW |
| `.cursor/rules/translation.mdc` | NEW |
| `.cursor/rules/security.mdc` | NEW |
