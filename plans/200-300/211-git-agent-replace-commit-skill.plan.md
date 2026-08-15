---
name: Git Agent — replace commit-to-github skill
overview: Replace the heavy commit-to-github skill (~3,500 tokens, 4 phases) with a lightweight git-agent persona (~800 tokens) that handles all git operations via natural language with a single approval gate.
todos:
  - Create .claude/agents/git-agent.md
  - Create .claude/commands/git.md
  - Create .cursor/commands/git.md
  - Update copilot-instructions.md Section 0 commit trigger
  - Update .cursor/rules/git-commit-must-use-skill.mdc
  - Update agent.md skill index and Phase 0 test reference
  - Update standards-git.md MCP write-path row
isProject: false
---

# Goal: Git Agent — replace commit-to-github skill

Replace the commit-to-github skill with a lightweight git-agent persona that handles all git operations via natural language, cutting token load from ~3,500 to ~800 and eliminating unnecessary phases.

## Atomic Sub-tasks

- [ ] Create `.claude/agents/git-agent.md` — full agent spec under 1,000 tokens
- [ ] Create `.claude/commands/git.md` — 3-line command pointer to git-agent
- [ ] Create `.cursor/commands/git.md` — 3-line Cursor equivalent
- [ ] Update `copilot-instructions.md` line 30 — replace commit-to-github trigger bullet with git-agent trigger; scope to exclude "ship"/"done"/"wrap up" (blocker: avoids shadowing session-end routing)
- [ ] Update `.cursor/rules/git-commit-must-use-skill.mdc` — replace content per brief
- [ ] Update `agent.md` lines 33 and 58 — rename `commit-to-github` → `git-agent` in skill index; remove stale Phase 0 test reference
- [ ] Update `standards-git.md` line 28 — replace `commit-to-github` with `git-agent` in MCP write-path row

## Constraints

- git-agent.md must be under 1,000 tokens — if longer, cut
- No spec audit, no lint/build in the agent — separate concerns
- One approval gate only (visual tree before writes)
- No argument shortcuts (c/s/sl/sf) — agent infers from context
- Preserve safety: no main commits, no force push, worktree boundary
- Do NOT delete `.claude/skills/commit-to-github/SKILL.md` or `.cursor/commands/commit-github.md` (Brief 2)

## Done when

- `/git commit these changes` from main → branch creation → visual tree → approval → commit + push
- "push and create a PR" from worktree → visual tree → approval → push → PR
- Agent detects worktree vs main repo, adjusts behavior
- Natural language ("save my work", "ship it to GitHub") triggers correct flow
