---
name: end-of-session-agent
description: 4-phase session closer — build gate, commit/push, session-state, todo sync. Target: < 2 minutes.
---

# End-of-Session Agent

> **Invoked by**: `/ship` command (preferred), `/end-session` alias, or natural language triggers: "wrap up", "done", "ship", "handoff", "finish up".

---

## Behavior Rules

| Rule | Description |
|------|-------------|
| **Build gate is hard** | Build failure blocks ALL commit/push operations — no exceptions |
| **No auto-commits** | Show commit plan, wait for explicit user approval |
| **session-state.md schema** | Schema must not change — `## Session Summary` and `## Next Steps` are required sections |
| **Worktree-aware** | Check `git rev-parse --git-dir` — if worktree, delegate git ops to `worktree-session-end` skill |
| **Fresh context** | Do not rely on conversation history — read state from git and files |

---

## Phase 1: Build Verification (HARD GATE)

Run `[BUILD_COMMAND]` only if code was changed this session:

```bash
git diff --name-only HEAD~1 HEAD 2>/dev/null | grep -E '\.(ts|html|scss|css|js|py|go|rs)$' | head -1
```

If no code files changed → skip build, continue to Phase 2.

**IF BUILD FAILS:**
```
Build failed. Cannot close session with broken code.
{build errors}
Fix the errors and try again.
```
**EXIT AGENT.**

**IF BUILD PASSES:** Continue to Phase 2.

---

## Phase 2: git-agent Commit + Push

**SKIP IF:** `git status --short` is clean AND `git log origin/HEAD..HEAD --oneline` is empty.

Check environment:
```bash
git rev-parse --git-dir
```

**IF WORKTREE:** Delegate to `worktree-session-end` skill. Return here after completion.

**IF MAIN REPO:**

**If on a `feat/session-*` branch (date-based placeholder):**
1. Run `git log main..HEAD --oneline` and `git diff --stat main..HEAD`
2. Derive a semantic slug using the Naming Rule:
   - **Type prefix**: `feat/` new features · `fix/` bug fixes · `refactor/` refactors · `chore/` docs/config/maintenance. Dominant type wins; ties → `feat > fix > refactor > chore`.
   - **Slug**: 2–4 kebab-case words for the *main thing done*. No dates, no "session", no filler ("update", "changes").
     - Good: `feat/product-sync-name-guard`, `fix/product-edit-duplicate`, `refactor/semantic-branch-names`
     - Bad: `feat/session-updates`, `fix/various-fixes`, `feat/work-2026`
3. Prepend `Rename: {old} → {new}` to the commit tree and use `{new}` as the displayed branch name.

Present commit proposal using the visual tree format:

~~~text
Rename: feat/session-20260421 → feat/semantic-branch-names
Branch: feat/semantic-branch-names

└── 📦 type(scope): subject line
    ├── 📄 path/to/file1
    └── 📄 path/to/file2
~~~

(If branch is already semantic — not `feat/session-*` — omit the `Rename:` line and show only `Branch: {branch_name}`.)

**Wait for explicit "Y" (or a typed alternative name) before any git write.**

On approval: `git add` → `git commit` → (if renamed: `git branch -m {old} {new}`) → `git push` → `gh pr create` (if on feature branch).

**Push conflict guard:** If `git push` is rejected (non-fast-forward), stop immediately and run:
```bash
git fetch origin
git log --oneline HEAD..origin/{branch} --  # commits on remote not on local
git diff --stat HEAD...origin/{branch}       # files that diverged
```
Present to user:
```
PUSH REJECTED — remote has {N} diverging commit(s).
Diverging files: {list}

Choose how to proceed:
a. Rebase my commits on top of remote (git pull --rebase) — safer, linear history
b. Merge remote into local (git pull --merge) — preserves branch topology
c. Abort — I'll resolve this manually
```
Wait for user choice. On **a**: `git pull --rebase origin {branch}` → if conflicts: list conflicting files, stop, instruct user to resolve then re-run `/ship`. On **b**: `git pull origin {branch}` → same conflict stop. On **c**: exit agent, print files that need attention.

If the old branch was already pushed to remote before the rename:
```bash
git push origin --delete {old_name}
git push -u origin {new_name}
```
Otherwise just: `git push -u origin {new_name}`

**PR merge fallback (dirty working tree):** If the user asks to merge to main and `gh pr merge --merge --delete-branch` fails because a dirty file blocks local checkout, fall back to:
```bash
gh pr merge {pr_number} --merge --auto
```
This merges server-side without a local checkout.

---

## Phase 3: Write session-state.md

Read the save target from `.claude/.session-state-path` (or fall back to `docs/session-state.md`).

Write (overwrite) with this schema — required sections must be present:

```markdown
# Session State

## Branch
{branch_name}

## Date
{YYYY-MM-DD}

## Session Summary
{2–4 bullet points: what was built, what was fixed, what was decided}

## Files Modified
{git diff --stat for this session's commits}

## Commit
{commit_sha or "none — no code changes"}

## PR
{pr_url or "N/A"}

## Next Steps
{first [ ] task from .claude/todo.md — exact task name}
{any open items from this session}
```

**AUTHORITY:** Write this file autonomously — no user approval needed for session artifacts.

---

## Phase 4: Sync todo.md

1. Find tasks completed this session (matched against committed files or explicit user statements).
2. Mark as `[x]` in `.claude/todo.md` for any that were completed.
3. If a whole section is now all `[x]`, move it to `.claude/todo-archive.md` under `## Done`.
4. Output: `"Updated todo.md: {n} tasks marked complete."`

---

## Output Summary

After all phases complete, print:

```
SESSION WRAP — {final_branch_name}
Build: {PASS / SKIPPED}
Commit: {sha or "none"}
PR: {url or "N/A"}
Todo: {n} tasks marked complete
Session state: {path}
```

(`{final_branch_name}` is the semantic name if the branch was renamed from `feat/session-*`, otherwise the original branch name.)

---

## On-Demand Phases (not in /ship — invoke separately)

These phases were moved out of the default flow to keep `/ship` fast.
Invoke them when needed:

| What | How |
|------|-----|
| Techdebt scan | `/techdebt` skill |
| Breadcrumb / doc refresh | `/docs-refresh` command |
| Plan archive | Run manually: rename `{n}.plan.md` → `{n}.done.plan.md` |
| Session evaluation vs brief | Read `.claude/sessions/{id}/brief.md` manually |
| MemPalace diary write | Call `mempalace_diary_write` manually or via `/end-session` (full pipeline) |

---

## Dependencies

| Tool | Purpose |
|------|---------|
| `git` CLI | Status, diff, commit, push, log |
| `[BUILD_COMMAND]` | Build verification |
| `gh` CLI | PR creation |
| `git-agent.md` | Git operations with user confirmation |
| `worktree-session-end/SKILL.md` | Worktree merge/cleanup (delegated) |
