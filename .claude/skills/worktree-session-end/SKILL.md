---
name: worktree-session-end
description: Closes a worktree branch session — commit, push, PR, merge, cleanup. Strictly for worktree feature branches. Hard stop on main.
---

# Worktree Session End — foodVibe 1.0

> **[Claude Code only]** Read this skill when the user says "ship it", "ship", "end session",
> "done", "I'm done", "wrap up", or "finish up" — **only on worktree feature branches**.
> This skill is strictly for closing worktrees. It does NOT handle main-branch sessions.

## Guard: Main Branch Check (runs first)

```bash
git branch --show-current
```

If result is `main` or `master`:
> "You are on `main`. `worktree-session-end` is for worktree branches only.
> To end a session on main, say 'wrap up' and I will run `session-handoff` instead."

**Stop. Do not proceed.**

---

## Phase 1 — Silent Preparation (Zero Prompts)

Run all of the following **silently** — no output to the user yet:

```bash
git rev-parse --show-toplevel
git branch --show-current
git worktree list --porcelain
cat .worktree-port 2>/dev/null || true
git status --short
git log main..HEAD --oneline 2>/dev/null | head -20
git diff --stat HEAD
```

From these results, determine:
- `mainRepoPath` — absolute path from `git rev-parse --show-toplevel`
- `currentBranch` — from `git branch --show-current`
- `worktreePath` — from `git worktree list --porcelain`: the path for `currentBranch` if it differs from `mainRepoPath`; otherwise empty
- `worktreePort` — from `cat .worktree-port`: port number if present, otherwise empty
- `uncommittedFiles` — list from `git status --short`
- `commitsAhead` — count from `git log main..HEAD`
- `commitGroups` — apply commit-to-github grouping logic (feat/fix/chore splits) silently
- `prDraft` — draft the PR title and body: title = `type(scope): short description` (under 70 chars); body = 2–4 bullet summary + test plan checklist

**Never-stage**: `.gitignore` handles exclusions. No manual filter needed.

**Early exit — nothing to ship:**
If `uncommittedFiles` is empty AND `commitsAhead` is 0:
> "Nothing to ship. Branch `<currentBranch>` is clean."
Stop.

---

## Phase 2 — The Unified Ship Plan (The Only Gate)

Render ONE combined visual. Never split into multiple questions.

```
🚢 Ship Plan — <currentBranch>

[1/4] 📦 Commit & Push
       <type(scope): commit message> (<+N/-N lines>)
       📄 path/to/file1
       📄 path/to/file2

       (repeat for each commit group)

[2/4] 🌿 Create Pull Request
       Target: main
       Title: <prDraft title>
       • <bullet 1>
       • <bullet 2>
       Test plan: [ ] <item 1>  [ ] <item 2>
       (edit the PR text before replying if you want to change it)

[3/4] ✅ Auto-Merge
       Method: --merge  |  Runs from main repo (avoids worktree lock)

[4/4] 🗑  Cleanup
       Kill dev server on port <worktreePort>  (if port was active)
       Remove worktree at <worktreePath>

       (omit [4/4] if worktreePath is empty — branch lives in main repo)
       (omit port line if worktreePort is empty)
```

If there is no worktree to remove, show `[3/3]` and omit [4/4].

Wait for user response. Do not proceed until response arrives.

**Response handling:**
- `A` / `Yes` / `Go` → full pipeline (Phase 3, all steps)
- `Skip merge` → Phase 3 Steps 1–2 only (commit + push + PR, no merge, no cleanup)
- `Keep worktree` → Phase 3 Steps 1–4 (skip Step 5)
- `X` / `cancel` → output "Cancelled. Your changes are safe on branch `<currentBranch>`." Stop.

---

## Phase 3 — The Automated Chain (Zero Further Prompts)

Execute every step sequentially without pausing for approval.

### Step 1 — Commit & Push

> **Worktree boundary:** You are already on the feature branch inside the worktree.
> Do NOT run `git checkout main` or create a new branch — that will fail because `main` is
> locked in the main repo. Stage, commit, and push on the current branch directly.

Before committing, silently run the specs + security gate from commit-to-github Phase 0:
- Check if any changed `.ts` files have matching `.spec.ts` files — run them if found
- Check if any changed files match auth-sensitive patterns — surface if found

