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
