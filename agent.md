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

## Playwright MCP (on-demand)

Playwright is **disabled by default** to save CPU.
To enable for a session: set `"playwright@claude-plugins-official": true` in `~/.claude/settings.json` and restart Claude Code. Disable again when done.

Skills that use Playwright MCP:
- `auto-solve.md`: uses `mcp__playwright__*` as fallback **only** if gstack `/browse` daemon is unavailable. Under normal conditions `/browse` handles all QA screenshots. If you run `/auto-solve` and `/browse` is down, re-enable Playwright first.

---

## Core Skills (`.claude/skills/`)
- **GitHub**: `git-agent` (`.claude/agents/git-agent.md`), `github-sync`, `worktree-setup`, `deploy-github-pages`
- **Development**: `add-recipe`, `cssLayer`, `angularComponentStructure`, `elegant-fix`
- **Lifecycle**: `save-plan`, `end-of-session-agent`, `session-handoff`, `worktree-session-end`, `techdebt`, `update-docs`
- **gstack**: `/browse`, `/qa`, `/cso`, `/investigate`, `/careful`, `/freeze`, `/retro`, `/document-release`, `/ship`, `/land-and-deploy`

All skill triggers defined in `copilot-instructions.md §0`.

## Commands (`.claude/commands/`)
| Command | Purpose |
|---------|---------|
| `new-feature.md` | Structured feature scoping — forcing questions, landscape search, premise challenge, forced alternatives → produces sharp brief for plan-implementation |
| `plan-implementation.md` | Architectural brief → codebase scan → implementation plan (read-only phase) |
| `execute-it.md` | Execute the implementation plan from this conversation (full write phase) |
| `test-pr-review-merge.md` | Full CI: test, PR, review, merge to main |
| `validate-agent-refs.md` | Health check: verify all agent file cross-references are valid |
| `auto-solve.md` | Autonomous plan executor — finds, validates, executes, surfaces for approval |
| `evaluate-me.md` | Session retrospective — evaluates agent performance, saves actionable report with file change suggestions |
| `reflect.md` | Two paths: `/reflect` (session retrospective) or `/reflect <skill> [budget]` (autonomous improvement loop with optional iteration budget) |
| `reflect-list.md` | Batch reflection — reviews tool failure log, applies fixes one by one |
| `nightly-audit.md` | Autonomous nightly code audit — scans 6 violation categories, auto-fixes safe issues, flags the rest |
| `audit-report.md` | Morning command — displays the latest nightly audit report summary |

## Preflight Checklist
1. Read this file + `copilot-instructions.md` (mandatory gate).
1.5. **MemPalace wake-up (once per session):**
     - Run `mempalace_diary_read(agent_name="claude-main", last_n=3)` to see what past sessions worked on
     - Run `mempalace_status()` to confirm palace is live
     - If either fails → note "MemPalace unavailable" and continue (non-blocking)
2. **GitHub sync (once-per-day):** Check `notes/github-sync/<today>.md` — if missing, run `github-sync` skill.
3. Check session handoff: `.claude/sessions/` (most recent) or `notes/session-handoffs/` (legacy, last 3 days).
4. Check `.claude/todo.md` for related pending work.
5. **[Claude Code] Branch gate — MANDATORY before any work:**
   Run `git branch --show-current`.
   - On `main` or `master` → derive a branch name from the task (`feat/`, `fix/`, or `chore/` + 3–5 word kebab slug), then check occupancy (see below), then `git checkout -b <name>` — all **before reading any code or making any changes**
   - Already on a feature/fix/chore branch → still run the occupancy check below
   - Exception: user explicitly said "work on main" or "collaborate on branch X" → honor it and note it

   **Occupancy check** — run for every candidate branch name:
   ```bash
   ls -t docs/session-state-<branch-slug>-*.md 2>/dev/null | head -1
   ```
   If a file exists and `date +%s` minus its mtime is under 14400 (4 hours) → branch is occupied by another agent. Append `-2` to your slug (then `-3`, `-4`) until the check comes back empty, then use that name.
6. **[Claude Code] Open reflection items:** Scan `.claude/reflect/open/*.reflect.md` for files containing `status: open`. If any found, output the reflection banner below before proceeding with the user's task. If none found, skip silently.

### Reflection Banner (step 6 output)

When open reflection items exist, output this banner (fill in dynamic values):

```
╔══════════════════════════════════════════════════════════╗
║  OPEN REFLECTION ITEMS                                   ║
║  Last auto-reflect run: <timestamp from newest file>     ║
║  -> Found <N> issues · Applied <K> fix(es) · <M> open    ║
╠══════════════════════════════════════════════════════════╣
║  Stop mid-run:  ! echo. > .claude/reflect/.skip          ║
╚══════════════════════════════════════════════════════════╝
```

Values:
- **N** = total `.reflect.md` files in `.claude/reflect/open/` (all statuses)
- **K** = files with `status: resolved` AND `## Action Taken` containing "Applied fix (kept)"
- **M** = files with `status: open`
- **timestamp** = `created:` value from the newest `.reflect.md` file

After displaying the banner, continue with the user's task. Do NOT attempt to resolve the open items — the auto-reflect process handles that.

## Post-Execution Gate
After completing any plan execution:
1. Run `ng build` or full `getDiagnostics` — mandatory, no exceptions. Do not skip because changes look "mechanical" or "safe".
2. If build fails → fix before reporting completion.
3. After any change → follow `validation-checklist.md`: show the validation checklist, then ask "Should I verify this myself, or will you check it?" Do not auto-run `/qa`.
4. Do NOT run the full test suite here — run tests only on explicit user request.