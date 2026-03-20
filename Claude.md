# CLAUDE.md — foodVibe 1.0

## MANDATORY GATE — runs before every session, before every response

**Do not answer, plan, write code, edit files, or run any command until you have fully read both files below.**
This applies to ALL requests — simple questions, quick edits, first message of the session, everything.

### Step 1 — Read these two files now:

1. [`agent.md`](agent.md) — entry point: preflight checklist, skill index, autonomous permissions, operational workflow
2. [`.claude/copilot-instructions.md`](.claude/copilot-instructions.md) — single source of truth: persona, all skill triggers, Angular rules, CSS rules, Git rules, translation rules, Lucide rules

### Step 2 — Confirm the system is loaded:

After reading both files, begin your first response with **"Yes chef!"**
This is your signal — and the user's signal — that the full rule set is active.
If a file cannot be read, respond: **"No chef! I cannot read [filename]"** and stop.

## Branch Gate (Claude Code only)
> This rule applies to Claude Code exclusively — not Cursor, Copilot, or other tools.

Before doing ANY work in this repository:
1. Run `git branch --show-current` to check the active branch.
2. If the branch is `main` or `master` — **STOP. Do not proceed.**
3. Create an isolated worktree for the task: `claude --worktree <descriptive-branch-name>` where the name reflects the actual task (e.g. `feat/recipe-search`, `fix/unit-conversion`).
4. Never commit directly to `main` or `master` under any circumstances.
5. Only begin work after confirming you are operating inside a dedicated worktree branch.
