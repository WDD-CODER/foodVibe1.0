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

## Branch Rule

- Never commit directly to `main` or `master`.
- Writing code on `main`? Run `git checkout -b feat/<name>` or `fix/<name>` first.
- Need an isolated worktree for parallel multi-agent work? Use `/worktree-setup` on demand — **not automatic**.
- **Worktree boundary**: When working inside an isolated worktree, never attempt `git checkout main` from within it. All PR creation and merges must be executed using `git -C <mainRepoPath>` from the root repository path to avoid `fatal: main is already used` errors.