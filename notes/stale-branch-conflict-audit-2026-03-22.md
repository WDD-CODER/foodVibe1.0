# Audit: Merge Conflict During commit-to-github Execution
**Date:** 2026-03-22
**PR affected:** #8 (`chore/gitignore-as-source-of-truth`)
**Conflict file:** `.claude/skills/commit-to-github/SKILL.md`

---

## What Happened — Step by Step

### 1. The session started with a stale local `main`

At the start of the `/commit-to-github` run, local `main` was at commit `aa6e521`.
Remote `main` was already at `5e530f1` — two commits ahead (PR #7 had been merged earlier in the same session by a different operation).

```
Local main:   aa6e521  ← where we branched from
Remote main:  5e530f1  (PR #7 already merged — 2 commits ahead)
```

The skill ran `git status`, `git diff`, `git branch --show-current` — but **never fetched from origin** to check whether local `main` was behind remote.

---

### 2. We branched off stale `main`

```bash
git checkout -b chore/gitignore-as-source-of-truth
```

This branched from `aa6e521` — the stale local state — not the latest remote state (`5e530f1`).

---

### 3. Both branches modified the same lines in `SKILL.md`

**PR #7** (already merged at `5e530f1`) had modified `SKILL.md` — specifically, it **added** `.claude/settings.local.json` to the never-stage list:

```diff
+ - `.claude/settings.local.json` — local permissions config; never auto-stage...
```

**Our branch** (commit `092390c`) **deleted the entire never-stage list block**, including those same lines.

Two independent changes. Same location in the same file. Classic divergence conflict.

---

### 4. GitHub rejected the merge

When we ran `gh pr merge 8 --merge`, GitHub returned:

```
Pull request WDD-CODER/foodVibe1.0#8 is not mergeable: the merge commit cannot be cleanly created.
```

GitHub had detected that the base (`5e530f1`) and our branch (`092390c`) had conflicting changes to the same lines in `SKILL.md`.

---

### 5. `--auto` was not available either

We tried `gh pr merge 8 --merge --auto` as a fallback.
GitHub returned:

```
GraphQL: Pull request Protected branch rules not configured for this branch (enablePullRequestAutoMerge)
```

Auto-merge requires branch protection rules with auto-merge enabled — not configured for this repo.

---

### 6. Resolution: fetch → rebase → resolve → force-push → merge

```bash
git fetch origin main
git rebase origin/main          # conflict surfaced in SKILL.md
# manually resolved: kept our version (entire never-stage list deleted)
git add .claude/skills/commit-to-github/SKILL.md
git rebase --continue
git push --force-with-lease origin chore/gitignore-as-source-of-truth
gh pr merge 8 --merge --delete-branch   # succeeded
```

Resolution was correct and no data was lost. But it required manual intervention in the middle of an automated flow.

---

## Root Causes

### Root Cause 1 — Skill never syncs before branching (primary)

The `commit-to-github` skill has no step to check whether local `main` is behind remote before creating a branch.
If local `main` is stale, every branch created will diverge from the real base and risk a conflict at merge time.

**The skill assumes local `main` == remote `main`. That assumption is wrong if any PR was merged since the last pull.**

### Root Cause 2 — Diverging changes to the same file in the same session (secondary)

PR #7 and our work both modified `SKILL.md` in the same session.
PR #7 added to the never-stage list. Our work deleted the list entirely.
Even with a perfect sync, these changes are logically opposed — a human or a rebase would always have to resolve this.
The sync step would have surfaced this earlier (before branching, not after pushing), making recovery cleaner.

### Root Cause 3 — No divergence check before `gh pr merge` (tertiary)

The skill goes straight to `gh pr merge` after pushing, without verifying the PR is actually mergeable.
A quick `gh pr view <n> --json mergeable` check before attempting the merge would catch this immediately and surface a clear message instead of a raw GitHub error.

---

## What Did NOT Go Wrong

- The conflict resolution was clean — no data lost, no wrong version kept.
- `--force-with-lease` was used correctly (not `--force`) — safe push that won't overwrite remote changes we didn't know about.
- The final merge succeeded and history is correct.

---

## Prevention: What to Change

### Fix 1 — Add a `git fetch` + divergence check to Phase 4 of the skill (highest priority)

Before creating the branch in Phase 4 Step 2, add:

```bash
git fetch origin
git rev-list --count HEAD..origin/main
```

If the count is > 0, local `main` is behind. The skill should either:
- **Auto-rebase**: `git rebase origin/main` before branching (recommended — keeps flow automatic)
- **Or warn the user**: "Local main is N commits behind remote — rebase before branching?"

Recommended placement: **immediately before `git checkout -b <branch>`**, as the very first action of Phase 4.

### Fix 2 — Add a mergeability check before `gh pr merge` (medium priority)

After `gh pr create` and before `gh pr merge`, add:

```bash
gh pr view <pr-number> --json mergeable --jq '.mergeable'
```

- If `"MERGEABLE"` → proceed with merge.
- If `"CONFLICTING"` → stop, report: "PR #N has a conflict — rebase required. Run: `git fetch origin main && git rebase origin/main`"
- If `"UNKNOWN"` → wait 3 seconds and retry once (GitHub sometimes takes a moment to compute mergeability).

### Fix 3 — Add a recovery step to the skill's Recovery section (low priority)

Document this exact scenario in the Recovery section:

```
- **PR not mergeable (stale branch)**: run `git fetch origin main`, then
  `git rebase origin/main`. Resolve any conflicts, then
  `git push --force-with-lease`. Then retry `gh pr merge`.
```

---

## Summary Table

| What went wrong | Root cause | Fix |
|---|---|---|
| Branched from stale local `main` | Skill has no fetch/sync step before branching | Add `git fetch origin` + divergence check to Phase 4 |
| Two PRs modified same SKILL.md lines | Logically opposed changes in same session | Unavoidable — sync earlier surfaces it sooner |
| `gh pr merge` failed with cryptic error | No mergeability pre-check | Add `gh pr view --json mergeable` gate before merge |
| `--auto` flag didn't work | Branch protection not configured | Not a skill bug — document as known limitation |

---

## Verdict

**This was a preventable conflict.** The single missing step — `git fetch origin` before branching — would have either:
1. Made the rebase happen at branch-creation time (clean, before any commits), OR
2. Surfaced the `SKILL.md` divergence immediately so we could decide how to proceed before building the commit plan.

The in-session cause (two PRs touching the same file) is inherent to multi-step work sessions and cannot be fully prevented, but it can be detected earlier and handled with less friction.
