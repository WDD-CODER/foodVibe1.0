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
| Agent | File | Invoke when |
|-------|------|-------------|
| Team Leader | `team-leader.md` | Task spans >2 subsystems; agents conflict; progress report needed |
| Software Architect | `software-architect.md` | PRD exists and needs HLD; architecture trade-offs to evaluate |
| Product Manager | `product-manager.md` | Planning a new feature; writing a plan file; scoping work |
| Breadcrumb Navigator | `breadcrumb-navigator.md` | New `pages/<x>/` or app subtree; structural changes; after update-docs |
| QA Engineer | `qa-engineer.md` | Spec gaps; diagnosing failing tests; E2E creation |
| Security Officer | `security-officer.md` | Post-feature review of auth/storage/route changes; pre-deploy; security consult |
| UI Inspector | `ui-inspector.md` | Visual QA on explicit request or when layout changes need verification |

See `copilot-instructions.md §0.4` for Task Force sizing and standard sequence.
See `copilot-instructions.md §0.5` for model routing (Efficiency Tiers).

## Core Skills (`.claude/skills/`)
- **GitHub**: `commit-to-github`, `github-sync`, `worktree-setup`, `deploy-github-pages`
- **Development**: `add-recipe`, `cssLayer`, `angularComponentStructure`, `elegant-fix`
- **Lifecycle**: `save-plan`, `session-handoff`, `worktree-session-end`, `techdebt`, `update-docs`

All skill triggers defined in `copilot-instructions.md §0`.

## Commands (`.claude/commands/`)
| Command | Purpose |
|---------|---------|
| `test-pr-review-merge.md` | Full CI: test, PR, review, merge to main |
| `validate-agent-refs.md` | Health check: verify all agent file cross-references are valid |

## Preflight Checklist
1. Read this file + `copilot-instructions.md` (mandatory gate).
2. **GitHub sync (once-per-day):** Check `notes/github-sync/<today>.md` — if missing, run `github-sync` skill.
3. Check session handoff: `notes/session-handoffs/` (last 3 days).
4. Check `.claude/todo.md` for related pending work.
5. **[Claude Code]** Verify current branch (`git branch --show-current`). Never commit to `main`.