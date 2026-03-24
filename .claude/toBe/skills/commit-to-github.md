Skill: commit-to-github (Lite)

Context: Triggered by "commit", "push", or /commit-to-github.
Standard: Follows Section 6 of the Master Instructions.

Workflow Phases

Phase 0: Verification [Procedural — Haiku/Composer (Fast/Flash)]

Status Check: Run git status to identify changed files.

Spec Audit: If TS/Angular files changed, invoke the QA Engineer (Section 0.3) to verify .spec.ts coverage for the new logic.

Lint/Build: Run a quick lint or targeted build check to ensure no "Broken Window" commits.

Phase 1: Interactive Staging [Procedural — Haiku/Composer (Fast/Flash)]

Present a visual tree of changed files.

Selection: Ask the user (Q&A format, Section 1.1) which changes to include if not already staged.

Worktree Check: Auto-detect main-repo vs. worktree via git rev-parse --git-dir.

Phase 2: Metadata Generation [High Reasoning — Sonnet/Gemini 1.5 Pro]

Commit Message: Generate a message following Conventional Commits (feat, fix, docs, style, refactor, test, chore).

PR Body (If Shipping): If shipping/pushing, generate a concise summary of changes, linked issues, and verification steps.

Phase 3: Atomic Write [Procedural — Haiku/Composer (Fast/Flash)]

Commit: Execute git commit -m "...".

Push/PR: Execute git push or gh pr create only after explicit user approval of the metadata.

Todo Update: Set sub-tasks to [x] in .claude/todo.md.

Argument Shortcuts

c: Checkpoint (Commit only in main; push in worktree).

s: Ship auto-detect (Full PR flow).

sl: Force Ship-Light (Direct push to branch).

sf: Force Ship-Full (PR + Review loop).

Efficiency Notes

Verification & Staging: Use procedural models (Haiku/Flash/Composer Fast) for Phases 0, 1, and 3.

Creative Writing: Use high-reasoning models (Sonnet/Pro) ONLY for Phase 2 (Commit/PR text) to ensure high-quality documentation.

Cursor Tip: For routine checkpoints, stay in Composer 2.0 (Fast/Flash) for the entire skill. Switch to Gemini 1.5 Pro only when you need a complex, descriptive PR body for a major feature.