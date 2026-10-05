# Plan 380 — Workflow Kit Validation Round 1 Fixes

Status: active
Snapshot: 9394c708

## Problem Statement
First validation round after Plan 360 (PR #247): Worker reports from wt-2 (plan 321) and wt-3 (plan 379), 2026-10-05. The new refusals, leftover-server cleanup and stay-in-slot merge worked; these gaps still cost manual steps:

- take-plan reused `feat/321-…` as "unmerged" because PR #239 was squash-merged → hand reset, then the old remote branch rejected the push.
- `.claude/.session-state-path` kept pointing at the previous plan's file (wt-2: write failed; wt-3: notes landed in plan 335's file).
- wt-3 saved plan 379 inside the slot; `.worktree-plan` still named 335 → `scope: out` at ship.
- Plan 321 has no `Snapshot:` line → drift check failed.
- Merge from a slot then detach without fetch → one commit behind.
- Validation given after the merge needed a second PR (#250) just for checkboxes.
- "servers listening: be=3002" said nothing about the kept frontend.
- Plan numbers collide with open Worker branches (open item from round 0).

Fixes are authored in the kit (`../ai-workflow-kit/core/`) first and rendered into FoodVibe, as in Plan 360.

## Goals & Success Criteria
**Primary:** the next `take plan` after a squash merge, and the next session after a plan change, need no hand steps.

- [auto] Scratch test: `mergedPrFor('feat/321-professional-foundation-refactor')` returns 239 when the local branch head equals the PR head, null otherwise.
- [auto] Scratch test: with a pointer naming another branch's file, `scripts/session-state-path.mjs` prints the current branch's `docs/session-state-<branch>.md`.
- [auto] Scratch test: `activePlanPath()` returns the branch's plan when `.worktree-plan` names a different NNN.
- [auto] `node scripts/scope-check.mjs --drift --plan=plans/321-professional-foundation-refactor.plan.md` prints the fallback note and a `REALITY:` line instead of failing.
- [auto] `node scripts/next-plan-number.mjs` prints a number above every plan and every `<type>/NNN-*` branch.
- [auto] `kit-manifest-check`, `kit-owned --check`, `plan-ledger-check`, `ng build`, and the kit's leak/pack/install checks pass.
- [human] Next real `take plan` in a slot after a squash merge starts a fresh branch with no hand reset.
- [human] Session notes land in the current plan's session-state file.

## Execution Mode
- **Parallel:** no. Single Worker, wt-1.
- **Isolated DB:** no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots.

```scope
scripts/take-plan.mjs
scripts/scope-check.mjs
scripts/session-state-path.mjs
scripts/lib/slot.mjs
scripts/next-plan-number.mjs
.claude/skills/save-plan/SKILL.md
docs/agent/standards-git.md
docs/agent/ship-regular.md
docs/agent/job-validation.md
docs/agent/workflow-map.md
docs/workflow-kit/**
```

**Outside this repo:** the kit repo `../ai-workflow-kit/**` (fixes authored there first).

## Read Scope

Entire FoodVibe repo.

## Escalation Protocol

If a Worker needs a FoodVibe file outside the `## Read-Write Scope`: STOP, tell the Human the file, the change, and why; offer `approved: <path>`; then append the path to the scope block and retry.

## Atomic Sub-tasks
- [x] A1: take-plan — squash-merge detection via the merged GitHub PR (head must match); delete the stale local branch and its old remote branch, start fresh; release any merged current branch (not only `feat/`); delete the session-state pointer on claim; one server line (`started` / `kept`) — `scripts/take-plan.mjs`
- [x] A2: Session-state pointer ignored when it names another branch's file — `scripts/session-state-path.mjs`
- [x] A3: Branch's plan wins over a mismatched `.worktree-plan`; `--list` flags it — `scripts/lib/slot.mjs`
- [x] A4: Drift check falls back to the commit that added the plan; save-plan always writes `Snapshot:` — `scripts/scope-check.mjs`, `.claude/skills/save-plan/SKILL.md`
- [x] A5: `git fetch origin --prune` after a slot merge — `docs/agent/standards-git.md`, `docs/agent/ship-regular.md`
- [x] A6: Validation after merge goes through the Planner, no second PR — `docs/agent/job-validation.md`
- [x] A7: `scripts/next-plan-number.mjs` (plans + `<type>/NNN-*` branches); save-plan numbering calls it; manifest row + `kit-owned.json` — `scripts/next-plan-number.mjs`, `docs/workflow-kit/**`, `docs/agent/workflow-map.md`
- [ ] A8: Checks + `/ship`; Dandan commits the kit repo.
