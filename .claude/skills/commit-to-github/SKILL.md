# Commit to GitHub — foodVibe 1.0 (v2.0)

**Role**: High-performance lifecycle manager for code changes.
**Safety Rule**: No `git add`, `git commit`, `git push`, or branch creation until the user has explicitly approved the visual tree in chat.
**Bash Rule**: Never combine git commands with `&&` or `|`. Issue each command as a **separate Bash tool call** (Windows/PowerShell safe).

---

## 🚦 Selection Gate (Always First)

**Check for an argument first.** If the user's invocation included a path letter, skip the question:

- `/commit-to-github c` or `commit c` → go directly to **Path [C]**. Emit: `⚡ Path [C] selected — skipping gate.`
- `/commit-to-github s` or `commit s` → go directly to **Path [S]**. Emit: `⚡ Path [S] selected — skipping gate.`

**If no argument**, ask before gathering ANY data:

> "Yes Chef! How are we handling this?
> **[C]** Checkpoint Save — fast local commit, no PR
> **[S]** Ship to Main — full sync, diagnostics, PR/merge"

---

## Output Format Rules (apply throughout this skill)

- **Batch all bash commands before any text output**: Run every inspection command needed for the chosen path first — do not output any formatted text until ALL data gathering is complete.
- **Suppress preamble**: Do not narrate what files you are reading, do not summarize session handoffs, do not mention github-sync status. Go straight to work.
- **Single output block**: After all bash commands have run, emit one clean block — no interruptions between phases.
- **Phase reporting**: Report combined phase status as a one-liner. Format:
  - `⚡ Path [C] — on branch feat/checkpoint-20260323-1400. N files staged.`
  - `Phase 0–1: ⚡ No auth/TS changes — debt skipped. No open PR.`
  - `Phase 0–1: ⚠ N high debt items (listed below). Open PR #N found — review comments surfaced.`
- **Phase 1 file table**: Output only the file table (path + state + diff stat). No prose. Example:
  ```
  Phase 1
  Path                                         State
  .claude/skills/commit-to-github/SKILL.md    modified (+42/-18 lines)
  src/app/core/models/recipe.model.ts         modified (+6/-2 lines)
  notes/session-handoff.md                    untracked
  ```
- **Phase 3 tree first**: Output the visual tree, then the approval prompt. Never put the approval prompt before the tree.

---

## Path [C] — Checkpoint Save

**Goal**: Fast named save point. No sync with main. No diagnostics. No PR.

### Step 1 — Collect & Branch Guard

Run as separate calls first — needed for branch name inference:

```bash
git branch --show-current
git status --short
git diff --stat HEAD
```

- **If already on a feature branch** → stay on it. No checkout needed. Proceed to Step 2.
- **If on `main` or `master`** → do NOT auto-create a generic name. Infer a meaningful branch name from the changed files:
  - Determine the **type**: `feat` (new capability), `fix` (bug), `refactor` (restructure, no behavior change), `chore` (config, docs, tooling), `style` (CSS/SCSS only)
  - Derive a **short slug** from the file paths and nature of changes (e.g. `feat/recipe-yield-logic`, `fix/inventory-unit-duplicate`, `refactor/auth-interceptor-cleanup`)
  - Hold the proposed name — show it in the tree header (Step 3). Do not ask separately.
  - Create the branch only after the user approves the tree.

### Step 3 — Minimal Visual Tree

Draft the tree in chat. When on `main`, use `[Proposed: feat/your-slug-here]` as the header. On a feature branch, use `[Current: branch-name]`.

```
[Proposed: feat/checkpoint-20260323-1400]
 └── 📦 Commit: feat: checkpoint - <auto-summary of changes>
      📄 path/to/file1
      📄 path/to/file2
```

Ask: **"Approve? Y to commit · N to cancel"**

### Step 4 — Execute (only after approval)

Stage and commit all changed files:

```bash
git add <file1> <file2> ...
git commit -m "feat: checkpoint - <brief summary>"
```

**STOP.** No push. No PR. Report: `"✓ Checkpoint saved on feat/checkpoint-<timestamp>."`

---

## Path [S] — Ship to Main

**Goal**: Production-ready merge to main. Full diagnostics. Automated PR.

---

### Phase 0 — Sync & Early Discovery

> Run all Phase 0 steps as separate Bash calls. Batch results — report as a single one-liner after all steps complete.

**Step 0.1 — Fetch & Divergence**

```bash
git fetch origin
git rev-list --count HEAD..origin/main
```

