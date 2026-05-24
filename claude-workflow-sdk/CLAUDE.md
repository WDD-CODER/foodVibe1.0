# CLAUDE.md

## MANDATORY GATE

Read the two files below at session start, then confirm **"Yes chef!"**

1. [`agent.md`](agent.md) — preflight checklist, agent index, operational workflow
2. [`.claude/copilot-instructions.md`](.claude/copilot-instructions.md) — all project rules, skill triggers, [FRAMEWORK]/CSS/Git standards

> **Claude Code:** Read both files once (first message only) — do not re-read on subsequent messages.
> **Subagents** spawned via Agent tool are exempt from this gate.
> **Skills are self-contained** — do NOT re-read `copilot-instructions.md` inside a skill.

---

## Hard Rules (always enforced)

- **Branch guard**: Never write on `main`. Branch-guard hook auto-creates `feat/session-YYYYMMDD` as a placeholder. Before any push, `/ship` and git-agent rename it to a semantic name (`feat/…`, `fix/…`, `refactor/…`, `chore/…`). Announce `BRANCH_GUARD:` output immediately.
- **MemPalace first** *(when configured)*: Every search starts with `mempalace_search()`. See priority tree in `.claude/copilot-instructions.md §Codebase Search`. Skip silently if MemPalace MCP is not configured.
- **Subagent MemPalace gate** *(when configured)*: YOU run `mempalace_search()` before spawning any agent. Pass results as `## MemPalace Context` in the prompt. Never instruct subagents to call it themselves.
- **Browser tools**: NEVER call raw Playwright MCP directly. ALL browser interaction goes through `/browse` (gstack) if available.
- **[FRAMEWORK_SYNTAX_RULES]**: Fill in after `/init-repo` — e.g. "No semicolons in `.ts` files. Single quotes in TS, double quotes in HTML."
- **Build gate**: `[BUILD_COMMAND]` must pass before any commit. No exceptions.
- **Plugin cache edits**: Any edit to `~/.claude/plugins/cache/.../superpowers/` is overwritten on plugin version bump. Re-apply project-specific plugin edits after any superpowers plugin update.

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
| New feature | `/feat` | standards-[FRAMEWORK], standards-domain | plan-implementation, execute-it, team-leader |
| Planning / PRD | `/plan` | prd-template, hld-template | product-manager, software-architect |
| Bug fix | `/fix` | matching standards section (css/auth/data/ui/api) | investigate, elegant-fix |
| Refactor | `/refactor` | standards-[FRAMEWORK], cssLayer, techdebt | team-leader |
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

> **[PLACEHOLDER]** Add project-specific skill routing rows here after `/init-repo`.

| Trigger | Skill |
|---------|-------|
| Bugs, errors, "why is this broken" | `investigate` |
| Ship, deploy, push, create PR, end session | `ship` |
| Save progress, checkpoint, resume | `checkpoint` |
| CSS/styles, layout changes | `cssLayer` |
| Tech debt review | `techdebt` |
| Security audit | `auth-and-logging` |
