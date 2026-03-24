Skill: worktree-setup (Lite)

Context: Triggered by "setup worktree", "new worktree", or when parallel task execution is required.
Standard: Follows Section 0 (Worktree Detection) and Section 6 (Git & Workflow) of the Master Instructions.

Workflow Phases

Phase 1: Destination Audit [Procedural — Haiku/Composer (Fast/Flash)]

Path Resolution: Identify the target directory outside the main repo (e.g., ../foodVibe-wt-<feature>).

Conflict Check: Ensure the target directory doesn't already exist or contain a stale git link.

Port Allocation: Identify the next available port (starting from 4201) and prepare the .worktree-port file.

Phase 2: Worktree Creation [Procedural — Haiku/Composer (Fast/Flash)]

Git Command: Execute git worktree add -b feat/<name> <path> main.

Dependency Linkage: Run npm install (or symlink node_modules if supported by the OS) to ensure the worktree is runnable.

Metadata Write: Create the .worktree-root file pointing back to the main repository.

Phase 3: Environment Initialization [High Reasoning — Sonnet/Gemini 1.5 Pro]

Context Transfer: Copy active plans/ or .claude/todo.md state relevant to the sub-task.

Breadcrumb Sync: Run update-docs (Section 0) within the new worktree to ensure navigation maps are active.

Efficiency Notes

FS & Git Operations: Use procedural models (Haiku/Flash/Composer Fast) for Phase 1 & 2. These are standard CLI tasks.

Context Calibration: Use high-reasoning models (Sonnet/Pro) ONLY for Phase 3 to ensure the worktree has the correct logic context.

Cursor Tip: Setting up a worktree is a pure automation task. Always use Composer 2.0 (Fast/Flash). It is perfectly suited for managing the directory creation and port mapping logic.

Completion Gate

Output: "Worktree created at [path] on port [port]. Branch feat/[name] is active and linked."

Update the main repo's .claude/todo.md to reflect the task is now active in a worktree.