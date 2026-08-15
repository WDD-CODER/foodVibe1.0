---
name: Slim worktree-session-end + deprecate commit-to-github skill
overview: Remove commit/push/PR logic from worktree-session-end (delegate to git-agent), deprecate commit-to-github skill files, and delete stale duplicates.
todos:
  - Rewrite .claude/skills/worktree-session-end/SKILL.md to cleanup-only (~400 tokens)
  - Delete .claude/skills/commit-to-github/skill-commit-to-github.md (stale duplicate)
  - Delete .claude/skills/worktree-session-end/skill-worktree-session-end.md (stale duplicate)
  - Overwrite .claude/skills/commit-to-github/SKILL.md with DEPRECATED notice pointing to git-agent
  - Rewrite .cursor/commands/commit-github.md to redirect to git-agent
isProject: false
---

# Goal
Slim worktree-session-end to cleanup-only; deprecate commit-to-github skill; clean up stale duplicate files.

# Atomic Sub-tasks
- [ ] Rewrite `.claude/skills/worktree-session-end/SKILL.md` — cleanup-only, delegate commit/push/PR to git-agent
- [ ] Delete `.claude/skills/commit-to-github/skill-commit-to-github.md` (stale duplicate)
- [ ] Delete `.claude/skills/worktree-session-end/skill-worktree-session-end.md` (stale duplicate)
- [ ] Overwrite `.claude/skills/commit-to-github/SKILL.md` with DEPRECATED notice → git-agent
- [ ] Rewrite `.cursor/commands/commit-github.md` → redirect to git-agent

# Rules
- Do NOT delete the commit-to-github/ folder
- Do NOT touch git-agent.md
- Do NOT touch standards-git.md, test-pr-review-merge.md, or worktree-setup/
- Slimmed worktree-session-end must be under 500 tokens
- Keep worktree-session-end trigger in copilot-instructions.md as-is

# Done When
- worktree-session-end contains no commit/push/PR logic — delegates to git-agent
- commit-to-github/SKILL.md says DEPRECATED and points to git-agent
- Both stale duplicate files are deleted
