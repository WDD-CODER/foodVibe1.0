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

Run `ng build` only if code was changed this session:

```bash
git diff --name-only HEAD~1 HEAD 2>/dev/null | grep -E '\.(ts|html|scss|css)$' | head -1
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

**IF MAIN REPO:** Present commit proposal via git-agent using the visual tree format:

~~~text
Branch: {branch_name}

└── 📦 type(scope): subject line
    ├── 📄 path/to/file1
    └── 📄 path/to/file2
~~~

**Wait for explicit "Y" approval before any git write.**

On approval: `git add` → `git commit` → `git push` → `gh pr create` (if on feature branch).

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

## Reflect Test-Drive Reminder

> **Temporary — expires 2026-04-28**: Before finishing, prompt the user:
> "Did you run `/reflect` today? If yes, log the run in `.claude/reflect/test-drive/log.md`."
> Remove this block on 2026-04-28 after applying the verdict from `decision-criteria.md`.

---

## Output Summary

After all phases complete, print:

```
SESSION WRAP — {branch_name}
Build: {PASS / SKIPPED}
Commit: {sha or "none"}
PR: {url or "N/A"}
Todo: {n} tasks marked complete
Session state: {path}
```

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
| `ng` CLI | Build verification |
| `gh` CLI | PR creation |
| `git-agent.md` | Git operations with user confirmation |
| `worktree-session-end/SKILL.md` | Worktree merge/cleanup (delegated) |
