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

## Rolling session file vs. snapshots

| `docs/session-state.md` | `.claude/sessions/YYYY-MM-DD-HHMM-slug.md` |
|------------------------|---------------------------------------------|
| Single file, overwritten each session | Timestamped, never overwritten |
| Auto-loaded at session start by hook | Read manually via `/resume <path>` |
| Tracks session-level continuity | Tracks mid-task branching points |
| Updated at session end | Written at any checkpoint moment |
