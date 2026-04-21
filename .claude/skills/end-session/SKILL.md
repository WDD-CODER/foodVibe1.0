---
name: end-session
description: Session closer — alias for /ship. Runs build gate, commit/push, session-state, todo sync. Target < 2 min.
---

# Skill: /end-session

> **Alias for `/ship`** — both invoke the same 4-phase `end-of-session-agent`.
> Deprecation deadline: **2026-04-28**. Use `/ship` for new sessions.

**Trigger:** User types `/end-session` or natural language: "wrap up", "done", "finish up", "handoff".

**Action:** Invoke the end-of-session agent via the Agent tool:

```
Agent(
  subagent_type: "end-of-session-agent",
  description: "Run 4-phase ship pipeline",
  prompt: "Run the 4-phase /ship pipeline. Repo root: C:\\foodCo\\foodVibe1.0. Build gate → commit → session-state → todo sync. IMPORTANT: In Phase 2 (commit proposal), first check .claude/agents/invocation-log.tsv for any Team Leader or multi-agent entries from this session. If found, compare the number of files in `git status` against what was delegated. If git status shows significantly fewer files than the Team Leader reported modifying, warn the user before proposing the commit: 'Note: Team Leader ran this session but only N files are staged — verify all expected plan files are included.'"
)
```

Do not run any phases inline. The agent handles everything.

---

> **REFLECT TEST-DRIVE REMINDER** (expires 2026-04-28 — remove after verdict)
>
> Before closing this session, consider running `/reflect` against any skill you invoked today.
> Log the run in `.claude/reflect/test-drive/log.md` using the rubric in `.claude/reflect/test-drive/rubric.md`.
> The user (Dan) fills out entries personally — Claude prompts but does not self-score.
> Decision date: **2026-04-28**. See `.claude/reflect/test-drive/decision-criteria.md` for verdict thresholds.
