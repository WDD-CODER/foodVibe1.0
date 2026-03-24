Skill: github-sync (Lite)

Context: Triggered at session start or after time away.
Standard: Follows Section 0 (Session Start) of the Master Instructions.

Workflow Phases

Phase 1: Environment Audit [Procedural — Haiku/Composer (Fast/Flash)]

Status Check: Run git status and git fetch.

Conflict Check: Identify if local changes conflict with the remote main or active feat/ branch.

Worktree Detection: Identify if operating in a worktree; verify .worktree-port and .worktree-root.

Phase 2: Synchronization [Procedural — Haiku/Composer (Fast/Flash)]

Pull/Rebase: Execute git pull --rebase to ensure a clean history.

Stash Management: If local uncommitted changes exist, git stash -> sync -> git stash pop.

Branch Cleanup: Identify merged local branches that can be safely deleted.

Phase 3: Session Intelligence [High Reasoning — Sonnet/Gemini 1.5 Pro]

Daily Log Audit: Read the latest notes/handoffs/ and notes/github-sync/ files to summarize the "State of the Project" for the current session.

Todo Alignment: Verify .claude/todo.md matches the current branch state.

Efficiency Notes

Network/Git Operations: Use procedural models (Haiku/Flash/Composer Fast) for Phase 1 & 2.

State Analysis: Use high-reasoning models (Sonnet/Pro) ONLY for Phase 3 during the initial morning sync.

Cursor Tip: Git syncing is a utility task. Always use Composer 2.0 (Fast/Flash). It is perfectly suited for handling the rebase/pull logic and reading log files.

Completion Gate

Output: "GitHub sync complete. Remote changes merged. Local branch is up to date."

Save sync log to notes/github-sync/<today-date>.md.