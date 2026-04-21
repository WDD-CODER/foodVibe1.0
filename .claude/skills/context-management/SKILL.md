---
name: context-management
description: Mid-task state preservation — detects when to checkpoint before context exhaustion, how to save, and how to resume in a fresh session.
---

# Skill: context-management

**Purpose:** Preserve task state before context pressure causes loss of progress. This skill defines when to save, when not to, and how. It does NOT replace `docs/session-state.md` (the rolling session handoff) — it complements it with point-in-time snapshots for complex mid-task branching.

---

## When to checkpoint (triggers)

Run `/checkpoint` if ANY of these are true:

- **Context monitor fired** — the `context-monitor.sh` hook injected a 40% / 60% / 70% alert
- **Large tool output consumed** — you just read a file >500 lines, ran a full-repo grep, processed audit results, or received a large API response
- **User signal** — user says "getting long", "close to limit", "wrap up", "save your progress", or similar
- **About to start a risky multi-file edit** — touching 3+ files across different modules with no intermediate commits
- **Topic switch mid-task** — user asks to switch to a different feature before the current one is complete
- **PreCompact hook fired** — `pre-compact-reminder.sh` just reminded you to save state

---

## When NOT to checkpoint

Skip `/checkpoint` if ALL of these are true:

- The conversation is under 10 turns
- The task is a single-file edit or read-only Q&A
- No context alerts have fired
- The task will complete within 2–3 more tool calls

---

## How to checkpoint

Run `/checkpoint`. Do not hand-roll a session file manually.

The command will:
1. Write a timestamped file to `.claude/sessions/YYYY-MM-DD-HHMM-<slug>.md`
2. Fill in Goal, Completed, Current step, Next steps, Key decisions, Files touched, Open questions
3. Print a ready-to-paste resume prompt

---

## Rule of thumb

> If you're asking "should I checkpoint?" — the answer is yes.

Context loss is worse than an extra checkpoint. When in doubt, save.

---

## Session-State Document Size Constraints

Session-state docs loaded as context summaries consume significant tokens at session start. Keep them lean:

- **Hard cap: 80 lines** total per session-state document
- Detailed plan specs belong in `plans/*.plan.md` — the state doc holds a **pointer only** (`Plan 276 — see plans/276-mobile-audit-rtl-fab.plan.md`)
- **Code facts block**: max 10 lines (key measurements only; pointer to plan files for the rest)
- Execution status: 5 lines max — current step + next action only
- If a session-state doc exceeds 80 lines, split it: move plan detail into the plan files, keep state doc as index

**Why this matters:** A 190-line session-state doc loaded at session start can exhaust 70% of context before any code is read — forcing an immediate new session and losing the work just started.

---

## Rolling session file vs. snapshots

| `docs/session-state.md` | `.claude/sessions/YYYY-MM-DD-HHMM-slug.md` |
|------------------------|---------------------------------------------|
| Single file, overwritten each session | Timestamped, never overwritten |
| Auto-loaded at session start by hook | Read manually via `/resume <path>` |
| Tracks session-level continuity | Tracks mid-task branching points |
| Updated at session end | Written at any checkpoint moment |