- Count = `0` → Proceed.
- Count > `0` → **Stop.** Ask: `"Branch is behind origin/main by N commit(s). Rebase now before planning? (y/n)"`
  - If `y` → `git rebase origin/main`
  - If rebase fails → **stop.** Run `git status --short`. Report every conflicting file. Ask: `"Keep mine / Keep theirs / Manual?"` Never auto-resolve. Proceed only after user confirms resolution.

**Step 0.2 — PR Context Check**

Detect current branch:
```bash
git branch --show-current
```

Check for an open PR on this branch:
- MCP (primary): `mcp__github__list_pull_requests` filtered to current branch
- Fallback: `gh pr list --head <branch> --state open`

- **No open PR** → skip. No further calls.
- **Open PR found** → read body and review comments:
  - `mcp__github__get_pull_request` + `mcp__github__list_pull_request_review_comments`
  - Surface any "changes requested" or pending review items before continuing.
  - Include PR number in the commit plan summary.

**Step 0.3 — Targeted Spec Gate**

Run specs only for changed `.ts` files — not the full suite:

```bash
git diff --name-only HEAD | grep '\.ts$' | grep -v '\.spec\.ts$'
```

For each changed file, check if a matching `.spec.ts` exists and collect them. Run only those specs:

```bash
npx ng test --include="<spec1> <spec2>" --no-watch --browsers=ChromeHeadless
```

- Pass → proceed.
- Fail → **stop.** Report the specific failure and spec file. Ask: `"Fix before building the plan, or proceed anyway?"`
- No matching specs found → note `"No specs for changed files"` and proceed.

> **Do not run the full test suite here.** Full suite runs at session-handoff and in `test-pr-review-merge` before merge.

**Step 0.4 — Security Gate**

```bash
git diff --name-only HEAD | grep -E "auth\.guard|auth\.interceptor|auth-crypto|user\.service|app\.routes"
git diff HEAD | grep -E "localStorage\.setItem|sessionStorage\.setItem|\[innerHTML\]|bypassSecurityTrust"
```

- Zero matches → emit: `⚡ Security fast-path: no auth/storage-sensitive files — gate skipped.`
- Matches found → ask:
  > "Security-sensitive files in this commit ([list]). Run security-officer review first, or proceed anyway?
  > a. Run security review — invoke `security-officer` agent; wait for its report
  > b. Proceed anyway"

---

### Phase 1 — Evaluate & Audit

**Step 1.1 — Collection**

```bash
git status --short
git diff --stat HEAD
```

Detect the default branch:
```bash
git symbolic-ref refs/remotes/origin/HEAD 2>/dev/null || echo "main"
```

Output the file table (path + state + diff stat). No prose. Note any modified/untracked `plans/*.plan.md` files.

**Step 1.2 — Diagnostic Audit**

- **Tech Debt**: Read `.claude/skills/techdebt/SKILL.md`. List **Critical/High items only**. Surface at the top of the output block.
  > Tech-debt analysis normally runs at task-completion (agent.md step 5.5). If a report was already generated this session, reuse it — do not re-run.
- **CSS Layer**: If any `.scss` or `.css` file changed → verify against `.claude/skills/cssLayer/SKILL.md`. Report violations.
- **Security**: Covered in Phase 0.4 — do not re-run here.

---

### Phase 2 — Decide & Build Plan

1. **One branch vs several**: One branch if all changes are one logical unit. Multiple branches when changes belong to different concerns (each can be reviewed/merged/reverted independently).
2. **One vs several commits per branch**: Prefer multiple commits when revert granularity matters. One commit when changes are small and inseparable.
3. **Practical rule**: Split so reverting one commit is straightforward. Avoid one giant commit when logical steps are clear.
4. **Branch names**: `feat/<short-name>` or `fix/<short-name>`.
5. **Include related plan files**: If a `plans/*.plan.md` matches the scope of this commit, include it in the commit.
6. **Draft the PR**: Title `type(scope): short description` (under 70 chars). Body: 3-bullet summary + test plan checklist. This draft is shown in Phase 3 and executed in Phase 4 — no separate approval round-trip.

---

### Phase 3 — Visual Tree + Approval

Output the full tree first, then the approval prompt. Never reverse the order.

**Required format:**

```
[Current: main]
 └── 🌿 Branch: feat/example-branch
      ├── 📦 Commit 1: type(scope): short message
      │    📄 path/to/file1.ts
      │    📄 path/to/file2.ts
      └── 📦 Commit 2: type(scope): short message
           📄 path/to/file3.ts

      🔀 PR: "type(scope): short description"
           • bullet summary 1
           • bullet summary 2
           • bullet summary 3
           Test plan: [ ] item 1  [ ] item 2
```

- Use `[Current: main]` (or actual default branch) at the top.
- For multiple branches, add another `└── 🌿 Branch:` under `[Current: main]`.

