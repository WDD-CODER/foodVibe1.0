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

- **Branch guard**: Never write on `main`. Branch-guard hook auto-creates `feat/session-YYYYMMDD` as a placeholder. Before any push, `/ship` and git-agent rename it to a semantic name (`feat/…`, `fix/…`, `refactor/…`, `chore/…`). Announce `BRANCH_GUARD:` output immediately.
- **MemPalace first**: Every search starts with `mempalace_search()`. See priority tree in `.claude/copilot-instructions.md §Codebase Search`.
- **Subagent MemPalace gate**: YOU run `mempalace_search()` before spawning any agent. Pass results as `## MemPalace Context` in the prompt. Never instruct subagents to call it themselves.
- **Browser tools**: NEVER call `mcp__claude-in-chrome__*` or raw Playwright MCP directly. ALL browser interaction goes through `/browse` (gstack).
- **No semicolons in `.ts` files.** Single quotes in TS, double quotes in HTML.
- **Build gate**: `ng build` must pass before any commit. No exceptions.
- **Plugin cache edits**: Any edit to `~/.claude/plugins/cache/.../superpowers/` is overwritten on plugin version bump. Active tracked edit: `superpowers/*/skills/subagent-driven-development/implementer-prompt.md` — "Files changed" report section requires `git diff --name-only` label per file (`(new change)` vs `(pre-existing — no write needed)`). Re-apply after any superpowers plugin update.

---

## Output Discipline (Claude Code only)

These rules apply to Claude Code execution only. Planning/discussion in claude.ai sessions is exempt — reasoning narrative has high value there.

**Suppress:**
- Preambles. No "I'll now do X". Start with the action.
- Postambles. No "I've successfully updated...". The diff is the receipt.
- Apology language. Mistakes get corrected, not eulogized.
- Sycophancy. No "Great question" / "You're absolutely right".
- Prose explaining code that is the answer.

**Preserve (diagnostic narrative REQUIRED when):**
- A tool call failed
- A verification gate failed (build, test, lint, diagnostics)
- A fix is being attempted (state hypothesis per systematic-debugging)
- The user asked "why" or "what happened"
- Producing retrospective or evaluation (`/evaluate-me`, `/reflect`)
- Writing a plan (`/plan-implementation`, `/feat` planning phase)

Status reports stay structured: `[x]`/`[ ]` checkboxes, file paths, line counts, exit codes. Tables and bullets, not prose paragraphs.

Session-start "Yes chef!" prefix remains required — it's a 3-token marker, not a preamble.

---

## Path Router

Choose the path that matches your task. Each path loads the right context automatically.

| Task type | Command | Loads | Invokes |
|-----------|---------|-------|---------|
| Pasted brief detected | (auto) | brief-detection skill | gates execution |
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

---

## Skill routing

When the user's request matches an available skill, invoke it via the Skill tool as your FIRST action. Do NOT answer directly or use other tools first.

| Trigger | Skill |
|---------|-------|
| Product ideas, brainstorming, "is this worth building" | `office-hours` |
| Bugs, errors, "why is this broken" | `investigate` |
| Ship, deploy, push, create PR, end session | `ship` |
| QA, test the site, find bugs | `qa` |
| Code review, check my diff | `review` |
| Update docs after shipping | `document-release` |
| Architecture review | `plan-eng-review` |
| Save progress, checkpoint, resume | `checkpoint` |
| Visual audit, design polish | `design-review` |
| Code quality, health check | `health` |
