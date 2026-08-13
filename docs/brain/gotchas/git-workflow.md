# Gotchas — git workflow

Part of the domain split of `docs/brain/gotchas.md` — see that file for the index and the append routing table. Same rules as the parent file: each entry is what hurt / why the obvious fix is wrong / what to do instead. Append new entries at the bottom; never delete a still-true entry. If this file exceeds ~150 lines / ~10 entries, propose a further split as a brain proposal at the next Merge Gate.

Scope: worktrees, `gh` auth/PR mechanics, and repo-tracked files that interact with commit/push/merge.

---

## Removing a git worktree from inside itself

**What hurt:** `git worktree remove <path>` fails (or leaves a dangling lock) when the shell's cwd is still inside that worktree — the process holds an open handle on the directory.

**Why the obvious fix is wrong:** Retrying with `--force` clears the worktree registration but can leave orphaned `.git/worktrees/<name>` metadata behind; it doesn't address the actual cause (cwd still inside the target).

**What to do instead:** `cd` back to the main repo root before running `git worktree remove`; follow up with `git worktree prune` if metadata lingers. See `.claude/skills/worktree-setup/SKILL.md` and `scripts/prune-merged-worktrees.sh`.

---

## `gh pr create` failing on PAT scope

**What hurt:** `gh pr create` fails (often with an unhelpful permissions error) when the token behind `gh auth` lacks the scope a PR touching `.github/workflows/*` needs — common with fine-grained PATs issued without `workflow` scope.

**Why the obvious fix is wrong:** Re-running the command or re-authenticating with the same token doesn't help — the scope is fixed at token-issue time, not session time.

**What to do instead:** When a workflow-touching PR fails to create, check `gh auth status` scopes first; regenerate the PAT with `workflow` scope rather than retry-looping the same command.

---

## Tracked session-state pointer dirties every ship/merge

**What hurt:** `.claude/.session-state-path` was tracked in git but rewritten on every SessionStart (`session-startup.sh`) to a PPID-keyed path. `/ship` also wrote session-state *after* commit/push. Result: perpetual dirty trees and `gh pr merge --delete-branch` failing on local checkout.

**Why the obvious fix is wrong:** Committing the updated pointer “to clean the tree” just schedules the next SessionStart to dirty it again. Leaving Phase 5 until after push guarantees an uncommitted handoff file.

**What to do instead:** Keep `.claude/.session-state-path` gitignored (local pointer only). Save to stable `docs/session-state-${BRANCH}.md` (no PPID). On `/ship`, write that file after commit, amend before push. See Plan 295 / `.claude/commands/ship.md` Phase 5.

---

## Splitting one file's uncommitted diff across two branches: no `git stash -p` available

**What hurt:** `server/db.js` had two unrelated uncommitted hunks (a plan 301 search-index addition and unrelated mongo connection-visibility listeners) that needed to land on two different branches. The normal tool for this, `git stash push -p` / `git add -p`, is interactive, and this environment's Bash tool explicitly does not support interactive flags.

**Why the obvious fix is wrong:** Trying to script `git add -p` with piped `y`/`n` answers is fragile and easy to get wrong silently (wrong hunk staged, file left in a half-applied state).

**What to do instead:** Read the file, `git diff` it to see the exact hunks, then use Edit to manually remove the unwanted hunk on branch A (reverting it to match what branch B should not have), commit, then switch to branch B and manually re-add just that hunk via Edit using the diff text already captured. Slower but deterministic and auditable — confirm with a final `git diff` before each commit.
