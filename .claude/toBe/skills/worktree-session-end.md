Skill: worktree-session-end (Lite)

Context: Triggered by "wrap up", "done", or "handoff" when detected inside a git worktree directory.
Standard: Follows Section 0 (Session End) and Section 6 (Git & Workflow) of the Master Instructions.

Workflow Phases

Phase 1: Worktree State Audit [Procedural — Haiku/Composer (Fast/Flash)]

Status Check: Run git status to identify uncommitted changes specific to this worktree.

Todo Sync: Ensure all completed tasks in the local .claude/todo.md are marked [x].

Verification: Confirm the presence of .worktree-root to ensure correct parent repo linkage.

Phase 2: Summary & Handoff [High Reasoning — Sonnet/Gemini 1.5 Pro]

Delta Report: Summarize the architectural changes and logic implemented in this specific worktree session.

Sync Strategy: Determine if the branch should be pushed for PR or kept local for continued work.

Next Steps: Explicitly define the next task required to bring this feature to "Done."

Phase 3: Cleanup & Pruning [Procedural — Haiku/Composer (Fast/Flash)]

Commit/Push: Execute the standard commit-to-github logic for the active feature branch.

Worktree Removal: If the feature is complete and merged/pushed, run git worktree remove <path> and delete the directory.

Port Release: Update the global navigation maps to reflect the release of the associated .worktree-port.

Efficiency Notes

Audit & Cleanup: Use procedural models (Haiku/Flash/Composer Fast) for Phase 1 & 3.

Handoff Synthesis: Use high-reasoning models (Sonnet/Pro) ONLY for Phase 2 to ensure progress is clearly communicated.

Cursor Tip: Closing a worktree is a standard maintenance task. Use Composer 2.0 (Fast/Flash) to handle the git status and removal commands. Reserve Gemini 1.5 Pro for the handoff narrative.

Completion Gate

Output: "Worktree session ended. Branch feat/[name] [Pushed/Updated]. Worktree [Removed/Retained]."

Return the user's context to the main repository root.