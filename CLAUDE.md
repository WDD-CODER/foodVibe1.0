# CLAUDE.md

## MANDATORY GATE

Read the two files below at session start, then confirm **"Yes chef!"**

1. [`agent.md`](agent.md) — preflight checklist, agent index, operational workflow
2. [`.claude/copilot-instructions.md`](.claude/copilot-instructions.md) — all project rules, skill triggers, Angular/CSS/Git standards

> **Claude Code:** Read both files once (first message only) — do not re-read on subsequent messages.
> **Subagents** spawned via Agent tool are exempt from this gate.
> **Skills are self-contained** — do NOT re-read `copilot-instructions.md` inside a skill.

---

## Hard Rules (always enforced)

- **Branch guard**: Never write on `main`. Branch-guard hook auto-creates `feat/session-YYYYMMDD` if needed. Announce `BRANCH_GUARD:` output immediately.
- **MemPalace first**: Every search starts with `mempalace_search()`. See priority tree in `.claude/copilot-instructions.md §Codebase Search`.
- **Subagent MemPalace gate**: YOU run `mempalace_search()` before spawning any agent. Pass results as `## MemPalace Context` in the prompt. Never instruct subagents to call it themselves.
- **Browser tools**: NEVER call `mcp__claude-in-chrome__*` or raw Playwright MCP directly. ALL browser interaction goes through `/browse` (gstack).
- **No semicolons in `.ts` files.** Single quotes in TS, double quotes in HTML.
- **Build gate**: `ng build` must pass before any commit. No exceptions.

---

## Path Router

Choose the path that matches your task. Each path loads the right context automatically.

| Task type | Command | Loads | Invokes |
|-----------|---------|-------|---------|
| New feature | `/feat` | standards-angular, standards-domain | plan-implementation, execute-it, team-leader |
| Planning / PRD | `/plan` | prd-template, hld-template | product-manager, software-architect |
| Bug fix | `/fix` | matching standards section (css/auth/data/ui/api) | investigate, elegant-fix |
| Refactor | `/refactor` | standards-angular, cssLayer, techdebt | team-leader |
| Security | `/security` | standards-security, auth-and-logging, auth-crypto | security-officer |

> Commands live in `.claude/commands/`. All existing commands continue to work as aliases.

---

## Session Management

- Session-state file path is injected by `session-startup.sh` → `SESSION SAVE TARGET:` line.
- Read `.claude/.session-state-path` if startup message unavailable.
- Mid-task snapshot: run `/checkpoint`.
- Session end: run `/ship` (4-phase, < 2 min) or `/end-session` (full pipeline, alias).

---

## Standards & Agents (pointers)

- Full rules: `.claude/copilot-instructions.md`
- Agent roster: `copilot-instructions.md §0.3`
- Task force sizing: `copilot-instructions.md §0.4`
- Model routing: `copilot-instructions.md §0.5`
- gstack skills: `copilot-instructions.md §gstack`
