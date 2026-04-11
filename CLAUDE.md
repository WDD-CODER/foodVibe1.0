# CLAUDE.md

## MANDATORY GATE

Read the two files below at the start of each session, then confirm **"Yes chef!"**
If a file cannot be read, respond **"No chef! I cannot read [filename]"** and stop.

1. [`agent.md`](agent.md) — preflight checklist, agent index, operational workflow
2. [`.claude/copilot-instructions.md`](.claude/copilot-instructions.md) — all project rules, skill triggers, Angular/CSS/Git standards

> **Claude Code:** Read both files once at session start (first message only). They remain in context for the rest of the conversation — do not re-read on subsequent messages.
> **Cursor:** Read them at the start of each new task context.

> **Command in first message**: If the first message also contains a command or task (e.g. `/commit-github`), confirm **"Yes chef!"** and immediately execute it — do not stop after the confirmation.

> **Skills are self-contained**: Individual skills carry their own inline rules. Do NOT re-read `copilot-instructions.md` when executing a skill unless the skill explicitly instructs it.

## Subagent Gate Exemption

Subagents spawned via the Agent tool are running inside a task — they do **not** perform the session-start preflight ("Yes chef!" gate). The gate applies to main-session Claude only.

## Subagent MemPalace Rule

**Before spawning ANY subagent** (Explore, Plan, or named agents):
1. **YOU** (main Claude) call `mempalace_search(query="<relevant keywords>", limit=5)` first
2. Include the top results as a `## MemPalace Context` section at the TOP of the subagent prompt
3. Do NOT instruct the subagent to call `mempalace_search` — MCP tools are unreliable in subagent context ([GitHub #13898](https://github.com/anthropics/claude-code/issues/13898))
4. If MCP unavailable in main session → note in the prompt: "MemPalace unavailable this session"
5. If search returns no results → note: "MemPalace searched, no relevant results"

MemPalace has 6,000+ embedded drawers with project knowledge. Subagents receive this knowledge as injected context, not as tool calls they cannot reliably execute.

## MemPalace Orient Rule (MANDATORY)

**At the START of every task** — before reading files, before planning, before writing code — run:
```
mempalace_search(query="<2-3 keywords from the user's request>", limit=5)
```
This fires on ANY user request that involves code, files, components, or project knowledge. The only exceptions:
- Pure conversation (questions about Claude Code itself, general chat)
- A skill's Phase 0 already covers the same search → skip (no double-search)
- MCP unavailable → skip silently

**Why at task start, not at edit time:** If you wait until the edit step, read-only investigations and already-completed tasks skip it entirely. Searching first gives you context that shapes how you approach the task — even if you end up not writing code.

This is the **universal safety net** — skills have their own Phase 0, but this rule covers everything that falls between the cracks.

## Branch Rule

- Never commit directly to `main` or `master`.
- Writing code on `main`? Run `git checkout -b feat/<name>` or `fix/<name>` first.
- Need an isolated worktree for parallel multi-agent work? Use `/worktree-setup` on demand — **not automatic**.
- **Worktree boundary**: When working inside an isolated worktree, never attempt `git checkout main` from within it. All PR creation and merges must be executed using `git -C <mainRepoPath>` from the root repository path to avoid `fatal: main is already used` errors.

## gstack — Browser QA & Extended Tooling

gstack is installed at `~/.claude/skills/gstack/`. It provides browser automation, visual QA, safety guardrails, and lifecycle tools that complement our existing workflow.

**Use /browse from gstack for all web browsing. Never use mcp__claude-in-chrome__* tools.**

### gstack skills available in this project:
- **Browser QA**: `/browse`, `/qa`, `/qa-only`, `/connect-chrome`, `/setup-browser-cookies`, `/canary`, `/benchmark`
- **Review & Security**: `/review`, `/cso`, `/investigate`
- **Shipping & Deploy**: `/ship`, `/land-and-deploy`, `/setup-deploy`, `/document-release`
- **Safety**: `/careful`, `/freeze`, `/guard`, `/unfreeze`
- **Lifecycle**: `/retro`, `/gstack-upgrade`
- **Design**: `/design-review`, `/design-shotgun`, `/design-consultation`

### What gstack does NOT replace (our own workflow remains primary):
- Planning: briefs come from the Claude.ai planning brain → `/plan-implementation` → `/execute-it`
- Git: `git-agent` handles all commit/push/PR/batch operations
- Domain skills: `cssLayer`, `angularComponentStructure`, `add-recipe`, `elegant-fix`
- Agent orchestration: Team Leader, Software Architect, Product Manager, Breadcrumb Navigator
- Standards: `standards-angular.md`, `standards-security.md`, `standards-domain.md`, `standards-git.md`

### gstack skills NOT used (redundant with our workflow):
- `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/autoplan` — our planning brain + brief workflow is superior
- `/codex` — requires OpenAI Codex CLI, not in our stack
## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