**`settings.local.json` check**: If this file appears in the commit tree, read only its `permissions` and `env` keys. If no API keys or secret-looking values → add `✓ settings.local.json: no secrets detected` to the tree. Only escalate to a separate Ask if an actual secret is found.

After the tree, ask:

> **"Approve to proceed, or deny to cancel. No git writes until you approve.**
> *Approving executes all commits AND creates the PR(s) above — no further prompts. To tweak the PR text, say so before approving.*
> *A = approve + merge · P = approve + push*"

If the user **denies** → state that no git operations were performed and stop. If they **approve** → proceed to Phase 4.

---

### Phase 4 — Execute (The Delegation Boundary)

> **PLAN MODE RE-ENTRY**: If plan mode is unexpectedly triggered during Phase 4, update this plan file with "Execution resumed at step X" and immediately call `ExitPlanMode`. Do **not** restart from Phase 0.

Never erase or discard user changes. No `git reset --hard`, `git clean -fd`, or force-push unless the user explicitly asks.

**4.1 — Clean Tree Gate (Mandatory)**

Check the current branch:
```bash
git branch --show-current
git status --porcelain
```

- **Already on the default branch (main)**: Modified files survive `git checkout -b` — **no stash needed**. Proceed directly to 4.2.
- **On a non-default branch**: Files may conflict on checkout. Stash everything first:
  ```bash
  git stash push -u -m "commit-skill-pre-sync"
  git checkout main
  ```
- **Two planned branches touch the same file**: Stash is also required between those branch switches (see 4.2 note).

**4.2 — Stashless Multi-Branch Execution**

For each branch in the plan:

1. `git checkout -b <branch-name>` — creates branch from current HEAD; all modified files remain in the working tree
2. `git add <file1> <file2> ...` — stage **only this branch's files** (leave other branches' files unstaged)
3. `git commit -m "type(scope): message"`
4. `git push -u origin <branch-name>`
5. Create PR + merge (see 4.3–4.5)
6. `git status --porcelain` — other branches' unstaged files are still present
7. `git checkout main` — safe because this branch only touched its own files; other modifications survive
8. `git pull` — modifications survive the pull (no conflict since they are unstaged)
9. Repeat for the next branch

> **Why this works**: `git checkout` only overwrites working-tree files if the target branch has a different committed version of them. Since each planned branch touches exclusive files, the other branches' modifications are untouched.

> **When stash IS still needed between branches**: Only if two planned branches touch the same file. In that case: after committing + pushing branch A, run `git stash push -m "branch-b" -- <branch-b-files>` before switching; pop after creating branch B.

**4.3 — Root Repo Context (PR + Merge)**

> All PR creation and merge operations must use `git -C <mainRepoPath>` when in a worktree context to avoid `fatal: main is already used` errors.

Write the PR body to a Windows-native temp path, then pass via `--body-file`:

```bash
# Detect temp dir dynamically — works for any user
echo $USERPROFILE
```

```
Write tool → $USERPROFILE/AppData/Local/Temp/pr-body-<branch-slug>.md
gh pr create --title "<drafted-title>" --body-file "$USERPROFILE/AppData/Local/Temp/pr-body-<branch-slug>.md"
```

Use `$USERPROFILE` from the shell — do **not** hardcode a username. Do **NOT** use `/tmp/pr-body.md` — that path does not exist on Windows.

> **Why `--body-file`**: passing `--body "..."` with markdown headings (lines starting with `#`) triggers Claude Code's built-in security check and forces a permission prompt. `--body-file` bypasses this entirely.

**`--body-file` fallback**: If the file is not found, fall back to `--body` with the body inline. Strip any lines starting with `#` from the body (rewrite headings as bold text) to avoid the security prompt.

**4.4 — Mergeability Gate (approve + merge "A" only)**

Before running `gh pr merge`, verify:
```bash
gh pr view <pr-number> --json mergeable --jq '.mergeable'
```
- `"MERGEABLE"` → proceed.
- `"CONFLICTING"` → **stop.** Report: `"PR #N has a conflict — local main was likely stale. Run: git fetch origin main && git rebase origin/main, resolve conflicts, then git push --force-with-lease."` Do not attempt merge.
- `"UNKNOWN"` → GitHub is still computing. Wait 4 seconds (`sleep 4`) and retry once. If still `"UNKNOWN"` → report and ask the user to check the PR manually.

**4.5 — Merge + Return to Default**

For approve + merge ("A"):
```bash
gh pr merge <pr-number> --merge
gh pr view <pr-number> --json state
```
> **Do NOT use `--auto`** — it is asynchronous and returns before the merge completes, causing `git checkout main` to pull a pre-merge state.

