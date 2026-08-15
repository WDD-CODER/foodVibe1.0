---
name: "Create /evaluate-me slash command"
overview: "Reusable retrospective command that evaluates any agent session and produces actionable report with file change suggestions"
todos: ["Create .claude/retrospectives/ directory with .gitkeep", "Create .claude/commands/evaluate-me.md with full retrospective prompt", "Update agent.md commands table to include evaluate-me"]
isProject: false
---

# Goal

Create a reusable `/evaluate-me` slash command that evaluates any agent session and produces an actionable retrospective with file change suggestions.

# Atomic Sub-tasks

- [ ] Create `.claude/retrospectives/` directory with `.gitkeep`
- [ ] Create `.claude/commands/evaluate-me.md` with full retrospective prompt (5-step workflow: inventory, evaluate, extract patterns, suggest file changes, save report)
- [ ] Update `agent.md` commands table to include `evaluate-me.md`

# Constraints

- Command must be agent-agnostic (works for any agent type)
- Report must be actionable (concrete edit suggestions, not vague advice)
- Must save to file before `/compact` loses context
- Named `/evaluate-me` to avoid collision with gstack `/retro` (weekly engineering retrospective)

# Done when

- `/evaluate-me` command exists at `.claude/commands/evaluate-me.md`
- Running `/evaluate-me` in any Claude Code session produces a saved retrospective with file change suggestions
- `.claude/retrospectives/` directory exists for storing reports

## Backend Impact — None