Then for each commit group from Phase 1:
```bash
git add <file1> <file2> ...
git commit -m "type(scope): message"
```

After all commits:
```bash
git push -u origin <currentBranch>
```

### Step 2 — Create Pull Request

**CRITICAL:** Run from `mainRepoPath`, not from inside the worktree.
`git checkout main` inside a worktree is fatal — `main` is locked in the main repo.

Use the title and body drafted in Phase 1. If the user amended the PR text before approving, use the amended version.

**Windows-safe body file:**
```
Write tool → C:/Users/<username>/AppData/Local/Temp/pr-body.md
gh pr create --base main --head <currentBranch> --title "<prDraft title>" --body-file "C:/Users/<username>/AppData/Local/Temp/pr-body.md"
```

Detect username from `git config user.name` or working directory path. Do NOT use `/tmp/pr-body.md`.

Capture the PR number from the output for Step 3.

### Step 3 — Merge to Main

**CRITICAL:** Run from `mainRepoPath` context.

```bash
cd "<mainRepoPath>"
gh pr merge <PR_NUMBER> --merge --delete-branch
```

Before merging, verify the PR is mergeable:
```bash
gh pr view <PR_NUMBER> --json mergeable --jq '.mergeable'
```
- `"MERGEABLE"` → proceed
- `"CONFLICTING"` → stop. Report conflict, ask user to resolve then re-run
- `"UNKNOWN"` → wait 4s and retry once. If still unknown, report and ask user to check manually

### Step 4 — Sync Main

```bash
git -C "<mainRepoPath>" pull origin main
```

### Step 5 — Kill Dev Server & Remove Worktree

Only run if `worktreePath` is non-empty.

**5a — Kill the dev server (if port was recorded)**

```bash
PORT=<worktreePort>
PID=$(netstat -ano 2>/dev/null | grep ":${PORT}" | grep LISTENING | awk '{print $5}' | head -1)
[ -n "$PID" ] && taskkill /PID "$PID" /F 2>/dev/null || true
```

If `worktreePort` is empty, skip 5a silently.

**5b — Remove the worktree**

```bash
git -C "<mainRepoPath>" worktree remove "<worktreePath>" --force
```

`--force` is needed because `node_modules` and `.angular/cache` are present.

---

### Mid-Pipeline Pause: CI Failure Only

After Step 2 (PR creation), check CI:
```bash
gh pr checks <PR_NUMBER> 2>/dev/null | head -20
```

If CI is **failing**:
> "CI checks are failing: [list]. Merge anyway? (Y / N)"
- Y → continue to Step 3
- N → output "PR `<URL>` left open. Re-run when CI is fixed." Stop.

If CI passes or no CI configured → continue without pausing.

---

## End State

After Phase 3 completes:
> "Shipped. `<currentBranch>` → PR #N → merged. Main is now at `<hash>`."

Or if worktree was removed:
> "Shipped. `<currentBranch>` → PR #N → merged. Port <worktreePort> closed. Worktree removed. Main is now at `<hash>`."

---

## Safety Rules

1. Never run `git reset --hard` or `git push --force`.
2. Never delete uncommitted work — Step 1 commits everything before any cleanup.
3. Never commit directly to `main`.
4. Never run `git checkout main` from inside a worktree — always use `cd "<mainRepoPath>"` first.
5. If user says "abort" or "stop" at any prompt — halt immediately.

---

## Discard Path (explicit user request only)

If the user explicitly says "discard", "throw away", or "delete branch":

Ask ONE confirmation:
> "This will permanently delete all uncommitted changes on `<currentBranch>` and remove the worktree. Are you sure? (yes / no)"

If yes:
```bash
cd "<mainRepoPath>"
git worktree remove "<worktreePath>" --force 2>/dev/null || true
git branch -D "<currentBranch>" 2>/dev/null || true
```

---

## Related Skills

- `.claude/skills/worktree-setup/SKILL.md` — provision a new worktree
- `.claude/skills/commit-to-github/SKILL.md` — standalone commit tool (non-worktree sessions)
- `.claude/skills/session-handoff/SKILL.md` — use when on `main` (no worktree)
