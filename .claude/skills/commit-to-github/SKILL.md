# Commit to GitHub — foodVibe 1.0 (v3.0)

**Role**: Context-aware lifecycle manager for code changes.
**Safety Rule**: No `git add`, `git commit`, `git push`, or branch creation until the user has explicitly approved the visual tree in chat.
**Bash Rule**: Never combine git commands with `&&` or `|`. Issue each command as a **separate Bash tool call** (Windows/PowerShell safe).

---

## 🚦 Context Detection (Always First)

Before anything else, run:

```bash
git rev-parse --git-dir
```

- Output contains `/worktrees/` or `\worktrees\` → **Worktree mode**
- Otherwise → **Main-repo mode**

This single check routes every subsequent decision. No user prompt needed.

---

## 🚦 Selection Gate

**Check for an argument first.**

| Argument | Action |
|----------|--------|
| `c` | Auto-route: [C/Main] (checkpoint) or [C/Worktree] (push) based on context |
| `s` | Auto-route: [S-light], [S-full], or [S/Worktree] based on context + file types |
| `sl` | Force [S-light] — main repo only |
| `sf` | Force [S-full] — main repo only |

**If no argument**, ask:

> "Yes Chef! How are we handling this?
> **[C]** Checkpoint / Worktree Push — save locally (main) or push branch (worktree)
> **[S]** Ship — PR + merge (auto-detects light/full/worktree based on context)"

**[S] auto-detection logic** (runs after context detection + `git diff --name-only HEAD`):
- Worktree mode → [S/Worktree]
- Any `.ts`, `.scss`, `.css`, `.html`, `package.json`, `angular.json`, `tsconfig*.json` in changed files → [S-full]
- Otherwise (only `.md`, skill files, plan files, notes, `.yaml`, `.txt`, non-config `.json`) → [S-light]
- Zero changed files → report "Nothing to commit." Stop.

---

## Output Format Rules (apply throughout this skill)

- **Batch all bash commands before any text output**: Run every inspection command for the chosen path first — do not output any formatted text until ALL data gathering is complete.
- **Suppress preamble**: Go straight to work.
- **Single output block**: After all bash commands have run, emit one clean block.
- **Phase reporting**: Report gate status as one-liners. Format:
  - `⚡ Auto-rebased 3 commits from origin/main — clean.`
  - `⚡ No auth/TS changes — debt/spec/security/CSS gates skipped.`
  - `⚠ Spec FAIL — see below.`
- **File table**: Path + state + diff stat. No prose.
- **Tree first**: Output the visual tree before the approval prompt. Never reverse.
- **Commit message from diff only**: Draft commit type, scope, and message from `git diff HEAD` and `git diff --stat HEAD`. Never open changed files via the Read tool for this purpose.

---

## Path [C/Main] — Checkpoint

**Goal**: Fast named save point. No push, no PR, no diagnostics.

### Batch (3 commands, silent)

```bash
git branch --show-current
git status --short
git diff --stat HEAD
```

### Branch Guard

- Already on a feature branch → stay. Proceed to tree.
- On `main`/`master` → infer branch name from changed files:
  - Type: `feat`, `fix`, `refactor`, `chore`, `style`
  - Slug: derived from file paths and nature of changes
  - Show as `[Proposed: chore/your-slug-here]` in tree header

### Visual Tree

```
[Proposed: chore/update-commit-skill]
 └── 📦 Commit: chore(skills): <auto-summary>
      📄 path/to/file1
      📄 path/to/file2
```

Ask: **"Approve? Y to commit · N to cancel"**

### Execute (after approval only)

```bash
git checkout -b <branch-name>   # only if on main
git add <file1> <file2> ...
git commit -m "chore: checkpoint - <brief summary>"
```

**STOP.** No push. No PR. Report: `"✓ Checkpoint saved on <branch>."`

---

## Path [C/Worktree] — Worktree Push

**Goal**: Save progress on a worktree feature branch to remote. No PR, no merge.

### Batch (4 commands, silent)

```bash
git rev-parse --show-toplevel
git branch --show-current
git status --short
git diff --stat HEAD
```

### Visual Tree

```
[Worktree: feat/recipe-search — push only]
 └── 📦 Commit: feat(recipe-search): <auto-summary>
      📄 path/to/file.ts  (+N/-N)

