---
name: Validation Checklist Workflow Integration
overview: Inject an optional tree-format validation checklist into the execute-it execution command via a reusable @include instruction file.
todos: []
isProject: false
---

# Validation Checklist Workflow Integration

## Goal
Inject an optional validation checklist into execution agent workflows. The agent asks upfront — before any tool use — if the user wants a checklist. If yes, generates a tree-format checklist at completion. If no, finishes normally.

# Atomic Sub-tasks

- [x] Create `.claude/instructions/` directory (prerequisite — path didn't exist)
- [x] Create `.claude/instructions/validation-checklist.md` — reusable checklist instruction with tree-format output
- [x] Add `@.claude/instructions/validation-checklist.md` to top of `.claude/commands/execute-it.md`

## Constraints
- Apply only to execution agents (those that write/modify code)
- Do NOT apply to: software-architect, team-leader, product-manager, qa-engineer, git-agent, security-officer, ui-inspector
- All 8 existing agents in `.claude/agents/` are non-execution — none receive the @include
- The execute-it command is the only execution-layer file in this project

## Done When
- `.claude/instructions/validation-checklist.md` exists and matches spec
- `execute-it.md` has `@.claude/instructions/validation-checklist.md` at the very top
- All 8 agent files are untouched
