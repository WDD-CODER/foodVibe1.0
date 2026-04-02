---
name: Auto-solve command
overview: Create /auto-solve — autonomous agent workflow that finds the next incomplete plan, pre-validates, executes, self-validates, and surfaces for human approval before committing.
todos: []
isProject: false
---

# Auto-solve Command

## Goal
Create `/auto-solve` command — an autonomous agent workflow that finds the next incomplete plan from `todo.md`, validates and executes all checkboxes, self-validates, and surfaces for human approval before committing.

## Atomic Sub-tasks

- [ ] Create `.claude/commands/auto-solve.md` with full command content (both Playwright prefixes in allowed-tools)
- [ ] Edit `.claude/settings.json` — remove "playwright" from disabledMcpjsonServers
- [ ] Edit `agent.md` — add auto-solve row to commands table
- [ ] Edit `.claude/copilot-instructions.md` — add /auto-solve trigger after Security review line

## Rules
- Do NOT modify Team Leader agent file
- Do NOT create new agent files
- The 5-second pause in Phase 1 is intentional
- Sound signal uses PowerShell (Windows-specific)
- Playwright MCP enabling is a settings change only

## Done when
- `/auto-solve` command exists and is documented
- Running `/auto-solve` in a worktree session finds the first incomplete plan, presents summary, pre-validates, executes, runs ng build, beeps and shows approval prompt, on "approve" commits and offers next plan

## Backend Impact — None
