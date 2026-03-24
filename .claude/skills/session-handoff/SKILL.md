---
name: session-handoff
description: Produces a structured session summary so the next session starts with full context instead of cold.
---

# Skill: session-handoff

**Trigger:** User says "wrap up", "done", "handoff", "end session", "finish up", or "ship" on the main repo.
**Standard:** Follows Section 0 (Session End routing) of the Master Instructions.

> **Routing check:** Run `git rev-parse --git-dir` first.
> - Returns `.git/worktrees/*` → use `worktree-session-end` skill instead.
> - Returns `.git` → continue with this skill.

---

## Phase 1: Context Gathering `[Procedural — Haiku/Composer (Fast/Flash)]`

**Todo Audit:** Identify all `[x]` tasks completed this session from `.claude/todo.md`.

**File Audit:** List all files created or modified during the conversation.

**GitHub Context:** Read open PRs and recent activity via MCP (`mcp__github__list_pull_requests`) → fallback to `gh pr list`.

**Worktree Detection:** Confirm if the session took place in a worktree or main repo.

---

## Phase 2: Narrative Summary `[High Reasoning — Sonnet/Gemini 1.5 Pro]`

**Technical Summary:** Write a concise report of architectural decisions made (new signals, service changes, security audits).

**Success Evidence:** State the results of the "How to verify" step for the most recent features.

**Next Steps:** Explicitly list the next task from the todo list for zero-latency startup in the next session.

---

## Phase 3: Archive & Cleanup `[Procedural — Haiku/Composer (Fast/Flash)]`

**Save Handoff:** Write to `notes/session-handoffs/<YYYY-MM-DD>.md` (append if same day).

**Sync Check:** Remind user if a `github-sync` is needed before closing.

**Memory:** Suggest deleting temporary `.plan.md` files that are fully implemented and committed.

---

## Completion Gate

Output: `"Session handoff complete. Report saved to [path]. Ready for the next chef to take over."`

---

## Cursor Tip
> Wrap-ups are repetitive tasks. Use Composer 2.0 (Fast/Flash) to generate the handoff report — it can summarize session history and todo state without expensive reasoning.
> Reserve Gemini 1.5 Pro for Phase 2 only when capturing complex architectural decisions.
> Credit-saver: ~67% of this skill (Phases 1 + 3) is Flash-eligible.
