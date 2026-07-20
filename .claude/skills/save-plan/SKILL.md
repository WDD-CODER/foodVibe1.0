---
name: save-plan
description: >
  Persist a Plan Contract to plans/ with name-similarity validation, ledger sync,
  and Human confirm on collisions. Use when the user pastes/approves a big plan,
  says save the plan, or any agent (Claude or Cursor) receives a Plan Contract to execute.
---

# Skill: save-plan

**Model Guidance:** Use Haiku/Flash for Phases 0–1 and 3. Use Sonnet for Phase 2 only when validating PRD alignment on a complex plan.

## Triggers (any agent — Claude Code or Cursor)

Run this skill **before executing milestones** when any of these is true:

- User says "save the plan" / "save plan" / confirms a plan and asks to persist it
- User pastes a **Plan Contract** / big plan (milestones, Atomic Sub-tasks, Goals)
- User says "here is the plan" / "execute this plan" / drops a plan body into chat
- Architect `/plan` or Cursor plan mode produced a contract that is not yet under `plans/`

**Hard rule:** Do not start Brief/milestone execution until the plan is on disk under `plans/` (or Human explicitly cancels save).

---

## Plan Rules (inline)

- Plan numbering: `NNN = highest existing + 1`, zero-padded to 3 digits
- Refactor variant suffix: `NNN-R`
- No plans yet → start at `001`
- Write to `plans/<NNN>-<slug>.plan.md` in project root only — never `~/.cursor/plans/`
- Preferred H1 shape: `# Plan NNN — <Human Title>` (name must describe the work — similarity depends on it)
- Todo / Atomic Sub-tasks sync happens as part of save (see phases)
- Every sub-task: `[ ] Brief description of target file(s)`
- Medium/Large plan touching auth/storage → note security surface
- Not on a worktree + plan involves code changes → suggest `feat/` branch checkout

---

## Phase 0: Detect + Name Similarity Gate (mandatory)

1. Extract a **plan display name** from the H1 / YAML `name:` / first heading (e.g. `Project Memory Bank`).
2. Propose a slug: lowercase kebab-case from that name (e.g. `project-memory-bank`).
3. Run the shared checker (Claude and Cursor — same script):

```bash
node scripts/plan-name-similarity.mjs --name="<Plan Display Name>"
```

4. Interpret stdout:

| Result | Action |
| --- | --- |
| `no similar plans` | Proceed to Phase 1 — **do not** ask rewrite/new/cancel |
| `similar plan(s)` | **Stop.** Show Human a short validation block (below). Wait for answer |

### Human validation block (only when hits exist)

Copy the script output into chat, then ask exactly:

```text
Similar plan(s) found — validate:
- <path> — <title>
  why: similar because name shares: <tokens>
  excerpt: <one short line>

Reply: rewrite existing | save as new | cancel
```

- **rewrite existing** → Edit/overwrite the chosen existing path; sync its Atomic Sub-tasks + `.claude/todo.md`; do **not** allocate a new `NNN`.
- **save as new** → Continue Phase 1 with next `NNN`. Before Write, put the relative path in `.claude/.plan-write-ack` (one line, e.g. `plans/291-foo.plan.md`) so the PreToolUse guard allows the create.
- **cancel** → Stop. Do not write. Do not execute briefs.

---

## Phase 1: Ledger Sync

**Todo Update:** Extract `# Atomic Sub-tasks` (or equivalent checklist) and append/update `.claude/todo.md` under `### Plan NNN — <Title>`.

**Sub-task Formatting:** Every task `[ ]` with target file(s) when known.

**State Verification:** If unrelated open tasks exist → surface them before proceeding.

**Numbering (save as new only):** List `plans/` → `NNN = highest + 1`. Collision guard:

1. After determining `NNN`, check if `plans/<NNN>-*.plan.md` already exists
2. If created in the last 60 seconds → re-scan and increment
3. Worktree: also check main repo `plans/` via `git -C $(cat .worktree-root) ls-files plans/`
4. Use the higher of (local max + 1) or (main repo max + 1)

---

## Phase 2: Logic Validation

**PRD Alignment:** Atomic sub-tasks cover the plan requirements — no requirement without a task.

**Risk Audit:** Medium/Large + auth/storage → note security surface; rely on pre-commit security grep + CI.

---

## Phase 3: Write Plan File

**Worktree Verification:** If not on a worktree and plan involves code changes → suggest `feat/` branch checkout.

**Write:**

- rewrite → overwrite the existing plan path Human confirmed
- save as new → write `plans/<NNN>-<slug>.plan.md` (after `.claude/.plan-write-ack` if the write-guard may block)

Never write under `~/.cursor/plans/`.

---

## Phase 4: Brief / mid-flight sync (ongoing — not only at save)

After the plan is saved, **any agent** executing a brief from it must keep the plan file live:

1. Brief must name its **parent plan path** (e.g. `plans/290-….plan.md`).
2. If review fail / fallout / Human adds a stage → **append** a new `[ ]` Atomic Sub-task (and milestone row if needed) to that plan file **and** `.claude/todo.md` **before** doing the new work.
3. On Human validation (`done` / ship Y) → mark matching plan + ledger items `[x]` (see `docs/agent/job-validation.md`).

---

## Completion Gate

Output:

```text
Plan saved: plans/<NNN>-<slug>.plan.md
Ledger updated. Similarity: <none | rewrite | save-as-new>
Ready to execute Task 1: [Task Name].
```
