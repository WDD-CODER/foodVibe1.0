# End Session — foodVibe 1.0

> **[Claude Code only]** Read this skill when the user says "ship it", "ship", "end session",
> "done", "I'm done", "wrap up", or "finish up" — on **any** branch including `main`/`master`.
> If on `main`/`master`, auto-redirect to `session-handoff`. Never ask the user to do it manually.

## Automatic Trigger

Phrases that activate this skill:
`ship it` · `ship` · `done` · `end session` · `I'm done` · `wrap up` · `finish up` · `we're done` · `that's it`

---

## Phase 1 — Silent Preparation (Zero Prompts)

Run all of the following **silently** — no output to the user yet:

```bash
# Context
git rev-parse --show-toplevel
git branch --show-current
git worktree list --porcelain
cat .worktree-port 2>/dev/null || true

# Changes
git status --short
git log main..HEAD --oneline 2>/dev/null | head -20
git diff --stat HEAD
```

From these results, determine:
- `mainRepoPath` — absolute path from `git rev-parse --show-toplevel`
- `currentBranch` — from `git branch --show-current`
- `worktreePath` — from `git worktree list --porcelain`: the path for `currentBranch` IF it differs from `mainRepoPath`; otherwise empty (branch lives in main repo)
- `worktreePort` — from `cat .worktree-port`: the port number if present, otherwise empty
- `uncommittedFiles` — list of files from `git status --short`
- `commitsAhead` — count from `git log main..HEAD`
- `commitGroups` — apply commit-to-github grouping logic (feat/fix/chore splits) silently; apply never-stage filter (see below)

**Never-stage filter** — silently exclude these regardless of git status:
- `.gitignore`
- `.playwright-mcp/`, `.ui-inspector/`
- `*.png`, `*.jpg`, `*.jpeg` at repo root

**Early-exit conditions** (the only output before the Ship Plan):

- If `currentBranch` is `main` or `master`:
  Automatically invoke the `session-handoff` skill (`.claude/skills/session-handoff/SKILL.md`) and follow it in full. Do NOT stop or ask the user to run it manually.

- If `uncommittedFiles` is empty AND `commitsAhead` is 0:
  > "Nothing to ship. Branch `<currentBranch>` is clean."
  Stop.

Then proceed to Phase 2.

---

## Phase 2 — The Unified Ship Plan (The Only Gate)

Render ONE combined visual. Never split this into multiple questions.

```
🚢 Ship Plan — <currentBranch>

[1/4] 📦 Commit & Push
       <type(scope): commit message> (<+N/-N lines>)
       📄 path/to/file1
       📄 path/to/file2

       (repeat for each commit group if multiple)

[2/4] 🌿 Create Pull Request
       Target: main  |  Title: <commit message or branch name>

[3/4] ✅ Auto-Merge
       Method: --merge  |  Runs from main repo (avoids worktree lock)

[4/4] 🗑  Cleanup
       Kill dev server on port <worktreePort>  (if port was active)
       Remove worktree at <worktreePath>

       (omit [4/4] entirely if worktreePath is empty — branch lives in main repo)
       (omit port line if worktreePort is empty)

──────────────────────────────────────────────────────
Reply "A", "Yes", or "Go" → execute the full pipeline
Or: "Skip merge" · "Keep worktree" · "X" to cancel
```

If there is no worktree to remove (branch lives in main repo), show `[3/3]` instead and omit [4/4].

Wait for user response. Do not proceed until response arrives.

**Response handling:**
- `A` / `Yes` / `Go` → full pipeline (Phase 3, all steps)
- `Skip merge` → Phase 3 Steps 1–2 only (commit + push + PR, no merge, no cleanup)
- `Keep worktree` → Phase 3 Steps 1–4 (commit + push + PR + merge + sync, skip Step 5)
- `X` / `cancel` → output "Cancelled. Your changes are safe on branch `<currentBranch>`." Stop.

---

## Phase 3 — The Automated Chain (Zero Further Prompts)

Execute every step sequentially without pausing for approval.

### Step 1 — Commit & Push

For each commit group from Phase 1:
```bash
git add <file1> <file2> ...        # targeted — never git add . (never-stage filter applied)
git commit -m "type(scope): message"
```

After all commits:
```bash
git push -u origin <currentBranch>
```

### Step 2 — Create Pull Request

```bash
gh pr create --base main --head <currentBranch> --fill
```

Capture the PR number from the output for Step 3.

### Step 3 — Merge to Main

**CRITICAL:** Run from `mainRepoPath` context, not from inside the worktree.
This avoids `fatal: 'main' is already used by worktree`.

```bash
cd "<mainRepoPath>" && gh pr merge <PR_NUMBER> --merge --delete-branch
```

### Step 4 — Sync Main

```bash
git -C "<mainRepoPath>" pull origin main
```

No `--ff-only` flag. This avoids `fatal: Cannot fast-forward to multiple branches`.

### Step 5 — Kill Dev Server & Remove Worktree

Only run this step if `worktreePath` is non-empty (a real worktree directory exists).

**5a — Kill the dev server (if a port was recorded)**

If `worktreePort` is non-empty, find and kill the process listening on that port before removing the worktree.
Killing first prevents file-lock errors on Windows when deleting `node_modules` / `.angular/cache`.

```bash
# Windows (bash shell)
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
- N → output "PR `<URL>` left open. Re-run `ship it` after fixing CI." Stop.

If CI passes or no CI is configured → continue to Step 3 without pausing.

---

## End State

After Phase 3 completes, report in one line:
> "Shipped. `<currentBranch>` → PR #N → merged. Main is now at `<hash>`."

Or if worktree was removed:
> "Shipped. `<currentBranch>` → PR #N → merged. Port <worktreePort> closed. Worktree removed. Main is now at `<hash>`."

(omit the port line if `worktreePort` was empty)

---

## Safety Rules

1. Never run `git reset --hard` or `git push --force`.
2. Never delete uncommitted work — Step 1 commits everything before any cleanup.
3. Never commit directly to `main`.
4. If user says "abort" or "stop" at any prompt — halt immediately. All work stays intact.
5. Never stage files from the never-stage list.

---

## Discard Path (rare — explicit user request only)

If the user explicitly says "discard", "throw away", or "delete branch":

Ask ONE confirmation:
> "This will permanently delete all uncommitted changes on branch `<currentBranch>` and remove the worktree. Are you sure? (yes / no)"

If yes:
```bash
BRANCH="<currentBranch>"
WPATH="<worktreePath>"
cd "<mainRepoPath>"
git worktree remove "$WPATH" --force 2>/dev/null || true
git branch -D "$BRANCH" 2>/dev/null || true
```

If no: return to Phase 2.

---

## Related Skills

- `.claude/skills/commit-to-github/SKILL.md` — standalone commit tool (when user explicitly asks to commit, not end session)
- `.claude/skills/session-handoff/SKILL.md` — use when on `main` (no worktree)