Push only — no PR, no merge.
```

Ask: **"Approve? Y to commit + push · N to cancel"**

### Execute (after approval only)

```bash
git add <file1> <file2> ...
git commit -m "type(scope): message"
git push -u origin <branch>
```

Report: `"✓ Pushed <branch> to origin. Branch stays open — no merge."`

---

## Smart Rebase Rule (applies to all [S/Main] paths)

**Never ask "Rebase? y/n" mid-flow.** Auto-rebase when safe. Stop only on actual conflict.

**Auto-rebase silently when ALL hold:**
1. `git rev-list --count HEAD..origin/main` > 0
2. `git diff --name-only HEAD..origin/main` does NOT overlap `git diff --name-only HEAD`
3. Working tree has no surprise untracked files outside the planned commit

**Procedure (silent, part of Batch-0 processing):**

```bash
git stash push -u -m "commit-skill-pre-rebase"
git rebase origin/main
git stash pop
```

Report as one line in the output block: `⚡ Auto-rebased N commits from origin/main — clean.`

**Stop and ask only when:**
- File overlap exists between incoming origin/main commits and local changes
- `git rebase` exits non-zero (conflict markers)
- `git stash pop` exits with conflict markers

When stopped: run `git status --short`. Report every `UU` file. Ask: `"Keep mine / Keep theirs / Manual?"` Never auto-resolve.

---

## Path [S-light] — Ship Light

**Applies to**: `.md`, skill files, plan files, notes, config `.json` (non-`package.json`/`angular.json`), `.yaml`, `.txt` — no `.ts`, `.scss`, `.css`, `.html`, or Angular configs.

### Batch-0 (9 commands, all silent before any output)

```bash
git branch --show-current
git fetch origin
git rev-list --count HEAD..origin/main
git diff --name-only HEAD
git diff --name-only HEAD..origin/main
git status --short
git diff --stat HEAD
gh pr list --head <branch> --state open
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || echo "main"
```

Plus — if rebase needed (count > 0 and no file overlap): stash push + rebase + stash pop.

### Skipped Gates

| Gate | Reason |
|------|--------|
| Spec gate | No `.ts` files |
| Security gate | Auth filename patterns never match `.md`/config files |
| Tech debt | No app `.ts` in scope |
| CSS layer | No `.scss`/`.css` |

### Single Output Block

```
⚡ Auto-rebased 3 commits from origin/main — clean.    (omit if no rebase needed)
⚠ Open PR #12 found on branch — updating it.           (omit if no open PR)
⚡ No TS/scss/auth changes — spec/debt/security/CSS gates skipped.

Phase 1
Path                                         State
.claude/skills/commit-to-github/SKILL.md    modified (+142/-89 lines)
```

Then immediately: visual tree + approval prompt.

### Visual Tree

```
[Current: main]
 └── 🌿 Branch: chore/commit-skill-v3
      └── 📦 Commit: chore(skills): rewrite commit-to-github v3 flow
           📄 .claude/skills/commit-to-github/SKILL.md  (+142/-89)

      🔀 PR: "chore(skills): rewrite commit-to-github v3 flow"
           • Adds context-aware routing (main vs worktree)
           • Eliminates blocking rebase prompt with smart auto-rebase
           • Adds [S-light] fast path for docs/config/skills
           Test plan: [ ] commit sl on .md file  [ ] verify PR created  [ ] verify merge
