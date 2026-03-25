---
name: session-handoff
description: Produces a structured session summary so the next session starts with full context instead of cold.
---

# Skill: session-handoff
**Model Guidance:** Use Haiku/Flash for Phases 1 and 3. Use Sonnet for Phase 2 only when capturing complex architectural decisions.

**Trigger:** User says "wrap up", "done", "handoff", "end session", "finish up", or "ship" on the main repo.

> **Routing check (run first — before anything else):**
> - `git rev-parse --git-dir` returns `.git/worktrees/*` → stop, use `worktree-session-end` skill instead
> - Returns `.git` → continue with this skill

**Handoff Rules (inline — no guide read required):**
- Save to `notes/session-handoffs/<YYYY-MM-DD>.md` — append if file already exists for today
- Next Steps must reference the exact next `[ ]` task from `.claude/todo.md` — not a vague summary
- Suggest deleting `.plan.md` files that are fully implemented and committed
- Remind user to run `github-sync` at the start of the next session if unpushed work exists

---

## Phase 1: Context Gathering 

**Todo Audit:** Identify all `[x]` tasks completed this session from `.claude/todo.md`.

**File Audit:** List all files created or modified during the conversation.

**GitHub Context:** Read open PRs and recent activity via MCP (`mcp__github__list_pull_requests`) → fallback to `gh pr list`.

---

## Phase 2: Narrative Summary`

**Technical Summary:** Write a concise report of architectural decisions made this session (new signals, service changes, security audits, patterns applied).

**Success Evidence:** State the results of the "How to verify" step for the most recent features.

**Next Steps:** Explicitly list the next `[ ]` task from `.claude/todo.md` — exact task name and target file. Zero-latency startup for the next session.

---

## Phase 3: Archive & Cleanup 

**Save Handoff:** Write to `notes/session-handoffs/<YYYY-MM-DD>.md` — append if same day.

**Sync Check:** If unpushed commits exist → remind user to run `github-sync` at next session start.

**Cleanup:** Suggest deleting any `.plan.md` files that are fully implemented and committed.

---

## Completion Gate

Output: `"Session handoff complete. Report saved to [path]. Next task: [exact task name from todo]."`

---

## Cursor Tip
> Wrap-ups are repetitive tasks. Use Composer 2.0 (Fast/Flash) to generate the handoff report — summarizing session history and todo state is pattern-driven.
> Reserve Gemini 1.5 Pro for Phase 2 only when capturing complex architectural decisions.
> Credit-saver: ~67% of this skill (Phases 1 + 3) is Flash-eligible.