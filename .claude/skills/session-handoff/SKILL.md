---
name: session-handoff
description: "[REDIRECT] Session handoff is now handled by the end-of-session agent."
---

# Skill: session-handoff (Redirect)

> **This skill has been absorbed into the end-of-session agent.**
> It exists as a redirect so existing references don't break.

**Trigger:** User says "wrap up", "done", "handoff", "end session", "finish up", or "ship".

**Action:** Invoke the end-of-session agent:

Read `.claude/agents/end-of-session-agent.md` and follow it.

Do not run any phases from this file. The agent handles everything including:
- Brief validation
- Build gate
- Techdebt scan
- Git operations (with user confirmation)
- Todo archive
- Doc refresh
- Plan cleanup
- Session evaluation against brief
- Unified session-handoff.md report
- User confirmation
