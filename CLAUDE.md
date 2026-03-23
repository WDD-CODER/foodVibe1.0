# CLAUDE.md — foodVibe 1.0

## MANDATORY GATE

Read the two files below at the start of each session, then confirm **"Yes chef!"**
If a file cannot be read, respond **"No chef! I cannot read [filename]"** and stop.

1. [`agent.md`](agent.md) — preflight checklist, agent index, operational workflow
2. [`.claude/copilot-instructions.md`](.claude/copilot-instructions.md) — all project rules, skill triggers, Angular/CSS/Git/Translation standards

> **Claude Code:** Read both files once at session start (first message only). They remain in context for the rest of the conversation — do not re-read on subsequent messages.
> **Cursor:** Read them at the start of each new task context.

## Branch Rule

- Never commit directly to `main` or `master`.
- Writing code on `main`? Run `git checkout -b feat/<name>` or `fix/<name>` first.
- Need an isolated worktree for parallel multi-agent work? Use `/worktree-setup` on demand — **not automatic**.