```

**`settings.local.json` check**: If present in tree → read only its `permissions` and `env` keys. No secrets → add `✓ settings.local.json: no secrets detected`. Only escalate if an actual secret is found.

After tree:

> **"Approve to proceed, or deny to cancel. No git writes until you approve.**
> *A = approve + merge · P = approve + push · N = cancel*"

### Execute → Phase 4

---

## Path [S-full] — Ship Full

**Applies to**: any `.ts`, `.scss`, `.css`, `.html`, `package.json`, `angular.json`, `tsconfig*.json` in changed files.

### Batch-0 (10 commands, all silent before any output)

Same 9 as [S-light] plus:

```bash
git diff HEAD
```

Plus conditional rebase (same smart rebase rule).

### Gate Processing (all silent, in one internal pass)

**Spec gate**: from `git diff --name-only HEAD` output, find non-spec `.ts` files → find matching `.spec.ts` → if found, run:

```bash
npx ng test --include="<spec1> <spec2>" --no-watch --browsers=ChromeHeadless
```

- Pass → `✅ Spec gate: N specs — PASS`
- Fail → `❌ Spec gate: FAIL — <spec file>` (surfaces in output block)
- No matching specs → `⚡ Spec gate: no specs for changed files`

**Security gate**: grep captured `git diff --name-only HEAD` against `auth\.guard|auth\.interceptor|auth-crypto|user\.service|app\.routes`. Grep `git diff HEAD` for `localStorage\.setItem|sessionStorage\.setItem|\[innerHTML\]|bypassSecurityTrust`.

- Zero matches → `⚡ Security gate: clean`
- Matches → `⚠ Security gate: <file list>` (surfaces in output block with question)

**Tech debt**: if any `src/app/**/*.ts` in scope → read `.claude/skills/techdebt/SKILL.md`, run scoped analysis. List Critical/High only.

**CSS layer**: if any `.scss`/`.css` in scope → verify against `.claude/skills/cssLayer/SKILL.md`. Report violations.

### Single Output Block

```
⚡ Auto-rebased 3 commits from origin/main — clean.
✅ Spec gate: 2 specs — PASS.
⚡ Security gate: clean.
⚠ Tech debt: 1 High item — RecipeService: missing error handler (line 42)
⚡ CSS layer: no violations.

Phase 1
Path                                          State
src/app/core/services/recipe.service.ts      modified (+28/-4 lines)
```

If spec FAIL or security match found → surface blocking question IN this same output block before the tree:

```
❌ Spec gate FAIL: recipe.service.spec.ts — "should return empty array" failed.
Fix before building the plan, or proceed anyway? (fix / proceed)
```

Then: visual tree + approval prompt (same format as [S-light]).

### Execute → Phase 4

---

## Path [S/Worktree] — Worktree Ship

**Goal**: Full ship pipeline from a worktree — commit, push, PR, merge to main, cleanup.

### Batch-0 (9 commands, all silent)

```bash
git rev-parse --show-toplevel
git branch --show-current
git worktree list --porcelain
cat .worktree-port 2>/dev/null || true
git status --short
git diff --stat HEAD
git log main..HEAD --oneline 2>/dev/null | head -20
git diff --name-only HEAD
git diff HEAD
```

Apply spec + security gates (same logic as [S-full]) if `.ts` files present.

### Ship Plan (single output block)

```
🚢 Ship Plan — feat/recipe-search

[1/4] 📦 Commit & Push
       feat(recipe-search): add fuzzy filter to ingredient list (+28/-4)
       📄 src/app/pages/recipe-search/recipe-search.component.ts

[2/4] 🌿 Create Pull Request
       Target: main
       Title: feat(recipe-search): fuzzy ingredient filter
       • Adds debounced input filter to ingredient list panel
       • Matches against name and unit using includes()
       Test plan: [ ] open recipe builder  [ ] type filter  [ ] verify list narrows

[3/4] ✅ Auto-Merge
       Method: --merge  |  Runs from main repo path

[4/4] 🗑 Cleanup
       Remove worktree at <worktreePath>
       (omit [4/4] if not in a real worktree directory)
       (omit port line if .worktree-port absent)
