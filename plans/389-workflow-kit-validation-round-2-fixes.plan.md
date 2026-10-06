# Plan 389 — Workflow Kit Validation Round 2 Fixes

Status: closed
Snapshot: 10fbc7e3

> **CLOSED 2026-10-06 — merged; nothing left to do here.** Any unticked box below is history, not open work. Phase 6 (kit as a GitHub upstream, FoodVibe adoption, retiring patch mode) lives in plans 390 → 391 → 392.

## Problem Statement
Round 2 of Worker/Planner workflow reports (2026-10-05: wt-1 after plan 385, the Planner folder, wt-3 across plans 375/369/388) plus the Planner's own todo-sync investigation:

- Merged slots are never freed. `free-merged-slots.mjs` only runs as step 2 of the Planner's *save a plan* protocol, so wt-1 kept `feat/385-…` after PR #258, and "pull main" there fast-forwarded the dead feature branch.
- The Planner folder silently leaves `main`: `branch-guard.sh` auto-creates `feat/session-*` on any non-plan write, and every other session in that folder follows it onto the branch.
- A Planner session that edits a slot's files by absolute path gets the Planner folder's guards, not the slot's (branch guard skips "outside this worktree", scope guard never sees the slot's plan).
- The merge gate's brain capture writes `docs/brain/**`, which no plan's scope includes → `SCOPE: out` at ship.
- The workflow-report prompt lives only in chat transcripts.
- Python run by agents crashes printing unicode on Windows (cp1252).
- Plan-order refusals ("must run after plan N") fire even when plan N is superseded or archived.
- Docs still say the Planner runs `sync --merged`; the todo-sync Action (PR #260) now does it.

Fixes are authored in the kit (`../ai-workflow-kit/core/`) first and rendered into FoodVibe, as in Plans 360 and 380.

## Goals & Success Criteria
**Primary:** a merged slot is idle again with no hand step, and the Planner folder never leaves `main` without an explicit Human choice.

- [auto] `node scripts/free-merged-slots.mjs` frees wt-1 (`feat/385-…`, merged in PR #258): prints `wt-1: freed`, and `node scripts/lib/slot.mjs --list` then shows `wt-1: detached idle`.
- [auto] Scratch test: piping a Write tool input for a file in another worktree into `scripts/branch-guard.sh` / `scripts/scope-guard.sh` returns that worktree's guard result (scope guard denies an out-of-scope path in a claimed slot).
- [auto] Scratch test: `branch-guard.sh` in the Planner folder on `main` denies a write to `src/app/x.ts` and still allows `plans/x.plan.md` and `.claude/todo.md`.
- [auto] `node scripts/scope-check.mjs --file=docs/brain/gotchas/agent-workflow.md` inside a claimed slot prints `SCOPE: ok`.
- [auto] Scratch test: take-plan's order check passes when the prerequisite plan is `Status: superseded` or only exists under `plans/archive/`.
- [auto] `kit-manifest-check`, `kit-owned --check`, `plan-ledger-check`, `ng build`, and the kit's leak/pack/install checks pass.
- [human] Next session in a slot whose branch merged starts as `IDLE SLOT` with no hand step.
- [human] `/workflow-report` prints the report prompt's sections in a Worker session.

## Execution Mode
- **Parallel:** no. Single Worker, wt-1.
- **Isolated DB:** no.

## Read-Write Scope

Always allowed regardless of the list below: this plan file itself, its own
`docs/session-state-<branch>.md`, `.claude/sessions/**`, `.worktree-*`, and the append-only
hotspots.

```scope
scripts/free-merged-slots.mjs
scripts/session-startup.sh
scripts/branch-guard.sh
scripts/scope-guard.sh
scripts/scope-check.mjs
scripts/take-plan.mjs
scripts/lib/slot.mjs
.claude/settings.json
.claude/commands/workflow-report.md
.claude/commands/take-plan.md
.claude/commands/plan.md
.claude/commands/commands.md
.claude/skills/save-plan/SKILL.md
docs/agent/standards-git.md
docs/agent/job-validation.md
docs/agent/workflow-map.md
docs/workflow-kit/**
docs/brain/**
```

**Outside this repo:** the kit repo `../ai-workflow-kit/**` (fixes authored there first).

## Read Scope

Entire FoodVibe repo.

## Atomic Sub-tasks

- [x] A1: Slot frees itself after merge — `standards-git.md` "Merging from a slot" ends with `node scripts/free-merged-slots.mjs`; `session-startup.sh` runs it (short timeout) before the role check so a merged slot starts idle (`scripts/session-startup.sh`, `docs/agent/standards-git.md`)
- [x] A2: Planner folder stays on `main` — `branch-guard.sh` denies (no auto-switch) a non-plan write in the Planner folder on `main`, telling the agent to use a slot or ask the Human for an explicit branch; `session-startup.sh` warns when the Planner folder is not on `main` (`scripts/branch-guard.sh`, `scripts/session-startup.sh`, `.claude/commands/plan.md`)
- [x] A3: Guards follow the target file's worktree — when the file is in another worktree that has the same guard script, `branch-guard.sh` / `scope-guard.sh` hand the tool input to that worktree's guard (`scripts/branch-guard.sh`, `scripts/scope-guard.sh`)
- [x] A4: `docs/brain/**` always allowed in a slot (append-only) (`scripts/scope-check.mjs`)
- [x] A5: `/workflow-report` command with the round-2 report prompt (`.claude/commands/workflow-report.md`, `.claude/commands/commands.md`)
- [x] A6: `PYTHONIOENCODING=utf-8` in `.claude/settings.json` `env`
- [x] A7: Order check treats a superseded/done/archived prerequisite plan as satisfied (`scripts/take-plan.mjs`)
- [x] A8: Docs: ledger sync is the todo-sync Action, not a Planner step (`.claude/commands/take-plan.md`, `.claude/commands/plan.md`, `.claude/skills/save-plan/SKILL.md`, `docs/agent/job-validation.md`, `docs/agent/workflow-map.md`)
- [x] A9: Kit manifest + kit-owned list for the new command; all checks; session-state

## Escalation Protocol
Blocked outside scope → offer `approved: <path>` first.