The `state` field must equal `"MERGED"` before proceeding.

Before checking out the default branch, verify the working tree is clean:
```bash
git status --porcelain
```
If dirty → stash with `-u` first, then checkout:
```bash
git stash push -u -m "commit-skill-return"
git checkout main
git stash pop
```
If `git stash pop` exits with a conflict → **stop immediately.** Do not silently resolve. Run `git status --short` and report every `UU` file. Ask which version to keep for each. After user confirms: run `git add <file>` for each resolved file, then `git stash drop`, then run `git status --porcelain` to verify zero `UU` lines. Never continue past a stash pop conflict without a fully clean status.

> **Do NOT run `git pull` after checkout** — the merge commit is already present locally. A pull here is a redundant network round-trip.

If in a worktree context after a successful merge:
```bash
git -C <mainRepoPath> pull origin main
git -C <mainRepoPath> worktree remove <worktreePath> --force
```

> **Speed tip — push vs merge:**
> - `P` (approve + push): commits, pushes branch, opens PR. Fastest — merge happens separately when ready.
> - `A` (approve + merge): commits, pushes, creates PR, merges to main in one flow. Costs ~5–15 s extra.
> For checkpoint-adjacent or config/docs-only [S] commits, `P` is usually the right call.

---

### Phase 5 — Post-Execution

**5.1 — Update Todo**

Open `.claude/todo.md`. Using committed branch names, messages, and file paths, mark matching tasks `[x]`. Do not change unrelated tasks.

**5.2 — Archive Completed Plan Sections**

Scan `.claude/todo.md` for plan sections where ALL items are `[x]`, then apply all four safety gates:

- **Gate 1 — All-items-checked**: Every `[ ]` in the section must be `[x]`. Skip if any open items remain.
- **Gate 2 — No-deferred**: Skip if any item contains `(deferred)`, `(skipped)`, `[~]`, or `<!-- TODO -->`.
- **Gate 3 — Git verification**: Before archiving, run:
  ```bash
  git log --oneline | grep -i "<plan-keyword>"
  gh pr list --state merged --search "<plan-keyword>"
  ```
  If neither returns results → surface warning: `"No commits or merged PRs found for Plan NNN — skip archive or confirm manually?"` Do not archive without at least one result or explicit user confirmation.
- **Gate 4 — Large plan confirmation**: If the section has 5 or more items → require explicit confirmation: `"Archive Plan NNN (N items) to todo-archive.md?"` Proceed only on approval.

Once all gates pass, move the section to `todo-archive.md` (create if needed), appended with today's date and plan number.

**5.3 — Breadcrumb Check**

If any committed files added, removed, or renamed components, services, or pages → list the affected directories and ask: `"Run breadcrumb-navigator for [dirs]?"` If the user agrees, read `.claude/skills/breadcrumb-navigator/SKILL.md` and follow it. Do not block the commit flow waiting for this answer.

---

## End State

After Execute: all planned changes are committed on the intended branches, current branch is the default, no planned changes left uncommitted, and `.claude/todo.md` updated for matching tasks.

---

## Tab Orders

When changing the recipe-builder or menu-intelligence page, see `.claude/references/tab-orders.md` for the canonical keyboard navigation order.

---

## Recovery

- **Rebase conflict**: Stop. Report every `UU` file. Ask: `"Keep mine / Keep theirs / Manual?"` Never auto-resolve. Proceed only after user confirms.
- **PR CONFLICTING**: Stop. Report: local main is stale. Instruct: `git fetch origin main && git rebase origin/main`, resolve, then `git push --force-with-lease`. Retry merge after push.
- **Stash pop conflict**: Stop immediately. Run `git status --short`. Report every `UU` file. Do NOT resolve automatically. After user confirms resolution for each file: run `git add <file>`, then `git stash drop`, then `git status --porcelain` to verify zero `UU` lines. Never proceed past this without a fully clean status.
- **git stash push syntax**: `-m` flag MUST come before `--`.
  - ✅ `git stash push -m "message" -- file1 file2`
  - ❌ `git stash push -- file1 file2 -m "message"` ← fails with pathspec error
- **Branch already exists**: Ask the user to rename or append `-v2`. Do not force-delete existing branches.
- **Push fails (auth/remote)**: Report the exact error message. Suggest `gh auth status` for auth issues or `git remote -v` for remote issues.
- **Windows / PowerShell**: Do not use `&&` or `||` to chain git commands. Run each git command in a separate Bash call, or use `;` (runs regardless of exit code). Never chain inspection + write commands in a single call.

---

## Related

See **GitHub Sync** (`github-sync/`) and **Test-PR-Merge** (`.claude/commands/`) for pull/PR flows.