```

If no worktree to remove → show `[3/3]` and omit [4/4].

> **"A = approve + merge + cleanup  ·  P = push + PR only  ·  N = cancel"**

### Execute

**Step 1 — Commit (on worktree branch — NEVER `git checkout main` from worktree)**

```bash
git add <file1> <file2> ...
git commit -m "type(scope): message"
git push -u origin <currentBranch>
```

**Step 2 — Create PR**

```bash
echo $USERPROFILE
```

```
Write tool → $USERPROFILE/AppData/Local/Temp/pr-body-<branch-slug>.md
gh pr create --base main --head <currentBranch> --title "<title>" --body-file "$USERPROFILE/AppData/Local/Temp/pr-body-<branch-slug>.md"
```

Capture PR number.

**Step 3 — Mergeability Gate**

```bash
gh pr view <PR_NUMBER> --json mergeable --jq '.mergeable'
```

- `"MERGEABLE"` → proceed
- `"CONFLICTING"` → stop. Instruct: `git fetch origin main && git rebase origin/main`, resolve, `git push --force-with-lease`. Do not merge.
- `"UNKNOWN"` → `sleep 4`, retry once. If still unknown → ask user to check manually.

**Step 4 — Merge (from main repo path)**

```bash
git -C "<mainRepoPath>" gh pr merge <PR_NUMBER> --merge
git -C "<mainRepoPath>" pull origin main
```

Verify: `gh pr view <PR_NUMBER> --json state` must equal `"MERGED"` before cleanup.

**Step 5 — Cleanup (only if `A` and worktreePath non-empty)**

Kill dev server if port recorded:
```bash
PORT=<worktreePort>
PID=$(netstat -ano 2>/dev/null | grep ":${PORT}" | grep LISTENING | awk '{print $5}' | head -1)
[ -n "$PID" ] && taskkill /PID "$PID" /F 2>/dev/null || true
```

Remove worktree:
```bash
git -C "<mainRepoPath>" worktree remove "<worktreePath>" --force
```

**End state**: `"Shipped. <branch> → PR #N → merged. Main is at <hash>. Worktree removed."`

---

## Phase 4 — Execute ([S-light] and [S-full] on main repo)

Never erase or discard user changes. No `git reset --hard`, `git clean -fd`, or force-push unless the user explicitly asks.

### 4.1 — Clean Tree Gate (Mandatory)

```bash
git branch --show-current
git status --porcelain
```

- **Already on `main`/default**: Modified files survive `git checkout -b` — **no stash needed**. Proceed.
- **On a non-default branch**: Stash first:
  ```bash
  git stash push -u -m "commit-skill-pre-sync"
  git checkout main
  ```

### 4.2 — Stashless Multi-Branch Execution

For each planned branch:

1. `git checkout -b <branch-name>` — creates branch from current HEAD; all modified files remain
2. `git add <file1> <file2> ...` — stage **only this branch's files**
3. `git commit -m "type(scope): message"`
4. `git push -u origin <branch-name>`
5. `git status --porcelain` — verify other branches' files still present
6. `git checkout main` — safe because no overlapping committed files
7. Repeat for next branch

> **When stash IS needed between branches**: Only if two planned branches touch the same file. After committing + pushing branch A: `git stash push -m "branch-b" -- <branch-b-files>` before switching; pop after creating branch B.

### 4.3 — PR Creation

Detect temp dir:
```bash
echo $USERPROFILE
```

```
Write tool → $USERPROFILE/AppData/Local/Temp/pr-body-<branch-slug>.md
gh pr create --title "<title>" --body-file "$USERPROFILE/AppData/Local/Temp/pr-body-<branch-slug>.md"
```

Do NOT hardcode a username. Do NOT use `/tmp/`.

**`--body-file` fallback**: If file not found → fall back to `--body` inline. Strip all lines starting with `#` (rewrite as bold text).

> **Why `--body-file`**: `--body "..."` with markdown `#` headings triggers Claude Code's security check and forces a permission prompt.

### 4.4 — Mergeability Gate (approve + merge "A" only)

```bash
gh pr view <pr-number> --json mergeable --jq '.mergeable'
```

