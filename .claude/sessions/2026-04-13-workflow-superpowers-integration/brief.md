## Goal
Integrate high-value patterns from Superpowers plugin and gstack office-hours into our existing workflow pipeline â€” creating `/new-feature` command, enhancing `/plan-implementation`, enhancing `/execute-it`, and updating 4 agent files.

## Scope
### New files:
- `.claude/commands/new-feature.md` â€” new command implementing the scoping + brief generation flow

### Modified files:
- `.claude/commands/plan-implementation.md` â€” add No Placeholders scan, forced alternatives, adversarial subagent review
- `.claude/commands/execute-it.md` â€” add verification-before-completion gate, systematic-debugging protocol, smart visual QA offer
- `.claude/agents/team-leader.md` â€” add two-stage review dispatch (spec compliance â†’ code quality)
- `.claude/agents/qa-engineer.md` â€” add systematic-debugging 4-phase protocol, RED-GREEN mandate for regression tests
- `.claude/agents//ship (formerly /ship)` â€” add verification-before-completion to Phase 10 evaluation
- `.claude/agents/software-architect.md` â€” add No Placeholders scan + forced alternatives to HLD output
- `.claude/copilot-instructions.md` â€” add `/new-feature` skill trigger to Â§0
- `agent.md` â€” add `/new-feature` to commands table

## Out of Scope
- No changes to gstack skills themselves
- No changes to `/brief` command (stays untouched)
- No TDD or test writing (these are prompt/instruction files, not code)
- No changes to CSS, Angular components, or application code
- No new agents â€” only enhance existing ones

## Success Criteria
- [ ] `/new-feature` command exists and implements: forcing questions (with push pattern, smart-skip, escape hatch), landscape awareness (WebSearch), premise challenge, prior work discovery (MemPalace + plans/), forced alternatives, and outputs a sharp brief that feeds into `/plan-implementation`
- [ ] `/new-feature` has exactly 3 hard stops: (1) landscape search finds significant existing solution, (2) premise challenge agree/disagree, (3) choose approach + confirm brief
- [ ] `/new-feature` escape hatch works: first "skip" â†’ 2 most critical remaining questions then proceed; second "skip" â†’ straight to brief generation
- [ ] `/plan-implementation` enhanced with: No Placeholders scan, forced 2-3 alternatives before user picks, adversarial subagent review of merged plan
- [ ] `/execute-it` enhanced with: automatic verification-before-completion (build/test) after each task, systematic-debugging 4-phase protocol when bugs are hit, smart visual QA offer (only for UI-touching tasks, only after code verification passes)
- [ ] retired coordinator agent has two-stage review dispatch pattern (spec compliance â†’ code quality)
- [ ] CI / ng test agent has systematic-debugging protocol and RED-GREEN mandate
- [ ] /ship Phase 10 uses verification-before-completion (fresh evidence, not prior results)
- [ ] retired architect role agent has No Placeholders scan and forced alternatives in HLD output
- [ ] All skill triggers registered in copilot-instructions.md Â§0 and agent.md commands table
- [ ] Build passes (`ng build`) â€” no regressions from instruction file changes

## Session ID
2026-04-13-workflow-superpowers-integration
