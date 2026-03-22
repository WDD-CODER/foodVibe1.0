# End Session — foodVibe 1.0

> **[Claude Code only]** Read this skill when the user says "done", "end session", "I'm done", "wrap up", or "finish up" while on any branch other than `main`/`master`.
> If on `main`, use `session-handoff` instead.

## Automatic Trigger

Phrases that activate this skill (while NOT on `main`/`master`):
`done` · `end session` · `I'm done` · `wrap up` · `finish up` · `we're done` · `that's it` · `finish up`

---

## Phase 0 — Situational Awareness + Intent

Run these first (read-only):
```bash
git branch --show-current
git status --short
git log main..HEAD --oneline 2>/dev/null | head -20
git worktree list
cat .worktree-port 2>/dev/null || echo "(no port assigned)"
```

Report: branch name, N uncommitted files, N commits ahead of main, assigned dev port if any.

Then ask **before doing anything else**:

**How do you want to end this session?**
a. Save — commit, open PR, merge to main, remove worktree
b. Pause — leave everything as-is, keep worktree for later (saves session summary only)
c. Discard — delete the worktree and branch, throw away all changes

**If b (Pause):** Skip directly to Phase 6.
Output: "Worktree `<branch>` kept. Resume anytime by returning to this branch."

**If c (Discard):**
Ask one confirmation before doing anything destructive:
> "This will permanently delete all uncommitted changes on branch `<branch>` and remove the worktree. Are you sure? (yes / no)"

If yes:
```bash
BRANCH=$(git branch --show-current)
WORKTREE_PATH=$(git worktree list --porcelain | grep -A2 "branch refs/heads/$BRANCH" | grep "^worktree" | awk '{print $2}')
git checkout main
git worktree remove "$WORKTREE_PATH" --force 2>/dev/null || true
git branch -D "$BRANCH" 2>/dev/null || true
```
Then go to Phase 6.
If no: return to the Phase 0 question.

**If a (Save):** Continue to Phase 1.

---

## Phase 1 — Commit Uncommitted Changes

If `git status --short` showed no changes, skip to Phase 2.

If changes exist, list every changed file and ask:

**Uncommitted changes detected. What would you like to do?**
a. Commit now — runs the `commit-to-github` skill (read `.claude/skills/commit-to-github/SKILL.md` and execute in full). Return here after all commits complete.
b. Skip — leave changes uncommitted, continue to PR
c. Abort end-session — stop now, leave everything as-is

If c: Output: "End session aborted. Your changes are safe on branch `<branch>`." Stop.

---

## Phase 2 — Open Pull Request

Check if a PR already exists:
```bash
gh pr list --head "$(git branch --show-current)" --state open --json number,title,url 2>/dev/null
```

If a PR already exists: report it and ask:
**A PR already exists for this branch. Proceed to review and merge?**
a. Yes — skip to Phase 3
b. No — stop here

If no PR exists, ask:
**Ready to open a PR for `<branch>` → `main`. Proceed?**
a. Yes — create PR
b. No — stop here

If a (create):
```bash
BRANCH=$(git branch --show-current)
COMMITS=$(git log main..HEAD --oneline 2>/dev/null | head -20)
gh pr create \
  --base main \
  --head "$BRANCH" \
  --title "$BRANCH" \
  --body "$(printf '## Summary\n\n%s\n\n## Test Plan\n\n- [ ] Unit tests pass\n- [ ] Build succeeds\n- [ ] Manual verification\n' "$COMMITS")"
```
Report the PR URL. Continue to Phase 3.

---

## Phase 3 — Review (read-only)

No user confirmation needed here — this is informational only.

```bash
PR=$(gh pr view --json number -q .number 2>/dev/null)
gh pr checks "$PR" 2>/dev/null || echo "No CI checks configured."
gh pr diff "$PR" 2>/dev/null | head -100
```

Summarize: CI status, files changed, lines added/removed, any review comments.

If CI is failing, ask:
**CI checks are failing. What would you like to do?**
a. Fix the failures now — describe what is failing and I will help
b. Merge anyway — I accept the risk
c. Stop — I will fix and re-run end session later

If c: Output: "End session paused. PR `<URL>` is open. Re-run end session when ready." Stop.

---

## Phase 4 — Merge to Main

**PR `<URL>` is ready. Merge into main?**
a. Yes — merge now
b. No — leave PR open and stop

If b: Output: "PR left open. Run end session again to merge when ready." Stop.

If a:
```bash
PR=$(gh pr view --json number -q .number)
gh pr merge "$PR" --merge --delete-branch
```

After merge, sync main:
```bash
git checkout main
git pull --ff-only origin main
git log -1 --oneline
```

Report: "Merged. Main is now at `<hash>`."

### Conflict Handling (if merge fails)

If the merge command fails with a conflict:

**Merge conflict detected in: `<files>`. How to resolve?**
a. Rebase my branch on main — walk me through each conflict
b. Show me the conflicting sections, I will tell you what to do
c. Abort — leave PR open, do not merge

If a (rebase):
```bash
git checkout <branch>
git fetch origin main
git rebase origin/main
```
For each conflict: show the `<<<<<<<` / `=======` / `>>>>>>>` markers. Ask per file:
**Keep mine (a), keep theirs (b), or manual edit (c)?**
Apply choice → `git add <file>` → `git rebase --continue`.
After clean rebase: `git push --force-with-lease origin <branch>`.
Return to Phase 4 and re-attempt merge.

If c: `git rebase --abort`. Output: "Rebase aborted. PR `<URL>` is still open. No changes to main."

---

## Phase 5 — Remove Worktree

**Remove worktree for `<branch>`? Branch and commits are safe on GitHub. This will delete the entire local folder including `.angular/cache`, `dist`, and `node_modules`.**
a. Yes — remove it
b. No — keep it

If a:
```bash
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
WORKTREE_PATH=$(git worktree list --porcelain | grep -B2 "branch refs/heads/$BRANCH" | grep "^worktree" | awk '{print $2}')
git checkout main
git worktree remove "$WORKTREE_PATH" --force
git branch -d "$BRANCH" 2>/dev/null || echo "Branch already deleted by PR merge."
```

`git worktree remove --force` deletes the entire worktree directory — no extra cleanup needed.

If the path cannot be resolved: "Run `git worktree list` manually and give me the path for branch `<branch>`."

---

## Safety Rules

1. Never run `git reset --hard` or `git push --force` (only `--force-with-lease` during rebase recovery).
2. Never delete the worktree before the branch is either merged or the user explicitly chooses Discard.
3. Never commit directly to `main`.
4. If the user says "abort" or "stop" at any prompt — halt immediately. All work stays intact.

> **No session summary here.** Session-handoff is a separate skill that runs only when the user is on `main` and says "wrap up" / "session end". End-session handles worktree cleanup only.

---

## Related Skills

- `.claude/skills/commit-to-github/SKILL.md` — called from Phase 1
- `.claude/skills/session-handoff/SKILL.md` — template used in Phase 6
- `.claude/commands/test-pr-review-merge.md` — alternative full CI pipeline
