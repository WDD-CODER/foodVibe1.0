---
status: accepted
date: 2026-09-30
review-by: 2027-03-30
---

# 0009. Planner-Worker workflow with 3 permanent worktree slots

## Context

The two-slot parallel-session system (`scripts/session-startup.sh` +
`scripts/claim-parallel-slot.sh`) grew to solve a narrower problem than the one we
actually have: it auto-fast-forwarded a single persistent sibling worktree
(`../foodVibe1.0-wt-parallel`) when the main repo's liveness lock was already held, so a
second live session had somewhere to go. It had no fixed ports (both slots could fight
over 4201), no per-plan write boundary (any session could touch any file once it had a
worktree), and every mechanical step — claiming a slot, checking drift, syncing
`.claude/todo.md` — was either manual or buried in ad hoc shell logic with no single
source of truth.

The real shape of the work is: one Planner (Claude.ai or Claude Code in the main folder)
producing Plan Contracts, and a small, fixed number of Workers picking them up to
implement. Alternatives considered: (a) keep growing the two-slot system with more
special cases — rejected, it was already accreting one-off collision rules; (b) unlimited
ad hoc worktrees per plan — rejected, unbounded worktrees mean unbounded port allocation
and dependency-install cost, and nothing bounds how many run at once; (c) a single shared
working directory with branch switching only — rejected, that's what already existed
before the two-slot system and is why it was built in the first place (two sessions can't
usefully share one checkout).

## Decision

Replace the two-slot system with a **Planner-Worker** model:

- The **Planner** (main folder, checked out on `main`) commits and pushes
  `plans/*.plan.md` and `.claude/todo.md` **directly to `main`** — an explicit admin
  bypass, not a general exception. `scripts/branch-guard.sh` allows only this shape to
  skip the auto-branch-switch; `.husky/pre-push` independently refuses any push to
  `refs/heads/main` that touches anything else, with `git push --no-verify` as the
  documented human-only override.
- **3 permanent worktree slots** (`wt-1`/`wt-2`/`wt-3`) replace the single persistent
  sibling worktree, each with **fixed ports** (`420N` frontend / `300N` backend, `main`
  stays `4200`/`3000`). A Worker claims one by saying "execute plan NNN"
  (`scripts/take-plan.mjs`) — **manual take, lazy release**: a slot's branch is only
  deleted the *next* time that slot is taken for a new plan, not immediately on merge.
- Each plan declares a **Read-Write Scope** (a glob list in the plan file). A Worker may
  write only inside it, plus a small always-allowed set (the plan file itself, its
  session-state file, `.worktree-*`) and three **append-only hotspots**
  (`src/styles.scss`, `public/assets/data/dictionary.json`, `src/app/app.routes.ts`) that
  every plan may add to but never rewrite or remove from without escalating.
  `scripts/scope-guard.sh` enforces this live in Claude Code (PreToolUse); `/ship`'s
  `scope-check.mjs --diff` is the backstop that also covers Cursor, which has no
  PreToolUse hook of its own — the same reason the shared pre-commit/pre-push hooks carry
  the hard-gate weight elsewhere in this repo.
- **In a slot, the scope gate replaces the manifest-overlap check** — `ship-prep.mjs`
  runs `scope-check.mjs --diff=origin/main` instead of `session-manifest-ship.py` when
  `scripts/lib/slot.mjs` reports the current directory is a slot; outside a slot, the
  manifest overlap check still runs, but only when another slot is actually on a live
  (non-detached) branch.
- **Shared DB by default, isolated on opt-in** — a plan's `Execution Mode` may declare
  `Isolated DB: yes`, which points that slot's backend at `foodvibe_wtN` (seeded once via
  `db-backup.js`/`db-restore.js`) instead of the shared local database. This is the
  exception, not the default, because most plans don't touch data shape.
- **Conditional reality check** — a plan records the `origin/main` SHA it was written
  against (`Snapshot:`). `scope-check.mjs --drift` diffs that snapshot against
  `origin/main`, scoped to the plan's own Read-Write Scope (hotspots excluded, since
  they're expected to move under any plan). Clean → the Worker starts milestones with no
  report. Drift → the Worker runs the plan's own "Step 0 — Reality Check" against exactly
  the listed commits, then stops for a go. Most takes are clean; the check only produces
  work when something in-scope actually changed.
- Mechanical steps stay in `.mjs`/`.sh` scripts that print a few lines each
  (`scripts/lib/slot.mjs`, `session-state-path.mjs`, `scope-check.mjs`, `take-plan.mjs`,
  `todo-query.mjs sync`), consistent with the direction set by Plans 323 and 324
  (`ship-prep.mjs`, `write-session-state.mjs`) — command and skill files call the
  scripts, they don't re-implement the logic in prose.

## Consequences

**Easier:** a Worker always knows its own ports without negotiating; a plan's blast
radius is explicit and machine-checked instead of implied by convention; the Planner's
`main`-push path is a narrow, auditable exception instead of an informal habit; reality
checks are cheap (scoped diff, not a full re-read) so they don't discourage taking a plan
that's been sitting for a while.

**Harder:** exactly 3 concurrent Workers, not unlimited — a 4th plan waits for a slot to
free up (matches the realistic concurrency this project actually uses; revisit if that
becomes a real bottleneck). A plan's Read-Write Scope has to be written accurately up
front, or the Worker spends turns escalating for paths that should have been in scope
from the start. Isolated-DB seeding depends on `db-backup.js`/`db-restore.js` working
correctly against the shared local Mongo instance — a broken local DB blocks isolated-DB
plans specifically, not the shared-DB majority.

**Watch for:** scope declarations that end up too broad (rubber-stamping `src/**` defeats
the point) — if that becomes common, the fix is tightening save-plan's Phase 2 review, not
weakening the gate. Also watch whether 3 slots is the right number once real usage data
exists.

## Review

At the review-by date, check: how often a 4th plan had to wait for a slot (signal to add a
4th, or that 3 was already generous); how often `scope: out` actually fired at `/ship`
time versus being caught earlier by `scope-guard.sh` (signal the live hook is or isn't
pulling its weight); whether any plan needed more than one `approved: <path>` escalation
round-trip (signal Phase 2's scope review needs to be stricter); and whether Isolated DB
saw any real usage at all.
