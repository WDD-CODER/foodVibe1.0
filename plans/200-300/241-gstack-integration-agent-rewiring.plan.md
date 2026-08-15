---
name: gstack Integration & Agent Rewiring
overview: Replace the defunct UI Inspector with gstack's /browse + /qa pipeline, rewire all agents, and delete deprecated artifacts.
todos: []
isProject: false
---

# Goal

Install gstack natively alongside our existing agent system, replace the deprecated UI Inspector with gstack's `/browse` + `/qa` as the primary visual QA pipeline, rewire all agents to use gstack's superior browser-based tools directly instead of flagging the user, enhance the Security Officer with gstack's `/cso` methodology, update all configuration and inventory files to reflect the new state, and delete all deprecated artifacts.

# Atomic Sub-tasks

- [ ] Phase 2: `CLAUDE.md` — append gstack section after Branch Rule
- [ ] Phase 3: Delete `.claude/agents/ui-inspector.md`
- [ ] Phase 4: `team-leader.md` — delete UI Inspector callout + rewrite Section 4 Visual QA
- [ ] Phase 5: `qa-engineer.md` — delete UI Inspector callout + rewrite Section 4 + append /investigate to Section 2
- [ ] Phase 6: `security-officer.md` — append /cso callout after Model Guidance line
- [ ] Phase 7A: `copilot-instructions.md` — delete UI Inspector trigger block (lines 50–54)
- [ ] Phase 7B: `copilot-instructions.md` — insert gstack Visual QA + /investigate + /cso triggers
- [ ] Phase 7C: `copilot-instructions.md` — rewrite UI Verification Gate to reference /qa
- [ ] Phase 7D: `copilot-instructions.md` — delete UI Inspector row from §0.5 Model Routing table
- [ ] Phase 8A: `agent.md` — delete UI Inspector row from Agent Task Force table
- [ ] Phase 8B: `agent.md` — append gstack line to Core Skills section
- [ ] Phase 8C: `agent.md` — rewrite Post-Execution Gate to add /qa step for layout changes
- [ ] Phase 9A: `validate-agent-refs.md` — delete ui-inspector.md from expected agents list
- [ ] Phase 9B: `validate-agent-refs.md` — remove ui-inspector from bash loop
- [ ] Phase 9C: `validate-agent-refs.md` — update expected agent count 7→6
- [ ] Phase 10A: `todo.md` — mark Plan 197 Phase 5 as OBSOLETE
- [ ] Phase 10B: `todo.md` — check Plan 198 section for ui-inspector reference
- [ ] Phase 10C: `truly-open-tasks.md` — mark Plan 197 Phase 5 as OBSOLETE

# Rules

- Do NOT touch any application code (`src/` directory) — this is pure infrastructure
- Do NOT modify any existing skill files in `.claude/skills/` — they are unaffected
- Do NOT modify `git-agent.md`, `software-architect.md`, `product-manager.md`, `breadcrumb-navigator.md`
- Do NOT create any new agent files — gstack's agents are self-contained in `~/.claude/skills/gstack/`
- When deleting `ui-inspector.md`, do a clean `rm` — do NOT leave a deprecation stub
- Every text replacement must be exact-match — read the file first, verify text exists, then replace
- No auto-commit — present summary and ask for confirmation before any git operations

# Done when

1. `CLAUDE.md` has a `## gstack` section listing all available gstack skills
2. `.claude/agents/ui-inspector.md` does NOT exist (deleted)
3. `team-leader.md` Section 4 says "Visual QA (via gstack)" and references `/qa`
4. `qa-engineer.md` Section 4 says "Visual QA (via gstack)" and references `/qa`
5. `security-officer.md` has a `/cso` callout after the Model Guidance line
6. `copilot-instructions.md` §0 has NO `UI Inspector` trigger — replaced by `Visual QA (via gstack)` trigger
7. `copilot-instructions.md` §0.4 UI Verification Gate references `/qa` not `/ui-inspector`
8. `copilot-instructions.md` §0.5 Model Routing table has NO `UI Inspector` row
9. `agent.md` Agent Task Force table has NO `UI Inspector` row — has 6 agents, not 7
10. `agent.md` Core Skills section lists gstack tools
11. `agent.md` Post-Execution Gate includes `/qa` step for layout changes
12. `validate-agent-refs.md` expects 6 agents (no `ui-inspector`)
13. Plan 197 Phase 5 marked OBSOLETE in both `todo.md` and `truly-open-tasks.md`
