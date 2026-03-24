Skill: save-plan (Lite)

Context: Triggered by "save the plan" or after a plan file is written in the plans/ directory.
Standard: Follows Section 2 (Gatekeeper Protocol) of the Master Instructions.

Workflow Phases

Phase 1: Ledger Sync [Procedural — Haiku/Composer (Fast/Flash)]

todo.md Update: Extract the # Atomic Sub-tasks from the .plan.md file and append them to .claude/todo.md.

Sub-task Formatting: Ensure every task is prepended with [ ] and includes a brief description of the target file(s).

State Verification: Confirm all previous session tasks are marked [x] or moved to a "Deferred" section before starting the new feature.

Phase 2: Logic Validation [High Reasoning — Sonnet/Gemini 1.5 Pro]

PRD Alignment: Briefly verify that the atomic sub-tasks satisfy 100% of the requirements defined in the PRD.

Risk Audit: If the plan is "Medium" or "Large" (Section 0.4), ensure the Security Officer (Section 0.3) has been notified of any auth/storage changes.

Phase 3: Environment Prep [Procedural — Haiku/Composer (Fast/Flash)]

Worktree Verification: Detect if the current directory is a worktree; if not, suggest a feat/ branch checkout per Section 6.

Port Discovery: Ensure the .worktree-port is mapped if the plan involves UI changes.

Efficiency Notes

Ledger/Prep: Use procedural models (Haiku/Flash/Composer Fast) for Phase 1 & 3.

Validation: Use high-reasoning models (Sonnet/Pro) ONLY for Phase 2 logic checks.

Cursor Tip: Moving sub-tasks to the todo list is a pure data-transfer task. Always use Composer 2.0 (Fast/Flash) for this skill to move from planning to coding instantly.

Completion Gate

Output: "Plan saved. Ledger updated. Ready to execute Task 1: [Task Name]."