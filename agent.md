---
name: agent
description: Entry point — points to the Master Instructions, agent roster, and core skills
---

# Agent Guide

Read this and `.claude/copilot-instructions.md` at the start of every task.

> **Model Guidance:** Routine session tasks (file reads, preflight checks, todo updates, git status) → use Haiku/Flash always. Only escalate to Sonnet when a skill or agent phase explicitly requires High Reasoning.

## Core Rules & Source of Truth
- **Master Instructions**: `.claude/copilot-instructions.md` — single source of truth for all project rules, skill triggers, security requirements, model routing (§0.5), and task force doctrine (§0.4).
- **Active Tasks**: `.claude/todo.md` (update status after each sub-task).
- **Plans**: `plans/NNN-slug.plan.md` — write with save-plan skill on user confirmation.
- **Skills are self-contained**: Do NOT re-read `copilot-instructions.md` when executing a skill — each skill carries its own inline rules.

## Agent Task Force (`.claude/agents/`) — Claude Code only

See `copilot-instructions.md §0.3` for the full agent roster and when to invoke each.
See `copilot-instructions.md §0.4` for Task Force sizing and standard sequence.
See `copilot-instructions.md §0.5` for model routing (Efficiency Tiers).

## Core Skills (`.claude/skills/`)
- **GitHub**: `git-agent` (`.claude/agents/git-agent.md`), `github-sync`, `worktree-setup`, `deploy-github-pages`
- **Development**: `add-recipe`, `cssLayer`, `angularComponentStructure`, `elegant-fix`
- **Lifecycle**: `save-plan`, `session-handoff`, `worktree-session-end`, `techdebt`, `update-docs`
- **gstack**: `/browse`, `/qa`, `/cso`, `/investigate`, `/careful`, `/freeze`, `/retro`, `/document-release`, `/ship`, `/land-and-deploy`

All skill triggers defined in `copilot-instructions.md §0`.

## Commands (`.claude/commands/`)
| Command | Purpose |
|---------|---------|
| `plan-implementation.md` | Architectural brief → codebase scan → implementation plan (read-only phase) |
| `execute-it.md` | Execute the implementation plan from this conversation (full write phase) |
| `test-pr-review-merge.md` | Full CI: test, PR, review, merge to main |
| `validate-agent-refs.md` | Health check: verify all agent file cross-references are valid |
| `auto-solve.md` | Autonomous plan executor — finds, validates, executes, surfaces for approval |
| `evaluate-me.md` | Session retrospective — evaluates agent performance, saves actionable report with file change suggestions |

## Preflight Checklist
1. Read this file + `copilot-instructions.md` (mandatory gate).
2. **GitHub sync (once-per-day):** Check `notes/github-sync/<today>.md` — if missing, run `github-sync` skill.
3. Check session handoff: `notes/session-handoffs/` (last 3 days).
4. Check `.claude/todo.md` for related pending work.
5. **[Claude Code]** Verify current branch (`git branch --show-current`). Never commit to `main`.

## Post-Execution Gate
After completing any plan execution:
1. Run `ng build` or full `getDiagnostics` — mandatory, no exceptions. Do not skip because changes look "mechanical" or "safe".
2. If build fails → fix before reporting completion.
3. If the completed plan involved layout-affecting changes → run `/qa http://localhost:<port>/<affected-page>` to verify visually. Port: read `.worktree-port`, fallback 4200. If dev server unreachable, flag to user.
4. Do NOT run the full test suite here — run tests only on explicit user request.