---
name: end-session
description: Runs the complete end-of-session pipeline — brief validation, build gate, techdebt scan, git operations, todo archive, session evaluation, and handoff report.
---

# Skill: /end-session

**Trigger:** User types `/end-session`.

**Action:** Invoke the end-of-session agent via the Agent tool:

```
Agent(
  subagent_type: "end-of-session-agent",
  description: "Run full end-of-session pipeline",
  prompt: "Run the complete end-of-session pipeline for the current session. Repo root: C:\\foodCo\\foodVibe1.0"
)
```

Do not run any phases inline. The agent handles everything — brief validation, build gate, techdebt scan, git operations, todo archive, doc refresh, plan cleanup, session evaluation, handoff report, and final commit.

---

> **REFLECT TEST-DRIVE REMINDER** (expires 2026-04-28 — remove after verdict)
>
> Before closing this session, consider running `/reflect` against any skill you invoked today.
> Log the run in `.claude/reflect/test-drive/log.md` using the rubric in `.claude/reflect/test-drive/rubric.md`.
> The user (Dan) fills out entries personally — Claude prompts but does not self-score.
> Decision date: **2026-04-28**. See `.claude/reflect/test-drive/decision-criteria.md` for verdict thresholds.
