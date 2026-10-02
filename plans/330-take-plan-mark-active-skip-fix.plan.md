# Plan 330 — take-plan.mjs: Skip Mark-Active Commit When Already Active

Status: pending
Snapshot: aca01563

## Context

Plan 329's prerequisite (shell:true for npm/npx spawns on Windows) was already
cherry-picked and merged to `main` directly (commit `60df94aa`, PR #234) ahead of
this plan — so that item is **done** and out of scope here.

What's left: while taking plan 329, `node scripts/take-plan.mjs 329` failed because
the plan file already had `Status: active` from a prior partial run. `updateStatusActive()`
leaves the file byte-identical in that case, so the subsequent unconditional
`git add` + `git commit -m "chore(plan NNN): mark active in wt-N"` has nothing to
commit and `git commit` exits non-zero, aborting the whole slot-claim flow.

## Scope

- `scripts/take-plan.mjs`

## Do

- In the `(d) branch + .worktree-plan + Status: active` block (around the
  `updateStatusActive(planAbs)` / `git(['commit', ...])` lines), detect whether the
  plan file's `Status:` line was already `active` before the update (or whether
  `git diff --quiet -- <match>` reports no change after `git add`), and skip the
  `git add` + `git commit` call in that case instead of letting `git commit` fail.
  Nothing else in the flow changes.

## Atomic Sub-tasks

- [ ] Add the already-active / no-diff guard around the mark-active commit in `scripts/take-plan.mjs`
- [ ] Verify `node scripts/take-plan.mjs <NNN>` runs to completion both when a plan starts as non-active and when it's already `Status: active`

## Done when

- [auto] `git diff origin/main --name-only` lists only `scripts/take-plan.mjs` and this plan file
- [auto] `node scripts/take-plan.mjs <NNN>` runs to the end on Windows, exit 0, in both the fresh-status and already-active cases
- [auto] `ng build` passes

## Lane

FAST. Ship and merge to main.
