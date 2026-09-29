# Session State

## Branch
feat/session-20260929 (renaming to feat/two-slot-parallel-sessions on push)

## Date
2026-09-29

## Session Summary
- Diagnosed the recurring parallel-session conflict: two Claude Code sessions sharing one
  working tree corrupt each other's state on checkout/commit/push; the existing
  `worktree-setup` skill fixes this but re-pays npm install/port-scan/doc-sync every time.
- Built a two-slot system: a persistent second worktree (`../foodVibe1.0-wt-parallel`),
  a liveness lock (`.claude/.session-lock`, 45-min TTL) checked at `SessionStart`, and
  `scripts/claim-parallel-slot.sh` to auto-redirect a colliding new session into the
  second slot after a lightweight main-fast-forward + conditional npm install.
- Extended it, per user follow-up, to also auto-start the redirected worktree's dev
  server with `ng serve -c local` (backend-auth on) so the handed-off port is already
  validated, not silently fake-authed — tested live end-to-end.
- Hit and resolved a `/ship`-time collision: `plan-ledger-check.mjs` failed on another
  live session's uncommitted `.claude/todo.md` edit (Plan 320, in
  `../foodVibe1.0-wt-recipe-labels`) — isolated via `git stash push -m
  "plan-320-todo-entry" -- .claude/todo.md` rather than touching it. Also treated a
  `session-manifest-ship.py` overlap against the already-merged, no-longer-existing
  branch `chore/cook-view-service-split` as a false positive. Captured both as a brain
  gotcha in `docs/brain/gotchas/agent-workflow.md`.

## Files Modified
 .claude/skills/worktree-setup/SKILL.md |  6 ++
 .gitignore                             |  6 ++
 docs/agent/workflow-map.md             | 27 +++++--
 docs/brain/gotchas/agent-workflow.md   | 16 ++++
 scripts/claim-parallel-slot.sh         | 74 (new)
 scripts/handoff-check.sh               |  9 ++
 scripts/session-lock.sh                | 56 (new)
 scripts/session-manifest-hook.py       | 19 ++
 scripts/session-startup.sh             | 62 ++

## Commit
bcf19aad

## PR
Pending — feature-complete, PR to be opened and merged this ship (fast lane).

## Next Steps
- Recipe-labels worktree should `git stash apply stash^{/plan-320-todo-entry}` to
  recover its Plan 320 todo.md note (stash lives in the shared repo, visible from any
  worktree).
- Open question left for the human: whether to also wire the dev-server auto-start into
  slot A's normal path and into the ad hoc `worktree-setup` skill (third-worktree case).
- Old ad hoc worktrees left untouched per user decision: `../foodVibe1.0-wt-recipe-labels`
  has real in-progress work; `../foodVibe1.0-wt-design-port-suppliers` isn't a registered
  git worktree at all (looks like an unrelated project directory).