- `"MERGEABLE"` → proceed.
- `"CONFLICTING"` → **stop.** Report: "PR #N has a conflict. Run: `git fetch origin main && git rebase origin/main`, resolve, then `git push --force-with-lease`." Do not attempt merge.
- `"UNKNOWN"` → `sleep 4`, retry once. If still `"UNKNOWN"` → report and ask user.

### 4.5 — Merge + Return to Default

```bash
gh pr merge <pr-number> --merge
gh pr view <pr-number> --json state
```

> **Do NOT use `--auto`** — asynchronous, returns before merge completes.

`state` must equal `"MERGED"` before proceeding.

```bash
git status --porcelain
```

If dirty:
```bash
git stash push -u -m "commit-skill-return"
git checkout main
git stash pop
```

If `git stash pop` conflicts → **stop immediately.** Run `git status --short`. Report every `UU` file. Ask which version to keep. After user confirms: `git add <file>`, `git stash drop`, verify `git status --porcelain` shows zero `UU` lines. Never continue past this without clean status.

> **Do NOT run `git pull` after checkout** — merge commit is already present locally.

---

## Phase 5 — Post-Execution ([S/Main] paths only)

### 5.1 — Update Todo

Open `.claude/todo.md`. Mark matching tasks `[x]` using committed branch names, messages, and file paths. Do not change unrelated tasks.

### 5.2 — Archive Completed Plan Sections

Scan `.claude/todo.md` for plan sections where ALL items are `[x]`, then apply four gates:

- **Gate 1**: Every `[ ]` must be `[x]`. Skip if any open items.
- **Gate 2**: Skip if any item contains `(deferred)`, `(skipped)`, `[~]`, or `<!-- TODO -->`.
- **Gate 3**: Before archiving:
  ```bash
  git log --oneline | grep -i "<plan-keyword>"
  gh pr list --state merged --search "<plan-keyword>"
  ```
  If neither returns results → warn: "No commits/PRs found for Plan NNN — skip archive?" Do not archive without at least one result or explicit user confirmation.
- **Gate 4**: If section has 5+ items → require explicit confirmation before archiving.

Move section to `todo-archive.md` (create if needed), appended with today's date and plan number.

### 5.3 — Breadcrumb Check

If any committed files added, removed, or renamed components, services, or pages → ask: `"Run breadcrumb-navigator for [dirs]?"` Do not block commit flow waiting for this answer.

---

## End State

After execute: all planned changes committed on intended branches, current branch is the default, no planned changes uncommitted, `.claude/todo.md` updated.

---

## Tab Orders

When changing the recipe-builder or menu-intelligence page, see `.claude/references/tab-orders.md` for the canonical keyboard navigation order.

---

## Recovery

- **Rebase conflict**: Stop. Report every `UU` file. Ask: `"Keep mine / Keep theirs / Manual?"` Never auto-resolve.
- **PR CONFLICTING**: Stop. Instruct: `git fetch origin main && git rebase origin/main`, resolve, then `git push --force-with-lease`. Retry merge after push.
- **Stash pop conflict**: Stop immediately. Run `git status --short`. Report every `UU` file. Do NOT auto-resolve. After user confirms: `git add <file>`, then `git stash drop`, then `git status --porcelain`. Never proceed past this without clean status.
- **`git stash push` syntax**: `-m` flag MUST come before `--`. ✅ `git stash push -m "msg" -- file1` ❌ `git stash push -- file1 -m "msg"`
- **Branch already exists**: Ask user to rename or append `-v2`. Never force-delete.
- **Push fails (auth/remote)**: Report exact error. Suggest `gh auth status` or `git remote -v`.
- **Windows / PowerShell**: No `&&` / `||` between git commands. Separate Bash calls or `;`.

---

## Related

- `worktree-session-end` — triggered by session-end words ("done", "ship it", "wrap up"). Handles dev server kill, port cleanup, and session-handoff. NOT the same as [S/Worktree] — this skill handles explicit `/commit-to-github` invocations only.
- `github-sync` — pull recent GitHub activity at session start.
- `test-pr-review-merge` — full CI pipeline with test suite before merge.
