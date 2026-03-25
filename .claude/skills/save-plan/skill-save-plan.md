---
name: save-plan
description: Determines the next plan number, syncs atomic sub-tasks to the ledger, and writes the plan file to plans/ when the user confirms a plan.
---

# Skill: save-plan

**Trigger:** User says "save the plan", "save plan", or confirms a plan and asks to persist it.
**Standard:** Follows Section 2 (Gatekeeper Protocol — Phase 3: Ledger Sync) of the Master Instructions.

---

## Phase 1: Ledger Sync `[Procedural — Haiku/Composer (Fast/Flash)]`

**Todo Update (first action):** Extract `# Atomic Sub-tasks` from the `.plan.md` and append to `.claude/todo.md` before writing the plan file.

**Sub-task Formatting:** Prepend every task with `[ ]` and include a brief description of the target file(s).

**State Verification:** Confirm all previous session tasks are `[x]` or moved to "Deferred" before starting the new feature.

**Numbering:**
- List files in `plans/` to determine the next number (`NNN = highest + 1`, zero-padded to 3 digits)
- Refactor variant: `NNN-R`
- No plans yet → start at `001`

---

## Phase 2: Logic Validation `[High Reasoning — Sonnet/Gemini 1.5 Pro]`

**PRD Alignment:** Verify atomic sub-tasks satisfy 100% of the plan's requirements.

**Risk Audit:** If the plan is "Medium" or "Large" (Section 0.4) and touches auth/storage → notify the Security Officer (Section 0.3).

---

## Phase 3: Environment Prep `[Procedural — Haiku/Composer (Fast/Flash)]`

**Worktree Verification:** If not on a worktree and the plan involves code changes → suggest `feat/` branch checkout per Section 6.

**Port Discovery:** Ensure `.worktree-port` is mapped if the plan involves UI changes.

**Write Plan File:** Write to `plans/<NNN>-<slug>.plan.md` (project `plans/` only — never `~/.cursor/plans/`).

---

## Completion Gate

Output: `"Plan saved. Ledger updated. Ready to execute Task 1: [Task Name]."`

---

## Cursor Tip
> Moving sub-tasks to the todo list is a pure data-transfer task. Always use Composer 2.0 (Fast/Flash) to transition from planning to coding instantly.
> Reserve Gemini 1.5 Pro for Phase 2 only when validating PRD alignment on a complex plan.
> Credit-saver: ~67% of this skill (Phases 1 + 3) is Flash-eligible.
