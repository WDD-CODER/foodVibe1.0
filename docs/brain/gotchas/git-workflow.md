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

## A concurrent session's `git add -A` can steal your uncommitted change

**What hurt:** Mid-`/ship`, a second session working in the same directory switched the
branch from `feat/perf-phase1-m3-m5` to `feat/design-migration` and committed. Its commit
`012d3c9` swept up `src/app/app.config.ts` - an uncommitted edit belonging to the *other*
session's work - into an unrelated design-migration commit. Switching back to the perf
branch then restored the pre-edit version, so the change had silently vanished from the
working tree while living on in a foreign commit.

**Why the obvious fix is wrong:** `git worktree list` returns 1, so the usual concurrency
check sees nothing. Two agents sharing one working tree are invisible to it. Trusting a
`git status` snapshot taken earlier in the conversation is also wrong - the tree can
change between reading it and staging.

**What to do instead:** Compare branch *and* HEAD against the values captured when the
workflow started, and hard-stop on any change (`/ship` Phase 3 does this - honor it).
Before staging, re-run `git status --short` fresh rather than reusing an earlier snapshot.
After any forced branch switch, diff your expected changes against the tree and re-apply
anything a concurrent commit absorbed. And never `git add -A` in a shared working
directory - stage explicit paths only.

---

## Recovering a shared working directory after a live `.git/index.lock`

**What hurt:** Mid-`/ship`, staging hit `fatal: Unable to create '.git/index.lock': File
exists` — a second tool (Cursor, same directory, no separate worktree, so
`git worktree list` showed 1) was actively touching git. The working tree also had ~15
files dirty that this session never edited, spanning at least three unrelated bodies of
work (two earlier sessions' still-uncommitted plans plus the live Cursor session).
Related to the `git add -A` entry above, but this is the recovery procedure once you're
already mid-collision rather than the prevention step.

**Why the obvious fix is wrong:** Deleting the lock on sight risks corrupting whatever
the other process is mid-write on. Bundling the whole dirty tree into one commit (or
worse, one PR) silently ships someone else's unreviewed, possibly-incomplete work under
your name — and a botched `git add -p` retry after a lock error can leave the index in
a half-staged state.

**What to do instead:** Check `tasklist` (Windows) / `ps` for an actual running `git`
process before touching the lock — none running means it's stale, safe to clear with
plain `rm` (not `rm -f`, which this environment's global deny blocks anyway). Then
classify the unfamiliar dirty files by diff shape before staging anything: pure
deletions with zero insertions cross-reference cleanly against `.claude/todo.md`/
`plans/*.md` claims of "done" work; any insertions mixed in usually mean a different,
undocumented body of work touched the same file and needs its own bucket. Commit your
own bucket **first**, directly on the pre-existing HEAD, so its branch pointer stays a
clean, PR-able diff against main. Stack any recovered/other-session buckets after it via
`git branch <name> <sha>` — never checkout a different branch in the shared directory to
do this, since checkout would overwrite files a live concurrent editor may still have
open; if you need a branch actually checked out (e.g. to append a file after PR checks
already passed), use `git worktree add <scratch-path> <branch>` instead, work there, then
`git worktree remove` it. Never invent a PR for a bucket you didn't author or fully
verify — push it as a checkpoint and say so explicitly.

---

## A stale dev server on a different port can present as a design-port regression

**What hurt:** After fixing Suppliers' mobile carousel column mapping, the Human reported the
same breakage still happening in the 620-768px range. Re-testing the worktree's own dev server
(port 4201) showed the fix already worked cleanly at every width. The actual source was a second,
unrelated dev server (port 4200 — the main repo's own already-running instance, serving the
pre-fix code) that the Human was unknowingly looking at instead.

**Why the obvious fix is wrong:** Assuming the fix was incomplete and re-diffing already-correct
CSS/HTML would have wasted time chasing a bug that doesn't exist in the worktree's code.

**What to do instead:** When a Human reports a visual bug against work done in an isolated
worktree, confirm which port/URL they're actually viewing before touching code again.
`netstat -ano | findstr LISTENING` (or `git worktree list`) surfaces other dev servers that might
be serving a different branch's stale code on a similar-looking URL.
