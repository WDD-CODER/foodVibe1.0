---
name: save-plan
description: Determines the next plan number, syncs atomic sub-tasks to the ledger, and writes the plan file to plans/ when the user confirms a plan.
---

# Skill: save-plan
**Model Guidance:** Use Haiku/Flash for Phases 1 and 3. Use Sonnet for Phase 2 only when validating PRD alignment on a complex plan.

**Trigger:** User says "save the plan", "save plan", or confirms a plan and asks to persist it.

**Plan Rules (inline — no guide read required):**
- Plan numbering: `NNN = highest existing + 1`, zero-padded to 3 digits (e.g. `001`, `002`)
- Refactor variant suffix: `NNN-R`
- No plans yet → start at `001`
- Write to `plans/<NNN>-<slug>.plan.md` in project root only — never `~/.cursor/plans/`
- Todo update happens FIRST — before writing the plan file
- Every sub-task formatted as `[ ] Brief description of target file(s)`
- Medium/Large plan touching auth/storage → notify Security Officer before execution
- Not on a worktree + plan involves code changes → suggest `feat/` branch checkout

---

## Phase 1: Ledger Sync 

**Todo Update (first action):** Extract `# Atomic Sub-tasks` from the plan and append to `.claude/todo.md` before anything else.

**Sub-task Formatting:** Prepend every task with `[ ]` and include a brief description of the target file(s).

**State Verification:** Confirm all previous session tasks are `[x]` or moved to "Deferred" before starting the new feature. If open tasks exist → surface them to the user before proceeding.

**Numbering:** List files in `plans/` to determine next number. `NNN = highest + 1`, zero-padded. Refactor variant: `NNN-R`. No plans yet → start at `001`.

**Collision Guard (concurrent worktree safety):**
1. After determining `NNN`, check if `plans/<NNN>-*.plan.md` already exists
2. If file exists but was created in the last 60 seconds → collision likely from parallel worktree
3. Re-scan `plans/` and increment to next available number
4. If in a worktree (`.worktree-root` exists): also check main repo's `plans/` via `git -C $(cat .worktree-root) ls-files plans/`
5. Use the higher of (local max + 1) or (main repo max + 1)

---

## Phase 2: Logic Validation 

**PRD Alignment:** Verify atomic sub-tasks satisfy 100% of the plan's requirements — no requirement left without a corresponding task.

**Risk Audit:** If the plan is Medium or Large and touches auth/storage → notify Security Officer now, before execution begins.

---

## Phase 3: Environment Prep 

**Worktree Verification:** If not on a worktree and plan involves code changes → suggest `feat/` branch checkout before execution.

**Port Discovery:** Ensure `.worktree-port` is mapped if the plan involves UI changes.

**Write Plan File:** Write to `plans/<NNN>-<slug>.plan.md` in project root only — never `~/.cursor/plans/`.

---

## Completion Gate

Output: `"Plan saved. Ledger updated. Ready to execute Task 1: [Task Name]."`

---

## Cursor Tip
> Moving sub-tasks to the todo list is a pure data-transfer task. Always use Composer 2.0 (Fast/Flash) to transition from planning to coding instantly.
> Reserve Gemini 1.5 Pro for Phase 2 only when validating PRD alignment on a complex plan.
> Credit-saver: ~67% of this skill (Phases 1 + 3) is Flash-eligible.