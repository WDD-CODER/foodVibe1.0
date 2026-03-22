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
2. If on `main` or `master`, ask the user:

   **Is this a multi-agent or complex task that needs an isolated branch?**
   a. Yes — create a worktree (follow Worktree Provisioning below).
   b. No — proceed on the current context. Use `git checkout -b feat/<name>` if you write any code. Never commit to `main` directly.

3. Never commit directly to `main` or `master` under any circumstances.

### Worktree Provisioning (only when answer is "Yes")

Execute in this exact order — do not skip steps:

**Step 1 — Prune stale refs (always first)**
```bash
git worktree prune
```
Clears stale references to previously deleted folders. Without this, `git worktree add` errors with "branch already checked out" or "folder already exists".

**Step 2 — Create the worktree (one level above the repo root)**
```bash
git worktree add ../worktree-<descriptive-branch-name> -b <branch-name>
```
Examples: `../worktree-feat-recipe-search`, `../worktree-fix-unit-conversion`
Creating at `../` prevents recursive file system indexing by the IDE.

**Step 3 — Copy environment variables**
```bash
[ -f .env ] && cp .env ../worktree-<branch-name>/.env
```
`.env` is git-ignored and does NOT carry over automatically. Without this, Angular services and backend connections fail silently.

**Step 4 — Install dependencies**
```bash
cd ../worktree-<branch-name> && npm install
```
`node_modules` does not carry over. Must install before running any `ng` or `npm` commands.
*(Optional upgrade: `pnpm install` uses hard links and costs near-zero extra disk space per worktree — worth switching if running 3+ agents regularly.)*

**Step 5 — Assign a port**
1. Count existing worktrees (excluding main): `git worktree list | grep -v "$(pwd)" | wc -l`
2. Candidate port = `4200 + count` (first worktree = 4201, second = 4202, etc.)
3. Verify port is free on Windows: `netstat -ano | findstr :<PORT>` — empty output = free. If occupied, increment and retry (max 10 attempts).
4. Write the port: `echo <PORT> > ../worktree-<branch-name>/.worktree-port`
5. Tell the user: "Worktree ready on branch `<branch>`. Dev server port: `<PORT>`. Use `ng serve --port <PORT>`."
